export default function MoveGraph({ moves }) {
  if (!moves || moves.length === 0) return null

  return (
    <div className="w-full">
      <div className="text-[9px] tracking-[0.18em] uppercase text-muted mb-[14px]">
        Last 5 Moves This Session
      </div>
      {/* 80px tall container, bars aligned to bottom */}
      <div className="flex items-end gap-2 h-20">
        {moves.map((v, i) => {
          const height = Math.max(4, Math.round((v / 100) * 72))
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end gap-[5px] h-full"
            >
              <div
                className="w-full bg-accent-dim border-t-2 border-accent transition-all duration-500"
                style={{ height: `${height}px` }}
              />
              <span className="font-mono text-[10px] text-muted-hi">{v}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
