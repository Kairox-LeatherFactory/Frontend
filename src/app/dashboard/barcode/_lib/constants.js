import { Barcode, Printer, History, Users, Box, Package } from 'lucide-react';

/**
 * ============================================================================
 * BARCODE MODULE CONSTANTS & CONFIGURATION
 * ============================================================================
 * This file contains all global styling tokens, tab definitions, category configs,
 * paper print layout constants (A4 / Letter), and filter defaults for the barcode system.
 */

// ============================================================================
// 1. EXPORT RESOLUTION & PRINT DPI SPECIFICATION
// ============================================================================
export const CSS_DPI = 96;             // Standard web browser resolution (1 CSS px = 1/96 in)
export const BARCODE_SPEC = { dpi: 400 }; // Ultra high-density resolution for exported barcode graphics

// ============================================================================
// 2. EMPLOYEE ID BADGE TICKET PALETTE
// ============================================================================
export const TICKET = {
  black: '#000000',
  gray: '#6b6b6b',
  line: '#d8d8d8',
  bg: '#ffffff',
};

// ============================================================================
// 3. PHYSICAL PRINT SHEET DIMENSIONS (BUCKET & STYLE LABELS)
// ============================================================================
// Physical sticker label size: 98mm wide × 65.5mm tall.
// Perfectly packs 8 labels (2 across × 4 down = 262mm height) per single A4 sheet.
export const BUCKET_LABEL = { widthMm: 98, heightMm: 65.5 };
export const BUCKET_LABELS_PER_PAGE = 8;
export const STYLE_LABELS_PER_PAGE = 8;

// ============================================================================
// 4. BRAND THEMING & WARM COLOR PALETTE
// ============================================================================
export const BRAND = {
  darkGrad: 'linear-gradient(180deg, #3d2b1a 0%, #2a1d11 100%)',
  accent: '#c8834a',
  border: 'rgba(200,131,74,0.25)',
  text: '#2d1f0e',
  textMuted: '#9a7a5a',
  bg: '#faf6f0',
};

// ============================================================================
// 5. TOP-LEVEL SUB-TABS (GENERATION, PRINT, HISTORY)
// ============================================================================
export const TABS = [
  { id: 'generation', label: 'Batch Generation', icon: Barcode },
  { id: 'print', label: 'Print Center', icon: Printer },
  { id: 'history', label: 'Batch History', icon: History },
];

// ============================================================================
// 6. BARCODE CATEGORIES (STYLE, EMPLOYEE, BUCKET/DRAWER, MATERIAL)
// ============================================================================
export const CATEGORIES = [
  { id: 'style', label: 'Style Barcodes', icon: Barcode },
  { id: 'employee', label: 'Employee Barcodes', icon: Users },
  { id: 'bucket', label: 'Bucket Barcodes', icon: Box },
  { id: 'material', label: 'Material Barcodes', icon: Package },
];

export const CATEGORY_SUBTITLES = {
  style: 'Generate, print, and audit piece-level Code128 barcodes across production orders.',
  employee: 'Generate, print, and audit employee ID badge barcodes across departments.',
  bucket: 'Print the live drawer/bucket label sheet straight off GET /api/v1/drawers — the whole 200-drawer pool in one pass.',
  material: 'Create and print material lot barcodes (Leather, Lining, Accessories) with real-time stock & spec validation.',
};

// ============================================================================
// 7. DYNAMIC CATEGORY FIELD LABELS (MAPPINGS FOR CARD COLUMNS)
// ============================================================================
export const CATEGORY_LABELS = {
  style: {
    orderIdLabel: 'Order ID',
    clientLabel: 'Client',
    styleLabel: 'Style',
    colorLabel: 'Color',
    sizeLabel: 'Size',
    groupHint: 'Grouped by Production Order — click a card to drill into its styles',
    subGroupNounPlural: 'Styles',
  },
  employee: {
    orderIdLabel: 'Dept. Code',
    clientLabel: 'Department',
    styleLabel: 'Employee',
    colorLabel: 'Designation',
    sizeLabel: 'Employee ID',
    groupHint: 'Grouped by Department — click a card to view employee ID badges',
    subGroupNounPlural: 'Employees',
  },
  bucket: {
    orderIdLabel: 'Drawer State',
    clientLabel: 'Drawer Code',
    styleLabel: 'Drawer / Code',
    colorLabel: 'State',
    sizeLabel: 'Drawer ID / UUID',
    groupHint: 'Grouped by Drawer State — click a card to view drawer barcodes',
    subGroupNounPlural: 'Drawers',
  },
  material: {
    orderIdLabel: 'Lot Barcode',
    clientLabel: 'Category / Subtype',
    styleLabel: 'Article',
    colorLabel: 'Colour',
    sizeLabel: 'Quantity & UOM',
    groupHint: 'Grouped by Material Category — click a card to view material lot barcodes',
    subGroupNounPlural: 'Lots',
  },
};

// ============================================================================
// 8. DEFAULT FILTER STRUCTURES & FORM INPUT STYLING
// ============================================================================
export const DEFAULT_HISTORY_FILTERS = {
  orderId: 'ALL',
  style: 'ALL',
  client: 'ALL',
  size: 'ALL',
  operator: 'ALL',
  status: 'ALL',
  sort: 'NEWEST',
};
export const EMPTY_LIST = [];

export const selectCls = 'w-full px-3 py-2.5 rounded-lg text-sm font-semibold outline-none border transition-all focus:ring-2 focus:ring-[#c8834a]/30 focus:border-[#c8834a]';
export const inputCls = 'w-full px-3 py-2.5 rounded-lg text-sm font-medium outline-none border transition-all focus:ring-2 focus:ring-[#c8834a]/30 focus:border-[#c8834a]';
export const fieldStyle = { background: '#faf6f0', borderColor: 'rgba(200,131,74,0.3)', color: '#2d1f0e' };

// ============================================================================
// 9. LIVE BARCODE REGISTRY CONSTANTS
// ============================================================================
export const BARCODE_TYPE_LABELS = {
  PIECE: 'Piece',
  EMPLOYEE: 'Employee',
  DRAWER: 'Drawer',
  MATERIAL_LOT: 'Material Lot',
};

export const STYLE_HISTORY_PAGE_SIZE = 24;
export const DEFAULT_STYLE_FILTERS = { styleId: 'ALL', size: 'ALL', status: 'ALL' };
