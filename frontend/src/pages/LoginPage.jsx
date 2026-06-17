import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

export default function LoginPage() {
  const { authenticated, initializing, login } = useAuth();
  const { notify } = useNotification();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  if (initializing) {
    return <LoadingSpinner label="Loading..." />;
  }

  if (authenticated) {
    const redirectTo = location.state?.from?.pathname || '/';
    return <Navigate to={redirectTo} replace />;
  }

  const validate = () => {
    const nextErrors = {};
    if (!username.trim()) {
      nextErrors.username = 'Username is required';
    }
    if (!password) {
      nextErrors.password = 'Password is required';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      await login(username.trim(), password);
      notify('Signed in successfully', 'success');
    } catch (error) {
      notify(error.message || 'Invalid credentials', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-header">
          <span className="brand-mark">IM</span>
          <h1>Inventory Admin</h1>
          <p>Sign in to manage products, categories, and stock.</p>
        </div>
        <label>
          Username
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            disabled={loading}
          />
          {errors.username && <span className="field-error">{errors.username}</span>}
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            disabled={loading}
          />
          {errors.password && <span className="field-error">{errors.password}</span>}
        </label>
        <button type="submit" className="primary-button" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
