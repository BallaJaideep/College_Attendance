import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { UserCheck, Plus, Link as LinkIcon, Trash2, AlertCircle, CheckCircle, X } from 'lucide-react';

const FacultyManagement = () => {
  const [facultyList, setFacultyList] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState(null);

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    department: 'Computer Science & Engineering',
    employee_id: '',
    password: 'Faculty@123'
  });

  const [assignData, setAssignData] = useState({
    subject_id: '',
    class_id: ''
  });

  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchFaculty();
    fetchSubjectsAndClasses();
  }, []);

  const fetchFaculty = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/faculty');
      setFacultyList(res.data.faculty || []);
    } catch (err) {
      setMessage({ type: 'danger', text: 'Failed to load faculty members.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjectsAndClasses = async () => {
    try {
      const [subRes, clsRes] = await Promise.all([
        api.get('/admin/subjects'),
        api.get('/admin/classes')
      ]);
      setSubjects(subRes.data.subjects || []);
      setClasses(clsRes.data.classes || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateFaculty = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/faculty', formData);
      setMessage({ type: 'success', text: res.data.message });
      setShowAddModal(false);
      setFormData({
        full_name: '',
        email: '',
        department: 'Computer Science & Engineering',
        employee_id: '',
        password: 'Faculty@123'
      });
      fetchFaculty();
    } catch (err) {
      setMessage({ type: 'danger', text: err.response?.data?.error || 'Failed to create faculty member.' });
    }
  };

  const openAssignModal = (faculty) => {
    setSelectedFaculty(faculty);
    setAssignData({
      subject_id: subjects[0]?.id || '',
      class_id: classes[0]?.id || ''
    });
    setShowAssignModal(true);
  };

  const handleAssignSubject = async (e) => {
    e.preventDefault();
    if (!selectedFaculty) return;
    try {
      const res = await api.post(`/admin/faculty/${selectedFaculty.id}/assign`, assignData);
      setMessage({ type: 'success', text: res.data.message });
      setShowAssignModal(false);
      fetchFaculty();
    } catch (err) {
      setMessage({ type: 'danger', text: err.response?.data?.error || 'Failed to assign class/subject.' });
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (!window.confirm('Are you sure you want to remove this faculty assignment?')) return;
    try {
      await api.delete(`/admin/faculty/assignments/${assignmentId}`);
      setMessage({ type: 'success', text: 'Assignment removed successfully.' });
      fetchFaculty();
    } catch (err) {
      setMessage({ type: 'danger', text: 'Failed to remove assignment.' });
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

      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <UserCheck size={20} color="#4f46e5" />
            <span>Faculty & Course Assignments</span>
          </div>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
            <Plus size={16} /> Add Faculty Member
          </button>
        </div>

        <div className="panel-body" style={{ padding: 0 }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Faculty Name</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Assigned Subjects & Classes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '24px' }}>Loading faculty...</td>
                  </tr>
                ) : facultyList.length > 0 ? (
                  facultyList.map(fac => (
                    <tr key={fac.id}>
                      <td><strong>{fac.employee_id}</strong></td>
                      <td>{fac.full_name}</td>
                      <td>{fac.email}</td>
                      <td>{fac.department}</td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {fac.assignments && fac.assignments.length > 0 ? (
                            fac.assignments.map(a => (
                              <span key={a.id} className="badge indigo" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <strong>{a.subject_code}</strong>: {a.class_name}
                                <X
                                  size={12}
                                  style={{ cursor: 'pointer', marginLeft: '4px' }}
                                  onClick={() => handleDeleteAssignment(a.id)}
                                  title="Remove assignment"
                                />
                              </span>
                            ))
                          ) : (
                            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>No assignments yet</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <button
                          onClick={() => openAssignModal(fac)}
                          className="btn btn-outline btn-sm"
                          title="Assign Subject to Class"
                        >
                          <LinkIcon size={14} /> Assign Class/Subject
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="empty-state">No faculty members found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Faculty Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600' }}>Add Faculty Member</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateFaculty}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Prof. Alan Turing"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="prof@college.edu"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Employee ID</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. FAC010"
                      value={formData.employee_id}
                      onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <select
                    className="form-control"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  >
                    <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                    <option value="Electronics & Comm. Engineering">Electronics & Comm. Engineering</option>
                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                    <option value="Information Technology">Information Technology</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Temporary Password</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-primary">Create Faculty</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Subject & Class Modal */}
      {showAssignModal && selectedFaculty && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                Assign Course to {selectedFaculty.full_name}
              </h3>
              <button onClick={() => setShowAssignModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAssignSubject}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Select Subject</label>
                  <select
                    className="form-control"
                    value={assignData.subject_id}
                    onChange={(e) => setAssignData({ ...assignData, subject_id: e.target.value })}
                    required
                  >
                    <option value="">Choose a Subject</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.subject_code} — {s.subject_name} ({s.department}, Sem {s.semester})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Select Class / Section</label>
                  <select
                    className="form-control"
                    value={assignData.class_id}
                    onChange={(e) => setAssignData({ ...assignData, class_id: e.target.value })}
                    required
                  >
                    <option value="">Choose a Section</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.class_name} ({c.department}, Sem {c.semester})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowAssignModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Assignment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyManagement;

