import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Login, { User } from '@/features/auth/Login';

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem('traffic_currentUser');
    if (saved) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleLoginSuccess = (user: User) => {
    localStorage.setItem('traffic_currentUser', JSON.stringify(user));
    navigate('/dashboard', { replace: true });
  };

  return <Login onLoginSuccess={handleLoginSuccess} />;
};

export default Index;
