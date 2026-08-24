const bcrypt = require('bcrypt');

const { pool } = require('../config/db');
const { signToken } = require('../utils/jwt');
const AppError = require('../utils/AppError');

const SALT_ROUNDS = 10;

// Public shape of a user. password_hash is never included.
const USER_FIELDS = 'id, name, email, created_at';

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

async function register({ name, email, password }) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  let result;
  try {
    [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name.trim(), normalizeEmail(email), passwordHash]
    );
  } catch (err) {
    // Relies on the UNIQUE constraint on users.email, so two concurrent
    // registrations can't both slip through a "does this email exist?" check.
    if (err.code === 'ER_DUP_ENTRY') {
      throw new AppError(409, 'Email is already registered');
    }
    throw err;
  }

  const user = await findById(result.insertId);
  return { user, token: signToken(user.id) };
}

async function login({ email, password }) {
  const [rows] = await pool.query(
    `SELECT ${USER_FIELDS}, password_hash FROM users WHERE email = ?`,
    [normalizeEmail(email)]
  );

  const record = rows[0];
  // Same error whether the email is unknown or the password is wrong, so the
  // response can't be used to discover which emails are registered.
  if (!record) {
    throw new AppError(401, 'Invalid email or password');
  }

  const passwordMatches = await bcrypt.compare(password, record.password_hash);
  if (!passwordMatches) {
    throw new AppError(401, 'Invalid email or password');
  }

  const { password_hash, ...user } = record;
  return { user, token: signToken(user.id) };
}

async function findById(userId) {
  const [rows] = await pool.query(
    `SELECT ${USER_FIELDS} FROM users WHERE id = ?`,
    [userId]
  );
  return rows[0] || null;
}

module.exports = { register, login, findById };
