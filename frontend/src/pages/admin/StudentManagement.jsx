import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Users, Plus, Search, Trash2, Edit, AlertCircle, CheckCircle, X } from 'lucide-react';

const StudentManagement = () => {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: 'Student@123',
    roll_number: '',
    department: 'Computer Science & Engineering',
    semester: 5,
    class_id: ''
  });

  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchStudents();
    fetchClasses();
  }, []);

  const fetchStudents = async (query = '') => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/students?search=${encodeURIComponent(query)}`);
      setStudents(res.data.students || []);
    } catch (err) {
      setMessage({ type: 'danger', text: 'Failed to load students.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await api.get('/admin/classes');
      setClasses(res.data.classes || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
    fetchStudents(e.target.value);
  };

  const openAddModal = () => {
    setModalMode('add');
    setFormData({
      full_name: '',
      email: '',
      password: 'Student@123',
      roll_number: '',
      department: 'Computer Science & Engineering',
      semester: 5,
      class_id: classes[0]?.id || ''
    });
    setShowModal(true);
  };

  const openEditModal = (student) => {
    setModalMode('edit');
    setSelectedStudent(student);
    setFormData({
      full_name: student.full_name,
      email: student.email,
      password: '',
      roll_number: student.roll_number,
      department: student.department,
      semester: student.semester,
      class_id: student.class_id || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    try {
      if (modalMode === 'add') {
        const res = await api.post('/admin/students', formData);
        setMessage({ type: 'success', text: res.data.message });
      } else {
        const res = await api.put(`/admin/students/${selectedStudent.id}`, formData);
        setMessage({ type: 'success', text: res.data.message });
      }
      setShowModal(false);
      fetchStudents(search);
    } catch (err) {
      setMessage({ type: 'danger', text: err.response?.data?.error || 'Operation failed.' });
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete student "${name}"? This removes all associated attendance records.`)) {
      return;
    }
    try {
      await api.delete(`/admin/students/${id}`);
      setMessage({ type: 'success', text: `Student ${name} deleted successfully.` });
      fetchStudents(search);
    } catch (err) {
      setMessage({ type: 'danger', text: 'Failed to delete student.' });
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
            <Users size={20} color="#2563eb" />
            <span>Manage College Students</span>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search by name, roll no, email..."
                className="form-control"
                style={{ paddingLeft: '34px', width: '260px' }}
                value={search}
                onChange={handleSearch}
              />
            </div>
            <button onClick={openAddModal} className="btn btn-primary">
              <Plus size={16} /> Add Student
            </button>
          </div>
        </div>

        <div className="panel-body" style={{ padding: 0 }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student Name</th>
                  <th>Email</th>
                  <th>Department & Sem</th>
                  <th>Class / Section</th>
                  <th>Attendance Record</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '24px' }}>Loading students...</td>
                  </tr>
                ) : students.length > 0 ? (
                  students.map(st => (
                    <tr key={st.id}>
                      <td><strong>{st.roll_number}</strong></td>
                      <td>{st.full_name}</td>
                      <td>{st.email}</td>
                      <td>{st.department} (Sem {st.semester})</td>
                      <td>
                        <span className="badge gray">{st.class_name || 'Not Assigned'}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className={`badge ${st.attendance_percentage >= 75 ? 'green' : st.attendance_percentage >= 60 ? 'amber' : 'red'}`}>
                            {st.attendance_percentage}%
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            ({st.classes_attended}/{st.classes_total})
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => openEditModal(st)} className="btn btn-outline btn-sm" title="Edit Student">
                            <Edit size={14} />
                          </button>
                          <button onClick={() => handleDelete(st.id, st.full_name)} className="btn btn-outline btn-sm" style={{ color: '#ef4444' }} title="Delete Student">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="empty-state">
                      No students found. Use "Add Student" to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                {modalMode === 'add' ? 'Add New Student' : `Edit Student (${formData.roll_number})`}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-control"
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
                      value={formData.email}
                      disabled={modalMode === 'edit'}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Roll Number</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.roll_number}
                      disabled={modalMode === 'edit'}
                      onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
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
                    <label className="form-label">Semester</label>
                    <select
                      className="form-control"
                      value={formData.semester}
                      onChange={(e) => setFormData({ ...formData, semester: parseInt(e.target.value) })}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                        <option key={s} value={s}>Sem {s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Assign Class / Section</label>
                  <select
                    className="form-control"
                    value={formData.class_id}
                    onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                  >
                    <option value="">Select a Section / Class</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.class_name} ({c.department})</option>
                    ))}
                  </select>
                </div>

                {modalMode === 'add' && (
                  <div className="form-group">
                    <label className="form-label">Default Password</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {modalMode === 'add' ? 'Create Student' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentManagement;

