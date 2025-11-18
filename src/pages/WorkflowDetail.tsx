import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { workflowService } from '../services/workflowService';
import { useAuth } from '../contexts/AuthContext';
import keycloakService from '../services/keycloak';
import { Header } from '../components/Header';
import type { WorkflowDefinition, FAQ } from '../types/workflow';
import './WorkflowDetail.css';

// Types
interface RequirementDetail {
  id: string;
  type: string;
  name: string;
  description: string;
  critical: boolean;
  fulfilled: boolean;
  message?: string;
  details?: any;
  action_needed?: string;
  action_url?: string;
  available_resources?: Array<{
    entity_id: string;
    name: string;
    entity_type: string;
    data: any;
  }>;
}

interface OperatorCheck {
  task_id: string;
  task_type: string;
  ready: boolean;
  requirements: RequirementDetail[];
  message: string;
  missing_critical: string[];
  missing_optional: string[];
}

interface WorkflowPreCheck {
  workflow_id: string;
  workflow_name: string;
  overall_ready: boolean;
  operator_checks: OperatorCheck[];
  summary: {
    total_operators: number;
    ready_operators: number;
    blocked_operators: number;
  };
  message: string;
}


export const WorkflowDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();

  // State
  const [workflow, setWorkflow] = useState<WorkflowDefinition | null>(null);
  const [preCheck, setPreCheck] = useState<WorkflowPreCheck | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  // Load workflow details
  useEffect(() => {
    if (id) {
      loadWorkflow(id);
    }
  }, [id]);

  // Always run pre-check when workflow loads
  useEffect(() => {
    if (workflow && workflow.workflow_id) {
      runPreCheck(workflow.workflow_id);
    }
  }, [workflow, isAuthenticated]);

  const loadWorkflow = async (workflowId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const workflowData = await workflowService.getWorkflowById(workflowId);
      setWorkflow(workflowData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workflow');
    } finally {
      setIsLoading(false);
    }
  };

  const runPreCheck = async (workflowId: string) => {
    try {
      const data = await workflowService.getWorkflowPreCheck(workflowId);
      setPreCheck(data);
    } catch (err) {
      console.error('Pre-check failed:', err);
      // Pre-check is optional, don't show error
    }
  };

  const handleStartWorkflow = async () => {
    if (!isAuthenticated) {
      keycloakService.login();
      return;
    }

    if (!workflow) return;

    try {
      setIsStarting(true);
      const response = await workflowService.startWorkflow(workflow.workflow_id!, {});
      navigate(`/instances/${response.instance_id}`);
    } catch (err) {
      console.error('Failed to start workflow:', err);
      alert(t('errors.startFailed'));
    } finally {
      setIsStarting(false);
    }
  };

  const getFAQs = (): FAQ[] => {
    // Get FAQs from workflow metadata or use defaults
    if (workflow?.metadata?.faqs) {
      return workflow.metadata.faqs;
    }

    // Default FAQs
    return [
      {
        question: '¿Cuánto tiempo toma este trámite?',
        answer: (workflow?.estimated_duration || workflow?.estimatedDuration) || 'El tiempo varía según la complejidad del caso.'
      },
      {
        question: '¿Cuál es el costo?',
        answer: workflow?.cost ? `$${workflow.cost} MXN` : 'Consulte con la oficina correspondiente.'
      },
      {
        question: '¿Puedo hacer seguimiento en línea?',
        answer: 'Sí, una vez iniciado el trámite puede dar seguimiento en tiempo real desde esta plataforma.'
      },
      {
        question: '¿Qué documentos necesito?',
        answer: 'Los documentos requeridos se muestran en la sección de requisitos. El sistema le indicará exactamente qué necesita.'
      }
    ];
  };

  if (isLoading) {
    return (
      <div className="workflow-detail-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !workflow) {
    return (
      <div className="workflow-detail-container">
        <div className="error-state">
          <h2>{t('errors.notFound')}</h2>
          <p>{error || t('errors.genericError')}</p>
          <button onClick={() => navigate('/services')} className="btn-primary">
            {t('workflows.title')}
          </button>
        </div>
      </div>
    );
  }

  const allRequirements = preCheck?.operator_checks
    ?.flatMap(op => op.requirements)
    ?.filter(req => req) || [];

  const criticalMissing = allRequirements.filter(req => req.critical && !req.fulfilled);
  const optionalMissing = allRequirements.filter(req => !req.critical);

  return (
    <div className="workflow-detail-container">
      <Header
        variant="detail"
        showBackLink={true}
        backLinkTo="/services"
        backLinkText={t('workflows.title')}
      />

      <main className="workflow-detail-main">
        {/* Header Section - Full Width */}
        <section className="workflow-header">
          <div className="container">
            <div className="category-badge">{workflow.category}</div>
            <h1 className="workflow-title">{workflow.name}</h1>
            <p className="workflow-description">{workflow.description}</p>

            <div className="workflow-meta">
              {(workflow.estimated_duration || workflow.estimatedDuration) && (
                <span className="meta-item">
                  <i className="icon-clock"></i> {workflow.estimated_duration || workflow.estimatedDuration}
                </span>
              )}
              {workflow.cost && (
                <span className="meta-item">
                  <i className="icon-money"></i> ${workflow.cost} MXN
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Action Section - Requirements and Start Button */}
        <section className="workflow-action">
          <div className="container">
            <div className="action-grid">
              {/* Requirements Column */}
              <div className="requirements-column">
                <h2>Requisitos</h2>

                {preCheck ? (
                  <div className="requirements-list">
                    {allRequirements.length === 0 ? (
                      <div className="no-requirements">
                        <i className="icon-check-circle"></i>
                        <p>No hay requisitos previos para este trámite</p>
                      </div>
                    ) : (
                      <>
                        {criticalMissing.length > 0 && (
                          <div className="requirements-section critical">
                            <h3>Obligatorios</h3>
                            {criticalMissing.map(req => (
                              <RequirementItem key={req.id} requirement={req} />
                            ))}
                          </div>
                        )}

                        {allRequirements.filter(req => req.critical && req.fulfilled).length > 0 && (
                          <div className="requirements-section fulfilled">
                            <h3>Completados</h3>
                            {allRequirements
                              .filter(req => req.critical && req.fulfilled)
                              .map(req => (
                                <RequirementItem key={req.id} requirement={req} />
                              ))}
                          </div>
                        )}

                        {optionalMissing.length > 0 && (
                          <div className="requirements-section optional">
                            <h3>Opcionales</h3>
                            {optionalMissing.map(req => (
                              <RequirementItem key={req.id} requirement={req} />
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="requirements-loading">
                    <div className="skeleton"></div>
                    <div className="skeleton"></div>
                    <div className="skeleton"></div>
                  </div>
                )}
              </div>

              {/* Start Button Column */}
              <div className="start-column">
                <div className="start-card">
                  <h2>Iniciar Trámite</h2>

                  {preCheck && !preCheck.overall_ready && (
                    <div className="warning-box">
                      <i className="icon-warning"></i>
                      <p>Completa los requisitos obligatorios antes de continuar</p>
                    </div>
                  )}

                  <button
                    className={`btn-start ${!preCheck?.overall_ready ? 'disabled' : ''}`}
                    onClick={handleStartWorkflow}
                    disabled={isStarting || (preCheck !== null && !preCheck.overall_ready)}
                  >
                    {isStarting ? (
                      <>
                        <div className="btn-spinner"></div>
                        Iniciando...
                      </>
                    ) : (
                      <>
                        <i className="icon-play"></i>
                        Comenzar Ahora
                      </>
                    )}
                  </button>

                  {!isAuthenticated && (
                    <p className="auth-note">
                      Necesitas <button onClick={() => keycloakService.login()} className="btn-link">iniciar sesión</button> para comenzar
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="workflow-faq">
          <div className="container">
            <h2>Preguntas Frecuentes</h2>
            <div className="faq-list">
              {getFAQs().map((faq, index) => (
                <div
                  key={index}
                  className={`faq-item ${expandedFAQ === index ? 'expanded' : ''}`}
                >
                  <button
                    className="faq-question"
                    onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                  >
                    <span>{faq.question}</span>
                    <i className={`icon-chevron ${expandedFAQ === index ? 'up' : 'down'}`}></i>
                  </button>
                  {expandedFAQ === index && (
                    <div className="faq-answer">
                      <p>{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Process Overview Section */}
        <section className="workflow-process">
          <div className="container">
            <h2>Proceso del Trámite</h2>
            <div className="process-timeline">
              {workflow.steps.map((step, index) => (
                <div key={step.id} className="process-step">
                  <div className="step-marker">
                    <span className="step-number">{index + 1}</span>
                    {index < workflow.steps.length - 1 && <div className="step-line"></div>}
                  </div>
                  <div className="step-content">
                    <h3>{step.name}</h3>
                    <p>{step.description}</p>
                    {step.estimatedDuration && (
                      <span className="step-duration">
                        <i className="icon-clock"></i> {step.estimatedDuration}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

// Requirement Item Component
const RequirementItem: React.FC<{ requirement: RequirementDetail }> = ({ requirement }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <div className={`requirement-item ${
      isAuthenticated
        ? (!requirement.critical
          ? 'optional'
          : (requirement.fulfilled ? 'fulfilled' : 'missing'))
        : 'unauthenticated'
    }`}>
      <div className="requirement-icon">
        {isAuthenticated ? (
          !requirement.critical ? (
            <i className="icon-help"></i>
          ) : requirement.fulfilled ? (
            <i className="icon-check"></i>
          ) : (
            <i className="icon-x"></i>
          )
        ) : (
          <i className="icon-help"></i>
        )}
      </div>
      <div className="requirement-content">
        <h4>{requirement.name}</h4>
        <p>{requirement.description}</p>
        {isAuthenticated && requirement.message && (
          <span className="requirement-message">{requirement.message}</span>
        )}
        {isAuthenticated && requirement.action_needed && requirement.action_url && (
          <button
            onClick={() => navigate(requirement.action_url!)}
            className="btn-action"
          >
            {requirement.action_needed}
          </button>
        )}
      </div>
    </div>
  );
};

export default WorkflowDetail;