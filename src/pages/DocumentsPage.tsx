import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  CircularProgress
} from '@mui/material';
import { workflowService } from '../services/workflowService';
import { Header } from '../components/Header';
import { WorkflowCard } from '../components/WorkflowCard';
import type { WorkflowDefinition } from '../types/workflow';

export const DocumentsPage: React.FC = () => {
  const { t } = useTranslation();
  const [documentWorkflows, setDocumentWorkflows] = useState<WorkflowDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadDocumentWorkflows();
  }, []);

  const loadDocumentWorkflows = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Use the dedicated documents endpoint
      const documentWorkflows = await workflowService.getDocumentWorkflows();

      setDocumentWorkflows(documentWorkflows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document workflows');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredWorkflows = documentWorkflows.filter(workflow =>
    workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    workflow.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress color="primary" />
          <Typography sx={{ mt: 2 }}>{t('common.loading')}</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <div className="documents-page">
      <Header variant="catalog" />

      <main className="catalog-main">
        <div className="container">
          {/* Hero Section */}
          <section className="hero-section">
            <h2>{t('documents.title')}</h2>
            <p>{t('documents.subtitle')}</p>
          </section>

          {/* Main Navigation Menu */}
          <section className="main-navigation">
            <div className="nav-cards">
              <Link to="/services" className="nav-card">
                <div className="nav-content">
                  <h3>{t('navigation.services')}</h3>
                  <p>Trámites y servicios gubernamentales</p>
                </div>
              </Link>

              <Link to="/documents" className="nav-card active">
                <div className="nav-content">
                  <h3>{t('navigation.documents')}</h3>
                  <p>Procese sus documentos oficiales</p>
                </div>
              </Link>
            </div>
          </section>

          {/* Search Section */}
          <section className="search-section">
            <div className="search-controls">
              <div className="search-input">
                <input
                  type="text"
                  placeholder={t('documents.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button className="search-btn">Buscar</button>
              </div>
            </div>
          </section>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {/* Document Workflows */}
          <section className="services-section">
            <h3>
              {t('documents.availableDocuments')}
              <span className="count">({filteredWorkflows.length})</span>
            </h3>

            {filteredWorkflows.length === 0 ? (
              <div className="no-results">
                <p>{searchQuery ? t('documents.noResults') : t('documents.noDocuments')}</p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="btn-secondary"
                  >
                    {t('workflows.clearFilters')}
                  </button>
                )}
              </div>
            ) : (
              <div className="workflow-grid">
                {filteredWorkflows.map(workflow => (
                  <WorkflowCard key={workflow.id} workflow={workflow} />
                ))}
              </div>
            )}
          </section>

          {/* Information Section */}
          <section className="info-section">
            <div className="info-card">
              <h4>{t('documents.aboutTitle')}</h4>
              <p>{t('documents.aboutDescription')}</p>

              <div className="document-tips">
                <h5>{t('documents.tipsTitle')}</h5>
                <ul>
                  <li>{t('documents.tip1')}</li>
                  <li>{t('documents.tip2')}</li>
                  <li>{t('documents.tip3')}</li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};