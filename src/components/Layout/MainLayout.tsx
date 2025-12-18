import React from 'react';
import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import { Header } from '../Header/Header';
import type { HeaderProps } from '../Header/Header';
import { Footer } from '../Footer/Footer';
import { Hero } from '../Hero/Hero';
import { HtmlInjector } from '../HtmlInjector/HtmlInjector';
import { useThemeConfig } from '../../contexts/ThemeContext';
import { getOverride } from '../../overrides';

interface MainLayoutProps {
  children: ReactNode;
  headerProps?: HeaderProps;
  hideFooter?: boolean;
  showHero?: boolean;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  headerProps,
  hideFooter = false,
  showHero = false,
}) => {
  const { themeConfig } = useThemeConfig();
  const htmlOverrides = themeConfig?.html_overrides || {};

  const TsxHeader = getOverride('Header');
  const TsxFooter = getOverride('Footer');
  const TsxHero = getOverride('Hero');

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}
    >
      {TsxHeader
        ? <TsxHeader />
        : htmlOverrides.header
          ? <HtmlInjector src="/themes/components/header.html" />
          : <Header {...(headerProps || {})} />
      }
      {showHero && (
        TsxHero
          ? <TsxHero />
          : htmlOverrides.hero
            ? <HtmlInjector src="/themes/components/hero.html" />
            : <Hero />
      )}
      <Box sx={{ flex: 1 }}>
        {children}
      </Box>
      {!hideFooter && (
        TsxFooter
          ? <TsxFooter />
          : htmlOverrides.footer
            ? <HtmlInjector src="/themes/components/footer.html" />
            : <Footer />
      )}
    </Box>
  );
};
