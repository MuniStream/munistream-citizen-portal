import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polygon, Polyline, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * Captura geográfica en un mapa (Leaflet + OpenStreetMap, sin API key).
 * - mode="point": el ciudadano hace clic para colocar un punto.
 * - mode="polygon": clic para agregar vértices; se cierra el polígono solo.
 * Emite GeoJSON por onChange:
 *   Point   -> { type: 'Point',   coordinates: [lng, lat] }
 *   Polygon -> { type: 'Polygon', coordinates: [[[lng,lat], ...cerrado]] }
 */

type LatLng = [number, number]; // [lat, lng]
type GeoValue = { type: 'Point' | 'Polygon'; coordinates: any } | null | undefined;

interface GeoFieldProps {
  value?: GeoValue;
  onChange: (value: GeoValue) => void;
  mode?: 'point' | 'polygon';
  center?: LatLng;
  zoom?: number;
  disabled?: boolean;
}

// Centro por defecto: México.
const DEFAULT_CENTER: LatLng = [23.6345, -102.5528];
const DEFAULT_ZOOM = 5;

function pointsFromValue(value: GeoValue, mode: 'point' | 'polygon'): LatLng[] {
  if (!value || !value.coordinates) return [];
  try {
    if (mode === 'point' && value.type === 'Point') {
      const [lng, lat] = value.coordinates;
      return [[lat, lng]];
    }
    if (mode === 'polygon' && value.type === 'Polygon') {
      const ring: number[][] = value.coordinates[0] || [];
      // Quitar el vértice de cierre (igual al primero) para editar.
      const pts = ring.map(([lng, lat]) => [lat, lng] as LatLng);
      if (pts.length > 1 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) {
        pts.pop();
      }
      return pts;
    }
  } catch {
    /* valor malformado: empezar vacío */
  }
  return [];
}

function toGeoJSON(points: LatLng[], mode: 'point' | 'polygon'): GeoValue {
  if (points.length === 0) return null;
  if (mode === 'point') {
    const [lat, lng] = points[0];
    return { type: 'Point', coordinates: [lng, lat] };
  }
  const ring = points.map(([lat, lng]) => [lng, lat]);
  if (points.length >= 3) ring.push(ring[0]); // cerrar el anillo
  return { type: 'Polygon', coordinates: [ring] };
}

// --- Importación de archivos geográficos (KML / shapefile .zip) -------------
// El parseo es 100% en el navegador; las librerías se cargan bajo demanda
// (dynamic import) para no engordar el bundle inicial.

function ringToLatLng(ring: number[][]): LatLng[] {
  const pts = ring.map(([lng, lat]) => [lat, lng] as LatLng);
  // Quitar el vértice de cierre (igual al primero) para editar.
  if (pts.length > 1 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) {
    pts.pop();
  }
  return pts;
}

function* iterGeometries(gj: any): Generator<any> {
  if (!gj) return;
  if (gj.type === 'FeatureCollection') { for (const f of gj.features || []) yield* iterGeometries(f); return; }
  if (gj.type === 'Feature') { yield* iterGeometries(gj.geometry); return; }
  if (gj.type === 'GeometryCollection') { for (const g of gj.geometries || []) yield* iterGeometries(g); return; }
  if (gj.type) yield gj;
}

// De un GeoJSON importado saca los puntos que corresponden al `mode` del campo:
// polígono -> anillo exterior del primer Polygon/MultiPolygon; punto -> primer
// Point/MultiPoint (o el primer vértice de un polígono como último recurso).
function pointsFromImported(gj: any, mode: 'point' | 'polygon'): LatLng[] {
  const geoms = [...iterGeometries(gj)];
  if (mode === 'polygon') {
    const poly = geoms.find((g) => g.type === 'Polygon') || geoms.find((g) => g.type === 'MultiPolygon');
    if (poly?.type === 'Polygon') return ringToLatLng(poly.coordinates?.[0] || []);
    if (poly?.type === 'MultiPolygon') return ringToLatLng(poly.coordinates?.[0]?.[0] || []);
    return [];
  }
  const pt = geoms.find((g) => g.type === 'Point') || geoms.find((g) => g.type === 'MultiPoint');
  if (pt?.type === 'Point') { const [lng, lat] = pt.coordinates; return [[lat, lng]]; }
  if (pt?.type === 'MultiPoint') { const [lng, lat] = pt.coordinates?.[0] || []; return lng != null ? [[lat, lng]] : []; }
  const poly = geoms.find((g) => g.type === 'Polygon');
  if (poly) { const [lng, lat] = poly.coordinates?.[0]?.[0] || []; return lng != null ? [[lat, lng]] : []; }
  return [];
}

async function parseGeoFile(file: File): Promise<any> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.kml')) {
    const text = await file.text();
    const dom = new DOMParser().parseFromString(text, 'text/xml');
    const { kml } = await import('@tmcw/togeojson');
    return kml(dom);
  }
  if (name.endsWith('.zip') || name.endsWith('.shp')) {
    const buf = await file.arrayBuffer();
    const shp = (await import('shpjs')).default;
    return await shp(buf);
  }
  throw new Error('Formato no soportado. Suba un archivo .kml o un shapefile comprimido .zip.');
}

// Recentra/ajusta el mapa cuando cambia `signal` (p. ej. tras importar un archivo),
// sin recentrar en cada clic manual.
const FitBounds: React.FC<{ points: LatLng[]; signal: number }> = ({ points, signal }) => {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    try {
      if (points.length === 1) map.setView(points[0], 15);
      else map.fitBounds(points as any, { padding: [20, 20] });
    } catch { /* contenedor aún sin tamaño */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signal]);
  return null;
};

const ClickCapture: React.FC<{ onClick: (latlng: LatLng) => void; disabled?: boolean }> = ({ onClick, disabled }) => {
  useMapEvents({
    click(e) {
      if (disabled) return;
      onClick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
};

/**
 * El mapa suele montarse dentro de un paso del formulario que estaba oculto o
 * con tamaño 0 (formularios multi-paso). Sin invalidar el tamaño, Leaflet pinta
 * tiles grises o el contenedor en blanco ("no hay mapa"). Se invalida al montar,
 * unos milisegundos después, y ante cualquier cambio de tamaño del contenedor.
 */
const ResizeInvalidate: React.FC = () => {
  const map = useMap();
  useEffect(() => {
    const invalidate = () => { try { map.invalidateSize(); } catch { /* aún desmontado */ } };
    const timers = [0, 150, 400, 900].map((ms) => setTimeout(invalidate, ms));
    const container = map.getContainer();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(invalidate) : null;
    if (ro && container) ro.observe(container);
    window.addEventListener('resize', invalidate);
    return () => {
      timers.forEach(clearTimeout);
      if (ro) ro.disconnect();
      window.removeEventListener('resize', invalidate);
    };
  }, [map]);
  return null;
};

export const GeoField: React.FC<GeoFieldProps> = ({
  value,
  onChange,
  mode = 'point',
  center,
  zoom,
  disabled = false,
}) => {
  const [points, setPoints] = useState<LatLng[]>(() => pointsFromValue(value, mode));
  // Entrada manual de coordenadas (para quien ya tiene lat/long exactas y no
  // quiere navegar el mapa).
  const [latInput, setLatInput] = useState<string>('');
  const [lngInput, setLngInput] = useState<string>('');
  // Importación de KML/SHP: mensaje de estado y señal para recentrar el mapa.
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [fitSignal, setFitSignal] = useState<number>(0);

  // Sincronizar si el valor externo cambia (p.ej. reset del formulario).
  useEffect(() => {
    const ext = pointsFromValue(value, mode);
    if (ext.length === 0 && points.length > 0 && (value === null || value === undefined)) {
      setPoints([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // En modo punto, reflejar en los inputs el punto colocado en el mapa.
  useEffect(() => {
    if (mode === 'point' && points.length) {
      setLatInput(points[0][0].toFixed(6));
      setLngInput(points[0][1].toFixed(6));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, mode]);

  const parseCoords = (): LatLng | null => {
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);
    if (
      Number.isFinite(lat) && Number.isFinite(lng) &&
      lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
    ) return [lat, lng];
    return null;
  };

  const emit = (pts: LatLng[]) => {
    setPoints(pts);
    onChange(toGeoJSON(pts, mode));
  };

  const handleClick = (latlng: LatLng) => {
    if (mode === 'point') {
      emit([latlng]);
    } else {
      emit([...points, latlng]);
    }
  };

  const undo = () => emit(points.slice(0, -1));
  const clear = () => emit([]);

  const handleImport = async (file?: File | null) => {
    if (!file) return;
    setImportMsg('Importando archivo…');
    try {
      const gj = await parseGeoFile(file);
      const pts = pointsFromImported(gj, mode);
      if (!pts.length) {
        setImportMsg(`El archivo no contiene un ${mode === 'polygon' ? 'polígono' : 'punto'} válido.`);
        return;
      }
      emit(pts);
      setFitSignal((s) => s + 1);
      setImportMsg(`Importado de ${file.name}: ${pts.length} ${mode === 'polygon' ? 'vértice(s)' : 'punto'}.`);
    } catch (e: any) {
      setImportMsg(e?.message || 'No se pudo leer el archivo.');
    }
  };

  const initialCenter = center || (points.length > 0 ? points[0] : DEFAULT_CENTER);
  const initialZoom = zoom || (points.length > 0 ? 13 : DEFAULT_ZOOM);

  return (
    <div className="geo-field">
      <div style={{ height: 320, width: '100%', borderRadius: 6, overflow: 'hidden', border: '1px solid #ccc' }}>
        <MapContainer center={initialCenter} zoom={initialZoom} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickCapture onClick={handleClick} disabled={disabled} />
          <ResizeInvalidate />
          <FitBounds points={points} signal={fitSignal} />
          {points.map((p, i) => (
            <CircleMarker key={i} center={p} radius={6} pathOptions={{ color: '#9b1c31', fillColor: '#9b1c31', fillOpacity: 0.9 }} />
          ))}
          {mode === 'polygon' && points.length >= 2 && points.length < 3 && (
            <Polyline positions={points} pathOptions={{ color: '#9b1c31' }} />
          )}
          {mode === 'polygon' && points.length >= 3 && (
            <Polygon positions={points} pathOptions={{ color: '#9b1c31', fillOpacity: 0.2 }} />
          )}
        </MapContainer>
      </div>

      {!disabled && (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#555' }}>Latitud</label>
            <input
              type="number" step="any" inputMode="decimal" placeholder="19.4326"
              value={latInput}
              onChange={(e) => setLatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const ll = parseCoords(); if (ll) emit(mode === 'point' ? [ll] : [...points, ll]); } }}
              style={{ width: 130, padding: '4px 6px', border: '1px solid #cbd5e1', borderRadius: 4 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#555' }}>Longitud</label>
            <input
              type="number" step="any" inputMode="decimal" placeholder="-99.1332"
              value={lngInput}
              onChange={(e) => setLngInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const ll = parseCoords(); if (ll) emit(mode === 'point' ? [ll] : [...points, ll]); } }}
              style={{ width: 130, padding: '4px 6px', border: '1px solid #cbd5e1', borderRadius: 4 }}
            />
          </div>
          <button
            type="button" className="btn-secondary" style={{ padding: '5px 10px' }}
            onClick={() => { const ll = parseCoords(); if (ll) emit(mode === 'point' ? [ll] : [...points, ll]); }}
          >
            {mode === 'point' ? 'Colocar en el mapa' : 'Agregar vértice'}
          </button>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#555' }}>Importar KML / SHP</label>
            <input
              type="file"
              accept=".kml,.zip,.shp"
              onChange={(e) => { handleImport(e.target.files?.[0]); e.currentTarget.value = ''; }}
              disabled={disabled}
              style={{ fontSize: '0.85rem' }}
            />
          </div>
        </div>
      )}

      {importMsg && (
        <div style={{ fontSize: '0.8rem', color: '#555', marginTop: 6 }}>{importMsg}</div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.85rem', color: '#555' }}>
          {mode === 'point'
            ? (points.length ? `Punto: ${points[0][0].toFixed(6)}, ${points[0][1].toFixed(6)}` : 'Haga clic en el mapa para colocar el punto.')
            : (points.length
                ? `Polígono: ${points.length} vértice(s)${points.length < 3 ? ' (agregue al menos 3)' : ''}`
                : 'Haga clic en el mapa para dibujar el polígono (mínimo 3 puntos).')}
        </span>
        {!disabled && mode === 'polygon' && points.length > 0 && (
          <button type="button" className="btn-secondary" onClick={undo} style={{ padding: '2px 10px' }}>Deshacer punto</button>
        )}
        {!disabled && points.length > 0 && (
          <button type="button" className="btn-secondary" onClick={clear} style={{ padding: '2px 10px' }}>Limpiar</button>
        )}
      </div>
    </div>
  );
};

export default GeoField;
