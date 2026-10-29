/**
 * What identifies one of the citizen's entities: its name, its official
 * identifier and whether it is still valid.
 *
 * The wallet list and the record page have to agree on all three — a document
 * that reads "Vigente hasta" in the list and "Vencido" when opened is worse
 * than either answer alone — so this is the single place that decides.
 */

// Official identifiers worth showing, in order of preference. Same fields the
// backend search looks into. Labels live under `my_entities.id_labels.*`.
export const ID_FIELDS = ['matricula', 'folio', 'numero_permiso', 'numero_titulo', 'rnpa', 'rfc', 'curp'];

// How long before it expires a document starts being flagged.
export const EXPIRING_DAYS = 30;

export type Validity = { kind: 'valid' | 'expiring' | 'expired'; date: Date } | null;

export function validityOf(entity: { valid_until?: string | null }, now: number): Validity {
  if (!entity.valid_until) return null;
  const date = new Date(entity.valid_until);
  if (Number.isNaN(date.getTime())) return null;
  const days = (date.getTime() - now) / 86_400_000;
  if (days < 0) return { kind: 'expired', date };
  if (days <= EXPIRING_DAYS) return { kind: 'expiring', date };
  return { kind: 'valid', date };
}

// Names written by some workflows are raw keys ("mia_particular").
export function isRawKey(name: string): boolean {
  return /^[a-z0-9]+(_[a-z0-9]+)+$/.test(name);
}

/**
 * The entity's official identifier: the folio the entity's own display config
 * points at, or the first of the known identifier fields.
 *
 * Returns the data key and its value; the caller labels it (the folio field
 * carries no label of its own, so it falls back to `entity.record.folio`).
 */
export function officialId(
  data: Record<string, any> | undefined,
  folioField?: string | null,
): { field: string; value: string } | null {
  const candidates = folioField ? [folioField, 'folio', ...ID_FIELDS] : ['folio', ...ID_FIELDS];
  for (const field of candidates) {
    const value = data?.[field];
    if (typeof value === 'string' && value.trim()) return { field, value: value.trim() };
    if (typeof value === 'number') return { field, value: String(value) };
  }
  return null;
}
