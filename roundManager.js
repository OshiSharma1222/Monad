'use strict';

const POLL_INTERVAL_MS = 8_000;   // poll every 8s
const RETRY_DELAY_MS   = 6_000;   // wait 6s before retrying after a rate-limit error

function createRoundManager(contract, signerContract, state) {
  let timer           = null;
  let settling        = false;    // hard mutex — only one attempt at a time
  let settledRound    = -1n;      // don't retry a round that sent successfully

  async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  async function checkAndSettle() {
    if (settling) return;

    try {
      const timeLeft = await contract.timeLeft();
      if (timeLeft > 0n) return;           // round still running
      if (state.settled) return;           // already settled locally

      // On-chain double-check
      const info           = await contract.getRoundInfo(state.currentRound);
      const onChainSettled = info[3];
      if (onChainSettled) { state.settled = true; return; }

      // Don't retry a round we already sent a tx for
      if (state.currentRound === settledRound) return;

      const players = Number(info[2]);
      if (players === 0) console.log(`[ROUND MANAGER] Round ${state.currentRound} — 0 players, settling to advance...`);

      settling = true;
      console.log(`[ROUND MANAGER] Settling round ${state.currentRound}...`);

      let tx;
      // Retry the send up to 3 times on rate-limit errors
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          tx = await signerContract.settleRound({ gasLimit: 1_000_000n });
          break;
        } catch (sendErr) {
          const m = sendErr.shortMessage ?? sendErr.message ?? '';
          if ((m.includes('coalesce') || m.includes('rate limit') || m.includes('limit reached')) && attempt < 3) {
            console.warn(`[ROUND MANAGER] Rate limited on send (attempt ${attempt}) — retrying in ${RETRY_DELAY_MS / 1000}s...`);
            await sleep(RETRY_DELAY_MS);
          } else {
            throw sendErr;
          }
        }
      }

      // Mark round as attempted AFTER successful send
      settledRound = state.currentRound;
      console.log(`[ROUND MANAGER] tx → ${tx.hash}`);

      // Poll for receipt manually (avoids ethers internal poller)
      let receipt = null;
      for (let i = 0; i < 20; i++) {
        await sleep(3_000);
        try {
          receipt = await contract.runner.provider.getTransactionReceipt(tx.hash);
          if (receipt) break;
        } catch (_) {}
      }

      if (receipt) {
        console.log(`[ROUND MANAGER] Confirmed in block ${receipt.blockNumber} | gas: ${receipt.gasUsed.toLocaleString()}`);
      } else {
        console.warn(`[ROUND MANAGER] Receipt not found after 60s — listener will catch the event`);
      }

    } catch (err) {
      const msg = err.shortMessage ?? err.message ?? String(err);

      if (msg.includes('RoundAlreadySettled')) {
        state.settled = true;
        settledRound  = state.currentRound;
        console.log(`[ROUND MANAGER] Round ${state.currentRound} already settled — OK`);
      } else if (msg.includes('RoundStillActive')) {
        // chain clock ahead of us — ignore
      } else if (msg.includes('NoPlayersThisRound')) {
        state.settled = true;
        settledRound  = state.currentRound;
        console.warn(`[ROUND MANAGER] No players this round — advancing`);
      } else {
        console.error(`[ROUND MANAGER] Settlement error: ${msg.slice(0, 120)}`);
      }
    } finally {
      settling = false;
    }
  }

  function start() {
    console.log(`[ROUND MANAGER] Started — polling every ${POLL_INTERVAL_MS / 1_000}s`);
    checkAndSettle();
    timer = setInterval(checkAndSettle, POLL_INTERVAL_MS);
  }

  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
    console.log('[ROUND MANAGER] Stopped');
  }

  return { start, stop };
}

module.exports = { createRoundManager };
