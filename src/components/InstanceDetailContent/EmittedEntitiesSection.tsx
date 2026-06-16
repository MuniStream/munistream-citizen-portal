import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EntityViewer } from '../signature/EntityViewer';
import { workflowService, type EmittedEntity } from '../../services/workflowService';

interface EmittedEntitiesSectionProps {
  entities: EmittedEntity[];
}

interface LoadedEntity {
  entity_id: string;
  entity_type: string;
  name: string;
  data: Record<string, any>;
  created_at: string;
}

const apiBaseUrl = `${import.meta.env.VITE_API_URL}${import.meta.env.VITE_API_BASE_URL}`;

/**
 * Renders, inline on the trámite screen, the full detail of every entity the
 * workflow emitted on completion — no extra navigation. Reuses EntityViewer
 * (fields + PDF / file download) so the citizen sees their issued document
 * (constancia/folio) right where the process concluded.
 */
const EmittedEntitiesSection: React.FC<EmittedEntitiesSectionProps> = ({ entities }) => {
  const { t } = useTranslation();
  const [loaded, setLoaded] = useState<LoadedEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hadError, setHadError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setHadError(false);
      const results = await Promise.all(
        entities.map(async (ref) => {
          try {
            const detail = await workflowService.getEntityDetail(ref.entity_id);
            const entity = detail?.entity ?? detail;
            if (!entity) return null;
            return {
              entity_id: entity.entity_id || ref.entity_id,
              entity_type: entity.entity_type || ref.entity_type || '',
              name: entity.name || ref.entity_type || ref.entity_id,
              data: entity.data || {},
              created_at: entity.created_at || '',
            } as LoadedEntity;
          } catch {
            return null;
          }
        })
      );

      if (cancelled) return;
      const ok = results.filter((r): r is LoadedEntity => r !== null);
      setLoaded(ok);
      setHadError(ok.length < entities.length);
      setIsLoading(false);
    };

    if (entities.length > 0) {
      load();
    } else {
      setLoaded([]);
      setIsLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [entities]);

  if (entities.length === 0) return null;

  return (
    <section className="emitted-entities-section">
      <div className="container">
        <h2>
          {entities.length > 1
            ? t('instanceDetail.emittedEntitiesTitle')
            : t('instanceDetail.emittedEntityTitle')}
        </h2>

        {isLoading && (
          <div className="emitted-entities-loading">
            <div className="spinner" aria-hidden="true"></div>
            <p>{t('common.loading')}</p>
          </div>
        )}

        {!isLoading &&
          loaded.map((entity) => (
            <div className="emitted-entity-card" key={entity.entity_id}>
              <EntityViewer
                entity={{
                  id: entity.entity_id,
                  type: entity.entity_type,
                  name: entity.name,
                  data: entity.data,
                  created_at: entity.created_at,
                  has_signature: entity.data?.signature ? true : false,
                  signature_info: entity.data?.signature
                    ? {
                        algorithm: entity.data.signature.algorithm || 'RSA-SHA256',
                        signer:
                          entity.data.signature.certificate_info?.subject || 'Unknown',
                        timestamp: entity.data.signature.timestamp || entity.created_at,
                        verified: entity.data.signature.verified || false,
                      }
                    : undefined,
                }}
                apiBaseUrl={apiBaseUrl}
              />
            </div>
          ))}

        {!isLoading && hadError && (
          <p className="emitted-entities-error">{t('instanceDetail.emittedEntityError')}</p>
        )}
      </div>
    </section>
  );
};

export default EmittedEntitiesSection;
