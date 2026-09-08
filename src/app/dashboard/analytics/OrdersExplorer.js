'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';

import { useData } from '@/context/DataContext';
import {
  useLazyGetAnalyticsExploreQuery,
  useLazyGetStyleDetailQuery,
  useLazyGetPieceDetailQuery
} from '@/store/slices/analyticsApiSlice';
import { useLazyGetOrderTreeQuery } from '@/store/slices/progressapiSlice';

import {
  ChevronDown,
  ArrowRight,
  Warehouse,
  Package,
  Activity,
  Search,
  Loader2
} from 'lucide-react';
import HierarchyViewer from './HierarchyViewer';
import  getPieces from './utils';
export default function OrdersExplorer() {

  const { orders: realOrders } = useData();
  const orders = useMemo(() => realOrders || [], [realOrders]);
  const [exploreData, setExploreData] = useState(null);
  const [loadingExplore, setLoadingExplore] = useState(true);

  // Read deep-link params from entry page
  const searchParams = useSearchParams();
  const deepStyleName = searchParams.get('style_name');
  const deepOrderNumber = searchParams.get('order_number');
  const autoLinkedRef = useRef(false); // run auto-link only once
  const [triggerGetExplore, { isFetching: exploreFetching }] = useLazyGetAnalyticsExploreQuery();
  const [triggerGetOrderTree] = useLazyGetOrderTreeQuery();
  const [triggerGetStyleDetail] = useLazyGetStyleDetailQuery();
  const [triggerGetPieceDetail] = useLazyGetPieceDetailQuery();

  useEffect(() => {
    async function loadExploreData() {
      try {
        const data = await triggerGetExplore().unwrap();
        setExploreData(data);
      } catch (err) {
        console.error("Failed to load analytics explore data:", err);
      } finally {
        setLoadingExplore(false);
      }
    }
    loadExploreData();
  }, []);


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
        const treeData = await triggerGetOrderTree(group.rawId).unwrap();
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
        const detailData = await triggerGetStyleDetail(styleId).unwrap();

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
      const data = await triggerGetPieceDetail({ pieceCode }).unwrap();

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
      triggerGetOrderTree(targetGroup.rawId).unwrap()
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
        triggerGetStyleDetail(styleId).unwrap()
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

  }, [deepStyleName, deepOrderNumber, exploreData]);
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
          const isReleasedOnly = (s) => !s.production_status || s.production_status === 'RELEASED';
          // Analytics tracks real production — a style still sitting DRAFT
          // (never released) has no minted pieces to explore, so only
          // released styles belong in this list. While the real per-order
          // tree is still loading, group.styles (from the lighter overview
          // fetch) doesn't carry production_status at all, so every style
          // passes the filter and the full unreleased list flashes for a
          // moment before narrowing once fetchedTree arrives — show nothing
          // during that window instead of the misleading full list.
          const displayStyles = fetchedTree
            ? (fetchedTree.styles || []).filter(isReleasedOnly)
            : isTreeLoading ? [] : (group.styles || []).filter(isReleasedOnly);

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