import { useCallback, useRef, useState } from 'react';
import { workflowService } from '../services/workflowService';
import type { WorkflowInstanceProgress } from '../services/workflowService';

export interface UseWorkflowFormSubmissionResult {
  isSubmitting: boolean;
  isRewinding: boolean;
  submissionSuccess: string | null;
  submissionError: string | null;
  submit: (data: Record<string, any>) => Promise<void>;
  rewind: (toTaskId: string) => Promise<void>;
  clearMessages: () => void;
}

export interface UseWorkflowFormSubmissionOptions {
  /** Called after a successful submit, before clearing the success message. */
  onAfterSubmit?: () => void;
  /** Called after a successful rewind, before clearing the success message. */
  onAfterRewind?: () => void;
  /** Milliseconds to keep the success banner visible. 0 disables auto-clear. Default 2000. */
  successAutoClearMs?: number;
  /** Milliseconds for the rewind banner. Default 1200. */
  rewindAutoClearMs?: number;
}

const DEFAULT_SUBMIT_CLEAR_MS = 2000;
const DEFAULT_REWIND_CLEAR_MS = 1200;

/**
 * Centraliza la lógica que decide cómo enviar `data` al backend según el
 * `waiting_for` del step actual. Reglas (primer match gana):
 *
 *   1. assertion_review     → submitCitizenData(id, { `${taskId}_input`: data })
 *   2. confirmation         → submitCitizenData(id, data)              (sin envoltura)
 *   3. data._use_json===true → submitCitizenData(id, data sin el flag) (rama catastro)
 *   4. entity_selection
 *      o hasEntityFields
 *      o keys con `_ids`    → submitCitizenData(id, { `${taskId}_selections`: ... })
 *   5. default              → submitCitizenData(id, FormData con `_files`)
 */
export function useWorkflowFormSubmission(
  instanceId: string | undefined,
  instance: WorkflowInstanceProgress | null,
  options: UseWorkflowFormSubmissionOptions = {}
): UseWorkflowFormSubmissionResult {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRewinding, setIsRewinding] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Keep latest callbacks/instance in refs so the returned `submit`/`rewind`
  // are stable across renders (avoids re-binding form handlers).
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const instanceRef = useRef(instance);
  instanceRef.current = instance;

  const successMs = options.successAutoClearMs ?? DEFAULT_SUBMIT_CLEAR_MS;
  const rewindMs = options.rewindAutoClearMs ?? DEFAULT_REWIND_CLEAR_MS;

  const clearMessages = useCallback(() => {
    setSubmissionSuccess(null);
    setSubmissionError(null);
  }, []);

  const submit = useCallback(
    async (data: Record<string, any>) => {
      const id = instanceId;
      const inst = instanceRef.current;
      if (!id || !inst) return;

      setIsSubmitting(true);
      setSubmissionError(null);

      try {
        const inputForm = (inst.input_form as any) || {};
        const waitingFor = inst.waiting_for || inputForm.waiting_for;
        const taskId =
          inputForm.current_step_id || inst.current_step || 'current_step';

        const hasEntityFields =
          Array.isArray(inputForm.fields) &&
          inputForm.fields.some(
            (field: any) =>
              field?.type === 'entity_select' || field?.type === 'entity_multi_select'
          );

        const useJsonFlag = (data as any)?._use_json === true;

        let response;
        let defaultMessage = 'Datos enviados exitosamente';

        if (waitingFor === 'assertion_review') {
          defaultMessage = 'Verificación enviada exitosamente';
          response = await workflowService.submitCitizenData(id, {
            [`${taskId}_input`]: data,
          });
        } else if (waitingFor === 'confirmation') {
          defaultMessage = 'Confirmación registrada exitosamente';
          response = await workflowService.submitCitizenData(id, data);
        } else if (useJsonFlag) {
          const { _use_json: _ignored, ...rest } = data as Record<string, any>;
          response = await workflowService.submitCitizenData(id, rest);
        } else if (waitingFor === 'entity_selection' || hasEntityFields) {
          defaultMessage = 'Selecciones enviadas exitosamente';
          response = await workflowService.submitCitizenData(id, {
            [`${taskId}_selections`]: data,
          });
        } else {
          const hasEntitySelections = Object.keys(data).some((key) =>
            key.endsWith('_ids')
          );

          if (hasEntitySelections) {
            defaultMessage = 'Selecciones enviadas exitosamente';
            const transformedSelections: Record<string, string[]> = {};
            Object.entries(data).forEach(([key, value]) => {
              if (key.endsWith('_ids') && value && key !== '_files') {
                const entityKey = key.replace('_ids', '_entities');
                transformedSelections[entityKey] = Array.isArray(value)
                  ? value
                  : [value];
              }
            });
            response = await workflowService.submitCitizenData(id, {
              [`${taskId}_selections`]: transformedSelections,
            });
          } else {
            const formData = new FormData();
            Object.entries(data).forEach(([key, value]) => {
              if (key === '_files' || value === undefined || value === null) return;
              const stringValue =
                typeof value === 'object' ? JSON.stringify(value) : value.toString();
              formData.append(key, stringValue);
            });
            if (data._files) {
              Object.entries(data._files).forEach(([key, file]) => {
                if (file instanceof File) {
                  formData.append(key, file);
                }
              });
            }
            response = await workflowService.submitCitizenData(id, formData);
          }
        }

        if (response?.success) {
          setSubmissionSuccess(response.message || defaultMessage);
          optionsRef.current.onAfterSubmit?.();
          if (successMs > 0) {
            window.setTimeout(() => setSubmissionSuccess(null), successMs);
          }
        }
      } catch (err) {
        setSubmissionError(
          err instanceof Error ? err.message : 'Failed to submit data'
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [instanceId, successMs]
  );

  const rewind = useCallback(
    async (toTaskId: string) => {
      const id = instanceId;
      const inst = instanceRef.current;
      if (!id || !inst) return;

      setIsRewinding(true);
      setSubmissionError(null);

      try {
        await workflowService.rewindInstanceToTask(id, toTaskId);
        setSubmissionSuccess(
          'Volviendo al paso seleccionado para que pueda editar...'
        );
        optionsRef.current.onAfterRewind?.();
        if (rewindMs > 0) {
          window.setTimeout(() => setSubmissionSuccess(null), rewindMs);
        }
      } catch (err) {
        setSubmissionError(
          err instanceof Error
            ? err.message
            : 'No fue posible regresar al paso seleccionado'
        );
      } finally {
        setIsRewinding(false);
      }
    },
    [instanceId, rewindMs]
  );

  return {
    isSubmitting,
    isRewinding,
    submissionSuccess,
    submissionError,
    submit,
    rewind,
    clearMessages,
  };
}

export default useWorkflowFormSubmission;
