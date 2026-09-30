import {
  Waypoints,
  Activity,
  Users,
  Layers,
  Search,
} from 'lucide-react';

/**
 * ============================================================================
 * STITCHING DASHBOARD CONSTANTS & CONFIGURATION
 * ============================================================================
 * Contains tabs, pipeline stage sequences, chart color palettes, and default states.
 */

// ============================================================================
// 1. DASHBOARD TABS CONFIGURATION
// ============================================================================
export const STITCHING_TABS = [
  { id: 'tab-today', label: 'Live Operations', icon: Activity, subtitle: 'Real-time floor feed & today’s metrics' },
  { id: 'tab-stages', label: 'Stages & WIP', icon: Layers, subtitle: 'Pre-store fusing/pasting & post-store line/shell stitching' },
  { id: 'tab-employees', label: 'Employees & Productivity', icon: Users, subtitle: 'Piece counts, operator earnings & performance' },
  { id: 'tab-orders', label: 'Orders & Matrix', icon: Waypoints, subtitle: 'Production order progress & target fulfillment' },
  { id: 'tab-pieces', label: 'Piece Tracker', icon: Search, subtitle: 'Instant barcode lookup & stage journey audit' },
];

// ============================================================================
// 2. CANONICAL PIPELINE STAGE ORDER (LEATHER CHAIN)
// ============================================================================
// Pre-Store: FUSING -> PASTING -> STORE
// Post-Store: LINE_STITCHING -> SHELL_STITCHING -> FINAL_FINISH
export const PIPELINE_STAGE_ORDER = [
  'FUSING',
  'PASTING',
  'LINE_STITCHING',
  'SHELL_STITCHING',
  'FINAL_FINISH',
];

// Full piece-journey stage order for Piece Tracker
export const PIECE_HISTORY_STAGE_ORDER = [
  'LEATHER_CUTTING',
  'LINING_CUTTING',
  'FUSING',
  'PASTING',
  'STORE',
  'LINE_STITCHING',
  'SHELL_STITCHING',
  'FINAL_FINISH',
  'FINAL_INSPECTION',
];

// ============================================================================
// 3. STAGE COLOR THEMES & LABELS
// ============================================================================
export const STAGE_THEMES = {
  FUSING: { color: '#6366f1', bg: '#e0e7ff', border: '#c7d2fe', label: 'Fusing' },
  PASTING: { color: '#8b5cf6', bg: '#ede9fe', border: '#ddd6fe', label: 'Pasting' },
  STORE: { color: '#0ea5e9', bg: '#e0f2fe', border: '#bae6fd', label: 'Store Handoff' },
  LINE_STITCHING: { color: '#3b82f6', bg: '#dbeafe', border: '#bfdbfe', label: 'Line Stitching' },
  SHELL_STITCHING: { color: '#2563eb', bg: '#eff6ff', border: '#dbeafe', label: 'Shell Stitching' },
  FINAL_FINISH: { color: '#10b981', bg: '#d1fae5', border: '#a7f3d0', label: 'Final Finish' },
  FINAL_INSPECTION: { color: '#059669', bg: '#ecfdf5', border: '#6ee7b7', label: 'Final Inspection' },
};

// ============================================================================
// 4. CHART PALETTES & THEME TOKENS
// ============================================================================
export const CHART_COLORS = {
  primary: '#4f46e5',
  secondary: '#38bdf8',
  accent: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  muted: '#94a3b8',
};
