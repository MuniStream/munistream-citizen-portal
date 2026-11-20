import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { MainLayout } from '../components/Layout/MainLayout';
import { atencionService, type Indicadores } from '../services/atencionService';

const nf = (n: number | null | undefined, d = 0) =>
  n == null ? null : n.toLocaleString('es-MX', { maximumFractionDigits: d, minimumFractionDigits: d });

const Kpi: React.FC<{ valor: string | null; etiqueta: string; ayuda: string }> = ({ valor, etiqueta, ayuda }) => (
  <Card variant="outlined" sx={{ height: '100%' }}>
    <CardContent>
      <Typography variant="h4" component="p" sx={{ fontWeight: 700, color: 'primary.main', fontVariantNumeric: 'tabular-nums' }}>
        {valor ?? '—'}
      </Typography>
      <Typography variant="subtitle2" component="p">{etiqueta}</Typography>
      <Typography variant="caption" color="text.secondary">{ayuda}</Typography>
    </CardContent>
  </Card>
);

/**
 * Public institutional indicators: requests received and resolved, share
 * resolved within the legal term, average resolution time and satisfaction.
 * Anonymous and aggregated; counts below the publication threshold are
 * withheld by the API and shown as "—".
 */
export const IndicadoresPage: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [meses, setMeses] = useState(12);
  const [datos, setDatos] = useState<Indicadores | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setDatos(null);
    setError(false);
    atencionService.indicadores(meses).then(setDatos).catch(() => setError(true));
  }, [meses]);

  const maxMes = useMemo(
    () => Math.max(1, ...(datos?.por_mes ?? []).flatMap((m) => [m.recibidos, m.resueltos])),
    [datos],
  );

  const etiquetaMes = (clave: string) => {
    const [y, m] = clave.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('es-MX', { month: 'short', year: '2-digit' });
  };

  const r = datos?.resumen;
  const sin = t('indicadores.sinDato');

  return (
    <MainLayout>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }}>
        <Typography variant="h4" component="h1" gutterBottom>{t('indicadores.titulo')}</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 820 }}>
          {t('indicadores.descripcion')}
        </Typography>

        <ToggleButtonGroup
          exclusive
          size="small"
          value={meses}
          onChange={(_, v) => v && setMeses(v)}
          aria-label={t('indicadores.periodo')}
          sx={{ mb: 3 }}
        >
          {[3, 6, 12].map((m) => (
            <ToggleButton key={m} value={m}>{t('indicadores.ultimosMeses', { n: m })}</ToggleButton>
          ))}
        </ToggleButtonGroup>

        {error && <Alert severity="error">{t('indicadores.error')}</Alert>}
        {!datos && !error && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
        )}

        {datos && r && (
          <>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' }, gap: 2, mb: 4 }}>
              <Kpi valor={nf(r.recibidos)} etiqueta={t('indicadores.kpi.recibidos')} ayuda={t('indicadores.kpi.recibidosAyuda')} />
              <Kpi valor={nf(r.resueltos)} etiqueta={t('indicadores.kpi.resueltos')} ayuda={t('indicadores.kpi.resueltosAyuda', { n: nf(r.en_revision) })} />
              <Kpi
                valor={r.porcentaje_en_plazo == null ? null : `${nf(r.porcentaje_en_plazo, 1)} %`}
                etiqueta={t('indicadores.kpi.enPlazo')}
                ayuda={t('indicadores.kpi.enPlazoAyuda', { dias: nf(r.dias_promedio_resolucion, 1) ?? sin })}
              />
              <Kpi
                valor={r.satisfaccion == null ? null : `${nf(r.satisfaccion, 1)} / 5`}
                etiqueta={t('indicadores.kpi.satisfaccion')}
                ayuda={t('indicadores.kpi.satisfaccionAyuda', { n: r.opiniones })}
              />
            </Box>

            <Card variant="outlined" sx={{ mb: 4 }}>
              <CardContent>
                <Typography variant="h6" component="h2" gutterBottom>{t('indicadores.porMes')}</Typography>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }} aria-hidden>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box sx={{ width: 12, height: 12, bgcolor: 'primary.main', borderRadius: 0.5 }} />
                    <Typography variant="caption">{t('indicadores.recibidos')}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box sx={{ width: 12, height: 12, bgcolor: theme.palette.success.main, borderRadius: 0.5 }} />
                    <Typography variant="caption">{t('indicadores.resueltos')}</Typography>
                  </Box>
                </Box>
                <Box
                  role="img"
                  aria-label={t('indicadores.porMesDescripcion')}
                  sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 200, overflowX: 'auto', pb: 1 }}
                >
                  {datos.por_mes.map((m) => (
                    <Tooltip key={m.mes} title={`${etiquetaMes(m.mes)}: ${m.recibidos} ${t('indicadores.recibidos').toLowerCase()}, ${m.resueltos} ${t('indicadores.resueltos').toLowerCase()}`}>
                      <Box sx={{ flex: '1 0 44px', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                        <Box sx={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '3px', width: '100%', justifyContent: 'center' }}>
                          <Box sx={{ width: 14, height: `${(m.recibidos / maxMes) * 100}%`, bgcolor: 'primary.main', borderRadius: '3px 3px 0 0', minHeight: m.recibidos ? 2 : 0 }} />
                          <Box sx={{ width: 14, height: `${(m.resueltos / maxMes) * 100}%`, bgcolor: theme.palette.success.main, borderRadius: '3px 3px 0 0', minHeight: m.resueltos ? 2 : 0 }} />
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, whiteSpace: 'nowrap' }}>
                          {etiquetaMes(m.mes)}
                        </Typography>
                      </Box>
                    </Tooltip>
                  ))}
                </Box>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" component="h2" gutterBottom>{t('indicadores.porTramite')}</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('indicadores.col.tramite')}</TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{t('indicadores.col.plazo')}</TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{t('indicadores.col.recibidos')}</TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{t('indicadores.col.resueltos')}</TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{t('indicadores.col.enPlazo')}</TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{t('indicadores.col.dias')}</TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{t('indicadores.col.satisfaccion')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {datos.por_tramite.map((w) => (
                        <TableRow key={w.workflow_id}>
                          <TableCell>{w.nombre}</TableCell>
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                            {w.plazo_dias} {w.plazo_habiles ? t('plazo.habilesCorto') : t('plazo.naturalesCorto')}
                          </TableCell>
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{nf(w.recibidos) ?? '—'}</TableCell>
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{nf(w.resueltos) ?? '—'}</TableCell>
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{w.porcentaje_en_plazo == null ? '—' : `${nf(w.porcentaje_en_plazo, 1)} %`}</TableCell>
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{nf(w.dias_promedio_resolucion, 1) ?? '—'}</TableCell>
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{w.satisfaccion == null ? '—' : nf(w.satisfaccion, 1)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 2 }}>
                  {t('indicadores.notaSupresion', { n: datos.minimo_publicable })}
                </Typography>
                <Typography variant="caption" color="text.secondary" component="p">
                  {t('indicadores.notaMetodo', {
                    fecha: new Date(datos.generado).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' }),
                  })}
                </Typography>
              </CardContent>
            </Card>
          </>
        )}
      </Container>
    </MainLayout>
  );
};

export default IndicadoresPage;
