// Error with an HTTP status attached, so controllers can throw meaningful
// failures and one middleware turns them into JSON responses.
class AppError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = AppError;
