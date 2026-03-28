import { useState, useRef } from 'react'

export default function JoinScreen({
  timeLeft,
  playerCount,
  accumulatedPot,
  currentGame,
  roundsInGame,
  wallet,
  submitted,
  hasJoinedGame,
  onSubmit,
}) {
  const [choice,   setChoice]   = useState(50)
  const [loading,  setLoading]  = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const submitting = useRef(false)

  const roundReady = timeLeft !== null && timeLeft !== undefined
  const roundLive  = roundReady && timeLeft > 0
  const roundNum   = roundsInGame + 1  // current round (1-5)

  const handleSubmit = async () => {
    if (!wallet || submitted || loading || !roundLive || submitting.current) return
    submitting.current = true
    setLoading(true)
    setErrorMsg('')
    try {
      await onSubmit(choice)
    } catch (err) {
      const reason = err?.errorName ?? err?.reason ?? err?.shortMessage ?? err?.message ?? ''
      if      (reason.includes('AlreadySubmitted'))  setErrorMsg('Already submitted this round.')
      else if (reason.includes('RoundNotActive'))    setErrorMsg('Round expired — wait for next.')
      else if (reason.includes('InsufficientStake')) setErrorMsg('Need at least 0.001 MON to enter.')
      else if (reason.includes('InvalidChoice'))     setErrorMsg('Choice must be 1–100.')
      else if (reason.includes('AlreadyInGame'))     setErrorMsg('Returning player — send 0 value.')
      else if (reason.includes('insufficient balance') || reason.includes('Signer had insufficient')) setErrorMsg('Not enough MON for gas.')
      else if (reason.includes('execution reverted')) setErrorMsg('Round expired — wait for next.')
      else setErrorMsg(reason.slice(0, 140) || 'Transaction failed.')
    } finally {
      setLoading(false)
      submitting.current = false
    }
  }

  /* Button state */
  let btnLabel, btnDisabled
  if (!wallet)         { btnLabel = 'Connect wallet to play';     btnDisabled = true  }
  else if (!roundReady){ btnLabel = 'Waiting for round data...';  btnDisabled = true  }
  else if (!roundLive) { btnLabel = 'Round ended — wait';         btnDisabled = true  }
  else if (submitted)  { btnLabel = 'Submitted ✓';                btnDisabled = true  }
  else if (loading)    { btnLabel = 'Confirming on Monad...';     btnDisabled = true  }
  else if (hasJoinedGame) { btnLabel = `Submit · Round ${Math.min(roundNum,5)}/5 · Free`; btnDisabled = false }
  else                 { btnLabel = 'Enter Game · 0.001 MON';     btnDisabled = false }

  const isHot = roundLive && timeLeft <= 10

  return (
    <div className="flex-1 grid place-items-center px-5 py-10">
      <div className="w-full max-w-[400px] flex flex-col gap-8">

        {/* ── Game pot banner ── */}
        <div className="text-center">
          <div className="text-[9px] tracking-[0.2em] uppercase text-muted mb-1">
            Game {currentGame} · Prize Pool
          </div>
          <div className="font-mono text-3xl font-bold text-primary">
            {accumulatedPot && accumulatedPot !== '0.0' ? `${Number(accumulatedPot).toFixed(3)} MON` : '—'}
          </div>
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-3 gap-px bg-border">
          {[
            {
              label: 'Time Left',
              value: roundReady ? `${timeLeft}s` : '—',
              hot: isHot,
              red: true,
            },
            {
              label: 'Round',
              value: roundReady ? `${Math.min(roundNum, 5)} / 5` : '—',
              hot: false,
              red: false,
            },
            {
              label: 'Players',
              value: playerCount ?? '—',
              hot: false,
              red: false,
            },
          ].map(({ label, value, hot, red }) => (
            <div key={label} className="bg-surface px-4 py-3">
              <div className="text-[9px] tracking-[0.16em] uppercase text-muted mb-1">{label}</div>
              <div className={[
                'font-mono text-lg font-bold',
                red ? 'text-accent' : 'text-primary',
                hot ? 'animate-pulse' : '',
              ].join(' ')}>
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* ── Number picker ── */}
        <div className="flex flex-col items-center gap-4">
          <div className="font-mono text-[96px] font-bold leading-none text-primary tracking-tight select-none tabular-nums">
            {choice}
          </div>
          <div className="w-full">
            <input
              type="range"
              min={1} max={100}
              value={choice}
              onChange={e => setChoice(Number(e.target.value))}
              disabled={submitted || loading || !roundLive}
              className="w-full"
            />
            <div className="flex justify-between mt-2 font-mono text-[10px] text-muted">
              <span>1</span><span>50</span><span>100</span>
            </div>
          </div>
        </div>

        {/* ── Error ── */}
        {errorMsg && (
          <p className="text-accent text-xs text-center -mt-4">{errorMsg}</p>
        )}

        {/* ── Submit button ── */}
        <button
          onClick={handleSubmit}
          disabled={btnDisabled}
          className={[
            'w-full py-4 font-sans text-sm font-semibold tracking-wide border-0 transition-colors duration-150',
            btnDisabled
              ? 'bg-surface text-muted cursor-not-allowed border border-border'
              : hasJoinedGame
              ? 'bg-surface text-primary cursor-pointer hover:bg-border border border-primary'
              : 'bg-accent text-white cursor-pointer hover:bg-[#bc1a1a]',
          ].join(' ')}
        >
          {btnLabel}
        </button>

        {/* ── Hint ── */}
        <p className="text-[10px] text-muted text-center -mt-4">
          {hasJoinedGame
            ? 'You already staked · subsequent rounds are free'
            : '0.001 MON stake · play all 5 rounds · winner takes the pot'}
        </p>

      </div>
    </div>
  )
}
