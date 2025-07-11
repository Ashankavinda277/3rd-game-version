/** @format */

// User service - contains business logic for user operations
const User = require("../models/User");

/**
 * Register a new user
 * @param {Object} userData - User data (username, age, mode)
 * @returns {Object} The created user
 */
const registerUser = async (userData) => {
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ username: userData.username });
    if (existingUser) {
      throw new Error(
        "This username already exists. Please sign up with a different username."
      );
    }

    const user = new User(userData);
    await user.save();
    return user;
  } catch (error) {
    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      throw new Error(
        "This username already exists. Please sign up with a different username."
      );
    }
    throw error;
  }
};

/**
 * Login user
 * @param {string} username - Username
 * @param {string} password - Password
 * @returns {Object} The user
 */
const loginUser = async (username, password) => {
  try {
    const user = await User.findOne({ username });
    if (!user) {
      throw new Error("User not found. Please check your username or sign up.");
    }

    // Simple password check (in production, use proper password hashing)
    if (user.password && user.password !== password) {
      throw new Error("Invalid password. Please try again.");
    }

    return user;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  registerUser,
  loginUser,
};
