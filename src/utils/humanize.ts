/**
 * Convierte una clave técnica en snake_case a una etiqueta legible.
 * Reemplaza TODOS los guiones bajos (no solo el primero) y capitaliza cada palabra.
 *
 *   humanizeKey('especies_cultivar')            -> 'Especies Cultivar'
 *   humanizeKey('numero_cedula_rnpa')           -> 'Numero Cedula Rnpa'
 *   humanizeKey('representacion_legal_persona') -> 'Representacion Legal Persona'
 *
 * Úsalo como fallback cuando no exista un `label` explícito, para no mostrarle
 * al ciudadano claves crudas con guión bajo.
 */
export function humanizeKey(key: string | null | undefined): string {
  if (!key) return '';
  return String(key)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

export default humanizeKey;
