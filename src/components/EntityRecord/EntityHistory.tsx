import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { humanizeKey } from '../../utils/humanize';
import { statusI18nKey } from '../InstanceDetailContent/statusHelpers';
import type { RecordInstance } from './types';

/**
 * The trámites already run with this document.
 *
 * The status is read as a word, not inferred from a colour or a pictogram, and
 * the trámite is named — the id (`tramite_01_070_guia_pesca`) is the
 * platform's name for it, not the citizen's.
 */
export const EntityHistory: React.FC<{
  instances: RecordInstance[];
  sectionTag: 'h2' | 'h3';
}> = ({ instances, sectionTag }) => {
  const { t, i18n } = useTranslation();
  const Section = sectionTag;
  const dateFmt = new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' });

  if (!instances.length) return null;

  return (
    <section className="record-section">
      <Section className="record-section-title">{t('entity.record.history')}</Section>
      <div className="record-table-scroll">
        <table className="record-table">
          <thead>
            <tr>
              <th scope="col">{t('entity.record.tramite')}</th>
              <th scope="col">{t('entity.statusLabel')}</th>
              <th scope="col">{t('entity.started')}</th>
              <th scope="col">{t('entity.completed')}</th>
            </tr>
          </thead>
          <tbody>
            {instances.map((instance) => (
              <tr key={instance.instance_id}>
                <td>
                  <Link to={`/instances/${instance.instance_id}`}>
                    {instance.workflow_name || humanizeKey(instance.workflow_id)}
                  </Link>
                </td>
                <td>{t(statusI18nKey(instance.status))}</td>
                <td>{instance.created_at ? dateFmt.format(new Date(instance.created_at)) : '—'}</td>
                <td>{instance.completed_at ? dateFmt.format(new Date(instance.completed_at)) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default EntityHistory;
