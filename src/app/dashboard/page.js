'use client';

import { useAuth } from '@/context/AuthContext';
import CuttingManagerDashboard from '@/components/CuttingManagerDashboard';
import LiningManagerDashboard from '@/components/LiningManagerDashboard';
import StitchingManagerDashboard from '@/components/StitchingManagerDashboard';
import StoreManagerDashboard from '@/components/StoreManagerDashboard';
import DirectManagerDashboard from '@/components/DirectManagerDashboard';

export default function DashboardPage() {
  const { user } = useAuth();

  if (user === 'direct_manager' || user === 'managing_director' || user === 'hr') {
    return <DirectManagerDashboard />;
  }

  if (user === 'store_scan' || user === 'store_manager') {
    return <StoreManagerDashboard />;
  }

  if (user === 'stitching_manager') {
    return <StitchingManagerDashboard />;
  }

  if (user === 'lining_manager') {
    return <LiningManagerDashboard />;
  }

  return <CuttingManagerDashboard />;
}