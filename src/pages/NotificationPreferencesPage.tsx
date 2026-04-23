import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Box,
  CircularProgress,
  Container,
  Divider,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { MainLayout } from '../components/Layout/MainLayout';
import notificationService, {
  type NotificationCatalogEntry,
  type NotificationChannelKey,
  type NotificationChannelToggle,
  type NotificationPreferences,
} from '../services/notificationService';

const DEFAULT_TOGGLE: NotificationChannelToggle = { email: true, whatsapp: true };

function resolveToggle(
  prefs: NotificationPreferences | null,
  key: string,
): NotificationChannelToggle {
  return prefs?.per_notification?.[key] ?? DEFAULT_TOGGLE;
}

export function NotificationPreferencesPage() {
  const { t } = useTranslation();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [catalog, setCatalog] = useState<NotificationCatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [loadedPrefs, loadedCatalog] = await Promise.all([
          notificationService.getPreferences(),
          notificationService.getCatalog(),
        ]);
        setPrefs(loadedPrefs);
        setCatalog(loadedCatalog);
      } catch (err: any) {
        setMessage({
          ok: false,
          text:
            err?.response?.data?.detail ||
            t('preferences.notifications.loadError', 'No se pudieron cargar tus preferencias.'),
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [t]);

  const save = async (next: NotificationPreferences) => {
    setSaving(true);
    setMessage(null);
    try {
      const resp = await notificationService.updatePreferences({
        email_enabled: next.email_enabled,
        whatsapp_enabled: next.whatsapp_enabled,
        per_notification: next.per_notification,
      });
      setPrefs(resp);
      setMessage({
        ok: true,
        text: t('preferences.notifications.savedOk', 'Preferencias actualizadas.'),
      });
    } catch (err: any) {
      setMessage({
        ok: false,
        text:
          err?.response?.data?.detail ||
          t('preferences.notifications.saveError', 'No se pudieron guardar tus preferencias.'),
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleMaster = (channel: NotificationChannelKey) => {
    if (!prefs) return;
    const next: NotificationPreferences = {
      ...prefs,
      email_enabled: channel === 'email' ? !prefs.email_enabled : prefs.email_enabled,
      whatsapp_enabled:
        channel === 'whatsapp' ? !prefs.whatsapp_enabled : prefs.whatsapp_enabled,
      per_notification: prefs.per_notification,
    };
    setPrefs(next);
    save(next);
  };

  const togglePerNotification = (key: string, channel: NotificationChannelKey) => {
    if (!prefs) return;
    const current = resolveToggle(prefs, key);
    const updatedToggle: NotificationChannelToggle = {
      email: channel === 'email' ? !current.email : current.email,
      whatsapp: channel === 'whatsapp' ? !current.whatsapp : current.whatsapp,
    };
    const next: NotificationPreferences = {
      ...prefs,
      per_notification: {
        ...prefs.per_notification,
        [key]: updatedToggle,
      },
    };
    setPrefs(next);
    save(next);
  };

  const lastUpdated = useMemo(() => {
    if (!prefs?.updated_at) return null;
    try {
      return new Date(prefs.updated_at).toLocaleString();
    } catch {
      return prefs.updated_at;
    }
  }, [prefs?.updated_at]);

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

        {message && (
          <Alert
            severity={message.ok ? 'success' : 'error'}
            onClose={() => setMessage(null)}
            sx={{ mb: 3 }}
          >
            {message.text}
          </Alert>
        )}

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {!loading && prefs && (
          <>
            <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3 }, mb: 3, borderRadius: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                <NotificationsActiveIcon color="primary" />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {t('preferences.notifications.channels.title', 'Canales')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t(
                      'preferences.notifications.channels.subtitle',
                      'Interruptores generales. Si apagas un canal aquí, no se enviará nada por ese medio.',
                    )}
                  </Typography>
                </Box>
              </Stack>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={1.5}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={prefs.email_enabled}
                      disabled={saving}
                      onChange={() => toggleMaster('email')}
                    />
                  }
                  label={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <EmailIcon fontSize="small" color="action" />
                      <Typography>
                        {t('preferences.notifications.masterEmail', 'Correo electrónico')}
                      </Typography>
                    </Stack>
                  }
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={prefs.whatsapp_enabled}
                      disabled={saving}
                      onChange={() => toggleMaster('whatsapp')}
                    />
                  }
                  label={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <WhatsAppIcon fontSize="small" color="action" />
                      <Typography>
                        {t('preferences.notifications.masterWhatsapp', 'WhatsApp')}
                      </Typography>
                    </Stack>
                  }
                />
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                <NotificationsActiveIcon color="primary" />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {t('preferences.notifications.perNotification.title', 'Notificaciones')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t(
                      'preferences.notifications.perNotification.subtitle',
                      'Activa o desactiva cada aviso por canal.',
                    )}
                  </Typography>
                </Box>
              </Stack>
              <Divider sx={{ mb: 2 }} />

              {catalog.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                  {t(
                    'preferences.notifications.perNotification.empty',
                    'Aún no hay notificaciones configuradas para tu cuenta.',
                  )}
                </Typography>
              )}

              <Stack divider={<Divider flexItem />} spacing={0}>
                {catalog.map((entry) => {
                  const toggle = resolveToggle(prefs, entry.key);
                  return (
                    <Box key={entry.key} sx={{ py: 2 }}>
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={{ xs: 1.5, sm: 3 }}
                        alignItems={{ sm: 'center' }}
                        justifyContent="space-between"
                      >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 600 }}>{entry.title}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {entry.description}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={2} sx={{ flexShrink: 0 }}>
                          <FormControlLabel
                            control={
                              <Switch
                                size="small"
                                checked={toggle.email && prefs.email_enabled}
                                disabled={saving || !prefs.email_enabled}
                                onChange={() => togglePerNotification(entry.key, 'email')}
                              />
                            }
                            label={
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                <EmailIcon fontSize="small" color="action" />
                                <Typography variant="body2">
                                  {t('preferences.notifications.channel.email', 'Email')}
                                </Typography>
                              </Stack>
                            }
                            sx={{ mr: 0 }}
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                size="small"
                                checked={toggle.whatsapp && prefs.whatsapp_enabled}
                                disabled={saving || !prefs.whatsapp_enabled}
                                onChange={() => togglePerNotification(entry.key, 'whatsapp')}
                              />
                            }
                            label={
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                <WhatsAppIcon fontSize="small" color="action" />
                                <Typography variant="body2">
                                  {t('preferences.notifications.channel.whatsapp', 'WhatsApp')}
                                </Typography>
                              </Stack>
                            }
                            sx={{ mr: 0 }}
                          />
                        </Stack>
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>
            </Paper>

            {lastUpdated && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                {t('preferences.notifications.updatedAt', 'Última actualización:')} {lastUpdated}
              </Typography>
            )}
          </>
        )}
      </Container>
    </MainLayout>
  );
}

export default NotificationPreferencesPage;
