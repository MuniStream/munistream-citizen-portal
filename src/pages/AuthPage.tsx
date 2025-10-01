import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

export const AuthPage: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading, login, register } = useAuth();

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

  const handleLogin = () => {
    // Redirect to Keycloak login
    login();
  };

  const handleRegister = () => {
    // Redirect to Keycloak registration
    register();
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1 className="logo">{t('app.title')}</h1>
          <p className="tagline">{t('workflows.title')}</p>
        </div>

        <div className="auth-content">
          <div className="auth-card">
            <h2>{t('app.subtitle')}</h2>
            <p className="description">
              Access government services and manage your applications with secure authentication powered by Keycloak.
            </p>

            <div className="auth-buttons">
              <button
                className="btn btn-primary"
                onClick={handleLogin}
              >
                Sign In
              </button>

              <button
                className="btn btn-secondary"
                onClick={handleRegister}
              >
                Register New Account
              </button>
            </div>

            <div className="auth-info">
              <p className="info-text">
                You will be redirected to our secure authentication portal
              </p>
              <p className="info-text small">
                Your data is protected with enterprise-grade security
              </p>
            </div>
          </div>
        </div>

        <div className="auth-footer">
          <p>&copy; 2025 {t('app.organization')} - {t('app.title')}</p>
        </div>
      </div>
    </div>
  );
};