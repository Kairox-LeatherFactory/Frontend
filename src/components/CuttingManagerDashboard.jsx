'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scissors,
  AlertTriangle,
  Search,
  Download,
  Filter,
  X,
  Zap,
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
  apiGetCuttingDashboard,
  apiGetCuttingEmployeeDetail,
  apiGetCuttingConsumption,
} from '@/lib/api';

// Interactive Monthly Calendar Filter Picker Component
function CompleteDateCalendarPicker({ selectedDate, onSelectDate, availableDates = [], themeColor = '#2563eb' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => new Date(2026, 7, 1));

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    setCurrentMonth(new Date(year, month - 1, 1));
  };
  const handleNextMonth = (e) => {
    e.stopPropagation();
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const isSelected = (dayStr) => selectedDate === dayStr;
  const hasPieces = (dayStr) => availableDates.includes(dayStr);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:border-blue-500 focus:outline-none flex items-center justify-between gap-1 shadow-sm transition-all cursor-pointer"
        title="Open full interactive calendar"
      >
        <span className="truncate flex items-center gap-1">
          <span>📅</span>
          <span>{selectedDate === 'all' ? 'All Dates' : selectedDate}</span>
        </span>
        <span className="text-[10px] text-slate-400 font-bold">▼</span>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 z-50 bg-white border border-slate-200 rounded-2xl p-4 shadow-2xl w-80 animate-fade-in text-slate-800">
          <div className="grid grid-cols-3 gap-1.5 mb-3 pb-2.5 border-b border-slate-100 text-[11px] font-bold">
            <button
              onClick={() => { onSelectDate('all'); setIsOpen(false); }}
              className={`px-2 py-1 rounded-lg transition-all ${selectedDate === 'all' ? 'bg-[#2563eb] text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
            >
              All Dates
            </button>
            <button
              onClick={() => { onSelectDate(new Date().toISOString().slice(0, 10)); setIsOpen(false); }}
              className={`px-2 py-1 rounded-lg transition-all ${selectedDate === new Date().toISOString().slice(0, 10) ? 'bg-[#2563eb] text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
            >
              ⚡ Today
            </button>
            <button
              onClick={() => {
                const y = new Date();
                y.setDate(y.getDate() - 1);
                onSelectDate(y.toISOString().slice(0, 10));
                setIsOpen(false);
              }}
              className="px-2 py-1 rounded-lg bg-slate-50 text-slate-700 hover:bg-slate-100 transition-all"
            >
              Yesterday
            </button>
          </div>

          <div className="flex items-center justify-between mb-2">
            <button onClick={handlePrevMonth} className="px-2 py-1 rounded-lg hover:bg-slate-100 text-slate-600 font-black text-sm">&larr;</button>
            <span className="text-xs font-extrabold text-slate-900">{monthNames[month]} {year}</span>
            <button onClick={handleNextMonth} className="px-2 py-1 rounded-lg hover:bg-slate-100 text-slate-600 font-black text-sm">&rarr;</button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-extrabold text-slate-400 mb-1">
            <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="p-1"></div>
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const d = i + 1;
              const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              const active = isSelected(dayStr);
              const pieceActivity = hasPieces(dayStr);
              return (
                <button
                  key={d}
                  onClick={() => {
                    onSelectDate(dayStr);
                    setIsOpen(false);
                  }}
                  className={`p-1.5 rounded-xl font-bold transition-all relative flex flex-col items-center justify-center ${
                    active
                      ? 'bg-[#2563eb] text-white shadow-md scale-105 font-black'
                      : pieceActivity
                      ? 'bg-blue-50 text-blue-900 hover:bg-blue-100 font-extrabold'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <span>{d}</span>
                  {pieceActivity && !active && (
                    <span className="w-1 h-1 rounded-full bg-[#2563eb] mt-0.5"></span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold text-slate-400">Pick any date:</span>
            <input
              type="date"
              value={selectedDate === 'all' ? '' : selectedDate}
              onChange={(e) => {
                onSelectDate(e.target.value || 'all');
                if (e.target.value) setIsOpen(false);
              }}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 focus:outline-none focus:border-blue-600 cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Chart custom tooltip
function CustomTooltip({ active, payload, label, unit = 'DCM' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1e293b] border border-slate-700 text-white px-3.5 py-2.5 rounded-xl text-xs shadow-2xl z-50">
      {label && <p className="text-[10px] font-black uppercase tracking-wider text-[#38bdf8] mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="font-semibold flex items-center justify-between gap-4" style={{ color: p.color || p.fill }}>
          <span>{p.name}:</span>
          <span className="text-white font-mono font-bold">{p.value} {unit}</span>
        </p>
      ))}
    </div>
  );
}

// Badge shown in place of any metric the backend has explicitly flagged as unsupported
// (see meta.unsupported in the /dashboard/cutting response) instead of fabricating a number.
function NotAvailableBadge({ label = 'Not available yet' }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200"
      title="This metric is not yet supported by the backend"
    >
      — {label}
    </span>
  );
}

function formatStage(stage) {
  if (!stage) return '—';
  return stage.replace(/_/g, ' ');
}

const STAGE_COLORS = ['#2563eb', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#0ea5e9', '#ec4899', '#84cc16', '#64748b'];

function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts.slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

function DashboardInner() {
  const searchParams = useSearchParams();
  const { token } = useAuth();

  const [activeTab, setActiveTab] = useState('tab-today');

  // ── Raw state from GET /api/v1/dashboard/cutting — no mock fallbacks. ──
  const [meta, setMeta] = useState(null);
  const [productionKpis, setProductionKpis] = useState(null);
  const [leatherKpis, setLeatherKpis] = useState(null);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [orderProgress, setOrderProgress] = useState([]);
  const [cuttersList, setCuttersList] = useState([]);
  const [lotsList, setLotsList] = useState([]);
  const [dailyProduction, setDailyProduction] = useState([]);

  // ── Piece-level cut log, from GET /api/v1/dashboard/cutting/consumption ──
  const [piecesList, setPiecesList] = useState([]);
  const [piecesLoading, setPiecesLoading] = useState(false);

  const [selectedStyleDetail, setSelectedStyleDetail] = useState(null);

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  // Universal Filters
  const [filterDate, setFilterDate] = useState('all');
  const [filterOrder, setFilterOrder] = useState('all');
  const [filterStyle, setFilterStyle] = useState('all');
  const [filterLot, setFilterLot] = useState('all');
  const [filterCutter, setFilterCutter] = useState('all');
  const [filterStage, setFilterStage] = useState('all');
  const [filterSize, setFilterSize] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [selectedPieceModal, setSelectedPieceModal] = useState(null);
  const [selectedCutterModal, setSelectedCutterModal] = useState(null);
  const [selectedCutterPieces, setSelectedCutterPieces] = useState([]);
  const [selectedCutterPiecesLoading, setSelectedCutterPiecesLoading] = useState(false);
  const [selectedLotModal, setSelectedLotModal] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Pagination for piece tracker
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Sync tab from URL query params
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // ── LIVE BACKEND CALL: GET /api/v1/dashboard/cutting ──
  useEffect(() => {
    let isMounted = true;
    async function fetchCuttingDashboard() {
      if (!token) return;
      try {
        setLoading(true);
        setApiError(null);
        const params = {};
        if (filterOrder !== 'all') params.order_id = filterOrder;
        const data = await apiGetCuttingDashboard(token, params);
        if (!isMounted || !data) return;
        setMeta(data.meta || null);
        setProductionKpis(data.production_kpis || null);
        setLeatherKpis(data.leather_kpis || null);
        setCurrentOrder(data.current_order || null);
        setOrderProgress(Array.isArray(data.order_progress) ? data.order_progress : []);
        setCuttersList(Array.isArray(data.cutters) ? data.cutters : []);
        setLotsList(Array.isArray(data.leather_lots) ? data.leather_lots : []);
        setDailyProduction(Array.isArray(data.daily_production) ? data.daily_production : []);
      } catch (err) {
        console.warn('Backend API /api/v1/dashboard/cutting notice:', err.message);
        if (isMounted) setApiError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchCuttingDashboard();
    return () => { isMounted = false; };
  }, [token, filterOrder]);

  // ── LIVE BACKEND CALL: GET /api/v1/dashboard/cutting/consumption ──
  // This is the ONLY endpoint that returns piece-level rows, so it feeds the
  // Piece Tracker, Per-Style aggregates, and the "avg DCM / piece" KPI.
  useEffect(() => {
    let isMounted = true;
    async function fetchCuttingConsumption() {
      if (!token) return;
      try {
        setPiecesLoading(true);
        const params = {};
        if (filterOrder !== 'all') params.order_id = filterOrder;
        if (filterCutter !== 'all') params.employee_id = filterCutter;
        if (filterDate !== 'all') {
          params.start = filterDate;
          params.end = filterDate;
        }
        const data = await apiGetCuttingConsumption(token, params);
        if (isMounted) setPiecesList(Array.isArray(data) ? data : []);
      } catch (err) {
        console.warn('Backend API /api/v1/dashboard/cutting/consumption notice:', err.message);
        if (isMounted) setPiecesList([]);
      } finally {
        if (isMounted) setPiecesLoading(false);
      }
    }
    fetchCuttingConsumption();
    return () => { isMounted = false; };
  }, [token, filterOrder, filterCutter, filterDate]);

  // Handler to inspect cutter and call GET /api/v1/dashboard/cutting/employees/{employee_id}
  const handleOpenCutterModal = async (cutter) => {
    setSelectedCutterModal(cutter);
    setSelectedCutterPieces([]);
    if (!token || !cutter?.employee_id) return;
    try {
      setSelectedCutterPiecesLoading(true);
      const detail = await apiGetCuttingEmployeeDetail(token, cutter.employee_id);
      setSelectedCutterPieces(Array.isArray(detail) ? detail : []);
    } catch (err) {
      console.warn(`Backend API /api/v1/dashboard/cutting/employees/${cutter.employee_id} notice:`, err.message);
    } finally {
      setSelectedCutterPiecesLoading(false);
    }
  };

  // Toast trigger helper
  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setFilterDate('all');
    setFilterOrder('all');
    setFilterStyle('all');
    setFilterLot('all');
    setFilterCutter('all');
    setFilterStage('all');
    setFilterSize('all');
    setSearchQuery('');
    triggerToast('Filters reset to default view');
  };

  // ── Orders available in the filter dropdown, derived from order_progress
  // (the only field that spans multiple orders) + current_order for the client name. ──
  const ordersList = useMemo(() => {
    const map = new Map();
    orderProgress.forEach((r) => {
      if (!r.order_id || map.has(r.order_id)) return;
      map.set(r.order_id, { id: r.order_id, order_number: r.order_number, client: null });
    });
    if (currentOrder?.order_id) {
      map.set(currentOrder.order_id, {
        id: currentOrder.order_id,
        order_number: currentOrder.order_number,
        client: currentOrder.client,
      });
    }
    return Array.from(map.values());
  }, [orderProgress, currentOrder]);

  const availableStyles = useMemo(() => {
    const map = new Map();
    orderProgress.forEach((s) => {
      if (s.style_name) map.set(s.style_name, { id: s.style_id || s.style_name, name: s.style_name });
    });
    (currentOrder?.styles || []).forEach((s) => {
      if (s.style_name) map.set(s.style_name, { id: s.style_id || s.style_name, name: s.style_name });
    });
    return Array.from(map.values());
  }, [orderProgress, currentOrder]);

  const availableLots = useMemo(
    () => lotsList.map((l) => ({ id: l.lot_id, label: `${l.article || '—'} · ${l.colour || '—'} (${l.thickness || '—'})` })),
    [lotsList]
  );

  const availableCutters = useMemo(
    () => cuttersList.map((c) => ({ id: c.employee_id, name: c.name })),
    [cuttersList]
  );

  const availableStages = useMemo(
    () => Array.from(new Set(piecesList.map((p) => p.stage).filter(Boolean))),
    [piecesList]
  );

  const availableSizes = useMemo(
    () => Array.from(new Set(piecesList.map((p) => p.size).filter(Boolean))).sort(),
    [piecesList]
  );

  const availableDates = useMemo(
    () => Array.from(new Set(piecesList.map((p) => p.work_date).filter(Boolean))),
    [piecesList]
  );

  // Filtered cut-log rows computed client-side on top of whatever the
  // consumption endpoint returned for the current order/cutter/date params.
  const filteredPieces = useMemo(() => {
    return piecesList.filter((p) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesQuery =
          (p.piece_code && p.piece_code.toLowerCase().includes(q)) ||
          (p.style && p.style.toLowerCase().includes(q)) ||
          (p.employee && p.employee.toLowerCase().includes(q)) ||
          (p.order_number && p.order_number.toLowerCase().includes(q)) ||
          (p.colour && p.colour.toLowerCase().includes(q));
        if (!matchesQuery) return false;
      }
      if (filterStyle !== 'all' && p.style !== filterStyle) return false;
      if (filterLot !== 'all') {
        const lot = lotsList.find((l) => l.lot_id === filterLot);
        if (!lot || p.leather_article !== lot.article || p.colour !== lot.colour) return false;
      }
      if (filterStage !== 'all' && p.stage !== filterStage) return false;
      if (filterSize !== 'all' && p.size !== filterSize) return false;
      return true;
    });
  }, [piecesList, lotsList, searchQuery, filterStyle, filterLot, filterStage, filterSize]);

  // Paginated pieces
  const paginatedPieces = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPieces.slice(start, start + pageSize);
  }, [filteredPieces, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredPieces.length / pageSize) || 1;

  // Aggregate actual DCM consumption per (order, style) from the CURRENTLY FILTERED
  // cut log — this is real, computed from actual_consumption, and reacts to every
  // active filter (order/cutter/date server-side, style/lot/stage/size/search client-side).
  const styleConsumptionAgg = useMemo(() => {
    const map = new Map();
    filteredPieces.forEach((p) => {
      if (!p.style) return;
      const key = `${p.order_number || ''}::${p.style}`;
      if (!map.has(key)) map.set(key, { total: 0, count: 0 });
      const entry = map.get(key);
      if (typeof p.actual_consumption === 'number') {
        entry.total += p.actual_consumption;
        entry.count += 1;
      }
    });
    return map;
  }, [filteredPieces]);

  const selectedStyleSizeBreakdown = useMemo(() => {
    if (!selectedStyleDetail) return [];
    const map = new Map();
    filteredPieces
      .filter((p) => p.style === selectedStyleDetail.style_name)
      .forEach((p) => {
        const key = p.size || 'Unspecified';
        if (!map.has(key)) map.set(key, { size: key, pieces: 0, total: 0, count: 0 });
        const e = map.get(key);
        e.pieces += 1;
        if (typeof p.actual_consumption === 'number') {
          e.total += p.actual_consumption;
          e.count += 1;
        }
      });
    return Array.from(map.values()).sort((a, b) => a.size.localeCompare(b.size));
  }, [selectedStyleDetail, filteredPieces]);

  const filteredConsumptionLogs = useMemo(() => {
    return dailyProduction.filter((l) => (filterDate !== 'all' ? l.work_date === filterDate : true));
  }, [dailyProduction, filterDate]);

  const lotStatus = (lot) => {
    if ((lot.remaining ?? 0) < 0) return { label: 'Overdrawn', cls: 'bg-red-100 text-red-800' };
    if (lot.available > 0 && (lot.remaining ?? 0) / lot.available < 0.1) return { label: 'Low Stock', cls: 'bg-amber-100 text-amber-800' };
    return { label: 'Healthy', cls: 'bg-emerald-100 text-emerald-800' };
  };

  // Real backend field (delay_status on order_progress rows) — not previously surfaced anywhere.
  const delayBadgeCls = (status) => {
    if (!status) return 'bg-slate-100 text-slate-500';
    const s = status.toUpperCase();
    if (s.includes('DELAY')) return 'bg-red-100 text-red-800';
    if (s.includes('ON_TRACK') || s.includes('ONTRACK')) return 'bg-emerald-100 text-emerald-800';
    if (s.includes('NO_DEADLINE')) return 'bg-slate-100 text-slate-500';
    return 'bg-blue-100 text-blue-800';
  };

  // ── Chart datasets — every one of these is derived from `filteredPieces`, so
  // every chart on every tab reacts live to whichever filters are active. ──

  // Tab 1: daily cadence, grouped from the filtered cut log (not the coarse,
  // order-only-scoped daily_production endpoint) so it responds to every filter.
  const filteredDailyChartData = useMemo(() => {
    const map = new Map();
    filteredPieces.forEach((p) => {
      const date = p.work_date || 'Unknown';
      if (!map.has(date)) map.set(date, { work_date: date, pieces_cut: 0, dcm_consumed: 0 });
      const e = map.get(date);
      e.pieces_cut += 1;
      if (typeof p.actual_consumption === 'number') e.dcm_consumed += p.actual_consumption;
    });
    return Array.from(map.values()).sort((a, b) => a.work_date.localeCompare(b.work_date));
  }, [filteredPieces]);

  // Tab 2: actual DCM consumed per style, within the current filter.
  const filteredStyleChartData = useMemo(() => {
    const map = new Map();
    filteredPieces.forEach((p) => {
      const key = p.style || 'Unspecified';
      if (!map.has(key)) map.set(key, { style_name: key, pieces_cut: 0, dcm_consumed: 0 });
      const e = map.get(key);
      e.pieces_cut += 1;
      if (typeof p.actual_consumption === 'number') e.dcm_consumed += p.actual_consumption;
    });
    return Array.from(map.values()).sort((a, b) => b.dcm_consumed - a.dcm_consumed);
  }, [filteredPieces]);

  // Tab 2: real per-style stage breakdown from current_order.styles[].stages
  // (e.g. UNSTARTED/CUTTING/PASTING/FINAL_INSPECTION counts) — this field exists
  // on every style in the response but wasn't surfaced anywhere before.
  const styleStageChartData = useMemo(() => {
    const styles = currentOrder?.styles || [];
    const stageKeys = Array.from(new Set(styles.flatMap((s) => Object.keys(s.stages || {}))));
    const rows = styles.map((s) => {
      const row = { style_name: s.style_name };
      stageKeys.forEach((k) => { row[k] = (s.stages || {})[k] || 0; });
      return row;
    });
    return { rows, stageKeys };
  }, [currentOrder]);

  // Tab 3: lots — narrow the visible lot list to whatever the active filters
  // actually touch, and compute "consumed within this filter" per lot.
  const anyPieceFilterActive =
    filterStyle !== 'all' || filterStage !== 'all' || filterSize !== 'all' || searchQuery !== '' ||
    filterCutter !== 'all' || filterDate !== 'all';

  const visibleLots = useMemo(() => {
    if (filterLot !== 'all') return lotsList.filter((l) => l.lot_id === filterLot);
    if (!anyPieceFilterActive) return lotsList;
    const touched = new Set(filteredPieces.map((p) => `${p.leather_article}::${p.colour}`));
    return lotsList.filter((l) => touched.has(`${l.article}::${l.colour}`));
  }, [lotsList, filterLot, anyPieceFilterActive, filteredPieces]);

  const filteredLotChartData = useMemo(() => {
    const consumedInFilter = new Map();
    filteredPieces.forEach((p) => {
      const key = `${p.leather_article}::${p.colour}`;
      if (typeof p.actual_consumption !== 'number') return;
      consumedInFilter.set(key, (consumedInFilter.get(key) || 0) + p.actual_consumption);
    });
    return visibleLots.map((l) => ({
      label: `${l.article} · ${l.colour}`,
      available: l.available || 0,
      consumed_in_filter: consumedInFilter.get(`${l.article}::${l.colour}`) || 0,
    }));
  }, [visibleLots, filteredPieces]);

  // Tab 4: cutters — narrow the visible cutter cards to the selected cutter,
  // and compute real pieces-cut/DCM-consumed within the current filter per cutter.
  const visibleCutters = useMemo(() => {
    if (filterCutter === 'all') return cuttersList;
    return cuttersList.filter((c) => c.employee_id === filterCutter);
  }, [cuttersList, filterCutter]);

  const cutterFilteredStats = useMemo(() => {
    const map = new Map();
    filteredPieces.forEach((p) => {
      if (!p.employee) return;
      if (!map.has(p.employee)) map.set(p.employee, { pieces_cut: 0, dcm_consumed: 0 });
      const e = map.get(p.employee);
      e.pieces_cut += 1;
      if (typeof p.actual_consumption === 'number') e.dcm_consumed += p.actual_consumption;
    });
    return map;
  }, [filteredPieces]);

  const filteredCutterChartData = useMemo(() => {
    const map = new Map();
    filteredPieces.forEach((p) => {
      const key = p.employee || 'Unassigned';
      if (!map.has(key)) map.set(key, { name: key, pieces_cut: 0, dcm_consumed: 0 });
      const e = map.get(key);
      e.pieces_cut += 1;
      if (typeof p.actual_consumption === 'number') e.dcm_consumed += p.actual_consumption;
    });
    return Array.from(map.values()).sort((a, b) => b.dcm_consumed - a.dcm_consumed);
  }, [filteredPieces]);

  // CSV Export action — exports the real cut-log rows currently on screen.
  const handleExportCSV = () => {
    const headers = [
      'Piece Code', 'Work Date', 'Order #', 'Style', 'Size', 'Colour',
      'Leather Article', 'Thickness', 'Cutter', 'Stage',
      'Actual DCM', 'Expected DCM', 'Variance DCM',
    ];

    const rows = filteredPieces.map((p) => [
      p.piece_code, p.work_date, p.order_number, p.style, p.size, p.colour,
      p.leather_article, p.thickness, p.employee, p.stage,
      p.actual_consumption, p.expected_consumption, p.variance,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((v) => (v ?? '')).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Cutting_Floor_Traceability_DCM_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('📥 Cutting Traceability CSV Report Downloaded Successfully');
  };

  // ── Top-line numbers — always sourced from production_kpis / leather_kpis
  // (backend-computed order-wide totals), never from the partial cut-log window. ──
  const totalOrderPieces = productionKpis?.total_order_pieces ?? currentOrder?.total_pieces ?? 0;
  const overallCompleted = productionKpis?.overall_completed ?? 0;
  const overallPending = productionKpis?.overall_pending ?? 0;
  const mintedPieces = productionKpis?.minted_pieces ?? 0;
  const damagePieces = productionKpis?.damage_pieces ?? 0;
  const reworkPieces = productionKpis?.rework_pieces ?? 0;

  // Scoped to the single current_order (not the floor-wide production_kpis totals above) —
  // this is what the hero banner's own progress bar should reflect, since that card is
  // describing one specific order, not the all-clients aggregate.
  const orderCompletionPct = currentOrder?.total_pieces
    ? Math.round(((currentOrder.completed ?? 0) / currentOrder.total_pieces) * 100)
    : 0;

  const avgDcmPerPiece = useMemo(() => {
    const withValue = piecesList.filter((p) => typeof p.actual_consumption === 'number');
    if (withValue.length === 0) return null;
    return withValue.reduce((acc, p) => acc + p.actual_consumption, 0) / withValue.length;
  }, [piecesList]);

  const avgDailyAssigned = useMemo(() => {
    if (dailyProduction.length === 0) return null;
    return dailyProduction.reduce((acc, d) => acc + (d.assigned || 0), 0) / dailyProduction.length;
  }, [dailyProduction]);

  const avgDailyCompleted = useMemo(() => {
    if (dailyProduction.length === 0) return null;
    return dailyProduction.reduce((acc, d) => acc + (d.completed || 0), 0) / dailyProduction.length;
  }, [dailyProduction]);

  return (
    <div className="w-full min-w-0 space-y-5">

      {/* ─── TOAST NOTIFICATION ─── */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 bg-[#1e293b] border border-slate-700 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold font-mono"
          >
            <Zap className="w-4 h-4 text-[#38bdf8] animate-pulse" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── TOP ACTION BANNER (Full Width) ─── */}
      <div className="w-full bg-white p-5 rounded-2xl border border-[#e8edf3] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] flex items-center justify-center text-white shadow-md">
            <Scissors className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-[#1e293b] tracking-tight">Cutting Floor Operations Dashboard</h1>
            <p className="text-xs text-[#64748b] font-medium">Piece & Style Traceability &bull; Standard Unit: <strong className="text-[#2563eb]">Decimeter (DCM / dm²)</strong></p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#f8fafc] text-slate-700 border border-slate-200 text-xs font-bold hover:bg-slate-100 transition-all"
            title="Export currently loaded cutting log to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-slate-200 text-xs text-slate-500 font-semibold">
            {loading || piecesLoading ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                <span>Syncing with backend…</span>
              </>
            ) : apiError ? (
              <>
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                <span className="text-red-600">API error: {apiError}</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Live backend data{meta?.generated_for ? ` · ${meta.generated_for}` : ''}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─── UNIVERSAL MULTI-FILTER TOOLBAR (Full Width) ─── */}
      <section className="w-full bg-white p-4 rounded-2xl border border-[#e8edf3] shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#1e293b] uppercase tracking-wider">
            <Filter className="w-4 h-4 text-[#2563eb]" />
            <span>Universal Operations Cross-Filter</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe]">
              Showing {filteredPieces.length} of {piecesList.length} Cut Records
            </span>
            <button
              onClick={handleResetFilters}
              className="text-xs text-red-600 font-bold hover:underline cursor-pointer"
            >
              Reset All
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-8 gap-2">
          {/* Quick Search */}
          <div className="relative col-span-2 sm:col-span-3 lg:col-span-2 xl:col-span-2">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search piece, style, cutter..."
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2563eb]"
            />
          </div>

          {/* Date Filter */}
          <div>
            <CompleteDateCalendarPicker
              selectedDate={filterDate}
              onSelectDate={(d) => { setFilterDate(d); setCurrentPage(1); }}
              availableDates={availableDates}
              themeColor="#2563eb"
            />
          </div>

          {/* Order Filter (server-side: order_id) */}
          <div>
            <select
              value={filterOrder}
              onChange={(e) => { setFilterOrder(e.target.value); setCurrentPage(1); }}
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#2563eb]"
            >
              <option value="all">📦 All Orders</option>
              {ordersList.map((ord) => (
                <option key={ord.id} value={ord.id}>
                  {ord.client ? `${ord.client} - ` : ''}PO: {ord.order_number}
                </option>
              ))}
            </select>
          </div>

          {/* Style Filter (client-side) */}
          <div>
            <select
              value={filterStyle}
              onChange={(e) => { setFilterStyle(e.target.value); setCurrentPage(1); }}
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#2563eb]"
            >
              <option value="all">👗 All Styles</option>
              {availableStyles.map((s) => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Leather Lot Filter (client-side, matched by article+colour) */}
          <div>
            <select
              value={filterLot}
              onChange={(e) => { setFilterLot(e.target.value); setCurrentPage(1); }}
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#2563eb]"
            >
              <option value="all">🧵 All Lots</option>
              {availableLots.map((lot) => (
                <option key={lot.id} value={lot.id}>{lot.label}</option>
              ))}
            </select>
          </div>

          {/* Cutter Filter (server-side: employee_id) */}
          <div>
            <select
              value={filterCutter}
              onChange={(e) => { setFilterCutter(e.target.value); setCurrentPage(1); }}
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#2563eb]"
            >
              <option value="all">✂️ All Cutters</option>
              {availableCutters.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Stage Filter (client-side — real backend field is "stage", not a "status" enum) */}
          <div>
            <select
              value={filterStage}
              onChange={(e) => { setFilterStage(e.target.value); setCurrentPage(1); }}
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#2563eb]"
            >
              <option value="all">⚡ Stage</option>
              {availableStages.map((st) => (
                <option key={st} value={st}>{formatStage(st)}</option>
              ))}
            </select>
          </div>

          {/* Size Filter */}
          <div>
            <select
              value={filterSize}
              onChange={(e) => { setFilterSize(e.target.value); setCurrentPage(1); }}
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#2563eb]"
            >
              <option value="all">📏 Size</option>
              {availableSizes.map((sz) => (
                <option key={sz} value={sz}>Size {sz}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* ─── NAVIGATION TABS BAR (Full Width) ─── */}
      <div className="w-full flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-[#e8edf3] shadow-sm overflow-x-auto">
        {[
          { id: 'tab-today', label: "📌 Today's Priority" },
          { id: 'tab-styles', label: '👗 Per-Style Leather Consumption (DCM)' },
          { id: 'tab-inventory', label: '🧵 Leather Stock & Allocation (DCM)' },
          { id: 'tab-cutters', label: '✂️ Cutter Performance' },
          { id: 'tab-pieces', label: '🏷️ Piece-Level Master Tracker' },
          { id: 'tab-damage', label: '⚠️ Damage & Rework Station' },
          { id: 'tab-analytics', label: '📉 Loss & Waste Analytics (DCM)' },
          { id: 'tab-flow', label: '🔄 Traceability Flow' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-[#1e293b] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-[#f8fafc]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ====================================================================
           TAB 1: TODAY'S PRIORITY VIEW
           ==================================================================== */}
      {activeTab === 'tab-today' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-5">
          {/* CURRENT RUNNING ORDER HERO BANNER */}
          <div className="w-full bg-gradient-to-br from-white via-[#f8fafc] to-[#eff6ff] border border-slate-200 rounded-3xl p-6 shadow-sm grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-blue-100 text-blue-800">
                    {currentOrder?.order_number || '—'}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    Client: <strong>{currentOrder?.client || '—'}</strong>
                  </span>
                </div>
                <h2 className="text-2xl font-black text-[#1e293b] tracking-tight">
                  {currentOrder?.total_pieces ?? 0} pcs ordered
                </h2>
                <p className="text-xs font-semibold text-slate-600 mt-0.5">
                  {(currentOrder?.styles || []).length} styles in this order
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Order Date</span>
                  <p className="text-xs font-bold text-slate-800">{currentOrder?.order_date || '—'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Delivery Deadline</span>
                  <p className="text-xs font-bold text-slate-800">{currentOrder?.delivery_deadline || 'No deadline set'}</p>
                </div>
              </div>
            </div>

            {/* Middle Col: Real daily pacing averages computed from daily_production */}
            <div className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-2xl p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Daily Pacing (avg)</span>
              </div>

              <div className="grid grid-cols-2 gap-3 my-3">
                <div className="bg-[#f8fafc] p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-500">Avg Daily Assigned</span>
                  <div className="text-lg font-black text-slate-900">
                    {avgDailyAssigned !== null ? avgDailyAssigned.toFixed(1) : '—'} pcs
                  </div>
                </div>
                <div className="bg-[#f8fafc] p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-500">Avg Daily Completed</span>
                  <div className="text-lg font-black text-slate-900">
                    {avgDailyCompleted !== null ? avgDailyCompleted.toFixed(1) : '—'} pcs
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-600">Order Completion ({currentOrder?.order_number || '—'})</span>
                  <span className="text-[#2563eb]">{orderCompletionPct}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#2563eb] to-[#3b82f6] h-full rounded-full transition-all duration-500"
                    style={{ width: `${orderCompletionPct}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Right Col: Real production_kpis breakdown (floor-wide, scope: {meta?.scope}) */}
            <div className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-2xl p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Production KPI Breakdown</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">{meta?.scope || 'all_clients'}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 my-2.5 text-xs font-bold">
                <div className="bg-[#f8fafc] p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Assigned</span>
                  <div className="text-lg font-black text-slate-900">{productionKpis?.assigned_pieces ?? 0}</div>
                </div>
                <div className="bg-[#f8fafc] p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Completed</span>
                  <div className="text-lg font-black text-slate-900">{overallCompleted}</div>
                </div>
                <div className="bg-[#f8fafc] p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Pending</span>
                  <div className="text-lg font-black text-slate-900">{overallPending}</div>
                </div>
                <div className="bg-red-50/70 p-2.5 rounded-xl border border-red-100">
                  <span className="text-[10px] text-red-500 uppercase font-semibold">Damage</span>
                  <div className="text-lg font-black text-red-600">{damagePieces}</div>
                </div>
                <div className="bg-purple-50/70 p-2.5 rounded-xl border border-purple-100">
                  <span className="text-[10px] text-purple-500 uppercase font-semibold">Rework</span>
                  <div className="text-lg font-black text-purple-700">{reworkPieces}</div>
                </div>
                <div className="bg-blue-50/70 p-2.5 rounded-xl border border-blue-100">
                  <span className="text-[10px] text-blue-500 uppercase font-semibold">Today</span>
                  <div className="text-[11px] font-black text-blue-700 leading-tight mt-0.5">
                    {productionKpis?.completed_today ?? 0} done<br />{productionKpis?.pending_today ?? 0} pending
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4 TOP SUMMARY KPIS */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Total Order Pieces */}
            <div onClick={() => setActiveTab('tab-pieces')} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">📦</div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                  {productionKpis?.assigned_today ?? 0} assigned today
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-500">Total Pieces ({meta?.scope || 'all orders'})</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900">{totalOrderPieces}</span>
                <span className="text-xs font-semibold text-slate-400">/ minted {mintedPieces}</span>
              </div>
              <div className="mt-3 pt-3 border-t border-dashed border-slate-100 flex justify-between text-xs text-slate-600 font-semibold">
                <span>Completed: <strong className="text-emerald-600">{overallCompleted}</strong></span>
                <span>Pending: <strong className="text-amber-600">{overallPending}</strong></span>
              </div>
            </div>

            {/* KPI 2: Avg DCM / piece from logged cuts */}
            <div onClick={() => setActiveTab('tab-styles')} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-lg">👗</div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500">from logged cuts</span>
              </div>
              <span className="text-xs font-semibold text-slate-500">Avg Actual Consumption (DCM)</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900">{avgDcmPerPiece !== null ? `${avgDcmPerPiece.toFixed(1)} DCM` : '—'}</span>
                <span className="text-xs font-semibold text-slate-400">/ piece avg</span>
              </div>
              <div className="mt-3 pt-3 border-t border-dashed border-slate-100 flex justify-between items-center text-xs text-slate-600 font-semibold">
                <span>Target BOM:</span>
                <NotAvailableBadge label="BOM not configured" />
              </div>
            </div>

            {/* KPI 3: Leather Stock — fully real from leather_kpis */}
            <div onClick={() => setActiveTab('tab-inventory')} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">🧵</div>
              </div>
              <span className="text-xs font-semibold text-slate-500">Leather Consumed vs Stock (DCM)</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900">{(leatherKpis?.consumed_leather ?? 0).toLocaleString()} DCM</span>
              </div>
              <div className="mt-3 pt-3 border-t border-dashed border-slate-100 flex justify-between text-xs text-slate-600 font-semibold">
                <span>Total Stock: <strong>{(leatherKpis?.total_available_leather ?? 0).toLocaleString()} DCM</strong></span>
                <span>Remaining: <strong className="text-emerald-600">{(leatherKpis?.remaining_leather ?? 0).toLocaleString()} DCM</strong></span>
              </div>
            </div>

            {/* KPI 4: Damage & Rework (waste is unsupported) */}
            <div onClick={() => setActiveTab('tab-damage')} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg">📊</div>
              </div>
              <span className="text-xs font-semibold text-slate-500">Damage & Rework (Today)</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-amber-600">{productionKpis?.damage_today ?? 0} / {productionKpis?.rework_today ?? 0}</span>
              </div>
              <div className="mt-3 pt-3 border-t border-dashed border-slate-100 flex justify-between items-center text-xs text-slate-600 font-semibold">
                <span>Waste (DCM):</span>
                <NotAvailableBadge />
              </div>
            </div>
          </div>

          {/* DAILY PRODUCTION CADENCE CHART & LOG */}
          <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Daily Cutting Cadence (filtered)</h3>
                  <p className="text-xs text-slate-500">Cut events & DCM consumed per day, computed live from the cut log matching every active filter</p>
                </div>
              </div>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredDailyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="work_date" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip content={<CustomTooltip unit="" />} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                    <Bar dataKey="pieces_cut" name="Cut Events (pcs)" fill="#2563eb" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="dcm_consumed" name="DCM Consumed" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {filteredDailyChartData.length === 0 && (
                <p className="text-center text-xs text-slate-400 font-medium py-4">No cut events match the current filters.</p>
              )}
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 mb-1">Backend Daily Log</h3>
                <p className="text-xs text-slate-500 mb-3">Order-wide assigned / completed / events, straight from daily_production (date-filtered only — this endpoint has no per-style/cutter breakdown)</p>
                <div className="overflow-y-auto max-h-[250px] space-y-2 pr-1">
                  {filteredConsumptionLogs.map((log, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-[#f8fafc] border border-slate-100 text-xs">
                      <div>
                        <span className="font-bold text-slate-800">{log.work_date}</span>
                        <div className="text-[10px] text-slate-500 mt-0.5">Events: {log.events ?? 0}</div>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-emerald-700">{log.completed ?? 0} done</span>
                        <div className="text-[10px] text-blue-600 font-semibold">{log.assigned ?? 0} assigned</div>
                      </div>
                    </div>
                  ))}
                  {filteredConsumptionLogs.length === 0 && (
                    <div className="text-center py-8 text-xs text-slate-400 font-medium">No shift records logged yet.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ====================================================================
           TAB 2: PER-STYLE LEATHER CONSUMPTION (DCM)
           ==================================================================== */}
      {activeTab === 'tab-styles' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-5">
          <div className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Per-Style / Order Progress</h3>
                <p className="text-xs text-slate-500">Real order_progress rows. Actual DCM columns are computed from the loaded cut log (currently filtered window), not a full-order total.</p>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-[#eff6ff] text-[#2563eb] rounded-full">
                Standard: 1 dm² = 0.1076 sq.ft
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-[#f8fafc] text-slate-600 font-bold uppercase tracking-wider border-y border-slate-200">
                    <th className="py-3 px-4">Style</th>
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-4">Article</th>
                    <th className="py-3 px-4 text-right">Total Ordered</th>
                    <th className="py-3 px-4 text-right">Minted</th>
                    <th className="py-3 px-4 text-right">Completed</th>
                    <th className="py-3 px-4 text-right">Pending</th>
                    <th className="py-3 px-4 text-right">Completion %</th>
                    <th className="py-3 px-4 text-center">Delay Status</th>
                    <th className="py-3 px-4 text-right">Actual Avg (DCM)</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {orderProgress
                    .filter((s) => filterStyle === 'all' || s.style_name === filterStyle)
                    .filter((s) => filterOrder === 'all' || s.order_id === filterOrder)
                    .map((s, idx) => {
                      const agg = styleConsumptionAgg.get(`${s.order_number}::${s.style_name}`);
                      const avgDcm = agg && agg.count > 0 ? (agg.total / agg.count) : null;
                      const isSelected = selectedStyleDetail?.style_id === s.style_id;
                      return (
                        <tr
                          key={`${s.order_id}-${s.style_id}-${idx}`}
                          onClick={() => {
                            setFilterStyle(s.style_name);
                            setSelectedStyleDetail(s);
                            triggerToast(`⚡ Filtered to Style: ${s.style_name}`);
                          }}
                          className={`hover:bg-blue-50/70 cursor-pointer transition-all ${isSelected ? 'bg-blue-50/90 font-bold' : ''}`}
                        >
                          <td className="py-3.5 px-4 font-bold text-slate-900">{s.style_name}</td>
                          <td className="py-3.5 px-4 font-mono text-slate-600">{s.order_number}</td>
                          <td className="py-3.5 px-4">{s.article || '—'}</td>
                          <td className="py-3.5 px-4 text-right font-bold text-slate-800">{s.total_ordered}</td>
                          <td className="py-3.5 px-4 text-right text-slate-700">{s.minted}</td>
                          <td className="py-3.5 px-4 text-right text-emerald-700 font-bold">{s.completed}</td>
                          <td className="py-3.5 px-4 text-right text-amber-700 font-bold">{s.pending}</td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800">{s.completion_pct}%</td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${delayBadgeCls(s.delay_status)}`}>
                              {s.delay_status ? s.delay_status.replace(/_/g, ' ') : '—'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-extrabold text-[#2563eb]">
                            {avgDcm !== null ? `${avgDcm.toFixed(1)} DCM` : '—'}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedStyleDetail(s); }}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#2563eb] hover:text-white text-slate-700 text-[11px] font-bold transition-all"
                            >
                              Size Details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  {orderProgress.length === 0 && (
                    <tr>
                      <td colSpan={11} className="text-center py-8 text-slate-400 font-medium">No style/order progress data returned for this filter.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Real size-wise breakdown, computed from the loaded cut log */}
          {selectedStyleDetail && (
            <div className="w-full bg-gradient-to-br from-white to-[#f8fafc] p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-sm font-extrabold text-[#1e293b]">
                    Size-Wise Consumption for Style: <span className="text-[#2563eb]">{selectedStyleDetail.style_name}</span>
                  </h4>
                  <p className="text-xs text-slate-500">Computed live from actual_consumption in the loaded cut log</p>
                </div>
              </div>

              {selectedStyleSizeBreakdown.length === 0 ? (
                <p className="text-xs text-slate-400 font-medium py-6 text-center">No cut-log entries loaded yet for this style in the current filter window.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {selectedStyleSizeBreakdown.map((sb, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-base font-black text-slate-900">Size {sb.size}</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{sb.pieces} pcs cut</span>
                      </div>
                      <div className="space-y-1.5 text-xs font-medium my-2">
                        <div className="flex justify-between text-slate-500">
                          <span>Actual Avg:</span>
                          <span className="font-mono font-bold text-[#2563eb]">{sb.count > 0 ? (sb.total / sb.count).toFixed(1) : '—'} DCM</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Real per-style stage breakdown for the current order (current_order.styles[].stages) */}
          {currentOrder && styleStageChartData.rows.length > 0 && (
            <div className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-extrabold text-slate-900 mb-1">Style Progress by Stage — Order {currentOrder.order_number}</h3>
              <p className="text-xs text-slate-500 mb-4">Real stage distribution per style, straight from current_order.styles[].stages</p>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={styleStageChartData.rows}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="style_name" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} angle={-20} textAnchor="end" height={70} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip unit="pcs" />} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                    {styleStageChartData.stageKeys.map((k, i) => (
                      <Bar key={k} dataKey={k} name={formatStage(k)} stackId="stages" fill={STAGE_COLORS[i % STAGE_COLORS.length]} radius={i === styleStageChartData.stageKeys.length - 1 ? [6, 6, 0, 0] : undefined} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Actual DCM consumed per style — reacts live to every active filter */}
          <div className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-extrabold text-slate-900 mb-1">Actual DCM Consumed by Style (filtered)</h3>
            <p className="text-xs text-slate-500 mb-4">Computed live from actual_consumption in the currently filtered cut log</p>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredStyleChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="style_name" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} angle={-20} textAnchor="end" height={70} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip content={<CustomTooltip unit="" />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Bar dataKey="pieces_cut" name="Pieces Cut" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="dcm_consumed" name="DCM Consumed" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {filteredStyleChartData.length === 0 && (
              <p className="text-center text-xs text-slate-400 font-medium py-4">No cut events match the current filters.</p>
            )}
          </div>
        </motion.div>
      )}

      {/* ====================================================================
           TAB 3: LEATHER STOCK & ALLOCATION (DCM)
           ==================================================================== */}
      {activeTab === 'tab-inventory' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-5">
          <div className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Leather Inventory Stock & Lot Allocation (DCM)</h3>
                <p className="text-xs text-slate-500">
                  {filterLot !== 'all' || anyPieceFilterActive
                    ? `Showing ${visibleLots.length} of ${lotsList.length} lots that match the active filters`
                    : 'Available hide inventory and consumption in Decimeters (DCM / dm²)'}
                </p>
              </div>
              <span className="text-xs font-bold text-slate-500">
                Total Stock Available: <strong className="text-slate-900">{(leatherKpis?.total_available_leather ?? 0).toLocaleString()} DCM</strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-[#f8fafc] text-slate-600 font-bold uppercase tracking-wider border-y border-slate-200">
                    <th className="py-3 px-4">Article</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Colour</th>
                    <th className="py-3 px-4">Thickness</th>
                    <th className="py-3 px-4">UOM</th>
                    <th className="py-3 px-4 text-right">Available (DCM)</th>
                    <th className="py-3 px-4 text-right">Allocated (DCM)</th>
                    <th className="py-3 px-4 text-right">Consumed (DCM)</th>
                    <th className="py-3 px-4 text-right">Remaining (DCM)</th>
                    <th className="py-3 px-4 text-right">Pieces Cut</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {visibleLots.map((lot) => {
                    const status = lotStatus(lot);
                    return (
                      <tr key={lot.lot_id} className="hover:bg-slate-50 transition-all">
                        <td className="py-3.5 px-4 font-bold text-slate-900">{lot.article}</td>
                        <td className="py-3.5 px-4 text-slate-500">{lot.leather_type || '—'}</td>
                        <td className="py-3.5 px-4">{lot.colour}</td>
                        <td className="py-3.5 px-4">{lot.thickness}</td>
                        <td className="py-3.5 px-4 uppercase text-slate-500">{lot.uom}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">{(lot.available ?? 0).toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-right"><NotAvailableBadge /></td>
                        <td className="py-3.5 px-4 text-right font-mono text-purple-700 font-bold">{(lot.consumed ?? 0).toLocaleString()}</td>
                        <td className={`py-3.5 px-4 text-right font-mono font-black ${(lot.remaining ?? 0) < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                          {(lot.remaining ?? 0).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-700">{lot.pieces_cut ?? 0}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${status.cls}`}>{status.label}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => setSelectedLotModal(lot)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#2563eb] hover:text-white text-slate-700 text-[11px] font-bold transition-all"
                          >
                            View Lot Trace
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {visibleLots.length === 0 && (
                    <tr>
                      <td colSpan={12} className="text-center py-8 text-slate-400 font-medium">
                        {lotsList.length === 0 ? 'No leather inventory lots recorded.' : 'No lots match the current filters.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-400 font-semibold mt-3 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              {meta?.unsupported?.leather_allocation || 'Allocation is not yet wired to this dashboard.'}
            </p>
          </div>

          {/* Available vs consumed-within-filter per lot — reacts live to every active filter */}
          <div className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-extrabold text-slate-900 mb-1">Lot Stock vs Consumption (filtered)</h3>
            <p className="text-xs text-slate-500 mb-4">Available (DCM) is the lot&apos;s real stock; Consumed in Filter is computed live from the currently filtered cut log</p>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredLotChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} angle={-20} textAnchor="end" height={70} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip content={<CustomTooltip unit="DCM" />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Bar dataKey="available" name="Available (DCM)" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="consumed_in_filter" name="Consumed in Filter (DCM)" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {filteredLotChartData.length === 0 && (
              <p className="text-center text-xs text-slate-400 font-medium py-4">No lots match the current filters.</p>
            )}
          </div>
        </motion.div>
      )}

      {/* ====================================================================
           TAB 4: CUTTER PERFORMANCE
           ==================================================================== */}
      {activeTab === 'tab-cutters' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-5">
          {filterCutter !== 'all' && (
            <p className="text-xs font-bold text-slate-500">Showing {visibleCutters.length} of {cuttersList.length} cutters that match the active filter</p>
          )}
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-5">
            {visibleCutters.map((cutter) => {
              const dcmPerPiece = cutter.assigned_pieces ? (cutter.consumed_leather / cutter.assigned_pieces).toFixed(1) : '—';
              const inFilter = cutterFilteredStats.get(cutter.name);
              return (
                <div
                  key={cutter.employee_id}
                  onClick={() => handleOpenCutterModal(cutter)}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] flex items-center justify-center text-white font-black text-sm">
                        {initials(cutter.name)}
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900">{cutter.name}</h4>
                        <p className="text-xs text-slate-500">{cutter.designation || '—'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-semibold my-3">
                      <div className="bg-[#f8fafc] p-2.5 rounded-xl">
                        <span className="text-[10px] text-slate-500">Assigned Today</span>
                        <div className="text-base font-black text-slate-900">{cutter.assigned_today ?? 0} pcs</div>
                      </div>
                      <div className="bg-[#f8fafc] p-2.5 rounded-xl">
                        <span className="text-[10px] text-slate-500">DCM Consumed</span>
                        <div className="text-base font-black text-[#2563eb]">{cutter.consumed_leather ?? 0} DCM</div>
                      </div>
                      <div className="bg-[#f8fafc] p-2.5 rounded-xl">
                        <span className="text-[10px] text-slate-500">DCM / Piece</span>
                        <div className="text-base font-black text-emerald-700">{dcmPerPiece}</div>
                      </div>
                      <div className="bg-[#f8fafc] p-2.5 rounded-xl">
                        <span className="text-[10px] text-slate-500">Damage / Rework</span>
                        <div className="text-base font-black text-red-600">{cutter.damage_pieces ?? 0} / {cutter.rework_today ?? 0}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-bold px-0.5">
                      <span className="text-slate-400">Daily Target</span>
                      {typeof cutter.daily_target === 'number' ? <span className="text-slate-800">{cutter.daily_target} pcs</span> : <NotAvailableBadge label="N/A" />}
                    </div>

                    <div className="mt-1 p-2.5 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center justify-between text-[11px] font-bold">
                      <span className="text-blue-600">In Current Filter</span>
                      <span className="text-slate-800">{inFilter?.pieces_cut ?? 0} pcs &bull; {(inFilter?.dcm_consumed ?? 0).toFixed(1)} DCM</span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); handleOpenCutterModal(cutter); }}
                    className="w-full mt-2 py-2 rounded-xl bg-slate-100 hover:bg-[#1e293b] hover:text-white text-slate-800 text-xs font-bold transition-all"
                  >
                    View Cut Pieces & Logs
                  </button>
                </div>
              );
            })}
            {visibleCutters.length === 0 && (
              <div className="col-span-3 text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400 font-medium">
                {cuttersList.length === 0 ? 'No cutter operators registered.' : 'No cutters match the current filter.'}
              </div>
            )}
          </div>

          {/* Cutter throughput within the current filter — reacts live to every active filter */}
          <div className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-extrabold text-slate-900 mb-1">Cutter Throughput (filtered)</h3>
            <p className="text-xs text-slate-500 mb-4">Pieces cut & DCM consumed per cutter, computed live from the currently filtered cut log</p>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredCutterChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip content={<CustomTooltip unit="" />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="pieces_cut" name="Pieces Cut" fill="#2563eb" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="dcm_consumed" name="DCM Consumed" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {filteredCutterChartData.length === 0 && (
              <p className="text-center text-xs text-slate-400 font-medium py-4">No cut events match the current filters.</p>
            )}
          </div>
        </motion.div>
      )}

      {/* ====================================================================
           TAB 5: PIECE-LEVEL MASTER TRACKER
           ==================================================================== */}
      {activeTab === 'tab-pieces' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-4">
          <div className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Piece-Level Master Traceability Tracker</h3>
                <p className="text-xs text-slate-500">Every logged cut event with actual DCM consumption, cutter, and current stage</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                  className="bg-[#f8fafc] border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-[#f8fafc] text-slate-600 font-bold uppercase tracking-wider border-y border-slate-200">
                    <th className="py-3 px-4">Piece Code</th>
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-4">Style</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4">Cutter</th>
                    <th className="py-3 px-4">Stage</th>
                    <th className="py-3 px-4 text-right">Actual Consumed</th>
                    <th className="py-3 px-4 text-right">Expected</th>
                    <th className="py-3 px-4 text-right">Variance</th>
                    <th className="py-3 px-4 text-center">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {paginatedPieces.map((p, idx) => (
                    <tr key={`${p.piece_code}-${idx}`} onClick={() => setSelectedPieceModal(p)} className="hover:bg-slate-50 cursor-pointer transition-all">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{p.piece_code}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">{p.order_number}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">{p.style}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-700">{p.size}</td>
                      <td className="py-3.5 px-4 text-slate-800">{p.employee}</td>
                      <td className="py-3.5 px-4 font-bold text-blue-700">{formatStage(p.stage)}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-[#2563eb]">
                        {typeof p.actual_consumption === 'number' ? `${p.actual_consumption.toFixed(1)} DCM` : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-500">
                        {typeof p.expected_consumption === 'number' ? `${p.expected_consumption.toFixed(1)} DCM` : <NotAvailableBadge label="N/A" />}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold">
                        {typeof p.variance === 'number' ? (
                          <span className={p.variance <= 0 ? 'text-emerald-600' : 'text-red-600'}>
                            {p.variance > 0 ? `+${p.variance.toFixed(1)}` : p.variance.toFixed(1)} DCM
                          </span>
                        ) : (
                          <NotAvailableBadge label="N/A" />
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedPieceModal(p); }}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#2563eb] hover:text-white text-slate-700 text-[11px] font-bold transition-all"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                  {paginatedPieces.length === 0 && (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-slate-400 font-medium">
                        {piecesLoading ? 'Loading cut log…' : 'No cut events match the current filters.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs font-bold text-slate-600">
              <span>Page {currentPage} of {totalPages} ({filteredPieces.length} items)</span>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Previous
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* Cut events by style — reacts live to every active filter. This dashboard is
              cutting-only, so grouping by stage tends to collapse into one dominant bar
              (most rows sit at the same cutting-adjacent stage); style gives more useful spread. */}
          <div className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-extrabold text-slate-900 mb-1">Cut Events by Style (filtered)</h3>
            <p className="text-xs text-slate-500 mb-4">Pieces cut & DCM consumed per style, computed live from the currently filtered cut log</p>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredStyleChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="style_name" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} angle={-20} textAnchor="end" height={70} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip unit="" />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="pieces_cut" name="Pieces Cut" fill="#2563eb" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="dcm_consumed" name="DCM Consumed" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {filteredStyleChartData.length === 0 && (
              <p className="text-center text-xs text-slate-400 font-medium py-4">No cut events match the current filters.</p>
            )}
          </div>
        </motion.div>
      )}

      {/* ====================================================================
           TAB 6: DAMAGE & REWORK STATION
           ==================================================================== */}
      {activeTab === 'tab-damage' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-5">
          <div className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="mb-5">
              <h3 className="text-base font-extrabold text-slate-900">Damage, Defect & Rework Station</h3>
              <p className="text-xs text-slate-500">Aggregate counts are real backend values; per-piece damage drill-down is not yet supported.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <div className="bg-red-50/70 p-4 rounded-xl border border-red-100">
                <span className="text-[10px] text-red-500 uppercase font-bold">Damage (Total)</span>
                <div className="text-2xl font-black text-red-600">{damagePieces}</div>
              </div>
              <div className="bg-red-50/70 p-4 rounded-xl border border-red-100">
                <span className="text-[10px] text-red-500 uppercase font-bold">Damage (Today)</span>
                <div className="text-2xl font-black text-red-600">{productionKpis?.damage_today ?? 0}</div>
              </div>
              <div className="bg-purple-50/70 p-4 rounded-xl border border-purple-100">
                <span className="text-[10px] text-purple-500 uppercase font-bold">Rework (Total)</span>
                <div className="text-2xl font-black text-purple-700">{reworkPieces}</div>
              </div>
              <div className="bg-purple-50/70 p-4 rounded-xl border border-purple-100">
                <span className="text-[10px] text-purple-500 uppercase font-bold">Rework (Today)</span>
                <div className="text-2xl font-black text-purple-700">{productionKpis?.rework_today ?? 0}</div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-amber-800">Per-piece damage drill-down is not available yet</p>
                <p className="text-[11px] text-amber-700 mt-1">
                  {meta?.unsupported?.damage_tracking || 'No damage state or PieceDamage table exists in the schema yet.'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ====================================================================
           TAB 7: LOSS, WASTE & ANALYTICS (DCM)
           ==================================================================== */}
      {activeTab === 'tab-analytics' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-5">
          <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Waste breakdown — genuinely unsupported */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
              <h3 className="text-sm font-extrabold text-slate-900 mb-1">Leather Waste Loss Breakdown (DCM)</h3>
              <p className="text-xs text-slate-500 mb-4">Total waste distribution across patterns, trimmings, and flaws</p>
              <div className="flex-1 flex flex-col items-center justify-center gap-3 py-10">
                <NotAvailableBadge label="Waste tracking not available yet" />
                <p className="text-[11px] text-slate-400 text-center max-w-xs">
                  {meta?.unsupported?.expected_consumption || 'Only actual consumption is stored on the cut event; expected/waste needs a BOM baseline.'}
                </p>
              </div>
            </div>

            {/* Cutter throughput within the current filter — reacts live to every active filter */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-extrabold text-slate-900 mb-1">Cutter Throughput & Leather Consumed (filtered)</h3>
              <p className="text-xs text-slate-500 mb-4">Pieces cut & DCM consumed per cutter, computed live from the currently filtered cut log</p>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredCutterChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip content={<CustomTooltip unit="" />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="pieces_cut" name="Pieces Cut" fill="#2563eb" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="dcm_consumed" name="DCM Consumed" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {filteredCutterChartData.length === 0 && (
                <p className="text-center text-xs text-slate-400 font-medium py-4">No cut events match the current filters.</p>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* ====================================================================
           TAB 8: TRACEABILITY FLOW
           ==================================================================== */}
      {activeTab === 'tab-flow' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">End-to-End Factory Traceability Flow</h3>
            <p className="text-xs text-slate-500">Direct relationship: Order &rarr; Style &rarr; Leather Lot &rarr; Cutter &rarr; Piece &rarr; Consumption (DCM)</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {[
              { title: '1. Order', desc: currentOrder ? `${currentOrder.order_number} / ${currentOrder.client}` : '—', icon: '📦', color: 'bg-blue-50 text-blue-700' },
              { title: '2. Style', desc: currentOrder?.styles?.[0] ? `${currentOrder.styles[0].style_name} (${currentOrder.styles[0].article || '—'})` : '—', icon: '👗', color: 'bg-purple-50 text-purple-700' },
              { title: '3. Leather Lot', desc: lotsList[0] ? `${lotsList[0].article} · ${lotsList[0].colour}` : '—', icon: '🧵', color: 'bg-emerald-50 text-emerald-700' },
              { title: '4. Cutting', desc: cuttersList.length ? cuttersList.slice(0, 2).map((c) => c.name).join(' / ') : '—', icon: '✂️', color: 'bg-amber-50 text-amber-700' },
              { title: '5. Completion', desc: `${overallCompleted} / ${totalOrderPieces} completed`, icon: '✅', color: 'bg-green-50 text-green-700' },
            ].map((step, i) => (
              <div key={i} className={`p-4 rounded-xl border border-slate-100 ${step.color} flex flex-col justify-between`}>
                <div className="text-2xl mb-2">{step.icon}</div>
                <div>
                  <h5 className="font-extrabold text-xs">{step.title}</h5>
                  <p className="text-[10px] font-mono mt-0.5 opacity-80">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ====================================================================
           MODAL 1: PIECE INSPECTOR
           ==================================================================== */}
      <AnimatePresence>
        {selectedPieceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 overflow-hidden"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Piece Inspector</span>
                  <h3 className="text-base font-mono font-black text-slate-900">{selectedPieceModal.piece_code}</h3>
                </div>
                <button onClick={() => setSelectedPieceModal(null)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-600">Current Stage:</span>
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-blue-100 text-blue-800">{formatStage(selectedPieceModal.stage || selectedPieceModal.current_stage)}</span>
                <span className="text-xs text-slate-400 font-semibold">Last worked: {selectedPieceModal.work_date || selectedPieceModal.last_worked || '—'}</span>
              </div>

              <div className="grid grid-cols-3 gap-3 p-4 bg-[#f8fafc] rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Actual Consumed</span>
                  <p className="text-base font-mono font-black text-[#2563eb]">
                    {typeof selectedPieceModal.actual_consumption === 'number' ? `${selectedPieceModal.actual_consumption} DCM` : '—'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Expected Target</span>
                  {typeof selectedPieceModal.expected_consumption === 'number'
                    ? <p className="text-base font-mono font-black text-slate-800">{selectedPieceModal.expected_consumption} DCM</p>
                    : <NotAvailableBadge label="N/A" />}
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Variance</span>
                  {typeof selectedPieceModal.variance === 'number'
                    ? <p className="text-base font-mono font-black text-emerald-600">{selectedPieceModal.variance} DCM</p>
                    : <NotAvailableBadge label="N/A" />}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold space-y-0.5">
                <p>Order: <strong>{selectedPieceModal.order_number}</strong> &bull; Style: <strong>{selectedPieceModal.style}</strong> &bull; Size: <strong>{selectedPieceModal.size}</strong></p>
                <p>Cutter: <strong>{selectedPieceModal.employee}</strong> &bull; Leather: <strong>{selectedPieceModal.leather_article || '—'} / {selectedPieceModal.colour || '—'}</strong></p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ====================================================================
           MODAL 2: CUTTER PIECES (from /dashboard/cutting/employees/{id})
           ==================================================================== */}
      <AnimatePresence>
        {selectedCutterModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] flex items-center justify-center text-white font-black text-xs">
                    {initials(selectedCutterModal.name)}
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">{selectedCutterModal.name}</h3>
                    <p className="text-xs text-slate-500">{selectedCutterModal.designation || '—'} &bull; Assigned Pieces: {selectedCutterModal.assigned_pieces ?? 0}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedCutterModal(null)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-y-auto max-h-[300px]">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-[#f8fafc] text-slate-600 font-bold border-y border-slate-200">
                      <th className="py-2.5 px-3 text-right">Seq</th>
                      <th className="py-2.5 px-3">Piece Code</th>
                      <th className="py-2.5 px-3">Style</th>
                      <th className="py-2.5 px-3">Size / Colour</th>
                      <th className="py-2.5 px-3 text-center">Stage</th>
                      <th className="py-2.5 px-3 text-right">Last Worked</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedCutterPieces.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-right font-mono text-slate-400">{p.seq}</td>
                        <td className="py-2 px-3 font-mono font-bold">{p.piece_code}</td>
                        <td className="py-2 px-3">{p.style}</td>
                        <td className="py-2 px-3">{p.size} / {p.colour}</td>
                        <td className="py-2 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">{formatStage(p.current_stage)}</span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-500">{p.last_worked}</td>
                      </tr>
                    ))}
                    {!selectedCutterPiecesLoading && selectedCutterPieces.length === 0 && (
                      <tr><td colSpan={6} className="text-center py-8 text-slate-400 font-medium">No pieces returned for this cutter.</td></tr>
                    )}
                    {selectedCutterPiecesLoading && (
                      <tr><td colSpan={6} className="text-center py-8 text-slate-400 font-medium">Loading…</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ====================================================================
           MODAL 3: LEATHER LOT TRACEABILITY
           ==================================================================== */}
      <AnimatePresence>
        {selectedLotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Leather Lot Specification</span>
                  <h3 className="text-sm font-mono font-extrabold text-blue-600">{selectedLotModal.lot_id}</h3>
                </div>
                <button onClick={() => setSelectedLotModal(null)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs font-semibold">
                {[
                  ['Article', selectedLotModal.article],
                  ['Colour', selectedLotModal.colour],
                  ['Thickness', selectedLotModal.thickness],
                  ['Leather Type', selectedLotModal.leather_type],
                  ['UOM', selectedLotModal.uom],
                  ['Available', `${selectedLotModal.available ?? 0} DCM`],
                  ['Consumed', `${selectedLotModal.consumed ?? 0} DCM`],
                  ['Remaining', `${selectedLotModal.remaining ?? 0} DCM`],
                  ['Pieces Cut', selectedLotModal.pieces_cut ?? 0],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">{label}:</span>
                    <span className="font-mono font-bold text-slate-900">{value}</span>
                  </div>
                ))}
                <div className="flex justify-between py-1.5 border-b border-slate-100 items-center">
                  <span className="text-slate-500">Allocated:</span>
                  <NotAvailableBadge />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default function CuttingManagerDashboard() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center text-[#2563eb]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563eb] mx-auto mb-3"></div>
            <p className="font-semibold text-xs tracking-widest uppercase">Loading Cutting Dashboard...</p>
          </div>
        </div>
      }
    >
      <DashboardInner />
    </Suspense>
  );
}
