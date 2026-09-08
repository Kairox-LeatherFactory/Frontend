import {
  Scissors,
  Users,
  Waypoints,
  Activity,
  Layers,
} from 'lucide-react';

/**
 * ============================================================================
 * CUTTING DASHBOARD CONSTANTS & CONFIGURATION
 * ============================================================================
 */
export const CUTTING_TABS = [
  { id: 'tab-cutters', label: 'Cutter Productivity', icon: Users, subtitle: 'Individual piece counts, yield & operator metrics' },
  { id: 'tab-pieces', label: 'Live Cut Piece Log', icon: Activity, subtitle: 'Piece-by-piece cut stream, DCM consumption & lot allocation' },
  { id: 'tab-orders', label: 'Order & Style Matrix', icon: Waypoints, subtitle: 'Total ordered vs cut quantity & progress fulfillment' },
  { id: 'tab-leather', label: 'Leather Lot Inventory', icon: Layers, subtitle: 'Article stocks, sqft square footage & yield consumption' },
];

export const CHART_COLORS = {
  primary: '#2563eb',
  secondary: '#38bdf8',
  accent: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
};
