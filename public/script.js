class UnoClient {
    constructor() {
        console.log('Initializing UNO Client...');
        this.socket = null;
        this.gameState = null;
        this.playerHand = [];
        this.selectedCard = null;
        this.playerName = '';
        this.roomId = '';
        this.pendingRoomCode = null; // For direct join from URL
        
        // Audio system
        this.audioEnabled = true;
        this.musicVolume = 0.3;
        this.sfxVolume = 0.5;
        this.backgroundMusic = null;
        this.sounds = {};
        
        // Page refresh warning
        this.warningEnabled = false;
        this.beforeUnloadHandler = null;
        
        this.initializeElements();
        this.bindEvents();
        this.initializeAudio();
        this.createFloatingElements();
        this.createAudioControls();
        this.setupPageRefreshWarning();
        this.connectSocket();
        this.checkUrlForRoomCode();
        console.log('UNO Client initialized');
    }

    initializeElements() {
        // Screens
        this.mainMenu = document.getElementById('mainMenu');
        this.directJoinScreen = document.getElementById('directJoinScreen');
        this.lobby = document.getElementById('lobby');
        this.gameScreen = document.getElementById('gameScreen');
        
        // Main menu elements
        this.playerNameInput = document.getElementById('playerName');
        this.createRoomBtn = document.getElementById('createRoomBtn');
        this.joinRoomBtn = document.getElementById('joinRoomBtn');
        
        // Direct join screen elements
        this.directJoinPlayerNameInput = document.getElementById('directJoinPlayerName');
        this.directJoinRoomCodeDisplay = document.getElementById('directJoinRoomCode');
        this.directJoinBtn = document.getElementById('directJoinBtn');
        this.backToMainBtn = document.getElementById('backToMainBtn');
        
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
        this.playersCircleContainer = document.getElementById('playersCircleContainer');
        this.playersCircle = document.getElementById('playersCircle');
        this.playersArrows = document.getElementById('playersArrows');
        this.deck = document.getElementById('deck');
        this.discardPile = document.getElementById('discardPile');
        this.currentPlayerInfo = document.getElementById('currentPlayerInfo');
        this.currentPlayerName = document.getElementById('currentPlayerName');
        this.directionIndicator = document.getElementById('directionIndicator');
        this.directionIndicatorCircle = document.getElementById('directionIndicatorCircle');
        this.directionArrow = document.getElementById('directionArrow');
        this.directionText = document.getElementById('directionText');
        this.wildColorDisplay = document.getElementById('wildColorDisplay');
        this.wildColorCircle = document.getElementById('wildColorCircle');
        this.centerAnimations = document.getElementById('centerAnimations');
        
        // Initialize direction indicator if elements exist
        if (this.directionArrow) {
            // Set initial path
            this.directionArrow.setAttribute('d', 'M 100 20 A 80 80 0 1 1 100 180');
        }
        
        this.turnTimer = document.getElementById('turnTimer');
        this.timerText = document.getElementById('timerText');
        this.timerProgress = document.querySelector('.timer-progress');
        this.cardsContainer = document.getElementById('cardsContainer');
        this.drawCardBtn = document.getElementById('drawCardBtn');
        this.unoBtn = document.getElementById('unoBtn');
        this.leaveGameDuringPlayBtn = document.getElementById('leaveGameDuringPlayBtn');
        this.gameInfo = document.querySelector('.game-info');
        
        // Turn timer
        this.turnTimerInterval = null;
        this.turnTimeLeft = 30; // 30 seconds per turn
        this.turnTimerDuration = 30;
        
        // Initialize timer display
        if (this.turnTimer) {
            this.turnTimer.style.display = 'none';
        }
        
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
        
        // Direct join screen events
        this.directJoinBtn.addEventListener('click', () => this.directJoinRoom());
        this.backToMainBtn.addEventListener('click', () => this.showMainMenu());
        this.directJoinPlayerNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.directJoinRoom();
        });
        
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
        this.leaveGameDuringPlayBtn.addEventListener('click', () => this.leaveGameDuringPlay());
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
        
        // Add kawaii click effects
        document.addEventListener('click', (e) => {
            this.createClickEffect(e.clientX, e.clientY);
        });
        
        // Redraw arrows on window resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (this.gameState && this.gameState.players) {
                    this.updateOtherPlayers();
                }
            }, 250);
        });
    }

    initializeAudio() {
        // Initialize background music
        this.backgroundMusic = new Audio();
        this.backgroundMusic.loop = true;
        this.backgroundMusic.volume = this.musicVolume;
        
        // Create audio context for Web Audio API sounds
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Web Audio API not supported');
        }
        
        // Initialize sound effects with kawaii tones
        this.initializeSounds();
    }

    initializeSounds() {
        // Create kawaii sound effects using Web Audio API
        this.sounds = {
            cardPlay: () => this.playTone(523.25, 0.1, 'sine'), // C5
            cardDraw: () => this.playTone(392.00, 0.15, 'triangle'), // G4
            buttonClick: () => this.playTone(659.25, 0.08, 'square'), // E5
            notification: () => this.playChord([523.25, 659.25, 783.99], 0.3), // C-E-G
            error: () => this.playTone(220.00, 0.4, 'sawtooth'), // A3
            win: () => this.playMelody([523.25, 587.33, 659.25, 698.46, 783.99], 0.2),
            uno: () => this.playChord([440.00, 554.37, 659.25], 0.5)
        };
    }

    playTone(frequency, duration, type = 'sine') {
        if (!this.audioEnabled || !this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(this.sfxVolume * 0.3, this.audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    playChord(frequencies, duration) {
        frequencies.forEach((freq, index) => {
            setTimeout(() => this.playTone(freq, duration * 0.8, 'sine'), index * 50);
        });
    }

    playMelody(frequencies, noteDuration) {
        frequencies.forEach((freq, index) => {
            setTimeout(() => this.playTone(freq, noteDuration, 'triangle'), index * noteDuration * 1000);
        });
    }

    createFloatingElements() {
        // Create floating Hello Kitty elements
        const elements = ['🎀', '💖', '🌸', '✨', '🎈', '🦄', '🌟', '💕'];
        
        setInterval(() => {
            if (Math.random() < 0.3) { // 30% chance every interval
                const element = document.createElement('div');
                element.className = 'floating-kitty';
                element.textContent = elements[Math.floor(Math.random() * elements.length)];
                element.style.left = Math.random() * 100 + 'vw';
                element.style.animationDuration = (Math.random() * 10 + 10) + 's';
                element.style.fontSize = (Math.random() * 1.5 + 1) + 'rem';
                document.body.appendChild(element);
                
                // Remove element after animation
                setTimeout(() => {
                    if (element.parentNode) {
                        element.parentNode.removeChild(element);
                    }
                }, 25000);
            }
        }, 3000);
    }

    createAudioControls() {
        const audioControls = document.createElement('div');
        audioControls.className = 'audio-controls';
        audioControls.innerHTML = `
            <div class="volume-control">
                <label>🎵</label>
                <input type="range" id="musicVolume" min="0" max="1" step="0.1" value="${this.musicVolume}">
                <button class="mute-btn" id="musicMute">🔊</button>
            </div>
            <div class="volume-control">
                <label>🔊</label>
                <input type="range" id="sfxVolume" min="0" max="1" step="0.1" value="${this.sfxVolume}">
                <button class="mute-btn" id="sfxMute">🔊</button>
            </div>
        `;
        
        document.body.appendChild(audioControls);
        
        // Bind audio control events
        document.getElementById('musicVolume').addEventListener('input', (e) => {
            this.musicVolume = parseFloat(e.target.value);
            if (this.backgroundMusic) {
                this.backgroundMusic.volume = this.musicVolume;
            }
        });
        
        document.getElementById('sfxVolume').addEventListener('input', (e) => {
            this.sfxVolume = parseFloat(e.target.value);
        });
        
        document.getElementById('musicMute').addEventListener('click', (e) => {
            this.musicVolume = this.musicVolume > 0 ? 0 : 0.3;
            document.getElementById('musicVolume').value = this.musicVolume;
            if (this.backgroundMusic) {
                this.backgroundMusic.volume = this.musicVolume;
            }
            e.target.textContent = this.musicVolume > 0 ? '🔊' : '🔇';
        });
        
        document.getElementById('sfxMute').addEventListener('click', (e) => {
            this.sfxVolume = this.sfxVolume > 0 ? 0 : 0.5;
            document.getElementById('sfxVolume').value = this.sfxVolume;
            e.target.textContent = this.sfxVolume > 0 ? '🔊' : '🔇';
        });
    }

    createClickEffect(x, y) {
        const effects = ['💖', '✨', '🌸', '💕'];
        const effect = document.createElement('div');
        effect.textContent = effects[Math.floor(Math.random() * effects.length)];
        effect.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            pointer-events: none;
            z-index: 9999;
            font-size: 1.2rem;
            animation: clickEffect 0.8s ease-out forwards;
        `;
        
        // Add click effect animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes clickEffect {
                0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
                100% { transform: translate(-50%, -50%) scale(1.5) translateY(-30px); opacity: 0; }
            }
        `;
        if (!document.querySelector('style[data-click-effect]')) {
            style.setAttribute('data-click-effect', 'true');
            document.head.appendChild(style);
        }
        
        document.body.appendChild(effect);
        setTimeout(() => effect.remove(), 800);
    }

    createSparkleEffect(element) {
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                const sparkle = document.createElement('div');
                sparkle.className = 'sparkle';
                sparkle.style.left = Math.random() * element.offsetWidth + 'px';
                sparkle.style.top = Math.random() * element.offsetHeight + 'px';
                element.appendChild(sparkle);
                
                setTimeout(() => sparkle.remove(), 2000);
            }, i * 100);
        }
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

        this.socket.on('unoCalled', (data) => {
            console.log('UNO called by:', data.playerName);
            this.showNotification(`${data.playerName} called UNO! 🎉`);
        });

        this.socket.on('playerLeft', (data) => {
            console.log('Player left:', data.playerName);
            this.showNotification(`${data.playerName} left the game 🚪`);
        });

        this.socket.on('heartReceived', (data) => {
            console.log('Heart received from:', data.fromPlayer);
            this.createHeartAnimation();
            this.showNotification(`${data.fromPlayer} sent you 💖!`);
            this.sounds.notification();
        });

        this.socket.on('gameEndedSinglePlayer', (data) => {
            console.log('Game ended - only one player remaining');
            this.showNotification(data.message || 'All other players left. Returning to lobby...');
            this.sounds.notification();
            
            // Return to lobby after a short delay
            setTimeout(() => {
                this.showLobby();
                this.updateLobby();
            }, 2000);
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
            
            // Update button state if this player voted
            if (data.votedPlayers.includes(this.socket.id)) {
                this.playAgainBtn.disabled = true;
                this.playAgainBtn.textContent = 'Voted!';
                this.playAgainBtn.className = 'btn btn-success';
            }
            
            // If all players have voted, show automatic transition message
            if (data.allVoted) {
                this.showNotification('All players voted! Starting new game in 2 seconds...');
                // Hide the "Start New Game" button since it will happen automatically
                if (this.startNewGameBtn) {
                    this.startNewGameBtn.style.display = 'none';
                }
            } else if (data.votedPlayers.includes(this.socket.id) && data.votes > 0) {
                // Show option to start new game only if not all players have voted
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
            
            // Automatically hide the game over modal after 2 seconds
            setTimeout(() => {
                this.hideGameOver();
            }, 2000);
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
        
        // Add screen transition effects
        screenElement.style.animation = 'fadeInScale 0.5s ease-out';
    }

    showMainMenu() {
        this.showScreen(this.mainMenu);
        this.disablePageRefreshWarning();
        this.pendingRoomCode = null; // Clear pending room code
    }

    showDirectJoinScreen(roomCode) {
        this.showScreen(this.directJoinScreen);
        this.pendingRoomCode = roomCode;
        this.directJoinRoomCodeDisplay.textContent = roomCode;
        this.directJoinPlayerNameInput.value = '';
        this.directJoinPlayerNameInput.focus();
        this.disablePageRefreshWarning();
    }

    showLobby() {
        this.showScreen(this.lobby);
        this.roomCodeDisplay.textContent = this.roomId;
        
        // Add click-to-copy functionality to room code
        this.setupRoomCodeCopy();
        this.enablePageRefreshWarning();
    }

    showGameScreen() {
        this.showScreen(this.gameScreen);
        // Start background music when game starts
        this.startBackgroundMusic();
        this.enablePageRefreshWarning();
    }

    startBackgroundMusic() {
        // Create a simple kawaii melody using Web Audio API
        if (this.audioEnabled && this.musicVolume > 0) {
            this.playBackgroundLoop();
        }
    }

    playBackgroundLoop() {
        if (!this.audioEnabled || this.musicVolume === 0) return;
        
        const melody = [523.25, 587.33, 659.25, 698.46, 783.99, 698.46, 659.25, 587.33];
        let noteIndex = 0;
        
        const playNextNote = () => {
            if (this.audioEnabled && this.musicVolume > 0) {
                this.playTone(melody[noteIndex], 0.5, 'sine');
                noteIndex = (noteIndex + 1) % melody.length;
                setTimeout(playNextNote, 1000);
            }
        };
        
        playNextNote();
    }

    // Modal management
    showJoinModal() {
        if (!this.validatePlayerName()) return;
        this.sounds.buttonClick();
        this.joinRoomModal.classList.add('active');
    }

    hideJoinModal() {
        this.joinRoomModal.classList.remove('active');
        this.roomCodeInput.value = '';
    }

    showColorPicker() {
        this.colorPickerModal.classList.add('active');
        this.sounds.notification();
    }

    hideColorPicker() {
        this.colorPickerModal.classList.remove('active');
    }

    showGameOver(winnerName) {
        console.log('Showing game over modal for winner:', winnerName);
        this.sounds.win();
        this.winnerName.textContent = winnerName;
        
        // Reset the play again button state
        if (this.playAgainBtn) {
            this.playAgainBtn.disabled = false;
            this.playAgainBtn.textContent = 'Yes, Play Again!';
            this.playAgainBtn.className = 'btn btn-primary';
        }
        
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
        this.sounds.error();
        setTimeout(() => this.hideError(), 5000);
    }

    hideError() {
        this.errorMessage.classList.remove('show');
    }

    getBaseUrl() {
        // Get the base URL for sharing
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return window.location.origin;
        } else {
            // Use the deployed server URL
            return 'https://unokk.up.railway.app';
        }
    }

    getShareableLink() {
        const baseUrl = this.getBaseUrl();
        return `${baseUrl}?room=${this.roomId}`;
    }

    setupRoomCodeCopy() {
        // Remove existing click listener to avoid duplicates
        this.roomCodeDisplay.removeEventListener('click', this.copyRoomCode);
        
        // Add click listener for copying room code
        this.roomCodeDisplay.addEventListener('click', this.copyRoomCode.bind(this));
        
        // Add visual indication that it's clickable
        this.roomCodeDisplay.style.cursor = 'pointer';
        this.roomCodeDisplay.title = 'Click to copy room code and link';
    }

    copyRoomCode() {
        const shareableLink = this.getShareableLink();
        // Format optimized for easy extraction - room code is clearly labeled
        const shareText = `🎀 Join my Hello Kitty UNO game! 🎀\n\nRoom Code: ${this.roomId}\n\nJoin here: ${shareableLink}\n\nOr paste this message and click "Paste Code" button!`;
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(shareText).then(() => {
                this.showNotification('Room code and link copied! 📋✨');
                this.sounds.notification();

                // Visual feedback
                this.roomCodeDisplay.style.transform = 'scale(1.1)';
                setTimeout(() => {
                    this.roomCodeDisplay.style.transform = 'scale(1)';
                }, 200);
            }).catch(err => {
                console.error('Failed to copy room code:', err);
                this.showNotification('Failed to copy room code');
            });
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = shareText;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                this.showNotification('Room code and link copied! 📋✨');
                this.sounds.notification();
            } catch (err) {
                console.error('Fallback copy failed:', err);
                this.showNotification('Failed to copy room code');
            }
            document.body.removeChild(textArea);
        }
    }

    checkUrlForRoomCode() {
        // Check if there's a room code in the URL
        const urlParams = new URLSearchParams(window.location.search);
        const roomCode = urlParams.get('room');
        
        if (roomCode) {
            // Clean and validate the room code
            const cleanCode = roomCode.trim().toUpperCase();
            if (cleanCode.length === 6 && /^[A-Z0-9]{6}$/.test(cleanCode)) {
                // Store the room code and show direct join screen
                this.pendingRoomCode = cleanCode;
                
                // Wait a bit for socket to connect, then show direct join screen
                setTimeout(() => {
                    if (this.socket && this.socket.connected) {
                        this.showDirectJoinScreen(cleanCode);
                    } else {
                        // If socket not connected yet, wait a bit more
                        const checkConnection = setInterval(() => {
                            if (this.socket && this.socket.connected) {
                                clearInterval(checkConnection);
                                this.showDirectJoinScreen(cleanCode);
                            }
                        }, 100);
                        
                        // Stop checking after 5 seconds
                        setTimeout(() => clearInterval(checkConnection), 5000);
                    }
                }, 500);
                
                // Clean the URL to remove the room parameter after processing
                const newUrl = window.location.pathname;
                window.history.replaceState({}, document.title, newUrl);
            }
        }
    }

    extractRoomCodeFromText(text) {
        if (!text || typeof text !== 'string') {
            return null;
        }
        
        // Normalize text - remove extra whitespace and convert to uppercase for matching
        const normalizedText = text.trim();
        
        // Method 1: Look for "Room Code: XXXX" pattern (most reliable)
        // Handle various formats: "Room Code:", "Room Code :", "RoomCode:", etc.
        const roomCodePattern1 = /Room\s*Code\s*:?\s*([A-Z0-9]{6})/i;
        let match = normalizedText.match(roomCodePattern1);
        if (match && match[1]) {
            const code = match[1].toUpperCase();
            if (/^[A-Z0-9]{6}$/.test(code)) {
                console.log('Extracted code via Method 1 (Room Code: pattern):', code);
                return code;
            }
        }
        
        // Method 2: Look for URL parameter ?room=XXXX or &room=XXXX
        const urlPattern = /[?&]room=([A-Z0-9]{6})/i;
        match = normalizedText.match(urlPattern);
        if (match && match[1]) {
            const code = match[1].toUpperCase();
            if (/^[A-Z0-9]{6}$/.test(code)) {
                console.log('Extracted code via Method 2 (URL parameter):', code);
                return code;
            }
        }
        
        // Method 3: Look for any 6-character alphanumeric code (standalone)
        // Use word boundaries to find isolated codes
        const codePattern = /\b([A-Z0-9]{6})\b/gi;
        const codes = normalizedText.match(codePattern);
        if (codes && codes.length > 0) {
            // Filter to find valid room codes
            for (let code of codes) {
                const upperCode = code.toUpperCase();
                if (/^[A-Z0-9]{6}$/.test(upperCode)) {
                    console.log('Extracted code via Method 3 (word boundary):', upperCode);
                    return upperCode;
                }
            }
        }
        
        // Method 4: Look for codes after "Code:" or "code:" without "Room" prefix
        const simpleCodePattern = /Code\s*:?\s*([A-Z0-9]{6})/i;
        match = normalizedText.match(simpleCodePattern);
        if (match && match[1]) {
            const code = match[1].toUpperCase();
            if (/^[A-Z0-9]{6}$/.test(code)) {
                console.log('Extracted code via Method 4 (Code: pattern):', code);
                return code;
            }
        }
        
        // Method 5: Try to extract from cleaned text (remove all non-alphanumeric)
        // This is a last resort - might extract wrong code if multiple 6-char sequences exist
        const cleaned = normalizedText.replace(/[^A-Z0-9]/gi, '').toUpperCase();
        if (cleaned.length >= 6) {
            // Look for 6-character sequences, prefer ones that look like room codes
            for (let i = 0; i <= cleaned.length - 6; i++) {
                const candidate = cleaned.substring(i, i + 6);
                if (/^[A-Z0-9]{6}$/.test(candidate)) {
                    // Prefer codes that have both letters and numbers (typical room codes)
                    const hasLetters = /[A-Z]/.test(candidate);
                    const hasNumbers = /[0-9]/.test(candidate);
                    if (hasLetters && hasNumbers) {
                        console.log('Extracted code via Method 5 (cleaned text with letters+numbers):', candidate);
                        return candidate;
                    }
                }
            }
            // If no code with both letters and numbers, return first valid 6-char code
            for (let i = 0; i <= cleaned.length - 6; i++) {
                const candidate = cleaned.substring(i, i + 6);
                if (/^[A-Z0-9]{6}$/.test(candidate)) {
                    console.log('Extracted code via Method 5 (cleaned text):', candidate);
                    return candidate;
                }
            }
        }
        
        console.log('Could not extract room code from text:', normalizedText);
        return null;
    }

    pasteRoomCode() {
        if (navigator.clipboard && navigator.clipboard.readText) {
            navigator.clipboard.readText().then(text => {
                console.log('Pasted text:', text);
                console.log('Text length:', text.length);
                console.log('Text type:', typeof text);
                
                if (!text || text.trim().length === 0) {
                    this.showNotification('Clipboard is empty. Please copy the message first.');
                    this.sounds.error();
                    return;
                }
                
                // Try to extract room code from the pasted text
                let roomCode = this.extractRoomCodeFromText(text);
                
                if (!roomCode) {
                    // Fallback: try simple extraction (remove spaces, check if it's a 6-char code)
                    const cleaned = text.replace(/\s/g, '').toUpperCase();
                    console.log('Cleaned text (fallback):', cleaned);
                    if (cleaned.length === 6 && /^[A-Z0-9]{6}$/.test(cleaned)) {
                        roomCode = cleaned;
                        console.log('Extracted code via fallback:', roomCode);
                    }
                }
                
                // Validate the extracted code
                if (roomCode) {
                    roomCode = roomCode.toUpperCase().trim();
                    if (!/^[A-Z0-9]{6}$/.test(roomCode)) {
                        console.error('Invalid room code format:', roomCode);
                        this.showNotification(`Invalid room code format: "${roomCode}". Room code must be exactly 6 alphanumeric characters.`);
                        this.sounds.error();
                        return;
                    }
                }
                
                if (roomCode && /^[A-Z0-9]{6}$/.test(roomCode)) {
                    console.log('Successfully extracted room code:', roomCode);
                    
                    // Check if we're on direct join screen or join modal
                    if (this.directJoinScreen && this.directJoinScreen.classList.contains('active')) {
                        // If on direct join screen, update the room code and show notification
                        this.pendingRoomCode = roomCode;
                        if (this.directJoinRoomCodeDisplay) {
                            this.directJoinRoomCodeDisplay.textContent = roomCode;
                        }
                        this.showNotification(`Room code extracted: ${roomCode} 📋✨`);
                    } else if (this.roomCodeInput) {
                        // If on join modal, paste into input
                        this.roomCodeInput.value = roomCode;
                        this.showNotification(`Room code pasted: ${roomCode} 📋✨`);
                    } else {
                        // If on main menu, show join modal with code
                        if (this.roomCodeInput) {
                            this.roomCodeInput.value = roomCode;
                        }
                        this.showJoinModal();
                        this.showNotification(`Room code pasted: ${roomCode}. Opening join screen... 📋✨`);
                    }
                    this.sounds.notification();
                } else {
                    console.error('Could not extract valid room code from:', text);
                    this.showNotification('Could not find a valid room code in the pasted text. Please make sure you copied the full message with "Room Code: XXXX" or the link.');
                    this.sounds.error();
                }
            }).catch(err => {
                console.error('Failed to paste room code:', err);
                this.showNotification('Failed to access clipboard. Please make sure you have copied the message.');
                this.sounds.error();
            });
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.focus();
            
            try {
                const pasted = document.execCommand('paste');
                if (pasted) {
                    const text = textArea.value;
                    const roomCode = this.extractRoomCodeFromText(text);
                    
                    if (roomCode && /^[A-Z0-9]{6}$/.test(roomCode)) {
                        if (this.roomCodeInput) {
                            this.roomCodeInput.value = roomCode;
                            this.showNotification('Room code pasted! 📋✨');
                            this.sounds.notification();
                        }
                    } else {
                        this.showNotification('Could not find a valid room code');
                    }
                }
            } catch (err) {
                console.error('Fallback paste failed:', err);
                this.showNotification('Paste not supported in this browser');
            }
            
            document.body.removeChild(textArea);
        }
    }

    showNotification(message) {
        // Create a temporary notification
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        this.sounds.notification();
        
        setTimeout(() => {
            notification.remove();
        }, 2000);
    }

    // Game actions
    validatePlayerName() {
        const name = this.playerNameInput.value.trim();
        if (!name) {
            this.showError('Please enter your name');
            this.sounds.error();
            return false;
        }
        this.playerName = name;
        this.sounds.buttonClick();
        return true;
    }

    createRoom() {
        if (!this.validatePlayerName()) return;
        
        console.log('Creating room for player:', this.playerName);
        this.sounds.buttonClick();
        this.showLoading();
        this.socket.emit('createRoom', this.playerName);
    }

    validateDirectJoinPlayerName() {
        const name = this.directJoinPlayerNameInput.value.trim();
        if (!name) {
            this.showError('Please enter your name');
            this.sounds.error();
            return false;
        }
        this.playerName = name;
        this.sounds.buttonClick();
        return true;
    }

    directJoinRoom() {
        if (!this.validateDirectJoinPlayerName()) return;
        
        if (!this.pendingRoomCode) {
            this.showError('No room code found');
            this.sounds.error();
            return;
        }
        
        console.log('Attempting to join room via direct link:', this.pendingRoomCode);
        this.sounds.buttonClick();
        this.showLoading();
        this.socket.emit('joinRoom', { roomId: this.pendingRoomCode, playerName: this.playerName });
    }

    joinRoom() {
        if (!this.validatePlayerName()) return;
        
        const roomCode = this.roomCodeInput.value.trim();
        if (!roomCode) {
            this.showError('Please enter a room code');
            this.sounds.error();
            return;
        }
        
        console.log('Attempting to join room:', roomCode);
        this.sounds.buttonClick();
        this.showLoading();
        this.socket.emit('joinRoom', { roomId: roomCode, playerName: this.playerName });
        this.hideJoinModal();
    }

    startGame() {
        if (this.gameState.players.length < 2) {
            this.showError('Need at least 2 players to start');
            this.sounds.error();
            return;
        }
        
        this.sounds.notification();
        this.socket.emit('startGame');
    }

    playCard(card) {
        if (!this.isMyTurn()) {
            this.showError("It's not your turn!");
            this.sounds.error();
            return;
        }

        // Stop timer when playing a card
        this.stopTurnTimer();

        if (card.color === 'wild') {
            this.selectedCard = card;
            this.sounds.cardPlay();
            this.showColorPicker();
        } else {
            this.sounds.cardPlay();
            // Animate card flying to discard pile
            this.animateCardPlay(card);
            this.socket.emit('playCard', { card });
        }
    }

    animateCardPlay(card) {
        // Find the card element in hand
        const cardElements = this.cardsContainer.querySelectorAll('.card');
        let cardElement = null;
        
        cardElements.forEach(el => {
            const cardData = el.getAttribute('data-card');
            if (cardData) {
                try {
                    const parsedCard = JSON.parse(cardData);
                    if (parsedCard.color === card.color && 
                        parsedCard.type === card.type && 
                        parsedCard.value === card.value) {
                        cardElement = el;
                    }
                } catch (e) {
                    // Ignore parse errors
                }
            }
        });

        if (cardElement && this.discardPile) {
            // Create particle effect at card position
            this.createCardPlayParticles(cardElement);
            
            // Clone card for animation
            const animatedCard = cardElement.cloneNode(true);
            animatedCard.style.position = 'fixed';
            animatedCard.style.zIndex = '10000';
            animatedCard.style.pointerEvents = 'none';
            animatedCard.style.transition = 'all 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
            animatedCard.style.transform = 'rotate(0deg) scale(1)';
            
            // Get positions
            const cardRect = cardElement.getBoundingClientRect();
            const discardRect = this.discardPile.getBoundingClientRect();
            
            // Set initial position
            animatedCard.style.left = cardRect.left + 'px';
            animatedCard.style.top = cardRect.top + 'px';
            animatedCard.style.width = cardRect.width + 'px';
            animatedCard.style.height = cardRect.height + 'px';
            animatedCard.style.transform = 'rotate(0deg)';
            
            document.body.appendChild(animatedCard);
            
            // Force reflow
            void animatedCard.offsetWidth;
            
            // Animate to discard pile with rotation and scale
            const centerX = discardRect.left + discardRect.width / 2;
            const centerY = discardRect.top + discardRect.height / 2;
            const rotation = (Math.random() - 0.5) * 20; // Random rotation between -10 and 10 degrees
            
            requestAnimationFrame(() => {
                animatedCard.style.left = centerX - cardRect.width / 2 + 'px';
                animatedCard.style.top = centerY - cardRect.height / 2 + 'px';
                animatedCard.style.transform = `rotate(${rotation}deg) scale(0.95)`;
                animatedCard.style.opacity = '0.9';
            });
            
            // Create impact particles at discard pile
            setTimeout(() => {
                this.createCardImpactParticles(centerX, centerY);
                animatedCard.remove();
            }, 600);
        }
    }
    
    createCardPlayParticles(cardElement) {
        const rect = cardElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        for (let i = 0; i < 8; i++) {
            const particle = document.createElement('div');
            particle.className = 'card-particle';
            const angle = (Math.PI * 2 * i) / 8;
            const distance = 30 + Math.random() * 20;
            const size = 4 + Math.random() * 4;
            
            particle.style.cssText = `
                position: fixed;
                left: ${centerX}px;
                top: ${centerY}px;
                width: ${size}px;
                height: ${size}px;
                background: radial-gradient(circle, #FFD700 0%, #FF69B4 100%);
                border-radius: 50%;
                pointer-events: none;
                z-index: 10001;
                animation: particleExplode 0.6s ease-out forwards;
                --target-x: ${centerX + Math.cos(angle) * distance}px;
                --target-y: ${centerY + Math.sin(angle) * distance}px;
            `;
            
            document.body.appendChild(particle);
            setTimeout(() => particle.remove(), 600);
        }
    }
    
    createCardImpactParticles(x, y) {
        for (let i = 0; i < 12; i++) {
            const particle = document.createElement('div');
            particle.className = 'card-particle';
            const angle = (Math.PI * 2 * i) / 12;
            const distance = 40 + Math.random() * 30;
            const size = 5 + Math.random() * 5;
            const colors = ['#FF69B4', '#FF1493', '#FFD700', '#FFB6C1'];
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            particle.style.cssText = `
                position: fixed;
                left: ${x}px;
                top: ${y}px;
                width: ${size}px;
                height: ${size}px;
                background: radial-gradient(circle, ${color} 0%, transparent 100%);
                border-radius: 50%;
                pointer-events: none;
                z-index: 10001;
                animation: particleImpact 0.8s ease-out forwards;
                --target-x: ${x + Math.cos(angle) * distance}px;
                --target-y: ${y + Math.sin(angle) * distance}px;
            `;
            
            document.body.appendChild(particle);
            setTimeout(() => particle.remove(), 800);
        }
    }

    selectColor(color) {
        if (this.selectedCard) {
            // Stop timer when selecting color
            this.stopTurnTimer();
            
            this.sounds.cardPlay();
            // Animate card flying to discard pile
            this.animateCardPlay(this.selectedCard);
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
            this.sounds.error();
            return;
        }
        
        // Stop timer when drawing a card
        this.stopTurnTimer();
        
        this.sounds.cardDraw();
        this.socket.emit('drawCard');
    }

    callUno() {
        console.log('callUno() called');
        console.log('Is my turn:', this.isMyTurn());
        console.log('Player hand:', this.playerHand);
        console.log('Player hand length:', this.playerHand ? this.playerHand.length : 'undefined');
        
        if (!this.isMyTurn()) {
            this.showNotification("It's not your turn!");
            return;
        }
        
        // Check if player has exactly 1 card using the actual hand
        if (this.playerHand && this.playerHand.length === 1) {
            console.log('Calling UNO - player has 1 card');
            this.sounds.uno();
            this.socket.emit('callUno');
            this.showNotification('UNO!');
        } else {
            console.log('Cannot call UNO - player has', this.playerHand ? this.playerHand.length : 'undefined', 'cards');
            this.showNotification('You can only call UNO when you have 1 card!');
        }
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
            this.sounds.buttonClick();
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
        
        // Update circular player layout (includes current player and direction arrows)
        this.updateOtherPlayers();
        
        // Update discard pile
        this.updateDiscardPile();
        
        // Update direction indicator
        this.updateDirectionIndicator();
        
        // Update player hand
        this.updatePlayerHand();
        
        // Add center animations
        this.updateCenterAnimations();
    }
    
    updateCenterAnimations() {
        if (!this.centerAnimations) return;
        
        // Create floating sparkles continuously
        this.createFloatingSparkles();
        
        // Create sparkles periodically
        if (!this.sparkleInterval) {
            this.sparkleInterval = setInterval(() => {
                this.createFloatingSparkles();
            }, 2000);
        }
    }
    
    createFloatingSparkles() {
        if (!this.centerAnimations) return;
        
        // Limit sparkles to avoid performance issues
        const existingSparkles = this.centerAnimations.querySelectorAll('.sparkle');
        if (existingSparkles.length > 20) return;
        
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                const sparkle = document.createElement('div');
                sparkle.className = 'sparkle';
                const size = Math.random() * 8 + 6;
                const duration = Math.random() * 4 + 3;
                sparkle.style.cssText = `
                    position: absolute;
                    width: ${size}px;
                    height: ${size}px;
                    background: radial-gradient(circle, #FFD700 0%, #FF69B4 50%, transparent 100%);
                    border-radius: 50%;
                    left: ${Math.random() * 100}%;
                    top: ${Math.random() * 100}%;
                    pointer-events: none;
                    animation: sparkleFloat ${duration}s ease-in-out forwards;
                    opacity: ${Math.random() * 0.6 + 0.4};
                    box-shadow: 0 0 10px #FFD700;
                `;
                this.centerAnimations.appendChild(sparkle);
                
                // Remove after animation
                setTimeout(() => {
                    if (sparkle.parentNode) {
                        sparkle.remove();
                    }
                }, duration * 1000);
            }, i * 150);
        }
    }

    sendHeartToPlayer(playerId, playerName) {
        // Emit heart event to server
        this.socket.emit('sendHeart', { targetPlayerId: playerId });
        
        // Show local animation
        this.createHeartAnimation();
        this.showNotification(`💖 Sent love to ${playerName}!`);
        this.sounds.notification();
    }

    createHeartAnimation() {
        // Create floating hearts animation
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                const heart = document.createElement('div');
                heart.textContent = '💖';
                heart.style.position = 'fixed';
                heart.style.fontSize = '30px';
                heart.style.pointerEvents = 'none';
                heart.style.zIndex = '10000';
                heart.style.left = '50%';
                heart.style.top = '50%';
                heart.style.transform = 'translate(-50%, -50%)';
                heart.style.animation = 'floatHeart 2s ease-out forwards';
                heart.style.opacity = '0';
                
                // Random offset
                const offsetX = (Math.random() - 0.5) * 200;
                const offsetY = (Math.random() - 0.5) * 200;
                heart.style.setProperty('--offset-x', offsetX + 'px');
                heart.style.setProperty('--offset-y', offsetY + 'px');
                
                document.body.appendChild(heart);
                
                setTimeout(() => heart.remove(), 2000);
            }, i * 100);
        }
    }

    updateOtherPlayers() {
        if (!this.playersCircle || !this.gameState) return;
        
        this.playersCircle.innerHTML = '';
        this.playersArrows.innerHTML = '';
        
        const players = this.gameState.players;
        const totalPlayers = players.length;
        const currentPlayerIndex = this.gameState.currentPlayer;
        const direction = this.gameState.direction || 1;
        
        // Handle turn timer logic
        const currentPlayer = players[currentPlayerIndex];
        if (currentPlayer) {
            const isMyTurn = currentPlayer.id === this.socket.id;
            if (isMyTurn) {
                // Start timer if it's my turn and not skipped
                if (!this.isSkipped()) {
                    this.startTurnTimer();
                } else {
                    this.stopTurnTimer();
                }
            } else {
                // Stop timer if not my turn
                this.stopTurnTimer();
            }
        }
        
        // Calculate positions in a circle
        const centerX = 50; // Percentage
        const centerY = 50; // Percentage
        const radius = 35; // Percentage from center
        
        players.forEach((player, index) => {
            // Calculate angle for circular positioning
            let angle;
            if (totalPlayers === 2) {
                // For 2 players: top and bottom
                angle = index === 0 ? -90 : 90; // Top: -90deg, Bottom: 90deg
            } else {
                // For 3+: distribute evenly in circle
                angle = (index * (360 / totalPlayers) - 90) * (Math.PI / 180); // Start from top
            }
            
            // Convert angle to degrees for CSS
            const angleDeg = totalPlayers === 2 
                ? (index === 0 ? -90 : 90)
                : (index * (360 / totalPlayers) - 90);
            
            // Calculate position
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            
            // Create circular player avatar
            const playerAvatar = document.createElement('div');
            playerAvatar.className = 'circular-player-avatar';
            playerAvatar.style.left = `${x}%`;
            playerAvatar.style.top = `${y}%`;
            playerAvatar.style.transform = `translate(-50%, -50%)`;
            
            // Check if this is current player
            const isCurrentPlayer = index === currentPlayerIndex;
            if (isCurrentPlayer) {
                playerAvatar.classList.add('current-turn');
            }
            
            // Check if this is me
            const isMe = player.id === this.socket.id;
            if (isMe) {
                playerAvatar.classList.add('my-player');
            }
            
            // Create avatar circle
            const avatarCircle = document.createElement('div');
            avatarCircle.className = 'avatar-circle';
            avatarCircle.textContent = player.name.charAt(0).toUpperCase();
            
            // Create name label
            const nameLabel = document.createElement('div');
            nameLabel.className = 'player-name-label';
            nameLabel.textContent = isMe ? 'You' : player.name;
            
            // Create card count badge
            const cardBadge = document.createElement('div');
            cardBadge.className = 'card-count-badge';
            cardBadge.textContent = player.handSize;
            
            // Create UNO indicator
            if (player.unoCall) {
                const unoBadge = document.createElement('div');
                unoBadge.className = 'uno-badge';
                unoBadge.textContent = 'UNO!';
                playerAvatar.appendChild(unoBadge);
            }
            
            // Make clickable for hearts (if not me)
            if (!isMe) {
                playerAvatar.style.cursor = 'pointer';
                playerAvatar.title = 'Click to send 💖';
                playerAvatar.addEventListener('click', () => {
                    this.sendHeartToPlayer(player.id, player.name);
                });
            }
            
            playerAvatar.appendChild(avatarCircle);
            playerAvatar.appendChild(nameLabel);
            playerAvatar.appendChild(cardBadge);
            
            this.playersCircle.appendChild(playerAvatar);
        });
        
        // Draw connecting arrows showing direction (use setTimeout to ensure container dimensions are available)
        setTimeout(() => {
            this.drawPlayerArrows(players, currentPlayerIndex, direction, centerX, centerY, radius);
        }, 0);
    }

    drawPlayerArrows(players, currentIndex, direction, centerX, centerY, radius) {
        if (players.length < 2) return;
        
        // Use SVG viewBox coordinates (0-1000)
        const svgSize = 1000;
        const centerXPx = (centerX / 100) * svgSize;
        const centerYPx = (centerY / 100) * svgSize;
        const radiusPx = (radius / 100) * svgSize;
        
        const totalPlayers = players.length;
        
        players.forEach((player, index) => {
            // Calculate next player index based on direction
            let nextIndex;
            if (direction === 1) {
                nextIndex = (index + 1) % totalPlayers;
            } else {
                nextIndex = (index - 1 + totalPlayers) % totalPlayers;
            }
            
            // Calculate angles
            let angle1, angle2;
            if (totalPlayers === 2) {
                angle1 = (index === 0 ? -90 : 90) * (Math.PI / 180);
                angle2 = (nextIndex === 0 ? -90 : 90) * (Math.PI / 180);
            } else {
                angle1 = (index * (360 / totalPlayers) - 90) * (Math.PI / 180);
                angle2 = (nextIndex * (360 / totalPlayers) - 90) * (Math.PI / 180);
            }
            
            // Calculate positions in pixels
            const x1 = centerXPx + radiusPx * Math.cos(angle1);
            const y1 = centerYPx + radiusPx * Math.sin(angle1);
            const x2 = centerXPx + radiusPx * Math.cos(angle2);
            const y2 = centerYPx + radiusPx * Math.sin(angle2);
            
            // Create arrow line
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', x1);
            line.setAttribute('y1', y1);
            line.setAttribute('x2', x2);
            line.setAttribute('y2', y2);
            line.setAttribute('class', 'player-arrow');
            
            // Highlight arrow if this is current player
            if (index === currentIndex) {
                line.classList.add('active-arrow');
            }
            
            // Calculate arrowhead position and angle
            const dx = x2 - x1;
            const dy = y2 - y1;
            const arrowAngle = Math.atan2(dy, dx);
            
            // Create arrowhead at the end of the line, slightly inside the circle
            const arrowSize = svgSize * 0.02; // 2% of SVG size
            const arrowOffset = arrowSize * 1.5; // Offset from edge
            const arrowX = x2 - arrowOffset * Math.cos(angle2);
            const arrowY = y2 - arrowOffset * Math.sin(angle2);
            
            // Calculate arrowhead points
            const arrowPoint1X = arrowX - arrowSize * Math.cos(arrowAngle - Math.PI / 6);
            const arrowPoint1Y = arrowY - arrowSize * Math.sin(arrowAngle - Math.PI / 6);
            const arrowPoint2X = arrowX - arrowSize * Math.cos(arrowAngle + Math.PI / 6);
            const arrowPoint2Y = arrowY - arrowSize * Math.sin(arrowAngle + Math.PI / 6);
            
            const arrowhead = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            arrowhead.setAttribute('points', 
                `${arrowX},${arrowY} ` +
                `${arrowPoint1X},${arrowPoint1Y} ` +
                `${arrowPoint2X},${arrowPoint2Y}`
            );
            arrowhead.setAttribute('class', 'arrowhead');
            if (index === currentIndex) {
                arrowhead.classList.add('active-arrow');
            }
            
            this.playersArrows.appendChild(line);
            this.playersArrows.appendChild(arrowhead);
        });
    }

    updateDiscardPile() {
        if (!this.gameState.topCard) return;
        
        this.discardPile.innerHTML = '';
        
        // For wild cards, create a card with the chosen color
        let displayCard = this.gameState.topCard;
        // Check if it's actually a wild card - must have type: 'wild'
        const isWildCard = this.gameState.topCard.type === 'wild';
        
        // Only show wild color display for ACTUAL wild cards that were played
        if (isWildCard && this.gameState.currentColor) {
            displayCard = {
                ...this.gameState.topCard,
                color: this.gameState.currentColor
            };
            
            // Show wild color display prominently ONLY for wild cards
            if (this.wildColorDisplay && this.wildColorCircle) {
                this.wildColorDisplay.style.display = 'flex';
                const colorValue = this.getColorValue(this.gameState.currentColor);
                this.wildColorCircle.style.background = colorValue;
                this.wildColorCircle.style.boxShadow = `0 0 25px ${colorValue}CC`;
                
                // Add color name
                const colorName = this.gameState.currentColor.charAt(0).toUpperCase() + 
                                this.gameState.currentColor.slice(1);
                this.wildColorCircle.textContent = colorName;
            }
        } else {
            // ALWAYS hide wild color display for non-wild cards
            if (this.wildColorDisplay) {
                this.wildColorDisplay.style.display = 'none';
            }
        }
        
        const cardElement = this.createCardElement(displayCard);
        this.discardPile.appendChild(cardElement);
        
        // Add prominent color indicator for wild cards
        if (isWildCard && this.gameState.currentColor) {
            const colorIndicator = document.createElement('div');
            colorIndicator.className = 'wild-color-indicator';
            const colorValue = this.getColorValue(this.gameState.currentColor);
            colorIndicator.style.cssText = `
                position: absolute;
                top: -15px;
                left: 50%;
                transform: translateX(-50%);
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: ${colorValue};
                border: 4px solid white;
                box-shadow: 0 0 20px ${colorValue}, 0 4px 10px rgba(0,0,0,0.3);
                z-index: 10;
                animation: colorPulse 2s ease-in-out infinite;
            `;
            this.discardPile.appendChild(colorIndicator);
        }
        
        // Add current color indicator for non-wild cards
        if (this.gameState.currentColor && this.gameState.currentColor !== 'wild' && !isWildCard) {
            const colorIndicator = document.createElement('div');
            colorIndicator.className = 'current-color-indicator';
            colorIndicator.style.cssText = `
                position: absolute;
                top: -10px;
                right: -10px;
                width: 25px;
                height: 25px;
                border-radius: 50%;
                background: ${this.getColorValue(this.gameState.currentColor)};
                border: 3px solid white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            `;
            this.discardPile.appendChild(colorIndicator);
        }
    }
    
    updateDirectionIndicator() {
        if (!this.gameState || !this.directionIndicatorCircle || !this.directionArrow) return;
        
        const direction = this.gameState.direction || 1;
        const isClockwise = direction === 1;
        
        // Update circular arrow path
        const radius = 80;
        const centerX = 100;
        const centerY = 100;
        
        // Create circular path based on direction
        let pathData;
        if (isClockwise) {
            // Clockwise: start at top, go right
            pathData = `M ${centerX} ${centerY - radius} A ${radius} ${radius} 0 1 1 ${centerX + radius * 0.7} ${centerY + radius * 0.7}`;
        } else {
            // Counter-clockwise: start at top, go left
            pathData = `M ${centerX} ${centerY - radius} A ${radius} ${radius} 0 1 0 ${centerX - radius * 0.7} ${centerY + radius * 0.7}`;
        }
        
        this.directionArrow.setAttribute('d', pathData);
        this.directionArrow.setAttribute('class', `direction-arrow ${isClockwise ? 'clockwise' : 'counterclockwise'}`);
        
        // Update direction text
        if (this.directionText) {
            this.directionText.textContent = isClockwise ? '↻' : '↺';
            this.directionText.className = `direction-text ${isClockwise ? 'clockwise' : 'counterclockwise'}`;
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

    startTurnTimer() {
        // Clear any existing timer
        this.stopTurnTimer();
        
        // Reset timer
        this.turnTimeLeft = this.turnTimerDuration;
        
        // Update timer display
        if (this.timerText) {
            this.timerText.textContent = this.turnTimeLeft;
        }
        
        // Show timer
        if (this.turnTimer) {
            this.turnTimer.style.display = 'block';
        }
        
        // Reset progress circle
        if (this.timerProgress) {
            const circumference = 2 * Math.PI * 45;
            this.timerProgress.style.strokeDasharray = circumference;
            this.timerProgress.style.strokeDashoffset = 0;
            this.timerProgress.style.stroke = '#FF69B4';
        }
        
        // Start countdown
        this.turnTimerInterval = setInterval(() => {
            this.turnTimeLeft--;
            
            // Update timer text
            if (this.timerText) {
                this.timerText.textContent = this.turnTimeLeft;
            }
            
            // Update progress circle
            if (this.timerProgress) {
                const progress = (this.turnTimeLeft / this.turnTimerDuration) * 100;
                const circumference = 2 * Math.PI * 45;
                const offset = circumference - (progress / 100) * circumference;
                this.timerProgress.style.strokeDashoffset = offset;
                
                // Change color when time is running out
                if (this.turnTimeLeft <= 5) {
                    this.timerProgress.style.stroke = '#DC3545';
                } else if (this.turnTimeLeft <= 10) {
                    this.timerProgress.style.stroke = '#FF6B6B';
                } else {
                    this.timerProgress.style.stroke = '#FF69B4';
                }
            }
            
            // Auto-draw if time runs out
            if (this.turnTimeLeft <= 0) {
                this.stopTurnTimer();
                if (this.isMyTurn() && !this.isSkipped()) {
                    console.log('Turn timer expired - auto-drawing card');
                    this.showNotification('Time\'s up! Drawing a card automatically...');
                    this.drawCard();
                }
            }
        }, 1000);
    }

    stopTurnTimer() {
        if (this.turnTimerInterval) {
            clearInterval(this.turnTimerInterval);
            this.turnTimerInterval = null;
        }
        
        // Hide timer if not my turn
        if (this.turnTimer && !this.isMyTurn()) {
            this.turnTimer.style.display = 'none';
        }
    }

    updateCurrentPlayerInfo() {
        console.log('Updating current player info:', this.gameState);
        
        if (!this.gameState || !this.gameState.players || this.gameState.currentPlayer === undefined) {
            console.log('Game state not ready for current player update');
            return;
        }
        
        const currentPlayer = this.gameState.players[this.gameState.currentPlayer];
        console.log('Current player:', currentPlayer);
        
        if (currentPlayer && this.currentPlayerName) {
            let playerText = currentPlayer.name;
            
            // Check if it's the current player's turn
            const isMyTurn = currentPlayer.id === this.socket.id;
            console.log('Is my turn:', isMyTurn, 'My socket ID:', this.socket.id, 'Current player ID:', currentPlayer.id);
            
            if (isMyTurn) {
                playerText = 'You';
                if (this.gameInfo) {
                    this.gameInfo.classList.add('your-turn');
                }
                // Start timer if it's my turn and not skipped
                if (!this.isSkipped()) {
                    this.startTurnTimer();
                } else {
                    this.stopTurnTimer();
                }
            } else {
                if (this.gameInfo) {
                    this.gameInfo.classList.remove('your-turn');
                }
                // Stop timer if not my turn
                this.stopTurnTimer();
            }
            
            // Add draw penalty info
            if (this.gameState.drawCount > 0) {
                playerText += ` (Draw ${this.gameState.drawCount})`;
            }
            
            console.log('Setting player text to:', playerText);
            this.currentPlayerName.textContent = playerText;
        } else {
            console.log('No current player found or currentPlayerName element missing');
            if (this.currentPlayerName) {
                this.currentPlayerName.textContent = 'No player';
            }
        }
    }

    updateDirection() {
        console.log('Updating direction:', this.gameState?.direction);
        
        if (!this.directionIndicator) {
            console.log('Direction indicator element not found');
            return;
        }
        
        const arrow = this.directionIndicator.querySelector('.arrow');
        if (arrow) {
            if (this.gameState && this.gameState.direction === 1) {
                arrow.textContent = '→';
                console.log('Direction set to right (→)');
            } else {
                arrow.textContent = '←';
                console.log('Direction set to left (←)');
            }
        } else {
            console.log('Arrow element not found in direction indicator');
        }
    }

    updatePlayerHand() {
        this.cardsContainer.innerHTML = '';
        
        this.playerHand.forEach(card => {
            const cardElement = this.createCardElement(card, true);
            // Add hover effect with sparkles
            cardElement.addEventListener('mouseenter', () => {
                this.createSparkleEffect(cardElement);
            });
            this.cardsContainer.appendChild(cardElement);
        });
        
        // Check for auto-play scenarios (only one option available)
        if (this.isMyTurn() && !this.isSkipped() && this.gameState && this.gameState.drawCount > 0) {
            // Check if player can stack any cards
            const canStack = this.playerHand.some(card => this.canPlayCard(card));
            
            if (!canStack) {
                // Player cannot stack, must draw penalty cards - auto-play
                console.log('Auto-playing: Player must draw penalty cards (no stackable cards)');
                setTimeout(() => {
                    if (this.isMyTurn() && this.gameState.drawCount > 0) {
                        this.drawCard();
                    }
                }, 1000); // Small delay for better UX
            }
        }
        
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
        // Store card data for animation
        cardDiv.setAttribute('data-card', JSON.stringify(card));
        
        // Get the Hello Kitty card image
        const cardImage = this.getCardImage(card);
        console.log('Creating card element for:', card, 'Image:', cardImage);
        if (cardImage) {
            cardDiv.style.backgroundImage = `url('${cardImage}')`;
            cardDiv.style.backgroundSize = 'cover';
            cardDiv.style.backgroundPosition = 'center';
            cardDiv.style.backgroundRepeat = 'no-repeat';
            console.log('Applied background image:', cardImage);
        }
        
        // Add kawaii card content (fallback for text)
        this.addKawaiiCardContent(cardDiv, card);
        
        // Check if card is playable
        if (clickable && !this.canPlayCard(card)) {
            cardDiv.classList.add('unplayable');
        }
        
        // Add special styling for skipped players
        if (clickable && this.isSkipped()) {
            cardDiv.classList.add('unplayable');
        }
        
        if (clickable) {
            cardDiv.addEventListener('click', () => {
                // Check if it's the player's turn
                if (!this.isMyTurn()) {
                    this.showError("It's not your turn!");
                    this.sounds.error();
                    return;
                }
                
                // Check if player is skipped
                if (this.isSkipped()) {
                    this.showError("You were skipped! Wait for your next turn.");
                    this.sounds.error();
                    return;
                }
                
                // Check if card is playable
                if (!this.canPlayCard(card)) {
                    this.showError("You can't play this card right now!");
                    this.sounds.error();
                    return;
                }
                
                // Remove selection from other cards
                document.querySelectorAll('.card.selected').forEach(c => {
                    c.classList.remove('selected');
                });
                
                // Select this card and play it
                cardDiv.classList.add('selected');
                setTimeout(() => {
                    this.sounds.cardPlay();
                    this.playCard(card);
                    cardDiv.classList.remove('selected');
                }, 200);
            });
        }
        
        return cardDiv;
    }

    addKawaiiCardContent(cardDiv, card) {
        // Check if we have a Hello Kitty image for this card
        const cardImage = this.getCardImage(card);
        if (cardImage) {
            // If we have an image, don't add text content - let the image show
            cardDiv.innerHTML = '';
            return;
        }
        
        // Fallback to text content if no image is available
        if (card.type === 'number') {
            cardDiv.innerHTML = `
                <div style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                    <div style="font-size: 1.2rem; font-weight: 800;">${card.value}</div>
                    <div style="position: absolute; top: 5px; left: 5px; font-size: 0.6rem;">🎀</div>
                    <div style="position: absolute; bottom: 5px; right: 5px; font-size: 0.6rem;">💖</div>
                </div>
            `;
        } else if (card.type === 'action') {
            let symbol, emoji;
            switch (card.value) {
                case 'skip':
                    symbol = '⊘';
                    emoji = '🚫';
                    break;
                case 'reverse':
                    symbol = '⟲';
                    emoji = '🔄';
                    break;
                case 'draw2':
                    symbol = '+2';
                    emoji = '📚';
                    break;
            }
            cardDiv.innerHTML = `
                <div style="position: relative; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                    <div style="font-size: 1rem;">${symbol}</div>
                    <div style="font-size: 0.8rem; margin-top: 2px;">${emoji}</div>
                    <div style="position: absolute; top: 3px; right: 3px; font-size: 0.5rem;">✨</div>
                </div>
            `;
        } else if (card.type === 'wild') {
            if (card.value === 'wild') {
                cardDiv.innerHTML = `
                    <div style="position: relative; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                        <div style="font-size: 1rem;">🌈</div>
                        <div style="font-size: 0.7rem; font-weight: 800;">WILD</div>
                        <div style="position: absolute; top: 3px; left: 3px; font-size: 0.5rem;">🦄</div>
                        <div style="position: absolute; bottom: 3px; right: 3px; font-size: 0.5rem;">⭐</div>
                    </div>
                `;
            } else if (card.value === 'draw4') {
                cardDiv.innerHTML = `
                    <div style="position: relative; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                        <div style="font-size: 0.9rem; font-weight: 800;">+4</div>
                        <div style="font-size: 0.8rem;">🌟</div>
                        <div style="position: absolute; top: 3px; left: 3px; font-size: 0.5rem;">💫</div>
                        <div style="position: absolute; bottom: 3px; right: 3px; font-size: 0.5rem;">✨</div>
                    </div>
                `;
            }
        }
    }

    getCardImage(card) {
        // Map card properties to Hello Kitty image filenames
        // Format: [color][value].png
        // Colors: p (pink), y (yellow), b (blue), g (green)
        // Values: 0-9, +2, b (block), r (reverse)
        // Wild cards: wcc (wild color change), w+4 (wild plus 4)
        
        console.log('getCardImage called with card:', card);
        
        // Handle wild cards first (they don't have a color prefix)
        if (card.type === 'wild') {
            if (card.value === 'wild') {
                console.log('Wild card detected, using wcc.png');
                return 'cards/wcc.png'; // wild color change
            } else if (card.value === 'draw4') {
                console.log('Wild draw 4 detected, using w+4.png');
                return 'cards/w+4.png'; // wild plus 4
            } else {
                console.log('Unknown wild card value:', card);
                return null;
            }
        }
        
        let colorPrefix = '';
        let valueSuffix = '';
        
        // Map colors
        switch (card.color) {
            case 'red':
                colorPrefix = 'p'; // pink
                break;
            case 'yellow':
                colorPrefix = 'y';
                break;
            case 'blue':
                colorPrefix = 'b';
                break;
            case 'green':
                colorPrefix = 'g';
                break;
            default:
                console.log('Unknown color for card:', card);
                return null; // Unknown color
        }
        
        // Map values
        if (card.type === 'number') {
            valueSuffix = card.value.toString();
        } else if (card.type === 'action') {
            switch (card.value) {
                case 'skip':
                    valueSuffix = 'b'; // block
                    break;
                case 'reverse':
                    valueSuffix = 'r';
                    break;
                case 'draw2':
                    valueSuffix = '+2';
                    break;
                default:
                    console.log('Unknown action value for card:', card);
                    return null;
            }
        }
        
        // Return the image path
        const imagePath = `cards/${colorPrefix}${valueSuffix}.png`;
        console.log('Card image path:', imagePath, 'for card:', card);
        return imagePath;
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
        this.sounds.buttonClick();
        this.socket.emit('playAgain');
        // Don't change button state immediately - wait for server confirmation
    }

    leaveGame() {
        console.log('Leaving game');
        this.sounds.buttonClick();
        this.disablePageRefreshWarning();
        this.socket.disconnect();
        this.resetToMainMenu();
    }

    leaveGameDuringPlay() {
        if (confirm('Are you sure you want to leave the game? Other players will be notified.')) {
            console.log('Leaving game during play');
            this.sounds.buttonClick();
            this.socket.emit('leaveGame');
            this.disablePageRefreshWarning();
            this.socket.disconnect();
            this.resetToMainMenu();
        }
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
        this.sounds.notification();
        this.socket.emit('startNewGame');
        this.hideGameOver();
        this.showLoading();
    }

    // Old playAgain method removed - now using voting system

    setupPageRefreshWarning() {
        // Create the beforeunload handler
        this.beforeUnloadHandler = (e) => {
            if (this.warningEnabled) {
                // Standard way to show warning
                e.preventDefault();
                // Modern browsers require returnValue to be set
                e.returnValue = '';
                // Return message (some browsers may ignore this)
                return 'Are you sure you want to leave? You will be disconnected from the game!';
            }
        };
    }

    enablePageRefreshWarning() {
        if (!this.warningEnabled) {
            this.warningEnabled = true;
            window.addEventListener('beforeunload', this.beforeUnloadHandler);
            console.log('Page refresh warning enabled');
        }
    }

    disablePageRefreshWarning() {
        if (this.warningEnabled) {
            this.warningEnabled = false;
            window.removeEventListener('beforeunload', this.beforeUnloadHandler);
            console.log('Page refresh warning disabled');
        }
    }

    resetToMainMenu() {
        this.hideGameOver();
        this.showMainMenu();
        this.gameState = null;
        this.playerHand = [];
        this.selectedCard = null;
        this.roomId = '';
        
        // Stop background music
        this.audioEnabled = false;
        setTimeout(() => { this.audioEnabled = true; }, 1000);
        
        // Disable warning when leaving game
        this.disablePageRefreshWarning();
        
        // Reconnect to allow creating/joining new games
        this.socket.disconnect();
        this.connectSocket();
    }
}

// Global function for paste room code button
function pasteRoomCode() {
    if (window.unoClient) {
        window.unoClient.pasteRoomCode();
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, creating UNO Client...');
    window.unoClient = new UnoClient();
});
