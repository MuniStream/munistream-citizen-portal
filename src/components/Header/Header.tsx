import React from 'react';
import { useMediaQuery, useTheme } from '@mui/material';
import { MobileHeader } from './MobileHeader';
import { DesktopHeader } from './DesktopHeader';

export interface HeaderProps {
  showBackLink?: boolean;
  backLinkTo?: string;
  backLinkText?: string;
  variant?: 'default' | 'detail' | 'catalog';
}

export const Header: React.FC<HeaderProps> = (props) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Use mobile header for small and medium screens
  if (isMobile) {
    return <MobileHeader {...props} />;
  }

  // Use desktop header for large screens
  return <DesktopHeader {...props} />;
};