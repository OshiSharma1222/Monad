import { useEffect, useState } from 'react'
import Leaderboard from '../components/Leaderboard.jsx'
import MoveGraph   from '../components/MoveGraph.jsx'

export default function EndScreen({
  gameSummary,
  myMoves,
  currentGame,
  leaderboard,
  onNextGame,
  shortAddr,
  wallet,
}) {
  const [countdown, setCountdown] = useState(8)

  useEffect(() => {
    setCountdown(8)
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); onNextGame(); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [gameSummary, onNextGame])

  const noWinner = !gameSummary?.winner
  const isMe = gameSummary?.winner && wallet &&
    gameSummary.winner.toLowerCase().includes(wallet.slice(2, 6).toLowerCase())

  return (
    <div className="flex-1 flex flex-col items-center gap-7 px-5 py-10 max-w-[520px] mx-auto w-full">

      {/* ── Divider label ── */}
      <div className="w-full flex items-center gap-4">
        <div className="flex-1 h-px bg-border" />
        <div className="text-[9px] tracking-[0.3em] uppercase text-muted whitespace-nowrap">
          Game {currentGame} Complete
        </div>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* ── All 5 dots filled ── */}
      <div className="flex items-center gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} className="block w-2 h-2 rounded-full bg-accent" />
        ))}
        <span className="font-mono text-[10px] text-accent ml-2">5/5</span>
      </div>

      {/* ── Winner card ── */}
      <div className="w-full border border-border p-6 flex flex-col gap-4">
        <div className="text-[9px] tracking-[0.2em] uppercase text-muted">
          {noWinner ? 'Result' : isMe ? 'You Won' : 'Winner'}
        </div>

        {noWinner ? (
          <div className="font-mono text-base text-muted">No players this game</div>
        ) : (
          <>
            <div className="font-mono text-lg font-bold text-primary break-all">
              {shortAddr ? shortAddr(gameSummary.winner) : gameSummary.winner}
              {isMe && <span className="text-accent text-sm ml-2">(you)</span>}
            </div>
            <div className="flex gap-8">
              <div>
                <div className="text-[9px] tracking-[0.14em] uppercase text-muted mb-1">Score</div>
                <div className="font-mono text-2xl font-bold text-primary">{gameSummary?.winnerScore ?? '—'}</div>
              </div>
              <div>
                <div className="text-[9px] tracking-[0.14em] uppercase text-muted mb-1">Prize</div>
                <div className="font-mono text-2xl font-bold text-accent">
                  {gameSummary?.totalPot ? `${Number(gameSummary.totalPot).toFixed(3)} MON` : '—'}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {myMoves && myMoves.length > 0 && (
        <div className="w-full">
          <div className="text-[9px] tracking-[0.16em] uppercase text-muted mb-3">Your Moves This Game</div>
          <MoveGraph moves={myMoves} />
        </div>
      )}

      {leaderboard.length > 0 && (
        <div className="w-full flex flex-col gap-3">
          <div className="text-[9px] tracking-[0.16em] uppercase text-muted">Final Standings</div>
          <Leaderboard rows={leaderboard} wallet={wallet} shortAddr={shortAddr} revealed={true} />
        </div>
      )}

      <div className="text-center">
        <div className="text-[10px] text-muted mb-2 tracking-wider uppercase">Next game in</div>
        <div className="font-mono text-5xl font-bold text-accent leading-none">{countdown}</div>
      </div>

    </div>
  )
}
