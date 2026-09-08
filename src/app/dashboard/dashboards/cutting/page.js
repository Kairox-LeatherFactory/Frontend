'use client';
import { useState, useEffect, useCallback } from 'react';
import CuttingHeader from './_components/CuttingHeader';
import CutterProductivityTab from './_components/tabs/CutterProductivityTab';
import LiveCutLogTab from './_components/tabs/LiveCutLogTab';
import OrderProgressTab from './_components/tabs/OrderProgressTab';
import LeatherLotTab from './_components/tabs/LeatherLotTab';
import CutterTraceModal from './_components/modals/CutterTraceModal';
import PieceDetailModal from './_components/modals/PieceDetailModal';
import {
  apiGetCuttingDashboard,
  apiGetCuttingEmployeeDetail,
  apiGetCuttingConsumption,
} from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

/**
 * ============================================================================
 * CUTTING DEPARTMENT DASHBOARD ROUTE: /dashboard/dashboards/cutting
 * ============================================================================
 * WHAT IT IS:
 * Master container managing all live Cutting Floor operations data, API calls,
 * tab state, modal views, and cross-filter synchronization.
 */
export default function CuttingDashboardPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tab-cutters');

  // Filters State
  const [selectedDate, setSelectedDate] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState('all');
  const [selectedStyle, setSelectedStyle] = useState('all');
  const [selectedCutter, setSelectedCutter] = useState('all');

  // Backend Data State
  const [dashboardData, setDashboardData] = useState({
    meta: {},
    kpis: {},
    cutters: [],
    piece_log: [],
    order_progress: [],
    leather_lots: [],
  });

  // Modal State
  const [selectedCutterModal, setSelectedCutterModal] = useState(null);
  const [cutterDetail, setCutterDetail] = useState(null);
  const [cutterLoading, setCutterLoading] = useState(false);
  const [cutterError, setCutterError] = useState(null);

  const [selectedPieceModal, setSelectedPieceModal] = useState(null);

  // ── Load Cutting Dashboard Data ──
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedDate !== 'all') params.date = selectedDate;
      if (selectedOrder !== 'all') params.order_id = selectedOrder;
      if (selectedCutter !== 'all') params.employee_id = selectedCutter;

      const [summaryData, consumptionData] = await Promise.allSettled([
        apiGetCuttingDashboard(token, params),
        apiGetCuttingConsumption(token, params),
      ]);

      const data = summaryData.status === 'fulfilled' ? summaryData.value : {};
      const pieces = consumptionData.status === 'fulfilled' ? consumptionData.value?.pieces || consumptionData.value || [] : [];

      setDashboardData({
        meta: data.meta || {},
        kpis: data.kpis || {},
        cutters: data.cutters || data.employees || [],
        piece_log: Array.isArray(pieces) ? pieces : [],
        order_progress: data.order_progress || [],
        leather_lots: data.leather_lots || data.lots || [],
      });
    } catch (err) {
      console.error('Failed to load Cutting Dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [token, selectedDate, selectedOrder, selectedCutter]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // ── Cutter Trace Modal Handler ──
  const handleOpenCutterTrace = async (cutter) => {
    setSelectedCutterModal(cutter);
    setCutterLoading(true);
    setCutterError(null);
    try {
      const detail = await apiGetCuttingEmployeeDetail(token, cutter.employee_id || cutter.id);
      setCutterDetail(detail);
    } catch (err) {
      setCutterError(err.message || 'Failed to load cutter detail');
    } finally {
      setCutterLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSelectedDate('all');
    setSelectedOrder('all');
    setSelectedStyle('all');
    setSelectedCutter('all');
  };

  // Available Filter Options
  const availableDates = Array.from(
    new Set(dashboardData.piece_log.map((p) => p.cut_date || p.work_date).filter(Boolean))
  );
  const availableOrders = dashboardData.order_progress || [];
  const availableStyles = Array.from(
    new Set((dashboardData.order_progress || []).map((o) => o.style_name).filter(Boolean))
  ).map((name) => ({ style_name: name }));
  const availableCutters = dashboardData.cutters || [];

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] p-4 sm:p-6 lg:p-8 space-y-6 font-sans antialiased text-slate-800">
      <CuttingHeader
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        availableDates={availableDates}
        selectedOrder={selectedOrder}
        onSelectOrder={setSelectedOrder}
        availableOrders={availableOrders}
        selectedStyle={selectedStyle}
        onSelectStyle={setSelectedStyle}
        availableStyles={availableStyles}
        selectedCutter={selectedCutter}
        onSelectCutter={setSelectedCutter}
        availableCutters={availableCutters}
        onResetFilters={handleResetFilters}
        kpis={dashboardData.kpis}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onRefresh={loadDashboardData}
        loading={loading}
      />

      {/* Tab 1: Cutters Productivity */}
      {activeTab === 'tab-cutters' && (
        <CutterProductivityTab
          cutters={dashboardData.cutters}
          onSelectCutter={handleOpenCutterTrace}
        />
      )}

      {/* Tab 2: Live Cut Piece Stream */}
      {activeTab === 'tab-pieces' && (
        <LiveCutLogTab
          pieceLog={dashboardData.piece_log}
          onSelectPiece={setSelectedPieceModal}
        />
      )}

      {/* Tab 3: Order Progress Matrix */}
      {activeTab === 'tab-orders' && (
        <OrderProgressTab
          orderProgress={dashboardData.order_progress}
          onSelectOrder={null}
        />
      )}

      {/* Tab 4: Leather Lot Inventory */}
      {activeTab === 'tab-leather' && (
        <LeatherLotTab
          leatherLots={dashboardData.leather_lots}
        />
      )}

      {/* Modals */}
      <CutterTraceModal
        selectedCutter={selectedCutterModal}
        onClose={() => setSelectedCutterModal(null)}
        cutterDetail={cutterDetail}
        loading={cutterLoading}
        error={cutterError}
      />

      <PieceDetailModal
        selectedPiece={selectedPieceModal}
        onClose={() => setSelectedPieceModal(null)}
      />
    </div>
  );
}
