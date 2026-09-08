'use client';
import { useState, useEffect, useCallback } from 'react';
import StitchingHeader from './_components/StitchingHeader';
import LiveOperationsTab from './_components/tabs/LiveOperationsTab';
import StagesWipTab from './_components/tabs/StagesWipTab';
import EmployeeProductivityTab from './_components/tabs/EmployeeProductivityTab';
import OrderMatrixTab from './_components/tabs/OrderMatrixTab';
import PieceTrackerTab from './_components/tabs/PieceTrackerTab';
import EmployeeTraceModal from './_components/modals/EmployeeTraceModal';
import StageDetailModal from './_components/modals/StageDetailModal';
import OrderDetailModal from './_components/modals/OrderDetailModal';
import {
  apiGetStitchingDashboard,
  apiGetStitchingEmployeeDetail,
  apiGetStitchingPieceDetail,
} from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

/**
 * ============================================================================
 * STITCHING FLOOR DASHBOARD ROUTE: /dashboard/dashboards/stitching
 * ============================================================================
 * WHAT IT IS:
 * Master container managing all live Stitching Floor operations data, API calls,
 * tab state, modal views, and cross-filter synchronization.
 */
export default function StitchingDashboardPage() {
  const { token } = useAuth();

  // ==========================================================================
  // 1. DASHBOARD STATE: DATA & FILTERS
  // ==========================================================================
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tab-today');

  // Filters State
  const [selectedDate, setSelectedDate] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState('all');
  const [selectedStyle, setSelectedStyle] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedStage, setSelectedStage] = useState('all');

  // Backend Data State
  const [dashboardData, setDashboardData] = useState({
    meta: {},
    kpis: {},
    stages: [],
    store_handoff: {},
    current_style: null,
    employees: [],
    daily_production: [],
    order_progress: [],
  });

  // Modal & Trace State
  const [selectedEmployeeModal, setSelectedEmployeeModal] = useState(null);
  const [employeeTrace, setEmployeeTrace] = useState(null);
  const [employeeTraceLoading, setEmployeeTraceLoading] = useState(false);
  const [employeeTraceError, setEmployeeTraceError] = useState(null);

  const [selectedStageDetail, setSelectedStageDetail] = useState(null);
  const [selectedOrderRow, setSelectedOrderRow] = useState(null);

  // Piece Tracker State
  const [pieceSearchInput, setPieceSearchInput] = useState('');
  const [pieceSearchedCode, setPieceSearchedCode] = useState('');
  const [pieceDetail, setPieceDetail] = useState(null);
  const [pieceSearchLoading, setPieceSearchLoading] = useState(false);
  const [pieceSearchError, setPieceSearchError] = useState(null);

  // ==========================================================================
  // 2. LIVE BACKEND DATA FETCHING
  // ==========================================================================
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedDate !== 'all') params.date = selectedDate;
      if (selectedOrder !== 'all') params.order_id = selectedOrder;
      if (selectedStage !== 'all') params.stage = selectedStage;
      if (selectedEmployee !== 'all') params.employee_id = selectedEmployee;

      const data = await apiGetStitchingDashboard(token, params);
      setDashboardData(data || {});
    } catch (err) {
      console.error('Failed to load Stitching Dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [token, selectedDate, selectedOrder, selectedStage, selectedEmployee]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // ==========================================================================
  // 3. EMPLOYEE TRACE & PIECE LOOKUP HANDLERS
  // ==========================================================================
  const handleOpenEmployeeTrace = async (emp) => {
    setSelectedEmployeeModal(emp);
    setEmployeeTraceLoading(true);
    setEmployeeTraceError(null);
    try {
      const trace = await apiGetStitchingEmployeeDetail(token, emp.employee_id || emp.id);
      setEmployeeTrace(trace);
    } catch (err) {
      setEmployeeTraceError(err.message || 'Failed to load employee trace');
    } finally {
      setEmployeeTraceLoading(false);
    }
  };

  const handlePieceSearch = async (overrideCode) => {
    const code = (overrideCode || pieceSearchInput).trim();
    if (!code) return;
    setPieceSearchedCode(code);
    setPieceSearchLoading(true);
    setPieceSearchError(null);
    try {
      const detail = await apiGetStitchingPieceDetail(token, code);
      setPieceDetail(detail);
    } catch (err) {
      setPieceSearchError(err.message || 'Piece not found');
      setPieceDetail(null);
    } finally {
      setPieceSearchLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSelectedDate('all');
    setSelectedOrder('all');
    setSelectedStyle('all');
    setSelectedEmployee('all');
    setSelectedStage('all');
  };

  // ==========================================================================
  // 4. COMPUTED PROPS & FILTERED LISTS
  // ==========================================================================
  const availableDates = dashboardData.daily_production?.map((d) => d.work_date) || [];
  const availableOrders = dashboardData.order_progress || [];
  const availableStyles = Array.from(
    new Set((dashboardData.order_progress || []).map((o) => o.style_name).filter(Boolean))
  ).map((name) => ({ style_name: name }));
  const availableEmployees = dashboardData.employees || [];

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] p-4 sm:p-6 lg:p-8 space-y-6 font-sans antialiased text-slate-800">
      {/* Universal Header & KPIs Bar */}
      <StitchingHeader
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        availableDates={availableDates}
        selectedOrder={selectedOrder}
        onSelectOrder={setSelectedOrder}
        availableOrders={availableOrders}
        selectedStyle={selectedStyle}
        onSelectStyle={setSelectedStyle}
        availableStyles={availableStyles}
        selectedEmployee={selectedEmployee}
        onSelectEmployee={setSelectedEmployee}
        availableEmployees={availableEmployees}
        onResetFilters={handleResetFilters}
        kpis={dashboardData.kpis || {}}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onRefresh={loadDashboardData}
        loading={loading}
      />

      {/* Tab 1: Live Operations View */}
      {activeTab === 'tab-today' && (
        <LiveOperationsTab
          pipelineStages={dashboardData.stages || []}
          filterStage={selectedStage}
          onSelectStage={setSelectedStage}
          storeHandoff={dashboardData.store_handoff || {}}
          dailyChartData={dashboardData.daily_production || []}
          currentStyle={dashboardData.current_style}
          onNavigateTab={setActiveTab}
        />
      )}

      {/* Tab 2: Stages & WIP Queue View */}
      {activeTab === 'tab-stages' && (
        <StagesWipTab
          stages={dashboardData.stages || []}
          onSelectStageDetail={setSelectedStageDetail}
        />
      )}

      {/* Tab 3: Employee Productivity View */}
      {activeTab === 'tab-employees' && (
        <EmployeeProductivityTab
          employees={dashboardData.employees || []}
          onSelectEmployee={handleOpenEmployeeTrace}
        />
      )}

      {/* Tab 4: Order Progress Matrix View */}
      {activeTab === 'tab-orders' && (
        <OrderMatrixTab
          orderProgress={dashboardData.order_progress || []}
          onSelectOrderRow={setSelectedOrderRow}
        />
      )}

      {/* Tab 5: Piece Tracker & Barcode Audit View */}
      {activeTab === 'tab-pieces' && (
        <PieceTrackerTab
          searchInput={pieceSearchInput}
          onSearchInputChange={setPieceSearchInput}
          onSearch={() => handlePieceSearch()}
          loading={pieceSearchLoading}
          error={pieceSearchError}
          searchedCode={pieceSearchedCode}
          pieceDetail={pieceDetail}
        />
      )}

      {/* ====================================================================
          MODALS & FLYOUT INSPECTORS
          ==================================================================== */}
      <EmployeeTraceModal
        selectedEmployee={selectedEmployeeModal}
        onClose={() => setSelectedEmployeeModal(null)}
        employeeTrace={employeeTrace}
        employeeTraceLoading={employeeTraceLoading}
        employeeTraceError={employeeTraceError}
        onOpenFullFlow={() => {
          if (employeeTrace?.piece_code) {
            setPieceSearchInput(employeeTrace.piece_code);
            handlePieceSearch(employeeTrace.piece_code);
            setActiveTab('tab-pieces');
          }
        }}
      />

      <StageDetailModal
        selectedStage={selectedStageDetail}
        onClose={() => setSelectedStageDetail(null)}
      />

      <OrderDetailModal
        selectedOrder={selectedOrderRow}
        onClose={() => setSelectedOrderRow(null)}
      />
    </div>
  );
}
