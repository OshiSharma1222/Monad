export default function Header({ roundId, currentGame, roundsInGame, wallet, onConnect, shortAddr }) {
  const roundNum = roundsInGame + 1

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
      <div className="font-mono text-[15px] font-bold tracking-[0.2em]">
        MIMIC<span className="text-accent">WAR</span>
      </div>

      <div className="flex items-center gap-3">
        <span className="font-mono text-[10px] text-muted tracking-widest uppercase">
          Game {currentGame ?? '—'}
        </span>
        <div className="flex items-center gap-[5px]">
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className={[
                'block w-[7px] h-[7px] rounded-full transition-colors duration-300',
                i < roundsInGame ? 'bg-accent' : i === roundsInGame && roundId ? 'bg-primary' : 'bg-border',
              ].join(' ')}
            />
          ))}
        </div>
        <span className="font-mono text-[10px] text-muted">
          {roundId ? `${Math.min(roundNum, 5)}/5` : '—/5'}
        </span>
      </div>

      <button
        onClick={onConnect}
        className={[
          'font-mono text-[11px] px-3 py-[6px] bg-transparent border cursor-pointer transition-colors duration-150 whitespace-nowrap',
          wallet ? 'border-success text-success' : 'border-border text-muted-hi hover:border-primary hover:text-primary',
        ].join(' ')}
      >
        {wallet ? shortAddr(wallet) : 'Connect Wallet'}
      </button>
    </header>
  )
}
