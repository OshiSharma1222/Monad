'use strict';

/**
 * analyzer.js
 * In-memory stat tracker for players and global game metrics.
 * All data is ephemeral — it resets when the process restarts.
 */

const { ethers } = require('ethers');

function createAnalyzer() {
  /**
   * Per-player record
   * @type {Map<string, {wins:number, totalScore:number, rounds:number, bestScore:number, totalMoves:number}>}
   */
  const players = new Map();

  const globalStats = {
    totalRounds: 0,
    uniquePlayers: new Set(), // lowercase addresses
    totalVolumeWei: 0n,
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  function ensurePlayer(address) {
    const key = address.toLowerCase();
    if (!players.has(key)) {
      players.set(key, {
        wins: 0,
        totalScore: 0,
        rounds: 0,
        bestScore: 0,
        totalMoves: 0,
      });
    }
    return players.get(key);
  }

  // ─── Write API ────────────────────────────────────────────────────────────────

  /**
   * Called on every MoveMade event.
   * @param {string} address  player address
   * @param {number} score    unpredictability score 0-1000
   * @param {number} choice   submitted number 1-100
   */
  function recordMove(address, score, choice) {
    const p = ensurePlayer(address);
    p.totalScore += score;
    p.rounds     += 1;
    p.totalMoves += 1;
    if (score > p.bestScore) p.bestScore = score;
    globalStats.uniquePlayers.add(address.toLowerCase());
  }

  /**
   * Called on RoundSettled event for the winner.
   * @param {string} address   winner address
   * @param {bigint} prizeWei  prize in wei
   */
  function recordWin(address, prizeWei) {
    const p = ensurePlayer(address);
    p.wins += 1;
    // prize already counted in recordRoundEnd
  }

  /**
   * Called on RoundSettled to update global counters.
   * @param {number} roundId  settled round number
   * @param {bigint} potWei   total pot paid out
   */
  function recordRoundEnd(roundId, potWei) {
    globalStats.totalRounds     += 1;
    globalStats.totalVolumeWei  += BigInt(potWei);
  }

  // ─── Read API ─────────────────────────────────────────────────────────────────

  /**
   * Returns move count for a player (used by listener to populate leaderboard).
   * @param {string} address
   * @returns {number}
   */
  function getMoveCount(address) {
    const p = players.get(address.toLowerCase());
    return p ? p.totalMoves : 0;
  }

  /**
   * Returns full stats for a player, or null if unknown.
   * @param {string} address
   */
  function getPlayerStats(address) {
    const p = players.get(address.toLowerCase());
    if (!p) return null;
    return {
      address,
      wins:        p.wins,
      totalRounds: p.rounds,
      avgScore:    p.rounds > 0 ? Math.round(p.totalScore / p.rounds) : 0,
      bestScore:   p.bestScore,
      winRate:     p.rounds > 0 ? ((p.wins / p.rounds) * 100).toFixed(1) + '%' : '0.0%',
      totalMoves:  p.totalMoves,
    };
  }

  /**
   * Returns aggregate stats across all time.
   */
  function getGlobalStats() {
    return {
      totalRounds:    globalStats.totalRounds,
      totalPlayers:   globalStats.uniquePlayers.size,
      totalVolumeMON: ethers.formatEther(globalStats.totalVolumeWei),
    };
  }

  return {
    recordMove,
    recordWin,
    recordRoundEnd,
    getMoveCount,
    getPlayerStats,
    getGlobalStats,
  };
}

module.exports = { createAnalyzer };
