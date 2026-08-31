import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polygon, Polyline, useMapEvents } from 'react-leaflet';
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

const ClickCapture: React.FC<{ onClick: (latlng: LatLng) => void; disabled?: boolean }> = ({ onClick, disabled }) => {
  useMapEvents({
    click(e) {
      if (disabled) return;
      onClick([e.latlng.lat, e.latlng.lng]);
    },
  });
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

  // Sincronizar si el valor externo cambia (p.ej. reset del formulario).
  useEffect(() => {
    const ext = pointsFromValue(value, mode);
    if (ext.length === 0 && points.length > 0 && (value === null || value === undefined)) {
      setPoints([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

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
