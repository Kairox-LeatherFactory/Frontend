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
  CheckCircle2
} from 'lucide-react';

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
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-8 h-8 text-blue-600" />
            Analytics & Operations
          </h1>
          <p className="text-slate-500 font-medium">Live factory intelligence and proactive risk alerts.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-600 font-bold rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* OVERVIEW METRICS */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total Clients</p>
            <p className="text-3xl font-black text-slate-900">{overview.clients || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Scissors className="w-5 h-5" />
            </div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Active Styles</p>
            <p className="text-3xl font-black text-slate-900">{overview.styles || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Box className="w-5 h-5" />
            </div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Pieces Ordered</p>
            <p className="text-3xl font-black text-slate-900">{overview.total_pieces_ordered || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Events Logged</p>
            <p className="text-3xl font-black text-slate-900">{overview.total_operations_logged || 0}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* FREIGHT RISK ALERTS */}
        <div className="space-y-4">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Plane className="w-5 h-5 text-red-500" />
            Freight Risk Alerts
          </h3>
          <p className="text-sm text-slate-500">Orders risking Sea-Cutoff deadlines requiring expensive Air Freight.</p>
          
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {freightAlerts.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {freightAlerts.map((alert, i) => (
                  <div key={i} className="p-5 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold text-slate-900">{alert.order_id || 'Unknown Order'}</h4>
                        <p className="text-xs font-medium text-slate-500">{alert.style_name || 'N/A'} - {alert.client_name || 'N/A'}</p>
                      </div>
                      <span className="px-2.5 py-1 bg-red-50 text-red-700 text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Risk
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-medium text-slate-600 bg-slate-100 p-3 rounded-xl">
                      <div className="flex items-center gap-1.5 text-blue-700">
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
              <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                <p className="font-bold">No Freight Risks detected</p>
                <p className="text-xs mt-1">All orders are safely within sea-cutoff buffers.</p>
              </div>
            )}
          </div>
        </div>

        {/* STAGE SPREAD ALERTS */}
        <div className="space-y-4">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            Stage Spread Alerts
          </h3>
          <p className="text-sm text-slate-500">Unbalanced production stages (e.g. cutting done but stitching stalled).</p>
          
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {stageAlerts.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {stageAlerts.map((alert, i) => (
                  <div key={i} className="p-5 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-slate-900">{alert.style || 'Unknown Style'}</h4>
                        <p className="text-xs font-medium text-slate-500">Gap: {alert.gap} pcs</p>
                      </div>
                      <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-wider rounded-lg">
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
              <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                <p className="font-bold">No Spread Issues detected</p>
                <p className="text-xs mt-1">Production flow across stages is perfectly balanced.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
