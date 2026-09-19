'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Activity } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import {
  apiGetAnalyticsExplore,
  apiGetOrderTree,
  apiGetStyleDetail,
  apiGetPieceDetail,
} from '@/lib/api';
import { glassPanelStyle } from '../_lib/constants';
import OrdersSidebar from './sidebar/OrdersSidebar';
import HierarchyViewer from './HierarchyViewer';

/**
 * OrdersExplorer Component
 *
 * Master interactive explorer for factory orders, styles, and piece-level travelers.
 * Layout consists of:
 *   1. Left Sidebar: Interactive navigation tree with search filtering and dynamic node expansion.
 *   2. Right Viewport: Hierarchical 3-tier inspector displaying structured level cards.
 *
 * Supports deep-linking via query parameters (`?order_number=...&style_name=...`),
 * lazy fetching of order trees, and automatic scrolling to target cards.
 *
 * @returns {JSX.Element} Full orders explorer interface.
 */
export default function OrdersExplorer() {
  const { token } = useAuth();
  const { orders: realOrders } = useData();
  const orders = useMemo(() => realOrders || [], [realOrders]);

  const [exploreData, setExploreData] = useState(null);
  const [loadingExplore, setLoadingExplore] = useState(true);

  // Read deep-link params from URL query string
  const searchParams = useSearchParams();
  const deepStyleName = searchParams.get('style_name');
  const deepOrderNumber = searchParams.get('order_number');
  const autoLinkedRef = useRef(false);

  // Initial load of analytics exploration dataset
  useEffect(() => {
    let isCancelled = false;
    async function loadExploreData() {
      if (!token) return;
      try {
        const data = await apiGetAnalyticsExplore(token);
        if (!isCancelled) setExploreData(data);
      } catch (err) {
        console.error('Failed to load analytics explore data:', err);
      } finally {
        if (!isCancelled) setLoadingExplore(false);
      }
    }
    loadExploreData();
    return () => {
      isCancelled = true;
    };
  }, [token]);

  // Expansion and active selection states
  const [expandedOrders, setExpandedOrders] = useState({});
  const [expandedStyles, setExpandedStyles] = useState({});
  const [activeItem, setActiveItem] = useState(null);
  const sidebarRef = useRef(null);
  const styleRefs = useRef({});

  // Level 1: Order Tree Cache & Loading States
  const [orderTrees, setOrderTrees] = useState({});
  const [loadingTree, setLoadingTree] = useState({});

  // Level 2: Style Detail Cache & Loading States
  const [styleDetails, setStyleDetails] = useState({});
  const [loadingStyleDetail, setLoadingStyleDetail] = useState({});

  // Level 3: Piece Traveler Inspection State
  const [selectedPieceCode, setSelectedPieceCode] = useState(null);
  const [pieceDetail, setPieceDetail] = useState(null);
  const [loadingPiece, setLoadingPiece] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Computes filtered orders for the search match counter
  const filteredOrders = useMemo(() => {
    const dataList = orders || [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return dataList;

    return dataList
      .map((clientGroup) => {
        const clientName = String(clientGroup?.client_name || '').toLowerCase();
        const matchingOrders = (clientGroup?.orders || []).filter((ord) => {
          const orderNum = String(ord?.order_number || '').toLowerCase();
          const matchingStyles = (ord?.styles || []).some(
            (sty) =>
              String(sty?.style_name || '').toLowerCase().includes(q) ||
              String(sty?.article || '').toLowerCase().includes(q)
          );
          return clientName.includes(q) || orderNum.includes(q) || matchingStyles;
        });

        if (clientName.includes(q) || matchingOrders.length > 0) {
          return {
            ...clientGroup,
            orders: matchingOrders.length > 0 ? matchingOrders : clientGroup.orders,
          };
        }
        return null;
      })
      .filter(Boolean);
  }, [orders, searchQuery]);

  // Formats and prioritizes order groups according to search queries
  const orderGroups = useMemo(() => {
    let groups = [];

    if (exploreData && exploreData.clients) {
      exploreData.clients.forEach((client) => {
        client.orders?.forEach((order) => {
          const orderName = `${client.client_name} (PO: ${order.order_number})`;
          groups.push({
            id: orderName,
            rawId: order.order_id,
            client: client.client_name,
            po: order.order_number,
            styles: order.styles || [],
          });
        });
      });
    } else if (orders && orders.length > 0) {
      const mapGroups = {};
      orders.forEach((styleOrder) => {
        const poNum =
          styleOrder?.po_number ||
          styleOrder?.order_number ||
          styleOrder?.id ||
          'ORD-101';
        const clientName = styleOrder?.client || styleOrder?.client_name || 'Client';
        const orderName = `${clientName} (PO: ${poNum})`;

        if (!mapGroups[orderName]) {
          mapGroups[orderName] = {
            id: orderName,
            rawId: styleOrder?.id || styleOrder?.order_id || poNum,
            client: clientName,
            po: poNum,
            styles: styleOrder.styles || [],
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
        a.styles.some((s) =>
          String(s.style_name || s.style || '').toLowerCase().includes(q)
        );

      const matchB =
        String(b.client).toLowerCase().includes(q) ||
        String(b.po).toLowerCase().includes(q) ||
        b.styles.some((s) =>
          String(s.style_name || s.style || '').toLowerCase().includes(q)
        );

      if (matchA && !matchB) return -1;
      if (!matchA && matchB) return 1;
      return 0;
    });
  }, [orders, exploreData, searchQuery]);

  /**
   * Toggles expansion of an order group node and lazily loads its order tree from the server.
   *
   * @param {Object} group - Order group object.
   */
  const toggleOrder = async (group) => {
    const groupId = group.id;
    const isExpanding = !expandedOrders[groupId];
    setExpandedOrders((prev) => ({ ...prev, [groupId]: isExpanding }));

    setActiveItem({ type: 'order', data: group });
    setSelectedPieceCode(null);
    setPieceDetail(null);

    if (isExpanding && group.rawId && !orderTrees[group.rawId]) {
      setLoadingTree((prev) => ({ ...prev, [groupId]: true }));
      try {
        const treeData = await apiGetOrderTree(token, group.rawId);
        if (treeData) {
          setOrderTrees((prev) => ({ ...prev, [group.rawId]: treeData }));
        }
      } catch (err) {
        console.error('Failed to fetch tree for order:', group.rawId, err);
      } finally {
        setLoadingTree((prev) => ({ ...prev, [groupId]: false }));
      }
    }
  };

  /**
   * Toggles expansion of a style node under an order and lazily loads style piece details.
   *
   * @param {Object} style - Style object.
   * @param {Object} parentGroup - Parent order group object.
   */
  const toggleStyle = async (style, parentGroup) => {
    const styleId = style.style_id || style.id;
    const isExpanding = !expandedStyles[styleId];
    setExpandedStyles((prev) => ({ ...prev, [styleId]: isExpanding }));

    setSelectedPieceCode(null);
    setPieceDetail(null);
    setActiveItem({ type: 'style', data: style, parentGroup });

    if (isExpanding && styleId && !styleDetails[styleId]) {
      setLoadingStyleDetail((prev) => ({ ...prev, [styleId]: true }));
      try {
        const detailData = await apiGetStyleDetail(token, styleId);
        if (detailData) {
          setStyleDetails((prev) => ({ ...prev, [styleId]: detailData }));
        }
      } catch (err) {
        console.error('Failed to fetch style detail for:', styleId, err);
      } finally {
        setLoadingStyleDetail((prev) => ({ ...prev, [styleId]: false }));
      }
    }
  };

  /**
   * Fetches and displays Level 3 piece traveler logs for a clicked piece code.
   *
   * @param {string} pieceCode - Scannable barcode / piece code string.
   */
  const handleSelectPiece = async (pieceCode) => {
    if (!pieceCode) {
      setSelectedPieceCode(null);
      setPieceDetail(null);
      return;
    }
    setSelectedPieceCode(pieceCode);
    setLoadingPiece(true);
    try {
      const data = await apiGetPieceDetail(token, { piece_code: pieceCode });
      if (data) {
        setPieceDetail(data);
      }
    } catch (err) {
      console.error('Failed to fetch piece detail:', err);
    } finally {
      setLoadingPiece(false);
    }
  };

  /**
   * Selection handler when clicking a piece link in the left sidebar tree.
   */
  const handleSelectPieceItem = (piece, style, group) => {
    const pieceCode = piece.bundle_id || piece.piece_code || piece.piece_id;
    setActiveItem({
      type: 'piece',
      data: piece,
      parentStyle: style,
      parentGroup: group,
    });
    handleSelectPiece(pieceCode);
  };

  // ── Auto-link from entry page (runs once after exploreData loads) ────
  useEffect(() => {
    if (!exploreData || autoLinkedRef.current) return;
    if (!deepStyleName && !deepOrderNumber) return;
    autoLinkedRef.current = true;

    let targetGroup = null;
    let targetStyle = null;

    for (const client of exploreData.clients || []) {
      for (const order of client.orders || []) {
        const orderMatches =
          !deepOrderNumber || String(order.order_number) === String(deepOrderNumber);
        if (!orderMatches) continue;

        if (deepStyleName) {
          const matchedStyle = (order.styles || []).find(
            (s) =>
              String(s.style_name || '').toLowerCase() === deepStyleName.toLowerCase()
          );

          if (matchedStyle) {
            const orderName = `${client.client_name} (PO: ${order.order_number})`;
            targetGroup = {
              id: orderName,
              rawId: order.order_id,
              client: client.client_name,
              po: order.order_number,
              styles: order.styles || [],
            };
            targetStyle = matchedStyle;
            break;
          }
        } else {
          const orderName = `${client.client_name} (PO: ${order.order_number})`;
          targetGroup = {
            id: orderName,
            rawId: order.order_id,
            client: client.client_name,
            po: order.order_number,
            styles: order.styles || [],
          };
          break;
        }
      }
      if (targetGroup) break;
    }

    if (!targetGroup) return;

    setExpandedOrders((prev) => ({ ...prev, [targetGroup.id]: true }));

    if (targetGroup.rawId && !orderTrees[targetGroup.rawId]) {
      apiGetOrderTree(token, targetGroup.rawId)
        .then((treeData) => {
          if (treeData)
            setOrderTrees((prev) => ({ ...prev, [targetGroup.rawId]: treeData }));
        })
        .catch(console.error);
    }

    if (targetStyle) {
      const styleId = targetStyle.style_id || targetStyle.id;
      setExpandedStyles((prev) => ({ ...prev, [styleId]: true }));
      setActiveItem({ type: 'style', data: targetStyle, parentGroup: targetGroup });

      if (styleId && !styleDetails[styleId]) {
        setLoadingStyleDetail((prev) => ({ ...prev, [styleId]: true }));
        apiGetStyleDetail(token, styleId)
          .then((detailData) => {
            if (detailData)
              setStyleDetails((prev) => ({ ...prev, [styleId]: detailData }));
          })
          .catch(console.error)
          .finally(() =>
            setLoadingStyleDetail((prev) => ({ ...prev, [styleId]: false }))
          );
      }

      setTimeout(() => {
        const el = styleRefs.current[styleId];
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 400);
    } else {
      setActiveItem({ type: 'order', data: targetGroup, parentGroup: targetGroup });
      setTimeout(() => {
        const el = sidebarRef.current?.querySelector(
          `[data-order-id="${targetGroup.id}"]`
        );
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 400);
    }
  }, [deepStyleName, deepOrderNumber, exploreData, token, orderTrees, styleDetails]);

  return (
    <div className="flex flex-col lg:flex-row gap-5 lg:min-h-[72vh]">
      {/* Left Navigation Tree Sidebar */}
      <OrdersSidebar
        orderGroups={orderGroups}
        totalOrdersCount={filteredOrders.length}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        expandedOrders={expandedOrders}
        onToggleOrder={toggleOrder}
        expandedStyles={expandedStyles}
        onToggleStyle={toggleStyle}
        activeItem={activeItem}
        onSelectPieceItem={handleSelectPieceItem}
        selectedPieceCode={selectedPieceCode}
        orderTrees={orderTrees}
        loadingTree={loadingTree}
        styleDetails={styleDetails}
        loadingStyleDetail={loadingStyleDetail}
        sidebarRef={sidebarRef}
        styleRefs={styleRefs}
        glassPanelStyle={glassPanelStyle}
      />

      {/* Right Multi-Level Response Viewport */}
      <div
        className="flex-1 rounded-2xl overflow-hidden flex flex-col min-h-[400px] max-h-[75vh]"
        style={glassPanelStyle}
      >
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
