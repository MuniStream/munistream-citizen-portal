import React from 'react';
import { Link } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { TenantBranding } from '../TenantBranding';
import tenantConfig from '../../config/tenant';

interface HeaderLogoProps {
  variant?: 'mobile' | 'desktop';
  showSubtitle?: boolean;
  linkTo?: string;
}

export const HeaderLogo: React.FC<HeaderLogoProps> = ({
  variant = 'desktop',
  showSubtitle = false,
  linkTo = '/services'
}) => {
  const theme = useTheme() as any;
  const logoSize = variant === 'mobile'
    ? theme.header?.logoSize?.mobile
    : theme.header?.logoSize?.desktop;

  // Check if tenant has a logo asset
  const logoUrl = tenantConfig.getLogo();

  return (
    <Link to={linkTo} style={{ textDecoration: 'none', color: 'inherit' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={tenantConfig.getDisplayName()}
            style={{
              width: logoSize?.width || (variant === 'mobile' ? 120 : 150),
              height: logoSize?.height || (variant === 'mobile' ? 32 : 40),
              objectFit: 'contain'
            }}
          />
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography
              variant={variant === 'mobile' ? 'h6' : 'h5'}
              component="h1"
              sx={{
                fontWeight: 700,
                color: 'inherit',
                lineHeight: 1.2,
                fontSize: variant === 'mobile' ? '1.1rem' : '1.5rem'
              }}
            >
              <TenantBranding type="title" />
            </Typography>
            {showSubtitle && tenantConfig.getDisplayName() !== tenantConfig.getOrganization() && (
              <Typography
                variant="caption"
                sx={{
                  opacity: 0.9,
                  color: 'inherit',
                  fontSize: variant === 'mobile' ? '0.65rem' : '0.75rem'
                }}
              >
                <TenantBranding type="organization" />
              </Typography>
            )}
          </Box>
        )}
      </Box>
    </Link>
  );
};