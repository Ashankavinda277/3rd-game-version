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

// Create HTTP server with increased header size limit
const server = http.createServer({
  maxHeaderSize: 16384, // 16KB (default is 8KB)
  requestTimeout: 30000, // 30 seconds
}, app);

// Setup WebSocket server
setupWebSocketServer(server);

// Apply middleware
const allowedOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : ['http://localhost:3000'];

console.log('🌐 Allowed CORS origins:', allowedOrigins);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  maxHeaderSize: 16384 // 16KB limit
}));
app.use(express.json({ limit: '10mb' })); // Increase JSON payload limit
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Handle URL-encoded data
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