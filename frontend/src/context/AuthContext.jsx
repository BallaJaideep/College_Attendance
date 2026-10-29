import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('attendly_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('attendly_token'));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      api.get('/auth/me')
        .then(res => {
          setUser(res.data.user);
          localStorage.setItem('attendly_user', JSON.stringify(res.data.user));
        })
        .catch(() => {
          logout();
        });
    }
  }, [token]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { access_token, user: userData } = response.data;
      setToken(access_token);
      setUser(userData);
      localStorage.setItem('attendly_token', access_token);
      localStorage.setItem('attendly_user', JSON.stringify(userData));
      return { success: true, user: userData };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || 'Login failed. Please check your network and credentials.'
      };
    } finally {
      setLoading(false);
    }
  };

  const register = async (formData) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/register', formData);
      return { success: true, message: response.data.message };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || 'Registration failed. Please check your data.'
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('attendly_token');
    localStorage.removeItem('attendly_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

