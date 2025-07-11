const express = require('express');
const router = express.Router();
const scoreController = require('../../controllers/game/scoreController');


// Score routes
router.post('/scores', scoreController.saveScore);
router.get('/scores/top/:gameMode', scoreController.getTopScores);
router.get('/scores/user/:userId/:gameMode', scoreController.getUserBestScore);
router.get('/user/:userId', scoreController.getAllScoresForUser);
// Compatibility route for /scores/user/:userId
router.get('/scores/user/:userId', scoreController.getAllScoresForUser);

// Leaderboard route for frontend compatibility
router.get('/leaderboard', scoreController.getLeaderboard);

// Add compatibility route for /scores/leaderboard
router.get('/scores/leaderboard', scoreController.getLeaderboard);
module.exports = router;
