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
import {
  apiGetStitchingDashboard,
  apiGetStitchingEmployeeDetail,
  apiGetStitchingPieceDetail,
} from '@/lib/api';
import {
  STITCHING_KPIS,
  STITCHING_STAGES_DATA,
  STORE_HANDOFF_METRICS,
  CURRENT_STITCHING_STYLE,
  STITCHING_STYLES_SUMMARY,
  STITCHING_EMPLOYEES,
  STITCHING_DAILY_LOGS,
  RAW_STITCHING_PIECES_DATA,
  STITCHING_DEFECTS_LOG,
} from '@/lib/stitchingData';

// Chart custom tooltip
function CustomTooltip({ active, payload, label, unit = 'pcs' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1e293b] border border-slate-700 text-white px-3.5 py-2.5 rounded-xl text-xs shadow-2xl z-50">
      {label && <p className="text-[10px] font-black uppercase tracking-wider text-[#6366f1] mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="font-semibold flex items-center justify-between gap-4" style={{ color: p.color || p.fill }}>
          <span>{p.name}:</span>
          <span className="text-white font-mono font-bold">{p.value} {unit}</span>
        </p>
      ))}
    </div>
  );
}

function StitchingDashboardContent() {
  const searchParams = useSearchParams();
  const { token } = useAuth();

  // State
  const [activeTab, setActiveTab] = useState('tab-today');
  const [piecesList, setPiecesList] = useState(RAW_STITCHING_PIECES_DATA);
  const [activeStyle, setActiveStyle] = useState(CURRENT_STITCHING_STYLE);
  const [stylesList, setStylesList] = useState(STITCHING_STYLES_SUMMARY);
  const [stagesList, setStagesList] = useState(STITCHING_STAGES_DATA);
  const [selectedStageDetail, setSelectedStageDetail] = useState(STITCHING_STAGES_DATA[0]);
  const [employeesList, setEmployeesList] = useState(STITCHING_EMPLOYEES);
  const [storeHandoff, setStoreHandoff] = useState(STORE_HANDOFF_METRICS);
  const [dailyLogs, setDailyLogs] = useState(STITCHING_DAILY_LOGS);
  const [defectsList, setDefectsList] = useState(STITCHING_DEFECTS_LOG);

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

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
          if (data.pieces && Array.isArray(data.pieces)) setPiecesList(data.pieces);
          if (data.current_style) setActiveStyle(data.current_style);
          if (data.styles && Array.isArray(data.styles)) setStylesList(data.styles);
          if (data.stages && Array.isArray(data.stages)) setStagesList(data.stages);
          if (data.employees && Array.isArray(data.employees)) setEmployeesList(data.employees);
          if (data.store_handoff) setStoreHandoff(data.store_handoff);
          if (data.daily_logs && Array.isArray(data.daily_logs)) setDailyLogs(data.daily_logs);
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

  // Filtered pieces computed
  const filteredPieces = useMemo(() => {
    return piecesList.filter((p) => {
      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesQuery =
          p.piece_code.toLowerCase().includes(q) ||
          p.style.toLowerCase().includes(q) ||
          p.employee.toLowerCase().includes(q) ||
          p.order_number.toLowerCase().includes(q) ||
          p.current_stage.toLowerCase().includes(q) ||
          p.colour.toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }
      // Date
      if (filterDate === '2026-08-11' && p.last_worked !== '2026-08-11') return false;
      if (filterDate === '2026-08-10' && p.last_worked !== '2026-08-10') return false;
      if (filterDate === '2026-08-05' && p.last_worked !== '2026-08-05') return false;
      // Order
      if (filterOrder !== 'all' && p.order_number !== filterOrder) return false;
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

          {/* Date Filter */}
          <div>
            <select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#4f46e5]"
            >
              <option value="all">📅 All Dates</option>
              <option value="2026-08-11">11-Aug-2026</option>
              <option value="2026-08-10">10-Aug-2026</option>
              <option value="2026-08-05">05-Aug-2026</option>
            </select>
          </div>

          {/* Order Filter */}
          <div>
            <select
              value={filterOrder}
              onChange={(e) => setFilterOrder(e.target.value)}
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#4f46e5]"
            >
              <option value="all">📦 All Orders</option>
              <option value="ORD-1011">ORD-1011</option>
              <option value="is1234">is1234</option>
              <option value="3001">3001</option>
            </select>
          </div>

          {/* Style Filter */}
          <div>
            <select
              value={filterStyle}
              onChange={(e) => setFilterStyle(e.target.value)}
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#4f46e5]"
            >
              <option value="all">👗 All Styles</option>
              <option value="CARNABY">CARNABY</option>
              <option value="FRANCIS KNIT">FRANCIS KNIT</option>
              <option value="CLERMONT + VEST">CLERMONT + VEST</option>
              <option value="ADELE KNIT">ADELE KNIT</option>
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
              <option value="PASTING">Pasting</option>
              <option value="FUSING">Fusing</option>
              <option value="LINE_STITCHING">Line Stitching</option>
              <option value="SHELL_STITCHING">Shell Stitching</option>
              <option value="FINAL_FINISH">Final Finish</option>
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
              <option value="Ahmedasa">Ahmedasa</option>
              <option value="hamthan">hamthan</option>
              <option value="Ravi">Ravi</option>
              <option value="riziziz">riziziz</option>
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
                    {activeStyle.status}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-indigo-100 text-indigo-800">
                    {activeStyle.order_number}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    Client: <strong>{activeStyle.client}</strong>
                  </span>
                </div>
                <h2 className="text-2xl font-black text-[#1e293b] tracking-tight">{activeStyle.style_name}</h2>
                <p className="text-xs font-semibold text-slate-600 mt-0.5">{activeStyle.article} &bull; Size: <strong className="text-[#4f46e5]">{activeStyle.size}</strong></p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Color</span>
                  <p className="text-xs font-bold text-slate-800">{activeStyle.color}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Total Pieces</span>
                  <p className="text-xs font-bold text-slate-800">{activeStyle.total_pieces} pcs</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Assigned</span>
                  <p className="text-xs font-bold text-slate-800">{activeStyle.assigned_pieces} pcs</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Target Date</span>
                  <p className="text-xs font-bold text-[#4f46e5]">{activeStyle.target_date}</p>
                </div>
              </div>
            </div>

            {/* Middle Col: Pacing & Target Timeline */}
            <div className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-2xl p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Stitching Stage Timeline</span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                  {activeStyle.target_date} Target
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 my-3">
                <div className="bg-[#f8fafc] p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-500">Stitching Completed</span>
                  <div className="text-lg font-black text-emerald-800">{activeStyle.completed_pieces} pcs</div>
                </div>
                <div className="bg-[#f8fafc] p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-500">Stitching Pending</span>
                  <div className="text-lg font-black text-amber-800">{activeStyle.pending_pieces} pcs</div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-600">Overall Stitching Progress</span>
                  <span className="text-[#4f46e5]">{activeStyle.progressPct}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#4f46e5] to-[#6366f1] h-full rounded-full transition-all duration-500"
                    style={{ width: `${activeStyle.progressPct}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Right Col: Active Bottleneck Detector */}
            <div className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-2xl p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Active Stage Bottlenecks</span>
                <span className="text-[11px] font-bold text-rose-600">Live Stage Alert</span>
              </div>

              <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl my-2">
                <div className="flex items-center gap-2 text-rose-800 font-extrabold text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Bottleneck at Fusing Stage</span>
                </div>
                <p className="text-[11px] text-rose-700 mt-1">
                  56 pieces pending at Fusing. Total received: 111 pcs vs 55 completed.
                </p>
              </div>

              <div className="flex justify-between text-xs font-semibold text-slate-600 pt-2 border-t border-slate-100">
                <span>Pre-Store Buffer: <strong>{STORE_HANDOFF_METRICS.in_drawer} in drawer</strong></span>
                <span>Ready QC: <strong className="text-emerald-700">{STITCHING_KPIS.ready_for_inspection} pc</strong></span>
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
                  {STITCHING_KPIS.assigned_pieces} Assigned
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-500">Total Stitching Order Pieces</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900">{STITCHING_KPIS.overall_pieces}</span>
                <span className="text-xs font-semibold text-slate-400">/ across styles</span>
              </div>
              <div className="mt-3 pt-3 border-t border-dashed border-slate-100 flex justify-between text-xs text-slate-600 font-semibold">
                <span>Completed: <strong className="text-emerald-600">{STITCHING_KPIS.overall_completed}</strong></span>
                <span>Pending: <strong className="text-amber-600">{STITCHING_KPIS.overall_pending}</strong></span>
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
                  5 Stages Active
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-500">Pasting & Fusing Output</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900">55 Pcs Pasted</span>
              </div>
              <div className="mt-3 pt-3 border-t border-dashed border-slate-100 flex justify-between text-xs text-slate-600 font-semibold">
                <span>Fusing Done: <strong>55 pcs</strong></span>
                <span>Fusing Pending: <strong className="text-rose-600">56 pcs</strong></span>
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
                <span className="text-2xl font-black text-slate-900">{STORE_HANDOFF_METRICS.in_drawer} in Drawer</span>
              </div>
              <div className="mt-3 pt-3 border-t border-dashed border-slate-100 flex justify-between text-xs text-slate-600 font-semibold">
                <span>Sent to Store: <strong>{STORE_HANDOFF_METRICS.sent_to_store}</strong></span>
                <span>Ready Stitching: <strong className="text-emerald-600">{STORE_HANDOFF_METRICS.ready_for_stitching}</strong></span>
              </div>
            </div>

            {/* KPI 4 */}
            <div
              onClick={() => setActiveTab('tab-damage')}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-lg">
                  ⚠️
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700">
                  Rework: {STITCHING_KPIS.rework_pieces}
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-500">Damage & Defect Tracking</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-rose-600">{STITCHING_KPIS.damage_pieces} Defects</span>
              </div>
              <div className="mt-3 pt-3 border-t border-dashed border-slate-100 flex justify-between text-xs text-slate-600 font-semibold">
                <span>Rework Queue: <strong className="text-purple-600">{STITCHING_KPIS.rework_pieces} pc</strong></span>
                <span>Ready Inspection: <strong className="text-emerald-600">{STITCHING_KPIS.ready_for_inspection}</strong></span>
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
                  <BarChart data={STITCHING_DAILY_LOGS}>
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
                  {STITCHING_DAILY_LOGS.map((log, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-[#f8fafc] border border-slate-100 text-xs">
                      <div>
                        <span className="font-bold text-slate-800">{log.date}</span>
                        <div className="text-[10px] text-slate-500 mt-0.5">{log.events} scan operations</div>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-indigo-700">{log.completed} done</span>
                        <div className="text-[10px] text-slate-500 font-semibold">Target: {log.target} pcs</div>
                      </div>
                    </div>
                  ))}
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
                <h3 className="text-base font-extrabold text-slate-900">5-Stage Stitching Production Pipeline & Bottleneck Identification</h3>
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
                  {STITCHING_STAGES_DATA.map((st, idx) => (
                    <tr
                      key={idx}
                      onClick={() => setSelectedStageDetail(st)}
                      className={`hover:bg-slate-50 cursor-pointer transition-all ${
                        selectedStageDetail?.stage === st.stage ? 'bg-indigo-50/50' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                        <span>🪡</span>
                        <span>{st.label}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">{st.section}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">{st.total_received} pcs</td>
                      <td className="py-3.5 px-4 text-right font-mono text-blue-700 font-semibold">{st.assigned_pieces} pcs</td>
                      <td className="py-3.5 px-4 text-right font-mono text-emerald-700 font-black">{st.completed_pieces} pcs</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold">
                        <span className={st.pending_pieces > 20 ? 'text-rose-600 font-black' : 'text-slate-800'}>
                          {st.pending_pieces} pcs
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono">{st.damage_pieces} / {st.rework_pieces}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                            st.pending_pieces > 20
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {st.status}
                        </span>
                      </td>
                    </tr>
                  ))}
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
                <BarChart data={STITCHING_STAGES_DATA}>
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 my-4">
              <div className="p-5 rounded-2xl bg-blue-50 border border-blue-200">
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Ready for Store</span>
                <div className="text-3xl font-black text-blue-900 mt-1">{STORE_HANDOFF_METRICS.ready_for_store} pcs</div>
                <p className="text-xs text-blue-600 mt-2">Pasted & Fused pieces awaiting store drawer transfer</p>
              </div>

              <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-200">
                <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Currently In Store Drawer</span>
                <div className="text-3xl font-black text-indigo-900 mt-1">{STORE_HANDOFF_METRICS.in_drawer} pcs</div>
                <p className="text-xs text-indigo-600 mt-2">Pieces resting in intermediate storage drawers</p>
              </div>

              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Dispatched to Stitching Line</span>
                <div className="text-3xl font-black text-emerald-900 mt-1">{STORE_HANDOFF_METRICS.ready_for_stitching} pcs</div>
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
                <p className="text-xs text-slate-500">Order progress, completion percentage across 5 stages, and deadline monitoring</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-[#f8fafc] text-slate-600 font-bold uppercase tracking-wider border-y border-slate-200">
                    <th className="py-3 px-4">Style Name</th>
                    <th className="py-3 px-4">Article</th>
                    <th className="py-3 px-4 text-right">Total Ordered</th>
                    <th className="py-3 px-4 text-right">Pasting %</th>
                    <th className="py-3 px-4 text-right">Fusing %</th>
                    <th className="py-3 px-4 text-right">Line Stitch %</th>
                    <th className="py-3 px-4 text-right">Shell Stitch %</th>
                    <th className="py-3 px-4 text-right">Finish %</th>
                    <th className="py-3 px-4">Target Date</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {STITCHING_STYLES_SUMMARY.map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-all">
                      <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                        <span>👗</span>
                        <span>{s.style_name}</span>
                      </td>
                      <td className="py-3.5 px-4">{s.article}</td>
                      <td className="py-3.5 px-4 text-right font-bold">{s.total_ordered} pcs</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-blue-700">{s.pasting_pct}%</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-700">{s.fusing_pct}%</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-purple-700">{s.line_stitch_pct}%</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-pink-700">{s.shell_stitch_pct}%</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700">{s.final_finish_pct}%</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">{s.target_date}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                            s.status === 'ON TRACK' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {s.status}
                        </span>
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
           TAB 5: EMPLOYEE MANAGEMENT BY STAGE
           ==================================================================== */}
      {activeTab === 'tab-employees' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full space-y-5"
        >
          <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {STITCHING_EMPLOYEES.map((emp, idx) => (
              <div
                key={idx}
                onClick={() => handleOpenEmployeeModal(emp)}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <img
                      src={emp.avatar}
                      alt={emp.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-[#4f46e5]"
                    />
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900">{emp.name}</h4>
                      <p className="text-xs text-slate-500">{emp.designation}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 text-indigo-800">
                        {emp.stage}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-semibold my-3">
                    <div className="bg-[#f8fafc] p-2.5 rounded-xl">
                      <span className="text-[10px] text-slate-500">Assigned Pieces</span>
                      <div className="text-base font-black text-slate-900">{emp.assigned_pieces} pcs</div>
                    </div>
                    <div className="bg-[#f8fafc] p-2.5 rounded-xl">
                      <span className="text-[10px] text-slate-500">Completed</span>
                      <div className="text-base font-black text-emerald-700">{emp.completed_pieces} pcs</div>
                    </div>
                    <div className="bg-[#f8fafc] p-2.5 rounded-xl">
                      <span className="text-[10px] text-slate-500">Achievement</span>
                      <div className="text-base font-black text-indigo-700">{emp.achievement_pct}%</div>
                    </div>
                    <div className="bg-[#f8fafc] p-2.5 rounded-xl">
                      <span className="text-[10px] text-slate-500">Defects / Rework</span>
                      <div className="text-base font-black text-rose-600">{emp.damage_pieces} / {emp.rework_pieces}</div>
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
                  View Operator Drawer
                </button>
              </div>
            ))}
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
                  {STITCHING_DEFECTS_LOG.map((d, idx) => (
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
                      data={STITCHING_STAGES_DATA}
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
                  <BarChart data={STITCHING_EMPLOYEES}>
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
                    {piecesList.slice(0, 15).map((p) => (
                      <option key={p.piece_code} value={p.piece_code}>
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
