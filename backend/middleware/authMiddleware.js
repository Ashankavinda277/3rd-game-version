/**
 * Authorization middleware
 * This is a placeholder for future authentication implementation
 */
const isAuthorized = (req, res, next) => {
  // In a real application, you would check for JWT tokens or other auth
  // For now, we'll assume all requests are authorized
  next();
};

module.exports = { isAuthorized };
