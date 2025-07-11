const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
require('dotenv').config();

// Import configurations and middleware
const { port } = require('./config/app');
const connectDB = require('./config/database');
const { errorHandler } = require('./middleware/errorMiddleware');
const { requestLogger } = require('./middleware/loggingMiddleware');
const { isAuthorized } = require('./middleware/authMiddleware');

// Import routes and websocket server
const routes = require('./routes');
const setupWebSocketServer = require('./websocketServer');

// Initialize express app
const app = express();

// Create HTTP server
const server = http.createServer(app);

// Setup WebSocket server
setupWebSocketServer(server);

// Apply middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Serve static files from frontend public directory
app.use(express.static(path.join(__dirname, '../frontend/build')));

// Connect to MongoDB
connectDB();


// Apply routes
app.use('/api', routes);

// Regex-based catch-all: serve index.html for React Router (SPA support), skip static files and API
app.get(/^\/(?!api).*(?<!\..*)$/, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

// Apply error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5001; // changed from 5000 to 5001

// Start the server
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));