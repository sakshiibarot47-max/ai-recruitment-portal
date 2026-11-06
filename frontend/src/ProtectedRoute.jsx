
import { Navigate, Outlet } from 'react-router-dom';

function ProtectedRoute({ allowedRole }) {
  const token = localStorage.getItem('hireai_token');

  let user;

  try {
    user = JSON.parse(localStorage.getItem('hireai_user'));
  } catch {
    user = null;
  }

  // Login nahi hai
  if (!token || !user) {
    return <Navigate to="/" replace />;
  }

  // Wrong role hai
  if (allowedRole && user.role?.toLowerCase() !== allowedRole.toLowerCase()) {
    return user.role?.toLowerCase() === 'recruiter'
      ? <Navigate to="/recruiter/jobs" replace />
      : <Navigate to="/jobs" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
