# Smart Shooting Gallery - Development Guide

This guide provides detailed information for developers working on the Smart Shooting Gallery project.

## Development Setup

### Prerequisites

- Node.js v14+ and npm
- MongoDB (local or Atlas)
- Arduino IDE with ESP8266 board support
- Arduino Mega and NodeMCU hardware (for testing with physical components)

### Getting Started

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/smart-shooting-gallery.git
   cd smart-shooting-gallery
   ```

2. Run the setup script:
   ```
   npm run setup
   ```

3. Start the development servers:
   ```
   npm run dev
   ```

This will start both the backend (port 5000) and frontend (port 3000) development servers.

## Project Structure

### Backend Structure

```
backend/
├── config/           # Configuration files
├── controllers/      # API request handlers
├── middleware/       # Express middleware
├── models/           # Database models
├── routes/           # API routes
├── services/         # Business logic
├── utils/            # Utility functions
├── test/             # Test files
├── index.js          # Entry point
└── websocketServer.js # WebSocket server
```

### Frontend Structure

```
frontend/
├── public/           # Static files
└── src/
    ├── assets/       # Images, fonts, etc.
    ├── components/   # React components
    ├── contexts/     # React contexts
    ├── hooks/        # Custom React hooks
    ├── pages/        # Page components
    ├── services/     # API services
    ├── styles/       # CSS styles
    └── utils/        # Utility functions
```

## API Documentation

### Authentication

#### Register a new user
```
POST /api/users/register
Body: { username, password, email }
```

#### Login
```
POST /api/users/login
Body: { username, password }
Response: { token, user }
```

### Scores

#### Get all scores
```
GET /api/scores
Query params: { limit, skip, sort, mode }
Authorization: Bearer token
```

#### Save a new score
```
POST /api/scores
Body: { score, mode, duration, targets }
Authorization: Bearer token
```

#### Get leaderboard
```
GET /api/scores/leaderboard
Query params: { limit, mode }
```

### Game Settings

#### Get all game settings
```
GET /api/settings
```

#### Get settings for a specific mode
```
GET /api/settings/:mode
```

## WebSocket Integration

### Connection

The WebSocket server runs on the same port as the HTTP server (5000).

```javascript
const socket = new WebSocket(`ws://${window.location.hostname}:5000`);

// Or for secure connections:
const socket = new WebSocket(`wss://${window.location.hostname}`);
```

### Client Identification

Upon connection, clients should identify themselves:

```javascript
socket.send(JSON.stringify({
  type: 'identify',
  clientType: 'web' // or 'nodeMCU' for hardware
}));
```

### Message Handling

```javascript
socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch(data.type) {
    case 'target_hit':
      // Handle target hit event
      break;
    case 'game_update':
      // Handle game update event
      break;
    // ...other message types
  }
};
```

## Testing

### Backend Testing

```
cd backend
npm test
```

### Frontend Testing

```
cd frontend
npm test
```

### WebSocket Testing

Use the WebSocket tester available at:
```
http://localhost:3000/websocket-tester.html
```

## Hardware Testing

For testing without physical hardware:

1. Use the WebSocket tester to simulate target hits
2. Run the NodeMCU code in the Arduino IDE with serial monitor
3. Use the WebSocket test script:
   ```
   cd backend
   node test/websocket-test.js
   ```

## Common Issues

### WebSocket Connection Issues

- Ensure backend server is running
- Check browser console for errors
- Verify correct WebSocket URL
- Check if port 5000 is open and not blocked by firewall

### MongoDB Connection Issues

- Check MongoDB connection string in `.env`
- Ensure MongoDB service is running
- Verify network permissions

### ESP8266/NodeMCU Issues

- Verify WiFi credentials
- Check server IP address configuration
- Monitor serial output for errors
- Verify proper baud rate for serial communication
