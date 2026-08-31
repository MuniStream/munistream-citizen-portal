import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

// Exact Match Form Component
interface ExactMatchFormProps {
  catalog_config: CatalogConfig;
  onSubmit: (data: { selected_items: any[] }) => void;
  onCancel?: () => void;
}

const ExactMatchForm: React.FC<ExactMatchFormProps> = ({
  catalog_config,
  onSubmit,
  onCancel
}) => {
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const handleInputChange = (columnName: string, value: string) => {
    setInputValues(prev => ({
      ...prev,
      [columnName]: value
    }));
    // Clear validation errors when user types
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsValidating(true);
    setValidationErrors([]);

    try {
      // Validate that all required fields are filled
      const exactMatchColumns = catalog_config.exact_match_columns || [];
      const missingFields = exactMatchColumns.filter(col => !inputValues[col]?.trim());

      if (missingFields.length > 0) {
        setValidationErrors([`Por favor complete: ${missingFields.join(', ')}`]);
        return;
      }

      // Build query filters for exact match
      const filters = { ...catalog_config.default_filters };
      exactMatchColumns.forEach(col => {
        filters[col] = inputValues[col].trim();
      });

      // Query the catalog to find exact match
      const params = new URLSearchParams();
      params.append('filters', JSON.stringify(filters));
      params.append('page', '0');
      params.append('page_size', '1');

      const response = await api.get(
        `/catalogs/${catalog_config.catalog_id}/data?${params.toString()}`
      );

      if (response.data.data && response.data.data.length > 0) {
        // Found exact match
        const matchedItem = response.data.data[0];
        // For single mode, send the item directly, not as array
        onSubmit({
          selected_items: catalog_config.selection_mode === 'single' ? matchedItem : [matchedItem]
        });
      } else {
        // No match found
        setValidationErrors(['No se encontró ningún registro con los datos ingresados. Verifique la información.']);
      }
    } catch (error: any) {
      console.error('Error validating exact match:', error);
      setValidationErrors(['Error al validar los datos. Intente nuevamente.']);
    } finally {
      setIsValidating(false);
    }
  };

  const getColumnDisplayName = (columnName: string): string => {
    return columnName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '500px' }}>
      {validationErrors.length > 0 && (
        <div style={{
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          color: '#721c24',
          padding: '0.75rem',
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          {validationErrors.map((error, index) => (
            <div key={index}>{error}</div>
          ))}
        </div>
      )}

      {(catalog_config.exact_match_columns || []).map((columnName) => (
        <div key={columnName} style={{ marginBottom: '1rem' }}>
          <label
            htmlFor={columnName}
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: 'bold',
              color: '#333'
            }}
          >
            {getColumnDisplayName(columnName)}
            <span style={{ color: '#dc3545', marginLeft: '4px' }}>*</span>
          </label>
          <input
            id={columnName}
            type="text"
            value={inputValues[columnName] || ''}
            onChange={(e) => handleInputChange(columnName, e.target.value)}
            placeholder={`Ingrese ${getColumnDisplayName(columnName).toLowerCase()}`}
            disabled={isValidating}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '2px solid #ddd',
              borderRadius: '4px',
              fontSize: '1rem',
              outline: 'none',
              transition: 'border-color 0.2s',
              backgroundColor: isValidating ? '#f8f9fa' : 'white'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#007bff';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#ddd';
            }}
          />
        </div>
      ))}

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '1.5rem',
        paddingTop: '1rem',
        borderTop: '1px solid #ddd'
      }}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isValidating}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isValidating ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              opacity: isValidating ? 0.6 : 1
            }}
          >
            Cancelar
          </button>
        )}

        <button
          type="submit"
          disabled={isValidating}
          style={{
            padding: '0.75rem 2rem',
            backgroundColor: isValidating ? '#6c757d' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isValidating ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          {isValidating ? (
            <>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid transparent',
                borderTop: '2px solid white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              Verificando...
            </>
          ) : (
            'Verificar y Continuar'
          )}
        </button>
      </div>
    </form>
  );
};

export interface CatalogColumn {
  name: string;
  type: string;
  searchable?: boolean;
  filterable?: boolean;
  displayName?: string;
}

export interface CatalogConfig {
  catalog_id: string;
  catalog_name?: string;
  selection_mode: 'single' | 'multiple';
  interface_mode?: 'table' | 'exact_match' | 'hierarchical';
  min_selections: number;
  max_selections: number;
  display_columns: string[];
  exact_match_columns?: string[];
  search_enabled: boolean;
  filters_enabled: boolean;
  sorting_enabled: boolean;
  pagination_enabled: boolean;
  page_size: number;
  default_filters?: Record<string, any>;
  hierarchical_columns?: string[];
  postal_code_column?: string;
}

export interface CatalogSelectorProps {
  title: string;
  description: string;
  catalog_config: CatalogConfig;
  validation_errors?: string[];
  previous_input?: {
    selected_items: any[];
  };
  onSubmit: (data: { selected_items: any[] }) => void;
  onCancel?: () => void;
}

interface CatalogData {
  data: any[];
  total_count: number;
  page: number;
  page_size: number;
  visible_columns: string[];
}

interface CatalogSchema {
  catalog_id: string;
  schema: CatalogColumn[];
  searchable_columns: string[];
  filterable_columns: string[];
}

// ---------------------------------------------------------------------------
// Selección jerárquica en cascada (p. ej. Estado -> Municipio -> Localidad)
// con búsqueda opcional por código postal. Cada nivel consulta los valores
// distintos filtrados por los niveles superiores (endpoint /distinct), por lo
// que no descarga todo el catálogo.
// ---------------------------------------------------------------------------
interface HierarchicalCatalogFormProps {
  title: string;
  description: string;
  catalog_config: CatalogConfig;
  validation_errors?: string[];
  onSubmit: (data: { selected_items: any[] }) => void;
}

const humanizeCol = (c: string): string =>
  c.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

const HierarchicalCatalogForm: React.FC<HierarchicalCatalogFormProps> = ({
  title,
  description,
  catalog_config,
  validation_errors = [],
  onSubmit,
}) => {
  const levels = catalog_config.hierarchical_columns || [];
  const cpColumn = catalog_config.postal_code_column;
  const baseFilters = catalog_config.default_filters || {};

  const [selected, setSelected] = useState<Record<string, string>>({});
  const [options, setOptions] = useState<Record<number, string[]>>({});
  const [loadingLevel, setLoadingLevel] = useState<number | null>(null);
  const [cp, setCp] = useState('');
  const [cpMsg, setCpMsg] = useState<string | null>(null);
  const [cpSearching, setCpSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const filtersUpTo = useCallback(
    (levelIndex: number, override?: Record<string, string>): Record<string, any> => {
      const src = override || selected;
      const f: Record<string, any> = { ...baseFilters };
      for (let i = 0; i < levelIndex; i++) {
        const col = levels[i];
        if (src[col]) f[col] = src[col];
      }
      return f;
    },
    [selected, levels, baseFilters]
  );

  const fetchLevel = useCallback(
    async (levelIndex: number, override?: Record<string, string>) => {
      if (levelIndex >= levels.length) return;
      const column = levels[levelIndex];
      setLoadingLevel(levelIndex);
      try {
        const params = new URLSearchParams();
        params.append('column', column);
        const f = filtersUpTo(levelIndex, override);
        if (Object.keys(f).length > 0) params.append('filters', JSON.stringify(f));
        const resp = await api.get(
          `/catalogs/${catalog_config.catalog_id}/distinct?${params.toString()}`
        );
        setOptions((prev) => ({ ...prev, [levelIndex]: resp.data.values || [] }));
      } catch (err) {
        console.error('Error fetching hierarchical level', column, err);
        setOptions((prev) => ({ ...prev, [levelIndex]: [] }));
      } finally {
        setLoadingLevel(null);
      }
    },
    [levels, filtersUpTo, catalog_config.catalog_id]
  );

  // Cargar el primer nivel al montar.
  useEffect(() => {
    if (levels.length > 0) fetchLevel(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog_config.catalog_id]);

  const handleSelectLevel = (levelIndex: number, value: string) => {
    setLocalError(null);
    setCpMsg(null);
    // Fijar este nivel y limpiar los inferiores.
    const next: Record<string, string> = {};
    for (let i = 0; i < levelIndex; i++) next[levels[i]] = selected[levels[i]];
    if (value) next[levels[levelIndex]] = value;
    setSelected(next);
    setOptions((prev) => {
      const copy = { ...prev };
      for (let i = levelIndex + 1; i < levels.length; i++) delete copy[i];
      return copy;
    });
    if (value && levelIndex + 1 < levels.length) fetchLevel(levelIndex + 1, next);
  };

  const handleCpSearch = async () => {
    const term = cp.trim();
    if (!term || !cpColumn) return;
    setCpSearching(true);
    setCpMsg(null);
    setLocalError(null);
    try {
      const params = new URLSearchParams();
      params.append('filters', JSON.stringify({ ...baseFilters, [cpColumn]: term }));
      params.append('page', '0');
      params.append('page_size', '1');
      const resp = await api.get(
        `/catalogs/${catalog_config.catalog_id}/data?${params.toString()}`
      );
      const rows = resp.data?.data || [];
      if (rows.length === 0) {
        setCpMsg(`No se encontró el código postal ${term}.`);
        return;
      }
      const row = rows[0];
      // Rellenar la cascada desde la fila encontrada.
      const next: Record<string, string> = {};
      levels.forEach((col) => {
        if (row[col] !== undefined && row[col] !== null) next[col] = String(row[col]);
      });
      setSelected(next);
      // Poblar las opciones de cada nivel para que los selects muestren el valor.
      for (let i = 0; i < levels.length; i++) {
        await fetchLevel(i, next);
      }
      setCpMsg(
        `Código postal ${term}: ${levels.map((c) => next[c]).filter(Boolean).join(', ')}`
      );
    } catch (err) {
      console.error('Error buscando código postal', err);
      setCpMsg('Error al buscar el código postal. Intente de nuevo.');
    } finally {
      setCpSearching(false);
    }
  };

  const allSelected = levels.length > 0 && levels.every((c) => !!selected[c]);

  const handleSubmit = async () => {
    if (!allSelected) {
      setLocalError('Seleccione todos los niveles para continuar.');
      return;
    }
    setSubmitting(true);
    setLocalError(null);
    try {
      const params = new URLSearchParams();
      params.append('filters', JSON.stringify(filtersUpTo(levels.length)));
      params.append('page', '0');
      params.append('page_size', '1');
      const resp = await api.get(
        `/catalogs/${catalog_config.catalog_id}/data?${params.toString()}`
      );
      const rows = resp.data?.data || [];
      const row = rows.length > 0 ? rows[0] : { ...selected };
      onSubmit({
        selected_items: catalog_config.selection_mode === 'single' ? row : [row],
      });
    } catch (err) {
      console.error('Error al enviar selección jerárquica', err);
      setLocalError('No se pudo confirmar la selección. Intente de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', marginBottom: '0.4rem', fontWeight: 600, color: '#333',
  };
  const controlStyle: React.CSSProperties = {
    width: '100%', maxWidth: 500, padding: '0.6rem', borderRadius: 4,
    border: '1px solid #ccc', fontSize: '1rem', background: '#fff',
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h3 style={{ marginBottom: '0.5rem' }}>{title}</h3>
      <p style={{ color: '#666', marginBottom: '1rem' }}>{description}</p>

      {(validation_errors.length > 0 || localError) && (
        <div style={{
          backgroundColor: '#f8d7da', border: '1px solid #f5c6cb', color: '#721c24',
          padding: '0.75rem', borderRadius: 4, marginBottom: '1rem',
        }}>
          {validation_errors.map((e, i) => <div key={i}>{e}</div>)}
          {localError && <div>{localError}</div>}
        </div>
      )}

      {cpColumn && (
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>Buscar por código postal</label>
          <div style={{ display: 'flex', gap: '0.5rem', maxWidth: 500 }}>
            <input
              type="text"
              value={cp}
              inputMode="numeric"
              placeholder="Ej. 80000"
              onChange={(e) => setCp(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCpSearch(); } }}
              style={{ ...controlStyle, flex: 1 }}
            />
            <button
              type="button"
              onClick={handleCpSearch}
              disabled={cpSearching || !cp.trim()}
              style={{
                padding: '0.6rem 1rem', borderRadius: 4, border: 'none',
                background: '#9d2449', color: '#fff', cursor: 'pointer', fontWeight: 600,
              }}
            >
              {cpSearching ? 'Buscando…' : 'Buscar'}
            </button>
          </div>
          {cpMsg && <div style={{ marginTop: '0.4rem', color: '#555' }}>{cpMsg}</div>}
          <div style={{ marginTop: '0.75rem', color: '#999', fontSize: '0.85rem' }}>
            o seleccione manualmente:
          </div>
        </div>
      )}

      {levels.map((col, i) => {
        const enabled = i === 0 || !!selected[levels[i - 1]];
        const opts = options[i] || [];
        return (
          <div key={col} style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>
              {humanizeCol(col)}<span style={{ color: '#dc3545', marginLeft: 4 }}>*</span>
            </label>
            <select
              value={selected[col] || ''}
              disabled={!enabled || loadingLevel === i}
              onChange={(e) => handleSelectLevel(i, e.target.value)}
              style={{ ...controlStyle, opacity: enabled ? 1 : 0.6 }}
            >
              <option value="">
                {loadingLevel === i ? 'Cargando…' : `Seleccione ${humanizeCol(col).toLowerCase()}…`}
              </option>
              {opts.map((v) => (
                <option key={String(v)} value={String(v)}>{String(v)}</option>
              ))}
            </select>
          </div>
        );
      })}

      <div style={{ marginTop: '1.5rem' }}>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!allSelected || submitting}
          style={{
            padding: '0.7rem 1.5rem', borderRadius: 4, border: 'none',
            background: allSelected ? '#9d2449' : '#ccc',
            color: '#fff', cursor: allSelected ? 'pointer' : 'not-allowed', fontWeight: 600,
          }}
        >
          {submitting ? 'Enviando…' : 'Continuar'}
        </button>
      </div>
    </div>
  );
};

export const CatalogSelector: React.FC<CatalogSelectorProps> = ({
  title,
  description,
  catalog_config,
  validation_errors = [],
  previous_input,
  onSubmit,
  onCancel
}) => {
  const [catalogData, setCatalogData] = useState<CatalogData | null>(null);
  const [catalogSchema, setCatalogSchema] = useState<CatalogSchema | null>(null);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDesc, setSortDesc] = useState(false);
  const [filters] = useState<Record<string, any>>(catalog_config?.default_filters || {});

  // Initialize selected items from previous input
  useEffect(() => {
    if (previous_input?.selected_items) {
      setSelectedItems(previous_input.selected_items);
    }
  }, [previous_input]);

  // Fetch catalog schema on mount
  useEffect(() => {
    if (!catalog_config?.catalog_id) return;

    const fetchSchema = async () => {
      try {
        const response = await api.get(`/catalogs/${catalog_config.catalog_id}/schema`);
        setCatalogSchema(response.data);
      } catch (err: any) {
        console.error('Error fetching catalog schema:', err);
        setError('Failed to load catalog schema');
      }
    };

    fetchSchema();
  }, [catalog_config?.catalog_id]);

  // Fetch catalog data
  const fetchData = useCallback(async () => {
    if (!catalog_config?.catalog_id) return;
    // Don't fetch data for exact match mode - only fetch on user submission
    if (catalog_config.interface_mode === 'exact_match') return;
    // Hierarchical mode carga sus niveles bajo demanda (endpoint /distinct),
    // no descarga todo el catálogo.
    if (catalog_config.interface_mode === 'hierarchical') return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      if (searchQuery && catalog_config.search_enabled) {
        params.append('search', searchQuery);
      }

      if (Object.keys(filters).length > 0 && catalog_config.filters_enabled) {
        params.append('filters', JSON.stringify(filters));
      }

      if (sortBy && catalog_config.sorting_enabled) {
        params.append('sort_by', sortBy);
        params.append('sort_desc', sortDesc.toString());
      }

      if (catalog_config.pagination_enabled) {
        params.append('page', currentPage.toString());
        params.append('page_size', catalog_config.page_size.toString());
      }

      const response = await api.get(
        `/catalogs/${catalog_config.catalog_id}/data?${params.toString()}`
      );

      setCatalogData(response.data);
    } catch (err: any) {
      console.error('Error fetching catalog data:', err);
      setError(err.response?.data?.detail || 'Failed to load catalog data');
    } finally {
      setLoading(false);
    }
  }, [
    catalog_config?.catalog_id,
    catalog_config?.search_enabled,
    catalog_config?.filters_enabled,
    catalog_config?.sorting_enabled,
    catalog_config?.pagination_enabled,
    catalog_config?.page_size,
    searchQuery,
    filters,
    sortBy,
    sortDesc,
    currentPage
  ]);

  // Cargar los datos del catálogo al montar y cada vez que cambian la búsqueda,
  // el orden o la página. Sin esto el selector se quedaba en "Cargando catálogo…"
  // (fetchData estaba definido pero nunca se invocaba en un efecto).
  useEffect(() => {
    fetchData();
  }, [fetchData]);


  // Early return if no catalog config
  if (!catalog_config) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ color: '#dc3545', fontSize: '1.2rem', marginBottom: '1rem' }}>
          Error de configuración
        </div>
        <div style={{ color: '#666' }}>La configuración del catálogo no está disponible</div>
      </div>
    );
  }

  // Render selección jerárquica en cascada (Estado -> Municipio -> Localidad)
  if (catalog_config.interface_mode === 'hierarchical') {
    return (
      <HierarchicalCatalogForm
        title={title}
        description={description}
        catalog_config={catalog_config}
        validation_errors={validation_errors}
        onSubmit={onSubmit}
      />
    );
  }

  // Render exact match interface for direct input
  if (catalog_config.interface_mode === 'exact_match') {
    return (
      <div style={{ padding: '1rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>{title}</h3>
          <p style={{ color: '#666', marginBottom: '1rem' }}>{description}</p>

          {validation_errors && validation_errors.length > 0 && (
            <div style={{
              backgroundColor: '#f8d7da',
              border: '1px solid #f5c6cb',
              color: '#721c24',
              padding: '0.75rem',
              borderRadius: '4px',
              marginBottom: '1rem'
            }}>
              {validation_errors.map((error, index) => (
                <div key={index}>{error}</div>
              ))}
            </div>
          )}
        </div>

        <ExactMatchForm
          catalog_config={catalog_config}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      </div>
    );
  }

  const handleItemSelect = (item: any) => {
    if (catalog_config.selection_mode === 'single') {
      // Single selection mode
      const isSelected = selectedItems.some(selected =>
        JSON.stringify(selected) === JSON.stringify(item)
      );

      if (isSelected) {
        setSelectedItems([]);
      } else {
        setSelectedItems([item]);
      }
    } else {
      // Multiple selection mode
      const isSelected = selectedItems.some(selected =>
        JSON.stringify(selected) === JSON.stringify(item)
      );

      if (isSelected) {
        setSelectedItems(prev => prev.filter(selected =>
          JSON.stringify(selected) !== JSON.stringify(item)
        ));
      } else {
        if (selectedItems.length < catalog_config.max_selections) {
          setSelectedItems(prev => [...prev, item]);
        }
      }
    }
  };

  const handleSubmit = () => {
    onSubmit({
      selected_items: selectedItems
    });
  };

  const isItemSelected = (item: any) => {
    return selectedItems.some(selected =>
      JSON.stringify(selected) === JSON.stringify(item)
    );
  };

  const canSelectMore = () => {
    if (!catalog_config || !selectedItems) return false;
    return catalog_config.selection_mode === 'multiple' &&
           selectedItems.length < catalog_config.max_selections;
  };

  const isValidSelection = () => {
    if (!selectedItems || !catalog_config) return false;
    return selectedItems.length >= catalog_config.min_selections &&
           selectedItems.length <= catalog_config.max_selections;
  };

  const getColumnDisplayName = (columnName: string): string => {
    if (!catalogSchema) return columnName;

    const column = catalogSchema.schema.find(col => col.name === columnName);
    return column?.displayName || columnName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleSort = (columnName: string) => {
    if (!catalog_config.sorting_enabled) return;

    if (sortBy === columnName) {
      setSortDesc(!sortDesc);
    } else {
      setSortBy(columnName);
      setSortDesc(false);
    }
  };

  const renderTableHeader = () => {
    if (!catalog_config?.display_columns || catalog_config.display_columns.length === 0) {
      return null;
    }

    return (
      <thead>
        <tr>
          <th style={{ width: '50px', textAlign: 'center' }}>
            {catalog_config.selection_mode === 'multiple' ? '☐' : '○'}
          </th>
          {(catalog_config.display_columns || []).map(columnName => (
            <th
              key={columnName}
              onClick={() => handleSort(columnName)}
              style={{
                cursor: catalog_config.sorting_enabled ? 'pointer' : 'default',
                userSelect: 'none',
                position: 'relative'
              }}
            >
              {getColumnDisplayName(columnName)}
              {catalog_config.sorting_enabled && sortBy === columnName && (
                <span style={{ marginLeft: '5px' }}>
                  {sortDesc ? '▼' : '▲'}
                </span>
              )}
            </th>
          ))}
        </tr>
      </thead>
    );
  };

  const renderTableBody = () => {
    if (!catalogData || !catalogData.data || catalogData.data.length === 0) {
      return (
        <tbody>
          <tr>
            <td colSpan={(catalog_config?.display_columns?.length || 0) + 1} style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ color: '#666' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
                <div>No hay datos disponibles</div>
                {searchQuery && (
                  <div style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                    Intenta modificar tu búsqueda: "{searchQuery}"
                  </div>
                )}
              </div>
            </td>
          </tr>
        </tbody>
      );
    }

    return (
      <tbody>
        {catalogData.data.map((item, index) => {
          const isSelected = isItemSelected(item);
          const canSelect = canSelectMore() || isSelected || catalog_config.selection_mode === 'single';

          return (
            <tr
              key={index}
              onClick={() => canSelect && handleItemSelect(item)}
              style={{
                cursor: canSelect ? 'pointer' : 'not-allowed',
                backgroundColor: isSelected ? '#e3f2fd' : 'transparent',
                opacity: canSelect ? 1 : 0.6
              }}
              className="catalog-row"
            >
              <td style={{ textAlign: 'center' }}>
                <input
                  type={catalog_config.selection_mode === 'single' ? 'radio' : 'checkbox'}
                  checked={isSelected}
                  onChange={() => {}} // Handled by row click
                  style={{ pointerEvents: 'none' }}
                />
              </td>
              {(catalog_config.display_columns || []).map(columnName => (
                <td key={columnName}>
                  {item[columnName] !== undefined && item[columnName] !== null
                    ? String(item[columnName])
                    : '-'
                  }
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    );
  };

  const renderPagination = () => {
    if (!catalog_config.pagination_enabled || !catalogData || catalogData.total_count <= catalog_config.page_size) {
      return null;
    }

    const totalPages = Math.ceil(catalogData.total_count / catalog_config.page_size);
    const pages = [];

    for (let i = 0; i < totalPages; i++) {
      pages.push(i);
    }

    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '0.5rem',
        marginTop: '1rem',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
          disabled={currentPage === 0}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid #ddd',
            backgroundColor: currentPage === 0 ? '#f8f9fa' : 'white',
            cursor: currentPage === 0 ? 'not-allowed' : 'pointer'
          }}
        >
          ← Anterior
        </button>

        <span style={{ margin: '0 1rem', color: '#666' }}>
          Página {currentPage + 1} de {totalPages}
        </span>

        <button
          onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
          disabled={currentPage >= totalPages - 1}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid #ddd',
            backgroundColor: currentPage >= totalPages - 1 ? '#f8f9fa' : 'white',
            cursor: currentPage >= totalPages - 1 ? 'not-allowed' : 'pointer'
          }}
        >
          Siguiente →
        </button>
      </div>
    );
  };

  if (loading && !catalogData) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Cargando catálogo...</div>
        <div style={{ color: '#666' }}>Por favor espera mientras obtenemos los datos</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ color: '#dc3545', fontSize: '1.2rem', marginBottom: '1rem' }}>
          Error al cargar el catálogo
        </div>
        <div style={{ color: '#666', marginBottom: '1rem' }}>{error}</div>
        <button
          onClick={fetchData}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>{title}</h3>
        <p style={{ color: '#666', marginBottom: '1rem' }}>{description}</p>

        {validation_errors && validation_errors.length > 0 && (
          <div style={{
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c6cb',
            color: '#721c24',
            padding: '0.75rem',
            borderRadius: '4px',
            marginBottom: '1rem'
          }}>
            {validation_errors.map((error, index) => (
              <div key={index}>{error}</div>
            ))}
          </div>
        )}
      </div>

      {/* Search */}
      {catalog_config.search_enabled && catalogSchema && catalogSchema.searchable_columns && catalogSchema.searchable_columns.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <input
            type="text"
            placeholder={`Buscar en ${catalogSchema.searchable_columns.join(', ')}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '1rem'
            }}
          />
        </div>
      )}

      {/* Selection Status */}
      <div style={{
        marginBottom: '1rem',
        padding: '0.75rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '4px',
        fontSize: '0.9rem',
        color: '#495057'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>
            Seleccionado: {selectedItems.length} / {
              catalog_config.selection_mode === 'single' ? '1' : catalog_config.max_selections
            }
            {catalog_config.min_selections > 0 && (
              <span style={{ color: '#dc3545', marginLeft: '0.5rem' }}>
                (Mínimo: {catalog_config.min_selections})
              </span>
            )}
          </span>
          <span style={{ color: '#666' }}>
            {catalogData ? `${catalogData.total_count} registros totales` : ''}
          </span>
        </div>
      </div>

      {/* Data Table */}
      <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          border: '1px solid #ddd'
        }}>
          {renderTableHeader()}
          {renderTableBody()}
        </table>
      </div>

      {/* Pagination */}
      {renderPagination()}

      {/* Actions */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '1.5rem',
        paddingTop: '1rem',
        borderTop: '1px solid #ddd'
      }}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Cancelar
          </button>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {!isValidSelection() && (
            <span style={{ color: '#dc3545', fontSize: '0.9rem' }}>
              {selectedItems.length < catalog_config.min_selections
                ? `Selecciona al menos ${catalog_config.min_selections} elemento(s)`
                : `Selecciona máximo ${catalog_config.max_selections} elemento(s)`
              }
            </span>
          )}

          <button
            onClick={handleSubmit}
            disabled={!isValidSelection()}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: isValidSelection() ? '#28a745' : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isValidSelection() ? 'pointer' : 'not-allowed',
              fontSize: '1rem',
              fontWeight: 'bold'
            }}
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
};

// Add CSS styles for the component
const catalogSelectorStyles = `
.catalog-row:hover {
  background-color: #f8f9fa !important;
}

.catalog-row td {
  padding: 0.75rem;
  border-bottom: 1px solid #dee2e6;
  vertical-align: top;
}

.catalog-row th {
  padding: 1rem 0.75rem;
  background-color: #f8f9fa;
  border-bottom: 2px solid #dee2e6;
  font-weight: bold;
  text-align: left;
}

table {
  font-size: 0.9rem;
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleId = 'catalog-selector-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = catalogSelectorStyles;
    document.head.appendChild(style);
  }
}