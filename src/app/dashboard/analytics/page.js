
'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';

import { useAuth } from '@/context/AuthContext';
import {
  apiGetAnalyticsExplore,
  apiGetOrderTree,
  apiGetStyleDetail,
  apiGetPieceDetail
} from '@/lib/api';
import {
  TrendingUp,
  Loader2,
  ChevronDown,
  ArrowRight,
  Warehouse,
  Package,
  Activity,
  Search,
} from 'lucide-react';
import { useData } from '@/context/DataContext';

const tabFade = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
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

// Stage ranking ensuring Lining Cutting comes directly after Leather Cutting
function getStageRank(st) {
  const rawKey = String(st?.stage || st?.stage_code || st?.label || st?.stage_label || st?.stage_name || '')
    .toUpperCase()
    .replace(/[\s-]+/g, '_');

  if (rawKey.includes('LEATHER_CUT') || rawKey === 'CUTTING') return 1;
  if (rawKey.includes('LINING_CUT') || rawKey === 'LINING' || rawKey.includes('LINE_CUT')) return 2;
  if (rawKey.includes('FUS')) return 3;
  if (rawKey.includes('PAST')) return 4;
  if (rawKey.includes('LINE_STITCH')) return 5;
  if (rawKey.includes('SHELL_STITCH') || rawKey.includes('STITCH')) return 6;
  if (rawKey.includes('FINAL_FINISH') || rawKey.includes('FINISH')) return 7;
  if (rawKey.includes('INSPECT')) return 8;
  if (rawKey.includes('EXPORT') || rawKey.includes('PACKAGE')) return 9;
  return 99;
}

function HierarchyViewer({ activeItem, orderTrees, styleDetails, selectedPieceCode, pieceDetail, onSelectPiece, loadingPiece }) {
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

  const sortedStages = useMemo(() => {
    if (!pieceDetail?.stages || !Array.isArray(pieceDetail.stages)) return [];
    return [...pieceDetail.stages].sort((a, b) => getStageRank(a) - getStageRank(b));
  }, [pieceDetail?.stages]);

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
      {selectedPieceCode && (
        <div className="bg-white rounded-2xl border border-emerald-500/30 shadow-lg overflow-hidden animate-fade-in relative mt-4">
          <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-3.5 flex justify-between items-center gap-2">
            <div className="flex items-center gap-2.5">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-black uppercase tracking-widest text-emerald-700">Level 3 · Piece Traveler</span>
            </div>
            <button onClick={() => onSelectPiece(null)} className="text-xs font-black bg-white border border-emerald-200 text-emerald-700 px-3.5 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors shrink-0 cursor-pointer">Close View</button>
          </div>
          {loadingPiece ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <span className="text-xs font-bold">Loading Piece Details…</span>
            </div>
          ) : pieceDetail ? (
            <div className="p-6 space-y-6">
              <div>
                <p className="text-xl font-black text-[#2d1f0e] font-mono">{pieceDetail.bundle_id || pieceDetail.piece_code || pieceDetail.code || pieceDetail.piece_id || selectedPieceCode}</p>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  {(pieceDetail.style_name || pieceDetail.style) && (
                    <span className="text-sm text-slate-700 font-bold">{pieceDetail.style_name || pieceDetail.style}</span>
                  )}
                  {(pieceDetail.colour || pieceDetail.color || pieceDetail.size) && (
                    <span className="text-sm text-slate-500 font-semibold">{pieceDetail.colour || pieceDetail.color} {pieceDetail.size ? `/ ${pieceDetail.size}` : ''}</span>
                  )}
                  {(pieceDetail.current_stage || pieceDetail.current_stage_label || pieceDetail.status) && (
                    <span className="text-emerald-700 font-black bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full text-xs">
                      {pieceDetail.current_stage_label || pieceDetail.current_stage || pieceDetail.status}
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                <p className="text-xs font-black uppercase text-slate-400 mb-4 tracking-widest">Stage History Details</p>
                <div className="space-y-3">
                  {sortedStages.map((st, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-white border border-slate-200 flex justify-between items-center shadow-sm gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-slate-700 text-sm">
                            {st.label || st.stage_label || st.stage_name || st.stage || st.stage_code}
                          </span>
                          {st.is_rework && <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-md font-bold text-[10px]">REWORK</span>}
                          {st.state && (
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                              st.state === 'completed'
                                ? 'bg-emerald-100 text-emerald-700'
                                : st.state === 'in_progress'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {st.state}
                            </span>
                          )}
                        </div>
                        <div className="text-slate-500 mt-1 font-medium text-sm">By {st.employee_name || st.worker_name || 'N/A'}</div>
                      </div>
                      <div className="text-right text-slate-400 shrink-0">
                        <div className="font-bold text-sm">{st.work_date || st.date}</div>
                        <div className="text-xs mt-0.5">
                          {st.logged_at
                            ? (isNaN(new Date(st.logged_at).getTime())
                                ? st.logged_at
                                : new Date(st.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
                            : (st.time || '')}
                        </div>
                      </div>
                    </div>
                  ))}
                  {sortedStages.length === 0 && (
                    <div className="p-4 text-center text-slate-400 italic text-sm">No stage history logged yet.</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 italic text-sm">Could not load piece details.</div>
          )}
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
          const isTreeLoading = !!loadingTree[group.id];
          const displayStyles = fetchedTree?.styles || (group.rawId ? [] : (group.styles || []));

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
                {isTreeLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#c8834a] ml-auto" />}
              </div>

              {expandedOrders[group.id] && (
                <div className="pl-5 flex flex-col gap-0.5 ml-3 border-l border-slate-200/50 mt-0.5">
                  {isTreeLoading ? (
                    <div className="flex items-center gap-2 p-2.5 text-xs text-slate-400 font-bold animate-pulse">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#c8834a]" />
                      <span>Loading minted styles…</span>
                    </div>
                  ) : displayStyles.length === 0 ? (
                    <span className="text-xs text-slate-400 p-2 italic">No minted styles found</span>
                  ) : (
                    displayStyles.map((style, sIdx) => {
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
                    })
                  )}
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

export default function AnalyticsDashboard() {
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
          <p className="text-slate-500 font-medium text-sm">Live factory intelligence and order exploration.</p>
        </div>
      </div>

      <motion.div variants={tabFade} initial="hidden" animate="show" className="relative z-10">
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
      </motion.div>
    </div>
  );
}
