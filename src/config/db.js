const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  // Read/write DATETIME values as UTC instead of the server's local time, so a
  // due date sent as "...T23:00:00Z" is stored as 23:00 and not shifted.
  timezone: 'Z',
});

// The setting above only covers values mysql2 converts. NOW() and CURDATE() are
// evaluated by MySQL itself, so the session needs to be UTC as well — otherwise
// "due today" comparisons run against a different day than the stored dates.
pool.on('connection', (connection) => {
  connection.query("SET time_zone = '+00:00'");
});

async function testConnection() {
  const connection = await pool.getConnection();
  try {
    await connection.ping();
  } finally {
    connection.release();
  }
}

module.exports = { pool, testConnection };
