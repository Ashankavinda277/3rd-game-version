const express = require('express');
const router = express.Router();

// Import all route modules
const userRoutes = require('./userRoutes');
const scoreRoutes = require('./game/scoreRoutes');
const settingsRoutes = require('./game/settingsRoutes');
const gameControlRoutes = require('./game/gameControlRoutes');

// Apply routes
router.use('/users', userRoutes);
router.use('/game', scoreRoutes); // This will make /api/game/scores POST work
router.use('/game/settings', settingsRoutes);
router.use('/game/control', gameControlRoutes);
router.use('/game/hit', require('./hitroutes'));
module.exports = router;
