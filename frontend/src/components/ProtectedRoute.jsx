import { Navigate, Outlet, useLocation } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
  const { authenticated, initializing } = useAuth();
  const location = useLocation();

  if (initializing) {
    return <LoadingSpinner label="Checking session..." />;
  }

  if (!authenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
