import React from 'react';
import { useTranslation } from 'react-i18next';
import { EntityDataTable } from '../EntityDataTable/EntityDataTable';
import { EntityIdentity } from './EntityIdentity';
import { EntityRelated } from './EntityRelated';
import { EntityDocument } from './EntityDocument';
import { EntityFiles } from './EntityFiles';
import { EntityActions } from './EntityActions';
import { EntityHistory } from './EntityHistory';
import type { RecordEntity, RecordInstance, RecordWorkflow } from './types';
import './EntityRecord.css';

export interface EntityRecordProps {
  entity: RecordEntity;
  apiBaseUrl: string;
  /** Trámites that accept this entity's type. Omitted: the section is not shown. */
  availableWorkflows?: RecordWorkflow[];
  recentInstances?: RecordInstance[];
  /**
   * `full` is the record's own page. `embedded` is the record shown inside
   * another screen (the trámite that just issued it), where the surrounding
   * page owns the heading level and the history belongs to that screen.
   */
  variant?: 'full' | 'embedded';
}

/**
 * One of the citizen's documents, read as a record sheet: what it is, what it
 * says, and what can be done with it.
 *
 * The data table is always shown, including for types rendered as a document.
 * The document is an iframe — its text cannot be selected, searched or read
 * out by a screen reader — so it cannot be the only place the data exists.
 */
export const EntityRecord: React.FC<EntityRecordProps> = ({
  entity,
  apiBaseUrl,
  availableWorkflows,
  recentInstances,
  variant = 'full',
}) => {
  const { t } = useTranslation();
  const sectionTag = variant === 'full' ? 'h2' : 'h3';
  const Section = sectionTag;

  // Types the catalog declares as `data` have no document of their own; the
  // rest are also rendered by their visualizer.
  const hasDocument = entity.display?.default_view !== 'data';
  const heading = entity.display?.heading
    || (entity.type_name ? t('entity.information_of', { type: entity.type_name }) : t('entity.information'));

  return (
    <article className="entity-record">
      <EntityIdentity entity={entity} nameTag={variant === 'full' ? 'h1' : 'h2'} />

      <EntityRelated sections={entity.related || []} sectionTag={sectionTag} />

      {hasDocument && (
        <EntityDocument entity={entity} apiBaseUrl={apiBaseUrl} sectionTag={sectionTag} />
      )}

      <section className="record-section">
        <Section className="record-section-title">{heading}</Section>
        <EntityDataTable
          data={entity.data}
          fields={entity.display?.fields}
          labels={entity.display?.labels}
        />
      </section>

      <EntityFiles entity={entity} apiBaseUrl={apiBaseUrl} sectionTag={sectionTag} />

      {availableWorkflows && (
        <EntityActions workflows={availableWorkflows} sectionTag={sectionTag} />
      )}

      {variant === 'full' && recentInstances && (
        <EntityHistory instances={recentInstances} sectionTag={sectionTag} />
      )}
    </article>
  );
};

export default EntityRecord;
