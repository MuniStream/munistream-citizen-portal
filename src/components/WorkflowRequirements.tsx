import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import keycloakService from '../services/keycloak';

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

interface WorkflowRequirementsProps {
  workflowId: string;
  onReady?: () => void;
  showStartButton?: boolean;
}

export const WorkflowRequirements: React.FC<WorkflowRequirementsProps> = ({
  workflowId,
  onReady,
  showStartButton = true
}) => {
  const [preCheck, setPreCheck] = useState<WorkflowPreCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const checkRequirements = async () => {
      try {
        setLoading(true);
        setError(null);

        const headers: any = {};
        if (isAuthenticated) {
          const token = keycloakService.getToken();
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
        }

        const response = await axios.get(
          `/api/v1/public/workflows/${workflowId}/pre-check`,
          { headers }
        );

        setPreCheck(response.data);

        if (response.data.overall_ready && onReady) {
          onReady();
        }
      } catch (err: any) {
        console.error('Error checking workflow requirements:', err);
        setError(err.response?.data?.detail || 'Error checking requirements');
      } finally {
        setLoading(false);
      }
    };

    checkRequirements();
  }, [workflowId, isAuthenticated]);

  if (loading) {
    return (
      <div className="requirements-loading">
        <div className="spinner"></div>
        <p>Verificando requisitos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="requirements-error">
        <p className="error-message">{error}</p>
      </div>
    );
  }

  if (!preCheck) {
    return null;
  }

  return (
    <div className="workflow-requirements">
      <div className="requirements-header">
        <h3>Requisitos del Trámite</h3>
        <div className={`status-badge ${preCheck.overall_ready ? 'ready' : 'not-ready'}`}>
          {preCheck.overall_ready ? '✓ Listo para iniciar' : '⚠ Faltan requisitos'}
        </div>
      </div>

      {!preCheck.overall_ready && (
        <div className="requirements-summary">
          <p>{preCheck.message}</p>
        </div>
      )}

      <div className="operator-requirements">
        {preCheck.operator_checks.filter(op => op.requirements.length > 0).map(operator => (
          <div key={operator.task_id} className="operator-section">
            <h4 className="operator-title">
              {operator.ready ? '✓' : '✗'} {operator.task_id.replace(/_/g, ' ')}
            </h4>

            <div className="requirements-list">
              {operator.requirements.map(req => (
                <RequirementItem key={req.id} requirement={req} />
              ))}
            </div>

            {!operator.ready && operator.message && (
              <p className="operator-message">{operator.message}</p>
            )}
          </div>
        ))}
      </div>

      {showStartButton && preCheck.overall_ready && (
        <div className="requirements-actions">
          <Link to={`/workflows/${workflowId}/start`} className="btn btn-primary">
            Iniciar Trámite
          </Link>
        </div>
      )}
    </div>
  );
};

const RequirementItem: React.FC<{ requirement: RequirementDetail }> = ({ requirement }) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className={`requirement-item ${requirement.fulfilled ? 'fulfilled' : 'missing'} ${requirement.critical ? 'critical' : 'optional'}`}>
      <div className="requirement-header">
        <div className="requirement-status">
          {requirement.fulfilled ? (
            <span className="status-icon success">✓</span>
          ) : (
            <span className="status-icon warning">
              {requirement.critical ? '✗' : '!'}
            </span>
          )}
        </div>

        <div className="requirement-info">
          <h5 className="requirement-name">{requirement.name}</h5>
          <p className="requirement-description">{requirement.description}</p>

          {requirement.message && (
            <p className="requirement-message">{requirement.message}</p>
          )}

          {requirement.type === 'entity' && requirement.details && (
            <div className="entity-details">
              <span className="entity-count">
                {requirement.details.found} de {requirement.details.required} disponibles
              </span>

              {requirement.available_resources && requirement.available_resources.length > 0 && (
                <button
                  className="btn-link"
                  onClick={() => setShowDetails(!showDetails)}
                >
                  {showDetails ? 'Ocultar' : 'Ver'} documentos disponibles
                </button>
              )}
            </div>
          )}

          {showDetails && requirement.available_resources && (
            <div className="available-resources">
              <h6>Documentos disponibles:</h6>
              <ul>
                {requirement.available_resources.map(resource => (
                  <li key={resource.entity_id}>
                    <span className="resource-name">{resource.name}</span>
                    <span className="resource-type">({resource.entity_type})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {requirement.action_needed && (
            <div className="requirement-action">
              {requirement.action_url ? (
                <Link to={requirement.action_url} className="btn btn-sm btn-secondary">
                  {requirement.action_needed}
                </Link>
              ) : (
                <span className="action-text">{requirement.action_needed}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkflowRequirements;