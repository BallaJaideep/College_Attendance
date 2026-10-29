import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import StudentManagement from './pages/admin/StudentManagement';
import FacultyManagement from './pages/admin/FacultyManagement';
import ClassSubjectManagement from './pages/admin/ClassSubjectManagement';

// Faculty Pages
import FacultyDashboard from './pages/faculty/FacultyDashboard';
import MarkAttendance from './pages/faculty/MarkAttendance';
import SessionHistory from './pages/faculty/SessionHistory';
import FacultyReports from './pages/faculty/FacultyReports';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import RecoveryPlanner from './pages/student/RecoveryPlanner';
import StudentHistory from './pages/student/StudentHistory';

const RootRedirect = () => {
  const { user, token } = useAuth();
  if (!token || !user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'faculty') return <Navigate to="/faculty" replace />;
  return <Navigate to="/student" replace />;
};

const NotFound = () => (
  <div style={{ textAlign: 'center', padding: '80px 20px', color: '#64748b' }}>
    <h1 style={{ fontSize: '3rem', color: '#0f172a', marginBottom: '8px' }}>404</h1>
    <p style={{ marginBottom: '20px' }}>The requested college portal page was not found.</p>
    <a href="/" className="btn btn-primary">Return to Dashboard</a>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<RootRedirect />} />

        {/* Admin Protected Routes */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin" element={<AppLayout title="Administrator Overview" subtitle="System Statistics & Management" />}>
            <Route index element={<AdminDashboard />} />
            <Route path="students" element={<StudentManagement />} />
            <Route path="faculty" element={<FacultyManagement />} />
            <Route path="classes" element={<ClassSubjectManagement />} />
            <Route path="subjects" element={<ClassSubjectManagement />} />
          </Route>
        </Route>

        {/* Faculty Protected Routes */}
        <Route element={<ProtectedRoute allowedRoles={['faculty']} />}>
          <Route path="/faculty" element={<AppLayout title="Faculty Portal" subtitle="Roll Call & Attendance Reporting" />}>
            <Route index element={<FacultyDashboard />} />
            <Route path="mark" element={<MarkAttendance />} />
            <Route path="history" element={<SessionHistory />} />
            <Route path="reports" element={<FacultyReports />} />
          </Route>
        </Route>

        {/* Student Protected Routes */}
        <Route element={<ProtectedRoute allowedRoles={['student']} />}>
          <Route path="/student" element={<AppLayout title="Student Portal" subtitle="Track Attendance & Stay on Target" />}>
            <Route index element={<StudentDashboard />} />
            <Route path="recovery-planner" element={<RecoveryPlanner />} />
            <Route path="history" element={<StudentHistory />} />
          </Route>
        </Route>

        {/* 404 Fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;

