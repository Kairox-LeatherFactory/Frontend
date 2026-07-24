'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/context/AuthContext';
import { 
  apiGetWageStyles, 
  apiComputeWageRun, 
  apiGetWageRuns, 
  apiGetRateSheet, 
  apiSetWageRatesBulk,
  apiSetWageRateSingle,
  apiGetRateHistory,
  apiGetWageRunDetails 
} from '@/lib/api';
import { Loader2, History, Eye, X, Save, Activity } from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';

export default function PieceRatesAndWages() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('styles');

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* ─── TITLE SECTION ─── */}
      <div>
        <h1 className="text-3xl font-black tracking-tight" style={{ color: '#2d1f0e' }}>Payroll &amp; Rates Manager</h1>
        <p className="font-medium mt-1" style={{ color: '#9a7a5a' }}>Verify piece-rates and execute audits on shop floor wage calculations.</p>
      </div>

      {/* ─── TABS ─── */}
      <div className="grid grid-cols-3 sm:flex sm:w-max gap-2 sm:gap-3 p-1.5 rounded-2xl" style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.15)' }}>
        <button 
          onClick={() => setActiveTab('styles')} 
          className={`px-3 sm:px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap text-center ${activeTab === 'styles' ? 'bg-white shadow-sm border' : 'hover:bg-white/50 border border-transparent'}`}
          style={activeTab === 'styles' ? { color: '#c8834a', borderColor: 'rgba(200,131,74,0.2)' } : { color: '#9a7a5a' }}
        >
          Styles & Rates
        </button>
        <button 
          onClick={() => setActiveTab('computation')} 
          className={`px-3 sm:px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap text-center ${activeTab === 'computation' ? 'bg-white shadow-sm border' : 'hover:bg-white/50 border border-transparent'}`}
          style={activeTab === 'computation' ? { color: '#c8834a', borderColor: 'rgba(200,131,74,0.2)' } : { color: '#9a7a5a' }}
        >
          Computation
        </button>
        <button 
          onClick={() => setActiveTab('ledger')} 
          className={`px-3 sm:px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap text-center ${activeTab === 'ledger' ? 'bg-white shadow-sm border' : 'hover:bg-white/50 border border-transparent'}`}
          style={activeTab === 'ledger' ? { color: '#c8834a', borderColor: 'rgba(200,131,74,0.2)' } : { color: '#9a7a5a' }}
        >
          Ledger
        </button>
      </div>
      
      {activeTab === 'styles' && <StylesView token={token} />}
      {activeTab === 'computation' && <ComputationView token={token} />}
      {activeTab === 'ledger' && <LedgerView token={token} />}
    </div>
  );
}

// ─── STYLES & RATES VIEW ─────────────────────────────────────────────────────
function StylesView({ token }) {
  const [styles, setStyles] = useState([]);
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [rates, setRates] = useState([]);
  const [historyModal, setHistoryModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingOps, setSavingOps] = useState({});
  const [savingAll, setSavingAll] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [toastType, setToastType] = useState('success');

  const showToast = (msg, type = 'success') => {
    setToastMsg(msg);
    setToastType(type);
    setTimeout(() => setToastMsg(null), 3000);
  };

  useEffect(() => {
    apiGetWageStyles(token).then(setStyles).finally(() => setLoading(false));
  }, [token]);

  const handleSelectStyle = async (style) => {
    setSelectedStyle(style);
    const data = await apiGetRateSheet(token, style.style_code);
    setRates(data.operations);
  };

  const handleShowHistory = async (opCode) => {
    const data = await apiGetRateHistory(token, selectedStyle.style_code, opCode);
    setHistoryModal(data);
  };

  const handleSaveSingleRate = async (op) => {
    setSavingOps(prev => ({ ...prev, [op.operation_code]: true }));
    try {
      const payload = {
        style_code: selectedStyle.style_code,
        operation_code: op.operation_code,
        rate: parseFloat(op.rate || 0),
        effective_from: new Date().toISOString().split('T')[0]
      };
      await apiSetWageRateSingle(token, payload);
      showToast(`${op.label} rate saved!`, 'success');
    } catch (e) { 
      showToast('Error saving rate: ' + e.message, 'error');
    } finally { 
      setSavingOps(prev => ({ ...prev, [op.operation_code]: false })); 
    }
  };

  const handleSaveAllRates = async () => {
    setSavingAll(true);
    try {
      const payload = {
        style_code: selectedStyle.style_code,
        effective_from: new Date().toISOString().split('T')[0],
        lines: rates.map(op => ({ operation_code: op.operation_code, rate: parseFloat(op.rate || 0) }))
      };
      await apiSetWageRatesBulk(token, payload);
      showToast('All rates saved successfully!', 'success');
    } catch (e) {
      showToast('Error saving all rates: ' + e.message, 'error');
    } finally {
      setSavingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-[#9a7a5a]">
        <Loader2 className="w-8 h-8 animate-spin text-[#c8834a] mb-4" />
        <p className="font-bold text-sm">Loading Rate Sheets...</p>
      </div>
    );
  }

  if (selectedStyle) {
    return (
      <div className="space-y-6 animate-fade-in">
        <SpotlightCard className="p-8 bg-white shadow-xl space-y-6 rounded-3xl" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.06)">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6" style={{ borderBottom: '1px solid rgba(200,131,74,0.1)' }}>
            <div>
              <h2 className="font-black text-2xl" style={{ color: '#2d1f0e' }}>{selectedStyle.style_name}</h2>
              <p className="text-xs font-bold uppercase tracking-widest mt-1" style={{ color: '#c8834a' }}>{selectedStyle.style_code} • Piece Rates</p>
            </div>
            <button 
              onClick={() => setSelectedStyle(null)} 
              className="px-5 py-2.5 bg-[#faf6f0] font-bold text-xs rounded-xl transition-all border shadow-sm flex items-center justify-center gap-2 hover:bg-white"
              style={{ color: '#4a3a2a', borderColor: 'rgba(200,131,74,0.2)' }}
            >
              ← Back to Styles
            </button>
          </div>
          
          {/* Toast — bottom-right portal */}
          {toastMsg && typeof document !== 'undefined' && createPortal(
            <div className="fixed bottom-6 right-4 sm:right-6 z-[999999] animate-fade-in">
              <div className={`px-5 py-3.5 rounded-2xl shadow-2xl font-bold text-sm flex items-center gap-3 backdrop-blur-md border ${
                toastType === 'success'
                  ? 'bg-emerald-50/95 border-emerald-300/40 text-emerald-900'
                  : 'bg-red-50/95 border-red-300/40 text-red-900'
              }`}>
                <Activity className="w-4 h-4 shrink-0" />
                {toastMsg}
              </div>
            </div>,
            document.body
          )}

          <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
            <table className="w-full text-sm text-left">
              <thead style={{ background: '#faf6f0', borderBottom: '1px solid rgba(200,131,74,0.1)' }}>
                <tr className="uppercase text-[10px] font-black tracking-wider" style={{ color: '#9a7a5a' }}>
                  <th className="p-4">Operation Phase</th>
                  <th className="p-4 w-40">Rate Per Piece (₹)</th>
                  <th className="p-4 w-32 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ divideColor: 'rgba(200,131,74,0.05)' }}>
                {rates.map((op, idx) => {
                  const isSaving = savingOps[op.operation_code];
                  return (
                    <tr key={op.operation_code} className="hover:bg-[#fcfaf8] transition-colors">
                      <td className="p-4 font-extrabold" style={{ color: '#2d1f0e' }}>
                        {op.label}
                        <span className="block text-[10px] font-bold mt-0.5 text-slate-400">{op.operation_code}</span>
                      </td>
                      <td className="p-4">
                        <div className="relative flex items-center">
                          <span className="absolute left-3 text-slate-400 font-bold text-xs">₹</span>
                          <input 
                            type="number"
                            step="0.01"
                            min="0"
                            className="w-full h-11 pl-7 pr-3 bg-white font-black text-sm border-2 rounded-xl outline-none transition-all shadow-sm focus:bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            style={{ borderColor: 'rgba(200,131,74,0.2)', color: '#c8834a' }}
                            value={op.rate ?? ''} 
                            onChange={(e) => {
                              const newRates = [...rates];
                              newRates[idx].rate = e.target.value;
                              setRates(newRates);
                            }}
                            placeholder="0.00"
                          />
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleSaveSingleRate(op)} 
                            disabled={isSaving}
                            className="p-2.5 rounded-xl font-bold text-white shadow-sm transition-all hover:shadow-md disabled:opacity-50 flex items-center justify-center active:scale-95"
                            style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}
                            title="Save Rate"
                          >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          </button>
                          <button 
                            onClick={() => handleShowHistory(op.operation_code)} 
                            className="p-2.5 rounded-xl bg-white shadow-sm border transition-all hover:shadow-md group flex items-center justify-center"
                            style={{ borderColor: 'rgba(200,131,74,0.2)' }}
                            title="View Rate History"
                          >
                            <History className="w-4 h-4 text-slate-400 group-hover:text-[#c8834a] transition-colors" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Save All Rates Button ── */}
          <div className="flex justify-end pt-4" style={{ borderTop: '1px solid rgba(200,131,74,0.1)' }}>
            <button
              onClick={handleSaveAllRates}
              disabled={savingAll}
              className="h-11 px-8 rounded-xl font-black text-sm text-white shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 flex items-center gap-2"
              style={{ background: 'linear-gradient(135deg, #2d6a4f, #40916c)' }}
            >
              {savingAll ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving All...</> : <><Save className="w-4 h-4" /> Save All Rates</>}
            </button>
          </div>
        </SpotlightCard>

        {/* Audit History Modal */}
        {historyModal && typeof document !== 'undefined' && createPortal(
          <div 
            className="fixed inset-0 flex items-center justify-center p-4 z-[99999] animate-fade-in"
            style={{ background: 'rgba(15, 23, 42, 0.6)' }}
            onClick={(e) => { if(e.target === e.currentTarget) setHistoryModal(null); }}
          >
            <div className="bg-white rounded-3xl w-full max-w-md relative shadow-2xl animate-scale-up border overflow-hidden" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
              
              <div className="p-6 sm:p-8" style={{ background: 'linear-gradient(135deg, #fdfbf9, #faf6f0)' }}>
                <button 
                  onClick={() => setHistoryModal(null)} 
                  className="absolute top-6 right-6 p-2 bg-white border text-slate-400 hover:text-[#c8834a] rounded-xl transition-all shadow-sm"
                >
                  <X className="w-5 h-5" />
                </button>
                
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border" style={{ background: 'white', borderColor: 'rgba(200,131,74,0.15)' }}>
                    <Activity className="w-5 h-5" style={{ color: '#c8834a' }} />
                  </div>
                  <div>
                    <h3 className="font-black text-xl tracking-tight" style={{ color: '#2d1f0e' }}>Rate Audit Trail</h3>
                    <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#c8834a' }}>OP: {historyModal.operation_code}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6 sm:p-8 pt-4 max-h-[60vh] overflow-y-auto">
                {historyModal.history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 opacity-60">
                    <History className="w-10 h-10 mb-3 text-slate-300" />
                    <p className="text-sm font-bold text-slate-400 text-center">No history recorded yet.</p>
                  </div>
                ) : (
                  <div className="relative border-l-2 ml-4 space-y-8" style={{ borderColor: 'rgba(200,131,74,0.2)' }}>
                    {historyModal.history.map((h, i) => (
                      <div key={i} className="relative pl-6 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                        <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-[3px] border-white shadow-sm" style={{ background: i === 0 ? '#10b981' : '#c8834a' }}></div>
                        
                        <div className="p-4 rounded-2xl border shadow-sm transition-all hover:shadow-md" style={{ background: i === 0 ? '#f0fdf4' : 'white', borderColor: i === 0 ? '#bbf7d0' : 'rgba(200,131,74,0.1)' }}>
                          {i === 0 && (
                            <span className="inline-block mb-2 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-100">
                              Current Active Rate
                            </span>
                          )}
                          <div className="flex justify-between items-end">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: i === 0 ? '#166534' : '#9a7a5a' }}>Effective From</p>
                              <p className="font-bold text-sm" style={{ color: i === 0 ? '#14532d' : '#2d1f0e' }}>{h.effective_from}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: i === 0 ? '#166534' : '#9a7a5a' }}>Rate</p>
                              <p className="font-black text-xl" style={{ color: i === 0 ? '#059669' : '#c8834a' }}>₹{h.rate}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
      {styles.map(s => (
        <SpotlightCard 
          key={s.style_code} 
          onClick={() => handleSelectStyle(s)} 
          className="p-6 bg-white cursor-pointer transition-all rounded-3xl shadow-sm hover:shadow-xl group" 
          style={{ border: '1px solid rgba(200,131,74,0.15)' }} 
          spotlightColor="rgba(200,131,74,0.06)"
        >
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-black text-lg" style={{ color: '#2d1f0e' }}>{s.style_code}</h3>
            <span className="px-2 py-1 bg-[#faf6f0] text-[#c8834a] text-[10px] font-black rounded-lg uppercase tracking-wider border border-[#c8834a]/10 group-hover:bg-[#c8834a] group-hover:text-white transition-colors">
              Manage Rates
            </span>
          </div>
          <p className="text-xs font-bold text-[#9a7a5a] mb-6 line-clamp-1">{s.style_name}</p>
          
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all"
                style={{ 
                  width: `${(s.rated_operations / s.total_operations) * 100}%`,
                  background: s.rated_operations === s.total_operations ? '#10b981' : '#c8834a' 
                }}
              />
            </div>
            <span className="text-[10px] font-black w-12 text-right" style={{ color: s.rated_operations === s.total_operations ? '#10b981' : '#c8834a' }}>
              {s.rated_operations} / {s.total_operations}
            </span>
          </div>
        </SpotlightCard>
      ))}
    </div>
  );
}

// ─── COMPUTATION ENGINE VIEW ───────────────────────────────────────────────────
function ComputationView({ token }) {
  const [runs, setRuns] = useState([]);
  const [selectedRunDetails, setSelectedRunDetails] = useState(null);
  
  // Default to current month's payroll dates
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    // Set default dates to first and 15th of current month
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    setStartDate(`${y}-${m}-01`);
    setEndDate(`${y}-${m}-15`);
    
    apiGetWageRuns(token).then(setRuns).catch(() => {});
  }, [token]);

  const handleRunPayroll = async () => {
    if (!startDate || !endDate) return alert("Select dates");
    setLoading(true);
    setErrorMsg(null);
    try {
      await apiComputeWageRun(token, startDate, endDate);
      const data = await apiGetWageRuns(token);
      setRuns(data);
    } catch (err) { 
      let msg = err.message || 'Failed to compute payroll';
      try {
        const parsed = JSON.parse(msg);
        if (parsed.detail) msg = parsed.detail;
      } catch(e) {}
      
      // Shorten specific backend messages
      if (msg.includes('Period overlaps closed run')) {
        const match = msg.match(/\((.*?)\)/);
        const dates = match ? match[1] : 'an existing run';
        msg = `Selected dates overlap with a previous payroll run (${dates}).`;
      }
      
      setErrorMsg(msg);
    } finally { 
      setLoading(false); 
    }
  };

  const handleViewDetails = async (runId) => {
    const details = await apiGetWageRunDetails(token, runId);
    setSelectedRunDetails(details);
  };

  const latestRun = runs.length > 0 ? [runs[0]] : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <SpotlightCard className="p-6 sm:p-8 bg-white shadow-xl rounded-3xl" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.06)">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex-1 space-y-2">
            <h3 className="font-extrabold text-base uppercase tracking-wider" style={{ color: '#2d1f0e' }}>Active Computation Engine</h3>
            <p className="text-xs font-bold text-[#9a7a5a]">Select a period to parse floor logs and distribute wages.</p>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
              <input 
                type="date" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)} 
                className="h-12 px-4 bg-[#faf6f0] font-black text-sm border-2 outline-none rounded-xl transition-all w-full"
                style={{ borderColor: 'rgba(200,131,74,0.2)', color: '#4a3a2a' }}
              />
              <span className="font-bold text-slate-300 text-center sm:text-left">to</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)} 
                className="h-12 px-4 bg-[#faf6f0] font-black text-sm border-2 outline-none rounded-xl transition-all w-full"
                style={{ borderColor: 'rgba(200,131,74,0.2)', color: '#4a3a2a' }}
              />
            </div>
          </div>
          <button 
            onClick={handleRunPayroll} 
            disabled={loading} 
            className="h-12 px-8 rounded-xl text-white font-black text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 hover:shadow-lg disabled:opacity-50 shrink-0 w-full md:w-auto"
            style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Compute & Freeze Pay'}
          </button>
        </div>
        
        {/* Error Notification */}
        {errorMsg && (
          <div className="mt-4 p-4 rounded-xl border flex items-center gap-3 animate-fade-in bg-red-50" style={{ borderColor: 'rgba(239,68,68,0.2)' }}>
            <Activity className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-sm font-bold text-red-700">{errorMsg}</p>
          </div>
        )}
      </SpotlightCard>
      
      {latestRun.length > 0 && (
        <div className="bg-white rounded-3xl border shadow-sm overflow-hidden" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
          <div className="px-6 py-5 border-b" style={{ borderColor: 'rgba(200,131,74,0.1)', background: '#faf6f0' }}>
            <h3 className="font-black text-sm uppercase tracking-wider" style={{ color: '#9a7a5a' }}>Latest Computed Run</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white">
                <tr className="border-b uppercase text-[10px] font-black tracking-wider text-left" style={{ borderColor: 'rgba(200,131,74,0.1)', color: '#c8834a' }}>
                  <th className="p-4 pl-6">Run Period</th>
                  <th className="p-4">Employees / Pieces</th>
                  <th className="p-4 text-center">Unrated Ops</th>
                  <th className="p-4">Disbursement Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 pr-6 text-right">View Ledger</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ divideColor: 'rgba(200,131,74,0.05)' }}>
                {latestRun.map(r => (
                  <tr key={r.id} className="hover:bg-[#fcfaf8] transition-colors">
                    <td className="p-4 pl-6 font-bold" style={{ color: '#4a3a2a' }}>
                      {r.period_start} <span className="text-slate-300 font-normal mx-1">to</span> {r.period_end}
                      {r.gap_days > 0 && <span className="block text-[10px] text-red-500 font-black mt-1">⚠️ {r.gap_days} Days Gap</span>}
                    </td>
                    <td className="p-4 font-bold" style={{ color: '#9a7a5a' }}>
                      <div className="flex items-center gap-2">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px]">{r.employee_count || 0} Emp</span>
                        <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[10px]">{r.total_pieces || 0} Pcs</span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      {r.unrated_operations && r.unrated_operations.length > 0 ? (
                        <span className="bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full text-[10px] font-black">{r.unrated_operations.length} Unrated</span>
                      ) : (
                        <span className="text-slate-400 text-[10px] font-bold">-</span>
                      )}
                    </td>
                    <td className="p-4 font-black text-lg" style={{ color: '#2d1f0e' }}>₹{r.total_amount?.toLocaleString() || 0}</td>
                    <td className="p-4">
                      <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-[10px] uppercase font-black tracking-wider">
                        {r.status}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <button 
                        onClick={() => handleViewDetails(r.id)} 
                        className="px-4 py-2 bg-white border rounded-xl font-bold text-xs hover:bg-[#faf6f0] transition-colors shadow-sm ml-auto flex items-center gap-2"
                        style={{ borderColor: 'rgba(200,131,74,0.2)', color: '#c8834a' }}
                      >
                        <Eye className="w-4 h-4" /> Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Wage Run Breakdown Modal */}
      {selectedRunDetails && (
        <WageRunDetailsModal details={selectedRunDetails} onClose={() => setSelectedRunDetails(null)} />
      )}
    </div>
  );
}

// ─── LEDGER HISTORY VIEW ─────────────────────────────────────────────────────
function LedgerView({ token }) {
  const [runs, setRuns] = useState([]);
  const [selectedRunDetails, setSelectedRunDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(null); // stores runId being loaded
  const [detailsError, setDetailsError] = useState(null);
  
  useEffect(() => {
    apiGetWageRuns(token).then(setRuns).catch(() => {});
  }, [token]);

  const handleViewDetails = async (runId) => {
    console.log('[LedgerView] handleViewDetails called with runId:', runId);
    if (!runId) {
      setDetailsError('Run ID is missing — backend may be returning a different field name.');
      return;
    }
    setDetailsLoading(runId);
    setDetailsError(null);
    try {
      const details = await apiGetWageRunDetails(token, runId);
      console.log('[LedgerView] details received:', details);
      setSelectedRunDetails(details);
    } catch (err) {
      console.error('[LedgerView] Error fetching details:', err);
      setDetailsError(err.message || 'Failed to load run details.');
    } finally {
      setDetailsLoading(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white rounded-3xl border shadow-sm overflow-hidden" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
        <div className="px-6 py-5 border-b" style={{ borderColor: 'rgba(200,131,74,0.1)', background: '#faf6f0' }}>
          <h3 className="font-black text-sm uppercase tracking-wider" style={{ color: '#9a7a5a' }}>Complete Ledger History</h3>
        </div>

        {detailsError && (
          <div className="mx-4 mb-0 mt-4 p-3.5 rounded-xl text-xs font-bold border text-red-800 bg-red-50 border-red-200 animate-fade-in">
            ⚠️ {detailsError}
          </div>
        )}
        
        {runs.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-bold text-slate-400">No payroll history found in ledger.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white">
                <tr className="border-b uppercase text-[10px] font-black tracking-wider text-left" style={{ borderColor: 'rgba(200,131,74,0.1)', color: '#c8834a' }}>
                  <th className="p-4 pl-6">Run Period</th>
                  <th className="p-4">Employees / Pieces</th>
                  <th className="p-4 text-center">Unrated Ops</th>
                  <th className="p-4">Disbursement Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 pr-6 text-right">View Ledger</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ divideColor: 'rgba(200,131,74,0.05)' }}>
                {runs.map(r => (
                  <tr key={r.id} className="hover:bg-[#fcfaf8] transition-colors">
                    <td className="p-4 pl-6 font-bold" style={{ color: '#4a3a2a' }}>
                      {r.period_start} <span className="text-slate-300 font-normal mx-1">to</span> {r.period_end}
                      {r.gap_days > 0 && <span className="block text-[10px] text-red-500 font-black mt-1">⚠️ {r.gap_days} Days Gap</span>}
                    </td>
                    <td className="p-4 font-bold" style={{ color: '#9a7a5a' }}>
                      <div className="flex items-center gap-2">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px]">{r.employee_count || 0} Emp</span>
                        <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[10px]">{r.total_pieces || 0} Pcs</span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      {r.unrated_operations && r.unrated_operations.length > 0 ? (
                        <span className="bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full text-[10px] font-black">{r.unrated_operations.length} Unrated</span>
                      ) : (
                        <span className="text-slate-400 text-[10px] font-bold">-</span>
                      )}
                    </td>
                    <td className="p-4 font-black text-lg" style={{ color: '#2d1f0e' }}>₹{r.total_amount?.toLocaleString() || 0}</td>
                    <td className="p-4">
                      <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-[10px] uppercase font-black tracking-wider">
                        {r.status}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <button 
                        onClick={() => handleViewDetails(r.id)} 
                        disabled={detailsLoading === r.id}
                        className="px-4 py-2 bg-white border rounded-xl font-bold text-xs hover:bg-[#faf6f0] transition-colors shadow-sm ml-auto flex items-center gap-2 disabled:opacity-50"
                        style={{ borderColor: 'rgba(200,131,74,0.2)', color: '#c8834a' }}
                      >
                        {detailsLoading === r.id
                          ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading...</>
                          : <><Eye className="w-4 h-4" /> Details</>}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Wage Run Breakdown Modal */}
      {selectedRunDetails && (
        <WageRunDetailsModal details={selectedRunDetails} onClose={() => setSelectedRunDetails(null)} />
      )}
    </div>
  );
}

// ─── WAGE RUN DETAILS MODAL (Shared) ─────────────────────────────────────────
function WageRunDetailsModal({ details, onClose }) {
  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4 z-[99999]"
      style={{ background: 'rgba(15, 23, 42, 0.6)' }}
      onClick={(e) => { if(e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-2xl relative max-h-[90vh] flex flex-col shadow-2xl animate-scale-up border" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 p-2 bg-slate-50 text-slate-400 hover:text-slate-800 rounded-xl transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="mb-6 pr-12 shrink-0">
          <h3 className="font-black text-xl" style={{ color: '#2d1f0e' }}>Run Breakdown</h3>
          <p className="text-xs font-bold text-[#9a7a5a] uppercase tracking-wider mt-1">ID: {details.id}</p>
        </div>
        
        <div className="overflow-y-auto flex-1 rounded-2xl border" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>

              <table className="w-full text-sm relative">
                <thead className="sticky top-0 z-10 shadow-sm" style={{ background: '#faf6f0' }}>
                  <tr className="border-b text-left uppercase text-[10px] font-black tracking-wider" style={{ borderColor: 'rgba(200,131,74,0.1)', color: '#c8834a' }}>
                    <th className="p-4">Employee</th>
                    <th className="p-4">Wage Type</th>
                    <th className="p-4 text-center">Total Pieces</th>
                    <th className="p-4 text-right">Computed Pay</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ divideColor: 'rgba(200,131,74,0.05)', background: 'white' }}>
                  {details.lines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-[#fcfaf8] transition-colors">
                      <td className="p-4 font-bold" style={{ color: '#2d1f0e' }}>{line.employee_name}</td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md uppercase text-[10px] font-bold">
                          {line.wage_type}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-center" style={{ color: '#9a7a5a' }}>{line.pieces ?? line.total_pieces ?? 0}</td>
                      <td className="p-4 text-right font-black text-lg" style={{ color: '#c8834a' }}>₹{(line.amount ?? line.amount_calculated)?.toLocaleString() ?? 0}</td>
                    </tr>
                  ))}
                  {(!details.lines || details.lines.length === 0) && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-400 font-bold">No wage records generated in this ledger run.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="mt-6 pt-6 border-t flex justify-between items-center shrink-0" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
              <div className="text-xs font-bold text-slate-400">Total Records: {details.lines.length}</div>
              <button 
                onClick={onClose}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-colors"
              >
                Close View
              </button>
            </div>
          </div>
    </div>
  );
}
// 'use client';
// import { useState, useEffect } from 'react';
// import { useAuth } from '@/context/AuthContext';
// import { useData } from '@/context/DataContext';
// import { apiSetWageRate, apiComputeWageRun } from '@/lib/api';
// import { CheckCircle2, Tag, Lock, Settings, Coins, FolderOpen, Loader2 } from 'lucide-react';
// import SpotlightCard from '@/components/SpotlightCard';

// export default function PieceRatesAndWages() {
//   const { user, token } = useAuth();
//   const { orders, operations } = useData();

//   // Role Gate check
//   const isDirectManager = user === 'direct_manager';

//   // State for active pay computation run
//   const [payPeriod, setPayPeriod] = useState('May 16-31, 2026');
//   const [isCalculated, setIsCalculated] = useState(false);
//   const [isFreezing, setIsFreezing] = useState(false);
//   const [successMsg, setSuccessMsg] = useState('');
//   const [errorMsg, setErrorMsg] = useState('');
  
//   const [calculatedPayroll, setCalculatedPayroll] = useState([]);
//   const [totalPayrollAmount, setTotalPayrollAmount] = useState(0);

//   // Set Wage Rate Form State
//   const [styleId, setStyleId] = useState('');
//   const [operation, setOperation] = useState('CUTTING');
//   const [pieceRate, setPieceRate] = useState('');
//   const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
//   const [isSettingRate, setIsSettingRate] = useState(false);

//   // Auto-select first order for the style dropdown
//   useEffect(() => {
//     if (!styleId && orders && orders.length > 0) {
//       setStyleId(orders[0].style); // using style name as ID for now based on context
//     }
//   }, [orders, styleId]);

//   const handleSetRate = async (e) => {
//     e.preventDefault();
//     if (!isDirectManager) return;
//     setIsSettingRate(true);
//     setErrorMsg('');
//     try {
//       // Find UUIDs
//       const orderMatch = orders.find(o => o.style === styleId);
//       const opMatch = operations.find(o => o.label.toLowerCase() === operation.toLowerCase());
      
//       if (!orderMatch || !opMatch) {
//         throw new Error("Could not find matching Style ID or Operation ID in database.");
//       }

//       await apiSetWageRate(token, {
//         style_id: orderMatch.style_id,
//         operation_id: opMatch.id,
//         rate: parseFloat(pieceRate),
//         effective_from: effectiveDate
//       });
//       setSuccessMsg(`Piece rate for ${operation} on ${styleId} set successfully.`);
//       setTimeout(() => setSuccessMsg(''), 5000);
//       setPieceRate('');
//     } catch (err) {
//       setErrorMsg(err.message);
//       setTimeout(() => setErrorMsg(''), 5000);
//     } finally {
//       setIsSettingRate(false);
//     }
//   };

//   const handleComputeRun = async () => {
//     if (!isDirectManager) return;
//     setIsFreezing(true);
//     setErrorMsg('');
//     try {
//       // Parse the period dropdown (e.g. "May 16-31, 2026") into YYYY-MM-DD
//       let start_date = '2026-05-16';
//       let end_date = '2026-05-31';
//       if (payPeriod.includes('June')) {
//         start_date = '2026-06-01';
//         end_date = '2026-06-15';
//       }

//       const runData = await apiComputeWageRun(token, start_date, end_date);
//       // Backend returns run with lines
//       const lines = runData.lines || [];
//       setCalculatedPayroll(lines);
//       setTotalPayrollAmount(runData.total_amount || lines.reduce((acc, l) => acc + (l.amount_calculated || 0), 0));
//       setIsCalculated(true);
//       setSuccessMsg(`Payroll Period "${payPeriod}" computed & frozen successfully!`);
//       setTimeout(() => setSuccessMsg(''), 5000);
//     } catch (err) {
//       setErrorMsg(`Failed to compute payroll: ${err.message}`);
//       setTimeout(() => setErrorMsg(''), 6000);
//     } finally {
//       setIsFreezing(false);
//     }
//   };

//   return (
//     <div className="space-y-8 animate-fade-in pb-12">
      
//       {/* ─── TITLE SECTION ─── */}
//       <div>
//         <h1 className="text-3xl font-black tracking-tight" style={{ color: '#2d1f0e' }}>Payroll &amp; Rates Manager</h1>
//         <p className="font-medium mt-1" style={{ color: '#9a7a5a' }}>Verify piece-rates and execute audits on shop floor wage calculations.</p>
//       </div>

//       {/* ─── BANNER ALERTS ─── */}
//       {successMsg && (
//         <div className="p-4 rounded-xl font-bold text-sm shadow-md animate-fade-in flex items-center gap-2.5" style={{ background: '#f0fff4', border: '1px solid #c6f6d5', color: '#276749' }}>
//           <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
//           <p>{successMsg}</p>
//         </div>
//       )}
//       {errorMsg && (
//         <div className="p-4 rounded-xl font-bold text-sm shadow-md animate-fade-in flex items-center gap-2.5" style={{ background: '#fff0f0', border: '1px solid #feb2b2', color: '#9b2c2c' }}>
//           <p>{errorMsg}</p>
//         </div>
//       )}

//       {/* ─── DOUBLE BLOCK ROW: RATES & STATUS ─── */}
//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
//         {/* LEFT COLUMN: SET PIECE RATE */}
//         <SpotlightCard className="p-6 bg-white shadow-xl space-y-6 rounded-3xl" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.06)">
//           <h3 className="text-lg font-extrabold pb-4 flex items-center gap-2" style={{ color: '#2d1f0e', borderBottom: '1px solid rgba(200,131,74,0.1)' }}>
//             <Tag className="w-5 h-5" style={{ color: '#c8834a' }} /> Set Piece Rate
//           </h3>
//           <p className="text-xs font-semibold" style={{ color: '#9a7a5a' }}>
//             Define contract piece pay scale for specific styles and operations.
//           </p>

//           {!isDirectManager ? (
//             <div className="p-4 rounded-xl text-xs font-bold flex items-center gap-2" style={{ background: '#fff9f0', border: '1px solid #fbd38d', color: '#9c4221' }}>
//               <Lock className="w-4 h-4" /> Manager Access Required
//             </div>
//           ) : (
//             <form onSubmit={handleSetRate} className="space-y-4">
//               <div>
//                 <label className="text-xs font-bold uppercase tracking-wider block mb-1" style={{ color: '#9a7a5a' }}>Style</label>
//                 <select 
//                   className="w-full px-4 py-3 rounded-xl focus:outline-none transition-all cursor-pointer font-bold" 
//                   style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.2)', color: '#2d1f0e' }}
//                   value={styleId} 
//                   onChange={(e) => setStyleId(e.target.value)}
//                   required
//                 >
//                   {orders.map(o => (
//                     <option key={o.id} value={o.style}>{o.style}</option>
//                   ))}
//                   <option value="CARNABY">CARNABY</option>
//                   <option value="REGAL">REGAL</option>
//                 </select>
//               </div>
              
//               <div>
//                 <label className="text-xs font-bold uppercase tracking-wider block mb-1" style={{ color: '#9a7a5a' }}>Operation</label>
//                 <select 
//                   className="w-full px-4 py-3 rounded-xl focus:outline-none transition-all cursor-pointer font-bold" 
//                   style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.2)', color: '#2d1f0e' }}
//                   value={operation} 
//                   onChange={(e) => setOperation(e.target.value)}
//                   required
//                 >
//                   <option value="CUTTING">Cutting</option>
//                   <option value="FUSING">Fusing</option>
//                   <option value="PASTING">Pasting</option>
//                   <option value="FF">FF</option>
//                   <option value="SHELL STITCH">Shell Stitch</option>
//                   <option value="LINING STITCH">Lining Stitch</option>
//                   <option value="LA">L/A</option>
//                 </select>
//               </div>

//               <div>
//                 <label className="text-xs font-bold uppercase tracking-wider block mb-1" style={{ color: '#9a7a5a' }}>Rate per Piece (₹)</label>
//                 <input 
//                   type="number" 
//                   step="0.01" 
//                   min="0"
//                   className="w-full px-4 py-3 rounded-xl focus:outline-none transition-all font-bold placeholder-opacity-50" 
//                   style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.2)', color: '#2d1f0e' }}
//                   value={pieceRate} 
//                   onChange={(e) => setPieceRate(e.target.value)}
//                   placeholder="e.g. 80.00"
//                   required
//                 />
//               </div>

//               <button 
//                 type="submit" 
//                 disabled={isSettingRate}
//                 className="w-full py-3 text-white font-extrabold text-sm rounded-xl transition-all cursor-pointer shadow-md active:scale-95 flex items-center justify-center gap-2 hover:shadow-lg disabled:opacity-50"
//                 style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}
//               >
//                 {isSettingRate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
//                 Save Piece Rate
//               </button>
//             </form>
//           )}
//         </SpotlightCard>

//         {/* RIGHT COLUMN: PAYROLL OPERATIONS ENGINE */}
//         <div className="lg:col-span-2 space-y-6">
          
//           {!isDirectManager ? (
//             <SpotlightCard className="p-8 shadow-lg text-center space-y-4 rounded-3xl" style={{ background: '#fff9f0', border: '1px solid rgba(200,131,74,0.3)' }} spotlightColor="rgba(200,131,74,0.1)">
//               <Lock className="w-12 h-12 mx-auto" style={{ color: '#c8834a' }} />
//               <h3 className="text-lg font-black uppercase tracking-wide" style={{ color: '#9c4221' }}>
//                 Direct Manager Authorization Required
//               </h3>
//               <p className="text-xs font-semibold max-w-lg mx-auto" style={{ color: '#a86022' }}>
//                 While piece rates are open to read-only floor audits, payroll runs, frozen logs, and cash distributions are restricted. Switch profiles to run computations.
//               </p>
//             </SpotlightCard>
//           ) : (
//             <SpotlightCard className="p-6 sm:p-8 bg-white shadow-xl space-y-6 rounded-3xl" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.06)">
              
//               <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 gap-4" style={{ borderBottom: '1px solid rgba(200,131,74,0.1)' }}>
//                 <h3 className="text-lg font-extrabold flex items-center gap-2" style={{ color: '#2d1f0e' }}>
//                   <Settings className="w-5 h-5" style={{ color: '#c8834a' }} /> Active Computation Engine
//                 </h3>
//                 <div className="flex flex-col sm:flex-row items-center gap-3">
//                   <select
//                     value={payPeriod}
//                     onChange={(e) => setPayPeriod(e.target.value)}
//                     className="px-4 py-2 font-extrabold text-xs cursor-pointer w-full sm:w-44 rounded-xl focus:outline-none transition-all"
//                     style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.2)', color: '#2d1f0e' }}
//                   >
//                     <option value="May 16-31, 2026">May 16-31, 2026</option>
//                     <option value="June 01-15, 2026">June 01-15, 2026</option>
//                   </select>
//                   <button
//                     onClick={handleComputeRun}
//                     disabled={isFreezing}
//                     className="w-full sm:w-auto h-10 min-h-[40px] px-6 text-xs font-black rounded-xl text-white shadow-md active:scale-95 flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-50"
//                     style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}
//                   >
//                     {isFreezing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
//                     Compute & Freeze Pay
//                   </button>
//                 </div>
//               </div>

//               {/* Computations Grid Panel */}
//               {isCalculated ? (
//                 <div className="space-y-6 animate-fade-in">
//                   <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.2)', color: '#4a3a2a' }}>
//                     <span className="text-xs font-black uppercase">Distribution Period: {payPeriod}</span>
//                     <span className="text-sm font-black">
//                       Total Ledger: <strong className="text-base" style={{ color: '#c8834a' }}>₹{totalPayrollAmount.toLocaleString()}</strong>
//                     </span>
//                   </div>

//                   <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid rgba(200,131,74,0.15)' }}>
//                     <table className="w-full text-left text-xs font-semibold">
//                       <thead>
//                         <tr className="font-bold uppercase tracking-wider" style={{ background: '#faf6f0', borderBottom: '1px solid rgba(200,131,74,0.15)', color: '#9a7a5a' }}>
//                           <th className="p-3">Worker / Type</th>
//                           <th className="p-3 text-center">Total Qty Done</th>
//                           <th className="p-3 text-right">Wage Amount</th>
//                         </tr>
//                       </thead>
//                       <tbody className="divide-y" style={{ divideColor: 'rgba(200,131,74,0.1)', color: '#2d1f0e' }}>
//                         {calculatedPayroll.map((pay, idx) => (
//                           <tr key={idx} className="hover:bg-[#fcfaf8] transition-colors">
//                             <td className="p-3">
//                               <span className="block font-black">{pay.employee_name || 'Unknown Worker'}</span>
//                               <span className="block text-[10px] font-bold mt-1 uppercase" style={{ color: '#9a7a5a' }}>
//                                 {pay.wage_type || 'Unknown'}
//                               </span>
//                             </td>
//                             <td className="p-3 font-black text-center" style={{ color: '#a86022' }}>{pay.total_pieces || 0} pcs</td>
//                             <td className="p-3 text-right font-black" style={{ color: '#2d1f0e' }}>₹{(pay.amount_calculated || 0).toLocaleString()}</td>
//                           </tr>
//                         ))}
//                       </tbody>
//                     </table>
//                   </div>

//                   <div className="flex justify-end gap-3">
//                     <button
//                       onClick={() => setIsCalculated(false)}
//                       className="px-6 py-2.5 text-xs font-bold rounded-xl transition-all hover:bg-slate-100"
//                       style={{ color: '#4a3a2a', border: '1px solid rgba(200,131,74,0.3)' }}
//                     >
//                       Clear View
//                     </button>
//                   </div>
//                 </div>
//               ) : (
//                 <div className="text-center py-12 font-medium" style={{ color: '#9a7a5a' }}>
//                   <Coins className="w-10 h-10 mx-auto mb-2 opacity-50" />
//                   Select pay cycle period above and click "Compute & Freeze Pay" to parse active floor logs and auto-calculate payroll distributions.
//                 </div>
//               )}

//             </SpotlightCard>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }
