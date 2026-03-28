import { useState, useEffect, useRef, useCallback } from 'react'
import { ethers } from 'ethers'

import {
  WS_URL,
  CONTRACT_ADDRESS,
  CHAIN_ID,
  STAKE_ETH,
  GAS_LIMIT,
  CONTRACT_ABI,
} from './config.js'

import Header      from './components/Header.jsx'
import WalletModal from './components/WalletModal.jsx'
import JoinScreen  from './screens/JoinScreen.jsx'
import WarScreen   from './screens/WarScreen.jsx'
import EndScreen   from './screens/EndScreen.jsx'

function shortAddr(addr) {
  if (!addr || addr.length < 10) return addr ?? '—'
  return addr.slice(0, 6) + '...' + addr.slice(-4)
}

export default function App() {
  const [screen, setScreen] = useState('join')

  /* Wallet */
  const [wallet,           setWallet]           = useState(null)
  const [signer,           setSigner]           = useState(null)
  const [contract,         setContract]         = useState(null)
  const [walletModal,      setWalletModal]      = useState(false)
  const [availableWallets, setAvailableWallets] = useState([])

  /* Round data */
  const [roundId,     setRoundId]     = useState(null)
  const [timeLeft,    setTimeLeft]    = useState(null)
  const [pot,         setPot]         = useState(null)
  const [playerCount, setPlayerCount] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [submitted,   setSubmitted]   = useState(false)
  const [myMoves,     setMyMoves]     = useState([])

  /* Game data */
  const [currentGame,    setCurrentGame]    = useState(1)
  const [roundsInGame,   setRoundsInGame]   = useState(0)
  const [accumulatedPot, setAccumulatedPot] = useState('0.0')
  const [hasJoinedGame,  setHasJoinedGame]  = useState(false)
  const [gameSummary,    setGameSummary]    = useState(null)

  /* WebSocket */
  const wsRef      = useRef(null)
  const wsTimerRef = useRef(null)
  const [wsConnected, setWsConnected] = useState(false)

  // Check on-chain whether wallet has already staked in the current game
  const checkJoined = useCallback(async (c, gameId) => {
    if (!c || !wallet) return
    try {
      const joined = await c.hasJoinedGame(BigInt(gameId), wallet)
      setHasJoinedGame(joined)
    } catch (_) {}
  }, [wallet])

  /* ── WebSocket ── */
  const handleMessage = useCallback((msg) => {
    switch (msg.type) {
      case 'ROUND_STATE': {
        const newRoundId = msg.roundId
        setRoundId(prev => {
          // New round started — reset submitted and go back to join
          if (prev !== null && prev !== newRoundId) {
            setSubmitted(false)
            setLeaderboard([])
            setScreen(s => s === 'war' ? 'join' : s)
          }
          return newRoundId
        })
        setTimeLeft(msg.timeLeft)
        setPot(msg.pot)
        setPlayerCount(msg.playerCount)
        if (msg.currentGame)    setCurrentGame(msg.currentGame)
        if (msg.roundsInGame !== undefined) setRoundsInGame(msg.roundsInGame)
        if (msg.accumulatedPot) setAccumulatedPot(msg.accumulatedPot)
        break
      }
      case 'MOVE_MADE':
        if (msg.playerCount != null) setPlayerCount(msg.playerCount)
        else setPlayerCount(prev => Math.max(prev ?? 0, 1))
        if (msg.accumulatedPot) setAccumulatedPot(msg.accumulatedPot)
        break
      case 'LEADERBOARD':
        setLeaderboard(msg.players ?? [])
        break
      case 'ROUND_SETTLED':
        // Intermediate rounds — do nothing (ROUND_STATE for next round handles transition)
        // Game-ending round handled by GAME_SETTLED below
        break
      case 'GAME_SETTLED':
        setGameSummary({
          gameId:      msg.gameId,
          winner:      msg.winner,
          winnerScore: msg.winnerScore,
          totalPot:    msg.totalPot,
        })
        setScreen('end')
        break
      case 'GAME_STARTED':
        setCurrentGame(msg.gameId)
        setRoundsInGame(0)
        setAccumulatedPot('0.0')
        setHasJoinedGame(false)
        break
      case 'TICK':
        setTimeLeft(msg.timeLeft)
        if (msg.currentGame)    setCurrentGame(msg.currentGame)
        if (msg.roundsInGame !== undefined) setRoundsInGame(msg.roundsInGame)
        if (msg.accumulatedPot) setAccumulatedPot(msg.accumulatedPot)
        break
      default:
        break
    }
  }, [])

  const wsConnect = useCallback(() => {
    const ws = wsRef.current
    if (ws && ws.readyState < 2) return
    const socket = new WebSocket(WS_URL)
    wsRef.current = socket
    socket.onopen    = () => { clearTimeout(wsTimerRef.current); setWsConnected(true) }
    socket.onmessage = (e) => { try { handleMessage(JSON.parse(e.data)) } catch (_) {} }
    socket.onclose   = () => { setWsConnected(false); wsTimerRef.current = setTimeout(wsConnect, 3000) }
    socket.onerror   = () => socket.close()
  }, [handleMessage])

  useEffect(() => {
    wsConnect()
    return () => { clearTimeout(wsTimerRef.current); wsRef.current?.close() }
  }, [wsConnect])

  // Re-check joined status when game or wallet changes
  useEffect(() => {
    if (contract && currentGame) checkJoined(contract, currentGame)
  }, [contract, currentGame, checkJoined])

  /* ── Wallet discovery ── */
  function getWalletName(p) {
    if (p?.isMetaMask && !p?.isCoinbaseWallet) return 'MetaMask'
    if (p?.isCoinbaseWallet)                   return 'Coinbase Wallet'
    if (p?.isRabby)                            return 'Rabby'
    if (p?.isTrust || p?.isTrustWallet)        return 'Trust Wallet'
    if (p?.isPhantom)                          return 'Phantom'
    if (p?.isBraveWallet)                      return 'Brave Wallet'
    if (p?.isOkxWallet || p?.isOKExWallet)     return 'OKX Wallet'
    if (p?.isBybit)                            return 'Bybit Wallet'
    return 'Browser Wallet'
  }

  async function discoverWallets() {
    const found = []
    const handler = (e) => { if (e.detail) found.push(e.detail) }
    window.addEventListener('eip6963:announceProvider', handler)
    window.dispatchEvent(new Event('eip6963:requestProvider'))
    await new Promise(r => setTimeout(r, 150))
    window.removeEventListener('eip6963:announceProvider', handler)
    if (found.length > 0) return found
    if (window.ethereum?.providers?.length) {
      return window.ethereum.providers.map((p, i) => ({
        info: { name: getWalletName(p), uuid: String(i), rdns: '', icon: '' }, provider: p,
      }))
    }
    if (window.ethereum) {
      return [{ info: { name: getWalletName(window.ethereum), uuid: 'default', rdns: '', icon: '' }, provider: window.ethereum }]
    }
    return []
  }

  const connectToWallet = useCallback(async (walletEntry) => {
    setWalletModal(false)
    const raw = walletEntry.provider
    try {
      const provider = new ethers.BrowserProvider(raw)
      await provider.send('eth_requestAccounts', [])
      const net = await provider.getNetwork()
      if (Number(net.chainId) !== CHAIN_ID) {
        try {
          await raw.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x' + CHAIN_ID.toString(16) }] })
        } catch (err) {
          if (err.code === 4902) {
            await raw.request({ method: 'wallet_addEthereumChain', params: [{ chainId: '0x' + CHAIN_ID.toString(16), chainName: 'Monad Testnet', rpcUrls: ['https://testnet-rpc.monad.xyz'], nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 } }] })
          } else throw err
        }
      }
      const fresh = new ethers.BrowserProvider(raw)
      const s     = await fresh.getSigner()
      const addr  = await s.getAddress()
      const c     = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, s)
      setSigner(s); setWallet(addr); setContract(c)
      checkJoined(c, currentGame)
    } catch (err) {
      alert('Connect failed: ' + (err?.shortMessage ?? err?.message ?? 'Unknown error'))
    }
  }, [currentGame, checkJoined])

  const connectWallet = useCallback(async () => {
    const wallets = await discoverWallets()
    if (wallets.length === 0) { alert('No EVM wallet detected. Install MetaMask, Rabby, or any EVM wallet.'); return }
    if (wallets.length === 1) { await connectToWallet(wallets[0]) }
    else { setAvailableWallets(wallets); setWalletModal(true) }
  }, [connectToWallet])

  /* ── Submit Move ── */
  const submitMove = useCallback(async (choice) => {
    if (!signer || !contract) throw new Error('Wallet not connected')
    if (submitted) throw new Error('AlreadySubmitted')

    // First submission in this game pays stake; returning players send 0
    const value = hasJoinedGame ? '0' : STAKE_ETH
    const tx = await contract.submit(choice, {
      value:    ethers.parseEther(value),
      gasLimit: GAS_LIMIT,
    })
    await tx.wait()

    setSubmitted(true)
    setHasJoinedGame(true)
    setMyMoves(prev => { const next = [...prev, choice]; return next.length > 5 ? next.slice(-5) : next })
    setScreen('war')
  }, [signer, contract, submitted, hasJoinedGame])

  /* ── Reset after game end ── */
  const resetGame = useCallback(() => {
    setSubmitted(false)
    setLeaderboard([])
    setGameSummary(null)
    setMyMoves([])
    setScreen('join')
  }, [])

  const wsLabel = wsConnected ? 'Live' : 'Reconnecting...'

  return (
    <div className="flex flex-col min-h-screen bg-bg text-primary font-sans">
      {walletModal && (
        <WalletModal wallets={availableWallets} onSelect={connectToWallet} onClose={() => setWalletModal(false)} />
      )}

      <Header
        roundId={roundId}
        currentGame={currentGame}
        roundsInGame={roundsInGame}
        wallet={wallet}
        onConnect={connectWallet}
        shortAddr={shortAddr}
      />

      <main className="flex flex-col flex-1 overflow-y-auto">
        {screen === 'join' && (
          <JoinScreen
            timeLeft={timeLeft}
            playerCount={playerCount}
            accumulatedPot={accumulatedPot}
            currentGame={currentGame}
            roundsInGame={roundsInGame}
            wallet={wallet}
            submitted={submitted}
            hasJoinedGame={hasJoinedGame}
            onSubmit={submitMove}
          />
        )}
        {screen === 'war' && (
          <WarScreen
            timeLeft={timeLeft}
            accumulatedPot={accumulatedPot}
            playerCount={playerCount}
            currentGame={currentGame}
            roundsInGame={roundsInGame}
            leaderboard={leaderboard}
            wallet={wallet}
            shortAddr={shortAddr}
          />
        )}
        {screen === 'end' && (
          <EndScreen
            gameSummary={gameSummary}
            myMoves={myMoves}
            currentGame={currentGame}
            leaderboard={leaderboard}
            onNextGame={resetGame}
            shortAddr={shortAddr}
            wallet={wallet}
          />
        )}
      </main>

      <footer className="flex justify-between items-center px-6 py-2 border-t border-border flex-shrink-0">
        <span className="flex items-center gap-2 font-mono text-[10px] text-muted">
          <span className={['inline-block w-[5px] h-[5px] rounded-full', wsConnected ? 'bg-success animate-blink' : 'bg-muted'].join(' ')} />
          {wsLabel}
        </span>
        <span className="font-mono text-[10px] text-muted">
          {wallet ? `Monad Testnet · ${shortAddr(wallet)}` : 'Monad Testnet'}
        </span>
      </footer>
    </div>
  )
}
