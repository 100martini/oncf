import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import AuthSuccess from './pages/AuthSuccess';
import Dashboard from './pages/Dashboard';
import ProjectKanban from './pages/ProjectKanban';
import { isAuthenticated, setToken } from './utils/auth';

const ProtectedRoute = ({ children }) => {
  return isAuthenticated() ? children : <Navigate to="/login" />;
};

const TokenHandler = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const error = params.get('error');

    if (token) {
      setToken(token);
      navigate('/dashboard', { replace: true });
    } else if (error) {
      console.error('OAuth error:', error);
      navigate('/login', { replace: true });
    }
  }, [location, navigate]);

  return children;
};

function App() {
  return (
    <Router>
      <TokenHandler>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/auth/success" element={<AuthSuccess />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/project/:projectId"
            element={
              <ProtectedRoute>
                <ProjectKanban />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kanban/:slug"
            element={
              <ProtectedRoute>
                <ProjectKanban />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </TokenHandler>
    </Router>
  );
}

export default App;