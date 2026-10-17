import { useEffect, useState } from 'react'
import './App.css'

const API_URL = (import.meta.env.VITE_API_URL || 'https://ai-student-tracker-stem.vercel.app').replace(/\/$/, '')

function App() {
  // Auth state
  const [currentUser, setCurrentUser] = useState(null)
  const [authMode, setAuthMode] = useState('login') // 'login' | 'signup' | 'forgot'
  const [authName, setAuthName] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [authRole, setAuthRole] = useState('teacher')
  const [accessCode, setAccessCode] = useState('')
  const [authError, setAuthError] = useState('')
  const [authSuccess, setAuthSuccess] = useState('')

  // Active Tab
  const [activeTab, setActiveTab] = useState('analytics')

  // Teacher State
  const [students, setStudents] = useState([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [teacherAnalytics, setTeacherAnalytics] = useState(null)
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)

  // Forms State
  const [newStudentName, setNewStudentName] = useState('')
  const [newStudentClass, setNewStudentClass] = useState('')
  const [studentMessage, setStudentMessage] = useState('')

  const [studentId, setStudentId] = useState('')
  const [scoreType, setScoreType] = useState('quiz')
  const [subject, setSubject] = useState('Chemistry')
  const [topic, setTopic] = useState('')
  const [scoreVal, setScoreVal] = useState('')
  const [maxScoreVal, setMaxScoreVal] = useState('')
  const [scoreMessage, setScoreMessage] = useState('')

  // Individual Student Profile View
  const [profileStudentId, setProfileStudentId] = useState('')
  const [profile, setProfile] = useState(null)
  const [recommendation, setRecommendation] = useState('')
  const [loadingRec, setLoadingRec] = useState(false)

  // Student Dashboard State
  const [studentAnalytics, setStudentAnalytics] = useState(null)
  const [loadingStudentAnalytics, setLoadingStudentAnalytics] = useState(false)

  // Learn with AI Materials State
  const [selectedTopicForStudy, setSelectedTopicForStudy] = useState('')
  const [studyMaterials, setStudyMaterials] = useState(null)
  const [loadingStudy, setLoadingStudy] = useState(false)
  const [revealedAnswers, setRevealedAnswers] = useState({})

  // Adaptive Quiz State
  const [selectedTopicForQuiz, setSelectedTopicForQuiz] = useState('')
  const [quizData, setQuizData] = useState(null)
  const [loadingQuiz, setLoadingQuiz] = useState(false)
  const [userQuizAnswers, setUserQuizAnswers] = useState({})
  const [revealedHints, setRevealedHints] = useState({})

  // Helper to format student label: Name (Class) — no long hyphens
  const formatStudentLabel = (name, className) => {
    if (!name) return ''
    return className ? `${name} (${className})` : name
  }

  // Clicking Logo takes user back to their main dashboard
  const handleLogoClick = () => {
    if (currentUser) {
      setActiveTab(currentUser.role === 'teacher' ? 'analytics' : 'student_dashboard')
    }
  }

  // Fetch Students for Teacher
  const fetchStudents = (teacherId) => {
    setStudentsLoading(true)
    fetch(`${API_URL}/api/students?teacher_id=${encodeURIComponent(teacherId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setStudents(data)
          if (data.length > 0) {
            setStudentId((prev) => prev || data[0].id)
            setProfileStudentId((prev) => prev || data[0].id)
          }
        } else {
          setStudents([])
        }
        setStudentsLoading(false)
      })
      .catch(() => setStudentsLoading(false))
  }

  // Fetch Teacher Analytics
  const fetchTeacherAnalytics = (teacherId) => {
    setLoadingAnalytics(true)
    fetch(`${API_URL}/api/teachers/${encodeURIComponent(teacherId)}/analytics`)
      .then((res) => res.json())
      .then((data) => {
        setTeacherAnalytics(data)
        setLoadingAnalytics(false)
      })
      .catch((err) => {
        console.error('Analytics error:', err)
        setLoadingAnalytics(false)
      })
  }

  // Fetch Student Individual Analytics
  const fetchStudentAnalytics = (studId) => {
    setLoadingStudentAnalytics(true)
    fetch(`${API_URL}/api/students/${encodeURIComponent(studId)}/analytics`)
      .then((res) => res.json())
      .then((data) => {
        setStudentAnalytics(data)
        setLoadingStudentAnalytics(false)
      })
      .catch((err) => {
        console.error('Student analytics error:', err)
        setLoadingStudentAnalytics(false)
      })
  }

  const fetchProfile = (id) => {
    fetch(`${API_URL}/api/students/${encodeURIComponent(id)}/profile`)
      .then((res) => res.json())
      .then((data) => setProfile(data))
      .catch((err) => console.error('Fetch profile error:', err))
  }

  const fetchRecommendation = (id) => {
    setLoadingRec(true)
    setRecommendation('')
    fetch(`${API_URL}/api/students/${encodeURIComponent(id)}/recommendation`)
      .then((res) => res.json())
      .then((data) => {
        setRecommendation(data.recommendation || data.error || 'No recommendation received.')
        setLoadingRec(false)
      })
      .catch((err) => {
        setRecommendation('Error: ' + err.message)
        setLoadingRec(false)
      })
  }

  // Study Materials Generator
  const handleGenerateMaterials = (topicToUse) => {
    const targetId = currentUser?.role === 'student' ? currentUser.student_id : profileStudentId
    if (!targetId) return
    setLoadingStudy(true)
    setStudyMaterials(null)
    setRevealedAnswers({})

    fetch(`${API_URL}/api/students/${encodeURIComponent(targetId)}/personalized-materials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: topicToUse || selectedTopicForStudy }),
    })
      .then((res) => res.json())
      .then((data) => {
        setStudyMaterials(data.materials || null)
        setLoadingStudy(false)
      })
      .catch((err) => {
        console.error('Study material generation error:', err)
        setLoadingStudy(false)
      })
  }

  // Adaptive Quiz Generator
  const handleGenerateQuiz = (topicToUse) => {
    const targetId = currentUser?.role === 'student' ? currentUser.student_id : profileStudentId
    if (!targetId) return
    setLoadingQuiz(true)
    setQuizData(null)
    setUserQuizAnswers({})
    setRevealedHints({})

    fetch(`${API_URL}/api/students/${encodeURIComponent(targetId)}/practice-quiz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: topicToUse || selectedTopicForQuiz }),
    })
      .then((res) => res.json())
      .then((data) => {
        setQuizData(data.quiz || null)
        setLoadingQuiz(false)
      })
      .catch((err) => {
        console.error('Quiz generation error:', err)
        setLoadingQuiz(false)
      })
  }

  useEffect(() => {
    if (currentUser?.role === 'teacher') {
      fetchStudents(currentUser.id)
      fetchTeacherAnalytics(currentUser.id)
    } else if (currentUser?.role === 'student' && currentUser.student_id) {
      setProfileStudentId(currentUser.student_id)
      fetchProfile(currentUser.student_id)
      fetchStudentAnalytics(currentUser.student_id)
    }
  }, [currentUser])

  useEffect(() => {
    if (profileStudentId) {
      fetchProfile(profileStudentId)
    }
  }, [profileStudentId])

  const handleLogin = (e) => {
    e.preventDefault()
    setAuthError('')
    setAuthSuccess('')
    fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: authEmail, password: authPassword }),
    })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Login failed')
        setCurrentUser(data)
        setActiveTab(data.role === 'teacher' ? 'analytics' : 'student_dashboard')
      })
      .catch((err) => setAuthError(err.message))
  }

  const handleSignup = (e) => {
    e.preventDefault()
    setAuthError('')
    setAuthSuccess('')
    fetch(`${API_URL}/api/signup`, {
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
        if (!res.ok) throw new Error(data.error || 'Signup failed')
        setCurrentUser(data)
        setActiveTab(data.role === 'teacher' ? 'analytics' : 'student_dashboard')
      })
      .catch((err) => setAuthError(err.message))
  }

  const handleResetPassword = (e) => {
    e.preventDefault()
    setAuthError('')
    setAuthSuccess('')

    if (authPassword !== confirmPassword) {
      setAuthError('Passwords do not match. Please re-enter.')
      return
    }

    if (authPassword.length < 6) {
      setAuthError('New password must be at least 6 characters long.')
      return
    }

    fetch(`${API_URL}/api/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: authEmail,
        newPassword: authPassword,
      }),
    })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Password reset failed')
        setAuthSuccess(data.message || 'Password reset successfully! You can now log in.')
        setAuthPassword('')
        setConfirmPassword('')
      })
      .catch((err) => setAuthError(err.message))
  }

  const handleLogout = () => {
    setCurrentUser(null)
    setAuthEmail('')
    setAuthPassword('')
    setConfirmPassword('')
    setAuthName('')
    setAccessCode('')
    setAuthError('')
    setAuthSuccess('')
    setStudents([])
    setProfile(null)
    setRecommendation('')
    setTeacherAnalytics(null)
    setStudentAnalytics(null)
    setStudyMaterials(null)
    setQuizData(null)
  }

  const handleAddStudent = (e) => {
    e.preventDefault()
    setStudentMessage('')
    fetch(`${API_URL}/api/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newStudentName,
        class_name: newStudentClass,
        teacher_id: currentUser.id,
      }),
    })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to add student')
        setStudentMessage(`Student registered! Access Code: ${data.access_code}`)
        setNewStudentName('')
        setNewStudentClass('')
        fetchStudents(currentUser.id)
        fetchTeacherAnalytics(currentUser.id)
      })
      .catch((err) => setStudentMessage('Error: ' + err.message))
  }

  const handleAddScore = (e) => {
    e.preventDefault()
    setScoreMessage('')
    fetch(`${API_URL}/api/scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: studentId,
        type: scoreType,
        subject,
        topic,
        score: Number(scoreVal),
        max_score: Number(maxScoreVal),
      }),
    })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to add score')
        setScoreMessage('Assessment score recorded successfully!')
        setTopic('')
        setScoreVal('')
        setMaxScoreVal('')
        fetchTeacherAnalytics(currentUser.id)
        if (String(studentId) === String(profileStudentId)) {
          fetchProfile(profileStudentId)
        }
      })
      .catch((err) => setScoreMessage('Error: ' + err.message))
  }

  const calculateComposite = (scores) => {
    if (!scores || !Array.isArray(scores) || scores.length === 0) return null
    const weights = { exam: 0.5, quiz: 0.2, assignment: 0.2, participation: 0.1 }
    const byType = {}

    scores.forEach((s) => {
      if (!byType[s.type]) byType[s.type] = { totalScore: 0, totalMax: 0 }
      byType[s.type].totalScore += Number(s.score) || 0
      byType[s.type].totalMax += Number(s.max_score) || 0
    })

    let weightedSum = 0
    let weightUsed = 0

    Object.entries(byType).forEach(([t, { totalScore, totalMax }]) => {
      if (totalMax > 0 && weights[t]) {
        const pct = (totalScore / totalMax) * 100
        weightedSum += pct * weights[t]
        weightUsed += weights[t]
      }
    })

    return weightUsed > 0 ? (weightedSum / weightUsed).toFixed(1) : null
  }

  // --- Auth View ---
  if (!currentUser) {
    return (
      <div className="tracker-container" style={{ maxWidth: '440px', paddingTop: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div className="brand-icon" style={{ margin: '0 auto 12px', width: '52px', height: '52px', fontSize: '24px' }}>
            🎓
          </div>
          <h1 style={{ fontSize: '23px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            AI Student Tracker
          </h1>
          <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>
            Personalized Learning & Performance Assessment Platform
          </p>
        </div>

        <div className="data-card" style={{ padding: '26px' }}>
          {/* Top Mode Selector Tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            <button
              onClick={() => { setAuthMode('login'); setAuthError(''); setAuthSuccess('') }}
              className={authMode === 'login' ? 'btn-primary' : 'btn-secondary'}
              style={{ flex: 1 }}
            >
              Log In
            </button>
            <button
              onClick={() => { setAuthMode('signup'); setAuthError(''); setAuthSuccess('') }}
              className={authMode === 'signup' ? 'btn-primary' : 'btn-secondary'}
              style={{ flex: 1 }}
            >
              Sign Up
            </button>
          </div>

          {/* Form: LOGIN */}
          {authMode === 'login' && (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px', border: 'none', padding: 0, boxShadow: 'none' }}>
              <label>
                Email Address:
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="name@school.edu"
                  required
                />
              </label>
              <label>
                Password:
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => { setAuthMode('forgot'); setAuthError(''); setAuthSuccess('') }}
                  style={{ background: 'transparent', border: 'none', color: '#2563eb', padding: 0, fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}
                >
                  Forgot password?
                </button>
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: '4px', padding: '12px' }}>
                Sign In to Dashboard
              </button>
            </form>
          )}

          {/* Form: SIGN UP */}
          {authMode === 'signup' && (
            <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '14px', border: 'none', padding: 0, boxShadow: 'none' }}>
              <label>
                Full Name:
                <input
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  placeholder="e.g. Toheeb Adeleke"
                  required
                />
              </label>
              <label>
                Email Address:
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="name@school.edu"
                  required
                />
              </label>
              <label>
                Password:
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </label>
              <label>
                I am registering as:
                <select value={authRole} onChange={(e) => setAuthRole(e.target.value)}>
                  <option value="teacher">Teacher (Classroom Analytics Cockpit)</option>
                  <option value="student">Student (Personal Learning Portal)</option>
                </select>
              </label>
              {authRole === 'student' && (
                <label>
                  Access Code (provided by your teacher):
                  <input
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    placeholder="e.g. FAYJAS"
                    required
                  />
                </label>
              )}
              <button type="submit" className="btn-primary" style={{ marginTop: '6px', padding: '12px' }}>
                Create Account
              </button>
            </form>
          )}

          {/* Form: FORGOT / RESET PASSWORD */}
          {authMode === 'forgot' && (
            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px', border: 'none', padding: 0, boxShadow: 'none' }}>
              <div style={{ marginBottom: '4px' }}>
                <h4 style={{ margin: '0 0 4px', fontSize: '16px', color: '#0f172a' }}>Reset Your Password</h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                  Enter your registered email and choose a new password.
                </p>
              </div>

              <label>
                Registered Email Address:
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="name@school.edu"
                  required
                />
              </label>

              <label>
                New Password:
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                />
              </label>

              <label>
                Confirm New Password:
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                />
              </label>

              <button type="submit" className="btn-primary" style={{ marginTop: '6px', padding: '12px' }}>
                Save New Password
              </button>

              <button
                type="button"
                onClick={() => { setAuthMode('login'); setAuthError(''); setAuthSuccess('') }}
                className="btn-secondary"
                style={{ textAlign: 'center' }}
              >
                ← Back to Log In
              </button>
            </form>
          )}

          {/* Feedback messages */}
          {authError && (
            <p style={{ color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', padding: '10px 14px', borderRadius: '8px', marginTop: '14px', fontSize: '13px' }}>
              {authError}
            </p>
          )}

          {authSuccess && (
            <div style={{ marginTop: '14px', padding: '12px 14px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', borderRadius: '8px', fontSize: '13px' }}>
              {authSuccess}
              <div style={{ marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => { setAuthMode('login'); setAuthError(''); setAuthSuccess('') }}
                  className="btn-primary"
                  style={{ padding: '6px 14px', fontSize: '12px' }}
                >
                  Log In Now →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // --- Main Application View ---
  return (
    <div className="tracker-container">
      {/* Header — Clicking Logo returns user directly to their main dashboard */}
      <header className="tracker-header">
        <div
          className="brand-badge"
          onClick={handleLogoClick}
          style={{ cursor: 'pointer' }}
          title="Return to Main Dashboard"
        >
          <div className="brand-icon">🎓</div>
          <div>
            <h1 className="brand-title">AI Student Tracker</h1>
            <div className="brand-subtitle">
              {currentUser.role === 'teacher' ? 'Teacher Analytics Cockpit' : 'Student Learning Portal'}
            </div>
          </div>
        </div>

        <div className="user-controls">
          <span className={`role-pill ${currentUser.role}`}>
            {currentUser.role}
          </span>
          <span style={{ fontWeight: '600', fontSize: '14px', color: '#1e293b' }}>
            {currentUser.name}
          </span>
          <button onClick={handleLogout} className="btn-logout">
            Log Out
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="nav-tabs">
        {currentUser.role === 'teacher' ? (
          <>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            >
              📊 Class Overview & Analytics
            </button>
            <button
              onClick={() => setActiveTab('roster')}
              className={`tab-btn ${activeTab === 'roster' ? 'active' : ''}`}
            >
              👥 Student Roster ({students.length})
            </button>
            <button
              onClick={() => setActiveTab('scores')}
              className={`tab-btn ${activeTab === 'scores' ? 'active' : ''}`}
            >
              📝 Record Assessment
            </button>
            <button
              onClick={() => setActiveTab('profiles')}
              className={`tab-btn ${activeTab === 'profiles' ? 'active' : ''}`}
            >
              👤 Student Profiles & AI
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setActiveTab('student_dashboard')}
              className={`tab-btn ${activeTab === 'student_dashboard' ? 'active' : ''}`}
            >
              📈 My Performance & Mastery
            </button>
            <button
              onClick={() => setActiveTab('study_materials')}
              className={`tab-btn ${activeTab === 'study_materials' ? 'active' : ''}`}
            >
              📖 Learn with AI Materials
            </button>
            <button
              onClick={() => setActiveTab('practice_quiz')}
              className={`tab-btn ${activeTab === 'practice_quiz' ? 'active' : ''}`}
            >
              🎯 Adaptive Practice Quiz
            </button>
            <button
              onClick={() => setActiveTab('my_scores')}
              className={`tab-btn ${activeTab === 'my_scores' ? 'active' : ''}`}
            >
              📋 My Assessment History
            </button>
          </>
        )}
      </nav>

      {/* ============================================================== */}
      {/* TEACHER TAB 1: CLASS OVERVIEW & COCKPIT                        */}
      {/* ============================================================== */}
      {currentUser.role === 'teacher' && activeTab === 'analytics' && (
        <div>
          {loadingAnalytics ? (
            <p style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Analyzing classroom performance data...</p>
          ) : teacherAnalytics ? (
            <>
              {/* Metrics Grid */}
              <div className="metrics-grid">
                <div className="metric-card">
                  <span className="metric-label">Class Size</span>
                  <span className="metric-val">{teacherAnalytics.totalStudents}</span>
                  <span className="metric-sub">Registered Students</span>
                </div>
                <div className="metric-card">
                  <span className="metric-label">Class Average</span>
                  <span className="metric-val" style={{ color: teacherAnalytics.classAverage >= 70 ? '#059669' : teacherAnalytics.classAverage >= 50 ? '#d97706' : '#dc2626' }}>
                    {teacherAnalytics.classAverage}%
                  </span>
                  <span className="metric-sub">Weighted Composite</span>
                </div>
                <div className="metric-card">
                  <span className="metric-label">Total Assessments</span>
                  <span className="metric-val">{teacherAnalytics.totalScores}</span>
                  <span className="metric-sub">Exams, Quizzes & Assignments</span>
                </div>
                <div className="metric-card">
                  <span className="metric-label">Needing Support</span>
                  <span className="metric-val" style={{ color: teacherAnalytics.atRiskStudents.length > 0 ? '#dc2626' : '#059669' }}>
                    {teacherAnalytics.atRiskStudents.length}
                  </span>
                  <span className="metric-sub">Scores below 60%</span>
                </div>
              </div>

              {/* Mastery Distribution Bar */}
              {teacherAnalytics.totalStudents > 0 && (
                <div className="dist-container">
                  <h4 style={{ margin: '0 0 6px', fontSize: '15px', color: '#0f172a', fontWeight: '700' }}>
                    Student Mastery Distribution (Performance Standards)
                  </h4>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 12px' }}>
                    Holistic breakdown based on combined exam, quiz, assignment, and participation assessments.
                  </p>
                  <div className="dist-bar-wrapper">
                    {teacherAnalytics.distribution.advanced > 0 && (
                      <div
                        className="dist-segment dist-advanced"
                        style={{ width: `${(teacherAnalytics.distribution.advanced / teacherAnalytics.totalStudents) * 100}%` }}
                      >
                        {teacherAnalytics.distribution.advanced}
                      </div>
                    )}
                    {teacherAnalytics.distribution.proficient > 0 && (
                      <div
                        className="dist-segment dist-proficient"
                        style={{ width: `${(teacherAnalytics.distribution.proficient / teacherAnalytics.totalStudents) * 100}%` }}
                      >
                        {teacherAnalytics.distribution.proficient}
                      </div>
                    )}
                    {teacherAnalytics.distribution.basic > 0 && (
                      <div
                        className="dist-segment dist-basic"
                        style={{ width: `${(teacherAnalytics.distribution.basic / teacherAnalytics.totalStudents) * 100}%` }}
                      >
                        {teacherAnalytics.distribution.basic}
                      </div>
                    )}
                    {teacherAnalytics.distribution.needsHelp > 0 && (
                      <div
                        className="dist-segment dist-needs-help"
                        style={{ width: `${(teacherAnalytics.distribution.needsHelp / teacherAnalytics.totalStudents) * 100}%` }}
                      >
                        {teacherAnalytics.distribution.needsHelp}
                      </div>
                    )}
                  </div>
                  <div className="dist-legend">
                    <div className="dist-legend-item">
                      <div className="legend-dot" style={{ background: '#059669' }}></div>
                      Advanced (≥80%): {teacherAnalytics.distribution.advanced}
                    </div>
                    <div className="dist-legend-item">
                      <div className="legend-dot" style={{ background: '#2563eb' }}></div>
                      Proficient (65-79%): {teacherAnalytics.distribution.proficient}
                    </div>
                    <div className="dist-legend-item">
                      <div className="legend-dot" style={{ background: '#d97706' }}></div>
                      Basic (50-64%): {teacherAnalytics.distribution.basic}
                    </div>
                    <div className="dist-legend-item">
                      <div className="legend-dot" style={{ background: '#dc2626' }}></div>
                      Needs Support (&lt;50%): {teacherAnalytics.distribution.needsHelp}
                    </div>
                  </div>
                </div>
              )}

              {/* Early Intervention Alerts */}
              {teacherAnalytics.atRiskStudents.length > 0 && (
                <div className="intervention-box">
                  <div className="intervention-title">
                    ⚠️ Early Intervention Alert ({teacherAnalytics.atRiskStudents.length} Students Flagged)
                  </div>
                  <p className="intervention-desc">
                    The diagnostic engine identified students whose composite average is below 60% or who struggled on multiple topic assessments.
                  </p>
                  <div className="intervention-list">
                    {teacherAnalytics.atRiskStudents.map((s) => (
                      <div key={s.id} className="intervention-item">
                        <div>
                          <strong>{formatStudentLabel(s.name, s.class_name)}</strong> • Composite:{' '}
                          <span style={{ color: '#dc2626', fontWeight: 'bold' }}>{s.compositeScore}%</span>
                        </div>
                        {s.weakTopics?.length > 0 && (
                          <div style={{ fontSize: '12px', color: '#64748b' }}>
                            Needs review on: {s.weakTopics.join(', ')}
                          </div>
                        )}
                        <button
                          onClick={() => {
                            setProfileStudentId(s.id)
                            setActiveTab('profiles')
                          }}
                          className="btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                        >
                          View Student Profile →
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Class-Wide Topic Difficulty Matrix */}
              <div className="data-card">
                <h3>Class-Wide Topic Difficulty Matrix</h3>
                <p className="data-card-subtitle">
                  Ranked by difficulty. Topics at the top are where students struggled the most across all tests.
                </p>
                {teacherAnalytics.topicPerformance.length === 0 ? (
                  <p style={{ color: '#64748b' }}>No topic assessments recorded yet.</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Topic</th>
                        <th>Subject</th>
                        <th>Submissions</th>
                        <th>Class Average</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teacherAnalytics.topicPerformance.map((t, idx) => (
                        <tr key={idx}>
                          <td><strong>{t.topic}</strong></td>
                          <td>{t.subject}</td>
                          <td>{t.count}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ minWidth: '40px', fontWeight: '600' }}>{t.avgPct}%</span>
                              <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                <div
                                  style={{
                                    height: '100%',
                                    width: `${t.avgPct}%`,
                                    background: t.avgPct < 55 ? '#dc2626' : t.avgPct < 75 ? '#2563eb' : '#059669'
                                  }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${t.status === 'Needs Review' ? 'badge-review' : t.status === 'In Progress' ? 'badge-progress' : 'badge-mastered'}`}>
                              {t.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : (
            <p>No analytics data available yet. Add students and scores to see your classroom dashboard.</p>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TEACHER TAB 2: STUDENT ROSTER                                  */}
      {/* ============================================================== */}
      {currentUser.role === 'teacher' && activeTab === 'roster' && (
        <div>
          <div className="data-card">
            <h3>Add New Student to Classroom</h3>
            <p className="data-card-subtitle">
              Register a student to generate a unique access code they can use to view their private portal.
            </p>
            <form onSubmit={handleAddStudent} style={{ border: 'none', padding: 0, boxShadow: 'none' }}>
              <div className="form-grid">
                <label>
                  Student Full Name:
                  <input
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    placeholder="e.g. Toheeb Adeleke"
                    required
                  />
                </label>
                <label>
                  Class / Grade:
                  <input
                    value={newStudentClass}
                    onChange={(e) => setNewStudentClass(e.target.value)}
                    placeholder="e.g. SSS 1 or Grade 10"
                  />
                </label>
              </div>
              <button type="submit" className="btn-primary">
                + Register Student
              </button>
            </form>
            {studentMessage && (
              <p style={{ marginTop: '14px', padding: '12px', background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', borderRadius: '8px' }}>
                {studentMessage}
              </p>
            )}
          </div>

          <div className="data-card">
            <h3>Class Roster & Access Codes</h3>
            <p className="data-card-subtitle">
              Students use their private Access Code to create an account and view their personal learning dashboard.
            </p>
            {studentsLoading ? (
              <p>Loading roster...</p>
            ) : students.length === 0 ? (
              <p style={{ color: '#64748b' }}>No students registered yet. Add a student using the form above.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Student Full Name</th>
                    <th>Class / Grade</th>
                    <th>Student Access Code</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id}>
                      <td><strong>{s.name}</strong></td>
                      <td>{s.class_name || 'General'}</td>
                      <td>
                        <code style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', color: '#1e40af' }}>
                          {s.access_code}
                        </code>
                      </td>
                      <td>
                        <button
                          onClick={() => {
                            setProfileStudentId(s.id)
                            setActiveTab('profiles')
                          }}
                          className="btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                        >
                          View Profile & AI →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TEACHER TAB 3: RECORD SCORES                                   */}
      {/* ============================================================== */}
      {currentUser.role === 'teacher' && activeTab === 'scores' && (
        <div className="data-card" style={{ maxWidth: '650px', margin: '0 auto' }}>
          <h3>Record Learning Assessment Score</h3>
          <p className="data-card-subtitle">
            Record multi-dimensional assessments (exams, quizzes, assignments, participation) to ground AI recommendations in real data.
          </p>
          {students.length === 0 ? (
            <p style={{ color: '#64748b' }}>Please add a student to your class first before recording scores.</p>
          ) : (
            <form onSubmit={handleAddScore} style={{ display: 'flex', flexDirection: 'column', gap: '16px', border: 'none', padding: 0, boxShadow: 'none' }}>
              <label>
                Select Student:
                <select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {formatStudentLabel(s.name, s.class_name)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="form-grid">
                <label>
                  Assessment Type:
                  <select value={scoreType} onChange={(e) => setScoreType(e.target.value)}>
                    <option value="exam">Exam (50% Weight)</option>
                    <option value="quiz">Quiz (20% Weight)</option>
                    <option value="assignment">Assignment (20% Weight)</option>
                    <option value="participation">Participation (10% Weight)</option>
                  </select>
                </label>
                <label>
                  Subject:
                  <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Chemistry" required />
                </label>
              </div>

              <label>
                Specific Topic / Unit:
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Stoichiometry, Cellular Respiration"
                  required
                />
              </label>

              <div className="form-grid">
                <label>
                  Student Score:
                  <input type="number" step="any" value={scoreVal} onChange={(e) => setScoreVal(e.target.value)} placeholder="e.g. 18" required />
                </label>
                <label>
                  Max Possible Score:
                  <input type="number" step="any" value={maxScoreVal} onChange={(e) => setMaxScoreVal(e.target.value)} placeholder="e.g. 20" required />
                </label>
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: '8px' }}>
                Save Assessment Score
              </button>
            </form>
          )}

          {scoreMessage && (
            <p style={{ marginTop: '14px', padding: '12px', background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', borderRadius: '8px' }}>
              {scoreMessage}
            </p>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TEACHER TAB 4: INDIVIDUAL PROFILES & RECOMMENDATIONS           */}
      {/* ============================================================== */}
      {currentUser.role === 'teacher' && activeTab === 'profiles' && (
        <div>
          <div className="data-card" style={{ marginBottom: '20px' }}>
            <label style={{ maxWidth: '350px' }}>
              Select Student to Inspect:
              <select value={profileStudentId} onChange={(e) => setProfileStudentId(e.target.value)}>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {formatStudentLabel(s.name, s.class_name)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {profile && (
            <div className="data-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '20px' }}>
                    {formatStudentLabel(profile.student?.name, profile.student?.class_name)}
                  </h3>
                  <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                    Access Code: <code style={{ fontWeight: 'bold' }}>{profile.student?.access_code}</code>
                  </div>
                </div>
                {profile.scores?.length > 0 && (
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>COMPOSITE MASTERY</span>
                    <div style={{ fontSize: '28px', fontWeight: '800', color: '#1e40af' }}>
                      {calculateComposite(profile.scores)}%
                    </div>
                  </div>
                )}
              </div>

              {!profile.scores || profile.scores.length === 0 ? (
                <p style={{ marginTop: '20px', color: '#64748b' }}>No assessment scores on record for this student yet.</p>
              ) : (
                <>
                  <table style={{ marginTop: '20px' }}>
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Subject</th>
                        <th>Topic</th>
                        <th>Score</th>
                        <th>Percentage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profile.scores.map((s) => {
                        const pct = s.max_score > 0 ? ((s.score / s.max_score) * 100).toFixed(1) : 0
                        return (
                          <tr key={s.id}>
                            <td><span style={{ textTransform: 'capitalize' }}>{s.type}</span></td>
                            <td>{s.subject}</td>
                            <td><strong>{s.topic}</strong></td>
                            <td>{s.score} / {s.max_score}</td>
                            <td>
                              <span style={{ fontWeight: 'bold', color: pct >= 70 ? '#059669' : pct >= 50 ? '#d97706' : '#dc2626' }}>
                                {pct}%
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>

                  {/* AI Recommendation Generator */}
                  <div style={{ marginTop: '26px', padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <h4 style={{ margin: '0 0 4px', color: '#1e40af', fontSize: '16px' }}>AI Diagnostic Learning Recommendation</h4>
                        <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                          Generates honest, data-grounded assessment based strictly on this student's recorded scores.
                        </p>
                      </div>
                      <button onClick={() => fetchRecommendation(profileStudentId)} className="btn-primary">
                        {loadingRec ? 'Analyzing Performance...' : '⚡ Generate AI Assessment'}
                      </button>
                    </div>

                    {loadingRec && <p style={{ marginTop: '14px', color: '#64748b' }}>Analyzing performance records...</p>}

                    {recommendation && (
                      <div style={{ marginTop: '16px', padding: '16px 20px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '10px', lineHeight: 1.6, whiteSpace: 'pre-wrap', fontSize: '14px', color: '#1e293b' }}>
                        {recommendation}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* STUDENT TAB 1: MY PERFORMANCE & MASTERY DASHBOARD              */}
      {/* ============================================================== */}
      {currentUser.role === 'student' && activeTab === 'student_dashboard' && (
        <div>
          {loadingStudentAnalytics ? (
            <p style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Loading your personal learning profile...</p>
          ) : studentAnalytics ? (
            <>
              {/* Personal Metric Cards */}
              <div className="metrics-grid">
                <div className="metric-card">
                  <span className="metric-label">My Overall Mastery</span>
                  <span className="metric-val" style={{ color: studentAnalytics.compositeScore >= 70 ? '#059669' : studentAnalytics.compositeScore >= 50 ? '#d97706' : '#dc2626' }}>
                    {studentAnalytics.compositeScore}%
                  </span>
                  <span className="metric-sub">Weighted Composite Score</span>
                </div>
                <div className="metric-card">
                  <span className="metric-label">Completed Assessments</span>
                  <span className="metric-val">{studentAnalytics.totalScores}</span>
                  <span className="metric-sub">Recorded by your teacher</span>
                </div>
                <div className="metric-card">
                  <span className="metric-label">Mastered Strengths</span>
                  <span className="metric-val" style={{ color: '#059669' }}>{studentAnalytics.strengths.length}</span>
                  <span className="metric-sub">Topics ≥ 75% score</span>
                </div>
                <div className="metric-card">
                  <span className="metric-label">Focus Areas</span>
                  <span className="metric-val" style={{ color: studentAnalytics.weaknesses.length > 0 ? '#dc2626' : '#059669' }}>
                    {studentAnalytics.weaknesses.length}
                  </span>
                  <span className="metric-sub">Topics to reinforce</span>
                </div>
              </div>

              {/* Strengths & Growth Areas */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                {/* Strengths Card */}
                <div className="data-card">
                  <h3 style={{ color: '#065f46', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🌟 My Demonstrated Strengths
                  </h3>
                  <p className="data-card-subtitle">Topics where you have achieved proficient or advanced understanding.</p>
                  {studentAnalytics.strengths.length === 0 ? (
                    <p style={{ color: '#64748b', fontSize: '14px' }}>Keep practicing assessments to build topic masteries!</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {studentAnalytics.strengths.map((t, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                          <span>
                            <strong>{t.topic}</strong>
                            {t.subject && t.subject !== 'STEM' && t.subject !== 'General' && (
                              <small style={{ color: '#059669', marginLeft: '6px' }}>({t.subject})</small>
                            )}
                          </span>
                          <span style={{ fontWeight: 'bold', color: '#059669' }}>{t.avgPct}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Focus Weaknesses Card */}
                <div className="data-card">
                  <h3 style={{ color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🎯 Focus & Reinforcement Areas
                  </h3>
                  <p className="data-card-subtitle">Topics where extra study and practice will boost your overall mastery.</p>
                  {studentAnalytics.weaknesses.length === 0 ? (
                    <p style={{ color: '#059669', fontSize: '14px' }}>Great job! You have no critical weak topics.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {studentAnalytics.weaknesses.map((t, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca', flexWrap: 'wrap', gap: '8px' }}>
                          <div>
                            <strong>{t.topic}</strong>
                            <small style={{ color: '#dc2626', marginLeft: '6px' }}>
                              ({t.subject && t.subject !== 'STEM' && t.subject !== 'General' ? `${t.subject} • ` : ''}{t.avgPct}%)
                            </small>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedTopicForStudy(t.topic)
                              handleGenerateMaterials(t.topic)
                              setActiveTab('study_materials')
                            }}
                            className="btn-primary"
                            style={{ padding: '5px 12px', fontSize: '12px' }}
                          >
                            Study Unit →
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Subject Breakdown */}
              <div className="data-card">
                <h3>Subject Competency Breakdown</h3>
                <p className="data-card-subtitle">Your progress across all enrolled subjects.</p>
                {studentAnalytics.subjectBreakdown.map((sb, idx) => (
                  <div key={idx} style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '14px' }}>
                      <strong>{sb.subject}</strong>
                      <span style={{ fontWeight: 'bold' }}>{sb.avgPct}%</span>
                    </div>
                    <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${sb.avgPct}%`,
                          background: sb.avgPct >= 70 ? '#059669' : sb.avgPct >= 50 ? '#2563eb' : '#dc2626'
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p style={{ color: '#64748b' }}>No learning analytics available yet.</p>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* STUDENT TAB 2: LEARN WITH AI MATERIALS                         */}
      {/* ============================================================== */}
      {currentUser.role === 'student' && activeTab === 'study_materials' && (
        <div>
          <div className="data-card" style={{ marginBottom: '24px' }}>
            <h3>📖 Learn with AI Materials</h3>
            <p className="data-card-subtitle">
              Generates a tailored micro-learning module with intuitive concept breakdowns, step-by-step worked solutions, and diagnostic self-checks for any topic.
            </p>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginTop: '16px' }}>
              <input
                value={selectedTopicForStudy}
                onChange={(e) => setSelectedTopicForStudy(e.target.value)}
                placeholder="Enter topic name (e.g. Diffusion, Osmosis, Chemical Bonding)"
                style={{ flex: 1, minWidth: '220px' }}
              />
              <button
                onClick={() => handleGenerateMaterials(selectedTopicForStudy)}
                disabled={loadingStudy}
                className="btn-primary"
              >
                {loadingStudy ? 'Generating Learning Unit...' : '⚡ Generate Learning Material'}
              </button>
            </div>
          </div>

          {loadingStudy && (
            <div className="data-card" style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🤖</div>
              <h3 style={{ margin: '0 0 6px', color: '#1e40af' }}>Generating Tailored Learning Guide...</h3>
              <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
                Synthesizing step-by-step worked examples, concept analogies, and self-checks.
              </p>
            </div>
          )}

          {studyMaterials && (
            <div className="study-module">
              <div className="study-module-header">
                <span className="badge badge-progress" style={{ marginBottom: '8px' }}>
                  {studyMaterials.level || 'Adaptive Study Unit'}
                </span>
                {/* Clean Topic Header — NO '(STEM)' appended */}
                <h2 className="study-module-title">
                  {studyMaterials.topic}
                  {studyMaterials.subject && studyMaterials.subject !== 'STEM' && studyMaterials.subject !== 'General' && (
                    <span style={{ fontSize: '15px', color: '#64748b', fontWeight: '500', marginLeft: '10px' }}>
                      ({studyMaterials.subject})
                    </span>
                  )}
                </h2>
                {studyMaterials.learningObjective && (
                  <p style={{ color: '#1e40af', fontWeight: '600', margin: 0, fontSize: '14px' }}>
                    🎯 Goal: {studyMaterials.learningObjective}
                  </p>
                )}
              </div>

              {/* Concept Breakdown */}
              {studyMaterials.conceptBreakdown && (
                <div className="study-section">
                  <h4>💡 Core Concept & Everyday Analogy</h4>
                  <p style={{ margin: 0, lineHeight: 1.6, fontSize: '15px' }}>
                    {studyMaterials.conceptBreakdown}
                  </p>
                </div>
              )}

              {/* Step-by-Step Worked Example */}
              {studyMaterials.workedExample && (
                <div className="study-section" style={{ borderLeftColor: '#059669' }}>
                  <h4 style={{ color: '#047857' }}>✏️ Step-by-Step Worked Problem</h4>
                  <div style={{ background: 'white', padding: '14px 18px', borderRadius: '8px', border: '1px solid #d1fae5', marginBottom: '12px', fontWeight: '600' }}>
                    {studyMaterials.workedExample.problem}
                  </div>
                  {Array.isArray(studyMaterials.workedExample.stepByStepSolution) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {studyMaterials.workedExample.stepByStepSolution.map((step, idx) => (
                        <div key={idx} className="step-card">
                          {step}
                        </div>
                      ))}
                    </div>
                  )}
                  {studyMaterials.workedExample.explanation && (
                    <p style={{ fontSize: '13px', color: '#065f46', marginTop: '10px', fontStyle: 'italic' }}>
                      Takeaway: {studyMaterials.workedExample.explanation}
                    </p>
                  )}
                </div>
              )}

              {/* Pro Tips */}
              {Array.isArray(studyMaterials.proTips) && studyMaterials.proTips.length > 0 && (
                <div className="study-section" style={{ borderLeftColor: '#d97706' }}>
                  <h4 style={{ color: '#b45309' }}>⚡ Pro Tips & Common Pitfalls to Avoid</h4>
                  {studyMaterials.proTips.map((tip, idx) => (
                    <div key={idx} className="protip-item">
                      <span>⚠️</span>
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Self Check Questions */}
              {Array.isArray(studyMaterials.selfCheckQuestions) && studyMaterials.selfCheckQuestions.length > 0 && (
                <div className="study-section" style={{ borderLeftColor: '#4f46e5' }}>
                  <h4 style={{ color: '#4338ca' }}>❓ Quick Diagnostic Self-Check</h4>
                  {studyMaterials.selfCheckQuestions.map((q, idx) => (
                    <div key={idx} style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #e0e7ff', marginBottom: '10px' }}>
                      <div style={{ fontWeight: '600', marginBottom: '10px', fontSize: '15px' }}>
                        Q{idx + 1}: {q.question}
                      </div>
                      <button
                        onClick={() => setRevealedAnswers((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                        className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        {revealedAnswers[idx] ? 'Hide Answer' : 'Show Answer & Explanation'}
                      </button>
                      {revealedAnswers[idx] && (
                        <div style={{ marginTop: '12px', padding: '12px 14px', background: '#eef2ff', borderRadius: '6px', fontSize: '14px', color: '#3730a3', lineHeight: 1.5 }}>
                          <strong>Answer:</strong> {q.answer}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* STUDENT TAB 3: ADAPTIVE PRACTICE QUIZ                          */}
      {/* ============================================================== */}
      {currentUser.role === 'student' && activeTab === 'practice_quiz' && (
        <div>
          <div className="data-card" style={{ marginBottom: '24px' }}>
            <h3>🎯 Adaptive Diagnostic Evaluation Quiz</h3>
            <p className="data-card-subtitle">
              Practice with real-time AI questions. Get instant hints, automatic scoring, and detailed step-by-step explanations.
            </p>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginTop: '16px' }}>
              <input
                value={selectedTopicForQuiz}
                onChange={(e) => setSelectedTopicForQuiz(e.target.value)}
                placeholder="Topic for practice (e.g. Chemical Bonding, Acids & Bases)"
                style={{ flex: 1, minWidth: '220px' }}
              />
              <button
                onClick={() => handleGenerateQuiz(selectedTopicForQuiz)}
                disabled={loadingQuiz}
                className="btn-primary"
              >
                {loadingQuiz ? 'Generating Quiz...' : '🚀 Start Diagnostic Quiz'}
              </button>
            </div>
          </div>

          {loadingQuiz && (
            <div className="data-card" style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎲</div>
              <h3 style={{ margin: '0 0 6px', color: '#1e40af' }}>Crafting Adaptive Diagnostic Questions...</h3>
              <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
                Calibrating difficulty and generating explanations based on your curriculum.
              </p>
            </div>
          )}

          {quizData && Array.isArray(quizData.questions) && (
            <div className="quiz-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', flexWrap: 'wrap', gap: '8px' }}>
                {/* Clean Quiz Title — NO '(STEM)' */}
                <h3 style={{ margin: 0, color: '#1e40af' }}>
                  Quiz: {quizData.topic}
                  {quizData.subject && quizData.subject !== 'STEM' && quizData.subject !== 'General' && (
                    <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 'normal', marginLeft: '8px' }}>
                      ({quizData.subject})
                    </span>
                  )}
                </h3>
                <span className="badge badge-progress">
                  {quizData.questions.length} Diagnostic Questions
                </span>
              </div>

              {quizData.questions.map((q, qIdx) => {
                const userChoice = userQuizAnswers[qIdx]
                const isAnswered = userChoice !== undefined
                const isCorrect = userChoice === q.correctIndex

                return (
                  <div key={q.id || qIdx} className="quiz-card">
                    <div className="question-text">
                      {qIdx + 1}. {q.question}
                    </div>

                    {!isAnswered && (
                      <button
                        onClick={() => setRevealedHints((prev) => ({ ...prev, [qIdx]: !prev[qIdx] }))}
                        className="btn-hint"
                      >
                        {revealedHints[qIdx] ? 'Hide Hint' : '💡 Need a Hint?'}
                      </button>
                    )}

                    {revealedHints[qIdx] && !isAnswered && (
                      <div className="hint-box">
                        <strong>Hint:</strong> {q.hint}
                      </div>
                    )}

                    <div className="options-grid">
                      {q.options.map((opt, optIdx) => {
                        let btnClass = 'option-btn'
                        if (isAnswered) {
                          if (optIdx === q.correctIndex) btnClass += ' selected-correct'
                          else if (optIdx === userChoice) btnClass += ' selected-incorrect'
                        }

                        return (
                          <button
                            key={optIdx}
                            disabled={isAnswered}
                            onClick={() => setUserQuizAnswers((prev) => ({ ...prev, [qIdx]: optIdx }))}
                            className={btnClass}
                          >
                            <span>
                              <strong>{String.fromCharCode(65 + optIdx)}.</strong> {opt}
                            </span>
                            {isAnswered && optIdx === q.correctIndex && <span>✓ Correct</span>}
                            {isAnswered && optIdx === userChoice && optIdx !== q.correctIndex && <span>✗ Incorrect</span>}
                          </button>
                        )
                      })}
                    </div>

                    {isAnswered && (
                      <div className={`feedback-box ${isCorrect ? 'feedback-correct' : 'feedback-incorrect'}`}>
                        <strong>{isCorrect ? '🎉 Correct!' : '❌ Not quite.'}</strong>
                        <p style={{ margin: '6px 0 0' }}>{q.explanation}</p>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Quiz Summary */}
              {Object.keys(userQuizAnswers).length === quizData.questions.length && (
                <div style={{ textAlign: 'center', padding: '24px', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0', marginTop: '20px' }}>
                  <h3 style={{ margin: '0 0 8px', color: '#166534', fontSize: '18px' }}>
                    Quiz Complete! You scored{' '}
                    {Object.entries(userQuizAnswers).filter(([idx, ans]) => ans === quizData.questions[idx].correctIndex).length}{' '}
                    out of {quizData.questions.length}
                  </h3>
                  <button
                    onClick={() => handleGenerateQuiz(quizData.topic)}
                    className="btn-primary"
                    style={{ marginTop: '10px' }}
                  >
                    Try Another Set of Practice Questions 🔄
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* STUDENT TAB 4: MY SCORE RECORDS                                */}
      {/* ============================================================== */}
      {currentUser.role === 'student' && activeTab === 'my_scores' && (
        <div className="data-card">
          <h3>My Assessment History</h3>
          <p className="data-card-subtitle">
            Complete record of your scores across exams, quizzes, assignments, and class participation.
          </p>
          {!profile?.scores || profile.scores.length === 0 ? (
            <p style={{ color: '#64748b' }}>No assessment scores on record yet.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Subject</th>
                  <th>Topic</th>
                  <th>Score</th>
                  <th>Percentage</th>
                </tr>
              </thead>
              <tbody>
                {profile.scores.map((s) => {
                  const pct = s.max_score > 0 ? ((s.score / s.max_score) * 100).toFixed(1) : 0
                  return (
                    <tr key={s.id}>
                      <td><span style={{ textTransform: 'capitalize' }}>{s.type}</span></td>
                      <td>{s.subject}</td>
                      <td><strong>{s.topic}</strong></td>
                      <td>{s.score} / {s.max_score}</td>
                      <td>
                        <span style={{ fontWeight: 'bold', color: pct >= 70 ? '#059669' : pct >= 50 ? '#d97706' : '#dc2626' }}>
                          {pct}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

export default App