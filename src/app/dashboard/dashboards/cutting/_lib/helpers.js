/**
 * ============================================================================
 * CUTTING DASHBOARD HELPERS & FORMATTERS
 * ============================================================================
 */

export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts.slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

export function formatDCM(val) {
  if (val === undefined || val === null) return '—';
  return `${Number(val).toLocaleString()} DCM`;
}

export function formatSqft(val) {
  if (val === undefined || val === null) return '—';
  return `${Number(val).toLocaleString()} sqft`;
}
