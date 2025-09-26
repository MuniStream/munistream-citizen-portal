import Keycloak from 'keycloak-js';

// Keycloak configuration from environment variables
const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8180',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'munistream',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'munistream-citizen',
};

class KeycloakService {
  private keycloak: Keycloak;
  private initialized: boolean = false;

  constructor() {
    this.keycloak = new Keycloak(keycloakConfig);
  }

  /**
   * Initialize Keycloak with PKCE flow
   */
  async init(): Promise<boolean> {
    if (this.initialized) {
      return this.keycloak.authenticated || false;
    }

    try {
      const authenticated = await this.keycloak.init({
        onLoad: 'check-sso',
        silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
        pkceMethod: 'S256', // Enable PKCE
        checkLoginIframe: false, // Disable iframe check for development
      });

      this.initialized = true;

      // Setup automatic token refresh
      if (authenticated) {
        this.setupTokenRefresh();
      }

      return authenticated;
    } catch (error) {
      console.error('Failed to initialize Keycloak:', error);
      this.initialized = false;
      return false;
    }
  }

  /**
   * Login with redirect to Keycloak
   */
  async login(): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }
    await this.keycloak.login({
      redirectUri: window.location.origin + '/dashboard',
    });
  }

  /**
   * Register new user (redirect to Keycloak registration)
   */
  async register(): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }
    // Redirect to Keycloak registration page
    await this.keycloak.register({
      redirectUri: window.location.origin + '/dashboard',
    });
  }

  /**
   * Logout from Keycloak
   */
  async logout(): Promise<void> {
    if (this.keycloak.authenticated) {
      await this.keycloak.logout({
        redirectUri: window.location.origin,
      });
    }
  }

  /**
   * Get current access token
   */
  getToken(): string | undefined {
    return this.keycloak.token;
  }

  /**
   * Get refresh token
   */
  getRefreshToken(): string | undefined {
    return this.keycloak.refreshToken;
  }

  /**
   * Get parsed token with user info
   */
  getParsedToken(): any {
    return this.keycloak.tokenParsed;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.keycloak.authenticated || false;
  }

  /**
   * Get user profile
   */
  async loadUserProfile(): Promise<any> {
    if (!this.keycloak.authenticated) {
      throw new Error('User is not authenticated');
    }
    try {
      return await this.keycloak.loadUserProfile();
    } catch (error) {
      console.error('Failed to load user profile:', error);
      throw error;
    }
  }

  /**
   * Get user info from token
   */
  getUserInfo(): any {
    if (!this.keycloak.authenticated || !this.keycloak.tokenParsed) {
      return null;
    }

    const tokenParsed = this.keycloak.tokenParsed as any;
    return {
      id: tokenParsed.sub,
      username: tokenParsed.preferred_username,
      email: tokenParsed.email,
      name: tokenParsed.name || tokenParsed.preferred_username,
      email_verified: tokenParsed.email_verified,
      roles: this.getUserRoles(),
      // Citizen-specific attributes
      document_type: tokenParsed.document_type,
      document_number: tokenParsed.document_number,
      phone_number: tokenParsed.phone_number,
      address: tokenParsed.address,
      municipality: tokenParsed.municipality,
    };
  }

  /**
   * Get user roles from token
   */
  getUserRoles(): string[] {
    const tokenParsed = this.keycloak.tokenParsed as any;
    if (!tokenParsed) return [];

    const roles: string[] = [];

    // Get realm roles
    if (tokenParsed.realm_access?.roles) {
      roles.push(...tokenParsed.realm_access.roles);
    }

    // Get client roles
    if (tokenParsed.resource_access?.[keycloakConfig.clientId]?.roles) {
      roles.push(...tokenParsed.resource_access[keycloakConfig.clientId].roles);
    }

    // Filter out default roles and return citizen-specific roles
    return roles.filter(role =>
      ['citizen', 'verified_citizen', 'business_entity'].includes(role)
    );
  }

  /**
   * Check if user has a specific role
   */
  hasRole(role: string): boolean {
    return this.getUserRoles().includes(role);
  }

  /**
   * Check if citizen is verified
   */
  isVerifiedCitizen(): boolean {
    return this.hasRole('verified_citizen');
  }

  /**
   * Check if user is a business entity
   */
  isBusinessEntity(): boolean {
    return this.hasRole('business_entity');
  }

  /**
   * Update token (force refresh)
   */
  async updateToken(minValidity: number = 30): Promise<boolean> {
    try {
      const refreshed = await this.keycloak.updateToken(minValidity);
      if (refreshed) {
        console.log('Token refreshed');
      }
      return refreshed;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      await this.logout();
      return false;
    }
  }

  /**
   * Setup automatic token refresh
   */
  private setupTokenRefresh(): void {
    // Refresh token when it expires in less than 60 seconds
    setInterval(async () => {
      if (this.keycloak.authenticated) {
        try {
          await this.updateToken(60);
        } catch (error) {
          console.error('Token refresh failed:', error);
        }
      }
    }, 30000); // Check every 30 seconds

    // Also refresh on token expiry events
    this.keycloak.onTokenExpired = async () => {
      try {
        await this.updateToken(30);
      } catch (error) {
        console.error('Token expired and refresh failed:', error);
        await this.logout();
      }
    };
  }

  /**
   * Get Keycloak instance (for advanced use cases)
   */
  getKeycloakInstance(): Keycloak {
    return this.keycloak;
  }
}

// Export singleton instance
export const keycloakService = new KeycloakService();
export default keycloakService;