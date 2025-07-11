const GameSession = require('../models/game/GameSession');
const Score = require('../models/game/Score');
const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');

class GameSessionService {
  // Create a new game session
  static async createSession(playerName, gameMode = 'easy', gameSettings = {}) {
    try {
      const sessionId = uuidv4();
      
      const session = new GameSession({
        sessionId,
        playerName,
        gameMode,
        gameSettings: {
          duration: gameSettings.duration || 60,
          targetCount: gameSettings.targetCount || 10,
          pointsPerHit: gameSettings.pointsPerHit || 10
        }
      });
      
      await session.save();
      console.log(`New game session created: ${sessionId} for player: ${playerName}`);
      
      return session;
    } catch (error) {
      console.error('Error creating game session:', error);
      throw error;
    }
  }
  
  // Get active session by session ID
  static async getActiveSession(sessionId) {
    try {
      return await GameSession.findOne({ sessionId, isActive: true });
    } catch (error) {
      console.error('Error getting active session:', error);
      throw error;
    }
  }
  
  // Register a hit in the session
  static async registerHit(sessionId, hitData) {
    try {
      const session = await GameSession.findOne({ sessionId, isActive: true });
      
      if (!session) {
        throw new Error('Active session not found');
      }
      
      await session.addHit(hitData);
      
      console.log(`Hit registered for session ${sessionId}: ${hitData.points} points`);
      
      return {
        sessionId,
        currentScore: session.currentScore,
        hitCount: session.hitCount,
        accuracy: session.accuracy,
        hit: hitData
      };
    } catch (error) {
      console.error('Error registering hit:', error);
      throw error;
    }
  }
  
  // Register a miss in the session
  static async registerMiss(sessionId) {
    try {
      const session = await GameSession.findOne({ sessionId, isActive: true });
      
      if (!session) {
        throw new Error('Active session not found');
      }
      
      await session.addMiss();
      
      console.log(`Miss registered for session ${sessionId}`);
      
      return {
        sessionId,
        currentScore: session.currentScore,
        missCount: session.missCount,
        accuracy: session.accuracy
      };
    } catch (error) {
      console.error('Error registering miss:', error);
      throw error;
    }
  }
  
  // End a game session and save final score
  static async endSession(sessionId) {
    try {
      const session = await GameSession.findOne({ sessionId, isActive: true });
      
      if (!session) {
        throw new Error('Active session not found');
      }
      
      await session.endSession();
      
      // Try to find or create user
      let user = await User.findOne({ username: session.playerName });
      if (!user) {
        user = new User({
          username: session.playerName,
          email: `${session.playerName}@temp.com` // Temporary email
        });
        await user.save();
      }
      
      // Calculate final game statistics
      const gameDuration = Math.floor((session.endTime - session.startTime) / 1000);
      
      // Save final score
      const finalScore = new Score({
        user: user._id,
        score: session.currentScore,
        accuracy: session.accuracy,
        gameMode: session.gameMode,
        timePlayed: gameDuration
      });
      
      await finalScore.save();
      
      console.log(`Game session ended: ${sessionId}, Final score: ${session.currentScore}`);
      
      return {
        sessionId,
        playerName: session.playerName,
        finalScore: session.currentScore,
        hitCount: session.hitCount,
        missCount: session.missCount,
        accuracy: session.accuracy,
        duration: gameDuration,
        savedScore: finalScore
      };
    } catch (error) {
      console.error('Error ending session:', error);
      throw error;
    }
  }
  
  // Get session statistics
  static async getSessionStats(sessionId) {
    try {
      const session = await GameSession.findOne({ sessionId });
      
      if (!session) {
        throw new Error('Session not found');
      }
      
      return {
        sessionId,
        playerName: session.playerName,
        gameMode: session.gameMode,
        currentScore: session.currentScore,
        hitCount: session.hitCount,
        missCount: session.missCount,
        accuracy: session.accuracy,
        isActive: session.isActive,
        startTime: session.startTime,
        endTime: session.endTime,
        hits: session.hits
      };
    } catch (error) {
      console.error('Error getting session stats:', error);
      throw error;
    }
  }
  
  // Get leaderboard
  static async getLeaderboard(gameMode = 'easy', limit = 10) {
    try {
      const scores = await Score.find({ gameMode })
        .populate('user', 'username')
        .sort({ score: -1 })
        .limit(limit);
      
      return scores.map(score => ({
        username: score.user.username,
        score: score.score,
        accuracy: score.accuracy,
        timePlayed: score.timePlayed,
        createdAt: score.createdAt
      }));
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      throw error;
    }
  }
}

module.exports = GameSessionService;
