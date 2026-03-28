'use strict';

/**
 * listener.js
 * Subscribes to all MimicWar contract events.
 *
 * Two guards prevent duplicate processing:
 *   1. startBlock — ignore any event from a block before we started
 *   2. seen Set   — deduplicate by txHash+logIndex (ethers polling can
 *                   re-deliver the same log on consecutive poll cycles)
 */

const { ethers } = require('ethers');

function shortAddr(addr) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function upsertLeaderboard(leaderboard, address, score, choice, moveCount) {
  const key      = address.toLowerCase();
  const existing = leaderboard.find(p => p.address.toLowerCase() === key);
  if (existing) {
    existing.score     = score;
    existing.choice    = choice;
    existing.moveCount = moveCount;
  } else {
    leaderboard.push({ address, score, choice, moveCount });
  }
  leaderboard.sort((a, b) => b.score - a.score);
}

/**
 * @param {import('ethers').Contract} contract
 * @param {object}                    state
 * @param {{ broadcast: Function }}   wsServer
 * @param {object}                    analyzer
 * @param {number}                    startBlock  — only process logs >= this block
 */
function createListener(contract, state, wsServer, analyzer, startBlock) {
  // Deduplication: txHash-logIndex → true
  const seen = new Set();

  function isDup(event) {
    // event is a ContractEventPayload in ethers v6; event.log has blockNumber etc.
    const log = event?.log ?? event;
    if (!log?.transactionHash) return false; // can't check — let through

    // Block-gate: skip events from before we started
    if (log.blockNumber !== undefined && log.blockNumber < startBlock) return true;

    const key = `${log.transactionHash}-${log.index ?? log.logIndex ?? 0}`;
    if (seen.has(key)) return true;
    seen.add(key);
    // Keep the set from growing unbounded
    if (seen.size > 2_000) {
      const first = seen.values().next().value;
      seen.delete(first);
    }
    return false;
  }

  function start() {
    // ── RoundStarted ─────────────────────────────────────────────────────────
    contract.on('RoundStarted', (roundId, startTime, event) => {
      if (isDup(event)) return;

      console.log(`\n[ROUND ${roundId}] ═══════════════ NEW ROUND ═══════════════`);
      console.log(`[ROUND ${roundId}] Started at ${new Date(Number(startTime) * 1000).toISOString()}`);

      state.currentRound   = roundId;
      state.roundStartTime = startTime;
      state.pot            = 0n;
      state.playerCount    = 0;
      state.settled        = false;
      state.leaderboard    = [];
      state.isSettling     = false;

      wsServer.broadcast({
        type:        'ROUND_STATE',
        roundId:     Number(roundId),
        timeLeft:    30,
        playerCount: 0,
        pot:         '0.0',
      });
    });

    // ── MoveMade ─────────────────────────────────────────────────────────────
    contract.on('MoveMade', async (roundId, player, choice, score, event) => {
      if (isDup(event)) return;

      const choiceNum = Number(choice);
      const scoreNum  = Number(score);

      try {
        const info       = await contract.getRoundInfo(roundId);
        state.pot        = info[1];
        state.playerCount = Number(info[2]);
      } catch (_) {}

      analyzer.recordMove(player, scoreNum, choiceNum);

      const moveCount = analyzer.getMoveCount(player);
      upsertLeaderboard(state.leaderboard, player, scoreNum, choiceNum, moveCount);

      const potFormatted = ethers.formatEther(state.pot);
      console.log(
        `[ROUND ${roundId}] Player ${shortAddr(player)} submitted ${choiceNum} → score: ${scoreNum}` +
        `  |  pot: ${potFormatted} MON`
      );

      const leader = state.leaderboard[0];
      if (leader && leader.address.toLowerCase() === player.toLowerCase()) {
        console.log(`[ROUND ${roundId}] 🏆 New leader: ${shortAddr(leader.address)} (${leader.score} pts)`);
      }

      wsServer.broadcast({
        type:      'MOVE_MADE',
        roundId:   Number(roundId),
        player:    shortAddr(player),
        choice:    choiceNum,
        score:     scoreNum,
        timestamp: Date.now(),
      });

      wsServer.broadcast({
        type:    'LEADERBOARD',
        roundId: Number(roundId),
        players: state.leaderboard.map(p => ({
          address:   p.address,
          score:     p.score,
          choice:    p.choice,
          moveCount: p.moveCount,
        })),
      });
    });

    // ── RoundSettled ─────────────────────────────────────────────────────────
    contract.on('RoundSettled', (roundId, winner, prize, winnerScore, event) => {
      if (isDup(event)) return;

      const prizeFormatted = ethers.formatEther(prize);
      const scoreNum       = Number(winnerScore);
      const isReal         = winner !== ethers.ZeroAddress;

      state.settled    = true;
      state.isSettling = false;

      if (isReal) {
        analyzer.recordWin(winner, prize);
        analyzer.recordRoundEnd(Number(roundId), prize);

        console.log(`[ROUND ${roundId}] ══════════════ SETTLED ══════════════`);
        console.log(`[ROUND ${roundId}] Winner : ${shortAddr(winner)}`);
        console.log(`[ROUND ${roundId}] Prize  : ${prizeFormatted} MON`);
        console.log(`[ROUND ${roundId}] Score  : ${scoreNum} pts`);
        console.log(`[ROUND ${roundId}] Players: ${state.playerCount}`);
      } else {
        console.log(`[ROUND ${roundId}] Settled (no players — advancing to next round)`);
      }

      const g = analyzer.getGlobalStats();
      if (isReal) {
        console.log(`[GLOBAL] Total rounds: ${g.totalRounds}  |  Players: ${g.totalPlayers}  |  Volume: ${g.totalVolumeMON} MON`);
        console.log(`──────────────────────────────────────────────────\n`);
      }

      wsServer.broadcast({
        type:        'ROUND_SETTLED',
        roundId:     Number(roundId),
        winner:      isReal ? shortAddr(winner) : null,
        prize:       prizeFormatted,
        winnerScore: scoreNum,
      });
    });

    // ── ScoreUpdated ─────────────────────────────────────────────────────────
    contract.on('ScoreUpdated', (player, newScore, choice, event) => {
      if (isDup(event)) return;

      const key   = player.toLowerCase();
      const entry = state.leaderboard.find(p => p.address.toLowerCase() === key);
      if (entry) {
        entry.score  = Number(newScore);
        entry.choice = Number(choice);
        state.leaderboard.sort((a, b) => b.score - a.score);
      }
    });

    // Swallow transient RPC errors (rate limits, network blips) so the
    // process keeps running and picks up events on the next poll cycle.
    contract.on('error', (err) => {
      const msg = err?.shortMessage ?? err?.message ?? String(err);
      if (msg.includes('request limit') || msg.includes('rate limit') || msg.includes('coalesce')) {
        console.warn('[LISTENER] RPC rate limit — will retry on next poll...');
      } else {
        console.error('[LISTENER] Contract event error:', msg);
      }
    });

    console.log(`[LISTENER] Subscribed from block ${startBlock} — RoundStarted | MoveMade | RoundSettled | ScoreUpdated`);
  }

  function stop() {
    contract.removeAllListeners();
    console.log('[LISTENER] All event listeners removed');
  }

  return { start, stop };
}

module.exports = { createListener };
