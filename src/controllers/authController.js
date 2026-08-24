const authService = require('../services/authService');
const AppError = require('../utils/AppError');

// Just enough checking to keep bad input out of the DB. Phase 7 adds the
// thorough validation pass.
function requireFields(body, fields) {
  for (const field of fields) {
    const value = body[field];
    if (typeof value !== 'string' || value.trim() === '') {
      throw new AppError(400, `${field} is required`);
    }
  }
}

async function register(req, res, next) {
  try {
    requireFields(req.body, ['name', 'email', 'password']);

    const { name, email, password } = req.body;
    if (password.length < 8) {
      throw new AppError(400, 'password must be at least 8 characters');
    }

    const { user, token } = await authService.register({ name, email, password });
    res.status(201).json({ user, token });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    requireFields(req.body, ['email', 'password']);

    const { email, password } = req.body;
    const { user, token } = await authService.login({ email, password });
    res.json({ user, token });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    // Identity comes from the token via authMiddleware, never from the request.
    const user = await authService.findById(req.userId);
    if (!user) {
      throw new AppError(401, 'User no longer exists');
    }
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, me };
