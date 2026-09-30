/**
 * ============================================================================
 * DIRECT MANAGER DASHBOARD HELPERS & FORMATTERS
 * ============================================================================
 */

export function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts.slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

export function formatStage(stage) {
  if (!stage) return '—';
  return String(stage).replace(/_/g, ' ');
}
