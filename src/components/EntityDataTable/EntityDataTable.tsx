import React from 'react';
import { useTranslation } from 'react-i18next';
import { humanizeKey } from '../../utils/humanize';
import { formatAddress } from '../../utils/address';
import './EntityDataTable.css';

/**
 * An entity's data as a table, for types that are not shown as a document
 * (`default_view: "data"` in the tenant's entity type catalog).
 *
 * `fields` (optional) picks and orders the keys; `labels` names them. Without
 * `fields` every non-technical key is shown, in the order the data has them.
 */
export interface EntityDataTableProps {
  data: Record<string, any>;
  fields?: string[];
  labels?: Record<string, string>;
}

// Keys written by the platform or a sync, not by whoever the entity is about.
const TECHNICAL_KEYS = new Set([
  'source', 'tenant', 'authority', 'synced_at', 'entity_subtype', 'bucket', 'signature', 'firmas',
  'data_hash', 'name_source', 'oficio_texto', 'registro_type',
]);
const TECHNICAL_PREFIXES = ['_', 's3_', 'parent_', 'child_', 'validation_', 'approval_'];
const TECHNICAL_SUFFIXES = ['_id', '_ids', '_url', '_file', '_files', '_hash', '_submitted_at', '_validated'];

function isTechnical(key: string): boolean {
  return TECHNICAL_KEYS.has(key)
    || TECHNICAL_PREFIXES.some((p) => key.startsWith(p))
    || TECHNICAL_SUFFIXES.some((s) => key.endsWith(s));
}

function isEmpty(value: any): boolean {
  if (value === null || value === undefined || value === '') return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

// Older entities keep structured values as JSON text.
function parseStructured(value: any): any {
  if (typeof value !== 'string') return value;
  const t = value.trim();
  if (!(t.startsWith('{') || t.startsWith('['))) return value;
  try {
    return JSON.parse(t);
  } catch {
    return value;
  }
}

const Value: React.FC<{ value: any }> = ({ value }) => {
  const { t } = useTranslation();
  const v = parseStructured(value);
  if (typeof v === 'boolean') return <>{v ? t('common.yes') : t('common.no')}</>;
  if (Array.isArray(v)) {
    const items = v.filter((it) => !isEmpty(it));
    return (
      <ul className="entity-data-list">
        {items.map((it, i) => (
          <li key={i}><Value value={it} /></li>
        ))}
      </ul>
    );
  }
  if (v && typeof v === 'object') {
    const address = formatAddress(v);
    if (address) return <>{address}</>;
    const entries = Object.entries(v).filter(([k, val]) => !isEmpty(val) && !isTechnical(k));
    return (
      <dl className="entity-data-nested">
        {entries.map(([k, val]) => (
          <div key={k}>
            <dt>{humanizeKey(k)}</dt>
            <dd><Value value={val} /></dd>
          </div>
        ))}
      </dl>
    );
  }
  return <>{String(v)}</>;
};

export const EntityDataTable: React.FC<EntityDataTableProps> = ({ data, fields, labels }) => {
  const { t } = useTranslation();
  const keys = (fields && fields.length ? fields : Object.keys(data || {}).filter((k) => !isTechnical(k)))
    .filter((k) => !isEmpty(data?.[k]));

  if (keys.length === 0) {
    return <p className="entity-data-empty">{t('entity.no_data')}</p>;
  }

  return (
    <table className="entity-data-table">
      <tbody>
        {keys.map((k) => (
          <tr key={k}>
            <th scope="row">{labels?.[k] || humanizeKey(k)}</th>
            <td><Value value={data[k]} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default EntityDataTable;
