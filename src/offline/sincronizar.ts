/**
 * Sends the outbox when there is signal and a session. Runs when the device
 * comes back online, every minute while online, and on demand from the UI.
 * Entries are sent oldest first; a network failure stops the round (the rest
 * waits for the next one) and a server error is recorded on the entry so the
 * citizen can see why it did not go through.
 */
import keycloakService from '../services/keycloak';
import { workflowService } from '../services/workflowService';
import { esFallaDeRed, guardar, pendientes, quitar, reconstruirForm } from './outbox';

let enCurso: Promise<ResultadoSync> | null = null;

export interface ResultadoSync {
  enviados: number;
  conError: number;
  sinSesion: boolean;
}

export function usuarioActual(): string | null {
  return (keycloakService.getParsedToken() as any)?.sub ?? null;
}

async function ronda(): Promise<ResultadoSync> {
  const res: ResultadoSync = { enviados: 0, conError: 0, sinSesion: false };
  if (!navigator.onLine) return res;
  const owner = usuarioActual();
  if (!owner || !keycloakService.isAuthenticated()) {
    res.sinSesion = (await pendientes()).length > 0;
    return res;
  }
  try {
    await keycloakService.refreshToken(30);
  } catch {
    // Session expired while offline: entries stay until the citizen signs in.
    res.sinSesion = true;
    return res;
  }
  for (const e of await pendientes(owner)) {
    const cuerpo = e.kind === 'json' ? (e.json as Record<string, unknown>) : reconstruirForm(e.form ?? []);
    try {
      await workflowService.submitCitizenData(e.instanceId, cuerpo as any, { clientSubmissionId: e.id });
      await quitar(e.id);
      res.enviados += 1;
    } catch (err) {
      if (esFallaDeRed(err)) break;
      await guardar({ ...e, attempts: e.attempts + 1, lastError: err instanceof Error ? err.message : String(err) });
      res.conError += 1;
    }
  }
  return res;
}

export function sincronizar(): Promise<ResultadoSync> {
  if (!enCurso) enCurso = ronda().finally(() => { enCurso = null; });
  return enCurso;
}

let iniciado = false;
export function iniciarSincronizacion(): void {
  if (iniciado) return;
  iniciado = true;
  window.addEventListener('online', () => { void sincronizar(); });
  window.setInterval(() => { if (navigator.onLine) void sincronizar(); }, 60_000);
  void sincronizar();
}
