<<<<<<< HEAD
# Smart Shooting Gallery

A web-based interactive shooting gallery with physical targets that connect to the web application via ESP8266/NodeMCU and WebSockets.

## Project Structure

```
smart-shooting-gallery/
│
├── backend/                 # Node.js server
│   ├── config/              # Server configuration
│   ├── controllers/         # API request handlers
│   ├── middleware/          # Express middleware
│   ├── models/              # Database models
│   ├── routes/              # API routes
│   ├── services/            # Business logic
│   ├── utils/               # Helper functions
│   ├── test/                # Test scripts
│   ├── index.js             # Server entry point
│   ├── websocketServer.js   # WebSocket server
│   └── package.json         # Node.js dependencies
│
├── frontend/                # React application
│   ├── public/              # Static assets
│   ├── src/                 # React source code
│   │   ├── assets/          # Images, fonts, etc.
│   │   ├── components/      # Reusable components
│   │   ├── contexts/        # React contexts
│   │   ├── hooks/           # Custom React hooks
│   │   ├── pages/           # Page components
│   │   ├── services/        # API service
│   │   ├── styles/          # Global styles
│   │   └── utils/           # Helper functions
│   └── package.json         # React dependencies
│
└── esp8266/                 # Hardware code
    ├── Arduino_Mega/        # Arduino Mega code
    ├── NodeMCU_Bridge/      # ESP8266/NodeMCU code
    └── README.md            # Hardware setup guide
```

## Getting Started

### Prerequisites

- Node.js v14+ and npm
- MongoDB (local or Atlas)
- Arduino IDE
- ESP8266/NodeMCU board
- Arduino Mega board
- Electronic components (see hardware setup)

### Installation

#### Backend Setup

1. Install backend dependencies:
   ```
   cd backend
   npm install
   ```

2. Create a `.env` file with the following variables:
   ```
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   ```

3. Start the server:
   ```
   npm run dev
   ```

#### Frontend Setup

1. Install frontend dependencies:
   ```
   cd frontend
   npm install
   ```

2. Start the development server:
   ```
   npm start
   ```

#### Hardware Setup

1. See `esp8266/README.md` for detailed hardware setup instructions.

## Features

- Real-time target hit detection with WebSocket communication
- User registration and authentication
- Multiple game modes with different difficulty levels
- Score tracking and leaderboards
- Player progress statistics
- Physical hardware integration

## Technologies

- **Frontend**: React, styled-components
- **Backend**: Node.js, Express, MongoDB, WebSockets
- **Hardware**: Arduino, ESP8266/NodeMCU, sensors

## Testing

### Backend Tests

```
cd backend
npm test
```

### Frontend Tests

```
cd frontend
npm test
```

### WebSocket Testing

Use the WebSocket tester at `/websocket-tester.html` to debug connections and messages.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Arduino and ESP8266 communities
- React and Node.js communities
=======
# Smart-Shooting-Gallery-2
>>>>>>> 58389c4625664bdbdac92be048953c14ef22b946
