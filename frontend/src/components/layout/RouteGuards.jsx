import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Splash from './Splash';

// UI-level guard only. The real security check is always done by the backend.
export function ProtectedRoute({ roles, roleRedirect = '/' }) {
  const { user, bootstrapped } = useSelector((s) => s.auth);
  const location = useLocation();
  if (!bootstrapped) return <Splash />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={roleRedirect} replace />;
  return <Outlet />;
}

export function GuestRoute() {
  const { user, bootstrapped } = useSelector((s) => s.auth);
  if (!bootstrapped) return <Splash />;
  return user ? <Navigate to="/" replace /> : <Outlet />;
}
