import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { MainLayout } from '../components/Layout/MainLayout';
import { EntityRecord } from '../components/EntityRecord';
import type { RecordEntity, RecordInstance, RecordWorkflow } from '../components/EntityRecord';
import { authService } from '../services/authService';
import './EntityDetailPage.css';

interface EntityDetail {
  entity: RecordEntity;
  available_workflows: RecordWorkflow[];
  recent_instances: RecordInstance[];
}

const API_BASE_URL = `${import.meta.env.VITE_API_URL}${import.meta.env.VITE_API_BASE_URL}`;

export const EntityDetailPage: React.FC = () => {
  const { entityId } = useParams<{ entityId: string }>();
  const { t } = useTranslation();
  const { isAuthenticated, login } = useAuth();

  const [detail, setDetail] = useState<EntityDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      login();
      return;
    }
    if (!entityId) return;

    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const token = authService.getToken();
        if (!token) {
          login();
          return;
        }
        const response = await fetch(`${API_BASE_URL}/public/entities/${entityId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.status === 401) {
          authService.logout();
          return;
        }
        if (!response.ok) throw new Error('load');
        const data = await response.json();
        if (!cancelled) setDetail(data);
      } catch {
        if (!cancelled) setError(t('entity.record.load_failed'));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [isAuthenticated, entityId]);

  if (!isAuthenticated) return null;

  const header = {
    variant: 'detail' as const,
    showBackLink: true,
    backLinkTo: '/my-entities',
    backLinkText: t('my_entities.title'),
  };

  if (isLoading) {
    return (
      <MainLayout headerProps={header}>
        <div className="entity-detail-page">
          <p className="entity-detail-state">{t('common.loading')}</p>
        </div>
      </MainLayout>
    );
  }

  if (error || !detail) {
    return (
      <MainLayout headerProps={header}>
        <div className="entity-detail-page">
          <p className="entity-detail-state is-error" role="alert">{error || t('entity.record.not_found')}</p>
          <Link to="/my-entities" className="entity-detail-back">{t('my_entities.title')}</Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout headerProps={header}>
      <div className="entity-detail-page">
        <EntityRecord
          entity={detail.entity}
          apiBaseUrl={API_BASE_URL}
          availableWorkflows={detail.available_workflows || []}
          recentInstances={detail.recent_instances || []}
          variant="full"
        />
      </div>
    </MainLayout>
  );
};
