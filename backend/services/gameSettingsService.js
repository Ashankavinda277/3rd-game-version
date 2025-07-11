// Game settings service
const GameSettings = require('../models/game/GameSettings');

/**
 * Get game settings for a specific mode
 * @param {string} mode - Game mode (easy, medium, hard)
 * @returns {Object} Game settings
 */
const getGameSettings = async (mode) => {
  try {
    const settings = await GameSettings.findOne({ mode, isActive: true });
    return settings;
  } catch (error) {
    throw error;
  }
};

/**
 * Get all available game settings
 * @returns {Array} List of all game settings
 */
const getAllGameSettings = async () => {
  try {
    const settings = await GameSettings.find({ isActive: true });
    return settings;
  } catch (error) {
    throw error;
  }
};

/**
 * Create or update game settings
 * @param {Object} settingsData - Settings data
 * @returns {Object} Created or updated settings
 */
const upsertGameSettings = async (settingsData) => {
  try {
    const settings = await GameSettings.findOneAndUpdate(
      { mode: settingsData.mode },
      settingsData,
      { new: true, upsert: true }
    );
    return settings;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  getGameSettings,
  getAllGameSettings,
  upsertGameSettings
};
