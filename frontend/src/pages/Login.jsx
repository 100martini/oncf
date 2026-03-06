import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { isAuthenticated } from '../utils/auth';
import '../styles/Login.css';

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/dashboard', { replace: true });
      return;
    }

    const errorParam = searchParams.get('error');
    if (errorParam) {
      switch (errorParam) {
        case 'access_denied':
          setError('You denied access to the application.');
          break;
        case 'no_code':
          setError('No authorization code received.');
          break;
        case 'auth_failed':
          setError('Authentication failed. Please try again.');
          break;
        default:
          setError('An error occurred during login.');
      }
    }
  }, [navigate, searchParams]);

  const handleOAuthLogin = () => {
    window.location.href = 'http://localhost:3000/api/auth/42';
  };

  if (isAuthenticated())
    return null;

  return (
    <div className="login-page">
      <div className="container">
        <div className="logo-section">
          <div className="logo">21</div>
          <h1>Project Hub</h1>
          <p>Collaborate on 42 projects with your team</p>
        </div>

        <div className="login-card">
          <h2>Ready to code?</h2>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button className="btn-42" onClick={handleOAuthLogin}>
            Continue with 42 Intra
          </button>
        </div>

        <div className="features">
          <div className="feature">
            <div className="feature-icon">Team</div>
            <p>Collaboration</p>
          </div>
          <div className="feature">
            <div className="feature-icon">Task</div>
            <p>Management</p>
          </div>
          <div className="feature">
            <div className="feature-icon">Game</div>
            <p>Hub</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;