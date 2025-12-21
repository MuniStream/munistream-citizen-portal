import { BaseApiService, ApiConfig, AuthProvider } from './api.base';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';

interface MobileConfig {
  apiUrl: string;
  apiBasePath: string;
  keycloakUrl: string;
  keycloakRealm: string;
  keycloakClientId: string;
  tenantId?: string;
}

/**
 * Mobile-specific auth provider using Expo SecureStore and AuthSession
 */
class MobileAuthProvider implements AuthProvider {
  private config: MobileConfig;
  private discovery?: AuthSession.DiscoveryDocument;
  private accessToken?: string;
  private refreshTokenValue?: string;
  private idToken?: string;
  private tokenExpiry?: Date;

  constructor(config: MobileConfig) {
    this.config = config;
    this.loadStoredTokens();
  }

  private async loadStoredTokens() {
    try {
      const storedToken = await SecureStore.getItemAsync('access_token');
      const storedRefresh = await SecureStore.getItemAsync('refresh_token');
      const storedIdToken = await SecureStore.getItemAsync('id_token');
      const storedExpiry = await SecureStore.getItemAsync('token_expiry');

      if (storedToken) this.accessToken = storedToken;
      if (storedRefresh) this.refreshTokenValue = storedRefresh;
      if (storedIdToken) this.idToken = storedIdToken;
      if (storedExpiry) this.tokenExpiry = new Date(storedExpiry);
    } catch (error) {
      console.error('Error loading stored tokens:', error);
    }
  }

  private async storeTokens(
    accessToken: string,
    refreshToken?: string,
    idToken?: string,
    expiresIn?: number
  ) {
    try {
      await SecureStore.setItemAsync('access_token', accessToken);
      if (refreshToken) {
        await SecureStore.setItemAsync('refresh_token', refreshToken);
      }
      if (idToken) {
        await SecureStore.setItemAsync('id_token', idToken);
      }
      if (expiresIn) {
        const expiry = new Date(Date.now() + expiresIn * 1000);
        await SecureStore.setItemAsync('token_expiry', expiry.toISOString());
        this.tokenExpiry = expiry;
      }

      this.accessToken = accessToken;
      this.refreshTokenValue = refreshToken;
      this.idToken = idToken;
    } catch (error) {
      console.error('Error storing tokens:', error);
    }
  }

  async clearTokens() {
    try {
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('refresh_token');
      await SecureStore.deleteItemAsync('id_token');
      await SecureStore.deleteItemAsync('token_expiry');

      this.accessToken = undefined;
      this.refreshTokenValue = undefined;
      this.idToken = undefined;
      this.tokenExpiry = undefined;
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  async getDiscovery(): Promise<AuthSession.DiscoveryDocument> {
    if (!this.discovery) {
      const issuer = `${this.config.keycloakUrl}/realms/${this.config.keycloakRealm}`;
      this.discovery = await AuthSession.fetchDiscoveryAsync(issuer);
    }
    return this.discovery;
  }

  getToken(): string | undefined {
    // Check if token is expired
    if (this.tokenExpiry && new Date() >= this.tokenExpiry) {
      return undefined;
    }
    return this.accessToken;
  }

  async refreshToken(minValidity?: number): Promise<boolean> {
    if (!this.refreshTokenValue) {
      console.log('No refresh token available');
      return false;
    }

    try {
      const discovery = await this.getDiscovery();
      const tokenResult = await AuthSession.refreshAsync(
        {
          clientId: this.config.keycloakClientId,
          refreshToken: this.refreshTokenValue,
        },
        discovery
      );

      if (tokenResult.accessToken) {
        await this.storeTokens(
          tokenResult.accessToken,
          tokenResult.refreshToken,
          tokenResult.idToken,
          tokenResult.expiresIn
        );
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }
    return false;
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  async authenticate(): Promise<boolean> {
    try {
      const discovery = await this.getDiscovery();
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'munistream',
        path: 'auth',
      });

      // Create auth request
      const request = new AuthSession.AuthRequest({
        clientId: this.config.keycloakClientId,
        scopes: ['openid', 'profile', 'email'],
        redirectUri,
        responseType: AuthSession.ResponseType.Code,
        codeChallenge: AuthSession.AuthRequest.PKCE.codeChallenge,
        usePKCE: true,
        extraParams: {
          locale: 'es', // Default to Spanish
        },
      });

      // Initiate authentication
      const result = await request.promptAsync(discovery);

      if (result.type === 'success' && result.params.code) {
        // Exchange code for tokens
        const tokenResult = await AuthSession.exchangeCodeAsync(
          {
            clientId: this.config.keycloakClientId,
            code: result.params.code,
            redirectUri,
            codeVerifier: request.codeVerifier!,
          },
          discovery
        );

        if (tokenResult.accessToken) {
          await this.storeTokens(
            tokenResult.accessToken,
            tokenResult.refreshToken,
            tokenResult.idToken,
            tokenResult.expiresIn
          );
          return true;
        }
      }
    } catch (error) {
      console.error('Authentication failed:', error);
    }
    return false;
  }

  async logout(): Promise<void> {
    try {
      const discovery = await this.getDiscovery();
      const idToken = this.idToken;

      await this.clearTokens();

      if (idToken && discovery.endSessionEndpoint) {
        const logoutUrl = `${discovery.endSessionEndpoint}?id_token_hint=${idToken}&post_logout_redirect_uri=${AuthSession.makeRedirectUri()}`;
        await WebBrowser.openAuthSessionAsync(logoutUrl);
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  parseJwt(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error parsing JWT:', error);
      return null;
    }
  }

  getUserInfo(): any {
    if (!this.accessToken) return null;

    const tokenData = this.parseJwt(this.accessToken);
    if (!tokenData) return null;

    return {
      id: tokenData.sub,
      username: tokenData.preferred_username,
      email: tokenData.email,
      name: tokenData.name || tokenData.preferred_username,
      firstName: tokenData.given_name,
      lastName: tokenData.family_name,
      emailVerified: tokenData.email_verified,
      locale: tokenData.locale || 'es',
    };
  }
}

/**
 * Mobile-specific API service
 */
export class MobileApiService extends BaseApiService {
  private authProvider: MobileAuthProvider;

  constructor(config: MobileConfig) {
    const apiConfig: ApiConfig = {
      baseURL: config.apiUrl,
      apiBasePath: config.apiBasePath,
      tenant: config.tenantId,
    };

    const authProvider = new MobileAuthProvider(config);
    super(apiConfig, authProvider);
    this.authProvider = authProvider;
  }

  /**
   * Authenticate user via Keycloak
   */
  async login(): Promise<boolean> {
    return this.authProvider.authenticate();
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    return this.authProvider.logout();
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.authProvider.isAuthenticated();
  }

  /**
   * Get user info from token
   */
  getUserInfo(): any {
    return this.authProvider.getUserInfo();
  }

  /**
   * Refresh the authentication token
   */
  async refreshToken(): Promise<boolean> {
    return this.authProvider.refreshToken();
  }
}

// Export factory function for mobile
export function createMobileApiService(config: MobileConfig): MobileApiService {
  return new MobileApiService(config);
}