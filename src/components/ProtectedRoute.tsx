import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import keycloakService from '../services/keycloak';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireEmailVerification?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireEmailVerification = false 
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Show loading spinner while checking auth status
  if (isLoading) {
    return (
      <div className="protected-route-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to Keycloak login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      keycloakService.login();
    }
  }, [isLoading, isAuthenticated]);

  if (!isAuthenticated) {
    return null; // Will redirect to Keycloak
  }

  // Check email verification if required
  if (requireEmailVerification && user && !user.emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  return <>{children}</>;
};