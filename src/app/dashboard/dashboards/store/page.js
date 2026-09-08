'use client';
import { useState, useEffect, useCallback } from 'react';
import StoreHeader from './_components/StoreHeader';
import StoreDrawersTab from './_components/tabs/StoreDrawersTab';
import StoreMovementsTab from './_components/tabs/StoreMovementsTab';
import StoreOrdersTab from './_components/tabs/StoreOrdersTab';
import {
  apiGetStoreDashboard,
  apiGetStoreDrawerMovement,
} from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

/**
 * ============================================================================
 * STORE & INVENTORY DASHBOARD ROUTE: /dashboard/dashboards/store
 * ============================================================================
 * WHAT IT IS:
 * Master container managing all live Store & Drawer operations data, API calls,
 * tab state, modal views, and cross-filter synchronization.
 */
export default function StoreDashboardPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tab-drawers');

  // Backend Data State
  const [dashboardData, setDashboardData] = useState({
    meta: {},
    kpis: {},
    drawers: [],
    movements: [],
    order_progress: [],
  });

  // ── Load Store Dashboard Data ──
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, moveRes] = await Promise.allSettled([
        apiGetStoreDashboard(token),
        apiGetStoreDrawerMovement(token),
      ]);

      const data = summaryRes.status === 'fulfilled' ? summaryRes.value : {};
      const moves = moveRes.status === 'fulfilled' ? moveRes.value?.movements || moveRes.value || [] : [];

      setDashboardData({
        meta: data.meta || {},
        kpis: data.kpis || {},
        drawers: data.drawers || [],
        movements: Array.isArray(moves) ? moves : [],
        order_progress: data.order_progress || [],
      });
    } catch (err) {
      console.error('Failed to load Store Dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] p-4 sm:p-6 lg:p-8 space-y-6 font-sans antialiased text-slate-800">
      <StoreHeader
        kpis={dashboardData.kpis}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onRefresh={loadDashboardData}
        loading={loading}
      />

      {/* Tab 1: Drawers & Buffer */}
      {activeTab === 'tab-drawers' && (
        <StoreDrawersTab
          drawers={dashboardData.drawers}
          onSelectDrawer={null}
        />
      )}

      {/* Tab 2: Store Movements */}
      {activeTab === 'tab-movements' && (
        <StoreMovementsTab
          movements={dashboardData.movements}
        />
      )}

      {/* Tab 3: Order Fulfillment */}
      {activeTab === 'tab-orders' && (
        <StoreOrdersTab
          orderProgress={dashboardData.order_progress}
        />
      )}
    </div>
  );
}
