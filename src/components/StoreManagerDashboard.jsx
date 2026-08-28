'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Boxes,
  Layers,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Search,
  Download,
  Filter,
  CheckCircle2,
  Clock,
  User,
  Package,
  Eye,
  X,
  Plus,
  BarChart3,
  Calendar,
  Activity,
  ArrowRight,
  ShieldCheck,
  Zap,
  Tag,
  QrCode,
  FileSpreadsheet,
  PauseCircle,
  Archive,
  Shirt,
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
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import {
  apiGetStoreDashboard,
  apiGetStoreDrawerDetail,
  apiGetStoreDrawerMovement,
  apiGetStoreTraceability,
} from '@/lib/api';

// Badge shown wherever the live backend has no data for a field yet
// (see meta.unsupported.* on the /dashboard/store response).
function NotAvailableBadge({ label = 'Not tracked yet' }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200"
      title="This field is not yet supported by the backend"
    >
      — {label}
    </span>
  );
}

// Interactive Monthly Calendar Filter Picker Component
function CompleteDateCalendarPicker({ selectedDate, onSelectDate, availableDates = [], themeColor = '#0891b2' }) {
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
        className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:border-cyan-500 focus:outline-none flex items-center justify-between gap-1 shadow-sm transition-all cursor-pointer"
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
              className={`px-2 py-1 rounded-lg transition-all ${selectedDate === 'all' ? 'bg-[#0891b2] text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
            >
              All Dates
            </button>
            <button
              onClick={() => { onSelectDate(new Date().toISOString().slice(0, 10)); setIsOpen(false); }}
              className={`px-2 py-1 rounded-lg transition-all ${selectedDate === new Date().toISOString().slice(0, 10) ? 'bg-[#0891b2] text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
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
                      ? 'bg-[#0891b2] text-white shadow-md scale-105 font-black'
                      : pieceActivity
                      ? 'bg-cyan-50 text-cyan-900 hover:bg-cyan-100 font-extrabold'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <span>{d}</span>
                  {pieceActivity && !active && (
                    <span className="w-1 h-1 rounded-full bg-[#0891b2] mt-0.5"></span>
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
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 focus:outline-none focus:border-cyan-600 cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Chart custom tooltip
function CustomTooltip({ active, payload, label, unit = 'drawers' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1e293b] border border-slate-700 text-white px-3.5 py-2.5 rounded-xl text-xs shadow-2xl z-50">
      {label && <p className="text-[10px] font-black uppercase tracking-wider text-[#06b6d4] mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="font-semibold flex items-center justify-between gap-4" style={{ color: p.color || p.fill }}>
          <span>{p.name}:</span>
          <span className="text-white font-mono font-bold">{p.value} {unit}</span>
        </p>
      ))}
    </div>
  );
}

function StoreDashboardContent() {
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const { orders: contextOrders } = useData();

  // State — populated entirely from the live /api/v1/dashboard/store family of endpoints
  const [activeTab, setActiveTab] = useState('tab-today');
  const [meta, setMeta] = useState(null);
  const [kpis, setKpis] = useState(null);
  const [drawersList, setDrawersList] = useState([]);
  const [stylesList, setStylesList] = useState([]);
  const [ordersList, setOrdersList] = useState(() => contextOrders || []);
  const [activeOrder, setActiveOrder] = useState(() => contextOrders?.[0] || null);

  const [traceabilityList, setTraceabilityList] = useState([]);
  const [traceabilityLoading, setTraceabilityLoading] = useState(false);
  const [traceabilityError, setTraceabilityError] = useState(null);

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Sync context orders
  useEffect(() => {
    if (contextOrders && contextOrders.length > 0 && ordersList.length === 0) {
      setOrdersList(contextOrders);
      if (!activeOrder) setActiveOrder(contextOrders[0]);
    }
  }, [contextOrders, ordersList, activeOrder]);

  // Universal Filters
  const [filterDate, setFilterDate] = useState('all');
  const [filterStyle, setFilterStyle] = useState('all');
  const [filterMaterial, setFilterMaterial] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [selectedDrawerModal, setSelectedDrawerModal] = useState(null);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Pagination for drawer master
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Sync tab from URL query params (from sidebar tree sub-branches)
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Dynamic Options for Selects
  const availableStyles = useMemo(() => {
    const map = new Map();
    stylesList.forEach((s) => {
      const name = s.style || s.style_name || s.name;
      if (name) map.set(name, { id: s.id || s.style_id || name, name });
    });
    drawersList.forEach((d) => {
      if (d.style && !map.has(d.style)) map.set(d.style, { id: d.style, name: d.style });
    });
    ordersList.forEach((o) => {
      o.styles?.forEach((s) => {
        if (s.name && !map.has(s.name)) map.set(s.name, { id: s.id || s.name, name: s.name });
      });
    });
    return Array.from(map.values());
  }, [stylesList, drawersList, ordersList]);

  const availableMaterials = useMemo(() => {
    return [
      { id: 'LEATHER+LINING', label: 'Leather + Lining (Both)' },
      { id: 'LEATHER', label: 'Leather Only' },
      { id: 'LINING', label: 'Lining Only' },
    ];
  }, []);

  const availableStatuses = useMemo(() => {
    const set = new Set(['In Store', 'Ready to Send', 'Sent to Production', 'Held']);
    drawersList.forEach((d) => { if (d.status_label) set.add(d.status_label); });
    return Array.from(set).filter(Boolean);
  }, [drawersList]);

  const availableDates = useMemo(() => {
    const set = new Set();
    drawersList.forEach((d) => {
      if (d.received_at) set.add(d.received_at.slice(0, 10));
      if (d.sended_at) set.add(d.sended_at.slice(0, 10));
    });
    return Array.from(set).filter(Boolean);
  }, [drawersList]);

  // Filtered drawers computed dynamically based on ALL cross-filters
  const filteredDrawers = useMemo(() => {
    return drawersList.filter((d) => {
      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesQuery =
          (d.drawer_code && d.drawer_code.toLowerCase().includes(q)) ||
          (d.style && d.style.toLowerCase().includes(q)) ||
          (d.piece_code && d.piece_code.toLowerCase().includes(q)) ||
          (d.order_number && d.order_number.toLowerCase().includes(q)) ||
          (d.status_label && d.status_label.toLowerCase().includes(q));
        if (!matchesQuery) return false;
      }
      // Date
      if (filterDate !== 'all') {
        const recDate = d.received_at ? d.received_at.slice(0, 10) : null;
        const sendDate = d.sended_at ? d.sended_at.slice(0, 10) : null;
        if (recDate !== filterDate && sendDate !== filterDate) return false;
      }
      // Style
      if (filterStyle !== 'all' && d.style !== filterStyle) return false;
      // Material
      if (filterMaterial !== 'all') {
        if (filterMaterial === 'LEATHER' && d.material_type !== 'LEATHER') return false;
        if (filterMaterial === 'LINING' && d.material_type !== 'LINING') return false;
        if (filterMaterial === 'LEATHER+LINING' && d.material_type !== 'LEATHER+LINING') return false;
      }
      // Status
      if (filterStatus !== 'all' && d.status_label !== filterStatus) return false;

      return true;
    });
  }, [drawersList, searchQuery, filterDate, filterStyle, filterMaterial, filterStatus]);

  // Styles in Store table narrowed by the Style cross-filter — previously the
  // filter only highlighted the matching row here instead of actually
  // reducing the list to it.
  const filteredStylesList = useMemo(() => {
    if (filterStyle === 'all') return stylesList;
    return stylesList.filter((st) => (st.style || st.style_name || st.name) === filterStyle);
  }, [stylesList, filterStyle]);

  // Held / empty drawers aren't separate endpoints — they're subsets of the
  // filtered drawers list, split by the state the backend already assigned.
  // Sourced from filteredDrawers (not the raw drawersList) so the universal
  // cross-filter (date/style/material/status/search) reaches the Held
  // and Empty tabs too, not just the Drawer Master table.
  const heldList = useMemo(
    () => filteredDrawers.filter((d) => d.status_label === 'Held'),
    [filteredDrawers]
  );
  const emptyList = useMemo(
    () => filteredDrawers.filter((d) => d.contents === 'EMPTY' && d.status_label !== 'Held'),
    [filteredDrawers]
  );

  // Paginated drawers
  const paginatedDrawers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDrawers.slice(start, start + pageSize);
  }, [filteredDrawers, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredDrawers.length / pageSize) || 1;

  // Dynamic daily production / drawer throughput chart data
  const dynamicDailyChartData = useMemo(() => {
    const map = new Map();
    filteredDrawers.forEach((d) => {
      const date = d.received_at ? d.received_at.slice(0, 10) : (d.sended_at ? d.sended_at.slice(0, 10) : null);
      if (!date) return; // no timestamp to bucket by (e.g. an untouched waiting drawer)
      if (!map.has(date)) {
        map.set(date, {
          work_date: date,
          received: 0,
          sent: 0,
          held: 0,
          emptied: 0,
        });
      }
      const row = map.get(date);
      if (d.state === 'received' || d.status_label === 'In Store' || d.status_label === 'Ready to Send') row.received += 1;
      if (d.state === 'sended' || d.status_label === 'Sent to Production') row.sent += 1;
      if (d.state === 'merged' || d.status_label === 'Held') row.held += 1;
    });
    return Array.from(map.values()).sort((a, b) => b.work_date.localeCompare(a.work_date));
  }, [filteredDrawers]);

  // LIVE BACKEND CALL: /api/v1/dashboard/store
  useEffect(() => {
    let isMounted = true;
    async function fetchStoreDashboard() {
      if (!token) return;
      try {
        setLoading(true);
        setApiError(null);
        const params = {};
        // filterStyle holds a style NAME (for client-side row filtering + the
        // Styles tab's click-to-filter); resolve it to the real style_id the
        // backend expects.
        if (filterStyle && filterStyle !== 'all') {
          const styleObj = stylesList.find((s) => (s.style || s.style_name || s.name) === filterStyle);
          if (styleObj?.style_id) params.style_id = styleObj.style_id;
        }
        if (filterMaterial && filterMaterial !== 'all') params.material_type = filterMaterial;
        // filterStatus is a derived status_label ("In Store"/"Held"/...), not
        // the backend's `state` enum (received/sended/merged/holding_both/...)
        // — status filtering is applied client-side in filteredDrawers instead.

        const data = await apiGetStoreDashboard(token, params);
        if (isMounted && data) {
          setMeta(data.meta || null);
          setKpis(data.kpis || null);
          setDrawersList(Array.isArray(data.drawers) ? data.drawers : []);
          setStylesList(Array.isArray(data.current_styles) ? data.current_styles : []);
        }
      } catch (err) {
        console.warn('Backend API /api/v1/dashboard/store notice:', err.message);
        if (isMounted) setApiError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchStoreDashboard();
    return () => { isMounted = false; };
  }, [token, filterStyle, filterMaterial, refreshKey]);

  // LIVE BACKEND CALL: /api/v1/dashboard/store/traceability (Cutter Traceability tab)
  useEffect(() => {
    let isMounted = true;
    async function fetchTraceability() {
      if (!token || activeTab !== 'tab-employees') return;
      try {
        setTraceabilityLoading(true);
        setTraceabilityError(null);
        const params = {};
        if (filterStyle && filterStyle !== 'all') {
          const styleObj = stylesList.find((s) => (s.style || s.style_name || s.name) === filterStyle);
          if (styleObj?.style_id) params.style_id = styleObj.style_id;
        }
        if (filterMaterial && filterMaterial !== 'all') params.material_type = filterMaterial;
        if (searchQuery) params.piece_code = searchQuery;

        const data = await apiGetStoreTraceability(token, params);
        if (isMounted && data) {
          setTraceabilityList(
            Array.isArray(data.pieces) ? data.pieces
              : Array.isArray(data.traceability) ? data.traceability
              : Array.isArray(data) ? data
              : []
          );
        }
      } catch (err) {
        console.warn('Backend API /api/v1/dashboard/store/traceability notice:', err.message);
        if (isMounted) setTraceabilityError(err.message);
      } finally {
        if (isMounted) setTraceabilityLoading(false);
      }
    }
    fetchTraceability();
    return () => { isMounted = false; };
  }, [token, activeTab, filterStyle, filterMaterial, searchQuery, stylesList]);

  // Handler to inspect drawer and call /api/v1/dashboard/store/drawers/{drawer_id} & movement
  const handleOpenDrawerModal = async (drawer) => {
    setSelectedDrawerModal(drawer);
    if (!token || !drawer?.drawer_id) return;
    try {
      const [detail, movement] = await Promise.allSettled([
        apiGetStoreDrawerDetail(token, drawer.drawer_id),
        apiGetStoreDrawerMovement(token, drawer.drawer_id),
      ]);
      if (detail.status === 'fulfilled' && detail.value) {
        setSelectedDrawerModal((prev) => ({ ...prev, ...detail.value }));
      }
      if (movement.status === 'fulfilled' && movement.value) {
        const history = Array.isArray(movement.value) ? movement.value
          : Array.isArray(movement.value?.movement) ? movement.value.movement
          : Array.isArray(movement.value?.history) ? movement.value.history
          : Array.isArray(movement.value?.events) ? movement.value.events
          : [];
        setSelectedDrawerModal((prev) => ({ ...prev, movement_history: history }));
      }
    } catch (err) {
      console.warn(`Backend API /api/v1/dashboard/store/drawers/${drawer.drawer_id} notice:`, err.message);
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
    setFilterStyle('all');
    setFilterMaterial('all');
    setFilterStatus('all');
    setSearchQuery('');
    triggerToast('Store filters reset to default view');
  };

  // CSV Export action
  const handleExportCSV = () => {
    const headers = [
      'Drawer Code',
      'Seq',
      'Style',
      'Order #',
      'Piece Code',
      'Material Contents',
      'Material Type',
      'Received At',
      'Sended At',
      'Status',
    ];

    const rows = filteredDrawers.map((d) => [
      d.drawer_code,
      d.seq,
      d.style,
      d.order_number,
      d.piece_code,
      d.contents,
      d.material_type,
      d.received_at || 'N/A',
      d.sended_at || 'N/A',
      d.status_label,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Store_Drawer_Movement_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('📥 Store Drawer Movement CSV Report Downloaded Successfully');
  };

  // Hold Drawer form submit — no backend write endpoint exists for this yet,
  // so this only flags the real drawer locally (lost on next refresh). The
  // derived heldList picks this up automatically since it's computed from
  // drawersList.
  const handleHoldDrawerSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const drawerCode = formData.get('drawerCode');
    const reason = formData.get('reason');
    const heldBy = formData.get('heldBy');

    if (!drawersList.some((d) => d.drawer_code === drawerCode)) {
      triggerToast(`⚠️ Drawer ${drawerCode} not found in the live registry`);
      return;
    }

    setDrawersList((prev) =>
      prev.map((d) =>
        d.drawer_code === drawerCode
          ? {
              ...d,
              status_label: 'Held',
              hold_reason: reason,
              held_by: heldBy,
            }
          : d
      )
    );

    setShowHoldModal(false);
    triggerToast(`🛑 Drawer ${drawerCode} put on HOLD locally: ${reason} (not yet persisted — no hold endpoint)`);
  };

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
            <Zap className="w-4 h-4 text-[#06b6d4] animate-pulse" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── TOP ACTION BANNER (Full Width) ─── */}
      <div className="w-full bg-white p-5 rounded-2xl border border-[#e8edf3] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#0891b2] to-[#0e7490] flex items-center justify-center text-white shadow-md">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-[#1e293b] tracking-tight">Store Manager Operations Dashboard</h1>
            <p className="text-xs text-[#64748b] font-medium">Drawer Movement, Intermediate Storage &bull; Materials: <strong className="text-[#0891b2]">Leather &bull; Lining &bull; Both</strong></p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={() => { setRefreshKey((k) => k + 1); triggerToast('🔄 Refreshing store data from server...'); }}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0891b2] text-white text-xs font-bold hover:bg-[#0e7490] transition-all shadow-sm hover:scale-[1.02] disabled:opacity-60"
            title="Refresh live store data from the server"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Refreshing...' : 'Refresh Store Data'}</span>
          </button>

          <button
            onClick={() => setShowHoldModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold hover:bg-amber-100 transition-all"
          >
            <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>Hold Drawer</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#f8fafc] text-slate-700 border border-slate-200 text-xs font-bold hover:bg-slate-100 transition-all"
            title="Export complete drawer movement report to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-slate-200 text-xs text-slate-500 font-semibold">
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping"></span>
            <span>Store Stream Active</span>
          </div>
        </div>
      </div>

      {/* ─── UNIVERSAL MULTI-FILTER TOOLBAR (Full Width) ─── */}
      <section className="w-full bg-white p-4 rounded-2xl border border-[#e8edf3] shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#1e293b] uppercase tracking-wider">
            <Filter className="w-4 h-4 text-[#0891b2]" />
            <span>Universal Store Cross-Filter</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#cffafe] text-[#155e75] border border-[#a5f3fc]">
              Showing {filteredDrawers.length} of {kpis?.total_drawers ?? drawersList.length} Registered Drawers
            </span>
            <button
              onClick={handleResetFilters}
              className="text-xs text-cyan-700 font-bold hover:underline cursor-pointer"
            >
              Reset All
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
          {/* Quick Search */}
          <div className="relative col-span-2">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search drawer, style, piece code, order..."
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0891b2]"
            />
          </div>

          {/* Date Filter with Complete Interactive Monthly Calendar Picker */}
          <div>
            <CompleteDateCalendarPicker
              selectedDate={filterDate}
              onSelectDate={setFilterDate}
              availableDates={availableDates}
              themeColor="#0891b2"
            />
          </div>

          {/* Style Filter */}
          <div>
            <select
              value={filterStyle}
              onChange={(e) => setFilterStyle(e.target.value)}
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#0891b2]"
            >
              <option value="all">👗 All Styles</option>
              {availableStyles.map((s, idx) => (
                <option key={`store-style-${s.id || s.name}-${idx}`} value={s.name || s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Material Type Filter */}
          <div>
            <select
              value={filterMaterial}
              onChange={(e) => setFilterMaterial(e.target.value)}
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#0891b2]"
            >
              <option value="all">🧵 Material Contents</option>
              {availableMaterials.map((m, idx) => (
                <option key={`${m.id}-${idx}`} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Drawer Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#0891b2]"
            >
              <option value="all">🗄️ All Statuses</option>
              {availableStatuses.map((st, idx) => (
                <option key={`${st}-${idx}`} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* ─── NAVIGATION TABS BAR (Full Width) ─── */}
      <div className="w-full flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-[#e8edf3] shadow-sm overflow-x-auto">
        {[
          { id: 'tab-today', label: "📌 Today's Priority" },
          { id: 'tab-drawers', label: '🗄️ Drawer Master' },
          { id: 'tab-styles', label: '📦 Styles in Store' },
          { id: 'tab-materials', label: '🧵 Leather & Lining' },
          { id: 'tab-holds', label: '🛑 Hold Management' },
          { id: 'tab-empty', label: '♻️ Empty Drawers' },
          { id: 'tab-employees', label: '👷 Cutter Traceability' },
          { id: 'tab-analytics', label: '📉 Store Analytics' },
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
           TAB 1: TODAY'S STORE PRIORITY
           ==================================================================== */}
      {activeTab === 'tab-today' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full space-y-5"
        >
          {/* CURRENT STORE OVERVIEW BANNER (Full Width Grid) */}
          <div className="w-full bg-gradient-to-br from-white via-[#f8fafc] to-[#ecfeff] border border-cyan-200/70 rounded-3xl p-6 shadow-sm grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Col: Store Capacity */}
            <div className="flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-cyan-100 text-cyan-800 border border-cyan-200">
                    Store Storage Online
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-slate-100 text-slate-800">
                    {drawersList.length || 0} Registered
                  </span>
                </div>
                <h2 className="text-2xl font-black text-[#1e293b] tracking-tight">Store Storage & Buffer Hub</h2>
                <p className="text-xs font-semibold text-slate-600 mt-0.5">Physical drawer movement between Cutting, Lining & Stitching Lines</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">In Store</span>
                  <p className="text-xs font-bold text-cyan-800">{filteredDrawers.filter((d) => d.status_label === 'In Store' || d.status_label === 'Ready to Send').length} drawers</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Sent Floor</span>
                  <p className="text-xs font-bold text-slate-800">{filteredDrawers.filter((d) => d.status_label === 'Sent to Production').length} drawers</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Held</span>
                  <p className="text-xs font-bold text-amber-600">{heldList.length} drawers</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Empty Ready</span>
                  <p className="text-xs font-bold text-emerald-600">{emptyList.length} drawers</p>
                </div>
              </div>
            </div>

            {/* Middle Col: Contents Breakdown */}
            <div className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-2xl p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Material Contents in Drawers</span>
                <span className="text-[11px] font-bold text-slate-400">Live Breakdown</span>
              </div>

              <div className="grid grid-cols-3 gap-2 my-3">
                <div className="bg-orange-50 border border-orange-100 p-3 rounded-xl text-center">
                  <span className="text-[10px] font-bold text-orange-700">Leather Only</span>
                  <div className="text-lg font-black text-orange-900 mt-0.5">{filteredDrawers.filter((d) => d.material_type === 'LEATHER').length}</div>
                </div>
                <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl text-center">
                  <span className="text-[10px] font-bold text-rose-700">Lining Only</span>
                  <div className="text-lg font-black text-rose-900 mt-0.5">{filteredDrawers.filter((d) => d.material_type === 'LINING').length}</div>
                </div>
                <div className="bg-cyan-50 border border-cyan-100 p-3 rounded-xl text-center">
                  <span className="text-[10px] font-bold text-cyan-700">Both Merged</span>
                  <div className="text-lg font-black text-cyan-900 mt-0.5">{filteredDrawers.filter((d) => d.material_type === 'LEATHER+LINING').length}</div>
                </div>
              </div>

              <div className="text-xs font-semibold text-slate-500">
                <span>Both Leather & Lining pairs are priority dispatched to Stitching</span>
              </div>
            </div>

            {/* Right Col: Active Styles in Store */}
            <div className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-2xl p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Active Styles in Store</span>
                <span className="text-[11px] font-bold text-cyan-700">Ready to Send</span>
              </div>

              <div className="space-y-2 my-2">
                {stylesList.slice(0, 3).map((st, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-[#f8fafc] border border-slate-100 text-xs">
                    <div>
                      <span className="font-bold text-slate-900">{st.style || st.style_name || st.name}</span>
                      <span className="text-[10px] text-slate-500 block">{st.order_number || '—'}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-cyan-700">{st.drawers || 0} drawers</span>
                      <span className="text-[10px] text-emerald-600 font-bold block">{st.ready_to_send || 0} ready</span>
                    </div>
                  </div>
                ))}
                {stylesList.length === 0 && (
                  <div className="text-center py-4 text-xs text-slate-400 font-medium">
                    No active styles in store buffer.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4 TOP SUMMARY KPIS */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* KPI 1 */}
            <div
              onClick={() => setActiveTab('tab-drawers')}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold text-lg">
                  🗄️
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-50 text-cyan-700">
                  {filteredDrawers.filter((d) => d.status_label === 'In Store' || d.status_label === 'Ready to Send').length} Available
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-500">Drawers in Store</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900">{filteredDrawers.filter((d) => d.status_label === 'In Store' || d.status_label === 'Ready to Send').length}</span>
                <span className="text-xs font-semibold text-slate-400">/ {kpis?.total_drawers ?? drawersList.length} capacity</span>
              </div>
              <div className="mt-3 pt-3 border-t border-dashed border-slate-100 flex justify-between text-xs text-slate-600 font-semibold">
                <span>Sent to Prod: <strong className="text-blue-600">{filteredDrawers.filter((d) => d.status_label === 'Sent to Production').length}</strong></span>
                <span>Held: <strong className="text-amber-600">{heldList.length}</strong></span>
              </div>
            </div>

            {/* KPI 2 */}
            <div
              onClick={() => setActiveTab('tab-empty')}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
                  ♻️
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                  Reuse Ready
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-500">Empty Drawers for Intake</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-emerald-700">{emptyList.length}</span>
              </div>
              <div className="mt-3 pt-3 border-t border-dashed border-slate-100 flex justify-between text-xs text-slate-600 font-semibold">
                <span>Empty Available: <strong>{emptyList.length} drawers</strong></span>
                <span>Immediate Intake: <strong className="text-emerald-600">Active</strong></span>
              </div>
            </div>

            {/* KPI 3 */}
            <div
              onClick={() => setActiveTab('tab-materials')}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-lg">
                  🧵
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700">
                  {filteredDrawers.filter((d) => d.material_type === 'LEATHER+LINING').length} Both Merged
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-500">Merged (Leather + Lining)</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900">{filteredDrawers.filter((d) => d.material_type === 'LEATHER+LINING').length} Pairs</span>
              </div>
              <div className="mt-3 pt-3 border-t border-dashed border-slate-100 flex justify-between text-xs text-slate-600 font-semibold">
                <span>Leather only: <strong>{filteredDrawers.filter((d) => d.material_type === 'LEATHER').length}</strong></span>
                <span>Lining only: <strong>{filteredDrawers.filter((d) => d.material_type === 'LINING').length}</strong></span>
              </div>
            </div>

            {/* KPI 4 */}
            <div
              onClick={() => setActiveTab('tab-holds')}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg">
                  🛑
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700">
                  {heldList.length} Blocked
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-500">Held Drawers (QC / Missing)</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-amber-600">{heldList.length}</span>
              </div>
              <div className="mt-3 pt-3 border-t border-dashed border-slate-100 flex justify-between text-xs text-slate-600 font-semibold">
                <span>With Piece: <strong>{heldList.filter((h) => h.piece_code).length}</strong></span>
                <span>Empty: <strong className="text-amber-600">{heldList.filter((h) => !h.piece_code).length}</strong></span>
              </div>
            </div>
          </div>

          {/* DAILY STORE MOVEMENT CADENCE CHART & LOG */}
          <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Chart */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Daily Store Movement (Received vs Sent vs Emptied)</h3>
                  <p className="text-xs text-slate-500">Drawer intake and dispatch volume across floor dates</p>
                </div>
              </div>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dynamicDailyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="work_date" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip content={<CustomTooltip unit="drawers" />} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                    <Bar dataKey="received" name="Received in Store" fill="#0891b2" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="sent" name="Sent to Production" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="emptied" name="Emptied & Recycled" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Log Table */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 mb-1">Store Daily Movement Log</h3>
                <p className="text-xs text-slate-500 mb-3">Shift-wise drawer transitions</p>
                
                <div className="overflow-y-auto max-h-[250px] space-y-2 pr-1">
                  {dynamicDailyChartData.map((log, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-[#f8fafc] border border-slate-100 text-xs">
                      <div>
                        <span className="font-bold text-slate-800">{log.work_date || log.date}</span>
                        <div className="text-[10px] text-slate-500 mt-0.5">{log.received || 0} in &bull; {log.sent || 0} out</div>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-emerald-700">{log.emptied || 0} emptied</span>
                        <div className="text-[10px] text-amber-600 font-semibold">{log.held || 0} held</div>
                      </div>
                    </div>
                  ))}
                  {dynamicDailyChartData.length === 0 && (
                    <div className="text-center py-8 text-slate-400 font-medium text-xs">
                      No daily movement logs available for selected filter.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ====================================================================
           TAB 2: DRAWER MASTER MANAGEMENT
           ==================================================================== */}
      {activeTab === 'tab-drawers' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full space-y-4"
        >
          <div className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Drawer Master Registry & Real-Time Tracking</h3>
                <p className="text-xs text-slate-500">Live position, associated jacket piece, material contents, and dispatch timestamps</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
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
                    <th className="py-3 px-4">Drawer Code</th>
                    <th className="py-3 px-4">Style</th>
                    <th className="py-3 px-4">Piece Serial Code</th>
                    <th className="py-3 px-4">Material Contents</th>
                    <th className="py-3 px-4">Received / Sent</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {paginatedDrawers.map((d, idx) => (
                    <tr
                      key={idx}
                      onClick={() => handleOpenDrawerModal(d)}
                      className="hover:bg-slate-50 cursor-pointer transition-all"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-cyan-800">{d.drawer_code}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{d.style}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-700">{d.piece_code}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            d.material_type === 'LEATHER+LINING'
                              ? 'bg-cyan-100 text-cyan-800'
                              : d.material_type === 'LEATHER'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {d.contents || d.material_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        {d.sended_at ? (
                          <span className="text-blue-700 font-bold">Sent: {d.sended_at}</span>
                        ) : (
                          <span className="text-emerald-700 font-bold">In Store: {d.received_at || 'Present'}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                            d.status_label === 'Sent to Production'
                              ? 'bg-blue-100 text-blue-800'
                              : d.status_label === 'Ready to Send'
                              ? 'bg-emerald-100 text-emerald-800'
                              : d.status_label === 'Held'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {d.status_label || 'In Store'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDrawerModal(d);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#0891b2] hover:text-white text-slate-700 text-[11px] font-bold transition-all"
                        >
                          Audit Trace
                        </button>
                      </td>
                    </tr>
                  ))}
                  {paginatedDrawers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400 font-medium">
                        No drawers matching filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs font-bold text-slate-600">
              <span>
                Page {currentPage} of {totalPages} ({filteredDrawers.length} items)
              </span>
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
        </motion.div>
      )}

      {/* ====================================================================
           TAB 3: CURRENT STYLES IN STORE
           ==================================================================== */}
      {activeTab === 'tab-styles' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full space-y-5"
        >
          <div className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Production Styles Currently in Store Buffer</h3>
                <p className="text-xs text-slate-500">Drawer allocation, material split, and ready-to-dispatch readiness</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-[#f8fafc] text-slate-600 font-bold uppercase tracking-wider border-y border-slate-200">
                    <th className="py-3 px-4">Style Name</th>
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-4 text-right">Total Drawers</th>
                    <th className="py-3 px-4 text-right">Leather Only</th>
                    <th className="py-3 px-4 text-right">Lining Only</th>
                    <th className="py-3 px-4 text-right">Both Merged</th>
                    <th className="py-3 px-4 text-right">Ready to Send</th>
                    <th className="py-3 px-4">Target Date</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredStylesList.map((st, idx) => {
                    const sName = st.style || st.style_name || st.name;
                    const isSelected = filterStyle === sName;
                    return (
                      <tr
                        key={idx}
                        onClick={() => {
                          setFilterStyle(sName);
                          setActiveTab('tab-drawers');
                          triggerToast(`⚡ Filtered Store to Style: ${sName}`);
                        }}
                        className={`hover:bg-cyan-50/70 cursor-pointer transition-all ${
                          isSelected ? 'bg-cyan-50/90 font-bold' : ''
                        }`}
                        title="Click to filter drawers by this style"
                      >
                        <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span>👗</span>
                            <span>{sName}</span>
                          </div>
                          <span className="text-[10px] text-cyan-700 font-bold opacity-0 hover:opacity-100 transition-opacity">View Drawers &rarr;</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600">{st.order_number || '—'}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">{st.drawers || 0}</td>
                        <td className="py-3.5 px-4 text-right font-mono text-orange-700 font-bold">{st.leather_drawers || 0}</td>
                        <td className="py-3.5 px-4 text-right font-mono text-rose-700 font-bold">{st.lining_drawers || 0}</td>
                        <td className="py-3.5 px-4 text-right font-mono text-cyan-700 font-black">{st.both_drawers || 0}</td>
                        <td className="py-3.5 px-4 text-right font-mono text-emerald-700 font-bold">{st.ready_to_send || 0}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-700">{st.target_date || '—'}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-cyan-100 text-cyan-800">
                            {st.status || 'Active'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredStylesList.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-slate-400 font-medium">
                        {filterStyle !== 'all' ? `No drawers found for style "${filterStyle}".` : 'No styles in store buffer.'}
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
           TAB 4: LEATHER & LINING TRACKING
           ==================================================================== */}
      {activeTab === 'tab-materials' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full space-y-5"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Leather Drawer Card */}
            <div className="p-5 rounded-2xl bg-orange-50 border border-orange-200">
              <span className="text-xs font-bold text-orange-800 uppercase tracking-wider">Leather Only Drawers</span>
              <div className="text-3xl font-black text-orange-950 mt-1">{filteredDrawers.filter((d) => d.material_type === 'LEATHER').length} Drawers</div>
              <p className="text-xs text-orange-700 mt-2">Drawers containing cut leather pattern pieces awaiting lining pairing</p>
            </div>

            {/* Lining Drawer Card */}
            <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200">
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">Lining Only Drawers</span>
              <div className="text-3xl font-black text-rose-950 mt-1">{filteredDrawers.filter((d) => d.material_type === 'LINING').length} Drawers</div>
              <p className="text-xs text-rose-700 mt-2">Drawers containing cut lining components waiting for leather matching</p>
            </div>

            {/* Both Drawer Card */}
            <div className="p-5 rounded-2xl bg-cyan-50 border border-cyan-200">
              <span className="text-xs font-bold text-cyan-800 uppercase tracking-wider">Merged (Leather + Lining)</span>
              <div className="text-3xl font-black text-cyan-950 mt-1">{filteredDrawers.filter((d) => d.material_type === 'LEATHER+LINING').length} Drawers</div>
              <p className="text-xs text-cyan-700 mt-2">Complete matching kit ready to be dispatched to Stitching Floor</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ====================================================================
           TAB 5: DRAWER HOLD MANAGEMENT
           ==================================================================== */}
      {activeTab === 'tab-holds' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full space-y-5"
        >
          <div className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Drawer Hold Management & Reason Tracking</h3>
                <p className="text-xs text-slate-500">Drawers intentionally paused from production dispatch with detailed hold reasons</p>
              </div>
              <button
                onClick={() => setShowHoldModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition-all flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Put Drawer on Hold</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-[#f8fafc] text-slate-600 font-bold uppercase tracking-wider border-y border-slate-200">
                    <th className="py-3 px-4">Drawer Code</th>
                    <th className="py-3 px-4">Style</th>
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-4">Material Type</th>
                    <th className="py-3 px-4">Held By</th>
                    <th className="py-3 px-4">Hold Reason</th>
                    <th className="py-3 px-4">Received Date</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {heldList.map((h, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-all">
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-800">{h.drawer_code}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{h.style || h.style_name || <NotAvailableBadge label="cleared" />}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">{h.order_number || '—'}</td>
                      <td className="py-3.5 px-4 font-bold">{h.material_type && h.material_type !== 'NONE' ? h.material_type : '—'}</td>
                      <td className="py-3.5 px-4 text-slate-800">{h.held_by || <NotAvailableBadge />}</td>
                      <td className="py-3.5 px-4 font-semibold text-amber-900">{h.hold_reason || h.reason || <NotAvailableBadge />}</td>
                      <td className="py-3.5 px-4 text-slate-500">{h.received_at ? h.received_at.slice(0, 10) : '—'}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800">
                          {h.status_label || 'Held'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {heldList.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-400 font-medium">
                        No drawers currently on hold.
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
           TAB 6: EMPTY DRAWERS & REUSE
           ==================================================================== */}
      {activeTab === 'tab-empty' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full space-y-5"
        >
          <div className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Empty Drawer Inventory Ready for Intake Reuse</h3>
                <p className="text-xs text-slate-500">Recycled drawers ready to receive newly cut leather or lining pattern pieces</p>
              </div>
              <span className="text-xs font-bold text-slate-500">
                Available Empty Count: <strong className="text-emerald-700">{emptyList.length}</strong>
              </span>
            </div>
            {meta?.unsupported?.empty_drawer_history && (
              <p className="text-[11px] text-slate-400 font-medium mb-3 -mt-2">{meta.unsupported.empty_drawer_history}</p>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-[#f8fafc] text-slate-600 font-bold uppercase tracking-wider border-y border-slate-200">
                    <th className="py-3 px-4">Drawer Code</th>
                    <th className="py-3 px-4">Last Style Occupant</th>
                    <th className="py-3 px-4">Last Material</th>
                    <th className="py-3 px-4">Last Sent Date</th>
                    <th className="py-3 px-4 text-center">Availability</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {emptyList.map((e, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-all">
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-800">{e.drawer_code}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{e.style || <NotAvailableBadge label="cleared on recycle" />}</td>
                      <td className="py-3.5 px-4 text-slate-600">{e.material_type && e.material_type !== 'NONE' ? e.material_type : <NotAvailableBadge label="cleared on recycle" />}</td>
                      <td className="py-3.5 px-4 text-slate-500">{e.sended_at || '—'}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                          Empty Ready
                        </span>
                      </td>
                    </tr>
                  ))}
                  {emptyList.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-400 font-medium">
                        No individually-tracked empty drawers in this view — see the summary count above.
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
           TAB 7: CUTTER & EMPLOYEE TRACEABILITY
           ==================================================================== */}
      {activeTab === 'tab-employees' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full space-y-5"
        >
          <div className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Piece & Cutter Traceability in Store</h3>
                <p className="text-xs text-slate-500">Identifies which operator cut the leather or lining stored inside each drawer</p>
              </div>
              {traceabilityLoading && (
                <span className="text-[11px] font-bold text-cyan-700 flex items-center gap-1.5">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Loading traceability...
                </span>
              )}
            </div>
            {meta?.unsupported?.employee_photo && (
              <p className="text-[11px] text-slate-400 font-medium mb-3 -mt-2">{meta.unsupported.employee_photo}</p>
            )}
            {traceabilityError && (
              <p className="text-[11px] text-rose-500 font-semibold mb-3 -mt-2">Backend notice: {traceabilityError}</p>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-[#f8fafc] text-slate-600 font-bold uppercase tracking-wider border-y border-slate-200">
                    <th className="py-3 px-4">Piece Serial Code</th>
                    <th className="py-3 px-4">Style</th>
                    <th className="py-3 px-4">Material</th>
                    <th className="py-3 px-4">Processed By (Cutter)</th>
                    <th className="py-3 px-4">Assigned Drawer</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {traceabilityList.map((t, idx) => {
                    const cutterName = t.cutter_name || t.cutter?.name || t.employee_name || t.employee?.name || t.processed_by || t.cut_by;
                    return (
                      <tr key={`${t.piece_code || 'trace'}-${idx}`} className="hover:bg-slate-50 transition-all">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{t.piece_code}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-800">{t.style || t.style_name}</td>
                        <td className="py-3.5 px-4 font-semibold text-cyan-800">{t.material_type}</td>
                        <td className="py-3.5 px-4 text-slate-900 font-bold">{cutterName || <NotAvailableBadge />}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-cyan-700">{t.drawer_code || '—'}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-800">
                            {t.status_label || t.state || '—'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {!traceabilityLoading && traceabilityList.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400 font-medium">
                        No traceability records for the current filters.
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
           TAB 8: STORE ANALYTICS
           ==================================================================== */}
      {activeTab === 'tab-analytics' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full space-y-5"
        >
          <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Drawer Status Distribution */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-extrabold text-slate-900 mb-1">Drawer Material Distribution</h3>
              <p className="text-xs text-slate-500 mb-4">Leather, Lining, and Merged pair distribution in store</p>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Leather + Lining (Both)', value: filteredDrawers.filter((d) => d.material_type === 'LEATHER+LINING').length, color: '#0891b2' },
                        { name: 'Leather Only', value: filteredDrawers.filter((d) => d.material_type === 'LEATHER').length, color: '#f97316' },
                        { name: 'Lining Only', value: filteredDrawers.filter((d) => d.material_type === 'LINING').length, color: '#f43f5e' },
                        { name: 'Held Drawers', value: heldList.length, color: '#f59e0b' },
                      ]}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      innerRadius={50}
                      paddingAngle={4}
                    >
                      <Cell fill="#0891b2" />
                      <Cell fill="#f97316" />
                      <Cell fill="#f43f5e" />
                      <Cell fill="#f59e0b" />
                    </Pie>
                    <Tooltip content={<CustomTooltip unit="drawers" />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Daily Movement */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-extrabold text-slate-900 mb-1">Store Daily Movement Trends</h3>
              <p className="text-xs text-slate-500 mb-4">Received vs Sent vs Emptied drawers</p>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dynamicDailyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="work_date" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip content={<CustomTooltip unit="drawers" />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="received" name="Received" fill="#0891b2" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="sent" name="Sent to Prod" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ====================================================================
           TAB 9: TRACEABILITY FLOW
           ==================================================================== */}
      {activeTab === 'tab-flow' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6"
        >
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Complete Store Drawer Movement Lifecycle</h3>
            <p className="text-xs text-slate-500">Material Received &rarr; Drawer Created &rarr; Leather/Lining Added &rarr; Held/Ready &rarr; Sent to Production &rarr; Drawer Empty &rarr; Reused</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-7 gap-2.5">
            {[
              { title: '1. Intake', desc: 'Cut material received', icon: '📦', color: 'bg-blue-50 text-blue-700' },
              { title: '2. Stored', desc: 'Drawer registered', icon: '🗄️', color: 'bg-cyan-50 text-cyan-700' },
              { title: '3. Paired', desc: 'Leather + Lining merged', icon: '🧵', color: 'bg-purple-50 text-purple-700' },
              { title: '4. Ready/Held', desc: 'Staging buffer verification', icon: '🛑', color: 'bg-amber-50 text-amber-700' },
              { title: '5. Sent Floor', desc: 'Dispatched to Stitching', icon: '⚡', color: 'bg-indigo-50 text-indigo-700' },
              { title: '6. Emptied', desc: 'Pieces consumed', icon: '✨', color: 'bg-slate-50 text-slate-700' },
              { title: '7. Reuse Ready', desc: 'Recycled for next style', icon: '♻️', color: 'bg-emerald-50 text-emerald-700' },
            ].map((step, i) => (
              <div key={i} className={`p-3.5 rounded-xl border border-slate-100 ${step.color} flex flex-col justify-between`}>
                <div className="text-2xl mb-1.5">{step.icon}</div>
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
           MODAL 1: DRAWER MOVEMENT INSPECTOR
           ==================================================================== */}
      <AnimatePresence>
        {selectedDrawerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Drawer Movement Audit Inspector</span>
                  <h3 className="text-base font-mono font-black text-cyan-900">{selectedDrawerModal.drawer_code}</h3>
                </div>
                <button
                  onClick={() => setSelectedDrawerModal(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Movement Audit Steps */}
              <div className="space-y-2 text-xs font-semibold">
                <div className="p-3 bg-[#f8fafc] rounded-xl border border-slate-200 flex justify-between items-center">
                  <span>Received in Store:</span>
                  <span className="font-mono font-bold text-emerald-700">{selectedDrawerModal.received_at || 'Recorded'}</span>
                </div>
                <div className="p-3 bg-[#f8fafc] rounded-xl border border-slate-200 flex justify-between items-center">
                  <span>Dispatched to Floor:</span>
                  <span className="font-mono font-bold text-blue-700">{selectedDrawerModal.sended_at || 'Pending Dispatch'}</span>
                </div>
                <div className="p-3 bg-[#f8fafc] rounded-xl border border-slate-200 flex justify-between items-center">
                  <span>Associated Piece:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedDrawerModal.piece_code || '—'}</span>
                </div>
                <div className="p-3 bg-[#f8fafc] rounded-xl border border-slate-200 flex justify-between items-center">
                  <span>Current Status:</span>
                  <span className="font-bold text-slate-900">{selectedDrawerModal.status_label || '—'}</span>
                </div>
              </div>

              {/* Movement History — from GET /dashboard/store/drawers/{id}/movement */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Movement Audit Trail</span>
                <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                  {(selectedDrawerModal.movement_history || []).map((m, i) => (
                    <div key={i} className="p-2.5 bg-[#f8fafc] rounded-lg border border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-800">
                        {(m.event_type || m.action || m.event || 'EVENT').toString().replace(/_/g, ' ')}
                      </span>
                      <span className="font-mono text-slate-500">{m.timestamp || m.created_at || m.at || '—'}</span>
                    </div>
                  ))}
                  {(!selectedDrawerModal.movement_history || selectedDrawerModal.movement_history.length === 0) && (
                    <p className="text-[11px] text-slate-400 font-medium py-2">No movement history recorded for this drawer yet.</p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ====================================================================
           MODAL 2: PUT DRAWER ON HOLD MODAL
           ==================================================================== */}
      <AnimatePresence>
        {showHoldModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-amber-600">
                  <PauseCircle className="w-5 h-5" />
                  <h3 className="text-sm font-extrabold text-slate-900">Put Drawer on Store Hold</h3>
                </div>
                <button
                  onClick={() => setShowHoldModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleHoldDrawerSubmit} className="space-y-3.5 text-xs font-semibold">
                <div>
                  <label className="block text-slate-700 mb-1">Select Drawer Code</label>
                  <select
                    name="drawerCode"
                    required
                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  >
                    {drawersList.slice(0, 15).map((d, idx) => (
                      <option key={`store-drw-opt-${d.drawer_code || d.id || idx}-${idx}`} value={d.drawer_code}>
                        {d.drawer_code} ({d.style} - {d.contents})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">Hold Reason</label>
                  <select
                    name="reason"
                    required
                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  >
                    <option value="Waiting for matching lining batch">Waiting for matching lining batch</option>
                    <option value="Awaiting thickness verification on calf patch">Awaiting thickness verification on calf patch</option>
                    <option value="Production sequence pause for Order priority">Production sequence pause for Order priority</option>
                    <option value="Stitching line bottleneck pause">Stitching line bottleneck pause</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">Held By (Authorizing User)</label>
                  <input
                    type="text"
                    name="heldBy"
                    defaultValue="Store Supervisor"
                    required
                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowHoldModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
                  >
                    Confirm Store Hold
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default function StoreManagerDashboard() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center text-[#0891b2]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0891b2] mx-auto mb-3"></div>
            <p className="font-semibold text-xs tracking-widest uppercase">Loading Store Dashboard...</p>
          </div>
        </div>
      }
    >
      <StoreDashboardContent />
    </Suspense>
  );
}
