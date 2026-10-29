/**
 * The shape of an entity record as the backend serves it
 * (`GET /public/entities/{id}`).
 */

export interface RecordRelatedSection {
  title: string;
  entity_id: string;
  /** Name of the related entity; the only content when `rows` is empty. */
  name?: string | null;
  rows: { key: string; label: string; value: any }[];
}

export interface RecordDisplay {
  /** `data` shows only the table; anything else also renders the document. */
  default_view?: string;
  heading?: string;
  fields?: string[];
  labels?: Record<string, string>;
  /** Data key holding the entity's folio. */
  folio_field?: string | null;
}

export interface RecordEntity {
  entity_id: string;
  entity_type: string;
  name: string;
  status?: string;
  verified?: boolean;
  data: Record<string, any>;
  created_at?: string | null;
  updated_at?: string | null;
  valid_until?: string | null;
  /** The type's name in the tenant's entity type catalog. */
  type_name?: string | null;
  related?: RecordRelatedSection[];
  display?: RecordDisplay;
}

export interface RecordWorkflow {
  workflow_id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  estimatedDuration?: string;
  cost?: string | number;
}

export interface RecordInstance {
  instance_id: string;
  workflow_id: string;
  workflow_name?: string | null;
  status: string;
  created_at?: string | null;
  completed_at?: string | null;
}

/**
 * Any value as text.
 *
 * React tears the page down — error #31, blank screen — when an object reaches
 * it where a node belongs, and these values come from `entity.data`, which is
 * whatever each trámite stored: there is no guaranteeing their shape from this
 * side. A field with an unexpected shape has to look odd, not leave the citizen
 * without their document.
 */
export function asText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
