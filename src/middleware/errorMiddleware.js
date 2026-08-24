const AppError = require('../utils/AppError');


function errorMiddleware(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // Thrown by express.json(); the client's fault, not a server failure.
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body is too large' });
  }

  console.error(err);
  return res.status(500).json({ error: 'Internal server error' });
}

module.exports = errorMiddleware;
