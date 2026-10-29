import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Automatically inject JWT token into requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('attendly_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Handle 401 response (expired token)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only auto-redirect on 401 if not already on public auth pages (login/register)
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('attendly_token');
      localStorage.removeItem('attendly_user');
      const path = window.location.pathname;
      if (path !== '/login' && path !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

