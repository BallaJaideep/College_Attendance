import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { History, Calendar, Filter, CheckCircle, XCircle } from 'lucide-react';

const StudentHistory = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    fetchHistory();
  }, [dateFilter]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const url = dateFilter ? `/student/attendance/history?date=${dateFilter}` : '/student/attendance/history';
      const res = await api.get(url);
      setRecords(res.data.records || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <History size={20} color="#2563eb" />
            <span>Official Attendance Record Log ({records.length})</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={16} color="#64748b" />
            <input
              type="date"
              className="form-control"
              style={{ width: '180px' }}
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
            {dateFilter && (
              <button onClick={() => setDateFilter('')} className="btn btn-outline btn-sm">
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="panel-body" style={{ padding: 0 }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Lecture Date</th>
                  <th>Course Code</th>
                  <th>Subject Name</th>
                  <th>Faculty Instructor</th>
                  <th>Marked Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '24px' }}>Loading history log...</td>
                  </tr>
                ) : records.length > 0 ? (
                  records.map(rec => (
                    <tr key={rec.id}>
                      <td><strong>{rec.date}</strong></td>
                      <td>{rec.subject_code}</td>
                      <td>{rec.subject_name}</td>
                      <td>{rec.faculty_name}</td>
                      <td>
                        <span className={`badge ${rec.status === 'Present' ? 'green' : 'red'}`}>
                          {rec.status === 'Present' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                          {rec.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="empty-state">No attendance records found for this period.</td>
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

export default StudentHistory;

