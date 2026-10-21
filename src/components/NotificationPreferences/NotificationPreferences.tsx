import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Box,
  CircularProgress,
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
import notificationService, {
  type NotificationCatalogEntry,
  type NotificationChannelKey,
  type NotificationChannelToggle,
  type NotificationContacts,
  type NotificationPreferences as Preferences,
} from '../../services/notificationService';

const DEFAULT_TOGGLE: NotificationChannelToggle = { email: true, whatsapp: true };

function resolveToggle(prefs: Preferences | null, key: string): NotificationChannelToggle {
  return prefs?.per_notification?.[key] ?? DEFAULT_TOGGLE;
}

interface Props {
  /** Change it to re-read the delivery addresses, e.g. after the profile is saved. */
  contactsVersion?: number;
}

/**
 * The citizen's notification settings: where notices are delivered, master
 * switch per channel and a toggle per notification. Shared by the profile page
 * and /settings.
 */
export function NotificationPreferences({ contactsVersion = 0 }: Props) {
  const { t } = useTranslation();
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [catalog, setCatalog] = useState<NotificationCatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [contacts, setContacts] = useState<NotificationContacts | null>(null);

  useEffect(() => {
    notificationService
      .getContacts()
      .then(setContacts)
      .catch(() => setContacts(null));
  }, [contactsVersion]);

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

  const save = async (next: Preferences) => {
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
    const next: Preferences = {
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
    const next: Preferences = {
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
    <>
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

    {contacts && (
      <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3 }, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {t('preferences.notifications.contacts.title', 'Dónde recibirás los avisos')}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {t(
            'preferences.notifications.contacts.subtitle',
            'Los datos de tu cuenta más los teléfonos y correos que agregues en tu perfil.',
          )}
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <EmailIcon fontSize="small" color="action" sx={{ mt: 0.25 }} />
            <Typography variant="body2">
              {contacts.email.length
                ? contacts.email.join(', ')
                : t('preferences.notifications.contacts.noEmail', 'Sin correo registrado.')}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <WhatsAppIcon fontSize="small" color="action" sx={{ mt: 0.25 }} />
            <Typography variant="body2">
              {contacts.whatsapp.length
                ? contacts.whatsapp.join(', ')
                : t(
                    'preferences.notifications.contacts.noWhatsapp',
                    'Sin celular registrado. Agrégalo en tu perfil para recibir avisos por WhatsApp.',
                  )}
            </Typography>
          </Stack>
        </Stack>
      </Paper>
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
    </>
  );
}

export default NotificationPreferences;
