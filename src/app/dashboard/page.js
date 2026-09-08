'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * ============================================================================
 * CENTRAL MASTER DASHBOARD ROUTER & HUB
 * ============================================================================
 * WHAT THIS FILE DOES:
 * 1. Inspects the logged-in user's role from AuthContext.
 * 2. Dynamically loads the corresponding modular department dashboard from
 *    the dedicated `@/app/dashboard/dashboards/` directory:
 *    - Direct Manager / Managing Director / HR -> DirectManagerDashboard
 *    - Store Manager / Store Scan              -> StoreDashboard
 *    - Stitching Manager                       -> StitchingDashboard
 *    - Lining Manager                          -> LiningDashboard
 *    - Cutting Manager (or default)            -> CuttingDashboard
 * 3. Handles automatic route redirection for roles like Security.
 */

import CuttingDashboard from '@/app/dashboard/dashboards/cutting/page';
import LiningDashboard from '@/app/dashboard/dashboards/lining/page';
import StitchingDashboard from '@/app/dashboard/dashboards/stitching/page';
import StoreDashboard from '@/app/dashboard/dashboards/store/page';
import DirectManagerDashboard from '@/app/dashboard/dashboards/dm/page';

// Fallback Spinner UI during dynamic chunk resolution
function DashboardLoading({ title = 'Dashboard' }) {
  return (
    <div className="flex items-center justify-center min-h-[450px] w-full">
      <div className="text-center text-slate-600 space-y-3">
        <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="font-bold text-xs tracking-wider uppercase text-slate-500">
          Loading {title}...
        </p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();

  // Role Redirection Check
  useEffect(() => {
    if (user === 'security') {
      router.replace('/dashboard/attendance');
    }
  }, [user, router]);

  if (user === 'security') return null;

  // 1. Direct Manager, Managing Director & HR View
  if (user === 'direct_manager' || user === 'managing_director' || user === 'hr') {
    return <DirectManagerDashboard />;
  }

  // 2. Store Manager & Scan Station View
  if (user === 'store_scan' || user === 'store_manager') {
    return <StoreDashboard />;
  }

  // 3. Stitching Floor Manager View
  if (user === 'stitching_manager') {
    return <StitchingDashboard />;
  }

  // 4. Lining Department Manager View
  if (user === 'lining_manager') {
    return <LiningDashboard />;
  }

  // 5. Cutting Department Manager View (Default)
  if (user === 'cutting_manager') {
    return <CuttingDashboard />;
  }

  return <CuttingDashboard />;
}
