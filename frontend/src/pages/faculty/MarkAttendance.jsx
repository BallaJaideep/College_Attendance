import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { CalendarCheck, Check, X, AlertCircle, CheckCircle, RefreshCw, Save } from 'lucide-react';

const MarkAttendance = () => {
  const [searchParams] = useSearchParams();
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignmentKey, setSelectedAssignmentKey] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({}); // student_id -> 'Present' or 'Absent'

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [existingSessionConflict, setExistingSessionConflict] = useState(false);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const res = await api.get('/faculty/classes');
      const list = res.data.assignments || [];
      setAssignments(list);

      // Check if URL parameters passed
      const subId = searchParams.get('subject_id');
      const clsId = searchParams.get('class_id');
      if (subId && clsId) {
        const key = `${subId}_${clsId}`;
        setSelectedAssignmentKey(key);
        loadStudents(clsId, subId);
      } else if (list.length > 0) {
        const key = `${list[0].subject_id}_${list[0].class_id}`;
        setSelectedAssignmentKey(key);
        loadStudents(list[0].class_id, list[0].subject_id);
      }
    } catch (err) {
      setMessage({ type: 'danger', text: 'Failed to load assigned subjects.' });
    }
  };

  const handleAssignmentChange = (e) => {
    const key = e.target.value;
    setSelectedAssignmentKey(key);
    if (key) {
      const [subject_id, class_id] = key.split('_');
      loadStudents(class_id, subject_id);
    } else {
      setStudents([]);
    }
  };

  const loadStudents = async (class_id, subject_id) => {
    try {
      setLoading(true);
      setMessage({ type: '', text: '' });
      setExistingSessionConflict(false);
      const res = await api.get(`/faculty/students?class_id=${class_id}&subject_id=${subject_id}`);
      const stList = res.data.students || [];
      setStudents(stList);

      // Default all to 'Present'
      const initialMap = {};
      stList.forEach(st => {
        initialMap[st.student_id] = 'Present';
      });
      setAttendanceMap(initialMap);
    } catch (err) {
      setMessage({ type: 'danger', text: err.response?.data?.error || 'Failed to load enrolled students.' });
    } finally {
      setLoading(false);
    }
  };

  const toggleStudentStatus = (student_id) => {
    setAttendanceMap(prev => ({
      ...prev,
      [student_id]: prev[student_id] === 'Present' ? 'Absent' : 'Present'
    }));
  };

  const markAll = (status) => {
    const updated = {};
    students.forEach(st => {
      updated[st.student_id] = status;
    });
    setAttendanceMap(updated);
  };

  const handleSaveAttendance = async (allowCorrection = false) => {
    if (!selectedAssignmentKey || students.length === 0) return;
    const [subject_id, class_id] = selectedAssignmentKey.split('_');

    const records = students.map(st => ({
      student_id: st.student_id,
      status: attendanceMap[st.student_id] || 'Absent'
    }));

    try {
      setSubmitting(true);
      setMessage({ type: '', text: '' });

      const res = await api.post('/faculty/attendance', {
        subject_id: parseInt(subject_id),
        class_id: parseInt(class_id),
        attendance_date: attendanceDate,
        records: records,
        allow_correction: allowCorrection
      });

      setMessage({ type: 'success', text: res.data.message });
      setExistingSessionConflict(false);
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.already_exists) {
        setExistingSessionConflict(true);
        setMessage({
          type: 'warning',
          text: err.response.data.error + ' Would you like to update and correct this existing session?'
        });
      } else {
        setMessage({ type: 'danger', text: err.response?.data?.error || 'Failed to record attendance.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const presentCount = Object.values(attendanceMap).filter(s => s === 'Present').length;
  const absentCount = students.length - presentCount;

  return (
    <div>
      {message.text && (
        <div className={`alert alert-${message.type}`}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <div style={{ flex: 1 }}>{message.text}</div>
          {existingSessionConflict && (
            <button
              onClick={() => handleSaveAttendance(true)}
              className="btn btn-warning btn-sm"
              style={{ backgroundColor: '#d97706', color: '#fff', border: 'none' }}
            >
              Update / Correct Session
            </button>
          )}
        </div>
      )}

      {/* Control Configuration Bar */}
      <div className="panel">
        <div className="panel-body">
          <div className="form-row" style={{ alignItems: 'flex-end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Subject & Class Section</label>
              <select
                className="form-control"
                value={selectedAssignmentKey}
                onChange={handleAssignmentChange}
              >
                <option value="">Choose Course Section</option>
                {assignments.map(a => (
                  <option key={`${a.subject_id}_${a.class_id}`} value={`${a.subject_id}_${a.class_id}`}>
                    {a.subject_code}: {a.subject_name} — Section {a.class_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Lecture Date</label>
              <input
                type="date"
                className="form-control"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => markAll('Present')}
                className="btn btn-outline"
                title="Mark everyone present"
              >
                <Check size={16} color="#10b981" /> All Present
              </button>
              <button
                type="button"
                onClick={() => markAll('Absent')}
                className="btn btn-outline"
                title="Mark everyone absent"
              >
                <X size={16} color="#ef4444" /> All Absent
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Student Attendance List */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <CalendarCheck size={20} color="#2563eb" />
            <span>Roll Call ({students.length} Enrolled)</span>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span className="badge green" style={{ fontSize: '0.82rem' }}>
              Present: {presentCount}
            </span>
            <span className="badge red" style={{ fontSize: '0.82rem' }}>
              Absent: {absentCount}
            </span>
          </div>
        </div>

        <div className="panel-body" style={{ padding: 0 }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student Name</th>
                  <th>Email Address</th>
                  <th>Attendance Status</th>
                  <th>Toggle</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '24px' }}>Loading student roll call...</td>
                  </tr>
                ) : students.length > 0 ? (
                  students.map(st => {
                    const isPresent = attendanceMap[st.student_id] === 'Present';
                    return (
                      <tr key={st.student_id} style={{ backgroundColor: isPresent ? 'transparent' : '#fff5f5' }}>
                        <td><strong>{st.roll_number}</strong></td>
                        <td>{st.full_name}</td>
                        <td>{st.email}</td>
                        <td>
                          <span className={`badge ${isPresent ? 'green' : 'red'}`}>
                            {isPresent ? 'Present' : 'Absent'}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => toggleStudentStatus(st.student_id)}
                            className={`btn btn-sm ${isPresent ? 'btn-success' : 'btn-danger'}`}
                            style={{ minWidth: '95px' }}
                          >
                            {isPresent ? <><Check size={14} /> Present</> : <><X size={14} /> Absent</>}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="empty-state">
                      Please select an assigned subject and class section to mark attendance.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {students.length > 0 && (
          <div style={{ padding: '20px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#f8fafc' }}>
            <button
              onClick={() => handleSaveAttendance(false)}
              disabled={submitting}
              className="btn btn-primary"
              style={{ padding: '12px 28px', fontSize: '0.96rem' }}
            >
              <Save size={18} /> {submitting ? 'Saving to Database...' : 'Save Attendance Session'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarkAttendance;

