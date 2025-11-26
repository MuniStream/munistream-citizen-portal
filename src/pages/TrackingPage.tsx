import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { workflowService, type WorkflowInstanceProgress } from '../services/workflowService';
import { Header } from '../components/Header';
import { DataCollectionForm } from '../components/DataCollectionForm';

export const TrackingPage: React.FC = () => {
  const { instanceId } = useParams<{ instanceId: string }>();
  const { t } = useTranslation();
  
  const [progress, setProgress] = useState<WorkflowInstanceProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isSubmittingData, setIsSubmittingData] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(null);

  const fetchProgress = async () => {
    if (!instanceId) return;
    
    try {
      setError(null);
      const progressData = await workflowService.trackWorkflowInstance(instanceId);
      setProgress(progressData);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch progress');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchProgress, 30000);
    return () => clearInterval(interval);
  }, [instanceId]);


  const handleRefresh = () => {
    setIsLoading(true);
    fetchProgress();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#28a745';
      case 'failed': return '#dc3545';
      case 'running': return '#2c5aa0';
      case 'in_progress': return '#2c5aa0';
      case 'waiting': return '#ffc107';
      case 'paused': return '#ffc107';
      default: return '#6c757d';
    }
  };

  const getStepStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'in_progress': return '🔄';
      case 'running': return '🔄';
      case 'waiting': return '⏸️';
      case 'failed': return '❌';
      case 'pending': return '⏳';
      default: return '⏳';
    }
  };

  const handleDataSubmission = async (data: Record<string, any>) => {
    if (!instanceId) return;

    setIsSubmittingData(true);
    setError(null);

    try {
      // Check if this is entity selection data
      const waitingFor = (progress?.input_form as any)?.waiting_for;
      const isEntitySelection = waitingFor === 'entity_selection';

      if (isEntitySelection) {
        // Handle entity selection submission
        const taskId = (progress?.input_form as any)?.current_step_id || 'pick_required_documents';
        const selectionData = {
          [`${taskId}_selections`]: data
        };

        const response = await workflowService.submitCitizenData(instanceId, selectionData);

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

        const response = await workflowService.submitCitizenData(instanceId, formData);

        if (response.success) {
          setSubmissionSuccess(response.message);
          // Refresh progress to get updated state
          setTimeout(() => {
            fetchProgress();
            setSubmissionSuccess(null);
          }, 2000);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit data');
    } finally {
      setIsSubmittingData(false);
    }
  };

  if (!instanceId) {
    return (
      <div className="workflow-detail">
        <div className="error-state">
          <h2>{t('workflow.invalid_tracking_id')}</h2>
          <p>The tracking ID provided is not valid.</p>
          <Link to="/services" className="btn-primary">{t('workflows.title')}</Link>
        </div>
      </div>
    );
  }

  if (isLoading && !progress) {
    return (
      <div className="workflow-detail">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error && !progress) {
    return (
      <div className="workflow-detail">
        <div className="error-state">
          <h2>Tracking Error</h2>
          <p>{error}</p>
          <button onClick={handleRefresh} className="btn-primary">{t('common.retry')}</button>
        </div>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="workflow-detail">
        <div className="error-state">
          <h2>Application Not Found</h2>
          <p>No application found with this tracking ID.</p>
          <Link to="/services" className="btn-primary">{t('workflows.title')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="workflow-detail">
      <Header
        variant="detail"
        showBackLink={true}
        backLinkTo="/services"
        backLinkText={t('workflows.title')}
      />

      <main className="detail-main">
        <div className="container">
          {/* Breadcrumb */}
          <nav className="breadcrumb">
            <Link to="/services">{t('workflows.title')}</Link>
            <span>›</span>
            <span>{t('workflow.track_application')}</span>
          </nav>

          {/* Application Status Header */}
          <section className="service-header">
            <div className="service-info">
              <span className="category-badge">{t('workflow.instance_id')}: {instanceId.slice(0, 8)}...</span>
              <h2>📊 {progress.workflow_name}</h2>
              <p className="description">
                {t('workflow.application_status_message')} <strong style={{ color: getStatusColor(progress.status) }}>
                  {t(`status.${progress.status}`)}
                </strong>. 
                {progress.progress_percentage === 100 
                  ? t('workflow.congratulations_completed')
                  : t('workflow.progress_percentage_message', { percentage: progress.progress_percentage.toFixed(0) })
                }
              </p>
              
              <div className="service-meta">
                <div className="meta-item">
                  <span className="label">{t('workflow.progress')}:</span>
                  <span className="value">{progress.completed_steps} of {progress.total_steps} {t('common.steps')}</span>
                </div>
                <div className="meta-item">
                  <span className="label">{t('workflow.started')}:</span>
                  <span className="value">{new Date(progress.created_at).toLocaleDateString()}</span>
                </div>
                <div className="meta-item">
                  <span className="label">{t('workflow.last_updated')}:</span>
                  <span className="value">{lastUpdated.toLocaleTimeString()}</span>
                </div>
              </div>
            </div>

            <div className="service-actions">
              <button 
                className="btn-primary large"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                {isLoading ? t('common.loading') : `🔄 ${t('common.refresh')}`}
              </button>
              
              <p className="auth-note">
                {t('workflow.auto_refresh_message')}
              </p>
            </div>
          </section>

          {/* Progress Bar */}
          <section className="requirements-section">
            <h3>📈 {t('workflow.progress')}</h3>
            <div className="progress-container" style={{ marginBottom: '1rem' }}>
              <div className="progress-bar" style={{
                width: '100%',
                height: '20px',
                backgroundColor: '#e1e5e9',
                borderRadius: '10px',
                overflow: 'hidden'
              }}>
                <div 
                  className="progress-fill" 
                  style={{
                    width: `${progress.progress_percentage}%`,
                    height: '100%',
                    backgroundColor: getStatusColor(progress.status),
                    transition: 'width 0.3s ease',
                    borderRadius: '10px'
                  }}
                />
              </div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                marginTop: '0.5rem',
                fontSize: '0.9rem',
                color: '#666'
              }}>
                <span>{t('workflow.started')}</span>
                <span>{progress.progress_percentage.toFixed(1)}% {t('workflow.complete')}</span>
                <span>{t('workflow.finished')}</span>
              </div>
            </div>
          </section>

          {/* Data Collection Section - Prominent Position */}
          {progress.status === 'paused' && progress.input_form &&
           (progress.waiting_for === 'user_input' || progress.waiting_for === 'entity_selection') &&
           ((progress.input_form as any).sections || (progress.input_form as any).fields) && (
            <section className="requirements-section" style={{
              backgroundColor: '#fff3cd',
              border: '2px solid #ffc107',
              borderRadius: '8px',
              padding: '1.5rem',
              marginBottom: '2rem',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}>
              <h3 style={{ color: '#856404', marginBottom: '1rem' }}>🚨 {t('workflow.action_required')}</h3>
              {submissionSuccess ? (
                <div className="success-message">
                  <h4>✅ {t('workflow.data_submitted_successfully')}</h4>
                  <p>{submissionSuccess}</p>
                  <p>{t('workflow.application_continue_message')}</p>
                </div>
              ) : (
                <>
                  <div className="requirement-item" style={{
                    backgroundColor: '#fff',
                    padding: '1rem',
                    borderRadius: '6px',
                    marginBottom: '1.5rem',
                    border: '1px solid #ffc107'
                  }}>
                    <span className="check">📋</span>
                    <div>
                      <strong style={{ color: '#856404' }}>{t('workflow.information_required')}</strong>
                      <p>{t('workflow.provide_information_message')}</p>
                    </div>
                  </div>
                  
                  <DataCollectionForm
                    title={progress.input_form.title || t('workflow.provide_required_info_title')}
                    description={progress.input_form.description || t('workflow.provide_required_info_desc')}
                    sections={(progress.input_form as any).sections}
                    fields={progress.input_form.fields?.map((field: any) => ({
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
                    submitButtonText={t('common.submit_information')}
                  />
                </>
              )}
            </section>
          )}

          {/* Step Progress */}
          <section className="steps-section">
            <h3>🔄 {t('workflow.step_progress')}</h3>
            <div className="steps-timeline">
              {progress.step_progress.map((step) => (
                <div key={step.step_id} className="step-item">
                  <div 
                    className="step-number" 
                    style={{ 
                      backgroundColor: step.status === 'completed' ? '#28a745' : 
                                     step.status === 'in_progress' ? '#2c5aa0' :
                                     step.status === 'failed' ? '#dc3545' : '#6c757d'
                    }}
                  >
                    {getStepStatusIcon(step.status)}
                  </div>
                  <div className="step-content">
                    <h4>{step.name}</h4>
                    <p>{step.description}</p>
                    
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.5rem' }}>
                      <span 
                        className="step-duration"
                        style={{ 
                          backgroundColor: getStatusColor(step.status),
                          color: 'white',
                          padding: '0.3rem 0.8rem'
                        }}
                      >
                        {step.status.replace('_', ' ').toUpperCase()}
                      </span>
                      
                      {step.started_at && (
                        <span style={{ fontSize: '0.9rem', color: '#666' }}>
                          ⏰ {t('workflow.started')}: {new Date(step.started_at).toLocaleString()}
                        </span>
                      )}
                      
                      {step.completed_at && (
                        <span style={{ fontSize: '0.9rem', color: '#666' }}>
                          ✅ {t('workflow.completed')}: {new Date(step.completed_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>


          {/* Current Status */}
          {progress.current_step && !progress.requires_input && (
            <section className="requirements-section">
              <h3>🎯 {t('workflow.current_step')}</h3>
              <div className="requirement-item">
                <span className="check">▶️</span>
                <div>
                  <strong>{t('workflow.now_processing')}: {progress.current_step}</strong>
                  <p>{t('workflow.application_processing_message')}</p>
                </div>
              </div>
            </section>
          )}

          {/* Help Section */}
          <section className="help-section">
            <h3>❓ {t('workflow.need_help')}</h3>
            <div className="help-grid">
              <div className="help-card">
                <h4>📞 {t('common.contact_support')}</h4>
                <p>{t('workflow.questions_about_application')}</p>
                <span className="phone">(555) 123-4567</span>
                <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                  {t('workflow.reference_id')}: {instanceId.slice(0, 8)}
                </p>
              </div>
              <div className="help-card">
                <h4>📧 {t('workflow.email_updates')}</h4>
                <p>{t('workflow.get_progress_notifications')}</p>
                <button className="btn-secondary">{t('workflow.subscribe')}</button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};