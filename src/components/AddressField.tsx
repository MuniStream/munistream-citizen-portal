import React, { useEffect, useState } from 'react';
import api from '../services/api';

/**
 * Domicilio estructurado con autocompletado por Código Postal.
 *
 * Desglosa la dirección en Calle, No. Ext, No. Int, Colonia, Municipio, Estado y
 * CP. Al escribir el CP consulta el catálogo geográfico (SEPOMEX, por defecto
 * `geografia_mx`) y autollena Municipio y Estado (readonly) y despliega las
 * colonias de ese CP en un menú; si la colonia no está en el catálogo, el usuario
 * la escribe con la opción "Otra".
 *
 * El valor es un objeto: { calle, no_ext, no_int, colonia, municipio, estado, cp }.
 */

export interface AddressValue {
  calle?: string;
  no_ext?: string;
  no_int?: string;
  colonia?: string;
  municipio?: string;
  estado?: string;
  cp?: string;
}

interface AddressFieldConfig {
  // Catálogo y columnas (configurables; por defecto el catálogo SEPOMEX cargado).
  catalog_id?: string;
  cp_column?: string;
  colonia_column?: string;
  municipio_column?: string;
  estado_column?: string;
}

interface AddressFieldProps {
  value?: AddressValue;
  onChange: (value: AddressValue) => void;
  disabled?: boolean;
  config?: AddressFieldConfig;
  // "Igual a …": cuando se define una etiqueta y un valor fuente, se muestra un
  // checkbox que copia esa dirección (p. ej. el domicilio del solicitante) y
  // bloquea la edición mientras esté marcado.
  sameAsLabel?: string;
  sameAsValue?: AddressValue;
}

const OTRA = '__otra__';

export const AddressField: React.FC<AddressFieldProps> = ({
  value,
  onChange,
  disabled,
  config,
  sameAsLabel,
  sameAsValue,
}) => {
  const catalogId = config?.catalog_id || 'geografia_mx';
  const cpCol = config?.cp_column || 'codigo_postal';
  const colCol = config?.colonia_column || 'localidad';
  const munCol = config?.municipio_column || 'municipio';
  const edoCol = config?.estado_column || 'estado';

  const v: AddressValue = value || {};
  const [coloniaOptions, setColoniaOptions] = useState<string[]>([]);
  const [manualColonia, setManualColonia] = useState(false);
  const [cpMsg, setCpMsg] = useState<string | null>(null);
  const [cpLoading, setCpLoading] = useState(false);
  // Último CP consultado, para no repetir la búsqueda en cada render/foco.
  const [lookedUpCp, setLookedUpCp] = useState<string>('');
  const [sameChecked, setSameChecked] = useState(false);

  const set = (patch: Partial<AddressValue>) => onChange({ ...v, ...patch });

  // "Igual a …": al marcar, copia la dirección fuente y bloquea la edición;
  // mientras esté marcado, se mantiene sincronizado con la fuente.
  useEffect(() => {
    if (sameChecked && sameAsValue) onChange({ ...sameAsValue });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sameChecked, JSON.stringify(sameAsValue || {})]);

  const locked = disabled || sameChecked;

  const lookupCp = async (rawCp: string) => {
    const cp = (rawCp || '').trim();
    if (cp.length < 4 || cp === lookedUpCp) return;
    setCpLoading(true);
    setCpMsg(null);
    try {
      // Colonias (localidades) del CP.
      const distinctParams = new URLSearchParams();
      distinctParams.append('column', colCol);
      distinctParams.append('filters', JSON.stringify({ [cpCol]: cp }));
      const distinctResp = await api.get(
        `/catalogs/${catalogId}/distinct?${distinctParams.toString()}`
      );
      const colonias: string[] = (distinctResp.data?.values || [])
        .map((x: any) => String(x))
        .filter(Boolean)
        .sort();

      // Municipio y Estado (únicos por CP): tomar la primera fila.
      const dataParams = new URLSearchParams();
      dataParams.append('filters', JSON.stringify({ [cpCol]: cp }));
      dataParams.append('page', '0');
      dataParams.append('page_size', '1');
      const dataResp = await api.get(
        `/catalogs/${catalogId}/data?${dataParams.toString()}`
      );
      const row = (dataResp.data?.data || [])[0];

      setLookedUpCp(cp);

      if (!row && colonias.length === 0) {
        // CP no encontrado: dejar Municipio/Estado/Colonia editables a mano.
        setColoniaOptions([]);
        setManualColonia(true);
        setCpMsg(`No se encontró el código postal ${cp}. Captúrelo manualmente.`);
        return;
      }

      setColoniaOptions(colonias);
      const patch: Partial<AddressValue> = {};
      if (row) {
        patch.municipio = row[munCol] != null ? String(row[munCol]) : v.municipio;
        patch.estado = row[edoCol] != null ? String(row[edoCol]) : v.estado;
      }
      // Si la colonia actual no está entre las opciones, no la forzamos.
      if (v.colonia && !colonias.includes(v.colonia)) {
        setManualColonia(true);
      } else {
        setManualColonia(false);
      }
      set(patch);
      setCpMsg(
        colonias.length
          ? `CP ${cp}: elija su colonia (${colonias.length} disponibles).`
          : `CP ${cp} encontrado.`
      );
    } catch (err) {
      console.error('Error consultando el código postal', err);
      setCpMsg('Error al consultar el código postal. Intente de nuevo.');
    } finally {
      setCpLoading(false);
    }
  };

  // Si el valor llega precargado con un CP (edición), poblar colonias una vez.
  useEffect(() => {
    if (v.cp && v.cp !== lookedUpCp) {
      lookupCp(v.cp);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.5rem 0.75rem',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    fontFamily: 'inherit',
    fontSize: '1em',
    boxSizing: 'border-box',
  };
  const roStyle: React.CSSProperties = { ...inputStyle, background: '#f1f5f9', color: '#334155' };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.85em', fontWeight: 600, marginBottom: 4, color: '#475569' };
  const cell = (label: string, node: React.ReactNode): React.ReactNode => (
    <div style={{ marginBottom: '0.75rem' }}>
      <span style={labelStyle}>{label}</span>
      {node}
    </div>
  );

  return (
    <div
      className="address-field"
      style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '1rem', background: '#fafafa' }}
    >
      {sameAsLabel && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem', cursor: disabled ? 'default' : 'pointer', color: '#334155' }}>
          <input
            type="checkbox"
            checked={sameChecked}
            disabled={disabled}
            onChange={(e) => setSameChecked(e.target.checked)}
          />
          <span>{sameAsLabel}</span>
        </label>
      )}
      {cell('Calle *', (
        <input style={inputStyle} value={v.calle || ''} disabled={locked}
          onChange={(e) => set({ calle: e.target.value })} />
      ))}
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <div style={{ flex: 1 }}>{cell('No. Ext *', (
          <input style={inputStyle} value={v.no_ext || ''} disabled={locked}
            onChange={(e) => set({ no_ext: e.target.value })} />
        ))}</div>
        <div style={{ flex: 1 }}>{cell('No. Int', (
          <input style={inputStyle} value={v.no_int || ''} disabled={locked}
            onChange={(e) => set({ no_int: e.target.value })} />
        ))}</div>
      </div>
      {cell('Código Postal *', (
        <div>
          <input
            style={inputStyle}
            value={v.cp || ''}
            disabled={locked}
            inputMode="numeric"
            maxLength={5}
            placeholder="5 dígitos"
            onChange={(e) => set({ cp: e.target.value.replace(/\D/g, '') })}
            onBlur={(e) => lookupCp(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); lookupCp((e.target as HTMLInputElement).value); } }}
          />
          {cpLoading && <small style={{ color: '#64748b' }}>Buscando…</small>}
          {cpMsg && !cpLoading && <small style={{ color: '#64748b' }}>{cpMsg}</small>}
        </div>
      ))}
      {cell('Colonia *', (
        manualColonia ? (
          <div>
            <input style={inputStyle} value={v.colonia || ''} disabled={locked}
              placeholder="Escriba su colonia"
              onChange={(e) => set({ colonia: e.target.value })} />
            {coloniaOptions.length > 0 && (
              <button type="button" disabled={locked}
                onClick={() => { setManualColonia(false); set({ colonia: '' }); }}
                style={{ marginTop: 4, background: 'none', border: 'none', color: '#9d2449', cursor: 'pointer', textDecoration: 'underline', padding: 0, fontSize: '0.85em' }}>
                Elegir de la lista
              </button>
            )}
          </div>
        ) : (
          <select
            style={inputStyle}
            value={coloniaOptions.includes(v.colonia || '') ? v.colonia : ''}
            disabled={disabled || coloniaOptions.length === 0}
            onChange={(e) => {
              if (e.target.value === OTRA) { setManualColonia(true); set({ colonia: '' }); }
              else set({ colonia: e.target.value });
            }}
          >
            <option value="">{coloniaOptions.length ? 'Seleccione su colonia' : 'Escriba primero el CP'}</option>
            {coloniaOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            {coloniaOptions.length > 0 && <option value={OTRA}>Otra (escribir)…</option>}
          </select>
        )
      ))}
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <div style={{ flex: 1 }}>{cell('Municipio *', (
          <input style={roStyle} value={v.municipio || ''}
            readOnly={!!v.municipio} disabled={locked}
            placeholder="Se llena con el CP"
            onChange={(e) => set({ municipio: e.target.value })} />
        ))}</div>
        <div style={{ flex: 1 }}>{cell('Estado *', (
          <input style={roStyle} value={v.estado || ''}
            readOnly={!!v.estado} disabled={locked}
            placeholder="Se llena con el CP"
            onChange={(e) => set({ estado: e.target.value })} />
        ))}</div>
      </div>
    </div>
  );
};

export default AddressField;
