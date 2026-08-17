'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ScissorsLineDashed,
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
  Play,
  BarChart3,
  Calendar,
  Activity,
  ArrowRight,
  ShieldCheck,
  Zap,
  Tag,
  QrCode,
  FileSpreadsheet,
  Waypoints,
  Boxes,
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
  apiGetStitchingDashboard,
  apiGetStitchingEmployeeDetail,
  apiGetStitchingPieceDetail,
} from '@/lib/api';
import {
  RAW_STITCHING_PIECES_DATA,
  STITCHING_KPIS,
  STITCHING_STAGES_DATA,
  STORE_HANDOFF_METRICS,
  CURRENT_STITCHING_STYLE,
  STITCHING_STYLES_SUMMARY,
  STITCHING_EMPLOYEES,
  STITCHING_DAILY_LOGS,
  STITCHING_DEFECTS_LOG
} from '@/lib/stitchingData';

// Interactive Monthly Calendar Filter Picker Component
function CompleteDateCalendarPicker({ selectedDate, onSelectDate, availableDates = [], themeColor = '#4f46e5' }) {
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
                      ? 'bg-[#4f46e5] text-white shadow-md scale-105 font-black'
                      : pieceActivity
                      ? 'bg-indigo-50 text-indigo-900 hover:bg-indigo-100 font-extrabold'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <span>{d}</span>
                  {pieceActivity && !active && (
                    <span className="w-1 h-1 rounded-full bg-[#4f46e5] mt-0.5"></span>
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
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 focus:outline-none focus:border-indigo-600 cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Chart custom tooltip
function CustomTooltip({ active, payload, label, unit = 'pcs' }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-[#1e293b] text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs">
      <p className="font-extrabold text-slate-200 mb-1 border-b border-slate-700 pb-1">{label}</p>
      {payload.map((p, idx) => (
        <p key={idx} className="flex justify-between gap-4 text-[11px] my-0.5">
          <span style={{ color: p.color || '#38bdf8' }}>{p.name}:</span>
          <span className="text-white font-mono font-bold">{p.value} {unit}</span>
        </p>
      ))}
    </div>
  );
}

function StitchingDashboardContent() {
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const { orders: contextOrders } = useData();

  // State initialized with rich seed data to guarantee 100% data visibility
  const [activeTab, setActiveTab] = useState('tab-today');
  const [piecesList, setPiecesList] = useState(() => RAW_STITCHING_PIECES_DATA || []);
  const [ordersList, setOrdersList] = useState(() => contextOrders || []);
  const [activeOrder, setActiveOrder] = useState(() => contextOrders?.[0] || null);
  const [activeStyle, setActiveStyle] = useState(() => CURRENT_STITCHING_STYLE || null);
  const [kpis, setKpis] = useState(() => STITCHING_KPIS || null);
  const [orderProgress, setOrderProgress] = useState(() => STITCHING_STYLES_SUMMARY || []);
  const [stylesList, setStylesList] = useState(() => STITCHING_STYLES_SUMMARY || []);
  const [stagesList, setStagesList] = useState(() => STITCHING_STAGES_DATA || []);
  const [selectedStageDetail, setSelectedStageDetail] = useState(null);
  const [employeesList, setEmployeesList] = useState(() => STITCHING_EMPLOYEES || []);
  const [storeHandoff, setStoreHandoff] = useState(() => STORE_HANDOFF_METRICS || null);
  const [dailyLogs, setDailyLogs] = useState(() => STITCHING_DAILY_LOGS || []);
  const [defectsList, setDefectsList] = useState(() => STITCHING_DEFECTS_LOG || []);

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  // Sync context orders
  useEffect(() => {
    if (contextOrders && contextOrders.length > 0 && ordersList.length === 0) {
      setOrdersList(contextOrders);
      if (!activeOrder) setActiveOrder(contextOrders[0]);
    }
  }, [contextOrders, ordersList, activeOrder]);

  // Universal Filters
  const [filterDate, setFilterDate] = useState('all');
  const [filterOrder, setFilterOrder] = useState('all');
  const [filterStyle, setFilterStyle] = useState('all');
  const [filterStage, setFilterStage] = useState('all');
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSize, setFilterSize] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [selectedPieceModal, setSelectedPieceModal] = useState(null);
  const [selectedEmployeeModal, setSelectedEmployeeModal] = useState(null);
  const [showLogDefectModal, setShowLogDefectModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Pagination for piece tracker
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
      const name = s.name || s.style || s.style_name;
      if (name) map.set(name, { id: s.id || s.style_id || name, name });
    });
    orderProgress.forEach((s) => {
      if (s.style_name) map.set(s.style_name, { id: s.style_id || s.style_name, name: s.style_name });
    });
    piecesList.forEach((p) => {
      if (p.style && !map.has(p.style)) map.set(p.style, { id: p.style, name: p.style });
    });
    ordersList.forEach((o) => {
      o.styles?.forEach((s) => {
        if (s.name && !map.has(s.name)) map.set(s.name, { id: s.id || s.name, name: s.name });
      });
    });
    return Array.from(map.values());
  }, [stylesList, orderProgress, piecesList, ordersList]);

  const availableStages = useMemo(() => {
    const set = new Set(['PASTING', 'FUSING', 'LINE_STITCHING', 'SHELL_STITCHING', 'FINAL_FINISH']);
    stagesList.forEach((s) => { if (s.stage) set.add(s.stage); });
    piecesList.forEach((p) => { if (p.current_stage) set.add(p.current_stage); });
    return Array.from(set).filter(Boolean);
  }, [stagesList, piecesList]);

  const availableEmployees = useMemo(() => {
    const map = new Map();
    employeesList.forEach((c) => {
      const name = c.name;
      if (name) map.set(name, { id: c.id || c.employee_id || name, name });
    });
    piecesList.forEach((p) => {
      if (p.employee && !map.has(p.employee)) map.set(p.employee, { id: p.employee, name: p.employee });
    });
    return Array.from(map.values());
  }, [employeesList, piecesList]);

  const availableDates = useMemo(() => {
    const set = new Set();
    piecesList.forEach((p) => { if (p.last_worked) set.add(p.last_worked); });
    dailyLogs.forEach((l) => { if (l.work_date || l.date) set.add(l.work_date || l.date); });
    return Array.from(set).filter(Boolean);
  }, [piecesList, dailyLogs]);

  // Filtered pieces computed based on ALL universal cross-filters
  const filteredPieces = useMemo(() => {
    const selectedOrderObj = filterOrder !== 'all' ? ordersList.find((o) => o.id === filterOrder || o.order_number === filterOrder || o.po_number === filterOrder) : null;
    return piecesList.filter((p) => {
      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesQuery =
          (p.piece_code && p.piece_code.toLowerCase().includes(q)) ||
          (p.style && p.style.toLowerCase().includes(q)) ||
          (p.employee && p.employee.toLowerCase().includes(q)) ||
          (p.order_number && p.order_number.toLowerCase().includes(q)) ||
          (p.current_stage && p.current_stage.toLowerCase().includes(q)) ||
          (p.colour && p.colour.toLowerCase().includes(q));
        if (!matchesQuery) return false;
      }
      // Date
      if (filterDate !== 'all' && p.last_worked !== filterDate) return false;
      // Order
      if (filterOrder !== 'all') {
        const matchesOrder = p.order_id === filterOrder || p.order_number === filterOrder || (selectedOrderObj && (p.order_number === selectedOrderObj.order_number || p.order_id === selectedOrderObj.id || p.order_number === selectedOrderObj.po_number));
        if (!matchesOrder) return false;
      }
      // Style
      if (filterStyle !== 'all' && p.style !== filterStyle) return false;
      // Stage
      if (filterStage !== 'all' && p.current_stage !== filterStage) return false;
      // Employee
      if (filterEmployee !== 'all' && p.employee !== filterEmployee) return false;
      // Status
      if (filterStatus !== 'all' && p.status !== filterStatus) return false;
      // Size
      if (filterSize !== 'all' && p.size !== filterSize) return false;

      return true;
    });
  }, [
    piecesList,
    ordersList,
    searchQuery,
    filterDate,
    filterOrder,
    filterStyle,
    filterStage,
    filterEmployee,
    filterStatus,
    filterSize,
  ]);

  // Paginated pieces
  const paginatedPieces = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPieces.slice(start, start + pageSize);
  }, [filteredPieces, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredPieces.length / pageSize) || 1;

  // DYNAMIC DISPLAY METRICS: Calculated directly from filteredPieces
  const displayStyle = useMemo(() => {
    const isFiltered = filterStyle !== 'all' || filterOrder !== 'all' || filterStage !== 'all' || filterEmployee !== 'all' || filterDate !== 'all' || filterStatus !== 'all' || filterSize !== 'all' || !!searchQuery;
    const targetStyleName = filterStyle !== 'all' ? filterStyle : (activeStyle?.name || activeStyle?.style_name);
    
    const totalQty = isFiltered
      ? filteredPieces.length
      : (kpis?.overall_pieces || piecesList.length || 0);

    const completedCount = isFiltered
      ? filteredPieces.filter(p => p.status === 'Completed' || p.current_stage === 'FINAL_FINISH' || p.current_stage === 'FINAL_INSPECTION').length
      : (kpis?.overall_completed || piecesList.filter((p) => p.status === 'Completed').length);

    const pendingCount = Math.max(0, totalQty - completedCount);
    const progressPercent = totalQty ? Math.min(100, Math.round((completedCount / totalQty) * 100)) : 0;
    
    const damageCount = isFiltered
      ? filteredPieces.filter(p => p.status === 'Damaged' || p.is_damaged).length
      : (kpis?.damage_pieces || piecesList.filter((p) => p.status === 'Damaged').length || 0);

    const reworkCount = isFiltered
      ? filteredPieces.filter(p => p.status === 'Rework' || p.is_rework).length
      : (kpis?.rework_pieces || piecesList.filter((p) => p.status === 'Rework').length || 0);

    const storeCount = isFiltered
      ? filteredPieces.filter(p => p.status === 'In Drawer' || p.status === 'In Store' || p.status === 'Ready to Send').length
      : (kpis?.in_store ?? storeHandoff?.in_drawer ?? 0);

    const readyQC = isFiltered
      ? filteredPieces.filter(p => p.status === 'Completed' || p.current_stage === 'FINAL_FINISH').length
      : piecesList.filter((p) => p.status === 'Completed').length;

    const firstProg = orderProgress?.find(s => s.name === targetStyleName || s.style_name === targetStyleName) || orderProgress?.[0];
    const firstStyle = activeOrder?.styles?.find(s => s.name === targetStyleName) || activeOrder?.styles?.[0] || {};
    
    return {
      order_number: activeStyle?.order_number || firstProg?.order_number || activeOrder?.order_number || activeOrder?.id || '—',
      status: activeStyle?.status || activeOrder?.status || 'In Progress',
      client: activeStyle?.client || activeOrder?.client || activeOrder?.client_name || '—',
      style_name: targetStyleName || activeStyle?.name || activeStyle?.style_name || firstProg?.style_name || firstStyle.name || activeOrder?.styleName || '—',
      article: activeStyle?.article || firstProg?.article || firstStyle.article || activeOrder?.article || 'Standard',
      size: activeStyle?.size || firstStyle.skus?.[0]?.size || firstStyle.size || '—',
      color: activeStyle?.color || firstStyle.skus?.[0]?.color_name || firstStyle.color || activeOrder?.color || '—',
      total_pieces: totalQty,
      assigned_pieces: totalQty,
      target_date: activeStyle?.target_date || activeStyle?.delivery_deadline || firstProg?.delivery_deadline || activeOrder?.delivery_deadline || activeOrder?.target_date || '—',
      completed_pieces: completedCount,
      pending_pieces: pendingCount,
      progressPct: progressPercent,
      damage_pieces: damageCount,
      rework_pieces: reworkCount,
      store_pieces: storeCount,
      ready_qc: readyQC,
    };
  }, [activeStyle, activeOrder, orderProgress, kpis, piecesList, filteredPieces, storeHandoff, filterStyle, filterOrder, filterStage, filterEmployee, filterDate, filterStatus, filterSize, searchQuery]);

  // Dynamic stages list computed from filtered pieces
  const filteredStagesList = useMemo(() => {
    return stagesList.map(st => {
      const stageName = st.stage || st.label;
      const piecesInStage = filteredPieces.filter(p => p.current_stage === stageName || p.stage === stageName);
      const completed = piecesInStage.filter(p => p.status === 'Completed' || p.status === 'Pasting Done' || p.status === 'Stitching Line' || p.current_stage === 'FINAL_FINISH').length;
      const totalReceived = piecesInStage.length > 0 ? piecesInStage.length : (st.total_received || 0);
      const pending = piecesInStage.length > 0 ? Math.max(0, totalReceived - completed) : (st.pending_pieces || 0);
      const isBottleneck = pending > 15 || (totalReceived > 0 && pending > completed);
      return {
        ...st,
        total_received: totalReceived,
        assigned_pieces: totalReceived,
        completed_pieces: piecesInStage.length > 0 ? completed : (st.completed_pieces || 0),
        pending_pieces: pending,
        damage_pieces: piecesInStage.filter(p => p.status === 'Damaged').length || st.damage_pieces || 0,
        rework_pieces: piecesInStage.filter(p => p.status === 'Rework').length || st.rework_pieces || 0,
        status: isBottleneck ? `🔴 BOTTLENECK (${pending} Pending)` : '🟢 Active',
        is_bottleneck: isBottleneck
      };
    });
  }, [stagesList, filteredPieces]);

  // Bottleneck detection for active stage indicator
  const bottleneckStage = useMemo(() => {
    return filteredStagesList.find((s) => s.is_bottleneck || (s.pending_pieces || 0) > 15) ||
           filteredStagesList.find((s) => (s.pending_pieces || 0) > 0) || null;
  }, [filteredStagesList]);

  // Dynamic daily production chart data calculated from filtered pieces
  const dynamicDailyChartData = useMemo(() => {
    const map = new Map();
    filteredPieces.forEach(p => {
      const date = p.last_worked || '2026-08-14';
      if (!map.has(date)) {
        map.set(date, {
          work_date: date,
          pasting: 0,
          fusing: 0,
          line_stitching: 0,
          shell_stitching: 0,
          final_finish: 0,
          completed: 0,
          target: 30
        });
      }
      const row = map.get(date);
      const stageKey = (p.current_stage || '').toLowerCase();
      if (row[stageKey] !== undefined) row[stageKey] += 1;
      if (p.status === 'Completed' || p.current_stage === 'FINAL_FINISH') row.completed += 1;
    });
    if (map.size === 0) return dailyLogs;
    return Array.from(map.values()).sort((a, b) => b.work_date.localeCompare(a.work_date));
  }, [filteredPieces, dailyLogs]);

  // Filtered styles list for Style Matrix tab
  const filteredStylesList = useMemo(() => {
    return stylesList.filter((s) => {
      if (filterStyle !== 'all') {
        const sName = s.style_name || s.name || s.style;
        if (sName !== filterStyle) return false;
      }
      return true;
    });
  }, [stylesList, filterStyle]);

  // Filtered employees list for Operators tab and performance charts
  const filteredEmployeesList = useMemo(() => {
    return employeesList.filter((e) => {
      if (filterEmployee !== 'all' && e.name !== filterEmployee) return false;
      return true;
    });
  }, [employeesList, filterEmployee]);

  // LIVE BACKEND CALL: /api/v1/dashboard/stitching
  useEffect(() => {
    let isMounted = true;
    async function fetchStitchingDashboard() {
      if (!token) return;
      try {
        setLoading(true);
        setApiError(null);
        const params = {};
        if (filterOrder && filterOrder !== 'all') {
          params.order_id = filterOrder;
        }
        const data = await apiGetStitchingDashboard(token, params);
        if (isMounted && data) {
          setKpis(data.kpis || null);
          setPiecesList(Array.isArray(data.pieces) ? data.pieces : []);
          if (data.orders && Array.isArray(data.orders)) {
            setOrdersList(data.orders);
            if (data.orders.length > 0 && !activeOrder) setActiveOrder(data.orders[0]);
          }
          setActiveStyle(data.current_style || null);
          setOrderProgress(Array.isArray(data.order_progress) ? data.order_progress : []);
          setStylesList(Array.isArray(data.styles) ? data.styles : (Array.isArray(data.order_progress) ? data.order_progress : []));
          setStagesList(Array.isArray(data.stages) ? data.stages : []);
          setEmployeesList(Array.isArray(data.employees) ? data.employees : []);
          setStoreHandoff(data.store_handoff || null);
          setDefectsList(Array.isArray(data.defects) ? data.defects : []);
          
          // Process daily_production into stage-wise chart bars
          if (data.daily_production && Array.isArray(data.daily_production)) {
            const dailyMap = new Map();
            data.daily_production.forEach((item) => {
              const date = item.work_date;
              if (!dailyMap.has(date)) {
                dailyMap.set(date, {
                  work_date: date,
                  pasting: 0,
                  fusing: 0,
                  line_stitching: 0,
                  shell_stitching: 0,
                  final_finish: 0,
                  completed: 0,
                  events: 0,
                });
              }
              const row = dailyMap.get(date);
              const stageKey = (item.stage || '').toLowerCase();
              if (row[stageKey] !== undefined) {
                row[stageKey] += (item.completed || 0);
              }
              row.completed += (item.completed || 0);
              row.events += (item.events || 0);
            });
            setDailyLogs(Array.from(dailyMap.values()));
          } else if (data.daily_logs && Array.isArray(data.daily_logs)) {
            setDailyLogs(data.daily_logs);
          }
          if (data.defects && Array.isArray(data.defects)) setDefectsList(data.defects);
        }
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

  // Handler to inspect employee and call /api/v1/dashboard/stitching/employees/{employee_id}
  const handleOpenEmployeeModal = async (emp) => {
    setSelectedEmployeeModal(emp);
    if (!token || !emp?.employee_id) return;
    try {
      const detail = await apiGetStitchingEmployeeDetail(token, emp.employee_id);
      if (detail) {
        setSelectedEmployeeModal((prev) => ({ ...prev, ...detail }));
      }
    } catch (err) {
      console.warn(`Backend API /api/v1/dashboard/stitching/employees/${emp.employee_id} notice:`, err.message);
    }
  };

  // Handler to inspect piece and call /api/v1/dashboard/stitching/pieces/{piece_code}
  const handleOpenPieceModal = async (piece) => {
    setSelectedPieceModal(piece);
    if (!token || !piece?.piece_code) return;
    try {
      const detail = await apiGetStitchingPieceDetail(token, piece.piece_code);
      if (detail) {
        setSelectedPieceModal((prev) => ({ ...prev, ...detail }));
      }
    } catch (err) {
      console.warn(`Backend API /api/v1/dashboard/stitching/pieces/${piece.piece_code} notice:`, err.message);
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
    setFilterStage('all');
    setFilterEmployee('all');
    setFilterStatus('all');
    setFilterSize('all');
    setSearchQuery('');
    triggerToast('Stitching filters reset to default view');
  };

  const filteredProductionLogs = useMemo(() => {
    return dailyLogs.filter((l) => {
      if (filterDate !== 'all') {
        const lDate = l.work_date || l.date;
        if (lDate !== filterDate) return false;
      }
      return true;
    });
  }, [dailyLogs, filterDate]);

  // Real-time Simulation action
  const handleSimulateStitching = () => {
    const sampleEmployee = ['Ahmedasa', 'hamthan', 'Ravi', 'riziziz'][Math.floor(Math.random() * 4)];
    const sampleStage = ['PASTING', 'FUSING', 'LINE_STITCHING', 'SHELL_STITCHING', 'FINAL_FINISH'][Math.floor(Math.random() * 5)];
    const sampleSize = ['S', 'M', 'L', 'XL', '50'][Math.floor(Math.random() * 5)];
    const seq = piecesList.length + 1;
    const newPiece = {
      piece_code: `ORD_1011-CARNABY-PINE_GREEN-${sampleSize}-${String(seq).padStart(3, '0')}`,
      seq,
      size: sampleSize,
      colour: 'PINE GREEN',
      style: 'CARNABY',
      current_stage: sampleStage,
      previous_stage: 'FUSING',
      last_worked: '2026-08-13',
      employee: sampleEmployee,
      order_number: 'ORD-1011',
      status: sampleStage === 'FINAL_FINISH' ? 'Completed' : 'In Progress',
    };

    setPiecesList([newPiece, ...piecesList]);
    triggerToast(`⚡ Live Stitching Event: ${newPiece.piece_code} processed at [${sampleStage}] by ${sampleEmployee}`);
  };

  // CSV Export action
  const handleExportCSV = () => {
    const headers = [
      'Piece Code',
      'Seq',
      'Order #',
      'Style',
      'Size',
      'Colour',
      'Current Stage',
      'Previous Stage',
      'Operator',
      'Status',
      'Work Date',
    ];

    const rows = filteredPieces.map((p) => [
      p.piece_code,
      p.seq,
      p.order_number,
      p.style,
      p.size,
      p.colour,
      p.current_stage,
      p.previous_stage || 'N/A',
      p.employee,
      p.status,
      p.last_worked,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Stitching_Floor_Traceability_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('📥 Stitching Traceability CSV Report Downloaded Successfully');
  };

  // Defect Log form submit
  const handleLogDefectSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const pieceCode = formData.get('pieceCode');
    const stage = formData.get('stage');
    const reason = formData.get('reason');
    const reworkEmployee = formData.get('reworkEmployee');

    setPiecesList((prev) =>
      prev.map((p) =>
        p.piece_code === pieceCode
          ? {
              ...p,
              current_stage: stage,
              status: 'Damaged',
              damage_reason: reason,
              rework_cutter: reworkEmployee,
            }
          : p
      )
    );

    setShowLogDefectModal(false);
    triggerToast(`⚠️ Stitching Defect Logged for ${pieceCode} at [${stage}] &rarr; Assigned to Rework (${reworkEmployee})`);
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
            <Zap className="w-4 h-4 text-[#6366f1] animate-pulse" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── TOP ACTION BANNER (Full Width) ─── */}
      <div className="w-full bg-white p-5 rounded-2xl border border-[#e8edf3] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#4f46e5] to-[#4338ca] flex items-center justify-center text-white shadow-md">
            <Waypoints className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-[#1e293b] tracking-tight">Stitching Floor Operations Dashboard</h1>
            <p className="text-xs text-[#64748b] font-medium">5-Stage Pipeline: <strong className="text-[#4f46e5]">Pasting &rarr; Fusing &rarr; Line Stitch &rarr; Shell Stitch &rarr; Final Finish</strong></p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={handleSimulateStitching}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#4f46e5] text-white text-xs font-bold hover:bg-[#4338ca] transition-all shadow-sm hover:scale-[1.02]"
            title="Simulate live piece stitching event on floor"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Live Stitching Sim</span>
          </button>

          <button
            onClick={() => setShowLogDefectModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100 transition-all"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span>Log Defect</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#f8fafc] text-slate-700 border border-slate-200 text-xs font-bold hover:bg-slate-100 transition-all"
            title="Export complete stitching traceability report to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-slate-200 text-xs text-slate-500 font-semibold">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
            <span>Floor Stream Active</span>
          </div>
        </div>
      </div>

      {/* ─── UNIVERSAL MULTI-FILTER TOOLBAR (Full Width) ─── */}
      <section className="w-full bg-white p-4 rounded-2xl border border-[#e8edf3] shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#1e293b] uppercase tracking-wider">
            <Filter className="w-4 h-4 text-[#4f46e5]" />
            <span>Universal Operations Cross-Filter</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#e0e7ff] text-[#3730a3] border border-[#c7d2fe]">
              Showing {filteredPieces.length} of {piecesList.length} Pieces
            </span>
            <button
              onClick={handleResetFilters}
              className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer"
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
              placeholder="Search piece, style, stage, operator..."
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4f46e5]"
            />
          </div>

          {/* Date Filter with Complete Interactive Monthly Calendar Picker */}
          <div>
            <CompleteDateCalendarPicker
              selectedDate={filterDate}
              onSelectDate={setFilterDate}
              availableDates={availableDates}
              themeColor="#4f46e5"
            />
          </div>

          {/* Order Filter */}
          <div>
            <select
              value={filterOrder}
              onChange={(e) => {
                const val = e.target.value;
                setFilterOrder(val);
                const ord = ordersList.find((o) => o.id === val || o.order_number === val || o.po_number === val);
                if (ord) setActiveOrder(ord);
              }}
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#4f46e5]"
            >
              <option value="all">📦 All Orders</option>
              {ordersList.map((ord, idx) => (
                <option key={`${ord.id || ord.order_number}-${idx}`} value={ord.id || ord.order_number}>
                  {ord.order_number ? `${ord.client ? `${ord.client} - ` : ''}PO: ${ord.order_number}` : (ord.name || ord.po_number || ord.id)}
                </option>
              ))}
            </select>
          </div>

          {/* Style Filter */}
          <div>
            <select
              value={filterStyle}
              onChange={(e) => {
                const val = e.target.value;
                setFilterStyle(val);
                if (val !== 'all') {
                  const found = availableStyles.find(s => s.name === val || s.id === val);
                  if (found) setActiveStyle(found);
                } else {
                  setActiveStyle(null);
                }
              }}
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#4f46e5]"
            >
              <option value="all">👗 All Styles</option>
              {availableStyles.map((s, idx) => (
                <option key={`${s.id || s.name}-${idx}`} value={s.name || s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Stitching Stage Filter */}
          <div>
            <select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#4f46e5]"
            >
              <option value="all">🪡 All Stages</option>
              {availableStages.map((st, idx) => (
                <option key={`${st}-${idx}`} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Operator Filter */}
          <div>
            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#4f46e5]"
            >
              <option value="all">👷 All Operators</option>
              {availableEmployees.map((emp, idx) => (
                <option key={`${emp.id || emp.name}-${idx}`} value={emp.name}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#4f46e5]"
            >
              <option value="all">⚡ Status</option>
              <option value="Completed">Completed</option>
              <option value="Pasting Done">Pasting Done</option>
              <option value="Stitching Line">Stitching Line</option>
              <option value="Damaged">Damaged</option>
              <option value="Rework">Rework</option>
            </select>
          </div>
        </div>
      </section>

      {/* ─── NAVIGATION TABS BAR (Full Width) ─── */}
      <div className="w-full flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-[#e8edf3] shadow-sm overflow-x-auto">
        {[
          { id: 'tab-today', label: "📌 Today's Priority" },
          { id: 'tab-stages', label: '🪡 Stage-Wise & Bottlenecks' },
          { id: 'tab-store', label: '🏬 Store Handoff & Drawers' },
          { id: 'tab-styles', label: '👗 Per-Style Progress' },
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
           TAB 1: TODAY'S STITCHING PRIORITY
           ==================================================================== */}
      {activeTab === 'tab-today' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full space-y-5"
        >
          {/* CURRENT RUNNING STYLE HERO BANNER (Full Width Grid) */}
          <div className="w-full bg-gradient-to-br from-white via-[#f8fafc] to-[#eef2ff] border border-indigo-200/70 rounded-3xl p-6 shadow-sm grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Col: Order Specs */}
            <div className="flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {displayStyle.status}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-indigo-100 text-indigo-800">
                    {displayStyle.order_number}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    Client: <strong>{displayStyle.client}</strong>
                  </span>
                </div>
                <h2 className="text-2xl font-black text-[#1e293b] tracking-tight">{displayStyle.style_name}</h2>
                <p className="text-xs font-semibold text-slate-600 mt-0.5">{displayStyle.article} &bull; Size: <strong className="text-[#4f46e5]">{displayStyle.size}</strong></p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Color</span>
                  <p className="text-xs font-bold text-slate-800">{displayStyle.color}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Total Pieces</span>
                  <p className="text-xs font-bold text-slate-800">{displayStyle.total_pieces} pcs</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Assigned</span>
                  <p className="text-xs font-bold text-slate-800">{displayStyle.assigned_pieces} pcs</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Target Date</span>
                  <p className="text-xs font-bold text-[#4f46e5]">{displayStyle.target_date}</p>
                </div>
              </div>
            </div>

            {/* Middle Col: Pacing & Target Timeline */}
            <div className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-2xl p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Stitching Stage Timeline</span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                  {displayStyle.target_date} Target
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 my-3">
                <div className="bg-[#f8fafc] p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-500">Stitching Completed</span>
                  <div className="text-lg font-black text-emerald-800">{displayStyle.completed_pieces} pcs</div>
                </div>
                <div className="bg-[#f8fafc] p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-500">Stitching Pending</span>
                  <div className="text-lg font-black text-amber-800">{displayStyle.pending_pieces} pcs</div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-600">Overall Stitching Progress</span>
                  <span className="text-[#4f46e5]">{displayStyle.progressPct}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#4f46e5] to-[#6366f1] h-full rounded-full transition-all duration-500"
                    style={{ width: `${displayStyle.progressPct}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Right Col: Active Bottleneck Detector */}
            <div className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-2xl p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Active Stage Bottlenecks</span>
                <span className="text-[11px] font-bold text-indigo-600 font-mono">Live Stage Tracking</span>
              </div>

              {bottleneckStage ? (
                <div className="bg-gradient-to-br from-rose-50 via-red-50 to-orange-50 border-2 border-red-400 p-3.5 rounded-xl my-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-red-900 font-extrabold text-xs">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
                      </span>
                      <span>ACTIVE BOTTLENECK</span>
                    </div>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-red-600 text-white animate-pulse">
                      High Backlog
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-baseline justify-between">
                    <span className="text-xs font-extrabold text-red-950">{bottleneckStage.label || bottleneckStage.stage}</span>
                    <span className="text-xs font-black text-red-700">{bottleneckStage.pending_pieces} pcs pending</span>
                  </div>
                  <p className="text-[10px] text-red-700 mt-1 font-medium">
                    Queue backlog &bull; Stage load exceeds normal buffer
                  </p>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl my-2">
                  <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Pipeline Flow Status: Normal</span>
                  </div>
                  <p className="text-[11px] text-emerald-700 mt-1">All active stitching stages on track</p>
                </div>
              )}

              <div className="flex justify-between text-xs font-semibold text-slate-600 pt-2 border-t border-slate-100">
                <span>Store Buffer: <strong>{displayStyle.store_pieces || storeHandoff?.in_drawer || 0} in drawer</strong></span>
                <span>Ready QC: <strong className="text-emerald-700">{displayStyle.ready_qc || piecesList.filter((p) => p.status === 'Completed').length} pcs</strong></span>
              </div>
            </div>
          </div>

          {/* 4 TOP SUMMARY KPIS */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* KPI 1 */}
            <div
              onClick={() => setActiveTab('tab-pieces')}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg">
                  📦
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                  {displayStyle.assigned_pieces} Assigned
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-500">Total Stitching Order Pieces</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900">{displayStyle.total_pieces}</span>
                <span className="text-xs font-semibold text-slate-400">/ across styles</span>
              </div>
              <div className="mt-3 pt-3 border-t border-dashed border-slate-100 flex justify-between text-xs text-slate-600 font-semibold">
                <span>Completed: <strong className="text-emerald-600">{displayStyle.completed_pieces}</strong> {kpis?.completed_today !== undefined && !activeStyle && <span className="text-[10px] text-emerald-700">({kpis.completed_today} today)</span>}</span>
                <span>Pending: <strong className="text-amber-600">{displayStyle.pending_pieces}</strong> {kpis?.pending_today !== undefined && !activeStyle && <span className="text-[10px] text-amber-700">({kpis.pending_today} today)</span>}</span>
              </div>
            </div>

            {/* KPI 2 */}
            <div
              onClick={() => setActiveTab('tab-stages')}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-lg">
                  🪡
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700">
                  {filteredStagesList.length || 5} Stages
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-500">Pasting & Fusing Output</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900">
                  {filteredStagesList.find((s) => s.stage === 'PASTING')?.completed_pieces || 0} Pcs Pasted
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-dashed border-slate-100 flex justify-between text-xs text-slate-600 font-semibold">
                <span>Fusing Done: <strong>{filteredStagesList.find((s) => s.stage === 'FUSING')?.completed_pieces || 0} pcs</strong></span>
                <span>Fusing Pending: <strong className="text-rose-600">{filteredStagesList.find((s) => s.stage === 'FUSING')?.pending_pieces || 0} pcs</strong></span>
              </div>
            </div>

            {/* KPI 3 */}
            <div
              onClick={() => setActiveTab('tab-store')}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
                  🏬
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700">
                  Drawer Sync
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-500">Store Handoff & Buffer</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900">{displayStyle.store_pieces} in Drawer</span>
              </div>
              <div className="mt-3 pt-3 border-t border-dashed border-slate-100 flex justify-between text-xs text-slate-600 font-semibold">
                <span>Ready for Store: <strong className="text-blue-600">{displayStyle.ready_qc}</strong></span>
                <span>Ready Stitching: <strong className="text-emerald-600">{activeStyle ? (displayStyle.ready_qc || 0) : (storeHandoff?.ready_for_stitching || 0)}</strong></span>
              </div>
            </div>

            {/* KPI 4 */}
            <div
              onClick={() => setActiveTab('tab-damage')}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg">
                  ⚠️
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700">
                  Rework: {displayStyle.rework_pieces}
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-500">Damage & Defect Tracking</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-rose-600">{displayStyle.damage_pieces} Defects</span>
              </div>
              <div className="mt-3 pt-3 border-t border-dashed border-slate-100 flex justify-between text-xs text-slate-600 font-semibold">
                <span>Rework Queue: <strong className="text-purple-600">{displayStyle.rework_pieces} pcs</strong></span>
                <span>Ready Inspection: <strong className="text-emerald-600">{displayStyle.ready_qc}</strong></span>
              </div>
            </div>
          </div>

          {/* DAILY PRODUCTION CADENCE CHART & LOG */}
          <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Chart */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Daily Stage Output (Pasting, Fusing, Line, Shell, Finish)</h3>
                  <p className="text-xs text-slate-500">Completed operations across stitching shift dates</p>
                </div>
              </div>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dynamicDailyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="work_date" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip content={<CustomTooltip unit="pcs" />} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                    <Bar dataKey="pasting" name="Pasting" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="fusing" name="Fusing" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="line_stitching" name="Line Stitch" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="shell_stitching" name="Shell Stitch" fill="#ec4899" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="final_finish" name="Final Finish" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Log Table */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 mb-1">Production Shift Log</h3>
                <p className="text-xs text-slate-500 mb-3">Shift-wise completed units</p>
                
                <div className="overflow-y-auto max-h-[250px] space-y-2 pr-1">
                  {dynamicDailyChartData.map((log, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-[#f8fafc] border border-slate-100 text-xs">
                      <div>
                        <span className="font-bold text-slate-800">{log.work_date || log.date}</span>
                        <div className="text-[10px] text-slate-500 mt-0.5">{log.events || log.completed || 0} scan operations</div>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-indigo-700">{log.completed || 0} done</span>
                        <div className="text-[10px] text-slate-500 font-semibold">Target: {log.target || 30} pcs</div>
                      </div>
                    </div>
                  ))}
                  {dynamicDailyChartData.length === 0 && (
                    <div className="text-center py-8 text-slate-400 font-medium text-xs">
                      No shift records logged for selected filter.
                    </div>
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
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full space-y-5"
        >
          <div className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">5-Stage Stitching Production Pipeline &amp; Bottleneck Identification</h3>
                <p className="text-xs text-slate-500">Pasting &rarr; Fusing (Pre-Store) &bull; Line Stitching &rarr; Shell Stitching &rarr; Final Finish (Post-Store)</p>
              </div>
            </div>

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
                    <th className="py-3 px-4 text-right">Defects / Rework</th>
                    <th className="py-3 px-4 text-center">Status / Bottleneck</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredStagesList.map((st, idx) => {
                    const isBottleneck = st.is_bottleneck || (st.pending_pieces || 0) > 15;
                    return (
                      <tr
                        key={idx}
                        onClick={() => setSelectedStageDetail(st)}
                        className={`cursor-pointer transition-all ${
                          isBottleneck
                            ? 'bg-red-50/70 border-l-4 border-red-500 hover:bg-red-50'
                            : selectedStageDetail?.stage === st.stage
                            ? 'bg-indigo-50/60'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                          <span>🪡</span>
                          <span>{st.label || st.stage}</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600">{st.section || 'Floor'}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">{st.total_received || 0} pcs</td>
                        <td className="py-3.5 px-4 text-right font-mono text-blue-700 font-semibold">{st.assigned_pieces || 0} pcs</td>
                        <td className="py-3.5 px-4 text-right font-mono text-emerald-700 font-black">{st.completed_pieces || 0} pcs</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold">
                          <span className={isBottleneck ? 'text-red-600 font-black text-sm' : 'text-slate-800'}>
                            {st.pending_pieces || 0} pcs
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono">{st.damage_pieces || 0} / {st.rework_pieces || 0}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center justify-center gap-1.5 shadow-sm ${
                              isBottleneck
                                ? 'bg-red-600 text-white animate-pulse'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isBottleneck ? (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                                <span>🔴 BOTTLENECK ({st.pending_pieces} Pending)</span>
                              </>
                            ) : (
                              <span>🟢 Active (On Track)</span>
                            )}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredStagesList.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-400 font-medium">
                        No stage data available for selected filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Funnel Comparison Chart */}
          <div className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-extrabold text-slate-900 mb-1">Stage Progression & Pending Volume (Bottleneck View)</h3>
            <p className="text-xs text-slate-500 mb-4">Total received vs completed vs pending across stages</p>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredStagesList}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip content={<CustomTooltip unit="pcs" />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Bar dataKey="total_received" name="Total Received" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completed_pieces" name="Completed Pieces" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pending_pieces" name="Pending Pieces" fill="#f43f5e" radius={[4, 4, 0, 0]} />
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
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full space-y-5"
        >
          <div className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Store Handoff & Intermediate Drawer State</h3>
                <p className="text-xs text-slate-500">Tracks pieces transferring from Pre-Store (Pasting/Fusing) to Intermediate Drawer, and then dispatched to Post-Store Stitching</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 my-4">
              <div className="p-5 rounded-2xl bg-blue-50 border border-blue-200">
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Ready for Store</span>
                <div className="text-3xl font-black text-blue-900 mt-1">{storeHandoff?.ready_for_store ?? kpis?.ready_for_store ?? 0} pcs</div>
                <p className="text-xs text-blue-600 mt-2">Pasted & Fused pieces awaiting store drawer transfer</p>
              </div>

              <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-200">
                <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Sent to Store</span>
                <div className="text-3xl font-black text-indigo-900 mt-1">{storeHandoff?.sent_to_store ?? 0} pcs</div>
                <p className="text-xs text-indigo-600 mt-2">Pieces currently in transit to intermediate storage</p>
              </div>

              <div className="p-5 rounded-2xl bg-cyan-50 border border-cyan-200">
                <span className="text-xs font-bold text-cyan-700 uppercase tracking-wider">In Store</span>
                <div className="text-3xl font-black text-cyan-900 mt-1">{storeHandoff?.in_store ?? kpis?.in_store ?? 0} pcs</div>
                <p className="text-xs text-cyan-600 mt-2">Total pieces logged inside store area</p>
              </div>

              <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200">
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Currently in Drawer</span>
                <div className="text-3xl font-black text-amber-900 mt-1">{storeHandoff?.in_drawer ?? 0} pcs</div>
                <p className="text-xs text-amber-600 mt-2">Pieces stored inside physical drawers</p>
              </div>

              <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200">
                <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">Store Pending</span>
                <div className="text-3xl font-black text-rose-900 mt-1">{storeHandoff?.store_pending ?? 0} pcs</div>
                <p className="text-xs text-rose-600 mt-2">Pieces awaiting drawer sorting or QC hold</p>
              </div>

              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Dispatched to Stitching Line</span>
                <div className="text-3xl font-black text-emerald-900 mt-1">{storeHandoff?.ready_for_stitching ?? 0} pcs</div>
                <p className="text-xs text-emerald-600 mt-2">Handed over to Line & Shell stitchers</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ====================================================================
           TAB 4: PER-STYLE PROGRESS MATRIX
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
                <h3 className="text-base font-extrabold text-slate-900">Per-Style Stitching Progression & Stage Completion</h3>
                <p className="text-xs text-slate-500">Order progress, minted pieces, completion percentage across styles, and deadline monitoring</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-[#f8fafc] text-slate-600 font-bold uppercase tracking-wider border-y border-slate-200">
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-4">Style Name</th>
                    <th className="py-3 px-4">Article</th>
                    <th className="py-3 px-4 text-right">Total Ordered</th>
                    <th className="py-3 px-4 text-right">Minted</th>
                    <th className="py-3 px-4 text-right">Completed</th>
                    <th className="py-3 px-4 text-right">Pending</th>
                    <th className="py-3 px-4 text-center">Completion %</th>
                    <th className="py-3 px-4">Target Date</th>
                    <th className="py-3 px-4 text-center">Delay Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {(filteredStylesList.length > 0 ? filteredStylesList : orderProgress).map((s, idx) => {
                    const sName = s.style_name || s.name || s.style;
                    const isSelected = filterStyle === sName || activeStyle?.name === sName || activeStyle?.style_name === sName;
                    return (
                      <tr
                        key={idx}
                        onClick={() => {
                          setFilterStyle(sName);
                          const found = availableStyles.find(st => st.name === sName || st.id === sName) || s;
                          setActiveStyle(found);
                          setActiveTab('tab-today');
                          triggerToast(`⚡ Filtered Stitching Dashboard to Style: ${sName}`);
                        }}
                        className={`hover:bg-indigo-50/70 cursor-pointer transition-all ${isSelected ? 'bg-indigo-50/90 font-bold' : ''}`}
                        title="Click to view analytics and metrics for this style"
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">{s.order_number || activeOrder?.order_number || '—'}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span>👗</span>
                            <span>{sName}</span>
                          </div>
                          <span className="text-[10px] text-indigo-600 font-bold opacity-0 hover:opacity-100 transition-opacity">View Analytics &rarr;</span>
                        </td>
                        <td className="py-3.5 px-4">{s.article || 'Standard'}</td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900">{(s.total_ordered || s.pieces || 0).toLocaleString()} pcs</td>
                        <td className="py-3.5 px-4 text-right font-mono text-blue-700 font-bold">{(s.minted || 0).toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-right font-mono text-emerald-700 font-black">{(s.completed || 0).toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-right font-mono text-amber-700 font-bold">{(s.pending || 0).toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-emerald-500 h-full rounded-full"
                                style={{ width: `${s.completion_pct ?? 0}%` }}
                              ></div>
                            </div>
                            <span className="font-mono font-bold text-[11px]">{s.completion_pct ?? 0}%</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-700">{s.delivery_deadline || s.target_date || '—'}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                              s.delay_status === 'DELAYED'
                                ? 'bg-rose-100 text-rose-800'
                                : s.delay_status === 'NO_DEADLINE'
                                ? 'bg-slate-100 text-slate-700'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {s.delay_status || 'ON TRACK'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredStylesList.length === 0 && orderProgress.length === 0 && (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-slate-400 font-medium">
                        No per-style progress metrics recorded.
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
           TAB 5: EMPLOYEE MANAGEMENT BY STAGE
           ==================================================================== */}
      {activeTab === 'tab-employees' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full space-y-5"
        >
          <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {filteredEmployeesList.map((emp, idx) => (
              <div
                key={idx}
                onClick={() => handleOpenEmployeeModal(emp)}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <img
                      src={emp.photo || emp.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'}
                      alt={emp.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-[#4f46e5]"
                    />
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900">{emp.name}</h4>
                      <p className="text-xs text-slate-500">{emp.designation || emp.role || 'Tailor'}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 text-indigo-800">
                          {emp.stage || 'Floor'}
                        </span>
                        {emp.section && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700">
                            {emp.section}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-semibold my-3">
                    <div className="bg-[#f8fafc] p-2.5 rounded-xl">
                      <span className="text-[10px] text-slate-500">Assigned Pieces</span>
                      <div className="text-base font-black text-slate-900">{emp.assigned_pieces || 0} pcs</div>
                      {emp.assigned_today !== undefined && (
                        <span className="text-[10px] text-blue-600 block mt-0.5">{emp.assigned_today} today</span>
                      )}
                    </div>
                    <div className="bg-[#f8fafc] p-2.5 rounded-xl">
                      <span className="text-[10px] text-slate-500">Completed</span>
                      <div className="text-base font-black text-emerald-700">{emp.completed_pieces || 0} pcs</div>
                      {emp.completed_today !== undefined && (
                        <span className="text-[10px] text-emerald-600 block mt-0.5">{emp.completed_today} today</span>
                      )}
                    </div>
                    <div className="bg-[#f8fafc] p-2.5 rounded-xl">
                      <span className="text-[10px] text-slate-500">Defects</span>
                      <div className="text-base font-black text-rose-600">{emp.damage_pieces || 0}</div>
                    </div>
                    <div className="bg-[#f8fafc] p-2.5 rounded-xl">
                      <span className="text-[10px] text-slate-500">Rework Today</span>
                      <div className="text-base font-black text-amber-600">{emp.rework_today || 0}</div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenEmployeeModal(emp);
                  }}
                  className="w-full mt-2 py-2 rounded-xl bg-slate-100 hover:bg-[#1e293b] hover:text-white text-slate-800 text-xs font-bold transition-all"
                >
                  View Operator Logs
                </button>
              </div>
            ))}
            {filteredEmployeesList.length === 0 && (
              <div className="col-span-4 text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400 font-medium">
                No stitching employees registered.
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ====================================================================
           TAB 6: PIECE-LEVEL STITCHING TRACKER
           ==================================================================== */}
      {activeTab === 'tab-pieces' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full space-y-4"
        >
          <div className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Piece-Level Master Stitching Tracker</h3>
                <p className="text-xs text-slate-500">Individual jacket serial tracking with exact stage progression and assigned stitching operator</p>
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
                    <th className="py-3 px-4">Piece Serial Code</th>
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-4">Style</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4">Operator</th>
                    <th className="py-3 px-4">Current Stage</th>
                    <th className="py-3 px-4">Previous Stage</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Inspector</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {paginatedPieces.map((p, idx) => (
                    <tr
                      key={idx}
                      onClick={() => handleOpenPieceModal(p)}
                      className="hover:bg-slate-50 cursor-pointer transition-all"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{p.piece_code}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">{p.order_number}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">{p.style}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-700">{p.size}</td>
                      <td className="py-3.5 px-4 text-slate-800">{p.employee}</td>
                      <td className="py-3.5 px-4 font-bold text-indigo-700">{p.current_stage}</td>
                      <td className="py-3.5 px-4 text-slate-500">{p.previous_stage || 'CUTTING'}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                            p.status === 'Completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.status === 'Damaged'
                              ? 'bg-rose-100 text-rose-800'
                              : p.status === 'Rework'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPieceModal(p);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#4f46e5] hover:text-white text-slate-700 text-[11px] font-bold transition-all"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs font-bold text-slate-600">
              <span>
                Page {currentPage} of {totalPages} ({filteredPieces.length} items)
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
           TAB 7: DAMAGE & REWORK STATION
           ==================================================================== */}
      {activeTab === 'tab-damage' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full space-y-5"
        >
          <div className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Stitching Damage, Defects & Rework Station</h3>
                <p className="text-xs text-slate-500">Defects categorized by stitching stage, operator responsible, and rework status</p>
              </div>
              <button
                onClick={() => setShowLogDefectModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-all flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log New Defect</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-[#f8fafc] text-slate-600 font-bold uppercase tracking-wider border-y border-slate-200">
                    <th className="py-3 px-4">Piece Serial Code</th>
                    <th className="py-3 px-4">Style</th>
                    <th className="py-3 px-4">Stage Occurred</th>
                    <th className="py-3 px-4">Operator</th>
                    <th className="py-3 px-4">Defect Reason</th>
                    <th className="py-3 px-4">Rework Assigned To</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {defectsList.map((d, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-all">
                      <td className="py-3.5 px-4 font-mono font-bold text-rose-600">{d.piece_code}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{d.style_name}</td>
                      <td className="py-3.5 px-4 font-bold text-indigo-700">{d.stage}</td>
                      <td className="py-3.5 px-4 text-slate-800">{d.employee}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">{d.damage_reason}</td>
                      <td className="py-3.5 px-4 text-purple-700 font-bold">{d.rework_assigned_to}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800">
                          {d.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {defectsList.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400 font-medium">
                        No damage or defect incidents logged.
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
           TAB 8: STAGE ANALYTICS
           ==================================================================== */}
      {activeTab === 'tab-analytics' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full space-y-5"
        >
          <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Stage Share */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-extrabold text-slate-900 mb-1">Stage Completed Distribution</h3>
              <p className="text-xs text-slate-500 mb-4">Volume completed at Pasting, Fusing, Line, Shell, Finish</p>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={filteredStagesList}
                      dataKey="completed_pieces"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      innerRadius={50}
                      paddingAngle={4}
                    >
                      <Cell fill="#3b82f6" />
                      <Cell fill="#f59e0b" />
                      <Cell fill="#8b5cf6" />
                      <Cell fill="#ec4899" />
                      <Cell fill="#10b981" />
                    </Pie>
                    <Tooltip content={<CustomTooltip unit="pcs" />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Operator Efficiency */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-extrabold text-slate-900 mb-1">Operator Target vs Completed Pieces</h3>
              <p className="text-xs text-slate-500 mb-4">Output and target comparison across floor specialists</p>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredEmployeesList}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip content={<CustomTooltip unit="pcs" />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="daily_target" name="Daily Target" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="daily_completed" name="Daily Completed" fill="#4f46e5" radius={[4, 4, 0, 0]} />
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
            <h3 className="text-base font-extrabold text-slate-900">End-to-End Stitching Production Flow Architecture</h3>
            <p className="text-xs text-slate-500">Pasting &rarr; Fusing &rarr; Store Drawer Buffer &rarr; Line Stitching &rarr; Shell Stitching &rarr; Final Finish &rarr; Inspection</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            {[
              { title: '1. Pasting', desc: 'Pre-Store Reinforce', icon: '🪡', color: 'bg-blue-50 text-blue-700' },
              { title: '2. Fusing', desc: 'Thermal Bonding', icon: '⚡', color: 'bg-amber-50 text-amber-700' },
              { title: '3. Store Drawer', desc: 'Intermediate Buffer', icon: '🏬', color: 'bg-indigo-50 text-indigo-700' },
              { title: '4. Line Stitch', desc: 'Sub-assembly Seams', icon: '🧵', color: 'bg-purple-50 text-purple-700' },
              { title: '5. Shell Stitch', desc: 'Jacket Shell Join', icon: '🧥', color: 'bg-pink-50 text-pink-700' },
              { title: '6. Final Finish', desc: 'Iron, Trim & QC Pass', icon: '✅', color: 'bg-emerald-50 text-emerald-700' },
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
           MODAL 1: PIECE SERIAL INSPECTOR (5-STAGE STITCHING STEPPER)
           ==================================================================== */}
      <AnimatePresence>
        {selectedPieceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 overflow-hidden"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Stitching Piece Serial Inspector</span>
                  <h3 className="text-base font-mono font-black text-slate-900">{selectedPieceModal.piece_code}</h3>
                </div>
                <button
                  onClick={() => setSelectedPieceModal(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 5-Stage Stitching Stepper */}
              <div>
                <span className="text-xs font-bold text-slate-600 block mb-2">5-Stage Stitching Progression:</span>
                <div className="grid grid-cols-5 gap-2 text-center">
                  {[
                    { name: 'Pasting', stageKey: 'PASTING' },
                    { name: 'Fusing', stageKey: 'FUSING' },
                    { name: 'Line Stitch', stageKey: 'LINE_STITCHING' },
                    { name: 'Shell Stitch', stageKey: 'SHELL_STITCHING' },
                    { name: 'Final Finish', stageKey: 'FINAL_FINISH' },
                  ].map((s, idx) => {
                    const isDone = idx <= 2;
                    const isCurrent = s.stageKey === selectedPieceModal.current_stage;
                    return (
                      <div key={idx} className="flex flex-col items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            isCurrent
                              ? 'bg-indigo-600 text-white ring-4 ring-indigo-100'
                              : isDone
                              ? 'bg-emerald-500 text-white'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {isDone ? '✓' : idx + 1}
                        </div>
                        <span className="text-[10px] font-bold text-slate-700 mt-1.5">{s.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Stage & Operator Details */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-[#f8fafc] rounded-2xl border border-slate-200 text-xs font-semibold">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Current Stage</span>
                  <p className="text-sm font-black text-indigo-700">{selectedPieceModal.current_stage}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Assigned Operator</span>
                  <p className="text-sm font-black text-slate-900">{selectedPieceModal.employee}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Style / Article</span>
                  <p className="text-xs text-slate-800">{selectedPieceModal.style} &bull; {selectedPieceModal.colour}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Order / Size</span>
                  <p className="text-xs text-slate-800">{selectedPieceModal.order_number} &bull; Size {selectedPieceModal.size}</p>
                </div>
              </div>

              {/* Meta details */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-xs font-semibold">
                  <span>Last Scanned: <strong>{selectedPieceModal.last_worked}</strong></span>
                </div>
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono font-bold">
                  <QrCode className="w-4 h-4 text-slate-600" />
                  <span>STITCH-QC-PASS</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ====================================================================
           MODAL 2: EMPLOYEE DRAWER MODAL
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
                  <img
                    src={selectedEmployeeModal.avatar}
                    alt={selectedEmployeeModal.name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-[#4f46e5]"
                  />
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">{selectedEmployeeModal.name}</h3>
                    <p className="text-xs text-slate-500">{selectedEmployeeModal.designation} &bull; Stage: {selectedEmployeeModal.stage}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedEmployeeModal(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-y-auto max-h-[300px]">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-[#f8fafc] text-slate-600 font-bold border-y border-slate-200">
                      <th className="py-2.5 px-3">Piece Serial</th>
                      <th className="py-2.5 px-3">Style</th>
                      <th className="py-2.5 px-3">Current Stage</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {piecesList
                      .filter((p) => p.employee === selectedEmployeeModal.name)
                      .map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono font-bold">{p.piece_code}</td>
                          <td className="py-2 px-3">{p.style}</td>
                          <td className="py-2 px-3 font-bold text-indigo-700">{p.current_stage}</td>
                          <td className="py-2 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ====================================================================
           MODAL 3: LOG DEFECT MODAL
           ==================================================================== */}
      <AnimatePresence>
        {showLogDefectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-rose-600">
                  <AlertTriangle className="w-5 h-5" />
                  <h3 className="text-sm font-extrabold text-slate-900">Log Stitching Defect / Rework</h3>
                </div>
                <button
                  onClick={() => setShowLogDefectModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleLogDefectSubmit} className="space-y-3.5 text-xs font-semibold">
                <div>
                  <label className="block text-slate-700 mb-1">Select Piece Serial Code</label>
                  <select
                    name="pieceCode"
                    required
                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  >
                    {piecesList.slice(0, 15).map((p, idx) => (
                      <option key={`stitch-pc-opt-${p.piece_code || p.id || idx}-${idx}`} value={p.piece_code}>
                        {p.piece_code} ({p.style})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">Stage Occurred</label>
                  <select
                    name="stage"
                    required
                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  >
                    <option value="LINE_STITCHING">Line Stitching</option>
                    <option value="SHELL_STITCHING">Shell Stitching</option>
                    <option value="FUSING">Fusing</option>
                    <option value="PASTING">Pasting</option>
                    <option value="FINAL_FINISH">Final Finish</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">Defect Reason</label>
                  <select
                    name="reason"
                    required
                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  >
                    <option value="Needle puncture on shoulder seam">Needle puncture on shoulder seam</option>
                    <option value="Tension puckering along side seam">Tension puckering along side seam</option>
                    <option value="Misaligned collar lining join">Misaligned collar lining join</option>
                    <option value="Fusing bubble on lapel">Fusing bubble on lapel</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">Assign Rework Operator</label>
                  <select
                    name="reworkEmployee"
                    required
                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  >
                    <option value="hamthan">hamthan (Stitching Supervisor)</option>
                    <option value="Ravi">Ravi (Line Specialist)</option>
                    <option value="Ahmedasa">Ahmedasa (Master Operator)</option>
                    <option value="riziziz">riziziz (Finish Specialist)</option>
                  </select>
                </div>

                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowLogDefectModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
                  >
                    Confirm Defect Entry
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
