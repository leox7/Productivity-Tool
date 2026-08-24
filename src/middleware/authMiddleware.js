const { verifyToken } = require('../utils/jwt');
const AppError = require('../utils/AppError');

// Verifies the JWT and attaches req.userId.
//
// This is the ONLY place a request's identity is established. Protected routes
// must read the owner from req.userId and never from the request body or query,
// otherwise a caller could act on another user's data by passing their id.
function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new AppError(401, 'Missing or malformed Authorization header'));
  }

  try {
    const payload = verifyToken(token);
    req.userId = payload.userId;
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError(401, 'Token has expired'));
    }
    return next(new AppError(401, 'Invalid token'));
  }
}

module.exports = authMiddleware;
