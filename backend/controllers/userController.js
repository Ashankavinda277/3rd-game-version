/** @format */

const userService = require("../services/userService");
const { successResponse, errorResponse } = require("../utils/responseUtil");

// User registration controller
exports.registerUser = async (req, res) => {
  const { username, age, mode, password } = req.body;
  try {
    const user = await userService.registerUser({
      username,
      age,
      mode,
      password,
    });
    return successResponse(res, 201, "User registered successfully", { user });
  } catch (err) {
    return errorResponse(res, 400, err.message);
  }
};

// User login controller
exports.loginUser = async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await userService.loginUser(username, password);
    return successResponse(res, 200, "Login successful", { user });
  } catch (err) {
    return errorResponse(res, 401, err.message);
  }
};
