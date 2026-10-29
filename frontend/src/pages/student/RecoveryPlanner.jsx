import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  TrendingUp,
  Calculator,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Info,
  CalendarCheck
} from 'lucide-react';

const RecoveryPlanner = () => {
  const [plans, setPlans] = useState([]);
  const [customThreshold, setCustomThreshold] = useState('75');
  const [studentInfo, setStudentInfo] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecoveryPlan(customThreshold);
  }, []);

  const fetchRecoveryPlan = async (threshold) => {
    try {
      setLoading(true);
      const res = await api.get(`/student/recovery-plan?target_percentage=${threshold}`);
      setPlans(res.data.plans || []);
      setStudentInfo({
        name: res.data.student_name,
        roll: res.data.roll_number
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleThresholdChange = (e) => {
    const val = e.target.value;
    setCustomThreshold(val);
    fetchRecoveryPlan(val);
  };

  return (
    <div>
      {/* Feature Introduction Header */}
      <div className="panel" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', color: '#ffffff' }}>
        <div className="panel-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Calculator size={24} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.45rem', fontWeight: '700' }}>Smart Attendance Recovery Planner</h2>
              <p style={{ fontSize: '0.86rem', color: '#bfdbfe' }}>
                Mathematical attendance trajectory projection based on actual recorded database sessions.
              </p>
            </div>
          </div>

          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            padding: '16px',
            borderRadius: '10px',
            fontSize: '0.86rem',
            lineHeight: '1.6',
            color: '#f8fafc',
            marginTop: '12px',
            border: '1px solid rgba(255, 255, 255, 0.15)'
          }}>
            <strong>How the Mathematical Formula Works:</strong><br />
            Let <em>A</em> = attended classes, <em>C</em> = conducted classes, and <em>T</em> = required decimal percentage (e.g. 0.75).
            If below target, the exact consecutive future classes you must attend without missing any is calculated as:
            <br />
            <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
              N = ceil((T × C - A) / (1 - T))
            </code>
            <br />
            If above target, the safe absence allowance is calculated as:
            <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', marginLeft: '6px' }}>
              M = floor((A - T × C) / T)
            </code>
          </div>
        </div>
      </div>

      {/* Target Simulator Filter */}
      <div className="panel">
        <div className="panel-body">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <Info size={20} color="#2563eb" />
              <div>
                <strong style={{ fontSize: '0.92rem' }}>Attendance Target Simulator:</strong>
                <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Simulate your recovery requirements for standard college rules (75%, 80%, or 85%).
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Target Percentage:</label>
              <select
                className="form-control"
                style={{ width: '140px', fontWeight: '600' }}
                value={customThreshold}
                onChange={handleThresholdChange}
              >
                <option value="70">70% Target</option>
                <option value="75">75% (Standard)</option>
                <option value="80">80% Target</option>
                <option value="85">85% Target</option>
                <option value="90">90% Target</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Subject-Wise Recovery Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
        {plans.map(sub => (
          <div key={sub.subject_id} className={`panel recovery-card`} style={{ borderLeftColor: sub.badge_color === 'green' ? '#10b981' : sub.badge_color === 'amber' ? '#f59e0b' : '#ef4444' }}>
            <div className="panel-header">
              <div>
                <h3 style={{ fontSize: '1.08rem', fontWeight: '700' }}>
                  {sub.subject_code} — {sub.subject_name}
                </h3>
                <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                  College Minimum Requirement: {sub.required_percentage}%
                </span>
              </div>
              <span className={`badge ${sub.badge_color}`}>
                {sub.status.replace('_', ' ')}
              </span>
            </div>

            <div className="panel-body">
              {/* Numbers grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', textAlign: 'center', marginBottom: '16px' }}>
                <div style={{ padding: '10px', background: '#f8fafc', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Conducted</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700' }}>{sub.classes_conducted}</div>
                </div>
                <div style={{ padding: '10px', background: '#ecfdf5', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#047857' }}>Attended</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#047857' }}>{sub.classes_attended}</div>
                </div>
                <div style={{ padding: '10px', background: '#fef2f2', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#b91c1c' }}>Missed</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#b91c1c' }}>{sub.classes_missed}</div>
                </div>
                <div style={{ padding: '10px', background: '#eff6ff', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#1d4ed8' }}>Current</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1d4ed8' }}>{sub.current_percentage}%</div>
                </div>
              </div>

              {/* Recovery Status Box */}
              <div className="recovery-status-box" style={{
                backgroundColor: sub.badge_color === 'green' ? '#f0fdf4' : sub.badge_color === 'amber' ? '#fffbeb' : '#fef2f2',
                borderColor: sub.badge_color === 'green' ? '#bbf7d0' : sub.badge_color === 'amber' ? '#fde68a' : '#fecaca'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  {sub.badge_color === 'green' ? (
                    <CheckCircle size={20} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                  ) : (
                    <AlertTriangle size={20} color={sub.badge_color === 'amber' ? '#f59e0b' : '#ef4444'} style={{ flexShrink: 0, marginTop: '2px' }} />
                  )}
                  <div>
                    <h4 style={{ fontSize: '0.92rem', fontWeight: '600', color: '#0f172a', marginBottom: '4px' }}>
                      {sub.status === 'above_target'
                        ? 'Attendance Safe & On Target'
                        : sub.status === 'at_target'
                        ? 'At Target Threshold'
                        : 'Attendance Shortage Detected'}
                    </h4>
                    <p style={{ fontSize: '0.84rem', color: '#475569', lineHeight: '1.5' }}>
                      {sub.recommendation}
                    </p>
                  </div>
                </div>

                {/* Practical Metrics Output */}
                <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                  {sub.status === 'above_target' ? (
                    <div>
                      <span style={{ color: '#64748b' }}>Safe Absence Allowance: </span>
                      <strong style={{ color: '#059669', fontSize: '0.96rem' }}>
                        {sub.safe_absences} lecture(s)
                      </strong>
                    </div>
                  ) : (
                    <div>
                      <span style={{ color: '#64748b' }}>Consecutive Classes Needed: </span>
                      <strong style={{ color: '#dc2626', fontSize: '0.96rem' }}>
                        {sub.required_future_classes} lecture(s)
                      </strong>
                    </div>
                  )}

                  {sub.required_future_classes > 0 && (
                    <div>
                      <span style={{ color: '#64748b' }}>Projected Attendance: </span>
                      <strong style={{ color: '#2563eb', fontSize: '0.96rem' }}>
                        {sub.projected_percentage_after_recovery}%
                      </strong>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecoveryPlanner;

