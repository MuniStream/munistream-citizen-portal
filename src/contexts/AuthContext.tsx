import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import keycloakService from '../services/keycloak';

// Citizen user interface
export interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  document_type?: string;
  document_number?: string;
  address?: string;
  municipality?: string;
  curp?: string; // Mexican citizen ID
  locale: 'es' | 'en';
  emailVerified: boolean;
  roles: string[];
  verified: boolean;
  created_at: string;
  lastLogin?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: () => Promise<void>;
  register: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  updateUser: (user: User) => void;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  refreshToken: () => Promise<boolean>;
  accountManagement: () => Promise<void>;
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
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initRef = useRef(false);

  // Initialize Keycloak and set user
  useEffect(() => {
    // Prevent double initialization in React StrictMode
    if (initRef.current) return;
    initRef.current = true;

    const initAuth = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const authenticated = await keycloakService.init();

        if (authenticated) {
          const userInfo = keycloakService.getUserInfo();

          if (userInfo && userInfo.id) {
            // Create citizen user object compatible with existing interface
            const citizenUser: User = {
              id: userInfo.id,
              email: userInfo.email || '',
              username: userInfo.username || userInfo.email || '',
              name: userInfo.name || `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim() || userInfo.username,
              firstName: userInfo.firstName,
              lastName: userInfo.lastName,
              phone: userInfo.phone,
              document_type: userInfo.document_type,
              document_number: userInfo.document_number,
              address: userInfo.address,
              municipality: userInfo.municipality,
              curp: userInfo.curp,
              locale: userInfo.locale || 'es',
              emailVerified: userInfo.emailVerified || false,
              roles: userInfo.roles || [],
              verified: userInfo.emailVerified || false,
              created_at: new Date().toISOString(),
              lastLogin: new Date().toISOString(),
            };

            setUser(citizenUser);

            // Load additional profile data if needed
            try {
              const profile = await keycloakService.loadUserProfile();
              if (profile) {
                setUser(prev => ({
                  ...prev!,
                  firstName: profile.firstName || prev!.firstName,
                  lastName: profile.lastName || prev!.lastName,
                  name: `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || prev!.name,
                  email: profile.email || prev!.email,
                  emailVerified: profile.emailVerified || prev!.emailVerified,
                  verified: profile.emailVerified || prev!.verified,
                }));
              }
            } catch (error) {
              console.error('Failed to load user profile:', error);
            }
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setError('Failed to initialize authentication');
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []); // Empty dependency array - run once

  // Login function
  const login = async (): Promise<void> => {
    setError(null);
    await keycloakService.login();
    // This will redirect to Keycloak, so the promise won't resolve
  };

  // Register function for citizen self-registration
  const register = async (): Promise<void> => {
    setError(null);
    await keycloakService.register();
    // This will redirect to Keycloak registration page
  };

  // Logout function
  const logout = async (): Promise<void> => {
    setUser(null);
    await keycloakService.logout();
    // This will redirect to Keycloak logout
  };

  // Clear error
  const clearError = (): void => {
    setError(null);
  };

  // Update user function
  const updateUser = (updatedUser: User): void => {
    setUser(updatedUser);
  };

  // Check if user has a specific role
  const hasRole = (role: string): boolean => {
    return user?.roles?.includes(role) || false;
  };

  // Check if user has any of the specified roles
  const hasAnyRole = (roles: string[]): boolean => {
    if (!user?.roles) return false;
    return roles.some(role => user.roles.includes(role));
  };

  // Refresh token
  const refreshToken = async (): Promise<boolean> => {
    try {
      return await keycloakService.refreshToken();
    } catch (error) {
      console.error('Token refresh failed:', error);
      setError('Session refresh failed');
      return false;
    }
  };

  // Account management - redirect to Keycloak account console
  const accountManagement = async (): Promise<void> => {
    await keycloakService.accountManagement();
  };

  // Compute isAuthenticated
  const isAuthenticated = React.useMemo(
    () => keycloakService.isAuthenticated() && !!user,
    [user]
  );

  // Create context value
  const value = React.useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated,
      error,
      login,
      register,
      logout,
      clearError,
      updateUser,
      hasRole,
      hasAnyRole,
      refreshToken,
      accountManagement,
    }),
    [user, isLoading, isAuthenticated, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;