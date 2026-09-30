const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const db = require('./db');

let groq = null;
if (process.env.GROQ_API_KEY) {
  try {
    const Groq = require('groq-sdk');
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    console.log('Groq Key loaded: YES');
  } catch (err) {
    console.warn('Groq SDK initialization warning:', err.message);
  }
} else {
  console.log('Groq Key loaded: NO - undefined');
}

const app = express();
app.use(cors());
app.use(express.json());

function generateAccessCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Health check / welcome endpoint
app.get('/', (req, res) => {
  res.json({ message: 'EduSTEM AI Backend running with Firebase Firestore', status: 'healthy' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Sign up
app.post('/api/signup', async (req, res) => {
  try {
    const { name, email, password, role, access_code } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists
    const existing = await db.collection('users').where('email', '==', normalizedEmail).get();
    if (!existing.empty) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    let student_id = null;

    if (role === 'student') {
      if (!access_code) {
        return res.status(400).json({ error: 'Access code is required for student signup.' });
      }

      const formattedCode = access_code.trim().toUpperCase();
      const studentQuery = await db.collection('students').where('access_code', '==', formattedCode).get();

      if (studentQuery.empty) {
        return res.status(400).json({ error: 'Invalid access code. Ask your teacher for the correct code.' });
      }

      const studentDoc = studentQuery.docs[0];
      student_id = studentDoc.id;

      // Check if student record is already claimed
      const claimed = await db.collection('users').where('student_id', '==', student_id).get();
      if (!claimed.empty) {
        return res.status(400).json({ error: 'This student record has already been claimed by another account.' });
      }
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const newUserRef = await db.collection('users').add({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role,
      student_id: student_id || null,
      createdAt: new Date().toISOString(),
    });

    res.json({
      id: newUserRef.id,
      name: name.trim(),
      email: normalizedEmail,
      role,
      student_id: student_id || null,
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Log in
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const query = await db.collection('users').where('email', '==', normalizedEmail).get();

    if (query.empty) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const userDoc = query.docs[0];
    const user = { id: userDoc.id, ...userDoc.data() };

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      student_id: user.student_id || null,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get students belonging to a specific teacher
app.get('/api/students', async (req, res) => {
  try {
    const { teacher_id } = req.query;

    let queryRef = db.collection('students');
    if (teacher_id) {
      queryRef = queryRef.where('teacher_id', '==', String(teacher_id));
    }

    const snapshot = await queryRef.get();
    const students = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(students);
  } catch (err) {
    console.error('Get students error:', err);
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

    if (!name) {
      return res.status(400).json({ error: 'Student name is required.' });
    }

    const access_code = generateAccessCode();

    const newStudentRef = await db.collection('students').add({
      name: name.trim(),
      class_name: class_name || '',
      teacher_id: String(teacher_id),
      access_code,
      createdAt: new Date().toISOString(),
    });

    res.json({
      id: newStudentRef.id,
      name: name.trim(),
      class_name: class_name || '',
      teacher_id: String(teacher_id),
      access_code,
    });
  } catch (err) {
    console.error('Add student error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Add a score entry
app.post('/api/scores', async (req, res) => {
  try {
    const { student_id, type, subject, topic, score, max_score } = req.body;

    if (!student_id) {
      return res.status(400).json({ error: 'student_id is required.' });
    }

    const newScoreRef = await db.collection('scores').add({
      student_id: String(student_id),
      type: type || 'quiz',
      subject: subject || 'General',
      topic: topic || '',
      score: Number(score),
      max_score: Number(maxScore || max_score),
      createdAt: new Date().toISOString(),
    });

    res.json({ id: newScoreRef.id });
  } catch (err) {
    console.error('Add score error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get a student's full profile
app.get('/api/students/:id/profile', async (req, res) => {
  try {
    const studentDoc = await db.collection('students').doc(req.params.id).get();

    if (!studentDoc.exists) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const student = { id: studentDoc.id, ...studentDoc.data() };

    const scoresSnapshot = await db
      .collection('scores')
      .where('student_id', '==', String(req.params.id))
      .get();

    const scores = scoresSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({ student, scores });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: err.message });
  }
});

// AI recommendation
app.get('/api/students/:id/recommendation', async (req, res) => {
  try {
    const studentDoc = await db.collection('students').doc(req.params.id).get();

    if (!studentDoc.exists) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const scoresSnapshot = await db
      .collection('scores')
      .where('student_id', '==', String(req.params.id))
      .get();

    const scores = scoresSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    if (scores.length === 0) {
      return res.json({ recommendation: 'No scores recorded yet for this student.' });
    }

    if (!groq) {
      return res.status(500).json({
        error: 'GROQ_API_KEY is not configured on the server. Please add GROQ_API_KEY to environment variables.',
      });
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
    console.error('Recommendation error:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;

// Only listen directly if not running inside a Vercel Serverless Function
if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
}

module.exports = app;