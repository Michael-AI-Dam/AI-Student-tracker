import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [students, setStudents] = useState([])
  const [studentsLoading, setStudentsLoading] = useState(false)

  // Auth state
  const [currentUser, setCurrentUser] = useState(null)
  const [authMode, setAuthMode] = useState('login')
  const [authName, setAuthName] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authRole, setAuthRole] = useState('teacher')
  const [accessCode, setAccessCode] = useState('')
  const [authError, setAuthError] = useState('')

  // New student form state
  const [newStudentName, setNewStudentName] = useState('')
  const [newStudentClass, setNewStudentClass] = useState('')
  const [studentMessage, setStudentMessage] = useState('')

  // Score form state
  const [studentId, setStudentId] = useState('')
  const [type, setType] = useState('quiz')
  const [subject, setSubject] = useState('Chemistry')
  const [topic, setTopic] = useState('')
  const [score, setScore] = useState('')
  const [maxScore, setMaxScore] = useState('')
  const [message, setMessage] = useState('')

  // Profile view state
  const [profileStudentId, setProfileStudentId] = useState('')
  const [profile, setProfile] = useState(null)
  const [recommendation, setRecommendation] = useState('')
  const [loadingRec, setLoadingRec] = useState(false)

  const fetchStudents = (teacherId) => {
    setStudentsLoading(true)
    fetch(`http://localhost:3001/api/students?teacher_id=${teacherId}`)
      .then((res) => res.json())
      .then((data) => {
        setStudents(data)
        setStudentsLoading(false)
        if (data.length > 0) {
          setStudentId((prev) => prev || data[0].id)
          setProfileStudentId((prev) => prev || data[0].id)
        }
      })
      .catch(() => setStudentsLoading(false))
  }

  useEffect(() => {
    if (currentUser?.role === 'teacher') {
      fetchStudents(currentUser.id)
    }
  }, [currentUser])

  const fetchProfile = (id) => {
    fetch(`http://localhost:3001/api/students/${id}/profile`)
      .then((res) => res.json())
      .then((data) => setProfile(data))
  }

  const fetchRecommendation = (id) => {
    setLoadingRec(true)
    setRecommendation('')
    fetch(`http://localhost:3001/api/students/${id}/recommendation`)
      .then((res) => res.json())
      .then((data) => {
        setRecommendation(data.recommendation)
        setLoadingRec(false)
      })
      .catch((err) => {
        setRecommendation('Error: ' + err.message)
        setLoadingRec(false)
      })
  }

  useEffect(() => {
    if (profileStudentId) fetchProfile(profileStudentId)
  }, [profileStudentId])

  useEffect(() => {
    if (currentUser?.role === 'student' && currentUser.student_id) {
      setProfileStudentId(currentUser.student_id)
    }
  }, [currentUser])

  const handleLogin = (e) => {
    e.preventDefault()
    setAuthError('')

    fetch('http://localhost:3001/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: authEmail, password: authPassword }),
    })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setCurrentUser(data)
      })
      .catch((err) => setAuthError(err.message))
  }

  const handleSignup = (e) => {
    e.preventDefault()
    setAuthError('')

    fetch('http://localhost:3001/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: authName,
        email: authEmail,
        password: authPassword,
        role: authRole,
        access_code: authRole === 'student' ? accessCode : null,
      }),
    })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setCurrentUser(data)
      })
      .catch((err) => setAuthError(err.message))
  }

  const handleLogout = () => {
    setCurrentUser(null)
    setAuthEmail('')
    setAuthPassword('')
    setAuthName('')
    setAccessCode('')
    setStudents([])
    setProfile(null)
    setRecommendation('')
  }

  const handleAddStudent = (e) => {
    e.preventDefault()
    setStudentMessage('')

    fetch('http://localhost:3001/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newStudentName,
        class_name: newStudentClass,
        teacher_id: currentUser.id,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setStudentMessage(`Student added! Share this access code with them: ${data.access_code}`)
        setNewStudentName('')
        setNewStudentClass('')
        fetchStudents(currentUser.id)
      })
      .catch((err) => setStudentMessage('Error: ' + err.message))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setMessage('')

    fetch('http://localhost:3001/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: Number(studentId),
        type,
        subject,
        topic,
        score: Number(score),
        max_score: Number(maxScore),
      }),
    })
      .then((res) => res.json())
      .then(() => {
        setMessage('Score added successfully!')
        setTopic('')
        setScore('')
        setMaxScore('')
        if (Number(studentId) === Number(profileStudentId)) {
          fetchProfile(profileStudentId)
        }
      })
      .catch((err) => setMessage('Error: ' + err.message))
  }

  const calculateComposite = (scores) => {
    const weights = { exam: 0.5, quiz: 0.2, assignment: 0.2, participation: 0.1 }
    const byType = {}

    scores.forEach((s) => {
      if (!byType[s.type]) byType[s.type] = { totalScore: 0, totalMax: 0 }
      byType[s.type].totalScore += s.score
      byType[s.type].totalMax += s.max_score
    })

    let weightedSum = 0
    let weightUsed = 0

    Object.entries(byType).forEach(([type, { totalScore, totalMax }]) => {
      if (totalMax > 0 && weights[type]) {
        const pct = (totalScore / totalMax) * 100
        weightedSum += pct * weights[type]
        weightUsed += weights[type]
      }
    })

    return weightUsed > 0 ? (weightedSum / weightUsed).toFixed(1) : null
  }

  if (!currentUser) {
    return (
      <div className="app" style={{ maxWidth: '400px', paddingTop: '60px' }}>
        <h1 style={{ textAlign: 'center' }}>Student Tracker</h1>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', justifyContent: 'center' }}>
          <button
            onClick={() => { setAuthMode('login'); setAuthError('') }}
            style={{ background: authMode === 'login' ? '#1a3c5e' : '#a0aec0' }}
          >
            Login
          </button>
          <button
            onClick={() => { setAuthMode('signup'); setAuthError('') }}
            style={{ background: authMode === 'signup' ? '#1a3c5e' : '#a0aec0' }}
          >
            Sign Up
          </button>
        </div>

        {authMode === 'login' ? (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label>
              Email:
              <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required />
            </label>
            <label>
              Password:
              <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} required />
            </label>
            <button type="submit">Log In</button>
          </form>
        ) : (
          <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label>
              Name:
              <input value={authName} onChange={(e) => setAuthName(e.target.value)} required />
            </label>
            <label>
              Email:
              <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required />
            </label>
            <label>
              Password:
              <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} required />
            </label>
            <label>
              I am a:
              <select value={authRole} onChange={(e) => setAuthRole(e.target.value)}>
                <option value="teacher">Teacher</option>
                <option value="student">Student</option>
              </select>
            </label>

            {authRole === 'student' && (
              <label>
                Access Code (from your teacher):
                <input
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  placeholder="e.g. AB12CD"
                  required
                />
              </label>
            )}

            <button type="submit">Sign Up</button>
          </form>
        )}

        {authError && <p style={{ color: '#c53030' }}>{authError}</p>}
      </div>
    )
  }

  return (
    <div className="app">
      <button onClick={handleLogout} style={{ marginBottom: '16px', background: '#718096' }}>
        Log Out ({currentUser.name})
      </button>

      <h1>Student Tracker {currentUser.role === 'teacher' ? '— Teacher View' : '— Student View'}</h1>

      {currentUser.role === 'teacher' && (
        <>
          <h2>Your Students</h2>
          {studentsLoading ? (
            <p>Loading students...</p>
          ) : students.length === 0 ? (
            <p>You haven't added any students yet.</p>
          ) : (
            <ul>
              {students.map((s) => (
                <li key={s.id}>
                  {s.name} — {s.class_name} <span style={{ color: '#666', fontSize: '13px' }}>(Access Code: {s.access_code})</span>
                </li>
              ))}
            </ul>
          )}

          <h3>Add a New Student</h3>
          <form onSubmit={handleAddStudent} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
            <label>
              Name:
              <input value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} required />
            </label>
            <label>
              Class:
              <input value={newStudentClass} onChange={(e) => setNewStudentClass(e.target.value)} placeholder="e.g. SS2 Chemistry" />
            </label>
            <button type="submit">Add Student</button>
          </form>
          {studentMessage && <p>{studentMessage}</p>}

          {students.length > 0 && (
            <>
              <h2>Add a Score</h2>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label>
                  Student:
                  <select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Type:
                  <select value={type} onChange={(e) => setType(e.target.value)}>
                    <option value="exam">Exam</option>
                    <option value="quiz">Quiz</option>
                    <option value="assignment">Assignment</option>
                    <option value="participation">Participation</option>
                  </select>
                </label>

                <label>
                  Subject:
                  <input value={subject} onChange={(e) => setSubject(e.target.value)} />
                </label>

                <label>
                  Topic:
                  <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. stoichiometry" />
                </label>

                <label>
                  Score:
                  <input type="number" value={score} onChange={(e) => setScore(e.target.value)} required />
                </label>

                <label>
                  Max Score:
                  <input type="number" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} required />
                </label>

                <button type="submit">Add Score</button>
              </form>

              {message && <p>{message}</p>}
            </>
          )}

          <hr />
        </>
      )}

      <h2>Student Profile</h2>

      {currentUser.role === 'teacher' ? (
        students.length > 0 ? (
          <label>
            View profile for:
            <select value={profileStudentId} onChange={(e) => setProfileStudentId(e.target.value)}>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p>Add a student above to view their profile.</p>
        )
      ) : (
        <p>Viewing your own profile.</p>
      )}

      {profile && (
        <div style={{ marginTop: '16px' }}>
          <h3>{profile.student.name} — {profile.student.class_name}</h3>

          {profile.scores.length === 0 ? (
            <p>No scores recorded yet.</p>
          ) : (
            <>
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Subject</th>
                    <th>Topic</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.scores.map((s) => (
                    <tr key={s.id}>
                      <td>{s.type}</td>
                      <td>{s.subject}</td>
                      <td>{s.topic}</td>
                      <td>{s.score}/{s.max_score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <p style={{ marginTop: '12px', fontSize: '18px', fontWeight: 'bold' }}>
                Composite Score: {calculateComposite(profile.scores)}%
              </p>
              <p style={{ fontSize: '13px', color: '#666' }}>
                (Weighted: 50% exams, 20% quizzes, 20% assignments, 10% participation — reflects performance across all activities, not just exams)
              </p>

              <button onClick={() => fetchRecommendation(profileStudentId)} style={{ marginTop: '12px' }}>
                Get AI Recommendation
              </button>

              {loadingRec && <p>Generating recommendation...</p>}

              {recommendation && (
                <div style={{ marginTop: '12px', padding: '12px', background: '#f0f8ff', border: '1px solid #ccc', whiteSpace: 'pre-wrap' }}>
                  <strong>AI Recommendation:</strong>
                  <p>{recommendation}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default App