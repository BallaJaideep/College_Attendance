import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  BookOpen,
  CalendarCheck,
  History,
  TrendingUp,
  FileSpreadsheet,
  LogOut,
  UserCheck,
  Building2
} from 'lucide-react';

const AppLayout = ({ title, subtitle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand-icon">
            <GraduationCap size={24} />
          </div>
          <div className="brand-text">
            <h2>Attendly</h2>
            <span>College Attendance MS</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {/* Admin Navigation */}
          {user?.role === 'admin' && (
            <>
              <NavLink to="/admin" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <LayoutDashboard size={18} />
                <span>Dashboard</span>
              </NavLink>
              <NavLink to="/admin/students" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <Users size={18} />
                <span>Manage Students</span>
              </NavLink>
              <NavLink to="/admin/faculty" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <UserCheck size={18} />
                <span>Manage Faculty</span>
              </NavLink>
              <NavLink to="/admin/classes" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <Building2 size={18} />
                <span>Manage Classes</span>
              </NavLink>
              <NavLink to="/admin/subjects" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <BookOpen size={18} />
                <span>Manage Subjects</span>
              </NavLink>
            </>
          )}

          {/* Faculty Navigation */}
          {user?.role === 'faculty' && (
            <>
              <NavLink to="/faculty" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <LayoutDashboard size={18} />
                <span>Dashboard</span>
              </NavLink>
              <NavLink to="/faculty/mark" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <CalendarCheck size={18} />
                <span>Mark Attendance</span>
              </NavLink>
              <NavLink to="/faculty/history" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <History size={18} />
                <span>Session History</span>
              </NavLink>
              <NavLink to="/faculty/reports" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <FileSpreadsheet size={18} />
                <span>Reports & CSV</span>
              </NavLink>
            </>
          )}

          {/* Student Navigation */}
          {user?.role === 'student' && (
            <>
              <NavLink to="/student" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <LayoutDashboard size={18} />
                <span>My Dashboard</span>
              </NavLink>
              <NavLink to="/student/recovery-planner" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <TrendingUp size={18} />
                <span>Recovery Planner</span>
              </NavLink>
              <NavLink to="/student/history" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <History size={18} />
                <span>Attendance Log</span>
              </NavLink>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-badge">
            <div className="avatar">
              {getInitials(user?.full_name)}
            </div>
            <div className="user-info">
              <div className="user-name">{user?.full_name}</div>
              <div className="user-role">{user?.role}</div>
            </div>
            <button
              onClick={handleLogout}
              className="btn-outline"
              style={{ padding: '6px', border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-wrapper">
        <header className="topbar">
          <div className="topbar-title">
            <h1>{title || 'Dashboard'}</h1>
            <p>{subtitle || 'Track Attendance. Stay on Target.'}</p>
          </div>
          <div className="topbar-actions">
            <span className="badge gray" style={{ padding: '6px 12px' }}>
              Logged in as: <strong>{user?.email}</strong>
            </span>
            <button onClick={handleLogout} className="btn btn-outline btn-sm">
              <LogOut size={14} />
              <span>Logout</span>
            </button>
          </div>
        </header>

        <main className="content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;

