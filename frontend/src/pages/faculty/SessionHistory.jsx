import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { History, Eye, Calendar, BookOpen, Building2, X } from 'lucide-react';

const SessionHistory = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/faculty/attendance');
      setSessions(res.data.sessions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const viewSessionDetail = async (sessionId) => {
    try {
      setModalLoading(true);
      const res = await api.get(`/faculty/attendance/${sessionId}`);
      setSelectedSession(res.data.session);
    } catch (err) {
      alert('Failed to load session details.');
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div>
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <History size={20} color="#2563eb" />
            <span>Attendance Session Logs ({sessions.length})</span>
          </div>
        </div>

        <div className="panel-body" style={{ padding: 0 }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Subject</th>
                  <th>Class / Section</th>
                  <th>Present</th>
                  <th>Absent</th>
                  <th>Percentage</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '24px' }}>Loading session logs...</td>
                  </tr>
                ) : sessions.length > 0 ? (
                  sessions.map(s => (
                    <tr key={s.id}>
                      <td><strong>{s.attendance_date}</strong></td>
                      <td>
                        <strong>{s.subject_code}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.subject_name}</div>
                      </td>
                      <td><span className="badge indigo">{s.class_name}</span></td>
                      <td><span className="badge green">{s.present_count}</span></td>
                      <td><span className="badge red">{s.absent_count}</span></td>
                      <td>
                        <span className={`badge ${s.attendance_percentage >= 75 ? 'green' : 'amber'}`}>
                          {s.attendance_percentage}%
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => viewSessionDetail(s.id)}
                          className="btn btn-outline btn-sm"
                        >
                          <Eye size={14} /> View Student List
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="empty-state">No past attendance sessions recorded yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Session Details Modal */}
      {selectedSession && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                  {selectedSession.subject_code}: {selectedSession.subject_name}
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Section: {selectedSession.class_name} • Date: {selectedSession.attendance_date}
                </p>
              </div>
              <button onClick={() => setSelectedSession(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ maxHeight: '420px', overflowY: 'auto', padding: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Roll No</th>
                    <th>Student Name</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSession.records && selectedSession.records.map(r => (
                    <tr key={r.id}>
                      <td><strong>{r.roll_number}</strong></td>
                      <td>{r.student_name}</td>
                      <td>
                        <span className={`badge ${r.status === 'Present' ? 'green' : 'red'}`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.84rem', color: '#64748b' }}>
                Present: {selectedSession.present_count} / {selectedSession.total_students} ({selectedSession.attendance_percentage}%)
              </span>
              <button onClick={() => setSelectedSession(null)} className="btn btn-outline">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionHistory;

