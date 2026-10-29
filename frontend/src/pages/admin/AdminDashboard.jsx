import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Users, UserCheck, BookOpen, Building2, AlertTriangle, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/dashboard');
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load administrator dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading dashboard insights...</div>;
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  const { stats, shortage_students, recent_sessions } = data || {};

  return (
    <div>
      {/* Overview Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <Users size={26} />
          </div>
          <div className="stat-info">
            <p>Total Enrolled Students</p>
            <h3>{stats?.total_students || 0}</h3>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon indigo">
            <UserCheck size={26} />
          </div>
          <div className="stat-info">
            <p>Faculty Members</p>
            <h3>{stats?.total_faculty || 0}</h3>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <BookOpen size={26} />
          </div>
          <div className="stat-info">
            <p>Active Subjects</p>
            <h3>{stats?.total_subjects || 0}</h3>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon amber">
            <Building2 size={26} />
          </div>
          <div className="stat-info">
            <p>Classes / Sections</p>
            <h3>{stats?.total_classes || 0}</h3>
          </div>
        </div>
      </div>

      {/* College Metric Overview Banner */}
      <div className="panel" style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', color: '#ffffff' }}>
        <div className="panel-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '6px' }}>
              Institution Attendance Rate: {stats?.overall_percentage}%
            </h2>
            <p style={{ fontSize: '0.88rem', color: '#bfdbfe' }}>
              {stats?.total_sessions} class sessions conducted across all departments.
            </p>
          </div>
          <div>
            <span className="badge amber" style={{ fontSize: '0.88rem', padding: '8px 16px', background: '#fef3c7', color: '#92400e' }}>
              <AlertTriangle size={16} /> {stats?.students_shortage_count} Students with Low Attendance (&lt; 75%)
            </span>
          </div>
        </div>
      </div>

      {/* Two Column Layout for Shortage Alert & Recent Sessions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px' }}>
        {/* Attendance Shortage Watchlist */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <AlertTriangle size={18} color="#ef4444" />
              <span>Low Attendance Watchlist (&lt; 75%)</span>
            </div>
            <Link to="/admin/students" className="btn btn-outline btn-sm">
              View All Students <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Roll Number</th>
                    <th>Name</th>
                    <th>Class</th>
                    <th>Attendance</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {shortage_students && shortage_students.length > 0 ? (
                    shortage_students.map((st) => (
                      <tr key={st.id}>
                        <td><strong>{st.roll_number}</strong></td>
                        <td>{st.name}</td>
                        <td>{st.class_name}</td>
                        <td>
                          <strong>{st.percentage}%</strong>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>
                            ({st.attended}/{st.total} classes)
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${st.percentage < 60 ? 'red' : 'amber'}`}>
                            {st.percentage < 60 ? 'Critical' : 'Warning'}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="empty-state">
                        No students currently have attendance shortages below 75%.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Recent Conducted Sessions */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <BookOpen size={18} color="#2563eb" />
              <span>Recent Recorded Sessions</span>
            </div>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Subject</th>
                    <th>Class</th>
                    <th>Present / Total</th>
                    <th>Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {recent_sessions && recent_sessions.length > 0 ? (
                    recent_sessions.map((sess) => (
                      <tr key={sess.id}>
                        <td>{sess.attendance_date}</td>
                        <td>
                          <div><strong>{sess.subject_code}</strong></div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{sess.subject_name}</div>
                        </td>
                        <td>{sess.class_name}</td>
                        <td>{sess.present_count} / {sess.total_students}</td>
                        <td>
                          <span className={`badge ${sess.attendance_percentage >= 75 ? 'green' : 'amber'}`}>
                            {sess.attendance_percentage}%
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="empty-state">
                        No attendance sessions recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
