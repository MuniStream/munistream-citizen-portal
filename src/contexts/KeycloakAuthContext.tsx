import React, { createContext, useContext, useState, useEffect } from 'react';
import keycloakService from '../services/keycloakService';

interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  email_verified: boolean;
  roles: string[];
  // Citizen-specific fields
  document_type?: string;
  document_number?: string;
  phone_number?: string;
  address?: string;
  municipality?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  register: () => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: string) => boolean;
  isVerified: boolean;
  isBusinessEntity: boolean;
  getToken: () => string | undefined;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const KeycloakAuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize Keycloak on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const authenticated = await keycloakService.init();
        setIsAuthenticated(authenticated);

        if (authenticated) {
          // Get user info from token
          const userInfo = keycloakService.getUserInfo();
          if (userInfo) {
            setUser({
              id: userInfo.id,
              email: userInfo.email,
              username: userInfo.username,
              name: userInfo.name,
              email_verified: userInfo.email_verified || false,
              roles: userInfo.roles,
              document_type: userInfo.document_type,
              document_number: userInfo.document_number,
              phone_number: userInfo.phone_number,
              address: userInfo.address,
              municipality: userInfo.municipality,
            });
          }
        }
      } catch (error) {
        console.error('Keycloak initialization error:', error);
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async () => {
    await keycloakService.login();
  };

  const register = async () => {
    await keycloakService.register();
  };

  const logout = async () => {
    setUser(null);
    setIsAuthenticated(false);
    await keycloakService.logout();
  };

  const hasRole = (role: string): boolean => {
    return keycloakService.hasRole(role);
  };

  const isVerified = keycloakService.isVerifiedCitizen();
  const isBusinessEntity = keycloakService.isBusinessEntity();

  const getToken = (): string | undefined => {
    return keycloakService.getToken();
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    hasRole,
    isVerified,
    isBusinessEntity,
    getToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default KeycloakAuthProvider;