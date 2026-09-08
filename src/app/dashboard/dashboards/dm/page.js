'use client';
import { useState, useEffect, useCallback } from 'react';
import DmHeader from './_components/DmHeader';
import FactoryOverviewTab from './_components/tabs/FactoryOverviewTab';
import DepartmentMatrixTab from './_components/tabs/DepartmentMatrixTab';
import DmOrdersTab from './_components/tabs/DmOrdersTab';
import {
  apiGetDirectManagerDashboard,
} from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

/**
 * ============================================================================
 * DIRECT MANAGER / MD DASHBOARD ROUTE: /dashboard/dashboards/dm
 * ============================================================================
 * WHAT IT IS:
 * Executive level dashboard tracking plant-wide output across Cutting, Lining,
 * Stitching, Store, and Packing sections.
 */
export default function DirectManagerDashboardPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tab-factory');

  // Backend Data State
  const [dashboardData, setDashboardData] = useState({
    meta: {},
    kpis: {},
    departments: [],
    order_progress: [],
  });

  // ── Load DM Dashboard Data ──
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGetDirectManagerDashboard(token);
      setDashboardData({
        meta: data?.meta || {},
        kpis: data?.kpis || {},
        departments: data?.stages || data?.departments || [],
        order_progress: data?.order_progress || [],
      });
    } catch (err) {
      console.error('Failed to load Direct Manager Dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] p-4 sm:p-6 lg:p-8 space-y-6 font-sans antialiased text-slate-800">
      <DmHeader
        kpis={dashboardData.kpis}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onRefresh={loadDashboardData}
        loading={loading}
      />

      {/* Tab 1: Factory Command Flow */}
      {activeTab === 'tab-factory' && (
        <FactoryOverviewTab
          departments={dashboardData.departments}
          onSelectDepartment={null}
        />
      )}

      {/* Tab 2: Department Deep Dive */}
      {activeTab === 'tab-departments' && (
        <DepartmentMatrixTab
          departments={dashboardData.departments}
        />
      )}

      {/* Tab 3: Order Fulfillment */}
      {activeTab === 'tab-orders' && (
        <DmOrdersTab
          orderProgress={dashboardData.order_progress}
        />
      )}
    </div>
  );
}
