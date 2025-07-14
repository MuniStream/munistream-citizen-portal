import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { workflowService, type WorkflowInstanceProgress, type DataSubmissionResponse } from '../services/workflowService';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { DataCollectionForm, type FormField } from '../components/DataCollectionForm';

export const TrackingPage: React.FC = () => {
  const { instanceId } = useParams<{ instanceId: string }>();
  const navigate = useNavigate();
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

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: 'Track Application Progress',
        text: `Track my ${progress?.workflow_name || 'application'} progress`,
        url: url,
      });
    } else {
      navigator.clipboard.writeText(url);
      alert('Tracking link copied to clipboard!');
    }
  };

  const handleRefresh = () => {
    setIsLoading(true);
    fetchProgress();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#28a745';
      case 'failed': return '#dc3545';
      case 'running': return '#2c5aa0';
      case 'paused': return '#ffc107';
      default: return '#6c757d';
    }
  };

  const getStepStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'in_progress': return '🔄';
      case 'failed': return '❌';
      default: return '⏳';
    }
  };

  const handleDataSubmission = async (data: Record<string, any>) => {
    if (!instanceId) return;
    
    setIsSubmittingData(true);
    setError(null);
    
    try {
      // Create FormData for file uploads
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
          <h2>Invalid Tracking ID</h2>
          <p>The tracking ID provided is not valid.</p>
          <Link to="/services" className="btn-primary">Browse Services</Link>
        </div>
      </div>
    );
  }

  if (isLoading && !progress) {
    return (
      <div className="workflow-detail">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading application progress...</p>
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
          <button onClick={handleRefresh} className="btn-primary">Try Again</button>
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
              <button onClick={handleShare} className="btn-secondary">📤 Share</button>
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
            <span>Track Application</span>
          </nav>

          {/* Application Status Header */}
          <section className="service-header">
            <div className="service-info">
              <span className="category-badge">Tracking ID: {instanceId.slice(0, 8)}...</span>
              <h2>📊 {progress.workflow_name}</h2>
              <p className="description">
                Your application is currently <strong style={{ color: getStatusColor(progress.status) }}>
                  {progress.status}
                </strong>. 
                {progress.progress_percentage === 100 
                  ? ' Congratulations! Your application has been completed.' 
                  : ` You are ${progress.progress_percentage.toFixed(0)}% through the process.`
                }
              </p>
              
              <div className="service-meta">
                <div className="meta-item">
                  <span className="label">Progress:</span>
                  <span className="value">{progress.completed_steps} of {progress.total_steps} steps</span>
                </div>
                <div className="meta-item">
                  <span className="label">Started:</span>
                  <span className="value">{new Date(progress.created_at).toLocaleDateString()}</span>
                </div>
                <div className="meta-item">
                  <span className="label">Last Update:</span>
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
                {isLoading ? 'Refreshing...' : '🔄 Refresh Status'}
              </button>
              
              <p className="auth-note">
                Auto-refreshes every 30 seconds • Share this link to track progress
              </p>
            </div>
          </section>

          {/* Progress Bar */}
          <section className="requirements-section">
            <h3>📈 Overall Progress</h3>
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
                <span>Started</span>
                <span>{progress.progress_percentage.toFixed(1)}% Complete</span>
                <span>Finished</span>
              </div>
            </div>
          </section>

          {/* Data Collection Section - Prominent Position */}
          {progress.requires_input && progress.input_form && progress.input_form.fields && (
            <section className="requirements-section" style={{
              backgroundColor: '#fff3cd',
              border: '2px solid #ffc107',
              borderRadius: '8px',
              padding: '1.5rem',
              marginBottom: '2rem',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}>
              <h3 style={{ color: '#856404', marginBottom: '1rem' }}>🚨 Action Required</h3>
              {submissionSuccess ? (
                <div className="success-message">
                  <h4>✅ Data Submitted Successfully</h4>
                  <p>{submissionSuccess}</p>
                  <p>Your application will continue processing. Please check back for updates.</p>
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
                      <strong style={{ color: '#856404' }}>Information Required</strong>
                      <p>Please provide the required information below to continue your application.</p>
                    </div>
                  </div>
                  
                  <DataCollectionForm
                    title={progress.input_form.title || "Provide Required Information"}
                    description={progress.input_form.description || "Please fill out the form below to continue your application."}
                    fields={progress.input_form.fields}
                    onSubmit={handleDataSubmission}
                    isSubmitting={isSubmittingData}
                    submitButtonText="Submit Information"
                  />
                </>
              )}
            </section>
          )}

          {/* Step Progress */}
          <section className="steps-section">
            <h3>🔄 Step-by-Step Progress</h3>
            <div className="steps-timeline">
              {progress.step_progress.map((step, index) => (
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
                          ⏰ Started: {new Date(step.started_at).toLocaleString()}
                        </span>
                      )}
                      
                      {step.completed_at && (
                        <span style={{ fontSize: '0.9rem', color: '#666' }}>
                          ✅ Completed: {new Date(step.completed_at).toLocaleString()}
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
              <h3>🎯 Current Step</h3>
              <div className="requirement-item">
                <span className="check">▶️</span>
                <div>
                  <strong>Now Processing: {progress.current_step}</strong>
                  <p>Your application is currently being processed at this step. Please check back later for updates.</p>
                </div>
              </div>
            </section>
          )}

          {/* Help Section */}
          <section className="help-section">
            <h3>❓ Need Help?</h3>
            <div className="help-grid">
              <div className="help-card">
                <h4>📞 Call Support</h4>
                <p>Questions about your application?</p>
                <span className="phone">(555) 123-4567</span>
                <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                  Reference ID: {instanceId.slice(0, 8)}
                </p>
              </div>
              <div className="help-card">
                <h4>📧 Email Updates</h4>
                <p>Get progress notifications</p>
                <button className="btn-secondary">Subscribe</button>
              </div>
              <div className="help-card">
                <h4>📱 Share Progress</h4>
                <p>Share this tracking link</p>
                <button onClick={handleShare} className="btn-secondary">📤 Share Link</button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};