import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { workflowService, type WorkflowDefinition } from '../services/workflowService';
import { MainLayout } from '../components/Layout/MainLayout';

export const WorkflowStartPage: React.FC = () => {
  const { workflowId } = useParams<{ workflowId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [workflow, setWorkflow] = useState<WorkflowDefinition | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    if (!workflowId) {
      setError(t('workflowStart.workflowIdRequired'));
      setIsLoading(false);
      return;
    }

    const fetchWorkflow = async () => {
      try {
        const workflowData = await workflowService.getWorkflowById(workflowId);
        setWorkflow(workflowData);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('workflowStart.loadFailed'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkflow();
  }, [workflowId]);

  const handleStartWorkflow = async () => {
    if (!workflow) return;
    
    setIsStarting(true);
    try {
      const instance = await workflowService.startWorkflow(workflow.id);
      
      // Show success message and redirect
      alert(`${t('workflow.started_successfully')} ${t('workflow.instance_id')}: ${instance.instance_id}`);
      navigate(`/instances/${instance.instance_id}`);
    } catch (err) {
      alert(`${t('common.error')}: ${err instanceof Error ? err.message : t('workflowStart.startFailed')}`);
    } finally {
      setIsStarting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="workflow-detail">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !workflow) {
    return (
      <div className="workflow-detail">
        <div className="error-state">
          <h2>{t('workflowStart.notFoundTitle')}</h2>
          <p>{error || t('workflowStart.notFoundBody')}</p>
          <Link to="/services" className="btn-primary">{t('workflows.title')}</Link>
        </div>
      </div>
    );
  }

  return (
    <MainLayout headerProps={{ variant: 'detail', showBackLink: true, backLinkTo: '/services', backLinkText: t('workflows.title') }}>
      <div className="workflow-detail">

      <main className="detail-main">
        <div className="container">
          {/* Breadcrumb */}
          <nav className="breadcrumb">
            <Link to="/services">{t('workflows.title')}</Link>
            <span>›</span>
            <Link to={`/services/${workflow.id}`}>{workflow.name}</Link>
            <span>›</span>
            <span>{t('workflows.startApplication')}</span>
          </nav>

          {/* Application Start Header */}
          <section className="service-header">
            <div className="service-info">
              <span className="category-badge">{workflow.category}</span>
              <h2>{t('workflow.start_title')}: {workflow.name}</h2>
              <p className="description">
                {t('workflowStart.intro', { name: workflow.name })}
              </p>
            </div>

            <div className="service-actions">
              <button 
                className="btn-primary large"
                onClick={() => setShowConfirmDialog(true)}
                disabled={!workflow.isActive || isStarting}
              >
                {isStarting ? t('workflow.starting') : t('workflows.startApplication')}
              </button>
              
              <p className="auth-note">
                {t('workflowStart.authNote', { duration: workflow.estimatedDuration })}
              </p>
            </div>
          </section>

          {/* Important Notice */}
          <section className="requirements-section">
            <h3>📋 {t('workflowStart.beforeYouStart')}</h3>
            <div className="requirements-list">
              <div className="requirement-item">
                <span className="check">💡</span>
                <div>
                  <strong>{t('workflowStart.noAccountTitle')}</strong>
                  <p>{t('workflowStart.noAccountBody')}</p>
                </div>
              </div>
              <div className="requirement-item">
                <span className="check">⏱️</span>
                <div>
                  <strong>{t('workflowStart.estimatedTimeTitle')}</strong>
                  <p>{t('workflowStart.estimatedTimeBody', { duration: workflow.estimatedDuration })}</p>
                </div>
              </div>
              <div className="requirement-item">
                <span className="check">📄</span>
                <div>
                  <strong>{t('workflowStart.prepareDocsTitle')}</strong>
                  <p>{t('workflowStart.prepareDocsBody')}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Requirements */}
          {workflow.requirements.length > 0 && (
            <section className="requirements-section">
              <h3>✅ {t('workflows.documentsRequired')}</h3>
              <div className="requirements-list">
                {workflow.requirements.map((requirement: any, index: number) => (
                  <div key={index} className="requirement-item">
                    <span className="check">✓</span>
                    <span>{requirement}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Process Preview */}
          <section className="steps-section">
            <h3>🔄 {t('workflows.process')} ({workflow.steps.length} {t('common.steps')})</h3>
            <div className="steps-timeline">
              {workflow.steps.slice(0, 6).map((step: any, index: number) => (
                <div key={step.id} className="step-item">
                  <div className="step-number">{index + 1}</div>
                  <div className="step-content">
                    <h4>{step.name}</h4>
                    <p>{step.description}</p>
                    {step.estimatedDuration && (
                      <span className="step-duration">⏱️ {step.estimatedDuration}</span>
                    )}
                  </div>
                </div>
              ))}
              {workflow.steps.length > 6 && (
                <div className="step-item">
                  <div className="step-number">...</div>
                  <div className="step-content">
                    <h4>{t('workflow.and_more_steps', { count: workflow.steps.length - 6 })}</h4>
                    <p>{t('workflowStart.completeDetailsNote')}</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Help Section */}
          <section className="help-section">
            <h3>❓ {t('workflow.need_help')}</h3>
            <div className="help-grid">
              <div className="help-card">
                <h4>📞 {t('common.contact_support')}</h4>
                <p>{t('workflowStart.callAssistance')}</p>
                <span className="phone">(555) 123-4567</span>
              </div>
              <div className="help-card">
                <h4>📧 {t('workflowStart.emailSupport')}</h4>
                <p>{t('workflowStart.sendQuestionsEmail')}</p>
                <span className="email">support@munistream.com</span>
              </div>
              <div className="help-card">
                <h4>💬 {t('workflowStart.liveChat')}</h4>
                <p>{t('workflowStart.chatWithTeam')}</p>
                <button className="btn-secondary">{t('workflowStart.startChat')}</button>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="dialog-overlay" onClick={() => setShowConfirmDialog(false)}>
          <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
            <h3>🚀 {t('workflowStart.readyToStart')}</h3>
            <p>
              {t('workflowStart.readyToStartBody', { name: workflow.name })}
            </p>
            <div className="dialog-meta">
              <div className="meta-item">
                <span className="label">{t('workflows.process')}:</span>
                <span className="value">{workflow.steps.length} {t('common.steps')}</span>
              </div>
              <div className="meta-item">
                <span className="label">{t('workflows.estimatedTime')}:</span>
                <span className="value">{workflow.estimatedDuration}</span>
              </div>
              <div className="meta-item">
                <span className="label">{t('applications.status')}:</span>
                <span className="value">✅ {t('workflowStart.readyStatus')}</span>
              </div>
            </div>
            <p>
              <strong>💡 {t('workflowStart.important')}:</strong> {t('workflowStart.saveTrackingNote')}
            </p>
            <div className="dialog-actions">
              <button 
                className="btn-secondary" 
                onClick={() => setShowConfirmDialog(false)}
                disabled={isStarting}
              >
                {t('common.cancel')}
              </button>
              <button 
                className="btn-primary" 
                onClick={handleStartWorkflow}
                disabled={isStarting}
              >
                {isStarting ? t('workflow.starting') : t('workflows.startApplication')}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </MainLayout>
  );
};