/**
 * Offline outbox for form submissions.
 *
 * At sea or in a remote landing there is often no signal. A form that was
 * opened with signal (the service worker keeps the request and its catalogs)
 * can still be filled; when the citizen submits it without connection the
 * submission is stored here, with its files, and sent as soon as the device is
 * back online. Each entry carries a `client_submission_id` that the backend
 * uses to ignore a replay of something it already processed (a request that
 * reached the server but whose answer was lost).
 *
 * Entries belong to the user who captured them (`owner`): they are only sent
 * with that user's session.
 */

const DB_NAME = 'munistream-offline';
const STORE = 'outbox';
const VERSION = 1;

type Campo = { key: string; value: string } | { key: string; blob: Blob; filename: string };

export interface EnvioPendiente {
  id: string;
  owner: string;
  instanceId: string;
  stepId: string;
  workflowName?: string;
  kind: 'json' | 'form';
  json?: unknown;
  form?: Campo[];
  createdAt: string;
  attempts: number;
  lastError?: string;
}

const EVENTO = 'outbox-change';

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('owner', 'owner');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await abrir();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function avisar() {
  window.dispatchEvent(new Event(EVENTO));
}

export function onOutboxChange(fn: () => void): () => void {
  window.addEventListener(EVENTO, fn);
  return () => window.removeEventListener(EVENTO, fn);
}

/** FormData can't be stored in IndexedDB: keep its entries, files as Blobs. */
export function serializarForm(fd: FormData): Campo[] {
  const campos: Campo[] = [];
  fd.forEach((value, key) => {
    if (typeof value === 'string') campos.push({ key, value });
    else campos.push({ key, blob: value, filename: (value as File).name || 'archivo' });
  });
  return campos;
}

export function reconstruirForm(campos: Campo[]): FormData {
  const fd = new FormData();
  for (const c of campos) {
    if ('blob' in c) fd.append(c.key, new File([c.blob], c.filename, { type: c.blob.type }));
    else fd.append(c.key, c.value);
  }
  return fd;
}

export function nuevoId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function guardar(envio: EnvioPendiente): Promise<void> {
  await tx('readwrite', (s) => s.put(envio));
  avisar();
}

export async function pendientes(owner?: string): Promise<EnvioPendiente[]> {
  const todos = await tx<EnvioPendiente[]>('readonly', (s) => s.getAll());
  return todos
    .filter((e) => !owner || e.owner === owner)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function quitar(id: string): Promise<void> {
  await tx('readwrite', (s) => s.delete(id));
  avisar();
}

/** A network failure (no signal), as opposed to an answer from the server. */
export function esFallaDeRed(err: unknown): boolean {
  return (typeof navigator !== 'undefined' && !navigator.onLine) || err instanceof TypeError;
}
