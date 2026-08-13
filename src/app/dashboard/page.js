'use client';

import { useAuth } from '@/context/AuthContext';
import CuttingManagerDashboard from '@/components/CuttingManagerDashboard';
import LiningManagerDashboard from '@/components/LiningManagerDashboard';
import StitchingManagerDashboard from '@/components/StitchingManagerDashboard';
import StoreManagerDashboard from '@/components/StoreManagerDashboard';

export default function DashboardPage() {
  const { user } = useAuth();

  if (user === 'store_scan') {
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