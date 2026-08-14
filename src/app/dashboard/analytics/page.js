
'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer, Tooltip as RTooltip,
  BarChart, Bar, XAxis, YAxis, LabelList,
} from 'recharts';

import { useAuth } from '@/context/AuthContext';
import {
  apiGetAnalyticsOverview,
  apiGetAnalyticsExplore,
  apiGetStageSpreadAlerts,
  apiGetFreightRiskAlerts,
  apiGetOrderTree,
  apiGetStyleDetail,
  apiGetPieceDetail
} from '@/lib/api';
import {
  TrendingUp,
  AlertCircle,
  Plane,
  Box,
  Users,
  Scissors,
  Loader2,
  Ship,
  CheckCircle2,
  ChevronDown,
  ArrowRight,
  Warehouse,
  Package,
  Activity,
  Zap,
  Search,
  BarChart3,
  PieChart as PieChartIcon,
  LayoutGrid,
} from 'lucide-react';
import { useData } from '@/context/DataContext';

/* ── Chart palette (validated: brand orange · blue · emerald · indigo — CVD-safe categorical order) ── */
const CHART_BLUE = '#2563eb';
const CHART_STATUS = { good: '#16a34a', warning: '#d97706', danger: '#dc2626' };

function ChartTooltip({ active, payload, label, unit = '' }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl px-3 py-2 text-xs font-bold shadow-lg"
      style={{ background: '#2d1f0e', color: '#fdf0e0', border: '1px solid rgba(200,131,74,0.4)' }}
    >
      {label && <p className="text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: '#e8a06a' }}>{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.payload?.fill }}>
          {p.name}: <span className="text-white">{p.value}{unit}</span>
        </p>
      ))}
    </div>
  );
}

/* Animated count-up for headline stat numbers */
function useCountUp(target, duration = 800) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const to = Number(target) || 0;
    let raf;
    const start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return display;
}

const tabFade = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
};
const chartStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

// Safely extract pieces array from style detail API response
// Handles: direct array, nested object with .pieces array, or empty
function getPieces(sDetail) {
  if (!sDetail) return [];
  const p = sDetail.pieces;
  if (Array.isArray(p)) return p;
  if (p && Array.isArray(p.pieces)) return p.pieces;
  return [];
}

function HierarchyViewer({ activeItem, orderTrees, styleDetails, selectedPieceCode, pieceDetail, onSelectPiece }) {
  if (!activeItem) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full text-center py-16 animate-fade-in">
        <Warehouse className="w-10 h-10 text-slate-300 mb-2" />
        <p className="font-black text-slate-400 text-base">Select a Client / Order</p>
        <p className="text-slate-400/60 text-xs mt-1">Click a group on the left to start exploring.</p>
      </div>
    );
  }

  const group = activeItem.type === 'order' ? activeItem.data : activeItem.parentGroup;
  const treeData = group ? orderTrees[group.rawId] : null;

  const style = activeItem.type === 'style' ? activeItem.data : null;
  const sDetail = style ? styleDetails[style.style_id || style.id] : null;

  return (
    <div className="space-y-6 pb-20">
      {/* LEVEL 1: Client / Order Data */}
      {group && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
          <div className="bg-slate-50 border-b border-slate-200 px-5 py-3.5 flex items-center gap-2.5">
            <Warehouse className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-black uppercase tracking-widest text-slate-500">Level 1 · Client / Order</span>
          </div>
          <div className="p-6">
            <p className="text-2xl font-black" style={{ color: '#c8834a' }}>{group.client}</p>
            <p className="text-sm text-slate-400 font-mono mt-1 mb-5">{group.rawId}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">PO Number</p>
                <p className="text-lg font-black text-slate-800 truncate">{group.po}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Styles</p>
                <p className="text-lg font-black text-slate-800">{treeData?.style_count || 0}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Pieces</p>
                <p className="text-lg font-black text-slate-800">{treeData?.piece_count || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LEVEL 2: Style Data */}
      {style && (
        <div className="bg-white rounded-2xl border border-[#c8834a]/30 shadow-md overflow-hidden animate-fade-in relative mt-4">
          <div className="bg-[#c8834a]/10 border-b border-[#c8834a]/20 px-5 py-3.5 flex justify-between items-center gap-2">
            <div className="flex items-center gap-2.5">
              <Package className="w-4 h-4 text-[#c8834a]" />
              <span className="text-xs font-black uppercase tracking-widest text-[#c8834a]">Level 2 · Style Details</span>
            </div>
            {!selectedPieceCode && (
              <span className="text-xs bg-white text-[#c8834a] px-3 py-1.5 rounded-lg font-bold shrink-0">Select a piece below ↓</span>
            )}
          </div>
          <div className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
              <div>
                <p className="text-2xl font-black text-[#2d1f0e]">
                  {style.style_name || style.style} <span className="text-slate-400 font-semibold text-base">({style.article || sDetail?.article || 'Standard Article'})</span>
                </p>
                <p className="text-xs text-slate-400 font-mono mt-1">{style.style_id || style.id}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {sDetail?.status || style.status || 'Active in Pipeline'}
                </span>
              </div>
            </div>

            {/* Dynamic Level 2 Style Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="rounded-xl bg-amber-50/70 border border-amber-100 p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-0.5">Total Pieces</p>
                <p className="text-xl font-black text-slate-900">{getPieces(sDetail).length || style.piece_count || style.pieces?.length || 0}</p>
              </div>
              <div className="rounded-xl bg-emerald-50/70 border border-emerald-100 p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-0.5">Completed</p>
                <p className="text-xl font-black text-emerald-800">
                  {getPieces(sDetail).filter(p => p.current_stage === 'FINAL_FINISH' || p.status === 'Completed').length || 0}
                </p>
              </div>
              <div className="rounded-xl bg-blue-50/70 border border-blue-100 p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700 mb-0.5">In Progress</p>
                <p className="text-xl font-black text-blue-800">
                  {Math.max(0, (getPieces(sDetail).length || style.piece_count || 0) - getPieces(sDetail).filter(p => p.current_stage === 'FINAL_FINISH' || p.status === 'Completed').length)}
                </p>
              </div>
              <div className="rounded-xl bg-rose-50/70 border border-rose-100 p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700 mb-0.5">Defects / Rework</p>
                <p className="text-xl font-black text-rose-800">
                  {getPieces(sDetail).filter(p => p.is_rework || p.status === 'Damaged' || p.status === 'Rework').length || 0}
                </p>
              </div>
            </div>

            {/* Pieces list inside Level 2 */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500">Tracked Pieces &amp; Travelers</span>
              <span className="text-[11px] font-bold text-slate-400">{getPieces(sDetail).length} pieces loaded</span>
            </div>
            <div className={`border border-slate-200 rounded-xl overflow-hidden transition-all duration-300 max-h-80 overflow-y-auto ${selectedPieceCode ? 'opacity-50 h-32' : ''}`}>
              {getPieces(sDetail).map((p) => (
                <div
                  key={p.bundle_id || p.piece_code}
                  onClick={() => onSelectPiece(p.bundle_id || p.piece_code)}
                  className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3.5 border-b border-slate-100 last:border-b-0 cursor-pointer transition-colors ${selectedPieceCode === (p.bundle_id || p.piece_code) ? 'bg-[#c8834a]/10' : 'hover:bg-slate-50'}`}
                >
                  <span className="text-sm font-bold text-slate-400 w-8 shrink-0">#{p.seq || 1}</span>
                  <span className="text-sm font-black text-slate-800 flex-1 min-w-[100px] truncate">{p.bundle_id || p.piece_code}</span>
                  <span className="text-sm text-slate-500 shrink-0">{p.colour || p.color} / {p.size}</span>
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-full text-xs font-black shrink-0">{p.current_stage || 'Active'}</span>
                </div>
              ))}
              {getPieces(sDetail).length === 0 && (
                <div className="p-8 text-center text-slate-400 italic text-sm">Loading or no pieces logged for this style yet.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* LEVEL 3: Piece Data */}
      {selectedPieceCode && pieceDetail && (
        <div className="bg-white rounded-2xl border border-emerald-500/30 shadow-lg overflow-hidden animate-fade-in relative mt-4">
          <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-3.5 flex justify-between items-center gap-2">
            <div className="flex items-center gap-2.5">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-black uppercase tracking-widest text-emerald-700">Level 3 · Piece</span>
            </div>
            <button onClick={() => onSelectPiece(null)} className="text-xs font-black bg-white border border-emerald-200 text-emerald-700 px-3.5 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors shrink-0">Close View</button>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <p className="text-xl font-black text-[#2d1f0e] font-mono">{pieceDetail.bundle_id}</p>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <span className="text-sm text-slate-500 font-semibold">{pieceDetail.colour} / {pieceDetail.size}</span>
                <span className="text-emerald-700 font-black bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full text-xs">{pieceDetail.current_stage}</span>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
              <p className="text-xs font-black uppercase text-slate-400 mb-4 tracking-widest">Stage History Details</p>
              <div className="space-y-3">
                {pieceDetail.stages?.map((st, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-white border border-slate-200 flex justify-between items-center shadow-sm gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-slate-700 text-sm">{st.stage_label || st.stage_code}</span>
                        {st.is_rework && <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-md font-bold text-[10px]">REWORK</span>}
                      </div>
                      <div className="text-slate-500 mt-1 font-medium text-sm">By {st.employee_name || 'N/A'}</div>
                    </div>
                    <div className="text-right text-slate-400 shrink-0">
                      <div className="font-bold text-sm">{st.work_date}</div>
                      <div className="text-xs mt-0.5">{st.logged_at ? new Date(st.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</div>
                    </div>
                  </div>
                ))}
                {(!pieceDetail.stages || pieceDetail.stages.length === 0) && (
                  <div className="p-4 text-center text-slate-400 italic text-sm">No stage history logged yet.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OrdersExplorer() {
  const { token } = useAuth();
  const { orders: realOrders } = useData();
  const orders = useMemo(() => realOrders || [], [realOrders]);
  const [exploreData, setExploreData] = useState(null);
  const [loadingExplore, setLoadingExplore] = useState(true);

  // Read deep-link params from entry page
  const searchParams = useSearchParams();
  const deepStyleName = searchParams.get('style_name');
  const deepOrderNumber = searchParams.get('order_number');
  const autoLinkedRef = useRef(false); // run auto-link only once
  useEffect(() => {
    async function loadExploreData() {
      if (!token) return;
      try {
        const data = await apiGetAnalyticsExplore(token);
        setExploreData(data);
      } catch (err) {
        console.error("Failed to load analytics explore data:", err);
      } finally {
        setLoadingExplore(false);
      }
    }
    loadExploreData();
  }, [token]);

  const [expandedOrders, setExpandedOrders] = useState({});
  const [expandedStyles, setExpandedStyles] = useState({});
  const [activeItem, setActiveItem] = useState(null);
  const sidebarRef = useRef(null);
  const styleRefs = useRef({});

  // Real Order Tree Cache & Style Detail Cache (Level 2)
  const [orderTrees, setOrderTrees] = useState({});
  const [loadingTree, setLoadingTree] = useState({});

  const [styleDetails, setStyleDetails] = useState({}); // styleId -> detail data
  const [loadingStyleDetail, setLoadingStyleDetail] = useState({});

  // Level 3 Piece Traveler View State (Right Panel Inline)
  const [selectedPieceCode, setSelectedPieceCode] = useState(null);
  const [pieceDetail, setPieceDetail] = useState(null);
  const [loadingPiece, setLoadingPiece] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOrders = useMemo(() => {
    const dataList = orders || [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return dataList;


    return dataList.map((clientGroup) => {
      const clientName = String(clientGroup?.client_name || '').toLowerCase();


      const matchingOrders = (clientGroup?.orders || []).filter((ord) => {
        const orderNum = String(ord?.order_number || '').toLowerCase();


        const matchingStyles = (ord?.styles || []).some((sty) =>
          String(sty?.style_name || '').toLowerCase().includes(q) ||
          String(sty?.article || '').toLowerCase().includes(q)
        );

        return (
          clientName.includes(q) ||
          orderNum.includes(q) ||
          matchingStyles
        );
      });


      if (clientName.includes(q) || matchingOrders.length > 0) {
        return {
          ...clientGroup,
          orders: matchingOrders.length > 0 ? matchingOrders : clientGroup.orders
        };
      }
      return null;
    }).filter(Boolean);
  }, [orders, searchQuery]);
  const orderGroups = useMemo(() => {
    let groups = [];

    if (exploreData && exploreData.clients) {
      exploreData.clients.forEach(client => {
        client.orders?.forEach(order => {
          const orderName = `${client.client_name} (PO: ${order.order_number})`;
          groups.push({
            id: orderName,
            rawId: order.order_id,
            client: client.client_name,
            po: order.order_number,
            styles: order.styles || []
          });
        });
      });
    } else if (orders && orders.length > 0) {
      const mapGroups = {};
      orders.forEach((styleOrder) => {
        const poNum = styleOrder?.po_number || styleOrder?.order_number || styleOrder?.id || 'ORD-101';
        const clientName = styleOrder?.client || styleOrder?.client_name || 'Client';
        const orderName = `${clientName} (PO: ${poNum})`;

        if (!mapGroups[orderName]) {
          mapGroups[orderName] = {
            id: orderName,
            rawId: styleOrder?.id || styleOrder?.order_id || poNum,
            client: clientName,
            po: poNum,
            styles: styleOrder.styles || []
          };
        }
      });
      groups = Object.values(mapGroups);
    }

    const q = searchQuery.trim().toLowerCase();
    if (!q) return groups;

    return [...groups].sort((a, b) => {
      const matchA =
        String(a.client).toLowerCase().includes(q) ||
        String(a.po).toLowerCase().includes(q) ||
        a.styles.some(s => String(s.style_name || s.style || '').toLowerCase().includes(q));

      const matchB =
        String(b.client).toLowerCase().includes(q) ||
        String(b.po).toLowerCase().includes(q) ||
        b.styles.some(s => String(s.style_name || s.style || '').toLowerCase().includes(q));

      if (matchA && !matchB) return -1;
      if (!matchA && matchB) return 1;
      return 0;
    });
  }, [orders, exploreData, searchQuery]);

  const toggleOrder = async (group) => {
    const groupId = group.id;
    const isExpanding = !expandedOrders[groupId];
    setExpandedOrders((prev) => ({ ...prev, [groupId]: isExpanding }));

    if (isExpanding && group.rawId && !orderTrees[group.rawId]) {
      setLoadingTree((prev) => ({ ...prev, [groupId]: true }));
      try {
        const treeData = await apiGetOrderTree(token, group.rawId);
        if (treeData) {
          setOrderTrees((prev) => ({ ...prev, [group.rawId]: treeData }));
        }
      } catch (err) {
        console.error("Failed to fetch tree for order:", group.rawId, err);
      } finally {
        setLoadingTree((prev) => ({ ...prev, [groupId]: false }));
      }
    }
  };

  const toggleStyle = async (style, parentGroup) => {
    const styleId = style.style_id || style.id;
    const isExpanding = !expandedStyles[styleId];
    setExpandedStyles((prev) => ({ ...prev, [styleId]: isExpanding }));

    // Reset Level 3 piece view when switching style
    setSelectedPieceCode(null);
    setPieceDetail(null);
    setActiveItem({ type: 'style', data: style, parentGroup });

    // Call Level 2 API (/api/v1/analytics/styles/{style_id}/detail)
    if (isExpanding && styleId && !styleDetails[styleId]) {
      setLoadingStyleDetail((prev) => ({ ...prev, [styleId]: true }));
      try {
        const detailData = await apiGetStyleDetail(token, styleId);
        if (detailData) {
          setStyleDetails((prev) => ({ ...prev, [styleId]: detailData }));
        }
      } catch (err) {
        console.error("Failed to fetch style detail for:", styleId, err);
      } finally {
        setLoadingStyleDetail((prev) => ({ ...prev, [styleId]: false }));
      }
    }
  };

  // Call Level 3 API (Piece Traveler View) inline in right panel when clicking a piece from the table
  const handleSelectPiece = async (pieceCode) => {
    setSelectedPieceCode(pieceCode);
    setLoadingPiece(true);
    try {
      const data = await apiGetPieceDetail(token, { piece_code: pieceCode });
      if (data) {
        setPieceDetail(data);
      }
    } catch (err) {
      console.error("Failed to fetch piece detail:", err);
    } finally {
      setLoadingPiece(false);
    }
  };

  // ── Auto-link from entry page (runs once after exploreData loads) ────
  useEffect(() => {
    if (!exploreData || autoLinkedRef.current) return;
    if (!deepStyleName && !deepOrderNumber) return;
    autoLinkedRef.current = true;

    // Find the matching group and style from exploreData
    let targetGroup = null;
    let targetStyle = null;

    for (const client of (exploreData.clients || [])) {
      for (const order of (client.orders || [])) {
        // Match by order_number if provided
        const orderMatches = !deepOrderNumber || String(order.order_number) === String(deepOrderNumber);
        if (!orderMatches) continue;

        if (deepStyleName) {
          const matchedStyle = (order.styles || []).find(s =>
            String(s.style_name || '').toLowerCase() === deepStyleName.toLowerCase()
          );

          if (matchedStyle) {
            const orderName = `${client.client_name} (PO: ${order.order_number})`;
            targetGroup = {
              id: orderName,
              rawId: order.order_id,
              client: client.client_name,
              po: order.order_number,
              styles: order.styles || []
            };
            targetStyle = matchedStyle;
            break;
          }
        } else {
          // Order-only link — match just by order number
          const orderName = `${client.client_name} (PO: ${order.order_number})`;
          targetGroup = {
            id: orderName,
            rawId: order.order_id,
            client: client.client_name,
            po: order.order_number,
            styles: order.styles || []
          };
          break;
        }
      }
      if (targetGroup) break;
    }

    if (!targetGroup) return;

    // Expand the order group in sidebar
    setExpandedOrders(prev => ({ ...prev, [targetGroup.id]: true }));

    // Fetch the order tree
    if (targetGroup.rawId && !orderTrees[targetGroup.rawId]) {
      apiGetOrderTree(token, targetGroup.rawId)
        .then(treeData => {
          if (treeData) setOrderTrees(prev => ({ ...prev, [targetGroup.rawId]: treeData }));
        })
        .catch(console.error);
    }

    if (targetStyle) {
      // Style + Order: expand and select style
      const styleId = targetStyle.style_id || targetStyle.id;
      setExpandedStyles(prev => ({ ...prev, [styleId]: true }));
      setActiveItem({ type: 'style', data: targetStyle, parentGroup: targetGroup });

      // Fetch style detail
      if (styleId && !styleDetails[styleId]) {
        setLoadingStyleDetail(prev => ({ ...prev, [styleId]: true }));
        apiGetStyleDetail(token, styleId)
          .then(detailData => {
            if (detailData) setStyleDetails(prev => ({ ...prev, [styleId]: detailData }));
          })
          .catch(console.error)
          .finally(() => setLoadingStyleDetail(prev => ({ ...prev, [styleId]: false })));
      }

      // Scroll the sidebar to the style card after a short delay
      setTimeout(() => {
        const el = styleRefs.current[styleId];
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 400);
    } else {
      // Order-only: select the order group and show data in hierarchy viewer
      setActiveItem({ type: 'order', data: targetGroup, parentGroup: targetGroup });

      // Scroll the sidebar to the order card
      setTimeout(() => {
        const el = sidebarRef.current?.querySelector(`[data-order-id="${targetGroup.id}"]`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 400);
    }

  }, [deepStyleName, deepOrderNumber, exploreData, token]);
  // ─────────────────────────────────────────────────────────────────────

  const glassPanelStyle = {
    background: 'rgba(255,255,255,0.7)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.8)',
    boxShadow: '0 8px 32px rgba(139, 107, 74, 0.08)',
  };

  return (
    <div className="flex flex-col lg:flex-row gap-5 lg:min-h-[72vh]">
      {/* ── Left Sidebar ── */}
      <div
        className="w-full lg:w-[35%] rounded-2xl p-4 overflow-y-auto flex flex-col gap-1 max-h-[75vh]"
        style={glassPanelStyle}
      >
        {/*                 */}
        <div className="sticky top-0 z-10 pb-3 mb-2" style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)' }}>
          <div className="flex items-center justify-between px-2 mb-2">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">
              Orders Explorer
            </p>
            <span className="text-xs font-black px-2.5 py-1 rounded-full" style={{ background: '#faf6f0', color: '#a86022', border: '1px solid rgba(200,131,74,0.2)' }}>
              {filteredOrders.length} orders
            </span>
          </div>

          {/* 🎯 Search Input Bar */}
          <div className="relative flex items-center px-1">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10" style={{ color: '#9a7a5a' }} />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-lg pl-9 pr-3 text-sm font-semibold focus:outline-none transition-colors"
              style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.2)', color: '#2d1f0e' }}
            />
          </div>
        </div>
        {orderGroups.map((group) => {
          const fetchedTree = orderTrees[group.rawId];
          const displayStyles = fetchedTree?.styles || group.styles || [];

          return (
            <div key={group.id} className="flex flex-col gap-0.5">
              <div
                data-order-id={group.id}
                onClick={() => { toggleOrder(group); setActiveItem({ type: 'order', data: group }); setSelectedPieceCode(null); setPieceDetail(null); }}
                className="flex items-center gap-2.5 p-3 rounded-xl cursor-pointer transition-all duration-200 group"
                style={{
                  background: activeItem?.data?.id === group.id ? 'rgba(200,131,74,0.1)' : 'transparent',
                  border: activeItem?.data?.id === group.id ? '1px solid rgba(200,131,74,0.2)' : '1px solid transparent',
                }}
              >
                {expandedOrders[group.id]
                  ? <ChevronDown className="w-4 h-4 text-[#c8834a] shrink-0" />
                  : <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 shrink-0 transition-colors" />}
                <Warehouse className="w-4 h-4 text-[#c8834a] shrink-0" />
                <span className={`font-bold text-sm truncate select-none ${activeItem?.data?.id === group.id ? 'text-[#2d1f0e]' : 'text-slate-600 group-hover:text-slate-800'} transition-colors`}>
                  {group.id}
                </span>
                {loadingTree[group.id] && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#c8834a] ml-auto" />}
              </div>

              {expandedOrders[group.id] && (
                <div className="pl-5 flex flex-col gap-0.5 ml-3 border-l border-slate-200/50 mt-0.5">
                  {displayStyles.length === 0 && !loadingTree[group.id] && (
                    <span className="text-xs text-slate-400 p-2 italic">No styles found</span>
                  )}
                  {displayStyles.map((style, sIdx) => {
                    const styleId = style.style_id || style.id || `style-${sIdx}`;
                    const styleName = style.style_name || style.style || style.style_code || 'Unknown Style';

                    return (
                      <div key={styleId} className="flex flex-col gap-0.5" ref={el => styleRefs.current[styleId] = el}>
                        <div
                          onClick={() => toggleStyle(style, group)}
                          className="flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all duration-200 group"
                          style={{
                            background: activeItem?.data?.style_id === styleId ? 'rgba(255,255,255,0.8)' : 'transparent',
                            border: activeItem?.data?.style_id === styleId ? '1px solid #c8834a' : '1px solid transparent',
                          }}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {expandedStyles[styleId]
                              ? <ChevronDown className="w-3.5 h-3.5 text-[#c8834a] shrink-0" />
                              : <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 shrink-0 transition-colors" />}
                            <Package className="w-3.5 h-3.5 text-amber-500/80 shrink-0" />
                            <span className="font-semibold text-xs truncate text-slate-700">
                              {styleName}
                            </span>
                          </div>
                          {loadingStyleDetail[styleId] && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#c8834a] shrink-0" />}
                        </div>

                        {/* Level 3: Pieces list under this style in sidebar */}
                        {expandedStyles[styleId] && styleDetails[styleId] && (
                          <div className="pl-4 flex flex-col gap-0.5 ml-3 border-l border-amber-200/60 mt-0.5">
                            {getPieces(styleDetails[styleId]).length === 0 && (
                              <span className="text-xs text-slate-400 p-2 italic">No pieces found</span>
                            )}
                            {getPieces(styleDetails[styleId]).map((piece) => {
                              const pieceCode = piece.bundle_id || piece.piece_code || piece.piece_id;
                              const isActivePiece = selectedPieceCode === pieceCode;
                              return (
                                <div
                                  key={pieceCode}
                                  onClick={() => {
                                    setActiveItem({ type: 'piece', data: piece, parentStyle: style, parentGroup: group });
                                    handleSelectPiece(pieceCode);
                                  }}
                                  className="flex items-center gap-2 p-2 rounded-md cursor-pointer transition-all duration-150 group"
                                  style={{
                                    background: isActivePiece ? 'rgba(16,185,129,0.08)' : 'transparent',
                                    border: isActivePiece ? '1px solid rgba(16,185,129,0.3)' : '1px solid transparent',
                                  }}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: isActivePiece ? '#10b981' : '#cbd5e1' }} />
                                  <span className={`text-xs font-mono truncate ${isActivePiece ? 'text-emerald-700 font-bold' : 'text-slate-500 group-hover:text-slate-700'}`}>
                                    {pieceCode}
                                  </span>
                                  <span className="ml-auto text-[10px] font-bold shrink-0" style={{ color: '#c8834a' }}>
                                    #{piece.seq}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Right Panel (Hierarchy Viewer) ── */}
      <div className="flex-1 rounded-2xl overflow-hidden flex flex-col min-h-[400px] max-h-[75vh]" style={glassPanelStyle}>
        <div className="px-6 py-4 flex justify-between items-center shrink-0 border-b border-white/50 bg-white/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#c8834a]/10 border border-[#c8834a]/20">
              <Activity className="w-4 h-4 text-[#c8834a]" />
            </div>
            <div>
              <p className="font-black text-[#2d1f0e] text-base">Response Data Viewer</p>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                Hierarchical Stacked View
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 relative min-h-0">
          <HierarchyViewer
            activeItem={activeItem}
            orderTrees={orderTrees}
            styleDetails={styleDetails}
            selectedPieceCode={selectedPieceCode}
            pieceDetail={pieceDetail}
            onSelectPiece={handleSelectPiece}
            loadingStyleDetail={loadingStyleDetail}
            loadingTree={loadingTree}
            loadingPiece={loadingPiece}
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, iconColor }) {
  const displayValue = useCountUp(value);
  return (
    <motion.div
      variants={tabFade}
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      className="relative overflow-hidden rounded-2xl p-6 flex flex-col gap-4 group cursor-default bg-white"
      style={{
        borderLeft: `5px solid ${iconColor}`,
        boxShadow: `0 16px 32px -12px ${iconColor}55, 0 2px 8px rgba(0,0,0,0.04)`,
      }}
    >
      {/* ghost watermark icon for texture */}
      <Icon className="absolute -right-4 -bottom-4 w-28 h-28 opacity-[0.07] pointer-events-none" style={{ color: iconColor }} />
      <div
        className="relative w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `linear-gradient(135deg, ${iconColor}, ${iconColor}cc)`, boxShadow: `0 8px 20px ${iconColor}55` }}
      >
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="relative">
        <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
        <p className="text-4xl sm:text-5xl font-black tracking-tight" style={{ color: '#1a120a' }}>{displayValue.toLocaleString()}</p>
      </div>
    </motion.div>
  );
}

/* ── Order Health Donut: On Track vs Air Freight Risk — real order-level data only.
   (There is no delay/progress field on the raw order records, so we only chart what's
   genuinely order-scoped: total order count vs the freight-risk alerts already fetched.) ── */
function OrderHealthChart({ totalOrders, freightAlerts }) {
  const [hovered, setHovered] = useState(null);

  const data = useMemo(() => {
    const risk = freightAlerts.length;
    const onTrack = Math.max(totalOrders - risk, 0);
    return [
      { key: 'onTrack', name: 'On Track', value: onTrack, color: CHART_STATUS.good, icon: CheckCircle2 },
      { key: 'risk', name: 'Air Freight Risk', value: risk, color: CHART_STATUS.danger, icon: Plane },
    ].filter((d) => d.value > 0);
  }, [totalOrders, freightAlerts]);

  const total = data.reduce((a, d) => a + d.value, 0);
  const displayTotal = useCountUp(total);

  if (total === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center py-10">
        <PieChartIcon className="w-8 h-8 text-slate-300" />
        <p className="text-slate-400 text-xs font-bold">No order data to visualize yet.</p>
      </div>
    );
  }

  const size = 176;
  const cx = size / 2;
  const cy = size / 2;
  const strokeWidth = 14;
  const ringGap = 18;

  return (
    <div className="flex-1 flex flex-col sm:flex-row items-center gap-5 p-4">
      <div className="relative w-44 h-44 shrink-0">
        {/* ambient rotating glow — makes the panel feel alive, not a static chart */}
        <motion.div
          className="absolute -inset-3 rounded-full pointer-events-none"
          style={{ background: `conic-gradient(from 0deg, ${data[0].color}33, transparent 35%, transparent 65%, ${data[0].color}33)` }}
          animate={{ rotate: 360 }}
          transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
        />
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="relative">
          {data.map((d, i) => {
            const r = size / 2 - strokeWidth / 2 - i * ringGap;
            const circumference = 2 * Math.PI * r;
            const pct = d.value / total;
            const isDim = hovered && hovered !== d.key;
            return (
              <g key={d.key} transform={`rotate(-90 ${cx} ${cy})`}>
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} />
                <motion.circle
                  cx={cx} cy={cy} r={r}
                  fill="none"
                  stroke={d.color}
                  strokeWidth={hovered === d.key ? strokeWidth + 2 : strokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference, opacity: 1 }}
                  animate={{ strokeDashoffset: circumference * (1 - pct), opacity: isDim ? 0.35 : 1 }}
                  transition={{ strokeDashoffset: { duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.15 + i * 0.22 }, opacity: { duration: 0.2 }, strokeWidth: { duration: 0.2 } }}
                  onMouseEnter={() => setHovered(d.key)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ cursor: 'default' }}
                />
              </g>
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <motion.span
            className="text-3xl font-black"
            style={{ color: '#1a120a' }}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            {displayTotal}
          </motion.span>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Orders</span>
        </div>
      </div>
      <motion.div variants={chartStagger} initial="hidden" animate="show" className="flex-1 w-full flex flex-col gap-2">
        {data.map((d) => {
          const Icon = d.icon;
          const pct = Math.round((d.value / total) * 100);
          return (
            <motion.div
              key={d.name}
              variants={tabFade}
              whileHover={{ scale: 1.03 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              onMouseEnter={() => setHovered(d.key)}
              onMouseLeave={() => setHovered(null)}
              className="relative overflow-hidden rounded-xl px-3.5 py-2.5 cursor-default border"
              style={{ background: '#fafafa', borderColor: `${d.color}30` }}
            >
              <div className="absolute inset-y-0 left-0 transition-all duration-500" style={{ width: `${pct}%`, background: d.color, opacity: 0.14 }} />
              <div className="relative flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="w-4 h-4 shrink-0" style={{ color: d.color }} />
                  <span className="text-sm font-bold text-slate-700 truncate">{d.name}</span>
                </div>
                <span className="text-sm font-black shrink-0" style={{ color: d.color }}>{d.value} <span className="text-slate-400 font-semibold">({pct}%)</span></span>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}

/* ── Orders by Client: real order counts from the analytics explorer endpoint
   (raw order records carry no client_name, so this is sourced independently). ── */
function ClientOrdersChart({ data, loading }) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-[#c8834a]" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center py-10">
        <BarChart3 className="w-8 h-8 text-slate-300" />
        <p className="text-slate-400 text-xs font-bold">No client order data to show yet.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4">
      <ResponsiveContainer width="100%" height={Math.max(180, data.length * 42)}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 0 }} barCategoryGap="30%">
          <defs>
            <linearGradient id="clientBarGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#f0a868" />
              <stop offset="100%" stopColor="#a0622e" />
            </linearGradient>
          </defs>
          <XAxis type="number" allowDecimals={false} hide />
          <YAxis
            type="category"
            dataKey="client"
            width={110}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fontWeight: 800, fill: '#334155' }}
          />
          <RTooltip content={<ChartTooltip unit=" orders" />} cursor={{ fill: 'rgba(200,131,74,0.08)' }} />
          <Bar dataKey="orders" name="Orders" fill="url(#clientBarGrad)" radius={[0, 8, 8, 0]} barSize={22} animationDuration={700}>
            <LabelList dataKey="orders" position="right" style={{ fontSize: 12, fontWeight: 900, fill: '#a0622e' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Top Bottleneck Styles: real data already fetched for the Risk Alerts tab,
   surfaced here too so the biggest production risks are visible at a glance. ── */
function BottleneckStylesChart({ stageAlerts }) {
  const data = useMemo(() => {
    return [...stageAlerts]
      .map((a) => ({
        styleName: a.style || a.style_name || 'Unknown Style',
        gap: a.gap || a.pieces_gap || 0,
        stage: a.stage || a.lagging_stage || 'N/A',
      }))
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 6);
  }, [stageAlerts]);

  if (data.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center py-10">
        <CheckCircle2 className="w-8 h-8 text-emerald-300" />
        <p className="text-slate-400 text-xs font-bold">No production bottlenecks right now.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4">
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 44)}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 36, bottom: 0, left: 0 }} barCategoryGap="28%">
          <defs>
            <linearGradient id="bottleneckGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
          </defs>
          <XAxis type="number" allowDecimals={false} hide />
          <YAxis
            type="category"
            dataKey="styleName"
            width={150}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fontWeight: 800, fill: '#334155' }}
          />
          <RTooltip content={<ChartTooltip unit=" pcs gap" />} cursor={{ fill: 'rgba(220,38,38,0.08)' }} />
          <Bar dataKey="gap" name="Pieces gap" fill="url(#bottleneckGrad)" radius={[0, 8, 8, 0]} barSize={22} animationDuration={700}>
            <LabelList dataKey="gap" position="right" style={{ fontSize: 12, fontWeight: 900, fill: '#dc2626' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const ANALYTICS_TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'risk', label: 'Risk Alerts', icon: AlertCircle },
  { id: 'explorer', label: 'Orders Explorer', icon: Warehouse },
];

export default function AnalyticsDashboard() {
  const { token } = useAuth();
  const { orders: liveOrders } = useData();

  const [overview, setOverview] = useState(null);
  const [stageAlerts, setStageAlerts] = useState([]);
  const [freightAlerts, setFreightAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [clientOrderCounts, setClientOrderCounts] = useState([]);
  const [loadingClientCounts, setLoadingClientCounts] = useState(true);
  const orders = liveOrders || [];
  const riskCount = freightAlerts.length + stageAlerts.length;

  useEffect(() => {
    if (!token) return;
    let isMounted = true;
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const todayDate = new Date().toISOString().slice(0, 10);
        const [overviewData, stageData, freightData] = await Promise.all([
          apiGetAnalyticsOverview(token).catch(() => null),
          apiGetStageSpreadAlerts(token).catch(() => []),
          apiGetFreightRiskAlerts(token, todayDate).catch(() => []),
        ]);

        if (isMounted) {
          setOverview(overviewData);
          setStageAlerts(Array.isArray(stageData) ? stageData : []);
          setFreightAlerts(Array.isArray(freightData) ? freightData : []);
        }
      } catch {
        if (isMounted) setError('Failed to load analytics dashboard');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchAnalytics();
    return () => { isMounted = false; };
  }, [token]);

  // Real per-client order counts (raw order records carry no client name, so this
  // is sourced from the explorer endpoint, same one OrdersExplorer relies on).
  useEffect(() => {
    if (!token) return;
    let isMounted = true;
    apiGetAnalyticsExplore(token)
      .then((data) => {
        if (!isMounted || !data?.clients) return;
        const counts = data.clients
          .map((c) => ({ client: c.client_name, orders: (c.orders || []).length }))
          .filter((c) => c.orders > 0)
          .sort((a, b) => b.orders - a.orders)
          .slice(0, 6);
        setClientOrderCounts(counts);
      })
      .catch(() => {})
      .finally(() => { if (isMounted) setLoadingClientCounts(false); });
    return () => { isMounted = false; };
  }, [token]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4"
        style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #fdfbf7 0%, #f4efe6 45%, #ecdec7 100%)' }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-white/60 border border-white/80 shadow-sm">
          <Loader2 className="w-8 h-8 animate-spin text-[#c8834a]" />
        </div>
        <p className="font-black text-slate-400 tracking-widest uppercase text-xs">Crunching Factory Data…</p>
      </div>
    );
  }

  return (
    <div
      className="relative min-h-screen -m-6 p-4 sm:p-8 pb-16 overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #fdfbf7 0%, #f4efe6 45%, #ecdec7 100%)' }}
    >
      {/* ambient depth blobs */}
      <div className="absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full blur-3xl pointer-events-none" style={{ background: 'radial-gradient(closest-side, rgba(200,131,74,0.14), transparent)' }} />
      <div className="absolute top-[40%] -left-32 w-[380px] h-[380px] rounded-full blur-3xl pointer-events-none" style={{ background: 'radial-gradient(closest-side, rgba(37,99,235,0.08), transparent)' }} />

      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative z-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md shadow-[#c8834a]/20"
              style={{ background: 'linear-gradient(135deg, #c8834a, #a0622e)' }}>
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Live</span>
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#2d1f0e] mb-1">
            Analytics &amp; Operations
          </h1>
          <p className="text-slate-500 font-medium text-sm">Live factory intelligence and proactive risk alerts.</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-2xl text-red-500 text-sm font-bold bg-red-50 border border-red-100">
          {error}
        </div>
      )}

      {/* ── Tab Bar ── */}
      <div
        className="flex items-center gap-1 p-1.5 rounded-2xl mb-8 w-full sm:w-fit overflow-x-auto relative z-10 bg-white"
        style={{ boxShadow: '0 8px 24px -12px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.04)' }}
      >
        {ANALYTICS_TABS.map((tab) => {
          const isActiveTab = activeTab === tab.id;
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 shrink-0 transition-colors cursor-pointer"
              style={{ color: isActiveTab ? '#ffffff' : '#7a6050' }}
            >
              {isActiveTab && (
                <motion.span
                  layoutId="analyticsTabPill"
                  className="absolute inset-0 rounded-xl"
                  style={{ background: 'linear-gradient(135deg, #c8834a, #a0622e)', boxShadow: '0 4px 14px rgba(200,131,74,0.35)' }}
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}
              <TabIcon className="w-3.5 h-3.5 relative z-10" />
              <span className="relative z-10">{tab.label}</span>
              {tab.id === 'risk' && riskCount > 0 && (
                <span
                  className="relative z-10 ml-0.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] flex items-center justify-center font-black"
                  style={{ background: isActiveTab ? 'rgba(255,255,255,0.25)' : 'rgba(220,38,38,0.12)', color: isActiveTab ? '#fff' : '#dc2626' }}
                >
                  {riskCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} variants={tabFade} initial="hidden" animate="show" exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}>

          {/* ── OVERVIEW TAB ── */}
          {activeTab === 'overview' && (
            <motion.div variants={chartStagger} initial="hidden" animate="show" className="space-y-6 relative z-10">
              {overview && (
                <motion.div variants={chartStagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    icon={Users}
                    label="Total Clients"
                    value={overview.clients || 0}
                    iconColor="#c8834a"
                  />
                  <StatCard
                    icon={Scissors}
                    label="Active Styles"
                    value={overview.styles || 0}
                    iconColor={CHART_BLUE}
                  />
                  <StatCard
                    icon={Box}
                    label="Pieces Ordered"
                    value={overview.total_pieces_ordered || overview.total_pieces || 0}
                    iconColor="#16a34a"
                  />
                  <StatCard
                    icon={Zap}
                    label="Events Logged"
                    value={overview.total_operations_logged || overview.events_count || 0}
                    iconColor="#6d28d9"
                  />
                </motion.div>
              )}

              <motion.div variants={chartStagger} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ORDER HEALTH DONUT */}
                <motion.div variants={tabFade} className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #16a34a, #16a34acc)', boxShadow: '0 6px 16px #16a34a55' }}>
                      <PieChartIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-black text-[#1a120a] text-base">Order Health</h3>
                      <p className="text-slate-500 text-[11px] font-medium">On track vs air-freight risk, by order count.</p>
                    </div>
                  </div>
                  <div className="rounded-2xl overflow-hidden min-h-[260px] flex flex-col bg-white" style={{ boxShadow: '0 16px 32px -16px rgba(22,163,74,0.35), 0 2px 8px rgba(0,0,0,0.04)' }}>
                    <OrderHealthChart totalOrders={orders.length} freightAlerts={freightAlerts} />
                  </div>
                </motion.div>

                {/* ORDERS BY CLIENT BAR */}
                <motion.div variants={tabFade} className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #c8834a, #a0622e)', boxShadow: '0 6px 16px #c8834a55' }}>
                      <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-black text-[#1a120a] text-base">Orders by Client</h3>
                      <p className="text-slate-500 text-[11px] font-medium">Top clients ranked by order volume.</p>
                    </div>
                  </div>
                  <div className="rounded-2xl overflow-hidden min-h-[260px] flex flex-col justify-center bg-white" style={{ boxShadow: '0 16px 32px -16px rgba(200,131,74,0.35), 0 2px 8px rgba(0,0,0,0.04)' }}>
                    <ClientOrdersChart data={clientOrderCounts} loading={loadingClientCounts} />
                  </div>
                </motion.div>
              </motion.div>

              {/* TOP BOTTLENECK STYLES */}
              <motion.div variants={tabFade} className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #f97316, #dc2626)', boxShadow: '0 6px 16px #dc262655' }}>
                    <AlertCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-black text-[#1a120a] text-base">Top Bottleneck Styles</h3>
                    <p className="text-slate-500 text-[11px] font-medium">Styles with the biggest stage-completion gap right now.</p>
                  </div>
                </div>
                <div className="rounded-2xl overflow-hidden min-h-[260px] flex flex-col bg-white" style={{ boxShadow: '0 16px 32px -16px rgba(220,38,38,0.3), 0 2px 8px rgba(0,0,0,0.04)' }}>
                  <BottleneckStylesChart stageAlerts={stageAlerts} />
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ── RISK ALERTS TAB ── */}
          {activeTab === 'risk' && (
            <motion.div variants={chartStagger} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
              {/* FREIGHT RISK */}
              <motion.div variants={tabFade} className="rounded-2xl overflow-hidden shadow-sm flex flex-col h-[520px]" style={{ border: '1px solid rgba(255,255,255,0.9)' }}>
                <div className="flex items-center justify-between gap-3 px-5 py-4 shrink-0" style={{ background: 'linear-gradient(135deg, #c8834a, #a0622e)' }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.4)' }}>
                      <Plane className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black text-white text-base truncate">Freight Risk Alerts</h3>
                      <p className="text-[11px] font-medium truncate" style={{ color: 'rgba(255,255,255,0.8)' }}>Orders near sea-cutoff requiring Air Freight.</p>
                    </div>
                  </div>
                  {freightAlerts.length > 0 && (
                    <span className="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-black text-white" style={{ background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.4)' }}>
                      {freightAlerts.length} Alert{freightAlerts.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <div className="relative flex-1 flex flex-col min-h-0"
                  style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(20px)' }}>
                  {freightAlerts.length > 0 ? (
                    <>
                      <div className="overflow-y-auto flex-1 p-2">
                        {freightAlerts.map((alert, i) => (
                          <div key={i} className="p-4 mb-2 rounded-xl bg-white/80 border border-white shadow-sm transition-transform hover:-translate-y-0.5">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="font-black text-slate-800 text-sm">{alert.order_number || alert.order_id || 'Unknown Order'}</h4>
                                <p className="text-slate-500 text-xs font-medium mt-0.5">{alert.style_name || alert.style || 'N/A'} — {alert.client_name || alert.client || 'N/A'}</p>
                              </div>
                              <span className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] font-black text-red-600 bg-red-50 border border-red-100">
                                <AlertCircle className="w-3 h-3" /> RISK
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] p-2.5 rounded-lg bg-red-50/50 border border-red-100/50">
                              <div className="flex items-center gap-1.5 text-red-700 font-semibold bg-white px-2 py-1 rounded-md shadow-sm">
                                <Ship className="w-3.5 h-3.5" />
                                Cutoff: <span className="font-black text-red-600">{alert.sea_cutoff_date || 'N/A'}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-amber-700 font-semibold bg-white px-2 py-1 rounded-md shadow-sm">
                                <Box className="w-3.5 h-3.5" />
                                Progress: <span className="font-black text-amber-600">
                                  {Math.round(((alert.completed_qty || alert.completed_pieces || 0) / (alert.ordered_qty || alert.total_pieces || 1)) * 100)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(253,251,247,0.9), transparent)' }} />
                    </>
                  ) : (
                    <div className="text-center flex flex-col items-center justify-center flex-1 gap-3">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-emerald-50 border border-emerald-100">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                      </div>
                      <p className="font-black text-slate-600">No Freight Risks</p>
                      <p className="text-slate-400 text-xs">All orders safely within sea-cutoff buffers.</p>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* STAGE SPREAD — glowed as the tab's focal card */}
              <div className="relative">
                <div
                  className="absolute -inset-6 rounded-[32px] pointer-events-none"
                  style={{ background: 'radial-gradient(closest-side, rgba(200,131,74,0.22), transparent 75%)' }}
                />
                <motion.div variants={tabFade} className="relative rounded-2xl overflow-hidden shadow-sm flex flex-col h-[520px]" style={{ border: '1px solid rgba(255,255,255,0.9)' }}>
                <div className="flex items-center justify-between gap-3 px-5 py-4 shrink-0" style={{ background: 'linear-gradient(135deg, #c8834a, #a0622e)' }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.4)' }}>
                      <AlertCircle className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black text-white text-base truncate">Stage Spread Alerts</h3>
                      <p className="text-[11px] font-medium truncate" style={{ color: 'rgba(255,255,255,0.8)' }}>Unbalanced production stages — bottlenecks detected.</p>
                    </div>
                  </div>
                  {stageAlerts.length > 0 && (
                    <span className="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-black text-white" style={{ background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.4)' }}>
                      {stageAlerts.length} Alert{stageAlerts.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <div className="relative flex-1 flex flex-col min-h-0"
                  style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(20px)' }}>
                  {stageAlerts.length > 0 ? (
                    <>
                      <div className="overflow-y-auto flex-1 p-2">
                        {stageAlerts.map((alert, i) => (
                          <div key={i} className="p-4 mb-2 rounded-xl bg-white/80 border border-white shadow-sm transition-transform hover:-translate-y-0.5">
                            <div className="flex justify-between items-center mb-3">
                              <div>
                                <h4 className="font-black text-slate-800 text-sm">{alert.style || alert.style_name || 'Unknown Style'}</h4>
                                <p className="text-slate-500 text-xs mt-0.5">Gap: <span className="text-[#c8834a] font-bold">{alert.gap || alert.pieces_gap || 0} pcs</span></p>
                              </div>
                              <span className="px-2.5 py-1 rounded-md text-[9px] font-black text-[#c8834a] bg-orange-50 border border-orange-100">
                                Bottleneck
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100/50">
                                <p className="text-emerald-600 font-bold mb-1 text-[9px] uppercase tracking-wider">Cutting Done</p>
                                <p className="text-emerald-700 font-black text-base">CUTTING</p>
                                <p className="text-emerald-600/80 font-semibold">{alert.cut || alert.cutting_qty || 0} pcs</p>
                              </div>
                              <div className="p-2.5 rounded-xl bg-red-50 border border-red-100/50">
                                <p className="text-red-600 font-bold mb-1 text-[9px] uppercase tracking-wider">Lagging Stage</p>
                                <p className="text-red-700 font-black text-base truncate">{alert.stage || alert.lagging_stage || 'N/A'}</p>
                                <p className="text-red-600/80 font-semibold">{alert.reached_stage || alert.lagging_qty || 0} pcs</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(253,251,247,0.9), transparent)' }} />
                    </>
                  ) : (
                    <div className="text-center flex flex-col items-center justify-center flex-1 gap-3">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-emerald-50 border border-emerald-100">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                      </div>
                      <p className="font-black text-slate-600">No Spread Issues</p>
                      <p className="text-slate-400 text-xs">Production flow is perfectly balanced.</p>
                    </div>
                  )}
                </div>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* ── EXPLORER TAB ── */}
          {activeTab === 'explorer' && (
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white shadow-sm border border-slate-100">
                  <Warehouse className="w-5 h-5 text-[#c8834a]" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-[#2d1f0e]">Orders Explorer</h2>
                  <p className="text-slate-500 text-xs sm:text-sm font-medium">Drill down into order quantities and view structured data.</p>
                </div>
              </div>

              <OrdersExplorer />
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
