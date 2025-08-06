const { broadcastToNodeMCU, getWebSocketStats, broadcastToWeb } = require('../../services/webSocketService');
const GameSessionService = require('../../services/gameSessionService');

// Start game command
const startGame = async (req, res) => {
  try {
    const { gameMode, duration, targetCount } = req.body;
    
    const gameStartCommand = {
      type: 'game_start',
      gameMode: gameMode || 'normal',
      duration: duration || 60,
      targetCount: targetCount || 10,
      timestamp: Date.now()
    };
    
    // Send command to NodeMCU
    const sent = broadcastToNodeMCU(gameStartCommand);
    
    if (sent) {
      res.json({
        success: true,
        message: 'Game start command sent to device',
        command: gameStartCommand
      });
    } else {
      res.status(503).json({
        success: false,
        message: 'No NodeMCU devices connected',
        stats: getWebSocketStats()
      });
    }
  } catch (error) {
    console.error('Error starting game:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Stop game command
const stopGame = async (req, res) => {
  try { 
    const gameStopCommand = {
      type: 'game_stop',
      timestamp: Date.now()
    };
    
    // Send command to NodeMCU
    const sent = broadcastToNodeMCU(gameStopCommand);
    
    if (sent) {
      res.json({
        success: true,
        message: 'Game stop command sent to device',
        command: gameStopCommand
      });
    } else {
      res.status(503).json({
        success: false,
        message: 'No NodeMCU devices connected',
        stats: getWebSocketStats()
      });
    }
  } catch (error) {
    console.error('Error stopping game:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Reset game command
const resetGame = async (req, res) => {
  try {
    const gameResetCommand = {
      type: 'game_reset',
      timestamp: Date.now()
    };
    
    // Send command to NodeMCU
    const sent = broadcastToNodeMCU(gameResetCommand);
    
    if (sent) {
      res.json({
        success: true,
        message: 'Game reset command sent to device',
        command: gameResetCommand
      });
    } else {
      res.status(503).json({
        success: false,
        message: 'No NodeMCU devices connected',
        stats: getWebSocketStats()
      });
    }
  } catch (error) {
    console.error('Error resetting game:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Send custom command
const sendCommand = async (req, res) => {
  try {
    const { command, data } = req.body;
    
    if (!command) {
      return res.status(400).json({
        success: false,
        message: 'Command is required'
      });
    }
    
    const customCommand = {
      type: 'custom_command',
      command: command,
      data: data || {},
      timestamp: Date.now()
    };
    
    // Send command to NodeMCU
    const sent = broadcastToNodeMCU(customCommand);
    
    if (sent) {
      res.json({
        success: true,
        message: 'Custom command sent to device',
        command: customCommand
      });
    } else {
      res.status(503).json({
        success: false,
        message: 'No NodeMCU devices connected',
        stats: getWebSocketStats()
      });
    }
  } catch (error) {
    console.error('Error sending custom command:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Test WebSocket connection
const testConnection = async (req, res) => {
  try {
    const testMessage = {
      type: 'test_message',
      message: 'Hello from backend API!',
      timestamp: Date.now()
    };
    
    const sent = broadcastToNodeMCU(testMessage);
    const stats = getWebSocketStats();
    
    res.json({
      success: true,
      message: 'Test message sent',
      messageSent: sent,
      stats: stats,
      testMessage: testMessage
    });
  } catch (error) {
    console.error('Error testing connection:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get connection status
const getStatus = async (req, res) => {
  try {
    const stats = getWebSocketStats();
    
    res.json({
      success: true,
      message: 'WebSocket status retrieved',
      stats: stats,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error getting status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Game Session Management

// Create new game session
const createGameSession = async (req, res) => {
  try {
    const { playerName, gameMode, gameSettings } = req.body;
    
    if (!playerName) {
      return res.status(400).json({
        success: false,
        message: 'Player name is required'
      });
    }
    
    const session = await GameSessionService.createSession(playerName, gameMode, gameSettings);
    
    // Broadcast session creation to web clients
    broadcastToWeb({
      type: 'session_created',
      sessionId: session.sessionId,
      playerName: session.playerName,
      gameMode: session.gameMode,
      timestamp: Date.now()
    });
    
    res.json({
      success: true,
      message: 'Game session created successfully',
      session: {
        sessionId: session.sessionId,
        playerName: session.playerName,
        gameMode: session.gameMode,
        gameSettings: session.gameSettings
      }
    });
  } catch (error) {
    console.error('Error creating game session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create game session',
      error: error.message
    });
  }
};

// Register hit in session
const registerHit = async (req, res) => {
  try {
    const { sessionId, hitData } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }
    
    const result = await GameSessionService.registerHit(sessionId, hitData || {});
    
    // Broadcast hit to all web clients
    broadcastToWeb({
      type: 'hit_scored',
      sessionId: result.sessionId,
      currentScore: result.currentScore,
      hitCount: result.hitCount,
      accuracy: result.accuracy,
      hit: result.hit,
      timestamp: Date.now()
    });
    
    res.json({
      success: true,
      message: 'Hit registered successfully',
      result: result
    });
  } catch (error) {
    console.error('Error registering hit:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register hit',
      error: error.message
    });
  }
};

// Register miss in session
const registerMiss = async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }
    
    const result = await GameSessionService.registerMiss(sessionId);
    
    // Broadcast miss to all web clients
    broadcastToWeb({
      type: 'miss_registered',
      sessionId: result.sessionId,
      missCount: result.missCount,
      accuracy: result.accuracy,
      timestamp: Date.now()
    });
    
    res.json({
      success: true,
      message: 'Miss registered successfully',
      result: result
    });
  } catch (error) {
    console.error('Error registering miss:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register miss',
      error: error.message
    });
  }
};

// End game session
const endGameSession = async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }
    
    const result = await GameSessionService.endSession(sessionId);
    
    // Broadcast session end to all web clients
    broadcastToWeb({
      type: 'session_ended',
      sessionId: result.sessionId,
      playerName: result.playerName,
      finalScore: result.finalScore,
      hitCount: result.hitCount,
      missCount: result.missCount,
      accuracy: result.accuracy,
      duration: result.duration,
      timestamp: Date.now()
    });
    
    res.json({
      success: true,
      message: 'Game session ended successfully',
      result: result
    });
  } catch (error) {
    console.error('Error ending game session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to end game session',
      error: error.message
    });
  }
};

// Get session statistics
const getSessionStats = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }
    
    const stats = await GameSessionService.getSessionStats(sessionId);
    
    res.json({
      success: true,
      message: 'Session statistics retrieved successfully',
      stats: stats
    });
  } catch (error) {
    console.error('Error getting session stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get session statistics',
      error: error.message
    });
  }
};

// Get leaderboard
const getLeaderboard = async (req, res) => {
  try {
    const { gameMode = 'easy', limit = 10 } = req.query;
    
    const leaderboard = await GameSessionService.getLeaderboard(gameMode, parseInt(limit));
    
    res.json({
      success: true,
      message: 'Leaderboard retrieved successfully',
      leaderboard: leaderboard,
      gameMode: gameMode
    });
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get leaderboard',
      error: error.message
    });
  }
};

// Set game mode command - Configure motors but don't start them
const setGameMode = async (req, res) => {
  try {
    const { gameMode, motorSettings } = req.body;
    
    // Define motor settings for each game mode
    const gameModeSettings = {
      easy: {
        motorSpeed: 30,     // Slow speed
        pattern: 'linear',  // Simple linear movement
        acceleration: 10,   // Low acceleration
        targetSpeed: 1500   // Target movement interval
      },
      medium: {
        motorSpeed: 50,     // Medium speed
        pattern: 'wave',    // Wave pattern movement
        acceleration: 20,   // Medium acceleration
        targetSpeed: 1200   // Target movement interval
      },
      hard: {
        motorSpeed: 80,     // High speed
        pattern: 'random',  // Random movement pattern
        acceleration: 30,   // High acceleration
        targetSpeed: 800    // Target movement interval
      }
    };
    
    const selectedSettings = gameModeSettings[gameMode] || gameModeSettings.easy;
    
    const gameModeCommand = {
      type: 'set_game_mode',
      gameMode: gameMode || 'medium',
      motorSettings: motorSettings || selectedSettings,
      motorEnabled: false, // Motors configured but not started
      timestamp: Date.now()
    };
    
    // Send command to NodeMCU
    const sent = broadcastToNodeMCU(gameModeCommand);
    
    // Also broadcast to web clients for confirmation
    broadcastToWeb({
      type: 'game_mode_set',
      gameMode: gameMode,
      motorSettings: selectedSettings,
      timestamp: Date.now()
    });
    
    if (sent) {
      res.json({
        success: true,
        message: `Game mode '${gameMode}' configured on device`,
        gameMode: gameMode,
        motorSettings: selectedSettings,
        command: gameModeCommand
      });
    } else {
      res.status(503).json({
        success: false,
        message: 'No NodeMCU devices connected',
        stats: getWebSocketStats()
      });
    }
  } catch (error) {
    console.error('Error setting game mode:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Enable motors - Start motor movement
const enableMotors = async (req, res) => {
  try {
    console.log('enableMotors req.body:', req.body);
    const { gameMode } = req.body;
    let enabledAxes = ['x'];
    let movement = 'linear';
    let selectedGameMode = gameMode || 'medium';
    if (selectedGameMode === 'medium') {
      enabledAxes = ['x', 'y'];
      movement = 'wave';
    } else if (selectedGameMode === 'hard') {
      enabledAxes = ['x', 'y'];
      movement = 'random';
    }

    const motorEnableCommand = {
      type: 'enable_motors',
      gameMode: selectedGameMode,
      motorEnabled: true,
      enabledAxes,
      movement,
      timestamp: Date.now()
    };

    // Send command to NodeMCU
    const sent = broadcastToNodeMCU(motorEnableCommand);

    // Also broadcast to web clients
    broadcastToWeb({
      type: 'motors_enabled',
      gameMode: selectedGameMode,
      enabledAxes,
      movement,
      timestamp: Date.now()
    });

    if (sent) {
      res.json({
        success: true,
        message: 'Motors enabled and started',
        command: motorEnableCommand
      });
    } else {
      res.status(503).json({
        success: false,
        message: 'No NodeMCU devices connected',
        stats: getWebSocketStats()
      });
    }
  } catch (error) {
    console.error('Error enabling motors:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Disable motors - Stop motor movement
const disableMotors = async (req, res) => {
  try {
    const motorDisableCommand = {
      type: 'disable_motors',
      motorEnabled: false,
      timestamp: Date.now()
    };
    
    // Send command to NodeMCU
    const sent = broadcastToNodeMCU(motorDisableCommand);
    
    // Also broadcast to web clients
    broadcastToWeb({
      type: 'motors_disabled',
      timestamp: Date.now()
    });
    
    if (sent) {
      res.json({
        success: true,
        message: 'Motors disabled and stopped',
        command: motorDisableCommand
      });
    } else {
      res.status(503).json({
        success: false,
        message: 'No NodeMCU devices connected',
        stats: getWebSocketStats()
      });
    }
  } catch (error) {
    console.error('Error disabling motors:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};


const pauseGame = async (req, res) => {
  try {
    const gamePauseCommand = {
      type: 'pause_game',
      timestamp: Date.now()
    };
    
    // Send command to NodeMCU
    const sent = broadcastToNodeMCU(gamePauseCommand);
    
    // Also broadcast to web clients
    broadcastToWeb({
      type: 'game_paused',
      timestamp: Date.now()
    });
    
    if (sent) {
      res.json({
        success: true,
        message: 'Game paused',
        command: gamePauseCommand
      });
    } else {
      res.status(503).json({
        success: false,
        message: 'No NodeMCU devices connected',
        stats: getWebSocketStats()
      });
    }
  } catch (error) {
    console.error('Error pausing game:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};


module.exports = {
  startGame,
  stopGame,
  resetGame,
  sendCommand,
  testConnection,
  getStatus,
  createGameSession,
  registerHit,
  registerMiss,
  endGameSession,
  getSessionStats,
  getLeaderboard,
  setGameMode,
  enableMotors,
  disableMotors,
  pauseGame
};
