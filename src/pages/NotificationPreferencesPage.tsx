import { useEffect, useState } from 'react';
import api from '../services/api';

interface NotificationPreferences {
  email_enabled: boolean;
  whatsapp_enabled: boolean;
  updated_at?: string;
}

export function NotificationPreferencesPage() {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    api
      .get<NotificationPreferences>('/me/notification-preferences')
      .then((r) => setPrefs(r.data))
      .catch((err) => {
        const detail = err?.response?.data?.detail || 'No se pudieron cargar tus preferencias.';
        setMessage({ ok: false, text: detail });
        setPrefs({ email_enabled: true, whatsapp_enabled: true });
      });
  }, []);

  const save = async (updated: NotificationPreferences) => {
    setSaving(true);
    setMessage(null);
    try {
      const resp = await api.put<NotificationPreferences>(
        '/me/notification-preferences',
        { email_enabled: updated.email_enabled, whatsapp_enabled: updated.whatsapp_enabled },
      );
      setPrefs(resp.data);
      setMessage({ ok: true, text: 'Preferencias actualizadas.' });
    } catch (err: any) {
      const detail = err?.response?.data?.detail || 'No se pudieron guardar tus preferencias.';
      setMessage({ ok: false, text: detail });
    } finally {
      setSaving(false);
    }
  };

  const toggle = (channel: 'email' | 'whatsapp') => {
    if (!prefs) return;
    const updated: NotificationPreferences = {
      ...prefs,
      email_enabled: channel === 'email' ? !prefs.email_enabled : prefs.email_enabled,
      whatsapp_enabled: channel === 'whatsapp' ? !prefs.whatsapp_enabled : prefs.whatsapp_enabled,
    };
    setPrefs(updated);
    save(updated);
  };

  return (
    <div style={{ maxWidth: 640, margin: '2rem auto', padding: '0 1rem' }}>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Preferencias de notificaciones</h1>
      <p style={{ color: '#555', marginBottom: '1.5rem' }}>
        Activa o desactiva los canales por los que deseas recibir avisos sobre el estado de tus
        trámites. Esta configuración no afecta comunicaciones legales obligatorias.
      </p>

      {message && (
        <div
          role="alert"
          style={{
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            borderRadius: 6,
            backgroundColor: message.ok ? '#e6f4ea' : '#fdecea',
            color: message.ok ? '#1e6d3b' : '#8b1b1b',
          }}
        >
          {message.text}
        </div>
      )}

      {!prefs && <p>Cargando…</p>}

      {prefs && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Row
            label="Correo electrónico"
            description="Recibe avisos en el correo registrado en tu cuenta."
            checked={prefs.email_enabled}
            disabled={saving}
            onChange={() => toggle('email')}
          />
          <Row
            label="WhatsApp"
            description="Recibe avisos al número registrado en tu cuenta."
            checked={prefs.whatsapp_enabled}
            disabled={saving}
            onChange={() => toggle('whatsapp')}
          />
        </div>
      )}

      {prefs?.updated_at && (
        <p style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: '#777' }}>
          Última actualización: {new Date(prefs.updated_at).toLocaleString()}
        </p>
      )}
    </div>
  );
}

interface RowProps {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
}

function Row({ label, description, checked, disabled, onChange }: RowProps) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem',
        border: '1px solid #e0e0e0',
        borderRadius: 8,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <div>
        <div style={{ fontWeight: 600 }}>{label}</div>
        <div style={{ color: '#666', fontSize: '0.9rem' }}>{description}</div>
      </div>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        style={{ width: 24, height: 24 }}
      />
    </label>
  );
}

export default NotificationPreferencesPage;
