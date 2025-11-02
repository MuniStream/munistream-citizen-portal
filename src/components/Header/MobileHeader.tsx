import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Box,
  IconButton,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Login as LoginIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '../../contexts/AuthContext';
import { HeaderLogo } from './HeaderLogo';
import { ProfileMenu } from './ProfileMenu';
import { NavigationDrawer } from './NavigationDrawer';
import { LanguageSwitcher } from '../LanguageSwitcher';
import keycloakService from '../../services/keycloak';

interface MobileHeaderProps {
  showBackLink?: boolean;
  backLinkTo?: string;
  backLinkText?: string;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  showBackLink = false,
  backLinkTo = '/services',
}) => {
  const theme = useTheme() as any;
  const { isAuthenticated } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const headerTheme = theme.header || {};

  const toggleDrawer = (open: boolean) => (event: React.KeyboardEvent | React.MouseEvent) => {
    if (
      event.type === 'keydown' &&
      ((event as React.KeyboardEvent).key === 'Tab' ||
        (event as React.KeyboardEvent).key === 'Shift')
    ) {
      return;
    }
    setDrawerOpen(open);
  };

  return (
    <>
      <AppBar
        position="sticky"
        elevation={headerTheme.elevation ?? 1}
        sx={{
          backgroundColor: headerTheme.backgroundColor || theme.palette.primary.main,
          color: headerTheme.textColor || theme.palette.primary.contrastText,
          borderBottom: headerTheme.borderBottom,
        }}
      >
        <Toolbar
          sx={{
            minHeight: `${headerTheme.mobileHeight || 56}px !important`,
            px: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {/* Logo/Brand - Left */}
          <Box sx={{ display: 'flex', alignItems: 'center', flex: '0 0 auto' }}>
            <HeaderLogo
              variant="mobile"
              showSubtitle={false}
              linkTo={showBackLink ? backLinkTo : '/services'}
            />
          </Box>

          {/* Actions - Right */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {/* Language Switcher */}
            <LanguageSwitcher variant="compact" />

            {/* Profile Menu or Login */}
            {isAuthenticated ? (
              <ProfileMenu isMobile={true} />
            ) : (
              <IconButton
                color="inherit"
                onClick={() => keycloakService.login()}
                size="medium"
              >
                <LoginIcon />
              </IconButton>
            )}

            {/* Hamburger Menu */}
            <IconButton
              color="inherit"
              edge="end"
              onClick={toggleDrawer(true)}
              size="medium"
              sx={{ ml: 0.5 }}
            >
              <MenuIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Navigation Drawer */}
      <NavigationDrawer
        open={drawerOpen}
        onClose={toggleDrawer(false)}
        isMobile={true}
      />
    </>
  );
};