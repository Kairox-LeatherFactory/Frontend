'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shirt,
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
  apiGetLiningDashboard,
  apiGetLiningEmployeeDetail,
  apiGetLiningConsumption,
} from '@/lib/api';

// Interactive Monthly Calendar Filter Picker Component
function CompleteDateCalendarPicker({ selectedDate, onSelectDate, availableDates = [], themeColor = '#e11d48' }) {
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
        className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:border-rose-500 focus:outline-none flex items-center justify-between gap-1 shadow-sm transition-all cursor-pointer"
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
              className={`px-2 py-1 rounded-lg transition-all ${selectedDate === 'all' ? 'bg-[#e11d48] text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
            >
              All Dates
            </button>
            <button
              onClick={() => { onSelectDate(new Date().toISOString().slice(0, 10)); setIsOpen(false); }}
              className={`px-2 py-1 rounded-lg transition-all ${selectedDate === new Date().toISOString().slice(0, 10) ? 'bg-[#e11d48] text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
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
                      ? 'bg-[#e11d48] text-white shadow-md scale-105 font-black'
                      : pieceActivity
                      ? 'bg-rose-50 text-rose-900 hover:bg-rose-100 font-extrabold'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <span>{d}</span>
                  {pieceActivity && !active && (
                    <span className="w-1 h-1 rounded-full bg-[#e11d48] mt-0.5"></span>
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
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 focus:outline-none focus:border-rose-600 cursor-pointer"
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
      {label && <p className="text-[10px] font-black uppercase tracking-wider text-[#f43f5e] mb-1">{label}</p>}
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

const STAGE_COLORS = ['#e11d48', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#0ea5e9', '#ec4899', '#84cc16', '#64748b'];

function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts.slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

function DashboardInner() {
  const searchParams = useSearchParams();
  const { token } = useAuth();

  const [activeTab, setActiveTab] = useState('tab-today');

  // ── Raw state from GET /api/v1/dashboard/lining — live backend data. ──
  const [meta, setMeta] = useState(null);
  const [productionKpis, setProductionKpis] = useState(null);
  const [liningKpis, setLiningKpis] = useState(null);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [orderProgress, setOrderProgress] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);
  const [lotsList, setLotsList] = useState([]);
  const [dailyProduction, setDailyProduction] = useState([]);
  const [upcomingList, setUpcomingList] = useState([]);

  // ── Piece-level lining cut log, from GET /api/v1/dashboard/lining/consumption ──
  const [piecesList, setPiecesList] = useState([]);
  const [piecesLoading, setPiecesLoading] = useState(false);

  const [selectedStyleDetail, setSelectedStyleDetail] = useState(null);

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  // Universal Cross-Filters
  const [filterDate, setFilterDate] = useState('all');
  const [filterOrder, setFilterOrder] = useState('all');
  const [filterStyle, setFilterStyle] = useState('all');
  const [filterLot, setFilterLot] = useState('all');
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [filterStage, setFilterStage] = useState('all');
  const [filterSize, setFilterSize] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [selectedPieceModal, setSelectedPieceModal] = useState(null);
  const [selectedEmployeeModal, setSelectedEmployeeModal] = useState(null);
  const [selectedEmployeePieces, setSelectedEmployeePieces] = useState([]);
  const [selectedEmployeePiecesLoading, setSelectedEmployeePiecesLoading] = useState(false);
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

  // ── LIVE BACKEND CALL: GET /api/v1/dashboard/lining ──
  useEffect(() => {
    let isMounted = true;
    async function fetchLiningDashboard() {
      if (!token) return;
      try {
        setLoading(true);
        setApiError(null);
        const params = {};
        if (filterOrder !== 'all') params.order_id = filterOrder;
        const data = await apiGetLiningDashboard(token, params);
        if (!isMounted || !data) return;
        setMeta(data.meta || null);
        setProductionKpis(data.production_kpis || data.kpis || null);
        setLiningKpis(data.material_kpis || data.lining_kpis || data.leather_kpis || null);
        setCurrentOrder(data.current_order || data.order || null);
        setOrderProgress(Array.isArray(data.order_progress) ? data.order_progress : (Array.isArray(data.styles) ? data.styles : []));
        setEmployeesList(Array.isArray(data.employees) ? data.employees : (Array.isArray(data.cutters) ? data.cutters : []));
        setLotsList(Array.isArray(data.lining_lots) ? data.lining_lots : (Array.isArray(data.lots) ? data.lots : (Array.isArray(data.rolls) ? data.rolls : [])));
        setDailyProduction(Array.isArray(data.daily_production) ? data.daily_production : (Array.isArray(data.daily_logs) ? data.daily_logs : []));
        setUpcomingList(Array.isArray(data.upcoming) ? data.upcoming : []);
      } catch (err) {
        console.warn('Backend API /api/v1/dashboard/lining notice:', err.message);
        if (isMounted) setApiError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchLiningDashboard();
    return () => { isMounted = false; };
  }, [token, filterOrder]);

  // ── LIVE BACKEND CALL: GET /api/v1/dashboard/lining/consumption ──
  useEffect(() => {
    let isMounted = true;
    async function fetchLiningConsumption() {
      if (!token) return;
      try {
        setPiecesLoading(true);
        const params = {};
        if (filterOrder !== 'all') params.order_id = filterOrder;
        if (filterEmployee !== 'all') params.employee_id = filterEmployee;
        if (filterDate !== 'all') {
          params.start = filterDate;
          params.end = filterDate;
        }
        const data = await apiGetLiningConsumption(token, params);
        if (isMounted) {
          if (Array.isArray(data)) {
            setPiecesList(data);
          } else if (data && Array.isArray(data.pieces)) {
            setPiecesList(data.pieces);
          } else if (data && Array.isArray(data.consumption)) {
            setPiecesList(data.consumption);
          } else {
            setPiecesList([]);
          }
        }
      } catch (err) {
        console.warn('Backend API /api/v1/dashboard/lining/consumption notice:', err.message);
        if (isMounted) setPiecesList([]);
      } finally {
        if (isMounted) setPiecesLoading(false);
      }
    }
    fetchLiningConsumption();
    return () => { isMounted = false; };
  }, [token, filterOrder, filterEmployee, filterDate]);

  // Handler to inspect operator/employee and call GET /api/v1/dashboard/lining/employees/{employee_id}
  const handleOpenEmployeeModal = async (emp) => {
    setSelectedEmployeeModal(emp);
    setSelectedEmployeePieces([]);
    const empId = emp?.employee_id || emp?.id;
    if (!token || !empId) return;
    try {
      setSelectedEmployeePiecesLoading(true);
      const detail = await apiGetLiningEmployeeDetail(token, empId);
      setSelectedEmployeePieces(Array.isArray(detail) ? detail : (detail?.pieces || []));
    } catch (err) {
      console.warn(`Backend API /api/v1/dashboard/lining/employees/${empId} notice:`, err.message);
    } finally {
      setSelectedEmployeePiecesLoading(false);
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
    setFilterEmployee('all');
    setFilterStage('all');
    setFilterSize('all');
    setSearchQuery('');
    triggerToast('Lining filters reset to default view');
  };

  // Orders available in dropdown
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
      const name = s.style_name || s.name || s.style;
      if (name) map.set(name, { id: s.style_id || s.id || name, name });
    });
    (currentOrder?.styles || []).forEach((s) => {
      const name = s.style_name || s.name;
      if (name) map.set(name, { id: s.style_id || s.id || name, name });
    });
    piecesList.forEach((p) => {
      if (p.style && !map.has(p.style)) map.set(p.style, { id: p.style, name: p.style });
    });
    return Array.from(map.values());
  }, [orderProgress, currentOrder, piecesList]);

  const availableLots = useMemo(
    () => lotsList.map((l) => ({
      id: l.lot_id || l.lot_number,
      label: `${l.lining_type || l.article || 'Lining'} · ${l.colour || l.color || 'Standard'} (${l.thickness || l.uom || 'MTRS'})`,
      raw: l,
    })),
    [lotsList]
  );

  const availableEmployees = useMemo(
    () => employeesList.map((c) => ({ id: c.employee_id || c.id || c.name, name: c.name })),
    [employeesList]
  );

  const availableStages = useMemo(
    () => Array.from(new Set(piecesList.map((p) => p.stage || p.current_stage || p.status).filter(Boolean))),
    [piecesList]
  );

  const availableSizes = useMemo(
    () => Array.from(new Set(piecesList.map((p) => p.size).filter(Boolean))).sort(),
    [piecesList]
  );

  const availableDates = useMemo(
    () => Array.from(new Set(piecesList.map((p) => p.work_date || p.last_worked || p.date).filter(Boolean))),
    [piecesList]
  );

  // Filtered piece rows computed client-side
  const filteredPieces = useMemo(() => {
    return piecesList.filter((p) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesQuery =
          (p.piece_code && p.piece_code.toLowerCase().includes(q)) ||
          (p.style && p.style.toLowerCase().includes(q)) ||
          (p.employee && p.employee.toLowerCase().includes(q)) ||
          (p.order_number && p.order_number.toLowerCase().includes(q)) ||
          (p.leather_article && p.leather_article.toLowerCase().includes(q)) ||
          (p.colour && p.colour.toLowerCase().includes(q));
        if (!matchesQuery) return false;
      }
      if (filterStyle !== 'all' && p.style !== filterStyle) return false;
      // Note: the consumption log carries no lot_id / lining-lot identity per piece
      // (see meta.unsupported.lining_allocation) — the Lot filter only narrows the
      // Inventory tab (visibleLots / filteredLotChartData), not this piece list.
      if (filterStage !== 'all' && (p.stage !== filterStage && p.current_stage !== filterStage && p.status !== filterStage)) return false;
      if (filterSize !== 'all' && p.size !== filterSize) return false;
      return true;
    });
  }, [piecesList, searchQuery, filterStyle, filterStage, filterSize]);

  // Paginated pieces
  const paginatedPieces = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPieces.slice(start, start + pageSize);
  }, [filteredPieces, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredPieces.length / pageSize) || 1;

  // Real DCM / Meters consumption aggregate per style
  const styleConsumptionAgg = useMemo(() => {
    const map = new Map();
    filteredPieces.forEach((p) => {
      if (!p.style) return;
      const key = `${p.order_number || ''}::${p.style}`;
      if (!map.has(key)) map.set(key, { total: 0, count: 0 });
      const entry = map.get(key);
      const val = typeof p.actual_consumption === 'number' ? p.actual_consumption : (typeof p.actual_avg_dcm === 'number' ? p.actual_avg_dcm : null);
      if (typeof val === 'number') {
        entry.total += val;
        entry.count += 1;
      }
    });
    return map;
  }, [filteredPieces]);

  const selectedStyleSizeBreakdown = useMemo(() => {
    if (!selectedStyleDetail) return [];
    const styleName = selectedStyleDetail.style_name || selectedStyleDetail.name;
    const map = new Map();
    filteredPieces
      .filter((p) => p.style === styleName)
      .forEach((p) => {
        const key = p.size || 'Unspecified';
        if (!map.has(key)) map.set(key, { size: key, pieces: 0, total: 0, count: 0 });
        const e = map.get(key);
        e.pieces += 1;
        const val = typeof p.actual_consumption === 'number' ? p.actual_consumption : null;
        if (typeof val === 'number') {
          e.total += val;
          e.count += 1;
        }
      });
    return Array.from(map.values()).sort((a, b) => a.size.localeCompare(b.size));
  }, [selectedStyleDetail, filteredPieces]);

  const filteredConsumptionLogs = useMemo(() => {
    return dailyProduction.filter((l) => (filterDate !== 'all' ? (l.work_date === filterDate || l.date === filterDate) : true));
  }, [dailyProduction, filterDate]);

  const lotStatus = (lot) => {
    const rem = lot.remaining ?? (lot.total_stock_meters ? lot.total_stock_meters - (lot.used || 0) : 0);
    const avail = lot.available ?? lot.total_stock_meters ?? 0;
    if (rem < 0) return { label: 'Overdrawn', cls: 'bg-red-100 text-red-800' };
    if (avail > 0 && rem / avail < 0.1) return { label: 'Low Stock', cls: 'bg-amber-100 text-amber-800' };
    return { label: 'Healthy', cls: 'bg-emerald-100 text-emerald-800' };
  };

  const delayBadgeCls = (status) => {
    if (!status) return 'bg-slate-100 text-slate-500';
    const s = String(status).toUpperCase();
    if (s.includes('DELAY')) return 'bg-rose-100 text-rose-800';
    if (s.includes('ON_TRACK') || s.includes('ONTRACK')) return 'bg-emerald-100 text-emerald-800';
    if (s.includes('NO_DEADLINE')) return 'bg-slate-100 text-slate-500';
    return 'bg-blue-100 text-blue-800';
  };

  // Chart datasets derived from filteredPieces
  const filteredDailyChartData = useMemo(() => {
    const map = new Map();
    filteredPieces.forEach((p) => {
      const date = p.work_date || p.last_worked || p.date || 'Unknown';
      if (!map.has(date)) map.set(date, { work_date: date, pieces_cut: 0, dcm_consumed: 0 });
      const e = map.get(date);
      e.pieces_cut += 1;
      const val = typeof p.actual_consumption === 'number' ? p.actual_consumption : 0;
      e.dcm_consumed += val;
    });
    return Array.from(map.values()).sort((a, b) => a.work_date.localeCompare(b.work_date));
  }, [filteredPieces]);

  const filteredStyleChartData = useMemo(() => {
    const map = new Map();
    filteredPieces.forEach((p) => {
      const key = p.style || 'Unspecified';
      if (!map.has(key)) map.set(key, { style_name: key, pieces_cut: 0, dcm_consumed: 0 });
      const e = map.get(key);
      e.pieces_cut += 1;
      const val = typeof p.actual_consumption === 'number' ? p.actual_consumption : 0;
      e.dcm_consumed += val;
    });
    return Array.from(map.values()).sort((a, b) => b.dcm_consumed - a.dcm_consumed);
  }, [filteredPieces]);

  const styleStageChartData = useMemo(() => {
    const styles = currentOrder?.styles || [];
    const stageKeys = Array.from(new Set(styles.flatMap((s) => Object.keys(s.stages || {}))));
    const rows = styles.map((s) => {
      const row = { style_name: s.style_name || s.name };
      stageKeys.forEach((k) => { row[k] = (s.stages || {})[k] || 0; });
      return row;
    });
    return { rows, stageKeys };
  }, [currentOrder]);

  // Pieces that have finished cutting and are queued for lining — from data.upcoming
  const filteredUpcoming = useMemo(() => {
    return upcomingList.filter((u) => filterOrder === 'all' || u.order_id === filterOrder);
  }, [upcomingList, filterOrder]);

  const upcomingStatusCls = (status) => {
    const s = String(status || '').toUpperCase();
    if (s === 'DONE') return 'bg-emerald-100 text-emerald-800';
    if (s === 'PENDING') return 'bg-amber-100 text-amber-800';
    return 'bg-slate-100 text-slate-500';
  };

  const anyPieceFilterActive =
    filterStyle !== 'all' || filterStage !== 'all' || filterSize !== 'all' || searchQuery !== '' ||
    filterEmployee !== 'all' || filterDate !== 'all';

  // Lots carry no per-piece linkage in the consumption log, so the Lot filter can
  // only select a specific lot directly — it cannot be inferred from piece filters.
  const visibleLots = useMemo(() => {
    if (filterLot !== 'all') return lotsList.filter((l) => (l.lot_id === filterLot || l.lot_number === filterLot));
    return lotsList;
  }, [lotsList, filterLot]);

  const filteredLotChartData = useMemo(() => {
    return visibleLots.map((l) => {
      const label = `${l.lining_type || l.article || 'Lining'} · ${l.colour || l.color || 'Standard'}`;
      return {
        label,
        available: l.available || l.total_stock_meters || l.total_stock_dcm || 0,
        used: l.used || 0,
      };
    });
  }, [visibleLots]);

  const visibleEmployees = useMemo(() => {
    if (filterEmployee === 'all') return employeesList;
    return employeesList.filter((c) => (c.employee_id === filterEmployee || c.id === filterEmployee || c.name === filterEmployee));
  }, [employeesList, filterEmployee]);

  const employeeFilteredStats = useMemo(() => {
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

  const filteredEmployeeChartData = useMemo(() => {
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

  // CSV Export action
  const handleExportCSV = () => {
    const headers = [
      'Piece Code', 'Work Date', 'Order #', 'Style', 'Size', 'Colour',
      'Leather Article', 'Thickness', 'Operator', 'Stage',
      'Actual DCM', 'Expected DCM', 'Variance DCM',
    ];

    const rows = filteredPieces.map((p) => [
      p.piece_code, p.work_date || p.last_worked, p.order_number, p.style, p.size, p.colour || p.color,
      p.leather_article, p.thickness, p.employee, p.stage || p.current_stage || p.status,
      p.actual_consumption, p.expected_consumption, p.variance,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((v) => (v ?? '')).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Lining_Floor_Traceability_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('📥 Lining Traceability CSV Report Downloaded Successfully');
  };

  // Top-line numbers
  const totalOrderPieces = productionKpis?.total_order_pieces ?? currentOrder?.total_pieces ?? 0;
  const overallCompleted = productionKpis?.overall_completed ?? 0;
  const overallPending = productionKpis?.overall_pending ?? 0;
  // production_kpis has no top-level minted_pieces field — derive it from the
  // per-style minted counts on current_order, which the backend does return.
  const mintedPieces = useMemo(
    () => (currentOrder?.styles || []).reduce((acc, s) => acc + (s.minted || 0), 0),
    [currentOrder]
  );
  const liningRequiredPieces = productionKpis?.lining_required_pieces ?? null;
  const damagePieces = productionKpis?.damage_pieces ?? 0;
  const reworkPieces = productionKpis?.rework_pieces ?? 0;

  const orderCompletionPct = currentOrder?.total_pieces
    ? Math.round(((currentOrder.completed ?? 0) / currentOrder.total_pieces) * 100)
    : (totalOrderPieces ? Math.round((overallCompleted / totalOrderPieces) * 100) : 0);

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
            <Zap className="w-4 h-4 text-[#f43f5e] animate-pulse" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── TOP ACTION BANNER (Full Width) ─── */}
      <div className="w-full bg-white p-5 rounded-2xl border border-[#e8edf3] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#e11d48] to-[#be123c] flex items-center justify-center text-white shadow-md">
            <Shirt className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-[#1e293b] tracking-tight">Lining Floor Operations Dashboard</h1>
            <p className="text-xs text-[#64748b] font-medium">Piece & Style Traceability &bull; Standard Unit: <strong className="text-[#e11d48]">Decimeter (DCM / dm²) & Meters</strong></p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#f8fafc] text-slate-700 border border-slate-200 text-xs font-bold hover:bg-slate-100 transition-all"
            title="Export currently loaded lining log to CSV"
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
            <Filter className="w-4 h-4 text-[#e11d48]" />
            <span>Universal Operations Cross-Filter</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#ffe4e6] text-[#be123c] border border-[#fecdd3]">
              Showing {filteredPieces.length} of {piecesList.length} Lining Records
            </span>
            <button
              onClick={handleResetFilters}
              className="text-xs text-rose-600 font-bold hover:underline cursor-pointer"
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
              placeholder="Search piece, style, operator..."
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#e11d48]"
            />
          </div>

          {/* Date Filter */}
          <div>
            <CompleteDateCalendarPicker
              selectedDate={filterDate}
              onSelectDate={(d) => { setFilterDate(d); setCurrentPage(1); }}
              availableDates={availableDates}
              themeColor="#e11d48"
            />
          </div>

          {/* Order Filter (server-side: order_id) */}
          <div>
            <select
              value={filterOrder}
              onChange={(e) => { setFilterOrder(e.target.value); setCurrentPage(1); }}
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#e11d48]"
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
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#e11d48]"
            >
              <option value="all">👗 All Styles</option>
              {availableStyles.map((s) => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Lining Lot Filter */}
          <div>
            <select
              value={filterLot}
              onChange={(e) => { setFilterLot(e.target.value); setCurrentPage(1); }}
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#e11d48]"
            >
              <option value="all">🧵 All Lots</option>
              {availableLots.map((lot) => (
                <option key={lot.id} value={lot.id}>{lot.label}</option>
              ))}
            </select>
          </div>

          {/* Operator Filter (server-side: employee_id) */}
          <div>
            <select
              value={filterEmployee}
              onChange={(e) => { setFilterEmployee(e.target.value); setCurrentPage(1); }}
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#e11d48]"
            >
              <option value="all">👷 All Operators</option>
              {availableEmployees.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Stage / Status Filter */}
          <div>
            <select
              value={filterStage}
              onChange={(e) => { setFilterStage(e.target.value); setCurrentPage(1); }}
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#e11d48]"
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
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#e11d48]"
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
          { id: 'tab-styles', label: '👗 Per-Style Lining Consumption (DCM)' },
          { id: 'tab-inventory', label: '🧵 Lining Stock & Allocation (MTRS / DCM)' },
          { id: 'tab-employees', label: '👷 Operator Performance' },
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
          <div className="w-full bg-gradient-to-br from-white via-[#f8fafc] to-[#fff1f2] border border-rose-200/70 rounded-3xl p-6 shadow-sm grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-rose-100 text-rose-800 border border-rose-200">
                    {currentOrder?.order_number || '—'}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    Client: <strong>{currentOrder?.client || '—'}</strong>
                  </span>
                </div>
                <h2 className="text-2xl font-black text-[#1e293b] tracking-tight">
                  {currentOrder?.total_pieces ?? totalOrderPieces} pcs ordered
                </h2>
                <p className="text-xs font-semibold text-slate-600 mt-0.5">
                  {(currentOrder?.styles || []).length} styles &bull; <span className="text-emerald-600">{currentOrder?.completed ?? 0} completed</span> &bull; <span className="text-amber-600">{currentOrder?.pending ?? 0} pending</span> in this order
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

            {/* Middle Col: Daily Pacing */}
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
                  <span className="text-[#e11d48]">{orderCompletionPct}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#e11d48] to-[#f43f5e] h-full rounded-full transition-all duration-500"
                    style={{ width: `${orderCompletionPct}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Right Col: Production KPI Breakdown */}
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
                <div className="bg-rose-50/70 p-2.5 rounded-xl border border-rose-100">
                  <span className="text-[10px] text-rose-500 uppercase font-semibold">Damage</span>
                  <div className="text-lg font-black text-rose-600">{damagePieces}</div>
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
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-lg">📦</div>
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
              {liningRequiredPieces !== null && (
                <div className="mt-1.5 flex justify-between text-[11px] text-slate-500 font-semibold">
                  <span>Lining-Required Pieces:</span>
                  <strong className="text-rose-600">{liningRequiredPieces}</strong>
                </div>
              )}
            </div>

            {/* KPI 2: Avg DCM / piece */}
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

            {/* KPI 3: Lining Stock */}
            <div onClick={() => setActiveTab('tab-inventory')} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">🧵</div>
              </div>
              <span className="text-xs font-semibold text-slate-500">Lining Consumed vs Stock</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900">
                  {(liningKpis?.used_lining ?? 0).toLocaleString()} DCM
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-dashed border-slate-100 flex justify-between text-xs text-slate-600 font-semibold">
                <span>Total Stock: <strong>{(liningKpis?.total_available_lining ?? liningKpis?.total_available_leather ?? 0).toLocaleString()}</strong></span>
                <span>Remaining: <strong className="text-emerald-600">{(liningKpis?.remaining_lining ?? liningKpis?.remaining_leather ?? 0).toLocaleString()}</strong></span>
              </div>
              <div className="mt-1.5 flex justify-between items-center text-[11px] text-slate-500 font-semibold">
                <span>Allocated:</span>
                {typeof liningKpis?.allocated_lining === 'number' ? <strong className="text-blue-700">{liningKpis.allocated_lining.toLocaleString()}</strong> : <NotAvailableBadge label="N/A" />}
              </div>
            </div>

            {/* KPI 4: Damage & Rework */}
            <div onClick={() => setActiveTab('tab-damage')} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg">📊</div>
              </div>
              <span className="text-xs font-semibold text-slate-500">Damage & Rework (Today)</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-amber-600">{productionKpis?.damage_today ?? 0} / {productionKpis?.rework_today ?? 0}</span>
              </div>
              <div className="mt-3 pt-3 border-t border-dashed border-slate-100 flex justify-between items-center text-xs text-slate-600 font-semibold">
                <span>Waste:</span>
                {typeof liningKpis?.total_lining_waste === 'number' ? <strong className="text-red-600">{liningKpis.total_lining_waste.toLocaleString()} DCM</strong> : <NotAvailableBadge />}
              </div>
            </div>
          </div>

          {/* DAILY PRODUCTION CADENCE CHART & LOG */}
          <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Daily Lining Cadence (filtered)</h3>
                  <p className="text-xs text-slate-500">Lining events & DCM consumed per day, computed live from the cut log matching active filters</p>
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
                    <Bar dataKey="pieces_cut" name="Lining Events (pcs)" fill="#e11d48" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="dcm_consumed" name="DCM Consumed" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {filteredDailyChartData.length === 0 && (
                <p className="text-center text-xs text-slate-400 font-medium py-4">No lining events match the current filters.</p>
              )}
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 mb-1">Backend Daily Log</h3>
                <p className="text-xs text-slate-500 mb-3">Order-wide assigned / completed / events, straight from daily_production</p>
                <div className="overflow-y-auto max-h-[250px] space-y-2 pr-1">
                  {filteredConsumptionLogs.map((log, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-[#f8fafc] border border-slate-100 text-xs">
                      <div>
                        <span className="font-bold text-slate-800">{log.work_date || log.date}</span>
                        <div className="text-[10px] text-slate-500 mt-0.5">Events: {log.events ?? 0}</div>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-rose-700">{log.completed ?? 0} done</span>
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

          {/* CUTTING → LINING HANDOFF QUEUE (from data.upcoming) */}
          <div className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Upcoming: Awaiting Lining</h3>
                <p className="text-xs text-slate-500">Size/colour groups where cutting is complete but lining hasn&rsquo;t started yet, straight from the backend queue</p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-50 text-[#e11d48] border border-rose-200">
                {filteredUpcoming.length} groups queued
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-[#f8fafc] text-slate-600 font-bold uppercase tracking-wider border-y border-slate-200">
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-4">Style</th>
                    <th className="py-3 px-4">Article</th>
                    <th className="py-3 px-4">Colour</th>
                    <th className="py-3 px-4">Thickness</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4 text-right">Expected Qty</th>
                    <th className="py-3 px-4">Target Date</th>
                    <th className="py-3 px-4 text-center">Cutting</th>
                    <th className="py-3 px-4 text-center">Lining</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredUpcoming.map((u, idx) => (
                    <tr key={`${u.order_id}-${u.style_id}-${u.colour}-${u.size}-${idx}`} className="hover:bg-rose-50/70 transition-all">
                      <td className="py-3 px-4 font-mono text-slate-600">{u.order_number}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{u.style}</td>
                      <td className="py-3 px-4">{u.article || '—'}</td>
                      <td className="py-3 px-4">{u.colour || '—'}</td>
                      <td className="py-3 px-4 font-mono">{u.thickness || '—'}</td>
                      <td className="py-3 px-4 font-bold">{u.size}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">{u.expected_qty ?? 0}</td>
                      <td className="py-3 px-4">{u.target_date || '—'}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${upcomingStatusCls(u.cutting_status)}`}>{u.cutting_status || '—'}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${upcomingStatusCls(u.lining_status)}`}>{u.lining_status || '—'}</span>
                      </td>
                    </tr>
                  ))}
                  {filteredUpcoming.length === 0 && (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-slate-400 font-medium">
                        {upcomingList.length === 0 ? 'No pieces currently queued for lining.' : 'No queued pieces match the current order filter.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* ====================================================================
           TAB 2: PER-STYLE LINING CONSUMPTION (DCM)
           ==================================================================== */}
      {activeTab === 'tab-styles' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-5">
          <div className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Per-Style / Order Progress</h3>
                <p className="text-xs text-slate-500">Real order_progress rows. Actual DCM columns are computed from the loaded lining log.</p>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-rose-50 text-[#e11d48] rounded-full border border-rose-200">
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
                    <th className="py-3 px-4">Order Date / Deadline</th>
                    <th className="py-3 px-4 text-right">Actual Avg (DCM)</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {orderProgress
                    .filter((s) => filterStyle === 'all' || (s.style_name || s.name) === filterStyle)
                    .filter((s) => filterOrder === 'all' || s.order_id === filterOrder)
                    .map((s, idx) => {
                      const sName = s.style_name || s.name;
                      const agg = styleConsumptionAgg.get(`${s.order_number}::${sName}`);
                      const avgDcm = agg && agg.count > 0 ? (agg.total / agg.count) : null;
                      const isSelected = (selectedStyleDetail?.style_id && selectedStyleDetail.style_id === s.style_id) || (selectedStyleDetail?.style_name === sName);
                      return (
                        <tr
                          key={`${s.order_id}-${s.style_id || idx}`}
                          onClick={() => {
                            setFilterStyle(sName);
                            setSelectedStyleDetail(s);
                            triggerToast(`⚡ Filtered to Style: ${sName}`);
                          }}
                          className={`hover:bg-rose-50/70 cursor-pointer transition-all ${isSelected ? 'bg-rose-50/90 font-bold' : ''}`}
                        >
                          <td className="py-3.5 px-4 font-bold text-slate-900">{sName}</td>
                          <td className="py-3.5 px-4 font-mono text-slate-600">{s.order_number}</td>
                          <td className="py-3.5 px-4">{s.article || '—'}</td>
                          <td className="py-3.5 px-4 text-right font-bold text-slate-800">{s.total_ordered ?? s.pieces ?? 0}</td>
                          <td className="py-3.5 px-4 text-right text-slate-700">{s.minted ?? 0}</td>
                          <td className="py-3.5 px-4 text-right text-emerald-700 font-bold">{s.completed ?? 0}</td>
                          <td className="py-3.5 px-4 text-right text-amber-700 font-bold">{s.pending ?? 0}</td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800">{s.completion_pct ?? 0}%</td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${delayBadgeCls(s.delay_status)}`}>
                              {s.delay_status ? String(s.delay_status).replace(/_/g, ' ') : '—'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-600 text-[11px]">
                            {s.order_date || '—'} / {s.delivery_deadline || '—'}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-extrabold text-[#e11d48]">
                            {avgDcm !== null ? `${avgDcm.toFixed(1)} DCM` : '—'}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedStyleDetail(s); }}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#e11d48] hover:text-white text-slate-700 text-[11px] font-bold transition-all"
                            >
                              Size Details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  {orderProgress.length === 0 && (
                    <tr>
                      <td colSpan={12} className="text-center py-8 text-slate-400 font-medium">No style/order progress data returned for this filter.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Size-wise breakdown computed from loaded lining log */}
          {selectedStyleDetail && (
            <div className="w-full bg-gradient-to-br from-white to-[#fff1f2] p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-sm font-extrabold text-[#1e293b]">
                    Size-Wise Consumption for Style: <span className="text-[#e11d48]">{selectedStyleDetail.style_name || selectedStyleDetail.name}</span>
                  </h4>
                  <p className="text-xs text-slate-500">Computed live from actual_consumption in the loaded lining log</p>
                </div>
              </div>

              {selectedStyleSizeBreakdown.length === 0 ? (
                <p className="text-xs text-slate-400 font-medium py-6 text-center">No lining log entries loaded yet for this style in the current filter window.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {selectedStyleSizeBreakdown.map((sb, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-base font-black text-slate-900">Size {sb.size}</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{sb.pieces} pcs</span>
                      </div>
                      <div className="space-y-1.5 text-xs font-medium my-2">
                        <div className="flex justify-between text-slate-500">
                          <span>Actual Avg:</span>
                          <span className="font-mono font-bold text-[#e11d48]">{sb.count > 0 ? (sb.total / sb.count).toFixed(1) : '—'} DCM</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Stage breakdown chart */}
          {currentOrder && styleStageChartData.rows.length > 0 && (
            <div className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-extrabold text-slate-900 mb-1">Style Progress by Stage — Order {currentOrder.order_number}</h3>
              <p className="text-xs text-slate-500 mb-4">Stage distribution per style from current_order.styles[].stages</p>
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

          {/* Actual DCM consumed per style */}
          <div className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-extrabold text-slate-900 mb-1">Actual DCM Consumed by Style (filtered)</h3>
            <p className="text-xs text-slate-500 mb-4">Computed live from actual_consumption in the currently filtered lining log</p>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredStyleChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="style_name" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} angle={-20} textAnchor="end" height={70} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip content={<CustomTooltip unit="" />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Bar dataKey="pieces_cut" name="Pieces Handled" fill="#e11d48" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="dcm_consumed" name="DCM Consumed" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {filteredStyleChartData.length === 0 && (
              <p className="text-center text-xs text-slate-400 font-medium py-4">No lining events match the current filters.</p>
            )}
          </div>
        </motion.div>
      )}

      {/* ====================================================================
           TAB 3: LINING STOCK & ALLOCATION (MTRS / DCM)
           ==================================================================== */}
      {activeTab === 'tab-inventory' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-5">
          <div className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Lining Inventory Stock & Lot Allocation (MTRS / DCM)</h3>
                <p className="text-xs text-slate-500">
                  {filterLot !== 'all' || anyPieceFilterActive
                    ? `Showing ${visibleLots.length} of ${lotsList.length} lots matching active filters`
                    : 'Available lining fabric inventory and consumption'}
                </p>
              </div>
              <span className="text-xs font-bold text-slate-500">
                Total Stock: <strong className="text-slate-900">{(liningKpis?.total_available_lining ?? liningKpis?.total_available_leather ?? 0).toLocaleString()} DCM / MTRS</strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-[#f8fafc] text-slate-600 font-bold uppercase tracking-wider border-y border-slate-200">
                    <th className="py-3 px-4">Lot #</th>
                    <th className="py-3 px-4">Lining Type</th>
                    <th className="py-3 px-4">Article</th>
                    <th className="py-3 px-4">Colour</th>
                    <th className="py-3 px-4">Thickness</th>
                    <th className="py-3 px-4">UOM</th>
                    <th className="py-3 px-4 text-right">Available</th>
                    <th className="py-3 px-4 text-right">Allocated</th>
                    <th className="py-3 px-4 text-right">Consumed</th>
                    <th className="py-3 px-4 text-right">Remaining</th>
                    <th className="py-3 px-4 text-right">Pieces Lined</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {visibleLots.map((lot, idx) => {
                    const status = lotStatus(lot);
                    return (
                      <tr key={lot.lot_id || lot.lot_number || idx} className="hover:bg-slate-50 transition-all">
                        <td className="py-3.5 px-4 font-mono font-bold text-rose-600">{lot.lot_number || lot.lot_id}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">{lot.lining_type || '—'}</td>
                        <td className="py-3.5 px-4">{lot.article || '—'}</td>
                        <td className="py-3.5 px-4">{lot.colour || lot.color || '—'}</td>
                        <td className="py-3.5 px-4 font-mono">{lot.thickness || '—'}</td>
                        <td className="py-3.5 px-4 uppercase text-slate-500">{lot.uom || 'MTRS'}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">{(lot.available ?? lot.total_stock_meters ?? 0).toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-right font-mono text-blue-700 font-semibold">{typeof lot.allocated === 'number' ? lot.allocated : <NotAvailableBadge />}</td>
                        <td className="py-3.5 px-4 text-right font-mono text-purple-700 font-bold">{(lot.used ?? lot.consumed ?? 0).toLocaleString()}</td>
                        <td className={`py-3.5 px-4 text-right font-mono font-black ${(lot.remaining ?? 0) < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                          {(lot.remaining ?? 0).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-600">{lot.pieces_lined ?? 0}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${status.cls}`}>{status.label}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => setSelectedLotModal(lot)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#e11d48] hover:text-white text-slate-700 text-[11px] font-bold transition-all"
                          >
                            View Lot Trace
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {visibleLots.length === 0 && (
                    <tr>
                      <td colSpan={13} className="text-center py-8 text-slate-400 font-medium">
                        {lotsList.length === 0 ? 'No lining inventory lots recorded.' : 'No lots match the current filters.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-400 font-semibold mt-3 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              {meta?.unsupported?.lining_allocation || 'Allocation is synced from ERP warehouse rolls.'}
            </p>
          </div>

          {/* Lot Stock vs Consumption Chart */}
          <div className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-extrabold text-slate-900 mb-1">Lot Stock vs Consumption</h3>
            <p className="text-xs text-slate-500 mb-4">Available stock vs total consumed per lot, straight from the backend ledger</p>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredLotChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} angle={-20} textAnchor="end" height={70} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip content={<CustomTooltip unit="DCM / MTRS" />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Bar dataKey="available" name="Available Stock" fill="#e11d48" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="used" name="Used" fill="#f59e0b" radius={[6, 6, 0, 0]} />
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
           TAB 4: OPERATOR PERFORMANCE
           ==================================================================== */}
      {activeTab === 'tab-employees' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-5">
          {filterEmployee !== 'all' && (
            <p className="text-xs font-bold text-slate-500">Showing {visibleEmployees.length} of {employeesList.length} operators matching active filter</p>
          )}
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-5">
            {visibleEmployees.map((emp, idx) => {
              const inFilter = employeeFilteredStats.get(emp.name);
              const dcmPerPiece = emp.assigned_pieces ? ((emp.used_lining || 0) / emp.assigned_pieces).toFixed(1) : '—';
              return (
                <div
                  key={emp.employee_id || emp.id || idx}
                  onClick={() => handleOpenEmployeeModal(emp)}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      {emp.photo ? (
                        <img src={emp.photo} alt={emp.name} className="w-12 h-12 rounded-full object-cover border border-slate-200" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#e11d48] to-[#be123c] flex items-center justify-center text-white font-black text-sm">
                          {initials(emp.name)}
                        </div>
                      )}
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900">{emp.name}</h4>
                        <p className="text-xs text-slate-500">{emp.designation || emp.role || 'Lining Operator'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-semibold my-3">
                      <div className="bg-[#f8fafc] p-2.5 rounded-xl">
                        <span className="text-[10px] text-slate-500">Assigned Today</span>
                        <div className="text-base font-black text-slate-900">{emp.assigned_today ?? emp.assigned_pieces ?? 0} pcs</div>
                      </div>
                      <div className="bg-[#f8fafc] p-2.5 rounded-xl">
                        <span className="text-[10px] text-slate-500">Completed Today</span>
                        <div className="text-base font-black text-emerald-700">{emp.completed_today ?? 0} pcs</div>
                      </div>
                      <div className="bg-[#f8fafc] p-2.5 rounded-xl">
                        <span className="text-[10px] text-slate-500">DCM Consumed</span>
                        <div className="text-base font-black text-[#e11d48]">{emp.used_lining ?? 0} DCM</div>
                      </div>
                      <div className="bg-[#f8fafc] p-2.5 rounded-xl">
                        <span className="text-[10px] text-slate-500">DCM / Piece</span>
                        <div className="text-base font-black text-emerald-700">{dcmPerPiece}</div>
                      </div>
                      <div className="bg-[#f8fafc] p-2.5 rounded-xl">
                        <span className="text-[10px] text-slate-500">Damage / Rework</span>
                        <div className="text-base font-black text-red-600">{emp.damage_pieces ?? 0} / {emp.rework_today ?? emp.rework_pieces ?? 0}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-bold px-0.5">
                      <span className="text-slate-400">Daily Target</span>
                      {typeof emp.daily_target === 'number'
                        ? <span className="text-slate-800">{emp.daily_target} pcs</span>
                        : <span title={meta?.unsupported?.employee_target_photo}><NotAvailableBadge label="N/A" /></span>}
                    </div>

                    <div className="mt-1 p-2.5 rounded-xl bg-rose-50/70 border border-rose-100 flex items-center justify-between text-[11px] font-bold">
                      <span className="text-rose-700">In Current Filter</span>
                      <span className="text-slate-800">{inFilter?.pieces_cut ?? 0} pcs &bull; {(inFilter?.dcm_consumed ?? 0).toFixed(1)} DCM</span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); handleOpenEmployeeModal(emp); }}
                    className="w-full mt-2 py-2 rounded-xl bg-slate-100 hover:bg-[#1e293b] hover:text-white text-slate-800 text-xs font-bold transition-all"
                  >
                    View Operator Pieces & Logs
                  </button>
                </div>
              );
            })}
            {visibleEmployees.length === 0 && (
              <div className="col-span-3 text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400 font-medium">
                {employeesList.length === 0 ? 'No lining operators registered.' : 'No operators match the current filter.'}
              </div>
            )}
          </div>

          {/* Operator Throughput Chart */}
          <div className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-extrabold text-slate-900 mb-1">Operator Throughput (filtered)</h3>
            <p className="text-xs text-slate-500 mb-4">Pieces handled & DCM consumed per operator</p>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredEmployeeChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip content={<CustomTooltip unit="" />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="pieces_cut" name="Pieces Handled" fill="#e11d48" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="dcm_consumed" name="DCM Consumed" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {filteredEmployeeChartData.length === 0 && (
              <p className="text-center text-xs text-slate-400 font-medium py-4">No events match the current filters.</p>
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
                <p className="text-xs text-slate-500">Every logged lining cut event with actual consumption, operator, and current stage</p>
                {meta?.unsupported?.lining_single_event && (
                  <p className="text-[10px] text-slate-400 font-medium mt-1 flex items-center gap-1"><Info className="w-3 h-3" />{meta.unsupported.lining_single_event}</p>
                )}
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
                    <th className="py-3 px-4">Leather Article</th>
                    <th className="py-3 px-4">Operator</th>
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
                      <td className="py-3.5 px-4 font-semibold text-rose-700">
                        {p.leather_article || '—'}
                        {p.thickness && <span className="block text-[10px] text-slate-400 font-mono font-normal">{p.thickness} mm</span>}
                      </td>
                      <td className="py-3.5 px-4 text-slate-800">{p.employee}</td>
                      <td className="py-3.5 px-4 font-bold text-blue-700">{formatStage(p.stage || p.current_stage || p.status)}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-[#e11d48]">
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
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#e11d48] hover:text-white text-slate-700 text-[11px] font-bold transition-all"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                  {paginatedPieces.length === 0 && (
                    <tr>
                      <td colSpan={11} className="text-center py-8 text-slate-400 font-medium">
                        {piecesLoading ? 'Loading lining log…' : 'No lining events match the current filters.'}
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

          {/* Events by style */}
          <div className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-extrabold text-slate-900 mb-1">Lining Events by Style (filtered)</h3>
            <p className="text-xs text-slate-500 mb-4">Pieces cut & DCM consumed per style</p>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredStyleChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="style_name" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} angle={-20} textAnchor="end" height={70} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip unit="" />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="pieces_cut" name="Pieces Handled" fill="#e11d48" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="dcm_consumed" name="DCM Consumed" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {filteredStyleChartData.length === 0 && (
              <p className="text-center text-xs text-slate-400 font-medium py-4">No events match the current filters.</p>
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
              <p className="text-xs text-slate-500">Aggregate counts are real backend values; per-piece defect drill-down is tracked across shifts.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-100">
                <span className="text-[10px] text-rose-500 uppercase font-bold">Damage (Total)</span>
                <div className="text-2xl font-black text-rose-600">{damagePieces}</div>
              </div>
              <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-100">
                <span className="text-[10px] text-rose-500 uppercase font-bold">Damage (Today)</span>
                <div className="text-2xl font-black text-rose-600">{productionKpis?.damage_today ?? 0}</div>
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
                <p className="text-xs font-bold text-amber-800">Per-piece damage drill-down note</p>
                <p className="text-[11px] text-amber-700 mt-1">
                  {meta?.unsupported?.damage_tracking || 'Defects logged at the inspection station will automatically appear in shift statistics.'}
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
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
              <h3 className="text-sm font-extrabold text-slate-900 mb-1">Lining Waste Loss Breakdown (DCM)</h3>
              <p className="text-xs text-slate-500 mb-4">Total waste distribution across patterns, trimmings, and off-cuts</p>
              {typeof liningKpis?.total_lining_waste === 'number' ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 py-10">
                  <span className="text-3xl font-black text-red-600">{liningKpis.total_lining_waste.toLocaleString()} DCM</span>
                  <span className="text-xs text-slate-500 font-semibold">Total lining waste (material_kpis)</span>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 py-10">
                  <NotAvailableBadge label="Waste tracking not available yet" />
                  <p className="text-[11px] text-slate-400 text-center max-w-xs">
                    {meta?.unsupported?.expected_consumption || 'Consumption baseline is configured per style pattern.'}
                  </p>
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-extrabold text-slate-900 mb-1">Operator Throughput & Lining Consumed (filtered)</h3>
              <p className="text-xs text-slate-500 mb-4">Pieces handled & DCM consumed per operator</p>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredEmployeeChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip content={<CustomTooltip unit="" />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="pieces_cut" name="Pieces Handled" fill="#e11d48" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="dcm_consumed" name="DCM Consumed" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {filteredEmployeeChartData.length === 0 && (
                <p className="text-center text-xs text-slate-400 font-medium py-4">No events match the current filters.</p>
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
            <p className="text-xs text-slate-500">Direct relationship: Order &rarr; Style &rarr; Lining Roll &rarr; Operator &rarr; Piece &rarr; Consumption (DCM)</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {[
              { title: '1. Order', desc: currentOrder ? `${currentOrder.order_number} / ${currentOrder.client || 'Client'}` : '—', icon: '📦', color: 'bg-blue-50 text-blue-700' },
              { title: '2. Style', desc: currentOrder?.styles?.[0] ? `${currentOrder.styles[0].style_name || currentOrder.styles[0].name}${currentOrder.styles[0].thickness ? ` (${currentOrder.styles[0].thickness})` : ''}` : '—', icon: '👗', color: 'bg-purple-50 text-purple-700' },
              { title: '3. Lining Roll', desc: lotsList[0] ? `${lotsList[0].lining_type || lotsList[0].article || 'Lining'} · ${lotsList[0].colour || 'Std'}` : '—', icon: '🧵', color: 'bg-rose-50 text-rose-700' },
              { title: '4. Lining Cut', desc: employeesList.length ? employeesList.slice(0, 2).map((c) => c.name).join(' / ') : '—', icon: '✂️', color: 'bg-amber-50 text-amber-700' },
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
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800">{formatStage(selectedPieceModal.stage || selectedPieceModal.current_stage || selectedPieceModal.status)}</span>
                <span className="text-xs text-slate-400 font-semibold">Last worked: {selectedPieceModal.work_date || selectedPieceModal.last_worked || '—'}</span>
              </div>

              <div className="grid grid-cols-3 gap-3 p-4 bg-[#f8fafc] rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Actual Consumed</span>
                  <p className="text-base font-mono font-black text-[#e11d48]">
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
                <p>Operator: <strong>{selectedPieceModal.employee}</strong> &bull; Leather: <strong>{selectedPieceModal.leather_article || '—'} / {selectedPieceModal.colour || selectedPieceModal.color || '—'} / {selectedPieceModal.thickness || '—'} mm</strong></p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ====================================================================
           MODAL 2: OPERATOR PIECES (from /dashboard/lining/employees/{id})
           ==================================================================== */}
      <AnimatePresence>
        {selectedEmployeeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  {selectedEmployeeModal.photo ? (
                    <img src={selectedEmployeeModal.photo} alt={selectedEmployeeModal.name} className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#e11d48] to-[#be123c] flex items-center justify-center text-white font-black text-xs">
                      {initials(selectedEmployeeModal.name)}
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">{selectedEmployeeModal.name}</h3>
                    <p className="text-xs text-slate-500">{selectedEmployeeModal.designation || selectedEmployeeModal.role || 'Lining Operator'} &bull; Assigned: {selectedEmployeeModal.assigned_pieces ?? 0} pcs</p>
                  </div>
                </div>
                <button onClick={() => setSelectedEmployeeModal(null)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">
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
                    {selectedEmployeePieces.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-right font-mono text-slate-400">{p.seq || idx + 1}</td>
                        <td className="py-2 px-3 font-mono font-bold">{p.piece_code}</td>
                        <td className="py-2 px-3">{p.style}</td>
                        <td className="py-2 px-3">{p.size} / {p.colour || p.color || '—'}</td>
                        <td className="py-2 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">{formatStage(p.stage || p.current_stage || p.status)}</span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-500">{p.work_date || p.last_worked || '—'}</td>
                      </tr>
                    ))}
                    {!selectedEmployeePiecesLoading && selectedEmployeePieces.length === 0 && (
                      <tr><td colSpan={6} className="text-center py-8 text-slate-400 font-medium">No pieces returned for this operator.</td></tr>
                    )}
                    {selectedEmployeePiecesLoading && (
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
           MODAL 3: LINING LOT SPECIFICATION
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
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Lining Roll / Lot Specification</span>
                  <h3 className="text-sm font-mono font-extrabold text-rose-600">{selectedLotModal.lot_number || selectedLotModal.lot_id}</h3>
                </div>
                <button onClick={() => setSelectedLotModal(null)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs font-semibold">
                {[
                  ['Lining Type', selectedLotModal.lining_type],
                  ['Article', selectedLotModal.article],
                  ['Colour', selectedLotModal.colour || selectedLotModal.color],
                  ['Thickness', selectedLotModal.thickness],
                  ['UOM', selectedLotModal.uom || 'MTRS'],
                  ['Available', `${selectedLotModal.available || selectedLotModal.total_stock_meters || 0} ${selectedLotModal.uom || 'MTRS'}`],
                  ['Allocated', typeof selectedLotModal.allocated === 'number' ? `${selectedLotModal.allocated} ${selectedLotModal.uom || 'MTRS'}` : '—'],
                  ['Used', `${selectedLotModal.used || selectedLotModal.consumed || 0} ${selectedLotModal.uom || 'MTRS'}`],
                  ['Remaining', `${selectedLotModal.remaining || 0} ${selectedLotModal.uom || 'MTRS'}`],
                  ['Pieces Lined', selectedLotModal.pieces_lined ?? '—'],
                  ['Supplier', selectedLotModal.supplier || '—'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">{label}:</span>
                    <span className="font-mono font-bold text-slate-900">{value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default function LiningManagerDashboard() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center text-[#e11d48]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e11d48] mx-auto mb-3"></div>
            <p className="font-semibold text-xs tracking-widest uppercase">Loading Lining Dashboard...</p>
          </div>
        </div>
      }
    >
      <DashboardInner />
    </Suspense>
  );
}
