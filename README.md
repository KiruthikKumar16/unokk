# UNO Online 🎮

A real-time multiplayer UNO game that supports 2-10 players online. Built with Node.js, Express, Socket.IO, and vanilla JavaScript.

## Features

- 🎯 **Real-time Multiplayer**: Play with 2-10 friends online
- 🎨 **Beautiful UI**: Modern, responsive design with smooth animations
- 🎮 **Complete UNO Rules**: All standard UNO cards and rules implemented
- 🏠 **Room System**: Create or join game rooms with 6-digit codes
- 📱 **Mobile Friendly**: Responsive design works on all devices
- ⚡ **Real-time Sync**: Instant game state updates for all players

## Game Rules

- Each player starts with 7 cards
- Match cards by color, number, or action type
- Special action cards:
  - **Skip**: Skip the next player's turn
  - **Reverse**: Reverse the direction of play
  - **Draw 2**: Next player draws 2 cards and loses their turn
  - **Wild**: Change the color to any color you choose
  - **Wild Draw 4**: Change color and next player draws 4 cards

## Installation

1. **Clone or download this repository**
   ```bash
   git clone <repository-url>
   cd uno
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```
   
   For development (with auto-restart):
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

## How to Play

1. **Enter your name** on the main screen
2. **Create a room** or **join an existing room** with a 6-digit code
3. **Wait for players** (2-10 players required)
4. **Start the game** when everyone is ready
5. **Play cards** by clicking on them when it's your turn
6. **Draw cards** from the deck if you can't play
7. **Call UNO** when you have one card left!

## Technical Details

### Backend
- **Node.js** with Express.js server
- **Socket.IO** for real-time communication
- Complete UNO game logic implementation
- Room management system
- Player state synchronization

### Frontend
- **Vanilla JavaScript** (no frameworks)
- **CSS Grid/Flexbox** for responsive layout
- **Socket.IO Client** for real-time updates
- Beautiful card animations and transitions

### Game Logic Features
- Standard 108-card UNO deck
- Turn management with direction changes
- Card validation and rule enforcement
- Win condition detection
- Deck reshuffling when empty
- Support for all special cards

## Project Structure

```
uno/
├── server.js          # Main server file with game logic
├── package.json       # Node.js dependencies
├── public/
│   ├── index.html     # Main HTML file
│   ├── style.css      # Styles and responsive design
│   └── script.js      # Client-side JavaScript
└── README.md          # This file
```

## Customization

You can easily customize the game by modifying:

- **Colors and styling** in `public/style.css`
- **Game rules** in the `UnoGame` class in `server.js`
- **UI elements** in `public/index.html`
- **Client behavior** in `public/script.js`

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance

- Optimized for real-time gaming
- Efficient Socket.IO event handling
- Minimal bandwidth usage
- Smooth animations at 60fps

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT License - feel free to use this project for learning or building your own games.

---

**Have fun playing UNO with your friends! 🎉**
