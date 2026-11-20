import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Rating, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { atencionService, type Feedback } from '../../services/atencionService';

/**
 * Rating of a resolved request (1-5 and an optional comment). One per request;
 * once sent it is shown read-only.
 */
export const CalificacionTramite: React.FC<{ instanceId: string }> = ({ instanceId }) => {
  const { t } = useTranslation();
  const [previa, setPrevia] = useState<Feedback | null | undefined>(undefined);
  const [calificacion, setCalificacion] = useState<number | null>(null);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    atencionService.getFeedback(instanceId).then(setPrevia).catch(() => setPrevia(null));
  }, [instanceId]);

  if (previa === undefined) return null;

  const enviar = async () => {
    if (!calificacion) return;
    setEnviando(true);
    setError(null);
    try {
      setPrevia(await atencionService.enviarFeedback(instanceId, calificacion, comentario.trim() || undefined));
    } catch {
      setError(t('calificacion.error'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Card variant="outlined" sx={{ my: 3 }}>
      <CardContent>
        <Typography variant="h6" component="h2" gutterBottom>
          {t('calificacion.titulo')}
        </Typography>
        {previa ? (
          <Box>
            <Rating value={previa.calificacion} readOnly aria-label={t('calificacion.tuCalificacion')} />
            <Typography variant="body2" color="text.secondary">
              {t('calificacion.gracias')}
            </Typography>
            {previa.comentario && (
              <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>“{previa.comentario}”</Typography>
            )}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {t('calificacion.pregunta')}
            </Typography>
            <Rating
              size="large"
              value={calificacion}
              onChange={(_, v) => setCalificacion(v)}
              aria-label={t('calificacion.tuCalificacion')}
            />
            <TextField
              label={t('calificacion.comentario')}
              multiline
              minRows={2}
              inputProps={{ maxLength: 1000 }}
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
            />
            {error && <Alert severity="error">{error}</Alert>}
            <Box>
              <Button variant="contained" disabled={!calificacion || enviando} onClick={enviar}>
                {t('calificacion.enviar')}
              </Button>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default CalificacionTramite;
