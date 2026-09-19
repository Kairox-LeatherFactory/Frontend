import { PIPELINE_STAGE_ORDER, PIECE_HISTORY_STAGE_ORDER } from './constants';

/**
 * ============================================================================
 * STITCHING DASHBOARD UTILITY HELPERS
 * ============================================================================
 * Formatting, sorting, and data manipulation helper functions.
 */

// ============================================================================
// 1. FORMAT STAGE NAME
// ============================================================================
/**
 * Converts snake_case stage identifiers into readable title format.
 * Example: 'LINE_STITCHING' -> 'LINE STITCHING'
 */
export function formatStage(stage) {
  if (!stage) return '—';
  return stage.replace(/_/g, ' ');
}

// ============================================================================
// 2. EXTRACT USER INITIALS
// ============================================================================
/**
 * Extracts 2-letter uppercase initials from an employee name string.
 * Example: 'John Doe' -> 'JD'
 */
export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts.slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

// ============================================================================
// 3. PIPELINE STAGE SORTING
// ============================================================================
/**
 * Sorts an array of stage objects according to the canonical leather production chain.
 */
export function sortByCanonicalStageOrder(list, stageKey = 'stage') {
  return [...list].sort((a, b) => {
    const ai = PIPELINE_STAGE_ORDER.indexOf(a[stageKey]);
    const bi = PIPELINE_STAGE_ORDER.indexOf(b[stageKey]);
    return (ai === -1 ? PIPELINE_STAGE_ORDER.length : ai) - (bi === -1 ? PIPELINE_STAGE_ORDER.length : bi);
  });
}

// ============================================================================
// 4. PIECE JOURNEY HISTORY SORTING
// ============================================================================
/**
 * Sorts piece history audit events according to chronological manufacturing steps.
 */
export function sortPieceHistory(history) {
  return [...(history || [])].sort((a, b) => {
    const ai = PIECE_HISTORY_STAGE_ORDER.indexOf(a.stage);
    const bi = PIECE_HISTORY_STAGE_ORDER.indexOf(b.stage);
    return (ai === -1 ? PIECE_HISTORY_STAGE_ORDER.length : ai) - (bi === -1 ? PIECE_HISTORY_STAGE_ORDER.length : bi);
  });
}
