import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { workflowService } from '../services/workflowService';
import { useAuth } from '../contexts/AuthContext';
import type { WorkflowDefinition } from '../types/workflow';

export const WorkflowDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [workflow, setWorkflow] = useState<WorkflowDefinition | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadWorkflow(id);
    }
  }, [id]);

  const loadWorkflow = async (workflowId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const workflowData = await workflowService.getWorkflowById(workflowId);
      setWorkflow(workflowData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workflow details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartApplication = () => {
    // Navigate to public workflow start page (no auth required)
    navigate(`/start/${id}`);
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
          <h2>{t('errors.notFound')}</h2>
          <p>{error || t('errors.genericError')}</p>
          <Link to="/services" className="btn-primary">{t('workflows.title')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="workflow-detail">
      <header className="detail-header">
        <div className="container">
          <div className="header-content">
            <Link to="/services" className="logo-link">
              <h1 className="logo">MuniStream</h1>
              <span className="tagline">{t('workflows.title')}</span>
            </Link>
            <div className="header-actions">
              {isAuthenticated ? (
                <Link to="/dashboard" className="btn-secondary">{t('dashboard.title')}</Link>
              ) : (
                <Link to="/auth" className="btn-secondary">{t('auth.login')}</Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="detail-main">
        <div className="container">
          {/* Breadcrumb */}
          <nav className="breadcrumb">
            <Link to="/services">{t('workflows.title')}</Link>
            <span>›</span>
            <span>{workflow.name}</span>
          </nav>

          {/* Service Header */}
          <section className="service-header">
            <div className="service-info">
              <span className="category-badge">{workflow.category}</span>
              <h2>{workflow.name}</h2>
              <p className="description">{workflow.description}</p>
              
              <div className="service-meta">
                <div className="meta-item">
                  <span className="label">{t('workflows.estimatedTime')}:</span>
                  <span className="value">📅 {workflow.estimatedDuration}</span>
                </div>
                <div className="meta-item">
                  <span className="label">Steps:</span>
                  <span className="value">📋 {workflow.steps.length} {t('common.steps')}</span>
                </div>
                <div className="meta-item">
                  <span className="label">{t('applications.status')}:</span>
                  <span className={`status ${workflow.isActive ? 'active' : 'inactive'}`}>
                    {workflow.isActive ? '✅ Available' : '⏸️ Temporarily Unavailable'}
                  </span>
                </div>
              </div>
            </div>

            <div className="service-actions">
              <button 
                className="btn-primary large"
                onClick={handleStartApplication}
                disabled={!workflow.isActive}
              >
                {t('workflows.startApplication')}
              </button>
              
              <p className="auth-note">
                {t('auth.noAccount')} • Get instant tracking ID
              </p>
            </div>
          </section>

          {/* Requirements */}
          {workflow.requirements.length > 0 && (
            <section className="requirements-section">
              <h3>{t('workflows.requirements')}</h3>
              <div className="requirements-list">
                {workflow.requirements.map((requirement, index) => (
                  <div key={index} className="requirement-item">
                    <span className="check">✓</span>
                    <span>{requirement}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Process Steps */}
          <section className="steps-section">
            <h3>{t('workflows.process')}</h3>
            <div className="steps-timeline">
              {workflow.steps.map((step, index) => (
                <div key={step.id} className="step-item">
                  <div className="step-number">{index + 1}</div>
                  <div className="step-content">
                    <h4>{step.name}</h4>
                    <p>{step.description}</p>
                    {step.estimatedDuration && (
                      <span className="step-duration">⏱️ {step.estimatedDuration}</span>
                    )}
                    {step.requirements && step.requirements.length > 0 && (
                      <div className="step-requirements">
                        <strong>{t('forms.required')}:</strong>
                        <ul>
                          {step.requirements.map((req, reqIndex) => (
                            <li key={reqIndex}>{req}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Help Section */}
          <section className="help-section">
            <h3>{t('workflow.need_help')}</h3>
            <div className="help-grid">
              <div className="help-card">
                <h4>📞 {t('common.contact_support')}</h4>
                <p>Call our support line for assistance</p>
                <span className="phone">(555) 123-4567</span>
              </div>
              <div className="help-card">
                <h4>📧 Email {t('navigation.support')}</h4>
                <p>Send us your questions via email</p>
                <span className="email">support@munistream.com</span>
              </div>
              <div className="help-card">
                <h4>❓ {t('common.faq')}</h4>
                <p>Find answers to common questions</p>
                <Link to="/help" className="help-link">{t('common.faq')} →</Link>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};