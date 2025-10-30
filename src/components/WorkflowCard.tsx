import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { WorkflowDefinition } from '../types/workflow';

interface WorkflowCardProps {
  workflow: WorkflowDefinition;
}

export const WorkflowCard: React.FC<WorkflowCardProps> = ({ workflow }) => {
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
          <span className="duration">{workflow.estimatedDuration}</span>
          <span className="steps">{workflow.steps.length} {t('common.steps')}</span>
        </div>

        {workflow.requirements.length > 0 && (
          <div className="requirements">
            <strong>{t('workflows.requirements')}:</strong>
            <ul>
              {workflow.requirements.slice(0, 2).map((req, index) => (
                <li key={index}>{req}</li>
              ))}
              {workflow.requirements.length > 2 && (
                <li>+ {workflow.requirements.length - 2} {t('common.more')}...</li>
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