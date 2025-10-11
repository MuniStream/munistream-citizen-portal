import React from 'react';
import tenantConfig from '../config/tenant';

interface TenantBrandingProps {
  type?: 'title' | 'organization' | 'full';
  className?: string;
}

export const TenantBranding: React.FC<TenantBrandingProps> = ({
  type = 'title',
  className = 'logo'
}) => {
  switch(type) {
    case 'title':
      return <span className={className}>{tenantConfig.getDisplayName()}</span>;
    case 'organization':
      return <span className={className}>{tenantConfig.getOrganization()}</span>;
    case 'full':
      return (
        <span className={className}>
          {tenantConfig.getDisplayName()} - {tenantConfig.getOrganization()}
        </span>
      );
    default:
      return <span className={className}>{tenantConfig.getDisplayName()}</span>;
  }
};