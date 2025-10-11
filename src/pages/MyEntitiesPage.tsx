import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { authService } from '../services/authService';
import './MyEntitiesPage.css';

interface Entity {
  entity_id: string;
  entity_type: string;
  name: string;
  status: string;
  verified: boolean;
  data: Record<string, any>;
  created_at: string;
  updated_at: string;
  available_workflows: AvailableWorkflow[];
  relationships_count: number;
}

interface AvailableWorkflow {
  workflow_id: string;
  name: string;
  description: string;
  category: string;
}

interface EntityType {
  type_id: string;
  name: string;
  alias?: string;
  description?: string;
  icon?: string;
  color?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL;

export const MyEntitiesPage: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  
  const [entities, setEntities] = useState<Entity[]>([]);
  const [entityTypes, setEntityTypes] = useState<EntityType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedEntity] = useState<Entity | null>(null);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      login();
      return;
    }
    
    fetchEntities();
    fetchEntityTypes();
  }, [isAuthenticated, selectedType]);

  const fetchEntities = async () => {
    try {
      setIsLoading(true);
      const token = await authService.getValidToken();
      if (!token) {
        login();
        return;
      }

      const params = new URLSearchParams();
      if (selectedType) params.append('entity_type', selectedType);
      
      const response = await fetch(`${API_BASE_URL}/public/entities?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          authService.logout();
          return;
        }
        throw new Error('Failed to fetch entities');
      }

      const data = await response.json();
      setEntities(data.entities || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load entities');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEntityTypes = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/public/entity-types`);
      if (response.ok) {
        const data = await response.json();
        setEntityTypes(data.entity_types || []);
      }
    } catch (err) {
      console.error('Failed to fetch entity types:', err);
    }
  };

  const startWorkflow = async (entity: Entity, workflowId: string) => {
    try {
      const token = await authService.getValidToken();
      if (!token) {
        login();
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/public/entities/${entity.entity_id}/start-workflow`,
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
    }
  };

  const getEntityIcon = (entityType: string, iconName?: string) => {
    // Map icon names to emojis
    const iconMap: Record<string, string> = {
      'home': '🏠',
      'person': '👤',
      'business': '🏢',
      'car': '🚗',
      'vehicle': '🚗',
      'property': '🏠',
      'company': '🏢',
      'document': '📄',
      'file': '📄',
      'folder': '📁'
    };
    
    // First try to map the icon name from entity type
    const type = entityTypes.find(t => t.type_id === entityType);
    if (type?.icon && iconMap[type.icon]) {
      return iconMap[type.icon];
    }
    
    // Then try direct icon name mapping
    if (iconName && iconMap[iconName]) {
      return iconMap[iconName];
    }
    
    // Finally, default icons based on entity type
    switch (entityType) {
      case 'property': return '🏠';
      case 'person': return '👤';
      case 'business': return '🏢';
      case 'company': return '🏢';
      case 'vehicle': return '🚗';
      default: return '📄';
    }
  };

  const getEntityDisplayName = (entityType: string) => {
    const type = entityTypes.find(t => t.type_id === entityType);
    return type?.name || entityType.replace('_', ' ').charAt(0).toUpperCase() + entityType.slice(1);
  };

  const formatEntityData = (data: Record<string, any>) => {
    // Display key entity data fields
    const importantFields = ['address', 'cadastral_key', 'surface_area', 'owner_name', 'registration_number'];
    const displayData: string[] = [];
    
    for (const field of importantFields) {
      if (data[field]) {
        displayData.push(`${field.replace('_', ' ')}: ${data[field]}`);
      }
    }
    
    return displayData.slice(0, 3).join(' • ');
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="my-entities-page">
      {/* Header */}
      <header className="entities-header">
        <div className="container">
          <div className="header-content">
            <Link to="/" className="logo-link">
              <h1 className="logo">{t('app.title')}</h1>
              <span className="tagline">{t('my_entities.title')}</span>
            </Link>
            <div className="header-actions">
              <LanguageSwitcher variant="compact" />
              <Link to="/services" className="btn-secondary">
                📋 {t('workflows.title')}
              </Link>
              <div className="auth-menu">
                <span className="user-email">{authService.getStoredUser()?.email}</span>
                <button 
                  onClick={() => authService.logout()} 
                  className="btn-secondary"
                >
                  {t('auth.logout')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="entities-main">
        <div className="container">
          {/* Page Title */}
          <section className="page-header">
            <h2>📂 {t('my_entities.title')}</h2>
            <p>{t('my_entities.description')}</p>
          </section>

          {/* Filter Bar */}
          <section className="filter-bar">
            <select 
              value={selectedType} 
              onChange={(e) => setSelectedType(e.target.value)}
              className="filter-select"
            >
              <option value="">{t('my_entities.all_types')}</option>
              {entityTypes.map(type => (
                <option key={type.type_id} value={type.type_id}>
                  {type.name}
                </option>
              ))}
            </select>
            
            <button 
              onClick={fetchEntities} 
              className="btn-secondary"
              disabled={isLoading}
            >
              🔄 {t('common.refresh')}
            </button>
          </section>

          {/* Loading State */}
          {isLoading && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>{t('common.loading')}</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="error-state">
              <p>⚠️ {error}</p>
              <button onClick={fetchEntities} className="btn-primary">
                {t('common.retry')}
              </button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && entities.length === 0 && (
            <div className="empty-state">
              <h3>{t('my_entities.no_entities')}</h3>
              <p>{t('my_entities.no_entities_desc')}</p>
              <Link to="/services" className="btn-primary">
                {t('my_entities.start_workflow')}
              </Link>
            </div>
          )}

          {/* Entities Grid */}
          {!isLoading && entities.length > 0 && (
            <section className="entities-grid">
              {entities.map(entity => (
                <div 
                  key={entity.entity_id} 
                  className="entity-card clickable"
                  onClick={() => navigate(`/entity/${entity.entity_id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="entity-header">
                    <span className="entity-icon">{getEntityIcon(entity.entity_type)}</span>
                    <div className="entity-info">
                      <h3>{entity.name}</h3>
                      <span className="entity-type">{getEntityDisplayName(entity.entity_type)}</span>
                    </div>
                    {entity.verified && (
                      <span className="verified-badge" title={t('my_entities.verified')}>✅</span>
                    )}
                  </div>
                  
                  <div className="entity-details">
                    <p className="entity-data">{formatEntityData(entity.data)}</p>
                    <div className="entity-meta">
                      <span>📅 {new Date(entity.created_at).toLocaleDateString()}</span>
                      {entity.relationships_count > 0 && (
                        <span>🔗 {entity.relationships_count} {t('my_entities.relationships')}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="entity-actions">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent card click
                        navigate(`/entity/${entity.entity_id}`);
                      }}
                      className="btn-primary small"
                    >
                      👁️ {t('my_entities.view_details')}
                    </button>
                    {entity.available_workflows.length > 0 && (
                      <span className="workflows-count">
                        {entity.available_workflows.length} {t('my_entities.available_workflows')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* Workflow Selection Modal */}
          {showWorkflowModal && selectedEntity && (
            <div className="modal-overlay" onClick={() => setShowWorkflowModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>{t('my_entities.select_workflow')}</h3>
                  <button 
                    onClick={() => setShowWorkflowModal(false)}
                    className="close-button"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="modal-body">
                  <p className="modal-subtitle">
                    {t('my_entities.for_entity')}: <strong>{selectedEntity.name}</strong>
                  </p>
                  
                  <div className="workflows-list">
                    {selectedEntity.available_workflows.map(workflow => (
                      <div 
                        key={workflow.workflow_id} 
                        className="workflow-option"
                        onClick={() => startWorkflow(selectedEntity, workflow.workflow_id)}
                      >
                        <div className="workflow-info">
                          <h4>{workflow.name}</h4>
                          <p>{workflow.description}</p>
                          <span className="workflow-category">{workflow.category}</span>
                        </div>
                        <span className="workflow-arrow">→</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};