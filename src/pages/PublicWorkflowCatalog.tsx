import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { workflowService } from '../services/workflowService';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import type { WorkflowDefinition, WorkflowCategory, WorkflowSearchParams } from '../types/workflow';

export const PublicWorkflowCatalog: React.FC = () => {
  const { t } = useTranslation();
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
          <p>Loading services...</p>
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
              <span className="tagline">Government Services</span>
            </Link>
            <div className="header-actions">
              <Link to="/auth" className="btn-secondary">Sign In</Link>
            </div>
          </div>
        </div>
      </header>

      <main className="catalog-main">
        <div className="container">
          {/* Hero Section */}
          <section className="hero-section">
            <h2>Browse Government Services</h2>
            <p>Discover and learn about available government services and processes</p>
          </section>

          {/* Search and Filters */}
          <section className="search-section">
            <div className="search-controls">
              <div className="search-input">
                <input
                  type="text"
                  placeholder="Search services..."
                  value={searchParams.query || ''}
                  onChange={(e) => handleSearch(e.target.value)}
                />
                <button className="search-btn">🔍</button>
              </div>
              
              <div className="sort-controls">
                <label>Sort by:</label>
                <button 
                  className={`sort-btn ${searchParams.sortBy === 'name' ? 'active' : ''}`}
                  onClick={() => handleSort('name')}
                >
                  Name {searchParams.sortBy === 'name' && (searchParams.sortOrder === 'asc' ? '↑' : '↓')}
                </button>
                <button 
                  className={`sort-btn ${searchParams.sortBy === 'duration' ? 'active' : ''}`}
                  onClick={() => handleSort('duration')}
                >
                  Duration {searchParams.sortBy === 'duration' && (searchParams.sortOrder === 'asc' ? '↑' : '↓')}
                </button>
              </div>
            </div>

            {/* Category Filters */}
            <div className="category-filters">
              <button
                className={`category-btn ${!searchParams.category ? 'active' : ''}`}
                onClick={() => handleCategoryFilter('')}
              >
                All Categories
              </button>
              {categories.map(category => (
                <button
                  key={category.id}
                  className={`category-btn ${searchParams.category === category.id ? 'active' : ''}`}
                  onClick={() => handleCategoryFilter(category.id)}
                >
                  {category.name} ({category.workflowCount})
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
              <h3>Popular Services</h3>
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
              {searchParams.query || searchParams.category ? 'Search Results' : 'All Services'}
              <span className="count">({workflows.length})</span>
            </h3>
            
            {workflows.length === 0 ? (
              <div className="no-results">
                <p>No services found matching your criteria.</p>
                {(searchParams.query || searchParams.category) && (
                  <button 
                    onClick={() => setSearchParams({})}
                    className="btn-secondary"
                  >
                    Clear Filters
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
          <span className="steps">📋 {workflow.steps.length} steps</span>
        </div>
        
        {workflow.requirements.length > 0 && (
          <div className="requirements">
            <strong>Requirements:</strong>
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
        <span className="cta">Learn More →</span>
      </div>
    </Link>
  );
};