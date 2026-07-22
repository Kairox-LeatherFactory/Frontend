'use client';
import { useState, useEffect, useMemo } from 'react';
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
  Zap
} from 'lucide-react';
import { useData } from '@/context/DataContext';

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
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center gap-2">
            <Warehouse className="w-4 h-4 text-slate-500" />
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">Level 1: Client / Order</span>
          </div>
          <div className="p-4">
            <table className="w-full text-left text-xs">
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="p-3 text-slate-500 font-bold w-1/3">Client ID / PO</td>
                  <td className="p-3 text-slate-800 font-mono text-[10px]">{group.rawId}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="p-3 text-slate-500 font-bold">Client Name</td>
                  <td className="p-3 text-[#c8834a] font-black text-sm">{group.client}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="p-3 text-slate-500 font-bold">PO Number</td>
                  <td className="p-3 text-slate-800 font-bold">{group.po}</td>
                </tr>
                <tr>
                  <td className="p-3 text-slate-500 font-bold">Total Styles / Pieces</td>
                  <td className="p-3 text-slate-800 font-bold">
                     <span className="bg-slate-100 px-2 py-1 rounded-md">{treeData?.style_count || 0}</span> / <span className="bg-slate-100 px-2 py-1 rounded-md">{treeData?.piece_count || 0}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* LEVEL 2: Style Data */}
      {style && sDetail && (
        <div className="bg-white rounded-xl border border-[#c8834a]/30 shadow-md overflow-hidden animate-fade-in relative mt-4">
          <div className="bg-[#c8834a]/10 border-b border-[#c8834a]/20 px-4 py-3 flex justify-between items-center gap-2">
            <div className="flex items-center gap-2">
               <Package className="w-4 h-4 text-[#c8834a]" />
               <span className="text-[11px] font-black uppercase tracking-widest text-[#c8834a]">Level 2: Style Data</span>
            </div>
            {!selectedPieceCode && (
               <span className="text-[10px] bg-white text-[#c8834a] px-2 py-1 rounded-lg font-bold">Select a piece below ↓</span>
            )}
          </div>
          <div className="p-4">
            <table className="w-full text-left text-xs mb-4">
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="p-3 text-slate-500 font-bold w-1/3">Style ID</td>
                  <td className="p-3 text-slate-800 font-mono text-[10px]">{style.style_id || style.id}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="p-3 text-slate-500 font-bold">Style Name / Article</td>
                  <td className="p-3 text-slate-800 font-black text-sm">{style.style_name || style.style} <span className="text-slate-400 font-normal">({style.article || sDetail.article})</span></td>
                </tr>
                <tr>
                  <td className="p-3 text-slate-500 font-bold">Total Pieces</td>
                  <td className="p-3 text-slate-800 font-bold"><span className="bg-amber-100 text-amber-800 px-2 py-1 rounded-md">{getPieces(sDetail).length}</span></td>
                </tr>
              </tbody>
            </table>

            {/* Pieces Table inside Level 2 */}
            <div className={`mt-4 border border-slate-200 rounded-lg overflow-x-auto transition-all duration-300 ${selectedPieceCode ? 'opacity-50 h-32 overflow-hidden' : ''}`}>
               <table className="w-full text-left text-xs">
                 <thead className="bg-slate-50 sticky top-0">
                   <tr>
                     <th className="p-3 text-slate-500 font-bold uppercase text-[9px] tracking-wider">Seq</th>
                     <th className="p-3 text-slate-500 font-bold uppercase text-[9px] tracking-wider">Piece Code</th>
                     <th className="p-3 text-slate-500 font-bold uppercase text-[9px] tracking-wider">Colour</th>
                     <th className="p-3 text-slate-500 font-bold uppercase text-[9px] tracking-wider">Size</th>
                     <th className="p-3 text-slate-500 font-bold uppercase text-[9px] tracking-wider">Status</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {getPieces(sDetail).map(p => (
                     <tr key={p.bundle_id} onClick={() => onSelectPiece(p.bundle_id)} className={`cursor-pointer transition-colors ${selectedPieceCode === p.bundle_id ? 'bg-[#c8834a]/10' : 'hover:bg-slate-50'}`}>
                       <td className="p-3 font-bold text-slate-400">#{p.seq}</td>
                       <td className="p-3 font-bold text-slate-700">{p.bundle_id}</td>
                       <td className="p-3">{p.colour}</td>
                       <td className="p-3">{p.size}</td>
                       <td className="p-3"><span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full text-[9px] font-black">{p.current_stage}</span></td>
                     </tr>
                   ))}
                   {getPieces(sDetail).length === 0 && (
                     <tr>
                        <td colSpan="5" className="p-6 text-center text-slate-400 italic">No pieces found for this style.</td>
                     </tr>
                   )}
                 </tbody>
               </table>
            </div>
          </div>
        </div>
      )}

      {/* LEVEL 3: Piece Data */}
      {selectedPieceCode && pieceDetail && (
        <div className="bg-white rounded-xl border border-emerald-500/30 shadow-lg overflow-hidden animate-fade-in relative mt-4">
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-3 flex justify-between items-center gap-2">
            <div className="flex items-center gap-2">
               <Activity className="w-4 h-4 text-emerald-600" />
               <span className="text-[11px] font-black uppercase tracking-widest text-emerald-700">Level 3: Piece Data</span>
            </div>
            <button onClick={() => onSelectPiece(null)} className="text-[10px] font-black bg-white border border-emerald-200 text-emerald-700 px-3 py-1 rounded-lg hover:bg-emerald-100 transition-colors">Close View</button>
          </div>
          <div className="p-4 space-y-4">
             <table className="w-full text-left text-xs">
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="p-3 text-slate-500 font-bold w-1/3">Piece Code</td>
                  <td className="p-3 text-slate-800 font-mono text-[10px] font-bold">{pieceDetail.bundle_id}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="p-3 text-slate-500 font-bold">Colour / Size</td>
                  <td className="p-3 text-slate-800 font-bold">{pieceDetail.colour} / {pieceDetail.size}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="p-3 text-slate-500 font-bold">Current Stage</td>
                  <td className="p-3 text-emerald-700 font-black text-sm">{pieceDetail.current_stage}</td>
                </tr>
              </tbody>
             </table>

             <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">Stage History Details</p>
                <div className="space-y-2">
                  {pieceDetail.stages?.map((st, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-white border border-slate-200 text-[10px] flex justify-between items-center shadow-sm">
                       <div>
                         <div className="flex items-center gap-2">
                           <span className="font-black text-slate-700">{st.stage_label || st.stage_code}</span>
                           {st.is_rework && <span className="bg-red-100 text-red-600 px-1 py-0.5 rounded-[4px] font-bold text-[8px]">REWORK</span>}
                         </div>
                         <div className="text-slate-500 mt-1 font-medium">By: {st.employee_name || 'N/A'}</div>
                       </div>
                       <div className="text-right text-slate-400">
                         <div className="font-bold">{st.work_date}</div>
                         <div className="text-[9px] mt-0.5">{st.logged_at ? new Date(st.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</div>
                       </div>
                    </div>
                  ))}
                  {(!pieceDetail.stages || pieceDetail.stages.length === 0) && (
                     <div className="p-3 text-center text-slate-400 italic text-xs">No stage history logged yet.</div>
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

  // Real Order Tree Cache & Style Detail Cache (Level 2)
  const [orderTrees, setOrderTrees] = useState({});
  const [loadingTree, setLoadingTree] = useState({});
  
  const [styleDetails, setStyleDetails] = useState({}); // styleId -> detail data
  const [loadingStyleDetail, setLoadingStyleDetail] = useState({});

  // Level 3 Piece Traveler View State (Right Panel Inline)
  const [selectedPieceCode, setSelectedPieceCode] = useState(null);
  const [pieceDetail, setPieceDetail] = useState(null);
  const [loadingPiece, setLoadingPiece] = useState(false);

  const orderGroups = useMemo(() => {
    if (exploreData && exploreData.clients) {
      const groups = [];
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
      return groups;
    }

    if (!orders || orders.length === 0) return [];
    const groups = {};
    orders.forEach((styleOrder) => {
      const poNum = styleOrder?.po_number || styleOrder?.order_number || styleOrder?.id || 'ORD-101';
      const clientName = styleOrder?.client || styleOrder?.client_name || 'Client';
      const orderName = `${clientName} (PO: ${poNum})`;

      if (!groups[orderName]) {
        groups[orderName] = { 
          id: orderName, 
          rawId: styleOrder?.id || styleOrder?.order_id || poNum,
          client: clientName, 
          po: poNum, 
          styles: styleOrder.styles || [] 
        };
      }
    });
    return Object.values(groups);
  }, [orders, exploreData]);

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
          console.log('[StyleDetail] response keys:', Object.keys(detailData));
          console.log('[StyleDetail] pieces field:', detailData.pieces);
          console.log('[StyleDetail] full data:', detailData);
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
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 px-2 sticky top-0 pt-1 pb-2"
           style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', zIndex: 10 }}>
          Orders Explorer
        </p>

        {orderGroups.map((group) => {
          const fetchedTree = orderTrees[group.rawId];
          const displayStyles = fetchedTree?.styles || group.styles || [];

          return (
            <div key={group.id} className="flex flex-col gap-0.5">
              <div
                onClick={() => { toggleOrder(group); setActiveItem({ type: 'order', data: group }); setSelectedPieceCode(null); setPieceDetail(null); }}
                className="flex items-center gap-2 p-2.5 rounded-xl cursor-pointer transition-all duration-200 group"
                style={{
                  background: activeItem?.data?.id === group.id ? 'rgba(200,131,74,0.1)' : 'transparent',
                  border: activeItem?.data?.id === group.id ? '1px solid rgba(200,131,74,0.2)' : '1px solid transparent',
                }}
              >
                {expandedOrders[group.id]
                  ? <ChevronDown className="w-3.5 h-3.5 text-[#c8834a] shrink-0" />
                  : <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 shrink-0 transition-colors" />}
                <Warehouse className="w-3.5 h-3.5 text-[#c8834a] shrink-0" />
                <span className={`font-bold text-xs truncate select-none ${activeItem?.data?.id === group.id ? 'text-[#2d1f0e]' : 'text-slate-600 group-hover:text-slate-800'} transition-colors`}>
                  {group.id}
                </span>
                {loadingTree[group.id] && <Loader2 className="w-3 h-3 animate-spin text-[#c8834a] ml-auto" />}
              </div>

              {expandedOrders[group.id] && (
                <div className="pl-5 flex flex-col gap-0.5 ml-3 border-l border-slate-200/50 mt-0.5">
                  {displayStyles.length === 0 && !loadingTree[group.id] && (
                    <span className="text-[10px] text-slate-400 p-2 italic">No styles found</span>
                  )}
                  {displayStyles.map((style, sIdx) => {
                    const styleId = style.style_id || style.id || `style-${sIdx}`;
                    const styleName = style.style_name || style.style || style.style_code || 'Unknown Style';
                    
                    return (
                      <div key={styleId} className="flex flex-col gap-0.5">
                        <div
                          onClick={() => toggleStyle(style, group)}
                          className="flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all duration-200 group"
                          style={{
                            background: activeItem?.data?.style_id === styleId ? 'rgba(255,255,255,0.8)' : 'transparent',
                            border: activeItem?.data?.style_id === styleId ? '1px solid #c8834a' : '1px solid transparent',
                          }}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {expandedStyles[styleId]
                              ? <ChevronDown className="w-3 h-3 text-[#c8834a] shrink-0" />
                              : <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 shrink-0 transition-colors" />}
                            <Package className="w-3 h-3 text-amber-500/80 shrink-0" />
                            <span className="font-semibold text-[11px] truncate text-slate-700">
                              {styleName}
                            </span>
                          </div>
                          {loadingStyleDetail[styleId] && <Loader2 className="w-3 h-3 animate-spin text-[#c8834a] shrink-0" />}
                        </div>

                        {/* Level 3: Pieces list under this style in sidebar */}
                        {expandedStyles[styleId] && styleDetails[styleId] && (
                          <div className="pl-4 flex flex-col gap-0.5 ml-3 border-l border-amber-200/60 mt-0.5">
                            {getPieces(styleDetails[styleId]).length === 0 && (
                              <span className="text-[10px] text-slate-400 p-2 italic">No pieces found</span>
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
                                  className="flex items-center gap-2 p-1.5 rounded-md cursor-pointer transition-all duration-150 group"
                                  style={{
                                    background: isActivePiece ? 'rgba(16,185,129,0.08)' : 'transparent',
                                    border: isActivePiece ? '1px solid rgba(16,185,129,0.3)' : '1px solid transparent',
                                  }}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: isActivePiece ? '#10b981' : '#cbd5e1' }} />
                                  <span className={`text-[10px] font-mono truncate ${isActivePiece ? 'text-emerald-700 font-bold' : 'text-slate-500 group-hover:text-slate-700'}`}>
                                    {pieceCode}
                                  </span>
                                  <span className="ml-auto text-[9px] font-bold shrink-0" style={{ color: '#c8834a' }}>
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
      <div className="flex-1 rounded-2xl overflow-hidden flex flex-col min-h-[400px]" style={glassPanelStyle}>
        <div className="px-6 py-4 flex justify-between items-center shrink-0 border-b border-white/50 bg-white/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#c8834a]/10 border border-[#c8834a]/20">
              <Activity className="w-4 h-4 text-[#c8834a]" />
            </div>
            <div>
              <p className="font-black text-[#2d1f0e] text-sm">Response Data Viewer</p>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                Hierarchical Stacked Tables
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 relative">
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

function StatCard({ icon: Icon, label, value, gradient, iconColor }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-6 flex flex-col gap-3 group transition-transform duration-300 hover:-translate-y-1 cursor-default"
      style={{
        background: gradient,
        border: '1px solid rgba(255,255,255,0.7)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
      }}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 60%)' }} />
      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/60 border border-white/80">
        <Icon className="w-5 h-5" style={{ color: iconColor }} />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
        <p className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight">{value}</p>
      </div>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const { token } = useAuth();

  const [overview, setOverview] = useState(null);
  const [stageAlerts, setStageAlerts] = useState([]);
  const [freightAlerts, setFreightAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4"
        style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #fdfbf7 0%, #f4efe6 100%)' }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-white/60 border border-white/80 shadow-sm">
          <Loader2 className="w-8 h-8 animate-spin text-[#c8834a]" />
        </div>
        <p className="font-black text-slate-400 tracking-widest uppercase text-xs">Crunching Factory Data…</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen -m-6 p-4 sm:p-8 pb-16"
      style={{ background: 'linear-gradient(135deg, #fdfbf7 0%, #f4efe6 100%)' }}
    >
      <div className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative z-10">
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

      <div className="space-y-12">
        <div className="space-y-6 relative z-10">
          {overview && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={Users}
                label="Total Clients"
                value={overview.clients || 0}
                gradient="linear-gradient(135deg, rgba(200,131,74,0.1), rgba(255,255,255,0.6))"
                iconColor="#c8834a"
              />
              <StatCard
                icon={Scissors}
                label="Active Styles"
                value={overview.styles || 0}
                gradient="linear-gradient(135deg, rgba(139,92,246,0.1), rgba(255,255,255,0.6))"
                iconColor="#8b5cf6"
              />
              <StatCard
                icon={Box}
                label="Pieces Ordered"
                value={(overview.total_pieces_ordered || overview.total_pieces || 0).toLocaleString()}
                gradient="linear-gradient(135deg, rgba(59,130,246,0.1), rgba(255,255,255,0.6))"
                iconColor="#3b82f6"
              />
              <StatCard
                icon={Zap}
                label="Events Logged"
                value={(overview.total_operations_logged || overview.events_count || 0).toLocaleString()}
                gradient="linear-gradient(135deg, rgba(16,185,129,0.1), rgba(255,255,255,0.6))"
                iconColor="#10b981"
              />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* FREIGHT RISK */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-red-100 border border-red-200">
                    <Plane className="w-4 h-4 text-red-500" />
                  </div>
                  <div>
                    <h3 className="font-black text-[#2d1f0e] text-base">Freight Risk Alerts</h3>
                    <p className="text-slate-500 text-[11px] font-medium">Orders near sea-cutoff requiring Air Freight.</p>
                  </div>
                </div>
                {freightAlerts.length > 0 && (
                  <span className="sm:ml-auto self-start px-2.5 py-1 rounded-full text-[10px] font-black text-red-600 bg-red-100 border border-red-200">
                    {freightAlerts.length} Alert{freightAlerts.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <div className="rounded-2xl overflow-hidden h-[300px] flex flex-col shadow-sm"
                style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.9)', backdropFilter: 'blur(20px)' }}>
                {freightAlerts.length > 0 ? (
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
                ) : (
                  <div className="p-14 text-center flex flex-col items-center justify-center flex-1 gap-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-emerald-50 border border-emerald-100">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    </div>
                    <p className="font-black text-slate-600">No Freight Risks</p>
                    <p className="text-slate-400 text-xs">All orders safely within sea-cutoff buffers.</p>
                  </div>
                )}
              </div>
            </div>

            {/* STAGE SPREAD */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[#c8834a]/10 border border-[#c8834a]/20">
                    <AlertCircle className="w-4 h-4 text-[#c8834a]" />
                  </div>
                  <div>
                    <h3 className="font-black text-[#2d1f0e] text-base">Stage Spread Alerts</h3>
                    <p className="text-slate-500 text-[11px] font-medium">Unbalanced production stages — bottlenecks detected.</p>
                  </div>
                </div>
                {stageAlerts.length > 0 && (
                  <span className="sm:ml-auto self-start px-2.5 py-1 rounded-full text-[10px] font-black text-[#c8834a] bg-[#c8834a]/10 border border-[#c8834a]/20">
                    {stageAlerts.length} Alert{stageAlerts.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <div className="rounded-2xl overflow-hidden h-[300px] flex flex-col shadow-sm"
                style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.9)', backdropFilter: 'blur(20px)' }}>
                {stageAlerts.length > 0 ? (
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
                ) : (
                  <div className="p-14 text-center flex flex-col items-center justify-center flex-1 gap-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-emerald-50 border border-emerald-100">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    </div>
                    <p className="font-black text-slate-600">No Spread Issues</p>
                    <p className="text-slate-400 text-xs">Production flow is perfectly balanced.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6 relative z-10" style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
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
      </div>
    </div>
  );
}
// 'use client';
// import { useState, useEffect, useMemo } from 'react';
// import { useAuth } from '@/context/AuthContext';
// import {
//   apiGetAnalyticsOverview,
//   apiGetStageSpreadAlerts,
//   apiGetFreightRiskAlerts
// } from '@/lib/api';
// import {
//   TrendingUp,
//   AlertCircle,
//   Plane,
//   Box,
//   Users,
//   Scissors,
//   Loader2,
//   Ship,
//   CheckCircle2,
//   ChevronDown,
//   ArrowRight,
//   Warehouse,
//   Package,
//   Activity,
//   Zap
// } from 'lucide-react';
// import { useData } from '@/context/DataContext';

// /* ── Real API Integrated OrdersExplorer ─────────────────────────────────── */
// import { apiGetOrderTree } from '@/lib/api';

// function OrdersExplorer() {
//   const { token } = useAuth();
//   const { orders: realOrders } = useData();
//   const orders = useMemo(() => realOrders || [], [realOrders]);

//   const [expandedOrders, setExpandedOrders] = useState({});
//   const [expandedStyles, setExpandedStyles] = useState({});
//   const [activeItem, setActiveItem] = useState(null);

//   // Real Order Tree Cache (API-லிருந்து வரும் Styles & Stage counts)
//   const [orderTrees, setOrderTrees] = useState({});
//   const [loadingTree, setLoadingTree] = useState({});

//   const orderGroups = useMemo(() => {
//     if (!orders || orders.length === 0) return [];
//     const groups = {};
//     orders.forEach((styleOrder) => {
//       const poNum = styleOrder?.po_number || styleOrder?.order_number || styleOrder?.id || 'ORD-101';
//       const clientName = styleOrder?.client || styleOrder?.client_name || 'Client';
//       const orderName = `${clientName} (PO: ${poNum})`;

//       if (!groups[orderName]) {
//         groups[orderName] = { 
//           id: orderName, 
//           rawId: styleOrder?.id || styleOrder?.order_id || poNum, // 👈 Real Order ID for API
//           client: clientName, 
//           po: poNum, 
//           styles: styleOrder.styles || [] 
//         };
//       }
//     });
//     return Object.values(groups);
//   }, [orders]);

  
//   const toggleOrder = async (group) => {
//     const groupId = group.id;
//     const isExpanding = !expandedOrders[groupId];
//     setExpandedOrders((prev) => ({ ...prev, [groupId]: isExpanding }));

//     if (isExpanding && group.rawId && !orderTrees[group.rawId]) {
//       setLoadingTree((prev) => ({ ...prev, [groupId]: true }));
//       try {
//         const treeData = await apiGetOrderTree(token, group.rawId);
//         if (treeData) {
//           setOrderTrees((prev) => ({ ...prev, [group.rawId]: treeData }));
//         }
//       } catch (err) {
//         console.error("Failed to fetch tree for order:", group.rawId, err);
//       } finally {
//         setLoadingTree((prev) => ({ ...prev, [groupId]: false }));
//       }
//     }
//   };

//   const toggleStyle = (id) => setExpandedStyles((prev) => ({ ...prev, [id]: !prev[id] }));

//   const glassPanelStyle = {
//     background: 'rgba(255,255,255,0.7)',
//     backdropFilter: 'blur(20px)',
//     border: '1px solid rgba(255,255,255,0.8)',
//     boxShadow: '0 8px 32px rgba(139, 107, 74, 0.08)',
//   };

//   return (
//     <div className="flex flex-col lg:flex-row gap-5 lg:h-[72vh]">
//       {/* ── Left Sidebar ── */}
//       <div
//         className="w-full lg:w-[35%] rounded-2xl p-4 overflow-y-auto flex flex-col gap-1 min-h-[300px]"
//         style={glassPanelStyle}
//       >
//         <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 px-2 sticky top-0 pt-1 pb-2"
//            style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', zIndex: 10 }}>
//           Orders Explorer
//         </p>

//         {orderGroups.map((group) => {
//           const fetchedTree = orderTrees[group.rawId];
          
//           const displayStyles = fetchedTree?.styles || group.styles || [];

//           return (
//             <div key={group.id} className="flex flex-col gap-0.5">
//               <div
//                 onClick={() => { toggleOrder(group); setActiveItem({ type: 'order', data: group }); }}
//                 className="flex items-center gap-2 p-2.5 rounded-xl cursor-pointer transition-all duration-200 group"
//                 style={{
//                   background: activeItem?.data?.id === group.id ? 'rgba(200,131,74,0.1)' : 'transparent',
//                   border: activeItem?.data?.id === group.id ? '1px solid rgba(200,131,74,0.2)' : '1px solid transparent',
//                 }}
//               >
//                 {expandedOrders[group.id]
//                   ? <ChevronDown className="w-3.5 h-3.5 text-[#c8834a] shrink-0" />
//                   : <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 shrink-0 transition-colors" />}
//                 <Warehouse className="w-3.5 h-3.5 text-[#c8834a] shrink-0" />
//                 <span className={`font-bold text-xs truncate select-none ${activeItem?.data?.id === group.id ? 'text-[#2d1f0e]' : 'text-slate-600 group-hover:text-slate-800'} transition-colors`}>
//                   {group.id}
//                 </span>
//                 {loadingTree[group.id] && <Loader2 className="w-3 h-3 animate-spin text-[#c8834a] ml-auto" />}
//               </div>

//               {expandedOrders[group.id] && (
//                 <div className="pl-5 flex flex-col gap-0.5 ml-3 border-l border-slate-200/50 mt-0.5">
//                   {displayStyles.length === 0 && !loadingTree[group.id] && (
//                     <span className="text-[10px] text-slate-400 p-2 italic">No styles found</span>
//                   )}
//                   {displayStyles.map((style, sIdx) => {
//                     const styleId = style.style_id || style.id || `style-${sIdx}`;
//                     const styleName = style.style_name || style.style || style.style_code || 'Unknown Style';
                    
//                     return (
//                       <div key={styleId} className="flex flex-col gap-0.5">
//                         <div
//                           onClick={() => { toggleStyle(styleId); setActiveItem({ type: 'style', data: style, parent: group }); }}
//                           className="flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all duration-200 group"
//                           style={{
//                             background: activeItem?.data?.style_id === styleId || activeItem?.data?.id === styleId ? 'rgba(255,255,255,0.6)' : 'transparent',
//                             border: activeItem?.data?.style_id === styleId || activeItem?.data?.id === styleId ? '1px solid rgba(255,255,255,1)' : '1px solid transparent',
//                           }}
//                         >
//                           <div className="flex items-center gap-2 truncate">
//                             {expandedStyles[styleId]
//                               ? <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
//                               : <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-slate-500 shrink-0 transition-colors" />}
//                             <Package className="w-3 h-3 text-amber-500/80 shrink-0" />
//                             <span className="font-semibold text-[11px] truncate text-slate-700">
//                               {styleName}
//                             </span>
//                           </div>
//                           {style.piece_count && (
//                             <span className="text-[9px] font-black bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded shrink-0">
//                               {style.piece_count} pcs
//                             </span>
//                           )}
//                         </div>

//                         {/* Stage Distribution Chips */}
//                         {expandedStyles[styleId] && style.stage_counts && (
//                           <div className="pl-5 pr-2 py-1.5 flex flex-wrap gap-1 bg-white/40 rounded-lg ml-2 border border-white/60 my-1">
//                             {Object.entries(style.stage_counts).map(([stage, count]) => (
//                               <span key={stage} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
//                                 {stage}: {count}
//                               </span>
//                             ))}
//                           </div>
//                         )}
//                       </div>
//                     );
//                   })}
//                 </div>
//               )}
//             </div>
//           );
//         })}

//         {orderGroups.length === 0 && (
//           <div className="text-center py-12 text-slate-300 text-xs font-bold">No Orders Available</div>
//         )}
//       </div>

//       {/* ── Right Panel (Response Data Viewer) ── */}
//       <div className="flex-1 rounded-2xl overflow-hidden flex flex-col min-h-[400px]" style={glassPanelStyle}>
//         <div className="px-6 py-4 flex justify-between items-center shrink-0 border-b border-white/50 bg-white/40">
//           <div className="flex items-center gap-3">
//             <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#c8834a]/10 border border-[#c8834a]/20">
//               <Activity className="w-4 h-4 text-[#c8834a]" />
//             </div>
//             <div>
//               <p className="font-black text-[#2d1f0e] text-sm">Response Data Viewer</p>
//               <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Real-time Object Tree</p>
//             </div>
//           </div>
//           {activeItem && (
//             <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase text-[#c8834a] bg-[#c8834a]/10 border border-[#c8834a]/20">
//               {activeItem.type} Selected
//             </span>
//           )}
//         </div>

//         <div className="flex-1 overflow-y-auto p-6 relative">
//           {activeItem ? (
//             <div className="relative z-10 space-y-4">
//               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//                 {Object.entries(activeItem.data).map(([key, value]) => {
//                   if (typeof value === 'object' && value !== null) {
//                     return (
//                       <div key={key} className="col-span-full p-4 rounded-xl bg-white/50 border border-white/80">
//                         <span className="text-[9px] font-black uppercase tracking-widest text-[#c8834a]">
//                           {key.replace(/_/g, ' ')}
//                         </span>
//                         <pre className="text-xs font-mono text-slate-700 mt-2 overflow-x-auto p-2 bg-slate-50/50 rounded-lg">
//                           {JSON.stringify(value, null, 2)}
//                         </pre>
//                       </div>
//                     );
//                   }
//                   return (
//                     <div key={key} className="p-4 rounded-xl bg-white/40 border border-white/60">
//                       <span className="text-[9px] font-black uppercase tracking-widest text-[#c8834a]/80">
//                         {key.replace(/_/g, ' ')}
//                       </span>
//                       <span className="block text-slate-700 font-medium text-sm truncate mt-0.5">
//                         {value?.toString() || '—'}
//                       </span>
//                     </div>
//                   );
//                 })}
//               </div>
//             </div>
//           ) : (
//             <div className="flex-1 flex flex-col items-center justify-center h-full text-center py-16">
//               <Warehouse className="w-10 h-10 text-slate-300 mb-2" />
//               <p className="font-black text-slate-400 text-base">Select an Item</p>
//               <p className="text-slate-400/60 text-xs mt-1">Click an Order or Style to view real backend response</p>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

// function StatCard({ icon: Icon, label, value, gradient, iconColor }) {
//   return (
//     <div
//       className="relative overflow-hidden rounded-2xl p-6 flex flex-col gap-3 group transition-transform duration-300 hover:-translate-y-1 cursor-default"
//       style={{
//         background: gradient,
//         border: '1px solid rgba(255,255,255,0.7)',
//         backdropFilter: 'blur(20px)',
//         boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
//       }}
//     >
//       <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
//         style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 60%)' }} />
//       <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/60 border border-white/80">
//         <Icon className="w-5 h-5" style={{ color: iconColor }} />
//       </div>
//       <div>
//         <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
//         <p className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight">{value}</p>
//       </div>
//     </div>
//   );
// }

// export default function AnalyticsDashboard() {
//   const { token } = useAuth();

//   const [overview, setOverview] = useState(null);
//   const [stageAlerts, setStageAlerts] = useState([]);
//   const [freightAlerts, setFreightAlerts] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');

//   useEffect(() => {
//     if (!token) return;
//     let isMounted = true;
//     const fetchAnalytics = async () => {
//       setLoading(true);
//       try {
//         const todayDate = new Date().toISOString().slice(0, 10);
//         const [overviewData, stageData, freightData] = await Promise.all([
//           apiGetAnalyticsOverview(token).catch(() => null),
//           apiGetStageSpreadAlerts(token).catch(() => []),
//           apiGetFreightRiskAlerts(token, todayDate).catch(() => []),
//         ]);

//         if (isMounted) {
//           setOverview(overviewData);
//           setStageAlerts(Array.isArray(stageData) ? stageData : []);
//           setFreightAlerts(Array.isArray(freightData) ? freightData : []);
//         }
//       } catch {
//         if (isMounted) setError('Failed to load analytics dashboard');
//       } finally {
//         if (isMounted) setLoading(false);
//       }
//     };
//     fetchAnalytics();
//     return () => { isMounted = false; };
//   }, [token]);

//   if (loading) {
//     return (
//       <div className="flex flex-col items-center justify-center py-32 gap-4"
//         style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #fdfbf7 0%, #f4efe6 100%)' }}>
//         <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-white/60 border border-white/80 shadow-sm">
//           <Loader2 className="w-8 h-8 animate-spin text-[#c8834a]" />
//         </div>
//         <p className="font-black text-slate-400 tracking-widest uppercase text-xs">Crunching Factory Data…</p>
//       </div>
//     );
//   }

//   return (
//     <div
//       className="min-h-screen -m-6 p-4 sm:p-8 pb-16"
//       style={{ background: 'linear-gradient(135deg, #fdfbf7 0%, #f4efe6 100%)' }}
//     >
//       <div className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative z-10">
//         <div>
//           <div className="flex items-center gap-3 mb-2">
//             <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md shadow-[#c8834a]/20"
//               style={{ background: 'linear-gradient(135deg, #c8834a, #a0622e)' }}>
//               <TrendingUp className="w-5 h-5 text-white" />
//             </div>
//             <div className="flex items-center gap-2">
//               <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
//               <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Live</span>
//             </div>
//           </div>
//           <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#2d1f0e] mb-1">
//             Analytics &amp; Operations
//           </h1>
//           <p className="text-slate-500 font-medium text-sm">Live factory intelligence and proactive risk alerts.</p>
//         </div>
//       </div>

//       {error && (
//         <div className="mb-6 p-4 rounded-2xl text-red-500 text-sm font-bold bg-red-50 border border-red-100">
//           {error}
//         </div>
//       )}

//       <div className="space-y-12">
//         <div className="space-y-6 relative z-10">
//           {overview && (
//             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
//               <StatCard
//                 icon={Users}
//                 label="Total Clients"
//                 value={overview.clients || 0}
//                 gradient="linear-gradient(135deg, rgba(200,131,74,0.1), rgba(255,255,255,0.6))"
//                 iconColor="#c8834a"
//               />
//               <StatCard
//                 icon={Scissors}
//                 label="Active Styles"
//                 value={overview.styles || 0}
//                 gradient="linear-gradient(135deg, rgba(139,92,246,0.1), rgba(255,255,255,0.6))"
//                 iconColor="#8b5cf6"
//               />
//               <StatCard
//                 icon={Box}
//                 label="Pieces Ordered"
//                 value={(overview.total_pieces_ordered || overview.total_pieces || 0).toLocaleString()}
//                 gradient="linear-gradient(135deg, rgba(59,130,246,0.1), rgba(255,255,255,0.6))"
//                 iconColor="#3b82f6"
//               />
//               <StatCard
//                 icon={Zap}
//                 label="Events Logged"
//                 value={(overview.total_operations_logged || overview.events_count || 0).toLocaleString()}
//                 gradient="linear-gradient(135deg, rgba(16,185,129,0.1), rgba(255,255,255,0.6))"
//                 iconColor="#10b981"
//               />
//             </div>
//           )}

//           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//             {/* FREIGHT RISK */}
//             <div className="flex flex-col gap-4">
//               <div className="flex flex-col sm:flex-row sm:items-center gap-3">
//                 <div className="flex items-center gap-3">
//                   <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-red-100 border border-red-200">
//                     <Plane className="w-4 h-4 text-red-500" />
//                   </div>
//                   <div>
//                     <h3 className="font-black text-[#2d1f0e] text-base">Freight Risk Alerts</h3>
//                     <p className="text-slate-500 text-[11px] font-medium">Orders near sea-cutoff requiring Air Freight.</p>
//                   </div>
//                 </div>
//                 {freightAlerts.length > 0 && (
//                   <span className="sm:ml-auto self-start px-2.5 py-1 rounded-full text-[10px] font-black text-red-600 bg-red-100 border border-red-200">
//                     {freightAlerts.length} Alert{freightAlerts.length > 1 ? 's' : ''}
//                   </span>
//                 )}
//               </div>

//               <div className="rounded-2xl overflow-hidden h-[300px] flex flex-col shadow-sm"
//                 style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.9)', backdropFilter: 'blur(20px)' }}>
//                 {freightAlerts.length > 0 ? (
//                   <div className="overflow-y-auto flex-1 p-2">
//                     {freightAlerts.map((alert, i) => (
//                       <div key={i} className="p-4 mb-2 rounded-xl bg-white/80 border border-white shadow-sm transition-transform hover:-translate-y-0.5">
//                         <div className="flex justify-between items-start mb-3">
//                           <div>
//                             <h4 className="font-black text-slate-800 text-sm">{alert.order_number || alert.order_id || 'Unknown Order'}</h4>
//                             <p className="text-slate-500 text-xs font-medium mt-0.5">{alert.style_name || alert.style || 'N/A'} — {alert.client_name || alert.client || 'N/A'}</p>
//                           </div>
//                           <span className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] font-black text-red-600 bg-red-50 border border-red-100">
//                             <AlertCircle className="w-3 h-3" /> RISK
//                           </span>
//                         </div>
//                         <div className="flex flex-wrap items-center gap-2 text-[11px] p-2.5 rounded-lg bg-red-50/50 border border-red-100/50">
//                           <div className="flex items-center gap-1.5 text-red-700 font-semibold bg-white px-2 py-1 rounded-md shadow-sm">
//                             <Ship className="w-3.5 h-3.5" />
//                             Cutoff: <span className="font-black text-red-600">{alert.sea_cutoff_date || 'N/A'}</span>
//                           </div>
//                           <div className="flex items-center gap-1.5 text-amber-700 font-semibold bg-white px-2 py-1 rounded-md shadow-sm">
//                             <Box className="w-3.5 h-3.5" />
//                             Progress: <span className="font-black text-amber-600">
//                               {Math.round(((alert.completed_qty || alert.completed_pieces || 0) / (alert.ordered_qty || alert.total_pieces || 1)) * 100)}%
//                             </span>
//                           </div>
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 ) : (
//                   <div className="p-14 text-center flex flex-col items-center justify-center flex-1 gap-3">
//                     <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-emerald-50 border border-emerald-100">
//                       <CheckCircle2 className="w-6 h-6 text-emerald-500" />
//                     </div>
//                     <p className="font-black text-slate-600">No Freight Risks</p>
//                     <p className="text-slate-400 text-xs">All orders safely within sea-cutoff buffers.</p>
//                   </div>
//                 )}
//               </div>
//             </div>

//             {/* STAGE SPREAD */}
//             <div className="flex flex-col gap-4">
//               <div className="flex flex-col sm:flex-row sm:items-center gap-3">
//                 <div className="flex items-center gap-3">
//                   <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[#c8834a]/10 border border-[#c8834a]/20">
//                     <AlertCircle className="w-4 h-4 text-[#c8834a]" />
//                   </div>
//                   <div>
//                     <h3 className="font-black text-[#2d1f0e] text-base">Stage Spread Alerts</h3>
//                     <p className="text-slate-500 text-[11px] font-medium">Unbalanced production stages — bottlenecks detected.</p>
//                   </div>
//                 </div>
//                 {stageAlerts.length > 0 && (
//                   <span className="sm:ml-auto self-start px-2.5 py-1 rounded-full text-[10px] font-black text-[#c8834a] bg-[#c8834a]/10 border border-[#c8834a]/20">
//                     {stageAlerts.length} Alert{stageAlerts.length > 1 ? 's' : ''}
//                   </span>
//                 )}
//               </div>

//               <div className="rounded-2xl overflow-hidden h-[300px] flex flex-col shadow-sm"
//                 style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.9)', backdropFilter: 'blur(20px)' }}>
//                 {stageAlerts.length > 0 ? (
//                   <div className="overflow-y-auto flex-1 p-2">
//                     {stageAlerts.map((alert, i) => (
//                       <div key={i} className="p-4 mb-2 rounded-xl bg-white/80 border border-white shadow-sm transition-transform hover:-translate-y-0.5">
//                         <div className="flex justify-between items-center mb-3">
//                           <div>
//                             <h4 className="font-black text-slate-800 text-sm">{alert.style || alert.style_name || 'Unknown Style'}</h4>
//                             <p className="text-slate-500 text-xs mt-0.5">Gap: <span className="text-[#c8834a] font-bold">{alert.gap || alert.pieces_gap || 0} pcs</span></p>
//                           </div>
//                           <span className="px-2.5 py-1 rounded-md text-[9px] font-black text-[#c8834a] bg-orange-50 border border-orange-100">
//                             Bottleneck
//                           </span>
//                         </div>

//                         <div className="grid grid-cols-2 gap-2 text-xs">
//                           <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100/50">
//                             <p className="text-emerald-600 font-bold mb-1 text-[9px] uppercase tracking-wider">Cutting Done</p>
//                             <p className="text-emerald-700 font-black text-base">CUTTING</p>
//                             <p className="text-emerald-600/80 font-semibold">{alert.cut || alert.cutting_qty || 0} pcs</p>
//                           </div>
//                           <div className="p-2.5 rounded-xl bg-red-50 border border-red-100/50">
//                             <p className="text-red-600 font-bold mb-1 text-[9px] uppercase tracking-wider">Lagging Stage</p>
//                             <p className="text-red-700 font-black text-base truncate">{alert.stage || alert.lagging_stage || 'N/A'}</p>
//                             <p className="text-red-600/80 font-semibold">{alert.reached_stage || alert.lagging_qty || 0} pcs</p>
//                           </div>
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 ) : (
//                   <div className="p-14 text-center flex flex-col items-center justify-center flex-1 gap-3">
//                     <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-emerald-50 border border-emerald-100">
//                       <CheckCircle2 className="w-6 h-6 text-emerald-500" />
//                     </div>
//                     <p className="font-black text-slate-600">No Spread Issues</p>
//                     <p className="text-slate-400 text-xs">Production flow is perfectly balanced.</p>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>
//         </div>

//         <div className="pt-6 relative z-10" style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
//           <div className="flex items-center gap-3 mb-6">
//             <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white shadow-sm border border-slate-100">
//               <Warehouse className="w-5 h-5 text-[#c8834a]" />
//             </div>
//             <div>
//               <h2 className="text-xl sm:text-2xl font-black text-[#2d1f0e]">Orders Explorer</h2>
//               <p className="text-slate-500 text-xs sm:text-sm font-medium">Drill down into order quantities and view structured data.</p>
//             </div>
//           </div>

//           <OrdersExplorer />
//         </div>
//       </div>
//     </div>
//   );
// }