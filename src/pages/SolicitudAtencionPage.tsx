import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Container, TextField, Typography } from '@mui/material';
import { ArrowBack as BackIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { MainLayout } from '../components/Layout/MainLayout';
import { atencionService, type SolicitudAtencion } from '../services/atencionService';
import { COLOR_ESTADO } from './AyudaPage';

/** One support request and its conversation with the staff. */
export const SolicitudAtencionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [s, setS] = useState<SolicitudAtencion | null>(null);
  const [noExiste, setNoExiste] = useState(false);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (id) atencionService.solicitud(id).then(setS).catch(() => setNoExiste(true));
  }, [id]);

  const responder = async () => {
    if (!id) return;
    setEnviando(true);
    try {
      setS(await atencionService.responder(id, texto.trim()));
      setTexto('');
    } finally {
      setEnviando(false);
    }
  };

  const cerrar = async () => {
    if (id) setS(await atencionService.cerrar(id));
  };

  return (
    <MainLayout>
      <Container maxWidth="md" sx={{ mt: 4, mb: 6 }}>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/ayuda')} sx={{ mb: 2 }}>{t('atencion.volver')}</Button>
        {noExiste && <Alert severity="warning">{t('atencion.noEncontrada')}</Alert>}
        {!s && !noExiste && <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>}
        {s && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mb: 1 }}>
              <Typography variant="h5" component="h1">{s.asunto}</Typography>
              <Chip color={COLOR_ESTADO[s.estado]} label={t(`atencion.estados.${s.estado}`)} />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {s.folio} · {t(`atencion.categorias.${s.categoria}`)}
              {s.instance_id && (
                <> · <RouterLink to={`/instances/${s.instance_id}`}>{t('atencion.verTramite')}</RouterLink></>
              )}
            </Typography>

            <Box component="ol" sx={{ listStyle: 'none', p: 0, m: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {s.mensajes.map((m, i) => {
                const propio = m.autor === 'ciudadano';
                return (
                  <Box component="li" key={i} sx={{ alignSelf: propio ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                    <Card variant="outlined" sx={{ bgcolor: propio ? 'action.hover' : 'background.paper', borderColor: propio ? 'divider' : 'primary.main' }}>
                      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Typography variant="caption" color="text.secondary" component="p">
                          {propio ? t('atencion.tu') : (m.autor_nombre || t('atencion.personal'))} · {new Date(m.fecha).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}
                        </Typography>
                        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{m.texto}</Typography>
                      </CardContent>
                    </Card>
                  </Box>
                );
              })}
            </Box>

            {s.estado !== 'cerrada' ? (
              <Card variant="outlined" sx={{ mt: 3 }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField label={t('atencion.tuMensaje')} multiline minRows={3} value={texto} onChange={(e) => setTexto(e.target.value)} inputProps={{ maxLength: 4000 }} />
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button variant="contained" disabled={!texto.trim() || enviando} onClick={responder}>{t('atencion.enviarMensaje')}</Button>
                    <Button color="inherit" onClick={cerrar}>{t('atencion.cerrar')}</Button>
                  </Box>
                </CardContent>
              </Card>
            ) : (
              <Alert severity="info" sx={{ mt: 3 }}>{t('atencion.cerrada')}</Alert>
            )}
          </>
        )}
      </Container>
    </MainLayout>
  );
};

export default SolicitudAtencionPage;
