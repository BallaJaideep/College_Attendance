import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, ShieldCheck } from 'lucide-react';
import campusImg from '../assets/campus.svg';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    const res = await login(email, password);
    if (res.success) {
      const role = res.user.role;
      if (role === 'admin') navigate('/admin');
      else if (role === 'faculty') navigate('/faculty');
      else navigate('/student');
    } else {
      setError(res.error);
    }
  };

  const handleQuickDemo = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f1f5f9',
      padding: '20px'
    }}>
      <div style={{
        display: 'flex',
        maxWidth: '960px',
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        {/* Left Side: Campus Visual Banner */}
        <div style={{
          flex: '1',
          background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
          padding: '40px',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <GraduationCap size={28} color="#ffffff" />
              </div>
              <div>
                <h2 style={{ fontSize: '1.6rem', fontWeight: '700', letterSpacing: '-0.5px' }}>Attendly</h2>
                <p style={{ fontSize: '0.85rem', color: '#bfdbfe' }}>Track Attendance. Stay on Target.</p>
              </div>
            </div>

            <h3 style={{ fontSize: '1.35rem', fontWeight: '600', marginBottom: '12px', lineHeight: '1.4' }}>
              Digital Academic Attendance & Smart Recovery Planning
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#e0e7ff', lineHeight: '1.6', marginBottom: '24px' }}>
              Seamlessly record daily lectures, generate instant semester reports, and empower students with mathematical attendance recovery projections.
            </p>
          </div>

          <div style={{
            borderRadius: '12px',
            overflow: 'hidden',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)',
            backgroundColor: '#1e293b'
          }}>
            <img
              src={campusImg}
              alt="College Campus Illustration"
              style={{ width: '100%', height: '220px', objectFit: 'cover', display: 'block' }}
            />
          </div>

          <div style={{ marginTop: '20px', fontSize: '0.78rem', color: '#bfdbfe', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={16} /> Secure local SQLite database & JWT role authorization
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div style={{
          width: '480px',
          padding: '40px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>Sign In</h2>
          <p style={{ fontSize: '0.86rem', color: '#64748b', marginBottom: '24px' }}>
            Enter your college credentials to access your portal.
          </p>

          {error && (
            <div className="alert alert-danger" style={{ marginBottom: '18px' }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">College Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="email"
                  className="form-control"
                  style={{ paddingLeft: '40px' }}
                  placeholder="name@college.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-control"
                  style={{ paddingLeft: '40px', paddingRight: '40px' }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', marginTop: '6px' }}
              disabled={loading}
            >
              {loading ? 'Authenticating...' : 'Sign In to Portal'}
            </button>
          </form>

          {/* Quick Demo Credentials Buttons */}
          <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              One-Click Demo Credentials:
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => handleQuickDemo('admin@college.edu', 'Admin@123')}
                className="btn btn-outline btn-sm"
                style={{ fontSize: '0.72rem' }}
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('faculty@college.edu', 'Faculty@123')}
                className="btn btn-outline btn-sm"
                style={{ fontSize: '0.72rem' }}
              >
                Faculty
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('student@college.edu', 'Student@123')}
                className="btn btn-outline btn-sm"
                style={{ fontSize: '0.72rem' }}
              >
                Student
              </button>
            </div>
          </div>

          <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.84rem', color: '#64748b' }}>
            Are you a new student?{' '}
            <Link to="/register" style={{ color: '#2563eb', fontWeight: '600', textDecoration: 'none' }}>
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

