import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, CircularProgress } from '@mui/material';
import { CloudOff as SinSenalIcon, CloudSync as PendienteIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { onOutboxChange, pendientes } from '../../offline/outbox';
import { iniciarSincronizacion, sincronizar, usuarioActual } from '../../offline/sincronizar';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Connection and outbox status, shown on every page: no signal, captures
 * waiting to be sent (with a "send now" button) and captures that need the
 * citizen to sign in again to be sent.
 */
export const EstadoConexion: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated, login } = useAuth() as any;
  const [enLinea, setEnLinea] = useState(navigator.onLine);
  const [cuantos, setCuantos] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [sinSesion, setSinSesion] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contar = useCallback(async () => {
    const lista = await pendientes(usuarioActual() ?? undefined).catch(() => []);
    setCuantos(lista.length);
    setError(lista.find((e) => e.lastError)?.lastError ?? null);
  }, []);

  useEffect(() => {
    const on = () => setEnLinea(true);
    const off = () => setEnLinea(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    const quitar = onOutboxChange(() => { void contar(); });
    void contar();
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      quitar();
    };
  }, [contar]);

  useEffect(() => {
    if (isAuthenticated) iniciarSincronizacion();
  }, [isAuthenticated]);

  const enviarAhora = async () => {
    setEnviando(true);
    const r = await sincronizar();
    setSinSesion(r.sinSesion);
    setEnviando(false);
    void contar();
  };

  if (enLinea && cuantos === 0) return null;

  const accion =
    enLinea && cuantos > 0 ? (
      sinSesion || !isAuthenticated ? (
        <Button color="inherit" size="small" onClick={() => login?.()}>{t('offline.iniciarSesion')}</Button>
      ) : (
        <Button
          color="inherit"
          size="small"
          onClick={enviarAhora}
          disabled={enviando}
          startIcon={enviando ? <CircularProgress size={14} color="inherit" /> : undefined}
        >
          {t('offline.enviarAhora')}
        </Button>
      )
    ) : undefined;

  let texto: string;
  if (!enLinea) texto = cuantos ? t('offline.sinSenalPendientes', { count: cuantos }) : t('offline.sinSenal');
  else texto = sinSesion ? t('offline.requiereSesion', { count: cuantos }) : t('offline.pendientes', { count: cuantos });

  return (
    <Alert
      severity={enLinea && !error ? 'info' : 'warning'}
      icon={enLinea ? <PendienteIcon /> : <SinSenalIcon />}
      sx={{ borderRadius: 0 }}
      role="status"
      action={accion}
    >
      {texto}
      {enLinea && error ? ` ${t('offline.conError', { error })}` : ''}
    </Alert>
  );
};

export default EstadoConexion;
