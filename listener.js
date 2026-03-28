'use strict';

/**
 * listener.js
 * Subscribes to all MimicWar contract events and:
 *   - updates shared in-memory state
 *   - feeds the analyzer
 *   - triggers WebSocket broadcasts
 */

const { ethers } = require('ethers');

/** Shorten 0x… address to 0x1234…5678 */
function shortAddr(addr) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/**
 * Upsert a player entry in the leaderboard array and re-sort by score descending.
 * Mutates state.leaderboard in place.
 *
 * @param {object[]} leaderboard  state.leaderboard
 * @param {string}   address
 * @param {number}   score
 * @param {number}   choice
 * @param {number}   moveCount
 */
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
 * @param {import('ethers').Contract} contract     read-only provider contract
 * @param {object}                    state         shared mutable state
 * @param {{ broadcast: Function }}   wsServer
 * @param {object}                    analyzer
 */
function createListener(contract, state, wsServer, analyzer) {
  function start() {
    // ── RoundStarted(uint256 indexed roundId, uint256 startTime) ──────────────
    contract.on('RoundStarted', (roundId, startTime) => {
      console.log(`\n[ROUND ${roundId}] ═══════════════ NEW ROUND ═══════════════`);
      console.log(`[ROUND ${roundId}] Started at ${new Date(Number(startTime) * 1000).toISOString()}`);

      state.currentRound    = roundId;
      state.roundStartTime  = startTime;
      state.pot             = 0n;
      state.playerCount     = 0;
      state.settled         = false;
      state.leaderboard     = [];
      state.isSettling      = false;

      wsServer.broadcast({
        type:        'ROUND_STATE',
        roundId:     Number(roundId),
        timeLeft:    30,
        playerCount: 0,
        pot:         '0.0',
      });
    });

    // ── MoveMade(uint256 indexed roundId, address indexed player, uint8 choice, uint32 score) ──
    contract.on('MoveMade', async (roundId, player, choice, score) => {
      const choiceNum = Number(choice);
      const scoreNum  = Number(score);

      // Refresh pot & player count from chain for accuracy
      try {
        const info       = await contract.getRoundInfo(roundId);
        state.pot        = info[1]; // pot (bigint)
        state.playerCount = Number(info[2]);
      } catch (_) {
        // Non-fatal: carry on with stale values
      }

      // Feed the analyzer (increments totalMoves for this player)
      analyzer.recordMove(player, scoreNum, choiceNum);

      // Rebuild leaderboard entry
      const moveCount = analyzer.getMoveCount(player);
      upsertLeaderboard(state.leaderboard, player, scoreNum, choiceNum, moveCount);

      // Terminal output
      const potFormatted = ethers.formatEther(state.pot);
      console.log(
        `[ROUND ${roundId}] Player ${shortAddr(player)} submitted ${choiceNum} → score: ${scoreNum}` +
        `  |  pot: ${potFormatted} MON`
      );

      const leader = state.leaderboard[0];
      if (leader && leader.address.toLowerCase() === player.toLowerCase()) {
        console.log(`[ROUND ${roundId}] 🏆 New leader: ${shortAddr(leader.address)} (${leader.score} pts)`);
      }

      // Broadcast: move event
      wsServer.broadcast({
        type:      'MOVE_MADE',
        roundId:   Number(roundId),
        player:    shortAddr(player),
        choice:    choiceNum,
        score:     scoreNum,
        timestamp: Date.now(),
      });

      // Broadcast: full sorted leaderboard
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

    // ── RoundSettled(uint256 indexed roundId, address indexed winner, uint256 prize, uint32 winnerScore) ──
    contract.on('RoundSettled', (roundId, winner, prize, winnerScore) => {
      const prizeFormatted = ethers.formatEther(prize);
      const scoreNum       = Number(winnerScore);

      state.settled    = true;
      state.isSettling = false;

      // Update analyzer
      analyzer.recordWin(winner, prize);
      analyzer.recordRoundEnd(Number(roundId), prize);

      // Print war-room summary
      console.log(`[ROUND ${roundId}] ══════════════ SETTLED ══════════════`);
      console.log(`[ROUND ${roundId}] Winner : ${shortAddr(winner)}`);
      console.log(`[ROUND ${roundId}] Prize  : ${prizeFormatted} MON`);
      console.log(`[ROUND ${roundId}] Score  : ${scoreNum} pts`);
      console.log(`[ROUND ${roundId}] Players: ${state.playerCount}`);

      const globalStats = analyzer.getGlobalStats();
      console.log(`[GLOBAL] Total rounds: ${globalStats.totalRounds}  |  Players: ${globalStats.totalPlayers}  |  Volume: ${globalStats.totalVolumeMON} MON`);
      console.log(`──────────────────────────────────────────────────\n`);

      wsServer.broadcast({
        type:        'ROUND_SETTLED',
        roundId:     Number(roundId),
        winner:      shortAddr(winner),
        prize:       prizeFormatted,
        winnerScore: scoreNum,
      });
    });

    // ── ScoreUpdated(address indexed player, uint32 newScore, uint8 choice) ────
    // Emitted alongside MoveMade — use it to keep leaderboard scores fresh.
    contract.on('ScoreUpdated', (player, newScore, choice) => {
      const key   = player.toLowerCase();
      const entry = state.leaderboard.find(p => p.address.toLowerCase() === key);
      if (entry) {
        entry.score  = Number(newScore);
        entry.choice = Number(choice);
        // Re-sort after update
        state.leaderboard.sort((a, b) => b.score - a.score);
      }
    });

    console.log('[LISTENER] Subscribed to: RoundStarted | MoveMade | RoundSettled | ScoreUpdated');
  }

  function stop() {
    contract.removeAllListeners();
    console.log('[LISTENER] All event listeners removed');
  }

  return { start, stop };
}

module.exports = { createListener };
