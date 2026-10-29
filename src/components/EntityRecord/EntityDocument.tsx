import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { mensajeDeError } from '../../utils/errorMessage';
import { asText, type RecordEntity } from './types';

interface Props {
  entity: RecordEntity;
  apiBaseUrl: string;
  sectionTag: 'h2' | 'h3';
}

/**
 * The document the entity's visualizer renders, as the sheet of paper it is,
 * with the actions that get it out of the screen: download and print.
 *
 * Nothing is announced while it loads and nothing is announced if there is no
 * visualizer — the section simply does not exist in that case. Telling the
 * citizen "no visualizer available for this entity" named an internal concept
 * and offered them nothing to do about it.
 */
export const EntityDocument: React.FC<Props> = ({ entity, apiBaseUrl, sectionTag }) => {
  const { t } = useTranslation();
  const Section = sectionTag;

  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signatureCheck, setSignatureCheck] = useState<{ valid: boolean; at: string } | null>(null);

  const signature = entity.data?.signature;
  const signatureMeta: Record<string, any> = signature && typeof signature === 'object' ? signature : entity.data || {};
  const signer = signature
    ? asText(signatureMeta.signer || signatureMeta.cert_subject || signatureMeta.certificate_info?.subject)
    : '';

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`${apiBaseUrl}/signatures/entities/${entity.entity_id}/html`);
        if (!cancelled) setHtml(typeof response.data === 'string' ? response.data : '');
      } catch {
        // No visualizer, or it failed: the section hides itself rather than
        // explaining the platform's internals.
        if (!cancelled) setHtml('');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [entity.entity_id, apiBaseUrl]);

  const download = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await axios.get(`${apiBaseUrl}/signatures/entities/${entity.entity_id}/pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(response.data);
      try {
        const link = document.createElement('a');
        link.href = url;
        link.download = `${entity.name || entity.entity_id}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
      } finally {
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError(mensajeDeError(err, t('entity.record.download_failed')));
    } finally {
      setBusy(false);
    }
  }, [apiBaseUrl, entity.entity_id, entity.name, t]);

  const print = useCallback(() => {
    const frame = document.getElementById(`record-doc-${entity.entity_id}`) as HTMLIFrameElement | null;
    frame?.contentWindow?.print();
  }, [entity.entity_id]);

  const verify = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await axios.post(`${apiBaseUrl}/signatures/entities/${entity.entity_id}/verify-signature`);
      setSignatureCheck({
        valid: !!response.data?.overall_valid,
        at: response.data?.verification_timestamp || new Date().toISOString(),
      });
    } catch (err) {
      setError(mensajeDeError(err, t('entity.record.verify_failed')));
    } finally {
      setBusy(false);
    }
  }, [apiBaseUrl, entity.entity_id, t]);

  if (loading) {
    return (
      <section className="record-section record-document is-loading">
        <Section className="record-section-title">{t('entity.record.document')}</Section>
        <p className="record-note">{t('common.loading')}</p>
      </section>
    );
  }

  if (!html) return null;

  return (
    <section className="record-section record-document">
      <div className="record-toolbar">
        <Section className="record-section-title">{t('entity.record.document')}</Section>
        <div className="record-actions">
          <button type="button" className="record-button is-primary" onClick={download} disabled={busy}>
            {t('entity.record.download_pdf')}
          </button>
          <button type="button" className="record-button" onClick={print} disabled={busy}>
            {t('entity.record.print')}
          </button>
          {signature && (
            <button type="button" className="record-button" onClick={verify} disabled={busy}>
              {t('entity.record.verify_signature')}
            </button>
          )}
        </div>
      </div>

      <div className="record-sheet">
        <iframe
          id={`record-doc-${entity.entity_id}`}
          srcDoc={html}
          title={t('entity.record.document_of', { name: entity.name || entity.entity_id })}
        />
      </div>

      {error && <p className="record-note is-error" role="alert">{error}</p>}

      {signature && (
        <dl className="record-signature">
          {signer && (
            <div>
              <dt>{t('entity.record.signed_by')}</dt>
              <dd>{signer}</dd>
            </div>
          )}
          {signatureCheck && (
            <div>
              <dt>{t('entity.record.signature_check')}</dt>
              <dd className={signatureCheck.valid ? 'is-valid' : 'is-invalid'}>
                {signatureCheck.valid ? t('entity.record.signature_valid') : t('entity.record.signature_invalid')}
              </dd>
            </div>
          )}
        </dl>
      )}
    </section>
  );
};

export default EntityDocument;
