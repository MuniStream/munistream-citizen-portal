import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { workflowService, type WorkflowInstanceProgress } from '../../services/workflowService';
import { profileService } from '../../services/profileService';
import { ActiveWorkflowForm } from '../ActiveWorkflowForm';
import { useWorkflowFormSubmission } from '../../hooks/useWorkflowFormSubmission';
import StepTimeline from './StepTimeline';
import EmittedEntitiesSection from './EmittedEntitiesSection';
import { getStatusColor, statusI18nKey, isDoneStatus } from './statusHelpers';
import '../../pages/InstanceDetail.css';

// A citizen form is only rendered when paused on a form-kind wait with its
// schema present (mirrors ActiveWorkflowForm.resolveKind). The backend sets
// requires_input=true even for admin / child_workflow_completion waits with no
// form, so the processing indicator must gate on "no form shown", not on
// requires_input.
const FORM_WAITS = ['user_input', 'entity_selection', 'catalog_selection', 'selfie', 'id_capture', 'signature', 'confirmation', 'assertion_review'];
const hasActiveFormFor = (instance: WorkflowInstanceProgress | null): boolean => {
  if (!instance || instance.status !== 'paused') return false;
  const wf = instance.waiting_for || '';
  if (!FORM_WAITS.includes(wf)) return false;
  const form = (instance.input_form as any) || null;
  const needsSchema = ['user_input', 'entity_selection', 'catalog_selection'].includes(wf);
  const hasSchema = !!form && (form.sections || form.fields || wf === 'catalog_selection');
  return !needsSchema || hasSchema;
};
const isAdminReviewFor = (instance: WorkflowInstanceProgress | null): boolean =>
  !!instance &&
  (instance.waiting_for === 'child_workflow_completion' || (instance.waiting_for || '').includes('admin'));

export const InstanceDetailContent: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();

  const [instance, setInstance] = useState<WorkflowInstanceProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [profileValues, setProfileValues] = useState<Record<string, any>>({});

  const {
    isSubmitting: isSubmittingData,
    isRewinding,
    submissionSuccess,
    submissionError,
    submit: handleDataSubmission,
    rewind: handleRewindToTask,
  } = useWorkflowFormSubmission(id, instance, {
    onAfterSubmit: () => fetchProgress(),
    onAfterRewind: () => fetchProgress(),
  });

  // Surface hook submission errors through the existing `error` UI.
  useEffect(() => {
    if (submissionError) setError(submissionError);
  }, [submissionError]);

  useEffect(() => {
    profileService
      .getProfile()
      .then((p) => setProfileValues((p.data as Record<string, any>) || {}))
      .catch(() => setProfileValues({}));
  }, []);

  useEffect(() => {
    if (id) {
      fetchProgress();
      const interval = setInterval(() => {
        fetchProgress(true);
      }, 10000);
      setRefreshInterval(interval);

      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [id]);

  // Fast background refresh while processing between steps (no form rendered,
  // not done, not the long admin review) so the next step's UI appears on its
  // own without pressing Refresh.
  useEffect(() => {
    if (!id || !instance) return;
    if (isDoneStatus(instance.status) || hasActiveFormFor(instance) || isAdminReviewFor(instance)) return;
    const t = setInterval(() => fetchProgress(true), 2500);
    return () => clearInterval(t);
  }, [id, instance?.status, instance?.waiting_for, instance?.input_form]);

  const fetchProgress = async (silent: boolean = false) => {
    if (!id) return;

    try {
      if (!silent) setIsLoading(true);
      setError(null);
      const progressData = await workflowService.trackWorkflowInstance(id);
      setInstance(progressData);
      setLastUpdated(new Date());

      if ((progressData.status === 'completed' || progressData.status === 'failed') && refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Failed to load instance');
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    setIsLoading(true);
    fetchProgress();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (!id) {
    return (
      <div className="instance-detail-container">
        <div className="error-state">
          <h2>ID de Seguimiento Inválido</h2>
          <p>El ID de seguimiento proporcionado no es válido.</p>
        </div>
      </div>
    );
  }

  if (isLoading && !instance) {
    return (
      <div className="instance-detail-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error && !instance) {
    return (
      <div className="instance-detail-container">
        <div className="error-state">
          <h2>Error de Seguimiento</h2>
          <p>{error}</p>
          <button onClick={handleRefresh} className="btn-primary">
            {t('common.retry')}
          </button>
        </div>
      </div>
    );
  }

  if (!instance) {
    return (
      <div className="instance-detail-container">
        <div className="error-state">
          <h2>Solicitud No Encontrada</h2>
          <p>No se encontró ninguna solicitud con este ID de seguimiento.</p>
        </div>
      </div>
    );
  }

  const isDone = isDoneStatus(instance.status);
  const isCompleted = instance.status === 'completed';
  // Show the processing indicator when the trámite is active but no citizen form
  // is being rendered (between operators, or under admin review).
  const hasActiveForm = hasActiveFormFor(instance);
  const waitingForAdmin = isAdminReviewFor(instance);
  const showProcessing = !isDone && !hasActiveForm;
  const emittedEntities = instance.emitted_entities || [];

  return (
    <div className="instance-detail-container">
      <main className="instance-detail-main">
        {/* Instance Header */}
        <section className="instance-header">
          <div className="container">
            <div className="instance-id">{t('instances.instanceId')}: {id.slice(0, 8)}...</div>
            <h1 className="instance-title">{instance.workflow_name}</h1>

            <p className="instance-description">
              {t('instanceDetail.statusLabel')}:{' '}
              <strong style={{ color: getStatusColor(instance.status) }}>
                {t(statusI18nKey(instance.status))}
              </strong>.
              {isCompleted
                ? ` ${t('instanceDetail.completedMessage')}`
                : ` ${t('instanceDetail.progressMessage', { percent: instance.progress_percentage.toFixed(0) })}`
              }
            </p>

            <div className="instance-status-bar">
              <div className="progress-indicator">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${instance.progress_percentage}%`,
                      backgroundColor: getStatusColor(instance.status)
                    }}
                  />
                </div>
                <div className="progress-labels">
                  <span>{t('instanceDetail.started')}</span>
                  <span>{instance.progress_percentage.toFixed(0)}% {t('workflow.complete')}</span>
                  <span>{t('instanceDetail.finished')}</span>
                </div>
              </div>
            </div>

            <div className="instance-meta">
              <span className="meta-item">
                <i className="icon-steps"></i>
                {t('instanceDetail.stepsProgress', { completed: instance.completed_steps, total: instance.total_steps })}
              </span>
              <span className="meta-item">
                <i className="icon-calendar"></i>
                {t('workflow.started')}: {formatDate(instance.created_at)}
              </span>
              <span className="meta-item">
                <i className="icon-update"></i>
                {t('workflow.last_updated')}: {lastUpdated.toLocaleTimeString()}
              </span>
            </div>

            <div className="instance-actions">
              {!isDone ? (
                <button
                  className="btn-refresh"
                  onClick={handleRefresh}
                  disabled={isLoading}
                >
                  {isLoading ? t('instanceDetail.refreshing') : t('common.refresh')}
                </button>
              ) : (
                <span className="instance-finished-note">
                  <i className="icon-check"></i>
                  {instance.completed_at
                    ? t('instanceDetail.finishedOn', { date: formatDate(instance.completed_at) })
                    : t('instanceDetail.finishedNote')}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Active form section — dispatcher for all waiting_for cases */}
        <ActiveWorkflowForm
          instance={instance}
          isSubmitting={isSubmittingData}
          isRewinding={isRewinding}
          submissionSuccess={submissionSuccess}
          profileValues={profileValues}
          onSubmit={handleDataSubmission}
          onRewind={handleRewindToTask}
        />

        {/* Emitted entity(ies) shown inline once the trámite concludes */}
        {isDone && emittedEntities.length > 0 && (
          <EmittedEntitiesSection entities={emittedEntities} />
        )}

        {/* Admin review notice (static; no live timer) */}
        {showProcessing && waitingForAdmin && (
          <section className="current-status-section">
            <div className="container">
              <div className="status-card review">
                <h2>{t('instanceDetail.underReviewTitle')}</h2>
                <div className="review-details">
                  <p>{t('instanceDetail.underReviewBody')}</p>
                  <p><strong>{t('instanceDetail.folio')}:</strong> <code>{id}</code></p>
                  <p><strong>{t('instanceDetail.resolutionTime')}:</strong> {t('instanceDetail.resolutionTimeValue')}</p>
                  <p className="review-hint">{t('instanceDetail.underReviewHint')}</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Processing between steps: spinner + background auto-refresh */}
        {showProcessing && !waitingForAdmin && (
          <section className="current-status-section">
            <div className="container">
              <div className="processing-card" role="status" aria-live="polite">
                <div className="spinner" aria-hidden="true"></div>
                <div>
                  <strong>{t('instanceDetail.processingTitle')}</strong>
                  <p>{t('instanceDetail.processingBody')}</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Steps Timeline — branch-aware, grouped by phase */}
        <StepTimeline
          steps={instance.step_progress}
          routeLabel={instance.route_label}
          currentStepId={instance.current_step}
          formatDate={formatDate}
        />
      </main>
    </div>
  );
};
