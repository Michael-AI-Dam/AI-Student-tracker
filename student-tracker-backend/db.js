const Database = require('better-sqlite3');
const db = new Database('tracker.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    class_name TEXT
  );

  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    type TEXT,
    subject TEXT,
    topic TEXT,
    score REAL,
    max_score REAL,
    FOREIGN KEY (student_id) REFERENCES students(id)
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    student_id INTEGER,
    FOREIGN KEY (student_id) REFERENCES students(id)
  );
`);

// Safe migrations: add new columns only if they don't already exist
function columnExists(table, column) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  return cols.some((c) => c.name === column);
}

if (!columnExists('students', 'teacher_id')) {
  db.exec('ALTER TABLE students ADD COLUMN teacher_id INTEGER');
}
if (!columnExists('students', 'access_code')) {
  db.exec('ALTER TABLE students ADD COLUMN access_code TEXT');
}

module.exports = db;