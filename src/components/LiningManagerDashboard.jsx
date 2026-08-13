'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shirt,
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
  Scissors,
  ScissorsLineDashed,
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
import {
  LINING_PRODUCTION_KPIS,
  LINING_MATERIAL_KPIS,
  CURRENT_LINING_ORDER,
  LINING_STYLES_SUMMARY,
  LINING_LOTS_STOCK,
  LINING_EMPLOYEES,
  LINING_DAILY_PRODUCTION_LOGS,
  UPCOMING_LINING_PRODUCTION,
  RAW_LINING_PIECES_DATA,
  LINING_WASTE_BREAKDOWN,
} from '@/lib/liningData';

// Chart custom tooltip
function CustomTooltip({ active, payload, label, unit = 'MTRS / DCM' }) {
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

function LiningDashboardContent() {
  const searchParams = useSearchParams();

  // State
  const [activeTab, setActiveTab] = useState('tab-today');
  const [piecesList, setPiecesList] = useState(RAW_LINING_PIECES_DATA);
  const [activeOrder, setActiveOrder] = useState(CURRENT_LINING_ORDER);
  const [selectedStyleDetail, setSelectedStyleDetail] = useState(LINING_STYLES_SUMMARY[0]);

  // Sync tab from URL query params (from sidebar tree sub-branches)
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Modals state
  const [selectedPieceModal, setSelectedPieceModal] = useState(null);
  const [selectedEmployeeModal, setSelectedEmployeeModal] = useState(null);
  const [selectedLotModal, setSelectedLotModal] = useState(null);
  const [showLogDefectModal, setShowLogDefectModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Pagination for piece tracker
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Universal Filters
  const [filterDate, setFilterDate] = useState('all');
  const [filterOrder, setFilterOrder] = useState('all');
  const [filterStyle, setFilterStyle] = useState('all');
  const [filterLiningType, setFilterLiningType] = useState('all');
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSize, setFilterSize] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

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
    setFilterLiningType('all');
    setFilterEmployee('all');
    setFilterStatus('all');
    setFilterSize('all');
    setSearchQuery('');
    triggerToast('Lining filters reset to default view');
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
          p.lining_type.toLowerCase().includes(q) ||
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
      // Lining Type
      if (filterLiningType !== 'all' && p.lining_type !== filterLiningType) return false;
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
    filterLiningType,
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
  const handleSimulateLining = () => {
    const sampleEmployee = ['Ahmedasa', 'Ravi', 'hamthan', 'Farooq'][Math.floor(Math.random() * 4)];
    const sampleSize = ['S', 'M', 'L', 'XL', '50'][Math.floor(Math.random() * 5)];
    const seq = piecesList.length + 1;
    const newPiece = {
      piece_code: `ORD_1011-CARNABY-PINE_GREEN-${sampleSize}-${String(seq).padStart(3, '0')}`,
      seq,
      size: sampleSize,
      colour: 'PINE GREEN',
      style: 'CARNABY',
      current_stage: 'LINING_CUTTING',
      last_worked: '2026-08-13',
      employee: sampleEmployee,
      stage: 'LINING_CUTTING',
      actual_consumption: Number((11.5 + Math.random() * 1.0).toFixed(1)),
      expected_consumption: 12.0,
      variance: Number(((Math.random() * 0.6) - 0.3).toFixed(1)),
      waste_dcm: 0.3,
      lining_type: 'TAFFTA',
      lining_code: 'LIN-TAFF-BLK-01',
      order_number: 'ORD-1011',
      lot_number: 'LOT-LIN-TAFF-01',
      status: 'Lining Cut',
    };

    setPiecesList([newPiece, ...piecesList]);
    triggerToast(`⚡ Live Lining Logged: ${newPiece.piece_code} by ${sampleEmployee} (${newPiece.actual_consumption} DCM)`);
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
      'Lining Type',
      'Lining Code',
      'Operator',
      'Stage',
      'Expected Consumption',
      'Actual Consumption',
      'Variance',
      'Waste',
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
      p.lining_type,
      p.lining_code,
      p.employee,
      p.current_stage,
      p.expected_consumption,
      p.actual_consumption,
      p.variance,
      p.waste_dcm,
      p.status,
      p.last_worked,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Lining_Floor_Traceability_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('📥 Lining Traceability CSV Report Downloaded Successfully');
  };

  // Defect Log form submit
  const handleLogDefectSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const pieceCode = formData.get('pieceCode');
    const reason = formData.get('reason');
    const dcmLoss = parseFloat(formData.get('dcmLoss')) || 0.4;
    const reworkEmployee = formData.get('reworkEmployee');

    setPiecesList((prev) =>
      prev.map((p) =>
        p.piece_code === pieceCode
          ? {
              ...p,
              status: 'Damaged',
              damage_reason: reason,
              waste_dcm: dcmLoss,
              rework_cutter: reworkEmployee,
            }
          : p
      )
    );

    setShowLogDefectModal(false);
    triggerToast(`⚠️ Lining Defect Logged for ${pieceCode} &rarr; Sent to Rework (${reworkEmployee})`);
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
            <p className="text-xs text-[#64748b] font-medium">Lining Material Allocation, Piece Traceability &bull; Standard Units: <strong className="text-[#e11d48]">Meters & DCM</strong></p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={handleSimulateLining}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#e11d48] text-white text-xs font-bold hover:bg-[#be123c] transition-all shadow-sm hover:scale-[1.02]"
            title="Simulate live piece lining cut event on floor"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Live Lining Sim</span>
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
            title="Export complete piece and lining consumption report to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-slate-200 text-xs text-slate-500 font-semibold">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            <span>Floor Stream Active</span>
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
              Showing {filteredPieces.length} of {piecesList.length} Pieces
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
              placeholder="Search piece, style, lining, operator..."
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#e11d48]"
            />
          </div>

          {/* Date Filter */}
          <div>
            <select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#e11d48]"
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
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#e11d48]"
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
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#e11d48]"
            >
              <option value="all">👗 All Styles</option>
              <option value="CARNABY">CARNABY</option>
              <option value="FRANCIS KNIT">FRANCIS KNIT</option>
              <option value="CLERMONT + VEST">CLERMONT + VEST</option>
              <option value="ADELE KNIT">ADELE KNIT</option>
            </select>
          </div>

          {/* Lining Type Filter */}
          <div>
            <select
              value={filterLiningType}
              onChange={(e) => setFilterLiningType(e.target.value)}
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#e11d48]"
            >
              <option value="all">🧵 Lining Type</option>
              <option value="TAFFTA">TAFFTA</option>
              <option value="COTTON">COTTON</option>
              <option value="RIBS">RIBS</option>
              <option value="CUPRO">CUPRO</option>
            </select>
          </div>

          {/* Operator Filter */}
          <div>
            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#e11d48]"
            >
              <option value="all">👷 All Operators</option>
              <option value="Ahmedasa">Ahmedasa</option>
              <option value="hamthan">hamthan</option>
              <option value="Ravi">Ravi</option>
              <option value="Farooq">Farooq</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#e11d48]"
            >
              <option value="all">⚡ Status</option>
              <option value="Completed">Completed</option>
              <option value="Lining Cut">Lining Cut</option>
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
          { id: 'tab-inventory', label: '🧵 Lining Material Stock & Allocation' },
          { id: 'tab-styles', label: '👗 Per-Style Lining Consumption' },
          { id: 'tab-employees', label: '👷 Operator Performance' },
          { id: 'tab-pieces', label: '🏷️ Piece-Level Master Tracker' },
          { id: 'tab-damage', label: '⚠️ Damage & Rework Station' },
          { id: 'tab-upcoming', label: '⏳ Upcoming Pieces & Target Dates' },
          { id: 'tab-analytics', label: '📉 Loss & Waste Analytics' },
          { id: 'tab-flow', label: '🔄 Lining Flow & Traceability' },
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
           TAB 1: TODAY'S LINING PRIORITY
           ==================================================================== */}
      {activeTab === 'tab-today' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full space-y-5"
        >
          {/* CURRENT RUNNING ORDER HERO BANNER (Full Width Grid) */}
          <div className="w-full bg-gradient-to-br from-white via-[#f8fafc] to-[#fff1f2] border border-rose-200/70 rounded-3xl p-6 shadow-sm grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Col: Order Specs */}
            <div className="flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {activeOrder.status}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-rose-100 text-rose-800">
                    {activeOrder.order_number}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    Client: <strong>{activeOrder.client}</strong>
                  </span>
                </div>
                <h2 className="text-2xl font-black text-[#1e293b] tracking-tight">{activeOrder.article}</h2>
                <p className="text-xs font-semibold text-slate-600 mt-0.5">{activeOrder.styleName} &bull; Lining: <strong className="text-[#e11d48]">{activeOrder.liningType}</strong></p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Color</span>
                  <p className="text-xs font-bold text-slate-800">{activeOrder.color}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Lining Code</span>
                  <p className="text-xs font-bold text-slate-800">{activeOrder.liningCode}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Total Required</span>
                  <p className="text-xs font-bold text-slate-800">{LINING_PRODUCTION_KPIS.lining_required_pieces} pcs</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">End Date</span>
                  <p className="text-xs font-bold text-[#e11d48]">{activeOrder.deliveryDeadline}</p>
                </div>
              </div>
            </div>

            {/* Middle Col: Pacing & Target Timeline */}
            <div className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-2xl p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Timeline & Pacing</span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800">
                  {activeOrder.expectedCompletionDate} Expected
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 my-3">
                <div className="bg-[#f8fafc] p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-500">Assigned Lining Pcs</span>
                  <div className="text-lg font-black text-slate-900">{LINING_PRODUCTION_KPIS.assigned_pieces} pcs</div>
                </div>
                <div className="bg-[#f8fafc] p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-500">Daily Pacing Target</span>
                  <div className="text-lg font-black text-slate-900">{activeOrder.dailyTarget} pcs/day</div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-600">Lining Stage Completion</span>
                  <span className="text-[#e11d48]">{activeOrder.progressPct}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#e11d48] to-[#f43f5e] h-full rounded-full transition-all duration-500"
                    style={{ width: `${activeOrder.progressPct}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Right Col: Shift Breakdown */}
            <div className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-2xl p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Lining Shift Breakdown</span>
                <span className="text-[11px] font-bold text-slate-400">Live Stage</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 my-2">
                <div className="bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl">
                  <span className="text-[10px] font-bold text-emerald-700">Completed (Overall)</span>
                  <div className="text-lg font-black text-emerald-800">{LINING_PRODUCTION_KPIS.overall_completed} pcs</div>
                </div>
                <div className="bg-amber-50 border border-amber-100 p-2.5 rounded-xl">
                  <span className="text-[10px] font-bold text-amber-700">Pending Lining</span>
                  <div className="text-lg font-black text-amber-800">{LINING_PRODUCTION_KPIS.overall_pending} pcs</div>
                </div>
                <div className="bg-rose-50 border border-rose-100 p-2.5 rounded-xl">
                  <span className="text-[10px] font-bold text-rose-700">Damage Pieces</span>
                  <div className="text-lg font-black text-rose-800">{LINING_PRODUCTION_KPIS.damage_pieces} pcs</div>
                </div>
                <div className="bg-purple-50 border border-purple-100 p-2.5 rounded-xl">
                  <span className="text-[10px] font-bold text-purple-700">Rework Queue</span>
                  <div className="text-lg font-black text-purple-800">{LINING_PRODUCTION_KPIS.rework_pieces} pcs</div>
                </div>
              </div>
            </div>
          </div>

          {/* 4 TOP SUMMARY KPIS (MATERIAL & PRODUCTION) */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* KPI 1 */}
            <div
              onClick={() => setActiveTab('tab-pieces')}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-lg">
                  📦
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                  {LINING_PRODUCTION_KPIS.assigned_pieces} Active
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-500">Lining Required Pieces</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900">{LINING_PRODUCTION_KPIS.lining_required_pieces}</span>
                <span className="text-xs font-semibold text-slate-400">/ 12,417 total order</span>
              </div>
              <div className="mt-3 pt-3 border-t border-dashed border-slate-100 flex justify-between text-xs text-slate-600 font-semibold">
                <span>Completed: <strong className="text-emerald-600">{LINING_PRODUCTION_KPIS.overall_completed}</strong></span>
                <span>Pending: <strong className="text-amber-600">{LINING_PRODUCTION_KPIS.overall_pending}</strong></span>
              </div>
            </div>

            {/* KPI 2 */}
            <div
              onClick={() => setActiveTab('tab-inventory')}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
                  🧵
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700">
                  Stock Verified
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-500">Available Lining Stock</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900">{LINING_MATERIAL_KPIS.total_available_lining} MTRS</span>
              </div>
              <div className="mt-3 pt-3 border-t border-dashed border-slate-100 flex justify-between text-xs text-slate-600 font-semibold">
                <span>Used: <strong>{LINING_MATERIAL_KPIS.used_lining} MTRS</strong></span>
                <span>Remaining: <strong className="text-emerald-600">{LINING_MATERIAL_KPIS.remaining_lining} MTRS</strong></span>
              </div>
            </div>

            {/* KPI 3 */}
            <div
              onClick={() => setActiveTab('tab-styles')}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-lg">
                  👗
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                  Yield 98.4%
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-500">Avg Lining Consumption</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900">11.8 DCM</span>
                <span className="text-xs font-semibold text-slate-400">/ piece avg</span>
              </div>
              <div className="mt-3 pt-3 border-t border-dashed border-slate-100 flex justify-between text-xs text-slate-600 font-semibold">
                <span>BOM Target: <strong>12.0 DCM</strong></span>
                <span>Variance: <strong className="text-emerald-600">-0.2 DCM</strong></span>
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
                  Waste: 2.3%
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-500">Damage & Rework Status</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-rose-600">{LINING_PRODUCTION_KPIS.damage_pieces} Defects</span>
              </div>
              <div className="mt-3 pt-3 border-t border-dashed border-slate-100 flex justify-between text-xs text-slate-600 font-semibold">
                <span>Rework Queue: <strong className="text-purple-600">{LINING_PRODUCTION_KPIS.rework_pieces} pc</strong></span>
                <span>Waste Loss: <strong className="text-rose-600">42.5 MTRS</strong></span>
              </div>
            </div>
          </div>

          {/* DAILY PRODUCTION CADENCE CHART & LOG */}
          <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Chart */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Daily Lining Production & Material Used</h3>
                  <p className="text-xs text-slate-500">Completed pieces and material throughput across dates</p>
                </div>
              </div>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={LINING_DAILY_PRODUCTION_LOGS}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="work_date" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip content={<CustomTooltip unit="pcs / MTRS" />} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                    <Bar dataKey="completed" name="Completed Pieces" fill="#e11d48" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="assigned" name="Assigned Pieces" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                    <Line type="monotone" dataKey="target" name="Daily Target" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Log Table */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 mb-1">Production & Material History</h3>
                <p className="text-xs text-slate-500 mb-3">Shift-wise lining logs</p>
                
                <div className="overflow-y-auto max-h-[250px] space-y-2 pr-1">
                  {LINING_DAILY_PRODUCTION_LOGS.map((log, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-[#f8fafc] border border-slate-100 text-xs">
                      <div>
                        <span className="font-bold text-slate-800">{log.date}</span>
                        <div className="text-[10px] text-slate-500 mt-0.5">{log.events} scan events</div>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-rose-700">{log.completed} done</span>
                        <div className="text-[10px] text-slate-500 font-semibold">{log.used_lining} MTRS used</div>
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
           TAB 2: LINING MATERIAL STOCK & ALLOCATION
           ==================================================================== */}
      {activeTab === 'tab-inventory' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full space-y-5"
        >
          <div className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Available Lining Material Inventory & Lot Allocation</h3>
                <p className="text-xs text-slate-500">Lining rolls, allocation by type (Cotton, Taffeta, Cupro, Ribs), and consumption</p>
              </div>
              <span className="text-xs font-bold text-slate-500">
                Total Stock Available: <strong className="text-slate-900">1,825.8 MTRS</strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-[#f8fafc] text-slate-600 font-bold uppercase tracking-wider border-y border-slate-200">
                    <th className="py-3 px-4">Lot Code</th>
                    <th className="py-3 px-4">Lining Type</th>
                    <th className="py-3 px-4">Article</th>
                    <th className="py-3 px-4">Color</th>
                    <th className="py-3 px-4">Thickness</th>
                    <th className="py-3 px-4 text-right">Available</th>
                    <th className="py-3 px-4 text-right">Allocated</th>
                    <th className="py-3 px-4 text-right">Used</th>
                    <th className="py-3 px-4 text-right">Remaining</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {LINING_LOTS_STOCK.map((lot, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-all">
                      <td className="py-3.5 px-4 font-mono font-bold text-rose-600">{lot.lot_number}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{lot.lining_type}</td>
                      <td className="py-3.5 px-4">{lot.article}</td>
                      <td className="py-3.5 px-4">{lot.colour}</td>
                      <td className="py-3.5 px-4 font-mono">{lot.thickness}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">{lot.available} {lot.uom}</td>
                      <td className="py-3.5 px-4 text-right font-mono text-blue-700 font-semibold">{lot.allocated} {lot.uom}</td>
                      <td className="py-3.5 px-4 text-right font-mono text-purple-700 font-bold">{lot.used} {lot.uom}</td>
                      <td className="py-3.5 px-4 text-right font-mono text-emerald-700 font-black">{lot.remaining} {lot.uom}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                          {lot.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => setSelectedLotModal(lot)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#e11d48] hover:text-white text-slate-700 text-[11px] font-bold transition-all"
                        >
                          View Roll Trace
                        </button>
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
           TAB 3: PER-STYLE LINING CONSUMPTION
           ==================================================================== */}
      {activeTab === 'tab-styles' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full space-y-5"
        >
          <div className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Per-Style / Article Lining Consumption & BOM Matrix</h3>
                <p className="text-xs text-slate-500">Lining material target BOM vs actual average consumption across styles</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-[#f8fafc] text-slate-600 font-bold uppercase tracking-wider border-y border-slate-200">
                    <th className="py-3 px-4">Style Name</th>
                    <th className="py-3 px-4">Article</th>
                    <th className="py-3 px-4">Lining Type</th>
                    <th className="py-3 px-4">Lot #</th>
                    <th className="py-3 px-4 text-right">Target BOM</th>
                    <th className="py-3 px-4 text-right">Actual Avg</th>
                    <th className="py-3 px-4 text-right">Variance</th>
                    <th className="py-3 px-4 text-right">Ordered / Minted</th>
                    <th className="py-3 px-4 text-right">Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {LINING_STYLES_SUMMARY.map((s, idx) => (
                    <tr
                      key={idx}
                      onClick={() => setSelectedStyleDetail(s)}
                      className={`hover:bg-slate-50 cursor-pointer transition-all ${
                        selectedStyleDetail?.style_name === s.style_name ? 'bg-rose-50/50' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                        <span>👗</span>
                        <span>{s.style_name}</span>
                      </td>
                      <td className="py-3.5 px-4">{s.article}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">{s.lining_type}</td>
                      <td className="py-3.5 px-4 font-mono text-rose-600">{s.lot_number}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800">{s.target_bom_dcm.toFixed(1)} DCM</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-[#e11d48]">{s.actual_avg_dcm.toFixed(1)} DCM</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold">
                        <span className={s.variance_dcm <= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {s.variance_dcm > 0 ? `+${s.variance_dcm.toFixed(1)}` : s.variance_dcm.toFixed(1)} DCM
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">{s.total_ordered} pcs</td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-600">{s.completed} pcs</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Style Comparison Chart */}
          <div className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-extrabold text-slate-900 mb-1">Style Lining BOM (Target vs Actual Consumed)</h3>
            <p className="text-xs text-slate-500 mb-4">Target vs actual lining consumption per jacket model</p>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={LINING_STYLES_SUMMARY}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="style_name" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip content={<CustomTooltip unit="DCM/pc" />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Bar dataKey="target_bom_dcm" name="Target BOM (DCM/pc)" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="actual_avg_dcm" name="Actual Consumed (DCM/pc)" fill="#e11d48" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      )}

      {/* ====================================================================
           TAB 4: LINING OPERATORS & PERFORMANCE
           ==================================================================== */}
      {activeTab === 'tab-employees' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full space-y-5"
        >
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-5">
            {LINING_EMPLOYEES.map((emp, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedEmployeeModal(emp)}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <img
                      src={emp.avatar}
                      alt={emp.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-[#e11d48]"
                    />
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900">{emp.name}</h4>
                      <p className="text-xs text-slate-500">{emp.role}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-800">
                        {emp.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-semibold my-3">
                    <div className="bg-[#f8fafc] p-2.5 rounded-xl">
                      <span className="text-[10px] text-slate-500">Assigned Pieces</span>
                      <div className="text-base font-black text-slate-900">{emp.assigned_pieces} pcs</div>
                    </div>
                    <div className="bg-[#f8fafc] p-2.5 rounded-xl">
                      <span className="text-[10px] text-slate-500">Lining Used</span>
                      <div className="text-base font-black text-[#e11d48]">{emp.used_lining} MTRS</div>
                    </div>
                    <div className="bg-[#f8fafc] p-2.5 rounded-xl">
                      <span className="text-[10px] text-slate-500">Efficiency</span>
                      <div className="text-base font-black text-emerald-700">{emp.efficiencyPct}%</div>
                    </div>
                    <div className="bg-[#f8fafc] p-2.5 rounded-xl">
                      <span className="text-[10px] text-slate-500">Defects / Rework</span>
                      <div className="text-base font-black text-rose-600">{emp.damage_pieces} / {emp.reworkCount}</div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEmployeeModal(emp);
                  }}
                  className="w-full mt-2 py-2 rounded-xl bg-slate-100 hover:bg-[#1e293b] hover:text-white text-slate-800 text-xs font-bold transition-all"
                >
                  View Lined Pieces & Drawer
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ====================================================================
           TAB 5: PIECE-LEVEL MASTER TRACKER
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
                <h3 className="text-base font-extrabold text-slate-900">Piece-Level Master Lining Traceability Tracker</h3>
                <p className="text-xs text-slate-500">Individual jacket serial tracking with exact lining material consumption and stage lifecycle</p>
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
                    <th className="py-3 px-4">Lining Type</th>
                    <th className="py-3 px-4">Operator</th>
                    <th className="py-3 px-4">Current Stage</th>
                    <th className="py-3 px-4 text-right">Consumption</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Inspector</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {paginatedPieces.map((p, idx) => (
                    <tr
                      key={idx}
                      onClick={() => setSelectedPieceModal(p)}
                      className="hover:bg-slate-50 cursor-pointer transition-all"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{p.piece_code}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">{p.order_number}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">{p.style}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-700">{p.size}</td>
                      <td className="py-3.5 px-4 font-semibold text-rose-700">{p.lining_type}</td>
                      <td className="py-3.5 px-4 text-slate-800">{p.employee}</td>
                      <td className="py-3.5 px-4 font-bold text-blue-700">{p.current_stage}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-[#e11d48]">
                        {p.actual_consumption} DCM
                      </td>
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
                            setSelectedPieceModal(p);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#e11d48] hover:text-white text-slate-700 text-[11px] font-bold transition-all"
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
           TAB 6: DAMAGE & REWORK STATION
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
                <h3 className="text-base font-extrabold text-slate-900">Lining Damage, Defect & Rework Station</h3>
                <p className="text-xs text-slate-500">Defects categorized by reason, affected lining area, and assigned rework operator</p>
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
                    <th className="py-3 px-4">Lining Type</th>
                    <th className="py-3 px-4">Operator Responsible</th>
                    <th className="py-3 px-4">Defect Reason</th>
                    <th className="py-3 px-4 text-right">Lining Loss</th>
                    <th className="py-3 px-4">Rework Operator</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {piecesList
                    .filter((p) => p.status === 'Damaged' || p.status === 'Rework')
                    .map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-all">
                        <td className="py-3.5 px-4 font-mono font-bold text-rose-600">{p.piece_code}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">{p.style}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-700">{p.lining_type}</td>
                        <td className="py-3.5 px-4 text-slate-800">{p.employee}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-700">{p.damage_reason || 'Seam fraying on curve'}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-600">{p.waste_dcm || 0.4} DCM</td>
                        <td className="py-3.5 px-4 text-rose-700 font-bold">{p.rework_cutter || 'hamthan'}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800">
                            {p.status}
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
           TAB 7: UPCOMING PIECES & TARGET DATES
           ==================================================================== */}
      {activeTab === 'tab-upcoming' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full space-y-5"
        >
          <div className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Upcoming Pieces & Cutting-to-Lining Pipeline</h3>
                <p className="text-xs text-slate-500">Pieces completing cutting stage and queued for lining material allocation</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-[#f8fafc] text-slate-600 font-bold uppercase tracking-wider border-y border-slate-200">
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-4">Style</th>
                    <th className="py-3 px-4">Article</th>
                    <th className="py-3 px-4">Color</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4 text-right">Expected Qty</th>
                    <th className="py-3 px-4">Target Date</th>
                    <th className="py-3 px-4">Cutting Status</th>
                    <th className="py-3 px-4">Lining Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {UPCOMING_LINING_PRODUCTION.map((up, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-all">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{up.order_number}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{up.style_name}</td>
                      <td className="py-3.5 px-4">{up.article}</td>
                      <td className="py-3.5 px-4">{up.colour}</td>
                      <td className="py-3.5 px-4 font-bold">{up.size}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">{up.expected_qty} pcs</td>
                      <td className="py-3.5 px-4 font-semibold text-blue-700">{up.target_date}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                          {up.cutting_status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800">
                          {up.lining_status}
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
           TAB 8: LOSS, WASTE & ANALYTICS
           ==================================================================== */}
      {activeTab === 'tab-analytics' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full space-y-5"
        >
          <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Waste Breakdown Pie */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-extrabold text-slate-900 mb-1">Lining Waste Loss Breakdown</h3>
              <p className="text-xs text-slate-500 mb-4">Curved pattern trimmings, offcuts, and defect losses</p>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={LINING_WASTE_BREAKDOWN}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      innerRadius={50}
                      paddingAngle={4}
                    >
                      {LINING_WASTE_BREAKDOWN.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip unit="MTRS" />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Operator Comparison */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-extrabold text-slate-900 mb-1">Operator Output & Lining Consumed</h3>
              <p className="text-xs text-slate-500 mb-4">Throughput comparison across lining floor specialists</p>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={LINING_EMPLOYEES}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip content={<CustomTooltip unit="MTRS / pcs" />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="assigned_pieces" name="Assigned Pieces" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="used_lining" name="Lining Used (MTRS)" fill="#e11d48" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ====================================================================
           TAB 9: LINING FLOW & TRACEABILITY
           ==================================================================== */}
      {activeTab === 'tab-flow' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6"
        >
          <div>
            <h3 className="text-base font-extrabold text-slate-900">End-to-End Lining Floor Traceability Architecture</h3>
            <p className="text-xs text-slate-500">Order &rarr; Style &rarr; Lining Material Lot &rarr; Operator &rarr; Piece &rarr; Consumption &rarr; Stitching Handover</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            {[
              { title: '1. Order Intake', desc: 'is1234 / ORD-1011', icon: '📦', color: 'bg-rose-50 text-rose-700' },
              { title: '2. Style BOM Specs', desc: 'CARNABY (12.0 DCM)', icon: '👗', color: 'bg-purple-50 text-purple-700' },
              { title: '3. Lining Roll Stock', desc: 'LOT-LIN-TAFF-01', icon: '🧵', color: 'bg-blue-50 text-blue-700' },
              { title: '4. Precision Lining Cut', desc: 'Ahmedasa / hamthan', icon: '✂️', color: 'bg-amber-50 text-amber-700' },
              { title: '5. Piece Serial Scan', desc: 'IS1234-...-001', icon: '🏷️', color: 'bg-cyan-50 text-cyan-700' },
              { title: '6. Stitching Ready', desc: 'Lining Completed', icon: '✅', color: 'bg-emerald-50 text-emerald-700' },
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
           MODAL 1: PIECE SERIAL INSPECTOR (8-STAGE STEPPER)
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
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Lining Piece Serial Inspector</span>
                  <h3 className="text-base font-mono font-black text-slate-900">{selectedPieceModal.piece_code}</h3>
                </div>
                <button
                  onClick={() => setSelectedPieceModal(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 8-Stage Lifecycle Stepper */}
              <div>
                <span className="text-xs font-bold text-slate-600 block mb-2">Factory 8-Stage Build Progression:</span>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 text-center">
                  {[
                    'Raw Hide',
                    'Leather Cut',
                    'Lining Lot',
                    'Lining Cut',
                    'Fusing',
                    'Pasting',
                    'Stitching',
                    'Finished',
                  ].map((stageName, idx) => {
                    const isDone = idx < 4;
                    const isCurrent = idx === 3;
                    return (
                      <div key={idx} className="flex flex-col items-center">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                            isDone
                              ? 'bg-emerald-500 text-white'
                              : isCurrent
                              ? 'bg-rose-600 text-white ring-4 ring-rose-100'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {isDone ? '✓' : idx + 1}
                        </div>
                        <span className="text-[9px] font-bold text-slate-600 mt-1 leading-tight">{stageName}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Lining Consumption Box */}
              <div className="grid grid-cols-3 gap-3 p-4 bg-[#f8fafc] rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Actual Consumed</span>
                  <p className="text-base font-mono font-black text-[#e11d48]">{selectedPieceModal.actual_consumption} DCM</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Expected BOM</span>
                  <p className="text-base font-mono font-black text-slate-800">{selectedPieceModal.expected_consumption || 12.0} DCM</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Variance</span>
                  <p className="text-base font-mono font-black text-emerald-600">{selectedPieceModal.variance || 0.0} DCM</p>
                </div>
              </div>

              {/* Meta details */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-xs font-semibold space-y-0.5">
                  <p>Order: <strong>{selectedPieceModal.order_number}</strong> &bull; Style: <strong>{selectedPieceModal.style}</strong></p>
                  <p>Operator: <strong>{selectedPieceModal.employee}</strong> &bull; Lining: <strong>{selectedPieceModal.lining_type} ({selectedPieceModal.lining_code})</strong></p>
                </div>
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono font-bold">
                  <QrCode className="w-4 h-4 text-slate-600" />
                  <span>LINING-QC-PASS</span>
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
                    className="w-10 h-10 rounded-full object-cover border-2 border-[#e11d48]"
                  />
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">{selectedEmployeeModal.name}</h3>
                    <p className="text-xs text-slate-500">{selectedEmployeeModal.role} &bull; Assigned: {selectedEmployeeModal.assigned_pieces} pcs</p>
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
                      <th className="py-2.5 px-3">Lining Type</th>
                      <th className="py-2.5 px-3 text-right">Actual Consumed</th>
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
                          <td className="py-2 px-3 font-semibold text-rose-700">{p.lining_type}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-[#e11d48]">{p.actual_consumption} DCM</td>
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
           MODAL 3: LOT SPECIFICATION MODAL
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
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Lining Roll & Lot Spec</span>
                  <h3 className="text-base font-mono font-extrabold text-rose-600">{selectedLotModal.lot_number}</h3>
                </div>
                <button
                  onClick={() => setSelectedLotModal(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs font-semibold">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Lining Article:</span>
                  <span className="text-slate-900">{selectedLotModal.article}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Lining Type:</span>
                  <span className="text-slate-900">{selectedLotModal.lining_type}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Color:</span>
                  <span className="text-slate-900">{selectedLotModal.colour}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Thickness:</span>
                  <span className="text-slate-900">{selectedLotModal.thickness}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Supplier:</span>
                  <span className="text-slate-900">{selectedLotModal.supplier}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Total Stock Available:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedLotModal.available} {selectedLotModal.uom}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Remaining Inventory:</span>
                  <span className="font-mono font-bold text-emerald-600">{selectedLotModal.remaining} {selectedLotModal.uom}</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ====================================================================
           MODAL 4: LOG DEFECT MODAL
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
                  <h3 className="text-sm font-extrabold text-slate-900">Log Lining Defect / Damage</h3>
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
                  <label className="block text-slate-700 mb-1">Defect Reason</label>
                  <select
                    name="reason"
                    required
                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  >
                    <option value="Seam fraying on curved armhole">Seam fraying on curved armhole</option>
                    <option value="Tension puckering during lining cut">Tension puckering during lining cut</option>
                    <option value="Needle puncture tear">Needle puncture tear</option>
                    <option value="Selvedge misalignment">Selvedge misalignment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">Damaged Lining Loss (DCM)</label>
                  <input
                    type="number"
                    step="0.1"
                    name="dcmLoss"
                    defaultValue="0.4"
                    required
                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">Assign Rework Operator</label>
                  <select
                    name="reworkEmployee"
                    required
                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  >
                    <option value="hamthan">hamthan (Lining Supervisor)</option>
                    <option value="Ahmedasa">Ahmedasa (Senior Lining Master)</option>
                    <option value="Ravi">Ravi (Assembly Specialist)</option>
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
      <LiningDashboardContent />
    </Suspense>
  );
}
