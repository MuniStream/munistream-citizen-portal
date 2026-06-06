import React, { useMemo, useState } from 'react';
import './ConfirmationReview.css';

export interface ConfirmationField {
  key: string;
  label?: string;
  label_translations?: Record<string, string>;
  format?: string;
  value?: any;
}

export interface ConfirmationSection {
  id: string;
  title: string;
  title_translations?: Record<string, string>;
  source_task_id?: string;
  operator_kind?: string;
  editable?: boolean;
  fields: ConfirmationField[];
}

export interface ConfirmationDeclaration {
  id: string;
  text: string;
  text_translations?: Record<string, string>;
  required?: boolean;
}

interface ConfirmationReviewProps {
  title: string;
  description?: string;
  summarySections: ConfirmationSection[];
  tosText: string;
  declarations: ConfirmationDeclaration[];
  rewindableTaskIds: string[];
  locale: string;
  isSubmitting?: boolean;
  isRewinding?: boolean;
  onSubmit: (data: { declarations_accepted: string[] }) => void;
  onRewind: (toTaskId: string) => Promise<void> | void;
}

function localized(
  base: string | undefined,
  translations: Record<string, string> | undefined,
  locale: string,
): string {
  if (translations && translations[locale]) {
    return translations[locale];
  }
  if (translations && translations.es) {
    return translations.es;
  }
  return base ?? '';
}

function formatValue(value: any, format?: string): string {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) {
    if (value.length === 0) return '—';
    return value
      .map((item) => (typeof item === 'object' ? JSON.stringify(item) : String(item)))
      .join(', ');
  }
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (typeof value === 'object') {
    if (format === 'file' && (value as any).filename) {
      return (value as any).filename as string;
    }
    if ((value as any).url) {
      return (value as any).url as string;
    }
    return JSON.stringify(value);
  }
  return String(value);
}

function operatorKindLabel(kind: string | undefined): string {
  switch (kind) {
    case 'user_input':
      return 'Datos capturados';
    case 's3_upload':
      return 'Documentos cargados';
    case 'appointment':
      return 'Cita';
    case 'payment':
      return 'Pago';
    case 'catalog_selection':
      return 'Selección de catálogo';
    case 'entity_picker':
      return 'Selección';
    default:
      return '';
  }
}

export const ConfirmationReview: React.FC<ConfirmationReviewProps> = ({
  title,
  description,
  summarySections,
  tosText,
  declarations,
  rewindableTaskIds,
  locale,
  isSubmitting = false,
  isRewinding = false,
  onSubmit,
  onRewind,
}) => {
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  const [pendingRewindId, setPendingRewindId] = useState<string | null>(null);

  const safeDeclarations = declarations || [];
  const safeSections = summarySections || [];

  const requiredIds = useMemo(
    () => safeDeclarations.filter((d) => d.required).map((d) => d.id),
    [safeDeclarations],
  );

  const allRequiredAccepted = requiredIds.every((id) => accepted[id]);
  const rewindable = useMemo(() => new Set(rewindableTaskIds || []), [rewindableTaskIds]);

  const toggleDeclaration = (id: string) => {
    setAccepted((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!allRequiredAccepted || isSubmitting || isRewinding) return;
    onSubmit({
      declarations_accepted: safeDeclarations
        .filter((d) => accepted[d.id])
        .map((d) => d.id),
    });
  };

  const handleEditClick = (taskId: string) => {
    setPendingRewindId(taskId);
  };

  const cancelRewind = () => setPendingRewindId(null);

  const confirmRewind = async () => {
    if (!pendingRewindId) return;
    const taskId = pendingRewindId;
    setPendingRewindId(null);
    await onRewind(taskId);
  };

  return (
    <div className="confirmation-review">
      <div className="confirmation-review__header">
        <h2 className="confirmation-review__title">{title}</h2>
        {description && (
          <p className="confirmation-review__description">{description}</p>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="confirmation-review__sections">
          <h3 className="confirmation-review__section-heading">Resumen de su solicitud</h3>
          {safeSections.length === 0 && (
            <p className="confirmation-review__empty">No hay datos a confirmar.</p>
          )}
          {(() => {
            const renderedTaskIds = new Set<string>();
            return safeSections.map((section) => {
              const sectionTitle = localized(section.title, section.title_translations, locale);
              const sourceTaskId = section.source_task_id;
              const isFirstOfTask = !!sourceTaskId && !renderedTaskIds.has(sourceTaskId);
              if (sourceTaskId) renderedTaskIds.add(sourceTaskId);
              const isEditable = section.editable !== false
                && !!sourceTaskId
                && rewindable.has(sourceTaskId)
                && isFirstOfTask;
              const kindLabel = operatorKindLabel(section.operator_kind);

            return (
              <div key={section.id} className="confirmation-section">
                <div className="confirmation-section__header">
                  <div>
                    <h4 className="confirmation-section__title">{sectionTitle}</h4>
                    {kindLabel && (
                      <span className="confirmation-section__kind">{kindLabel}</span>
                    )}
                  </div>
                  {isEditable && (
                    <button
                      type="button"
                      className="btn-edit"
                      onClick={() => handleEditClick(section.source_task_id as string)}
                      disabled={isSubmitting || isRewinding}
                    >
                      Editar
                    </button>
                  )}
                </div>
                <dl className="confirmation-section__fields">
                  {(section.fields || []).map((field) => (
                    <div key={field.key} className="confirmation-section__field">
                      <dt>{localized(field.label, field.label_translations, locale)}</dt>
                      <dd>{formatValue(field.value, field.format)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            );
            });
          })()}
        </div>

        {tosText && (
          <div className="confirmation-review__tos">
            <h3 className="confirmation-review__section-heading">Términos y condiciones</h3>
            <div className="confirmation-review__tos-body">
              {tosText.split('\n').map((line, idx) => (
                <p key={idx}>{line}</p>
              ))}
            </div>
          </div>
        )}

        <div className="confirmation-review__declarations">
          <h3 className="confirmation-review__section-heading">Declaraciones</h3>
          <ul>
            {safeDeclarations.map((declaration) => {
              const text = localized(declaration.text, declaration.text_translations, locale);
              const isChecked = !!accepted[declaration.id];
              return (
                <li key={declaration.id}>
                  <label
                    className={`declaration-item ${isChecked ? 'declaration-item--checked' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleDeclaration(declaration.id)}
                      disabled={isSubmitting || isRewinding}
                    />
                    <span>
                      {text}
                      {declaration.required && <span className="declaration-required"> *</span>}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="confirmation-review__footer">
          <button
            type="submit"
            className="btn-primary"
            disabled={!allRequiredAccepted || isSubmitting || isRewinding}
          >
            {isSubmitting ? 'Enviando...' : 'Confirmar y continuar'}
          </button>
        </div>
      </form>

      {pendingRewindId && (
        <div
          className="confirmation-rewind-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirmation-rewind-title"
        >
          <div className="confirmation-rewind-modal__backdrop" onClick={cancelRewind} />
          <div className="confirmation-rewind-modal__content">
            <h3 id="confirmation-rewind-title">¿Editar este apartado?</h3>
            <p>
              Si edita este apartado, se descartará la información que haya capturado en los pasos
              posteriores. Tendrá que volver a recorrer el flujo hasta esta pantalla de
              confirmación. ¿Desea continuar?
            </p>
            <div className="confirmation-rewind-modal__actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={cancelRewind}
                disabled={isRewinding}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={confirmRewind}
                disabled={isRewinding}
              >
                {isRewinding ? 'Procesando...' : 'Sí, editar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
