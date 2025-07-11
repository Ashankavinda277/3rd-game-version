// Game settings controller
const gameSettingsService = require('../../services/gameSettingsService');
const { successResponse, errorResponse } = require('../../utils/responseUtil');

/**
 * Get game settings for a specific mode
 * @route GET /api/game/settings/:mode
 */
exports.getGameSettings = async (req, res) => {
  const { mode } = req.params;
  
  try {
    const settings = await gameSettingsService.getGameSettings(mode);
    
    if (!settings) {
      return errorResponse(res, 404, `Settings not found for mode: ${mode}`);
    }
    
    return successResponse(
      res, 
      200, 
      'Game settings retrieved successfully', 
      { settings }
    );
  } catch (err) {
    return errorResponse(res, 400, err.message);
  }
};

/**
 * Get all available game settings
 * @route GET /api/game/settings
 */
exports.getAllGameSettings = async (req, res) => {
  try {
    const settings = await gameSettingsService.getAllGameSettings();
    return successResponse(
      res, 
      200, 
      'All game settings retrieved successfully', 
      { settings }
    );
  } catch (err) {
    return errorResponse(res, 400, err.message);
  }
};

/**
 * Create or update game settings
 * @route POST /api/game/settings
 */
exports.upsertGameSettings = async (req, res) => {
  try {
    const settings = await gameSettingsService.upsertGameSettings(req.body);
    return successResponse(
      res, 
      201, 
      'Game settings created/updated successfully', 
      { settings }
    );
  } catch (err) {
    return errorResponse(res, 400, err.message);
  }
};
