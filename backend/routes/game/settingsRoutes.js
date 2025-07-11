const express = require('express');
const router = express.Router();
const settingsController = require('../../controllers/game/settingsController');

// Game settings routes
router.get('/', settingsController.getAllGameSettings);
router.get('/:mode', settingsController.getGameSettings);
router.post('/', settingsController.upsertGameSettings);

module.exports = router;
