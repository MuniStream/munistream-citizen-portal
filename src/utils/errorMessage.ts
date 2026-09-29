/**
 * Convierte cualquier error de la API en un texto que se pueda pintar.
 *
 * El `detail` de FastAPI **no siempre es una cadena**: en un 422 de validación es
 * una lista de objetos (`[{loc, msg, type}, …]`), y un `HTTPException` puede
 * llevar un diccionario. Varios manejadores del portal hacían
 *
 *     setError(error.response?.data?.detail || error.message)
 *
 * sobre un estado declarado `string | null`, y luego lo pintaban como hijo de
 * React. Cuando el `detail` no era texto, React lanzaba el error #31 ("Objects
 * are not valid as a React child"), que **desmonta el árbol entero**: no es una
 * sección rota, es la pantalla en blanco.
 *
 * Que el patrón ya había mordido se nota en que un solo manejador —el de descarga
 * de PDF— traía un `typeof msg === 'string'` a mano mientras los demás no. Esto lo
 * centraliza para que no vuelva a quedar parchado a medias.
 */
export function mensajeDeError(error: any, respaldo: string): string {
  const detail = error?.response?.data?.detail;

  if (typeof detail === 'string' && detail.trim()) return detail;

  // 422 de FastAPI: lista de errores de validación, cada uno con su `msg`.
  if (Array.isArray(detail)) {
    const textos = detail
      .map((d) => (typeof d === 'string' ? d : d?.msg))
      .filter((m): m is string => typeof m === 'string' && !!m.trim());
    if (textos.length) return textos.join('. ');
  }

  if (detail && typeof detail === 'object') {
    const msg = (detail as any).msg ?? (detail as any).message;
    if (typeof msg === 'string' && msg.trim()) return msg;
  }

  if (typeof error?.message === 'string' && error.message.trim()) return error.message;

  return respaldo;
}
