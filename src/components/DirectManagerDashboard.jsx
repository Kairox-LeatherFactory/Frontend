'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Factory,
  Layers,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Search,
  Download,
  Filter,
  X,
  Activity,
  Boxes,
  Shirt,
  ShieldCheck,
  Building2,
  Users,
  Send,
  Inbox,
  Workflow,
  QrCode,
  Loader2,
  Info,
  Clock,
  Target,
  Box,
  FileText,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useAuth } from '@/context/AuthContext';
import {
  apiGetDirectManagerDashboard,
  apiGetDirectManagerOrderDetail,
  apiGetDirectManagerStyleDetail,
  apiGetDirectManagerPieceDetail,
  apiGetEmployees,
  apiGetStoreTraceability,
  apiListDrawers,
  apiSendDrawers,
  apiReceiveDrawer,
  apiGetAttendanceConfig,
} from '@/lib/api';

// ─── Small shared UI helpers ───────────────────────────────────────────────

function CustomChartTooltip({ active, payload, label, unit = 'pcs' }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-md border border-slate-200 p-3 rounded-xl shadow-xl text-xs font-semibold space-y-1">
        <p className="font-extrabold text-slate-800 border-b border-slate-100 pb-1">{label}</p>
        {payload.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1 text-slate-600">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color || item.fill }} />
              {item.name}:
            </span>
            <span className="font-mono font-bold text-slate-900">{item.value} {unit}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

function DepartmentMiniGraphTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 p-2.5 rounded-xl shadow-xl text-xs font-sans space-y-1 text-white">
        <p className="font-bold text-slate-300 border-b border-slate-700 pb-0.5 text-[10px]">Time: {label}</p>
        {payload.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between gap-3 text-[10px]">
            <span className="flex items-center gap-1 text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color || item.fill }} />
              {item.name}:
            </span>
            <span className="font-mono font-bold text-white">
              {item.value !== null && item.value !== undefined ? `${item.value} pcs` : '—'}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

function NotAvailableBadge({ label = 'Not tracked' }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200"
      title="Not yet backed by a table on the server — see meta.unsupported"
    >
      — {label}
    </span>
  );
}

function formatStage(stage) {
  if (!stage) return '—';
  return String(stage).replace(/_/g, ' ');
}

function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts.slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

function readNum(obj, keys) {
  if (!obj) return null;
  for (const k of keys) {
    if (obj?.[k] !== undefined && obj?.[k] !== null && !isNaN(Number(obj[k]))) {
      return Number(obj[k]);
    }
  }
  return null;
}

function inferDepartment(stageKeyOrLabel = '') {
  const norm = String(stageKeyOrLabel).toUpperCase();
  if (norm.includes('LINING')) return 'Lining';
  if (norm.includes('CUT') || norm.includes('LEATHER')) return 'Cutting';
  if (norm.includes('STORE') || norm.includes('DRAWER')) return 'Store';
  if (norm.includes('INSPECT') || norm.includes('QC')) return 'Quality';
  if (norm.includes('PACK')) return 'Packaging';
  if (norm.includes('PAST') || norm.includes('FUS') || norm.includes('STITCH') || norm.includes('FINISH')) return 'Stitching';
  return 'Production';
}

const DEPARTMENT_DISPLAY_ORDER = ['Cutting', 'Lining', 'Store', 'Stitching', 'Quality', 'Packaging'];

function departmentSortIndex(name = '') {
  const idx = DEPARTMENT_DISPLAY_ORDER.findIndex((d) => d.toLowerCase() === String(name).toLowerCase());
  return idx === -1 ? DEPARTMENT_DISPLAY_ORDER.length : idx;
}

export default function DirectManagerDashboard() {
  const { token, user } = useAuth();

  // ── Real data state ──
  const [dashboardData, setDashboardData] = useState(null);
  const [shiftConfig, setShiftConfig] = useState(null);
  const [realEmployees, setRealEmployees] = useState([]);
  const [realDrawers, setRealDrawers] = useState([]);
  const [drawersLoading, setDrawersLoading] = useState(false);
  const [traceabilityData, setTraceabilityData] = useState([]);
  const [traceabilityLoading, setTraceabilityLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const [activeTab, setActiveTab] = useState('tab-overview');

  // Filters
  const [filterDate, setFilterDate] = useState('all');
  const [filterOrder, setFilterOrder] = useState('all');
  const [filterStyle, setFilterStyle] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Report modal
  const [activeReportModal, setActiveReportModal] = useState(null);

  // Drill-downs
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [selectedStage, setSelectedStage] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const [selectedOrderRow, setSelectedOrderRow] = useState(null);
  const [orderDetailData, setOrderDetailData] = useState(null);
  const [loadingOrderDetail, setLoadingOrderDetail] = useState(false);

  const [selectedStyleRow, setSelectedStyleRow] = useState(null);
  const [styleDetailData, setStyleDetailData] = useState(null);
  const [loadingStyleDetail, setLoadingStyleDetail] = useState(false);

  const [selectedPieceCode, setSelectedPieceCode] = useState(null);
  const [pieceDetailData, setPieceDetailData] = useState(null);
  const [loadingPieceDetail, setLoadingPieceDetail] = useState(false);

  // Drawer actions
  const [selectedDrawer, setSelectedDrawer] = useState(null);
  const [showDrawerActionModal, setShowDrawerActionModal] = useState(false);
  const [drawerActionType, setDrawerActionType] = useState('send');
  const [drawerDestination, setDrawerDestination] = useState('STITCHING');
  const [drawerActionBusy, setDrawerActionBusy] = useState(false);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // ── LIVE BACKEND CALL: GET /api/v1/dashboard/direct-manager + GET /api/v1/employees
  // + GET /api/v1/attendance/config (shift_start/shift_length_hours — real basis for
  // "Hours Remaining" / "Required Rate" instead of the previous build's fake numbers) ──
  const fetchDashboard = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setApiError(null);
      const [dmRes, empRes, cfgRes] = await Promise.allSettled([
        apiGetDirectManagerDashboard(token),
        apiGetEmployees(token),
        apiGetAttendanceConfig(token),
      ]);

      if (dmRes.status === 'fulfilled' && dmRes.value) {
        setDashboardData(dmRes.value);
      } else if (dmRes.status === 'rejected') {
        setApiError(dmRes.reason?.message || 'Failed to fetch Direct Manager API');
      }

      if (empRes.status === 'fulfilled' && Array.isArray(empRes.value)) {
        setRealEmployees(empRes.value);
      }

      if (cfgRes.status === 'fulfilled' && cfgRes.value) {
        setShiftConfig(cfgRes.value);
      }
    } catch (err) {
      console.warn('Direct Manager API notice:', err.message);
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [token]);

  // ── LIVE BACKEND CALL: GET /api/v1/drawers (only while the Drawers tab is open) ──
  const fetchDrawers = async () => {
    if (!token) return;
    setDrawersLoading(true);
    try {
      const data = await apiListDrawers(token, { has_piece: true, limit: 200 });
      setRealDrawers(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      console.warn('Drawer list fetch notice:', err.message);
    } finally {
      setDrawersLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'tab-drawers') fetchDrawers();
  }, [token, activeTab]);

  // ── LIVE BACKEND CALL: GET /api/v1/dashboard/store/traceability (Piece Traceability tab) ──
  useEffect(() => {
    if (!token || activeTab !== 'tab-pieces') return;
    let isMounted = true;
    (async () => {
      setTraceabilityLoading(true);
      try {
        const params = {};
        if (searchQuery) params.piece_code = searchQuery;
        if (selectedStyleRow?.style_id) params.style_id = selectedStyleRow.style_id;
        const data = await apiGetStoreTraceability(token, params);
        if (isMounted) setTraceabilityData(Array.isArray(data) ? data : []);
      } catch (err) {
        console.warn('Store traceability fetch notice:', err.message);
        if (isMounted) setTraceabilityData([]);
      } finally {
        if (isMounted) setTraceabilityLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [token, activeTab, searchQuery, selectedStyleRow]);

  // ── LIVE BACKEND CALL: GET /api/v1/dashboard/direct-manager/pieces/{piece_code} ──
  useEffect(() => {
    let isMounted = true;
    if (!selectedPieceCode || !token) {
      setPieceDetailData(null);
      return;
    }
    (async () => {
      setLoadingPieceDetail(true);
      try {
        const pData = await apiGetDirectManagerPieceDetail(token, selectedPieceCode);
        if (isMounted && pData) setPieceDetailData(pData);
      } catch (err) {
        console.warn('Piece detail fetch notice:', err.message);
      } finally {
        if (isMounted) setLoadingPieceDetail(false);
      }
    })();
    return () => { isMounted = false; };
  }, [selectedPieceCode, token]);

  // ── LIVE BACKEND CALL: GET /api/v1/dashboard/direct-manager/orders/{order_id} ──
  useEffect(() => {
    let isMounted = true;
    if (!selectedOrderRow?.order_id || !token) {
      setOrderDetailData(null);
      return;
    }
    (async () => {
      setLoadingOrderDetail(true);
      try {
        const data = await apiGetDirectManagerOrderDetail(token, selectedOrderRow.order_id);
        if (isMounted && data) setOrderDetailData(data);
      } catch (err) {
        console.warn('Order detail fetch notice:', err.message);
      } finally {
        if (isMounted) setLoadingOrderDetail(false);
      }
    })();
    return () => { isMounted = false; };
  }, [selectedOrderRow, token]);

  // ── LIVE BACKEND CALL: GET /api/v1/dashboard/direct-manager/styles/{style_id} ──
  useEffect(() => {
    let isMounted = true;
    if (!selectedStyleRow?.style_id || !token) {
      setStyleDetailData(null);
      return;
    }
    (async () => {
      setLoadingStyleDetail(true);
      try {
        const data = await apiGetDirectManagerStyleDetail(token, selectedStyleRow.style_id);
        if (isMounted && data) setStyleDetailData(data);
      } catch (err) {
        console.warn('Style detail fetch notice:', err.message);
      } finally {
        if (isMounted) setLoadingStyleDetail(false);
      }
    })();
    return () => { isMounted = false; };
  }, [selectedStyleRow, token]);

  // ── Real backend structures ──
  const meta = dashboardData?.meta || null;
  const overall = useMemo(() => dashboardData?.overall || {}, [dashboardData]);
  const productionRate = useMemo(() => dashboardData?.production_rate || {}, [dashboardData]);
  const qualityStats = useMemo(() => dashboardData?.quality || {}, [dashboardData]);
  const attendanceStats = useMemo(() => dashboardData?.attendance || {}, [dashboardData]);
  const storeStats = useMemo(() => dashboardData?.store || {}, [dashboardData]);
  const bottleneck = useMemo(() => dashboardData?.bottleneck || null, [dashboardData]);
  const departmentsList = useMemo(() => dashboardData?.departments || [], [dashboardData]);
  const pipelineList = useMemo(() => dashboardData?.pipeline || [], [dashboardData]);
  const orderProgressList = useMemo(() => dashboardData?.order_progress || [], [dashboardData]);
  const dailyProductionLogs = useMemo(() => dashboardData?.daily_production || [], [dashboardData]);

  const roleLabel = useMemo(() => {
    if (user === 'managing_director') return 'MANAGING DIRECTOR';
    if (user === 'hr') return 'HUMAN RESOURCES (HR)';
    return 'DIRECT MANAGER';
  }, [user]);

  // ── Filter option sources ──
  const availableDatesList = useMemo(
    () => Array.from(new Set(dailyProductionLogs.map((l) => l.work_date).filter(Boolean))),
    [dailyProductionLogs]
  );

  const filteredDailyProduction = useMemo(() => {
    if (filterDate === 'all') return dailyProductionLogs;
    return dailyProductionLogs.filter((d) => d.work_date === filterDate);
  }, [dailyProductionLogs, filterDate]);

  const availableStyles = useMemo(
    () => Array.from(new Set(orderProgressList.map((o) => o.style_name).filter(Boolean))),
    [orderProgressList]
  );

  // Lining always gets a filter option, even when the pipeline has no
  // LINING_CUTTING stage in scope — it still has a (possibly null) row in
  // deptPerformanceTable, so the filter needs to be able to select it.
  const departmentOptions = useMemo(
    () => Array.from(new Set([...pipelineList.map((p) => inferDepartment(p.stage || p.label)), 'Lining']))
      .sort((a, b) => departmentSortIndex(a) - departmentSortIndex(b)),
    [pipelineList]
  );

  // Real order_progress rows narrowed by the universal filter bar — drives the
  // Orders & Styles table, its KPI tiles, and the style-wise chart together so
  // picking an order/style actually changes what those show.
  const filteredOrderProgress = useMemo(() => {
    return orderProgressList.filter((o) => {
      if (filterOrder !== 'all' && o.order_number !== filterOrder) return false;
      if (filterStyle !== 'all' && o.style_name !== filterStyle) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const m =
          (o.order_number && o.order_number.toLowerCase().includes(q)) ||
          (o.style_name && o.style_name.toLowerCase().includes(q)) ||
          (o.article && o.article.toLowerCase().includes(q));
        if (!m) return false;
      }
      return true;
    });
  }, [orderProgressList, filterOrder, filterStyle, searchQuery]);

  const filterMatchedRow = useMemo(() => {
    if (filterOrder === 'all' && filterStyle === 'all') return null;
    return orderProgressList.find((o) =>
      (filterOrder === 'all' || o.order_number === filterOrder) &&
      (filterStyle === 'all' || o.style_name === filterStyle)
    ) || null;
  }, [orderProgressList, filterOrder, filterStyle]);

  useEffect(() => {
    if (!filterMatchedRow) {
      setSelectedOrderRow(null);
      setSelectedStyleRow(null);
      return;
    }
    if (filterStyle !== 'all') {
      setSelectedStyleRow(filterMatchedRow);
      setSelectedOrderRow(null);
    } else {
      setSelectedOrderRow(filterMatchedRow);
      setSelectedStyleRow(null);
    }
  }, [filterMatchedRow, filterStyle]);

  const activeDrillDownData = styleDetailData || orderDetailData;
  const isDrillDownLoading = loadingOrderDetail || loadingStyleDetail;
  const isDrillDownActive = !!filterMatchedRow;

  const effectivePipeline = useMemo(() => {
    const base = (isDrillDownActive && activeDrillDownData?.stages?.length)
      ? activeDrillDownData.stages.map((s) => ({
          stage: s.stage || s.name,
          label: formatStage(s.stage || s.label || s.name),
          completed: readNum(s, ['completed', 'done']),
          pending: readNum(s, ['pending', 'queue', 'remaining']),
        }))
      : (isDrillDownActive ? [] : pipelineList);
    if (filterDepartment === 'all') return base;
    return base.filter((st) => inferDepartment(st.stage || st.label) === filterDepartment);
  }, [isDrillDownActive, activeDrillDownData, pipelineList, filterDepartment]);

  const effectiveBlockedStage = selectedOrderRow ? orderDetailData?.blocked_stage : null;

  const liningDepartmentRow = useMemo(
    () => departmentsList.find((d) => /LINING/i.test(d.department || d.name || '')) || null,
    [departmentsList]
  );
  const hasLiningStage = pipelineList.some((st) => /LINING/i.test(st.stage || st.label || ''));

  const pipelineWithStore = useMemo(() => {
    if (isDrillDownActive) return effectivePipeline;
    let cards = [...effectivePipeline];

    if (!hasLiningStage) {
      const liningCard = liningDepartmentRow
        ? {
            stage: 'LINING',
            label: 'Lining',
            completed: readNum(liningDepartmentRow, ['completed', 'total_produced', 'done']),
            pending: readNum(liningDepartmentRow, ['pending', 'total_pending', 'queue']),
            isDepartmentOverlay: true,
          }
        : {
            stage: 'LINING',
            label: 'Lining',
            completed: null,
            pending: null,
            isDepartmentOverlay: true,
            isUnavailable: true,
          };
      const cutIdx = cards.findIndex((st) => /CUT|LEATHER/i.test(st.stage || st.label || ''));
      cards.splice(cutIdx === -1 ? 0 : cutIdx + 1, 0, liningCard);
    }

    const storeCard = {
      stage: 'STORE',
      label: 'Store / Drawer',
      completed: storeStats.drawers_sent ?? null,
      pending: storeStats.drawers_in_store ?? null,
      isStoreOverlay: true,
    };
    const stitchIdx = cards.findIndex((st) => /STITCH/i.test(st.stage || st.label || ''));
    cards = stitchIdx === -1 ? [...cards, storeCard] : [...cards.slice(0, stitchIdx), storeCard, ...cards.slice(stitchIdx)];

    return cards;
  }, [effectivePipeline, storeStats, isDrillDownActive, liningDepartmentRow, hasLiningStage]);

  const effectiveTargetPieces = isDrillDownActive
    ? (activeDrillDownData?.total_quantity ?? filterMatchedRow?.total_ordered ?? 0)
    : (overall.total_target ?? 0);
  const effectiveProduced = isDrillDownActive ? (filterMatchedRow?.completed ?? 0) : (overall.total_produced ?? 0);
  const effectivePending = isDrillDownActive
    ? (filterMatchedRow?.pending ?? Math.max(0, effectiveTargetPieces - effectiveProduced))
    : (overall.total_pending ?? 0);
  const effectiveAchievementPct = isDrillDownActive
    ? (activeDrillDownData?.completion_pct ?? filterMatchedRow?.completion_pct ?? 0)
    : (overall.overall_achievement_pct ?? 0);

  const filteredEmployees = useMemo(() => {
    return realEmployees.filter((e) => {
      if (filterEmployee !== 'all' && e.name !== filterEmployee) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const m = (e.name && e.name.toLowerCase().includes(q)) || (e.designation && e.designation.toLowerCase().includes(q));
        if (!m) return false;
      }
      return true;
    });
  }, [realEmployees, filterEmployee, searchQuery]);

  const filteredTraceability = useMemo(() => {
    return traceabilityData.filter((t) => {
      if (filterOrder !== 'all' && t.order_number !== filterOrder) return false;
      if (filterEmployee !== 'all' && t.employee !== filterEmployee) return false;
      if (filterDate !== 'all' && t.cutting_date !== filterDate) return false;
      if (filterStyle !== 'all' && t.style !== filterStyle) return false;
      return true;
    });
  }, [traceabilityData, filterOrder, filterEmployee, filterDate, filterStyle]);

  const filteredDrawers = useMemo(() => {
    return realDrawers.filter((dr) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const m =
          (dr.code && dr.code.toLowerCase().includes(q)) ||
          (dr.piece_code && dr.piece_code.toLowerCase().includes(q));
        if (!m) return false;
      }
      return true;
    });
  }, [realDrawers, searchQuery]);

  // ── CSV Export ──
  const handleExportFactoryReport = () => {
    const headers = ['Stage', 'Completed', 'Pending Queue', 'Completion %'];
    const rows = pipelineList.map((p) => [
      p.label || p.stage,
      readNum(p, ['completed', 'done']) ?? 0,
      readNum(p, ['pending', 'queue']) ?? 0,
      `${readNum(p, ['completion_pct', 'achievement_pct']) ?? 0}%`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Direct_Manager_Factory_Pipeline_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('📥 Factory Master Production CSV Exported Successfully');
  };

  // ── Drawer actions ──
  const handleConfirmDrawerAction = async () => {
    if (!selectedDrawer) return;
    setDrawerActionBusy(true);
    try {
      if (drawerActionType === 'send') {
        const result = await apiSendDrawers(token, {
          drawer_ids: [selectedDrawer.drawer_id],
          destination: drawerDestination,
        });
        triggerToast(result.message || `Sent ${result.count_sent ?? 0}/${result.requested ?? 1} drawer(s) to ${drawerDestination}`);
      } else {
        const result = await apiReceiveDrawer(token, selectedDrawer.drawer_id, 'RECEIVED');
        triggerToast(`Drawer ${result.drawer_code || selectedDrawer.code} → ${result.state || 'RECEIVED'}`);
      }
      setShowDrawerActionModal(false);
      fetchDrawers();
    } catch (err) {
      triggerToast(`⚠️ ${err.message}`);
    } finally {
      setDrawerActionBusy(false);
    }
  };

  // ─── DEPARTMENT PERFORMANCE — real departments[] rows only. No target field
  // exists anywhere in the documented DM schema for a department, so this reads
  // only completed/pending/achievement_pct and shows a NotAvailableBadge/status
  // of null rather than fabricating a target to divide by. ───
  const deptPerformanceTable = useMemo(() => {
    const rows = departmentsList.map((d) => {
      const completed = readNum(d, ['completed', 'total_produced', 'done']);
      const pending = readNum(d, ['pending', 'total_pending', 'queue']);
      const achievementPct = readNum(d, ['achievement_pct', 'completion_pct']);
      let status = null;
      if (achievementPct !== null) {
        if (achievementPct >= 105) status = 'Ahead';
        else if (achievementPct >= 90) status = 'On Plan';
        else if (achievementPct >= 80) status = 'Slightly Behind';
        else status = 'Behind';
      }
      return {
        department: d.department || d.name || 'Unknown',
        completed,
        pending,
        achievementPct,
        status,
      };
    });

    // Lining runs in parallel with Cutting on the real floor, so it always gets
    // a row here — real numbers when the backend returns a Lining department,
    // an honest null row (kept, not hidden) when it doesn't.
    if (!rows.some((r) => /LINING/i.test(r.department))) {
      rows.push({ department: 'Lining', completed: null, pending: null, achievementPct: null, status: null });
    }

    return rows.sort((a, b) => departmentSortIndex(a.department) - departmentSortIndex(b.department));
  }, [departmentsList]);

  const displayDeptTable = useMemo(() => {
    if (filterDepartment === 'all') return deptPerformanceTable;
    return deptPerformanceTable.filter(
      (d) => d.department.toLowerCase() === filterDepartment.toLowerCase()
    );
  }, [deptPerformanceTable, filterDepartment]);

  const totalDeptCompleted = useMemo(
    () => displayDeptTable.reduce((s, r) => s + (r.completed || 0), 0),
    [displayDeptTable]
  );
  const totalDeptPending = useMemo(
    () => displayDeptTable.reduce((s, r) => s + (r.pending || 0), 0),
    [displayDeptTable]
  );

  // ─── STAGE CARDS — real pipeline completed/pending only. The previous build's
  // "target" and hourly Actual/Plan/Forecast curve had no backing endpoint (no
  // per-stage target, no intraday time series exist anywhere in the API), and
  // were being multiplied by an invented "filterFactor" that silently corrupted
  // the real completed/pending numbers whenever a filter was active. Removed. ───
  const deptStageCardsData = useMemo(() => {
    return pipelineWithStore.map((st, idx) => {
      const stageKey = st.stage || st.label;
      const isOverlay = st.isStoreOverlay || st.isDepartmentOverlay;
      const isBottleneck = !isOverlay && (isDrillDownActive
        ? effectiveBlockedStage === stageKey
        : (bottleneck?.stage === stageKey || bottleneck?.label === st.label));

      const completed = readNum(st, ['completed', 'done', 'total_produced']);
      const pending = readNum(st, ['pending', 'queue', 'total_pending']);
      const status = st.isUnavailable ? null : (isBottleneck ? 'Bottleneck' : 'Active');

      return {
        stageKey,
        label: st.label || formatStage(stageKey),
        idx: idx + 1,
        isOverlay,
        isUnavailable: st.isUnavailable,
        isBottleneck,
        completed,
        pending,
        status,
      };
    });
  }, [pipelineWithStore, isDrillDownActive, effectiveBlockedStage, bottleneck]);

  const filteredDeptStageCards = useMemo(() => {
    if (filterDepartment === 'all') return deptStageCardsData;
    return deptStageCardsData.filter((card) =>
      card.label.toLowerCase().includes(filterDepartment.toLowerCase()) ||
      inferDepartment(card.stageKey).toLowerCase() === filterDepartment.toLowerCase()
    );
  }, [deptStageCardsData, filterDepartment]);

  const deptComparativeData = useMemo(() => {
    return deptStageCardsData.map((d) => ({
      name: d.label.length > 12 ? `${d.label.slice(0, 10)}…` : d.label,
      fullName: d.label,
      Completed: d.completed ?? 0,
      Queue: d.pending ?? 0,
      // No per-stage target exists anywhere in the documented schema — kept as a
      // field (null) rather than removed, so the legend/series stays but draws nothing.
      Target: null,
    }));
  }, [deptStageCardsData]);

  // ─── STYLE-WISE FULFILLMENT — real order_progress rows, narrowed by the
  // universal filter (so picking an order/style actually changes the chart),
  // and showing every style in scope rather than capping at 8. The previous
  // build also substituted invented style names ("Classic Biker"…) and a fake
  // demo chart when empty — removed; an empty chart now just means no orders
  // are in scope, which is the truth. ───
  const stylesGraphData = useMemo(() => {
    const styleMap = new Map();
    filteredOrderProgress.forEach((o) => {
      const sName = o.style_name || o.style || 'Unspecified Style';
      const ordered = Number(o.total_ordered ?? o.total_quantity ?? 0);
      const completed = Number(o.completed ?? 0);
      const pending = Number(o.pending ?? Math.max(0, ordered - completed));
      if (styleMap.has(sName)) {
        const prev = styleMap.get(sName);
        prev.Ordered += ordered;
        prev.Completed += completed;
        prev.Pending += pending;
        prev.ordersCount += 1;
      } else {
        styleMap.set(sName, {
          name: sName,
          fullName: sName,
          styleName: sName,
          Ordered: ordered,
          Completed: completed,
          Pending: pending,
          ordersCount: 1,
        });
      }
    });
    return Array.from(styleMap.values()).sort((a, b) => b.Ordered - a.Ordered);
  }, [filteredOrderProgress]);

  // Real pipeline funnel — already fully backed by real data, unchanged.
  const stageFunnelGraphData = useMemo(() => {
    return pipelineWithStore.map((st, idx) => ({
      stage: st.label || formatStage(st.stage),
      shortStage: (st.label || formatStage(st.stage)).slice(0, 10),
      Completed: readNum(st, ['completed', 'done', 'total_produced']) ?? 0,
      Queue: readNum(st, ['pending', 'queue', 'total_pending']) ?? 0,
      idx: idx + 1,
    }));
  }, [pipelineWithStore]);

  // ─── STORE DRAWER BUFFER — the real store{} KPI block only (drawers_in_store /
  // drawers_sent / drawers_received). The previous build defaulted to 16/32 when
  // those were missing and fabricated "Ready for Stitching" (65% guess) and
  // "Available Slots" (48-total guess) categories with no backing field at all. ───
  const drawersGraphData = useMemo(() => {
    return [
      { category: 'In Store', count: storeStats.drawers_in_store ?? 0, fill: '#9333ea' },
      { category: 'Sent', count: storeStats.drawers_sent ?? 0, fill: '#3b82f6' },
      { category: 'Received', count: storeStats.drawers_received ?? 0, fill: '#10b981' },
    ];
  }, [storeStats]);

  // ─── Employees by designation — real GET /employees rows only (replaces the
  // previous build's fake per-employee "Output vs Target" chart, which had no
  // backing field anywhere: GET /employees returns no production count). ───
  const employeesByDesignation = useMemo(() => {
    const map = new Map();
    filteredEmployees.forEach((e) => {
      const key = e.designation || 'Unspecified';
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([designation, count]) => ({ designation, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredEmployees]);

  // ─── Pieces cut per day by material — real store/traceability rows, grouped
  // by the real cutting_date and material_type fields (replaces the previous
  // build's fully-fabricated hourly scan curve, which had no backing endpoint). ───
  const traceabilityByDate = useMemo(() => {
    const map = new Map();
    filteredTraceability.forEach((t) => {
      const key = t.cutting_date || 'Unknown';
      if (!map.has(key)) map.set(key, { date: key, Leather: 0, Lining: 0 });
      const entry = map.get(key);
      if (String(t.material_type).toUpperCase() === 'LINING') entry.Lining += 1;
      else entry.Leather += 1;
    });
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredTraceability]);

  // ─── Today's real production summary — the previous build's "Production
  // Overview" panel was an entirely synthetic hourly Actual/Plan/Forecast curve
  // (no intraday endpoint exists anywhere in the API) driven by a fake shift
  // multiplier and hardcoded 900/478 fallbacks. Replaced with the real
  // daily_production rows the backend actually returns. ───
  const todaysProductionRow = useMemo(() => {
    if (!dailyProductionLogs.length) return null;
    const todayStr = new Date().toISOString().slice(0, 10);
    return dailyProductionLogs.find((d) => d.work_date === todayStr) || dailyProductionLogs[dailyProductionLogs.length - 1] || null;
  }, [dailyProductionLogs]);

  // ─── Real "vs yesterday" — derived from the two most recent real
  // daily_production rows (sorted by work_date), not a hardcoded +6%. `null`
  // when fewer than two days of history are available. ───
  const vsYesterdayPct = useMemo(() => {
    if (dailyProductionLogs.length < 2) return null;
    const sorted = [...dailyProductionLogs].sort((a, b) => a.work_date.localeCompare(b.work_date));
    const today = sorted[sorted.length - 1];
    const yesterday = sorted[sorted.length - 2];
    const todayCompleted = today?.completed ?? 0;
    const yesterdayCompleted = yesterday?.completed ?? 0;
    if (yesterdayCompleted <= 0) return null;
    return Math.round(((todayCompleted - yesterdayCompleted) / yesterdayCompleted) * 100);
  }, [dailyProductionLogs]);

  // ─── Real shift clock — from GET /api/v1/attendance/config (shift_start +
  // shift_length_hours), the actual factory shift policy. Previously "Hours
  // Remaining" / "Required Rate" were hardcoded (3h 36m / 117 pcs/hr); now
  // both are computed for real, or null when the config hasn't loaded yet. ───
  const shiftTimeInfo = useMemo(() => {
    if (!shiftConfig?.shift_start || !shiftConfig?.shift_length_hours) {
      return { hoursRemaining: null, shiftEndLabel: null };
    }
    const [h, m] = String(shiftConfig.shift_start).split(':').map(Number);
    const now = new Date();
    const shiftStart = new Date(now);
    shiftStart.setHours(h || 0, m || 0, 0, 0);
    const shiftEnd = new Date(shiftStart.getTime() + shiftConfig.shift_length_hours * 60 * 60 * 1000);
    const msRemaining = shiftEnd.getTime() - now.getTime();
    const shiftEndLabel = shiftEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return { hoursRemaining: Math.max(0, msRemaining / (1000 * 60 * 60)), shiftEndLabel };
  }, [shiftConfig]);

  // ─── KPI tiles — every value read straight off the real DM dashboard
  // response. No synthetic fallback constants (the previous build defaulted to
  // 92%, -8%, 523/560 workers, a non-existent `quality.pass_rate` field, etc.
  // whenever real data was missing). Missing fields are `null` here and render
  // a NotAvailableBadge downstream instead of a fabricated number. ───
  const kpiData = useMemo(() => {
    const totalProd = typeof overall.total_produced === 'number' ? overall.total_produced : null;
    const targetProd = typeof overall.total_target === 'number' ? overall.total_target : null;
    const targetPct = typeof overall.overall_achievement_pct === 'number' ? overall.overall_achievement_pct : null;
    const variancePct = (totalProd !== null && targetProd) ? Math.round(((totalProd - targetProd) / targetProd) * 100) : null;

    const ordersInProg = typeof overall.orders_in_progress === 'number' ? overall.orders_in_progress : null;
    const delayedCount = typeof overall.delayed_orders === 'number' ? overall.delayed_orders : null;
    const onTrackCount = (ordersInProg !== null && delayedCount !== null) ? Math.max(0, ordersInProg - delayedCount) : null;

    const productivity = typeof productionRate.pieces_per_employee_today === 'number' ? productionRate.pieces_per_employee_today : null;
    const reworkPcs = typeof qualityStats.rework_pieces === 'number' ? qualityStats.rework_pieces : null;
    const qualityAccepted = typeof qualityStats.accepted === 'number' ? qualityStats.accepted : null;
    const qualityInspected = typeof qualityStats.inspected === 'number' ? qualityStats.inspected : null;
    const qualityPassPct = (qualityAccepted !== null && qualityInspected > 0) ? Math.round((qualityAccepted / qualityInspected) * 100) : null;

    const presentWorkers = typeof attendanceStats.employees_present === 'number' ? attendanceStats.employees_present : null;
    const totalWorkers = typeof attendanceStats.employees_assigned === 'number' ? attendanceStats.employees_assigned : null;
    const attendancePct = (presentWorkers !== null && totalWorkers > 0) ? Math.round((presentWorkers / totalWorkers) * 100) : null;

    const remainingTarget = (targetProd !== null && totalProd !== null) ? Math.max(0, targetProd - totalProd) : null;
    const requiredRate = (remainingTarget !== null && shiftTimeInfo.hoursRemaining) ? Math.round(remainingTarget / shiftTimeInfo.hoursRemaining) : null;
    const actualRate = typeof productionRate.pieces_per_hour_today === 'number' ? productionRate.pieces_per_hour_today : null;

    return {
      totalProd, targetProd, targetPct, variancePct,
      ordersInProg, delayedCount, onTrackCount,
      productivity, reworkPcs, qualityPassPct,
      presentWorkers, totalWorkers, attendancePct,
      remainingTarget, requiredRate, actualRate,
    };
  }, [overall, productionRate, qualityStats, attendanceStats, shiftTimeInfo]);

  // ─── Orders At Risk — real order_progress rows flagged by the real
  // delay_status field (the previous build showed four invented orders
  // "JP1045..JP1052" with made-up due dates and risk levels whenever real data
  // didn't fill all four slots). Empty here just means nothing is delayed. ───
  const ordersAtRiskList = useMemo(() => {
    return orderProgressList
      .filter((o) => o.delay_status && String(o.delay_status).toUpperCase().includes('DELAY'))
      .slice(0, 6)
      .map((o) => ({
        id: o.order_id || o.order_number,
        order_number: o.order_number,
        style_name: o.style_name,
        total_quantity: o.total_ordered ?? o.total_quantity ?? 0,
        pending: o.pending ?? 0,
        due_date: o.delivery_deadline || null,
        delay_status: o.delay_status,
      }));
  }, [orderProgressList]);

  // ─── Department Queues — real pipeline pending counts only, no fake fallback list. ───
  const deptQueuesList = useMemo(() => {
    return [...pipelineList]
      .map((p) => ({
        name: formatStage(p.stage || p.label),
        waiting: readNum(p, ['pending', 'queue']) ?? 0,
      }))
      .filter((p) => p.waiting > 0)
      .sort((a, b) => b.waiting - a.waiting)
      .slice(0, 5)
      .map((p, idx) => ({
        ...p,
        barColor: idx === 0 ? 'bg-rose-500' : idx === 1 ? 'bg-amber-500' : idx === 2 ? 'bg-yellow-400' : 'bg-emerald-500',
      }));
  }, [pipelineList]);

  const totalWaitingCount = useMemo(() => deptQueuesList.reduce((s, q) => s + q.waiting, 0), [deptQueuesList]);

  // ── Real per-report CSV export — each report type downloads the actual
  // real dataset already loaded on this dashboard, not a generic toast. ──
  const downloadCsv = (filename, headers, rows) => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.map((v) => (v ?? '')).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadReport = (reportName) => {
    const dateStamp = new Date().toISOString().slice(0, 10);
    switch (reportName) {
      case 'Daily Production':
        downloadCsv(
          `Daily_Production_${dateStamp}.csv`,
          ['Work Date', 'Assigned', 'Completed'],
          dailyProductionLogs.map((d) => [d.work_date, d.assigned ?? 0, d.completed ?? 0])
        );
        break;
      case 'Department Report':
        downloadCsv(
          `Department_Report_${dateStamp}.csv`,
          ['Department', 'Completed', 'Pending', 'Achievement %'],
          deptPerformanceTable.map((d) => [d.department, d.completed ?? '', d.pending ?? '', d.achievementPct ?? ''])
        );
        break;
      case 'Order Status':
        downloadCsv(
          `Order_Status_${dateStamp}.csv`,
          ['Order #', 'Style', 'Ordered', 'Completed', 'Pending', 'Completion %', 'Delay Status'],
          orderProgressList.map((o) => [
            o.order_number, o.style_name, o.total_ordered ?? o.total_quantity ?? '',
            o.completed ?? 0, o.pending ?? 0, o.completion_pct ?? '', o.delay_status ?? '',
          ])
        );
        break;
      case 'Employee Report':
        downloadCsv(
          `Employee_Report_${dateStamp}.csv`,
          ['Name', 'Designation', 'Wage Type', 'Active'],
          realEmployees.map((e) => [e.name, e.designation ?? '', e.wage_type ?? '', e.is_active ? 'Yes' : 'No'])
        );
        break;
      case 'Quality Report':
        downloadCsv(
          `Quality_Report_${dateStamp}.csv`,
          ['Produced', 'Inspected', 'Rework Pieces', 'Accepted', 'Rejected', 'Defective %'],
          [[
            qualityStats.produced ?? '', qualityStats.inspected ?? '', qualityStats.rework_pieces ?? '',
            qualityStats.accepted ?? '', qualityStats.rejected ?? '', qualityStats.defective_pct ?? '',
          ]]
        );
        break;
      case 'Delay Analysis':
        downloadCsv(
          `Delay_Analysis_${dateStamp}.csv`,
          ['Order #', 'Style', 'Total Qty', 'Pending', 'Due Date', 'Delay Status'],
          ordersAtRiskList.map((o) => [o.order_number, o.style_name ?? '', o.total_quantity, o.pending, o.due_date ?? '', o.delay_status])
        );
        break;
      default:
        break;
    }
    triggerToast(`📥 ${reportName} CSV downloaded`);
    setActiveReportModal(null);
  };

  return (
    <div className="w-full min-w-0 space-y-6 pb-6 font-sans text-slate-800">

      {/* ─── TOAST ─── */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-16 right-6 z-50 bg-[#0f172a] border border-slate-700 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold font-mono max-w-md"
          >
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {apiError && (
        <div className="w-full bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold p-4 rounded-2xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Direct Manager API error: {apiError}</span>
        </div>
      )}

      {/* ─── 1. MASTER PIPELINE (Top Action Bar & Stage Funnel) ─── */}
      <section className="w-full bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-amber-100 text-amber-900 text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                {roleLabel} &bull; Executive Command
              </span>
              {meta?.generated_for && (
                <span className="text-slate-400 text-xs font-semibold">Generated {meta.generated_for}</span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Factory className="w-5 h-5 text-indigo-600" />
              {isDrillDownActive
                ? `Pipeline — ${selectedStyleRow?.style_name || selectedOrderRow?.order_number}`
                : 'Master Factory Production Pipeline'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isDrillDownActive
                ? `Real per-stage counts for this ${selectedStyleRow ? 'style' : 'order'}, from GET /dashboard/direct-manager/${selectedStyleRow ? 'styles' : 'orders'}/{id}.`
                : 'Live funnel stages from GET /api/v1/dashboard/direct-manager — pending = queue in front of that stage.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {isDrillDownLoading && <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…</span>}
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5 mr-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" /> {isDrillDownActive ? 'Blocked stage' : 'Bottleneck'}
            </span>
            <button
              onClick={fetchDashboard}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Sync Live API</span>
            </button>
            <button
              onClick={handleExportFactoryReport}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Factory CSV</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-2.5 pt-2">
          {pipelineWithStore.map((st, idx) => {
            const stageKey = st.stage || st.label;
            const isOverlay = st.isStoreOverlay || st.isDepartmentOverlay;
            const isBottleneck = !isOverlay && (isDrillDownActive
              ? effectiveBlockedStage === stageKey
              : (bottleneck?.stage === stageKey || bottleneck?.label === st.label));
            const isSelected = selectedStage?.stage === stageKey;
            const completed = readNum(st, ['completed', 'done']);
            const pending = readNum(st, ['pending', 'queue']);
            return (
              <div
                key={`pipeline-stage-${stageKey}-${idx}`}
                onClick={() => {
                  if (st.isStoreOverlay) { setActiveTab('tab-drawers'); return; }
                  if (st.isDepartmentOverlay) { setActiveTab('tab-departments'); return; }
                  setSelectedStage(st);
                  setActiveTab('tab-stages');
                }}
                className={`relative p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
                  st.isUnavailable ? 'border-dashed border-slate-300 bg-slate-50/60 hover:border-slate-400 opacity-80'
                  : st.isStoreOverlay ? 'border-purple-300 bg-purple-50/50 hover:border-purple-400'
                  : st.isDepartmentOverlay ? 'border-teal-300 bg-teal-50/50 hover:border-teal-400'
                  : isSelected ? 'border-indigo-600 bg-indigo-50/70 shadow-md ring-2 ring-indigo-500/20'
                  : isBottleneck ? 'border-amber-400 bg-amber-50/50 shadow-sm hover:border-amber-500'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md font-mono ${
                      st.isUnavailable ? 'bg-slate-200 text-slate-500' : st.isStoreOverlay ? 'bg-purple-100 text-purple-700' : st.isDepartmentOverlay ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {st.isUnavailable ? 'N/A' : st.isStoreOverlay ? 'BUFFER' : st.isDepartmentOverlay ? 'DEPT' : `#${idx + 1}`}
                    </span>
                  </div>
                  <h4 className="text-[11px] font-extrabold text-slate-900 leading-tight truncate">{st.label || stageKey}</h4>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-100 text-[10px] font-semibold space-y-0.5">
                  {st.isUnavailable ? (
                    <p className="text-slate-400 italic">No data yet</p>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-500">{st.isStoreOverlay ? 'Sent:' : 'Done:'}</span>
                        <span className="font-bold text-emerald-700 font-mono">{completed ?? '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">{st.isStoreOverlay ? 'In Store:' : 'Queue:'}</span>
                        <span className={`font-bold font-mono ${(pending || 0) > 100 ? 'text-amber-600 font-black' : 'text-slate-700'}`}>{pending ?? '—'}</span>
                      </div>
                    </>
                  )}
                </div>
                {isBottleneck && (
                  <div className="mt-1.5 text-center bg-amber-100 text-amber-800 text-[8px] font-black uppercase rounded py-0.5 tracking-wider">
                    {isDrillDownActive ? 'Blocked' : 'Bottleneck'}
                  </div>
                )}
              </div>
            );
          })}
          {pipelineWithStore.length === 0 && (
            <div className="col-span-full py-8 text-center text-xs text-slate-400 font-semibold">
              {isDrillDownLoading ? 'Loading real stage data…' : 'No pipeline stages returned.'}
            </div>
          )}
        </div>

        {!hasLiningStage && (
          <p className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5 pt-1">
            <Info className="w-3.5 h-3.5 shrink-0" />
            {liningDepartmentRow
              ? 'Lining (teal, tagged DEPT) is shown from its real department totals, not the stage funnel — this backend has no LINING_CUTTING stage events in scope yet, only department-level counts.'
              : 'Lining’s slot (dashed, tagged N/A) is reserved but empty — no LINING_CUTTING stage events and no Lining department row exist in this response yet. Store is real data from the store KPI block, same as before.'}
          </p>
        )}
      </section>

      {/* ─── 2. UNIVERSAL OPERATIONS CROSS-FILTER (Same Top Pattern + Shift) ─── */}
      <section className="w-full bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">Universal Operations Cross-Filter</h3>
          </div>
          <button
            onClick={() => {
              setFilterDate('all'); setFilterOrder('all'); setFilterStyle('all');
              setFilterDepartment('all'); setFilterEmployee('all'); setSearchQuery('');
              triggerToast('Filters reset');
            }}
            className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
          >
            Reset All Filters
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search order, style, piece..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-[#f8fafc] border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600"
            />
          </div>

          <div>
            <select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-600"
            >
              <option value="all">📅 All Dates</option>
              {availableDatesList.map((d, idx) => <option key={`date-opt-${d}-${idx}`} value={d}>{d}</option>)}
            </select>
          </div>

          <div>
            <select
              value={filterOrder}
              onChange={(e) => setFilterOrder(e.target.value)}
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-600"
            >
              <option value="all">📦 All Orders</option>
              {Array.from(new Set(orderProgressList.map((o) => o.order_number).filter(Boolean))).map((n, idx) => (
                <option key={`ord-opt-${n}-${idx}`} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={filterStyle}
              onChange={(e) => setFilterStyle(e.target.value)}
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-600"
            >
              <option value="all">👗 All Styles</option>
              {availableStyles.map((s, idx) => <option key={`style-opt-${s}-${idx}`} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-600"
            >
              <option value="all">🏢 All Departments</option>
              {departmentOptions.map((name, idx) => (
                <option key={`dept-opt-${name}-${idx}`} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-600"
            >
              <option value="all">👷 All Employees</option>
              {realEmployees.map((emp, idx) => (
                <option key={`emp-opt-${emp.id || emp.name}-${idx}`} value={emp.name}>{emp.name} ({emp.designation || 'Floor'})</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* ─── 3. TABS (Same Navigation Pattern) ─── */}
      <div className="w-full flex items-center gap-1.5 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        {[
          { id: 'tab-overview', label: '📊 Factory Overview', icon: Factory },
          { id: 'tab-departments', label: '🏢 Departments', icon: Building2 },
          { id: 'tab-styles', label: '👗 Orders & Styles', icon: Shirt },
          { id: 'tab-stages', label: '🪡 Stage Funnel', icon: Layers },
          { id: 'tab-employees', label: '👷 Employees', icon: Users },
          { id: 'tab-pieces', label: '🏷️ Piece Traceability', icon: QrCode },
          { id: 'tab-drawers', label: '📦 Store Drawer Dispatch', icon: Boxes },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === tab.id ? 'bg-[#0f172a] text-white shadow-md' : 'text-slate-600 hover:text-slate-900 hover:bg-[#f8fafc]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ====================================================================
           TAB: FACTORY OVERVIEW (Redesigned with reference card fields in app theme)
           ==================================================================== */}
      {activeTab === 'tab-overview' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-6">

          {/* ─── TOP 6 KPI METRIC CARDS (In App Theme) ─── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {/* 1. TOTAL PRODUCTION */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600 border border-purple-100">
                  <Clock className="w-4 h-4" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Total Production</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono my-1">
                {kpiData.totalProd !== null ? kpiData.totalProd.toLocaleString() : '—'} <span className="text-xs font-semibold text-slate-400">pcs</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600 font-semibold pt-2 border-t border-slate-100">
                <span>Target: {kpiData.targetProd !== null ? `${kpiData.targetProd} pcs` : <NotAvailableBadge label="N/A" />}</span>
                {kpiData.variancePct !== null ? (
                  <span className={kpiData.variancePct >= 0 ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                    {kpiData.variancePct > 0 ? `+${kpiData.variancePct}%` : `${kpiData.variancePct}%`}
                  </span>
                ) : <NotAvailableBadge label="N/A" />}
              </div>
            </div>

            {/* 2. TARGET ACHIEVEMENT */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <span className="p-1.5 rounded-lg bg-cyan-50 text-cyan-600 border border-cyan-100">
                  <Target className="w-4 h-4" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Achievement</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono my-1">
                {kpiData.targetPct !== null ? `${kpiData.targetPct}%` : '—'}
              </div>
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, kpiData.targetPct ?? 0)}%` }}
                  />
                </div>
                <div className="flex items-center justify-end text-xs font-bold">
                  {kpiData.targetPct !== null ? (
                    <span className={kpiData.targetPct >= 90 ? 'text-emerald-700' : kpiData.targetPct >= 75 ? 'text-amber-600' : 'text-rose-600'}>
                      ● {kpiData.targetPct >= 90 ? 'On Plan' : kpiData.targetPct >= 75 ? 'Slightly Behind' : 'Behind'}
                    </span>
                  ) : <NotAvailableBadge label="N/A" />}
                </div>
              </div>
            </div>

            {/* 3. ORDERS IN PROGRESS */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <Box className="w-4 h-4" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Active Orders</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono my-1">
                {kpiData.ordersInProg !== null ? kpiData.ordersInProg : '—'}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600 font-semibold pt-2 border-t border-slate-100">
                <span>On Track: <strong className="text-emerald-700">{kpiData.onTrackCount ?? '—'}</strong></span>
                <span>Delayed: <strong className="text-amber-600">{kpiData.delayedCount ?? '—'}</strong></span>
              </div>
            </div>

            {/* 4. EMPLOYEE PRODUCTIVITY */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                  <Activity className="w-4 h-4" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Productivity</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono my-1">
                {kpiData.productivity !== null ? `${kpiData.productivity}` : '—'} <span className="text-xs font-semibold text-slate-400">pcs/employee</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600 font-semibold pt-2 border-t border-slate-100">
                <span>vs Yesterday:</span>
                {vsYesterdayPct !== null ? (
                  <span className={`font-bold flex items-center gap-0.5 ${vsYesterdayPct >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {vsYesterdayPct > 0 ? `+${vsYesterdayPct}%` : `${vsYesterdayPct}%`}
                  </span>
                ) : <NotAvailableBadge label="N/A" />}
              </div>
            </div>

            {/* 5. QUALITY (PASS %) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
                  <ShieldCheck className="w-4 h-4" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Quality Pass</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono my-1">
                {kpiData.qualityPassPct !== null ? `${kpiData.qualityPassPct}%` : <NotAvailableBadge label="no quality table" />}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600 font-semibold pt-2 border-t border-slate-100">
                <span className="text-rose-600 font-semibold">Rework: {kpiData.reworkPcs ?? <NotAvailableBadge label="N/A" />} pcs</span>
              </div>
            </div>

            {/* 6. ATTENDANCE */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600 border border-purple-100">
                  <Users className="w-4 h-4" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Attendance</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono my-1">
                {kpiData.presentWorkers ?? '—'} <span className="text-xs font-medium text-slate-400">/ {kpiData.totalWorkers ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600 font-semibold pt-2 border-t border-slate-100">
                <span className="text-emerald-700 font-bold">{kpiData.attendancePct !== null ? `${kpiData.attendancePct}% Present` : <NotAvailableBadge label="N/A" />}</span>
              </div>
            </div>
          </div>

          {/* ─── MIDDLE ROW: 3 MAIN PANELS (In App Theme) ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* PANEL 1: PRODUCTION OVERVIEW GRAPH (Cols 5) — same Actual/Plan/Forecast
                 area+line design, now fed with real values: Actual = real per-day
                 completed, Plan = real per-day assigned. Forecast has no backing endpoint
                 anywhere in the API (no forecasting field exists), so that field is kept
                 in the legend and side panel but always renders null/N/A rather than
                 being removed or a fabricated curve. */}
            <div className="lg:col-span-5 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-600" />
                    Production Overview
                  </h3>
                </div>
                <div className="flex items-center justify-between gap-4 text-xs text-slate-600 mb-4 border-b border-slate-100 pb-2">
                  <span className="font-semibold">Cumulative Output (pcs) &mdash; real daily_production rows</span>
                  <div className="flex items-center gap-3 text-xs font-semibold">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-1.5 bg-purple-600 rounded-full" />
                      <span className="text-slate-700">Actual</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-0.5 border-b-2 border-dashed border-blue-500" />
                      <span className="text-slate-700">Plan</span>
                    </span>
                    <span className="flex items-center gap-1.5" title="No forecasting endpoint exists in the API">
                      <span className="w-3 h-0.5 border-b-2 border-dotted border-emerald-600" />
                      <span className="text-slate-700">Forecast (N/A)</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-stretch flex-1">
                <div className="sm:col-span-8 h-[310px] sm:h-[330px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={filteredDailyProduction} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                      <defs>
                        <linearGradient id="lightActualGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#9333ea" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#9333ea" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="work_date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                      <Tooltip content={<CustomChartTooltip unit="pcs" />} />
                      <Area type="monotone" dataKey="assigned" name="Plan" stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 4" fill="none" isAnimationActive={true} />
                      <Area type="monotone" dataKey="completed" name="Actual" stroke="#9333ea" strokeWidth={2.5} fillOpacity={1} fill="url(#lightActualGradient)" isAnimationActive={true} />
                    </AreaChart>
                  </ResponsiveContainer>
                  {filteredDailyProduction.length === 0 && (
                    <p className="text-center text-xs text-slate-400 font-medium -mt-40">No daily production rows match the current filter.</p>
                  )}
                </div>

                <div className="sm:col-span-4 bg-[#f8fafc] p-4 rounded-2xl border border-slate-100 flex flex-col justify-between text-xs font-semibold">
                  <div>
                    <span className="text-xs text-slate-500 font-bold block uppercase tracking-wide">Today&apos;s Target</span>
                    <span className="text-xl font-black text-slate-900 font-mono mt-0.5">
                      {todaysProductionRow?.assigned != null ? `${todaysProductionRow.assigned} pcs` : <NotAvailableBadge label="N/A" />}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-purple-700 font-bold block uppercase tracking-wide">Actual (Till Now)</span>
                    <span className="text-xl font-black text-purple-700 font-mono mt-0.5">
                      {todaysProductionRow?.completed != null ? `${todaysProductionRow.completed} pcs` : <NotAvailableBadge label="N/A" />}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-amber-700 font-bold block uppercase tracking-wide">Forecast (EOD)</span>
                    <span className="text-xl font-black text-amber-700 font-mono mt-0.5">
                      <NotAvailableBadge label="No forecasting endpoint" />
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-rose-700 font-bold block uppercase tracking-wide">Variance</span>
                    <span className="text-xl font-black text-rose-700 font-mono mt-0.5">
                      {(todaysProductionRow?.assigned != null && todaysProductionRow?.completed != null)
                        ? (() => {
                            const v = todaysProductionRow.completed - todaysProductionRow.assigned;
                            return `${v > 0 ? '+' : ''}${v} pcs`;
                          })()
                        : <NotAvailableBadge label="N/A" />}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* PANEL 2: DEPARTMENT PERFORMANCE (Cols 4) */}
            <div className="lg:col-span-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  Department Performance
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="text-slate-600 font-bold uppercase text-xs border-b border-slate-200 bg-[#f8fafc]">
                        <th className="py-2 px-2.5">Department</th>
                        <th className="py-2 px-2 text-right">Target</th>
                        <th className="py-2 px-2 text-right">Completed</th>
                        <th className="py-2 px-2 text-right">Pending</th>
                        <th className="py-2 px-2 text-right">%</th>
                        <th className="py-2 px-2.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {displayDeptTable.map((row, idx) => (
                        <tr key={`dept-perf-${row.department}-${idx}`} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2 px-2.5 font-bold text-slate-800">{row.department}</td>
                          <td className="py-2 px-2 text-right"><NotAvailableBadge label="N/A" /></td>
                          <td className="py-2 px-2 text-right font-mono text-slate-600">{row.completed ?? '—'}</td>
                          <td className="py-2 px-2 text-right font-mono text-slate-600">{row.pending ?? '—'}</td>
                          <td className="py-2 px-2 text-right font-mono text-slate-900 font-bold">{row.achievementPct !== null ? `${row.achievementPct}%` : '—'}</td>
                          <td className="py-2 px-2.5 text-right">
                            {row.status ? (
                              <span
                                className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                  row.status === 'Ahead'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : row.status === 'On Plan'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : row.status === 'Slightly Behind'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    row.status === 'Ahead' || row.status === 'On Plan'
                                      ? 'bg-emerald-500'
                                      : row.status === 'Slightly Behind'
                                      ? 'bg-amber-500'
                                      : 'bg-rose-500'
                                  }`}
                                />
                                {row.status}
                              </span>
                            ) : <NotAvailableBadge label="N/A" />}
                          </td>
                        </tr>
                      ))}
                      {displayDeptTable.length === 0 && (
                        <tr><td colSpan={6} className="py-6 text-center text-slate-400 font-semibold">No department data returned.</td></tr>
                      )}
                      {displayDeptTable.length > 0 && (
                        <tr className="border-t-2 border-slate-300 font-extrabold text-slate-900 bg-[#f8fafc]">
                          <td className="py-2 px-2.5 uppercase">TOTAL</td>
                          <td className="py-2 px-2 text-right font-mono text-xs text-slate-400">—</td>
                          <td className="py-2 px-2 text-right font-mono">{totalDeptCompleted}</td>
                          <td className="py-2 px-2 text-right font-mono">{totalDeptPending}</td>
                          <td className="py-2 px-2 text-right font-mono text-xs text-slate-400">—</td>
                          <td className="py-2 px-2.5 text-right font-mono text-xs text-slate-500">ALL</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* PANEL 3: BOTTLENECK & DELIVERY RISK (Cols 3) — real bottleneck{} and
                 order_progress data only. No AI backend exists anywhere in the API,
                 so this shows facts, not invented recommendations. */}
            <div className="lg:col-span-3 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    Bottleneck &amp; Delivery Risk
                  </h3>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Live</span>
                </div>

                {bottleneck?.stage || bottleneck?.label ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-900 flex items-start gap-2.5 mb-3">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-extrabold uppercase tracking-wide block text-xs">{formatStage(bottleneck.label || bottleneck.stage)} is the deepest queue</span>
                      <p className="text-xs text-amber-800 mt-0.5 font-medium leading-relaxed">
                        {typeof bottleneck.pending === 'number' || typeof bottleneck.queue === 'number'
                          ? `${bottleneck.pending ?? bottleneck.queue} pieces waiting.`
                          : 'Queue depth not reported.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-xs text-emerald-800 flex items-start gap-2.5 mb-3">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="font-semibold">No bottleneck reported by the backend right now.</span>
                  </div>
                )}

                <div className="space-y-1.5 text-xs mb-3">
                  <span className="text-xs font-extrabold uppercase text-slate-500 tracking-wider block">Top Waiting Queues (real pipeline data)</span>
                  <ul className="space-y-1.5 text-xs text-slate-700 font-medium">
                    {deptQueuesList.slice(0, 3).map((q, i) => (
                      <li key={`queue-${q.name}-${i}`} className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${q.barColor} shrink-0`} />{q.name}</span>
                        <span className="font-mono font-bold text-slate-900">{q.waiting} pcs</span>
                      </li>
                    ))}
                    {deptQueuesList.length === 0 && <li className="text-slate-400">No pipeline queues reported.</li>}
                  </ul>
                </div>

                <div className="space-y-1.5 text-xs">
                  <span className="text-xs font-extrabold uppercase text-slate-500 tracking-wider block">Delayed Orders</span>
                  <div className="p-2.5 rounded-xl bg-[#f8fafc] border border-slate-200 flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-800">Real delay_status = DELAYED</span>
                    <span className="text-rose-700 font-bold text-sm shrink-0 ml-2">{kpiData.delayedCount ?? '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ─── BOTTOM ROW: 3 EXPANDED CARDS ─── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* CARD 1: ORDERS AT RISK */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <Box className="w-4 h-4 text-indigo-600" />
                    Orders At Risk
                  </h3>
                  <button onClick={() => setActiveTab('tab-styles')} className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer">View All &rarr;</button>
                </div>
                <div className="space-y-3">
                  {ordersAtRiskList.map((order, idx) => (
                    <div key={`risk-ord-${order.id || order.order_number}-${idx}`} className="bg-[#f8fafc] p-3 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                          <span>{order.order_number}</span>
                        </div>
                        <div className="text-xs text-slate-500 font-medium mt-1">
                          {order.total_quantity} pcs &bull; {order.pending} pending{order.due_date ? ` • Due: ${order.due_date}` : ''}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-extrabold px-2.5 py-1 rounded-full border bg-rose-50 text-rose-700 border-rose-200">
                          {order.delay_status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                  {ordersAtRiskList.length === 0 && (
                    <div className="py-6 text-center text-xs text-slate-400 font-semibold">No orders currently flagged as delayed.</div>
                  )}
                </div>
              </div>
            </div>

            {/* CARD 2: DEPARTMENT QUEUES — real pipeline pending counts */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-600" />
                    Department Queues
                  </h3>
                  <button onClick={() => setActiveTab('tab-stages')} className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer">View All &rarr;</button>
                </div>
                <div className="space-y-2.5">
                  {deptQueuesList.map((q, idx) => (
                    <div key={`queue-card-${q.name}-${idx}`} className="text-xs">
                      <div className="flex items-center justify-between mb-1 font-semibold">
                        <span className="text-slate-800">{q.name}</span>
                        <span className="font-mono font-bold text-slate-900">{q.waiting} pcs</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`${q.barColor} h-full rounded-full transition-all duration-700 ease-out`}
                          style={{ width: `${totalWaitingCount > 0 ? Math.round((q.waiting / totalWaitingCount) * 100) : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {deptQueuesList.length === 0 && (
                    <div className="py-6 text-center text-xs text-slate-400 font-semibold">No pipeline queues reported.</div>
                  )}
                </div>
              </div>
            </div>

            {/* CARD 3: QUICK REPORTS */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    Quick Reports
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  {[
                    { name: 'Daily Production', icon: FileText, desc: 'Output by line' },
                    { name: 'Department Report', icon: Building2, desc: 'Per-floor metrics' },
                    { name: 'Order Status', icon: Box, desc: 'Live fulfillment' },
                    { name: 'Employee Report', icon: Users, desc: 'Worker efficiency' },
                    { name: 'Quality Report', icon: ShieldCheck, desc: 'Rework & reject' },
                    { name: 'Delay Analysis', icon: Clock, desc: 'Bottleneck trace' },
                  ].map((rep) => {
                    const Icon = rep.icon;
                    return (
                      <button
                        key={rep.name}
                        onClick={() => setActiveReportModal(rep.name)}
                        className="p-3 rounded-2xl bg-[#f8fafc] hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 text-left transition-all cursor-pointer flex flex-col justify-between group active:scale-95"
                      >
                        <div className="flex items-center gap-2 text-indigo-600">
                          <Icon className="w-4 h-4" />
                          <span className="font-bold text-xs text-slate-900 truncate">{rep.name}</span>
                        </div>
                        <span className="text-xs text-slate-500 mt-1.5">{rep.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ─── BOTTOM SUMMARY BAR — same tile set as before; Hours Remaining and
               Required Rate are now real (derived from GET /attendance/config's real
               shift_start/shift_length_hours), Actual Rate is the real
               pieces_per_hour_today field, and EOD Forecast stays as a field but
               always N/A since no forecasting endpoint exists anywhere in the API. ─── */}
          <div className="w-full bg-slate-900 text-white rounded-2xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-4 text-xs font-semibold">
            <div className="flex items-center gap-3 pr-4 border-r border-slate-700">
              <Clock className="w-5 h-5 text-amber-400" />
              <div>
                <span className="text-xs text-slate-400 font-bold block uppercase tracking-wide">Today&apos;s Summary</span>
                <span className="font-bold text-white text-xs">{meta?.generated_for || filterDate || '—'}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-6 text-xs">
              <div>
                <span className="text-xs text-slate-400 font-bold block uppercase">Target</span>
                <span className="font-black text-white font-mono text-sm">{kpiData.targetProd !== null ? `${kpiData.targetProd} pcs` : '—'}</span>
              </div>
              <div>
                <span className="text-xs text-purple-300 font-bold block uppercase">Actual (Till Now)</span>
                <span className="font-black text-purple-300 font-mono text-sm">{kpiData.totalProd !== null ? `${kpiData.totalProd} pcs` : '—'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-bold block uppercase">Remaining Target</span>
                <span className="font-black text-white font-mono text-sm">
                  {kpiData.remainingTarget !== null ? `${kpiData.remainingTarget} pcs` : '—'}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-bold block uppercase">Hours Remaining</span>
                <span className="font-black text-white font-mono text-sm">
                  {shiftTimeInfo.hoursRemaining !== null
                    ? `${Math.floor(shiftTimeInfo.hoursRemaining)}h ${Math.round((shiftTimeInfo.hoursRemaining % 1) * 60)}m`
                    : <NotAvailableBadge label="N/A" />}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-bold block uppercase">Required Rate</span>
                <span className="font-black text-white font-mono text-sm">
                  {kpiData.requiredRate !== null ? `${kpiData.requiredRate} pcs/hr` : <NotAvailableBadge label="N/A" />}
                </span>
              </div>
              <div>
                <span className="text-xs text-rose-300 font-bold block uppercase">Actual Rate</span>
                <span className="font-black text-rose-400 font-mono text-sm">
                  {kpiData.actualRate !== null ? `${kpiData.actualRate} pcs/hr` : <NotAvailableBadge label="N/A" />}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-bold block uppercase">EOD Forecast</span>
                <span className="font-black text-amber-300 font-mono text-sm">
                  <NotAvailableBadge label="No forecasting endpoint" />
                </span>
              </div>
            </div>
          </div>

        </motion.div>
      )}

      {/* ====================================================================
           TAB: DEPARTMENTS (Department Analytics & Comprehensive Table)
           ==================================================================== */}
      {activeTab === 'tab-departments' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-6">

          {/* ─── 1. DEPARTMENT SUMMARY STATS ─── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Total Departments</span>
              <span className="text-2xl font-black text-slate-900 font-mono">{filteredDeptStageCards.length}</span>
              <span className="text-xs text-slate-500 font-semibold block mt-1">Active Pipeline Stages</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Total Completed</span>
              <span className="text-2xl font-black text-emerald-700 font-mono">
                {filteredDeptStageCards.reduce((s, d) => s + (d.completed || 0), 0).toLocaleString()} pcs
              </span>
              <span className="text-xs text-emerald-700 font-semibold block mt-1">Across Floor Stages</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Floor Queue / Waiting</span>
              <span className="text-2xl font-black text-amber-600 font-mono">
                {filteredDeptStageCards.reduce((s, d) => s + (d.pending || 0), 0).toLocaleString()} pcs
              </span>
              <span className="text-xs text-amber-700 font-semibold block mt-1">Pending Next Operation</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Current Bottleneck</span>
              <span className="text-xl font-black text-rose-600 font-mono truncate block">
                {(bottleneck?.label || bottleneck?.stage) ? formatStage(bottleneck.label || bottleneck.stage) : <NotAvailableBadge label="None reported" />}
              </span>
              <span className="text-xs text-rose-700 font-semibold block mt-1">
                {typeof bottleneck?.pending === 'number' || typeof bottleneck?.queue === 'number' ? `${bottleneck.pending ?? bottleneck.queue} pcs waiting` : 'Deepest queue in the pipeline'}
              </span>
            </div>
          </div>

          {/* ─── 2. DEPARTMENT COMPARATIVE PERFORMANCE THROUGHPUT CHART ─── */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-600" />
                  Department Throughput & Waiting Queue Comparison
                </h3>
                <p className="text-xs text-slate-500">
                  Real completed vs pending-queue counts per stage, from GET /api/v1/dashboard/direct-manager.
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500" /><span className="text-slate-700">Completed</span></span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-400" /><span className="text-slate-700">Queue / Waiting</span></span>
                <span className="flex items-center gap-1.5" title="No per-stage target exists in the backend schema"><span className="w-3 h-3 rounded-sm bg-indigo-200" /><span className="text-slate-700">Target (N/A)</span></span>
              </div>
            </div>

            <div className="h-[280px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptComparativeData} margin={{ top: 10, right: 10, left: -15, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} angle={-20} textAnchor="end" interval={0} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                  <Tooltip content={<DepartmentMiniGraphTooltip />} />
                  <Bar dataKey="Completed" fill="#10b981" radius={[4, 4, 0, 0]} isAnimationActive={true} />
                  <Bar dataKey="Queue" fill="#f59e0b" radius={[4, 4, 0, 0]} isAnimationActive={true} />
                  <Bar dataKey="Target" fill="#c7d2fe" radius={[4, 4, 0, 0]} isAnimationActive={true} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ─── 3. DETAILED DEPARTMENT DATA TABLE ─── */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Floor Departments Tabular Breakdown</h3>
                <p className="text-xs text-slate-500">
                  Real completed/pending counts per stage. No per-stage target exists in the backend schema.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-[#f8fafc] text-slate-600 font-bold uppercase tracking-wider border-y border-slate-200">
                    <th className="py-3 px-4">Stage #</th>
                    <th className="py-3 px-4">Department / Stage</th>
                    <th className="py-3 px-4 text-right">Target</th>
                    <th className="py-3 px-4 text-right">Completed</th>
                    <th className="py-3 px-4 text-right">Pending Queue</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredDeptStageCards.map((d, idx) => (
                    <tr key={`f-dept-table-${d.stageKey}-${idx}`} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-400">#{d.idx}</td>
                      <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-indigo-600" />
                        <span>{d.label}</span>
                      </td>
                      <td className="py-3 px-4 text-right"><NotAvailableBadge label="N/A" /></td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">{d.completed ?? '—'}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-amber-600">{d.pending ?? '—'}</td>
                      <td className="py-3 px-4 text-center">
                        {d.status ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              d.status === 'Bottleneck' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {d.status}
                          </span>
                        ) : <NotAvailableBadge label="N/A" />}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            setFilterDepartment(d.label);
                            setActiveTab('tab-overview');
                          }}
                          className="text-indigo-600 hover:underline font-bold text-xs cursor-pointer"
                        >
                          Filter Overview &rarr;
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredDeptStageCards.length === 0 && (
                    <tr><td colSpan={7} className="py-8 text-center text-slate-400 font-semibold">No departments match the current filter.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </motion.div>
      )}

      {/* ====================================================================
           TAB: ORDERS & STYLES (With Dedicated Fulfillment Analytics Graph)
           ==================================================================== */}
      {activeTab === 'tab-styles' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-6">
          
          {/* Order Summary KPIs — react to the universal Order/Style/Search filter */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">{filterOrder !== 'all' || filterStyle !== 'all' || searchQuery ? 'Matching Rows' : 'Active Orders'}</span>
              <span className="text-2xl font-black text-slate-900 font-mono">{filteredOrderProgress.length}</span>
              <span className="text-xs text-slate-500 font-semibold block mt-1">In Production</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Total Ordered</span>
              <span className="text-2xl font-black text-slate-900 font-mono">
                {filteredOrderProgress.reduce((s, o) => s + (o.total_ordered ?? o.total_quantity ?? 0), 0).toLocaleString()} pcs
              </span>
              <span className="text-xs text-slate-500 font-semibold block mt-1">Client Demand</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Finished Units</span>
              <span className="text-2xl font-black text-emerald-700 font-mono">
                {filteredOrderProgress.reduce((s, o) => s + (o.completed ?? 0), 0).toLocaleString()} pcs
              </span>
              <span className="text-xs text-emerald-700 font-semibold block mt-1">Ready / Shipped</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Floor Pending</span>
              <span className="text-2xl font-black text-amber-600 font-mono">
                {filteredOrderProgress.reduce((s, o) => s + (o.pending ?? 0), 0).toLocaleString()} pcs
              </span>
              <span className="text-xs text-amber-700 font-semibold block mt-1">In Pipeline</span>
            </div>
          </div>

          {/* Dedicated Style-Wise Fulfillment Graph — horizontal bars so every style
               fits (no more capping at 8), and it now actually reacts to the
               Order/Style filter and search box above instead of always showing
               the whole factory. */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Shirt className="w-5 h-5 text-indigo-600" />
                  Style-Wise Fulfillment & Production Volume Breakdown
                </h3>
                <p className="text-xs text-slate-500">
                  {filterOrder !== 'all' || filterStyle !== 'all' || searchQuery
                    ? `Showing ${stylesGraphData.length} style(s) matching the current filter.`
                    : `All ${stylesGraphData.length} styles currently in scope — pick an Order or Style above to narrow this down.`}
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-slate-300" /><span className="text-slate-700">Ordered</span></span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500" /><span className="text-slate-700">Completed</span></span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-500" /><span className="text-slate-700">Pending</span></span>
              </div>
            </div>

            <div className="w-full pt-2 max-h-[520px] overflow-y-auto">
              <div style={{ width: '100%', height: Math.max(270, stylesGraphData.length * 42) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stylesGraphData}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                    barCategoryGap={10}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={150}
                      tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={false}
                    />
                    <Tooltip content={<DepartmentMiniGraphTooltip />} />
                    <Bar dataKey="Ordered" fill="#cbd5e1" radius={[0, 4, 4, 0]} isAnimationActive={true} />
                    <Bar dataKey="Completed" fill="#10b981" radius={[0, 4, 4, 0]} isAnimationActive={true} />
                    <Bar dataKey="Pending" fill="#f59e0b" radius={[0, 4, 4, 0]} isAnimationActive={true} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {stylesGraphData.length === 0 && (
                <p className="text-center text-xs text-slate-400 font-medium py-16">No styles match the current filter.</p>
              )}
            </div>
          </div>

          {/* Table — same universal filter scope as the chart above */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Order & Style Production Funnel</h3>
              <p className="text-xs text-slate-500">Click any row to drill down into stage-by-stage counts.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-[#f8fafc] text-slate-600 font-bold uppercase tracking-wider border-y border-slate-200">
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-4">Style</th>
                    <th className="py-3 px-4 text-right">Ordered</th>
                    <th className="py-3 px-4 text-right">Completed</th>
                    <th className="py-3 px-4 text-right">Pending</th>
                    <th className="py-3 px-4 text-right">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredOrderProgress.map((o, idx) => (
                    <tr
                      key={`f-order-${o.order_number || idx}-${idx}`}
                      onClick={() => { setSelectedOrderRow(o); setSelectedStyleRow(o); setFilterOrder(o.order_number); setActiveTab('tab-overview'); }}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 font-bold text-slate-900">{o.order_number}</td>
                      <td className="py-3 px-4 text-slate-700">{o.style_name || '—'}</td>
                      <td className="py-3 px-4 text-right font-mono">{o.total_ordered ?? o.total_quantity ?? '—'}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">{o.completed ?? 0}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-amber-600">{o.pending ?? 0}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-indigo-600">{o.completion_pct ?? 0}%</td>
                    </tr>
                  ))}
                  {filteredOrderProgress.length === 0 && (
                    <tr><td colSpan={6} className="py-8 text-center text-slate-400 font-semibold">No order progress records match the current filter.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* ====================================================================
           TAB: STAGE FUNNEL (With Dedicated Funnel & Bottleneck Analytics Graph)
           ==================================================================== */}
      {activeTab === 'tab-stages' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-6">
          
          {/* Stage Funnel Graph */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Workflow className="w-5 h-5 text-indigo-600" />
                  Floor Stage WIP & Queue Flow Analytics
                </h3>
                <p className="text-xs text-slate-500">
                  Progression of garment units and in-flight queue buffers across all 10 manufacturing stages.
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-indigo-600" /><span className="text-slate-700">Completed Output</span></span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-400" /><span className="text-slate-700">Queue Buffer</span></span>
              </div>
            </div>

            <div className="h-[270px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stageFunnelGraphData} margin={{ top: 10, right: 10, left: -15, bottom: 20 }}>
                  <defs>
                    <linearGradient id="stageFlowGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="queueFlowGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="shortStage" tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                  <Tooltip content={<DepartmentMiniGraphTooltip />} />
                  <Area type="monotone" dataKey="Completed" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#stageFlowGrad)" isAnimationActive={true} />
                  <Area type="monotone" dataKey="Queue" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#queueFlowGrad)" isAnimationActive={true} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stage Cards Grid */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-extrabold text-slate-900">Floor Stage Funnel Analytics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {pipelineWithStore.map((stage, idx) => (
                <div key={`f-stage-${stage.stage || stage.label || idx}-${idx}`} className="p-4 bg-[#f8fafc] rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-slate-900 uppercase">{formatStage(stage.stage || stage.label)}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-mono">Stage #{idx + 1}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Completed: <strong className="text-emerald-700 font-mono">{readNum(stage, ['completed', 'done']) ?? 0}</strong></span>
                    <span>Queue: <strong className="text-amber-600 font-mono">{readNum(stage, ['pending', 'queue']) ?? 0}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ====================================================================
           TAB: EMPLOYEES (With Dedicated Operator Output Analytics Graph)
           ==================================================================== */}
      {activeTab === 'tab-employees' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-6">
          
          {/* Employee Headcount by Designation — real GET /employees rows */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  Workforce Headcount by Designation
                </h3>
                <p className="text-xs text-slate-500">
                  Real GET /api/v1/employees roster grouped by designation. Per-employee output isn&apos;t returned by any endpoint, so it isn&apos;t charted.
                </p>
              </div>
            </div>

            <div className="h-[270px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={employeesByDesignation} margin={{ top: 10, right: 10, left: -15, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="designation" tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<DepartmentMiniGraphTooltip />} />
                  <Bar dataKey="count" name="Headcount" fill="#9333ea" radius={[4, 4, 0, 0]} isAnimationActive={true} />
                </BarChart>
              </ResponsiveContainer>
              {employeesByDesignation.length === 0 && <p className="text-center text-xs text-slate-400 font-medium -mt-40">No employees match the current filter.</p>}
            </div>
          </div>

          {/* Employee Table */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-extrabold text-slate-900">Active Floor Employees & Capacity</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-[#f8fafc] text-slate-600 font-bold uppercase tracking-wider border-y border-slate-200">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Designation</th>
                    <th className="py-3 px-4">Wage Type</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredEmployees.map((emp, idx) => (
                    <tr key={`f-emp-${emp.id || emp.name || idx}-${idx}`} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{emp.name}</td>
                      <td className="py-3 px-4 text-slate-700">{emp.designation || 'Floor Operator'}</td>
                      <td className="py-3 px-4 text-slate-600">{emp.wage_type || 'Piece Rate'}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Active</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* ====================================================================
           TAB: PIECE TRACEABILITY (With Dedicated Hourly Flow Analytics Graph)
           ==================================================================== */}
      {activeTab === 'tab-pieces' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-6">
          
          {/* Pieces Cut Per Day by Material — real GET /dashboard/store/traceability rows,
               grouped by the real cutting_date and material_type fields. No intraday/hourly
               endpoint exists anywhere in the API, so this is a daily trend, not an hourly one. */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-indigo-600" />
                  Pieces Cut Per Day by Material
                </h3>
                <p className="text-xs text-slate-500">
                  Real traceability rows grouped by cutting_date and material_type.
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-600" /><span className="text-slate-700">Leather</span></span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500" /><span className="text-slate-700">Lining</span></span>
              </div>
            </div>

            <div className="h-[270px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={traceabilityByDate} margin={{ top: 10, right: 10, left: -15, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<DepartmentMiniGraphTooltip />} />
                  <Bar dataKey="Leather" fill="#2563eb" radius={[4, 4, 0, 0]} isAnimationActive={true} />
                  <Bar dataKey="Lining" fill="#10b981" radius={[4, 4, 0, 0]} isAnimationActive={true} />
                </BarChart>
              </ResponsiveContainer>
              {traceabilityByDate.length === 0 && <p className="text-center text-xs text-slate-400 font-medium -mt-40">No traceability rows match the current search/filters.</p>}
            </div>
          </div>

          {/* Traceability Table */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-extrabold text-slate-900">Live Garment Piece Traceability</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-[#f8fafc] text-slate-600 font-bold uppercase tracking-wider border-y border-slate-200">
                    <th className="py-3 px-4">Piece Code</th>
                    <th className="py-3 px-4">Order</th>
                    <th className="py-3 px-4">Current Stage</th>
                    <th className="py-3 px-4">Employee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredTraceability.map((p, idx) => (
                    <tr key={`f-trace-${p.piece_code || idx}-${idx}`} onClick={() => setSelectedPieceCode(p.piece_code)} className="hover:bg-slate-50 transition-colors cursor-pointer">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700">{p.piece_code}</td>
                      <td className="py-3 px-4 text-slate-800 font-semibold">{p.order_number || '—'}</td>
                      <td className="py-3 px-4 text-slate-700">{formatStage(p.stage)}</td>
                      <td className="py-3 px-4 text-slate-600">{p.employee || '—'}</td>
                    </tr>
                  ))}
                  {filteredTraceability.length === 0 && (
                    <tr><td colSpan={4} className="py-8 text-center text-slate-400 font-semibold">{traceabilityLoading ? 'Searching pieces…' : 'No pieces match query.'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* ====================================================================
           TAB: STORE DRAWER DISPATCH (With Dedicated Buffer Analytics Graph)
           ==================================================================== */}
      {activeTab === 'tab-drawers' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-6">
          
          {/* Store Drawer Buffer Graph */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Box className="w-5 h-5 text-indigo-600" />
                  Store Drawer Buffer Dynamics & Capacity
                </h3>
                <p className="text-xs text-slate-500">
                  Real-time drawer distribution between store buffer inventory and shop floor lines.
                </p>
              </div>
              <button onClick={fetchDrawers} disabled={drawersLoading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 disabled:opacity-50 cursor-pointer">
                <RefreshCw className={`w-3.5 h-3.5 ${drawersLoading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>

            <div className="h-[260px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={drawersGraphData} margin={{ top: 10, right: 10, left: -15, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                  <Tooltip content={<DepartmentMiniGraphTooltip />} />
                  <Bar dataKey="count" fill="#9333ea" radius={[6, 6, 0, 0]} isAnimationActive={true} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Drawer Grid */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-extrabold text-slate-900">Store Drawer Command & Floor Dispatch</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {filteredDrawers.map((dr, idx) => (
                <div key={`f-drw-${dr.drawer_id || dr.code || idx}-${idx}`} className="p-5 rounded-2xl border border-slate-200 bg-white hover:shadow-md transition-all space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full text-xs font-black bg-purple-100 text-purple-800">{dr.code}</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">{formatStage(dr.state)}</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">{dr.piece_code || 'Empty drawer'}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{dr.holding || '—'}</p>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      disabled={!dr.can_send}
                      onClick={() => { setSelectedDrawer(dr); setDrawerActionType('send'); setDrawerDestination('STITCHING'); setShowDrawerActionModal(true); }}
                      className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" /><span>Send</span>
                    </button>
                    <button
                      disabled={dr.state === 'received' || dr.state === 'sended'}
                      onClick={() => { setSelectedDrawer(dr); setDrawerActionType('receive'); setShowDrawerActionModal(true); }}
                      className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Inbox className="w-3.5 h-3.5" /><span>Receive</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── MODAL: QUICK REPORT VIEW / EXPORT — real numbers, real CSV per report type.
           The previous build's AI chat modal is removed: no AI backend exists anywhere
           in the API, and its canned replies were hardcoded text, not live intelligence. ─── */}
      <AnimatePresence>
        {activeReportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full text-slate-800 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  {activeReportModal}
                </h3>
                <button onClick={() => setActiveReportModal(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>
              <p className="text-xs text-slate-600">
                Export the real <strong>{activeReportModal}</strong> data currently loaded on this dashboard.
              </p>
              <div className="bg-[#f8fafc] p-4 rounded-xl border border-slate-200 text-xs font-mono space-y-1 text-slate-700">
                <div>&bull; Factory Target: {kpiData.targetProd !== null ? `${kpiData.targetProd} pcs` : 'N/A'}</div>
                <div>&bull; Factory Produced: {kpiData.totalProd !== null ? `${kpiData.totalProd} pcs` : 'N/A'}</div>
                <div>&bull; Workers Present: {kpiData.presentWorkers ?? 'N/A'}</div>
                <div>&bull; Current Bottleneck: {(bottleneck?.label || bottleneck?.stage) ? formatStage(bottleneck.label || bottleneck.stage) : 'None reported'}</div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => handleDownloadReport(activeReportModal)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs cursor-pointer flex items-center gap-1.5 shadow-md"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Report (CSV)</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── DRAWER SEND/RECEIVE CONFIRM MODAL ─── */}
      <AnimatePresence>
        {showDrawerActionModal && selectedDrawer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full border border-slate-200 space-y-4 text-slate-800">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900 uppercase">{drawerActionType === 'send' ? '📤 Send Drawer' : '📥 Receive Drawer'}</h3>
                <button onClick={() => setShowDrawerActionModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-2 text-xs font-semibold">
                <p><strong>Drawer:</strong> {selectedDrawer.code}</p>
                <p><strong>Piece:</strong> {selectedDrawer.piece_code || '—'}</p>
                <p><strong>Holding:</strong> {selectedDrawer.holding || '—'}</p>
              </div>
              {drawerActionType === 'send' && (
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase">Destination</label>
                  <select
                    value={drawerDestination}
                    onChange={(e) => setDrawerDestination(e.target.value)}
                    className="w-full mt-1 h-11 px-3 bg-[#f8fafc] border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                  >
                    <option value="STITCHING">STITCHING</option>
                    <option value="LINING">LINING</option>
                  </select>
                </div>
              )}
              <div className="pt-2 flex gap-2">
                <button onClick={() => setShowDrawerActionModal(false)} disabled={drawerActionBusy} className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-xs hover:bg-slate-50 disabled:opacity-50">Cancel</button>
                <button
                  onClick={handleConfirmDrawerAction}
                  disabled={drawerActionBusy}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {drawerActionBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirm {drawerActionType === 'send' ? 'Dispatch' : 'Receipt'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
