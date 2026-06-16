import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, useMediaQuery, useTheme } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { workflowService } from '../../services/workflowService';
import { useAuth } from '../../contexts/AuthContext';
import keycloakService from '../../services/keycloak';
import type { WorkflowDefinition, WorkflowStep, StepFlowSegment, FlowStep } from '../../types/workflow';

// Theme-driven default for the service detail / pre-check page. Colors and fonts
// come from each tenant's theme via CSS variables (set in ThemeContext), so every
// tenant gets this layout in its own brand. Neutral greys are intentionally fixed.

// ── Types ──────────────────────────────────────────────────────────────────────

interface RequirementDetail {
  id: string;
  type: string;
  name: string;
  description: string;
  critical: boolean;
  fulfilled: boolean;
  message?: string;
  action_needed?: string;
  action_url?: string;
}

interface WorkflowPreCheck {
  workflow_id: string;
  overall_ready: boolean;
  operator_checks: Array<{
    task_id: string;
    ready: boolean;
    requirements: RequirementDetail[];
    missing_critical: string[];
  }>;
  message: string;
}

// ── Step indicator with interactive route forks ──────────────────────────────────

interface PhaseGroup {
  group: string | null;
  steps: WorkflowStep[];
}

// Fallback (no step_flow): hide gates and route-exclusive steps, show common only.
const visibleSteps = (steps: WorkflowStep[]): WorkflowStep[] =>
  (steps || []).filter(
    (s) =>
      (s as any).type !== 'ShortCircuitOperator' &&
      !(s.name || '').startsWith('Rama ') &&
      !s.branch
  );

const groupByPhase = (steps: WorkflowStep[]): PhaseGroup[] => {
  const phases: PhaseGroup[] = [];
  steps.forEach((step) => {
    const group = step.group ?? null;
    const last = phases[phases.length - 1];
    if (last && last.group === group) last.steps.push(step);
    else phases.push({ group, steps: [step] });
  });
  return phases;
};

const circleSx = {
  width: 36,
  height: 36,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '0.9em',
  fontWeight: 700,
  fontFamily: 'var(--font-family)',
  background: '#f1f5f9',
  color: '#94a3b8',
  border: '2px solid #e2e8f0',
  flexShrink: 0,
} as const;

const StepNode: React.FC<{ number: number; name: string }> = ({ number, name }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75, minWidth: 72 }}>
    <Box sx={circleSx}>{number}</Box>
    <Typography
      sx={{
        fontSize: '0.7em',
        color: '#94a3b8',
        fontFamily: 'var(--font-family)',
        textAlign: 'center',
        lineHeight: 1.2,
        maxWidth: 72,
        wordBreak: 'break-word',
      }}
    >
      {name}
    </Typography>
  </Box>
);

const Connector: React.FC = () => (
  <Box sx={{ width: 24, height: 2, mt: '17px', background: '#e2e8f0', flexShrink: 0 }} />
);

const PhaseLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography
    sx={{
      fontSize: '0.68em',
      fontWeight: 700,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'var(--secondary-color)',
      fontFamily: 'var(--font-family)',
      pl: 0.5,
    }}
  >
    {children}
  </Typography>
);

const barSx = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'flex-start',
  justifyContent: 'center',
  gap: { xs: 2, md: 3 },
  py: 3,
  px: { xs: 2, md: 6 },
  background: 'var(--background-paper)',
  borderBottom: '1px solid #e2e8f0',
  overflowX: 'auto',
} as const;

// Interactive stepper: common steps as numbered circles grouped by phase, and
// "fork" zones whose routes are clickable pills that expand that route's steps
// inline (default: first route). Numbering is continuous over the visible path.
const FlowStepper: React.FC<{ flow: StepFlowSegment[] }> = ({ flow }) => {
  const [selected, setSelected] = useState<Record<number, string>>({});
  let n = 0;
  let forkIdx = -1;

  const renderRow = (steps: FlowStep[], keyP: string) =>
    steps.map((s, i) => {
      n += 1;
      return (
        <React.Fragment key={`${keyP}-${s.id}`}>
          <StepNode number={n} name={s.name} />
          {i < steps.length - 1 && <Connector />}
        </React.Fragment>
      );
    });

  const renderStepsSegment = (steps: FlowStep[], keyP: string) => {
    const phases: { group: string | null; steps: FlowStep[] }[] = [];
    steps.forEach((s) => {
      const g = s.group ?? null;
      const last = phases[phases.length - 1];
      if (last && last.group === g) last.steps.push(s);
      else phases.push({ group: g, steps: [s] });
    });
    return phases.map((ph, pi) => (
      <Box key={`${keyP}-${pi}`} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {ph.group && <PhaseLabel>{ph.group}</PhaseLabel>}
        <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>{renderRow(ph.steps, `${keyP}-${pi}`)}</Box>
      </Box>
    ));
  };

  return (
    <Box sx={barSx}>
      {flow.map((seg, si) => {
        if (seg.type === 'steps') {
          return <React.Fragment key={`s${si}`}>{renderStepsSegment(seg.steps, `s${si}`)}</React.Fragment>;
        }
        forkIdx += 1;
        const fi = forkIdx;
        const routes = seg.routes || [];
        const sel = selected[fi] ?? routes[0]?.label;
        const selRoute = routes.find((r) => r.label === sel) || routes[0];
        return (
          <Box
            key={`f${si}`}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              p: 1.25,
              border: '1px dashed color-mix(in srgb, var(--primary-color) 40%, transparent)',
              borderRadius: '12px',
              background: 'color-mix(in srgb, var(--primary-color) 3%, transparent)',
            }}
          >
            {selRoute && selRoute.steps.length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
                {renderRow(selRoute.steps, `f${si}-${selRoute.label}`)}
              </Box>
            )}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75 }}>
              <PhaseLabel>
                <Box component="span" sx={{ color: 'var(--primary-color)' }}>Elige tu ruta</Box>
              </PhaseLabel>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 0.75 }}>
                {routes.map((r) => {
                  const active = r.label === sel;
                  return (
                    <Box
                      key={r.label}
                      component="button"
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSelected((p) => ({ ...p, [fi]: r.label }))}
                      sx={{
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor: active ? 'transparent' : 'color-mix(in srgb, var(--primary-color) 40%, transparent)',
                        background: active
                          ? 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%)'
                          : 'var(--background-paper)',
                        color: active ? '#ffffff' : 'var(--primary-color)',
                        fontWeight: 700,
                        fontSize: '0.8em',
                        fontFamily: 'var(--font-family)',
                        px: 1.5,
                        py: 0.6,
                        borderRadius: '999px',
                        transition: 'all 0.15s ease',
                        '&:hover': { borderColor: active ? 'transparent' : 'var(--primary-color)' },
                      }}
                    >
                      {r.label}
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

// Fallback bar when the backend doesn't provide step_flow (linear workflows).
const ProgressBar: React.FC<{ steps: WorkflowStep[] }> = ({ steps }) => {
  const shown = visibleSteps(steps);
  if (shown.length === 0) return null;
  const phases = groupByPhase(shown);
  const hasPhases = phases.some((p) => p.group);
  let runningNumber = 0;
  return (
    <Box sx={barSx}>
      {phases.map((phase, pi) => (
        <Box key={`${phase.group ?? 'phase'}-${pi}`} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {hasPhases && <PhaseLabel>{phase.group || ' '}</PhaseLabel>}
          <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
            {phase.steps.map((step, i) => {
              runningNumber += 1;
              return (
                <React.Fragment key={step.id}>
                  <StepNode number={runningNumber} name={step.name} />
                  {i < phase.steps.length - 1 && <Connector />}
                </React.Fragment>
              );
            })}
          </Box>
        </Box>
      ))}
    </Box>
  );
};

// ── Info Card ──────────────────────────────────────────────────────────────────

const InfoCard: React.FC<{ label: string; value: string; valueColor?: string }> = ({
  label,
  value,
  valueColor = 'var(--text-primary)',
}) => (
  <Box
    sx={{
      background: 'var(--background-paper)',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 0.5,
    }}
  >
    <Typography
      sx={{
        color: 'var(--text-secondary)',
        fontSize: '0.82em',
        fontWeight: 500,
        fontFamily: 'var(--font-family)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}
    >
      {label}
    </Typography>
    <Typography
      sx={{
        fontSize: '1.25em',
        fontWeight: 700,
        color: valueColor,
        fontFamily: 'var(--font-family-headings)',
        lineHeight: 1.3,
      }}
    >
      {value}
    </Typography>
  </Box>
);

// ── Main Component ─────────────────────────────────────────────────────────────

export const WorkflowDetailContent: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [workflow, setWorkflow] = useState<WorkflowDefinition | null>(null);
  const [allWorkflows, setAllWorkflows] = useState<WorkflowDefinition[]>([]);
  const [preCheck, setPreCheck] = useState<WorkflowPreCheck | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) loadData(id);
  }, [id]);

  useEffect(() => {
    if (workflow?.workflow_id) runPreCheck(workflow.workflow_id);
  }, [workflow, isAuthenticated]);

  const loadData = async (workflowId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const [wf, wfs] = await Promise.all([
        workflowService.getWorkflowById(workflowId),
        workflowService.getPublicWorkflows(),
      ]);
      setWorkflow(wf);
      setAllWorkflows(wfs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el trámite');
    } finally {
      setIsLoading(false);
    }
  };

  const runPreCheck = async (workflowId: string) => {
    try {
      const data = await workflowService.getWorkflowPreCheck(workflowId);
      setPreCheck(data);
    } catch {
      // pre-check is optional
    }
  };

  const handleStart = async () => {
    if (!isAuthenticated) {
      keycloakService.login();
      return;
    }
    if (!workflow) return;
    try {
      setIsStarting(true);
      const response = await workflowService.startWorkflow(workflow.workflow_id!, {});
      navigate(`/instances/${response.instance_id}`);
    } catch {
      alert('No se pudo iniciar el trámite. Intente nuevamente.');
    } finally {
      setIsStarting(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress sx={{ color: 'var(--primary-color)' }} />
      </Box>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────

  if (error || !workflow) {
    return (
      <Box sx={{ textAlign: 'center', py: 10, px: 3 }}>
        <Typography sx={{ fontSize: '1.2em', color: 'var(--primary-color)', mb: 2, fontFamily: 'var(--font-family-headings)', fontWeight: 700 }}>
          Trámite no encontrado
        </Typography>
        <Typography sx={{ color: 'var(--text-secondary)', mb: 4, fontFamily: 'var(--font-family)' }}>
          {error || 'El trámite solicitado no está disponible.'}
        </Typography>
        <Box
          component="button"
          onClick={() => navigate('/services')}
          sx={{
            background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            px: 4,
            py: 1.5,
            fontSize: '1em',
            fontWeight: 600,
            fontFamily: 'var(--font-family)',
            cursor: 'pointer',
            boxShadow: '0 4px 12px color-mix(in srgb, var(--primary-color) 25%, transparent)',
          }}
        >
          ← Volver a Trámites
        </Box>
      </Box>
    );
  }

  // ── Data derivations ───────────────────────────────────────────────────────

  const requirements: string[] = workflow.requirements ?? [];
  const duration = workflow.estimated_duration || (workflow as any).estimatedDuration;
  const cost = workflow.cost;

  // Group workflows by category for sidebar
  const categoryMap = new Map<string, WorkflowDefinition[]>();
  for (const wf of allWorkflows) {
    const cat = wf.category || 'General';
    if (!categoryMap.has(cat)) categoryMap.set(cat, []);
    categoryMap.get(cat)!.push(wf);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ width: '100%', fontFamily: 'var(--font-family)' }}>
      {/* Step indicator: interactive forks when the workflow branches */}
      {workflow.step_flow && workflow.step_flow.length > 0 ? (
        <FlowStepper flow={workflow.step_flow} />
      ) : (
        <ProgressBar steps={workflow.steps} />
      )}

      {/* Main layout */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '280px 1fr',
          minHeight: 'calc(100vh - 200px)',
        }}
      >
        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        {!isMobile && (
          <Box
            component="aside"
            sx={{
              background: 'var(--primary-color)',
              overflowY: 'auto',
              borderRight: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <Box sx={{ px: 3, pt: 3, pb: 2, borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
              <Typography
                sx={{
                  color: 'rgba(255,255,255,0.65)',
                  fontSize: '0.72em',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-family)',
                }}
              >
                Trámites
              </Typography>
            </Box>

            {Array.from(categoryMap.entries()).map(([cat, wfs]) => (
              <Box key={cat} sx={{ mb: 0.5 }}>
                <Box sx={{ px: 3, py: 1.25, borderLeft: '3px solid var(--secondary-color)', background: 'rgba(0,0,0,0.15)' }}>
                  <Typography
                    sx={{
                      color: 'var(--secondary-color)',
                      fontSize: '0.75em',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      fontFamily: 'var(--font-family)',
                    }}
                  >
                    {cat}
                  </Typography>
                </Box>

                {wfs.map((wf) => {
                  const isActive = wf.id === id || wf.workflow_id === id;
                  return (
                    <Box
                      key={wf.id || wf.workflow_id}
                      component="button"
                      onClick={() => navigate(`/services/${wf.id || wf.workflow_id}`)}
                      sx={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        px: 3,
                        py: 1.5,
                        border: 'none',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                        borderLeft: isActive ? '3px solid var(--secondary-color)' : '3px solid transparent',
                        background: isActive ? 'color-mix(in srgb, var(--secondary-color) 18%, transparent)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        '&:hover': isActive
                          ? {}
                          : {
                              background: 'rgba(255,255,255,0.08)',
                              borderLeftColor: 'color-mix(in srgb, var(--secondary-color) 50%, transparent)',
                            },
                      }}
                    >
                      <Typography
                        sx={{
                          color: isActive ? 'var(--secondary-color)' : 'rgba(255,255,255,0.88)',
                          fontSize: '0.875em',
                          fontWeight: isActive ? 700 : 400,
                          fontFamily: 'var(--font-family)',
                          lineHeight: 1.4,
                        }}
                      >
                        {wf.name}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            ))}
          </Box>
        )}

        {/* ── Main Content ─────────────────────────────────────────────────── */}
        <Box
          component="main"
          sx={{
            background: 'var(--background-default)',
            px: { xs: 2.5, md: 5 },
            py: { xs: 3, md: 5 },
            overflowY: 'auto',
          }}
        >
          <Typography
            component="h1"
            sx={{
              fontSize: { xs: '1.4em', md: '1.8em' },
              fontWeight: 600,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-family-headings)',
              mb: 1.5,
              lineHeight: 1.3,
            }}
          >
            {workflow.name}
          </Typography>

          {workflow.description && (
            <Typography
              sx={{
                color: 'var(--text-secondary)',
                fontSize: '1.05em',
                fontFamily: 'var(--font-family)',
                lineHeight: 1.65,
                mb: 3,
                maxWidth: 700,
              }}
            >
              {workflow.description}
            </Typography>
          )}

          {/* CTA */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 4 }}>
            <Box
              component="button"
              onClick={handleStart}
              disabled={isStarting || (preCheck !== null && !preCheck.overall_ready)}
              sx={{
                background:
                  preCheck !== null && !preCheck.overall_ready
                    ? '#e2e8f0'
                    : 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%)',
                color: preCheck !== null && !preCheck.overall_ready ? '#94a3b8' : '#ffffff',
                border: 'none',
                borderRadius: '10px',
                px: 4,
                py: 1.625,
                fontSize: '1em',
                fontWeight: 600,
                fontFamily: 'var(--font-family)',
                cursor:
                  isStarting || (preCheck !== null && !preCheck.overall_ready) ? 'not-allowed' : 'pointer',
                boxShadow:
                  preCheck !== null && !preCheck.overall_ready
                    ? 'none'
                    : '0 4px 16px color-mix(in srgb, var(--primary-color) 30%, transparent)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                '&:hover': {
                  transform:
                    isStarting || (preCheck !== null && !preCheck.overall_ready) ? 'none' : 'translateY(-2px)',
                  boxShadow:
                    isStarting || (preCheck !== null && !preCheck.overall_ready)
                      ? 'none'
                      : '0 6px 20px color-mix(in srgb, var(--primary-color) 40%, transparent)',
                },
              }}
            >
              {isStarting ? (
                <>
                  <CircularProgress size={18} sx={{ color: 'inherit' }} />
                  Iniciando...
                </>
              ) : (
                'Iniciar Trámite →'
              )}
            </Box>
            {!isAuthenticated && (
              <Typography sx={{ color: 'var(--text-secondary)', fontSize: '0.875em', fontFamily: 'var(--font-family)' }}>
                Necesitas{' '}
                <Box
                  component="button"
                  onClick={() => keycloakService.login()}
                  sx={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary-color)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    fontFamily: 'var(--font-family)',
                    fontSize: 'inherit',
                    p: 0,
                  }}
                >
                  iniciar sesión
                </Box>{' '}
                para continuar
              </Typography>
            )}

            {preCheck?.operator_checks
              .flatMap((op) => op.requirements)
              .filter((req) => req.critical && !req.fulfilled && req.action_needed && req.action_url)
              .map((req) => (
                <Typography key={req.id} sx={{ color: 'var(--text-secondary)', fontSize: '0.875em', fontFamily: 'var(--font-family)' }}>
                  <Box
                    component="button"
                    onClick={() => navigate(req.action_url!)}
                    sx={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary-color)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      fontFamily: 'var(--font-family)',
                      fontSize: 'inherit',
                      p: 0,
                    }}
                  >
                    {req.action_needed}
                  </Box>{' '}
                  para continuar con este trámite
                </Typography>
              ))}
          </Box>

          {/* Info cards */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
              gap: '20px',
              mb: 4,
            }}
          >
            <InfoCard label="Tiempo estimado" value={duration || 'Por determinar'} />
            <InfoCard
              label="Costo"
              value={cost ? `$${cost} MXN` : 'Sin costo'}
              valueColor={cost ? 'var(--primary-color)' : 'var(--text-primary)'}
            />
            <InfoCard label="Modalidad" value="En línea" />
          </Box>

          {/* Documents required */}
          {requirements.length > 0 && (
            <Box
              sx={{
                background: 'var(--background-paper)',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                mb: 3,
                overflow: 'hidden',
              }}
            >
              <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #e2e8f0' }}>
                <Typography sx={{ fontSize: '1.1em', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-family-headings)' }}>
                  Documentos requeridos
                </Typography>
              </Box>

              <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {requirements.map((req: string, i: number) => (
                  <Box
                    key={i}
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1.5,
                      px: 2,
                      py: 1.5,
                      background: 'var(--background-default)',
                      borderRadius: '8px',
                    }}
                  >
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: i % 2 === 0 ? 'var(--primary-color)' : 'var(--secondary-color)',
                        mt: '5px',
                        flexShrink: 0,
                      }}
                    />
                    <Typography sx={{ fontSize: '0.9em', fontWeight: 500, color: '#334155', fontFamily: 'var(--font-family)', lineHeight: 1.5 }}>
                      {req}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* Important alert */}
          <Box
            sx={{
              background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
              border: '1px solid #fde68a',
              borderRadius: '10px',
              px: 3,
              py: 2,
              mb: 4,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1.5,
            }}
          >
            <Typography sx={{ fontSize: '1.2em', flexShrink: 0, mt: '2px' }}>⚠️</Typography>
            <Typography sx={{ fontSize: '0.9em', color: '#92400e', fontFamily: 'var(--font-family)', lineHeight: 1.6 }}>
              <strong>Importante:</strong> Para continuar con este trámite deberá contar con todos los
              documentos requeridos en formato digital (PDF o imagen). Asegúrese de que los archivos sean
              legibles y estén vigentes antes de iniciar.
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default WorkflowDetailContent;
