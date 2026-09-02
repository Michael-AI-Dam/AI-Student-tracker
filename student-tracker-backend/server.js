const express = require('express');
const cors = require('cors');
const db = require('./db');
const bcrypt = require('bcryptjs');

require('dotenv').config();
const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
console.log('Groq Key loaded:', process.env.GROQ_API_KEY ? 'YES' : 'NO - undefined');

const app = express();
app.use(cors());
app.use(express.json());

function generateAccessCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Sign up
app.post('/api/signup', async (req, res) => {
  try {
    const { name, email, password, role, access_code } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required.' });
    }

    const existing = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    let student_id = null;

    if (role === 'student') {
      if (!access_code) {
        return res.status(400).json({ error: 'Access code is required for student signup.' });
      }

      const studentResult = await db.query('SELECT * FROM students WHERE access_code = $1', [access_code.toUpperCase()]);
      const student = studentResult.rows[0];

      if (!student) {
        return res.status(400).json({ error: 'Invalid access code. Ask your teacher for the correct code.' });
      }

      const claimedResult = await db.query('SELECT * FROM users WHERE student_id = $1', [student.id]);
      if (claimedResult.rows.length > 0) {
        return res.status(400).json({ error: 'This student record has already been claimed by another account.' });
      }

      student_id = student.id;
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const result = await db.query(
      'INSERT INTO users (name, email, password, role, student_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [name, email, hashedPassword, role, student_id]
    );

    res.json({
      id: result.rows[0].id,
      name,
      email,
      role,
      student_id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Log in
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      student_id: user.student_id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get students belonging to a specific teacher
app.get('/api/students', async (req, res) => {
  try {
    const { teacher_id } = req.query;

    if (teacher_id) {
      const result = await db.query('SELECT * FROM students WHERE teacher_id = $1', [teacher_id]);
      return res.json(result.rows);
    }

    const result = await db.query('SELECT * FROM students');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Add a new student
app.post('/api/students', async (req, res) => {
  try {
    const { name, class_name, teacher_id } = req.body;

    if (!teacher_id) {
      return res.status(400).json({ error: 'teacher_id is required to add a student.' });
    }

    const access_code = generateAccessCode();

    const result = await db.query(
      'INSERT INTO students (name, class_name, teacher_id, access_code) VALUES ($1, $2, $3, $4) RETURNING id',
      [name, class_name, teacher_id, access_code]
    );

    res.json({ id: result.rows[0].id, name, class_name, teacher_id, access_code });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Add a score entry
app.post('/api/scores', async (req, res) => {
  try {
    const { student_id, type, subject, topic, score, max_score } = req.body;

    const result = await db.query(
      'INSERT INTO scores (student_id, type, subject, topic, score, max_score) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [student_id, type, subject, topic, score, max_score]
    );

    res.json({ id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get a student's full profile
app.get('/api/students/:id/profile', async (req, res) => {
  try {
    const studentResult = await db.query('SELECT * FROM students WHERE id = $1', [req.params.id]);
    const scoresResult = await db.query('SELECT * FROM scores WHERE student_id = $1', [req.params.id]);

    res.json({ student: studentResult.rows[0], scores: scoresResult.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// AI recommendation
app.get('/api/students/:id/recommendation', async (req, res) => {
  try {
    const studentResult = await db.query('SELECT * FROM students WHERE id = $1', [req.params.id]);
    const scoresResult = await db.query('SELECT * FROM scores WHERE student_id = $1', [req.params.id]);

    const student = studentResult.rows[0];
    const scores = scoresResult.rows;

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (scores.length === 0) {
      return res.json({ recommendation: 'No scores recorded yet for this student.' });
    }

    const prompt = `Here is a student's performance data across exams, quizzes, assignments, and participation: ${JSON.stringify(scores)}.

IMPORTANT RULES:
- Base your entire response ONLY on the data provided above. Do not invent or assume any strengths, habits, or behaviors that are not directly shown in the data.
- If the data shows mostly low or poor scores, be honest about that rather than inventing positives.
- If there is only one score on record, say so explicitly and note that more data would give a fuller picture.

Based strictly on the data given, write a summary with:
1. An honest assessment of their actual performance level
2. Specific strengths ONLY if the data supports them
3. Specific weak areas based on the actual topics/scores shown
4. 2-3 concrete, realistic next steps for studying THIS specific weak topic

Keep it under 150 words, honest but respectful in tone. Address the student directly ("you").`;

    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-20b',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
    });

    res.json({ recommendation: completion.choices[0].message.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));