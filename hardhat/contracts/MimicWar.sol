// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title  MimicWar — 5-Round Game System
/// @notice Stake once per game, play all 5 rounds free. Most unpredictable player wins.
contract MimicWar {

    uint256 public constant TOTAL_ROUNDS   = 5;
    uint256 public constant ROUND_DURATION = 30;
    uint256 public constant MIN_STAKE      = 0.001 ether;
    uint8   public constant HISTORY_SIZE   = 5;

    error RoundNotActive();
    error AlreadySubmitted();
    error InvalidChoice();
    error InsufficientStake();
    error RoundAlreadySettled();
    error RoundStillActive();
    error NoPlayersThisRound();
    error AlreadyInGame();      // sent value on a non-first-round submission

    struct Fingerprint {
        uint8[5] lastMoves;
        uint8    bufferIndex;
        uint8    moveCount;
        uint32   totalSum;
        uint32   unpredictScore;
        bool     hasSubmitted;
        uint8    currentChoice;
    }

    struct Round {
        uint256 startTime;
        uint256 pot;
        uint256 playerCount;
        bool    settled;
        address winner;
    }

    struct Game {
        uint256 gameId;
        uint256 totalPot;
        address winner;
        uint32  winnerScore;
        bool    finished;
    }

    event RoundStarted(uint256 indexed roundId, uint256 startTime);
    event MoveMade(uint256 indexed roundId, address indexed player, uint8 choice, uint32 score);
    event RoundSettled(uint256 indexed roundId, address indexed winner, uint256 prize, uint32 winnerScore);
    event ScoreUpdated(address indexed player, uint32 newScore, uint8 choice);
    event RoundCompleted(uint256 indexed gameId, uint256 roundNumber, uint256 roundPot);
    event GameStarted(uint256 indexed gameId);
    event GameSettled(uint256 indexed gameId, address winner, uint256 totalPot, uint32 winnerScore);

    mapping(address => Fingerprint)              public fingerprints;
    mapping(uint256 => Round)                    public rounds;
    mapping(uint256 => address[])                public roundPlayers;
    mapping(uint256 => Game)                     public games;
    mapping(uint256 => address[])                private gamePlayers;
    mapping(uint256 => mapping(address => bool)) private gamePlayerSeen;

    uint256 public currentRound;
    uint256 public currentGame;
    uint256 public roundsInGame;
    uint256 public accumulatedPot;

    constructor() {
        currentGame = 1;
        games[1].gameId = 1;
        emit GameStarted(1);
        _startNewRound();
    }

    /// @notice Submit a choice. First submission per game requires 0.001 MON stake;
    ///         subsequent rounds in the same game are free (send 0 value).
    function submit(uint8 choice) external payable {
        if (choice < 1 || choice > 100) revert InvalidChoice();

        Round storage round = rounds[currentRound];
        if (round.settled || block.timestamp >= round.startTime + ROUND_DURATION)
            revert RoundNotActive();

        Fingerprint storage fp = fingerprints[msg.sender];
        if (fp.hasSubmitted) revert AlreadySubmitted();

        bool firstInGame = !gamePlayerSeen[currentGame][msg.sender];
        if (firstInGame) {
            if (msg.value < MIN_STAKE) revert InsufficientStake();
        } else {
            // Returning player — must send 0 to avoid accidental loss
            if (msg.value > 0) revert AlreadyInGame();
        }

        uint32 score = _calculateUnpredictability(fp, choice);
        _updateHistory(fp, choice);

        fp.unpredictScore = score;
        fp.hasSubmitted   = true;
        fp.currentChoice  = choice;

        if (firstInGame) {
            round.pot += msg.value;
            gamePlayerSeen[currentGame][msg.sender] = true;
            gamePlayers[currentGame].push(msg.sender);
        }

        round.playerCount += 1;
        roundPlayers[currentRound].push(msg.sender);

        emit MoveMade(currentRound, msg.sender, choice, score);
        emit ScoreUpdated(msg.sender, score, choice);
    }

    function settleRound() external {
        uint256 roundId     = currentRound;
        Round storage round = rounds[roundId];

        if (round.settled)                                       revert RoundAlreadySettled();
        if (block.timestamp < round.startTime + ROUND_DURATION)  revert RoundStillActive();

        address[] storage players = roundPlayers[roundId];

        if (players.length == 0) {
            round.settled = true;
            roundsInGame++;
            emit RoundSettled(roundId, address(0), 0, 0);
            if (roundsInGame >= TOTAL_ROUNDS) {
                _settleGame();
            } else {
                emit RoundCompleted(currentGame, roundsInGame, 0);
                _startNewRound();
            }
            return;
        }

        address roundWinner;
        uint32  highestScore;
        uint256 count = players.length;

        for (uint256 i = 0; i < count; ) {
            address player = players[i];
            uint32  score  = fingerprints[player].unpredictScore;
            if (roundWinner == address(0) || score > highestScore) {
                highestScore = score;
                roundWinner  = player;
            }
            unchecked { ++i; }
        }

        round.settled = true;
        round.winner  = roundWinner;

        uint256 roundPot = round.pot;
        accumulatedPot  += roundPot;
        roundsInGame++;

        for (uint256 i = 0; i < count; ) {
            fingerprints[players[i]].hasSubmitted = false;
            unchecked { ++i; }
        }

        emit RoundSettled(roundId, roundWinner, roundPot, highestScore);

        if (roundsInGame >= TOTAL_ROUNDS) {
            _settleGame();
        } else {
            emit RoundCompleted(currentGame, roundsInGame, roundPot);
            _startNewRound();
        }
    }

    function _settleGame() internal {
        uint256 gameId = currentGame;
        address[] storage allPlayers = gamePlayers[gameId];
        uint256 count = allPlayers.length;

        if (count == 0) {
            games[gameId].finished = true;
            emit GameSettled(gameId, address(0), 0, 0);
            roundsInGame   = 0;
            accumulatedPot = 0;
            currentGame++;
            games[currentGame].gameId = currentGame;
            emit GameStarted(currentGame);
            _startNewRound();
            return;
        }

        address gameWinner;
        uint32  highestScore;

        for (uint256 i = 0; i < count; ) {
            address player = allPlayers[i];
            uint32  score  = fingerprints[player].unpredictScore;
            if (gameWinner == address(0) || score > highestScore) {
                highestScore = score;
                gameWinner   = player;
            }
            unchecked { ++i; }
        }

        uint256 prize = accumulatedPot;

        games[gameId].finished    = true;
        games[gameId].winner      = gameWinner;
        games[gameId].totalPot    = prize;
        games[gameId].winnerScore = highestScore;

        roundsInGame   = 0;
        accumulatedPot = 0;
        currentGame++;
        games[currentGame].gameId = currentGame;

        emit GameSettled(gameId, gameWinner, prize, highestScore);
        emit GameStarted(currentGame);
        _startNewRound();

        (bool ok, ) = gameWinner.call{value: prize}("");
        require(ok, "MimicWar: transfer failed");
    }

    // ─── View Functions ───────────────────────────────────────────────────────────

    function hasJoinedGame(uint256 gameId, address player) external view returns (bool) {
        return gamePlayerSeen[gameId][player];
    }

    function getLeaderboard(uint256 roundId)
        external view
        returns (address[] memory addrs, uint32[] memory scores, uint8[] memory choices)
    {
        address[] storage players = roundPlayers[roundId];
        uint256 n = players.length;
        addrs   = new address[](n);
        scores  = new uint32[](n);
        choices = new uint8[](n);
        for (uint256 i = 0; i < n; ) {
            address p  = players[i];
            addrs[i]   = p;
            scores[i]  = fingerprints[p].unpredictScore;
            choices[i] = fingerprints[p].currentChoice;
            unchecked { ++i; }
        }
    }

    function getFingerprint(address player)
        external view
        returns (uint8[5] memory lastMoves, uint8 bufferIndex, uint8 moveCount,
                 uint32 totalSum, uint32 unpredictScore, bool hasSubmitted, uint8 currentChoice)
    {
        Fingerprint storage fp = fingerprints[player];
        return (fp.lastMoves, fp.bufferIndex, fp.moveCount, fp.totalSum,
                fp.unpredictScore, fp.hasSubmitted, fp.currentChoice);
    }

    function getRoundInfo(uint256 roundId)
        external view
        returns (uint256 startTime, uint256 pot, uint256 playerCount, bool settled, address winner)
    {
        Round storage r = rounds[roundId];
        return (r.startTime, r.pot, r.playerCount, r.settled, r.winner);
    }

    function getGameInfo(uint256 gameId)
        external view
        returns (uint256 gameId_, uint256 totalPot, address winner, uint32 winnerScore, bool finished)
    {
        Game storage g = games[gameId];
        return (g.gameId, g.totalPot, g.winner, g.winnerScore, g.finished);
    }

    function timeLeft() external view returns (uint256) {
        uint256 endTime = rounds[currentRound].startTime + ROUND_DURATION;
        if (block.timestamp >= endTime) return 0;
        return endTime - block.timestamp;
    }

    function getRoundsLeft() external view returns (uint256) {
        return TOTAL_ROUNDS - roundsInGame;
    }

    function getAccumulatedPot() external view returns (uint256) {
        return accumulatedPot;
    }

    // ─── Internal ─────────────────────────────────────────────────────────────────

    function _calculateUnpredictability(Fingerprint storage fp, uint8 choice)
        internal view returns (uint32)
    {
        if (fp.moveCount == 0) return 500;
        uint8 count = fp.moveCount < HISTORY_SIZE ? fp.moveCount : HISTORY_SIZE;

        uint256 bufSum = 0;
        for (uint8 i = 0; i < count; ) { bufSum += fp.lastMoves[i]; unchecked { ++i; } }
        uint256 mean = bufSum / count;

        uint256 varianceAcc = 0;
        for (uint8 i = 0; i < count; ) {
            uint256 val  = fp.lastMoves[i];
            uint256 diff = val > mean ? val - mean : mean - val;
            varianceAcc += diff * diff;
            unchecked { ++i; }
        }
        uint256 varianceScore = (varianceAcc / count) > 2500 ? 400 : ((varianceAcc / count) * 400) / 2500;

        uint256 allTimeMean   = fp.totalSum / fp.moveCount;
        uint256 choiceVal     = uint256(choice);
        uint256 surprise      = choiceVal > allTimeMean ? choiceVal - allTimeMean : allTimeMean - choiceVal;
        uint256 surpriseScore = surprise > 49 ? 400 : (surprise * 400) / 49;

        uint256 repeatPenalty = 0;
        uint8 lastIdx = uint8((uint256(fp.bufferIndex) + HISTORY_SIZE - 1) % HISTORY_SIZE);
        if (choice == fp.lastMoves[lastIdx]) repeatPenalty = 200;

        uint256 raw = varianceScore + surpriseScore;
        if (raw < repeatPenalty) return 0;
        raw -= repeatPenalty;
        return uint32(raw > 1000 ? 1000 : raw);
    }

    function _updateHistory(Fingerprint storage fp, uint8 choice) internal {
        fp.lastMoves[fp.bufferIndex] = choice;
        fp.bufferIndex = uint8((uint256(fp.bufferIndex) + 1) % HISTORY_SIZE);
        if (fp.moveCount < 255) fp.moveCount++;
        fp.totalSum += uint32(choice);
    }

    function _startNewRound() internal {
        currentRound++;
        rounds[currentRound].startTime = block.timestamp;
        emit RoundStarted(currentRound, block.timestamp);
    }
}
