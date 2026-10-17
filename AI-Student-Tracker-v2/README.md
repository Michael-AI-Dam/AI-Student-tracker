# EduSTEM AI (Student Tracker)

An AI-powered personalized learning and assessment system for secondary school students and teachers, powered by Firebase Firestore, Express, React (Vite), and Groq AI.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 (Vite), Tailwind CSS, deployed on Vercel |
| Backend | Node.js + Express, deployable on Vercel Serverless or Render |
| Database | Firebase Cloud Firestore |
| AI | Groq API (Llama-based model) |
| Auth | bcrypt password hashing, role-based access |

---

## Project Structure

```
AI for Learner/
├── student-tracker-frontend/   # React (Vite) App
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   ├── .env.example
│   ├── vercel.json
│   └── package.json
└── student-tracker-backend/    # Express API + Firebase
    ├── server.js
    ├── db.js
    ├── .env.example
    ├── vercel.json
    └── package.json
```

---

## Firebase Setup Guide

1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project (e.g. `edustem-ai`).
2. In the left sidebar, click **Build** > **Firestore Database**.
3. Click **Create database**, choose your closest region, and start in **Production mode** (or Test mode).
4. Go to **Project Settings** (gear icon next to Project Overview) > **Service accounts** tab.
5. Click **Generate new private key** and download the JSON file.
6. You have two ways to provide credentials:
   - **Locally:** Rename the downloaded JSON file to `serviceAccountKey.json` and place it in the `student-tracker-backend/` folder (it is automatically ignored by `.gitignore`).
   - **On Vercel / Cloud:** Copy the values from the JSON file into environment variables:
     - `FIREBASE_PROJECT_ID` = `project_id`
     - `FIREBASE_CLIENT_EMAIL` = `client_email`
     - `FIREBASE_PRIVATE_KEY` = `private_key` (including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`)

---

## Deployment to Vercel

### 1. Deploy the Backend to Vercel (or Render)
If deploying the backend to Vercel:
1. In your Vercel Dashboard, click **Add New...** > **Project**.
2. Import your GitHub repository.
3. In **Root Directory**, click Edit and select `student-tracker-backend`.
4. In **Environment Variables**, add:
   - `GROQ_API_KEY`: Your Groq API key
   - `FIREBASE_PROJECT_ID`: Your Firebase Project ID
   - `FIREBASE_CLIENT_EMAIL`: Your Firebase Client Email
   - `FIREBASE_PRIVATE_KEY`: Your Firebase Private Key
5. Click **Deploy**. Note down the deployment URL (e.g., `https://student-tracker-backend.vercel.app`).

### 2. Deploy the Frontend to Vercel
1. In your Vercel Dashboard, click **Add New...** > **Project**.
2. Import the same GitHub repository.
3. In **Root Directory**, click Edit and select `student-tracker-frontend`.
4. In **Environment Variables**, add:
   - `VITE_API_URL`: Your backend URL (e.g. `https://student-tracker-backend.vercel.app` or your Render backend URL)
5. Click **Deploy**!