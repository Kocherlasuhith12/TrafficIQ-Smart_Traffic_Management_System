import { useNavigate } from 'react-router-dom';
import Dashboard from '@/features/dashboard/Dashboard';
import { User } from '@/features/auth/Login';

const DashboardPage = () => {
  const navigate = useNavigate();
  const saved = localStorage.getItem('traffic_currentUser');
  const user: User = saved ? JSON.parse(saved) : { username: 'Guest', role: 'guest' };

  const handleLogout = () => {
    localStorage.removeItem('traffic_currentUser');
    navigate('/', { replace: true });
  };

  return <Dashboard user={user} onLogout={handleLogout} />;
};

export default DashboardPage;
