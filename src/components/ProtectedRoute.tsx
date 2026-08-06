import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const session = localStorage.getItem('traffic_currentUser');
  if (!session) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};
