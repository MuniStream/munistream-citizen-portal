/**
 * Entity Viewer — the record of an entity, shown inside another screen.
 *
 * This is the adapter that keeps the embedded callers working: the trámite
 * screen (`EmittedEntitiesSection`) and the tenant overrides of
 * `InstanceDetailContent`, which build this prop shape from the entity detail
 * they already fetched. The record itself lives in `EntityRecord`.
 *
 * `display`, `typeName` and `related` are optional because a caller that has
 * not been updated yet simply has no catalog data to pass: the record then
 * shows the document and the data table, without related sections.
 */

import React from 'react';
import { EntityRecord } from '../EntityRecord';
import type { RecordDisplay, RecordRelatedSection, RecordWorkflow } from '../EntityRecord';

interface EntityData {
  id: string;
  type: string;
  name: string;
  data: Record<string, any>;
  created_at: string;
  has_signature: boolean;
  signature_info?: {
    algorithm: string;
    signer: string;
    timestamp: string;
    verified?: boolean;
  };
}

/**
 * Datos de la firma de una entidad, para `signature_info`.
 *
 * La firma llega en dos formas: un objeto con sus metadatos
 * (`signer`, `cert_subject`, `signature_valid`, `signed_at`…) o la cadena del
 * sello con esos metadatos aplanados en `data`. Leer solo
 * `certificate_info.subject` y `verified` —que ningún firmante escribe— dejaba
 * cada documento firmado como "Firmante: Unknown" con la etiqueta "Error".
 * `verified` queda indefinido cuando la firma no dice si fue válida: eso es
 * "Pendiente", no un error.
 */
export function signatureInfoFromData(
  data: Record<string, any> | undefined,
  createdAt: string,
): EntityData['signature_info'] {
  const firma = data?.signature;
  if (!firma) return undefined;
  const meta: Record<string, any> = typeof firma === 'object' ? firma : data || {};
  const valida = meta.signature_valid ?? meta.verified;
  return {
    algorithm: texto(meta.algorithm) || 'RSA-SHA256',
    signer: texto(meta.signer || meta.cert_subject || meta.certificate_info?.subject),
    timestamp: texto(meta.signed_at || meta.timestamp) || createdAt,
    verified: typeof valida === 'boolean' ? valida : undefined,
  };
}

function texto(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'string') return valor;
  if (typeof valor === 'number' || typeof valor === 'boolean') return String(valor);
  try {
    return JSON.stringify(valor);
  } catch {
    return String(valor);
  }
}

interface EntityViewerProps {
  entity: EntityData;
  apiBaseUrl?: string;
  /** The type's display config, from the entity detail payload. */
  display?: RecordDisplay;
  /** The type's name in the tenant's entity type catalog. */
  typeName?: string | null;
  /** Related entities, as the catalog declares or derives them. */
  related?: RecordRelatedSection[];
  /** Trámites that accept this type. Omitted: the section is not shown. */
  availableWorkflows?: RecordWorkflow[];
  /** State of the entity, for the identity block. */
  status?: string;
  verified?: boolean;
  validUntil?: string | null;
}

export const EntityViewer: React.FC<EntityViewerProps> = ({
  entity,
  apiBaseUrl = '/api/v1',
  display,
  typeName,
  related,
  availableWorkflows,
  status,
  verified,
  validUntil,
}) => (
  // `signature_info` is not forwarded: the record reads the signature from
  // `data`, which is where `signatureInfoFromData` reads it from too.
  <EntityRecord
    entity={{
      entity_id: entity.id,
      entity_type: entity.type,
      name: entity.name,
      data: entity.data || {},
      created_at: entity.created_at,
      valid_until: validUntil,
      status,
      verified,
      type_name: typeName,
      related,
      display,
    }}
    apiBaseUrl={apiBaseUrl}
    availableWorkflows={availableWorkflows}
    variant="embedded"
  />
);

export default EntityViewer;
