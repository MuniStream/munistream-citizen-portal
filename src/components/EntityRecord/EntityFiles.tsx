import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { authService } from '../../services/authService';
import type { RecordEntity } from './types';

interface RecordFile {
  name: string;
  s3Key: string;
  size?: number;
}

/**
 * The entity's files, identified by their `s3_key`.
 *
 * The key is kept and the download permission is asked for at download time,
 * against an endpoint that checks the file belongs to this entity and to
 * whoever is asking. Building the download URL here, as this used to, left a
 * route that required no credential at all: knowing a key was enough to pull
 * any object out of the bucket.
 */
export function filesOf(data: Record<string, any> | undefined): { title: string; files: RecordFile[] }[] {
  const groups: { title: string; files: RecordFile[] }[] = [];
  if (!data) return groups;

  if (Array.isArray(data.uploaded_files)) {
    const files = data.uploaded_files
      .filter((file: any) => file?.s3_key)
      .map((file: any) => ({ name: file.filename || '', s3Key: file.s3_key, size: file.size }));
    if (files.length) groups.push({ title: 'uploaded', files });
  }

  // Files produced by the flow. The validator persists `s3_key` next to the
  // inherited `download_url`, so no data migration is needed: read the key.
  if (data.signable_data?.data) {
    const files: RecordFile[] = [];
    Object.keys(data.signable_data.data).forEach((key) => {
      if (key.includes('_result') && Array.isArray(data.signable_data.data[key])) {
        data.signable_data.data[key].forEach((file: any) => {
          if (file?.s3_key) files.push({ name: file.filename || '', s3Key: file.s3_key, size: file.size });
        });
      }
    });
    if (files.length) groups.push({ title: 'flow', files });
  }

  // `s3_keys` repeats the keys of `uploaded_files`: without discarding them
  // every file was listed twice, once by its name and once by its S3 key.
  const already = new Set(groups.flatMap((g) => g.files.map((f) => f.s3Key)));
  if (Array.isArray(data.s3_keys)) {
    const files = data.s3_keys
      .filter((key: any) => typeof key === 'string' && key && !already.has(key))
      .map((key: string) => ({ name: key.split('/').pop() || '', s3Key: key }));
    if (files.length) groups.push({ title: 'other', files });
  }

  return groups;
}

interface Props {
  entity: RecordEntity;
  apiBaseUrl: string;
  sectionTag: 'h2' | 'h3';
}

export const EntityFiles: React.FC<Props> = ({ entity, apiBaseUrl, sectionTag }) => {
  const { t } = useTranslation();
  const Section = sectionTag;
  const [error, setError] = useState<string | null>(null);
  const groups = filesOf(entity.data);

  if (!groups.length) return null;

  const download = async (s3Key: string, filename: string) => {
    const token = authService.getToken();
    const grantRes = await fetch(`${apiBaseUrl}/files/grant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ scope: { entity_id: entity.entity_id }, s3_keys: [s3Key] }),
    });
    if (!grantRes.ok) throw new Error('grant');

    const { grants } = await grantRes.json();
    const grant = (grants || []).find((g: any) => g.s3_key === s3Key);
    if (!grant) throw new Error('grant');

    const res = await fetch(`${apiBaseUrl}/files/download/${s3Key}?t=${encodeURIComponent(grant.token)}`);
    if (!res.ok) throw new Error('download');

    const url = window.URL.createObjectURL(await res.blob());
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } finally {
      window.URL.revokeObjectURL(url);
    }
  };

  return (
    <section className="record-section">
      <Section className="record-section-title">{t('entity.record.files')}</Section>
      {error && <p className="record-note is-error" role="alert">{error}</p>}
      {groups.map((group) => (
        <React.Fragment key={group.title}>
          {groups.length > 1 && (
            <p className="record-group-label">{t(`entity.record.files_group.${group.title}`)}</p>
          )}
        <ul className="record-files">
          {group.files.map((file) => (
            <li key={file.s3Key}>
              <span className="record-file-name">{file.name || t('entity.record.file')}</span>
              {file.size ? (
                <span className="record-file-size">{Math.round(file.size / 1024)} KB</span>
              ) : null}
              <button
                type="button"
                className="record-button is-link"
                onClick={async () => {
                  setError(null);
                  try {
                    await download(file.s3Key, file.name || 'archivo');
                  } catch {
                    setError(t('entity.record.download_failed'));
                  }
                }}
              >
                {t('entity.record.download')}
              </button>
            </li>
          ))}
        </ul>
        </React.Fragment>
      ))}
    </section>
  );
};

export default EntityFiles;
