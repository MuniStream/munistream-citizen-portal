import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatCost } from '../../utils/cost';
import type { RecordWorkflow } from './types';

/**
 * What the citizen can do with this document.
 *
 * Each one links to the trámite's own page, which is where its requirements,
 * its cost and the button to start it already live — a second way to start a
 * trámite would be a second thing to keep correct. They are a list and not a
 * grid of cards: there are two or three, they are not equivalent to each
 * other, and tiles would give them a weight they do not have.
 */
export const EntityActions: React.FC<{
  workflows: RecordWorkflow[];
  sectionTag: 'h2' | 'h3';
}> = ({ workflows, sectionTag }) => {
  const { t } = useTranslation();
  const Section = sectionTag;

  return (
    <section className="record-section">
      <Section className="record-section-title">{t('entity.record.available_workflows')}</Section>
      {workflows.length === 0 ? (
        <p className="record-note">{t('entity.record.no_workflows')}</p>
      ) : (
        <ul className="record-tramites">
          {workflows.map((workflow) => {
            const meta = [workflow.estimatedDuration, formatCost(workflow.cost)].filter(Boolean);
            return (
              <li key={workflow.workflow_id}>
                <Link to={`/services/${workflow.workflow_id}`} className="record-tramite">
                  <span className="record-tramite-name">{workflow.name}</span>
                  {meta.length > 0 && <span className="record-tramite-meta">{meta.join(' · ')}</span>}
                  <span className="record-tramite-go" aria-hidden="true">→</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default EntityActions;
