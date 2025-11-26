import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { workflowService, type WorkflowInstanceProgress } from '../services/workflowService';
import { Header } from '../components/Header';
import { DataCollectionForm } from '../components/DataCollectionForm';
import './InstanceDetail.css';

export const InstanceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();

  // State
  const [instance, setInstance] = useState<WorkflowInstanceProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isSubmittingData, setIsSubmittingData] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Load instance details
  useEffect(() => {
    if (id) {
      fetchProgress();
      // Auto-refresh every 10 seconds for active instances
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

      // Stop auto-refresh if instance is completed or failed
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

  const handleDataSubmission = async (data: Record<string, any>) => {
    if (!id || !instance) return;

    setIsSubmittingData(true);
    setError(null);

    try {
      // Check if this is entity selection data
      const waitingFor = (instance.input_form as any)?.waiting_for;
      const hasEntityFields = (instance.input_form as any)?.fields?.some((field: any) =>
        field.type === 'entity_select' || field.type === 'entity_multi_select'
      );
      const isEntitySelection = waitingFor === 'entity_selection' || hasEntityFields;

      console.log('Data submission debug:', {
        hasInputForm: !!instance.input_form,
        waitingFor,
        hasEntityFields,
        isEntitySelection,
        inputFormKeys: instance.input_form ? Object.keys(instance.input_form) : null,
        data
      });

      if (isEntitySelection) {
        // Handle entity selection submission
        const taskId = (instance.input_form as any)?.current_step_id || 'pick_required_documents';
        const selectionData = {
          [`${taskId}_selections`]: data
        };

        console.log('Entity selection submission:', {
          taskId,
          waitingFor,
          data,
          selectionData
        });

        const response = await workflowService.submitCitizenData(id, selectionData);

        if (response.success) {
          setSubmissionSuccess(response.message || 'Entity selections submitted successfully');
          // Refresh progress to get updated state
          setTimeout(() => {
            fetchProgress();
            setSubmissionSuccess(null);
          }, 2000);
        }
      } else {
        // Check if this looks like entity selection data (ends with _ids)
        const hasEntitySelections = Object.keys(data).some(key => key.endsWith('_ids'));

        if (hasEntitySelections) {
          // Transform entity selection data to expected backend format
          const taskId = (instance.input_form as any)?.current_step_id || 'pick_required_documents';
          const transformedSelections: Record<string, string[]> = {};

          Object.entries(data).forEach(([key, value]) => {
            if (key.endsWith('_ids') && value && key !== '_files') {
              // Transform 'licencias_ids' -> 'licencias_entities'
              const entityKey = key.replace('_ids', '_entities');
              // Ensure value is an array (backend expects arrays)
              transformedSelections[entityKey] = Array.isArray(value) ? value : [value];
            }
          });

          const selectionData = {
            [`${taskId}_selections`]: transformedSelections
          };

          console.log('Entity selection submission (transformed):', {
            taskId,
            originalData: data,
            transformedSelections,
            finalSelectionData: selectionData
          });

          const response = await workflowService.submitCitizenData(id, selectionData);

          if (response.success) {
            setSubmissionSuccess(response.message || 'Entity selections submitted successfully');
            // Refresh progress to get updated state
            setTimeout(() => {
              fetchProgress();
              setSubmissionSuccess(null);
            }, 2000);
          }
        } else {
          // Handle regular form submission with files
          const formData = new FormData();

          // Add regular form fields
          Object.entries(data).forEach(([key, value]) => {
            if (key !== '_files' && value !== undefined && value !== null) {
              formData.append(key, value.toString());
            }
          });

          // Add files
          if (data._files) {
            Object.entries(data._files).forEach(([key, file]) => {
              if (file instanceof File) {
                formData.append(key, file);
              }
            });
          }

          const response = await workflowService.submitCitizenData(id, formData);

          if (response.success) {
            setSubmissionSuccess(response.message);
            // Refresh progress to get updated state
            setTimeout(() => {
              fetchProgress();
              setSubmissionSuccess(null);
            }, 2000);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit data');
    } finally {
      setIsSubmittingData(false);
    }
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
      <Header
        variant="detail"
        showBackLink={true}
        backLinkTo="/applications"
        backLinkText={t('applications.title')}
      />

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

        {/* Active Form Section - Prominent Position */}
        {instance.status === 'paused' && instance.input_form &&
         (instance.waiting_for === 'user_input' || instance.waiting_for === 'entity_selection') &&
         ((instance.input_form as any).sections || (instance.input_form as any).fields) && (
          <section className="active-form-section">
            <div className="container">
              <div className="form-card action-required">
                <h2>Acción Requerida</h2>
                {submissionSuccess ? (
                  <div className="success-message">
                    <h4>Datos enviados exitosamente</h4>
                    <p>{submissionSuccess}</p>
                    <p>Su solicitud continuará procesándose.</p>
                  </div>
                ) : (
                  <>
                    <div className="requirement-notice">
                      <div className="requirement-icon">
                        <i className="icon-info"></i>
                      </div>
                      <div className="requirement-content">
                        <strong>Información Requerida</strong>
                        <p>Complete la siguiente información para continuar con el proceso.</p>
                      </div>
                    </div>

                    <DataCollectionForm
                      title={instance.input_form.title || 'Proporcione la Información Requerida'}
                      description={instance.input_form.description || 'Complete los siguientes campos para continuar con su trámite.'}
                      sections={(instance.input_form as any).sections}
                      fields={instance.input_form.fields?.map((field: any) => ({
                        id: field.name,
                        name: field.name,
                        label: field.label || field.name.charAt(0).toUpperCase() + field.name.slice(1),
                        type: field.type,
                        required: field.required,
                        placeholder: field.placeholder,
                        options: field.options ? (
                          // For entity_select/entity_multi_select, pass full EntityOption objects
                          field.type === 'entity_select' || field.type === 'entity_multi_select'
                            ? field.options  // Keep full EntityOption structure
                            : (
                              // For regular select fields, handle string/object arrays
                              typeof field.options[0] === 'string'
                                ? field.options
                                : field.options.map((opt: any) => opt.value || opt)
                            )
                        ) : undefined,
                        // Pass through entity-specific fields
                        entity_type: field.entity_type,
                        min_count: field.min_count,
                        max_count: field.max_count,
                        description: field.description
                      }))}
                      onSubmit={handleDataSubmission}
                      isSubmitting={isSubmittingData}
                      submitButtonText="Enviar Información"
                    />
                  </>
                )}
              </div>
            </div>
          </section>
        )}

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

export default InstanceDetail;