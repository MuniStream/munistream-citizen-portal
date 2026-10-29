import React from 'react';
import { useTranslation } from 'react-i18next';
import { humanizeKey } from '../../utils/humanize';
import { ID_FIELDS, isRawKey, officialId, validityOf } from '../../utils/entityIdentity';
import { asText, type RecordEntity } from './types';

/**
 * Who this record is: its type, its name and its folio.
 *
 * The folio is the largest element after the name on purpose. It is the datum
 * the holder reads out on the phone, copies into a form and is asked for by an
 * inspector; everything else on the page is read less often than this one line.
 */
export const EntityIdentity: React.FC<{
  entity: RecordEntity;
  /** `h1` on its own page, `h2` when embedded under the trámite's heading. */
  nameTag?: 'h1' | 'h2';
}> = ({ entity, nameTag = 'h1' }) => {
  const { t, i18n } = useTranslation();
  const dateFmt = new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' });

  const typeName = entity.type_name || humanizeKey(entity.entity_type);
  const name = isRawKey(entity.name || '') ? humanizeKey(entity.name) : asText(entity.name);
  const folio = officialId(entity.data, entity.display?.folio_field);
  const folioLabel = folio
    ? (ID_FIELDS.includes(folio.field) ? t(`my_entities.id_labels.${folio.field}`) : t('entity.record.folio'))
    : '';

  const validity = validityOf(entity, Date.now());
  const validityText = validity
    ? t(`my_entities.${validity.kind === 'expired' ? 'expired_on' : validity.kind === 'expiring' ? 'expires_on' : 'valid_until'}`,
       { date: dateFmt.format(validity.date) })
    : null;
  const issuedText = entity.created_at
    ? t('my_entities.registered_on', { date: dateFmt.format(new Date(entity.created_at)) })
    : null;

  // The status label only earns its place when it says something the validity
  // line does not: "Activo" next to "Vigente hasta el 31 dic" is noise.
  const status = entity.status && entity.status !== 'active' ? entity.status : null;
  const statusLabel = status ? t(`entity.status.${status}`, { defaultValue: humanizeKey(status) }) : null;
  const Name = nameTag;

  return (
    <header className="record-identity">
      <p className="record-eyebrow">{typeName}</p>

      <div className="record-identity-head">
        <Name className="record-name">{name || typeName}</Name>
        <div className="record-flags">
          {statusLabel && <span className={`record-flag is-${status}`}>{statusLabel}</span>}
          {entity.verified && <span className="record-flag is-verified">{t('my_entities.verified')}</span>}
        </div>
      </div>

      {folio && (
        <p className="record-folio">
          <span className="record-folio-label">{folioLabel}</span>
          <span className="record-folio-value">{folio.value}</span>
        </p>
      )}

      <p className="record-dates">
        {validityText && (
          <span className={`record-validity is-${validity!.kind}`}>{validityText}</span>
        )}
        {validityText && issuedText && <span className="record-sep" aria-hidden="true">·</span>}
        {issuedText && <span>{issuedText}</span>}
      </p>
    </header>
  );
};

export default EntityIdentity;
