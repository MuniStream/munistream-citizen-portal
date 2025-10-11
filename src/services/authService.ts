import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User
} from '../types/auth';

const API_BASE_URL = `${import.meta.env.VITE_API_URL}${import.meta.env.VITE_API_BASE_URL}`;

class AuthService {
  private tokenExpiryTimer: NodeJS.Timeout | null = null;

  // Login
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/public/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    const data = await response.json();
    
    // Store token and user data
    if (data.access_token) {
      localStorage.setItem('customer_token', data.access_token);
      localStorage.setItem('customer_user', JSON.stringify(data.customer));
      this.setupTokenExpiry(data.access_token);
    }

    return data;
  }

  // Register
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/public/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Registration failed');
    }

    const data = await response.json();
    
    // Store token and user data
    if (data.access_token) {
      localStorage.setItem('customer_token', data.access_token);
      localStorage.setItem('customer_user', JSON.stringify(data.customer));
      this.setupTokenExpiry(data.access_token);
    }

    return data;
  }

  // Logout
  async logout(): Promise<void> {
    // Clear timer
    if (this.tokenExpiryTimer) {
      clearTimeout(this.tokenExpiryTimer);
      this.tokenExpiryTimer = null;
    }
    
    // Remove all stored data
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_user');
    
    // Redirect to home page
    window.location.href = '/';
  }

  // Get current user profile
  async getCurrentUser(): Promise<User> {
    const token = await this.getValidToken();
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    const response = await fetch(`${API_BASE_URL}/public/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid
        this.logout();
        throw new Error('Session expired. Please login again.');
      }
      throw new Error('Failed to get user profile');
    }

    return response.json();
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const token = localStorage.getItem('customer_token');
    if (!token) return false;
    
    // Check if token is expired
    if (this.isTokenExpired(token)) {
      this.logout();
      return false;
    }
    
    return true;
  }

  // Get stored token if valid, otherwise logout
  async getValidToken(): Promise<string | null> {
    const token = localStorage.getItem('customer_token');
    if (!token) return null;
    
    if (this.isTokenExpired(token)) {
      this.logout();
      return null;
    }
    
    return token;
  }

  // Get stored token (without validation)
  getToken(): string | null {
    // First check if we're using Keycloak authentication
    const keycloakToken = sessionStorage.getItem('kc_token');
    if (keycloakToken) {
      return keycloakToken;
    }

    // Fall back to localStorage for non-Keycloak auth
    return localStorage.getItem('customer_token');
  }

  // Get stored user data
  getStoredUser(): User | null {
    const userData = localStorage.getItem('customer_user');
    return userData ? JSON.parse(userData) : null;
  }

  // Check if token is expired
  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    } catch {
      return true; // If can't decode, consider expired
    }
  }

  // Setup auto-logout when token expires
  private setupTokenExpiry(token: string): void {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiryTime = payload.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      const timeUntilExpiry = expiryTime - currentTime;

      // Clear existing timer
      if (this.tokenExpiryTimer) {
        clearTimeout(this.tokenExpiryTimer);
      }

      // Set new timer (logout 30 seconds before expiry)
      if (timeUntilExpiry > 30000) {
        this.tokenExpiryTimer = setTimeout(() => {
          alert('Your session will expire soon. Please save your work.');
          // Auto-logout after warning
          setTimeout(() => {
            this.logout();
          }, 30000);
        }, timeUntilExpiry - 30000);
      }
    } catch (error) {
      console.error('Error setting up token expiry:', error);
    }
  }

  // Handle API errors globally
  handleApiError(response: Response): void {
    if (response.status === 401) {
      this.logout();
      throw new Error('Session expired. Please login again.');
    }
  }
}

export const authService = new AuthService();