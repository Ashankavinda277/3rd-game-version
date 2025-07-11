/**
 * Form validation utilities
 */

/**
 * Validates a username
 * @param {string} username - The username to validate
 * @returns {boolean} Whether the username is valid
 */
export const validateUsername = (username) => {
  // Username must be at least 3 characters
  if (!username || username.trim().length < 3) {
    return false;
  }
  return true;
};

/**
 * Validates an age
 * @param {number|string} age - The age to validate
 * @returns {boolean} Whether the age is valid
 */
export const validateAge = (age) => {
  // Parse age to integer if it's a string
  const parsedAge = typeof age === 'string' ? parseInt(age, 10) : age;
  
  // Age must be a number between 1 and 120
  if (isNaN(parsedAge) || parsedAge < 1 || parsedAge > 120) {
    return false;
  }
  return true;
};

/**
 * Validates a game mode
 * @param {string} mode - The game mode to validate
 * @returns {boolean} Whether the game mode is valid
 */
export const validateGameMode = (mode) => {
  // Valid game modes
  const validModes = ['easy', 'medium', 'hard'];
  return validModes.includes(mode);
};

/**
 * Validates registration form data
 * @param {Object} formData - Form data object
 * @param {string} formData.username - The username
 * @param {number|string} formData.age - The age
 * @param {string} formData.mode - The game mode
 * @returns {Object} Validation result with isValid and errors
 */
export const validateRegistrationForm = ({ username, age, mode }) => {
  const errors = {};
  
  if (!validateUsername(username)) {
    errors.username = 'Username must be at least 3 characters';
  }
  
  if (!validateAge(age)) {
    errors.age = 'Age must be a valid number between 1 and 120';
  }
  
  if (!validateGameMode(mode)) {
    errors.mode = 'Invalid game mode';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
