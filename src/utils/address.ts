/**
 * Utilidades para el domicilio estructurado (campo `address`).
 * El valor es un objeto { calle, no_ext, no_int, colonia, municipio, estado, cp }.
 */

export interface AddressLike {
  calle?: string;
  no_ext?: string;
  no_int?: string;
  colonia?: string;
  municipio?: string;
  estado?: string;
  cp?: string;
}

function isAddress(v: any): v is AddressLike {
  return (
    v && typeof v === 'object' && !Array.isArray(v) &&
    (v.calle || v.colonia || v.municipio || v.estado || v.cp)
  );
}

/** Formatea una dirección estructurada como una línea legible. */
export function formatAddress(a?: AddressLike | null): string {
  if (!isAddress(a)) return '';
  const l1 = [
    a!.calle,
    a!.no_ext ? `No. Ext ${a!.no_ext}` : '',
    a!.no_int ? `No. Int ${a!.no_int}` : '',
  ].filter(Boolean).join(' ');
  const l2 = [
    a!.colonia ? `Col. ${a!.colonia}` : '',
    a!.municipio,
    a!.estado,
    a!.cp ? `C.P. ${a!.cp}` : '',
  ].filter(Boolean).join(', ');
  return [l1, l2].filter(Boolean).join(', ');
}

// Claves de dirección candidatas en los datos de una entidad, en orden de
// preferencia (la ubicación del predio/instalación antes que el domicilio).
const ADDRESS_KEYS = [
  'ubicacion_predio',
  'ubicacion_instalacion',
  'ubicacion_proyecto',
  'domicilio_solicitante',
  'domicilio',
  'domicilio_sustituto',
];

/** Devuelve la primera dirección estructurada presente en los datos de la entidad. */
export function pickEntityAddress(data?: Record<string, any> | null): AddressLike | null {
  if (!data || typeof data !== 'object') return null;
  for (const k of ADDRESS_KEYS) {
    if (isAddress(data[k])) return data[k] as AddressLike;
  }
  return null;
}

/** Subtítulo de dirección para una entidad (vacío si no tiene dirección). */
export function entityAddressSubtitle(data?: Record<string, any> | null): string {
  return formatAddress(pickEntityAddress(data));
}
