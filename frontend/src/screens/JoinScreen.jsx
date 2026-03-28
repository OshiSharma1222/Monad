import { useState } from 'react'

export default function JoinScreen({
  timeLeft,
  pot,
  playerCount,
  wallet,
  submitted,
  onSubmit,
}) {
  const [choice,   setChoice]   = useState(50)
  const [loading,  setLoading]  = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async () => {
    if (!wallet || submitted || loading || timeLeft === 0) return
    setLoading(true)
    setErrorMsg('')
    try {
      await onSubmit(choice)
    } catch (err) {
      const msg = err?.shortMessage ?? err?.message ?? 'Unknown error'
      if      (msg.includes('AlreadySubmitted'))    setErrorMsg('Already submitted this round.')
      else if (msg.includes('RoundNotActive'))       setErrorMsg('Round just ended — wait for next one.')
      else if (msg.includes('InsufficientStake'))    setErrorMsg('Need 0.001 MON minimum stake.')
      else if (msg.includes('insufficient balance')) setErrorMsg('Not enough MON for gas + stake.')
      else                                           setErrorMsg(msg.slice(0, 120))
    } finally {
      setLoading(false)
    }
  }

  /* ── Submit button label + disabled state ── */
  let btnLabel    = ''
  let btnDisabled = false

  if (!wallet) {
    btnLabel    = 'Connect wallet to play'
    btnDisabled = true
  } else if (timeLeft === 0) {
    btnLabel    = 'Round ended — wait'
    btnDisabled = true
  } else if (submitted) {
    btnLabel    = 'Submitted ✓'
    btnDisabled = true
  } else if (loading) {
    btnLabel    = 'Confirming on Monad...'
    btnDisabled = true
  } else {
    btnLabel    = 'Submit + Stake 0.001 MON'
    btnDisabled = false
  }

  const isHot = timeLeft > 0 && timeLeft <= 10

  return (
    <div className="flex-1 grid place-items-center px-5 py-10">
      <div className="w-full max-w-[420px] flex flex-col gap-9">

        {/* ── Meta row ── */}
        <div
          className="grid grid-cols-3 gap-px bg-border"
          style={{ gridTemplateColumns: '1fr 1fr 1fr' }}
        >
          {[
            {
              label: 'Time Left',
              value: timeLeft !== null && timeLeft !== undefined ? `${timeLeft}s` : '—',
              red: true,
              hot: isHot,
            },
            {
              label: 'Pot',
              value: pot ? `${pot} MON` : '—',
              red: false,
              hot: false,
            },
            {
              label: 'Players',
              value: playerCount ?? '—',
              red: false,
              hot: false,
            },
          ].map(({ label, value, red, hot }) => (
            <div key={label} className="bg-surface px-4 py-[14px]">
              <div className="text-[9px] tracking-[0.18em] uppercase text-muted mb-[5px]">
                {label}
              </div>
              <div
                className={[
                  'font-mono text-lg font-bold',
                  red ? 'text-accent' : 'text-primary',
                  hot ? 'animate-pulse' : '',
                ].join(' ')}
              >
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* ── Number picker ── */}
        <div className="flex flex-col items-center gap-5">
          {/* Giant number */}
          <div className="font-mono text-[100px] font-bold leading-none text-primary tracking-tight select-none">
            {choice}
          </div>

          {/* Range slider */}
          <div className="w-full">
            <input
              type="range"
              min={1}
              max={100}
              value={choice}
              onChange={e => setChoice(Number(e.target.value))}
              disabled={submitted || loading || timeLeft === 0}
              className="w-full"
            />
            <div className="flex justify-between mt-2 font-mono text-[10px] text-muted">
              <span>1</span>
              <span>50</span>
              <span>100</span>
            </div>
          </div>
        </div>

        {/* ── Error message ── */}
        {errorMsg && (
          <p className="text-accent text-xs text-center -mt-4">{errorMsg}</p>
        )}

        {/* ── Submit button ── */}
        <button
          onClick={handleSubmit}
          disabled={btnDisabled}
          className={[
            'w-full py-[17px] font-sans text-sm font-semibold tracking-[0.03em]',
            'border-0 transition-colors duration-150',
            btnDisabled
              ? 'bg-surface text-muted cursor-not-allowed border border-border'
              : 'bg-accent text-white cursor-pointer hover:bg-[#bc1a1a]',
          ].join(' ')}
        >
          {btnLabel}
        </button>

        {/* ── Hint ── */}
        <p className="text-[11px] text-muted text-center -mt-5">
          Minimum stake · 0.001 MON · Round lasts 30s
        </p>

      </div>
    </div>
  )
}
