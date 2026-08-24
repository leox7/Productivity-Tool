require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  try {
    for (const file of files) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      console.log(`Running migration: ${file}`);
      await connection.query(sql);
    }
    console.log('Migrations complete.');
  } finally {
    await connection.end();
  }
}

run().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
