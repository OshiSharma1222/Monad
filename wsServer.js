'use strict';

/**
 * wsServer.js
 * WebSocket broadcast server.
 *
 * Message types emitted:
 *   ROUND_STATE   — on client connect + every new round
 *   MOVE_MADE     — every player submission
 *   LEADERBOARD   — sorted snapshot after every move
 *   ROUND_SETTLED — when a round resolves
 *   TICK          — every second with countdown
 */

const { WebSocketServer, WebSocket } = require('ws');
const { ethers } = require('ethers');

/**
 * Compute seconds remaining from state (local clock, not chain).
 * @param {{ roundStartTime: bigint, settled: boolean }} state
 * @returns {number}
 */
function calcTimeLeft(state) {
  if (state.settled) return 0;
  const now     = BigInt(Math.floor(Date.now() / 1000));
  const endTime = state.roundStartTime + 30n;
  if (now >= endTime) return 0;
  return Number(endTime - now);
}

/**
 * @param {number} port
 * @param {object} state  shared mutable state
 * @param {object} analyzer
 * @returns {{ broadcast: (data: object) => void }}
 */
function createWsServer(port, state, analyzer) {
  const wss = new WebSocketServer({ port });

  // ─── Broadcast helper ─────────────────────────────────────────────────────────

  function broadcast(data) {
    const payload = JSON.stringify(data);
    let sent = 0;
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
        sent++;
      }
    }
    return sent;
  }

  // ─── New-connection handler ───────────────────────────────────────────────────

  wss.on('connection', (ws, req) => {
    const remoteAddr = req.socket.remoteAddress ?? 'unknown';
    console.log(`[WS] + Client connected: ${remoteAddr}  (total: ${wss.clients.size})`);

    function safeSend(data) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
      }
    }

    // ── 1. Send current round snapshot ───────────────────────────────────────
    safeSend({
      type:        'ROUND_STATE',
      roundId:     Number(state.currentRound),
      timeLeft:    calcTimeLeft(state),
      playerCount: state.playerCount,
      pot:         ethers.formatEther(state.pot),
    });

    // ── 2. Send current leaderboard if there are already players ─────────────
    if (state.leaderboard.length > 0) {
      safeSend({
        type:    'LEADERBOARD',
        roundId: Number(state.currentRound),
        players: state.leaderboard,
      });
    }

    ws.on('close', () => {
      console.log(`[WS] - Client disconnected: ${remoteAddr}  (total: ${wss.clients.size})`);
    });

    ws.on('error', (err) => {
      console.error(`[WS] Client error (${remoteAddr}): ${err.message}`);
    });
  });

  wss.on('error', (err) => {
    console.error(`[WS] Server error: ${err.message}`);
  });

  wss.on('listening', () => {
    console.log(`[WS] Server ready → ws://localhost:${port}`);
  });

  // ─── TICK — every 1 second ────────────────────────────────────────────────────

  setInterval(() => {
    if (wss.clients.size === 0) return; // no-op when nobody is connected
    broadcast({
      type:     'TICK',
      timeLeft: calcTimeLeft(state),
      roundId:  Number(state.currentRound),
    });
  }, 1_000);

  return { broadcast };
}

module.exports = { createWsServer };
