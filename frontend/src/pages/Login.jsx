import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { isAuthenticated } from '../utils/auth';
import '../styles/Login.css';

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');

  // Controls which tab is currently visible
  const [activeTab, setActiveTab] = useState('signin');

  // Separate state for each form so switching tabs doesn't wipe what the user typed
  const [signInData, setSignInData] = useState({ email: '', password: '' });
  const [signUpData, setSignUpData] = useState({ email: '', password: '', confirmPassword: '' });

  useEffect(() => {
    // If the user is already logged in, skip the login page entirely
    if (isAuthenticated()) {
      navigate('/dashboard', { replace: true });
      return;
    }

    // Read any error codes that the backend may have appended to the URL
    // e.g. /login?error=access_denied after a failed OAuth attempt
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

    // Check if the backend redirected back with a token after OAuth
    // e.g. /login?token=eyJhbGci...
    const tokenParam = searchParams.get('token');
    if (tokenParam) {
      localStorage.setItem('token', tokenParam);
      navigate('/dashboard', { replace: true });
    }
  }, [navigate, searchParams]);

  // Generic field updater — reads the input's `name` attribute to know which
  // key to update in state, so one function handles all fields in a form
  const handleSignInChange = (e) => {
    const { name, value } = e.target;
    setSignInData(prev => ({ ...prev, [name]: value }));
  };

  const handleSignUpChange = (e) => {
    const { name, value } = e.target;
    setSignUpData(prev => ({ ...prev, [name]: value }));
  };

  const handleOAuthLogin = () => {
    // This triggers a full-page redirect to the backend, which then
    // bounces the user to 42 Intra's authorization page
    window.location.href = 'http://localhost:3000/api/auth/42';
  };

  const handleSignIn = async (e) => {
    e.preventDefault(); // Prevent the browser's default form submission behavior
    setError('');

    try {
      const res = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signInData)
      });

      const data = await res.json();

      // res.ok is true for 2xx status codes — if false, show the backend's error message
      if (!res.ok) {
        setError(data.error || 'Sign in failed.');
        return;
      }

      // Store the JWT so isAuthenticated() will return true on the next check
      localStorage.setItem('token', data.token);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      // This catches network-level failures (e.g. server is down)
      setError('Network error. Please try again.');
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side validation before even hitting the network
    if (signUpData.password !== signUpData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      const res = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Only send email and password — confirmPassword is a UI concern, not a backend one
        body: JSON.stringify({
          email: signUpData.email,
          password: signUpData.password
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed.');
        return;
      }

      localStorage.setItem('token', data.token);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  // Safety net: if the user somehow lands here while already authenticated,
  // render nothing rather than flashing the login UI for a split second
  if (isAuthenticated()) return null;

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

          {/* OAuth always sits at the top — it's the primary login method */}
          <button className="btn-42" onClick={handleOAuthLogin}>
            Continue with 42 Intra
          </button>

          {/* Visual separator between OAuth and the email/password section */}
          <div className="divider">
            <span>or</span>
          </div>

          {/* Tab switcher — clicking a tab updates state, which re-renders the form below */}
          <div className="tab-switcher">
            <button
              className={`tab-btn ${activeTab === 'signin' ? 'active' : ''}`}
              onClick={() => { setActiveTab('signin'); setError(''); }}
            >
              Sign In
            </button>
            <button
              className={`tab-btn ${activeTab === 'signup' ? 'active' : ''}`}
              onClick={() => { setActiveTab('signup'); setError(''); }}
            >
              Sign Up
            </button>
          </div>

          {/* Error appears here for all three auth methods — OAuth, sign in, and sign up */}
          {error && <div className="error-message">{error}</div>}

          {/* Ternary renders one form or the other — React unmounts the inactive one */}
          {activeTab === 'signin' ? (
            <form className="auth-form" onSubmit={handleSignIn}>
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={signInData.email}
                onChange={handleSignInChange}
                required
              />
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={signInData.password}
                onChange={handleSignInChange}
                required
              />
              <button type="submit" className="btn-submit">Sign In</button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleSignUp}>
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={signUpData.email}
                onChange={handleSignUpChange}
                required
              />
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={signUpData.password}
                onChange={handleSignUpChange}
                required
              />
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm Password"
                value={signUpData.confirmPassword}
                onChange={handleSignUpChange}
                required
              />
              <button type="submit" className="btn-submit">Create Account</button>
            </form>
          )}
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