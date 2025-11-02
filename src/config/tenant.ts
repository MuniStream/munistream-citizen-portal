/**
 * Tenant configuration from environment variables
 */

export const tenantConfig = {
  // Use environment variables if available, otherwise use defaults
  tenant: import.meta.env.VITE_TENANT || 'munistream',
  tenantName: import.meta.env.VITE_TENANT_NAME || 'MuniStream',
  organization: import.meta.env.VITE_ORGANIZATION || 'MuniStream Platform',
  logoUrl: import.meta.env.VITE_LOGO_URL || '',

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