'use client';

import { useAuth } from '@/context/AuthContext';
//import CuttingManagerDashboard from '@/components/CuttingManagerDashboard';
// import LiningManagerDashboard from '@/components/LiningManagerDashboard';
// import StitchingManagerDashboard from '@/components/StitchingManagerDashboard';
// import StoreManagerDashboard from '@/components/StoreManagerDashboard';
// import DirectManagerDashboard from '@/components/DirectManagerDashboard';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import dynamic from 'next/dynamic';

const CuttingManagerDashboard = dynamic(() => import('@/components/CuttingManagerDashboard'));
const LiningManagerDashboard = dynamic(() => import('@/components/LiningManagerDashboard'));
const StitchingManagerDashboard = dynamic(() => import('@/components/StitchingManagerDashboard'));
const StoreManagerDashboard = dynamic(() => import('@/components/StoreManagerDashboard'));
const DirectManagerDashboard = dynamic(() => import('@/components/DirectManagerDashboard'));


export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user === 'security') {
      router.replace('/dashboard/attendance');
    }
  }, [user, router]);

  if (user === 'security') return null;

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

  if (user === 'cutting_manager') {
    return <CuttingManagerDashboard />;
  }

  return <CuttingManagerDashboard />;
}
