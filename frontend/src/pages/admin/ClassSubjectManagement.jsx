import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Building2, BookOpen, Plus, AlertCircle, CheckCircle, X } from 'lucide-react';

const ClassSubjectManagement = () => {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showClassModal, setShowClassModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);

  const [classForm, setClassForm] = useState({
    class_name: '',
    department: 'Computer Science & Engineering',
    semester: 5
  });

  const [subjectForm, setSubjectForm] = useState({
    subject_code: '',
    subject_name: '',
    department: 'Computer Science & Engineering',
    semester: 5,
    minimum_attendance_percentage: 75.0
  });

  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [clsRes, subRes] = await Promise.all([
        api.get('/admin/classes'),
        api.get('/admin/subjects')
      ]);
      setClasses(clsRes.data.classes || []);
      setSubjects(subRes.data.subjects || []);
    } catch (err) {
      setMessage({ type: 'danger', text: 'Failed to load classes or subjects.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/classes', classForm);
      setMessage({ type: 'success', text: res.data.message });
      setShowClassModal(false);
      setClassForm({ class_name: '', department: 'Computer Science & Engineering', semester: 5 });
      fetchData();
    } catch (err) {
      setMessage({ type: 'danger', text: err.response?.data?.error || 'Failed to create class.' });
    }
  };

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/subjects', subjectForm);
      setMessage({ type: 'success', text: res.data.message });
      setShowSubjectModal(false);
      setSubjectForm({
        subject_code: '',
        subject_name: '',
        department: 'Computer Science & Engineering',
        semester: 5,
        minimum_attendance_percentage: 75.0
      });
      fetchData();
    } catch (err) {
      setMessage({ type: 'danger', text: err.response?.data?.error || 'Failed to create subject.' });
    }
  };

  return (
    <div>
      {message.text && (
        <div className={`alert alert-${message.type}`}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '24px' }}>
        {/* Classes Table */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <Building2 size={20} color="#f59e0b" />
              <span>Classes & Sections ({classes.length})</span>
            </div>
            <button onClick={() => setShowClassModal(true)} className="btn btn-primary btn-sm">
              <Plus size={14} /> New Class
            </button>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Section / Class</th>
                    <th>Department</th>
                    <th>Semester</th>
                    <th>Enrolled</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map(c => (
                    <tr key={c.id}>
                      <td><strong>{c.class_name}</strong></td>
                      <td>{c.department}</td>
                      <td>Sem {c.semester}</td>
                      <td>
                        <span className="badge blue">{c.student_count} Students</span>
                      </td>
                    </tr>
                  ))}
                  {classes.length === 0 && !loading && (
                    <tr><td colSpan="4" className="empty-state">No classes found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Subjects Table */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <BookOpen size={20} color="#10b981" />
              <span>Course Subjects ({subjects.length})</span>
            </div>
            <button onClick={() => setShowSubjectModal(true)} className="btn btn-primary btn-sm">
              <Plus size={14} /> New Subject
            </button>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Subject Name</th>
                    <th>Dept & Sem</th>
                    <th>Threshold</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map(s => (
                    <tr key={s.id}>
                      <td><strong>{s.subject_code}</strong></td>
                      <td>{s.subject_name}</td>
                      <td>{s.department} (Sem {s.semester})</td>
                      <td>
                        <span className="badge green">{s.minimum_attendance_percentage}% Min</span>
                      </td>
                    </tr>
                  ))}
                  {subjects.length === 0 && !loading && (
                    <tr><td colSpan="4" className="empty-state">No subjects found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Class Modal */}
      {showClassModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600' }}>Create New Class</h3>
              <button onClick={() => setShowClassModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateClass}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Class Name / Section</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. CSE-3A, MECH-1B"
                    value={classForm.class_name}
                    onChange={(e) => setClassForm({ ...classForm, class_name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <select
                      className="form-control"
                      value={classForm.department}
                      onChange={(e) => setClassForm({ ...classForm, department: e.target.value })}
                    >
                      <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                      <option value="Electronics & Comm. Engineering">Electronics & Comm. Engineering</option>
                      <option value="Mechanical Engineering">Mechanical Engineering</option>
                      <option value="Information Technology">Information Technology</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Semester</label>
                    <select
                      className="form-control"
                      value={classForm.semester}
                      onChange={(e) => setClassForm({ ...classForm, semester: parseInt(e.target.value) })}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                        <option key={s} value={s}>Sem {s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowClassModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-primary">Create Class</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subject Modal */}
      {showSubjectModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600' }}>Create New Subject</h3>
              <button onClick={() => setShowSubjectModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateSubject}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Subject Code</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. CS501"
                      value={subjectForm.subject_code}
                      onChange={(e) => setSubjectForm({ ...subjectForm, subject_code: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Min Attendance (%)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="50"
                      max="100"
                      className="form-control"
                      value={subjectForm.minimum_attendance_percentage}
                      onChange={(e) => setSubjectForm({ ...subjectForm, minimum_attendance_percentage: parseFloat(e.target.value) })}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Subject Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Database Management Systems"
                    value={subjectForm.subject_name}
                    onChange={(e) => setSubjectForm({ ...subjectForm, subject_name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <select
                      className="form-control"
                      value={subjectForm.department}
                      onChange={(e) => setSubjectForm({ ...subjectForm, department: e.target.value })}
                    >
                      <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                      <option value="Electronics & Comm. Engineering">Electronics & Comm. Engineering</option>
                      <option value="Mechanical Engineering">Mechanical Engineering</option>
                      <option value="Information Technology">Information Technology</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Semester</label>
                    <select
                      className="form-control"
                      value={subjectForm.semester}
                      onChange={(e) => setSubjectForm({ ...subjectForm, semester: parseInt(e.target.value) })}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                        <option key={s} value={s}>Sem {s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowSubjectModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-primary">Create Subject</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassSubjectManagement;

