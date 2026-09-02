# EduSTEM AI

An AI-powered personalized learning and assessment system for secondary school students and teachers.

**Live app:** https://ai-student-tracker-nine.vercel.app
**Backend API:** https://ai-student-tracker-btiu.onrender.com

## Why this exists

In secondary school, I was the student who guided my classmates in chemistry — yet I failed the subject myself. That one exam score didn't reflect my real understanding, and its weight followed me around. EduSTEM AI tracks a student's performance across **exams, quizzes, assignments, and class participation** — not exams alone — and uses AI to give honest, data-grounded feedback instead of a single number.

## Features

- **Teacher accounts** — add students (each gets a unique access code), record scores, view any of their own students' profiles
- **Student accounts** — sign up with a teacher-issued access code, view only their own profile and scores
- **Composite scoring** — weighted: 50% exams, 20% quizzes, 20% assignments, 10% participation
- **AI recommendations** — generated strictly from the student's actual recorded data (Groq API)
- **Secure by design** — hashed passwords, teacher-owned student records, access-code verification to prevent impersonation

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite), deployed on Vercel |
| Backend | Node.js + Express, deployed on Render |
| Database | PostgreSQL, hosted on Render |
| AI | Groq API (Llama-based model) |
| Auth | bcrypt password hashing, role-based access |

## Project structure

```
AI for Learner/
├── student-tracker-frontend/   # React app
└── student-tracker-backend/    # Express API + database
```

## Running locally

**Backend**
```bash
cd student-tracker-backend
npm install
# create a .env file with DATABASE_URL and GROQ_API_KEY
npm run dev
```

**Frontend**
```bash
cd student-tracker-frontend
npm install
npm run dev
```

## Environment variables (backend)

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `GROQ_API_KEY` | API key for AI recommendations |

## Limitations / Future work

- No password reset yet (needs email/SMTP)
- Access codes are shared by teachers manually, not auto-emailed
- Single subject/class per student currently
- No teacher-side analytics dashboard yet

## Author

Michael Oluwadamilare ([@Michael-AI-Dam](https://github.com/Michael-AI-Dam))