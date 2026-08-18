'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Waypoints,
  AlertTriangle,
  Search,
  Download,
  Filter,
  X,
  Zap,
  Info,
  CheckCircle2,
  Tag,
  ArrowRight,
  User,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { useAuth } from '@/context/AuthContext';
import {
  apiGetStitchingDashboard,
  apiGetStitchingEmployeeDetail,
  apiGetStitchingPieceDetail,
} from '@/lib/api';

// ─── Interactive Monthly Calendar Filter Picker ───
function CompleteDateCalendarPicker({ selectedDate, onSelectDate, availableDates = [], themeColor = '#4f46e5' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => new Date(2026, 7, 1));

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const handlePrevMonth = (e) => { e.stopPropagation(); setCurrentMonth(new Date(year, month - 1, 1)); };
  const handleNextMonth = (e) => { e.stopPropagation(); setCurrentMonth(new Date(year, month + 1, 1)); };

  const isSelected = (dayStr) => selectedDate === dayStr;
  const hasActivity = (dayStr) => availableDates.includes(dayStr);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:border-indigo-500 focus:outline-none flex items-center justify-between gap-1 shadow-sm transition-all cursor-pointer"
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
              className={`px-2 py-1 rounded-lg transition-all ${selectedDate === 'all' ? 'bg-[#4f46e5] text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
            >
              All Dates
            </button>
            <button
              onClick={() => { onSelectDate(new Date().toISOString().slice(0, 10)); setIsOpen(false); }}
              className={`px-2 py-1 rounded-lg transition-all ${selectedDate === new Date().toISOString().slice(0, 10) ? 'bg-[#4f46e5] text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
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
              const activity = hasActivity(dayStr);
              return (
                <button
                  key={d}
                  onClick={() => { onSelectDate(dayStr); setIsOpen(false); }}
                  className={`p-1.5 rounded-xl font-bold transition-all relative flex flex-col items-center justify-center ${
                    active
                      ? 'bg-[#4f46e5] text-white shadow-md scale-105 font-black'
                      : activity
                      ? 'bg-indigo-50 text-indigo-900 hover:bg-indigo-100 font-extrabold'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <span>{d}</span>
                  {activity && !active && <span className="w-1 h-1 rounded-full bg-[#4f46e5] mt-0.5"></span>}
                </button>
              );
            })}
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold text-slate-400">Pick any date:</span>
            <input
              type="date"
              value={selectedDate === 'all' ? '' : selectedDate}
              onChange={(e) => { onSelectDate(e.target.value || 'all'); if (e.target.value) setIsOpen(false); }}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 focus:outline-none focus:border-indigo-600 cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function CustomTooltip({ active, payload, label, unit = 'pcs' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1e293b] border border-slate-700 text-white px-3.5 py-2.5 rounded-xl text-xs shadow-2xl z-50">
      {label && <p className="text-[10px] font-black uppercase tracking-wider text-[#818cf8] mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="font-semibold flex items-center justify-between gap-4" style={{ color: p.color || p.fill }}>
          <span>{p.name}:</span>
          <span className="text-white font-mono font-bold">{p.value} {unit}</span>
        </p>
      ))}
    </div>
  );
}

// Badge shown instead of a fabricated number wherever the backend has explicitly
// flagged a field as unsupported (see meta.unsupported on GET /dashboard/stitching).
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

function InfoNote({ children }) {
  return (
    <div className="flex items-start gap-2 bg-indigo-50/70 border border-indigo-100 rounded-xl px-3 py-2 text-[11px] text-indigo-800 font-medium leading-relaxed">
      <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-indigo-500" />
      <span>{children}</span>
    </div>
  );
}

function formatStage(stage) {
  if (!stage) return '—';
  return stage.replace(/_/g, ' ');
}

function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts.slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

// Canonical order per the backend (ProductionStage.leather_chain sequences FUSING
// before PASTING — see meta.unsupported.chain_order): the events actually happen
// Fusing → Pasting, not Pasting → Fusing, so every stage-ordered list/chart follows this.
const PIPELINE_STAGE_ORDER = ['FUSING', 'PASTING', 'LINE_STITCHING', 'SHELL_STITCHING', 'FINAL_FINISH'];

function sortByCanonicalStageOrder(list, stageKey = 'stage') {
  return [...list].sort((a, b) => {
    const ai = PIPELINE_STAGE_ORDER.indexOf(a[stageKey]);
    const bi = PIPELINE_STAGE_ORDER.indexOf(b[stageKey]);
    return (ai === -1 ? PIPELINE_STAGE_ORDER.length : ai) - (bi === -1 ? PIPELINE_STAGE_ORDER.length : bi);
  });
}

function StitchingDashboardContent() {
  const searchParams = useSearchParams();
  const { token } = useAuth();

  const [activeTab, setActiveTab] = useState('tab-today');

  // ── Raw state from GET /api/v1/dashboard/stitching — no mock fallbacks. ──
  const [meta, setMeta] = useState(null);
  const [kpis, setKpis] = useState(null);
  const [stages, setStages] = useState([]);
  const [storeHandoff, setStoreHandoff] = useState(null);
  const [currentStyle, setCurrentStyle] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [dailyProduction, setDailyProduction] = useState([]);
  const [orderProgress, setOrderProgress] = useState([]);

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  // ── Piece-level lookup, from GET /api/v1/dashboard/stitching/pieces/{piece_code} ──
  const [pieceSearchInput, setPieceSearchInput] = useState('');
  const [pieceSearchedCode, setPieceSearchedCode] = useState(null);
  const [pieceSearchResults, setPieceSearchResults] = useState([]);
  const [pieceSearchLoading, setPieceSearchLoading] = useState(false);
  const [pieceSearchError, setPieceSearchError] = useState(null);

  // ── Employee piece trace, from GET /api/v1/dashboard/stitching/employees/{employee_id} ──
  const [selectedEmployeeModal, setSelectedEmployeeModal] = useState(null);
  const [employeeTrace, setEmployeeTrace] = useState(null);
  const [employeeTraceLoading, setEmployeeTraceLoading] = useState(false);
  const [employeeTraceError, setEmployeeTraceError] = useState(null);

  // Universal Filters
  const [filterDate, setFilterDate] = useState('all');
  const [filterOrder, setFilterOrder] = useState('all');
  const [filterStyle, setFilterStyle] = useState('all');
  const [filterStage, setFilterStage] = useState('all');
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedStageDetail, setSelectedStageDetail] = useState(null);
  const [selectedOrderRow, setSelectedOrderRow] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Pagination
  const [orderPage, setOrderPage] = useState(1);
  const [orderPageSize] = useState(10);
  const [empPage, setEmpPage] = useState(1);
  const [empPageSize] = useState(10);

  // Sync tab from URL query params
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) setActiveTab(tabParam);
  }, [searchParams]);

  // ── LIVE BACKEND CALL: GET /api/v1/dashboard/stitching ──
  useEffect(() => {
    let isMounted = true;
    async function fetchStitchingDashboard() {
      if (!token) return;
      try {
        setLoading(true);
        setApiError(null);
        const params = {};
        if (filterOrder !== 'all') params.order_id = filterOrder;
        const data = await apiGetStitchingDashboard(token, params);
        if (!isMounted || !data) return;
        setMeta(data.meta || null);
        setKpis(data.kpis || null);
        setStages(Array.isArray(data.stages) ? data.stages : []);
        setStoreHandoff(data.store_handoff || null);
        setCurrentStyle(data.current_style || null);
        setEmployees(Array.isArray(data.employees) ? data.employees : []);
        setDailyProduction(Array.isArray(data.daily_production) ? data.daily_production : []);
        setOrderProgress(Array.isArray(data.order_progress) ? data.order_progress : []);
      } catch (err) {
        console.warn('Backend API /api/v1/dashboard/stitching notice:', err.message);
        if (isMounted) setApiError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchStitchingDashboard();
    return () => { isMounted = false; };
  }, [token, filterOrder]);

  // Toast helper
  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setFilterDate('all');
    setFilterOrder('all');
    setFilterStyle('all');
    setFilterStage('all');
    setFilterEmployee('all');
    setSearchQuery('');
    triggerToast('Filters reset to default view');
  };

  // Handler to inspect an operator and call GET /api/v1/dashboard/stitching/employees/{employee_id}
  const handleOpenEmployeeModal = async (emp) => {
    setSelectedEmployeeModal(emp);
    setEmployeeTrace(null);
    setEmployeeTraceError(null);
    if (!token || !emp?.employee_id) return;
    try {
      setEmployeeTraceLoading(true);
      const detail = await apiGetStitchingEmployeeDetail(token, emp.employee_id);
      setEmployeeTrace(detail || null);
    } catch (err) {
      console.warn(`Backend API /api/v1/dashboard/stitching/employees/${emp.employee_id} notice:`, err.message);
      setEmployeeTraceError(err.message);
    } finally {
      setEmployeeTraceLoading(false);
    }
  };

  // Handler to look up a piece batch via GET /api/v1/dashboard/stitching/pieces/{piece_code}
  const handlePieceSearch = async (codeOverride) => {
    const code = (codeOverride ?? pieceSearchInput).trim();
    if (!code || !token) return;
    try {
      setPieceSearchLoading(true);
      setPieceSearchError(null);
      const data = await apiGetStitchingPieceDetail(token, code);
      setPieceSearchResults(Array.isArray(data) ? data : []);
      setPieceSearchedCode(code);
      setPieceSearchInput(code);
    } catch (err) {
      console.warn(`Backend API /api/v1/dashboard/stitching/pieces/${code} notice:`, err.message);
      setPieceSearchError(err.message);
      setPieceSearchResults([]);
    } finally {
      setPieceSearchLoading(false);
    }
  };

  // ── Filter option sources — all derived from real response arrays. ──
  const ordersList = useMemo(() => {
    const map = new Map();
    orderProgress.forEach((r) => {
      if (!r.order_id || map.has(r.order_id)) return;
      map.set(r.order_id, { id: r.order_id, order_number: r.order_number });
    });
    if (currentStyle?.order_id && !map.has(currentStyle.order_id)) {
      map.set(currentStyle.order_id, { id: currentStyle.order_id, order_number: currentStyle.order_number });
    }
    return Array.from(map.values());
  }, [orderProgress, currentStyle]);

  const availableStyles = useMemo(() => {
    const map = new Map();
    orderProgress.forEach((s) => {
      if (s.style_name) map.set(s.style_name, { id: s.style_id || s.style_name, name: s.style_name });
    });
    if (currentStyle?.style) map.set(currentStyle.style, { id: currentStyle.style_id, name: currentStyle.style });
    return Array.from(map.values());
  }, [orderProgress, currentStyle]);

  const availableStages = useMemo(() => {
    const set = new Set();
    stages.forEach((s) => s.stage && set.add(s.stage));
    employees.forEach((e) => e.stage && set.add(e.stage));
    dailyProduction.forEach((d) => d.stage && set.add(d.stage));
    return Array.from(set);
  }, [stages, employees, dailyProduction]);

  const availableEmployees = useMemo(() => {
    const map = new Map();
    employees.forEach((e) => {
      if (e.employee_id && !map.has(e.employee_id)) map.set(e.employee_id, { id: e.employee_id, name: e.name });
    });
    return Array.from(map.values());
  }, [employees]);

  const availableDates = useMemo(
    () => Array.from(new Set(dailyProduction.map((d) => d.work_date).filter(Boolean))),
    [dailyProduction]
  );

  // ── Order & Style Progress (order_progress spans every order/style, not just the selected one) ──
  const filteredOrderProgress = useMemo(() => {
    return orderProgress.filter((r) => {
      if (filterOrder !== 'all' && r.order_id !== filterOrder) return false;
      if (filterStyle !== 'all' && r.style_name !== filterStyle) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const hay = `${r.order_number || ''} ${r.style_name || ''} ${r.article || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [orderProgress, filterOrder, filterStyle, searchQuery]);

  const paginatedOrderProgress = useMemo(() => {
    const start = (orderPage - 1) * orderPageSize;
    return filteredOrderProgress.slice(start, start + orderPageSize);
  }, [filteredOrderProgress, orderPage, orderPageSize]);

  const totalOrderPages = Math.ceil(filteredOrderProgress.length / orderPageSize) || 1;

  // ── Real order/style-scoped snapshot for the hero banner & KPI 1, built from
  // the SAME filtered rows as the Order & Style Progress tab — so picking an
  // Order and/or Style actually changes what the hero shows, instead of the
  // hero staying pinned to whatever single style the backend's `current_style`
  // happens to spotlight. ──
  const heroFilterActive = filterOrder !== 'all' || filterStyle !== 'all' || searchQuery !== '';

  const heroAggregate = useMemo(() => {
    if (!heroFilterActive) return null;
    const rows = filteredOrderProgress;
    if (rows.length === 0) return { empty: true, rowCount: 0 };
    const totals = rows.reduce(
      (acc, r) => {
        acc.total_ordered += r.total_ordered || 0;
        acc.minted += r.minted || 0;
        acc.completed += r.completed || 0;
        acc.pending += r.pending || 0;
        return acc;
      },
      { total_ordered: 0, minted: 0, completed: 0, pending: 0 }
    );
    const completion_pct = totals.total_ordered ? Math.round((totals.completed / totals.total_ordered) * 100) : 0;
    const uniqueStyles = Array.from(new Set(rows.map((r) => r.style_name).filter(Boolean)));
    const uniqueOrders = Array.from(new Set(rows.map((r) => r.order_number).filter(Boolean)));
    const uniqueArticles = Array.from(new Set(rows.map((r) => r.article).filter(Boolean)));
    return {
      empty: false,
      rowCount: rows.length,
      ...totals,
      completion_pct,
      styleLabel: uniqueStyles.length === 1 ? uniqueStyles[0] : `${uniqueStyles.length} styles`,
      orderLabel: uniqueOrders.length === 1 ? uniqueOrders[0] : `${uniqueOrders.length} orders`,
      articleLabel: uniqueArticles.length === 1 ? uniqueArticles[0] : uniqueArticles.length > 1 ? `${uniqueArticles.length} articles` : '—',
      matchesCurrentStyle:
        uniqueStyles.length === 1 &&
        uniqueOrders.length === 1 &&
        currentStyle?.style === uniqueStyles[0] &&
        currentStyle?.order_number === uniqueOrders[0],
    };
  }, [heroFilterActive, filteredOrderProgress, currentStyle]);

  const delayBadgeCls = (status) => {
    if (!status) return 'bg-slate-100 text-slate-500';
    const s = status.toUpperCase();
    if (s.includes('DELAY')) return 'bg-red-100 text-red-800';
    if (s.includes('ON_TRACK') || s.includes('ONTRACK')) return 'bg-emerald-100 text-emerald-800';
    if (s.includes('NO_DEADLINE')) return 'bg-slate-100 text-slate-500';
    return 'bg-blue-100 text-blue-800';
  };

  // ── Stage pipeline, in canonical order: FUSING → PASTING → LINE_STITCHING → SHELL_STITCHING → FINAL_FINISH ──
  const filteredStages = useMemo(
    () => sortByCanonicalStageOrder(stages.filter((s) => filterStage === 'all' || s.stage === filterStage)),
    [stages, filterStage]
  );

  // Backlog size only — NOT a bottleneck. A real bottleneck means a stage is falling
  // behind its expected pace (target vs. time elapsed), which this dashboard doesn't
  // have the data to compute yet. This just flags stages with a large pending queue.
  const isHighBacklog = (s) => {
    const total = s.total_received || 0;
    const pending = s.pending_pieces || 0;
    return total > 0 && pending >= 5 && pending / total > 0.3;
  };

  const highBacklogStage = useMemo(() => {
    const candidates = stages.filter(isHighBacklog).sort((a, b) => (b.pending_pieces || 0) - (a.pending_pieces || 0));
    return candidates[0] || null;
  }, [stages]);

  // ── Employees (denormalized: one row per employee per stage) ──
  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      if (filterStage !== 'all' && e.stage !== filterStage) return false;
      if (filterEmployee !== 'all' && e.employee_id !== filterEmployee) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!(e.name || '').toLowerCase().includes(q) && !(e.designation || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [employees, filterStage, filterEmployee, searchQuery]);

  const paginatedEmployees = useMemo(() => {
    const start = (empPage - 1) * empPageSize;
    return filteredEmployees.slice(start, start + empPageSize);
  }, [filteredEmployees, empPage, empPageSize]);

  const totalEmpPages = Math.ceil(filteredEmployees.length / empPageSize) || 1;

  // Real per-operator aggregate, summed across every stage they appear in.
  const employeeAggregates = useMemo(() => {
    const map = new Map();
    filteredEmployees.forEach((e) => {
      if (!e.employee_id) return;
      if (!map.has(e.employee_id)) {
        map.set(e.employee_id, {
          employee_id: e.employee_id,
          name: e.name,
          designation: e.designation,
          assigned: 0,
          completed: 0,
          reworkToday: 0,
          stageCount: 0,
        });
      }
      const agg = map.get(e.employee_id);
      agg.assigned += e.assigned_pieces || 0;
      agg.completed += e.completed_pieces || 0;
      agg.reworkToday += e.rework_today || 0;
      agg.stageCount += 1;
    });
    return Array.from(map.values()).sort((a, b) => b.assigned - a.assigned);
  }, [filteredEmployees]);

  // Real single-operator snapshot, summed across every stage row that operator
  // appears in — drives the "Selected Operator" spotlight on Today & Employee tabs
  // whenever the Operator filter is set.
  const selectedEmployeeSnapshot = useMemo(() => {
    if (filterEmployee === 'all') return null;
    const rows = employees.filter((e) => e.employee_id === filterEmployee);
    if (rows.length === 0) return null;
    const totals = rows.reduce(
      (acc, r) => {
        acc.assigned += r.assigned_pieces || 0;
        acc.completed += r.completed_pieces || 0;
        acc.assignedToday += r.assigned_today || 0;
        acc.completedToday += r.completed_today || 0;
        acc.reworkToday += r.rework_today || 0;
        return acc;
      },
      { assigned: 0, completed: 0, assignedToday: 0, completedToday: 0, reworkToday: 0 }
    );
    return {
      name: rows[0].name,
      designation: rows[0].designation,
      photo: rows[0].photo,
      stages: rows.map((r) => ({ stage: r.stage, label: r.label || formatStage(r.stage), assigned: r.assigned_pieces || 0, completed: r.completed_pieces || 0 })),
      ...totals,
    };
  }, [employees, filterEmployee]);

  // ── Daily production, pivoted from GET response's flat (work_date, stage, completed) rows ──
  const filteredDailyProduction = useMemo(() => {
    return dailyProduction.filter((d) => {
      if (filterDate !== 'all' && d.work_date !== filterDate) return false;
      if (filterStage !== 'all' && d.stage !== filterStage) return false;
      return true;
    });
  }, [dailyProduction, filterDate, filterStage]);

  const dailyChartData = useMemo(() => {
    const map = new Map();
    filteredDailyProduction.forEach((d) => {
      if (!map.has(d.work_date)) {
        const row = { work_date: d.work_date, total: 0 };
        PIPELINE_STAGE_ORDER.forEach((s) => { row[s] = 0; });
        map.set(d.work_date, row);
      }
      const row = map.get(d.work_date);
      if (row[d.stage] !== undefined) row[d.stage] += d.completed || 0;
      row.total += d.completed || 0;
    });
    return Array.from(map.values()).sort((a, b) => a.work_date.localeCompare(b.work_date));
  }, [filteredDailyProduction]);

  const stageTrendChartData = dailyChartData;

  const avgDailyCompleted = useMemo(() => {
    if (dailyChartData.length === 0) return null;
    return dailyChartData.reduce((acc, d) => acc + d.total, 0) / dailyChartData.length;
  }, [dailyChartData]);

  // CSV export of the currently filtered Order & Style Progress table — the
  // largest real multi-order list this endpoint exposes.
  const handleExportCSV = () => {
    const headers = [
      'Order #', 'Style', 'Article', 'Order Date', 'Delivery Deadline',
      'Total Ordered', 'Minted', 'Completed', 'Pending', 'Completion %', 'Delay Status',
    ];
    const rows = filteredOrderProgress.map((r) => [
      r.order_number, r.style_name, r.article, r.order_date, r.delivery_deadline,
      r.total_ordered, r.minted, r.completed, r.pending, r.completion_pct, r.delay_status,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((v) => (v ?? '')).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Stitching_Order_Style_Progress_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('📥 Stitching Order & Style Progress CSV Downloaded');
  };

  // ── Top-line numbers, always from the real kpis object — never fabricated. ──
  const overallPieces = kpis?.overall_pieces ?? 0;
  const assignedPieces = kpis?.assigned_pieces ?? 0;
  const overallCompleted = kpis?.overall_completed ?? 0;
  const overallPending = kpis?.overall_pending ?? 0;
  const damagePieces = kpis?.damage_pieces ?? 0;
  const reworkPieces = kpis?.rework_pieces ?? 0;
  const completionPct = overallPieces ? Math.round((overallCompleted / overallPieces) * 100) : 0;

  // daily_production / stages / employees only carry a stage+date (or stage+employee)
  // dimension, never style — this label makes that scope explicit wherever those
  // collections are charted, instead of implying the Style/Operator filters apply there.
  const activeOrderLabel = filterOrder !== 'all' ? (ordersList.find((o) => o.id === filterOrder)?.order_number || filterOrder) : 'all orders';

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
            <Zap className="w-4 h-4 text-[#818cf8] animate-pulse" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── TOP ACTION BANNER ─── */}
      <div className="w-full bg-white p-5 rounded-2xl border border-[#e8edf3] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#4f46e5] to-[#4338ca] flex items-center justify-center text-white shadow-md">
            <Waypoints className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-[#1e293b] tracking-tight">Stitching Floor Operations Dashboard</h1>
            <p className="text-xs text-[#64748b] font-medium">Pre-Store: <strong className="text-[#4f46e5]">Fusing &rarr; Pasting</strong> &bull; Post-Store: <strong className="text-[#4f46e5]">Line Stitch &rarr; Shell Stitch &rarr; Final Finish</strong></p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#f8fafc] text-slate-700 border border-slate-200 text-xs font-bold hover:bg-slate-100 transition-all"
            title="Export currently loaded order & style progress to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-slate-200 text-xs text-slate-500 font-semibold">
            {loading ? (
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

      {/* ─── UNIVERSAL MULTI-FILTER TOOLBAR ─── */}
      <section className="w-full bg-white p-4 rounded-2xl border border-[#e8edf3] shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#1e293b] uppercase tracking-wider">
            <Filter className="w-4 h-4 text-[#4f46e5]" />
            <span>Universal Operations Cross-Filter</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#e0e7ff] text-[#3730a3] border border-[#c7d2fe]">
              Showing {filteredOrderProgress.length} of {orderProgress.length} order/style rows
            </span>
            <button onClick={handleResetFilters} className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer">
              Reset All
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-2">
          {/* Quick Search */}
          <div className="relative col-span-2 sm:col-span-3 lg:col-span-2 xl:col-span-2">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search order, style, operator..."
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4f46e5]"
            />
          </div>

          {/* Date Filter (production log dates) */}
          <div>
            <CompleteDateCalendarPicker
              selectedDate={filterDate}
              onSelectDate={(d) => setFilterDate(d)}
              availableDates={availableDates}
              themeColor="#4f46e5"
            />
          </div>

          {/* Order Filter (server-side: order_id) */}
          <div>
            <select
              value={filterOrder}
              onChange={(e) => { setFilterOrder(e.target.value); setOrderPage(1); }}
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#4f46e5]"
            >
              <option value="all">📦 All Orders</option>
              {ordersList.map((ord, idx) => (
                <option key={`ord-opt-${ord.id}-${idx}`} value={ord.id}>PO: {ord.order_number}</option>
              ))}
            </select>
          </div>

          {/* Style Filter (client-side) */}
          <div>
            <select
              value={filterStyle}
              onChange={(e) => { setFilterStyle(e.target.value); setOrderPage(1); }}
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#4f46e5]"
            >
              <option value="all">👗 All Styles</option>
              {availableStyles.map((s, idx) => (
                <option key={`style-opt-${s.id || s.name}-${idx}`} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Stage Filter */}
          <div>
            <select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#4f46e5]"
            >
              <option value="all">🪡 All Stages</option>
              {availableStages.map((st, idx) => (
                <option key={`stage-opt-${st}-${idx}`} value={st}>{formatStage(st)}</option>
              ))}
            </select>
          </div>

          {/* Operator Filter */}
          <div>
            <select
              value={filterEmployee}
              onChange={(e) => { setFilterEmployee(e.target.value); setEmpPage(1); }}
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#4f46e5]"
            >
              <option value="all">👷 All Operators</option>
              {availableEmployees.map((emp, idx) => (
                <option key={`emp-opt-${emp.id}-${idx}`} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* ─── NAVIGATION TABS BAR ─── */}
      <div className="w-full flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-[#e8edf3] shadow-sm overflow-x-auto">
        {[
          { id: 'tab-today', label: "📌 Today's Priority" },
          { id: 'tab-stages', label: '🪡 Stage-Wise & Pending Backlog' },
          { id: 'tab-store', label: '🏬 Store Handoff & Drawers' },
          { id: 'tab-orders', label: '👗 Order & Style Progress' },
          { id: 'tab-employees', label: '👷 Employee by Stage' },
          { id: 'tab-pieces', label: '🏷️ Piece Tracker' },
          { id: 'tab-damage', label: '⚠️ Damage & Rework' },
          { id: 'tab-analytics', label: '📉 Stage Analytics' },
          { id: 'tab-flow', label: '🔄 Traceability Flow' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === tab.id ? 'bg-[#1e293b] text-white shadow-md' : 'text-slate-600 hover:text-slate-900 hover:bg-[#f8fafc]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ====================================================================
           TAB 1: TODAY'S PRIORITY
           ==================================================================== */}
      {activeTab === 'tab-today' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-5">
          {/* CURRENT STYLE HERO BANNER */}
          <div className="w-full bg-gradient-to-br from-white via-[#f8fafc] to-[#eef2ff] border border-indigo-200/70 rounded-3xl p-6 shadow-sm grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="flex flex-col justify-between space-y-4">
              {heroFilterActive ? (
                heroAggregate?.empty ? (
                  <div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-slate-100 text-slate-500">No match</span>
                    <p className="text-xs font-semibold text-slate-500 mt-2">No order/style rows match the current filter.</p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-indigo-100 text-indigo-800">
                        {heroAggregate.orderLabel}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">Article: <strong>{heroAggregate.articleLabel}</strong></span>
                    </div>
                    <h2 className="text-2xl font-black text-[#1e293b] tracking-tight">{heroAggregate.styleLabel}</h2>
                    <p className="text-xs font-semibold text-slate-600 mt-0.5">
                      {heroAggregate.total_ordered} pcs ordered across {heroAggregate.rowCount} {heroAggregate.rowCount === 1 ? 'row' : 'rows'} &bull; filtered live from order_progress
                    </p>
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      <div className="bg-white border border-slate-100 rounded-lg px-2 py-1.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Completed</span>
                        <div className="text-sm font-black text-emerald-700">{heroAggregate.completed}</div>
                      </div>
                      <div className="bg-white border border-slate-100 rounded-lg px-2 py-1.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Pending</span>
                        <div className="text-sm font-black text-amber-700">{heroAggregate.pending}</div>
                      </div>
                      <div className="bg-white border border-slate-100 rounded-lg px-2 py-1.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Completion</span>
                        <div className="text-sm font-black text-indigo-700">{heroAggregate.completion_pct}%</div>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-indigo-100 text-indigo-800">
                      {currentStyle?.order_number || '—'}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">Article: <strong>{currentStyle?.article || '—'}</strong></span>
                  </div>
                  <h2 className="text-2xl font-black text-[#1e293b] tracking-tight">{currentStyle?.style || '—'}</h2>
                  <p className="text-xs font-semibold text-slate-600 mt-0.5">{currentStyle?.total_pieces ?? 0} pcs in this style &bull; backend spotlight (unfiltered view)</p>
                </div>
              )}

              {/* Real per-stage funnel for the current style, incl. CUTTING & FINAL_INSPECTION
                  which the top-level `stages` list does not carry. Backend only spotlights ONE
                  style at a time, so this funnel is only shown when it actually matches the
                  active Order/Style filter (or when no filter is applied). */}
              <div className="pt-4 border-t border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Style Pipeline (live counts)</span>
                {(!heroFilterActive || heroAggregate?.matchesCurrentStyle) ? (
                  <>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      {(currentStyle?.stages || []).map((s, idx) => (
                        <span key={`${s.stage}-${idx}`} className="inline-flex items-center gap-1">
                          <span className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-[10px] font-bold text-slate-700">
                            {s.label || formatStage(s.stage)} <strong className="text-indigo-600">{s.count}</strong>
                          </span>
                          {idx < (currentStyle?.stages || []).length - 1 && <ArrowRight className="w-3 h-3 text-slate-300" />}
                        </span>
                      ))}
                      {(!currentStyle?.stages || currentStyle.stages.length === 0) && (
                        <span className="text-xs text-slate-400">No pipeline data yet</span>
                      )}
                    </div>
                    {meta?.unsupported?.chain_order && (
                      <p className="text-[10px] text-slate-400 mt-1.5 italic">Note: {meta.unsupported.chain_order}</p>
                    )}
                  </>
                ) : (
                  <p className="text-[11px] text-slate-500 mt-1.5 italic">
                    Backend only exposes a full CUTTING→FINISH stage pipeline for one spotlighted style at a time ({currentStyle?.style || '—'}, PO {currentStyle?.order_number || '—'}) — not the current filter. Clear filters to view it.
                  </p>
                )}
              </div>
            </div>

            {/* Middle Col: Daily pacing */}
            <div className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-2xl p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Daily Pacing (avg)</span>
              </div>
              <div className="grid grid-cols-2 gap-3 my-3">
                <div className="bg-[#f8fafc] p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-500">Avg Daily Completed</span>
                  <div className="text-lg font-black text-slate-900">{avgDailyCompleted !== null ? avgDailyCompleted.toFixed(1) : '—'} pcs</div>
                </div>
                <div className="bg-[#f8fafc] p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-500">Ready for Inspection</span>
                  <div className="text-lg font-black text-slate-900">{kpis?.ready_for_inspection ?? currentStyle?.ready_for_inspection ?? 0} pcs</div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-600">Overall Completion ({meta?.scope || 'all clients'})</span>
                  <span className="text-[#4f46e5]">{completionPct}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-[#4f46e5] to-[#6366f1] h-full rounded-full transition-all duration-500" style={{ width: `${completionPct}%` }}></div>
                </div>
              </div>
            </div>

            {/* Right Col: High-backlog stage flag (pending queue size, not a real bottleneck) */}
            <div className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-2xl p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Stages With High Pending Backlog</span>
              </div>
              {highBacklogStage ? (
                <div className="bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 border-2 border-amber-400 p-3.5 rounded-xl my-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-600"></span>
                      </span>
                      <span>HIGH PENDING BACKLOG</span>
                    </div>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-600 text-white animate-pulse">Pending</span>
                  </div>
                  <div className="mt-1.5 flex items-baseline justify-between">
                    <span className="text-xs font-extrabold text-amber-950">{highBacklogStage.label || formatStage(highBacklogStage.stage)}</span>
                    <span className="text-xs font-black text-amber-700">{highBacklogStage.pending_pieces} pcs pending</span>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl my-2">
                  <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Pipeline Flow Status: Normal</span>
                  </div>
                  <p className="text-[11px] text-emerald-700 mt-1">No stage is over the backlog threshold</p>
                </div>
              )}
              <div className="flex justify-between text-xs font-semibold text-slate-600 pt-2 border-t border-slate-100">
                <span>In Store: <strong>{storeHandoff?.in_store ?? kpis?.in_store ?? 0}</strong></span>
                <span>Ready for Store: <strong className="text-emerald-700">{storeHandoff?.ready_for_store ?? kpis?.ready_for_store ?? 0}</strong></span>
              </div>
            </div>
          </div>

          {/* SELECTED OPERATOR SNAPSHOT — real per-employee totals, summed across every
              stage that operator appears in, shown whenever the Operator filter is set. */}
          {selectedEmployeeSnapshot && (
            <div className="w-full bg-white border border-indigo-200 rounded-2xl p-5 shadow-sm flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-black">
                  {initials(selectedEmployeeSnapshot.name)}
                </div>
                <div>
                  <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Selected Operator</span>
                  <h3 className="text-sm font-extrabold text-slate-900">{selectedEmployeeSnapshot.name}</h3>
                  <p className="text-[11px] text-slate-500">{selectedEmployeeSnapshot.designation}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-600 flex-1">
                <span>Assigned: <strong className="text-slate-900">{selectedEmployeeSnapshot.assigned}</strong></span>
                <span>Completed: <strong className="text-emerald-700">{selectedEmployeeSnapshot.completed}</strong></span>
                <span>Today: <strong className="text-indigo-700">{selectedEmployeeSnapshot.assignedToday} / {selectedEmployeeSnapshot.completedToday}</strong></span>
                <span>Rework Today: <strong className="text-rose-600">{selectedEmployeeSnapshot.reworkToday}</strong></span>
                <span className="flex flex-wrap gap-1.5">
                  {selectedEmployeeSnapshot.stages.map((s, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px]">{s.label}: {s.completed}/{s.assigned}</span>
                  ))}
                </span>
              </div>
            </div>
          )}

          {/* 4 TOP SUMMARY KPIS — real fields from kpis object, or the filtered
              order/style aggregate when an Order or Style filter is active. */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div onClick={() => setActiveTab('tab-orders')} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg">📦</div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                  {heroFilterActive && heroAggregate && !heroAggregate.empty ? `${heroAggregate.rowCount} rows` : `${assignedPieces} assigned`}
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {heroFilterActive ? 'Filtered Pieces (order_progress)' : `Overall Pieces (${meta?.scope || 'all clients'})`}
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900">
                  {heroFilterActive && heroAggregate && !heroAggregate.empty ? heroAggregate.total_ordered : overallPieces}
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-dashed border-slate-100 flex justify-between text-xs text-slate-600 font-semibold">
                <span>Completed: <strong className="text-emerald-600">{heroFilterActive && heroAggregate && !heroAggregate.empty ? heroAggregate.completed : overallCompleted}</strong></span>
                <span>Pending: <strong className="text-amber-600">{heroFilterActive && heroAggregate && !heroAggregate.empty ? heroAggregate.pending : overallPending}</strong></span>
              </div>
            </div>

            <div onClick={() => setActiveTab('tab-stages')} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-lg">🪡</div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700">{stages.length} stages</span>
              </div>
              <span className="text-xs font-semibold text-slate-500">Fusing Output</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900">{stages.find((s) => s.stage === 'FUSING')?.completed_pieces ?? 0} pcs</span>
              </div>
              <div className="mt-3 pt-3 border-t border-dashed border-slate-100 flex justify-between text-xs text-slate-600 font-semibold">
                <span>Pasting Done: <strong>{stages.find((s) => s.stage === 'PASTING')?.completed_pieces ?? 0}</strong></span>
                <span>Pasting Pending: <strong className="text-rose-600">{stages.find((s) => s.stage === 'PASTING')?.pending_pieces ?? 0}</strong></span>
              </div>
            </div>

            <div onClick={() => setActiveTab('tab-store')} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">🏬</div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700">Drawer Sync</span>
              </div>
              <span className="text-xs font-semibold text-slate-500">Store Handoff & Buffer</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900">{storeHandoff?.in_drawer ?? 0} in drawer</span>
              </div>
              <div className="mt-3 pt-3 border-t border-dashed border-slate-100 flex justify-between text-xs text-slate-600 font-semibold">
                <span>Sent to Store: <strong className="text-blue-600">{storeHandoff?.sent_to_store ?? 0}</strong></span>
                <span>Ready for Line Stitching: <strong className="text-emerald-600">{storeHandoff?.ready_for_stitching ?? 0}</strong></span>
              </div>
            </div>

            <div onClick={() => setActiveTab('tab-damage')} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg">⚠️</div>
                <NotAvailableBadge label="tracking pending" />
              </div>
              <span className="text-xs font-semibold text-slate-500">Damage & Rework</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-rose-600">{damagePieces} logged</span>
              </div>
              <div className="mt-3 pt-3 border-t border-dashed border-slate-100 flex justify-between text-xs text-slate-600 font-semibold">
                <span>Rework: <strong className="text-purple-600">{reworkPieces}</strong></span>
                <span>Today: <strong className="text-emerald-600">{kpis?.completed_today ?? 0} done / {kpis?.pending_today ?? 0} pending</strong></span>
              </div>
            </div>
          </div>

          {/* DAILY PRODUCTION CADENCE CHART & LOG */}
          <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Daily Stage Output</h3>
                  <p className="text-xs text-slate-500">
                    Completed pieces per stage, from daily_production
                    {filterDate !== 'all' && <> &bull; {filterDate}</>}
                    {filterStage !== 'all' && <> &bull; {formatStage(filterStage)}</>}
                  </p>
                  {filterOrder !== 'all' && (
                    <p className="text-[10px] text-amber-600 font-semibold mt-0.5">
                      Backend note: daily_production is floor-wide and isn&rsquo;t scoped by Order, so this won&rsquo;t change for {activeOrderLabel} specifically — only the Date/Stage filters narrow it.
                    </p>
                  )}
                </div>
              </div>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="work_date" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip content={<CustomTooltip unit="pcs" />} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                    <Bar dataKey="FUSING" name="Fusing" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="PASTING" name="Pasting" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="LINE_STITCHING" name="Line Stitch" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="SHELL_STITCHING" name="Shell Stitch" fill="#ec4899" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="FINAL_FINISH" name="Final Finish" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 mb-1">Production Log</h3>
                <p className="text-xs text-slate-500 mb-3">Daily completed totals</p>
                <div className="overflow-y-auto max-h-[250px] space-y-2 pr-1">
                  {[...dailyChartData].reverse().map((log, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-[#f8fafc] border border-slate-100 text-xs">
                      <div>
                        <span className="font-bold text-slate-800">{log.work_date}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-indigo-700">{log.total} done</span>
                      </div>
                    </div>
                  ))}
                  {dailyChartData.length === 0 && (
                    <div className="text-center py-8 text-slate-400 font-medium text-xs">No production logged for selected filter.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ====================================================================
           TAB 2: STAGE-WISE PRODUCTION & BOTTLENECKS
           ==================================================================== */}
      {activeTab === 'tab-stages' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-5">
          <div className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Stitching Production Pipeline &amp; Pending Backlog</h3>
                <p className="text-xs text-slate-500">Pre-Store: Fusing, Pasting &bull; Post-Store: Line Stitching, Shell Stitching, Final Finish &bull; scoped to <strong>{activeOrderLabel}</strong></p>
              </div>
            </div>

            {meta?.unsupported?.chain_order && (
              <div className="mb-4"><InfoNote>{meta.unsupported.chain_order}</InfoNote></div>
            )}
            {(filterStyle !== 'all' || filterEmployee !== 'all') && (
              <div className="mb-4">
                <InfoNote>
                  This table is a floor-wide, per-stage total for {activeOrderLabel} — the backend does not break it down by style or operator, so the Style/Operator filters don&rsquo;t narrow it. They still apply on the Order & Style Progress and Employee by Stage tabs.
                </InfoNote>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-[#f8fafc] text-slate-600 font-bold uppercase tracking-wider border-y border-slate-200">
                    <th className="py-3 px-4">Stage Name</th>
                    <th className="py-3 px-4">Section</th>
                    <th className="py-3 px-4 text-right">Total Received</th>
                    <th className="py-3 px-4 text-right">Assigned</th>
                    <th className="py-3 px-4 text-right">Completed</th>
                    <th className="py-3 px-4 text-right">Pending</th>
                    <th className="py-3 px-4 text-right">Daily Target</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredStages.map((st, idx) => {
                    const highBacklog = isHighBacklog(st);
                    return (
                      <tr
                        key={idx}
                        onClick={() => setSelectedStageDetail(st)}
                        className={`cursor-pointer transition-all ${
                          highBacklog ? 'bg-amber-50/70 border-l-4 border-amber-500 hover:bg-amber-50' : selectedStageDetail?.stage === st.stage ? 'bg-indigo-50/60' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2"><span>🪡</span><span>{st.label || formatStage(st.stage)}</span></td>
                        <td className="py-3.5 px-4 font-mono text-slate-600">{st.section || '—'}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">{st.total_received ?? 0} pcs</td>
                        <td className="py-3.5 px-4 text-right font-mono text-blue-700 font-semibold">{st.assigned_pieces ?? 0} pcs</td>
                        <td className="py-3.5 px-4 text-right font-mono text-emerald-700 font-black">{st.completed_pieces ?? 0} pcs</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold">
                          <span className={highBacklog ? 'text-amber-600 font-black text-sm' : 'text-slate-800'}>{st.pending_pieces ?? 0} pcs</span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono">
                          {typeof st.daily_target === 'number' ? `${st.daily_target} pcs` : <NotAvailableBadge label="N/A" />}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center justify-center gap-1.5 shadow-sm ${highBacklog ? 'bg-amber-500 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                            {highBacklog ? <>⚠️ PENDING ({st.pending_pieces})</> : <span>🟢 Active</span>}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredStages.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-8 text-slate-400 font-medium">No stage data available for selected filter.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-extrabold text-slate-900 mb-1">Stage Volume: Received vs Completed vs Pending</h3>
            <p className="text-xs text-slate-500 mb-4">Real per-stage counts from GET /dashboard/stitching</p>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredStages.map((s) => ({ label: s.label || formatStage(s.stage), received: s.total_received || 0, completed: s.completed_pieces || 0, pending: s.pending_pieces || 0 }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip content={<CustomTooltip unit="pcs" />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Bar dataKey="received" name="Total Received" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pending" name="Pending" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      )}

      {/* ====================================================================
           TAB 3: STORE HANDOFF & DRAWER STATE
           ==================================================================== */}
      {activeTab === 'tab-store' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-5">
          {meta?.unsupported?.store_is_drawer_state && (
            <InfoNote>{meta.unsupported.store_is_drawer_state}</InfoNote>
          )}
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { key: 'ready_for_store', label: 'Ready for Store', icon: '📤', color: 'blue' },
              { key: 'in_store', label: 'In Store', icon: '🏬', color: 'indigo' },
              { key: 'sent_to_store', label: 'Sent to Store', icon: '🚚', color: 'purple' },
              { key: 'in_drawer', label: 'In Drawer', icon: '🗄️', color: 'amber' },
              { key: 'ready_for_stitching', label: 'Ready for Line Stitching', icon: '🪡', color: 'emerald' },
              { key: 'store_pending', label: 'Store Pending', icon: '⏳', color: 'rose' },
            ].map((card) => (
              <div key={card.key} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-lg">{card.icon}</div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase">Live</span>
                </div>
                <span className="text-xs font-semibold text-slate-500">{card.label}</span>
                <div className="text-2xl font-black text-slate-900 mt-1">{storeHandoff?.[card.key] ?? 0} pcs</div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ====================================================================
           TAB 4: ORDER & STYLE PROGRESS (spans every order/style, real order_progress list)
           ==================================================================== */}
      {activeTab === 'tab-orders' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-5">
          <div className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Order &amp; Style Progress Matrix</h3>
                <p className="text-xs text-slate-500">Every order/style in the pipeline, from order_progress</p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700">{filteredOrderProgress.length} rows</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-[#f8fafc] text-slate-600 font-bold uppercase tracking-wider border-y border-slate-200">
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-4">Style</th>
                    <th className="py-3 px-4">Article</th>
                    <th className="py-3 px-4 text-right">Total Ordered</th>
                    <th className="py-3 px-4 text-right">Minted</th>
                    <th className="py-3 px-4 text-right">Completed</th>
                    <th className="py-3 px-4 text-right">Pending</th>
                    <th className="py-3 px-4">Completion</th>
                    <th className="py-3 px-4 text-center">Delay Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {paginatedOrderProgress.map((r, idx) => (
                    <tr key={`${r.order_id}-${r.style_id}-${idx}`} onClick={() => setSelectedOrderRow(r)} className="cursor-pointer hover:bg-slate-50 transition-all">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{r.order_number}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">{r.style_name}</td>
                      <td className="py-3.5 px-4 text-slate-600">{r.article}</td>
                      <td className="py-3.5 px-4 text-right font-mono">{r.total_ordered}</td>
                      <td className="py-3.5 px-4 text-right font-mono">{r.minted}</td>
                      <td className="py-3.5 px-4 text-right font-mono text-emerald-700 font-bold">{r.completed}</td>
                      <td className="py-3.5 px-4 text-right font-mono text-amber-700 font-bold">{r.pending}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${r.completion_pct || 0}%` }}></div>
                          </div>
                          <span className="font-mono text-[11px]">{r.completion_pct ?? 0}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${delayBadgeCls(r.delay_status)}`}>{r.delay_status || '—'}</span>
                      </td>
                    </tr>
                  ))}
                  {paginatedOrderProgress.length === 0 && (
                    <tr><td colSpan={9} className="text-center py-8 text-slate-400 font-medium">No order/style rows match the selected filter.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalOrderPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 text-xs font-bold text-slate-600">
                <span>Page {orderPage} of {totalOrderPages}</span>
                <div className="flex gap-2">
                  <button onClick={() => setOrderPage((p) => Math.max(1, p - 1))} disabled={orderPage === 1} className="px-3 py-1.5 rounded-lg bg-slate-100 disabled:opacity-40">Prev</button>
                  <button onClick={() => setOrderPage((p) => Math.min(totalOrderPages, p + 1))} disabled={orderPage === totalOrderPages} className="px-3 py-1.5 rounded-lg bg-slate-100 disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ====================================================================
           TAB 5: EMPLOYEE BY STAGE
           ==================================================================== */}
      {activeTab === 'tab-employees' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-5">
          {meta?.unsupported?.employee_target_photo && (
            <InfoNote>{meta.unsupported.employee_target_photo}</InfoNote>
          )}
          {filterStyle !== 'all' && (
            <InfoNote>Employee rows don&rsquo;t carry a style field, so the Style filter doesn&rsquo;t narrow this table. Operator and Stage filters do.</InfoNote>
          )}

          {selectedEmployeeSnapshot && (
            <div className="w-full bg-white border border-indigo-200 rounded-2xl p-5 shadow-sm flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-black">
                  {initials(selectedEmployeeSnapshot.name)}
                </div>
                <div>
                  <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Selected Operator</span>
                  <h3 className="text-sm font-extrabold text-slate-900">{selectedEmployeeSnapshot.name}</h3>
                  <p className="text-[11px] text-slate-500">{selectedEmployeeSnapshot.designation}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-600 flex-1">
                <span>Assigned: <strong className="text-slate-900">{selectedEmployeeSnapshot.assigned}</strong></span>
                <span>Completed: <strong className="text-emerald-700">{selectedEmployeeSnapshot.completed}</strong></span>
                <span>Today: <strong className="text-indigo-700">{selectedEmployeeSnapshot.assignedToday} / {selectedEmployeeSnapshot.completedToday}</strong></span>
                <span>Rework Today: <strong className="text-rose-600">{selectedEmployeeSnapshot.reworkToday}</strong></span>
              </div>
            </div>
          )}

          <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500">Operators (filtered)</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{employeeAggregates.length}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500">Total Assigned (filtered rows)</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{filteredEmployees.reduce((a, e) => a + (e.assigned_pieces || 0), 0)}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500">Total Completed (filtered rows)</span>
              <div className="text-2xl font-black text-emerald-700 mt-1">{filteredEmployees.reduce((a, e) => a + (e.completed_pieces || 0), 0)}</div>
            </div>
          </div>

          <div className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Employee Performance by Stage</h3>
                <p className="text-xs text-slate-500">One row per operator per stage &bull; click a row to view piece traceability</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-[#f8fafc] text-slate-600 font-bold uppercase tracking-wider border-y border-slate-200">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Stage</th>
                    <th className="py-3 px-4 text-right">Assigned</th>
                    <th className="py-3 px-4 text-right">Completed</th>
                    <th className="py-3 px-4 text-right">Today (A/C)</th>
                    <th className="py-3 px-4 text-right">Rework Today</th>
                    <th className="py-3 px-4 text-right">Daily Target</th>
                    <th className="py-3 px-4 text-center">Trace</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {paginatedEmployees.map((e, idx) => (
                    <tr key={`${e.employee_id}-${e.stage}-${idx}`} className="hover:bg-slate-50 transition-all">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-black">
                            {e.photo ? <img src={e.photo} alt={e.name} className="w-7 h-7 rounded-full object-cover" /> : initials(e.name)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{e.name}</div>
                            <div className="text-[10px] text-slate-500">{e.designation}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">{e.label || formatStage(e.stage)}</td>
                      <td className="py-3 px-4 text-right font-mono">{e.assigned_pieces ?? 0}</td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-700 font-bold">{e.completed_pieces ?? 0}</td>
                      <td className="py-3 px-4 text-right font-mono">{e.assigned_today ?? 0} / {e.completed_today ?? 0}</td>
                      <td className="py-3 px-4 text-right font-mono">{e.rework_today ?? 0}</td>
                      <td className="py-3 px-4 text-right font-mono">
                        {typeof e.daily_target === 'number' ? e.daily_target : <NotAvailableBadge label="N/A" />}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button onClick={() => handleOpenEmployeeModal(e)} className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-[10px] hover:bg-indigo-100">
                          View Trace
                        </button>
                      </td>
                    </tr>
                  ))}
                  {paginatedEmployees.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-8 text-slate-400 font-medium">No employee rows match the selected filter.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {totalEmpPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 text-xs font-bold text-slate-600">
                <span>Page {empPage} of {totalEmpPages}</span>
                <div className="flex gap-2">
                  <button onClick={() => setEmpPage((p) => Math.max(1, p - 1))} disabled={empPage === 1} className="px-3 py-1.5 rounded-lg bg-slate-100 disabled:opacity-40">Prev</button>
                  <button onClick={() => setEmpPage((p) => Math.min(totalEmpPages, p + 1))} disabled={empPage === totalEmpPages} className="px-3 py-1.5 rounded-lg bg-slate-100 disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ====================================================================
           TAB 6: PIECE TRACKER (GET /pieces/{piece_code})
           ==================================================================== */}
      {activeTab === 'tab-pieces' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-5">
          <div className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-base font-extrabold text-slate-900 mb-1">Piece-Level Batch Tracker</h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter any piece code to pull its production batch from the backend, or open an operator&rsquo;s trace on the Employee tab and click &ldquo;View full batch&rdquo;.
            </p>
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-1">
                <Tag className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={pieceSearchInput}
                  onChange={(e) => setPieceSearchInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handlePieceSearch(); }}
                  placeholder="e.g. IS1234-CARNABY-PINE_GREEN-S-003"
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-mono font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4f46e5]"
                />
              </div>
              <button
                onClick={() => handlePieceSearch()}
                disabled={!pieceSearchInput.trim() || pieceSearchLoading}
                className="px-4 py-2 rounded-xl bg-[#4f46e5] text-white text-xs font-bold hover:bg-[#4338ca] disabled:opacity-40 transition-all"
              >
                {pieceSearchLoading ? 'Searching…' : 'Look Up Batch'}
              </button>
            </div>

            {pieceSearchError && (
              <div className="mb-4 text-xs text-red-600 font-semibold bg-red-50 border border-red-100 rounded-xl px-3 py-2">API error: {pieceSearchError}</div>
            )}

            {pieceSearchedCode && !pieceSearchLoading && (
              <div className="mb-3 text-xs font-bold text-slate-500">
                Showing {pieceSearchResults.length} piece(s) returned for <span className="font-mono text-indigo-700">{pieceSearchedCode}</span>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-[#f8fafc] text-slate-600 font-bold uppercase tracking-wider border-y border-slate-200">
                    <th className="py-3 px-4">Piece Code</th>
                    <th className="py-3 px-4 text-right">Seq</th>
                    <th className="py-3 px-4">Style</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4">Colour</th>
                    <th className="py-3 px-4">Current Stage</th>
                    <th className="py-3 px-4">Last Worked</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {pieceSearchResults.map((p, idx) => (
                    <tr key={`${p.piece_code}-${idx}`} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{p.piece_code}</td>
                      <td className="py-3 px-4 text-right font-mono">{p.seq}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{p.style}</td>
                      <td className="py-3 px-4">{p.size}</td>
                      <td className="py-3 px-4">{p.colour}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700">{formatStage(p.current_stage)}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{p.last_worked}</td>
                    </tr>
                  ))}
                  {pieceSearchResults.length === 0 && !pieceSearchLoading && (
                    <tr><td colSpan={7} className="text-center py-8 text-slate-400 font-medium">{pieceSearchedCode ? 'No pieces returned for that code.' : 'Search for a piece code to begin.'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* ====================================================================
           TAB 7: DAMAGE & REWORK (unsupported by backend — shown transparently)
           ==================================================================== */}
      {activeTab === 'tab-damage' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-5">
          <div className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-extrabold text-amber-900">Damage tracking not yet available</h4>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  {meta?.unsupported?.damage_tracking || 'No damage state or PieceDamage table exists in the schema yet. Counts below are real backend zeros, not fabricated.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-[#f8fafc] p-4 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Damage Pieces (kpis.damage_pieces)</span>
                <div className="text-2xl font-black text-slate-900 mt-1">{damagePieces}</div>
              </div>
              <div className="bg-[#f8fafc] p-4 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Rework Pieces (kpis.rework_pieces)</span>
                <div className="text-2xl font-black text-slate-900 mt-1">{reworkPieces}</div>
              </div>
            </div>

            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">Per-Stage Breakdown</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-[#f8fafc] text-slate-600 font-bold uppercase tracking-wider border-y border-slate-200">
                    <th className="py-3 px-4">Stage</th>
                    <th className="py-3 px-4 text-right">Damage</th>
                    <th className="py-3 px-4 text-right">Rework</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {sortByCanonicalStageOrder(stages).map((s, idx) => (
                    <tr key={idx}>
                      <td className="py-3 px-4 font-bold text-slate-900">{s.label || formatStage(s.stage)}</td>
                      <td className="py-3 px-4 text-right font-mono">{s.damage_pieces ?? 0}</td>
                      <td className="py-3 px-4 text-right font-mono">{s.rework_pieces ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* ====================================================================
           TAB 8: STAGE ANALYTICS
           ==================================================================== */}
      {activeTab === 'tab-analytics' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-5">
          <div className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-extrabold text-slate-900 mb-1">Stage Completion Trend</h3>
            <p className="text-xs text-slate-500 mb-4">Completed pieces per stage over time, from daily_production — floor-wide, not split by order, style, or operator.</p>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stageTrendChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="work_date" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip content={<CustomTooltip unit="pcs" />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Line type="monotone" dataKey="FUSING" name="Fusing" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="PASTING" name="Pasting" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="LINE_STITCHING" name="Line Stitch" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="SHELL_STITCHING" name="Shell Stitch" stroke="#ec4899" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="FINAL_FINISH" name="Final Finish" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-extrabold text-slate-900 mb-1">Stage Achievement</h3>
            <p className="text-xs text-slate-500 mb-4">daily_target / achievement_pct, direct from the backend</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {sortByCanonicalStageOrder(stages).map((s, idx) => (
                <div key={idx} className="bg-[#f8fafc] p-4 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">{s.label || formatStage(s.stage)}</span>
                  <div className="mt-1">
                    {typeof s.achievement_pct === 'number' ? (
                      <span className="text-lg font-black text-slate-900">{s.achievement_pct}%</span>
                    ) : (
                      <NotAvailableBadge />
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Completed today: <strong>{s.daily_completed ?? 0}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ====================================================================
           TAB 9: TRACEABILITY FLOW (GET /employees/{employee_id})
           ==================================================================== */}
      {activeTab === 'tab-flow' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-5">
          <div className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-base font-extrabold text-slate-900 mb-1">Piece Traceability Flow</h3>
            <p className="text-xs text-slate-500 mb-4">Pick an operator to pull their current piece and its full stage history from the backend.</p>

            <div className="flex flex-wrap items-center gap-2 mb-5">
              {availableEmployees.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => handleOpenEmployeeModal({ employee_id: emp.id, name: emp.name })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    selectedEmployeeModal?.employee_id === emp.id ? 'bg-[#4f46e5] text-white border-[#4f46e5]' : 'bg-[#f8fafc] text-slate-700 border-slate-200 hover:border-indigo-400'
                  }`}
                >
                  {emp.name}
                </button>
              ))}
              {availableEmployees.length === 0 && <span className="text-xs text-slate-400">No operators loaded yet.</span>}
            </div>

            {employeeTraceLoading && (
              <div className="text-center py-10 text-slate-400 text-xs font-semibold">Loading traceability…</div>
            )}
            {employeeTraceError && !employeeTraceLoading && (
              <div className="text-xs text-red-600 font-semibold bg-red-50 border border-red-100 rounded-xl px-3 py-2">API error: {employeeTraceError}</div>
            )}

            {employeeTrace && !employeeTraceLoading && !employeeTrace.piece_code && (
              <div className="text-center py-10 text-slate-400 text-xs font-semibold">
                The backend returned no traceable piece for {selectedEmployeeModal?.name || 'this operator'} right now.
              </div>
            )}

            {employeeTrace && !employeeTraceLoading && employeeTrace.piece_code && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 bg-[#f8fafc] border border-slate-100 rounded-2xl p-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Piece Code</span>
                    <p className="text-sm font-mono font-black text-slate-900">{employeeTrace.piece_code}</p>
                    <p className="text-xs text-slate-600 mt-1">{employeeTrace.style} &bull; {employeeTrace.colour} &bull; Size {employeeTrace.size} &bull; PO {employeeTrace.order_number}</p>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-indigo-100 text-indigo-800">{employeeTrace.display_stage}</span>
                    <p className="text-[10px] text-slate-500 mt-1">{employeeTrace.in_store ? `In store: ${employeeTrace.store_label}` : employeeTrace.store_label || ''}</p>
                  </div>
                  <button
                    onClick={() => { handlePieceSearch(employeeTrace.piece_code); setActiveTab('tab-pieces'); }}
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-indigo-700 hover:bg-indigo-50"
                  >
                    View full batch →
                  </button>
                </div>

                <div className="relative pl-6">
                  <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-slate-200"></div>
                  {(employeeTrace.history || []).map((h, idx) => (
                    <div key={idx} className="relative pb-6 last:pb-0">
                      <div className={`absolute -left-6 w-4 h-4 rounded-full border-2 ${h.is_store_overlay ? 'bg-amber-400 border-amber-500' : 'bg-indigo-500 border-indigo-600'}`}></div>
                      <div className="bg-white border border-slate-100 rounded-xl p-3.5 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-slate-900">{h.label || formatStage(h.stage)}</span>
                          <span className="text-[10px] font-mono text-slate-500">{h.work_date}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-600">
                          <User className="w-3 h-3" />
                          <span>{h.employee || 'Unassigned'}</span>
                          {h.is_store_overlay && <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-bold">Store: {h.store_status || '—'}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!employeeTrace.history || employeeTrace.history.length === 0) && (
                    <p className="text-xs text-slate-400">No stage history returned for this piece.</p>
                  )}
                </div>
              </div>
            )}

            {!employeeTrace && !employeeTraceLoading && !employeeTraceError && (
              <div className="text-center py-10 text-slate-400 text-xs font-semibold">Select an operator above to load their piece traceability.</div>
            )}
          </div>
        </motion.div>
      )}

      {/* ─── STAGE DETAIL MODAL ─── */}
      <AnimatePresence>
        {selectedStageDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setSelectedStageDetail(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-extrabold text-slate-900">{selectedStageDetail.label || formatStage(selectedStageDetail.stage)}</h3>
                <button onClick={() => setSelectedStageDetail(null)} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-2 text-xs">
                {[
                  ['Section', selectedStageDetail.section || '—'],
                  ['Total Received', `${selectedStageDetail.total_received ?? 0} pcs`],
                  ['Assigned', `${selectedStageDetail.assigned_pieces ?? 0} pcs`],
                  ['Completed', `${selectedStageDetail.completed_pieces ?? 0} pcs`],
                  ['Pending', `${selectedStageDetail.pending_pieces ?? 0} pcs`],
                  ['Damage', `${selectedStageDetail.damage_pieces ?? 0} pcs`],
                  ['Rework', `${selectedStageDetail.rework_pieces ?? 0} pcs`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">{k}:</span>
                    <span className="font-bold text-slate-800">{v}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── ORDER ROW DETAIL MODAL ─── */}
      <AnimatePresence>
        {selectedOrderRow && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setSelectedOrderRow(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-extrabold text-slate-900">{selectedOrderRow.style_name}</h3>
                <button onClick={() => setSelectedOrderRow(null)} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-2 text-xs">
                {[
                  ['Order #', selectedOrderRow.order_number],
                  ['Article', selectedOrderRow.article],
                  ['Order Date', selectedOrderRow.order_date || '—'],
                  ['Delivery Deadline', selectedOrderRow.delivery_deadline || '—'],
                  ['Total Ordered', selectedOrderRow.total_ordered],
                  ['Minted', selectedOrderRow.minted],
                  ['Completed', selectedOrderRow.completed],
                  ['Pending', selectedOrderRow.pending],
                  ['Completion %', `${selectedOrderRow.completion_pct ?? 0}%`],
                  ['Delay Status', selectedOrderRow.delay_status || '—'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">{k}:</span>
                    <span className="font-bold text-slate-800">{v}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── EMPLOYEE TRACE MODAL (quick preview; full view lives on Traceability Flow tab) ─── */}
      <AnimatePresence>
        {selectedEmployeeModal && activeTab !== 'tab-flow' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setSelectedEmployeeModal(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-black">
                    {initials(selectedEmployeeModal.name)}
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">{selectedEmployeeModal.name}</h3>
                    <p className="text-xs text-slate-500">{selectedEmployeeModal.designation || ''}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedEmployeeModal(null)} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
              </div>

              {employeeTraceLoading && <div className="text-center py-6 text-xs text-slate-400 font-semibold">Loading trace…</div>}
              {employeeTraceError && !employeeTraceLoading && (
                <div className="text-xs text-red-600 font-semibold bg-red-50 border border-red-100 rounded-xl px-3 py-2">API error: {employeeTraceError}</div>
              )}
              {employeeTrace && !employeeTraceLoading && (
                employeeTrace.piece_code ? (
                  <div className="text-xs space-y-2">
                    <div className="flex justify-between py-1.5 border-b border-slate-100"><span className="text-slate-500">Piece:</span><span className="font-mono font-bold text-slate-800">{employeeTrace.piece_code}</span></div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100"><span className="text-slate-500">Stage:</span><span className="font-bold text-slate-800">{employeeTrace.display_stage}</span></div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100"><span className="text-slate-500">Style / Colour:</span><span className="font-bold text-slate-800">{employeeTrace.style} / {employeeTrace.colour}</span></div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
                    The backend returned no traceable piece for this operator right now.
                  </div>
                )
              )}

              <button
                onClick={() => { setActiveTab('tab-flow'); setSelectedEmployeeModal(null); }}
                className="mt-4 w-full px-4 py-2 rounded-xl bg-[#4f46e5] text-white text-xs font-bold hover:bg-[#4338ca]"
              >
                Open Full Traceability Flow
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function StitchingManagerDashboard() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center text-[#4f46e5]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4f46e5] mx-auto mb-3"></div>
            <p className="font-semibold text-xs tracking-widest uppercase">Loading Stitching Dashboard...</p>
          </div>
        </div>
      }
    >
      <StitchingDashboardContent />
    </Suspense>
  );
}
