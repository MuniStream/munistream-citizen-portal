import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Header } from '../components/Header';
import { authService } from '../services/authService';
import './EntityDetailPage.css';

interface EntityDetail {
  entity: {
    entity_id: string;
    entity_type: string;
    name: string;
    status: string;
    verified: boolean;
    data: Record<string, any>;
    created_at: string;
    updated_at: string;
    relationships_count: number;
  };
  available_workflows: AvailableWorkflow[];
  recent_instances: RecentInstance[];
}

interface EntityDocument {
  document_id: string;
  name: string;
  document_type: string;
  document_subtype?: string;
  document_number: string;
  issued_date: string;
  expiry_date?: string;
  issuing_authority: string;
  verification_status: string;
  is_expired: boolean;
  created_at: string;
  metadata: Record<string, any>;
}

interface AvailableWorkflow {
  workflow_id: string;
  name: string;
  description: string;
  category: string;
  estimatedDuration?: string;
}

interface RecentInstance {
  instance_id: string;
  workflow_id: string;
  status: string;
  created_at: string;
  completed_at?: string;
}

const API_BASE_URL = `${import.meta.env.VITE_API_URL}${import.meta.env.VITE_API_BASE_URL}`;

export const EntityDetailPage: React.FC = () => {
  const { entityId } = useParams<{ entityId: string }>();
  const { t } = useTranslation();
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  
  const [entityDetail, setEntityDetail] = useState<EntityDetail | null>(null);
  const [documents, setDocuments] = useState<EntityDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startingWorkflow, setStartingWorkflow] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      login();
      return;
    }
    
    if (entityId) {
      fetchEntityDetail();
      fetchEntityDocuments();
    }
  }, [isAuthenticated, entityId]);

  const fetchEntityDetail = async () => {
    try {
      setIsLoading(true);
      const token = authService.getToken();
      if (!token) {
        login();
        return;
      }

      const response = await fetch(`${API_BASE_URL}/public/entities/${entityId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          authService.logout();
          return;
        }
        throw new Error('Failed to fetch entity details');
      }

      const data = await response.json();
      setEntityDetail(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load entity details');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEntityDocuments = async () => {
    try {
      setLoadingDocuments(true);
      const token = authService.getToken();
      if (!token) {
        return;
      }

      const response = await fetch(`${API_BASE_URL}/public/entities/${entityId}/documents`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.error('Failed to fetch documents');
        return;
      }

      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const startWorkflow = async (workflowId: string) => {
    try {
      setStartingWorkflow(workflowId);
      const token = authService.getToken();
      if (!token) {
        login();
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/public/entities/${entityId}/start-workflow`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ workflow_id: workflowId }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to start workflow');
      }

      const data = await response.json();
      // Redirect to tracking page
      navigate(`/track/${data.instance_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start workflow');
    } finally {
      setStartingWorkflow(null);
    }
  };

  const getEntityIcon = (entityType: string) => {
    const iconMap: Record<string, string> = {
      'property': '🏠',
      'person': '👤',
      'business': '🏢',
      'company': '🏢',
      'vehicle': '🚗',
    };
    return iconMap[entityType] || '📄';
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; label: string }> = {
      'active': { color: '#28a745', label: t('entity.status.active') },
      'inactive': { color: '#6c757d', label: t('entity.status.inactive') },
      'pending': { color: '#ffc107', label: t('entity.status.pending') },
      'suspended': { color: '#dc3545', label: t('entity.status.suspended') },
    };
    const statusInfo = statusMap[status] || { color: '#6c757d', label: status };
    
    return (
      <span 
        className="status-badge" 
        style={{ backgroundColor: statusInfo.color }}
      >
        {statusInfo.label}
      </span>
    );
  };

  const getWorkflowStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'running': return '🔄';
      case 'failed': return '❌';
      case 'paused': return '⏸️';
      default: return '⏳';
    }
  };

  const formatDataValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    if (typeof value === 'number') return value.toLocaleString();
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const getDocumentTypeIcon = (docType: string) => {
    const iconMap: Record<string, string> = {
      'construction_permit': '🏗️',
      'property_title': '🏠',
      'business_license': '🏢',
      'tax_certificate': '💰',
      'identity_document': '🆔',
      'permit': '📋',
      'certificate': '📜',
      'approval_letter': '✅',
      'rejection_letter': '❌',
    };
    return iconMap[docType] || '📄';
  };

  const getDocumentStatusBadge = (status: string, isExpired: boolean) => {
    if (isExpired) {
      return <span className="doc-status-badge expired">⏰ {t('entity.document.expired')}</span>;
    }
    
    const statusMap: Record<string, { color: string; icon: string; label: string }> = {
      'verified': { color: '#28a745', icon: '✅', label: t('entity.document.verified') },
      'pending': { color: '#ffc107', icon: '⏳', label: t('entity.document.pending') },
      'rejected': { color: '#dc3545', icon: '❌', label: t('entity.document.rejected') },
    };
    
    const statusInfo = statusMap[status] || { color: '#6c757d', icon: '❓', label: status };
    
    return (
      <span className="doc-status-badge" style={{ backgroundColor: statusInfo.color }}>
        {statusInfo.icon} {statusInfo.label}
      </span>
    );
  };

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="entity-detail-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !entityDetail) {
    return (
      <div className="entity-detail-page">
        <div className="error-state">
          <p>⚠️ {error || 'Entity not found'}</p>
          <Link to="/my-entities" className="btn-primary">
            {t('common.back')}
          </Link>
        </div>
      </div>
    );
  }

  const { entity, available_workflows, recent_instances } = entityDetail;

  return (
    <div className="entity-detail-page">
      <Header
        variant="detail"
        showBackLink={true}
        backLinkTo="/my-entities"
        backLinkText={t('my_entities.title')}
      />

      <main className="detail-main">
        <div className="container">
          {/* Entity Header */}
          <section className="entity-header-section">
            <div className="entity-header-info">
              <span className="entity-icon-large">{getEntityIcon(entity.entity_type)}</span>
              <div className="entity-title-info">
                <h2>{entity.name}</h2>
                <div className="entity-meta-badges">
                  <span className="entity-type-badge">{entity.entity_type}</span>
                  {getStatusBadge(entity.status)}
                  {entity.verified && (
                    <span className="verified-badge" title={t('my_entities.verified')}>
                      ✅ {t('my_entities.verified')}
                    </span>
                  )}
                </div>
                <p className="entity-id">ID: {entity.entity_id}</p>
              </div>
            </div>
          </section>

          {/* Entity Data */}
          <section className="entity-data-section">
            <h3>📊 {t('entity.information')}</h3>
            <div className="data-grid">
              {Object.entries(entity.data).map(([key, value]) => (
                <div key={key} className="data-item">
                  <label>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</label>
                  <span>{formatDataValue(value)}</span>
                </div>
              ))}
            </div>
            
            <div className="entity-timestamps">
              <div className="timestamp-item">
                <span className="timestamp-label">📅 {t('entity.created_at')}:</span>
                <span>{new Date(entity.created_at).toLocaleString()}</span>
              </div>
              <div className="timestamp-item">
                <span className="timestamp-label">🔄 {t('entity.updated_at')}:</span>
                <span>{new Date(entity.updated_at).toLocaleString()}</span>
              </div>
              {entity.relationships_count > 0 && (
                <div className="timestamp-item">
                  <span className="timestamp-label">🔗 {t('entity.relationships')}:</span>
                  <span>{entity.relationships_count}</span>
                </div>
              )}
            </div>
          </section>

          {/* Available Workflows */}
          <section className="workflows-section">
            <h3>🚀 {t('entity.available_workflows')}</h3>
            {available_workflows.length === 0 ? (
              <div className="no-workflows">
                <p>{t('entity.no_workflows_available')}</p>
              </div>
            ) : (
              <div className="workflows-grid">
                {available_workflows.map(workflow => (
                  <div key={workflow.workflow_id} className="workflow-card">
                    <div className="workflow-header">
                      <h4>{workflow.name}</h4>
                      <span className="workflow-category">{workflow.category}</span>
                    </div>
                    <p className="workflow-description">{workflow.description}</p>
                    {workflow.estimatedDuration && (
                      <span className="workflow-duration">⏱️ {workflow.estimatedDuration}</span>
                    )}
                    <button 
                      onClick={() => startWorkflow(workflow.workflow_id)}
                      disabled={startingWorkflow === workflow.workflow_id}
                      className="btn-primary full-width"
                    >
                      {startingWorkflow === workflow.workflow_id ? (
                        <>{t('common.loading')}...</>
                      ) : (
                        <>▶️ {t('entity.start_workflow')}</>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Documents Section */}
          <section className="documents-section">
            <h3>📄 {t('entity.documents')}</h3>
            {loadingDocuments ? (
              <div className="loading-documents">
                <div className="spinner small"></div>
                <p>{t('common.loading')}</p>
              </div>
            ) : documents.length === 0 ? (
              <div className="no-documents">
                <p>{t('entity.no_documents')}</p>
              </div>
            ) : (
              <div className="documents-grid">
                {documents.map(doc => (
                  <div key={doc.document_id} className="document-card">
                    <div className="document-header">
                      <span className="document-icon">{getDocumentTypeIcon(doc.document_type)}</span>
                      <div className="document-info">
                        <h4>{doc.name}</h4>
                        <p className="document-number">{doc.document_number}</p>
                      </div>
                      {getDocumentStatusBadge(doc.verification_status, doc.is_expired)}
                    </div>
                    
                    <div className="document-details">
                      <div className="document-meta-item">
                        <label>{t('entity.document.type')}:</label>
                        <span>{doc.document_type.replace(/_/g, ' ')}</span>
                      </div>
                      
                      <div className="document-meta-item">
                        <label>{t('entity.document.issued_by')}:</label>
                        <span>{doc.issuing_authority}</span>
                      </div>
                      
                      <div className="document-meta-item">
                        <label>{t('entity.document.issued_date')}:</label>
                        <span>{new Date(doc.issued_date).toLocaleDateString()}</span>
                      </div>
                      
                      {doc.expiry_date && (
                        <div className="document-meta-item">
                          <label>{t('entity.document.expiry_date')}:</label>
                          <span className={doc.is_expired ? 'expired-text' : ''}>
                            {new Date(doc.expiry_date).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="document-actions">
                      <button className="btn-secondary small">
                        👁️ {t('entity.document.view')}
                      </button>
                      <button className="btn-secondary small">
                        ⬇️ {t('entity.document.download')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recent Workflow Instances */}
          {recent_instances.length > 0 && (
            <section className="instances-section">
              <h3>📜 {t('entity.recent_workflows')}</h3>
              <div className="instances-table">
                <table>
                  <thead>
                    <tr>
                      <th>{t('entity.workflow')}</th>
                      <th>{t('entity.status')}</th>
                      <th>{t('entity.started')}</th>
                      <th>{t('entity.completed')}</th>
                      <th>{t('entity.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent_instances.map(instance => (
                      <tr key={instance.instance_id}>
                        <td>{instance.workflow_id}</td>
                        <td>
                          <span className="status-icon">
                            {getWorkflowStatusIcon(instance.status)}
                          </span>
                          {instance.status}
                        </td>
                        <td>{new Date(instance.created_at).toLocaleDateString()}</td>
                        <td>
                          {instance.completed_at 
                            ? new Date(instance.completed_at).toLocaleDateString()
                            : '-'
                          }
                        </td>
                        <td>
                          <Link 
                            to={`/track/${instance.instance_id}`}
                            className="btn-link"
                          >
                            {t('entity.view_progress')} →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
};