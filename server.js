const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling']
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Debug endpoint to see active rooms
app.get('/debug/rooms', (req, res) => {
  const roomInfo = Array.from(rooms.entries()).map(([roomId, game]) => ({
    roomId,
    playerCount: game.players.length,
    gameStarted: game.gameStarted,
    players: game.players.map(p => ({ name: p.name, id: p.id }))
  }));
  res.json({ rooms: roomInfo, totalRooms: rooms.size });
});

// Game state management
const rooms = new Map();
const playerRooms = new Map();

// UNO game logic
class UnoGame {
  constructor(roomId) {
    this.roomId = roomId;
    this.players = [];
    this.currentPlayer = 0;
    this.direction = 1; // 1 for clockwise, -1 for counter-clockwise
    this.deck = [];
    this.discardPile = [];
    this.gameStarted = false;
    this.winner = null;
    this.currentColor = null;
    this.drawCount = 0; // For Draw 2/4 stacking
    this.skippedPlayer = null; // Track the player who was skipped
    this.hostId = null; // Track the host (room creator)
    this.playAgainVotes = new Set(); // Track who voted to play again
    this.gameEnded = false; // Track if game has ended
  }

  // Initialize a standard UNO deck
  initializeDeck() {
    const colors = ['red', 'blue', 'green', 'yellow'];
    const numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const actions = ['skip', 'reverse', 'draw2'];
    
    this.deck = [];
    
    // Add number cards (0 has 1 card per color, 1-9 have 2 cards per color)
    colors.forEach(color => {
      this.deck.push({ color, type: 'number', value: 0 });
      for (let i = 1; i <= 9; i++) {
        this.deck.push({ color, type: 'number', value: i });
        this.deck.push({ color, type: 'number', value: i });
      }
    });
    
    // Add action cards (2 per color)
    colors.forEach(color => {
      actions.forEach(action => {
        this.deck.push({ color, type: 'action', value: action });
        this.deck.push({ color, type: 'action', value: action });
      });
    });
    
    // Add wild cards (4 each)
    for (let i = 0; i < 4; i++) {
      this.deck.push({ color: 'wild', type: 'wild', value: 'wild' });
      this.deck.push({ color: 'wild', type: 'wild', value: 'draw4' });
    }
    
    this.shuffleDeck();
  }

  shuffleDeck() {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  dealCards() {
    // Deal 7 cards to each player
    this.players.forEach(player => {
      player.hand = [];
      for (let i = 0; i < 7; i++) {
        player.hand.push(this.deck.pop());
      }
    });
    
    // Place first card on discard pile (ensure it's not a wild card)
    let firstCard;
    do {
      firstCard = this.deck.pop();
    } while (firstCard.color === 'wild');
    
    this.discardPile.push(firstCard);
    this.currentColor = firstCard.color;
  }

  addPlayer(socketId, name) {
    console.log('Adding player:', name, 'socket:', socketId, 'current players:', this.players.length, 'game started:', this.gameStarted);
    
    if (this.players.length >= 10 || this.gameStarted) {
      console.log('Cannot add player - room full or game started');
      return false;
    }
    
    this.players.push({
      id: socketId,
      name: name,
      hand: [],
      unoCall: false,
      ready: false // Track if player is ready
    });
    
    // Set host if this is the first player
    if (this.players.length === 1) {
      this.hostId = socketId;
      console.log('Host set to:', name);
    }
    
    console.log('Player added successfully. Total players:', this.players.length);
    return true;
  }

  removePlayer(socketId) {
    const playerIndex = this.players.findIndex(p => p.id === socketId);
    if (playerIndex !== -1) {
      this.players.splice(playerIndex, 1);
      if (this.currentPlayer >= playerIndex && this.currentPlayer > 0) {
        this.currentPlayer--;
      }
      if (this.currentPlayer >= this.players.length) {
        this.currentPlayer = 0;
      }
    }
  }

  startGame(playerId) {
    const canStart = this.canStartGame(playerId);
    if (!canStart.canStart) {
      return { success: false, reason: canStart.reason };
    }
    
    this.gameStarted = true;
    this.currentPlayer = 0;
    this.direction = 1;
    this.drawCount = 0;
    this.winner = null;
    this.currentColor = null;
    this.skippedPlayer = null;
    this.initializeDeck();
    this.dealCards();
    return { success: true };
  }

  resetGame() {
    // Reset game state but keep players
    this.currentPlayer = 0;
    this.direction = 1;
    this.deck = [];
    this.discardPile = [];
    this.gameStarted = false;
    this.winner = null;
    this.currentColor = null;
    this.drawCount = 0;
    this.skippedPlayer = null;
    this.playAgainVotes.clear();
    this.gameEnded = false;
    
    // Clear all players' hands and reset ready status
    this.players.forEach(player => {
      player.hand = [];
      player.unoCall = false;
      player.ready = false;
    });
  }

  votePlayAgain(playerId) {
    if (!this.gameEnded) return { success: false, error: 'Game has not ended yet' };
    
    this.playAgainVotes.add(playerId);
    
    const result = { 
      success: true, 
      votes: this.playAgainVotes.size,
      totalPlayers: this.players.length,
      votedPlayers: Array.from(this.playAgainVotes)
    };
    
    // Check if all players have voted
    if (this.playAgainVotes.size === this.players.length) {
      result.allVoted = true;
    }
    
    return result;
  }

  getPlayAgainStatus() {
    return {
      votes: this.playAgainVotes.size,
      totalPlayers: this.players.length,
      votedPlayers: Array.from(this.playAgainVotes)
    };
  }

  isValidPlay(card, playerId) {
    const topCard = this.discardPile[this.discardPile.length - 1];
    const player = this.players.find(p => p.id === playerId);
    
    if (!player || !player.hand.some(c => 
      c.color === card.color && c.type === card.type && c.value === card.value)) {
      return false;
    }

    // Wild cards can always be played
    if (card.color === 'wild') {
      return true;
    }

    // Check if there's a draw penalty that needs to be resolved first
    if (this.drawCount > 0) {
      const topCard = this.discardPile[this.discardPile.length - 1];
      
      // Draw4 cards are wild and can be played over any draw card
      if (card.value === 'draw4') {
        return true;
      }
      
      // Draw2 can be played over Draw2
      if (card.value === 'draw2' && topCard.value === 'draw2') {
        return true;
      }
      
      // Draw2 can be played over Draw4 only if color matches
      if (card.value === 'draw2' && topCard.value === 'draw4') {
        return card.color === this.currentColor;
      }
      
      return false; // Must draw cards first
    }

    // Card must match color or value/type
    return card.color === this.currentColor || 
           card.value === topCard.value;
  }

  playCard(card, playerId, chosenColor = null) {
    // Check if it's the player's turn
    if (this.players[this.currentPlayer].id !== playerId) {
      return { success: false, error: "It's not your turn!" };
    }

    // Check if this player was skipped
    if (this.skippedPlayer === playerId) {
      return { success: false, error: "You were skipped! Wait for your next turn." };
    }

    if (!this.isValidPlay(card, playerId)) {
      return { success: false, error: 'Invalid play' };
    }

    const player = this.players.find(p => p.id === playerId);
    const cardIndex = player.hand.findIndex(c => 
      c.color === card.color && c.type === card.type && c.value === card.value);
    
    if (cardIndex === -1) {
      return { success: false, error: 'Card not in hand' };
    }

    // Check for UNO call requirement BEFORE removing the card
    let unoPenaltyMessage = '';
    if (player.hand.length === 1 && !player.unoCall) {
      // Player has 1 card but didn't call UNO - penalize them
      const penaltyCards = [];
      for (let i = 0; i < 2; i++) {
        if (this.deck.length === 0) {
          this.reshuffleDiscard();
        }
        const penaltyCard = this.deck.pop();
        player.hand.push(penaltyCard);
        penaltyCards.push(penaltyCard);
      }
      console.log(`Player ${player.name} didn't call UNO! Drawing 2 penalty cards.`);
      unoPenaltyMessage = `${player.name} didn't call UNO! Drawing 2 penalty cards.`;
    }

    // Remove card from player's hand
    player.hand.splice(cardIndex, 1);
    
    // Add card to discard pile
    this.discardPile.push(card);
    
    // Update current color
    if (card.color === 'wild') {
      this.currentColor = chosenColor || 'red';
    } else {
      this.currentColor = card.color;
    }

    // Reset UNO call status after playing a card
    player.unoCall = false;

    // Handle special cards
    const result = this.handleSpecialCard(card);
    
    // Add UNO penalty message if applicable
    if (unoPenaltyMessage) {
      result.message = unoPenaltyMessage;
    }
    
    // Check for winner
    if (player.hand.length === 0) {
      this.winner = playerId;
      return { success: true, winner: playerId, ...result };
    }

    // Move to next player if no special action occurred
    if (!result.skipNext) {
      this.nextPlayer();
    }

    // Clear skipped player when turn moves to the player after the skipped player
    if (this.skippedPlayer && this.players[this.currentPlayer].id !== this.skippedPlayer) {
      this.skippedPlayer = null;
    }

    return { success: true, ...result };
  }

  handleSpecialCard(card) {
    const result = { skipNext: false, drawCards: 0, message: '' };

    switch (card.value) {
      case 'skip':
        // Get the name of the player who will be skipped before moving
        const skipTargetIndex = (this.currentPlayer + this.direction + this.players.length) % this.players.length;
        const skipTargetName = this.players[skipTargetIndex].name;
        this.skippedPlayer = this.players[skipTargetIndex].id; // Set the skipped player
        // Move to the player AFTER the skipped player
        this.nextPlayer(); // Move past the skipped player
        this.nextPlayer(); // Move to the next player after the skipped player
        result.skipNext = true;
        result.message = `${skipTargetName} was skipped!`;
        break;
      case 'reverse':
        this.direction *= -1;
        result.message = `Direction reversed!`;
        if (this.players.length === 2) {
          // In 2-player game, reverse acts like skip
          const reverseSkipTargetIndex = (this.currentPlayer + this.direction + this.players.length) % this.players.length;
          const reverseSkipTargetName = this.players[reverseSkipTargetIndex].name;
          this.skippedPlayer = this.players[reverseSkipTargetIndex].id;
          // Move to the player AFTER the skipped player
          this.nextPlayer(); // Move past the skipped player
          this.nextPlayer(); // Move to the next player after the skipped player
          result.skipNext = true;
          result.message = `${reverseSkipTargetName} was skipped!`;
        }
        break;
      case 'draw2':
        this.drawCount += 2;
        // Get the name of the player who will draw before moving
        const draw2TargetIndex = (this.currentPlayer + this.direction + this.players.length) % this.players.length;
        const draw2TargetName = this.players[draw2TargetIndex].name;
        this.nextPlayer();
        result.skipNext = true;
        result.drawCards = 2;
        result.message = `${draw2TargetName} must draw 2 cards!`;
        break;
      case 'draw4':
        this.drawCount += 4;
        // Get the name of the player who will draw before moving
        const draw4TargetIndex = (this.currentPlayer + this.direction + this.players.length) % this.players.length;
        const draw4TargetName = this.players[draw4TargetIndex].name;
        this.nextPlayer();
        result.skipNext = true;
        result.drawCards = 4;
        result.message = `${draw4TargetName} must draw 4 cards!`;
        break;
    }

    return result;
  }

  nextPlayer() {
    this.currentPlayer = (this.currentPlayer + this.direction + this.players.length) % this.players.length;
  }

  drawCard(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return null;

    if (this.deck.length === 0) {
      this.reshuffleDiscard();
    }

    const drawnCard = this.deck.pop();
    if (drawnCard) {
      player.hand.push(drawnCard);
    }
    return drawnCard;
  }

  drawPenaltyCards(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player || this.drawCount === 0) return [];

    const drawnCards = [];
    for (let i = 0; i < this.drawCount; i++) {
      const card = this.drawCard(playerId);
      if (card) drawnCards.push(card);
    }
    
    this.drawCount = 0; // Reset draw count after drawing
    return drawnCards;
  }

  forceDrawCards(playerId, count) {
    for (let i = 0; i < count; i++) {
      this.drawCard(playerId);
    }
  }

  reshuffleDiscard() {
    if (this.discardPile.length <= 1) return;
    
    const topCard = this.discardPile.pop();
    this.deck = [...this.discardPile];
    this.discardPile = [topCard];
    this.shuffleDeck();
  }

  getGameState() {
    return {
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        handSize: p.hand.length,
        unoCall: p.unoCall,
        ready: p.ready,
        isHost: p.id === this.hostId
      })),
      currentPlayer: this.currentPlayer,
      direction: this.direction,
      topCard: this.discardPile[this.discardPile.length - 1],
      currentColor: this.currentColor,
      gameStarted: this.gameStarted,
      winner: this.winner,
      deckSize: this.deck.length,
      drawCount: this.drawCount,
      skippedPlayer: this.skippedPlayer,
      hostId: this.hostId
    };
  }

  getPlayerHand(playerId) {
    const player = this.players.find(p => p.id === playerId);
    return player ? player.hand : [];
  }

  setPlayerReady(playerId, ready) {
    const player = this.players.find(p => p.id === playerId);
    if (player) {
      player.ready = ready;
      return true;
    }
    return false;
  }

  canStartGame(playerId) {
    // Only host can start the game
    if (this.hostId !== playerId) {
      return { canStart: false, reason: 'Only the host can start the game' };
    }
    
    // Need at least 2 players
    if (this.players.length < 2) {
      return { canStart: false, reason: 'Need at least 2 players to start' };
    }
    
    // All players must be ready
    const notReadyPlayers = this.players.filter(p => !p.ready);
    if (notReadyPlayers.length > 0) {
      const notReadyNames = notReadyPlayers.map(p => p.name).join(', ');
      return { canStart: false, reason: `Waiting for players to be ready: ${notReadyNames}` };
    }
    
    return { canStart: true };
  }
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('createRoom', (playerName) => {
    console.log('Creating room for player:', playerName, 'socket:', socket.id);
    
    if (!playerName || playerName.trim() === '') {
      socket.emit('error', 'Player name is required');
      return;
    }
    
    const roomId = uuidv4().substring(0, 6).toUpperCase();
    const game = new UnoGame(roomId);
    
    if (game.addPlayer(socket.id, playerName)) {
      rooms.set(roomId, game);
      playerRooms.set(socket.id, roomId);
      socket.join(roomId);
      
      console.log('Room created successfully:', roomId, 'for player:', playerName);
      socket.emit('roomCreated', { roomId, game: game.getGameState() });
      socket.emit('handUpdate', game.getPlayerHand(socket.id));
    } else {
      console.error('Failed to add player to room:', playerName);
      socket.emit('error', 'Failed to create room');
    }
  });

  socket.on('joinRoom', ({ roomId, playerName }) => {
    console.log('Attempting to join room:', roomId, 'for player:', playerName, 'socket:', socket.id);
    
    if (!roomId || !playerName) {
      socket.emit('error', 'Room ID and player name are required');
      return;
    }
    
    // Normalize room ID to uppercase
    const normalizedRoomId = roomId.toUpperCase().trim();
    console.log('Looking for room with ID:', normalizedRoomId);
    console.log('Available rooms:', Array.from(rooms.keys()));
    
    const game = rooms.get(normalizedRoomId);
    
    if (!game) {
      console.log('Room not found:', normalizedRoomId);
      socket.emit('error', 'Room not found. Please check the room code.');
      return;
    }

    console.log('Room found, attempting to add player...');
    if (game.addPlayer(socket.id, playerName)) {
      playerRooms.set(socket.id, normalizedRoomId);
      socket.join(normalizedRoomId);
      
      console.log('Player successfully joined room:', normalizedRoomId);
      
      // Send joinedRoom event to the player who just joined
      socket.emit('joinedRoom', { roomId: normalizedRoomId, game: game.getGameState() });
      socket.emit('handUpdate', game.getPlayerHand(socket.id));
      
      // Send gameUpdate to all other players in the room
      socket.to(normalizedRoomId).emit('gameUpdate', game.getGameState());
    } else {
      console.log('Failed to add player to room - room full or game started');
      socket.emit('error', 'Cannot join room (full or game started)');
    }
  });

  socket.on('setReady', (ready) => {
    const roomId = playerRooms.get(socket.id);
    const game = rooms.get(roomId);
    
    if (game && game.setPlayerReady(socket.id, ready)) {
      console.log(`Player ${socket.id} set ready status to: ${ready}`);
      io.to(roomId).emit('gameUpdate', game.getGameState());
    }
  });

  socket.on('startGame', () => {
    const roomId = playerRooms.get(socket.id);
    const game = rooms.get(roomId);
    
    if (game) {
      const result = game.startGame(socket.id);
      if (result.success) {
        console.log(`Game started by host: ${socket.id}`);
        io.to(roomId).emit('gameStarted', game.getGameState());
        
        // Send each player their hand
        game.players.forEach(player => {
          io.to(player.id).emit('handUpdate', game.getPlayerHand(player.id));
        });
      } else {
        console.log(`Failed to start game: ${result.reason}`);
        socket.emit('error', result.reason);
      }
    }
  });

  socket.on('playAgain', () => {
    const roomId = playerRooms.get(socket.id);
    const game = rooms.get(roomId);
    
    if (game) {
      const result = game.votePlayAgain(socket.id);
      if (result.success) {
        console.log(`Player ${socket.id} voted to play again. Votes: ${result.votes}/${result.totalPlayers}`);
        io.to(roomId).emit('playAgainVote', result);
        
        // If all players have voted, automatically start new game
        if (result.allVoted) {
          console.log('All players have voted, automatically starting new game');
          setTimeout(() => {
            game.resetGame();
            io.to(roomId).emit('gameReset', game.getGameState());
          }, 2000); // 2 second delay to show the final vote count
        }
      } else {
        socket.emit('error', result.error);
      }
    }
  });

  socket.on('getPlayAgainStatus', () => {
    const roomId = playerRooms.get(socket.id);
    const game = rooms.get(roomId);
    
    if (game) {
      const status = game.getPlayAgainStatus();
      socket.emit('playAgainStatus', status);
    }
  });

  socket.on('startNewGame', () => {
    const roomId = playerRooms.get(socket.id);
    const game = rooms.get(roomId);
    
    if (game && game.gameEnded) {
      // Only reset for players who voted to play again
      const votedPlayers = Array.from(game.playAgainVotes);
      if (votedPlayers.length > 0) {
        console.log('Starting new game for voted players:', votedPlayers);
        game.resetGame();
        io.to(roomId).emit('gameReset', game.getGameState());
      }
    }
  });

  socket.on('playCard', ({ card, chosenColor }) => {
    const roomId = playerRooms.get(socket.id);
    const game = rooms.get(roomId);
    
    if (!game) return;

    console.log(`Player ${socket.id} attempting to play card:`, card);
    console.log(`Current player: ${game.players[game.currentPlayer].id}, Current player index: ${game.currentPlayer}`);

    const result = game.playCard(card, socket.id, chosenColor);
    
    if (result.success) {
      console.log(`Card played successfully. New current player: ${game.players[game.currentPlayer].id}, Index: ${game.currentPlayer}`);
      io.to(roomId).emit('gameUpdate', game.getGameState());
      
      // Update all players' hands
      game.players.forEach(player => {
        io.to(player.id).emit('handUpdate', game.getPlayerHand(player.id));
      });

      // Send special card message if any
      if (result.message) {
        console.log('Game message:', result.message);
        io.to(roomId).emit('gameMessage', result.message);
      }

      if (result.winner) {
        game.gameEnded = true; // Mark game as ended
        io.to(roomId).emit('gameWon', { winner: result.winner });
      }
    } else {
      console.log(`Card play failed:`, result.error);
      socket.emit('error', result.error);
    }
  });

  socket.on('callUno', () => {
    const roomId = playerRooms.get(socket.id);
    const game = rooms.get(roomId);
    
    if (!game) return;

    console.log(`UNO call received from player ${socket.id}`);

    // Check if it's the player's turn
    if (game.players[game.currentPlayer].id !== socket.id) {
      console.log(`Player ${socket.id} tried to call UNO but it's not their turn`);
      socket.emit('error', "It's not your turn!");
      return;
    }

    const player = game.players.find(p => p.id === socket.id);
    console.log(`Player ${player.name} hand length:`, player.hand ? player.hand.length : 'undefined');
    console.log(`Player ${player.name} unoCall status:`, player.unoCall);
    
    if (player && player.hand && player.hand.length === 1) {
      player.unoCall = true;
      io.to(roomId).emit('unoCalled', { playerId: socket.id, playerName: player.name });
      console.log(`Player ${player.name} called UNO!`);
    } else {
      console.log(`Player ${player.name} tried to call UNO but has ${player.hand ? player.hand.length : 'undefined'} cards`);
      socket.emit('error', 'You can only call UNO when you have 1 card!');
    }
  });

  socket.on('drawCard', () => {
    const roomId = playerRooms.get(socket.id);
    const game = rooms.get(roomId);
    
    if (!game) return;

    // Check if it's the player's turn
    if (game.players[game.currentPlayer].id !== socket.id) {
      socket.emit('error', "It's not your turn!");
      return;
    }

    let drawnCards = [];
    
    if (game.drawCount > 0) {
      // Draw penalty cards
      drawnCards = game.drawPenaltyCards(socket.id);
      socket.emit('handUpdate', game.getPlayerHand(socket.id));
      socket.emit('cardsDrawn', drawnCards);
      
      // Move to next player after drawing penalty
      game.nextPlayer();
      io.to(roomId).emit('gameUpdate', game.getGameState());
    } else {
      // Normal draw
      const drawnCard = game.drawCard(socket.id);
      if (drawnCard) {
        socket.emit('handUpdate', game.getPlayerHand(socket.id));
        socket.emit('cardDrawn', drawnCard);
        
        // Move to next player after drawing
        game.nextPlayer();
        io.to(roomId).emit('gameUpdate', game.getGameState());
      }
    }
  });

  socket.on('leaveGame', () => {
    console.log('Player intentionally leaving game:', socket.id);
    
    const roomId = playerRooms.get(socket.id);
    if (roomId) {
      const game = rooms.get(roomId);
      if (game) {
        const player = game.players.find(p => p.id === socket.id);
        const playerName = player ? player.name : 'Unknown Player';
        
        console.log('Removing player from room:', roomId, 'Player:', playerName);
        game.removePlayer(socket.id);
        
        // Notify other players that this player left
        if (game.players.length > 0) {
          io.to(roomId).emit('playerLeft', { playerName: playerName });
        }
        
        if (game.players.length === 0) {
          console.log('Room is empty, scheduling deletion in 30 seconds:', roomId);
          // Keep room for 30 seconds after last player leaves
          setTimeout(() => {
            const currentGame = rooms.get(roomId);
            if (currentGame && currentGame.players.length === 0) {
              console.log('Deleting empty room:', roomId);
              rooms.delete(roomId);
            }
          }, 30000);
        } else if (game.players.length === 1 && game.gameStarted) {
          // Only one player remaining in an active game - return to lobby
          console.log('Only one player remaining, ending game and returning to lobby');
          const remainingPlayer = game.players[0];
          game.gameStarted = false;
          game.gameEnded = true;
          game.resetGame();
          io.to(roomId).emit('gameEndedSinglePlayer', { 
            message: 'All other players left. Returning to lobby...' 
          });
          io.to(roomId).emit('gameUpdate', game.getGameState());
        } else {
          console.log('Room still has players, updating game state');
          io.to(roomId).emit('gameUpdate', game.getGameState());
        }
      }
      playerRooms.delete(socket.id);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    const roomId = playerRooms.get(socket.id);
    if (roomId) {
      const game = rooms.get(roomId);
      if (game) {
        const player = game.players.find(p => p.id === socket.id);
        const playerName = player ? player.name : 'Unknown Player';
        
        console.log('Removing player from room:', roomId, 'Player:', playerName);
        game.removePlayer(socket.id);
        
        // Notify other players that this player left (if game is in progress)
        if (game.gameStarted && game.players.length > 0) {
          io.to(roomId).emit('playerLeft', { playerName: playerName });
        }
        
        if (game.players.length === 0) {
          console.log('Room is empty, scheduling deletion in 30 seconds:', roomId);
          // Keep room for 30 seconds after last player leaves
          setTimeout(() => {
            const currentGame = rooms.get(roomId);
            if (currentGame && currentGame.players.length === 0) {
              console.log('Deleting empty room:', roomId);
              rooms.delete(roomId);
            }
          }, 30000);
        } else if (game.players.length === 1 && game.gameStarted) {
          // Only one player remaining in an active game - return to lobby
          console.log('Only one player remaining, ending game and returning to lobby');
          const remainingPlayer = game.players[0];
          game.gameStarted = false;
          game.gameEnded = true;
          game.resetGame();
          io.to(roomId).emit('gameEndedSinglePlayer', { 
            message: 'All other players left. Returning to lobby...' 
          });
          io.to(roomId).emit('gameUpdate', game.getGameState());
        } else {
          console.log('Room still has players, updating game state');
          io.to(roomId).emit('gameUpdate', game.getGameState());
        }
      }
      playerRooms.delete(socket.id);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`UNO Server running on port ${PORT}`);
});
