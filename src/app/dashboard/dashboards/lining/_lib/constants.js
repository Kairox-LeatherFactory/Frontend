import {
  Shirt,
  Users,
  Waypoints,
  Activity,
  Layers,
} from 'lucide-react';

/**
 * ============================================================================
 * LINING DASHBOARD CONSTANTS & CONFIGURATION
 * ============================================================================
 */
export const LINING_TABS = [
  { id: 'tab-operators', label: 'Operator Productivity', icon: Users, subtitle: 'Individual piece counts, meters & operator metrics' },
  { id: 'tab-pieces', label: 'Live Cut Piece Log', icon: Activity, subtitle: 'Piece-by-piece cut stream, meter consumption & fabric roll allocation' },
  { id: 'tab-orders', label: 'Order & Style Matrix', icon: Waypoints, subtitle: 'Total ordered vs cut quantity & progress fulfillment' },
  { id: 'tab-rolls', label: 'Fabric Roll Inventory', icon: Layers, subtitle: 'Lining fabric stocks, meter rolls & consumption' },
];

export const CHART_COLORS = {
  primary: '#e11d48',
  secondary: '#fb7185',
  accent: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
};
