import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import { useAuth } from '../../contexts/AuthContext';
import profileService, {
  type ProfileField,
  type LlaveMxProfile,
  type PersonaMoral,
} from '../../services/profileService';

type FormValues = Record<string, string>;

export const ProfileContent: React.FC = () => {
  const { user } = useAuth();
  const [fields, setFields] = useState<ProfileField[]>([]);
  const [values, setValues] = useState<FormValues>({});
  const [llavemx, setLlavemx] = useState<LlaveMxProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [schema, profile, llavemxProfile] = await Promise.all([
          profileService.getSchema(),
          profileService.getProfile(),
          // Best-effort: a portal without Llave MX still shows the rest.
          profileService.getLlaveMxProfile().catch(() => null),
        ]);
        setFields(schema);
        setLlavemx(llavemxProfile);
        const initial: FormValues = {};
        for (const f of schema) {
          const v = profile.data?.[f.field_id];
          initial[f.field_id] = v === null || v === undefined ? '' : String(v);
        }
        setValues(initial);
      } catch (err: any) {
        setMessage({
          ok: false,
          text: err?.response?.data?.detail || 'No se pudo cargar tu perfil.',
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // CURP/RFC may arrive from the synced Llave MX profile or directly from the
  // token claims exposed in the auth context.
  const curp = llavemx?.curp || user?.curp || '';
  const rfc = llavemx?.rfc || user?.rfc || '';
  const personasMorales = llavemx?.personas_morales ?? [];
  const hasLlaveMxData = Boolean(curp || rfc || personasMorales.length);

  const handleChange = (fieldId: string, value: string) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const payload: Record<string, unknown> = {};
    for (const f of fields) {
      const raw = values[f.field_id];
      if (raw === undefined || raw === '') continue;
      payload[f.field_id] = f.type === 'number' ? Number(raw) : raw;
    }
    try {
      const resp = await profileService.updateProfile(payload);
      setMessage({ ok: true, text: 'Perfil actualizado correctamente.' });
      const refreshed: FormValues = {};
      for (const f of fields) {
        const v = resp.data?.[f.field_id];
        refreshed[f.field_id] = v === null || v === undefined ? '' : String(v);
      }
      setValues(refreshed);
    } catch (err: any) {
      setMessage({
        ok: false,
        text: err?.response?.data?.detail || 'No se pudo guardar el perfil.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
      <Stack spacing={0.5} sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Mi Perfil
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

      {/* Información de cuenta (read-only, viene de Keycloak) */}
      <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3 }, mb: 3, borderRadius: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
          <VerifiedUserIcon color="primary" />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Información de cuenta
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Datos sincronizados desde tu cuenta institucional
            </Typography>
          </Box>
        </Stack>
        <Divider sx={{ mb: 2 }} />
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
          }}
        >
          <TextField
            fullWidth
            label="Nombre completo"
            value={user?.name || `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || '—'}
            InputProps={{ readOnly: true }}
            variant="filled"
          />
          <TextField
            fullWidth
            label="Correo electrónico"
            value={user?.email || '—'}
            InputProps={{ readOnly: true }}
            variant="filled"
          />
          <TextField
            fullWidth
            label="Usuario"
            value={user?.username || '—'}
            InputProps={{ readOnly: true }}
            variant="filled"
          />
          <TextField
            fullWidth
            label="Teléfono"
            value={user?.phone || '—'}
            InputProps={{ readOnly: true }}
            variant="filled"
          />
          {curp && (
            <TextField
              fullWidth
              label="CURP"
              value={curp}
              InputProps={{ readOnly: true }}
              variant="filled"
            />
          )}
          {rfc && (
            <TextField
              fullWidth
              label="RFC"
              value={rfc}
              InputProps={{ readOnly: true }}
              variant="filled"
            />
          )}
        </Box>
      </Paper>

      {/* Personas morales (Llave MX) — solo se muestra para portales con Llave MX */}
      {hasLlaveMxData && (
        <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3 }, mb: 3, borderRadius: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
            <BusinessIcon color="primary" />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Personas morales
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Empresas asociadas a tu cuenta Llave MX
              </Typography>
            </Box>
          </Stack>
          <Divider sx={{ mb: 2 }} />

          {personasMorales.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
              No tienes personas morales asociadas a tu cuenta.
            </Typography>
          )}

          <Stack spacing={2}>
            {personasMorales.map((pm, idx) => (
              <PersonaMoralCard key={pm.rfc || idx} persona={pm} />
            ))}
          </Stack>
        </Paper>
      )}

      {/* Campos configurables */}
      <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
          <PersonIcon color="primary" />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Información adicional
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Datos usados para agilizar tus trámites
            </Typography>
          </Box>
        </Stack>
        <Divider sx={{ mb: 3 }} />

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {!loading && fields.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            Aún no hay información adicional configurada para tu perfil.
          </Typography>
        )}

        {!loading && fields.length > 0 && (
          <Box component="form" onSubmit={handleSubmit}>
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
              }}
            >
              {fields.map((f) => (
                <Box
                  key={f.field_id}
                  sx={{ gridColumn: f.type === 'textarea' ? { md: 'span 2' } : undefined }}
                >
                  <ProfileFieldInput
                    field={f}
                    value={values[f.field_id] ?? ''}
                    onChange={(v) => handleChange(f.field_id, v)}
                  />
                </Box>
              ))}
            </Box>

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={saving}
                startIcon={saving ? <CircularProgress size={18} color="inherit" /> : null}
              >
                {saving ? 'Guardando…' : 'Guardar perfil'}
              </Button>
            </Box>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

interface FieldInputProps {
  field: ProfileField;
  value: string;
  onChange: (v: string) => void;
}

const ProfileFieldInput: React.FC<FieldInputProps> = ({ field, value, onChange }) => {
  const common = {
    fullWidth: true,
    required: field.required,
    label: field.label,
    placeholder: field.placeholder ?? undefined,
    helperText: field.help_text ?? undefined,
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
  };

  if (field.type === 'textarea') {
    return <TextField {...common} multiline minRows={3} />;
  }
  if (field.type === 'select' && field.options) {
    return (
      <TextField
        {...common}
        select
        onChange={(e) => onChange(e.target.value)}
      >
        <MenuItem value="">— Selecciona —</MenuItem>
        {field.options.map((o) => (
          <MenuItem key={o.value} value={o.value}>
            {o.label}
          </MenuItem>
        ))}
      </TextField>
    );
  }
  const typeAttr =
    field.type === 'email' ? 'email' :
    field.type === 'phone' ? 'tel' :
    field.type === 'date' ? 'date' :
    field.type === 'number' ? 'number' :
    'text';
  return (
    <TextField
      {...common}
      type={typeAttr}
      InputLabelProps={field.type === 'date' ? { shrink: true } : undefined}
      inputProps={{
        pattern: field.validation?.pattern ?? undefined,
        minLength: field.validation?.min_length ?? undefined,
        maxLength: field.validation?.max_length ?? undefined,
      }}
    />
  );
};

const PersonaMoralCard: React.FC<{ persona: PersonaMoral }> = ({ persona }) => {
  const dom = persona.domicilioFiscal;
  const domicilio = dom
    ? [dom.calle, dom.numExterior && `#${dom.numExterior}`, dom.numInterior, dom.colonia, dom.codigoPostal, dom.municipio, dom.estado]
        .filter(Boolean)
        .join(', ')
    : '';

  return (
    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        {persona.razonSocial || 'Persona moral'}
      </Typography>
      <Box
        sx={{
          mt: 1,
          display: 'grid',
          gap: 1,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
        }}
      >
        {persona.rfc && <Detail label="RFC" value={persona.rfc} />}
        {persona.regimenFiscal && <Detail label="Régimen fiscal" value={persona.regimenFiscal} />}
        {persona.correoEmpresa && <Detail label="Correo" value={persona.correoEmpresa} />}
        {persona.folioMercantil && <Detail label="Folio mercantil" value={persona.folioMercantil} />}
        {persona.vigenciaCertificado && (
          <Detail label="Vigencia certificado" value={persona.vigenciaCertificado} />
        )}
        {domicilio && <Detail label="Domicilio fiscal" value={domicilio} fullWidth />}
      </Box>
    </Box>
  );
};

const Detail: React.FC<{ label: string; value: string; fullWidth?: boolean }> = ({
  label,
  value,
  fullWidth,
}) => (
  <Box sx={{ gridColumn: fullWidth ? { md: 'span 2' } : undefined }}>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body2">{value}</Typography>
  </Box>
);

export default ProfileContent;
