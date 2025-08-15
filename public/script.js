class UnoClient {
    constructor() {
        console.log('Initializing UNO Client...');
        this.socket = null;
        this.gameState = null;
        this.playerHand = [];
        this.selectedCard = null;
        this.playerName = '';
        this.roomId = '';
        
        this.initializeElements();
        this.bindEvents();
        this.connectSocket();
        console.log('UNO Client initialized');
    }

    initializeElements() {
        // Screens
        this.mainMenu = document.getElementById('mainMenu');
        this.lobby = document.getElementById('lobby');
        this.gameScreen = document.getElementById('gameScreen');
        
        // Main menu elements
        this.playerNameInput = document.getElementById('playerName');
        this.createRoomBtn = document.getElementById('createRoomBtn');
        this.joinRoomBtn = document.getElementById('joinRoomBtn');
        
        // Join room modal
        this.joinRoomModal = document.getElementById('joinRoomModal');
        this.closeJoinModal = document.getElementById('closeJoinModal');
        this.roomCodeInput = document.getElementById('roomCode');
        this.joinGameBtn = document.getElementById('joinGameBtn');
        
        // Lobby elements
        this.roomCodeDisplay = document.getElementById('roomCodeDisplay');
        this.playersGrid = document.getElementById('playersGrid');
        this.startGameBtn = document.getElementById('startGameBtn');
        
        // Game elements
        this.otherPlayers = document.getElementById('otherPlayers');
        this.deck = document.getElementById('deck');
        this.discardPile = document.getElementById('discardPile');
        this.currentPlayerInfo = document.getElementById('currentPlayerInfo');
        this.currentPlayerName = document.getElementById('currentPlayerName');
        this.directionIndicator = document.getElementById('directionIndicator');
        this.cardsContainer = document.getElementById('cardsContainer');
        this.drawCardBtn = document.getElementById('drawCardBtn');
        this.unoBtn = document.getElementById('unoBtn');
        
        // Modals
        this.colorPickerModal = document.getElementById('colorPickerModal');
        this.gameOverModal = document.getElementById('gameOverModal');
        this.winnerName = document.getElementById('winnerName');
        this.voteCount = document.getElementById('voteCount');
        this.playAgainBtn = document.getElementById('playAgainBtn');
        this.leaveGameBtn = document.getElementById('leaveGameBtn');
        
        // Utility elements
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.errorMessage = document.getElementById('errorMessage');
        this.errorText = document.getElementById('errorText');
        this.closeError = document.getElementById('closeError');
    }

    bindEvents() {
        // Main menu events
        this.createRoomBtn.addEventListener('click', () => this.createRoom());
        this.joinRoomBtn.addEventListener('click', () => this.showJoinModal());
        
        // Join room modal events
        this.closeJoinModal.addEventListener('click', () => this.hideJoinModal());
        this.joinGameBtn.addEventListener('click', () => this.joinRoom());
        this.roomCodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinRoom();
        });
        
        // Lobby events
        this.startGameBtn.addEventListener('click', () => this.startGame());
        
        // Add ready button if it doesn't exist
        if (!this.readyBtn) {
            this.readyBtn = document.createElement('button');
            this.readyBtn.id = 'readyBtn';
            this.readyBtn.className = 'btn btn-secondary';
            this.readyBtn.textContent = 'Ready';
            this.readyBtn.addEventListener('click', () => this.toggleReady());
            
            // Insert ready button before start button
            this.startGameBtn.parentNode.insertBefore(this.readyBtn, this.startGameBtn);
        }
        
        // Game events
        this.drawCardBtn.addEventListener('click', () => this.drawCard());
        this.unoBtn.addEventListener('click', () => this.callUno());
        this.deck.addEventListener('click', () => this.drawCard());
        
        // Color picker events
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const color = e.target.dataset.color;
                this.selectColor(color);
            });
        });
        
        // Utility events
        this.closeError.addEventListener('click', () => this.hideError());
        this.playAgainBtn.addEventListener('click', () => this.votePlayAgain());
        this.leaveGameBtn.addEventListener('click', () => this.leaveGame());
        
        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === this.joinRoomModal) this.hideJoinModal();
            if (e.target === this.colorPickerModal) this.hideColorPicker();
            if (e.target === this.gameOverModal) this.hideGameOver();
        });
        
        // Enter key events
        this.playerNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.createRoom();
        });
    }

    connectSocket() {
        // Check if Socket.IO is available
        if (typeof io === 'undefined') {
            console.error('Socket.IO not loaded!');
            this.showError('Socket.IO not loaded. Please refresh the page.');
            return;
        }
        
        console.log('Initializing Socket.IO connection...');
        
        // Socket.IO connection options
        const socketOptions = {
            transports: ['websocket', 'polling'],
            timeout: 10000,
            forceNew: true
        };
        
        // Determine server URL based on environment
        let serverUrl = '';
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            // Local development
            serverUrl = window.location.origin;
        } else {
            // Deployed environment - update this with your actual server URL
            // Replace this URL with your actual deployed server URL
            serverUrl = 'https://unokk.up.railway.app'; // Your Railway deployment
            
            // Examples:
            // serverUrl = 'https://your-app.railway.app';
            // serverUrl = 'https://your-app.herokuapp.com';
            // serverUrl = 'https://your-app.onrender.com';
        }
        
        console.log('Connecting to server:', serverUrl);
        this.socket = io(serverUrl, socketOptions);
        
        // Connection timeout
        const connectionTimeout = setTimeout(() => {
            if (!this.socket.connected) {
                this.hideLoading();
                this.showError('Connection timeout. Please refresh the page.');
            }
        }, 10000); // 10 seconds timeout
        
        this.socket.on('connect', () => {
            console.log('Connected to server');
            clearTimeout(connectionTimeout);
            this.hideLoading();
        });
        
        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            clearTimeout(connectionTimeout);
            this.hideLoading();
            this.showError('Failed to connect to server. Please check your connection and refresh.');
        });
        
        this.socket.on('disconnect', (reason) => {
            console.log('Disconnected from server:', reason);
            clearTimeout(connectionTimeout);
            this.hideLoading();
            if (reason === 'io server disconnect') {
                this.showError('Disconnected from server. Please refresh the page.');
            }
        });
        
        this.socket.on('roomCreated', (data) => {
            console.log('Room created:', data);
            this.roomId = data.roomId;
            this.gameState = data.game;
            this.hideLoading();
            this.showLobby();
            this.updateLobby();
        });
        
        this.socket.on('joinedRoom', (data) => {
            console.log('Joined room:', data);
            this.roomId = data.roomId;
            this.gameState = data.game;
            this.hideLoading();
            this.showLobby();
            this.updateLobby();
        });
        
        this.socket.on('gameUpdate', (gameState) => {
            console.log('Game update received:', gameState);
            this.gameState = gameState;
            
            // If we're in the lobby, update the lobby UI
            if (this.lobby.classList.contains('active')) {
                this.updateLobby();
            }
            // If we're in the game, update the game UI
            else if (this.gameScreen.classList.contains('active')) {
                this.updateGameState();
            }
        });
        
        this.socket.on('handUpdate', (hand) => {
            this.playerHand = hand;
            this.updatePlayerHand();
        });
        
        this.socket.on('gameStarted', (gameState) => {
            this.gameState = gameState;
            this.showGameScreen();
            this.updateGameState();
        });
        
        this.socket.on('cardDrawn', (card) => {
            // Visual feedback for drawn card
            this.showNotification(`Drew: ${this.getCardName(card)}`);
        });
        
        this.socket.on('cardsDrawn', (cards) => {
            // Visual feedback for penalty cards
            const cardNames = cards.map(card => this.getCardName(card)).join(', ');
            this.showNotification(`Drew penalty cards: ${cardNames}`);
        });
        
        this.socket.on('gameMessage', (message) => {
            // Show game messages (skip, reverse, draw penalties)
            this.showNotification(message);
        });
        
        this.socket.on('gameWon', (data) => {
            const winner = this.gameState.players.find(p => p.id === data.winner);
            this.showGameOver(winner ? winner.name : 'Unknown Player');
            // Initialize voting display
            this.updateVoteDisplay(0, this.gameState.players.length);
        });

        this.socket.on('playAgainVote', (data) => {
            console.log('Play again vote received:', data);
            this.updateVoteDisplay(data.votes, data.totalPlayers);
            this.showNotification(`${data.votes}/${data.totalPlayers} players want to play again!`);
            
            // If this player voted, show option to start new game
            if (data.votedPlayers.includes(this.socket.id) && data.votes > 0) {
                this.showStartNewGameOption();
            }
        });

        this.socket.on('playAgainStatus', (data) => {
            this.updateVoteDisplay(data.votes, data.totalPlayers);
        });
        
        this.socket.on('gameReset', (gameState) => {
            console.log('Game reset, returning to lobby');
            this.gameState = gameState;
            this.playerHand = [];
            this.hideLoading();
            this.showLobby();
            this.updateLobby();
        });
        
        this.socket.on('error', (message) => {
            this.hideLoading();
            this.showError(message);
        });
    }

    // Screen management
    showScreen(screenElement) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        screenElement.classList.add('active');
    }

    showMainMenu() {
        this.showScreen(this.mainMenu);
    }

    showLobby() {
        this.showScreen(this.lobby);
        this.roomCodeDisplay.textContent = this.roomId;
    }

    showGameScreen() {
        this.showScreen(this.gameScreen);
    }

    // Modal management
    showJoinModal() {
        if (!this.validatePlayerName()) return;
        this.joinRoomModal.classList.add('active');
    }

    hideJoinModal() {
        this.joinRoomModal.classList.remove('active');
        this.roomCodeInput.value = '';
    }

    showColorPicker() {
        this.colorPickerModal.classList.add('active');
    }

    hideColorPicker() {
        this.colorPickerModal.classList.remove('active');
    }

    showGameOver(winnerName) {
        console.log('Showing game over modal for winner:', winnerName);
        this.winnerName.textContent = winnerName;
        this.gameOverModal.classList.add('active');
        console.log('Game over modal should now be visible');
    }

    hideGameOver() {
        this.gameOverModal.classList.remove('active');
    }

    showLoading() {
        this.loadingOverlay.classList.remove('hidden');
    }

    hideLoading() {
        this.loadingOverlay.classList.add('hidden');
    }

    showError(message) {
        this.errorText.textContent = message;
        this.errorMessage.classList.add('show');
        setTimeout(() => this.hideError(), 5000);
    }

    hideError() {
        this.errorMessage.classList.remove('show');
    }

    showNotification(message) {
        // Create a temporary notification
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            z-index: 3000;
            font-weight: 500;
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 2000);
    }

    // Game actions
    validatePlayerName() {
        const name = this.playerNameInput.value.trim();
        if (!name) {
            this.showError('Please enter your name');
            return false;
        }
        this.playerName = name;
        return true;
    }

    createRoom() {
        if (!this.validatePlayerName()) return;
        
        console.log('Creating room for player:', this.playerName);
        this.showLoading();
        this.socket.emit('createRoom', this.playerName);
    }

    joinRoom() {
        if (!this.validatePlayerName()) return;
        
        const roomCode = this.roomCodeInput.value.trim();
        if (!roomCode) {
            this.showError('Please enter a room code');
            return;
        }
        
        console.log('Attempting to join room:', roomCode);
        this.showLoading();
        this.socket.emit('joinRoom', { roomId: roomCode, playerName: this.playerName });
        this.hideJoinModal();
    }

    startGame() {
        if (this.gameState.players.length < 2) {
            this.showError('Need at least 2 players to start');
            return;
        }
        
        this.socket.emit('startGame');
    }

    playCard(card) {
        if (!this.isMyTurn()) {
            this.showError("It's not your turn!");
            return;
        }

        if (card.color === 'wild') {
            this.selectedCard = card;
            this.showColorPicker();
        } else {
            this.socket.emit('playCard', { card });
        }
    }

    selectColor(color) {
        if (this.selectedCard) {
            this.socket.emit('playCard', { 
                card: this.selectedCard, 
                chosenColor: color 
            });
            this.selectedCard = null;
        }
        this.hideColorPicker();
    }

    drawCard() {
        if (!this.isMyTurn()) {
            this.showError("It's not your turn!");
            return;
        }
        
        this.socket.emit('drawCard');
    }

    callUno() {
        // UNO call logic can be implemented here
        this.showNotification('UNO!');
    }

    isMyTurn() {
        if (!this.gameState || !this.gameState.gameStarted) return false;
        const currentPlayer = this.gameState.players[this.gameState.currentPlayer];
        return currentPlayer && currentPlayer.id === this.socket.id;
    }

    isSkipped() {
        return this.gameState && this.gameState.skippedPlayer === this.socket.id;
    }

    isHost() {
        return this.gameState && this.gameState.hostId === this.socket.id;
    }

    setReady(ready) {
        this.socket.emit('setReady', ready);
    }

    toggleReady() {
        if (!this.gameState) return;
        
        const currentPlayer = this.gameState.players.find(p => p.id === this.socket.id);
        if (currentPlayer) {
            const newReadyStatus = !currentPlayer.ready;
            this.setReady(newReadyStatus);
            
            // Update button text immediately for better UX
            if (newReadyStatus) {
                this.readyBtn.textContent = 'Not Ready';
                this.readyBtn.className = 'btn btn-warning';
            } else {
                this.readyBtn.textContent = 'Ready';
                this.readyBtn.className = 'btn btn-secondary';
            }
        }
    }

    updateStartButton() {
        if (!this.gameState) return;
        
        const isHost = this.isHost();
        const allReady = this.gameState.players.every(p => p.ready);
        const enoughPlayers = this.gameState.players.length >= 2;
        
        if (isHost && allReady && enoughPlayers) {
            this.startGameBtn.disabled = false;
            this.startGameBtn.textContent = 'Start Game';
            this.startGameBtn.style.opacity = '1';
            this.startGameBtn.style.cursor = 'pointer';
        } else {
            this.startGameBtn.disabled = true;
            this.startGameBtn.style.opacity = '0.5';
            this.startGameBtn.style.cursor = 'not-allowed';
            
            if (!isHost) {
                this.startGameBtn.textContent = 'Only Host Can Start';
            } else if (!enoughPlayers) {
                this.startGameBtn.textContent = 'Need 2+ Players';
            } else if (!allReady) {
                const notReadyPlayers = this.gameState.players.filter(p => !p.ready).map(p => p.name);
                this.startGameBtn.textContent = `Waiting for: ${notReadyPlayers.join(', ')}`;
            }
        }
    }

    updateReadyButton() {
        if (!this.gameState || !this.readyBtn) return;
        
        const currentPlayer = this.gameState.players.find(p => p.id === this.socket.id);
        if (currentPlayer) {
            if (currentPlayer.ready) {
                this.readyBtn.textContent = 'Not Ready';
                this.readyBtn.className = 'btn btn-warning';
            } else {
                this.readyBtn.textContent = 'Ready';
                this.readyBtn.className = 'btn btn-secondary';
            }
        }
    }

    canPlayCard(card) {
        if (!this.isMyTurn()) return false;
        if (this.isSkipped()) return false;
        
        // If there's a draw penalty, check stacking rules
        if (this.gameState.drawCount > 0) {
            const topCard = this.gameState.topCard;
            
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
                return card.color === this.gameState.currentColor;
            }
            
            return false;
        }
        
        // Normal card validation
        const topCard = this.gameState.topCard;
        return card.color === this.gameState.currentColor || 
               card.value === topCard.value ||
               card.color === 'wild';
    }

    // UI Updates
    updateLobby() {
        console.log('Updating lobby with players:', this.gameState.players);
        this.playersGrid.innerHTML = '';
        
        this.gameState.players.forEach((player, index) => {
            console.log('Creating player card for:', player.name);
            const playerCard = document.createElement('div');
            playerCard.className = 'player-card';
            
            const avatar = document.createElement('div');
            avatar.className = 'player-avatar';
            avatar.textContent = player.name.charAt(0).toUpperCase();
            
            const name = document.createElement('div');
            name.className = 'player-name';
            name.textContent = player.name;
            
            const status = document.createElement('div');
            status.className = 'player-status';
            
            if (player.id === this.socket.id) {
                status.textContent = '(You)';
                if (player.isHost) {
                    status.textContent += ' - Host';
                }
            } else {
                if (player.isHost) {
                    status.textContent = 'Host';
                } else {
                    status.textContent = 'Player';
                }
            }
            
            // Add ready status
            const readyStatus = document.createElement('div');
            readyStatus.className = 'ready-status';
            if (player.ready) {
                readyStatus.textContent = '✅ Ready';
                readyStatus.style.color = '#28a745';
            } else {
                readyStatus.textContent = '⏳ Waiting';
                readyStatus.style.color = '#ffc107';
            }
            
            playerCard.appendChild(avatar);
            playerCard.appendChild(name);
            playerCard.appendChild(status);
            playerCard.appendChild(readyStatus);
            
            this.playersGrid.appendChild(playerCard);
        });
        
        // Update start button state
        this.updateStartButton();
        
        // Update ready button state
        this.updateReadyButton();
        
        console.log('Lobby updated, total players:', this.gameState.players.length);
    }

    updateGameState() {
        if (!this.gameState) return;
        
        // Update other players
        this.updateOtherPlayers();
        
        // Update discard pile
        this.updateDiscardPile();
        
        // Update current player info
        this.updateCurrentPlayerInfo();
        
        // Update direction indicator
        this.updateDirection();
        
        // Update player hand
        this.updatePlayerHand();
    }

    updateOtherPlayers() {
        this.otherPlayers.innerHTML = '';
        
        this.gameState.players.forEach((player, index) => {
            if (player.id === this.socket.id) return;
            
            const playerDiv = document.createElement('div');
            playerDiv.className = 'other-player';
            if (index === this.gameState.currentPlayer) {
                playerDiv.classList.add('current');
            }
            
            const name = document.createElement('div');
            name.className = 'other-player-name';
            name.textContent = player.name;
            
            const cardCount = document.createElement('div');
            cardCount.className = 'card-count';
            cardCount.textContent = `${player.handSize} cards`;
            
            playerDiv.appendChild(name);
            playerDiv.appendChild(cardCount);
            
            if (player.unoCall) {
                const unoIndicator = document.createElement('div');
                unoIndicator.className = 'uno-indicator';
                unoIndicator.textContent = 'UNO!';
                playerDiv.appendChild(unoIndicator);
            }
            
            this.otherPlayers.appendChild(playerDiv);
        });
    }

    updateDiscardPile() {
        if (!this.gameState.topCard) return;
        
        this.discardPile.innerHTML = '';
        
        // For wild cards, create a card with the chosen color
        let displayCard = this.gameState.topCard;
        if (this.gameState.topCard.color === 'wild' && this.gameState.currentColor) {
            displayCard = {
                ...this.gameState.topCard,
                color: this.gameState.currentColor
            };
        }
        
        const cardElement = this.createCardElement(displayCard);
        this.discardPile.appendChild(cardElement);
        
        // Add current color indicator for non-wild cards
        if (this.gameState.currentColor && this.gameState.currentColor !== 'wild' && this.gameState.topCard.color !== 'wild') {
            const colorIndicator = document.createElement('div');
            colorIndicator.className = 'current-color-indicator';
            colorIndicator.style.cssText = `
                position: absolute;
                top: -10px;
                right: -10px;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: ${this.getColorValue(this.gameState.currentColor)};
                border: 2px solid white;
                box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            `;
            this.discardPile.appendChild(colorIndicator);
        }
    }
    
    getColorValue(color) {
        const colors = {
            'red': '#dc3545',
            'blue': '#007bff',
            'green': '#28a745',
            'yellow': '#ffc107'
        };
        return colors[color] || '#999';
    }

    updateCurrentPlayerInfo() {
        const currentPlayer = this.gameState.players[this.gameState.currentPlayer];
        if (currentPlayer) {
            let playerText = currentPlayer.name;
            
            // Add draw penalty info
            if (this.gameState.drawCount > 0) {
                playerText += ` (Draw ${this.gameState.drawCount})`;
            }
            
            this.currentPlayerName.textContent = playerText;
            
            if (currentPlayer.id === this.socket.id) {
                this.currentPlayerInfo.style.background = '#28a745';
                this.currentPlayerInfo.style.color = 'white';
            } else {
                this.currentPlayerInfo.style.background = 'rgba(255, 255, 255, 0.9)';
                this.currentPlayerInfo.style.color = '#333';
            }
        }
    }

    updateDirection() {
        const arrow = this.directionIndicator.querySelector('.arrow');
        if (this.gameState.direction === 1) {
            arrow.textContent = '→';
        } else {
            arrow.textContent = '←';
        }
    }

    updatePlayerHand() {
        this.cardsContainer.innerHTML = '';
        
        this.playerHand.forEach(card => {
            const cardElement = this.createCardElement(card, true);
            this.cardsContainer.appendChild(cardElement);
        });
        
        // Update draw button text and state based on draw count and turn
        if (!this.isMyTurn() || this.isSkipped()) {
            this.drawCardBtn.disabled = true;
            this.drawCardBtn.style.opacity = '0.5';
            this.drawCardBtn.style.cursor = 'not-allowed';
        } else {
            this.drawCardBtn.disabled = false;
            this.drawCardBtn.style.opacity = '1';
            this.drawCardBtn.style.cursor = 'pointer';
        }
        
        if (this.gameState.drawCount > 0) {
            this.drawCardBtn.textContent = `Draw ${this.gameState.drawCount} Cards`;
            this.drawCardBtn.style.background = '#dc3545'; // Red for penalty
        } else {
            this.drawCardBtn.textContent = 'Draw Card';
            this.drawCardBtn.style.background = '#28a745'; // Green for normal
        }
        
        // Update UNO button state
        if (!this.isMyTurn() || this.isSkipped()) {
            this.unoBtn.disabled = true;
            this.unoBtn.style.opacity = '0.5';
            this.unoBtn.style.cursor = 'not-allowed';
        } else {
            this.unoBtn.disabled = false;
            this.unoBtn.style.opacity = '1';
            this.unoBtn.style.cursor = 'pointer';
        }
    }

    createCardElement(card, clickable = false) {
        const cardDiv = document.createElement('div');
        cardDiv.className = `card ${card.color}`;
        
        // Check if card is playable
        if (clickable && !this.canPlayCard(card)) {
            cardDiv.style.opacity = '0.5';
            cardDiv.style.cursor = 'not-allowed';
        }
        
        // Add special styling for skipped players
        if (clickable && this.isSkipped()) {
            cardDiv.style.filter = 'grayscale(100%)';
            cardDiv.style.opacity = '0.3';
        }
        
        if (clickable) {
            cardDiv.addEventListener('click', () => {
                // Check if it's the player's turn
                if (!this.isMyTurn()) {
                    this.showError("It's not your turn!");
                    return;
                }
                
                // Check if player is skipped
                if (this.isSkipped()) {
                    this.showError("You were skipped! Wait for your next turn.");
                    return;
                }
                
                // Check if card is playable
                if (!this.canPlayCard(card)) {
                    this.showError("You can't play this card right now!");
                    return;
                }
                
                // Remove selection from other cards
                document.querySelectorAll('.card.selected').forEach(c => {
                    c.classList.remove('selected');
                });
                
                // Select this card and play it
                cardDiv.classList.add('selected');
                setTimeout(() => {
                    this.playCard(card);
                    cardDiv.classList.remove('selected');
                }, 200);
            });
        }
        
        // Set card content
        if (card.type === 'number') {
            cardDiv.textContent = card.value;
        } else if (card.type === 'action') {
            switch (card.value) {
                case 'skip':
                    cardDiv.innerHTML = '⊘';
                    break;
                case 'reverse':
                    cardDiv.innerHTML = '⟲';
                    break;
                case 'draw2':
                    cardDiv.innerHTML = '+2';
                    break;
            }
        } else if (card.type === 'wild') {
            if (card.value === 'wild') {
                cardDiv.innerHTML = '🌈';
            } else if (card.value === 'draw4') {
                cardDiv.innerHTML = '+4';
            }
        }
        
        return cardDiv;
    }

    getCardName(card) {
        if (card.type === 'number') {
            return `${card.color} ${card.value}`;
        } else if (card.type === 'action') {
            return `${card.color} ${card.value}`;
        } else if (card.type === 'wild') {
            return card.value === 'wild' ? 'Wild' : 'Wild Draw 4';
        }
        return 'Unknown Card';
    }

    votePlayAgain() {
        console.log('Voting to play again');
        this.socket.emit('playAgain');
        this.playAgainBtn.disabled = true;
        this.playAgainBtn.textContent = 'Voted!';
        this.playAgainBtn.className = 'btn btn-success';
    }

    leaveGame() {
        console.log('Leaving game');
        this.socket.disconnect();
        this.resetToMainMenu();
    }

    updateVoteDisplay(votes, total) {
        this.voteCount.textContent = `${votes}/${total}`;
    }

    showStartNewGameOption() {
        // Add a "Start New Game" button to the modal
        if (!this.startNewGameBtn) {
            this.startNewGameBtn = document.createElement('button');
            this.startNewGameBtn.className = 'btn btn-success';
            this.startNewGameBtn.textContent = 'Start New Game';
            this.startNewGameBtn.addEventListener('click', () => this.startNewGame());
            
            // Insert after the voting actions
            const votingActions = document.querySelector('.voting-actions');
            if (votingActions) {
                votingActions.appendChild(this.startNewGameBtn);
            }
        }
        this.startNewGameBtn.style.display = 'block';
    }

    startNewGame() {
        console.log('Starting new game');
        this.socket.emit('startNewGame');
        this.hideGameOver();
        this.showLoading();
    }

    // Old playAgain method removed - now using voting system

    resetToMainMenu() {
        this.hideGameOver();
        this.showMainMenu();
        this.gameState = null;
        this.playerHand = [];
        this.selectedCard = null;
        this.roomId = '';
        
        // Reconnect to allow creating/joining new games
        this.socket.disconnect();
        this.connectSocket();
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, creating UNO Client...');
    new UnoClient();
});
