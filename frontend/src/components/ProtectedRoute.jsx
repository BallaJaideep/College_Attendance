import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ allowedRoles }) => {
  const { user, token } = useAuth();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect user to their own role dashboard if unauthorized for this route
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'faculty') return <Navigate to="/faculty" replace />;
    return <Navigate to="/student" replace />;
  }

  return <Outlet />;
};

