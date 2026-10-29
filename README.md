# Attendly — College Attendance Management System

> **Tagline:** *"Track Attendance. Stay on Target."*

Attendly is a modern, full-stack College Attendance Management System built with a **React.js (Vite)** frontend, a **Python (Flask)** REST backend, and a local **SQLite** database.

Designed specifically for colleges and academic departments, Attendly modernizes student roll call, eliminates paper registers, detects low attendance shortages early, and features a **Smart Attendance Recovery Planner** that mathematically projects future attendance requirements for students.

---

## 📌 Problem Statement

Traditional attendance management in colleges suffers from:
1. **Paper Registers & Scatter:** Attendance records are scattered across manual paper sheets or static spreadsheets.
2. **Delayed Awareness:** Students only discover they have an attendance shortage right before semester examinations when it is too late to recover.
3. **Lack of Actionable Insight:** Standard systems display attendance percentages, but fail to explain how many consecutive future classes a student must attend to reach the minimum eligibility criteria.

---

## 🎯 Objectives

- Enable **Students** to view attendance records in real time and track recovery goals.
- Enable **Faculty** to mark lectures with 1-click digital roll calls and download official reports.
- Enable **Administrators** to manage students, faculty, classes, and course assignments centrally.
- Provide a mathematical recovery calculator based on actual recorded sessions without relying on opaque AI or mock data.

---

## 🌟 Key Features

### 1. Role-Based Portals & Dashboards
- **Administrator Dashboard:**
  - Complete metrics: Total enrolled students, faculty count, course subjects, class sections.
  - Student & Faculty directory management with search and instant enrollment.
  - Faculty course assignment management.
  - College-wide low attendance watchlist (< 75%).
- **Faculty Dashboard:**
  - View assigned classes and course subjects.
  - Quick Roll Call: 1-click "All Present" or "All Absent" with individual toggle switches.
  - Duplicate prevention: safeguards against double-marking sessions on the same date unless authorized correction mode is enabled.
  - Session history and detailed student roll logs.
  - Class-level performance reporting with one-click **CSV export** for Excel.
- **Student Dashboard:**
  - Clean overview: Attended vs. missed lectures, subject-wise attendance percentages, visual status indicators (Green / Amber / Red).
  - Date-filtered attendance history log.
  - Student attendance summary report downloadable as CSV.

---

## 🚀 Special Core Feature: Smart Attendance Recovery Planner

Many students discover shortages too late to take corrective action. Attendly features an authoritative, mathematical calculator implemented strictly in Python using actual database records:

### 1. Recovery Formulation
Let:
- $A$ = number of classes attended
- $C$ = total number of classes conducted
- $T$ = required attendance percentage expressed as a decimal ($0.75$ for 75%)

When $C > 0$, the minimum number of consecutive future classes $N$ that the student must attend without any absences is calculated as:
$$N = \max\left(0, \left\lceil \frac{T \times C - A}{1 - T} \right\rceil\right)$$

### 2. Verified Test Case
- A student attended **36 out of 50 classes** ($72.0\%$).
- Target: **75.0%**.
- Calculation: $\lceil (0.75 \times 50 - 36) / (1 - 0.75) \rceil = \lceil (37.5 - 36) / 0.25 \rceil = \lceil 1.5 / 0.25 \rceil = 6$.
- Result: The student needs to attend the next **6 consecutive classes**.
- Projected attendance after recovery: $(36 + 6) / (50 + 6) = 42 / 56 = \mathbf{75.0\%}$.

### 3. Safe Absence Allowance
If a student is currently above the target threshold, the maximum additional classes $M$ the student can miss while maintaining the minimum percentage is calculated as:
$$M = \max\left(0, \left\lfloor \frac{A - T \times C}{T} \right\rfloor\right)$$

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, React Router v7, Axios, Lucide React, Pure Modern CSS (Poppins font, CSS variables) |
| **Backend** | Python 3.10+, Flask, Flask-SQLAlchemy, Flask-CORS, Flask-JWT-Extended, Werkzeug Security |
| **Database** | SQLite (zero-config local database file stored in `backend/instance/attendly.db`) |

---

## 📂 Project Structure

```text
COLLEGE-ATTENDANCE/
├── backend/
│   ├── app.py                  # Flask REST API endpoints & DB initialization
│   ├── models.py               # SQLAlchemy database models & relationships
│   ├── recovery_planner.py     # Special feature mathematical calculations
│   ├── requirements.txt        # Python backend dependencies
│   ├── test_recovery.py        # Unit tests for recovery math
│   ├── test_e2e.py             # Integration & API tests
│   └── .env.example            # Environment configuration template
├── frontend/
│   ├── src/
│   │   ├── assets/             # Campus illustrations & SVGs
│   │   ├── components/         # ProtectedRoute, AppLayout, Sidebar
│   │   ├── context/            # AuthContext (JWT handling & sessions)
│   │   ├── pages/
│   │   │   ├── Login.jsx       # Campus-themed sign-in with quick demo access
│   │   │   ├── Register.jsx    # Student registration
│   │   │   ├── admin/          # Admin dashboard, students, faculty, classes
│   │   │   ├── faculty/        # Faculty dashboard, roll call, reports
│   │   │   └── student/        # Student dashboard, recovery planner, history
│   │   ├── services/           # Axios client with JWT interceptor
│   │   ├── App.jsx             # React Router routing setup
│   │   ├── main.jsx            # React root mount
│   │   └── style.css           # Modern blue/indigo UI styling system
│   ├── index.html              # HTML shell with Poppins font
│   ├── package.json            # Node dependencies and scripts
│   └── vite.config.js          # Vite config
├── .gitignore                  # Excludes venv, node_modules, and databases
└── README.md                   # Complete documentation
```

---

## 🗄️ Database Architecture (SQLite)

The local SQLite database (`backend/instance/attendly.db`) initializes automatically when starting the backend.

- `users`: Credentials, full name, role (`admin`, `faculty`, `student`), password hash.
- `student_profiles`: Roll number, department, semester, class foreign key.
- `faculty_profiles`: Employee ID, department, user foreign key.
- `classes`: Section name (e.g. `CSE-3A`), department, semester.
- `subjects`: Course code (e.g. `CS501`), course name, min attendance requirement (default 75%).
- `enrollments`: Student-to-subject relational mapping.
- `faculty_assignments`: Mapping faculty members to specific subjects and classes.
- `attendance_sessions`: Lecture date, subject, class, and instructor (enforces unique session per date/class/subject).
- `attendance_records`: Individual student attendance status (`Present` or `Absent`).

---

## 🔑 Demo Accounts (Out-of-the-Box)

The application automatically seeds demonstration accounts on first run:

| Role | Email | Password | Details |
|---|---|---|---|
| **Administrator** | `admin@college.edu` | `Admin@123` | Institutional Dean / Administrator |
| **Faculty** | `faculty@college.edu` | `Faculty@123` | Assigned to CSE-3A (CS501, CS502) |
| **Student (Alex Rivera)** | `student@college.edu` | `Student@123` | Roll `21CS101` (36/50 classes = 72% in CS501) |
| **Student (Maya Lin)** | `maya@college.edu` | `Student@123` | Roll `21CS102` (High attendance = 92%) |
| **Student (Rahul Sharma)**| `rahul@college.edu` | `Student@123` | Roll `21CS103` (Shortage = 50%) |

*Note: You can also click the quick demo buttons on the login screen for instant credentials!*

---

## 💻 How to Run Locally (Windows PowerShell)

### Prerequisites
- Python 3.10+ installed
- Node.js (v18+) and npm installed

### 1. Start the Flask Backend

Open a PowerShell terminal:

```powershell
# Navigate to the backend directory
cd "c:\Users\balla\Downloads\WEB DEVELOPMENT\COLLEGE-ATTENDANCE\backend"

# Create a virtual environment (if not already created)
python -m venv venv

# Activate the virtual environment
.\venv\Scripts\Activate.ps1

# Install requirements
pip install -r requirements.txt

# Start the Flask API server (running on port 5000)
python app.py
```

*The API will start at `http://127.0.0.1:5000` and automatically create/seed the SQLite database.*

### 2. Start the React Frontend

Open a second PowerShell terminal:

```powershell
# Navigate to the frontend directory
cd "c:\Users\balla\Downloads\WEB DEVELOPMENT\COLLEGE-ATTENDANCE\frontend"

# Install npm packages
npm install

# Start the development server
npm run dev
```

*The frontend UI will be accessible at `http://localhost:5173`.*

---

## 🧪 Testing Results

Unit tests and end-to-end integration tests are included in the backend:

1. **Recovery Planner Unit Tests:**
   ```powershell
   cd backend
   .\venv\Scripts\python test_recovery.py
   ```
   *Result:* Ran 4 tests — **ALL PASSED (OK)** (Phase 5 sample 36/50 verified, safe absences verified, 100% boundary check verified).

2. **Integration Test Suite:**
   ```powershell
   cd backend
   .\venv\Scripts\python test_e2e.py
   ```
   *Result:* Ran 5 tests — **ALL PASSED (OK)** (Auth, role claims, session marking, duplicate collision prevention, student recovery API, and CSV generation verified).

---

## ⚠️ Known Limitations
- Attendance sessions default to one class session per subject per day.
- Intended for local SQLite development and college evaluation demonstrations.

