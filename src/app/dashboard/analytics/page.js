'use client';
import { useState, useEffect } from 'react';
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
  Package
} from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';
import { useData } from '@/context/DataContext';

const MOCK_ORDERS = [
  {
    id: 'ORD-1001-STYLE1',
    client: 'Acne Studios',
    style: 'Chelsea Boot - Oxford',
    quantity: 500,
    skus: [
      { code: 'SKU-001', color_name: 'Cognac', size: 'M' },
      { code: 'SKU-002', color_name: 'Cognac', size: 'L' }
    ]
  },
  {
    id: 'ORD-1001-STYLE2',
    client: 'Acne Studios',
    style: 'Derby Shoe',
    quantity: 300,
    skus: [
      { code: 'SKU-003', color_name: 'Black', size: 'M' }
    ]
  },
  {
    id: 'ORD-1002-STYLE1',
    client: 'Zara',
    style: 'Leather Jacket',
    quantity: 200,
    skus: [
      { code: 'SKU-004', color_name: 'Brown', size: 'L' },
      { code: 'SKU-005', color_name: 'Brown', size: 'XL' }
    ]
  }
];

function OrdersExplorer() {
  const { orders: realOrders } = useData();
  const orders = realOrders?.length > 0 ? realOrders : MOCK_ORDERS;

  const [expandedOrders, setExpandedOrders] = useState({});
  const [expandedStyles, setExpandedStyles] = useState({});
  const [activeItem, setActiveItem] = useState(null);

  const orderGroups = require('react').useMemo(() => {
    if (!orders) return [];
    const groups = {};
    orders.forEach(styleOrder => {
      const poNum = styleOrder.id.split('-')[1] || 'Unknown';
      const orderName = `${styleOrder.client} (PO: ${poNum})`;
      if (!groups[orderName]) {
        groups[orderName] = { id: orderName, client: styleOrder.client, po: poNum, styles: [] };
      }
      groups[orderName].styles.push(styleOrder);
    });
    return Object.values(groups);
  }, [orders]);

  const toggleOrder = (id) => setExpandedOrders(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleStyle = (id) => setExpandedStyles(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="flex gap-6 mt-6 h-[70vh]">
      {/* Left Sidebar (Tree View) */}
      <div className="w-1/3 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 overflow-y-auto flex flex-col gap-2 relative">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2 sticky top-0 bg-white z-10 pb-2 border-b border-slate-100">Orders Explorer</h2>
        
        {orderGroups.map(group => (
          <div key={group.id} className="flex flex-col gap-1">
            <div 
              onClick={() => { toggleOrder(group.id); setActiveItem({ type: 'order', data: group }); }}
              className={`flex items-center gap-2 p-2.5 rounded-xl cursor-pointer transition-colors ${activeItem?.data?.id === group.id ? 'bg-[#c8834a]/10 text-[#c8834a]' : 'hover:bg-slate-50 text-slate-700'}`}
            >
              {expandedOrders[group.id] ? <ChevronDown className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              <Warehouse className="w-4 h-4" />
              <span className="font-bold text-sm truncate select-none">{group.id}</span>
            </div>
            
            {expandedOrders[group.id] && (
              <div className="pl-6 flex flex-col gap-1 border-l-2 border-slate-100 ml-4 mt-1">
                {group.styles.map(style => (
                  <div key={style.id} className="flex flex-col gap-1">
                    <div 
                      onClick={() => { toggleStyle(style.id); setActiveItem({ type: 'style', data: style, parent: group }); }}
                      className={`flex items-center gap-2 p-2 rounded-xl cursor-pointer transition-colors ${activeItem?.data?.id === style.id ? 'bg-slate-100 text-[#2d1f0e]' : 'hover:bg-slate-50 text-slate-600'}`}
                    >
                      {expandedStyles[style.id] ? <ChevronDown className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                      <Package className="w-3.5 h-3.5" />
                      <span className="font-semibold text-xs truncate select-none">{style.style}</span>
                    </div>
                    
                    {expandedStyles[style.id] && (
                      <div className="pl-6 flex flex-col gap-1 border-l-2 border-slate-100 ml-3 mt-1 mb-1">
                        {(style.skus || []).map((sku) => {
                          const pieces = [1, 2].map(n => ({ id: `${sku.code}-Piece-${n}`, label: `Piece 00${n}`, sku, style, group }));
                          return pieces.map(piece => (
                            <div 
                              key={piece.id}
                              onClick={() => setActiveItem({ type: 'piece', data: piece })}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${activeItem?.data?.id === piece.id ? 'bg-emerald-50 text-emerald-700 font-bold' : 'hover:bg-slate-50 text-slate-500 font-medium'}`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                              <span className="text-[11px] truncate select-none">{sku.color_name} - {sku.size} ({piece.label})</span>
                            </div>
                          ));
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {orderGroups.length === 0 && (
          <div className="text-center py-10 text-xs font-bold text-slate-400">No Orders Available</div>
        )}
      </div>

      {/* Right Main Panel (Response Table) */}
      <div className="w-2/3 bg-white rounded-2xl shadow-sm border border-[#c8834a]/20 overflow-hidden flex flex-col relative" style={{ backgroundImage: 'radial-gradient(rgba(200,131,74,0.03) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
        <div className="p-5 border-b border-slate-100 bg-white/80 backdrop-blur flex justify-between items-center z-10 shrink-0">
          <div>
            <h3 className="font-black text-slate-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#c8834a]" /> Response Data
            </h3>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-0.5">Live Data Viewer</p>
          </div>
          {activeItem && (
            <span className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-500 capitalize">{activeItem.type} Selected</span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 relative flex flex-col">
          <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none z-0 overflow-hidden select-none">
            <span className="text-[120px] font-black text-[#c8834a] rotate-[-5deg] tracking-tight">response</span>
          </div>

          {activeItem ? (
            <div className="z-10 relative">
              <table className="w-full text-left text-sm bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <thead className="bg-slate-50 text-slate-600 font-black text-xs uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-4">Piece</th>
                    <th className="p-4">Style</th>
                    <th className="p-4">Order</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {activeItem.type === 'piece' && (
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">{activeItem.data.label} ({activeItem.data.sku.size})</td>
                      <td className="p-4">{activeItem.data.style.style}</td>
                      <td className="p-4">{activeItem.data.group.po}</td>
                    </tr>
                  )}
                  {activeItem.type === 'style' && (activeItem.data.skus || []).map((sku, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-slate-400 italic">All pieces ({sku.size})</td>
                      <td className="p-4">{activeItem.data.style}</td>
                      <td className="p-4">{activeItem.parent.po}</td>
                    </tr>
                  ))}
                  {activeItem.type === 'order' && activeItem.data.styles.map((style, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-slate-400 italic">All pieces</td>
                      <td className="p-4">{style.style}</td>
                      <td className="p-4">{activeItem.data.po}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-6 bg-slate-800 rounded-xl p-4 shadow-lg text-emerald-400 font-mono text-[11px] overflow-x-auto">
                <div className="text-slate-400 mb-2">{"// raw_response.json"}</div>
                <pre>{JSON.stringify(activeItem.data, null, 2)}</pre>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 z-10 opacity-60">
              <Warehouse className="w-16 h-16 mb-4 stroke-[1.5]" />
              <p className="font-bold text-lg text-slate-500">Select an item from the explorer</p>
              <p className="text-sm font-medium">Click on an Order, Style, or Piece to view its response.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  
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
          apiGetFreightRiskAlerts(token, todayDate).catch(() => [])
        ]);
        
        setOverview(overviewData);
        setStageAlerts(Array.isArray(stageData) ? stageData : []);
        setFreightAlerts(Array.isArray(freightData) ? freightData : []);
      } catch (err) {
        setError('Failed to load analytics dashboard');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalytics();
  }, [token]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-600" />
        <p className="font-bold">Crunching Factory Data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-2" style={{ color: '#2d1f0e' }}>
            <TrendingUp className="w-8 h-8" style={{ color: '#c8834a' }} />
            Analytics & Operations
          </h1>
          <p className="font-medium" style={{ color: '#9a7a5a' }}>Live factory intelligence and proactive risk alerts.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`px-6 py-2.5 rounded-lg text-sm font-black transition-all ${activeTab === 'dashboard' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('explorer')}
            className={`px-6 py-2.5 rounded-lg text-sm font-black transition-all ${activeTab === 'explorer' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Orders Explorer
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-600 font-bold rounded-xl text-sm">
          {error}
        </div>
      )}

      {activeTab === 'explorer' ? (
        <OrdersExplorer />
      ) : (
        <>
          {/* OVERVIEW METRICS */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SpotlightCard className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100/50 flex flex-col gap-2 hover:-translate-y-1" spotlightColor="rgba(200,131,74,0.1)">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(200,131,74,0.1)', color: '#c8834a' }}>
              <Users className="w-5 h-5" />
            </div>
            <p className="text-sm font-bold uppercase tracking-wider" style={{ color: '#9a7a5a' }}>Total Clients</p>
            <p className="text-3xl font-black" style={{ color: '#2d1f0e' }}>{overview.clients || 0}</p>
          </SpotlightCard>
          
          <SpotlightCard className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100/50 flex flex-col gap-2 hover:-translate-y-1" spotlightColor="rgba(200,131,74,0.1)">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(200,131,74,0.1)', color: '#c8834a' }}>
              <Scissors className="w-5 h-5" />
            </div>
            <p className="text-sm font-bold uppercase tracking-wider" style={{ color: '#9a7a5a' }}>Active Styles</p>
            <p className="text-3xl font-black" style={{ color: '#2d1f0e' }}>{overview.styles || 0}</p>
          </SpotlightCard>
          
          <SpotlightCard className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100/50 flex flex-col gap-2 hover:-translate-y-1" spotlightColor="rgba(200,131,74,0.1)">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(200,131,74,0.1)', color: '#c8834a' }}>
              <Box className="w-5 h-5" />
            </div>
            <p className="text-sm font-bold uppercase tracking-wider" style={{ color: '#9a7a5a' }}>Pieces Ordered</p>
            <p className="text-3xl font-black" style={{ color: '#2d1f0e' }}>{overview.total_pieces_ordered || 0}</p>
          </SpotlightCard>
          
          <SpotlightCard className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100/50 flex flex-col gap-2 hover:-translate-y-1" spotlightColor="rgba(200,131,74,0.1)">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(200,131,74,0.1)', color: '#c8834a' }}>
              <TrendingUp className="w-5 h-5" />
            </div>
            <p className="text-sm font-bold uppercase tracking-wider" style={{ color: '#9a7a5a' }}>Events Logged</p>
            <p className="text-3xl font-black" style={{ color: '#2d1f0e' }}>{overview.total_operations_logged || 0}</p>
          </SpotlightCard>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* FREIGHT RISK ALERTS */}
        <div className="space-y-4">
          <h3 className="text-lg font-black flex items-center gap-2" style={{ color: '#2d1f0e' }}>
            <Plane className="w-5 h-5" style={{ color: '#ef4444' }} />
            Freight Risk Alerts
          </h3>
          <p className="text-sm" style={{ color: '#9a7a5a' }}>Orders risking Sea-Cutoff deadlines requiring expensive Air Freight.</p>
          
          <SpotlightCard className="bg-white rounded-2xl shadow-sm border border-red-100/50 overflow-hidden" spotlightColor="rgba(239,68,68,0.08)">
            {freightAlerts.length > 0 ? (
              <div className="divide-y divide-red-50">
                {freightAlerts.map((alert, i) => (
                  <div key={i} className="p-5 hover:bg-red-50/30 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold text-slate-900">{alert.order_id || 'Unknown Order'}</h4>
                        <p className="text-xs font-medium text-slate-500">{alert.style_name || 'N/A'} - {alert.client_name || 'N/A'}</p>
                      </div>
                      <span className="px-2.5 py-1 bg-red-50 text-red-700 text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1 border border-red-100">
                        <AlertCircle className="w-3 h-3" /> Risk
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-medium bg-red-50/50 p-3 rounded-xl border border-red-50">
                      <div className="flex items-center gap-1.5 text-red-800">
                        <Ship className="w-4 h-4" /> 
                        Cutoff: <span className="font-bold">{alert.sea_cutoff_date || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-amber-700">
                        <Box className="w-4 h-4" /> 
                        Progress: <span className="font-bold">{Math.round((alert.completed_qty || 0) / (alert.ordered_qty || 1) * 100)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center flex flex-col items-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                <p className="font-bold text-slate-900">No Freight Risks detected</p>
                <p className="text-xs mt-1 text-slate-500">All orders are safely within sea-cutoff buffers.</p>
              </div>
            )}
          </SpotlightCard>
        </div>

        {/* STAGE SPREAD ALERTS */}
        <div className="space-y-4">
          <h3 className="text-lg font-black flex items-center gap-2" style={{ color: '#2d1f0e' }}>
            <AlertCircle className="w-5 h-5" style={{ color: '#c8834a' }} />
            Stage Spread Alerts
          </h3>
          <p className="text-sm" style={{ color: '#9a7a5a' }}>Unbalanced production stages (e.g. cutting done but stitching stalled).</p>
          
          <SpotlightCard className="bg-white rounded-2xl shadow-sm border border-orange-100/50 overflow-hidden" spotlightColor="rgba(200,131,74,0.1)">
            {stageAlerts.length > 0 ? (
              <div className="divide-y divide-orange-50">
                {stageAlerts.map((alert, i) => (
                  <div key={i} className="p-5 hover:bg-orange-50/20 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-slate-900">{alert.style || 'Unknown Style'}</h4>
                        <p className="text-xs font-medium text-slate-500">Gap: {alert.gap} pcs</p>
                      </div>
                      <span className="px-2.5 py-1 bg-orange-50 text-[#c8834a] text-[10px] font-black uppercase tracking-wider rounded-lg border border-orange-100">
                        Bottleneck
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                        <p className="text-emerald-700 font-bold mb-1">Cutting Done</p>
                        <p className="text-emerald-900 font-black text-lg">CUTTING</p>
                        <p className="text-emerald-600 font-medium">{alert.cut || 0} pcs</p>
                      </div>
                      <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                        <p className="text-red-700 font-bold mb-1">Lagging Stage</p>
                        <p className="text-red-900 font-black text-lg">{alert.stage || 'N/A'}</p>
                        <p className="text-red-600 font-medium">{alert.reached_stage || 0} pcs</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center flex flex-col items-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                <p className="font-bold text-slate-900">No Spread Issues detected</p>
                <p className="text-xs mt-1 text-slate-500">Production flow across stages is perfectly balanced.</p>
              </div>
            )}
          </SpotlightCard>
        </div>

      </div>
        </>
      )}
    </div>
  );
}
