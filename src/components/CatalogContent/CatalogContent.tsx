import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Typography, CircularProgress } from '@mui/material';
import { workflowService } from '../../services/workflowService';
import { WorkflowCard } from '../WorkflowCard';
import type { WorkflowDefinition, WorkflowCategory, WorkflowSearchParams } from '../../types/workflow';

const getCategoryIcon = (iconOrType?: string): string => {
  const iconMap: Record<string, string> = {
    'edit': '•', 'lock': '•', 'x-circle': '•', 'award': '•',
    'home': '•', 'arrow-right': '•', 'calculator': '•',
    'document': '•', 'link': '•', 'rpp': '•', 'catastro': '•', 'vinculado': '•'
  };
  return iconMap[iconOrType || ''] || '•';
};

export const CatalogContent: React.FC = () => {
  const { t } = useTranslation();
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [categories, setCategories] = useState<WorkflowCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useState<WorkflowSearchParams>({});

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [workflowsData, categoriesData] = await Promise.all([
          workflowService.getPublicWorkflows(searchParams),
          workflowService.getWorkflowCategories()
        ]);
        setWorkflows(workflowsData);
        setCategories(categoriesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [searchParams]);

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
      <Box sx={{ minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress color="primary" />
          <Typography sx={{ mt: 2 }}>{t('common.loading')}</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <div className="public-catalog">
      <main className="catalog-main">
        <div className="container">
<section className="search-section">
            <div className="search-controls">
              <div className="search-input">
                <input
                  type="text"
                  placeholder={t('workflows.searchPlaceholder')}
                  value={searchParams.query || ''}
                  onChange={(e) => handleSearch(e.target.value)}
                />
                <button className="search-btn">Buscar</button>
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

            <div className="category-filters">
              <button
                className={`category-btn ${!searchParams.category ? 'active' : ''}`}
                onClick={() => handleCategoryFilter('')}
              >
                {t('workflows.allCategories')}
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
                    <span className="category-count">({(category as any).count || 0})</span>
                    {category.is_featured && <span className="featured-badge">★</span>}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {error && <div className="error-message">{error}</div>}

          <section className="services-section">
            <h3>
              {searchParams.query || searchParams.category ? t('workflows.searchResults') : t('workflows.allServices')}
              <span className="count">({workflows.length})</span>
            </h3>
            {workflows.length === 0 ? (
              <div className="no-results">
                <p>{t('workflows.noResults')}</p>
                {(searchParams.query || searchParams.category) && (
                  <button onClick={() => setSearchParams({})} className="btn-secondary">
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
