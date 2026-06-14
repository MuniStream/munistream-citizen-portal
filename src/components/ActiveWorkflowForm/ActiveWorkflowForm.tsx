import React from 'react';
import type { WorkflowInstanceProgress } from '../../services/workflowService';
import { DataCollectionForm } from '../DataCollectionForm';
import { CatalogSelector } from '../CatalogSelector';
import { SelfieCapture, IDCapture } from '../capture';
import { SigningForm } from '../signature/SigningForm';
import { ConfirmationReview } from '../ConfirmationReview';
import { AssertionReview } from '../AssertionReview';
import { getCurrentLocale } from '../../utils/locale';

export type ActiveFormKind =
  | 'user_input'
  | 'entity_selection'
  | 'catalog_selection'
  | 'selfie'
  | 'id_capture'
  | 'signature'
  | 'confirmation'
  | 'assertion_review';

export interface ActiveFormCardSlot {
  /** Form body (DataCollectionForm, ConfirmationReview, etc.) — never null when this slot is invoked. */
  body: React.ReactNode;
  /** Concrete case being rendered. */
  waitingFor: ActiveFormKind;
  /** Suggested card title. */
  title: string;
  /** Suggested accent color (border / header). */
  accentColor: string;
  /** Suggested heading for the success state. */
  successTitle: string;
  /** Backend message; when truthy the caller should show the success block instead of the body. */
  successMessage: string | null;
}

export interface ActiveWorkflowFormProps {
  instance: WorkflowInstanceProgress;
  isSubmitting: boolean;
  isRewinding: boolean;
  submissionSuccess: string | null;
  profileValues?: Record<string, any>;
  onSubmit: (data: Record<string, any>) => void | Promise<void>;
  onRewind: (toTaskId: string) => void | Promise<void>;
  /**
   * Optional wrapper. If absent, the default base-portal CSS layout
   * (`section.active-form-section > div.container > div.form-card`) is used.
   */
  renderCard?: (slot: ActiveFormCardSlot) => React.ReactNode;
}

interface CaseMeta {
  waitingFor: ActiveFormKind;
  title: string;
  accentColor: string;
  successTitle: string;
}

function metaForKind(kind: ActiveFormKind, instance: WorkflowInstanceProgress): CaseMeta {
  const inputForm = (instance.input_form as any) || {};
  switch (kind) {
    case 'user_input':
    case 'entity_selection':
      return {
        waitingFor: kind,
        title: inputForm.title || 'Acción Requerida',
        accentColor: '#2196f3',
        successTitle: 'Datos enviados exitosamente',
      };
    case 'catalog_selection':
      return {
        waitingFor: kind,
        title: inputForm.title || 'Selección de Catálogo Requerida',
        accentColor: '#4caf50',
        successTitle: 'Selección enviada exitosamente',
      };
    case 'selfie':
      return {
        waitingFor: kind,
        title: inputForm.title || 'Verificación de Identidad Requerida',
        accentColor: '#2196f3',
        successTitle: 'Selfie enviado exitosamente',
      };
    case 'id_capture':
      return {
        waitingFor: kind,
        title: inputForm.title || 'Captura de Documento Requerida',
        accentColor: '#9c27b0',
        successTitle: 'Documento enviado exitosamente',
      };
    case 'signature':
      return {
        waitingFor: kind,
        title: inputForm.title || 'Firma Digital Requerida',
        accentColor: '#9c27b0',
        successTitle: 'Firma enviada exitosamente',
      };
    case 'confirmation':
      return {
        waitingFor: kind,
        title: inputForm.title || 'Confirmación requerida',
        accentColor: '#1565c0',
        successTitle: 'Confirmación registrada exitosamente',
      };
    case 'assertion_review':
      return {
        waitingFor: kind,
        title: inputForm.title || 'Verificación Requerida',
        accentColor: '#ff6d00',
        successTitle: 'Verificación enviada exitosamente',
      };
  }
}

/**
 * Returns the kind of active form the instance is waiting on, or null when
 * there is nothing to render (the caller should hide the section).
 */
function resolveKind(instance: WorkflowInstanceProgress): ActiveFormKind | null {
  if (instance.status !== 'paused') return null;
  const waitingFor = instance.waiting_for as ActiveFormKind | undefined;
  if (!waitingFor) return null;
  const inputForm = (instance.input_form as any) || {};
  switch (waitingFor) {
    case 'user_input':
    case 'entity_selection':
      // Require the form schema actually carries fields/sections, matching the
      // historical condition in InstanceDetailContent (avoids flashing an empty
      // card while the backend is still propagating).
      if (!instance.input_form) return null;
      if (!inputForm.sections && !inputForm.fields) return null;
      return waitingFor;
    case 'catalog_selection':
      if (!instance.input_form) return null;
      return waitingFor;
    case 'selfie':
    case 'id_capture':
    case 'signature':
    case 'confirmation':
    case 'assertion_review':
      return waitingFor;
    default:
      return null;
  }
}

function renderBody(
  kind: ActiveFormKind,
  props: ActiveWorkflowFormProps
): React.ReactNode {
  const { instance, isSubmitting, isRewinding, profileValues, onSubmit, onRewind } =
    props;
  const inputForm = (instance.input_form as any) || {};

  switch (kind) {
    case 'user_input':
    case 'entity_selection': {
      const mapItemField = (it: any): any => ({
        id: it.name,
        name: it.name,
        label: it.label || it.name,
        type: it.type,
        required: !!it.required,
        placeholder: it.placeholder,
        validation: it.validation,
        accept: it.accept,
        multiple: it.multiple,
        helpText: it.helperText || it.helpText,
        options: it.options,
        show_if: it.show_if,
      });
      return (
        <DataCollectionForm
          title={inputForm.title || 'Proporcione la Información Requerida'}
          description={
            inputForm.description ||
            'Complete los siguientes campos para continuar con su trámite.'
          }
          initialValues={profileValues}
          sections={inputForm.sections}
          fields={inputForm.fields?.map((field: any) => ({
            id: field.name,
            name: field.name,
            label:
              field.label ||
              field.name.charAt(0).toUpperCase() + field.name.slice(1),
            type: field.type,
            required: field.required,
            placeholder: field.placeholder,
            validation: field.validation,
            helpText: field.helperText || field.helpText,
            accept: field.accept,
            multiple: field.multiple,
            options: field.options
              ? field.type === 'entity_select' || field.type === 'entity_multi_select'
                ? field.options
                : typeof field.options[0] === 'string'
                  ? field.options
                  : field.options.map((opt: any) => opt.value || opt)
              : undefined,
            entity_type: field.entity_type,
            min_count: field.min_count,
            max_count: field.max_count,
            description: field.description,
            item_fields: Array.isArray(field.item_fields)
              ? field.item_fields.map(mapItemField)
              : undefined,
            min_items: field.min_items,
            max_items: field.max_items,
            item_label_template: field.item_label_template,
            add_button_label: field.add_button_label,
            sum_field: field.sum_field,
            sum_equals: field.sum_equals,
          }))}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          submitButtonText="Enviar Información"
        />
      );
    }

    case 'catalog_selection':
      return (
        <CatalogSelector
          title={inputForm.title || 'Seleccione del Catálogo'}
          description={
            inputForm.description ||
            'Seleccione los elementos necesarios del catálogo para continuar.'
          }
          catalog_config={inputForm.catalog_config}
          validation_errors={inputForm.validation_errors || []}
          previous_input={inputForm.previous_input}
          onSubmit={onSubmit}
        />
      );

    case 'selfie':
      return (
        <SelfieCapture
          title={inputForm.title || 'Verificación de Identidad - Selfie'}
          description={
            inputForm.description || 'Toma una selfie para verificar tu identidad'
          }
          allowFileUpload={!!inputForm.allow_file_upload}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
        />
      );

    case 'id_capture':
      return (
        <IDCapture
          title={inputForm.title || 'Captura de Documento de Identidad'}
          description={
            inputForm.description ||
            'Captura ambos lados de tu documento de identidad'
          }
          allowFileUpload={!!inputForm.allow_file_upload}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
        />
      );

    case 'signature':
      return (
        <SigningForm
          instanceId={instance.instance_id}
          documentToSign={
            inputForm.signable_data ||
            inputForm.document_to_sign ||
            instance.input_form
          }
          operatorConfig={{
            task_id: inputForm.current_step_id || 'signature_step',
            certificate_field:
              inputForm.certificate_field || 'digital_signature_certificate',
            private_key_field:
              inputForm.private_key_field || 'digital_signature_private_key',
            password_field:
              inputForm.password_field || 'digital_signature_password',
            document_type: inputForm.document_type,
          }}
          onSubmitSignature={onSubmit}
          loading={isSubmitting}
        />
      );

    case 'confirmation':
      return (
        <ConfirmationReview
          title={inputForm.title || 'Confirmación y aceptación de términos'}
          description={inputForm.description}
          summarySections={inputForm.summary_sections || []}
          tosText={inputForm.tos_text || ''}
          declarations={inputForm.declarations || []}
          rewindableTaskIds={inputForm.rewindable_task_ids || []}
          locale={getCurrentLocale()}
          isSubmitting={isSubmitting}
          isRewinding={isRewinding}
          onSubmit={onSubmit}
          onRewind={onRewind}
        />
      );

    case 'assertion_review':
      return (
        <AssertionReview
          title={inputForm.title || 'Verificación de Datos'}
          description={
            inputForm.description ||
            'Revise y confirme los resultados de verificación'
          }
          assertions={inputForm.assertions || []}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
        />
      );
  }
}

function DefaultCard({
  slot,
  successFallback,
}: {
  slot: ActiveFormCardSlot;
  successFallback: string;
}): React.ReactElement {
  return (
    <section className="active-form-section">
      <div className="container">
        <div
          className="form-card action-required"
          style={{ borderColor: slot.accentColor }}
        >
          <h2>{slot.title}</h2>
          {slot.successMessage ? (
            <div className="success-message">
              <h4>{slot.successTitle}</h4>
              <p>{slot.successMessage || successFallback}</p>
              <p>Su solicitud continuará procesándose.</p>
            </div>
          ) : (
            slot.body
          )}
        </div>
      </div>
    </section>
  );
}

export const ActiveWorkflowForm: React.FC<ActiveWorkflowFormProps> = (props) => {
  const kind = resolveKind(props.instance);
  if (!kind) return null;

  const meta = metaForKind(kind, props.instance);
  const body = renderBody(kind, props);
  const slot: ActiveFormCardSlot = {
    body,
    waitingFor: meta.waitingFor,
    title: meta.title,
    accentColor: meta.accentColor,
    successTitle: meta.successTitle,
    successMessage: props.submissionSuccess,
  };

  if (props.renderCard) {
    return <>{props.renderCard(slot)}</>;
  }
  return <DefaultCard slot={slot} successFallback={meta.successTitle} />;
};

export default ActiveWorkflowForm;
