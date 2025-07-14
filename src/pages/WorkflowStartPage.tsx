import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { workflowService, type WorkflowDefinition, type WorkflowInstance } from '../services/workflowService';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

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
      setError('Workflow ID is required');
      setIsLoading(false);
      return;
    }

    const fetchWorkflow = async () => {
      try {
        const workflowData = await workflowService.getWorkflowById(workflowId);
        setWorkflow(workflowData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load workflow');
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
      alert(`${t('workflow.started_successfully')} Tracking ID: ${instance.instance_id}`);
      navigate(`/track/${instance.instance_id}`);
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Failed to start workflow'}`);
    } finally {
      setIsStarting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="workflow-detail">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading application details...</p>
        </div>
      </div>
    );
  }

  if (error || !workflow) {
    return (
      <div className="workflow-detail">
        <div className="error-state">
          <h2>Application Not Found</h2>
          <p>{error || 'The requested application could not be found.'}</p>
          <Link to="/services" className="btn-primary">Browse Services</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="workflow-detail">
      {/* Header */}
      <header className="detail-header">
        <div className="container">
          <div className="header-content">
            <Link to="/services" className="logo-link">
              <h1 className="logo">CivicStream</h1>
              <span className="tagline">Government Services</span>
            </Link>
            <div className="header-actions">
              <LanguageSwitcher variant="compact" />
              <Link to="/auth" className="btn-secondary">Sign In</Link>
            </div>
          </div>
        </div>
      </header>

      <main className="detail-main">
        <div className="container">
          {/* Breadcrumb */}
          <nav className="breadcrumb">
            <Link to="/services">Services</Link>
            <span>›</span>
            <Link to={`/services/${workflow.id}`}>{workflow.name}</Link>
            <span>›</span>
            <span>Start Application</span>
          </nav>

          {/* Application Start Header */}
          <section className="service-header">
            <div className="service-info">
              <span className="category-badge">{workflow.category}</span>
              <h2>Start: {workflow.name}</h2>
              <p className="description">
                You're about to start your application for {workflow.name.toLowerCase()}. 
                Review the requirements below and click "Start Application" when ready.
              </p>
            </div>

            <div className="service-actions">
              <button 
                className="btn-primary large"
                onClick={() => setShowConfirmDialog(true)}
                disabled={!workflow.isActive || isStarting}
              >
                {isStarting ? 'Starting...' : 'Start Application'}
              </button>
              
              <p className="auth-note">
                No account required • Instant tracking ID • Takes {workflow.estimatedDuration}
              </p>
            </div>
          </section>

          {/* Important Notice */}
          <section className="requirements-section">
            <h3>📋 Before You Start</h3>
            <div className="requirements-list">
              <div className="requirement-item">
                <span className="check">💡</span>
                <div>
                  <strong>No Account Required</strong>
                  <p>You can start this application without creating an account. You'll receive a tracking ID to monitor your progress.</p>
                </div>
              </div>
              <div className="requirement-item">
                <span className="check">⏱️</span>
                <div>
                  <strong>Estimated Time</strong>
                  <p>This process typically takes {workflow.estimatedDuration} from start to completion.</p>
                </div>
              </div>
              <div className="requirement-item">
                <span className="check">📄</span>
                <div>
                  <strong>Prepare Your Documents</strong>
                  <p>Make sure you have all required documents ready before starting.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Requirements */}
          {workflow.requirements.length > 0 && (
            <section className="requirements-section">
              <h3>✅ Required Documents & Information</h3>
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

          {/* Process Preview */}
          <section className="steps-section">
            <h3>🔄 Application Process ({workflow.steps.length} steps)</h3>
            <div className="steps-timeline">
              {workflow.steps.slice(0, 6).map((step, index) => (
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
                    <h4>And {workflow.steps.length - 6} more steps</h4>
                    <p>Complete process details will be shown during your application.</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Help Section */}
          <section className="help-section">
            <h3>❓ Need Help?</h3>
            <div className="help-grid">
              <div className="help-card">
                <h4>📞 Phone Support</h4>
                <p>Call for immediate assistance</p>
                <span className="phone">(555) 123-4567</span>
              </div>
              <div className="help-card">
                <h4>📧 Email Support</h4>
                <p>Send your questions via email</p>
                <span className="email">support@civicstream.gov</span>
              </div>
              <div className="help-card">
                <h4>💬 Live Chat</h4>
                <p>Chat with our support team</p>
                <button className="btn-secondary">Start Chat</button>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="dialog-overlay" onClick={() => setShowConfirmDialog(false)}>
          <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
            <h3>🚀 Ready to Start?</h3>
            <p>
              You're about to start your <strong>{workflow.name}</strong> application. 
              This will create a new application instance and provide you with a tracking ID.
            </p>
            <div className="dialog-meta">
              <div className="meta-item">
                <span className="label">Process:</span>
                <span className="value">{workflow.steps.length} steps</span>
              </div>
              <div className="meta-item">
                <span className="label">Duration:</span>
                <span className="value">{workflow.estimatedDuration}</span>
              </div>
              <div className="meta-item">
                <span className="label">Status:</span>
                <span className="value">✅ Ready to start</span>
              </div>
            </div>
            <p>
              <strong>💡 Important:</strong> Save your tracking ID once the application starts. 
              You'll need it to check your progress.
            </p>
            <div className="dialog-actions">
              <button 
                className="btn-secondary" 
                onClick={() => setShowConfirmDialog(false)}
                disabled={isStarting}
              >
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={handleStartWorkflow}
                disabled={isStarting}
              >
                {isStarting ? 'Starting...' : 'Start Application'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};