# MimicWar ⚔️

> **The most unpredictable player wins.**
> An on-chain behavioral fingerprinting game deployed on Monad testnet.

---

## What is MimicWar?

MimicWar is a round-based on-chain game where players submit a number between **1 and 100** every 30 seconds. The winner isn't the highest number — it's the **most unpredictable player**, scored by an on-chain algorithm that analyzes your historical behavior.

The more you vary your choices, surprise the average, and avoid repeating yourself — the higher your score. The highest scorer takes the full pot.

---

## How the Score Works (0–1000)

Every submission is scored across three components:

| Component | Weight | Logic |
|---|---|---|
| **Variance** | 0–400 pts | How spread out are your last 5 moves? |
| **Surprise** | 0–400 pts | How far is this move from your all-time average? |
| **Anti-repeat** | −200 pts | Did you just repeat your last move? Penalty. |

> First move ever → baseline score of **500**

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Monad Testnet                       │
│                                                      │
│   ┌──────────────────────────────────────────────┐  │
│   │           MimicWar.sol (Solidity)            │  │
│   │  submit() → score → pot → settleRound()      │  │
│   └──────────────────────────────────────────────┘  │
└─────────────────┬───────────────────────────────────┘
                  │ events (eth_getLogs polling)
                  ▼
┌─────────────────────────────────────────────────────┐
│              Node.js Backend                         │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────┐ │
│  │listener  │  │analyzer  │  │  roundManager      │ │
│  │(events)  │  │(stats)   │  │  (auto-settler)    │ │
│  └────┬─────┘  └──────────┘  └────────────────────┘ │
│       │                                              │
│  ┌────▼─────────────────────────────────────────┐   │
│  │          WebSocket Server (:8080)            │   │
│  │  ROUND_STATE · MOVE_MADE · LEADERBOARD       │   │
│  │  ROUND_SETTLED · TICK                        │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
                  │ ws://
                  ▼
         Frontend / Clients
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Smart Contract | Solidity ^0.8.20 |
| Blockchain | Monad Testnet (Chain ID: 10143) |
| Backend | Node.js + ethers.js v6 |
| Real-time | WebSocket (`ws`) |
| Deployment | Hardhat |

---

## Contract

| Field | Value |
|---|---|
| Address | `0x448b7b91620e0C8c94E730b577C7b07322c57d87` |
| Network | Monad Testnet |
| Chain ID | 10143 |
| RPC | https://testnet-rpc.monad.xyz |

---

## Project Structure

```
MimicWar/
│
├── MimicWar.sol              # Smart contract
│
├── index.js                  # Backend entry point
├── listener.js               # Contract event listener
├── analyzer.js               # In-memory player stats
├── wsServer.js               # WebSocket broadcast server
├── roundManager.js           # Auto-calls settleRound()
├── test-game.js              # 3-player game simulator
│
├── hardhat/
│   ├── contracts/
│   │   └── MimicWar.sol      # Contract (deployment copy)
│   ├── scripts/
│   │   └── deploy.js         # Deployment script
│   └── hardhat.config.js     # Monad testnet config
│
└── .env.example              # Environment variables template
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- A wallet with Monad testnet MON ([faucet](https://faucet.monad.xyz))

### 1. Clone & install

```bash
git clone https://github.com/OshiSharma1222/Monad.git
cd Monad
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
CONTRACT_ADDRESS=0x448b7b91620e0C8c94E730b577C7b07322c57d87
SETTLER_PRIVATE_KEY=0xYourPrivateKeyHere
WS_PORT=8080
```

### 3. Start the backend

```bash
npm start
```

You'll see the war room come alive:

```
╔══════════════════════════════════════════════════╗
║       M I M I C W A R  —  W A R  R O O M        ║
╚══════════════════════════════════════════════════╝
  Contract  : 0x448b7b91620e0C8c94E730b577C7b07322c57d87
  Round     : #7  (3 players, pot: 0.003 MON)
```

### 4. Simulate a game (optional)

In a second terminal:

```bash
node test-game.js
```

This funds 3 throwaway wallets and submits moves automatically.

---

## Deploy Your Own Contract

```bash
cd hardhat
npm install
cp .env.example .env        # add DEPLOYER_PRIVATE_KEY
npm run compile
npm run deploy
```

Copy the printed contract address into your root `.env` as `CONTRACT_ADDRESS`.

---

## WebSocket API

Connect to `ws://localhost:8080` to receive live game events.

### Message Types

**`ROUND_STATE`** — sent on connect and each new round
```json
{
  "type": "ROUND_STATE",
  "roundId": 7,
  "timeLeft": 28,
  "playerCount": 3,
  "pot": "0.003"
}
```

**`MOVE_MADE`** — every player submission
```json
{
  "type": "MOVE_MADE",
  "roundId": 7,
  "player": "0x0B41...A196",
  "choice": 73,
  "score": 847,
  "timestamp": 1711613052000
}
```

**`LEADERBOARD`** — sorted snapshot after every move
```json
{
  "type": "LEADERBOARD",
  "roundId": 7,
  "players": [
    { "address": "0x0B41...A196", "score": 847, "choice": 73, "moveCount": 5 }
  ]
}
```

**`ROUND_SETTLED`** — when a round resolves
```json
{
  "type": "ROUND_SETTLED",
  "roundId": 7,
  "winner": "0x0B41...A196",
  "prize": "0.003",
  "winnerScore": 847
}
```

**`TICK`** — every second
```json
{
  "type": "TICK",
  "timeLeft": 14,
  "roundId": 7
}
```

---

## Monad Testnet Setup (MetaMask)

| Field | Value |
|---|---|
| Network Name | Monad Testnet |
| RPC URL | `https://testnet-rpc.monad.xyz` |
| Chain ID | `10143` |
| Currency | `MON` |
| Explorer | `https://testnet.monadexplorer.com` |

---

## Key Design Decisions

- **Re-entrancy safe** — new round starts before prize is paid out (CEI pattern)
- **No eth_newFilter** — Monad testnet doesn't support it; backend polls `eth_getLogs` instead
- **Event deduplication** — listener deduplicates by `txHash + logIndex` to handle polling re-delivery
- **Empty round handling** — rounds with 0 players settle gracefully and advance the game
- **In-memory stats** — no database required; stats reset on restart (sufficient for demo/testnet)

---

## License

MIT
