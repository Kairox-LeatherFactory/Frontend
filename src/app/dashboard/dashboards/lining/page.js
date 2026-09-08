'use client';
import { useState, useEffect, useCallback } from 'react';
import LiningHeader from './_components/LiningHeader';
import LiningProductivityTab from './_components/tabs/LiningProductivityTab';
import LiningPiecesTab from './_components/tabs/LiningPiecesTab';
import LiningOrdersTab from './_components/tabs/LiningOrdersTab';
import LiningRollsTab from './_components/tabs/LiningRollsTab';
import {
  apiGetLiningDashboard,
  apiGetLiningEmployeeDetail,
  apiGetLiningConsumption,
} from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

/**
 * ============================================================================
 * LINING DEPARTMENT DASHBOARD ROUTE: /dashboard/dashboards/lining
 * ============================================================================
 * WHAT IT IS:
 * Master container managing all live Lining Floor operations data, API calls,
 * tab state, modal views, and cross-filter synchronization.
 */
export default function LiningDashboardPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tab-operators');

  // Filters State
  const [selectedDate, setSelectedDate] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState('all');
  const [selectedStyle, setSelectedStyle] = useState('all');
  const [selectedOperator, setSelectedOperator] = useState('all');

  // Backend Data State
  const [dashboardData, setDashboardData] = useState({
    meta: {},
    kpis: {},
    operators: [],
    piece_log: [],
    order_progress: [],
    fabric_rolls: [],
  });

  // ── Load Lining Dashboard Data ──
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedDate !== 'all') params.date = selectedDate;
      if (selectedOrder !== 'all') params.order_id = selectedOrder;
      if (selectedOperator !== 'all') params.employee_id = selectedOperator;

      const [summaryData, consumptionData] = await Promise.allSettled([
        apiGetLiningDashboard(token, params),
        apiGetLiningConsumption(token, params),
      ]);

      const data = summaryData.status === 'fulfilled' ? summaryData.value : {};
      const pieces = consumptionData.status === 'fulfilled' ? consumptionData.value?.pieces || consumptionData.value || [] : [];

      setDashboardData({
        meta: data.meta || {},
        kpis: data.kpis || {},
        operators: data.operators || data.employees || [],
        piece_log: Array.isArray(pieces) ? pieces : [],
        order_progress: data.order_progress || [],
        fabric_rolls: data.fabric_rolls || data.rolls || [],
      });
    } catch (err) {
      console.error('Failed to load Lining Dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [token, selectedDate, selectedOrder, selectedOperator]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleResetFilters = () => {
    setSelectedDate('all');
    setSelectedOrder('all');
    setSelectedStyle('all');
    setSelectedOperator('all');
  };

  // Available Filter Options
  const availableDates = Array.from(
    new Set(dashboardData.piece_log.map((p) => p.work_date || p.cut_date).filter(Boolean))
  );
  const availableOrders = dashboardData.order_progress || [];
  const availableStyles = Array.from(
    new Set((dashboardData.order_progress || []).map((o) => o.style_name).filter(Boolean))
  ).map((name) => ({ style_name: name }));
  const availableOperators = dashboardData.operators || [];

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] p-4 sm:p-6 lg:p-8 space-y-6 font-sans antialiased text-slate-800">
      <LiningHeader
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        availableDates={availableDates}
        selectedOrder={selectedOrder}
        onSelectOrder={setSelectedOrder}
        availableOrders={availableOrders}
        selectedStyle={selectedStyle}
        onSelectStyle={setSelectedStyle}
        availableStyles={availableStyles}
        selectedOperator={selectedOperator}
        onSelectOperator={setSelectedOperator}
        availableOperators={availableOperators}
        onResetFilters={handleResetFilters}
        kpis={dashboardData.kpis}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onRefresh={loadDashboardData}
        loading={loading}
      />

      {/* Tab 1: Operators Productivity */}
      {activeTab === 'tab-operators' && (
        <LiningProductivityTab
          operators={dashboardData.operators}
          onSelectOperator={null}
        />
      )}

      {/* Tab 2: Live Lining Cut Stream */}
      {activeTab === 'tab-pieces' && (
        <LiningPiecesTab
          pieceLog={dashboardData.piece_log}
          onSelectPiece={null}
        />
      )}

      {/* Tab 3: Order Progress Matrix */}
      {activeTab === 'tab-orders' && (
        <LiningOrdersTab
          orderProgress={dashboardData.order_progress}
          onSelectOrder={null}
        />
      )}

      {/* Tab 4: Fabric Roll Inventory */}
      {activeTab === 'tab-rolls' && (
        <LiningRollsTab
          fabricRolls={dashboardData.fabric_rolls}
        />
      )}
    </div>
  );
}
