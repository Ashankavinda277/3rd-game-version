const express = require('express');
const router = express.Router();
const gameControlController = require('../../controllers/game/gameControlController');

// Game control routes
router.post('/start', gameControlController.startGame);
router.post('/stop', gameControlController.stopGame);
router.post('/reset', gameControlController.resetGame);
router.post('/command', gameControlController.sendCommand);

// Game session routes
router.post('/session/create', gameControlController.createGameSession);
router.post('/session/hit', gameControlController.registerHit);
router.post('/session/miss', gameControlController.registerMiss);
router.post('/session/end', gameControlController.endGameSession);
router.get('/session/:sessionId/stats', gameControlController.getSessionStats);
router.get('/leaderboard', gameControlController.getLeaderboard);

// Test endpoint for WebSocket communication
router.get('/test', gameControlController.testConnection);
router.get('/status', gameControlController.getStatus);

module.exports = router;
