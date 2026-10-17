const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const { getDb, getInitStatus } = require('./db');

let groq = null;
if (process.env.GROQ_API_KEY) {
  try {
    const Groq = require('groq-sdk');
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  } catch (err) {
    console.warn('Groq SDK initialization warning:', err.message);
  }
}

async function callGroqAI(prompt, systemMessage = 'You are an expert educational AI tutor and diagnostic specialist providing constructive, data-grounded assessment for secondary school students.') {
  if (!groq) throw new Error('GROQ_API_KEY is not configured on the server.');
  const models = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'openai/gpt-oss-20b'];
  let lastErr = null;
  for (const model of models) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1200,
      });
      return completion.choices[0].message.content;
    } catch (err) {
      lastErr = err;
      console.warn(`Groq model ${model} failed, trying next model...`);
    }
  }
  throw lastErr || new Error('All Groq AI models failed.');
}

const app = express();
app.use(cors());
app.use(express.json());

// Normalize URLs: restore original requested path if Vercel rewrote it to /server.js
app.use((req, res, next) => {
  const match = req.headers['x-matched-path'] || req.headers['x-now-route-matches'] || req.headers['x-forwarded-uri'];
  if (match) {
    req.url = match;
  }
  next();
});

function generateAccessCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function normalizeSubject(sub) {
  if (!sub) return '';
  const s = String(sub).trim().toLowerCase();
  if (s === 'physic' || s === 'physics') return 'physics';
  if (s === 'chem' || s === 'chemistry') return 'chemistry';
  if (s === 'math' || s === 'maths' || s === 'mathematics') return 'mathematics';
  if (s === 'bio' || s === 'biology') return 'biology';
  if (s === 'eng' || s === 'english' || s === 'english language') return 'english';
  return s;
}

function subjectsMatch(sub1, sub2) {
  if (!sub1 || !sub2) return false;
  return normalizeSubject(sub1) === normalizeSubject(sub2);
}

function normalizeClassName(className) {
  if (!className) return '';
  const c = String(className).toLowerCase().replace(/[\s\-_/()]/g, '');
  if (c.includes('sss1') || c.includes('grade10') || c.includes('ss1') || c === '10' || c === 'year10') {
    return 'SSS 1';
  }
  if (c.includes('sss2') || c.includes('grade11') || c.includes('ss2') || c === '11' || c === 'year11') {
    return 'SSS 2';
  }
  if (c.includes('sss3') || c.includes('grade12') || c.includes('ss3') || c === '12' || c === 'year12') {
    return 'SSS 3';
  }
  return className.trim();
}

function areClassesEquivalent(c1, c2) {
  if (!c1 || !c2) return true;
  const n1 = normalizeClassName(c1);
  const n2 = normalizeClassName(c2);
  if (n1 === n2) return true;
  return n1.toLowerCase() === n2.toLowerCase();
}

// Middleware to ensure DB is initialized before executing query routes
function requireDb(req, res, next) {
  const db = getDb();
  if (!db) {
    const status = getInitStatus();
    return res.status(500).json({
      error: 'Database connection failed: ' + (status.error || 'Firebase not initialized.'),
      status,
    });
  }
  req.db = db;
  next();
}

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'AI Student Tracker Backend running with Firebase Firestore',
    status: 'healthy',
    dbStatus: getInitStatus(),
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    dbStatus: getInitStatus(),
  });
});

// Diagnostic debug endpoint
app.get('/api/debug-env', (req, res) => {
  res.json({
    dbStatus: getInitStatus(),
    hasServiceAccountKey: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
    serviceAccountKeyLength: process.env.FIREBASE_SERVICE_ACCOUNT_KEY
      ? process.env.FIREBASE_SERVICE_ACCOUNT_KEY.length
      : 0,
    hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
    hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
    hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
    privateKeyLength: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.length : 0,
    hasGroqKey: !!process.env.GROQ_API_KEY,
  });
});

// OAuth credential diagnostic endpoint
app.get('/api/auth-test', async (req, res) => {
  try {
    const admin = require('firebase-admin');
    const appInstance = admin.app();
    const token = await appInstance.options.credential.getAccessToken();
    res.json({
      success: true,
      hasToken: !!token.access_token,
      expiresIn: token.expires_in,
    });
  } catch (err) {
    res.status(500).json({
      errorName: err.name,
      errorMessage: err.message,
      errorCode: err.code,
      errorResponse: err.response ? err.response.data : null,
      stack: err.stack,
    });
  }
});

// Sign up
app.post('/api/signup', requireDb, async (req, res) => {
  try {
    const db = req.db;
    const { name, email, password, role, access_code, subject } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

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

      const claimed = await db.collection('users').where('student_id', '==', student_id).get();
      if (!claimed.empty) {
        return res.status(400).json({ error: 'This student record has already been claimed by another account.' });
      }
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const teacherSubject = role === 'teacher' ? (subject || 'Physics').trim() : null;

    const newUserRef = await db.collection('users').add({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role,
      subject: teacherSubject,
      student_id: student_id || null,
      createdAt: new Date().toISOString(),
    });

    res.json({
      id: newUserRef.id,
      name: name.trim(),
      email: normalizedEmail,
      role,
      subject: teacherSubject,
      student_id: student_id || null,
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Log in
app.post('/api/login', requireDb, async (req, res) => {
  try {
    const db = req.db;
    const { email, password, subject } = req.body;

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

    let activeSubject = user.subject || '';

    // If teacher signs in and specified subject, update user subject in DB
    if (user.role === 'teacher') {
      if (subject && subject.trim()) {
        activeSubject = subject.trim();
        await db.collection('users').doc(user.id).update({
          subject: activeSubject,
          updatedAt: new Date().toISOString(),
        });
      } else if (!activeSubject) {
        if (user.id === 'vXbo2eCYo1LepXt7bUNa') activeSubject = 'Chemistry';
        else if (user.id === 'QuF7Hq7aC0euzP2DEKaW') activeSubject = 'Physics';
      }
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      subject: activeSubject,
      student_id: user.student_id || null,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Reset / Forgot Password
app.post('/api/reset-password', requireDb, async (req, res) => {
  try {
    const db = req.db;
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const query = await db.collection('users').where('email', '==', normalizedEmail).get();

    if (query.empty) {
      return res.status(404).json({ error: 'No account found with this email address.' });
    }

    const userDoc = query.docs[0];
    const hashedPassword = bcrypt.hashSync(newPassword, 10);

    await db.collection('users').doc(userDoc.id).update({
      password: hashedPassword,
      updatedAt: new Date().toISOString(),
    });

    res.json({ message: 'Password has been updated successfully. You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update Teacher Profile (name, email, password)
app.post('/api/teachers/update-profile', requireDb, async (req, res) => {
  try {
    const db = req.db;
    const { teacherId, name, email, newPassword, subject } = req.body;

    if (!teacherId) {
      return res.status(400).json({ error: 'teacherId is required.' });
    }

    const userDocRef = db.collection('users').doc(teacherId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Teacher account not found.' });
    }

    const updateData = {};
    if (name && name.trim()) {
      updateData.name = name.trim();
    }

    if (subject && subject.trim()) {
      updateData.subject = subject.trim();
    }

    if (email && email.trim()) {
      const normalizedEmail = email.toLowerCase().trim();
      const existing = await db.collection('users').where('email', '==', normalizedEmail).get();
      if (!existing.empty && existing.docs[0].id !== teacherId) {
        return res.status(400).json({ error: 'This email is already in use by another account.' });
      }
      updateData.email = normalizedEmail;
    }

    if (newPassword && newPassword.trim()) {
      if (newPassword.trim().length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
      }
      updateData.password = bcrypt.hashSync(newPassword.trim(), 10);
    }

    updateData.updatedAt = new Date().toISOString();
    await userDocRef.update(updateData);

    const updatedDoc = await userDocRef.get();
    const data = updatedDoc.data();

    res.json({
      id: updatedDoc.id,
      name: data.name,
      email: data.email,
      role: data.role,
      subject: data.subject || '',
      message: 'Profile updated successfully!',
    });
  } catch (err) {
    console.error('Update teacher profile error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get students belonging to a specific teacher OR all school students
app.get('/api/students', requireDb, async (req, res) => {
  try {
    const db = req.db;
    const { teacher_id } = req.query;

    const snapshot = await db.collection('students').get();
    let students = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    if (teacher_id) {
      // Auto-heal duplicate Justinah Adedeji if teacher_id is QuF7Hq7aC0euzP2DEKaW (Mrs Suzana)
      const mainJustinah = students.find((s) => s.id === '7iFLaTkdmfZ7R3YG6b4P');
      if (mainJustinah && String(teacher_id) === 'QuF7Hq7aC0euzP2DEKaW') {
        const teachers = Array.isArray(mainJustinah.teacher_ids)
          ? mainJustinah.teacher_ids.map(String)
          : [String(mainJustinah.teacher_id)].filter(Boolean);
        if (!teachers.includes('QuF7Hq7aC0euzP2DEKaW')) {
          teachers.push('QuF7Hq7aC0euzP2DEKaW');
          await db.collection('students').doc('7iFLaTkdmfZ7R3YG6b4P').update({ teacher_ids: teachers });
          mainJustinah.teacher_ids = teachers;
        }
        try {
          const dupDoc = await db.collection('students').doc('S5g0naTBe4LZ6RqCC7zR').get();
          if (dupDoc.exists) {
            await db.collection('students').doc('S5g0naTBe4LZ6RqCC7zR').delete();
          }
        } catch (_) {}
      }

      students = students.filter((s) => {
        if (s.id === 'S5g0naTBe4LZ6RqCC7zR') return false; // ignore empty duplicate
        if (s.teacher_id === String(teacher_id)) return true;
        if (Array.isArray(s.teacher_ids) && s.teacher_ids.map(String).includes(String(teacher_id))) return true;
        return false;
      });
    }

    res.json(students);
  } catch (err) {
    console.error('Get students error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Add a new student (reusing existing student record and code if already registered in school)
app.post('/api/students', requireDb, async (req, res) => {
  try {
    const db = req.db;
    const { name, class_name, teacher_id } = req.body;

    if (!teacher_id) {
      return res.status(400).json({ error: 'teacher_id is required to add a student.' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Student name is required.' });
    }

    const trimmedName = name.trim();
    const trimmedClass = (class_name || '').trim();
    const standardClass = normalizeClassName(trimmedClass);

    // Check if a student with the same name already exists in the school database with equivalent class
    const allStudentsSnapshot = await db.collection('students').get();
    const existingStudentDoc = allStudentsSnapshot.docs.find((d) => {
      const data = d.data();
      const sameName = data.name.trim().toLowerCase() === trimmedName.toLowerCase();
      const sameClass = areClassesEquivalent(data.class_name, trimmedClass);
      return sameName && sameClass;
    });

    if (existingStudentDoc) {
      // Re-use this student and their existing permanent access code so students don't need a new signup
      const data = existingStudentDoc.data();
      let currentTeachers = Array.isArray(data.teacher_ids)
        ? data.teacher_ids.map(String)
        : [String(data.teacher_id)].filter(Boolean);

      const updates = {};
      if (!currentTeachers.includes(String(teacher_id))) {
        currentTeachers.push(String(teacher_id));
        updates.teacher_ids = currentTeachers;
      }
      if (standardClass && (!data.class_name || data.class_name === 'General')) {
        updates.class_name = standardClass;
      }
      if (Object.keys(updates).length > 0) {
        await db.collection('students').doc(existingStudentDoc.id).update(updates);
      }

      return res.json({
        id: existingStudentDoc.id,
        name: data.name,
        class_name: updates.class_name || data.class_name,
        access_code: data.access_code,
        message: `Student already enrolled! Linked to permanent student record with Access Code: ${data.access_code}`,
      });
    }

    const access_code = generateAccessCode();

    const newStudentRef = await db.collection('students').add({
      name: trimmedName,
      class_name: standardClass || trimmedClass || 'General',
      teacher_id: String(teacher_id),
      teacher_ids: [String(teacher_id)],
      access_code,
      createdAt: new Date().toISOString(),
    });

    res.json({
      id: newStudentRef.id,
      name: trimmedName,
      class_name: standardClass || trimmedClass || 'General',
      teacher_id: String(teacher_id),
      access_code,
    });
  } catch (err) {
    console.error('Add student error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Remove a student from a teacher's classroom roster
app.post('/api/teachers/remove-student', requireDb, async (req, res) => {
  try {
    const db = req.db;
    const { teacherId, studentId } = req.body;

    if (!teacherId || !studentId) {
      return res.status(400).json({ error: 'teacherId and studentId are required.' });
    }

    const studentDocRef = db.collection('students').doc(String(studentId));
    const studentDoc = await studentDocRef.get();

    if (!studentDoc.exists) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const data = studentDoc.data();
    let currentTeachers = Array.isArray(data.teacher_ids)
      ? data.teacher_ids.map(String)
      : [String(data.teacher_id)].filter(Boolean);

    currentTeachers = currentTeachers.filter((tId) => tId !== String(teacherId));

    const updates = {
      teacher_ids: currentTeachers,
      updatedAt: new Date().toISOString(),
    };

    if (String(data.teacher_id) === String(teacherId)) {
      updates.teacher_id = currentTeachers.length > 0 ? currentTeachers[0] : null;
    }

    await studentDocRef.update(updates);

    res.json({
      success: true,
      message: `Student "${data.name}" has been removed from your class roster.`,
    });
  } catch (err) {
    console.error('Remove student error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Add a score entry
app.post('/api/scores', requireDb, async (req, res) => {
  try {
    const db = req.db;
    const { student_id, type, subject, topic, score, max_score, teacher_id } = req.body;

    if (!student_id) {
      return res.status(400).json({ error: 'student_id is required.' });
    }

    const cleanSubject = (subject || 'General').trim();

    const newScoreRef = await db.collection('scores').add({
      student_id: String(student_id),
      teacher_id: teacher_id ? String(teacher_id) : null,
      type: type || 'quiz',
      subject: cleanSubject,
      topic: topic || '',
      score: Number(score),
      max_score: Number(max_score),
      createdAt: new Date().toISOString(),
    });

    // If teacher doesn't have subject set, update teacher's profile subject
    if (teacher_id && cleanSubject) {
      const teacherDoc = await db.collection('users').doc(String(teacher_id)).get();
      if (teacherDoc.exists && !teacherDoc.data().subject) {
        await db.collection('users').doc(String(teacher_id)).update({
          subject: cleanSubject,
        });
      }
    }

    res.json({ id: newScoreRef.id });
  } catch (err) {
    console.error('Add score error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get a student's full profile (filtered strictly to teacher's subject when requested by a teacher)
app.get('/api/students/:id/profile', requireDb, async (req, res) => {
  try {
    const db = req.db;
    const { teacher_id, subject } = req.query;
    const studentDoc = await db.collection('students').doc(req.params.id).get();

    if (!studentDoc.exists) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const student = { id: studentDoc.id, ...studentDoc.data() };

    const scoresSnapshot = await db
      .collection('scores')
      .where('student_id', '==', String(req.params.id))
      .get();

    let scores = scoresSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // If teacher_id is provided, filter out other teachers' subjects!
    if (teacher_id) {
      let teacherSubject = subject || '';
      if (!teacherSubject) {
        const teacherDoc = await db.collection('users').doc(String(teacher_id)).get();
        if (teacherDoc.exists) {
          teacherSubject = teacherDoc.data().subject || '';
        }
      }

      // If teacher has no subject set yet, check if they recorded scores or what subject they teach
      if (!teacherSubject) {
        const myScore = scores.find((s) => s.teacher_id && String(s.teacher_id) === String(teacher_id));
        if (myScore) teacherSubject = myScore.subject;
      }

      if (String(teacher_id) === 'vXbo2eCYo1LepXt7bUNa' && !teacherSubject) {
        teacherSubject = 'Chemistry';
      }
      if (String(teacher_id) === 'QuF7Hq7aC0euzP2DEKaW' && !teacherSubject) {
        teacherSubject = 'Physics';
      }

      scores = scores.filter((s) => {
        // Explicitly recorded by this teacher
        if (s.teacher_id && String(s.teacher_id) === String(teacher_id)) {
          return true;
        }
        // Belongs to the teacher's subject
        if (teacherSubject && subjectsMatch(s.subject, teacherSubject)) {
          return true;
        }
        // Exclude all other subjects (e.g. Chemistry for a Physics teacher)
        return false;
      });
    }

    res.json({ student, scores });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: err.message });
  }
});

// AI recommendation (optionally filtered by subject)
app.get('/api/students/:id/recommendation', requireDb, async (req, res) => {
  try {
    const db = req.db;
    const studentDoc = await db.collection('students').doc(req.params.id).get();

    if (!studentDoc.exists) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const studentName = studentDoc.data().name || 'Student';
    const requestedSubject = req.query.subject;

    const scoresSnapshot = await db
      .collection('scores')
      .where('student_id', '==', String(req.params.id))
      .get();

    let scores = scoresSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    if (requestedSubject && requestedSubject !== 'All' && requestedSubject !== 'All Subjects') {
      scores = scores.filter((s) => (s.subject || '').toLowerCase() === requestedSubject.toLowerCase());
    }

    if (scores.length === 0) {
      return res.json({ recommendation: `No assessment scores recorded yet for ${requestedSubject || 'this student'}.` });
    }

    if (!groq) {
      return res.status(500).json({
        error: 'GROQ_API_KEY is not configured on the server.',
      });
    }

    const prompt = `Here is student "${studentName}"'s performance data${requestedSubject && requestedSubject !== 'All' ? ` in ${requestedSubject}` : ''} across exams, quizzes, assignments, and class participation: ${JSON.stringify(scores)}.

IMPORTANT RULES:
- Base your entire response ONLY on the data provided above. Do not invent or assume any strengths, habits, or behaviors that are not directly shown in the data.
- If the data shows mostly low or poor scores, be honest about that rather than inventing positives.
- If there is only one score on record, say so explicitly and note that more data would give a fuller picture.

Based strictly on the data given, write a summary with:
1. An honest assessment of their actual performance level${requestedSubject ? ` in ${requestedSubject}` : ''}
2. Specific strengths ONLY if the data supports them
3. Specific weak areas based on the actual topics/scores shown
4. 2-3 concrete, realistic next steps for studying THIS specific weak topic

Keep it under 150 words, honest but respectful in tone. Address the student directly ("you").`;

    const recommendation = await callGroqAI(
      prompt,
      'You are an empathetic, precise educational diagnostic tutor. Analyze performance truthfully and constructively.'
    );
    res.json({ recommendation });
  } catch (err) {
    console.error('Recommendation error:', err);
    res.status(500).json({ error: err.message });
  }
});

function calculateCompositeScore(scores) {
  if (!scores || !Array.isArray(scores) || scores.length === 0) return 0;
  const weights = { exam: 0.5, quiz: 0.2, assignment: 0.2, participation: 0.1 };
  const byType = {};

  scores.forEach((s) => {
    const t = s.type || 'assignment';
    if (!byType[t]) byType[t] = { totalScore: 0, totalMax: 0 };
    byType[t].totalScore += Number(s.score) || 0;
    byType[t].totalMax += Number(s.max_score) || 0;
  });

  let weightedSum = 0;
  let weightUsed = 0;

  Object.entries(byType).forEach(([type, { totalScore, totalMax }]) => {
    if (totalMax > 0 && weights[type]) {
      const pct = (totalScore / totalMax) * 100;
      weightedSum += pct * weights[type];
      weightUsed += weights[type];
    }
  });

  return weightUsed > 0 ? Number((weightedSum / weightUsed).toFixed(1)) : 0;
}

// 1. Teacher Class-wide Analytics Cockpit
app.get('/api/teachers/:teacherId/analytics', requireDb, async (req, res) => {
  try {
    const db = req.db;
    const teacherId = req.params.teacherId;

    const allStudentsSnapshot = await db.collection('students').get();
    const students = allStudentsSnapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((s) => {
        if (s.id === 'S5g0naTBe4LZ6RqCC7zR') return false; // ignore empty duplicate
        if (s.teacher_id === String(teacherId)) return true;
        if (Array.isArray(s.teacher_ids) && s.teacher_ids.map(String).includes(String(teacherId))) return true;
        return false;
      });

    if (students.length === 0) {
      return res.json({
        totalStudents: 0,
        totalScores: 0,
        classAverage: 0,
        distribution: { advanced: 0, proficient: 0, basic: 0, needsHelp: 0 },
        topicPerformance: [],
        atRiskStudents: [],
        studentsSummary: [],
      });
    }

    // Get teacher's subject
    const teacherDoc = await db.collection('users').doc(String(teacherId)).get();
    const teacherData = teacherDoc.exists ? teacherDoc.data() : {};
    let teacherSubject = teacherData.subject || '';
    if (String(teacherId) === 'vXbo2eCYo1LepXt7bUNa' && !teacherSubject) {
      teacherSubject = 'Chemistry';
    }
    if (String(teacherId) === 'QuF7Hq7aC0euzP2DEKaW' && !teacherSubject) {
      teacherSubject = 'Physics';
    }

    const studentIds = students.map((s) => s.id);
    const allScoresSnapshot = await db.collection('scores').get();

    // If teacherSubject is still empty, detect from any score recorded by teacher
    if (!teacherSubject) {
      const anyScore = allScoresSnapshot.docs.find((d) => String(d.data().teacher_id) === String(teacherId));
      if (anyScore) teacherSubject = anyScore.data().subject;
    }

    // Filter classScores strictly to this teacher's subject or recorded by this teacher
    const classScores = allScoresSnapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((s) => {
        if (!studentIds.includes(String(s.student_id))) return false;
        if (s.teacher_id && String(s.teacher_id) === String(teacherId)) return true;
        if (teacherSubject && subjectsMatch(s.subject, teacherSubject)) return true;
        return false;
      });

    const scoresByStudent = {};
    studentIds.forEach((id) => (scoresByStudent[id] = []));
    classScores.forEach((s) => {
      if (scoresByStudent[String(s.student_id)]) {
        scoresByStudent[String(s.student_id)].push(s);
      }
    });

    // Compute composite for each student
    let totalCompositeSum = 0;
    let studentsWithScoresCount = 0;
    const distribution = { advanced: 0, proficient: 0, basic: 0, needsHelp: 0 };
    const atRiskStudents = [];
    const studentsSummary = [];

    students.forEach((student) => {
      const scores = scoresByStudent[student.id] || [];
      const composite = calculateCompositeScore(scores);

      // Only classify students who have scores recorded in this subject
      if (scores.length > 0) {
        totalCompositeSum += composite;
        studentsWithScoresCount++;

        // Mastery categories
        if (composite >= 80) distribution.advanced++;
        else if (composite >= 65) distribution.proficient++;
        else if (composite >= 50) distribution.basic++;
        else distribution.needsHelp++;

        // Identify weak topics for this student
        const weakTopics = scores
          .filter((s) => s.max_score > 0 && (s.score / s.max_score) < 0.6)
          .map((s) => s.topic)
          .filter(Boolean);

        if (composite < 60 || weakTopics.length >= 2) {
          atRiskStudents.push({
            id: student.id,
            name: student.name,
            class_name: student.class_name,
            compositeScore: composite,
            scoresCount: scores.length,
            weakTopics: [...new Set(weakTopics)],
          });
        }
      }

      studentsSummary.push({
        id: student.id,
        name: student.name,
        class_name: student.class_name,
        access_code: student.access_code,
        compositeScore: composite,
        scoresCount: scores.length,
      });
    });

    const classAverage = studentsWithScoresCount > 0
      ? Number((totalCompositeSum / studentsWithScoresCount).toFixed(1))
      : 0;

    // Aggregate topic difficulty across class by Assessment Category
    const topicAgg = {};
    classScores.forEach((s) => {
      if (!s.topic) return;
      const key = s.topic.trim();
      if (!topicAgg[key]) {
        topicAgg[key] = {
          topic: key,
          subject: s.subject || 'General',
          totalScore: 0,
          totalMax: 0,
          count: 0,
          byCategory: {
            exam: 0,
            quiz: 0,
            assignment: 0,
            participation: 0,
          },
        };
      }
      topicAgg[key].totalScore += Number(s.score) || 0;
      topicAgg[key].totalMax += Number(s.max_score) || 0;
      topicAgg[key].count++;

      const cat = (s.type || 'quiz').toLowerCase();
      if (topicAgg[key].byCategory[cat] !== undefined) {
        topicAgg[key].byCategory[cat]++;
      }
    });

    const topicPerformance = Object.values(topicAgg).map((t) => {
      const avgPct = t.totalMax > 0 ? Number(((t.totalScore / t.totalMax) * 100).toFixed(1)) : 0;
      let status = 'Mastered';
      if (avgPct < 55) status = 'Needs Review';
      else if (avgPct < 75) status = 'In Progress';
      return {
        topic: t.topic,
        subject: t.subject,
        avgPct,
        count: t.count,
        byCategory: t.byCategory,
        status,
      };
    }).sort((a, b) => a.avgPct - b.avgPct);

    res.json({
      totalStudents: students.length,
      totalScores: classScores.length,
      classAverage,
      distribution,
      topicPerformance,
      atRiskStudents,
      studentsSummary,
    });
  } catch (err) {
    console.error('Teacher analytics error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 2. Student Individual Analytics
app.get('/api/students/:id/analytics', requireDb, async (req, res) => {
  try {
    const db = req.db;
    const studentId = req.params.id;

    const studentDoc = await db.collection('students').doc(studentId).get();
    if (!studentDoc.exists) return res.status(404).json({ error: 'Student not found' });

    const scoresSnapshot = await db
      .collection('scores')
      .where('student_id', '==', String(studentId))
      .get();

    const scores = scoresSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    const compositeScore = calculateCompositeScore(scores);

    // Subject breakdown with topic grouping
    const subjectMap = {};
    scores.forEach((s) => {
      const sub = s.subject || 'General';
      if (!subjectMap[sub]) {
        subjectMap[sub] = { subject: sub, totalScore: 0, totalMax: 0, scoresCount: 0, topics: {} };
      }
      subjectMap[sub].totalScore += Number(s.score) || 0;
      subjectMap[sub].totalMax += Number(s.max_score) || 0;
      subjectMap[sub].scoresCount++;

      if (s.topic) {
        const top = s.topic.trim();
        if (!subjectMap[sub].topics[top]) {
          subjectMap[sub].topics[top] = { topic: top, totalScore: 0, totalMax: 0, count: 0 };
        }
        subjectMap[sub].topics[top].totalScore += Number(s.score) || 0;
        subjectMap[sub].topics[top].totalMax += Number(s.max_score) || 0;
        subjectMap[sub].topics[top].count++;
      }
    });

    const subjectBreakdown = Object.values(subjectMap).map((sm) => {
      const avgPct = sm.totalMax > 0 ? Number(((sm.totalScore / sm.totalMax) * 100).toFixed(1)) : 0;
      const topicList = Object.values(sm.topics).map((tp) => ({
        topic: tp.topic,
        avgPct: tp.totalMax > 0 ? Number(((tp.totalScore / tp.totalMax) * 100).toFixed(1)) : 0,
        count: tp.count,
      }));
      return {
        subject: sm.subject,
        avgPct,
        scoresCount: sm.scoresCount,
        topics: topicList,
      };
    });

    // Subject-level strengths (>=75%) and focus areas (<60%)
    const subjectStrengths = subjectBreakdown.filter((s) => s.avgPct >= 75);
    const subjectWeaknesses = subjectBreakdown.filter((s) => s.avgPct < 60);

    // Overall topic breakdown
    const topicMap = {};
    scores.forEach((s) => {
      if (!s.topic) return;
      const top = s.topic.trim();
      if (!topicMap[top]) topicMap[top] = { topic: top, subject: s.subject || 'General', totalScore: 0, totalMax: 0 };
      topicMap[top].totalScore += Number(s.score) || 0;
      topicMap[top].totalMax += Number(s.max_score) || 0;
    });

    const topics = Object.values(topicMap).map((t) => {
      const avgPct = t.totalMax > 0 ? Number(((t.totalScore / t.totalMax) * 100).toFixed(1)) : 0;
      return {
        topic: t.topic,
        subject: t.subject,
        avgPct,
        isWeak: avgPct < 60,
      };
    });

    const strengths = topics.filter((t) => t.avgPct >= 75);
    const weaknesses = topics.filter((t) => t.avgPct < 60);

    res.json({
      compositeScore,
      totalScores: scores.length,
      subjectBreakdown,
      subjectStrengths,
      subjectWeaknesses,
      topics,
      strengths,
      weaknesses,
    });
  } catch (err) {
    console.error('Student analytics error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. Learn with AI Materials Generator
app.post('/api/students/:id/personalized-materials', requireDb, async (req, res) => {
  try {
    const db = req.db;
    const studentId = req.params.id;
    const requestedTopic = req.body?.topic;

    const studentDoc = await db.collection('students').doc(studentId).get();
    if (!studentDoc.exists) return res.status(404).json({ error: 'Student not found' });
    const student = studentDoc.data();

    const scoresSnapshot = await db
      .collection('scores')
      .where('student_id', '==', String(studentId))
      .get();
    const scores = scoresSnapshot.docs.map((d) => d.data());

    // Determine target topic
    let targetTopic = requestedTopic;
    let targetSubject = req.body?.subject || '';

    if (!targetTopic && scores.length > 0) {
      const lowest = [...scores].sort((a, b) => (a.score / a.max_score) - (b.score / b.max_score))[0];
      if (lowest && lowest.topic) {
        targetTopic = lowest.topic;
        targetSubject = lowest.subject || '';
      }
    }

    if (!targetTopic) targetTopic = 'Core Concept Review';

    const prompt = `You are an advanced educational AI tutor specializing in secondary school curriculum.
Generate a structured, interactive, and personalized micro-learning unit for student "${student.name}".
${targetSubject ? `Subject: ${targetSubject}` : ''}
Target Topic: "${targetTopic}"
Student's Recent Performance Context: ${JSON.stringify(scores.slice(-5))}

Please produce the unit in clean JSON format with these exact keys:
{
  "topic": "${targetTopic}",
  "subject": "${targetSubject}",
  "level": "Adaptive Study Unit",
  "learningObjective": "1-sentence actionable goal",
  "conceptBreakdown": "Clear, intuitive explanation broken into 2-3 short core ideas. Use an everyday analogy.",
  "workedExample": {
    "problem": "A realistic sample question/problem on this topic",
    "stepByStepSolution": [
      "Step 1: Identify what is given and required...",
      "Step 2: Apply the key principle or formula...",
      "Step 3: Calculate or conclude with final answer..."
    ],
    "explanation": "Why this approach works and key takeaways"
  },
  "proTips": [
    "Common mistake students make and how to avoid it",
    "Memory anchor or shortcut formula"
  ],
  "selfCheckQuestions": [
    {
      "question": "Quick self-check question",
      "answer": "Answer with concise explanation"
    },
    {
      "question": "Second check question",
      "answer": "Answer with concise explanation"
    }
  ]
}

Respond ONLY with valid JSON. Do not include markdown code block quotes.`;

    const aiResponse = await callGroqAI(
      prompt,
      'You are a high-level educational AI engine creating structured micro-learning resources. Output strict JSON only.'
    );

    let parsed = null;
    try {
      // Strip potential backticks if AI wrapped in ```json
      const cleaned = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (_) {
      parsed = {
        topic: targetTopic,
        subject: targetSubject,
        rawContent: aiResponse,
      };
    }

    res.json({ materials: parsed });
  } catch (err) {
    console.error('Personalized materials error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 4. Interactive Adaptive Practice Quiz Generator
app.post('/api/students/:id/practice-quiz', requireDb, async (req, res) => {
  try {
    const db = req.db;
    const studentId = req.params.id;
    const requestedTopic = req.body?.topic;

    const studentDoc = await db.collection('students').doc(studentId).get();
    if (!studentDoc.exists) return res.status(404).json({ error: 'Student not found' });

    const scoresSnapshot = await db
      .collection('scores')
      .where('student_id', '==', String(studentId))
      .get();
    const scores = scoresSnapshot.docs.map((d) => d.data());

    let targetTopic = requestedTopic;
    let targetSubject = req.body?.subject || '';

    if (!targetTopic && scores.length > 0) {
      const lowest = [...scores].sort((a, b) => (a.score / a.max_score) - (b.score / b.max_score))[0];
      if (lowest && lowest.topic) {
        targetTopic = lowest.topic;
        targetSubject = lowest.subject || '';
      }
    }
    if (!targetTopic) targetTopic = 'Fundamental Concepts';

    const prompt = `Create a 3-question adaptive diagnostic quiz for high school topic "${targetTopic}"${targetSubject ? ` (${targetSubject})` : ''}.
Respond strictly in JSON format with this structure:
{
  "topic": "${targetTopic}",
  "subject": "${targetSubject}",
  "questions": [
    {
      "id": 1,
      "question": "Question prompt here",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "hint": "A helpful hint without giving away the direct answer",
      "explanation": "Detailed explanation of why this option is correct and why others are wrong"
    }
  ]
}

Provide exactly 3 questions ranging from foundational to moderate difficulty. Output valid JSON only, no markdown markers.`;

    const aiResponse = await callGroqAI(
      prompt,
      'You are an expert diagnostic test designer for secondary school assessment. Output pure JSON only.'
    );

    let parsed = null;
    try {
      const cleaned = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (_) {
      throw new Error('Failed to parse AI quiz generation. Please retry.');
    }

    res.json({ quiz: parsed });
  } catch (err) {
    console.error('Quiz generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;

if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
}

module.exports = app;