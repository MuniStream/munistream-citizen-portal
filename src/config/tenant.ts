/**
 * Tenant configuration from environment variables
 */

export const tenantConfig = {
  // Use environment variables if available, otherwise use defaults
  tenant: import.meta.env.VITE_TENANT || 'munistream',
  tenantName: import.meta.env.VITE_TENANT_NAME || 'MuniStream',
  organization: import.meta.env.VITE_ORGANIZATION || 'MuniStream Platform',
  logoUrl: import.meta.env.VITE_LOGO_URL || '',

  // Raw value inlined at build time; replaced at runtime by docker-entrypoint.sh.
  // Kept as a string (not compared inline) so esbuild does not constant-fold it.
  loginHidePasswordWithIdpRaw: import.meta.env.VITE_LOGIN_HIDE_PASSWORD_WITH_IDP,

  // When true, the email/password option is hidden whenever at least one
  // identity provider is configured (forces citizens to use the IdP).
  // Evaluated at runtime via a getter to avoid build-time constant folding.
  get hidePasswordWithIdp(): boolean {
    return String(this.loginHidePasswordWithIdpRaw).trim().toLowerCase() === 'true';
  },

  // Helper method to get display name
  getDisplayName(): string {
    return this.tenantName;
  },

  // Helper method to get organization
  getOrganization(): string {
    return this.organization;
  },

  // Helper method to get logo URL
  getLogo(): string | null {
    return this.logoUrl || null;
  }
};

// Export as default for easier import
export default tenantConfig;