import React from 'react';
import { Box, Chip, LinearProgress, Typography } from '@mui/material';
import {
  CheckCircle as EnTiempoIcon,
  Warning as PorVencerIcon,
  Error as VencidoIcon,
  PauseCircle as PausaIcon,
  EditNote as CapturaIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import type { PlazoCiudadano } from '../../services/atencionService';

const fecha = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

const TONO = {
  en_tiempo: { color: 'success' as const, Icon: EnTiempoIcon },
  por_vencer: { color: 'warning' as const, Icon: PorVencerIcon },
  vencido: { color: 'error' as const, Icon: VencidoIcon },
};

interface Props {
  plazo?: PlazoCiudadano | null;
  /** `compact` for list cards, `full` for the request detail. */
  variant?: 'compact' | 'full';
}

/**
 * Legal resolution term of a request, as the applicant sees it: due date,
 * business days elapsed and whether it is on time. The clock runs from the
 * moment the request enters review and stops while the institution waits for
 * the applicant's corrections.
 */
export const PlazoTramite: React.FC<Props> = ({ plazo, variant = 'compact' }) => {
  const { t } = useTranslation();
  if (!plazo) return null;

  if (plazo.en_captura) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
        <CapturaIcon fontSize="small" />
        <Typography variant="body2">{t('plazo.enCaptura')}</Typography>
      </Box>
    );
  }
  if (plazo.sin_plazo) {
    return variant === 'full' ? (
      <Typography variant="body2" color="text.secondary">{t('plazo.sinPlazo')}</Typography>
    ) : null;
  }

  const tipo = plazo.plazo_habiles ? t('plazo.habiles') : t('plazo.naturales');

  if (plazo.resuelto) {
    return (
      <Typography variant="body2" color="text.secondary">
        {t(plazo.en_plazo ? 'plazo.resueltoEnPlazo' : 'plazo.resueltoFueraDePlazo', {
          n: plazo.dias_transcurridos,
          tipo,
        })}
      </Typography>
    );
  }

  const estado = plazo.estado ?? 'en_tiempo';
  const { color, Icon } = TONO[estado];
  const avance = Math.min(100, ((plazo.dias_transcurridos ?? 0) / (plazo.plazo_dias || 1)) * 100);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="body2">
          {t('plazo.compromiso')}: <strong>{fecha(plazo.fecha_compromiso)}</strong>
        </Typography>
        {plazo.pausado ? (
          <Chip size="small" icon={<PausaIcon />} label={t('plazo.pausado')} />
        ) : (
          <Chip size="small" color={color} variant="outlined" icon={<Icon />} label={t(`plazo.estado.${estado}`)} />
        )}
      </Box>
      <LinearProgress
        variant="determinate"
        value={avance}
        color={plazo.pausado ? 'inherit' : color}
        aria-label={t('plazo.avance')}
        sx={{ mt: 1, height: 6, borderRadius: 3 }}
      />
      <Typography variant="caption" color="text.secondary">
        {t('plazo.transcurridos', { n: plazo.dias_transcurridos, total: plazo.plazo_dias, tipo })}
      </Typography>
      {variant === 'full' && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {plazo.pausado ? t('plazo.explicacionPausa') : t('plazo.explicacion', { fecha: fecha(plazo.fecha_presentacion) })}
        </Typography>
      )}
    </Box>
  );
};

export default PlazoTramite;
