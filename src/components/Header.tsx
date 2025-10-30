import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppBar, Toolbar, Box, Typography, Button, Container } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { TenantBranding } from './TenantBranding';
import keycloakService from '../services/keycloak';

interface HeaderProps {
  showBackLink?: boolean;
  backLinkTo?: string;
  backLinkText?: string;
  variant?: 'default' | 'detail' | 'catalog';
}

export const Header: React.FC<HeaderProps> = ({
  showBackLink = false,
  backLinkTo = '/services',
  backLinkText,
  variant = 'default'
}) => {
  const { t } = useTranslation();
  const { isAuthenticated, user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AppBar position="sticky">
      <Container maxWidth={false}>
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            {showBackLink ? (
              <Link to={backLinkTo} style={{ textDecoration: 'none', color: 'inherit' }}>
                <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
                  <TenantBranding type="title" />
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                  {backLinkText || t('workflows.title')}
                </Typography>
              </Link>
            ) : (
              <>
                <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
                  <TenantBranding type="title" />
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                  {t('workflows.title')}
                </Typography>
              </>
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Navigation Links */}
            {variant === 'catalog' && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  component={Link}
                  to="/services"
                  variant="text"
                  color="inherit"
                  size="small"
                >
                  {t('navigation.services')}
                </Button>
                <Button
                  component={Link}
                  to="/documents"
                  variant="text"
                  color="inherit"
                  size="small"
                >
                  {t('navigation.documents')}
                </Button>
              </Box>
            )}

            <LanguageSwitcher variant="compact" />

            {isAuthenticated ? (
              <>
                {variant === 'catalog' && (
                  <Button
                    component={Link}
                    to="/my-entities"
                    variant="outlined"
                    color="inherit"
                  >
                    📂 {t('my_entities.title')}
                  </Button>
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {user?.firstName} {user?.lastName}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.9 }}>
                      {user?.email}
                    </Typography>
                    {!user?.emailVerified && (
                      <Typography variant="caption" sx={{ color: 'warning.light', display: 'block' }}>
                        Email not verified
                      </Typography>
                    )}
                  </Box>
                  <Button
                    onClick={handleLogout}
                    variant="outlined"
                    color="inherit"
                  >
                    {variant === 'catalog' ? t('auth.logout') : 'Sign Out'}
                  </Button>
                </Box>
              </>
            ) : (
              <Button
                onClick={() => keycloakService.login()}
                variant="outlined"
                color="inherit"
              >
                {t('auth.login')}
              </Button>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};