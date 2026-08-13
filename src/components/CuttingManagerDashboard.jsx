'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scissors,
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
  apiGetCuttingDashboard,
  apiGetCuttingEmployeeDetail,
  apiGetCuttingConsumption,
} from '@/lib/api';

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

function DashboardInner() {
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const { orders: contextOrders } = useData();

  // State
  const [activeTab, setActiveTab] = useState('tab-today');
  const [piecesList, setPiecesList] = useState([]);
  const [ordersList, setOrdersList] = useState(contextOrders || []);
  const [activeOrder, setActiveOrder] = useState(contextOrders?.[0] || null);
  const [kpis, setKpis] = useState(null);
  const [orderProgress, setOrderProgress] = useState([]);
  const [stylesList, setStylesList] = useState([]);
  const [selectedStyleDetail, setSelectedStyleDetail] = useState(null);
  const [cuttersList, setCuttersList] = useState([]);
  const [lotsList, setLotsList] = useState([]);
  const [consumptionLogs, setConsumptionLogs] = useState([]);
  const [wasteData, setWasteData] = useState([]);

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  // Sync context orders when available
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
  const [filterLot, setFilterLot] = useState('all');
  const [filterCutter, setFilterCutter] = useState('all');
  const [filterThickness, setFilterThickness] = useState('all');
  const [filterColor, setFilterColor] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSize, setFilterSize] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [selectedPieceModal, setSelectedPieceModal] = useState(null);
  const [selectedCutterModal, setSelectedCutterModal] = useState(null);
  const [selectedLotModal, setSelectedLotModal] = useState(null);
  const [showLogDefectModal, setShowLogDefectModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Pagination for piece tracker
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Sync tab from URL query params (when clicked from sidebar sub-branch)
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

  const availableLots = useMemo(() => {
    const set = new Set();
    lotsList.forEach((l) => set.add(l.lot_number || l.lot_id));
    piecesList.forEach((p) => { if (p.lot_number) set.add(p.lot_number); });
    return Array.from(set).filter(Boolean);
  }, [lotsList, piecesList]);

  const availableCutters = useMemo(() => {
    const map = new Map();
    cuttersList.forEach((c) => {
      const name = c.name;
      if (name) map.set(name, { id: c.id || c.employee_id || name, name });
    });
    piecesList.forEach((p) => {
      if (p.employee && !map.has(p.employee)) map.set(p.employee, { id: p.employee, name: p.employee });
    });
    return Array.from(map.values());
  }, [cuttersList, piecesList]);

  const availableDates = useMemo(() => {
    const set = new Set();
    piecesList.forEach((p) => { if (p.last_worked) set.add(p.last_worked); });
    consumptionLogs.forEach((l) => { if (l.work_date || l.date) set.add(l.work_date || l.date); });
    return Array.from(set).filter(Boolean);
  }, [piecesList, consumptionLogs]);

  const availableStatuses = useMemo(() => {
    const set = new Set();
    piecesList.forEach((p) => { if (p.status) set.add(p.status); });
    return Array.from(set).filter(Boolean);
  }, [piecesList]);

  const availableSizes = useMemo(() => {
    const set = new Set();
    piecesList.forEach((p) => { if (p.size) set.add(p.size); });
    if (activeOrder && activeOrder.styles) {
      activeOrder.styles.forEach(s => {
        if (s.size) set.add(s.size);
        if (s.skus) s.skus.forEach(sku => set.add(sku.size));
      });
    }
    return Array.from(set).filter(Boolean).sort();
  }, [piecesList, activeOrder]);

  // Display Order mapper with safe fallbacks
  const displayOrder = useMemo(() => {
    const isStyleFiltered = filterStyle !== 'all';
    const firstProg = (isStyleFiltered ? orderProgress?.find(s => s.name === filterStyle || s.style_name === filterStyle) : orderProgress?.[0]) || orderProgress?.[0];
    const totalQty = isStyleFiltered ? (firstProg?.total_ordered || firstProg?.pieces || 0) : (kpis?.overall_pieces || firstProg?.total_ordered || activeOrder?.totalPieces || piecesList.length || 0);
    const completedCount = isStyleFiltered ? (firstProg?.completed_pieces || firstProg?.completed || 0) : (kpis?.overall_completed || firstProg?.completed || piecesList.filter((p) => p.status === 'Completed').length);
    const pendingCount = isStyleFiltered ? Math.max(0, totalQty - completedCount) : (kpis?.overall_pending !== undefined ? kpis.overall_pending : Math.max(0, totalQty - completedCount));
    const progressPercent = totalQty ? Math.min(100, Math.round((completedCount / totalQty) * 100)) : 0;

    const firstStyle = isStyleFiltered ? (activeOrder?.styles?.find(s => s.name === filterStyle) || {}) : (activeOrder?.styles?.[0] || {});
    return {
      order_number: firstProg?.order_number || activeOrder?.order_number || activeOrder?.id || '—',
      status: activeOrder?.status || 'In Production',
      id: firstProg?.order_number || activeOrder?.order_number || activeOrder?.id || '—',
      client: activeOrder?.client || activeOrder?.client_name || '—',
      article: firstProg?.article || firstStyle.article || activeOrder?.article || '—',
      styleName: isStyleFiltered ? filterStyle : (firstProg?.style_name || firstStyle.name || activeOrder?.styleName || '—'),
      targetBomDcm: activeOrder?.targetBomDcm || 12.5,
      color: firstStyle.skus?.[0]?.color_name || firstStyle.color || activeOrder?.color || '—',
      thickness: firstStyle.thickness || activeOrder?.thickness || '0.8-1.0 mm',
      totalPieces: totalQty,
      lotNumber: activeOrder?.lotNumber || '—',
      expectedCompletionDate: firstProg?.delivery_deadline || firstProg?.target_date || activeOrder?.delivery_deadline || activeOrder?.expectedCompletionDate || '—',
      avgDailyProduction: activeOrder?.avgDailyProduction || 38,
      requiredDailyProduction: activeOrder?.requiredDailyProduction || 30,
      progressPct: progressPercent,
      completedPieces: completedCount,
      pendingPieces: pendingCount,
      damagePieces: isStyleFiltered ? piecesList.filter(p => (p.style === filterStyle || p.style_name === filterStyle) && p.status === 'Damaged').length : (kpis?.damage_pieces || piecesList.filter((p) => p.status === 'Damaged').length || 0),
      reworkPieces: isStyleFiltered ? piecesList.filter(p => (p.style === filterStyle || p.style_name === filterStyle) && p.status === 'Rework').length : (kpis?.rework_pieces || piecesList.filter((p) => p.status === 'Rework').length || 0),
    };
  }, [activeOrder, orderProgress, kpis, piecesList, filterStyle]);

  // LIVE BACKEND CALL: /api/v1/dashboard/cutting
  useEffect(() => {
    let isMounted = true;
    async function fetchCuttingDashboard() {
      if (!token) return;
      try {
        setLoading(true);
        setApiError(null);
        const params = {};
        if (filterOrder && filterOrder !== 'all') {
          params.order_id = filterOrder;
        }
        const data = await apiGetCuttingDashboard(token, params);
        if (isMounted && data) {
          setKpis(data.kpis || null);
          setPiecesList(Array.isArray(data.pieces) ? data.pieces : []);
          if (data.orders && Array.isArray(data.orders)) {
            setOrdersList(data.orders);
            if (data.orders.length > 0 && !activeOrder) setActiveOrder(data.orders[0]);
          }
          setOrderProgress(Array.isArray(data.order_progress) ? data.order_progress : []);
          setStylesList(Array.isArray(data.styles) ? data.styles : (Array.isArray(data.order_progress) ? data.order_progress : []));
          setCuttersList(Array.isArray(data.cutters) ? data.cutters : (Array.isArray(data.employees) ? data.employees : []));
          setLotsList(Array.isArray(data.lots) ? data.lots : []);
          setConsumptionLogs(Array.isArray(data.daily_production) ? data.daily_production : (Array.isArray(data.daily_logs) ? data.daily_logs : []));
          setWasteData(Array.isArray(data.waste_breakdown) ? data.waste_breakdown : []);
        }
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

  // LIVE BACKEND CALL: /api/v1/dashboard/cutting/consumption
  useEffect(() => {
    let isMounted = true;
    async function fetchCuttingConsumption() {
      if (!token) return;
      if (activeTab !== 'tab-analytics' && activeTab !== 'tab-styles') return;
      try {
        const params = {};
        if (filterOrder && filterOrder !== 'all') params.order_id = filterOrder;
        if (filterCutter && filterCutter !== 'all') params.employee_id = filterCutter;
        const data = await apiGetCuttingConsumption(token, params);
        if (isMounted && data) {
          if (data.daily_logs) setConsumptionLogs(data.daily_logs);
          if (data.waste_breakdown) setWasteData(data.waste_breakdown);
        }
      } catch (err) {
        console.warn('Backend API /api/v1/dashboard/cutting/consumption notice:', err.message);
      }
    }
    fetchCuttingConsumption();
    return () => { isMounted = false; };
  }, [token, activeTab, filterOrder, filterCutter]);

  // Handler to inspect cutter and call /api/v1/dashboard/cutting/employees/{employee_id}
  const handleOpenCutterModal = async (cutter) => {
    setSelectedCutterModal(cutter);
    if (!token || !cutter?.employee_id) return;
    try {
      const detail = await apiGetCuttingEmployeeDetail(token, cutter.employee_id);
      if (detail) {
        setSelectedCutterModal((prev) => ({ ...prev, ...detail }));
      }
    } catch (err) {
      console.warn(`Backend API /api/v1/dashboard/cutting/employees/${cutter.employee_id} notice:`, err.message);
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
    setFilterThickness('all');
    setFilterColor('all');
    setFilterStatus('all');
    setFilterSize('all');
    setSearchQuery('');
    triggerToast('Filters reset to default view');
  };

  // Filtered pieces computed
  const filteredPieces = useMemo(() => {
    const selectedOrderObj = filterOrder !== 'all' ? ordersList.find((o) => o.id === filterOrder || o.order_number === filterOrder) : null;
    return piecesList.filter((p) => {
      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesQuery =
          (p.piece_code && p.piece_code.toLowerCase().includes(q)) ||
          (p.style && p.style.toLowerCase().includes(q)) ||
          (p.employee && p.employee.toLowerCase().includes(q)) ||
          (p.order_number && p.order_number.toLowerCase().includes(q)) ||
          (p.lot_number && p.lot_number.toLowerCase().includes(q)) ||
          (p.colour && p.colour.toLowerCase().includes(q));
        if (!matchesQuery) return false;
      }
      // Date
      if (filterDate !== 'all' && p.last_worked !== filterDate) return false;
      // Order
      if (filterOrder !== 'all') {
        const matchesOrder = p.order_id === filterOrder || p.order_number === filterOrder || (selectedOrderObj && (p.order_number === selectedOrderObj.order_number || p.order_id === selectedOrderObj.id));
        if (!matchesOrder) return false;
      }
      // Style
      if (filterStyle !== 'all' && p.style !== filterStyle) return false;
      // Lot
      if (filterLot !== 'all' && p.lot_number !== filterLot) return false;
      // Cutter
      if (filterCutter !== 'all' && p.employee !== filterCutter) return false;
      // Thickness
      if (filterThickness !== 'all' && p.thickness !== filterThickness) return false;
      // Color
      if (filterColor !== 'all' && p.colour !== filterColor) return false;
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
    filterLot,
    filterCutter,
    filterThickness,
    filterColor,
    filterStatus,
    filterSize,
  ]);

  // Paginated pieces
  const paginatedPieces = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPieces.slice(start, start + pageSize);
  }, [filteredPieces, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredPieces.length / pageSize) || 1;

  // Filtered lists for other tabs
  const filteredStylesList = useMemo(() => {
    return stylesList.filter((s) => {
      if (filterStyle !== 'all') {
        const sName = s.style_name || s.name || s.style;
        if (sName !== filterStyle) return false;
      }
      return true;
    });
  }, [stylesList, filterStyle]);

  const filteredCuttersList = useMemo(() => {
    return cuttersList.filter((c) => {
      if (filterCutter !== 'all' && c.name !== filterCutter) return false;
      return true;
    });
  }, [cuttersList, filterCutter]);

  const filteredConsumptionLogs = useMemo(() => {
    return consumptionLogs.filter((l) => {
      if (filterDate !== 'all') {
        const lDate = l.work_date || l.date;
        if (lDate !== filterDate) return false;
      }
      return true;
    });
  }, [consumptionLogs, filterDate]);

  // Real-time Simulation action
  const handleSimulateCut = () => {
    const sampleCutter = ['Ahmedasa', 'Ravi', 'hamthan'][Math.floor(Math.random() * 3)];
    const sampleSize = ['S', 'M', 'L', 'XL'][Math.floor(Math.random() * 4)];
    const seq = piecesList.length + 1;
    const newPiece = {
      piece_code: `ORD_1011-CARNABY-PINE_GREEN-${sampleSize}-${String(seq).padStart(3, '0')}`,
      seq,
      size: sampleSize,
      colour: 'PINE GREEN',
      style: 'CARNABY',
      current_stage: 'CUTTING',
      last_worked: new Date().toISOString().slice(0, 10),
      employee: sampleCutter,
      stage: 'CUTTING',
      actual_consumption: Number((11.5 + Math.random() * 1.5).toFixed(1)),
      expected_consumption: 12.0,
      variance: Number(((Math.random() * 0.8) - 0.4).toFixed(1)),
      waste_dcm: 0.4,
      leather_article: 'GOAT SUEDE',
      thickness: '0.8-1.0',
      order_number: activeOrder?.order_number || 'ORD-1011',
      lot_number: 'LOT-SUEDE-01',
      status: 'Completed',
    };

    setPiecesList([newPiece, ...piecesList]);
    triggerToast(`⚡ Live Cut Logged: ${newPiece.piece_code} by ${sampleCutter} (${newPiece.actual_consumption} DCM)`);
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
      'Leather Article',
      'Thickness',
      'Lot #',
      'Cutter',
      'Stage',
      'Expected DCM',
      'Actual DCM',
      'Variance DCM',
      'Waste DCM',
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
      p.leather_article,
      p.thickness,
      p.lot_number,
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
    link.setAttribute('download', `Cutting_Floor_Traceability_DCM_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('📥 Cutting Traceability CSV Report Downloaded Successfully');
  };

  // Defect Log form submit
  const handleLogDefectSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const pieceCode = formData.get('pieceCode');
    const reason = formData.get('reason');
    const dcmLoss = parseFloat(formData.get('dcmLoss')) || 5.0;
    const reworkCutter = formData.get('reworkCutter');

    setPiecesList((prev) =>
      prev.map((p) =>
        p.piece_code === pieceCode
          ? {
              ...p,
              status: 'Damaged',
              damage_reason: reason,
              waste_dcm: dcmLoss,
              rework_cutter: reworkCutter,
            }
          : p
      )
    );

    setShowLogDefectModal(false);
    triggerToast(`⚠️ Defect Logged for ${pieceCode} (${dcmLoss} DCM Loss) → Sent to Rework`);
  };

  // Top KPIs computed (Responsive to Local Filters)
  const isLocalFiltered = filterStyle !== 'all' || filterDate !== 'all' || filterLot !== 'all' || filterCutter !== 'all' || filterThickness !== 'all' || filterColor !== 'all' || filterStatus !== 'all' || filterSize !== 'all' || searchQuery !== '';

  const totalPiecesTracked = isLocalFiltered ? filteredPieces.length : (kpis?.overall_pieces ?? displayOrder.totalPieces);
  const completedPiecesCount = isLocalFiltered ? filteredPieces.filter((p) => p.status === 'Completed').length : (kpis?.overall_completed ?? displayOrder.completedPieces);
  const pendingPiecesCount = isLocalFiltered ? filteredPieces.filter((p) => p.status !== 'Completed' && p.status !== 'Damaged' && p.status !== 'Rework').length : (kpis?.overall_pending ?? displayOrder.pendingPieces);
  const damagePiecesCount = isLocalFiltered ? filteredPieces.filter((p) => p.status === 'Damaged').length : (kpis?.damage_pieces ?? displayOrder.damagePieces);
  const reworkPiecesCount = isLocalFiltered ? filteredPieces.filter((p) => p.status === 'Rework').length : (kpis?.rework_pieces ?? displayOrder.reworkPieces);
  
  const totalDcmConsumed = isLocalFiltered ? filteredPieces.reduce((acc, p) => acc + (p.actual_consumption || 0), 0).toFixed(1) : (kpis?.total_dcm_consumed ?? piecesList.reduce((acc, p) => acc + (p.actual_consumption || 0), 0).toFixed(1));
  const totalDcmWaste = isLocalFiltered ? filteredPieces.reduce((acc, p) => acc + (p.waste_dcm || 0), 0).toFixed(1) : (kpis?.total_waste_dcm ?? piecesList.reduce((acc, p) => acc + (p.waste_dcm || 0), 0).toFixed(1));

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

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={handleSimulateCut}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2563eb] text-white text-xs font-bold hover:bg-[#1d4ed8] transition-all shadow-sm hover:scale-[1.02]"
            title="Simulate live piece cut event on cutting floor"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Live Cut Sim</span>
          </button>

          <button
            onClick={() => setShowLogDefectModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs font-bold hover:bg-red-100 transition-all"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
            <span>Log Defect</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#f8fafc] text-slate-700 border border-slate-200 text-xs font-bold hover:bg-slate-100 transition-all"
            title="Export complete piece and style consumption report to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-slate-200 text-xs text-slate-500 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>Floor Stream Active</span>
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
              Showing {filteredPieces.length} of {piecesList.length} Pieces
            </span>
            <button
              onClick={handleResetFilters}
              className="text-xs text-red-600 font-bold hover:underline cursor-pointer"
            >
              Reset All
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-2">
          {/* Quick Search */}
          <div className="relative col-span-2 sm:col-span-3 lg:col-span-2 xl:col-span-2">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search piece, style, lot, cutter..."
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2563eb]"
            />
          </div>

          {/* Date Filter */}
          <div>
            <select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#2563eb]"
            >
              <option value="all">📅 All Dates</option>
              {availableDates.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Order Filter */}
          <div>
            <select
              value={filterOrder}
              onChange={(e) => {
                const val = e.target.value;
                setFilterOrder(val);
                const ord = ordersList.find((o) => o.id === val || o.order_number === val);
                if (ord) setActiveOrder(ord);
              }}
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#2563eb]"
            >
              <option value="all">📦 All Orders</option>
              {ordersList.map((ord) => (
                <option key={ord.id} value={ord.id}>
                  {ord.order_number || ord.name || ord.po_number || ord.id}
                </option>
              ))}
            </select>
          </div>

          {/* Style Filter */}
          <div>
            <select
              value={filterStyle}
              onChange={(e) => setFilterStyle(e.target.value)}
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#2563eb]"
            >
              <option value="all">👗 All Styles</option>
              {availableStyles.map((s) => (
                <option key={s.id} value={s.name || s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Leather Lot */}
          <div>
            <select
              value={filterLot}
              onChange={(e) => setFilterLot(e.target.value)}
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#2563eb]"
            >
              <option value="all">🧵 All Lots</option>
              {availableLots.map((lot) => (
                <option key={lot} value={lot}>
                  {lot}
                </option>
              ))}
            </select>
          </div>

          {/* Cutter Filter */}
          <div>
            <select
              value={filterCutter}
              onChange={(e) => setFilterCutter(e.target.value)}
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#2563eb]"
            >
              <option value="all">✂️ All Cutters</option>
              {availableCutters.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#2563eb]"
            >
              <option value="all">⚡ Status</option>
              {availableStatuses.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Size Filter */}
          <div>
            <select
              value={filterSize}
              onChange={(e) => setFilterSize(e.target.value)}
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#2563eb]"
            >
              <option value="all">📏 Size</option>
              {availableSizes.map((sz) => (
                <option key={sz} value={sz}>
                  Size {sz}
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
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full space-y-5"
        >
          {/* CURRENT RUNNING ORDER HERO BANNER (Full Width Grid) */}
          <div className="w-full bg-gradient-to-br from-white via-[#f8fafc] to-[#eff6ff] border border-slate-200 rounded-3xl p-6 shadow-sm grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Col: Order Specs */}
            <div className="flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {displayOrder.status}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-blue-100 text-blue-800">
                    {displayOrder.order_number}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    Client: <strong>{displayOrder.client}</strong>
                  </span>
                </div>
                <h2 className="text-2xl font-black text-[#1e293b] tracking-tight">{displayOrder.article}</h2>
                <p className="text-xs font-semibold text-slate-600 mt-0.5">{displayOrder.styleName} &bull; Target BOM: <strong className="text-[#2563eb]">{displayOrder.targetBomDcm} DCM / pc</strong></p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Color</span>
                  <p className="text-xs font-bold text-slate-800">{displayOrder.color}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Thickness</span>
                  <p className="text-xs font-bold text-slate-800">{displayOrder.thickness}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Order Total</span>
                  <p className="text-xs font-bold text-slate-800">{displayOrder.totalPieces} pcs</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Lot #</span>
                  <p className="text-xs font-bold text-[#2563eb]">{displayOrder.lotNumber}</p>
                </div>
              </div>
            </div>

            {/* Middle Col: Pacing & Target Timeline */}
            <div className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-2xl p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Timeline & Pacing</span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                  {displayOrder.expectedCompletionDate} Expected
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 my-3">
                <div className="bg-[#f8fafc] p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-500">Avg Daily Cut</span>
                  <div className="text-lg font-black text-slate-900">{displayOrder.avgDailyProduction} pcs</div>
                </div>
                <div className="bg-[#f8fafc] p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-500">Req. Daily Pacing</span>
                  <div className="text-lg font-black text-slate-900">{displayOrder.requiredDailyProduction} pcs</div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-600">Completion Progress</span>
                  <span className="text-[#2563eb]">{displayOrder.progressPct}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#2563eb] to-[#3b82f6] h-full rounded-full transition-all duration-500"
                    style={{ width: `${displayOrder.progressPct}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Right Col: Shift Breakdown */}
            <div className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-2xl p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Live Shift Breakdown</span>
                <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  Floor A Live
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 my-2.5 text-xs font-bold">
                <div className="bg-[#f8fafc] p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Completed</span>
                  <div className="text-xl font-black text-slate-900">{displayOrder.completedPieces} pcs</div>
                </div>
                <div className="bg-[#f8fafc] p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Pending</span>
                  <div className="text-xl font-black text-slate-900">{displayOrder.pendingPieces} pcs</div>
                </div>
                <div className="bg-red-50/70 p-2.5 rounded-xl border border-red-100">
                  <span className="text-[10px] text-red-500 uppercase font-semibold">Defects</span>
                  <div className="text-xl font-black text-red-600">{displayOrder.damagePieces} pcs</div>
                </div>
                <div className="bg-purple-50/70 p-2.5 rounded-xl border border-purple-100">
                  <span className="text-[10px] text-purple-500 uppercase font-semibold">Rework</span>
                  <div className="text-xl font-black text-purple-700">{displayOrder.reworkPieces} pcs</div>
                </div>
              </div>
            </div>
          </div>

          {/* 4 TOP SUMMARY KPIS (DCM UNIT STRICT - Full Width Grid) */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* KPI 1 */}
            <div
              onClick={() => setActiveTab('tab-pieces')}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
                  📦
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                  {kpis?.completed_today !== undefined ? `${kpis.completed_today} cut today` : 'Active'}
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-500">Total Pieces Tracked</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900">{totalPiecesTracked}</span>
                <span className="text-xs font-semibold text-slate-400">/ across orders</span>
              </div>
              <div className="mt-3 pt-3 border-t border-dashed border-slate-100 flex justify-between text-xs text-slate-600 font-semibold">
                <span>Completed: <strong className="text-emerald-600">{completedPiecesCount}</strong></span>
                <span>Pending: <strong className="text-amber-600">{pendingPiecesCount}</strong></span>
              </div>
            </div>

            {/* KPI 2 */}
            <div
              onClick={() => setActiveTab('tab-styles')}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-lg">
                  👗
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                  Yield {kpis?.efficiency_pct ? `${kpis.efficiency_pct}%` : '98.8%'}
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-500">Avg Style Consumption (DCM)</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900">{isLocalFiltered ? `${(totalDcmConsumed / (totalPiecesTracked || 1)).toFixed(1)} DCM` : (kpis?.avg_dcm_per_piece ? `${kpis.avg_dcm_per_piece} DCM` : '12.1 DCM')}</span>
                <span className="text-xs font-semibold text-slate-400">/ piece avg</span>
              </div>
              <div className="mt-3 pt-3 border-t border-dashed border-slate-100 flex justify-between text-xs text-slate-600 font-semibold">
                <span>BOM Target: <strong>{displayOrder.targetBomDcm || 12.5} DCM</strong></span>
                <span>Total Consumed: <strong className="text-blue-600">{totalDcmConsumed} DCM</strong></span>
              </div>
            </div>

            {/* KPI 3 */}
            <div
              onClick={() => setActiveTab('tab-inventory')}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
                  🧵
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                  Stock Healthy
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-500">Leather Consumed vs Stock (DCM)</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900">{totalDcmConsumed} DCM</span>
              </div>
              <div className="mt-3 pt-3 border-t border-dashed border-slate-100 flex justify-between text-xs text-slate-600 font-semibold">
                <span>Total Stock: <strong>{lotsList.reduce((acc, l) => acc + (l.total_stock_dcm || 0), 0).toLocaleString()} DCM</strong></span>
                <span>Remaining: <strong className="text-emerald-600">{lotsList.reduce((acc, l) => acc + (l.remaining_dcm || 0), 0).toLocaleString()} DCM</strong></span>
              </div>
            </div>

            {/* KPI 4 */}
            <div
              onClick={() => setActiveTab('tab-analytics')}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg">
                  📊
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700">
                  Waste: {kpis?.waste_pct ? `${kpis.waste_pct}%` : '3.8%'}
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-500">Total Cutting Waste & Loss (DCM)</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-amber-600">{totalDcmWaste} DCM</span>
              </div>
              <div className="mt-3 pt-3 border-t border-dashed border-slate-100 flex justify-between text-xs text-slate-600 font-semibold">
                <span>Defects: <strong className="text-rose-600">{damagePiecesCount} pcs</strong></span>
                <span>Rework: <strong className="text-purple-600">{reworkPiecesCount} pcs</strong></span>
              </div>
            </div>
          </div>

          {/* DAILY PRODUCTION CADENCE CHART & LOG */}
          <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Chart */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Daily Production vs Target Cadence</h3>
                  <p className="text-xs text-slate-500">Completed pieces vs daily targets across shifts</p>
                </div>
              </div>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={consumptionLogs}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="work_date" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip content={<CustomTooltip unit="pcs" />} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                    <Bar dataKey="completed" name="Completed Pcs" fill="#2563eb" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="pending" name="Pending Pcs" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                    <Line type="monotone" dataKey="target" name="Daily Target" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4 }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Log Table */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 mb-1">Production History Log</h3>
                <p className="text-xs text-slate-500 mb-3">Shift-wise production records</p>
                
                <div className="overflow-y-auto max-h-[250px] space-y-2 pr-1">
                  {filteredConsumptionLogs.map((log, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-[#f8fafc] border border-slate-100 text-xs">
                      <div>
                        <span className="font-bold text-slate-800">{log.work_date || log.date}</span>
                        <div className="text-[10px] text-slate-500 mt-0.5">Target: {log.target || 0} pcs</div>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-emerald-700">{log.completed || 0} done</span>
                        <div className="text-[10px] text-amber-600 font-semibold">{log.pending || 0} pending</div>
                      </div>
                    </div>
                  ))}
                  {filteredConsumptionLogs.length === 0 && (
                    <div className="text-center py-8 text-xs text-slate-400 font-medium">
                      No shift records logged yet.
                    </div>
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
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full space-y-5"
        >
          {/* Main Style Table */}
          <div className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Per-Style / Article Leather Consumption & BOM Matrix (DCM)</h3>
                <p className="text-xs text-slate-500">Comprehensive leather consumption breakdown by jacket style and size in Decimeters (DCM / dm²)</p>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-[#eff6ff] text-[#2563eb] rounded-full">
                Standard: 1 dm² = 0.1076 sq.ft
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-[#f8fafc] text-slate-600 font-bold uppercase tracking-wider border-y border-slate-200">
                    <th className="py-3 px-4">Article / Style</th>
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-4">Leather Article</th>
                    <th className="py-3 px-4">Lot Number</th>
                    <th className="py-3 px-4 text-right">Target BOM (DCM)</th>
                    <th className="py-3 px-4 text-right">Actual Avg (DCM)</th>
                    <th className="py-3 px-4 text-right">Variance</th>
                    <th className="py-3 px-4 text-right">Total Cut (pcs)</th>
                    <th className="py-3 px-4 text-right">Total DCM Consumed</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredStylesList.map((s, idx) => (
                    <tr
                      key={idx}
                      onClick={() => setSelectedStyleDetail(s)}
                      className={`hover:bg-slate-50 cursor-pointer transition-all ${
                        selectedStyleDetail?.style_name === s.style_name || selectedStyleDetail?.name === s.name ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                        <span>👗</span>
                        <span>{s.style_name || s.name}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">{s.order_number || activeOrder?.order_number || '—'}</td>
                      <td className="py-3.5 px-4">{s.leather_article || s.article || 'Leather'}</td>
                      <td className="py-3.5 px-4 font-mono text-blue-600">{s.lot_number || '—'}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800">{(s.target_bom_dcm || 12.5).toFixed(1)} DCM</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-[#2563eb]">{(s.actual_avg_dcm || 12.0).toFixed(1)} DCM</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold">
                        <span className={(s.variance_dcm || 0) <= 0 ? 'text-emerald-600' : 'text-red-600'}>
                          {(s.variance_dcm || 0) > 0 ? `+${(s.variance_dcm || 0).toFixed(1)}` : (s.variance_dcm || 0).toFixed(1)} DCM
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">{s.total_pieces_cut || s.pieces || 0} pcs</td>
                      <td className="py-3.5 px-4 text-right font-mono font-extrabold text-slate-900">{(s.total_dcm_consumed || 0).toFixed(1)} DCM</td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStyleDetail(s);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#2563eb] hover:text-white text-slate-700 text-[11px] font-bold transition-all"
                        >
                          Size Details
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredStylesList.length === 0 && (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-slate-400 font-medium">
                        No style matrices available for selected order.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Interactive Size-Wise Breakdown for Selected Style */}
          {selectedStyleDetail && selectedStyleDetail.size_breakdown && (
            <div className="w-full bg-gradient-to-br from-white to-[#f8fafc] p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-sm font-extrabold text-[#1e293b]">
                    Size-Wise Leather Consumption (DCM) for Style: <span className="text-[#2563eb]">{selectedStyleDetail.style_name || selectedStyleDetail.name}</span>
                  </h4>
                  <p className="text-xs text-slate-500">Jacket size grading and consumption variance breakdown</p>
                </div>
                <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-white border border-slate-200">
                  {selectedStyleDetail.leather_article || 'Leather'} &bull; {selectedStyleDetail.color || 'Standard'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {selectedStyleDetail.size_breakdown.map((sb, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-base font-black text-slate-900">Size {sb.size}</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {sb.pieces || 0} pcs cut
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs font-medium my-2">
                      <div className="flex justify-between text-slate-500">
                        <span>Target BOM:</span>
                        <span className="font-mono font-bold text-slate-800">{(sb.target_dcm || 12.5).toFixed(1)} DCM</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Actual Consumed:</span>
                        <span className="font-mono font-bold text-[#2563eb]">{(sb.actual_avg_dcm || 12.0).toFixed(1)} DCM</span>
                      </div>
                      <div className="flex justify-between text-slate-500 pt-1 border-t border-slate-100">
                        <span>Variance:</span>
                        <span className={`font-mono font-bold ${(sb.variance || 0) <= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {(sb.variance || 0) > 0 ? `+${(sb.variance || 0).toFixed(1)}` : (sb.variance || 0).toFixed(1)} DCM
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Style BOM vs Consumed Chart */}
          <div className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-extrabold text-slate-900 mb-1">Style BOM Comparison (Target DCM vs Actual Consumed DCM)</h3>
            <p className="text-xs text-slate-500 mb-4">Variance comparison across jacket production models</p>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredStylesList}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="style_name" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip content={<CustomTooltip unit="DCM/pc" />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Bar dataKey="target_bom_dcm" name="Target BOM (DCM/pc)" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="actual_avg_dcm" name="Actual Consumed (DCM/pc)" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      )}

      {/* ====================================================================
           TAB 3: LEATHER STOCK & ALLOCATION (DCM)
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
                <h3 className="text-base font-extrabold text-slate-900">Leather Inventory Stock & Lot Allocation (DCM)</h3>
                <p className="text-xs text-slate-500">Available hide inventory, allocations, and consumption in Decimeters (DCM / dm²)</p>
              </div>
              <span className="text-xs font-bold text-slate-500">
                Total Stock Available: <strong className="text-slate-900">{lotsList.reduce((acc, l) => acc + (l.remaining_dcm || l.total_stock_dcm || 0), 0).toLocaleString()} DCM</strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-[#f8fafc] text-slate-600 font-bold uppercase tracking-wider border-y border-slate-200">
                    <th className="py-3 px-4">Lot #</th>
                    <th className="py-3 px-4">Leather Article</th>
                    <th className="py-3 px-4">Color</th>
                    <th className="py-3 px-4">Thickness</th>
                    <th className="py-3 px-4 text-right">Total Stock (DCM)</th>
                    <th className="py-3 px-4 text-right">Allocated (DCM)</th>
                    <th className="py-3 px-4 text-right">Consumed (DCM)</th>
                    <th className="py-3 px-4 text-right">Remaining (DCM)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {lotsList.map((lot, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-all">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-600">{lot.lot_number}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{lot.article}</td>
                      <td className="py-3.5 px-4">{lot.color}</td>
                      <td className="py-3.5 px-4">{lot.thickness}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">{(lot.total_stock_dcm || 0).toLocaleString()} DCM</td>
                      <td className="py-3.5 px-4 text-right font-mono text-blue-700 font-semibold">{(lot.allocated_dcm || 0).toLocaleString()} DCM</td>
                      <td className="py-3.5 px-4 text-right font-mono text-purple-700 font-bold">{(lot.consumed_dcm || 0).toLocaleString()} DCM</td>
                      <td className="py-3.5 px-4 text-right font-mono text-emerald-700 font-black">{(lot.remaining_dcm || 0).toLocaleString()} DCM</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                          {lot.status || 'Active'}
                        </span>
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
                  ))}
                  {lotsList.length === 0 && (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-slate-400 font-medium">
                        No leather inventory lots recorded.
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
           TAB 4: CUTTER PERFORMANCE
           ==================================================================== */}
      {activeTab === 'tab-cutters' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full space-y-5"
        >
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-5">
            {filteredCuttersList.map((cutter, idx) => (
              <div
                key={idx}
                onClick={() => handleOpenCutterModal(cutter)}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <img
                      src={cutter.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                      alt={cutter.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-[#2563eb]"
                    />
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900">{cutter.name}</h4>
                      <p className="text-xs text-slate-500">{cutter.role || 'Cutter'}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800">
                        {cutter.status || 'Active'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-semibold my-3">
                    <div className="bg-[#f8fafc] p-2.5 rounded-xl">
                      <span className="text-[10px] text-slate-500">Completed Today</span>
                      <div className="text-base font-black text-slate-900">{cutter.completedToday || 0} pcs</div>
                    </div>
                    <div className="bg-[#f8fafc] p-2.5 rounded-xl">
                      <span className="text-[10px] text-slate-500">DCM Consumed</span>
                      <div className="text-base font-black text-[#2563eb]">{cutter.totalDcmConsumed || 0} DCM</div>
                    </div>
                    <div className="bg-[#f8fafc] p-2.5 rounded-xl">
                      <span className="text-[10px] text-slate-500">Efficiency</span>
                      <div className="text-base font-black text-emerald-700">{cutter.efficiencyPct || 98}%</div>
                    </div>
                    <div className="bg-[#f8fafc] p-2.5 rounded-xl">
                      <span className="text-[10px] text-slate-500">Defects / Rework</span>
                      <div className="text-base font-black text-red-600">{cutter.damageCount || 0} / {cutter.reworkCount || 0}</div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenCutterModal(cutter);
                  }}
                  className="w-full mt-2 py-2 rounded-xl bg-slate-100 hover:bg-[#1e293b] hover:text-white text-slate-800 text-xs font-bold transition-all"
                >
                  View Cut Pieces & Logs
                </button>
              </div>
            ))}
            {cuttersList.length === 0 && (
              <div className="col-span-3 text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400 font-medium">
                No cutter operators registered.
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ====================================================================
           TAB 5: PIECE-LEVEL MASTER TRACKER (CORE)
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
                <h3 className="text-base font-extrabold text-slate-900">Piece-Level Master Traceability Tracker</h3>
                <p className="text-xs text-slate-500">Every jacket piece serial with actual DCM consumption, cutter, and lifecycle state</p>
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
                    <th className="py-3 px-4">Cutter</th>
                    <th className="py-3 px-4">Current Stage</th>
                    <th className="py-3 px-4 text-right">Actual Consumed</th>
                    <th className="py-3 px-4 text-right">Expected</th>
                    <th className="py-3 px-4 text-right">Variance</th>
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
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {p.piece_code}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">{p.order_number}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">{p.style}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-700">{p.size}</td>
                      <td className="py-3.5 px-4 text-slate-800">{p.employee}</td>
                      <td className="py-3.5 px-4 font-bold text-blue-700">{p.current_stage}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-[#2563eb]">
                        {p.actual_consumption.toFixed(1)} DCM
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-500">
                        {p.expected_consumption ? `${p.expected_consumption.toFixed(1)} DCM` : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold">
                        {p.variance !== null ? (
                          <span className={p.variance <= 0 ? 'text-emerald-600' : 'text-red-600'}>
                            {p.variance > 0 ? `+${p.variance.toFixed(1)}` : p.variance.toFixed(1)} DCM
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                            p.status === 'Completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.status === 'Damaged'
                              ? 'bg-red-100 text-red-800'
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
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#2563eb] hover:text-white text-slate-700 text-[11px] font-bold transition-all"
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
                <h3 className="text-base font-extrabold text-slate-900">Damage, Defect & Rework Station</h3>
                <p className="text-xs text-slate-500">Defects categorized by reason and affected leather area in Decimeters (DCM / dm²)</p>
              </div>
              <button
                onClick={() => setShowLogDefectModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-all flex items-center gap-1.5"
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
                    <th className="py-3 px-4">Cutter Responsible</th>
                    <th className="py-3 px-4">Defect Reason</th>
                    <th className="py-3 px-4 text-right">Damaged Leather (DCM)</th>
                    <th className="py-3 px-4">Rework Cutter</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {piecesList
                    .filter((p) => p.status === 'Damaged' || p.status === 'Rework')
                    .map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-all">
                        <td className="py-3.5 px-4 font-mono font-bold text-red-600">{p.piece_code}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">{p.style}</td>
                        <td className="py-3.5 px-4 text-slate-800">{p.employee}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-700">{p.damage_reason || 'Flay cut across grain'}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-red-600">{p.waste_dcm || 4.5} DCM</td>
                        <td className="py-3.5 px-4 text-blue-700 font-bold">{p.rework_cutter || 'hamthan'}</td>
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
           TAB 7: LOSS, WASTE & ANALYTICS (DCM)
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
              <h3 className="text-sm font-extrabold text-slate-900 mb-1">Leather Waste Loss Breakdown (DCM)</h3>
              <p className="text-xs text-slate-500 mb-4">Total waste distribution across patterns, trimmings, and flaws</p>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={wasteData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      innerRadius={50}
                      paddingAngle={4}
                    >
                      {wasteData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || '#3b82f6'} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip unit="DCM" />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Cutter Comparison */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-extrabold text-slate-900 mb-1">Cutter Throughput & Leather Consumed (DCM)</h3>
              <p className="text-xs text-slate-500 mb-4">Performance output across master cutters</p>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cuttersList}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip content={<CustomTooltip unit="" />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="totalPiecesCut" name="Pieces Cut" fill="#2563eb" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="totalDcmConsumed" name="DCM Consumed" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ====================================================================
           TAB 8: TRACEABILITY FLOW
           ==================================================================== */}
      {activeTab === 'tab-flow' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6"
        >
          <div>
            <h3 className="text-base font-extrabold text-slate-900">End-to-End Factory Traceability Flow Architecture</h3>
            <p className="text-xs text-slate-500">Direct relationship: Order &rarr; Style &rarr; Leather Lot &rarr; Cutter &rarr; Piece &rarr; Consumption (DCM) &rarr; Completion</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            {[
              { title: '1. Order Received', desc: 'ORD-1011 / is1234', icon: '📦', color: 'bg-blue-50 text-blue-700' },
              { title: '2. Style BOM (DCM)', desc: 'CARNABY (12.5 DCM)', icon: '👗', color: 'bg-purple-50 text-purple-700' },
              { title: '3. Leather Lot Stock', desc: 'LOT-SUEDE-01 (DCM)', icon: '🧵', color: 'bg-emerald-50 text-emerald-700' },
              { title: '4. Precision Cutting', desc: 'Ahmedasa / Ravi', icon: '✂️', color: 'bg-amber-50 text-amber-700' },
              { title: '5. Piece Serial Scan', desc: 'IS1234-...-001', icon: '🏷️', color: 'bg-cyan-50 text-cyan-700' },
              { title: '6. Final Inspection', desc: 'Completed & Verified', icon: '✅', color: 'bg-green-50 text-green-700' },
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
           MODAL 1: PIECE SERIAL INSPECTOR (8-STAGE LIFECYCLE STEPPER)
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
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Piece Serial Inspector</span>
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
                    'Raw Stock',
                    'Lot Issued',
                    'Cutter Assign',
                    'Cutting',
                    'DCM Logged',
                    'Stitching',
                    'QC Inspect',
                    'Completed',
                  ].map((stageName, idx) => {
                    const isDone = idx < 6;
                    const isCurrent = idx === 6;
                    return (
                      <div key={idx} className="flex flex-col items-center">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                            isDone
                              ? 'bg-emerald-500 text-white'
                              : isCurrent
                              ? 'bg-blue-600 text-white ring-4 ring-blue-100'
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

              {/* DCM Consumption Box */}
              <div className="grid grid-cols-3 gap-3 p-4 bg-[#f8fafc] rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Actual Consumed</span>
                  <p className="text-base font-mono font-black text-[#2563eb]">{selectedPieceModal.actual_consumption} DCM</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Expected Target</span>
                  <p className="text-base font-mono font-black text-slate-800">{selectedPieceModal.expected_consumption || 12.0} DCM</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Variance</span>
                  <p className="text-base font-mono font-black text-emerald-600">{selectedPieceModal.variance || 0.0} DCM</p>
                </div>
              </div>

              {/* Barcode & Meta */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-xs font-semibold space-y-0.5">
                  <p>Order: <strong>{selectedPieceModal.order_number}</strong> &bull; Style: <strong>{selectedPieceModal.style}</strong></p>
                  <p>Cutter: <strong>{selectedPieceModal.employee}</strong> &bull; Lot: <strong>{selectedPieceModal.lot_number}</strong></p>
                </div>
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono font-bold">
                  <QrCode className="w-4 h-4 text-slate-600" />
                  <span>QC-PASS-2026</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ====================================================================
           MODAL 2: CUTTER PIECES MODAL
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
                  <img
                    src={selectedCutterModal.avatar}
                    alt={selectedCutterModal.name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-[#2563eb]"
                  />
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">{selectedCutterModal.name}</h3>
                    <p className="text-xs text-slate-500">{selectedCutterModal.role} &bull; Total Pieces: {selectedCutterModal.totalPiecesCut}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCutterModal(null)}
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
                      <th className="py-2.5 px-3 text-right">Actual DCM</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {piecesList
                      .filter((p) => p.employee === selectedCutterModal.name)
                      .map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono font-bold">{p.piece_code}</td>
                          <td className="py-2 px-3">{p.style}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-[#2563eb]">{p.actual_consumption} DCM</td>
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
           MODAL 3: LEATHER LOT TRACEABILITY MODAL
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
                  <h3 className="text-base font-mono font-extrabold text-blue-600">{selectedLotModal.lot_number}</h3>
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
                  <span className="text-slate-500">Leather Article:</span>
                  <span className="text-slate-900">{selectedLotModal.article}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Color:</span>
                  <span className="text-slate-900">{selectedLotModal.color}</span>
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
                  <span className="text-slate-500">Total Stock:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedLotModal.total_stock_dcm} DCM</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Remaining Available:</span>
                  <span className="font-mono font-bold text-emerald-600">{selectedLotModal.remaining_dcm} DCM</span>
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
                <div className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                  <h3 className="text-sm font-extrabold text-slate-900">Log Cutting Defect / Damage</h3>
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
                    <option value="Flay cut across grain">Flay cut across grain</option>
                    <option value="Scar / insect bite mark">Scar / insect bite mark</option>
                    <option value="Dimensional stretch error">Dimensional stretch error</option>
                    <option value="Grain texture mismatch">Grain texture mismatch</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">Damaged Area Loss (DCM)</label>
                  <input
                    type="number"
                    step="0.1"
                    name="dcmLoss"
                    defaultValue="4.5"
                    required
                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">Assign Rework Cutter</label>
                  <select
                    name="reworkCutter"
                    required
                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  >
                    <option value="hamthan">hamthan (Suede Specialist)</option>
                    <option value="Ravi">Ravi (Master Cutter)</option>
                    <option value="Ahmedasa">Ahmedasa (Senior Precision)</option>
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
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
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
