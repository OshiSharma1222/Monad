import Leaderboard from '../components/Leaderboard.jsx'

export default function WarScreen({
  timeLeft,
  pot,
  playerCount,
  leaderboard,
  wallet,
  shortAddr,
}) {
  const isHot = timeLeft > 0 && timeLeft <= 10

  /* Derive user's own stats from leaderboard */
  const myKey   = wallet?.toLowerCase()
  const myEntry = leaderboard.find(p => p.address?.toLowerCase() === myKey)
  const myScore = myEntry?.score ?? '—'
  const myRank  = myEntry ? leaderboard.indexOf(myEntry) + 1 : '—'

  return (
    <div className="flex-1 w-full max-w-[780px] mx-auto px-5 py-7 flex flex-col gap-6">

      {/* ── Timer ── */}
      <div className="text-center py-4">
        <div
          className={[
            'font-mono text-[84px] font-bold leading-none tracking-tight transition-colors duration-300',
            isHot ? 'text-accent animate-pulse' : 'text-primary',
          ].join(' ')}
        >
          {String(timeLeft ?? 0).padStart(2, '0')}
        </div>
        <div className="text-[10px] tracking-[0.2em] uppercase text-muted mt-[6px]">
          Seconds Remaining
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="grid gap-px bg-border" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {[
          { label: 'Players In',  value: playerCount ?? 0 },
          { label: 'Pot',         value: pot ? `${pot} MON` : '0.000 MON' },
          { label: 'Your Score',  value: myScore },
          { label: 'Your Rank',   value: myRank !== '—' ? `#${myRank}` : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-surface px-4 py-[14px]">
            <div className="text-[9px] tracking-[0.16em] uppercase text-muted mb-1">
              {label}
            </div>
            <div className="font-mono text-base font-bold text-primary">
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Leaderboard section ── */}
      <div className="flex flex-col gap-3">
        {/* Header row */}
        <div className="flex justify-between items-center">
          <div className="text-[10px] tracking-[0.18em] uppercase text-muted">
            Live Leaderboard
          </div>
          <div className="flex items-center gap-[5px] font-mono text-[10px] text-success">
            <span className="inline-block w-[6px] h-[6px] rounded-full bg-success animate-blink-fast" />
            Live
          </div>
        </div>

        <Leaderboard
          rows={leaderboard}
          wallet={wallet}
          shortAddr={shortAddr}
          revealed={false}
        />
      </div>

    </div>
  )
}
