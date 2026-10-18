# 🎓 AI Student Tracker

> **A multi-teacher, multi-dimensional academic performance tracking & AI-powered diagnostic remediation platform for secondary school students and educators.**

* **Project Link (Domain):** [https://ai-student-tracker-nine.vercel.app](https://ai-student-tracker-nine.vercel.app)
* **Provider:** Vercel
* **GitHub Repository:** [https://github.com/Michael-AI-Dam/AI-Student-tracker](https://github.com/Michael-AI-Dam/AI-Student-tracker)

---

## 📖 The Core Problem & Philosophy

In secondary school, terminal examinations carry disproportionate weight. A student who actively participates in class, consistently completes laboratory assignments, and shows steady improvement across weekly quizzes can easily fail an entire term due to a single bad exam day or test anxiety.

**AI Student Tracker replaces single-exam bias with Multi-Dimensional Weighted Composite Mastery.** It records evaluations across five distinct pedagogical dimensions:
1. **Exams (40% Weight)** — Summative mastery assessments.
2. **Tests (20% Weight)** — Periodic milestone assessments.
3. **Quizzes (15% Weight)** — Rapid diagnostic knowledge checks.
4. **Assignments (15% Weight)** — Continuous homework and problem sets.
5. **Participation (10% Weight)** — Classroom engagement, questions asked, and lab participation.

Rather than generic positive reinforcement, the system pairs these metrics with **Groq-accelerated AI Diagnostic Engines (Llama-3)** to deliver honest, data-grounded evaluations, interactive step-by-step micro-learning modules, and adaptive diagnostic practice questions.

---

## 🌟 Key Features & Capabilities

### 👨‍🏫 Teacher Analytics Cockpit
- **Role-Based Subject Isolation:** Teachers select their subject upon login (e.g. Chemistry, Physics, Mathematics, Biology). A teacher's dashboard strictly isolates their classroom domain—preventing subject collision between educators.
- **Class-Wide Assessment Performance Matrix:** Tracks submission counts, class average percentages, and progress badges (`Mastered`, `In Progress`, `Needs Review`) across all 5 assessment types (`Assignment`, `Quiz`, `Test`, `Participation`, `Exam`).
- **Interactive High-Level Metrics:** Clickable summary cards for **Class Size**, **Class Average**, **Total Assessments**, and **Early Intervention Alerts** with detailed drill-down modal views.
- **Permanent Access Code & Cross-Teacher Linking:**
  - When a student is enrolled by any teacher, they receive a single permanent alphanumeric access code.
  - Recognizes equivalent grade levels seamlessly (`SSS 1` $\equiv$ `Grade 10`, `SSS 2` $\equiv$ `Grade 11`, `SSS 3` $\equiv$ `Grade 12`).
  - Subsequent subject teachers adding the same student automatically link to their existing student profile without issuing duplicate codes or requiring multiple signups.
- **Student Roster Management:** Register new students, search and filter roster members, and remove students from classroom rosters safely.
- **Direct Score Recording:** Streamlined assessment grading by selecting the student, choosing the assessment type, and recording the raw score and max possible points.
- **Teacher Account Settings:** In-app modal allowing educators to update their display name, email address, assigned subject, and secure login password.

### 🧑‍🎓 Student Learning & Diagnostic Portal
- **Single Permanent Login:** Students sign up once using their school-issued Access Code and password.
- **Personalized Mastery Dashboard:** Displays their overall weighted composite mastery score, completed assessment count, mastered subject count, and active focus areas.
- **Demonstrated Strengths by Subject:** Expandable subject cards showing performance broken down by assessment type (`Exam`, `Quiz`, `Test`, `Assignment`, `Participation`) matching their verified assessment history with zero confusing topic clutter.
- **Focus & Reinforcement Areas:** Identifies subjects or assessment areas falling below mastery (<60%) with one-click navigation to targeted study modules.
- **Core Subject Competency Breakdown:** Prioritizes foundational subjects (English #1, Mathematics #2) followed by all enrolled sciences, humanities, and technical subjects.
- **Subject-First Assessment History:** Clean tabbed navigation allowing students to select an enrolled subject (e.g., `🧪 Chemistry`, `⚛️ Physics`) to inspect chronological assessment records with exact scores, percentages, and performance badges.
- **⚡ Subject-Specific AI Diagnostics:** Students can trigger an on-demand AI diagnostic assessment tailored specifically to their performance history in the selected subject.
- **📖 Learn with AI Materials:** AI generator synthesizing concept analogies, real-world examples, step-by-step worked calculations, and diagnostic self-check questions for any concept or subject.
- **🎯 Adaptive Practice Quiz:** Generates tailored multiple-choice diagnostic quizzes with contextual hints, instant scoring, and step-by-step answer explanations.

---

## 🛠️ System Architecture & Technology Stack

| Layer | Technology | Provider |
|---|---|---|
| **Frontend** | React 19, Vite 8, Modern CSS Variables | Vercel |
| **Backend API** | Node.js, Express 4, Serverless Functions | Vercel |
| **Database** | Google Cloud Firestore (Managed NoSQL) | Google Cloud Platform (GCP) |
| **AI Diagnostic Engine** | Groq Cloud SDK (`llama-3.3-70b-versatile`) | Groq Cloud (LPU Acceleration) |
| **Security & Auth** | bcryptjs password hashing, Access Code validation | Stateless role-based verification |

---

## 🧭 Project Status: What the App Can & Cannot Do

### ✅ What the App CAN Do (Current Capabilities)
- Multi-teacher classroom isolation (teachers only see and grade their own subject).
- Single permanent student access code across all teachers and subjects.
- Automated recognition of equivalent secondary class names (`SSS 1-3` $\leftrightarrow$ `Grade 10-12`).
- 5-dimensional weighted assessment tracking (`Exam`, `Test`, `Quiz`, `Assignment`, `Participation`).
- Class-wide performance breakdowns by assessment type with automated mastery status.
- Student performance and strength tracking by assessment type matching historical grades.
- Subject-first assessment history tables with dedicated subject tabs.
- On-demand AI diagnostic evaluations based strictly on verified assessment data.
- AI micro-learning module generator and adaptive 3-question practice quiz engine.
- Teacher profile settings with password update capabilities.
- Live, production-ready serverless deployments on Vercel backed by Google Cloud Firestore.

### ⚠️ What the App CANNOT Do Yet (Current Limitations)
- **No Automated SMS/WhatsApp Alerts:** Early intervention warnings are visible in the teacher cockpit but not automatically dispatched to guardians via SMS/WhatsApp.
- **No Bulk CSV Upload:** Teachers currently enter students and scores through structured forms rather than uploading an entire spreadsheet.
- **No PDF/Excel Gradebook Export:** Roster and assessment records cannot yet be exported directly into printable PDF report cards or Excel sheets.
- **No Parent/Guardian Portal:** Only Teacher and Student roles are active; parent observer accounts are not yet implemented.
- **No Real-Time WebSocket Sockets:** Updates are fetched asynchronously on action rather than pushed via live WebSockets.
- **No Full Offline/PWA Sync:** Requires an active internet connection to authenticate and communicate with Firestore.

---

## 🚀 Upcoming Features Roadmap

* [ ] **Parent & Guardian Observer Portal:** Dedicated access code allowing parents to monitor their child's composite progress across all subjects without editing permissions.
* [ ] **Bulk CSV Roster & Score Import:** Upload class rosters and term assessment sheets via CSV/Excel in a single click.
* [ ] **Termly PDF Report Card Generator:** Download official, branded student term report cards with composite rankings, teacher remarks, and AI diagnostic summaries.
* [ ] **Automated SMS & WhatsApp Intervention Alerts:** Connect Twilio/Termii gateways to alert parents when a student's composite falls into the "Needs Support" tier.
* [ ] **School Administrator / Principal Dashboard:** School-wide bird's-eye view tracking cross-departmental subject averages, teacher activity, and grade distribution across all secondary classes.
* [ ] **Progressive Web App (PWA) Offline Mode:** Offline score drafts with automated background synchronization upon network reconnection.

---

## 👨‍💻 Author, Attribution & Vision

* **Author:** **Asaolu Michael O.**
* **LinkedIn:** [https://linkedin.com/in/mikesungaiconvergence](https://linkedin.com/in/mikesungaiconvergence)
* **GitHub:** [@Michael-AI-Dam](https://github.com/Michael-AI-Dam)

### Development Story & Coming Clean
This platform represents a journey of human vision augmented by artificial intelligence:
- **Version 1.0** was initially conceptualized, prototyped, and built with **Claude AI assist**.
- **Version 2.0** underwent a comprehensive architectural upgrade, multi-teacher isolation engineering, permanent code harmonization across Nigerian/British grade equivalencies, and complete serverless cloud deployment with **Google Antigravity Assist**.
- **Core Vision & Oversight:** Asaolu Michael O. conceived the vision, designed the pedagogical data models, defined the multi-dimensional composite formula, directed feature implementations, performed extensive debugging, and continuously tested and validated user workflows.

### Open for Review & Collaboration
> *"I am actively ready to make modifications, refine features, and evolve this platform based on your reviews, institutional feedback, and suggestions. Together, let us empower the minds and educators committed to nurturing young talents to greatness."*
