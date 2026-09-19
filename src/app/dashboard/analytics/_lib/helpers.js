/**
 * Helper Utility Functions for Analytics Module
 *
 * Provides safe data extraction, stage chronological sorting, and timestamp formatting.
 */

/**
 * Safely extracts the pieces array from a style detail API response.
 *
 * The backend API may return pieces in various shapes:
 * - Direct array: `sDetail.pieces = [...]`
 * - Nested object: `sDetail.pieces = { pieces: [...] }`
 * - Null or undefined
 *
 * @param {Object|null} sDetail - The raw style detail response object from the API.
 * @returns {Array<Object>} A guaranteed array of piece objects (empty if none exist).
 */
export function getPieces(sDetail) {
  if (!sDetail) return [];
  const p = sDetail.pieces;
  if (Array.isArray(p)) return p;
  if (p && Array.isArray(p.pieces)) return p.pieces;
  return [];
}

/**
 * Calculates a sequential priority rank for factory production stages.
 *
 * Ensures stages appear in their real-world manufacturing sequence:
 *   1. Leather Cutting
 *   2. Lining Cutting
 *   3. Fusing
 *   4. Pasting
 *   5. Lining Stitching
 *   6. Shell Stitching
 *   7. Final Finishing
 *   8. Inspection / Quality Control
 *   9. Export / Packaging
 *
 * @param {Object} st - The stage object containing stage name/code/label.
 * @returns {number} A numerical rank from 1 (first stage) to 99 (unknown/unmatched stage).
 */
export function getStageRank(st) {
  const rawKey = String(
    st?.stage ||
    st?.stage_code ||
    st?.label ||
    st?.stage_label ||
    st?.stage_name ||
    ''
  )
    .toUpperCase()
    .replace(/[\s-]+/g, '_');

  if (rawKey.includes('LEATHER_CUT') || rawKey === 'CUTTING') return 1;
  if (rawKey.includes('LINING_CUT') || rawKey === 'LINING' || rawKey.includes('LINE_CUT')) return 2;
  if (rawKey.includes('FUS')) return 3;
  if (rawKey.includes('PAST')) return 4;
  if (rawKey.includes('LINE_STITCH')) return 5;
  if (rawKey.includes('SHELL_STITCH') || rawKey === 'STITCH' || rawKey.includes('STITCHING')) return 6;
  if (rawKey.includes('FINAL_FINISH') || rawKey === 'FINISH' || rawKey.includes('FINISHING')) return 7;
  if (rawKey.includes('INSPECT')) return 8;
  if (rawKey.includes('EXPORT') || rawKey.includes('PACKAGE')) return 9;
  return 99;
}

/**
 * Formats a logged timestamp into a human-readable 12-hour time string (e.g. "02:45 PM").
 *
 * @param {string} loggedAt - The raw date/time string.
 * @param {string} fallbackTime - Fallback time string if parsing fails.
 * @returns {string} Formatted time string.
 */
export function formatLoggedTime(loggedAt, fallbackTime = '') {
  if (!loggedAt) return fallbackTime;
  const date = new Date(loggedAt);
  if (isNaN(date.getTime())) return loggedAt;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
