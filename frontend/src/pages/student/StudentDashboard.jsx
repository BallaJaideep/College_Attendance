import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { TrendingUp, Award, Calendar, AlertCircle, ArrowUpRight, Download, CheckCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

const StudentDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/student/dashboard');
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load student attendance dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const token = localStorage.getItem('attendly_token');
    fetch('http://127.0.0.1:5000/api/student/export-csv', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Attendance_Summary_${data?.student?.roll_number}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch(() => alert('Failed to download CSV summary.'));
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading student portal...</div>;
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  const { student, overall, subjects, recent_records } = data || {};

  return (
    <div>
      {/* Student Profile Header Banner */}
      <div className="panel" style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', color: '#ffffff' }}>
        <div className="panel-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span className="badge" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', color: '#fff', fontSize: '0.8rem' }}>
                Roll No: {student?.roll_number}
              </span>
              <span className="badge" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', color: '#fff', fontSize: '0.8rem' }}>
                {student?.class_name}
              </span>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Welcome, {student?.full_name}</h2>
            <p style={{ fontSize: '0.86rem', color: '#bfdbfe' }}>
              {student?.department} • Semester {student?.semester}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={handleExportCSV} className="btn" style={{ backgroundColor: '#ffffff', color: '#1e3a8a', fontWeight: '600' }}>
              <Download size={16} /> Export Attendance CSV
            </button>
            <Link to="/student/recovery-planner" className="btn" style={{ backgroundColor: '#10b981', color: '#ffffff', fontWeight: '600' }}>
              <TrendingUp size={16} /> Open Recovery Planner
            </Link>
          </div>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className={`stat-icon ${overall?.percentage >= 75 ? 'green' : overall?.percentage >= 60 ? 'amber' : 'red'}`}>
            <Award size={26} />
          </div>
          <div className="stat-info">
            <p>Overall Attendance</p>
            <h3 style={{ color: overall?.percentage >= 75 ? '#10b981' : overall?.percentage >= 60 ? '#f59e0b' : '#ef4444' }}>
              {overall?.percentage}%
            </h3>
            <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Target Requirement: 75%</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon blue">
            <Calendar size={26} />
          </div>
          <div className="stat-info">
            <p>Total Classes Conducted</p>
            <h3>{overall?.conducted}</h3>
            <span style={{ fontSize: '0.74rem', color: '#64748b' }}>All Enrolled Courses</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <CheckCircle size={26} />
          </div>
          <div className="stat-info">
            <p>Lectures Attended</p>
            <h3>{overall?.attended}</h3>
            <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Verified Present</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon red">
            <Clock size={26} />
          </div>
          <div className="stat-info">
            <p>Lectures Missed</p>
            <h3>{overall?.missed}</h3>
            <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Verified Absent</span>
          </div>
        </div>
      </div>

      {/* Special Feature Highlight Preview Banner */}
      <div className="panel recovery-card">
        <div className="panel-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ maxWidth: '750px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span className="badge indigo">Special Core Feature</span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#1e3a8a' }}>
                  Smart Attendance Recovery Planner
                </h3>
              </div>
              <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: '1.6' }}>
                {overall?.recommendation}
              </p>
            </div>
            <div>
              <Link to="/student/recovery-planner" className="btn btn-primary">
                View Full Math Breakdown <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Subject-Wise Attendance Breakdown Table */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <TrendingUp size={20} color="#2563eb" />
            <span>Enrolled Subjects Attendance Breakdown</span>
          </div>
        </div>

        <div className="panel-body" style={{ padding: 0 }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Course Code</th>
                  <th>Subject Name</th>
                  <th>Conducted</th>
                  <th>Attended</th>
                  <th>Missed</th>
                  <th>Progress</th>
                  <th>Status</th>
                  <th>Safe Absences / Recovery Action</th>
                </tr>
              </thead>
              <tbody>
                {subjects && subjects.map(sub => (
                  <tr key={sub.subject_id}>
                    <td><strong>{sub.subject_code}</strong></td>
                    <td>{sub.subject_name}</td>
                    <td>{sub.classes_conducted}</td>
                    <td>{sub.classes_attended}</td>
                    <td>{sub.classes_missed}</td>
                    <td style={{ minWidth: '150px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: '600' }}>
                        <span>{sub.current_percentage}%</span>
                        <span style={{ color: '#64748b' }}>Min {sub.required_percentage}%</span>
                      </div>
                      <div className="progress-bar-bg">
                        <div
                          className={`progress-bar-fill ${sub.badge_color}`}
                          style={{ width: `${Math.min(100, sub.current_percentage)}%` }}
                        />
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${sub.badge_color}`}>
                        {sub.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      {sub.status === 'above_target' ? (
                        <span style={{ color: '#059669', fontSize: '0.82rem', fontWeight: '600' }}>
                          ✓ Safe to miss {sub.safe_absences} class(es)
                        </span>
                      ) : sub.status === 'at_target' ? (
                        <span style={{ color: '#d97706', fontSize: '0.82rem', fontWeight: '600' }}>
                          ⚠ Exactly on border
                        </span>
                      ) : (
                        <span style={{ color: '#dc2626', fontSize: '0.82rem', fontWeight: '600' }}>
                          ⚡ Must attend {sub.required_future_classes} upcoming class(es)
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Attendance Log Snippet */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <Clock size={18} color="#64748b" />
            <span>Recent Lecture Attendance Log</span>
          </div>
          <Link to="/student/history" className="btn btn-outline btn-sm">
            View Complete Log <ArrowUpRight size={14} />
          </Link>
        </div>
        <div className="panel-body" style={{ padding: 0 }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Lecture Date</th>
                  <th>Subject Code</th>
                  <th>Subject Name</th>
                  <th>Your Status</th>
                </tr>
              </thead>
              <tbody>
                {recent_records && recent_records.length > 0 ? (
                  recent_records.map((rec, idx) => (
                    <tr key={idx}>
                      <td><strong>{rec.date}</strong></td>
                      <td>{rec.subject_code}</td>
                      <td>{rec.subject_name}</td>
                      <td>
                        <span className={`badge ${rec.status === 'Present' ? 'green' : 'red'}`}>
                          {rec.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="empty-state">No attendance recorded yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;

