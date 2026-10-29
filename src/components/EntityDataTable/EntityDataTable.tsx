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
//
// The second group is the engine's own bookkeeping, which several trámites
// copy wholesale into the entity they emit: the form definition of a step, the
// counters and timestamps of the run, the signature plumbing. A row reading
// "Rewind Count: 0" tells the holder of a permit nothing, and it is where a
// 400-character signature chain and stray emoji from internal step titles
// ended up on the page.
//
// This is a floor, not a ceiling: the way to decide what a type shows is to
// declare its `fields` in the tenant's `entity_types.yaml`, which also orders
// and labels them. A type that declares them is shown exactly as declared —
// none of this applies.
const TECHNICAL_KEYS = new Set([
  'source', 'tenant', 'authority', 'synced_at', 'entity_subtype', 'bucket', 'signature', 'firmas',
  'data_hash', 'name_source', 'oficio_texto', 'registro_type',
  'form_config', 'waiting_for', 'current_step', 'initiated_by', 'priority', 'requires_input',
  'customer_email', 'customer_name', 'task_states', 'step_results',
  'message', 'timestamp', 'assigned_to', 'validated_by', 'algorithm', 'signer', 'skipped',
]);
const TECHNICAL_PREFIXES = [
  '_', 's3_', 'parent_', 'child_', 'validation_', 'approval_',
  'elapsed_', 'assignment_', 'signature_', 'firma_', 'firmas_', 'cert_', 'document_to_',
];
const TECHNICAL_SUFFIXES = [
  '_id', '_ids', '_url', '_file', '_files', '_hash', '_submitted_at', '_validated',
  // Written by the engine: execution timestamps (the domain names its own
  // dates in Spanish, `fecha_*`), run counters, and operator inputs/outputs.
  '_at', '_count', '_input', '_result', '_decision', '_accepted', '_prepared', '_purpose', '_chain',
];

// Longest a value can be and still read as a value instead of a dump.
const MAX_VALUE_LENGTH = 200;

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

// Dates are stored as the engine writes them. "2026-10-28T22:32:59.062282" is
// a timestamp, not a date anyone reads.
const ISO_DATE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

const Value: React.FC<{ value: any }> = ({ value }) => {
  const { t, i18n } = useTranslation();
  const v = parseStructured(value);
  if (typeof v === 'boolean') return <>{v ? t('common.yes') : t('common.no')}</>;
  if (typeof v === 'string' && ISO_DATE.test(v.trim())) {
    const date = new Date(v.trim());
    if (!Number.isNaN(date.getTime())) {
      return <>{new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'long', year: 'numeric' }).format(date)}</>;
    }
  }
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

/**
 * Whether a value reads as a value when nobody declared it should be shown.
 *
 * An entity whose type declares no `fields` carries whatever its trámite
 * stored, which includes the nested output of operators and the signature
 * chain. Those are data about the run, not about the document, and printed in
 * a table they bury the handful of rows that do say something.
 */
function isPresentable(value: any): boolean {
  const v = parseStructured(value);
  if (v && typeof v === 'object' && !Array.isArray(v)) return formatAddress(v) !== '';
  if (Array.isArray(v)) return v.every((item) => typeof item !== 'object' || item === null);
  return typeof v !== 'string' || v.length <= MAX_VALUE_LENGTH;
}

export const EntityDataTable: React.FC<EntityDataTableProps> = ({ data, fields, labels }) => {
  const { t } = useTranslation();
  // A declared field is shown as declared; an undeclared one has to earn it.
  const declared = !!(fields && fields.length);
  const keys = (declared
    ? fields!
    : Object.keys(data || {}).filter((k) => !isTechnical(k) && isPresentable(data?.[k]))
  ).filter((k) => !isEmpty(data?.[k]));

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
