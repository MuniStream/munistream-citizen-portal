import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import api from '../services/api';

interface ThemeColors {
  primary_main: string;
  primary_light?: string;
  primary_dark?: string;
  primary_contrast_text?: string;
  secondary_main?: string;
  secondary_light?: string;
  secondary_dark?: string;
  secondary_contrast_text?: string;
  background_default?: string;
  background_paper?: string;
  text_primary?: string;
  text_secondary?: string;
  text_disabled?: string;
  error?: string;
  warning?: string;
  info?: string;
  success?: string;
  custom?: Record<string, string>;
}

interface ThemeTypography {
  font_family?: string;
  font_family_headings?: string;
  font_size_base?: number;
  font_size_small?: number;
  font_size_large?: number;
  font_weight_light?: number;
  font_weight_regular?: number;
  font_weight_medium?: number;
  font_weight_bold?: number;
}

interface HeaderThemeConfig {
  height?: number;
  mobileHeight?: number;
  backgroundColor?: string;
  textColor?: string;
  logoSize?: {
    desktop?: { width: number; height: number };
    mobile?: { width: number; height: number };
  };
  elevation?: number;
  borderBottom?: string;
  drawer?: {
    width?: number;
    backgroundColor?: string;
    textColor?: string;
    headerBackground?: string;
    sectionBackground?: string;
  };
  menu?: {
    backgroundColor?: string;
    textColor?: string;
    hoverColor?: string;
    dividerColor?: string;
  };
  profile?: {
    avatarBackground?: string;
    avatarColor?: string;
    menuBackground?: string;
    menuTextColor?: string;
  };
}

interface ThemeConfig {
  metadata?: {
    name: string;
    organization?: string;
    tenant_id?: string;
  };
  colors: ThemeColors;
  typography?: ThemeTypography;
  spacing?: {
    unit?: number;
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  borders?: {
    radius_sm?: number;
    radius_md?: number;
    radius_lg?: number;
  };
  header?: HeaderThemeConfig;
  components?: Record<string, any>;
  assets?: {
    logo?: string;
    favicon?: string;
    background_image?: string;
  };
}

interface ThemeContextType {
  theme: Theme;
  themeConfig: ThemeConfig | null;
  isLoading: boolean;
  error: Error | null;
  reloadTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Default theme fallback
const defaultThemeConfig: ThemeConfig = {
  colors: {
    primary_main: '#1976d2',
    secondary_main: '#dc004e',
    background_default: '#ffffff',
    background_paper: '#f5f5f5',
  },
};

function createMuiTheme(config: ThemeConfig): Theme {
  const { colors, typography, spacing, borders, header, components } = config;

  return createTheme({
    palette: {
      primary: {
        main: colors.primary_main,
        light: colors.primary_light,
        dark: colors.primary_dark,
        contrastText: colors.primary_contrast_text,
      },
      ...(colors.secondary_main && {
        secondary: {
          main: colors.secondary_main,
          light: colors.secondary_light,
          dark: colors.secondary_dark,
          contrastText: colors.secondary_contrast_text,
        }
      }),
      background: {
        default: colors.background_default || '#ffffff',
        paper: colors.background_paper || '#f5f5f5',
      },
      text: {
        primary: colors.text_primary || '#000000',
        secondary: colors.text_secondary || '#666666',
        disabled: colors.text_disabled || '#999999',
      },
      ...(colors.error && { error: { main: colors.error } }),
      ...(colors.warning && { warning: { main: colors.warning } }),
      ...(colors.info && { info: { main: colors.info } }),
      ...(colors.success && { success: { main: colors.success } }),
    },
    typography: typography ? {
      fontFamily: typography.font_family,
      fontSize: typography.font_size_base,
      fontWeightLight: typography.font_weight_light,
      fontWeightRegular: typography.font_weight_regular,
      fontWeightMedium: typography.font_weight_medium,
      fontWeightBold: typography.font_weight_bold,
      h1: typography.font_family_headings ? { fontFamily: typography.font_family_headings } : undefined,
      h2: typography.font_family_headings ? { fontFamily: typography.font_family_headings } : undefined,
      h3: typography.font_family_headings ? { fontFamily: typography.font_family_headings } : undefined,
      h4: typography.font_family_headings ? { fontFamily: typography.font_family_headings } : undefined,
      h5: typography.font_family_headings ? { fontFamily: typography.font_family_headings } : undefined,
      h6: typography.font_family_headings ? { fontFamily: typography.font_family_headings } : undefined,
    } : undefined,
    spacing: spacing?.unit,
    shape: borders ? {
      borderRadius: borders.radius_md || 4,
    } : undefined,
    components: {
      MuiAppBar: header ? {
        styleOverrides: {
          root: {
            backgroundColor: header.backgroundColor,
            color: header.textColor,
            elevation: header.elevation,
            borderBottom: header.borderBottom,
          }
        }
      } : undefined,
      MuiDrawer: header?.drawer ? {
        styleOverrides: {
          paper: {
            backgroundColor: header.drawer.backgroundColor,
            color: header.drawer.textColor,
            width: header.drawer.width || 280,
          }
        }
      } : undefined,
      ...components,
    },
    // Add custom header theme to the theme object
    header: {
      height: header?.height || 64,
      mobileHeight: header?.mobileHeight || 56,
      backgroundColor: header?.backgroundColor || colors.primary_main,
      textColor: header?.textColor || '#ffffff',
      logoSize: header?.logoSize || {
        desktop: { width: 150, height: 40 },
        mobile: { width: 120, height: 32 }
      },
      elevation: header?.elevation ?? 4,
      drawer: {
        width: header?.drawer?.width || 280,
        backgroundColor: header?.drawer?.backgroundColor || '#ffffff',
        textColor: header?.drawer?.textColor || colors.text_primary || '#000000',
        headerBackground: header?.drawer?.headerBackground || colors.primary_main,
        sectionBackground: header?.drawer?.sectionBackground || '#f5f5f5',
      },
      menu: {
        backgroundColor: header?.menu?.backgroundColor || '#ffffff',
        textColor: header?.menu?.textColor || colors.text_primary || '#000000',
        hoverColor: header?.menu?.hoverColor || colors.primary_light || '#e3f2fd',
        dividerColor: header?.menu?.dividerColor || '#e0e0e0',
      },
      profile: {
        avatarBackground: header?.profile?.avatarBackground || colors.primary_main,
        avatarColor: header?.profile?.avatarColor || '#ffffff',
        menuBackground: header?.profile?.menuBackground || '#ffffff',
        menuTextColor: header?.profile?.menuTextColor || colors.text_primary || '#000000',
      }
    } as any,
  });
}

export function CustomThemeProvider({ children }: { children: ReactNode }) {
  const [themeConfig, setThemeConfig] = useState<ThemeConfig | null>(null);
  const [theme, setTheme] = useState<Theme>(() => createMuiTheme(defaultThemeConfig));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadTheme = async () => {
    try {
      setIsLoading(true);
      setError(null);


      const response = await api.get('/themes/current');
      const config = response.data as ThemeConfig;

      setThemeConfig(config);
      setTheme(createMuiTheme(config));

      // Set CSS variables for theme colors
      const root = document.documentElement;
      if (config.colors) {
        root.style.setProperty('--primary-color', config.colors.primary_main);
        root.style.setProperty('--primary-light', config.colors.primary_light || config.colors.primary_main);
        root.style.setProperty('--primary-dark', config.colors.primary_dark || config.colors.primary_main);
        root.style.setProperty('--secondary-color', config.colors.secondary_main || config.colors.primary_main);
        root.style.setProperty('--background-default', config.colors.background_default || '#ffffff');
        root.style.setProperty('--background-paper', config.colors.background_paper || '#f5f5f5');
        root.style.setProperty('--text-primary', config.colors.text_primary || '#000000');
        root.style.setProperty('--text-secondary', config.colors.text_secondary || '#666666');
      }

      // Update document metadata if available
      if (config.metadata?.organization) {
        document.title = `${config.metadata.organization} - Portal Ciudadano`;
      }

      // Update favicon if available
      if (config.assets?.favicon) {
        const favicon = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (favicon) {
          favicon.href = `/api/v1/themes/current/assets/${config.assets.favicon}`;
        }
      }
    } catch (err) {
      console.error('Failed to load theme:', err);
      setError(err as Error);
      // Keep using default theme on error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTheme();
  }, []);

  const contextValue: ThemeContextType = {
    theme,
    themeConfig,
    isLoading,
    error,
    reloadTheme: loadTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a CustomThemeProvider');
  }
  return context;
}