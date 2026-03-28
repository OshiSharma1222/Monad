import { useEffect, useState } from 'react'
import Leaderboard from '../components/Leaderboard.jsx'
import MoveGraph   from '../components/MoveGraph.jsx'

const NULL_ADDRESS = '0x0000000000000000000000000000000000000000'

function isNoWinner(addr) {
  if (!addr) return true
  return addr.toLowerCase() === NULL_ADDRESS.toLowerCase()
}

export default function EndScreen({
  settlement,
  myMoves,
  roundId,
  leaderboard,
  onNextRound,
  shortAddr,
  wallet,
}) {
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    setCountdown(5)
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          onNextRound()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [settlement, onNextRound])

  const noWinner = isNoWinner(settlement?.winner)

  return (
    <div className="flex-1 flex flex-col items-center gap-8 px-5 py-10 max-w-[560px] mx-auto w-full">

      {/* ── Round complete label ── */}
      <div className="text-[10px] tracking-[0.25em] uppercase text-muted">
        Round Complete
      </div>

      {/* ── Winner card ── */}
      <div className="w-full border border-border p-7 flex flex-col gap-5">
        <div className="text-[9px] tracking-[0.18em] uppercase text-muted">
          Winner
        </div>

        {noWinner ? (
          <div className="font-mono text-lg text-muted">
            No players this round
          </div>
        ) : (
          <>
            <div className="font-mono text-xl font-bold text-primary break-all">
              {shortAddr ? shortAddr(settlement.winner) : settlement?.winner}
            </div>
            <div className="flex gap-7">
              <div>
                <div className="text-[9px] tracking-[0.14em] uppercase text-muted mb-1">
                  Score
                </div>
                <div className="font-mono text-[22px] font-bold text-accent">
                  {settlement?.winnerScore ?? '—'}
                </div>
              </div>
              <div>
                <div className="text-[9px] tracking-[0.14em] uppercase text-muted mb-1">
                  Prize
                </div>
                <div className="font-mono text-[22px] font-bold text-accent">
                  {settlement?.prize ? `${settlement.prize} MON` : '—'}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Move graph ── */}
      {myMoves && myMoves.length > 0 && (
        <div className="w-full">
          <MoveGraph moves={myMoves} />
        </div>
      )}

      {/* ── Final leaderboard ── */}
      {leaderboard.length > 0 && (
        <div className="w-full flex flex-col gap-3">
          <div className="text-[10px] tracking-[0.18em] uppercase text-muted">
            Final Standings
          </div>
          <Leaderboard
            rows={leaderboard}
            wallet={wallet}
            shortAddr={shortAddr}
            revealed={true}
          />
        </div>
      )}

      {/* ── Countdown ── */}
      <div className="text-center">
        <div className="text-[11px] text-muted mb-[6px]">
          New round starting in
        </div>
        <div className="font-mono text-5xl font-bold text-accent leading-none">
          {countdown}
        </div>
      </div>

    </div>
  )
}
