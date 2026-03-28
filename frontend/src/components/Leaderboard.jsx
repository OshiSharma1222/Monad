import { useRef, useEffect } from 'react'

export default function Leaderboard({ rows, wallet, shortAddr, revealed }) {
  const prevRowsRef = useRef([])
  const flashSet    = useRef(new Set())

  // Detect new addresses that weren't in previous render
  useEffect(() => {
    if (!rows.length) {
      prevRowsRef.current = []
      return
    }

    const prevAddrs = new Set(prevRowsRef.current.map(r => r.address?.toLowerCase()))
    const newAddrs  = rows
      .map(r => r.address?.toLowerCase())
      .filter(a => a && !prevAddrs.has(a))

    if (newAddrs.length) {
      flashSet.current = new Set(newAddrs)
      // Clear after animation duration
      setTimeout(() => { flashSet.current = new Set() }, 1500)
    }

    prevRowsRef.current = rows
  }, [rows])

  if (!rows.length) {
    return (
      <div className="flex items-center justify-center py-10 text-muted font-sans text-sm">
        Waiting for players...
      </div>
    )
  }

  const myKey = wallet?.toLowerCase()

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {['#', 'Player', 'Score', 'Choice', 'Moves'].map(h => (
              <th
                key={h}
                className="px-3 py-[10px] text-[9px] tracking-[0.12em] uppercase text-muted font-normal text-left border-b border-border"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((p, i) => {
            const addrKey = p.address?.toLowerCase()
            const isMe    = addrKey === myKey
            const isFlash = flashSet.current.has(addrKey)

            return (
              <tr
                key={p.address}
                className={[
                  'transition-colors duration-200 hover:bg-surface',
                  isFlash ? 'row-flash' : '',
                ].join(' ')}
              >
                {/* Rank */}
                <td className="px-3 py-[11px] font-mono text-[10px] text-muted border-b border-border w-8">
                  {i + 1}
                </td>

                {/* Address */}
                <td className={['px-3 py-[11px] font-mono text-xs border-b border-border', isMe ? 'text-primary' : 'text-muted-hi'].join(' ')}>
                  {shortAddr(p.address)}
                  {isMe && (
                    <span className="text-accent text-[9px] ml-1">(you)</span>
                  )}
                </td>

                {/* Score */}
                <td className="px-3 py-[11px] font-mono text-xs font-bold text-primary border-b border-border">
                  {p.score ?? 0}
                </td>

                {/* Choice — hidden until revealed */}
                <td className="px-3 py-[11px] font-mono text-xs border-b border-border text-muted">
                  {revealed ? (
                    <span className="text-primary">{p.choice ?? '—'}</span>
                  ) : '—'}
                </td>

                {/* Move count */}
                <td className="px-3 py-[11px] font-mono text-[10px] text-muted border-b border-border">
                  {p.moveCount ?? 1}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
