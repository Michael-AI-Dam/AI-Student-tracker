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
  const [authSubject, setAuthSubject] = useState('Chemistry')
  const [loginRole, setLoginRole] = useState('teacher')
  const [loginSubject, setLoginSubject] = useState('Chemistry')
  const [accessCode, setAccessCode] = useState('')
  const [authError, setAuthError] = useState('')
  const [authSuccess, setAuthSuccess] = useState('')

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState('analytics')

  // Teacher State
  const [students, setStudents] = useState([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [teacherAnalytics, setTeacherAnalytics] = useState(null)
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)

  // Teacher Interactive Modals State
  // 'class_size' | 'class_average' | 'total_assessments' | 'needing_support' | 'profile_settings' | null
  const [teacherModal, setTeacherModal] = useState(null)
  const [editTeacherName, setEditTeacherName] = useState('')
  const [editTeacherEmail, setEditTeacherEmail] = useState('')
  const [editTeacherSubject, setEditTeacherSubject] = useState('')
  const [editTeacherPassword, setEditTeacherPassword] = useState('')
  const [editTeacherMessage, setEditTeacherMessage] = useState('')
  const [editTeacherError, setEditTeacherError] = useState('')
  const [updatingProfile, setUpdatingProfile] = useState(false)

  // Teacher Forms State
  const [newStudentName, setNewStudentName] = useState('')
  const [newStudentClass, setNewStudentClass] = useState('')
  const [studentMessage, setStudentMessage] = useState('')

  const [studentId, setStudentId] = useState('')
  const [scoreType, setScoreType] = useState('quiz')
  const [subject, setSubject] = useState('Physics')
  const [topic, setTopic] = useState('')
  const [scoreVal, setScoreVal] = useState('')
  const [maxScoreVal, setMaxScoreVal] = useState('')
  const [scoreMessage, setScoreMessage] = useState('')

  // Individual Student Profile View (Teacher)
  const [profileStudentId, setProfileStudentId] = useState('')
  const [profile, setProfile] = useState(null)

  // Student Dashboard State
  const [studentAnalytics, setStudentAnalytics] = useState(null)
  const [loadingStudentAnalytics, setLoadingStudentAnalytics] = useState(false)
  const [expandedStrengthSubjects, setExpandedStrengthSubjects] = useState({})
  const [expandedWeakSubjects, setExpandedWeakSubjects] = useState({})

  // Student Assessment History & AI Generator State
  const [selectedSubjectHistory, setSelectedSubjectHistory] = useState('All')
  const [historyRecommendation, setHistoryRecommendation] = useState('')
  const [loadingHistoryRec, setLoadingHistoryRec] = useState(false)

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

  // Helper: Name (Class) format — no long hyphens
  const formatStudentLabel = (name, className) => {
    if (!name) return ''
    return className ? `${name} (${className})` : name
  }

  // Helper: Get subject assessments formatted with assessment type and exact percentage from history
  const getSubjectAssessments = (sub) => {
    if (sub.assessments && sub.assessments.length > 0) return sub.assessments
    if (profile?.scores) {
      return profile.scores
        .filter((s) => (s.subject || '').toLowerCase() === (sub.subject || '').toLowerCase())
        .map((s) => {
          const typeKey = (s.type || 'assignment').toLowerCase()
          const typeLabel =
            typeKey === 'exam'
              ? 'Exam'
              : typeKey === 'test'
              ? 'Test'
              : typeKey === 'quiz'
              ? 'Quiz'
              : typeKey === 'participation'
              ? 'Participation'
              : 'Assignment'
          const avgPct = s.max_score > 0 ? Number(((s.score / s.max_score) * 100).toFixed(1)) : 0
          return {
            id: s.id,
            type: typeLabel,
            typeKey,
            score: s.score,
            max_score: s.max_score,
            avgPct,
          }
        })
    }
    return []
  }

  // Helper: Sorting subjects so English is ALWAYS #1, Mathematics is ALWAYS #2, then others
  const sortSubjectsWithEnglishAndMathFirst = (subjectsList) => {
    if (!Array.isArray(subjectsList)) return []
    return [...subjectsList].sort((a, b) => {
      const nameA = (a.subject || a || '').toString().toLowerCase()
      const nameB = (b.subject || b || '').toString().toLowerCase()
      const isEnglish = (s) => s.includes('english')
      const isMath = (s) => s.includes('math')
      if (isEnglish(nameA) && !isEnglish(nameB)) return -1
      if (!isEnglish(nameA) && isEnglish(nameB)) return 1
      if (isMath(nameA) && !isMath(nameB)) return isEnglish(nameB) ? 1 : -1
      if (!isMath(nameA) && isMath(nameB)) return isEnglish(nameA) ? -1 : 1
      return nameA.localeCompare(nameB)
    })
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
            setStudentId((prev) => (data.some((s) => s.id === prev) ? prev : data[0].id))
            setProfileStudentId((prev) => (data.some((s) => s.id === prev) ? prev : data[0].id))
          } else {
            setStudentId('')
            setProfileStudentId('')
            setProfile(null)
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
    if (!id) return
    const query = currentUser?.role === 'teacher' ? `?teacher_id=${encodeURIComponent(currentUser.id)}` : ''
    fetch(`${API_URL}/api/students/${encodeURIComponent(id)}/profile${query}`)
      .then((res) => res.json())
      .then((data) => setProfile(data))
      .catch((err) => console.error('Fetch profile error:', err))
  }

  // Fetch Subject-Specific AI Recommendation for Student
  const fetchStudentSubjectRecommendation = (studId, targetSubject) => {
    setLoadingHistoryRec(true)
    setHistoryRecommendation('')
    const queryParam = targetSubject && targetSubject !== 'All' ? `?subject=${encodeURIComponent(targetSubject)}` : ''
    fetch(`${API_URL}/api/students/${encodeURIComponent(studId)}/recommendation${queryParam}`)
      .then((res) => res.json())
      .then((data) => {
        setHistoryRecommendation(data.recommendation || data.error || 'No recommendation received.')
        setLoadingHistoryRec(false)
      })
      .catch((err) => {
        setHistoryRecommendation('Error: ' + err.message)
        setLoadingHistoryRec(false)
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
      setEditTeacherName(currentUser.name || '')
      setEditTeacherEmail(currentUser.email || '')
      setEditTeacherSubject(currentUser.subject || 'Physics')
      if (currentUser.subject) {
        setSubject(currentUser.subject)
      }
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
      body: JSON.stringify({
        email: authEmail,
        password: authPassword,
        role: loginRole,
        subject: loginRole === 'teacher' ? loginSubject : null,
      }),
    })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Login failed')
        const activeUser = {
          ...data,
          subject: (loginRole === 'teacher' ? (loginSubject || data.subject) : data.subject) || '',
        }
        setCurrentUser(activeUser)
        if (activeUser.subject) {
          setSubject(activeUser.subject)
          setEditTeacherSubject(activeUser.subject)
        }
        setActiveTab(activeUser.role === 'teacher' ? 'analytics' : 'student_dashboard')
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
        subject: authRole === 'teacher' ? authSubject : null,
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

  const handleUpdateTeacherProfile = (e) => {
    e.preventDefault()
    setEditTeacherError('')
    setEditTeacherMessage('')
    setUpdatingProfile(true)

    fetch(`${API_URL}/api/teachers/update-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teacherId: currentUser.id,
        name: editTeacherName,
        email: editTeacherEmail,
        subject: editTeacherSubject,
        newPassword: editTeacherPassword || undefined,
      }),
    })
      .then(async (res) => {
        const data = await res.json()
        setUpdatingProfile(false)
        if (!res.ok) throw new Error(data.error || 'Failed to update profile')
        const updatedUser = {
          ...currentUser,
          name: data.name,
          email: data.email,
          subject: data.subject || editTeacherSubject,
        }
        setCurrentUser(updatedUser)
        if (data.subject || editTeacherSubject) {
          setSubject(data.subject || editTeacherSubject)
        }
        setEditTeacherMessage('Profile and subject updated successfully!')
        setEditTeacherPassword('')
        fetchTeacherAnalytics(currentUser.id)
        if (profileStudentId) {
          fetchProfile(profileStudentId)
        }
      })
      .catch((err) => {
        setUpdatingProfile(false)
        setEditTeacherError(err.message)
      })
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
    setTeacherAnalytics(null)
    setStudentAnalytics(null)
    setStudyMaterials(null)
    setQuizData(null)
    setTeacherModal(null)
    setHistoryRecommendation('')
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
        const note = data.message ? ` (${data.message})` : ''
        setStudentMessage(`Student registered! Access Code: ${data.access_code}${note}`)
        setNewStudentName('')
        setNewStudentClass('')
        fetchStudents(currentUser.id)
        fetchTeacherAnalytics(currentUser.id)
      })
      .catch((err) => setStudentMessage('Error: ' + err.message))
  }

  const handleRemoveStudent = (student) => {
    if (!student || !student.id) return
    const studentLabel = formatStudentLabel(student.name, student.class_name)
    if (!window.confirm(`Are you sure you want to remove "${studentLabel}" from your class roster?\n\nThey will no longer appear in your classroom or analytics.`)) {
      return
    }
    fetch(`${API_URL}/api/teachers/remove-student`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teacherId: currentUser.id,
        studentId: student.id,
      }),
    })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to remove student')
        setStudentMessage(data.message || `Student removed from class roster.`)
        fetchStudents(currentUser.id)
        fetchTeacherAnalytics(currentUser.id)
        if (String(profileStudentId) === String(student.id)) {
          setProfile(null)
          setProfileStudentId('')
        }
      })
      .catch((err) => alert('Error removing student: ' + err.message))
  }

  const handleAddScore = (e) => {
    e.preventDefault()
    setScoreMessage('')
    const chosenSubject = currentUser?.subject || subject || 'General'
    const assessmentTypeLabel = scoreType.charAt(0).toUpperCase() + scoreType.slice(1)
    fetch(`${API_URL}/api/scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: studentId,
        teacher_id: currentUser.id,
        type: scoreType,
        subject: chosenSubject,
        topic: assessmentTypeLabel,
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
    const weights = {
      exam: 0.4,
      test: 0.2,
      quiz: 0.15,
      assignment: 0.15,
      participation: 0.1,
    }
    const byType = {}

    scores.forEach((s) => {
      const t = (s.type || 'assignment').toLowerCase()
      if (!byType[t]) byType[t] = { totalScore: 0, totalMax: 0 }
      byType[t].totalScore += Number(s.score) || 0
      byType[t].totalMax += Number(s.max_score) || 0
    })

    let weightedSum = 0
    let weightUsed = 0

    Object.entries(byType).forEach(([t, { totalScore, totalMax }]) => {
      const w = weights[t] || 0.15
      if (totalMax > 0 && w) {
        const pct = (totalScore / totalMax) * 100
        weightedSum += pct * w
        weightUsed += w
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

              <label>
                I am signing in as:
                <select value={loginRole} onChange={(e) => setLoginRole(e.target.value)}>
                  <option value="teacher">Teacher (Classroom Analytics Cockpit)</option>
                  <option value="student">Student (Personal Learning Portal)</option>
                </select>
              </label>

              {loginRole === 'teacher' && (
                <label>
                  Subject Taught (Subject you are taking):
                  <select value={loginSubject} onChange={(e) => setLoginSubject(e.target.value)}>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Physics">Physics</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Biology">Biology</option>
                    <option value="English">English</option>
                    <option value="Economics">Economics</option>
                    <option value="Geography">Geography</option>
                    <option value="Agricultural Science">Agricultural Science</option>
                    <option value="Civic Education">Civic Education</option>
                  </select>
                </label>
              )}

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
              {authRole === 'teacher' && (
                <label>
                  Subject Taught:
                  <select value={authSubject} onChange={(e) => setAuthSubject(e.target.value)}>
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Biology">Biology</option>
                    <option value="English">English</option>
                    <option value="Economics">Economics</option>
                    <option value="Geography">Geography</option>
                    <option value="Agricultural Science">Agricultural Science</option>
                    <option value="Civic Education">Civic Education</option>
                  </select>
                </label>
              )}
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

  // Extract distinct registered subjects for student's assessment history tabs (strictly actual subjects, sorted English #1, Math #2)
  const rawStudentSubjects = profile?.scores
    ? [...new Set(profile.scores.map((s) => s.subject).filter(Boolean))]
    : []

  // Ensure English #1, Math #2, followed by other subjects
  const studentRegisteredSubjects = [...rawStudentSubjects].sort((a, b) => {
    const isEngA = (a || '').toLowerCase().includes('english')
    const isEngB = (b || '').toLowerCase().includes('english')
    if (isEngA && !isEngB) return -1
    if (!isEngA && isEngB) return 1
    const isMathA = (a || '').toLowerCase().includes('math')
    const isMathB = (b || '').toLowerCase().includes('math')
    if (isMathA && !isMathB) return -1
    if (!isMathA && isMathB) return 1
    return a.localeCompare(b)
  })

  // Selected subject for history view (defaults to first available enrolled subject)
  const activeHistorySubject =
    selectedSubjectHistory && studentRegisteredSubjects.includes(selectedSubjectHistory)
      ? selectedSubjectHistory
      : studentRegisteredSubjects[0] || ''

  // Filtered scores in student assessment history tab strictly for the chosen subject
  const filteredHistoryScores = profile?.scores && activeHistorySubject
    ? profile.scores.filter((s) => (s.subject || '').toLowerCase() === activeHistorySubject.toLowerCase())
    : []

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
          {currentUser.role === 'teacher' && (
            <span style={{ fontSize: '12px', background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
              📚 {currentUser.subject || 'Physics'}
            </span>
          )}

          {currentUser.role === 'teacher' && (
            <button
              onClick={() => { setTeacherModal('profile_settings'); setEditTeacherError(''); setEditTeacherMessage('') }}
              className="btn-secondary"
              style={{ padding: '7px 12px', fontSize: '12px' }}
              title="Edit Profile & Password"
            >
              ⚙️ Settings
            </button>
          )}

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
              👤 Student Profiles & Performance
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
              {/* Responsive Clickable Metrics Grid */}
              <div className="metrics-grid">
                {/* 1. Class Size */}
                <div
                  className="metric-card clickable"
                  onClick={() => setTeacherModal('class_size')}
                  title="Click to view all registered students"
                >
                  <span className="metric-label">Class Size</span>
                  <span className="metric-val">{teacherAnalytics.totalStudents}</span>
                  <span className="metric-sub">Registered Students</span>
                </div>

                {/* 2. Class Average */}
                <div
                  className="metric-card clickable"
                  onClick={() => setTeacherModal('class_average')}
                  title="Click to view individual student composite breakdown"
                >
                  <span className="metric-label">Class Average</span>
                  <span className="metric-val" style={{ color: teacherAnalytics.classAverage >= 70 ? '#059669' : teacherAnalytics.classAverage >= 50 ? '#d97706' : '#dc2626' }}>
                    {teacherAnalytics.classAverage}%
                  </span>
                  <span className="metric-sub">Weighted Composite</span>
                </div>

                {/* 3. Total Assessments */}
                <div
                  className="metric-card clickable"
                  onClick={() => setTeacherModal('total_assessments')}
                  title="Click to view assessments recorded per student"
                >
                  <span className="metric-label">Total Assessments</span>
                  <span className="metric-val">{teacherAnalytics.totalScores}</span>
                  <span className="metric-sub">Exams, Quizzes & Assignments</span>
                </div>

                {/* 4. Needing Support */}
                <div
                  className="metric-card clickable"
                  onClick={() => setTeacherModal('needing_support')}
                  title="Click to view students needing academic intervention"
                >
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

              {/* Class-Wide Assessment Breakdown by Assessment Type */}
              <div className="data-card">
                <h3>Class-Wide Assessment Performance</h3>
                <p className="data-card-subtitle">
                  Class performance and submission records by assessment type for {currentUser.subject || 'your subject'}.
                </p>
                {(() => {
                  const defaultTypes = [
                    { typeKey: 'assignment', type: 'Assignment', icon: '📑' },
                    { typeKey: 'quiz', type: 'Quiz', icon: '❓' },
                    { typeKey: 'test', type: 'Test', icon: '🧪' },
                    { typeKey: 'participation', type: 'Participation', icon: '🙋' },
                    { typeKey: 'exam', type: 'Exam', icon: '📝' },
                  ]

                  const rows = defaultTypes.map((item) => {
                    const match = teacherAnalytics.assessmentTypePerformance?.find(
                      (p) => p.typeKey === item.typeKey
                    )
                    if (match) {
                      return {
                        ...item,
                        count: match.count,
                        avgPct: match.avgPct,
                        status: match.status,
                      }
                    }
                    return {
                      ...item,
                      count: 0,
                      avgPct: 0,
                      status: '—',
                    }
                  })

                  return (
                    <table>
                      <thead>
                        <tr>
                          <th>ASSESSMENT TYPE</th>
                          <th style={{ textAlign: 'center' }}>NO OF STUDENTS RECORD</th>
                          <th>CLASS AVERAGE</th>
                          <th>STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <tr key={row.typeKey}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '18px' }}>{row.icon}</span>
                                <strong>{row.type}</strong>
                              </div>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span style={{ fontWeight: '600', fontSize: '14px', color: row.count > 0 ? '#1e40af' : '#94a3b8' }}>
                                {row.count}
                              </span>
                            </td>
                            <td>
                              {row.count > 0 ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ minWidth: '45px', fontWeight: '600' }}>{row.avgPct}%</span>
                                  <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div
                                      style={{
                                        height: '100%',
                                        width: `${Math.min(100, row.avgPct)}%`,
                                        background: row.avgPct < 55 ? '#dc2626' : row.avgPct < 75 ? '#2563eb' : '#059669'
                                      }}
                                    ></div>
                                  </div>
                                </div>
                              ) : (
                                <span style={{ color: '#94a3b8' }}>—</span>
                              )}
                            </td>
                            <td>
                              {row.count > 0 ? (
                                <span className={`badge ${row.status === 'Needs Review' ? 'badge-review' : row.status === 'In Progress' ? 'badge-progress' : 'badge-mastered'}`}>
                                  {row.status}
                                </span>
                              ) : (
                                <span style={{ color: '#94a3b8' }}>—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
                })()}
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
              Register a student or link an existing student from the school database. Existing students keep their access code.
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
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            onClick={() => {
                              setProfileStudentId(s.id)
                              setActiveTab('profiles')
                            }}
                            className="btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                          >
                            View Profile & Performance →
                          </button>
                          <button
                            onClick={() => handleRemoveStudent(s)}
                            style={{
                              padding: '6px 10px',
                              fontSize: '12px',
                              fontWeight: '600',
                              color: '#dc2626',
                              background: '#fef2f2',
                              border: '1px solid #fecaca',
                              borderRadius: '6px',
                              cursor: 'pointer',
                            }}
                            title="Remove student from this classroom"
                          >
                            🗑️ Remove
                          </button>
                        </div>
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
                    <option value="assignment">Assignment (15% Weight)</option>
                    <option value="quiz">Quiz (15% Weight)</option>
                    <option value="test">Test (20% Weight)</option>
                    <option value="participation">Participation (10% Weight)</option>
                    <option value="exam">Exam (40% Weight)</option>
                  </select>
                </label>
                <label>
                  Subject:
                  <input
                    value={currentUser.subject || subject}
                    readOnly
                    style={{ background: '#f1f5f9', cursor: 'not-allowed', color: '#334155', fontWeight: '600' }}
                  />
                </label>
              </div>

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
      {/* TEACHER TAB 4: STUDENT PROFILES & PERFORMANCE (NO AI BTN)      */}
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
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>
                      Access Code: <code style={{ fontWeight: 'bold' }}>{profile.student?.access_code}</code>
                    </span>
                    <span style={{ padding: '3px 10px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                      📚 {currentUser.subject || 'Physics'} Record
                    </span>
                  </div>
                </div>
                {profile.scores?.length > 0 && (
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>
                      {currentUser.subject || 'Physics'} COMPOSITE MASTERY
                    </span>
                    <div style={{ fontSize: '28px', fontWeight: '800', color: '#1e40af' }}>
                      {calculateComposite(profile.scores)}%
                    </div>
                  </div>
                )}
              </div>

              {!profile.scores || profile.scores.length === 0 ? (
                <div style={{ marginTop: '20px', padding: '24px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 6px', color: '#334155', fontWeight: '600', fontSize: '15px' }}>
                    No {currentUser.subject || 'Physics'} assessments on record for this student yet.
                  </p>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
                    Use the "Record Assessment" tab to grade exams, quizzes, assignments, or participation in {currentUser.subject || 'Physics'}.
                  </p>
                </div>
              ) : (
                <table style={{ marginTop: '20px' }}>
                  <thead>
                    <tr>
                      <th>Assessment Type</th>
                      <th>Subject</th>
                      <th>Score</th>
                      <th>Percentage</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.scores.map((s) => {
                      const pct = s.max_score > 0 ? Number(((s.score / s.max_score) * 100).toFixed(1)) : 0
                      return (
                        <tr key={s.id}>
                          <td>
                            <strong>
                              {s.type ? s.type.charAt(0).toUpperCase() + s.type.slice(1) : 'Assessment'}
                            </strong>
                          </td>
                          <td>{s.subject}</td>
                          <td>{s.score} / {s.max_score}</td>
                          <td>
                            <span style={{ fontWeight: 'bold', color: pct >= 70 ? '#059669' : pct >= 50 ? '#d97706' : '#dc2626' }}>
                              {pct}%
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${pct < 55 ? 'badge-review' : pct < 75 ? 'badge-progress' : 'badge-mastered'}`}>
                              {pct >= 75 ? 'Mastered' : pct >= 55 ? 'In Progress' : 'Needs Review'}
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
                <div
                  className="metric-card clickable"
                  onClick={() => setActiveTab('my_scores')}
                  title="Click to view all score records"
                >
                  <span className="metric-label">Completed Assessments</span>
                  <span className="metric-val">{studentAnalytics.totalScores}</span>
                  <span className="metric-sub">Recorded by teachers</span>
                </div>
                <div className="metric-card">
                  <span className="metric-label">Mastered Strengths</span>
                  <span className="metric-val" style={{ color: '#059669' }}>
                    {studentAnalytics.subjectStrengths?.length || 0}
                  </span>
                  <span className="metric-sub">Subjects ≥ 75% score</span>
                </div>
                <div className="metric-card">
                  <span className="metric-label">Focus Areas</span>
                  <span className="metric-val" style={{ color: (studentAnalytics.subjectWeaknesses?.length || 0) > 0 ? '#dc2626' : '#059669' }}>
                    {studentAnalytics.subjectWeaknesses?.length || 0}
                  </span>
                  <span className="metric-sub">Subjects to reinforce</span>
                </div>
              </div>

              {/* Strengths & Growth Areas Grouped by Subject */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                {/* Strengths Card Grouped by Subject */}
                <div className="data-card">
                  <h3 style={{ color: '#065f46', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🌟 My Demonstrated Strengths
                  </h3>
                  <p className="data-card-subtitle">Subjects where you achieved mastery. Click a subject to view assessment performance breakdown.</p>
                  {(!studentAnalytics.subjectStrengths || studentAnalytics.subjectStrengths.length === 0) ? (
                    <p style={{ color: '#64748b', fontSize: '14px' }}>Keep practicing assessments to build subject masteries!</p>
                  ) : (
                    <div>
                      {studentAnalytics.subjectStrengths.map((sub, i) => {
                        const isExpanded = !!expandedStrengthSubjects[sub.subject]
                        const assessmentList = getSubjectAssessments(sub)
                        return (
                          <div key={i} className="subject-accordion-card">
                            <div
                              className="subject-accordion-header"
                              onClick={() => setExpandedStrengthSubjects((prev) => ({ ...prev, [sub.subject]: !prev[sub.subject] }))}
                            >
                              <div>
                                <strong style={{ fontSize: '15px', color: '#065f46' }}>{sub.subject}</strong>
                                <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '8px' }}>
                                  ({assessmentList.length} {assessmentList.length === 1 ? 'assessment' : 'assessments'} {isExpanded ? '▲' : '▼'})
                                </span>
                              </div>
                              <span style={{ fontWeight: 'bold', color: '#059669', fontSize: '16px' }}>{sub.avgPct}%</span>
                            </div>

                            {isExpanded && (
                              <div className="subject-accordion-body">
                                {assessmentList.map((item, idx) => (
                                  <div
                                    key={idx}
                                    style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      padding: '7px 0',
                                      borderBottom: idx < assessmentList.length - 1 ? '1px solid #e2e8f0' : 'none',
                                      fontSize: '13px',
                                    }}
                                  >
                                    <span style={{ fontWeight: '600', color: '#1e293b' }}>{item.type}</span>
                                    <span style={{ fontWeight: '600', color: item.avgPct >= 70 ? '#059669' : item.avgPct >= 50 ? '#d97706' : '#dc2626' }}>
                                      {item.avgPct}%
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Focus Weaknesses Card Grouped by Subject */}
                <div className="data-card">
                  <h3 style={{ color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🎯 Focus & Reinforcement Areas
                  </h3>
                  <p className="data-card-subtitle">Subjects requiring reinforcement. Click to see assessment breakdown and study guides.</p>
                  {(!studentAnalytics.subjectWeaknesses || studentAnalytics.subjectWeaknesses.length === 0) ? (
                    <p style={{ color: '#059669', fontSize: '14px' }}>Great job! You have no critical weak subjects below 60%.</p>
                  ) : (
                    <div>
                      {studentAnalytics.subjectWeaknesses.map((sub, i) => {
                        const isExpanded = !!expandedWeakSubjects[sub.subject]
                        const assessmentList = getSubjectAssessments(sub)
                        return (
                          <div key={i} className="subject-accordion-card">
                            <div
                              className="subject-accordion-header"
                              onClick={() => setExpandedWeakSubjects((prev) => ({ ...prev, [sub.subject]: !prev[sub.subject] }))}
                            >
                              <div>
                                <strong style={{ fontSize: '15px', color: '#dc2626' }}>{sub.subject}</strong>
                                <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '8px' }}>
                                  ({assessmentList.length} {assessmentList.length === 1 ? 'assessment' : 'assessments'} {isExpanded ? '▲' : '▼'})
                                </span>
                              </div>
                              <span style={{ fontWeight: 'bold', color: '#dc2626', fontSize: '16px' }}>{sub.avgPct}%</span>
                            </div>

                            {isExpanded && (
                              <div className="subject-accordion-body">
                                {assessmentList.map((item, idx) => (
                                  <div
                                    key={idx}
                                    style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      padding: '7px 0',
                                      borderBottom: idx < assessmentList.length - 1 ? '1px solid #e2e8f0' : 'none',
                                      fontSize: '13px',
                                      flexWrap: 'wrap',
                                      gap: '6px',
                                    }}
                                  >
                                    <span>
                                      <strong style={{ textTransform: 'capitalize' }}>{item.type}</strong>
                                      <span style={{ color: item.avgPct < 60 ? '#dc2626' : '#059669', marginLeft: '6px', fontWeight: 'bold' }}>
                                        ({item.avgPct}%)
                                      </span>
                                    </span>
                                    <button
                                      onClick={() => {
                                        setSelectedTopicForStudy(sub.subject)
                                        handleGenerateMaterials(sub.subject)
                                        setActiveTab('study_materials')
                                      }}
                                      className="btn-primary"
                                      style={{ padding: '4px 10px', fontSize: '11px' }}
                                    >
                                      Study {sub.subject} →
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Subject Breakdown: English #1, Mathematics #2, then other subjects */}
              <div className="data-card">
                <h3>Subject Competency Breakdown</h3>
                <p className="data-card-subtitle">Your progress across all enrolled subjects (Core subjects prioritized).</p>
                {sortSubjectsWithEnglishAndMathFirst(studentAnalytics.subjectBreakdown).map((sb, idx) => (
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
      {/* STUDENT TAB 4: MY ASSESSMENT HISTORY & SUBJECT AI EVALUATION   */}
      {/* ============================================================== */}
      {currentUser.role === 'student' && activeTab === 'my_scores' && (
        <div className="data-card">
          <h3>My Assessment History & AI Diagnostics</h3>
          <p className="data-card-subtitle">
            Select a subject to inspect your learning history and generate personalized AI diagnostic assessments.
          </p>

          {studentRegisteredSubjects.length === 0 ? (
            <p style={{ color: '#64748b' }}>No assessment scores on record yet. Once your teachers grade tests, your subject histories will appear here.</p>
          ) : (
            <>
              {/* Subject Tabs */}
              <div style={{ marginBottom: '18px' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Select Subject to View:
                </div>
                <div className="subject-tabs">
                  {studentRegisteredSubjects.map((sub) => {
                    const count = profile?.scores?.filter((s) => (s.subject || '').toLowerCase() === sub.toLowerCase()).length || 0
                    return (
                      <button
                        key={sub}
                        onClick={() => {
                          setSelectedSubjectHistory(sub)
                          setHistoryRecommendation('')
                        }}
                        className={`subject-tab-btn ${activeHistorySubject === sub ? 'active' : ''}`}
                      >
                        {sub === 'Chemistry' ? '🧪 Chemistry' : sub === 'Physic' || sub === 'Physics' ? '⚛️ Physics' : sub === 'Mathematics' ? '📐 Mathematics' : sub === 'Biology' ? '🧬 Biology' : sub === 'English' ? '📖 English' : sub} ({count})
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Subject Assessment Table */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>
                  📋 {activeHistorySubject} Assessment Records ({filteredHistoryScores.length})
                </h4>
                {filteredHistoryScores.length > 0 && (
                  <span style={{ fontSize: '13px', color: '#1e40af', fontWeight: 'bold' }}>
                    Subject Mastery: {calculateComposite(filteredHistoryScores)}%
                  </span>
                )}
              </div>

              {filteredHistoryScores.length === 0 ? (
                <div style={{ padding: '24px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', textAlign: 'center' }}>
                  <p style={{ margin: 0, color: '#64748b' }}>No assessment scores recorded for {activeHistorySubject} yet.</p>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Assessment Type</th>
                      <th>Subject</th>
                      <th>Score</th>
                      <th>Percentage</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistoryScores.map((s) => {
                      const pct = s.max_score > 0 ? Number(((s.score / s.max_score) * 100).toFixed(1)) : 0
                      return (
                        <tr key={s.id}>
                          <td>
                            <strong>
                              {s.type ? s.type.charAt(0).toUpperCase() + s.type.slice(1) : 'Assessment'}
                            </strong>
                          </td>
                          <td>{s.subject}</td>
                          <td>{s.score} / {s.max_score}</td>
                          <td>
                            <span style={{ fontWeight: 'bold', color: pct >= 70 ? '#059669' : pct >= 50 ? '#d97706' : '#dc2626' }}>
                              {pct}%
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${pct < 55 ? 'badge-review' : pct < 75 ? 'badge-progress' : 'badge-mastered'}`}>
                              {pct >= 75 ? 'Mastered' : pct >= 55 ? 'In Progress' : 'Needs Review'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}

              {/* AI Diagnostic Assessment Card strictly for this selected subject */}
              <div style={{ marginTop: '24px', padding: '20px', background: '#f0f9ff', borderRadius: '12px', border: '1px solid #bae6fd' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px', color: '#0369a1', fontSize: '16px' }}>
                      ⚡ AI Diagnostic Assessment for {activeHistorySubject}
                    </h4>
                    <p style={{ margin: 0, fontSize: '13px', color: '#0284c7' }}>
                      Generate a personalized diagnostic evaluation and strategic study recommendations based strictly on your {activeHistorySubject} scores.
                    </p>
                  </div>
                  <button
                    onClick={() => fetchStudentSubjectRecommendation(currentUser.student_id, activeHistorySubject)}
                    disabled={loadingHistoryRec || filteredHistoryScores.length === 0}
                    className="btn-primary"
                  >
                    {loadingHistoryRec ? 'Analyzing Performance...' : `Generate ${activeHistorySubject} AI Assessment`}
                  </button>
                </div>

                {loadingHistoryRec && <p style={{ marginTop: '14px', color: '#0369a1' }}>Analyzing your {activeHistorySubject} performance data...</p>}

                {historyRecommendation && (
                  <div style={{ marginTop: '16px', padding: '16px 20px', background: 'white', border: '1px solid #7dd3fc', borderRadius: '10px', lineHeight: 1.6, whiteSpace: 'pre-wrap', fontSize: '14px', color: '#1e293b' }}>
                    {historyRecommendation}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TEACHER INTERACTIVE MODALS & SETTINGS                          */}
      {/* ============================================================== */}

      {/* 1. Modal: Class Size (Registered Students List) */}
      {teacherModal === 'class_size' && teacherAnalytics && (
        <div className="modal-overlay" onClick={() => setTeacherModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">👥 Registered Students ({teacherAnalytics.totalStudents})</h3>
              <button className="modal-close-btn" onClick={() => setTeacherModal(null)}>✕</button>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: 0 }}>
              Complete roster of students registered under your classroom.
            </p>
            <table>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Class / Grade</th>
                  <th>Access Code</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {teacherAnalytics.studentsSummary.map((s) => (
                  <tr key={s.id}>
                    <td><strong>{s.name}</strong></td>
                    <td>{s.class_name || 'General'}</td>
                    <td><code>{s.access_code}</code></td>
                    <td>
                      <button
                        onClick={() => {
                          setProfileStudentId(s.id)
                          setActiveTab('profiles')
                          setTeacherModal(null)
                        }}
                        className="btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                      >
                        Inspect →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Modal: Class Average (Individual Student Composites) */}
      {teacherModal === 'class_average' && teacherAnalytics && (
        <div className="modal-overlay" onClick={() => setTeacherModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">📈 Class Average Breakdown ({teacherAnalytics.classAverage}%)</h3>
              <button className="modal-close-btn" onClick={() => setTeacherModal(null)}>✕</button>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: 0 }}>
              How each student's weighted composite contributes to the class average.
            </p>
            <table>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Class / Grade</th>
                  <th>Composite Score</th>
                  <th>Standing</th>
                </tr>
              </thead>
              <tbody>
                {teacherAnalytics.studentsSummary.map((s) => (
                  <tr key={s.id}>
                    <td><strong>{s.name}</strong></td>
                    <td>{s.class_name || 'General'}</td>
                    <td>
                      <strong style={{ color: s.compositeScore >= 70 ? '#059669' : s.compositeScore >= 50 ? '#d97706' : '#dc2626' }}>
                        {s.compositeScore}%
                      </strong>
                    </td>
                    <td>
                      <span className={`badge ${s.compositeScore >= 80 ? 'badge-mastered' : s.compositeScore >= 65 ? 'badge-progress' : 'badge-review'}`}>
                        {s.compositeScore >= 80 ? 'Advanced' : s.compositeScore >= 65 ? 'Proficient' : s.compositeScore >= 50 ? 'Basic' : 'Needs Help'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Modal: Total Assessments (Assessments Recorded Per Student) */}
      {teacherModal === 'total_assessments' && teacherAnalytics && (
        <div className="modal-overlay" onClick={() => setTeacherModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">📝 Total Assessments Recorded ({teacherAnalytics.totalScores})</h3>
              <button className="modal-close-btn" onClick={() => setTeacherModal(null)}>✕</button>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: 0 }}>
              Number of exams, quizzes, assignments, and participation scores recorded per student.
            </p>
            <table>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Class / Grade</th>
                  <th>Assessments Completed</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {teacherAnalytics.studentsSummary.map((s) => (
                  <tr key={s.id}>
                    <td><strong>{s.name}</strong></td>
                    <td>{s.class_name || 'General'}</td>
                    <td>
                      <strong style={{ color: '#1e40af' }}>{s.scoresCount} assessment{s.scoresCount !== 1 ? 's' : ''}</strong>
                    </td>
                    <td>
                      <button
                        onClick={() => {
                          setProfileStudentId(s.id)
                          setActiveTab('profiles')
                          setTeacherModal(null)
                        }}
                        className="btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                      >
                        View Records →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Modal: Students Needing Support */}
      {teacherModal === 'needing_support' && teacherAnalytics && (
        <div className="modal-overlay" onClick={() => setTeacherModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">⚠️ Students Needing Academic Support</h3>
              <button className="modal-close-btn" onClick={() => setTeacherModal(null)}>✕</button>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: 0 }}>
              Students identified with weighted composite below 60% or struggling on key topics.
            </p>
            {teacherAnalytics.atRiskStudents.length === 0 ? (
              <p style={{ color: '#059669', padding: '12px 0' }}>🎉 Excellent! No students currently flagged below 60%.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Class / Grade</th>
                    <th>Composite</th>
                    <th>Topics Needing Review</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {teacherAnalytics.atRiskStudents.map((s) => (
                    <tr key={s.id}>
                      <td><strong>{s.name}</strong></td>
                      <td>{s.class_name || 'General'}</td>
                      <td><strong style={{ color: '#dc2626' }}>{s.compositeScore}%</strong></td>
                      <td>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                          {s.weakTopics?.length > 0 ? s.weakTopics.join(', ') : 'Low composite average'}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => {
                            setProfileStudentId(s.id)
                            setActiveTab('profiles')
                            setTeacherModal(null)
                          }}
                          className="btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '11px' }}
                        >
                          Inspect →
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

      {/* 5. Modal: Teacher Account & Profile Settings */}
      {teacherModal === 'profile_settings' && (
        <div className="modal-overlay" onClick={() => setTeacherModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title">⚙️ Teacher Account Settings</h3>
              <button className="modal-close-btn" onClick={() => setTeacherModal(null)}>✕</button>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: 0 }}>
              Update your name, email address, or set a new password.
            </p>
            <form onSubmit={handleUpdateTeacherProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px', border: 'none', padding: 0, boxShadow: 'none' }}>
              <label>
                Full Name:
                <input
                  value={editTeacherName}
                  onChange={(e) => setEditTeacherName(e.target.value)}
                  placeholder="e.g. Damilare"
                  required
                />
              </label>

              <label>
                Email Address:
                <input
                  type="email"
                  value={editTeacherEmail}
                  onChange={(e) => setEditTeacherEmail(e.target.value)}
                  placeholder="name@school.edu"
                  required
                />
              </label>

              <label>
                Subject Taught:
                <select
                  value={editTeacherSubject}
                  onChange={(e) => setEditTeacherSubject(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Biology">Biology</option>
                  <option value="English">English</option>
                  <option value="Economics">Economics</option>
                  <option value="Geography">Geography</option>
                  <option value="Agricultural Science">Agricultural Science</option>
                  <option value="Civic Education">Civic Education</option>
                </select>
              </label>

              <label>
                New Password (leave blank to keep current):
                <input
                  type="password"
                  value={editTeacherPassword}
                  onChange={(e) => setEditTeacherPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </label>

              <button type="submit" disabled={updatingProfile} className="btn-primary" style={{ marginTop: '8px' }}>
                {updatingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
              </button>

              {editTeacherMessage && (
                <p style={{ margin: 0, padding: '10px 14px', background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', borderRadius: '8px', fontSize: '13px' }}>
                  {editTeacherMessage}
                </p>
              )}

              {editTeacherError && (
                <p style={{ margin: 0, padding: '10px 14px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '13px' }}>
                  {editTeacherError}
                </p>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App