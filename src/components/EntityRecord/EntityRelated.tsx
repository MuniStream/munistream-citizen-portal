import React from 'react';
import { Link } from 'react-router-dom';
import { EntityDataTable } from '../EntityDataTable/EntityDataTable';
import type { RecordRelatedSection } from './types';

/**
 * The entities this record points to — the economic unit a permit belongs to,
 * the vessel an engine is mounted on — before the record's own data, because
 * that is the context the rest is read in.
 *
 * A section the catalog declares brings its rows and shows them as a table.
 * One derived from an `*_ids` key has no rows: the related entity, named and
 * linkable, is all there is to show.
 */
export const EntityRelated: React.FC<{
  sections: RecordRelatedSection[];
  sectionTag: 'h2' | 'h3';
}> = ({ sections, sectionTag }) => {
  const Section = sectionTag;
  if (!sections.length) return null;

  return (
    <>
      {sections.map((section) => (
        <section className="record-section" key={`${section.title}-${section.entity_id}`}>
          <Section className="record-section-title">
            <Link to={`/entity/${section.entity_id}`}>{section.title}</Link>
          </Section>
          {section.rows.length > 0 ? (
            <EntityDataTable
              data={Object.fromEntries(section.rows.map((r) => [r.key, r.value]))}
              fields={section.rows.map((r) => r.key)}
              labels={Object.fromEntries(section.rows.map((r) => [r.key, r.label]))}
            />
          ) : (
            <p className="record-related-name">
              <Link to={`/entity/${section.entity_id}`}>{section.name || section.entity_id}</Link>
            </p>
          )}
        </section>
      ))}
    </>
  );
};

export default EntityRelated;
