const AppError = require('../utils/AppError');

// Minimal version for Phase 3 so thrown errors come back as JSON instead of
// HTML stack traces. Phase 7 expands this into the full validation/error pass.
// eslint-disable-next-line no-unused-vars
function errorMiddleware(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  console.error(err);
  return res.status(500).json({ error: 'Internal server error' });
}

module.exports = errorMiddleware;
