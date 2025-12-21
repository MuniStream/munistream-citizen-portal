import { BaseApiService, ApiConfig, AuthProvider } from './api.base';
import keycloakService from '../../src/services/keycloak';

/**
 * Web-specific auth provider using Keycloak
 */
class KeycloakAuthProvider implements AuthProvider {
  getToken(): string | undefined {
    return keycloakService.getToken();
  }

  async refreshToken(minValidity?: number): Promise<boolean> {
    return keycloakService.refreshToken(minValidity);
  }

  isAuthenticated(): boolean {
    return keycloakService.isAuthenticated();
  }
}

/**
 * Web-specific API service
 */
export class WebApiService extends BaseApiService {
  constructor() {
    const config: ApiConfig = {
      baseURL: import.meta.env.VITE_API_URL || '',
      apiBasePath: import.meta.env.VITE_API_BASE_URL || '/api/v1',
      tenant: import.meta.env.VITE_TENANT_ID,
    };

    const authProvider = new KeycloakAuthProvider();
    super(config, authProvider);
  }

  /**
   * Initialize Keycloak before making authenticated requests
   */
  async initialize(): Promise<boolean> {
    return keycloakService.init();
  }

  /**
   * Login via Keycloak redirect
   */
  async login(): Promise<void> {
    return keycloakService.login();
  }

  /**
   * Logout via Keycloak
   */
  async logout(): Promise<void> {
    return keycloakService.logout();
  }

  /**
   * Get user info from Keycloak token
   */
  getUserInfo(): any {
    return keycloakService.getUserInfo();
  }
}

// Export singleton instance for web
export const apiService = new WebApiService();