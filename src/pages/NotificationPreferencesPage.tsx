import { useTranslation } from 'react-i18next';
import { Container, Stack, Typography } from '@mui/material';
import { MainLayout } from '../components/Layout/MainLayout';
import { NotificationPreferences } from '../components/NotificationPreferences/NotificationPreferences';

export function NotificationPreferencesPage() {
  const { t } = useTranslation();
  return (
    <MainLayout
      headerProps={{
        variant: 'detail',
        showBackLink: true,
        backLinkTo: '/services',
        backLinkText: t('navigation.services', 'Servicios'),
      }}
    >
      <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
        <Stack spacing={0.5} sx={{ mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {t('preferences.notifications.title', 'Preferencias de notificaciones')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t(
              'preferences.notifications.subtitle',
              'Elige cómo quieres enterarte del avance de tus trámites. Esta configuración no afecta comunicaciones legales obligatorias.',
            )}
          </Typography>
        </Stack>
        <NotificationPreferences />
      </Container>
    </MainLayout>
  );
}

export default NotificationPreferencesPage;
