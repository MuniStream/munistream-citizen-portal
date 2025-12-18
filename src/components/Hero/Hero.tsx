import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { TenantBranding } from '../TenantBranding';

export const Hero: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const heroTheme = (theme as any).hero as {
    backgroundColor?: string;
    backgroundGradient?: string;
    textColor?: string;
    subtitleColor?: string;
    minHeight?: string;
    padding?: string;
  } | undefined;

  return (
    <Box
      component="section"
      sx={{
        background:
          heroTheme?.backgroundGradient ||
          heroTheme?.backgroundColor ||
          theme.palette.primary.main,
        color: heroTheme?.textColor || theme.palette.primary.contrastText,
        minHeight: heroTheme?.minHeight || '180px',
        padding: heroTheme?.padding || '48px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
      }}
    >
      <Typography
        variant="h3"
        component="h2"
        sx={{ fontWeight: 700, mb: 1.5 }}
      >
        <TenantBranding type="title" />
      </Typography>
      <Typography
        variant="h6"
        sx={{
          color: heroTheme?.subtitleColor || 'inherit',
          opacity: 0.85,
          maxWidth: 600,
        }}
      >
        {t('app.subtitle')}
      </Typography>
    </Box>
  );
};
