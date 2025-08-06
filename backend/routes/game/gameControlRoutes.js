const express = require('express');
const router = express.Router();
const gameControlController = require('../../controllers/game/gameControlController');

// Game control routes
router.post('/start', gameControlController.startGame);
router.post('/stop', gameControlController.stopGame);
router.post('/pause', gameControlController.pauseGame);
router.post('/resume', gameControlController.resumeGame);
router.post('/reset', gameControlController.resetGame);
router.post('/command', gameControlController.sendCommand);

// Motor control routes
router.post('/mode/set', gameControlController.setGameMode);
router.post('/motors/enable', gameControlController.enableMotors);
router.post('/motors/disable', gameControlController.disableMotors);

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

// Arduino command test endpoints
router.post('/test/arduino/:command', gameControlController.testArduinoCommands);

// Manual test routes for debugging
router.post('/test/mode/:gameMode', (req, res) => {
  const { gameMode } = req.params;
  console.log(`🧪 Manual test: Setting game mode to ${gameMode}`);
  
  // Call the actual setGameMode function
  const mockReq = {
    body: {
      gameMode: gameMode,
      motorSettings: null
    }
  };
  
  gameControlController.setGameMode(mockReq, res);
});

router.post('/test/motors/:action', (req, res) => {
  const { action } = req.params;
  console.log(`🧪 Manual test: Motor action ${action}`);
  
  const mockReq = {
    body: {
      gameMode: 'easy'
    }
  };
  
  if (action === 'enable') {
    gameControlController.enableMotors(mockReq, res);
  } else if (action === 'disable') {
    gameControlController.disableMotors(mockReq, res);
  } else {
    res.status(400).json({ success: false, message: 'Invalid action. Use enable or disable' });
  }
});

module.exports = router;
