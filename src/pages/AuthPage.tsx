import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoginForm } from '../components/auth/LoginForm';
import { RegisterForm } from '../components/auth/RegisterForm';
import { PasswordResetForm } from '../components/auth/PasswordResetForm';

type AuthMode = 'login' | 'register' | 'reset';

export const AuthPage: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');

  // Show loading spinner while checking auth status
  if (isLoading) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleAuthSuccess = () => {
    // The redirect will happen automatically due to the Navigate above
    // when isAuthenticated becomes true
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1 className="logo">CivicStream</h1>
          <p className="tagline">Citizen Portal</p>
        </div>

        <div className="auth-content">
          {mode === 'login' && (
            <LoginForm
              onSuccess={handleAuthSuccess}
              onSwitchToRegister={() => setMode('register')}
              onSwitchToPasswordReset={() => setMode('reset')}
            />
          )}

          {mode === 'register' && (
            <RegisterForm
              onSuccess={handleAuthSuccess}
              onSwitchToLogin={() => setMode('login')}
            />
          )}

          {mode === 'reset' && (
            <PasswordResetForm
              onSuccess={() => setMode('login')}
              onSwitchToLogin={() => setMode('login')}
            />
          )}
        </div>

        <div className="auth-footer">
          <p>&copy; 2025 CivicStream - Government Services Platform</p>
        </div>
      </div>
    </div>
  );
};