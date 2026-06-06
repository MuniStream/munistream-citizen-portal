import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { workflowService, type WorkflowInstanceProgress } from '../../services/workflowService';
import { profileService } from '../../services/profileService';
import { ActiveWorkflowForm } from '../ActiveWorkflowForm';
import { useWorkflowFormSubmission } from '../../hooks/useWorkflowFormSubmission';
import '../../pages/InstanceDetail.css';

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#4caf50';
      case 'in_progress':
      case 'running': return '#2196f3';
      case 'failed': return '#f44336';
      case 'waiting': return '#ff9800';
      case 'pending': return '#9e9e9e';
      default: return '#757575';
    }
  };

  const getStepStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return 'Completado';
      case 'in_progress': return 'En Progreso';
      case 'running': return 'En Progreso';
      case 'waiting': return 'Esperando';
      case 'failed': return 'Error';
      case 'pending': return 'Pendiente';
      default: return 'Pendiente';
    }
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

  return (
    <div className="instance-detail-container">
      <main className="instance-detail-main">
        {/* Instance Header */}
        <section className="instance-header">
          <div className="container">
            <div className="instance-id">ID: {id.slice(0, 8)}...</div>
            <h1 className="instance-title">{instance.workflow_name}</h1>

            <p className="instance-description">
              Estado de la solicitud: <strong style={{ color: getStatusColor(instance.status) }}>
                {getStepStatusIcon(instance.status)}
              </strong>.
              {instance.progress_percentage === 100
                ? ' Felicitaciones, su trámite ha sido completado.'
                : ` Progreso: ${instance.progress_percentage.toFixed(0)}% completado.`
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
                  <span>Iniciado</span>
                  <span>{instance.progress_percentage.toFixed(1)}% Completado</span>
                  <span>Finalizado</span>
                </div>
              </div>
            </div>

            <div className="instance-meta">
              <span className="meta-item">
                <i className="icon-steps"></i>
                Progreso: {instance.completed_steps} de {instance.total_steps} pasos
              </span>
              <span className="meta-item">
                <i className="icon-calendar"></i>
                Iniciado: {formatDate(instance.created_at)}
              </span>
              <span className="meta-item">
                <i className="icon-update"></i>
                Última actualización: {lastUpdated.toLocaleTimeString()}
              </span>
            </div>

            <div className="instance-actions">
              <button
                className="btn-refresh"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                {isLoading ? 'Actualizando...' : 'Actualizar'}
              </button>
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

        {/* Steps Timeline */}
        <section className="steps-timeline-section">
          <div className="container">
            <h2>Progreso del Trámite</h2>

            <div className="timeline">
              {instance.step_progress.map((step, index) => (
                <div key={step.step_id} className={`timeline-item ${step.status}`}>
                  <div className="timeline-marker">
                    <span
                      className="marker-number"
                      style={{ backgroundColor: getStatusColor(step.status) }}
                    >
                      {index + 1}
                    </span>
                    {index < instance.step_progress.length - 1 && (
                      <div className="timeline-line" />
                    )}
                  </div>

                  <div className="timeline-content">
                    <div className="step-header">
                      <h3>{step.name}</h3>
                      <span
                        className="step-status"
                        style={{
                          backgroundColor: getStatusColor(step.status),
                          color: 'white',
                          padding: '0.3rem 0.8rem',
                          borderRadius: '4px',
                          fontSize: '0.8rem'
                        }}
                      >
                        {getStepStatusIcon(step.status)}
                      </span>
                    </div>

                    <p className="step-description">{step.description}</p>

                    <div className="step-details">
                      {step.started_at && (
                        <span className="step-time">
                          <i className="icon-clock"></i>
                          Iniciado: {formatDate(step.started_at)}
                        </span>
                      )}
                      {step.completed_at && (
                        <span className="step-time">
                          <i className="icon-check"></i>
                          Completado: {formatDate(step.completed_at)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Current Status */}
        {instance.current_step && !instance.requires_input && (
          <section className="current-status-section">
            <div className="container">
              <div className="status-card">
                <h2>Paso Actual</h2>
                <div className="current-step">
                  <div className="step-icon">
                    <i className="icon-processing"></i>
                  </div>
                  <div className="step-info">
                    <strong>Procesando: {instance.current_step}</strong>
                    <p>Su solicitud está siendo procesada. La información se actualizará automáticamente.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};
