import { useState } from 'react';
import Dashboard from '@/features/dashboard/Dashboard';
import Login, { User } from '@/features/auth/Login';

const Index = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('traffic_currentUser');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('traffic_currentUser', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('traffic_currentUser');
  };

  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return <Dashboard user={currentUser} onLogout={handleLogout} />;
};

export default Index;
