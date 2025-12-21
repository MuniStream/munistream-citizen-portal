import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Container,
  Typography,
  Link,
  Grid,
  Divider,
} from '@mui/material';
import { useThemeConfig } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';

export const Footer: React.FC = () => {
  const { t } = useTranslation();
  const muiTheme = useTheme();
  const { themeConfig } = useThemeConfig();
  const { isAuthenticated } = useAuth();

  const footerTheme = muiTheme.footer;
  const variables = themeConfig?.templates?.variables || {};
  const organization = themeConfig?.metadata?.organization || 'MuniStream';

  const bgColor = footerTheme?.backgroundColor || muiTheme.palette.primary.dark || muiTheme.palette.primary.main;
  const textColor = footerTheme?.textColor || '#ffffff';
  const linkColor = footerTheme?.linkColor || muiTheme.palette.primary.light || '#90caf9';
  const borderTop = footerTheme?.borderTop;

  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: bgColor,
        color: textColor,
        borderTop: borderTop || undefined,
        pt: 5,
        pb: 3,
        mt: 'auto',
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {/* Column 1: Organization info */}
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ color: textColor, fontWeight: 600 }}
            >
              {organization}
            </Typography>
            {variables.department && (
              <Typography variant="body2" sx={{ color: textColor, opacity: 0.8, mb: 1 }}>
                {variables.department}
              </Typography>
            )}
            {variables.app_name && (
              <Typography variant="body2" sx={{ color: textColor, opacity: 0.7 }}>
                {variables.app_name}
              </Typography>
            )}
          </Grid>

          {/* Column 2: Quick links */}
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ color: textColor, fontWeight: 600 }}
            >
              {t('footer.quickLinks')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Link
                component={RouterLink}
                to="/catalog"
                sx={{ color: linkColor, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                {t('navigation.services')}
              </Link>
              {isAuthenticated && (
                <>
                  <Link
                    component={RouterLink}
                    to="/dashboard"
                    sx={{ color: linkColor, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                  >
                    {t('navigation.dashboard')}
                  </Link>
                  <Link
                    component={RouterLink}
                    to="/instances"
                    sx={{ color: linkColor, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                  >
                    {t('navigation.myInstances')}
                  </Link>
                  <Link
                    component={RouterLink}
                    to="/entities"
                    sx={{ color: linkColor, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                  >
                    {t('navigation.myEntities')}
                  </Link>
                </>
              )}
              {variables.privacy_url && (
                <Link
                  href={variables.privacy_url}
                  sx={{ color: linkColor, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                >
                  {t('footer.privacy')}
                </Link>
              )}
              {variables.terms_url && (
                <Link
                  href={variables.terms_url}
                  sx={{ color: linkColor, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                >
                  {t('footer.terms')}
                </Link>
              )}
            </Box>
          </Grid>

          {/* Column 3: Contact & Support */}
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ color: textColor, fontWeight: 600 }}
            >
              {t('footer.contactTitle')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {variables.support_email && (
                <Box>
                  <Typography variant="caption" sx={{ color: textColor, opacity: 0.7, display: 'block' }}>
                    {t('footer.email')}
                  </Typography>
                  <Link
                    href={`mailto:${variables.support_email}`}
                    sx={{ color: linkColor, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                  >
                    {variables.support_email}
                  </Link>
                </Box>
              )}
              {variables.support_phone && (
                <Box>
                  <Typography variant="caption" sx={{ color: textColor, opacity: 0.7, display: 'block' }}>
                    {t('footer.phone')}
                  </Typography>
                  <Typography variant="body2" sx={{ color: textColor }}>
                    {variables.support_phone}
                  </Typography>
                </Box>
              )}
              {variables.support_hours && (
                <Box>
                  <Typography variant="caption" sx={{ color: textColor, opacity: 0.7, display: 'block' }}>
                    {t('footer.hours')}
                  </Typography>
                  <Typography variant="body2" sx={{ color: textColor }}>
                    {variables.support_hours}
                  </Typography>
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ borderColor: `${textColor}33`, my: 3 }} />

        {/* Bottom bar: copyright */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Typography variant="body2" sx={{ color: textColor, opacity: 0.8 }}>
            © {currentYear} {organization}. {t('footer.allRightsReserved')}
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};
