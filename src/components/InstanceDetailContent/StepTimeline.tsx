import React from 'react';
import { useTranslation } from 'react-i18next';
import type { StepProgress } from '../../services/workflowService';
import { getStatusColor, normalizeStatus, statusI18nKey } from './statusHelpers';

interface StepTimelineProps {
  steps: StepProgress[];
  routeLabel?: string;
  /** Id of the step currently being processed, if any. */
  currentStepId?: string;
  formatDate: (dateString: string) => string;
}

interface PhaseGroup {
  group: string | null;
  steps: StepProgress[];
}

// Group consecutive steps by their `group` attribute, preserving order.
const groupByPhase = (steps: StepProgress[]): PhaseGroup[] => {
  const phases: PhaseGroup[] = [];
  steps.forEach((step) => {
    const group = step.group ?? null;
    const last = phases[phases.length - 1];
    if (last && last.group === group) {
      last.steps.push(step);
    } else {
      phases.push({ group, steps: [step] });
    }
  });
  return phases;
};

const StepTimeline: React.FC<StepTimelineProps> = ({
  steps,
  routeLabel,
  currentStepId,
  formatDate,
}) => {
  const { t } = useTranslation();

  if (!steps || steps.length === 0) return null;

  const phases = groupByPhase(steps);
  const hasPhases = phases.some((p) => p.group);

  // Continuous 1..N numbering across phases over the visible steps only.
  let runningNumber = 0;

  return (
    <section className="steps-timeline-section">
      <div className="container">
        <div className="timeline-heading">
          <h2>{t('instanceDetail.progressTitle')}</h2>
          {routeLabel && (
            <span className="route-chip" title={t('instanceDetail.routeLabel')}>
              {routeLabel}
            </span>
          )}
        </div>

        {phases.map((phase, phaseIndex) => (
          <div className="timeline-phase" key={`${phase.group ?? 'phase'}-${phaseIndex}`}>
            {hasPhases && phase.group && (
              <h3 className="phase-title">{phase.group}</h3>
            )}

            <div className="timeline">
              {phase.steps.map((step, indexInPhase) => {
                runningNumber += 1;
                const canonical = normalizeStatus(step.status);
                const isActive =
                  canonical === 'in_progress' ||
                  canonical === 'waiting' ||
                  step.step_id === currentStepId;
                const isLastInPhase = indexInPhase === phase.steps.length - 1;

                return (
                  <div
                    key={step.step_id}
                    className={`timeline-item ${canonical}${isActive ? ' active' : ''}`}
                  >
                    <div className="timeline-marker">
                      <span
                        className="marker-number"
                        style={{ backgroundColor: getStatusColor(step.status) }}
                      >
                        {canonical === 'completed' ? '✓' : runningNumber}
                      </span>
                      {!isLastInPhase && <div className="timeline-line" />}
                    </div>

                    <div className="timeline-content">
                      <div className="step-header">
                        <h4>{step.name}</h4>
                        <span
                          className="step-status"
                          style={{ backgroundColor: getStatusColor(step.status) }}
                        >
                          {t(statusI18nKey(step.status))}
                        </span>
                      </div>

                      {step.description && step.description !== `Step ${step.step_id}` && (
                        <p className="step-description">{step.description}</p>
                      )}

                      <div className="step-details">
                        {step.started_at && (
                          <span className="step-time">
                            <i className="icon-clock" aria-hidden="true"></i>
                            {t('workflow.started')}: {formatDate(step.started_at)}
                          </span>
                        )}
                        {step.completed_at && canonical === 'completed' && (
                          <span className="step-time">
                            <i className="icon-check" aria-hidden="true"></i>
                            {t('workflow.completed')}: {formatDate(step.completed_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default StepTimeline;
