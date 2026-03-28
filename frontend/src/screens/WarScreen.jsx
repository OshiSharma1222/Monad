import Leaderboard from '../components/Leaderboard.jsx'

export default function WarScreen({
  timeLeft,
  accumulatedPot,
  playerCount,
  currentGame,
  roundsInGame,
  leaderboard,
  wallet,
  shortAddr,
}) {
  const isHot    = timeLeft > 0 && timeLeft <= 10
  const roundNum = roundsInGame + 1
  const myKey    = wallet?.toLowerCase()
  const myEntry  = leaderboard.find(p => p.address?.toLowerCase() === myKey)
  const myScore  = myEntry?.score ?? '—'
  const myRank   = myEntry ? leaderboard.indexOf(myEntry) + 1 : '—'

  return (
    <div className="flex-1 w-full max-w-[720px] mx-auto px-5 py-8 flex flex-col gap-7">

      {/* ── Big timer ── */}
      <div className="text-center">
        <div className={[
          'font-mono font-bold leading-none tracking-tight transition-colors duration-300 text-[80px]',
          isHot ? 'text-accent animate-pulse' : 'text-primary',
        ].join(' ')}>
          {String(timeLeft ?? 0).padStart(2, '0')}
        </div>
        <div className="text-[9px] tracking-[0.2em] uppercase text-muted mt-1">
          Seconds Remaining · Round {Math.min(roundNum, 5)}/5
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="grid gap-px bg-border" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        {[
          { label: 'Game Prize', value: accumulatedPot ? `${Number(accumulatedPot).toFixed(3)} MON` : '0.000 MON' },
          { label: 'Players',    value: playerCount ?? 0 },
          { label: 'Your Score', value: myScore },
          { label: 'Your Rank',  value: myRank !== '—' ? `#${myRank}` : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-surface px-4 py-3">
            <div className="text-[9px] tracking-[0.14em] uppercase text-muted mb-1">{label}</div>
            <div className="font-mono text-base font-bold text-primary">{value}</div>
          </div>
        ))}
      </div>

      {/* ── Round progress dots ── */}
      <div className="flex items-center gap-2 justify-center">
        <span className="font-mono text-[10px] text-muted uppercase tracking-widest mr-1">Round</span>
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className={[
              'block w-2 h-2 rounded-full transition-colors duration-500',
              i < roundsInGame ? 'bg-accent' : i === roundsInGame ? 'bg-primary' : 'bg-border',
            ].join(' ')}
          />
        ))}
        <span className="font-mono text-[10px] text-muted ml-1">{Math.min(roundNum, 5)}/5</span>
      </div>

      {/* ── Leaderboard ── */}
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <div className="text-[10px] tracking-[0.16em] uppercase text-muted">Live Leaderboard</div>
          <div className="flex items-center gap-[5px] font-mono text-[10px] text-success">
            <span className="inline-block w-[5px] h-[5px] rounded-full bg-success animate-blink-fast" />
            Live
          </div>
        </div>
        <Leaderboard rows={leaderboard} wallet={wallet} shortAddr={shortAddr} revealed={false} />
      </div>

    </div>
  )
}
