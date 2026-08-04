'use client';
import { useState, useEffect, useMemo } from 'react';
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
import { 
  Loader2, History, Eye, X, Save, Activity, Search, 
  Briefcase, Scissors, CheckCircle2, AlertCircle, Coins,
  Calendar, FileText, Filter, Users, TrendingUp, ChevronRight
} from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';

export default function PieceRatesAndWages() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('styles');

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* ─── PREMIUM HEADER & NAVIGATION ─── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
        <div>
          <h1 className="text-4xl font-black tracking-tight" style={{ color: '#2d1f0e' }}>
            Payroll Command
          </h1>
          <p className="font-medium mt-2 text-sm max-w-xl" style={{ color: '#9a7a5a' }}>
            Manage piece-rate logic, execute shop floor audits, and process automated wage runs with high precision.
          </p>
        </div>

        {/* ─── PILL NAVIGATION ─── */}
        <div className="flex items-center gap-1 p-1.5 rounded-full bg-white/60 backdrop-blur-md shadow-sm border" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
          {[
            { id: 'styles', icon: Scissors, label: 'Piece Rates' },
            { id: 'computation', icon: Activity, label: 'Run Engine' },
            { id: 'ledger', icon: FileText, label: 'Ledger' }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)} 
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs sm:text-sm transition-all duration-300 ${
                  isActive 
                    ? 'bg-white shadow-md' 
                    : 'hover:bg-white/40 opacity-70 hover:opacity-100'
                }`}
                style={isActive ? { color: '#c8834a' } : { color: '#4a3a2a' }}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'scale-110' : 'scale-100'} transition-transform`} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>
      
      {/* ─── ACTIVE VIEW RENDERER ─── */}
      <div className="relative z-0">
        <div className={`transition-all duration-500 ${activeTab === 'styles' ? 'opacity-100 translate-y-0 relative' : 'opacity-0 translate-y-4 absolute inset-x-0 pointer-events-none'}`}>
          <StylesView token={token} />
        </div>
        <div className={`transition-all duration-500 ${activeTab === 'computation' ? 'opacity-100 translate-y-0 relative' : 'opacity-0 translate-y-4 absolute inset-x-0 pointer-events-none'}`}>
          <ComputationView token={token} />
        </div>
        <div className={`transition-all duration-500 ${activeTab === 'ledger' ? 'opacity-100 translate-y-0 relative' : 'opacity-0 translate-y-4 absolute inset-x-0 pointer-events-none'}`}>
          <LedgerView token={token} />
        </div>
      </div>
    </div>
  );
}

// ─── TOAST NOTIFICATION COMPONENT ───
function Toast({ msg, type }) {
  if (!msg) return null;
  const isSuccess = type === 'success';
  return createPortal(
    <div className="fixed bottom-4 right-4 left-4 sm:bottom-8 sm:right-8 sm:left-auto flex justify-center z-[999999] animate-fade-in pointer-events-none">
      <div className={`px-6 py-4 rounded-2xl shadow-2xl font-bold text-sm flex items-center gap-3 backdrop-blur-md border max-w-sm w-full sm:w-auto ${
        isSuccess
          ? 'bg-emerald-50/90 border-emerald-200/50 text-emerald-900 shadow-emerald-500/10'
          : 'bg-red-50/90 border-red-200/50 text-red-900 shadow-red-500/10'
      }`}>
        {isSuccess ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />}
        {msg}
      </div>
    </div>,
    document.body
  );
}

// ─── 1. STYLES & RATES VIEW ──────────────────────────────────────────────────
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
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStyles = useMemo(() => {
    if (!styles || !Array.isArray(styles)) return [];
    if (!searchQuery.trim()) return styles;
    const term = searchQuery.toLowerCase().trim();
    return styles.filter(item => 
      String(item.style_code).toLowerCase().includes(term) || 
      String(item.style_name).toLowerCase().includes(term)
    );
  }, [styles, searchQuery]);

  const showToast = (msg, type = 'success') => {
    setToastMsg(msg); setToastType(type);
    setTimeout(() => setToastMsg(null), 3000);
  };

  useEffect(() => {
    let active = true;
    if (active) setLoading(true);
    apiGetWageStyles(token).then(data => {
      if(active) setStyles(data);
    }).finally(() => { if(active) setLoading(false); });
    return () => { active = false; };
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
      await apiSetWageRateSingle(token, {
        style_code: selectedStyle.style_code,
        operation_code: op.operation_code,
        rate: parseFloat(op.rate || 0),
        effective_from: new Date().toISOString().split('T')[0]
      });
      showToast(`${op.label} rate saved!`, 'success');
    } catch (e) { 
      showToast('Error: ' + e.message, 'error');
    } finally { 
      setSavingOps(prev => ({ ...prev, [op.operation_code]: false })); 
    }
  };

  const handleSaveAllRates = async () => {
    setSavingAll(true);
    try {
      await apiSetWageRatesBulk(token, {
        style_code: selectedStyle.style_code,
        effective_from: new Date().toISOString().split('T')[0],
        lines: rates.map(op => ({ operation_code: op.operation_code, rate: parseFloat(op.rate || 0) }))
      });
      showToast('All rates saved successfully!', 'success');
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    } finally {
      setSavingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 opacity-60">
        <Loader2 className="w-10 h-10 animate-spin text-[#c8834a] mb-4" />
        <p className="font-bold text-sm tracking-widest uppercase" style={{ color: '#9a7a5a' }}>Syncing Ledger...</p>
      </div>
    );
  }

  if (selectedStyle) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Toast msg={toastMsg} type={toastType} />
        
        {/* Editor Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 md:p-8 rounded-[2rem] shadow-xl border relative overflow-hidden" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
          <div className="absolute top-0 left-0 w-1.5 h-full" style={{ background: 'linear-gradient(to bottom, #c8834a, #e8a06a)' }}></div>
          <div>
            <h2 className="font-black text-3xl" style={{ color: '#2d1f0e' }}>{selectedStyle.style_name}</h2>
            <div className="flex items-center gap-3 mt-2 text-xs font-bold uppercase tracking-widest" style={{ color: '#c8834a' }}>
              <span className="bg-[#faf6f0] px-3 py-1 rounded-md border" style={{ borderColor: 'rgba(200,131,74,0.2)' }}>{selectedStyle.style_code}</span>
              <span>•</span>
              <span>Master Rate Config</span>
            </div>
          </div>
          <button 
            onClick={() => setSelectedStyle(null)} 
            className="px-6 py-3 bg-[#faf6f0] font-black text-xs uppercase tracking-widest rounded-2xl transition-all border shadow-sm hover:shadow-md hover:bg-white active:scale-95"
            style={{ color: '#4a3a2a', borderColor: 'rgba(200,131,74,0.2)' }}
          >
            ← Close Editor
          </button>
        </div>
        
        {/* Editor Rows */}
        <div className="grid gap-4">
          {rates.map((op, idx) => {
            const isSaving = savingOps[op.operation_code];
            return (
              <div key={op.operation_code} className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border flex flex-col md:flex-row md:items-center gap-6 transition-all hover:shadow-md group" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
                <div className="flex-1">
                  <h4 className="font-black text-lg flex items-center gap-2" style={{ color: '#2d1f0e' }}>
                    <div className="w-8 h-8 rounded-full bg-[#faf6f0] flex items-center justify-center text-[10px] text-[#c8834a] border" style={{ borderColor: 'rgba(200,131,74,0.2)' }}>
                      {(idx + 1).toString().padStart(2, '0')}
                    </div>
                    {op.label}
                  </h4>
                  <p className="text-[10px] font-bold text-slate-400 ml-10 mt-1 uppercase tracking-widest">{op.operation_code}</p>
                </div>
                
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className="relative flex-1 md:w-48 group-focus-within:ring-4 rounded-xl transition-all" style={{ ringColor: 'rgba(200,131,74,0.1)' }}>
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">₹</span>
                    <input 
                      type="number" step="0.01" min="0"
                      className="w-full h-14 pl-9 pr-4 bg-slate-50 hover:bg-white font-black text-lg border-2 rounded-xl outline-none transition-all shadow-inner focus:bg-white focus:border-[#c8834a] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      style={{ color: '#c8834a', borderColor: 'transparent' }}
                      value={op.rate ?? ''} 
                      onChange={(e) => {
                        const newRates = [...rates];
                        newRates[idx].rate = e.target.value;
                        setRates(newRates);
                      }}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <button 
                    onClick={() => handleSaveSingleRate(op)} 
                    disabled={isSaving}
                    className="w-14 h-14 rounded-xl font-bold text-white shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 disabled:opacity-50 flex items-center justify-center active:scale-95 shrink-0"
                    style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}
                    title="Save Rate"
                  >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  </button>
                  <button 
                    onClick={() => handleShowHistory(op.operation_code)} 
                    className="w-14 h-14 rounded-xl bg-white shadow-sm border transition-all hover:shadow-md flex items-center justify-center shrink-0"
                    style={{ borderColor: 'rgba(200,131,74,0.2)' }}
                    title="View Rate History"
                  >
                    <History className="w-5 h-5 text-slate-400 hover:text-[#c8834a] transition-colors" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Floating Save All Button */}
        <div className="sticky bottom-6 z-50 flex justify-center mt-8 animate-fade-in-up">
          <button
            onClick={handleSaveAllRates}
            disabled={savingAll}
            className="h-14 px-10 rounded-full font-black text-base text-white shadow-2xl transition-all hover:shadow-emerald-500/20 hover:-translate-y-1 active:scale-95 disabled:opacity-50 flex items-center gap-3 border border-emerald-400/30 backdrop-blur-md"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
          >
            {savingAll ? <><Loader2 className="w-5 h-5 animate-spin" /> Saving Grid...</> : <><Save className="w-5 h-5" /> Commit All Rates</>}
          </button>
        </div>

        {/* Audit History Modal */}
        {historyModal && typeof document !== 'undefined' && createPortal(
          <div className="fixed inset-0 flex items-center justify-center p-4 z-[99999] bg-slate-900/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl animate-scale-up overflow-hidden mx-4">
              <div className="p-6 sm:p-8 pb-6 border-b" style={{ background: '#faf6f0', borderColor: 'rgba(200,131,74,0.1)' }}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-black text-2xl" style={{ color: '#2d1f0e' }}>Audit Trail</h3>
                    <p className="text-xs font-bold uppercase tracking-widest mt-1" style={{ color: '#c8834a' }}>OP: {historyModal.operation_code}</p>
                  </div>
                  <button onClick={() => setHistoryModal(null)} className="p-2 bg-white rounded-full border shadow-sm text-slate-400 hover:text-slate-700 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-8 max-h-[60vh] overflow-y-auto bg-slate-50">
                {historyModal.history.length === 0 ? (
                  <div className="text-center py-10 opacity-60">
                    <History className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                    <p className="text-sm font-bold text-slate-400">No revisions found.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {historyModal.history.map((h, i) => (
                      <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border flex justify-between items-center" style={{ borderColor: i === 0 ? '#10b981' : 'rgba(200,131,74,0.1)' }}>
                        <div>
                          {i === 0 && <span className="block text-[9px] font-black uppercase text-emerald-600 mb-1 tracking-widest">Active Rate</span>}
                          <p className="text-xs font-bold text-slate-400 mb-0.5">Effective From</p>
                          <p className="font-black text-sm" style={{ color: '#2d1f0e' }}>{h.effective_from}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-2xl" style={{ color: i === 0 ? '#10b981' : '#c8834a' }}>₹{h.rate}</p>
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

  // STYLES GRID (Default View)
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/80 backdrop-blur-md p-4 rounded-3xl shadow-sm border" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
        <div className="relative w-full">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Style Code or Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-14 pl-14 pr-12 bg-transparent border-none text-sm font-bold text-slate-800 focus:outline-none placeholder-slate-400"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
              <X className="w-3 h-3 text-slate-500" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6 items-stretch">
        {filteredStyles.length > 0 ? (
          filteredStyles.map((s, idx) => {
            const progress = (s.rated_operations / s.total_operations) * 100;
            const isComplete = progress === 100;
            return (
              <SpotlightCard 
                key={s.style_code} 
                onClick={() => handleSelectStyle(s)} 
                className="p-5 sm:p-6 bg-white cursor-pointer transition-all rounded-3xl shadow-sm hover:shadow-xl group hover:-translate-y-1 flex flex-col justify-between h-full" 
                style={{ border: '1px solid rgba(200,131,74,0.15)' }} 
                spotlightColor="rgba(200,131,74,0.06)"
              >
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm" style={{ background: isComplete ? '#f0fdf4' : '#faf6f0', color: isComplete ? '#10b981' : '#c8834a' }}>
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest">
                      Edit Rates
                    </span>
                  </div>
                  
                  <h3 className="font-black text-xl mb-1 truncate" style={{ color: '#2d1f0e' }}>{s.style_code}</h3>
                  <p className="text-xs font-bold text-[#9a7a5a] mb-8 line-clamp-1">{s.style_name}</p>
                </div>
                
                <div className="space-y-3 mt-auto">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: isComplete ? '#10b981' : '#c8834a' }}>
                      {isComplete ? 'Configuration Complete' : 'Pending Rates'}
                    </span>
                    <span className="font-black text-sm" style={{ color: '#2d1f0e' }}>{s.rated_operations}/{s.total_operations}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{ 
                        width: `${progress}%`,
                        background: isComplete ? 'linear-gradient(90deg, #34d399, #10b981)' : 'linear-gradient(90deg, #e8a06a, #c8834a)' 
                      }}
                    />
                  </div>
                </div>
              </SpotlightCard>
            );
          })
        ) : (
          <div className="col-span-full py-20 text-center bg-white/50 backdrop-blur-sm rounded-[2rem] border border-dashed border-slate-300">
            <Filter className="w-10 h-10 mx-auto text-slate-300 mb-4" />
            <p className="font-bold text-slate-400">No styles found matching "{searchQuery}"</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 2. COMPUTATION ENGINE VIEW ──────────────────────────────────────────────
function ComputationView({ token }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('ALL');
  const [styles, setStyles] = useState([]);
  
  const [isComputing, setIsComputing] = useState(false);
  const [calculatedPayroll, setCalculatedPayroll] = useState([]);
  const [totalPayrollAmount, setTotalPayrollAmount] = useState(0);
  const [toastMsg, setToastMsg] = useState(null);
  const [toastType, setToastType] = useState('success');

  const showToast = (msg, type = 'success') => {
    setToastMsg(msg); setToastType(type);
    setTimeout(() => setToastMsg(null), 3000);
  };

  useEffect(() => {
    // Set default dates
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
    // Fetch styles for the mock dropdown
    apiGetWageStyles(token).then(setStyles).catch(() => {});
  }, [token]);

  const handleCompute = async () => {
    setIsComputing(true);
    setCalculatedPayroll([]);
    setTotalPayrollAmount(0);
    try {
      // MOCK BEHAVIOR: We technically want to pass selectedStyle, but since backend doesn't support it, 
      // the existing endpoint apiComputeWageRun expects only (token, start_date, end_date)
      // Future update: apiComputeWageRun(token, startDate, endDate, selectedStyle === 'ALL' ? null : selectedStyle)
      const runData = await apiComputeWageRun(token, startDate, endDate);
      const lines = runData.lines || [];
      setCalculatedPayroll(lines);
      setTotalPayrollAmount(runData.total_amount || lines.reduce((acc, l) => acc + (l.amount_calculated || 0), 0));
      showToast('Payroll processed and frozen successfully.', 'success');
    } catch (e) {
      showToast(e.message || 'Computation failed.', 'error');
    } finally {
      setIsComputing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Toast msg={toastMsg} type={toastType} />
      
      {/* ── ACTION CENTER ── */}
      <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 border relative overflow-hidden" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#c8834a]/10 to-transparent rounded-full blur-3xl pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
        
        <h3 className="text-xl font-black mb-6 flex items-center gap-2" style={{ color: '#2d1f0e' }}>
          <Activity className="w-6 h-6" style={{ color: '#c8834a' }} /> Engine Configuration
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2 relative z-10">
            <label className="text-[10px] font-black uppercase tracking-widest block" style={{ color: '#9a7a5a' }}>Start Date</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="date" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)}
                className="w-full h-14 pl-12 pr-4 bg-slate-50 rounded-xl font-bold text-sm outline-none border focus:border-[#c8834a] focus:bg-white transition-all shadow-inner"
                style={{ borderColor: 'rgba(200,131,74,0.1)' }}
              />
            </div>
          </div>
          
          <div className="space-y-2 relative z-10">
            <label className="text-[10px] font-black uppercase tracking-widest block" style={{ color: '#9a7a5a' }}>End Date</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="date" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)}
                className="w-full h-14 pl-12 pr-4 bg-slate-50 rounded-xl font-bold text-sm outline-none border focus:border-[#c8834a] focus:bg-white transition-all shadow-inner"
                style={{ borderColor: 'rgba(200,131,74,0.1)' }}
              />
            </div>
          </div>
          
          <div className="space-y-2 relative z-10">
            <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: '#9a7a5a' }}>
              Target Style
              <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[8px] border border-amber-200">Mocked</span>
            </label>
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select 
                value={selectedStyle}
                onChange={e => setSelectedStyle(e.target.value)}
                className="w-full h-14 pl-12 pr-12 bg-slate-50 rounded-xl font-bold text-sm outline-none border focus:border-[#c8834a] focus:bg-white transition-all shadow-inner appearance-none cursor-pointer text-ellipsis overflow-hidden whitespace-nowrap"
                style={{ borderColor: 'rgba(200,131,74,0.1)' }}
              >
                <option value="ALL">All Styles (Master Ledger)</option>
                {styles.map(s => (
                  <option key={s.style_code} value={s.style_code}>{s.style_code} - {s.style_name}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 font-bold text-xs">▼</div>
            </div>
            <p className="text-[9px] font-bold text-slate-400 mt-1 leading-tight">Backend filter integration pending. Displays full ledger for now.</p>
          </div>
        </div>
        
        <div className="mt-8 flex justify-end relative z-10 pt-6" style={{ borderTop: '1px solid rgba(200,131,74,0.1)' }}>
          <button
            onClick={handleCompute}
            disabled={isComputing}
            className="h-14 px-10 rounded-full font-black text-sm text-white shadow-xl transition-all hover:shadow-orange-500/30 hover:-translate-y-1 active:scale-95 disabled:opacity-50 flex items-center gap-3"
            style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}
          >
            {isComputing ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing Matrix...</> : <><Activity className="w-5 h-5" /> Execute Wage Run</>}
          </button>
        </div>
      </div>

      {/* ── RESULTS DASHBOARD ── */}
      {calculatedPayroll.length > 0 && (
        <div className="space-y-6 animate-fade-in-up">
          {/* Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-slate-900 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden border border-slate-800">
              <div className="absolute top-0 right-0 p-8 opacity-10"><Coins className="w-32 h-32 text-white" /></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Ledger Commitment</p>
              <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">
                ₹{totalPayrollAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </h2>
            </div>
            <div className="bg-white rounded-[2rem] p-8 shadow-xl border flex flex-col justify-center" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
              <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: '#9a7a5a' }}>Employees Processed</p>
              <h3 className="text-4xl font-black" style={{ color: '#2d1f0e' }}>{calculatedPayroll.length}</h3>
            </div>
          </div>

          {/* Cards List */}
          <h4 className="text-sm font-black uppercase tracking-widest pl-2 pt-4" style={{ color: '#9a7a5a' }}>Individual Payouts</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {calculatedPayroll.map((pay, idx) => (
              <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-all border flex flex-col sm:flex-row sm:items-center justify-between gap-4 group" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 group-hover:bg-[#faf6f0] group-hover:text-[#c8834a] group-hover:border-[#c8834a]/20 transition-all">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-black text-lg" style={{ color: '#2d1f0e' }}>{pay.employee_name || 'Worker'}</h5>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{pay.wage_type || 'Piece Rate'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-xl" style={{ color: '#10b981' }}>₹{(pay.amount_calculated ?? pay.amount ?? 0).toLocaleString('en-IN')}</p>
                  <p className="text-[10px] font-bold text-slate-400">{pay.total_pieces ?? pay.pieces ?? 0} Pieces Logged</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 3. LEDGER HISTORY VIEW ──────────────────────────────────────────────────
function LedgerView({ token }) {
  const [runs, setRuns] = useState([]);
  const [selectedRunDetails, setSelectedRunDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    apiGetWageRuns(token).then(data => {
      if(active) setRuns(data);
    }).finally(() => { if(active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  const handleViewDetails = async (runId) => {
    console.log("Clicked handleViewDetails with runId:", runId);
    if (!runId) {
        console.error("runId is missing! Full run object might use 'id' instead of 'run_id'");
        return;
    }
    setDetailsLoading(runId);
    try {
      const details = await apiGetWageRunDetails(token, runId);
      setSelectedRunDetails(details);
    } catch (err) {
      alert(err.message);
    } finally {
      setDetailsLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 opacity-60">
        <Loader2 className="w-10 h-10 animate-spin text-[#c8834a] mb-4" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {runs.length === 0 ? (
        <div className="py-24 text-center bg-white/50 backdrop-blur-sm rounded-3xl border border-dashed border-slate-300">
          <History className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <p className="font-bold text-slate-400">Ledger is empty. No wage runs have been generated yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6 items-stretch">
          {runs.map((run, i) => {
            const currentRunId = run.run_id || run.id;
            return (
            <SpotlightCard 
              key={i} 
              onClick={() => handleViewDetails(currentRunId)}
              className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border flex flex-col justify-between min-h-[180px] h-full cursor-pointer group" 
              style={{ borderColor: 'rgba(200,131,74,0.15)' }} 
              spotlightColor="rgba(200,131,74,0.06)"
            >
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div className="bg-[#faf6f0] p-3 rounded-2xl border group-hover:scale-110 transition-transform duration-300" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
                    <Calendar className="w-6 h-6" style={{ color: '#c8834a' }} />
                  </div>
                  <span className="bg-emerald-50 text-emerald-700 px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-200 shadow-sm">
                    Frozen
                  </span>
                </div>
                
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 group-hover:text-[#c8834a] transition-colors">Pay Cycle</p>
                <h3 className="font-black text-xl" style={{ color: '#2d1f0e' }}>{run.start_date} <span className="opacity-40 px-1">to</span> {run.end_date}</h3>
              </div>
              
              <div className="mt-8 pt-6 flex items-center justify-between" style={{ borderTop: '1px solid rgba(200,131,74,0.1)' }}>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 mb-0.5">Disbursement Total</p>
                  <p className="font-black text-lg" style={{ color: '#10b981' }}>₹{run.total_amount?.toLocaleString('en-IN') || '0.00'}</p>
                </div>
                
                <div
                  className="flex items-center justify-center w-12 h-12 bg-slate-50 group-hover:bg-[#faf6f0] group-hover:shadow-md rounded-xl transition-all duration-300 border"
                  style={{ borderColor: 'rgba(200,131,74,0.2)' }}
                >
                  {detailsLoading === currentRunId 
                    ? <Loader2 className="w-5 h-5 animate-spin text-[#c8834a]" /> 
                    : <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[#c8834a] group-hover:translate-x-1 transition-all" />
                  }
                </div>
              </div>
            </SpotlightCard>
            );
          })}
        </div>
      )}

      {/* Ledger Deep Dive Modal */}
      {selectedRunDetails && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[99999] bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-50 rounded-[2.5rem] w-full max-w-4xl shadow-2xl animate-scale-up overflow-hidden flex flex-col max-h-[90vh] mx-4">
            
            <div className="p-6 sm:p-8 pb-10 bg-white relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
              
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <h3 className="font-black text-3xl" style={{ color: '#2d1f0e' }}>Ledger Manifest</h3>
                  <div className="flex gap-4 mt-3">
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-md">ID: {selectedRunDetails.run_id?.substring(0,8)}...</span>
                    <span className="text-xs font-bold text-[#c8834a] bg-[#faf6f0] px-3 py-1 rounded-md">{selectedRunDetails.start_date} to {selectedRunDetails.end_date}</span>
                  </div>
                </div>
                <button onClick={() => setSelectedRunDetails(null)} className="p-3 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 relative z-10">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                  <p className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">Total Disbursed</p>
                  <p className="text-2xl font-black text-emerald-700 mt-1">₹{selectedRunDetails.total_amount?.toLocaleString('en-IN')}</p>
                </div>
                <div className="p-4 rounded-2xl bg-white border shadow-sm">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Headcount</p>
                  <p className="text-2xl font-black text-slate-800 mt-1">{selectedRunDetails.lines?.length || 0}</p>
                </div>
                <div className="p-4 rounded-2xl bg-white border shadow-sm">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Pieces</p>
                  <p className="text-2xl font-black text-slate-800 mt-1">
                    {selectedRunDetails.lines?.reduce((acc, l) => acc + (l.total_pieces ?? l.pieces ?? 0), 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-red-50 border border-red-100">
                  <p className="text-[10px] font-black uppercase text-red-600 tracking-wider">Unrated Ops</p>
                  <p className="text-2xl font-black text-red-700 mt-1">{selectedRunDetails.unrated_ops_count || 0}</p>
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 pl-2">Detailed Line Items</h4>
              
              {selectedRunDetails.lines?.length === 0 ? (
                <div className="text-center py-10 opacity-50">
                  <p className="font-bold text-sm">No records found for this run.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedRunDetails.lines?.map((line, idx) => (
                    <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h5 className="font-black text-base text-slate-800">{line.employee_name || 'Worker'}</h5>
                        <p className="text-[10px] font-black uppercase text-slate-400 mt-1">
                          {line.wage_type || 'Piece Rate'} • {line.total_pieces ?? line.pieces ?? 0} pieces
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-lg text-emerald-600">₹{(line.amount_calculated ?? line.amount ?? 0).toLocaleString('en-IN')}</p>
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
