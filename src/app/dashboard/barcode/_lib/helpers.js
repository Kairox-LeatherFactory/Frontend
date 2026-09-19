/**
 * ============================================================================
 * BARCODE MODULE UTILITY HELPERS
 * ============================================================================
 * Pure helper functions for normalizing data, formatting registry values,
 * generating card field lists, and splitting print pages.
 */

// ============================================================================
// 1. EMPLOYEE DATA NORMALIZATION
// ============================================================================
/**
 * Normalizes raw employee database records from `GET /api/v1/employees`.
 * Ensures consistent field names (`id`, `empId`, `name`, `designation`, `department`).
 *
 * @param {Object} row - Raw employee row from database.
 * @returns {Object} Standardized employee record.
 */
export function normalizeEmployee(row) {
  const empId = row.employee_barcode || `EMP-${String(row.id).slice(0, 8).toUpperCase()}`;
  return {
    id: row.id,
    empId,
    name: row.name || 'Unnamed',
    designation: row.designation || 'Unassigned',
    department: row.department || row.designation || 'Unassigned',
  };
}

// ============================================================================
// 2. BARCODE CODE RESOLUTION
// ============================================================================
/**
 * Extracts verbatim scannable barcode string to feed into JsBarcode renderer.
 *
 * @param {string} pieceCode - Piece code string.
 * @returns {string} Verbatim barcode string.
 */
export function getCompactBarcodeId(pieceCode) {
  return pieceCode;
}

/**
 * Builds the full descriptive code (e.g. `TEST3-BF27P010501-SUEDE_BOMBER-NAVY-2XL-001`)
 * from a registry row's SKU code + sequence, for display under a barcode card.
 * The barcode itself still encodes/shows the short scannable `code` (e.g. `PC-2222Y2`).
 *
 * @param {Object} row - Registry row with `sku_code`, `seq`, and `code` fields.
 * @returns {string} Full descriptive code, falling back to the short code.
 */
export function buildFullBarcodeCode(row) {
  if (!row) return '';
  if (row.sku_code && row.seq != null) {
    return `${row.sku_code}-${String(row.seq).padStart(3, '0')}`;
  }
  return row.code || '';
}

// ============================================================================
// 3. CARD FIELDS BUILDER (METADATA GRID GENERATOR)
// ============================================================================
/**
 * Constructs a structured key-value list of field entries for a barcode card.
 * Shared across preview modals, on-screen cards, and exported images.
 *
 * @param {Object} barcode - Barcode data record.
 * @param {Object} labels - Category-specific label dictionary.
 * @returns {Array<[string, any]>} Array of [label, value] pairs.
 */
export function buildCardFields(barcode, labels) {
  if (!barcode) return [];
  const entries = [
    [labels.orderIdLabel || 'Order ID', barcode.orderId],
    [labels.clientLabel || 'Client', barcode.client],
    [labels.styleLabel || 'Style', barcode.style],
  ];
  if (labels.styleLabel !== 'Article' && barcode.article) {
    entries.push(['Article', barcode.article]);
  }
  entries.push(
    [labels.colorLabel || 'Color', barcode.color],
    [labels.sizeLabel || 'Size', barcode.size],
    ['Serial', barcode.serialStr],
    ['Batch', barcode.batchNo],
    ['Status', barcode.printStatus]
  );
  return entries;
}

// ============================================================================
// 4. ARRAY CHUNKING UTILITY (MULTI-PAGE PRINT SHEETS)
// ============================================================================
/**
 * Splits an array into smaller chunks (e.g. 8 items per A4 sheet).
 *
 * @param {Array} arr - Original array.
 * @param {number} size - Max items per chunk.
 * @returns {Array<Array>} Chunked arrays.
 */
export function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

// ============================================================================
// 5. STATUS BADGE STYLING CLASS RESOLVER
// ============================================================================
/**
 * Returns Tailwind/DaisyUI CSS badge styling for print status states.
 *
 * @param {string} status - 'PRINTED' | 'PARTIAL' | 'PENDING'
 * @returns {string} CSS badge classes.
 */
export function statusBadgeClass(status) {
  if (status === 'PRINTED') return 'badge badge-success';
  if (status === 'PARTIAL') return 'badge badge-info';
  return 'badge badge-warning';
}

// ============================================================================
// 6. SNAKE_CASE TO TITLE CASE STRING CONVERTER
// ============================================================================
/**
 * Converts snake_case keys into Title Case words (e.g. 'order_status' -> 'Order Status').
 *
 * @param {string} key - Underscore-separated string.
 * @returns {string} Capitalized words.
 */
export function humanizeKey(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ============================================================================
// 7. REGISTRY VALUE DISPLAY FORMATTER
// ============================================================================
/**
 * Formats arbitrary metadata or registry values into clean, display-friendly text.
 * Handles null/undefined values, booleans, and JSON objects gracefully.
 *
 * @param {any} value - Raw value to format.
 * @returns {string} Formatted display text.
 */
export function formatRegistryValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
