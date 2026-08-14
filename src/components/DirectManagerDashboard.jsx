'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Factory,
  Layers,
  AlertTriangle,
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
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
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

// Badge for fields the API doc's meta.unsupported explicitly documents as null
// (no backing table yet) — shown instead of fabricating a number.
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

// Stage/dept row shapes for `departments` and `pipeline` are referenced by name
// (DeptPerformanceRow / StagePipelineNode) in the API reference but never expanded
// with a field list — so these readers try the most likely key spellings and
// fall back to a dash rather than assuming a wrong field means "zero".
function readNum(obj, keys) {
  for (const k of keys) {
    if (obj?.[k] !== undefined && obj?.[k] !== null) return obj[k];
  }
  return null;
}

// The backend doesn't send a department field on each pipeline stage, so this
// infers one from the stage name for the department filter to narrow the
// factory-wide pipeline. Purely a UI grouping aid — never displayed as fact.
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

// Real production flow order (Cutting and Lining run in parallel right at the
// start, then feed Store before Stitching picks up) — used to sort every
// department list so Lining always sits next to Cutting instead of wherever
// the backend happened to return it.
const DEPARTMENT_DISPLAY_ORDER = ['Cutting', 'Lining', 'Store', 'Stitching', 'Quality', 'Packaging'];

function departmentSortIndex(name = '') {
  const idx = DEPARTMENT_DISPLAY_ORDER.findIndex((d) => d.toLowerCase() === String(name).toLowerCase());
  return idx === -1 ? DEPARTMENT_DISPLAY_ORDER.length : idx;
}

export default function DirectManagerDashboard() {
  const { token, user } = useAuth();

  // ── Real data state ──
  const [dashboardData, setDashboardData] = useState(null);
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

  // ── LIVE BACKEND CALL: GET /api/v1/dashboard/direct-manager + GET /api/v1/employees ──
  const fetchDashboard = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setApiError(null);
      const [dmRes, empRes] = await Promise.allSettled([
        apiGetDirectManagerDashboard(token),
        apiGetEmployees(token),
      ]);

      if (dmRes.status === 'fulfilled' && dmRes.value) {
        setDashboardData(dmRes.value);
      } else if (dmRes.status === 'rejected') {
        setApiError(dmRes.reason?.message || 'Failed to fetch Direct Manager API');
      }

      if (empRes.status === 'fulfilled' && Array.isArray(empRes.value)) {
        setRealEmployees(empRes.value);
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
        if (isMounted) setOrderDetailData(data);
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
        if (isMounted) setStyleDetailData(data);
      } catch (err) {
        console.warn('Style detail fetch notice:', err.message);
      } finally {
        if (isMounted) setLoadingStyleDetail(false);
      }
    })();
    return () => { isMounted = false; };
  }, [selectedStyleRow, token]);

  // ── Real backend structures (GET /api/v1/dashboard/direct-manager) ──
  const meta = dashboardData?.meta || null;
  const overall = dashboardData?.overall || {};
  const productionRate = dashboardData?.production_rate || {};
  const qualityStats = dashboardData?.quality || {};
  const attendanceStats = dashboardData?.attendance || {};
  const storeStats = useMemo(() => dashboardData?.store || {}, [dashboardData]);
  const bottleneck = dashboardData?.bottleneck || null;
  const departmentsList = useMemo(() => dashboardData?.departments || [], [dashboardData]);
  const pipelineList = useMemo(() => dashboardData?.pipeline || [], [dashboardData]);
  const orderProgressList = useMemo(() => dashboardData?.order_progress || [], [dashboardData]);
  const dailyProductionLogs = useMemo(() => dashboardData?.daily_production || [], [dashboardData]);

  const roleLabel = useMemo(() => {
    if (user === 'managing_director') return 'MANAGING DIRECTOR';
    if (user === 'hr') return 'HUMAN RESOURCES (HR)';
    return 'DIRECT MANAGER';
  }, [user]);

  // ── Filter option sources — all real ──
  const availableDatesList = useMemo(
    () => Array.from(new Set(dailyProductionLogs.map((l) => l.work_date).filter(Boolean))),
    [dailyProductionLogs]
  );

  const availableStyles = useMemo(
    () => Array.from(new Set(orderProgressList.map((o) => o.style_name).filter(Boolean))),
    [orderProgressList]
  );

  // ── Filtered views — every one of these reacts to the universal filter bar ──
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

  const filteredDailyProduction = useMemo(() => {
    if (filterDate === 'all') return dailyProductionLogs;
    return dailyProductionLogs.filter((d) => d.work_date === filterDate);
  }, [dailyProductionLogs, filterDate]);

  // The API doc never expanded DeptPerformanceRow's field list, so `.department`
  // is a guess. If every row comes back with no usable name, that guess is
  // wrong rather than the backend being empty — surfaced explicitly below
  // instead of silently rendering blank rows.
  const departmentNamesConfirmed = departmentsList.length > 0 && departmentsList.some((d) => d.department);

  // Department filter OPTIONS and MATCHING both derive from real stage names
  // (confirmed strings like "LEATHER_CUTTING", "FUSING") via the inferDepartment
  // heuristic, not from the unconfirmed `department` field — so the filter is
  // guaranteed to actually match something regardless of that field's real name.
  // Sorted into real production-flow order so Lining sits next to Cutting.
  const departmentOptions = useMemo(
    () => Array.from(new Set(pipelineList.map((p) => inferDepartment(p.stage || p.label))))
      .sort((a, b) => departmentSortIndex(a) - departmentSortIndex(b)),
    [pipelineList]
  );

  // Departments as actually returned by the backend, reordered to match real
  // production flow (Cutting, Lining, Store, Stitching, Quality, Packaging)
  // instead of whatever order the API happened to return them in.
  const sortedDepartments = useMemo(
    () => [...departmentsList].sort((a, b) => departmentSortIndex(a.department) - departmentSortIndex(b.department)),
    [departmentsList]
  );

  const filteredDepartments = useMemo(() => {
    if (filterDepartment === 'all' || !departmentNamesConfirmed) return sortedDepartments;
    return sortedDepartments.filter((d) => (d.department || d.name) === filterDepartment);
  }, [sortedDepartments, filterDepartment, departmentNamesConfirmed]);

  // ── Order/Style filter → real drill-down data ──────────────────────────
  // The Order/Style select doesn't just narrow a table: when it picks a
  // specific order or style, the whole top-of-page pipeline and headline KPIs
  // switch from the factory-wide snapshot to that order's/style's REAL
  // GET /dashboard/direct-manager/{orders,styles}/{id} response.
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
    // Style is the more specific pick when both are set.
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

  // Real per-stage numbers for the selected order/style (OrderStageRow /
  // StyleStageRow field names are undocumented, so this reads the same
  // candidate keys used in the drill-down table further down the page).
  // The department filter applies here too — even while drilled into one
  // order/style, picking a department narrows THAT order's own stage list.
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

  // Real order-level constraint (styles don't carry blocked_stage).
  const effectiveBlockedStage = selectedOrderRow ? orderDetailData?.blocked_stage : null;

  // The real Lining department row (confirmed to exist in departmentsList),
  // used to inject a real Lining card next to Cutting — see pipelineWithStore.
  const liningDepartmentRow = useMemo(
    () => departmentsList.find((d) => /LINING/i.test(d.department || d.name || '')) || null,
    [departmentsList]
  );
  const hasLiningStage = pipelineList.some((st) => /LINING/i.test(st.stage || st.label || ''));

  // Neither the factory-wide `pipeline[]` nor an order's/style's `stages[]`
  // ever includes a "Store" node, and Lining doesn't appear in `pipeline[]`
  // either — both are real backend facts (Store is a DRAWER STATE, not a
  // logged stage; this scope has no LINING_CUTTING events yet). But their
  // real totals DO exist elsewhere on this same dashboard call: Store under
  // `store: {drawers_in_store, drawers_sent, drawers_received}`, Lining under
  // its own row in `departments[]`. This splices both in as real data —
  // Lining right after Cutting, Store right before Stitching — rather than
  // either hiding them or inventing numbers for a stage-shaped card.
  const pipelineWithStore = useMemo(() => {
    if (isDrillDownActive) return effectivePipeline; // store/department stats are factory-wide, not per-order — don't splice them into a single order's view
    let cards = [...effectivePipeline];

    if (!hasLiningStage) {
      // Reserve Lining's slot next to Cutting even when there's nothing to
      // show yet — real numbers when the department row exists, an honest
      // empty placeholder (not zeros) when it doesn't, instead of the card
      // just vanishing from the sequence.
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

  // Real headline numbers scoped to the filtered order/style instead of the
  // whole factory, sourced from order_progress + the drill-down endpoint.
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

  // ── CSV Export — real pipeline/order_progress data ──
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

  // ── Real drawer actions: POST /api/v1/drawers/send, POST /api/v1/drawers/{id}/receive ──
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

  return (
    <div className="w-full min-w-0 space-y-6 pb-12 font-sans text-slate-800">

      {/* ─── TOAST ─── */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 bg-[#0f172a] border border-slate-700 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold font-mono max-w-md"
          >
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── HEADER ─── */}
      <header className="w-full bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#334155] text-white p-6 rounded-3xl shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border border-slate-700/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              {roleLabel} &bull; EXECUTIVE COMMAND
            </span>
            {meta?.generated_for && (
              <span className="text-slate-400 text-xs font-semibold">Generated {meta.generated_for} &bull; scope: {meta.scope}</span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Factory className="w-8 h-8 text-amber-400" />
            Shop Floor Master Flow & Deep Drill-Down
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl font-medium">
            Real-time shop floor intelligence from GET /api/v1/dashboard/direct-manager, live drawer state and store traceability.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
          <button
            onClick={fetchDashboard}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-bold text-white transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Live API</span>
          </button>
          <button
            onClick={handleExportFactoryReport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Factory CSV</span>
          </button>
        </div>
      </header>

      {apiError && (
        <div className="w-full bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold p-4 rounded-2xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Direct Manager API error: {apiError}</span>
        </div>
      )}

      {/* ─── 1. MASTER PIPELINE ─── */}
      <section className="w-full bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Workflow className="w-4 h-4 text-indigo-600" />
              {isDrillDownActive
                ? `Pipeline — ${selectedStyleRow?.style_name || selectedOrderRow?.order_number}`
                : 'Master Factory Production Pipeline'}
            </h2>
            <p className="text-xs text-slate-500">
              {isDrillDownActive
                ? `Real per-stage counts for this ${selectedStyleRow ? 'style' : 'order'}, from GET /dashboard/direct-manager/${selectedStyleRow ? 'styles' : 'orders'}/{id}.`
                : 'Live funnel stages from GET /api/v1/dashboard/direct-manager — pending = queue in front of that stage.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isDrillDownLoading && <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…</span>}
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" /> {isDrillDownActive ? 'Blocked stage' : 'Bottleneck (deepest queue)'}
            </span>
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
                key={`${stageKey}-${idx}`}
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

      {/* ─── 2. UNIVERSAL FILTER BAR ─── */}
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
              {availableDatesList.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div>
            <select
              value={filterOrder}
              onChange={(e) => setFilterOrder(e.target.value)}
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-600"
            >
              <option value="all">📦 All Orders</option>
              {Array.from(new Set(orderProgressList.map((o) => o.order_number).filter(Boolean))).map((n) => (
                <option key={n} value={n}>{n}</option>
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
              {availableStyles.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-600"
            >
              <option value="all">🏢 All Departments</option>
              {departmentOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
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
                <option key={`${emp.id || emp.name}-${idx}`} value={emp.name}>{emp.name} ({emp.designation || 'Floor'})</option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5" />
          Orders/Styles, Daily Output, Piece Traceability and Employees are computed live from these filters. Departments and Stage Funnel are pre-aggregated snapshots from the backend (no per-event log to slice) — the department filter narrows which rows are shown, not the totals themselves.
        </p>
      </section>

      {/* ─── 3. TABS ─── */}
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
           TAB: FACTORY OVERVIEW
           ==================================================================== */}
      {activeTab === 'tab-overview' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-6">
          {isDrillDownActive && (
            <div className="w-full bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold p-3 rounded-2xl flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0" />
              <span>
                Orders/Target/Produced/Pending below are scoped to {selectedStyleRow?.style_name || selectedOrderRow?.order_number} (real order_progress + drill-down data).
                Today&apos;s Output, Rework Queue, Quality and Production Velocity stay factory-wide — the backend has no per-order breakdown for those.
              </span>
            </div>
          )}

          <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{isDrillDownActive ? 'Filtered To' : 'Orders'}</span>
              {isDrillDownActive ? (
                <>
                  <div className="text-lg font-black text-slate-900 mt-1 truncate">{selectedOrderRow?.order_number || filterMatchedRow?.order_number}</div>
                  <div className="text-[11px] text-slate-500 font-semibold mt-1 truncate">{selectedStyleRow?.style_name || 'All styles in order'}</div>
                </>
              ) : (
                <>
                  <div className="text-2xl font-black text-slate-900 mt-1">{(overall.orders_in_progress ?? 0) + (overall.orders_completed ?? 0)}</div>
                  <div className="text-[11px] text-slate-500 font-semibold mt-1 flex justify-between">
                    <span>Active: <strong className="text-blue-600">{overall.orders_in_progress ?? 0}</strong></span>
                    <span>Done: <strong className="text-emerald-600">{overall.orders_completed ?? 0}</strong></span>
                  </div>
                </>
              )}
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{isDrillDownActive ? 'Order/Style Qty' : 'Target Pieces'}</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{effectiveTargetPieces.toLocaleString()}</div>
              <div className="text-[11px] text-indigo-600 font-bold mt-1">{effectiveAchievementPct}% Target Met</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Produced</span>
              <div className="text-2xl font-black text-emerald-700 mt-1">{effectiveProduced.toLocaleString()}</div>
              <div className="text-[11px] text-slate-500 font-semibold mt-1">{isDrillDownActive ? 'For this filter' : 'Pass through factory'}</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Pending</span>
              <div className="text-2xl font-black text-amber-600 mt-1">{effectivePending.toLocaleString()}</div>
              <div className="text-[11px] text-slate-500 font-semibold mt-1">{isDrillDownActive ? 'For this filter' : 'Active in pipeline'}</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Today&apos;s Output</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{attendanceStats.production_today ?? 0} pcs</div>
              <div className="text-[11px] text-emerald-600 font-bold mt-1">{attendanceStats.active_employees ?? 0} active workers</div>
              {isDrillDownActive && <div className="text-[10px] text-slate-400 font-semibold mt-1">Factory-wide</div>}
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Rework Queue</span>
              <div className="text-2xl font-black text-purple-700 mt-1">{qualityStats.rework_pieces ?? 0} pcs</div>
              <div className="text-[11px] text-purple-600 font-semibold mt-1">{qualityStats.inspected ?? 0} inspected total</div>
              {isDrillDownActive && <div className="text-[10px] text-slate-400 font-semibold mt-1">Factory-wide</div>}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Quality — real fields honest about what's null */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Quality
              </h3>
              <p className="text-xs text-slate-500 mb-4">produced / inspected / rework are real; accepted, rejected and defect % need a quality table</p>
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="bg-[#f8fafc] p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Produced</span>
                  <div className="text-lg font-black text-slate-900">{qualityStats.produced ?? 0}</div>
                </div>
                <div className="bg-[#f8fafc] p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Inspected</span>
                  <div className="text-lg font-black text-slate-900">{qualityStats.inspected ?? 0}</div>
                </div>
                <div className="bg-[#f8fafc] p-2.5 rounded-xl border border-slate-100 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Accepted</span>
                  {typeof qualityStats.accepted === 'number' ? <div className="text-lg font-black text-slate-900">{qualityStats.accepted}</div> : <NotAvailableBadge />}
                </div>
                <div className="bg-[#f8fafc] p-2.5 rounded-xl border border-slate-100 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Rejected</span>
                  {typeof qualityStats.rejected === 'number' ? <div className="text-lg font-black text-slate-900">{qualityStats.rejected}</div> : <NotAvailableBadge />}
                </div>
              </div>
            </div>

            {/* Production Velocity — real fields honest about what's null */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" /> Production Velocity
              </h3>
              <p className="text-xs text-slate-500 mb-4">Throughput cadence across active shop floor shifts</p>
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="bg-[#f8fafc] p-3 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Pieces / Day</span>
                  <div className="text-xl font-black text-slate-900 mt-0.5">{productionRate.pieces_per_day ?? 0}</div>
                </div>
                <div className="bg-[#f8fafc] p-3 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Pcs / Employee Today</span>
                  <div className="text-xl font-black text-slate-900 mt-0.5">{productionRate.pieces_per_employee_today ?? 0}</div>
                </div>
                <div className="bg-[#f8fafc] p-3 rounded-2xl border border-slate-100 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Pieces / Hour Today</span>
                  {typeof productionRate.pieces_per_hour_today === 'number' ? <div className="text-xl font-black text-slate-900 mt-0.5">{productionRate.pieces_per_hour_today}</div> : <NotAvailableBadge />}
                </div>
                <div className="bg-[#f8fafc] p-3 rounded-2xl border border-slate-100 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Per-Piece Rate</span>
                  {typeof productionRate.per_piece_rate === 'number' ? <div className="text-sm font-black text-slate-700 mt-1">{productionRate.per_piece_rate}</div> : <NotAvailableBadge />}
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 font-semibold flex justify-between">
                <span>Present: <strong>{attendanceStats.employees_present ?? 0}</strong></span>
                <span>Assigned: <strong>{attendanceStats.employees_assigned ?? 0}</strong></span>
              </div>
            </div>

            {/* Store buffer — real fields */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-2">
                <Boxes className="w-4 h-4 text-purple-600" /> Central Store & Drawer Buffer
              </h3>
              <p className="text-xs text-slate-500 mb-4">Material handoff between Cutting/Lining and Stitching</p>
              <div className="space-y-2.5 text-xs font-semibold">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-purple-50 text-purple-900 border border-purple-100">
                  <span>Drawers In Store:</span>
                  <span className="font-black text-sm">{storeStats.drawers_in_store ?? 0}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50 text-blue-900 border border-blue-100">
                  <span>Drawers Sent:</span>
                  <span className="font-black text-sm">{storeStats.drawers_sent ?? 0}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-100">
                  <span>Drawers Received:</span>
                  <span className="font-black text-sm">{storeStats.drawers_received ?? 0}</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex justify-end">
                <button onClick={() => setActiveTab('tab-drawers')} className="text-purple-700 font-bold hover:underline text-xs">Manage Drawers &rarr;</button>
              </div>
            </div>
          </div>

          {/* Real daily output chart, filterable by date */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <div className="mb-4">
                <h3 className="text-sm font-extrabold text-slate-900">Daily Factory Output (filtered)</h3>
                <p className="text-xs text-slate-500">Completed vs assigned pieces per day — real daily_production rows</p>
              </div>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredDailyProduction}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="work_date" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip content={<CustomChartTooltip unit="pcs" />} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    <Bar dataKey="completed" name="Completed Pcs" fill="#0f172a" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="assigned" name="Assigned Pcs" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {filteredDailyProduction.length === 0 && <p className="text-center text-xs text-slate-400 font-medium py-4">No daily production rows match the current filter.</p>}
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 mb-1">Department Achievement</h3>
                <p className="text-xs text-slate-500 mb-4">Real-time target completion % per floor</p>
                <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                  {filteredDepartments.map((d, i) => {
                    const achievement = readNum(d, ['achievement_pct', 'completion_pct']);
                    return (
                      <div
                        key={`${d.department}-${i}`}
                        onClick={() => { setSelectedDepartment(d); setActiveTab('tab-departments'); }}
                        className="p-2.5 rounded-xl bg-[#f8fafc] border border-slate-100 hover:border-slate-300 transition-all cursor-pointer text-xs"
                      >
                        <div className="flex justify-between items-center font-bold text-slate-800">
                          <span>{d.department}</span>
                          <span className="text-indigo-600 font-mono font-black">{achievement ?? '—'}%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1.5">
                          <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${Math.min(100, achievement || 0)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  {filteredDepartments.length === 0 && <div className="py-8 text-center text-xs text-slate-400 font-semibold">No department data available</div>}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ====================================================================
           TAB: DEPARTMENTS
           ==================================================================== */}
      {activeTab === 'tab-departments' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Factory Departments Performance</h3>
              <p className="text-xs text-slate-500">
                Garment units counted once per department, however many of its stages it passed. Fields not explicitly documented for this row type are shown as best-effort matches from the backend.
              </p>
              {!departmentNamesConfirmed && departmentsList.length > 0 && (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mt-2 font-semibold flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  {departmentsList.length} row(s) came back from the backend, but none had a value under the field name this page guessed (<code className="font-mono">department</code>). The numbers below may be reading the wrong column — paste a real sample of one <code className="font-mono">departments[]</code> row and this gets fixed precisely instead of guessed at.
                </p>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-[#f8fafc] text-slate-600 font-bold uppercase tracking-wider border-y border-slate-200">
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4 text-right">Completed</th>
                    <th className="py-3 px-4 text-right">Pending Queue</th>
                    <th className="py-3 px-4 text-right">Achievement %</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredDepartments.map((d, idx) => {
                    const completed = readNum(d, ['completed', 'total_produced', 'done']);
                    const pending = readNum(d, ['pending', 'total_pending', 'queue']);
                    const achievement = readNum(d, ['achievement_pct', 'completion_pct']);
                    const isSelected = selectedDepartment?.department === d.department;
                    return (
                      <tr
                        key={`${d.department}-${idx}`}
                        className={`hover:bg-slate-50/80 transition-all cursor-pointer ${isSelected ? 'bg-indigo-50/70 ring-1 ring-inset ring-indigo-200' : ''}`}
                        onClick={() => setSelectedDepartment(isSelected ? null : d)}
                      >
                        <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-indigo-600 ring-2 ring-indigo-200' : 'bg-indigo-600'}`} />
                          <span>{d.department}</span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-emerald-700 font-bold">{completed ?? '—'}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold">
                          <span className={(pending || 0) > 200 ? 'text-amber-600 font-black' : 'text-slate-700'}>{pending ?? '—'}</span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-black text-indigo-700">{achievement ?? '—'}%</td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedDepartment(d); setActiveTab('tab-styles'); }}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px]"
                          >
                            View Orders &rarr;
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredDepartments.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-8 text-slate-400 font-semibold">No department metrics recorded in backend.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* ====================================================================
           TAB: ORDERS & STYLES (real order_progress, real drill-down)
           ==================================================================== */}
      {activeTab === 'tab-styles' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Order & Style Production Journeys</h3>
              <p className="text-xs text-slate-500">Real order_progress rows. Click a card to load its full stage breakdown from the backend.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredOrderProgress.map((ord, idx) => (
                <div
                  key={`${ord.order_id}-${ord.style_id}-${idx}`}
                  onClick={() => {
                    // Drive the same filter state the dropdowns use, so the
                    // top-of-page pipeline/KPIs switch into drill-down mode too.
                    setFilterOrder(ord.order_number || 'all');
                    setFilterStyle(ord.style_name || 'all');
                  }}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer space-y-3 ${
                    selectedStyleRow?.style_id === ord.style_id ? 'border-indigo-600 bg-indigo-50/50 shadow-md ring-2 ring-indigo-500/20' : 'border-slate-200 bg-white hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800">{ord.order_number}</span>
                      <h4 className="text-base font-black text-slate-900 mt-1">{ord.style_name || 'Style'}</h4>
                      <span className="text-[11px] text-slate-400 font-semibold">{ord.article || '—'}</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700">
                      {ord.delay_status ? ord.delay_status.replace(/_/g, ' ') : 'NO DEADLINE'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs py-2 border-y border-slate-100 font-semibold">
                    <div><span className="text-[10px] text-slate-400 uppercase">Ordered</span><p className="font-bold text-slate-800 font-mono">{ord.total_ordered ?? 0}</p></div>
                    <div><span className="text-[10px] text-slate-400 uppercase">Minted</span><p className="font-bold text-slate-700 font-mono">{ord.minted ?? 0}</p></div>
                    <div><span className="text-[10px] text-slate-400 uppercase">Done</span><p className="font-bold text-emerald-700 font-mono">{ord.completed ?? 0}</p></div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-slate-600">Pending: <strong className="text-amber-600">{ord.pending ?? 0}</strong></span>
                      <span className="text-indigo-600 font-mono">{ord.completion_pct ?? 0}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full rounded-full transition-all" style={{ width: `${Math.min(100, ord.completion_pct || 0)}%` }} />
                    </div>
                  </div>
                </div>
              ))}
              {filteredOrderProgress.length === 0 && <div className="col-span-full py-8 text-center text-xs text-slate-400 font-semibold">No orders match the selected filters.</div>}
            </div>
          </div>

          {/* Real order/style drill-down panel */}
          {(selectedOrderRow || selectedStyleRow) && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-extrabold text-slate-900">
                  Stage Breakdown — {selectedStyleRow?.style_name} ({selectedOrderRow?.order_number})
                </h4>
                <button
                  onClick={() => { setFilterOrder('all'); setFilterStyle('all'); }}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {(loadingOrderDetail || loadingStyleDetail) && <p className="text-xs text-slate-400 font-semibold py-6 text-center">Loading drill-down from backend…</p>}

              {orderDetailData && !loadingOrderDetail && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-semibold">
                  <div className="bg-[#f8fafc] p-3 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase">Total Qty</span>
                    <div className="text-lg font-black text-slate-900">{orderDetailData.total_quantity ?? 0}</div>
                  </div>
                  <div className="bg-[#f8fafc] p-3 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase">Completion</span>
                    <div className="text-lg font-black text-indigo-700">{orderDetailData.completion_pct ?? 0}%</div>
                  </div>
                  <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 col-span-2">
                    <span className="text-[10px] text-amber-600 uppercase font-bold">Real Blocked Stage</span>
                    <div className="text-sm font-black text-amber-800">{orderDetailData.blocked_stage ? formatStage(orderDetailData.blocked_stage) : 'Not blocked'}</div>
                  </div>
                </div>
              )}

              {(orderDetailData?.stages?.length > 0 || styleDetailData?.stages?.length > 0) && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-[#f8fafc] text-slate-600 font-bold uppercase tracking-wider border-y border-slate-200">
                        <th className="py-2.5 px-3">Stage</th>
                        <th className="py-2.5 px-3 text-right">Completed</th>
                        <th className="py-2.5 px-3 text-right">Pending</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(orderDetailData?.stages || styleDetailData?.stages || []).map((s, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-bold text-slate-900">{formatStage(s.stage || s.label || s.name)}</td>
                          <td className="py-2 px-3 text-right font-mono text-emerald-700 font-bold">{readNum(s, ['completed', 'done']) ?? '—'}</td>
                          <td className="py-2 px-3 text-right font-mono text-amber-700 font-bold">{readNum(s, ['pending', 'queue', 'remaining']) ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* ====================================================================
           TAB: STAGE FUNNEL
           ==================================================================== */}
      {activeTab === 'tab-stages' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                {isDrillDownActive ? `Stage Funnel — ${selectedStyleRow?.style_name || selectedOrderRow?.order_number}` : 'Stage-Wise Production & Queue Funnel'}
              </h3>
              <p className="text-xs text-slate-500">
                {isDrillDownActive
                  ? 'Real per-stage counts for this order/style — same drill-down data as the top pipeline row.'
                  : 'Real pipeline stages, narrowed by the department filter. Bottleneck = the deepest queue, not merely the first unfinished stage.'}
              </p>
            </div>

            {/* Real bar chart — reacts to the department filter and to any order/style drill-down, exactly like the top pipeline row and the table below. */}
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineWithStore}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip content={<CustomChartTooltip unit="pcs" />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Bar dataKey="completed" name="Completed" fill="#0f172a" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="pending" name="Pending Queue" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {pipelineWithStore.length === 0 && <p className="text-center text-xs text-slate-400 font-medium">No stage data available.</p>}

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-[#f8fafc] text-slate-600 font-bold uppercase tracking-wider border-y border-slate-200">
                    <th className="py-3 px-4">Stage</th>
                    <th className="py-3 px-4 text-right">Completed</th>
                    <th className="py-3 px-4 text-right">Pending Queue</th>
                    <th className="py-3 px-4 text-center">Constraint Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {pipelineWithStore.map((st, idx) => {
                    const stageKey = st.stage || st.label;
                    const isOverlay = st.isStoreOverlay || st.isDepartmentOverlay;
                    const isBottleneck = !isOverlay && (isDrillDownActive
                      ? effectiveBlockedStage === stageKey
                      : (bottleneck?.stage === stageKey || bottleneck?.label === st.label));
                    return (
                      <tr key={`${stageKey}-${idx}`} className={`hover:bg-slate-50 transition-all ${isBottleneck ? 'bg-amber-50/40' : ''} ${st.isStoreOverlay ? 'bg-purple-50/30' : ''} ${st.isDepartmentOverlay && !st.isUnavailable ? 'bg-teal-50/30' : ''} ${st.isUnavailable ? 'bg-slate-50/60' : ''}`}>
                        <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                          <span className="font-mono text-slate-400 text-[10px]">{st.isUnavailable ? 'N/A' : st.isStoreOverlay ? 'BUF' : st.isDepartmentOverlay ? 'DEPT' : `#${idx + 1}`}</span>
                          <span className={st.isUnavailable ? 'text-slate-400' : ''}>{st.label || stageKey}</span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-emerald-700 font-bold">{st.isUnavailable ? '—' : (readNum(st, ['completed', 'done']) ?? '—')}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-600">{st.isUnavailable ? '—' : (readNum(st, ['pending', 'queue']) ?? '—')}</td>
                        <td className="py-3.5 px-4 text-center">
                          {st.isUnavailable ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-500">No data yet</span>
                          ) : st.isStoreOverlay ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">Drawer buffer</span>
                          ) : st.isDepartmentOverlay ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800">Department total</span>
                          ) : (
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${isBottleneck ? 'bg-amber-100 text-amber-800 font-black animate-pulse' : 'bg-emerald-100 text-emerald-800'}`}>
                              {isBottleneck ? (isDrillDownActive ? '⚠️ Blocked' : '⚠️ Bottleneck') : 'Optimal'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {pipelineWithStore.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-slate-400 font-semibold">No stage data available.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* ====================================================================
           TAB: EMPLOYEES (real GET /api/v1/employees)
           ==================================================================== */}
      {activeTab === 'tab-employees' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Shop Floor Workforce Roster</h3>
              <p className="text-xs text-slate-500">Real GET /api/v1/employees — designation, wage type and active barcode status.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEmployees.map((emp, i) => (
                <div
                  key={`${emp.id || emp.name}-${i}`}
                  onClick={() => {
                    // Jump to that cutter's real traceability rows (GET /dashboard/store/traceability
                    // is filtered by employee name client-side once loaded).
                    setSelectedEmployee(emp);
                    setFilterEmployee(emp.name);
                    setActiveTab('tab-pieces');
                    triggerToast(`Filtering Piece Traceability to ${emp.name}`);
                  }}
                  className={`p-5 rounded-2xl border transition-all space-y-3 cursor-pointer ${
                    selectedEmployee?.id === emp.id ? 'border-indigo-600 bg-indigo-50/50 shadow-md ring-2 ring-indigo-500/20' : 'border-slate-200 bg-white hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0f172a] to-[#334155] text-white flex items-center justify-center font-bold text-sm">
                        {initials(emp.name)}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900">{emp.name}</h4>
                        <span className="text-[10px] text-slate-400 font-mono font-bold">{emp.designation || 'Floor Worker'}</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800">{emp.wage_type || '—'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-100 font-semibold">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase">Status</span>
                      <p className={`font-bold ${emp.is_active ? 'text-emerald-700' : 'text-slate-400'}`}>{emp.is_active ? 'Active' : 'Deactivated'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase">Barcode</span>
                      <p className="font-bold text-slate-800 font-mono">{emp.employee_barcode || '—'}</p>
                    </div>
                  </div>
                </div>
              ))}
              {filteredEmployees.length === 0 && <div className="col-span-full py-8 text-center text-xs text-slate-400 font-semibold">No employee roster found.</div>}
            </div>
          </div>
        </motion.div>
      )}

      {/* ====================================================================
           TAB: PIECE TRACEABILITY (real GET /dashboard/store/traceability)
           ==================================================================== */}
      {activeTab === 'tab-pieces' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Piece-Level Cutter Traceability</h3>
              <p className="text-xs text-slate-500">Real GET /api/v1/dashboard/store/traceability — who cut the leather or lining for each piece, and which drawer holds it.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 border border-slate-200 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-extrabold uppercase text-slate-400">Traceability Rows ({filteredTraceability.length})</h4>
                <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                  {traceabilityLoading && <p className="text-xs text-slate-400 text-center py-4">Loading…</p>}
                  {!traceabilityLoading && filteredTraceability.map((p, idx) => (
                    <div
                      key={`${p.piece_code}-${idx}`}
                      onClick={() => { setSelectedPieceCode(p.piece_code); triggerToast(`Loading history for ${p.piece_code}`); }}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                        selectedPieceCode === p.piece_code ? 'border-indigo-600 bg-indigo-50 shadow-sm ring-2 ring-indigo-500/20' : 'border-slate-100 bg-[#f8fafc] hover:border-slate-300'
                      }`}
                    >
                      <span className="font-mono font-bold text-slate-900 block truncate">{p.piece_code}</span>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                        <span>{p.style || 'Style'}</span>
                        <span className="font-bold text-indigo-700">{p.material_type}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                        <span>{p.employee || 'Unknown cutter'}</span>
                        <span>{p.cutting_date || '—'}</span>
                      </div>
                    </div>
                  ))}
                  {!traceabilityLoading && filteredTraceability.length === 0 && <div className="py-8 text-center text-xs text-slate-400 font-semibold">No traceability rows found.</div>}
                </div>
              </div>

              <div className="lg:col-span-2 border border-slate-200 rounded-2xl p-5 space-y-5">
                {selectedPieceCode ? (
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Live Piece History</span>
                        <h4 className="text-sm font-mono font-black text-slate-900">{selectedPieceCode}</h4>
                        {pieceDetailData && (
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {pieceDetailData.style} &bull; {pieceDetailData.order_number} &bull; {pieceDetailData.colour} / {pieceDetailData.size}
                          </p>
                        )}
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800">
                        {pieceDetailData?.display_stage ? formatStage(pieceDetailData.display_stage) : 'Active'}
                      </span>
                    </div>

                    {pieceDetailData?.in_store && (
                      <div className="mb-4 p-3 rounded-xl bg-purple-50 border border-purple-100 text-xs font-semibold text-purple-800">
                        📦 Currently in store: {pieceDetailData.store_label || pieceDetailData.drawer_code}
                      </div>
                    )}

                    <h5 className="text-xs font-extrabold uppercase text-slate-700 mb-3">Stage-by-Stage Scan History</h5>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="bg-[#f8fafc] text-slate-600 font-bold uppercase tracking-wider border-y border-slate-200">
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Stage</th>
                            <th className="py-2.5 px-3">Employee</th>
                            <th className="py-2.5 px-3 text-right">Consumption</th>
                            <th className="py-2.5 px-3">Lot</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {pieceDetailData?.history?.map((h, i) => (
                            <tr key={i} className={`hover:bg-slate-50 ${h.is_store_overlay ? 'bg-purple-50/40' : ''}`}>
                              <td className="py-2.5 px-3 font-mono text-slate-600">{h.work_date || '—'}</td>
                              <td className="py-2.5 px-3 font-bold text-slate-900">
                                {h.label || formatStage(h.stage)}
                                {h.is_store_overlay && <span className="ml-1.5 text-[9px] font-black text-purple-600 uppercase">Store</span>}
                              </td>
                              <td className="py-2.5 px-3 text-slate-700">{h.employee || (h.is_store_overlay ? h.store_status : '—')}</td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-700">{typeof h.consumption === 'number' ? h.consumption : '—'}</td>
                              <td className="py-2.5 px-3 text-slate-500">{h.lot_article ? `${h.lot_article}${h.lot_colour ? ` · ${h.lot_colour}` : ''}` : '—'}</td>
                            </tr>
                          ))}
                          {(!pieceDetailData?.history || pieceDetailData.history.length === 0) && (
                            <tr><td colSpan={5} className="py-6 text-center text-slate-400 font-semibold">{loadingPieceDetail ? 'Fetching piece history…' : 'No transaction logs found for this piece.'}</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="py-16 text-center text-slate-400 font-medium text-xs">Select a piece on the left to view its complete journey.</div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ====================================================================
           TAB: STORE DRAWER DISPATCH (real GET /drawers + POST /drawers/send + POST /drawers/{id}/receive)
           ==================================================================== */}
      {activeTab === 'tab-drawers' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Store Drawer Command & Floor Dispatch</h3>
                <p className="text-xs text-slate-500">Real GET /api/v1/drawers. Send releases a drawer&apos;s pieces into Stitching or Lining; Receive is now mostly automatic (deprecated fallback for leather-only pieces).</p>
              </div>
              <button onClick={fetchDrawers} disabled={drawersLoading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 disabled:opacity-50">
                <RefreshCw className={`w-3.5 h-3.5 ${drawersLoading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {filteredDrawers.map((dr, idx) => (
                <div key={`${dr.drawer_id || idx}`} className="p-5 rounded-2xl border border-slate-200 bg-white hover:shadow-md transition-all space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full text-xs font-black bg-purple-100 text-purple-800">{dr.code}</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">{formatStage(dr.state)}</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">{dr.piece_code || 'Empty drawer'}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{dr.holding || '—'}</p>
                  </div>
                  <div className="bg-[#f8fafc] p-3 rounded-xl border border-slate-100 text-xs font-semibold space-y-1">
                    <div className="flex justify-between"><span className="text-slate-500">Leather In:</span><span className="font-bold text-slate-900">{dr.leather_in ? 'Yes' : 'No'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Lining In:</span><span className="font-bold text-slate-900">{dr.lining_in ? 'Yes' : 'No'}</span></div>
                    {dr.sent_to && <div className="flex justify-between"><span className="text-slate-500">Sent To:</span><span className="font-bold text-indigo-700">{dr.sent_to}</span></div>}
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
              {!drawersLoading && filteredDrawers.length === 0 && <div className="col-span-full py-8 text-center text-xs text-slate-400 font-semibold">No drawers holding a garment right now.</div>}
              {drawersLoading && <div className="col-span-full py-8 text-center text-xs text-slate-400 font-semibold">Loading drawers…</div>}
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── DRAWER SEND/RECEIVE CONFIRM MODAL (real API calls) ─── */}
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
