import Keycloak from 'keycloak-js';

// Configuration
const KEYCLOAK_CONFIG = {
  url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8180',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'munistream',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'munistream-citizen',
};

// Storage keys
const STORAGE_KEYS = {
  TOKEN: 'kc_token',
  REFRESH_TOKEN: 'kc_refresh_token',
  ID_TOKEN: 'kc_id_token',
  PROCESSED_CODE: 'kc_processed_code',
};

/**
 * Keycloak Service - Handles all Keycloak authentication operations for citizens
 * Uses singleton pattern to ensure only one instance exists
 */
class KeycloakService {
  private static instance: KeycloakService | null = null;
  private keycloak: Keycloak | null = null;
  private initPromise: Promise<boolean> | null = null;
  private initCompleted = false;  // Tracks if init() has completed (regardless of auth status)
  private authChecked = false;     // Tracks if we've checked auth status

  private constructor() {
    // Private constructor to enforce singleton
  }

  /**
   * Get singleton instance
   */
  static getInstance(): KeycloakService {
    if (!KeycloakService.instance) {
      KeycloakService.instance = new KeycloakService();
    }
    return KeycloakService.instance;
  }

  /**
   * Initialize Keycloak
   */
  async init(): Promise<boolean> {
    console.log('[Keycloak.init] Called', {
      initCompleted: this.initCompleted,
      authChecked: this.authChecked,
      hasKeycloak: !!this.keycloak,
      isAuthenticated: this.keycloak?.authenticated
    });

    // If we've already completed initialization, return the current auth state
    if (this.initCompleted && this.keycloak) {
      console.log('[Keycloak.init] Already initialized, returning auth state');
      return this.keycloak.authenticated || false;
    }

    // Return existing promise if initialization is in progress
    if (this.initPromise) {
      console.log('[Keycloak.init] Init in progress, waiting for existing promise');
      return this.initPromise;
    }

    // Start initialization
    console.log('[Keycloak.init] Starting new initialization');
    this.initPromise = this.doInit();

    try {
      const result = await this.initPromise;
      return result;
    } finally {
      this.initPromise = null;
    }
  }

  /**
   * Perform actual initialization
   */
  private async doInit(): Promise<boolean> {
    try {
      console.log('[Keycloak] Starting initialization');

      // Create Keycloak instance
      if (!this.keycloak) {
        console.log('[Keycloak] Creating new instance');
        this.keycloak = new Keycloak(KEYCLOAK_CONFIG);
      }

      // Check if we're processing an auth callback
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const code = urlParams.get('code') || hashParams.get('code');
      const state = urlParams.get('state') || hashParams.get('state');
      const error = urlParams.get('error') || hashParams.get('error');
      const isCallback = (code && state) || error;

      console.log('[Keycloak] URL check', {
        hasCode: !!code,
        hasState: !!state,
        hasError: !!error,
        isCallback
      });

      // If we have a callback, mark the code as being processed IMMEDIATELY
      // This prevents StrictMode double-render from trying to use the same code twice
      if (isCallback && code) {
        const processedCode = sessionStorage.getItem(STORAGE_KEYS.PROCESSED_CODE);
        if (processedCode === code) {
          console.log('[Keycloak] Code already being processed or was processed, skipping');
          this.cleanUrl();

          // Mark as initialized
          this.initCompleted = true;
          this.authChecked = true;

          // Check if we have tokens from the previous successful auth
          const storedToken = sessionStorage.getItem(STORAGE_KEYS.TOKEN);
          if (storedToken) {
            // Restore authentication state
            this.keycloak.authenticated = true;
            this.keycloak.token = storedToken;
            this.keycloak.refreshToken = sessionStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) || undefined;
            this.keycloak.idToken = sessionStorage.getItem(STORAGE_KEYS.ID_TOKEN) || undefined;
            return true;
          }
          return false;
        }

        // Mark this code as being processed RIGHT NOW
        console.log('[Keycloak] Marking code as being processed');
        sessionStorage.setItem(STORAGE_KEYS.PROCESSED_CODE, code);
      }

      // Check if we have stored tokens
      const storedToken = sessionStorage.getItem(STORAGE_KEYS.TOKEN);
      const storedRefreshToken = sessionStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      const storedIdToken = sessionStorage.getItem(STORAGE_KEYS.ID_TOKEN);

      console.log('[Keycloak] Stored tokens check', {
        hasToken: !!storedToken,
        hasRefreshToken: !!storedRefreshToken
      });

      // Build initialization config
      const config: any = {
        pkceMethod: 'S256',
        checkLoginIframe: false,
        enableLogging: true,
        onLoad: 'check-sso', // Always check for existing SSO session
        silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
      };

      // Handle different scenarios
      if (isCallback) {
        console.log('[Keycloak] Processing auth callback');
        // Let Keycloak handle the code exchange
      } else if (storedToken && storedRefreshToken) {
        console.log('[Keycloak] Using stored tokens');
        // We have stored tokens - try to use them
        config.token = storedToken;
        config.refreshToken = storedRefreshToken;
        if (storedIdToken) {
          config.idToken = storedIdToken;
        }
      } else {
        console.log('[Keycloak] No auth callback or tokens, initializing clean');
        // No tokens and no callback - just initialize
      }

      // Initialize Keycloak
      console.log('[Keycloak] Calling init with config', config);
      const authenticated = await this.keycloak.init(config);
      console.log('[Keycloak] Init result:', authenticated);

      // Store tokens if authenticated
      if (authenticated) {
        console.log('[Keycloak] Authenticated! Storing tokens');
        this.storeTokens();
        this.setupAutoRefresh();
      }

      // Clean URL if we processed a callback
      if (isCallback) {
        console.log('[Keycloak] Cleaning URL after callback');
        this.cleanUrl();
      }

      this.initCompleted = true;
      this.authChecked = true;
      return authenticated;

    } catch (error) {
      console.error('Keycloak initialization failed:', error);

      // If we failed during a callback, clean up
      if (window.location.search.includes('code=')) {
        this.cleanUrl();
        // Clear the failed code from storage
        sessionStorage.removeItem(STORAGE_KEYS.PROCESSED_CODE);
      }

      this.initCompleted = true;  // Still mark as completed even on error
      this.authChecked = true;
      return false;
    }
  }

  /**
   * Store tokens in sessionStorage
   */
  private storeTokens(): void {
    if (!this.keycloak) return;

    if (this.keycloak.token) {
      sessionStorage.setItem(STORAGE_KEYS.TOKEN, this.keycloak.token);
    }
    if (this.keycloak.refreshToken) {
      sessionStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, this.keycloak.refreshToken);
    }
    if (this.keycloak.idToken) {
      sessionStorage.setItem(STORAGE_KEYS.ID_TOKEN, this.keycloak.idToken);
    }
  }

  /**
   * Clear stored tokens
   */
  private clearTokens(): void {
    sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.ID_TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.PROCESSED_CODE);
  }

  /**
   * Clean authentication codes from URL
   */
  private cleanUrl(): void {
    const cleanUrl = window.location.origin + window.location.pathname;
    window.history.replaceState(null, '', cleanUrl);
  }

  /**
   * Setup automatic token refresh
   */
  private setupAutoRefresh(): void {
    if (!this.keycloak) return;

    // Refresh token when it expires in less than 60 seconds
    setInterval(async () => {
      if (this.keycloak?.authenticated) {
        try {
          await this.refreshToken(60);
        } catch (error) {
          console.error('Auto token refresh failed:', error);
        }
      }
    }, 30000); // Check every 30 seconds

    // Handle token expiry
    this.keycloak.onTokenExpired = async () => {
      try {
        await this.refreshToken();
      } catch (error) {
        console.error('Token expired and refresh failed:', error);
        await this.logout();
      }
    };
  }

  /**
   * Login - redirects to Keycloak
   */
  async login(): Promise<void> {
    if (!this.keycloak) {
      await this.init();
    }

    if (this.keycloak) {
      console.log('[Keycloak.login] Redirecting to Keycloak login');
      await this.keycloak.login({
        redirectUri: window.location.origin + '/services',
        locale: 'es', // Default to Spanish for citizens
      });
    }
  }

  /**
   * Register - redirects to Keycloak registration
   */
  async register(): Promise<void> {
    if (!this.keycloak) {
      await this.init();
    }

    if (this.keycloak) {
      await this.keycloak.register({
        redirectUri: window.location.origin,
        locale: 'es', // Default to Spanish for citizens
      });
    }
  }

  /**
   * Logout - clears tokens and redirects to Keycloak
   */
  async logout(): Promise<void> {
    this.clearTokens();

    if (this.keycloak?.authenticated) {
      await this.keycloak.logout({
        redirectUri: window.location.origin,
      });
    }
  }

  /**
   * Refresh token
   */
  async refreshToken(minValidity = 30): Promise<boolean> {
    if (!this.keycloak) return false;

    try {
      const refreshed = await this.keycloak.updateToken(minValidity);

      if (refreshed) {
        this.storeTokens();
      }

      return refreshed;
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw error;
    }
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return this.keycloak?.authenticated || false;
  }

  /**
   * Get access token
   */
  getToken(): string | undefined {
    return this.keycloak?.token;
  }

  /**
   * Get refresh token
   */
  getRefreshToken(): string | undefined {
    return this.keycloak?.refreshToken;
  }

  /**
   * Get ID token
   */
  getIdToken(): string | undefined {
    return this.keycloak?.idToken;
  }

  /**
   * Get parsed token
   */
  getParsedToken(): any {
    return this.keycloak?.tokenParsed;
  }

  /**
   * Get user info from token
   */
  getUserInfo(): any {
    if (!this.keycloak?.authenticated || !this.keycloak?.tokenParsed) {
      return null;
    }

    const tokenParsed = this.keycloak.tokenParsed as any;

    return {
      id: tokenParsed.sub,
      username: tokenParsed.preferred_username,
      email: tokenParsed.email,
      name: tokenParsed.name || tokenParsed.preferred_username,
      firstName: tokenParsed.given_name,
      lastName: tokenParsed.family_name,
      roles: this.getUserRoles(),
      emailVerified: tokenParsed.email_verified,
      locale: tokenParsed.locale || 'es',
    };
  }

  /**
   * Get user roles from token
   */
  getUserRoles(): string[] {
    const tokenParsed = this.keycloak?.tokenParsed as any;
    if (!tokenParsed) return [];

    const roles: string[] = [];

    // Get realm roles
    if (tokenParsed.realm_access?.roles) {
      roles.push(...tokenParsed.realm_access.roles);
    }

    // Get client roles
    if (tokenParsed.resource_access?.[KEYCLOAK_CONFIG.clientId]?.roles) {
      roles.push(...tokenParsed.resource_access[KEYCLOAK_CONFIG.clientId].roles);
    }

    // Filter out default roles
    return roles.filter(role =>
      !['offline_access', 'uma_authorization', 'default-roles-munistream'].includes(role)
    );
  }

  /**
   * Check if user has a specific role
   */
  hasRole(role: string): boolean {
    return this.getUserRoles().includes(role);
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(roles: string[]): boolean {
    const userRoles = this.getUserRoles();
    return roles.some(role => userRoles.includes(role));
  }

  /**
   * Load user profile from Keycloak
   */
  async loadUserProfile(): Promise<any> {
    if (!this.keycloak?.authenticated) {
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
   * Account management - redirect to Keycloak account console
   */
  async accountManagement(): Promise<void> {
    if (!this.keycloak?.authenticated) {
      throw new Error('User is not authenticated');
    }

    window.location.href = `${KEYCLOAK_CONFIG.url}/realms/${KEYCLOAK_CONFIG.realm}/account`;
  }
}

// Export singleton instance
export const keycloakService = KeycloakService.getInstance();
export default keycloakService;