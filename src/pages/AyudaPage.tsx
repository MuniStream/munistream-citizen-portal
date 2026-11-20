import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MainLayout } from '../components/Layout/MainLayout';
import { workflowService } from '../services/workflowService';
import {
  atencionService,
  type CategoriaAtencion,
  type EstadoAtencion,
  type SolicitudAtencion,
} from '../services/atencionService';

const CATEGORIAS: CategoriaAtencion[] = ['duda_tramite', 'problema_tecnico', 'queja', 'sugerencia', 'otro'];

export const COLOR_ESTADO: Record<EstadoAtencion, 'warning' | 'success' | 'default'> = {
  abierta: 'warning',
  respondida: 'success',
  cerrada: 'default',
};

/**
 * Citizen help desk: the applicant opens support requests (optionally about
 * one of their requests) and follows the conversation with the staff.
 */
export const AyudaPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [solicitudes, setSolicitudes] = useState<SolicitudAtencion[] | null>(null);
  const [tramites, setTramites] = useState<{ instance_id: string; nombre: string }[]>([]);
  const [abierto, setAbierto] = useState(!!params.get('tramite'));
  const [asunto, setAsunto] = useState('');
  const [categoria, setCategoria] = useState<CategoriaAtencion>('duda_tramite');
  const [mensaje, setMensaje] = useState('');
  const [tramite, setTramite] = useState(params.get('tramite') ?? '');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    atencionService.misSolicitudes().then(setSolicitudes).catch(() => setSolicitudes([]));
    workflowService
      .getMyInstances()
      .then((r: any) =>
        setTramites(
          (r.instances ?? []).map((i: any) => ({
            instance_id: i.instance_id,
            nombre: `${i.workflow_name ?? i.workflow_id}${i.folio ? ` · ${i.folio}` : ''}`,
          })),
        ),
      )
      .catch(() => setTramites([]));
  }, []);

  const enviar = async () => {
    setEnviando(true);
    setError(null);
    try {
      const s = await atencionService.crearSolicitud({
        asunto: asunto.trim(),
        categoria,
        mensaje: mensaje.trim(),
        instance_id: tramite || undefined,
      });
      navigate(`/ayuda/${s.solicitud_id}`);
    } catch {
      setError(t('atencion.errorEnviar'));
      setEnviando(false);
    }
  };

  const valido = asunto.trim().length >= 3 && mensaje.trim().length > 0;

  return (
    <MainLayout>
      <Container maxWidth="md" sx={{ mt: 4, mb: 6 }}>
        <Typography variant="h4" component="h1" gutterBottom>{t('atencion.titulo')}</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>{t('atencion.descripcion')}</Typography>

        {!abierto ? (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAbierto(true)} sx={{ mb: 3 }}>
            {t('atencion.nueva')}
          </Button>
        ) : (
          <Card variant="outlined" sx={{ mb: 4 }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="h6" component="h2">{t('atencion.nueva')}</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
                <FormControl fullWidth>
                  <InputLabel id="at-cat">{t('atencion.categoria')}</InputLabel>
                  <Select labelId="at-cat" label={t('atencion.categoria')} value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaAtencion)}>
                    {CATEGORIAS.map((c) => <MenuItem key={c} value={c}>{t(`atencion.categorias.${c}`)}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel id="at-tr">{t('atencion.tramite')}</InputLabel>
                  <Select labelId="at-tr" label={t('atencion.tramite')} value={tramite} onChange={(e) => setTramite(e.target.value)}>
                    <MenuItem value="">{t('atencion.ninguno')}</MenuItem>
                    {tramites.map((i) => <MenuItem key={i.instance_id} value={i.instance_id}>{i.nombre}</MenuItem>)}
                  </Select>
                </FormControl>
              </Box>
              <TextField label={t('atencion.asunto')} value={asunto} onChange={(e) => setAsunto(e.target.value)} inputProps={{ maxLength: 200 }} required />
              <TextField label={t('atencion.mensaje')} value={mensaje} onChange={(e) => setMensaje(e.target.value)} multiline minRows={4} inputProps={{ maxLength: 4000 }} required />
              {error && <Alert severity="error">{error}</Alert>}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" disabled={!valido || enviando} onClick={enviar}>{t('atencion.enviar')}</Button>
                <Button onClick={() => setAbierto(false)}>{t('common.cancel')}</Button>
              </Box>
            </CardContent>
          </Card>
        )}

        <Typography variant="h6" component="h2" gutterBottom>{t('atencion.misSolicitudes')}</Typography>
        {solicitudes === null ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
        ) : solicitudes.length === 0 ? (
          <Typography color="text.secondary">{t('atencion.sinSolicitudes')}</Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {solicitudes.map((s) => (
              <Card key={s.solicitud_id} variant="outlined">
                <CardActionArea onClick={() => navigate(`/ayuda/${s.solicitud_id}`)}>
                  <CardContent sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center' }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }} noWrap>{s.asunto}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {s.folio} · {t(`atencion.categorias.${s.categoria}`)} · {new Date(s.updated_at).toLocaleDateString('es-MX')}
                      </Typography>
                    </Box>
                    <Chip size="small" color={COLOR_ESTADO[s.estado]} label={t(`atencion.estados.${s.estado}`)} />
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          </Box>
        )}
      </Container>
    </MainLayout>
  );
};

export default AyudaPage;
