import axios from 'axios';
import keycloakService from './keycloak';

const API_BASE_URL = `${import.meta.env.VITE_API_URL}${import.meta.env.VITE_API_BASE_URL}`;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add Keycloak token
api.interceptors.request.use(
  async (config) => {
    // Get token from Keycloak
    const token = keycloakService.getToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only attempt refresh if we get 401 and haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh the token
        console.log('[API] Got 401, attempting token refresh');
        const refreshed = await keycloakService.refreshToken(30);

        if (refreshed) {
          console.log('[API] Token refreshed successfully, retrying request');
          // Retry original request with new token
          const token = keycloakService.getToken();
          if (token) {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
          }
          return api(originalRequest);
        } else {
          console.log('[API] Token refresh failed, user needs to re-authenticate');
          // Don't automatically redirect - let the app handle it
          // The ProtectedRoute component will handle redirecting to login
        }
      } catch (refreshError) {
        console.error('[API] Token refresh error:', refreshError);
        // Don't automatically redirect - let the app handle it
      }
    }

    return Promise.reject(error);
  }
);

export default api;