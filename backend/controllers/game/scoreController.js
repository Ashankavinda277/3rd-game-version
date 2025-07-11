// Game controller for handling game-related requests
const gameService = require('../../services/gameService');
const { successResponse, errorResponse } = require('../../utils/responseUtil');

/**
 * Save a new game score
 * @route POST /api/game/scores
 */
exports.saveScore = async (req, res) => {
  console.log('Score submission received:', req.body);
  const { user, score, accuracy, gameMode, timePlayed } = req.body;
  try {
    // Debug log to verify score save request
    console.log('Attempting to save score:', { user, score, accuracy, gameMode, timePlayed });
    const savedScore = await gameService.saveScore({
      user,
      score,
      accuracy,
      gameMode,
      timePlayed
    });
    console.log('Score saved:', savedScore);
    return successResponse(
      res, 
      201, 
      'Score saved successfully', 
      { score: savedScore }
    );
  } catch (err) {
    console.error('Error saving score:', err);
    return errorResponse(res, 400, err.message);
  }
}

/**
 * Get top scores for a specific game mode
 * @route GET /api/game/scores/top/:gameMode
 */
exports.getTopScores = async (req, res) => {
  const { gameMode } = req.params;
  const limit = req.query.limit ? parseInt(req.query.limit) : 10;
  
  try {
    const scores = await gameService.getTopScores(gameMode, limit);
    return successResponse(
      res, 
      200, 
      'Top scores retrieved successfully', 
      { scores }
    );
  } catch (err) {
    return errorResponse(res, 400, err.message);
  }
};

/**
 * Get a user's personal best score
 * @route GET /api/game/scores/user/:userId/:gameMode
 */
exports.getUserBestScore = async (req, res) => {
  const { userId, gameMode } = req.params;
  
  try {
    const bestScore = await gameService.getUserBestScore(userId, gameMode);
    
    if (!bestScore) {
      return successResponse(
        res, 
        200, 
        'No scores found for this user and game mode', 
        { bestScore: null }
      );
    }
    
    return successResponse(
      res, 
      200, 
      'Best score retrieved successfully', 
      { bestScore }
    );
  } catch (err) {
    return errorResponse(res, 400, err.message);
  }
};
/**
 * Get all scores for a user
 * @route GET /api/game/scores/user/:userId
 */
exports.getAllScoresForUser = async (req, res) => {
  const { userId } = req.params;
  try {
    const Score = require('../../models/game/Score');
    const scores = await Score.find({ user: userId }).sort({ createdAt: -1 });
    return successResponse(res, 200, 'User scores retrieved successfully', { scores });
  } catch (err) {
    return errorResponse(res, 400, err.message);
  }
};
/**
 * Get leaderboard for all or specific mode
 * @route GET /api/game/scores/leaderboard?mode=all|easy|medium|hard
 */
exports.getLeaderboard = async (req, res) => {
  const mode = req.query.mode || 'all';
  const limit = req.query.limit ? parseInt(req.query.limit) : 10;
  try {
    const Score = require('../../models/game/Score');
    let match = {};
    if (mode !== 'all') {
      match.gameMode = mode;
    }
    // Aggregate: group by user, get highest score per user (optionally per mode)
    const pipeline = [
      { $match: match },
      { $sort: { score: -1 } },
      {
        $group: {
          _id: '$user',
          scoreId: { $first: '$_id' },
          score: { $first: '$score' },
          accuracy: { $first: '$accuracy' },
          gameMode: { $first: '$gameMode' },
          timePlayed: { $first: '$timePlayed' },
          createdAt: { $first: '$createdAt' },
          updatedAt: { $first: '$updatedAt' }
        }
      },
      { $sort: { score: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' }
    ];
    const scores = await Score.aggregate(pipeline);
    console.log('Leaderboard scores:', scores);
    return successResponse(res, 200, 'Leaderboard retrieved successfully', { scores });
  } catch (err) {
    return errorResponse(res, 400, err.message);
  }
};
