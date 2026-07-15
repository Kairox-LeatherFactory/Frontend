'use client';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  apiGetAnalyticsOverview,
  apiGetStageSpreadAlerts,
  apiGetFreightRiskAlerts
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

const MOCK_ORDERS = [
  {
    id: 'ORD-1001-STYLE1',
    client: 'Acne Studios',
    style: 'Chelsea Boot - Oxford',
    quantity: 500,
    skus: [
      { code: 'SKU-001', color_name: 'Cognac', size: 'M' },
      { code: 'SKU-002', color_name: 'Cognac', size: 'L' },
    ],
  },
  {
    id: 'ORD-1001-STYLE2',
    client: 'Acne Studios',
    style: 'Derby Shoe',
    quantity: 300,
    skus: [{ code: 'SKU-003', color_name: 'Black', size: 'M' }],
  },
  {
    id: 'ORD-1002-STYLE1',
    client: 'Zara',
    style: 'Leather Jacket',
    quantity: 200,
    skus: [
      { code: 'SKU-004', color_name: 'Brown', size: 'L' },
      { code: 'SKU-005', color_name: 'Brown', size: 'XL' },
    ],
  },
];

function OrdersExplorer() {
  const { orders: realOrders } = useData();
  const orders = realOrders?.length > 0 ? realOrders : MOCK_ORDERS;

  const [expandedOrders, setExpandedOrders] = useState({});
  const [expandedStyles, setExpandedStyles] = useState({});
  const [activeItem, setActiveItem] = useState(null);

  const orderGroups = useMemo(() => {
    if (!orders) return [];
    const groups = {};
    orders.forEach((styleOrder) => {
      const poNum = styleOrder.id.split('-')[1] || 'Unknown';
      const orderName = `${styleOrder.client} (PO: ${poNum})`;
      if (!groups[orderName]) {
        groups[orderName] = { id: orderName, client: styleOrder.client, po: poNum, styles: [] };
      }
      groups[orderName].styles.push(styleOrder);
    });
    return Object.values(groups);
  }, [orders]);

  const toggleOrder = (id) => setExpandedOrders((prev) => ({ ...prev, [id]: !prev[id] }));
  const toggleStyle = (id) => setExpandedStyles((prev) => ({ ...prev, [id]: !prev[id] }));

  // Glass styles for light beige theme
  const glassPanelStyle = {
    background: 'rgba(255,255,255,0.7)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.8)',
    boxShadow: '0 8px 32px rgba(139, 107, 74, 0.08)',
  };

  return (
    <div className="flex flex-col lg:flex-row gap-5 lg:h-[72vh]">
      {/* ── Left Sidebar ── */}
      <div
        className="w-full lg:w-[35%] rounded-2xl p-4 overflow-y-auto flex flex-col gap-1 min-h-[300px]"
        style={glassPanelStyle}
      >
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 px-2 sticky top-0 pt-1 pb-2"
           style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', zIndex: 10 }}>
          Orders Explorer
        </p>

        {orderGroups.map((group) => (
          <div key={group.id} className="flex flex-col gap-0.5">
            <div
              onClick={() => { toggleOrder(group.id); setActiveItem({ type: 'order', data: group }); }}
              className="flex items-center gap-2 p-2.5 rounded-xl cursor-pointer transition-all duration-200 group"
              style={{
                background: activeItem?.data?.id === group.id
                  ? 'rgba(200,131,74,0.1)'
                  : 'transparent',
                border: activeItem?.data?.id === group.id
                  ? '1px solid rgba(200,131,74,0.2)'
                  : '1px solid transparent',
              }}
            >
              {expandedOrders[group.id]
                ? <ChevronDown className="w-3.5 h-3.5 text-[#c8834a] shrink-0" />
                : <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 shrink-0 transition-colors" />}
              <Warehouse className="w-3.5 h-3.5 text-[#c8834a] shrink-0" />
              <span className={`font-bold text-xs truncate select-none ${activeItem?.data?.id === group.id ? 'text-[#2d1f0e]' : 'text-slate-600 group-hover:text-slate-800'} transition-colors`}>
                {group.id}
              </span>
            </div>

            {expandedOrders[group.id] && (
              <div className="pl-5 flex flex-col gap-0.5 ml-3 border-l border-slate-200/50 mt-0.5">
                {group.styles.map((style) => (
                  <div key={style.id} className="flex flex-col gap-0.5">
                    <div
                      onClick={() => { toggleStyle(style.id); setActiveItem({ type: 'style', data: style, parent: group }); }}
                      className="flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all duration-200 group"
                      style={{
                        background: activeItem?.data?.id === style.id ? 'rgba(255,255,255,0.6)' : 'transparent',
                        border: activeItem?.data?.id === style.id ? '1px solid rgba(255,255,255,1)' : '1px solid transparent',
                      }}
                    >
                      {expandedStyles[style.id]
                        ? <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                        : <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-slate-500 shrink-0 transition-colors" />}
                      <Package className="w-3 h-3 text-amber-500/80 shrink-0" />
                      <span className={`font-semibold text-[11px] truncate select-none ${activeItem?.data?.id === style.id ? 'text-[#2d1f0e]' : 'text-slate-500 group-hover:text-slate-700'} transition-colors`}>
                        {style.style}
                      </span>
                    </div>

                    {expandedStyles[style.id] && (
                      <div className="pl-4 flex flex-col gap-0.5 ml-2 border-l border-slate-100 mb-1">
                        {(style.skus || []).map((sku) =>
                          [1, 2].map((n) => {
                            const piece = { id: `${sku.code}-P${n}`, label: `Piece 00${n}`, sku, style, group };
                            return (
                              <div
                                key={piece.id}
                                onClick={() => setActiveItem({ type: 'piece', data: piece })}
                                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all duration-150 group"
                                style={{
                                  background: activeItem?.data?.id === piece.id ? 'rgba(52,211,153,0.1)' : 'transparent',
                                  border: activeItem?.data?.id === piece.id ? '1px solid rgba(52,211,153,0.2)' : '1px solid transparent',
                                }}
                              >
                                <span className="w-1.5 h-1.5 rounded-full shrink-0"
                                  style={{ background: activeItem?.data?.id === piece.id ? '#10b981' : '#cbd5e1' }} />
                                <span className={`text-[10px] truncate select-none font-medium ${activeItem?.data?.id === piece.id ? 'text-emerald-700' : 'text-slate-400 group-hover:text-slate-600'} transition-colors`}>
                                  {sku.color_name} · {sku.size} · {piece.label}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {orderGroups.length === 0 && (
          <div className="text-center py-12 text-slate-300 text-xs font-bold">No Orders Available</div>
        )}
      </div>

      {/* ── Right Panel ── */}
      <div
        className="flex-1 rounded-2xl overflow-hidden flex flex-col min-h-[400px]"
        style={glassPanelStyle}
      >
        {/* Panel Header */}
        <div className="px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0 border-b border-white/50 bg-white/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                 style={{ background: 'rgba(200,131,74,0.1)', border: '1px solid rgba(200,131,74,0.2)' }}>
              <Activity className="w-4 h-4 text-[#c8834a]" />
            </div>
            <div>
              <p className="font-black text-[#2d1f0e] text-sm">Response Data</p>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Live Data Viewer</p>
            </div>
          </div>
          {activeItem && (
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-[#c8834a]"
                  style={{ background: 'rgba(200,131,74,0.1)', border: '1px solid rgba(200,131,74,0.2)' }}>
              {activeItem.type} Selected
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 relative">
          {/* Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
            <span className="text-[60px] sm:text-[100px] font-black rotate-[-8deg] tracking-tight"
                  style={{ color: 'rgba(200,131,74,0.03)' }}>response</span>
          </div>

          {activeItem ? (
            <div className="relative z-10 space-y-4">
              {/* Table */}
              <div className="overflow-hidden rounded-2xl bg-white/50 border border-white/80">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/60 border-b border-slate-100">
                    <tr>
                      {['Piece', 'Style', 'Order'].map((h) => (
                        <th key={h} className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/50">
                    {activeItem.type === 'piece' && (
                      <tr className="hover:bg-white/40 transition-colors">
                        <td className="p-4 text-slate-700 font-semibold">{activeItem.data.label} ({activeItem.data.sku.size})</td>
                        <td className="p-4 text-slate-500">{activeItem.data.style.style}</td>
                        <td className="p-4 text-slate-500">{activeItem.data.group.po}</td>
                      </tr>
                    )}
                    {activeItem.type === 'style' && (activeItem.data.skus || []).map((sku, idx) => (
                      <tr key={idx} className="hover:bg-white/40 transition-colors">
                        <td className="p-4 text-slate-400 italic text-sm">All pieces ({sku.size})</td>
                        <td className="p-4 text-slate-700 font-semibold">{activeItem.data.style}</td>
                        <td className="p-4 text-slate-500">{activeItem.parent.po}</td>
                      </tr>
                    ))}
                    {activeItem.type === 'order' && activeItem.data.styles.map((style, idx) => (
                      <tr key={idx} className="hover:bg-white/40 transition-colors">
                        <td className="p-4 text-slate-400 italic text-sm">All pieces</td>
                        <td className="p-4 text-slate-700 font-semibold">{style.style}</td>
                        <td className="p-4 text-slate-500">{activeItem.data.po}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Detail Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(activeItem.data).map(([key, value]) => {
                  if (typeof value === 'object' && value !== null) return null;
                  return (
                    <div key={key} className="p-4 rounded-xl flex flex-col gap-1.5 transition-colors bg-white/40 hover:bg-white/60 border border-white/60">
                      <span className="text-[9px] font-black uppercase tracking-widest text-[#c8834a]/80">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <span className="text-slate-700 font-medium text-sm truncate" title={value?.toString()}>
                        {value?.toString() || '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center h-full text-center relative z-10 py-16">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-white/50 border border-white/80">
                <Warehouse className="w-8 h-8 text-slate-300" />
              </div>
              <p className="font-black text-slate-400 text-base">Select an item</p>
              <p className="text-slate-400/60 text-xs mt-1 font-medium">Click any Order, Style, or Piece to view data</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   STAT CARD COMPONENT
───────────────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────── */
export default function AnalyticsDashboard() {
  const { token } = useAuth();

  const [overview, setOverview] = useState(null);
  const [stageAlerts, setStageAlerts] = useState([]);
  const [freightAlerts, setFreightAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const todayDate = new Date().toISOString().slice(0, 10);
        const [overviewData, stageData, freightData] = await Promise.all([
          apiGetAnalyticsOverview(token).catch(() => null),
          apiGetStageSpreadAlerts(token).catch(() => []),
          apiGetFreightRiskAlerts(token, todayDate).catch(() => []),
        ]);
        setOverview(overviewData);
        setStageAlerts(Array.isArray(stageData) ? stageData : []);
        setFreightAlerts(Array.isArray(freightData) ? freightData : []);
      } catch {
        setError('Failed to load analytics dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
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
      {/* ── HERO HEADER ── */}
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
        {/* ── METRICS & ALERTS ── */}
        <div className="space-y-6 relative z-10">
          {/* ── STAT CARDS ── */}
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
                value={(overview.total_pieces_ordered || 0).toLocaleString()}
                gradient="linear-gradient(135deg, rgba(59,130,246,0.1), rgba(255,255,255,0.6))"
                iconColor="#3b82f6"
              />
              <StatCard
                icon={Zap}
                label="Events Logged"
                value={(overview.total_operations_logged || 0).toLocaleString()}
                gradient="linear-gradient(135deg, rgba(16,185,129,0.1), rgba(255,255,255,0.6))"
                iconColor="#10b981"
              />
            </div>
          )}

          {/* ── ALERTS GRID ── */}
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
                            <h4 className="font-black text-slate-800 text-sm">{alert.order_id || 'Unknown Order'}</h4>
                            <p className="text-slate-500 text-xs font-medium mt-0.5">{alert.style_name || 'N/A'} — {alert.client_name || 'N/A'}</p>
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
                              {Math.round(((alert.completed_qty || 0) / (alert.ordered_qty || 1)) * 100)}%
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
                            <h4 className="font-black text-slate-800 text-sm">{alert.style || 'Unknown Style'}</h4>
                            <p className="text-slate-500 text-xs mt-0.5">Gap: <span className="text-[#c8834a] font-bold">{alert.gap} pcs</span></p>
                          </div>
                          <span className="px-2.5 py-1 rounded-md text-[9px] font-black text-[#c8834a] bg-orange-50 border border-orange-100">
                            Bottleneck
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100/50">
                            <p className="text-emerald-600 font-bold mb-1 text-[9px] uppercase tracking-wider">Cutting Done</p>
                            <p className="text-emerald-700 font-black text-base">CUTTING</p>
                            <p className="text-emerald-600/80 font-semibold">{alert.cut || 0} pcs</p>
                          </div>
                          <div className="p-2.5 rounded-xl bg-red-50 border border-red-100/50">
                            <p className="text-red-600 font-bold mb-1 text-[9px] uppercase tracking-wider">Lagging Stage</p>
                            <p className="text-red-700 font-black text-base truncate">{alert.stage || 'N/A'}</p>
                            <p className="text-red-600/80 font-semibold">{alert.reached_stage || 0} pcs</p>
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

        {/* ── ORDERS EXPLORER ── */}
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
