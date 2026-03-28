export default function Header({ roundId, wallet, onConnect, shortAddr }) {
  return (
    <header className="flex items-center justify-between px-7 py-[18px] border-b border-border flex-shrink-0">
      {/* Logo */}
      <div className="font-mono text-[15px] font-bold tracking-[0.22em] text-primary">
        MIMIC<span className="text-accent">WAR</span>
      </div>

      {/* Round tag */}
      <div className="font-mono text-[10px] tracking-[0.12em] text-muted px-[9px] py-[3px] border border-border">
        {roundId ? `ROUND ${roundId}` : 'ROUND —'}
      </div>

      {/* Wallet button */}
      <button
        onClick={onConnect}
        className={[
          'font-mono text-[11px] px-[14px] py-[7px] bg-transparent border cursor-pointer',
          'transition-colors duration-150 whitespace-nowrap',
          wallet
            ? 'border-success text-success'
            : 'border-border text-muted-hi hover:border-primary hover:text-primary',
        ].join(' ')}
      >
        {wallet ? shortAddr(wallet) : 'Connect Wallet'}
      </button>
    </header>
  )
}
