// Shared status helpers for the trámite detail screen. Centralised so the
// header, step timeline and clock all agree on colours and labels, and so the
// backend's status vocabulary (executing/running/waiting/skipped/…) maps to a
// single canonical set.

export type CanonicalStatus =
  | 'completed'
  | 'in_progress'
  | 'failed'
  | 'waiting'
  | 'pending'
  | 'skipped';

export const normalizeStatus = (status?: string): CanonicalStatus => {
  switch (status) {
    case 'completed':
      return 'completed';
    case 'executing':
    case 'in_progress':
    case 'running':
      return 'in_progress';
    case 'failed':
      return 'failed';
    case 'waiting':
    case 'paused':
    case 'awaiting_input':
    case 'pending_validation':
    case 'pending_assignment':
    case 'waiting_for_start':
      return 'waiting';
    case 'skipped':
      return 'skipped';
    default:
      return 'pending';
  }
};

export const getStatusColor = (status?: string): string => {
  switch (normalizeStatus(status)) {
    case 'completed':
      return '#4caf50';
    case 'in_progress':
      return '#2196f3';
    case 'failed':
      return '#f44336';
    case 'waiting':
      return '#ff9800';
    case 'skipped':
      return '#bdbdbd';
    case 'pending':
    default:
      return '#9e9e9e';
  }
};

// i18n key under the existing `status.*` namespace (see locales/es.json).
export const statusI18nKey = (status?: string): string => {
  const canonical = normalizeStatus(status);
  return `status.${canonical === 'skipped' ? 'pending' : canonical}`;
};

// Instance-level helpers: is the trámite still active (worth refreshing / show
// the clock) vs. finished (hide refresh, show emitted entities).
export const isDoneStatus = (status?: string): boolean =>
  status === 'completed' || status === 'failed' || status === 'cancelled';

export const isActiveStatus = (status?: string): boolean => !isDoneStatus(status);
