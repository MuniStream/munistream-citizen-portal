import React, { useState } from 'react';
import './AssertionReview.css';

export interface AssertionResult {
  id: string;
  label: string;
  description?: string;
  left_value: any;
  right_value: any;
  left_path: string;
  right_path: string;
  operator: string;
  system_result: boolean;
  critical?: boolean;
}

interface AssertionReviewProps {
  title: string;
  description: string;
  assertions: AssertionResult[];
  onSubmit: (data: Record<string, any>) => void;
  isSubmitting?: boolean;
}

type UserDecision = 'confirm' | 'override';

interface DecisionState {
  decision: UserDecision;
  comment: string;
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function formatOperator(op: string): string {
  const labels: Record<string, string> = {
    '==': 'igual a',
    '!=': 'distinto de',
    '>': 'mayor que',
    '<': 'menor que',
    '>=': 'mayor o igual a',
    '<=': 'menor o igual a',
    'contains': 'contiene',
    'not_contains': 'no contiene',
    'startswith': 'empieza con',
    'endswith': 'termina con',
    'matches': 'coincide con (regex)',
  };
  return labels[op] ?? op;
}

export const AssertionReview: React.FC<AssertionReviewProps> = ({
  title,
  description,
  assertions,
  onSubmit,
  isSubmitting = false,
}) => {
  const initialDecisions: Record<string, DecisionState> = {};
  assertions.forEach((a) => {
    initialDecisions[a.id] = {
      decision: a.system_result ? 'confirm' : 'override',
      comment: '',
    };
  });

  const [decisions, setDecisions] = useState<Record<string, DecisionState>>(initialDecisions);

  const setDecision = (id: string, decision: UserDecision) => {
    setDecisions((prev) => ({ ...prev, [id]: { ...prev[id], decision } }));
  };

  const setComment = (id: string, comment: string) => {
    setDecisions((prev) => ({ ...prev, [id]: { ...prev[id], comment } }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ decisions });
  };

  const passedCount = assertions.filter((a) => a.system_result).length;
  const overrideCount = Object.values(decisions).filter((d) => d.decision === 'override').length;

  const hasCriticalBlocked = assertions.some(
    (a) => a.critical && !a.system_result && decisions[a.id]?.decision === 'override'
  );

  return (
    <div className="assertion-review">
      <div className="assertion-review__header">
        <h2 className="assertion-review__title">{title}</h2>
        {description && <p className="assertion-review__description">{description}</p>}

        <div className="assertion-review__summary">
          <span className="summary-badge summary-badge--pass">
            ✓ {passedCount} de {assertions.length} pasaron
          </span>
          {overrideCount > 0 && (
            <span className="summary-badge summary-badge--override">
              ↺ {overrideCount} sobreescrita{overrideCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="assertion-review__list">
          {assertions.map((assertion) => {
            const decisionState = decisions[assertion.id];
            const isOverride = decisionState?.decision === 'override';
            const isCriticalFail = assertion.critical && !assertion.system_result;

            return (
              <div
                key={assertion.id}
                className={[
                  'assertion-item',
                  assertion.system_result ? 'assertion-item--pass' : 'assertion-item--fail',
                  isCriticalFail ? 'assertion-item--critical' : '',
                ].join(' ')}
              >
                <div className="assertion-item__top">
                  <div className="assertion-item__label-row">
                    <span
                      className={`assertion-badge ${assertion.system_result ? 'assertion-badge--pass' : 'assertion-badge--fail'}`}
                    >
                      {assertion.system_result ? '✓ Correcto' : '✗ Incorrecto'}
                    </span>
                    <strong className="assertion-item__label">{assertion.label}</strong>
                    {isCriticalFail && (
                      <span className="assertion-badge assertion-badge--critical">⚠ Crítico</span>
                    )}
                  </div>

                  {assertion.description && (
                    <p className="assertion-item__description">{assertion.description}</p>
                  )}

                  <div className="assertion-item__values">
                    <span className="value-block">
                      <span className="value-label">Valor capturado</span>
                      <code className="value-code">{formatValue(assertion.left_value)}</code>
                    </span>
                    <span className="operator-label">{formatOperator(assertion.operator)}</span>
                    <span className="value-block">
                      <span className="value-label">Valor del sistema</span>
                      <code className="value-code">{formatValue(assertion.right_value)}</code>
                    </span>
                  </div>
                </div>

                <div className="assertion-item__decision">
                  {isCriticalFail ? (
                    <p className="assertion-item__critical-note">
                      Esta aserción es crítica y no puede sobreescribirse. El proceso no podrá continuar.
                    </p>
                  ) : (
                    <div className="decision-toggle">
                      <label
                        className={`decision-option ${decisionState?.decision === 'confirm' ? 'decision-option--selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name={`decision-${assertion.id}`}
                          value="confirm"
                          checked={decisionState?.decision === 'confirm'}
                          onChange={() => setDecision(assertion.id, 'confirm')}
                          disabled={isSubmitting}
                        />
                        Confirmar
                      </label>
                      <label
                        className={`decision-option decision-option--override ${decisionState?.decision === 'override' ? 'decision-option--selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name={`decision-${assertion.id}`}
                          value="override"
                          checked={decisionState?.decision === 'override'}
                          onChange={() => setDecision(assertion.id, 'override')}
                          disabled={isSubmitting}
                        />
                        Sobreescribir
                      </label>
                    </div>
                  )}

                  {isOverride && !isCriticalFail && (
                    <textarea
                      className="assertion-item__comment"
                      placeholder="Comentario (opcional): explique por qué sobreescribe este resultado..."
                      value={decisionState?.comment ?? ''}
                      onChange={(e) => setComment(assertion.id, e.target.value)}
                      disabled={isSubmitting}
                      rows={2}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {hasCriticalBlocked && (
          <div className="assertion-review__critical-warning">
            ⚠ Hay aserciones críticas que fallaron. No es posible continuar el proceso.
          </div>
        )}

        <div className="assertion-review__footer">
          <button
            type="submit"
            className="btn-primary"
            disabled={isSubmitting || hasCriticalBlocked}
          >
            {isSubmitting ? 'Enviando...' : 'Confirmar y Continuar'}
          </button>
        </div>
      </form>
    </div>
  );
};
