import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { removeToken } from '../utils/auth';
import WelcomeScreen from '../components/WelcomeScreen';
import FullDashboard from '../components/FullDashboard';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();

  // Try to pre-populate from sessionStorage so returning users don't see
  // a blank screen while the API call is in flight
  const [user, setUser] = useState(() => {
    const cached = sessionStorage.getItem('user');
    return cached ? JSON.parse(cached) : null;
  });

  // Only show the loading screen if there's no cached data to display yet
  const [loading, setLoading] = useState(() => {
    return !sessionStorage.getItem('user');
  });

  const [showWelcome, setShowWelcome] = useState(() => {
    return !sessionStorage.getItem('welcomeShown');
  });

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    const hasCachedData = sessionStorage.getItem('user');
    const startTime = Date.now();

    try {
      const response = await api.get('/auth/me');
      const userData = response.data;

      setUser(userData);
      sessionStorage.setItem('user', JSON.stringify(userData));

      // Only apply the artificial minimum delay for 42 OAuth users.
      // These users have real data being synced from an external API, so
      // the 1.5s pause feels natural and prevents a jarring flash.
      // Email/password users have nothing to sync, so we let them through
      // immediately — making them wait 1.5s for no reason is just bad UX.
      if (!hasCachedData && userData.intraId) {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 1500 - elapsed);
        await new Promise(resolve => setTimeout(resolve, remaining));
      }

      setLoading(false);

    } catch (err) {
      // If the API call fails (expired token, server down, etc.), clean up
      // everything and send the user back to the login page
      removeToken();
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('welcomeShown');
      navigate('/login');
    }
  };

  const handleWelcomeComplete = () => {
    setShowWelcome(false);
    sessionStorage.setItem('welcomeShown', 'true');
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-card">
          <div className="loading-spinner"></div>
          {/*
            user?.intraId is null for email/password users, so they see the
            generic message. For 42 OAuth users it's a real number, so they
            see the 42-specific message. The ?. handles the case where user
            is still null on the very first render before the API responds.
          */}
          <h2>{user?.intraId ? 'Fetching data from 42 API' : 'Loading your dashboard'}</h2>
          <p>Please wait</p>
        </div>
      </div>
    );
  }

  if (showWelcome) {
    return <WelcomeScreen user={user} onComplete={handleWelcomeComplete} />;
  }

  return <FullDashboard user={user} />;
};

export default Dashboard;