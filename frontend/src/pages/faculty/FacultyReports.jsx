import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { FileSpreadsheet, Download, Filter, AlertTriangle } from 'lucide-react';

const FacultyReports = () => {
  const [assignments, setAssignments] = useState([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const res = await api.get('/faculty/classes');
      const list = res.data.assignments || [];
      setAssignments(list);
      if (list.length > 0) {
        const key = `${list[0].subject_id}_${list[0].class_id}`;
        setSelectedKey(key);
        fetchReport(list[0].subject_id, list[0].class_id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectChange = (e) => {
    const key = e.target.value;
    setSelectedKey(key);
    if (key) {
      const [subId, clsId] = key.split('_');
      fetchReport(subId, clsId);
    } else {
      setReportData(null);
    }
  };

  const fetchReport = async (subId, clsId) => {
    try {
      setLoading(true);
      const res = await api.get(`/faculty/reports?subject_id=${subId}&class_id=${clsId}`);
      setReportData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!selectedKey) return;
    const [subId, clsId] = selectedKey.split('_');
    const token = localStorage.getItem('attendly_token');
    // Trigger direct download with Bearer token
    fetch(`http://127.0.0.1:5000/api/faculty/reports?subject_id=${subId}&class_id=${clsId}&format=csv`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Attendance_Report_${reportData?.subject?.subject_code}_${reportData?.class?.class_name}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch(err => alert('Failed to export CSV.'));
  };

  return (
    <div>
      {/* Filter and Download Header */}
      <div className="panel">
        <div className="panel-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Filter size={18} color="#64748b" />
              <label className="form-label" style={{ marginBottom: 0 }}>Subject & Section:</label>
              <select
                className="form-control"
                style={{ width: '300px' }}
                value={selectedKey}
                onChange={handleSelectChange}
              >
                {assignments.map(a => (
                  <option key={`${a.subject_id}_${a.class_id}`} value={`${a.subject_id}_${a.class_id}`}>
                    {a.subject_code} — {a.class_name} ({a.subject_name})
                  </option>
                ))}
              </select>
            </div>

            {reportData && (
              <button onClick={handleExportCSV} className="btn btn-primary">
                <Download size={16} /> Export Official CSV Report
              </button>
            )}
          </div>
        </div>
      </div>

      {reportData && (
        <>
          {/* Summary Stats */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-info">
                <p>Course Subject</p>
                <h3 style={{ fontSize: '1.25rem' }}>{reportData.subject.subject_name}</h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Code: {reportData.subject.subject_code}</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-info">
                <p>Total Classes Conducted</p>
                <h3>{reportData.total_conducted}</h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Section: {reportData.class.class_name}</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-info">
                <p>Class Average Attendance</p>
                <h3 style={{ color: reportData.average_percentage >= 75 ? '#10b981' : '#f59e0b' }}>
                  {reportData.average_percentage}%
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Required: {reportData.subject.minimum_attendance_percentage}%</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-info">
                <p>Students Below Target</p>
                <h3 style={{ color: '#ef4444' }}>
                  {reportData.student_reports.filter(s => s.attendance_percentage < reportData.subject.minimum_attendance_percentage).length}
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Total in class: {reportData.student_count}</span>
              </div>
            </div>
          </div>

          {/* Student Detailed Report Table */}
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">
                <FileSpreadsheet size={20} color="#2563eb" />
                <span>Subject Attendance Roster & Recovery Status</span>
              </div>
            </div>

            <div className="panel-body" style={{ padding: 0 }}>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Roll No</th>
                      <th>Student Name</th>
                      <th>Attended / Total</th>
                      <th>Missed</th>
                      <th>Percentage</th>
                      <th>Status Badge</th>
                      <th>Recovery Plan / Safe Absence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.student_reports.map(st => (
                      <tr key={st.student_id}>
                        <td><strong>{st.roll_number}</strong></td>
                        <td>{st.student_name}</td>
                        <td>{st.classes_attended} / {st.classes_conducted}</td>
                        <td>{st.classes_missed}</td>
                        <td>
                          <strong>{st.attendance_percentage}%</strong>
                        </td>
                        <td>
                          <span className={`badge ${st.badge_color}`}>
                            {st.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td>
                          {st.status === 'above_target' ? (
                            <span style={{ color: '#059669', fontSize: '0.82rem', fontWeight: '500' }}>
                              Can safely miss up to <strong>{st.safe_absences}</strong> class(es)
                            </span>
                          ) : st.status === 'at_target' ? (
                            <span style={{ color: '#d97706', fontSize: '0.82rem', fontWeight: '500' }}>
                              On threshold. Maintain perfect attendance!
                            </span>
                          ) : (
                            <span style={{ color: '#dc2626', fontSize: '0.82rem', fontWeight: '500' }}>
                              Must attend next <strong>{st.required_future_classes}</strong> class(es) consecutively
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
        </>
      )}
    </div>
  );
};

export default FacultyReports;

