/**
 * ============================================================================
 * UNIFIED DASHBOARDS MODULE EXPORT
 * ============================================================================
 * Central export point for all modular department and manager dashboards:
 * - 🪡 Stitching Manager Dashboard (@/app/dashboard/dashboards/stitching/page)
 * - ✂️ Cutting Manager Dashboard (@/app/dashboard/dashboards/cutting/page)
 * - 🧵 Lining Manager Dashboard (@/app/dashboard/dashboards/lining/page)
 * - 📦 Store Manager Dashboard (@/app/dashboard/dashboards/store/page)
 * - 👔 Direct Manager / MD Dashboard (@/app/dashboard/dashboards/dm/page)
 */

export { default as StitchingDashboard } from './stitching/page';
export { default as CuttingDashboard } from './cutting/page';
export { default as LiningDashboard } from './lining/page';
export { default as StoreDashboard } from './store/page';
export { default as DirectManagerDashboard } from './dm/page';
