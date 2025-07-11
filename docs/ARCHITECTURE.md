# Smart Shooting Gallery - System Architecture

This document provides an overview of the system architecture for the Smart Shooting Gallery project.

## Architecture Overview

![System Architecture](./images/system-architecture.png)

The Smart Shooting Gallery uses a multi-tier architecture:

1. **Hardware Layer**:
   - Arduino Mega: Controls physical targets and sensors
   - NodeMCU (ESP8266): Provides WiFi connectivity and WebSocket communication

2. **Backend Layer**:
   - Node.js server with Express
   - WebSocket server for real-time communication
   - MongoDB database for persistent storage

3. **Frontend Layer**:
   - React web application
   - WebSocket client for real-time updates

## Communication Flow

1. **Sensor Data Flow**:
   - Target hit detected by Arduino Mega
   - Data sent via Serial to NodeMCU
   - NodeMCU sends data via WebSocket to backend server
   - Backend broadcasts to connected web clients
   - Frontend updates UI in real-time

2. **Control Flow**:
   - User interactions in the frontend
   - Commands sent to backend via HTTP API or WebSocket
   - Backend forwards relevant commands to NodeMCU
   - NodeMCU forwards commands to Arduino Mega
   - Arduino Mega executes commands on physical hardware

## Data Models

### User

```json
{
  "_id": "ObjectId",
  "username": "String",
  "password": "String (hashed)",
  "email": "String",
  "createdAt": "Date",
  "lastLogin": "Date"
}
```

### Score

```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "score": "Number",
  "gameMode": "String",
  "duration": "Number",
  "date": "Date",
  "targets": [
    {
      "targetId": "Number",
      "hits": "Number",
      "misses": "Number"
    }
  ]
}
```

### GameSettings

```json
{
  "_id": "ObjectId",
  "mode": "String",
  "targetDuration": "Number",
  "targetDelay": "Number",
  "gameDuration": "Number",
  "difficulty": "Number"
}
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/users/register` | POST | Register a new user |
| `/api/users/login` | POST | Login a user |
| `/api/users/:id` | GET | Get user profile |
| `/api/scores` | POST | Save a new score |
| `/api/scores` | GET | Get all scores (with filters) |
| `/api/scores/leaderboard` | GET | Get leaderboard |
| `/api/scores/user/:userId` | GET | Get scores for a user |
| `/api/settings` | GET | Get game settings |
| `/api/settings/:mode` | GET | Get settings for specific mode |

## WebSocket Messages

### Client to Server

```json
{
  "type": "identify",
  "clientType": "web|nodeMCU",
  "deviceId": "optional-device-id"
}
```

```json
{
  "type": "start_game",
  "mode": "easy|medium|hard",
  "forwardToMega": true
}
```

### Server to Client

```json
{
  "type": "target_hit",
  "targetId": 2,
  "timestamp": 1234567890,
  "score": 5
}
```

```json
{
  "type": "game_update",
  "score": 25,
  "elapsedTime": 35000,
  "remainingTime": 25000
}
```

## Security Considerations

1. **Authentication**: JWT-based auth for API endpoints
2. **WebSocket Security**: Client identification and validation
3. **Input Validation**: Sanitize all user inputs
4. **Rate Limiting**: Prevent abuse of API endpoints

## Deployment Architecture

For production deployment, the system uses:

1. **Backend**: Node.js server deployed on a cloud platform (e.g., Heroku, AWS)
2. **Frontend**: Static assets served from CDN
3. **Database**: MongoDB Atlas cloud database
4. **WebSockets**: Secured with WSS (WebSocket Secure)
