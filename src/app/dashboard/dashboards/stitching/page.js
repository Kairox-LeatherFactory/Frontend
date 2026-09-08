'use client';

import { useState, useMemo, useEffect, useRef, Suspense } from 'react';
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
  ChevronDown,
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
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:border-indigo-500 focus:outline-none flex items-center justify-between gap-1 shadow-sm transition-all cursor-pointer"
        title="Open full interactive calendar"
      >
        <span className="truncate flex items-center gap-1">
          <span>📅</span>
          <span className="truncate">{selectedDate === 'all' ? 'All Dates' : selectedDate}</span>
        </span>
        <span className="text-[10px] text-slate-400 font-bold shrink-0">▼</span>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 right-0 sm:right-auto z-50 bg-white border border-slate-200 rounded-2xl p-4 shadow-2xl w-full sm:w-80 max-w-[calc(100vw-2rem)] animate-fade-in text-slate-800">
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

// Native <select> option popups size themselves to their widest option text,
// independent of the closed control's own (responsive) width — on real data
// (order numbers, operator names) that popup can render past the viewport
// edge on a tablet. This is a fully custom dropdown instead: the open panel
// is pinned left:0/right:0 against its own button, so its width is always
// exactly the button's width (already on-screen), and every row truncates
// with real CSS ellipsis rather than relying on the browser's native popup.
function ScreenSafeSelect({ value, options, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = options.find((o) => o.value === value);
  const label = value === 'all' || !selected ? placeholder : selected.label;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#4f46e5] cursor-pointer"
      >
        <span className="truncate">{label}</span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg py-1">
          {placeholder && (
            <button
              type="button"
              onClick={() => { onChange('all'); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-xs font-bold truncate cursor-pointer hover:bg-slate-50 ${value === 'all' ? 'text-[#4f46e5] bg-indigo-50' : 'text-slate-700'}`}
            >
              {placeholder}
            </button>
          )}
          {options.map((opt, idx) => (
            <button
              key={`${opt.value}-${idx}`}
              type="button"
              title={opt.title || opt.label}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-xs font-bold truncate cursor-pointer hover:bg-slate-50 ${value === opt.value ? 'text-[#4f46e5] bg-indigo-50' : 'text-slate-700'}`}
            >
              {opt.label}
            </button>
          ))}
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

// Full piece-journey order for the Piece Tracker's stage history table — wider
// than PIPELINE_STAGE_ORDER above, since a single piece's history also
// includes Cutting/Lining and the Store handoff. Matches the dashboard's own
// "Pre-Store: Fusing -> Pasting - Post-Store: Line Stitch -> Shell Stitch ->
// Final Finish" description: Store comes after Fusing/Pasting, not before.
const PIECE_HISTORY_STAGE_ORDER = [
  'LEATHER_CUTTING', 'LINING_CUTTING', 'FUSING', 'PASTING', 'STORE',
  'LINE_STITCHING', 'SHELL_STITCHING', 'FINAL_FINISH', 'FINAL_INSPECTION',
];

function sortPieceHistory(history) {
  return [...(history || [])].sort((a, b) => {
    const ai = PIECE_HISTORY_STAGE_ORDER.indexOf(a.stage);
    const bi = PIECE_HISTORY_STAGE_ORDER.indexOf(b.stage);
    return (ai === -1 ? PIECE_HISTORY_STAGE_ORDER.length : ai) - (bi === -1 ? PIECE_HISTORY_STAGE_ORDER.length : bi);
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
  // The endpoint returns ONE piece-detail object (piece_code, style, article,
  // colour, size, order_number, display_stage, drawer info, total_consumption)
  // plus a `history` array — one entry per stage the piece has actually been
  // through, each with its own employee/work_date/consumption. Not a list of
  // sibling batch pieces.
  const [pieceSearchInput, setPieceSearchInput] = useState('');
  const [pieceSearchedCode, setPieceSearchedCode] = useState(null);
  const [pieceDetail, setPieceDetail] = useState(null);
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

  // Handler to look up a piece's detail + stage history via
  // GET /api/v1/dashboard/stitching/pieces/{piece_code}
  const handlePieceSearch = async (codeOverride) => {
    const code = (codeOverride ?? pieceSearchInput).trim();
    if (!code || !token) return;
    try {
      setPieceSearchLoading(true);
      setPieceSearchError(null);
      const data = await apiGetStitchingPieceDetail(token, code);
      setPieceDetail(data && typeof data === 'object' && !Array.isArray(data) ? data : null);
      setPieceSearchedCode(code);
      setPieceSearchInput(code);
    } catch (err) {
      console.warn(`Backend API /api/v1/dashboard/stitching/pieces/${code} notice:`, err.message);
      setPieceSearchError(err.message);
      setPieceDetail(null);
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
    return sortByCanonicalStageOrder(Array.from(set).map((stage) => ({ stage }))).map((s) => s.stage);
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

  const STAGE_DEFAULT_LABELS = {
    FUSING: 'Fusing',
    PASTING: 'Pasting',
    LINE_STITCHING: 'Line Stitching',
    SHELL_STITCHING: 'Shell Stitching',
    FINAL_FINISH: 'Final Finish',
  };

  // `queue`, per stage, is how many pieces actually finished the stage right
  // before this one — for Fusing (the first stage tracked here), that's
  // total_received (the real handoff count from Cutting); for every stage
  // after that, it's simply the previous tracked stage's own completed_pieces
  // (Fusing's done pieces are Pasting's queue, and so on), same cascading
  // logic the Direct Manager pipeline uses.
  // `overallRemaining`, per stage, is ONE fixed order-wide total — the real
  // overall piece count (kpis.overall_pieces, the same 228 shown on the
  // "Overall Pieces" tile) — minus this stage's own Done. Same 228 base for
  // every stage: Fusing done 4 -> 224 remaining, Pasting done 3 -> 225
  // remaining, and so on. (Not each stage's own, already-net pending_pieces —
  // that's a different, smaller number per stage and was double-subtracting.)
  const stitchingPipelineStages = useMemo(() => {
    const basePending = kpis?.overall_pieces ?? 0;
    return PIPELINE_STAGE_ORDER.reduce((acc, stageKey, i) => {
      const found = stages.find((s) => s.stage === stageKey);
      const row = found || {
        stage: stageKey,
        label: STAGE_DEFAULT_LABELS[stageKey] || formatStage(stageKey),
        total_received: 0,
        assigned_pieces: 0,
        completed_pieces: 0,
        pending_pieces: 0,
      };
      const completed = row.completed_pieces ?? 0;
      const queue = i === 0 ? (row.total_received ?? 0) : (acc[i - 1].completed_pieces ?? 0);
      const overallRemaining = Math.max(0, basePending - completed);
      return [...acc, { ...row, queue, overallRemaining }];
    }, []);
  }, [stages, kpis]);

  // Backlog size only — NOT a bottleneck. A real bottleneck means a stage is falling
  // behind its expected pace (target vs. time elapsed), which this dashboard doesn't
  // have the data to compute yet. This just flags stages with a large pending queue.
  const isHighBacklog = (s) => {
    const total = s.total_received || 0;
    const pending = s.pending_pieces || 0;
    return total > 0 && pending >= 5 && pending / total > 0.3;
  };

  // Respect the active Order/Stage filters — same filtered list the Stage-Wise
  // table uses — so this panel actually reflects the selected stage instead of
  // always flagging whatever stage has the biggest backlog floor-wide.
  const highBacklogStage = useMemo(() => {
    const candidates = filteredStages.filter(isHighBacklog).sort((a, b) => (b.pending_pieces || 0) - (a.pending_pieces || 0));
    return candidates[0] || null;
  }, [filteredStages]);

  // ── Real per-stage snapshot for the selected Stage filter — `stages` is
  // already order-scoped by the backend (order_id param), so this reflects
  // "pending/completed for THIS stage within THIS order" when an order is
  // also selected, or floor-wide for the stage when it isn't. ──
  const selectedStageSnapshot = useMemo(
    () => (filterStage !== 'all' ? stages.find((s) => s.stage === filterStage) || null : null),
    [stages, filterStage]
  );

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

      {/* ─── UNIVERSAL MULTI-FILTER TOOLBAR ─── */}
      <section className="w-full bg-white p-4 rounded-2xl border border-[#e8edf3] shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#1e293b] uppercase tracking-wider">
            <Filter className="w-4 h-4 text-[#4f46e5]" />
            <span>Universal Operations Cross-Filter</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f8fafc] text-slate-700 border border-slate-200 text-xs font-bold hover:bg-slate-100 transition-all cursor-pointer shadow-sm"
              title="Export currently loaded order & style progress to CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
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
            <ScreenSafeSelect
              value={filterOrder}
              onChange={(v) => { setFilterOrder(v); setOrderPage(1); }}
              placeholder="📦 All Orders"
              options={ordersList.map((ord) => ({ value: ord.id, label: `PO: ${ord.order_number}` }))}
            />
          </div>

          {/* Style Filter (client-side) */}
          <div>
            <ScreenSafeSelect
              value={filterStyle}
              onChange={(v) => { setFilterStyle(v); setOrderPage(1); }}
              placeholder="👗 All Styles"
              options={availableStyles.map((s) => ({ value: s.name, label: s.name }))}
            />
          </div>

          {/* Stage Filter */}
          <div>
            <ScreenSafeSelect
              value={filterStage}
              onChange={setFilterStage}
              placeholder="🪡 All Stages"
              options={availableStages.map((st) => ({ value: st, label: formatStage(st) }))}
            />
          </div>

          {/* Operator Filter */}
          <div>
            <ScreenSafeSelect
              value={filterEmployee}
              onChange={(v) => { setFilterEmployee(v); setEmpPage(1); }}
              placeholder="👷 All Operators"
              options={availableEmployees.map((emp) => ({ value: emp.id, label: emp.name }))}
            />
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
          {/* STITCHING PRODUCTION PIPELINE (Full Width Card matching Direct Manager style) */}
          <div className="w-full bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                    Stitching Floor &bull; 5-Stage Live Pipeline
                  </span>
                  {meta?.generated_for && (
                    <span className="text-slate-400 text-xs font-semibold">Generated {meta.generated_for}</span>
                  )}
                  {heroFilterActive && heroAggregate && !heroAggregate.empty ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      PO: {heroAggregate.orderLabel} &bull; {heroAggregate.styleLabel}
                    </span>
                  ) : currentStyle?.style ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                      Spotlight: {currentStyle.style} ({currentStyle.article || 'Article'})
                    </span>
                  ) : null}
                </div>
                <h2 className="text-base sm:text-lg font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Waypoints className="w-5 h-5 text-indigo-600" />
                  Stitching Floor Production Pipeline
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live funnel stages from GET /api/v1/dashboard/stitching &mdash; Done = completed pieces, Queue = pieces that finished the stage before this one, Overall Remaining = order-wide pending count minus this stage&rsquo;s Done.
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5 mr-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" /> High Pending Backlog
                </span>
                {filterStage !== 'all' && (
                  <button
                    onClick={() => setFilterStage('all')}
                    className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer mr-2"
                  >
                    Clear Stage Filter
                  </button>
                )}
                <div className="flex items-center gap-3 pl-3 border-l border-slate-200 text-xs font-semibold text-slate-600">
                  <span>In Store: <strong className="text-slate-800">{storeHandoff?.in_store ?? kpis?.in_store ?? 0}</strong></span>
                  <span>Ready for Store: <strong className="text-emerald-700">{storeHandoff?.ready_for_store ?? kpis?.ready_for_store ?? 0}</strong></span>
                </div>
              </div>
            </div>

            {/* 5 STAGES HORIZONTAL CARD GRID */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-1">
              {stitchingPipelineStages.map((st, idx) => {
                const isSelected = filterStage === st.stage;
                const isBottleneck = isHighBacklog(st);
                const completed = st.completed_pieces ?? 0;
                // Both set in stitchingPipelineStages above: "Queue" = pieces that
                // finished the stage right before this one (Cutting for Fusing,
                // otherwise the previous tracked stage's Done). "Overall Remaining"
                // = the order-wide pending count minus this stage's own Done.
                const queue = st.queue ?? 0;
                const overallRemaining = st.overallRemaining ?? 0;

                return (
                  <div
                    key={`stitching-stage-card-${st.stage}-${idx}`}
                    onClick={() => {
                      setFilterStage(filterStage === st.stage ? 'all' : st.stage);
                    }}
                    className={`relative p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/80 shadow-md ring-2 ring-indigo-500/20'
                        : isBottleneck
                        ? 'border-amber-400 bg-amber-50/50 shadow-sm hover:border-amber-500'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md font-mono ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : isBottleneck
                            ? 'bg-amber-200 text-amber-900 font-bold'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          #{idx + 1}
                        </span>
                        {isSelected && (
                          <span className="text-[9px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">Active Filter</span>
                        )}
                      </div>
                      <h4 className="text-xs font-extrabold text-slate-900 leading-tight truncate">
                        {st.label || STAGE_DEFAULT_LABELS[st.stage] || formatStage(st.stage)}
                      </h4>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] font-semibold space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Done:</span>
                        <span className="font-bold text-emerald-700 font-mono">{completed}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Queue:</span>
                        <span className={`font-bold font-mono ${queue > 20 ? 'text-amber-600 font-black' : 'text-slate-700'}`}>
                          {queue}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-400">Overall Remaining:</span>
                        <span className="font-bold text-slate-600 font-mono">{overallRemaining}</span>
                      </div>
                    </div>

                    {isBottleneck && (
                      <div className="mt-2 text-center bg-amber-100 border border-amber-200 text-amber-800 text-[9px] font-black uppercase rounded-lg py-0.5 tracking-wider">
                        High Backlog
                      </div>
                    )}
                  </div>
                );
              })}
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

          {/* SELECTED STAGE SNAPSHOT — real completed/pending for the exact stage
              picked in the Stage filter (e.g. Fusing), scoped to the selected Order
              when one is also active (stages is already order_id-scoped by the
              backend), or floor-wide otherwise. Shown whenever the Stage filter
              is set to something other than "All Stages". */}
          {selectedStageSnapshot && (
            <div className="w-full bg-white border border-amber-200 rounded-2xl p-5 shadow-sm flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-lg">🪡</div>
                <div>
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Selected Stage</span>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    {selectedStageSnapshot.label || formatStage(selectedStageSnapshot.stage)}
                    {filterOrder !== 'all' && <> &bull; {activeOrderLabel}</>}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {filterOrder !== 'all' ? 'Scoped to this order' : `Floor-wide (${meta?.scope || 'all clients'})`}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-600 flex-1">
                <span>Received: <strong className="text-slate-900">{selectedStageSnapshot.total_received ?? 0}</strong></span>
                <span>Assigned: <strong className="text-blue-700">{selectedStageSnapshot.assigned_pieces ?? 0}</strong></span>
                <span>Completed: <strong className="text-emerald-700">{selectedStageSnapshot.completed_pieces ?? 0}</strong></span>
                <span>Pending: <strong className="text-amber-700">{selectedStageSnapshot.pending_pieces ?? 0}</strong></span>
                {typeof selectedStageSnapshot.daily_target === 'number' && (
                  <span>Daily Target: <strong className="text-indigo-700">{selectedStageSnapshot.daily_target}</strong></span>
                )}
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
              <span className="text-xs font-semibold text-slate-500">
                {selectedStageSnapshot ? `${selectedStageSnapshot.label || formatStage(selectedStageSnapshot.stage)} Output` : 'Fusing Output'}
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900">
                  {(selectedStageSnapshot ? selectedStageSnapshot.completed_pieces : stages.find((s) => s.stage === 'FUSING')?.completed_pieces) ?? 0} pcs
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-dashed border-slate-100 flex justify-between text-xs text-slate-600 font-semibold">
                {selectedStageSnapshot ? (
                  <>
                    <span>Assigned: <strong>{selectedStageSnapshot.assigned_pieces ?? 0}</strong></span>
                    <span>Pending: <strong className="text-rose-600">{selectedStageSnapshot.pending_pieces ?? 0}</strong></span>
                  </>
                ) : (
                  <>
                    <span>Pasting Done: <strong>{stages.find((s) => s.stage === 'PASTING')?.completed_pieces ?? 0}</strong></span>
                    <span>Pasting Pending: <strong className="text-rose-600">{stages.find((s) => s.stage === 'PASTING')?.pending_pieces ?? 0}</strong></span>
                  </>
                )}
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
              <table className="w-full text-xs md:text-sm text-left">
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
                          {typeof st.daily_target === 'number' ? `${st.daily_target} pcs` : <div className="flex justify-end"><NotAvailableBadge label="N/A" /></div>}
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
          {/* Two clear phases instead of 6 flat, similarly-worded cards: a piece
              first moves through STORE (arrives, sits inside, leaves), then
              through DRAWER (queued for a drawer, held in one, released for
              Line Stitching). Same 6 backend fields as before, just grouped
              and relabeled so it's obvious what each number means. */}
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-3">Store</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { key: 'ready_for_store', label: 'Incoming', sub: 'On its way in, not yet arrived', icon: '📥' },
                  { key: 'in_store', label: 'Inside', sub: 'Currently held in store', icon: '🏬' },
                  { key: 'sent_to_store', label: 'Outgoing', sub: 'Left the store', icon: '📤' },
                ].map((card) => (
                  <div key={card.key} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-lg">{card.icon}</div>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase">Live</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">{card.label}</span>
                    <div className="text-2xl font-black text-slate-900 mt-1">{storeHandoff?.[card.key] ?? 0} pcs</div>
                    <p className="text-[10px] text-slate-400 mt-1">{card.sub}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-3">Drawer</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { key: 'store_pending', label: 'Ready for Drawer', sub: 'Waiting to be placed in a drawer', icon: '📦' },
                  { key: 'in_drawer', label: 'Holding', sub: 'Sitting in a drawer right now', icon: '🗄️' },
                  { key: 'ready_for_stitching', label: 'Ready for Line Stitching', sub: 'Released, moving on to Line Stitching', icon: '🪡' },
                ].map((card) => (
                  <div key={card.key} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-lg">{card.icon}</div>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase">Live</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">{card.label}</span>
                    <div className="text-2xl font-black text-slate-900 mt-1">{storeHandoff?.[card.key] ?? 0} pcs</div>
                    <p className="text-[10px] text-slate-400 mt-1">{card.sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ====================================================================
           TAB 4: ORDER & STYLE PROGRESS (spans every order/style, real order_progress list)
           ==================================================================== */}
      {activeTab === 'tab-orders' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-5">
          <div className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Order &amp; Style Progress Matrix</h3>
                <p className="text-xs text-slate-500">Every order/style in the pipeline, from order_progress</p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 shrink-0 self-start sm:self-auto">{filteredOrderProgress.length} rows</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm text-left">
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
              <table className="w-full text-xs md:text-sm text-left">
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
                        {typeof e.daily_target === 'number' ? e.daily_target : <div className="flex justify-end"><NotAvailableBadge label="N/A" /></div>}
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
              Enter any piece code to pull its production batch from the backend — including who last worked each piece and its current status — or open an operator&rsquo;s trace on the Employee tab and click &ldquo;View full batch&rdquo;.
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

            {pieceSearchedCode && !pieceSearchLoading && !pieceSearchError && !pieceDetail && (
              <div className="text-center py-8 text-slate-400 font-medium text-xs">No piece found for <span className="font-mono text-slate-600">{pieceSearchedCode}</span>.</div>
            )}

            {!pieceSearchedCode && !pieceSearchLoading && (
              <div className="text-center py-8 text-slate-400 font-medium text-xs">Search for a piece code to begin.</div>
            )}

            {pieceDetail && !pieceSearchLoading && (
              <div className="space-y-5">
                {/* Piece summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-[#f8fafc] rounded-xl border border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Piece Code</span>
                    <p className="text-xs font-mono font-bold text-slate-900 truncate">{pieceDetail.piece_code}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Style / Article</span>
                    <p className="text-xs font-semibold text-slate-800">{pieceDetail.style} &bull; {pieceDetail.article || '—'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Colour / Size</span>
                    <p className="text-xs font-semibold text-slate-800">{pieceDetail.colour || '—'} &bull; {pieceDetail.size || '—'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Order</span>
                    <p className="text-xs font-semibold text-slate-800">{pieceDetail.order_number || '—'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Current Stage</span>
                    <p className="text-xs font-bold">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700">
                        {pieceDetail.display_stage ? formatStage(pieceDetail.display_stage) : '—'}
                      </span>
                    </p>
                  </div>
                  {pieceDetail.in_store && (
                    <div className="col-span-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Store Status</span>
                      <p className="text-xs font-semibold text-amber-700">{pieceDetail.store_label || '—'} {pieceDetail.drawer_code ? `(${pieceDetail.drawer_code})` : ''}</p>
                    </div>
                  )}
                  {typeof pieceDetail.total_consumption === 'number' && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Total Consumption</span>
                      <p className="text-xs font-mono font-bold text-slate-800">{pieceDetail.total_consumption} DCM</p>
                    </div>
                  )}
                </div>

                {/* Stage-by-stage history — who worked this piece, at every stage */}
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-2">Stage History &mdash; Who Worked This Piece</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs md:text-sm text-left">
                      <thead>
                        <tr className="bg-[#f8fafc] text-slate-600 font-bold uppercase tracking-wider border-y border-slate-200">
                          <th className="py-3 px-4">Stage</th>
                          <th className="py-3 px-4">Worked By</th>
                          <th className="py-3 px-4">Work Date</th>
                          <th className="py-3 px-4 text-right">Consumption</th>
                          <th className="py-3 px-4">Lot (Article / Colour)</th>
                          <th className="py-3 px-4">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {sortPieceHistory(pieceDetail.history).map((h, idx) => (
                          <tr key={`${h.stage}-${idx}`} className={`hover:bg-slate-50 ${h.is_store_overlay ? 'bg-amber-50/40' : ''}`}>
                            <td className="py-3 px-4 font-bold text-slate-900">{h.label || formatStage(h.stage)}</td>
                            <td className="py-3 px-4 font-semibold text-slate-800">{h.employee || '—'}</td>
                            <td className="py-3 px-4 font-mono text-slate-600">{h.work_date || '—'}</td>
                            <td className="py-3 px-4 text-right font-mono">{typeof h.consumption === 'number' ? `${h.consumption} DCM` : '—'}</td>
                            <td className="py-3 px-4 text-slate-600">
                              {h.lot_article ? `${h.lot_article}${h.lot_colour ? ` / ${h.lot_colour}` : ''}` : '—'}
                            </td>
                            <td className="py-3 px-4 text-slate-500">
                              {h.is_store_overlay ? (h.store_status ? h.store_status.replace(/_/g, ' ') : 'Store handoff') : '—'}
                            </td>
                          </tr>
                        ))}
                        {(!pieceDetail.history || pieceDetail.history.length === 0) && (
                          <tr><td colSpan={6} className="text-center py-8 text-slate-400 font-medium">No stage history recorded for this piece yet.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
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
              <table className="w-full text-xs md:text-sm text-left">
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
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="text-base font-extrabold text-slate-900 truncate min-w-0">{selectedStageDetail.label || formatStage(selectedStageDetail.stage)}</h3>
                <button onClick={() => setSelectedStageDetail(null)} className="text-slate-400 hover:text-slate-700 shrink-0"><X className="w-4 h-4" /></button>
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
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="text-base font-extrabold text-slate-900 truncate min-w-0">{selectedOrderRow.style_name}</h3>
                <button onClick={() => setSelectedOrderRow(null)} className="text-slate-400 hover:text-slate-700 shrink-0"><X className="w-4 h-4" /></button>
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
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-black shrink-0">
                    {initials(selectedEmployeeModal.name)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-extrabold text-slate-900 truncate">{selectedEmployeeModal.name}</h3>
                    <p className="text-xs text-slate-500 truncate">{selectedEmployeeModal.designation || ''}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedEmployeeModal(null)} className="text-slate-400 hover:text-slate-700 shrink-0"><X className="w-4 h-4" /></button>
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
