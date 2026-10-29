import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { BookOpen, CalendarCheck, Users, AlertTriangle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const FacultyDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/faculty/dashboard');
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load faculty portal data.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading faculty workspace...</div>;
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  const { stats, assignments, shortage_students, recent_sessions } = data || {};

  return (
    <div>
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon indigo">
            <BookOpen size={26} />
          </div>
          <div className="stat-info">
            <p>Assigned Course Subjects</p>
            <h3>{stats?.assigned_subjects_count || 0}</h3>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon blue">
            <CalendarCheck size={26} />
          </div>
          <div className="stat-info">
            <p>Total Classes Conducted</p>
            <h3>{stats?.classes_conducted || 0}</h3>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <Users size={26} />
          </div>
          <div className="stat-info">
            <p>Students In Your Classes</p>
            <h3>{stats?.students_count || 0}</h3>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon red">
            <AlertTriangle size={26} />
          </div>
          <div className="stat-info">
            <p>Students with Shortage</p>
            <h3>{stats?.shortage_count || 0}</h3>
          </div>
        </div>
      </div>

      {/* Quick Action Banner */}
      <div className="panel" style={{ background: 'linear-gradient(135deg, #3730a3, #4f46e5)', color: '#ffffff' }}>
        <div className="panel-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '4px' }}>
              Mark Today's Class Attendance
            </h2>
            <p style={{ fontSize: '0.86rem', color: '#c7d2fe' }}>
              Fast digital roll call with 1-click "Mark All Present" & instant student notifications.
            </p>
          </div>
          <Link to="/faculty/mark" className="btn" style={{ backgroundColor: '#ffffff', color: '#3730a3', fontWeight: '600' }}>
            Open Attendance Marker <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      {/* Grid: Assigned Classes & Low Attendance Students */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '24px' }}>
        {/* Assigned Courses */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <BookOpen size={18} color="#4f46e5" />
              <span>Your Assigned Subjects & Classes</span>
            </div>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Subject Name</th>
                    <th>Class Section</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments && assignments.length > 0 ? (
                    assignments.map(a => (
                      <tr key={a.id}>
                        <td><strong>{a.subject_code}</strong></td>
                        <td>{a.subject_name}</td>
                        <td><span className="badge indigo">{a.class_name}</span></td>
                        <td>
                          <Link
                            to={`/faculty/mark?subject_id=${a.subject_id}&class_id=${a.class_id}`}
                            className="btn btn-primary btn-sm"
                          >
                            Mark Roll
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="empty-state">No courses currently assigned by the administrator.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Low Attendance Warning */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <AlertTriangle size={18} color="#ef4444" />
              <span>Students Below Attendance Threshold</span>
            </div>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Roll No</th>
                    <th>Student Name</th>
                    <th>Subject</th>
                    <th>Attendance</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {shortage_students && shortage_students.length > 0 ? (
                    shortage_students.map(st => (
                      <tr key={`${st.student_id}-${st.subject_code}`}>
                        <td><strong>{st.roll_number}</strong></td>
                        <td>{st.name}</td>
                        <td>{st.subject_code}</td>
                        <td>
                          <strong>{st.percentage}%</strong>
                          <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block' }}>
                            ({st.attended}/{st.conducted})
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${st.percentage < 60 ? 'red' : 'amber'}`}>
                            {st.percentage < 60 ? 'Critical' : 'Shortage'}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="empty-state">All students currently meet the required attendance percentage!</td>
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

export default FacultyDashboard;

