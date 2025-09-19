import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { workflowService } from '../services/workflowService';
import { authService } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import type { WorkflowDefinition, WorkflowCategory, WorkflowSearchParams } from '../types/workflow';

// Función para obtener iconos de categorías
const getCategoryIcon = (iconOrType?: string): string => {
  const iconMap: Record<string, string> = {
    // Icons específicos
    'edit': '✏️',
    'lock': '🔒',
    'x-circle': '❌',
    'award': '🏆',
    'home': '🏠',
    'arrow-right': '➡️',
    'calculator': '🧮',
    'document': '📄',
    'link': '🔗',
    // Category types
    'rpp': '📋',
    'catastro': '🏠',
    'vinculado': '🔗'
  };
  
  return iconMap[iconOrType || ''] || '📋';
};

// Función para obtener etiquetas de tipos de categoría
const getCategoryTypeLabel = (categoryType?: string, t: any): string => {
  if (categoryType) {
    return t(`categories.${categoryType}`);
  }
  return 'General';
};

export const PublicWorkflowCatalog: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [categories, setCategories] = useState<WorkflowCategory[]>([]);
  const [featuredWorkflows, setFeaturedWorkflows] = useState<WorkflowDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useState<WorkflowSearchParams>({});

  useEffect(() => {
    loadData();
  }, [searchParams]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [workflowsData, categoriesData, featuredData] = await Promise.all([
        workflowService.getPublicWorkflows(searchParams),
        workflowService.getWorkflowCategories(),
        searchParams.query || searchParams.category ? Promise.resolve([]) : workflowService.getFeaturedWorkflows()
      ]);

      setWorkflows(workflowsData);
      setCategories(categoriesData);
      setFeaturedWorkflows(featuredData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchParams(prev => ({ ...prev, query }));
  };

  const handleCategoryFilter = (category: string) => {
    setSearchParams(prev => ({ 
      ...prev, 
      category: category === prev.category ? undefined : category 
    }));
  };

  const handleSort = (sortBy: WorkflowSearchParams['sortBy']) => {
    setSearchParams(prev => ({ 
      ...prev, 
      sortBy,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'asc' ? 'desc' : 'asc'
    }));
  };



  if (isLoading) {
    return (
      <div className="public-catalog">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="public-catalog">
      <header className="catalog-header">
        <div className="container">
          <div className="header-content">
            <Link to="/" className="logo-link">
              <h1 className="logo">MuniStream</h1>
              <span className="tagline">{t('workflows.title')}</span>
            </Link>
            <div className="header-actions">
              <LanguageSwitcher variant="compact" />
              {isAuthenticated ? (
                <>
                  <Link to="/my-entities" className="btn-secondary">
                    📂 {t('my_entities.title')}
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
                </>
              ) : (
                <Link to="/auth" className="btn-secondary">{t('auth.login')}</Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="catalog-main">
        <div className="container">
          {/* Hero Section */}
          <section className="hero-section">
            <h2>{t('workflows.puente_title')}</h2>
            <p>{t('workflows.puente_subtitle')}</p>
          </section>


          {/* Search and Filters */}
          <section className="search-section">
            <div className="search-controls">
              <div className="search-input">
                <input
                  type="text"
                  placeholder={t('workflows.searchPlaceholder')}
                  value={searchParams.query || ''}
                  onChange={(e) => handleSearch(e.target.value)}
                />
                <button className="search-btn">🔍</button>
              </div>
              
              <div className="sort-controls">
                <label>{t('workflows.sortBy')}:</label>
                <button 
                  className={`sort-btn ${searchParams.sortBy === 'name' ? 'active' : ''}`}
                  onClick={() => handleSort('name')}
                >
                  {t('workflows.sortByName')} {searchParams.sortBy === 'name' && (searchParams.sortOrder === 'asc' ? '↑' : '↓')}
                </button>
                <button 
                  className={`sort-btn ${searchParams.sortBy === 'duration' ? 'active' : ''}`}
                  onClick={() => handleSort('duration')}
                >
                  {t('workflows.sortByDuration')} {searchParams.sortBy === 'duration' && (searchParams.sortOrder === 'asc' ? '↑' : '↓')}
                </button>
              </div>
            </div>

            {/* Category Filters */}
            <div className="category-filters">
              <button
                className={`category-btn ${!searchParams.category ? 'active' : ''}`}
                onClick={() => handleCategoryFilter('')}
              >
                🏛️ {t('workflows.allCategories')}
              </button>
              {categories.map(category => (
                <button
                  key={category.id}
                  className={`category-btn ${searchParams.category === category.id ? 'active' : ''}`}
                  onClick={() => handleCategoryFilter(category.id)}
                  style={{ 
                    borderColor: category.color || '#6b7280',
                    '--category-color': category.color || '#6b7280'
                  } as React.CSSProperties & { '--category-color': string }}
                >
                  <span className="category-icon">
                    {getCategoryIcon(category.icon || category.category_type)}
                  </span>
                  <span className="category-text">
                    <span className="category-name">{category.name}</span>
                    <span className="category-count">({category.count})</span>
                    {category.is_featured && <span className="featured-badge">★</span>}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {/* Featured Services (when no search/filter) */}
          {!searchParams.query && !searchParams.category && featuredWorkflows.length > 0 && (
            <section className="featured-section">
              <h3>{t('workflows.popular')}</h3>
              <div className="workflow-grid">
                {featuredWorkflows.map(workflow => (
                  <WorkflowCard key={workflow.id} workflow={workflow} />
                ))}
              </div>
            </section>
          )}

          {/* All Services */}
          <section className="services-section">
            <h3>
              {searchParams.query || searchParams.category ? t('workflows.searchResults') : t('workflows.allServices')}
              <span className="count">({workflows.length})</span>
            </h3>
            
            {workflows.length === 0 ? (
              <div className="no-results">
                <p>{t('workflows.noResults')}</p>
                {(searchParams.query || searchParams.category) && (
                  <button 
                    onClick={() => setSearchParams({})}
                    className="btn-secondary"
                  >
                    {t('workflows.clearFilters')}
                  </button>
                )}
              </div>
            ) : (
              <div className="workflow-grid">
                {workflows.map(workflow => (
                  <WorkflowCard key={workflow.id} workflow={workflow} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

interface WorkflowCardProps {
  workflow: WorkflowDefinition;
}

const WorkflowCard: React.FC<WorkflowCardProps> = ({ workflow }) => {
  const { t } = useTranslation();
  return (
    <Link to={`/services/${workflow.id}`} className="workflow-card">
      <div className="card-header">
        <h4>{workflow.name}</h4>
        <span className="category">{workflow.category}</span>
      </div>
      
      <div className="card-content">
        <p className="description">{workflow.description}</p>
        
        <div className="card-meta">
          <span className="duration">📅 {workflow.estimatedDuration}</span>
          <span className="steps">📋 {workflow.steps.length} {t('common.steps')}</span>
        </div>
        
        {workflow.requirements.length > 0 && (
          <div className="requirements">
            <strong>{t('workflows.requirements')}:</strong>
            <ul>
              {workflow.requirements.slice(0, 2).map((req, index) => (
                <li key={index}>{req}</li>
              ))}
              {workflow.requirements.length > 2 && (
                <li>+ {workflow.requirements.length - 2} more...</li>
              )}
            </ul>
          </div>
        )}
      </div>
      
      <div className="card-footer">
        <span className="cta">{t('workflows.learnMore')} →</span>
      </div>
    </Link>
  );
};