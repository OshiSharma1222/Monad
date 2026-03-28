/* WalletModal.jsx — wallet picker shown when multiple wallets are detected */
export default function WalletModal({ wallets, onSelect, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border w-full max-w-xs mx-4 flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <span className="text-[10px] tracking-[0.18em] uppercase text-muted">
            Select Wallet
          </span>
          <button
            onClick={onClose}
            className="text-muted hover:text-primary text-xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        {/* Wallet list */}
        <div className="flex flex-col p-2">
          {wallets.map((w) => (
            <button
              key={w.info?.uuid ?? w.info?.name ?? Math.random()}
              onClick={() => onSelect(w)}
              className="flex items-center gap-3.5 px-4 py-3 text-left border border-transparent
                         hover:border-border-hi hover:bg-bg transition-colors"
            >
              {w.info?.icon ? (
                <img
                  src={w.info.icon}
                  alt={w.info.name}
                  className="w-8 h-8 rounded-lg flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-border flex-shrink-0 grid place-items-center">
                  <span className="text-muted text-xs font-mono">?</span>
                </div>
              )}
              <div>
                <div className="font-mono text-sm text-primary">{w.info?.name ?? 'Browser Wallet'}</div>
                {w.info?.rdns && (
                  <div className="text-[10px] text-muted mt-0.5">{w.info.rdns}</div>
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-border">
          <p className="text-[10px] text-muted text-center">
            Don't have a wallet?{' '}
            <a
              href="https://metamask.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-hi hover:text-primary underline transition-colors"
            >
              Install MetaMask
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
