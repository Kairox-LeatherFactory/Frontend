import {
  Boxes,
  Layers,
  Activity,
  Waypoints,
  Archive,
} from 'lucide-react';

/**
 * ============================================================================
 * STORE DASHBOARD CONSTANTS & CONFIGURATION
 * ============================================================================
 */
export const STORE_TABS = [
  { id: 'tab-drawers', label: 'Drawers & Storage Buffer', icon: Boxes, subtitle: 'Drawer capacity, stored pieces & handoff buffer' },
  { id: 'tab-movements', label: 'Store Movement Stream', icon: Activity, subtitle: 'Piece check-in, drawer staging & release to stitching' },
  { id: 'tab-orders', label: 'Order & Style Matrix', icon: Waypoints, subtitle: 'Store fulfillment across production orders' },
];

export const CHART_COLORS = {
  primary: '#0891b2',
  secondary: '#06b6d4',
  accent: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
};
