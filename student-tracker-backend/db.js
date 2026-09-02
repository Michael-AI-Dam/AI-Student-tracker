const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client:', err.message);
  // Don't crash the app — just log it. The pool will create a new connection on the next query.
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS students (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      class_name TEXT,
      teacher_id INTEGER,
      access_code TEXT
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS scores (
      id SERIAL PRIMARY KEY,
      student_id INTEGER REFERENCES students(id),
      type TEXT,
      subject TEXT,
      topic TEXT,
      score REAL,
      max_score REAL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      student_id INTEGER REFERENCES students(id)
    );
  `);

  console.log('Database tables ready.');
}

initDb().catch((err) => console.error('Error initializing database:', err));

module.exports = pool;