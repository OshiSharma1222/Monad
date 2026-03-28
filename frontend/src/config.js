export const WS_URL           = 'wss://mimicwar.onrender.com'
export const CONTRACT_ADDRESS = '0x0F98eCD19B26fDF1cCC1b939406A24Ca992Fd98E'
export const CHAIN_ID         = 10143
export const STAKE_ETH        = '0.001'
export const GAS_LIMIT        = 300000n

export const CONTRACT_ABI = [
  'function submit(uint8 choice) payable',
  'function currentRound() view returns (uint256)',
  'function currentGame() view returns (uint256)',
  'function roundsInGame() view returns (uint256)',
  'function timeLeft() view returns (uint256)',
  'function getRoundsLeft() view returns (uint256)',
  'function getAccumulatedPot() view returns (uint256)',
  'function hasJoinedGame(uint256 gameId, address player) view returns (bool)',
  'function getGameInfo(uint256 gameId) view returns (uint256 gameId_, uint256 totalPot, address winner, uint32 winnerScore, bool finished)',
  'error RoundNotActive()',
  'error AlreadySubmitted()',
  'error InvalidChoice()',
  'error InsufficientStake()',
  'error RoundAlreadySettled()',
  'error RoundStillActive()',
  'error NoPlayersThisRound()',
  'error AlreadyInGame()',
]
