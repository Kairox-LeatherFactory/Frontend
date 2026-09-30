/**
 * ============================================================================
 * STORE DASHBOARD HELPERS & FORMATTERS
 * ============================================================================
 */

export function formatDrawerStatus(status) {
  if (!status) return 'AVAILABLE';
  return status.replace(/_/g, ' ').toUpperCase();
}
