import React, { useEffect, useRef, useState } from 'react';
import api from '../services/api';

/**
 * Autocompletado contra un catálogo (`/catalogs/{id}/data?search=`). El ciudadano
 * escribe y elige una fila; se guarda como texto la etiqueta compuesta por
 * `labelColumns` (p. ej. "Camarón — Litopenaeus vannamei"). Pensado para usarse
 * como campo dentro de una fila de arreglo (una especie por renglón).
 */
interface CatalogAutocompleteProps {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  catalogId: string;
  labelColumns?: string[];      // columnas que forman la etiqueta guardada
  placeholder?: string;
}

const formatRow = (row: Record<string, any>, cols: string[]): string => {
  const parts = cols.map((c) => (row[c] !== undefined && row[c] !== null ? String(row[c]).trim() : '')).filter(Boolean);
  if (parts.length === 0) return '';
  return parts.length > 1 ? `${parts[0]} — ${parts.slice(1).join(', ')}` : parts[0];
};

export const CatalogAutocomplete: React.FC<CatalogAutocompleteProps> = ({
  value,
  onChange,
  disabled,
  catalogId,
  labelColumns = ['nombre_comun', 'nombre_cientifico'],
  placeholder = 'Escriba para buscar…',
}) => {
  const [term, setTerm] = useState<string>(value || '');
  const [results, setResults] = useState<Record<string, any>[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const debounce = useRef<number | null>(null);

  useEffect(() => { setTerm(value || ''); }, [value]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const search = (q: string) => {
    if (debounce.current) window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(async () => {
      const query = q.trim();
      if (query.length < 2) { setResults([]); return; }
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('search', query);
        params.append('page', '0');
        params.append('page_size', '8');
        const resp = await api.get(`/catalogs/${catalogId}/data?${params.toString()}`);
        setResults(resp.data?.data || []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const inputStyle: React.CSSProperties = { width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.95rem' };

  return (
    <div ref={boxRef} style={{ position: 'relative' }}>
      <input
        style={inputStyle}
        value={term}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => { setTerm(e.target.value); onChange(e.target.value); search(e.target.value); }}
        onFocus={() => { if (results.length) setOpen(true); }}
        autoComplete="off"
      />
      {loading && <small style={{ color: '#64748b' }}>Buscando…</small>}
      {open && results.length > 0 && (
        <div style={{ position: 'absolute', zIndex: 20, top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6, marginTop: 2, maxHeight: 240, overflowY: 'auto', boxShadow: '0 6px 18px rgba(0,0,0,0.12)' }}>
          {results.map((row, i) => {
            const label = formatRow(row, labelColumns);
            return (
              <div
                key={i}
                onClick={() => { setTerm(label); onChange(label); setOpen(false); }}
                style={{ padding: '0.5rem 0.75rem', cursor: 'pointer', borderBottom: i < results.length - 1 ? '1px solid #f1f5f9' : 'none' }}
                onMouseDown={(e) => e.preventDefault()}
              >
                {label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CatalogAutocomplete;
