import {
  Factory,
  Layers,
  Activity,
  Waypoints,
  Users,
  AlertTriangle,
} from 'lucide-react';

/**
 * ============================================================================
 * DIRECT MANAGER / MD DASHBOARD CONSTANTS & CONFIGURATION
 * ============================================================================
 */
export const DM_TABS = [
  { id: 'tab-factory', label: 'Factory Live Command', icon: Factory, subtitle: 'End-to-end plant operations & cross-department flow' },
  { id: 'tab-departments', label: 'Department Deep Dive', icon: Layers, subtitle: 'Cutting, Lining, Stitching & Store stage metrics' },
  { id: 'tab-orders', label: 'Production Order Matrix', icon: Waypoints, subtitle: 'High-level purchase order fulfillment & delay alarms' },
];

export const DEPARTMENT_LIST = [
  'Cutting',
  'Lining',
  'Fusing',
  'Pasting',
  'Store',
  'Stitching',
  'Quality',
  'Inspection',
  'Packaging',
];
