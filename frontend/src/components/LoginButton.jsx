import React from 'react';

const LoginButton = () => {
  const handleLogin = () => {
    window.location.href = 'http://localhost:3000/api/auth/42';
  };

  return (
    <button onClick={handleLogin} className="login-42-btn">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" fill="currentColor"/>
      </svg>
      <span>Continue with 42 Intra</span>
    </button>
  );
};

export default LoginButton;