'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  apiGetWageStyles, 
  apiComputeWageRun, 
  apiGetWageRuns, 
  apiGetRateSheet, 
  apiSetWageRatesBulk,
  apiGetRateHistory,
  apiGetWageRunDetails 
} from '@/lib/api';
import { Loader2, History, Eye, X } from 'lucide-react';
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
      <div className="flex gap-3 p-1.5 rounded-2xl w-max" style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.15)' }}>
        <button 
          onClick={() => setActiveTab('styles')} 
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'styles' ? 'bg-white shadow-sm border' : 'hover:bg-white/50 border border-transparent'}`}
          style={activeTab === 'styles' ? { color: '#c8834a', borderColor: 'rgba(200,131,74,0.2)' } : { color: '#9a7a5a' }}
        >
          Styles & Rates
        </button>
        <button 
          onClick={() => setActiveTab('payroll')} 
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'payroll' ? 'bg-white shadow-sm border' : 'hover:bg-white/50 border border-transparent'}`}
          style={activeTab === 'payroll' ? { color: '#c8834a', borderColor: 'rgba(200,131,74,0.2)' } : { color: '#9a7a5a' }}
        >
          Payroll Runs
        </button>
      </div>
      
      {activeTab === 'styles' ? <StylesView token={token} /> : <PayrollView token={token} />}
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
  const [saving, setSaving] = useState(false);

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

  const handleSaveRates = async () => {
    setSaving(true);
    try {
      const payload = {
        style_code: selectedStyle.style_code,
        effective_from: new Date().toISOString().split('T')[0],
        lines: rates.map(r => ({ operation_code: r.operation_code, rate: parseFloat(r.rate || 0) }))
      };
      await apiSetWageRatesBulk(token, payload);
      alert("Rates saved successfully!");
      setSelectedStyle(null);
    } catch (e) { alert("Error saving: " + e.message); }
    finally { setSaving(false); }
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

          <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
            <table className="w-full text-sm text-left">
              <thead style={{ background: '#faf6f0', borderBottom: '1px solid rgba(200,131,74,0.1)' }}>
                <tr className="uppercase text-[10px] font-black tracking-wider" style={{ color: '#9a7a5a' }}>
                  <th className="p-4">Operation Phase</th>
                  <th className="p-4 w-40">Rate Per Piece (₹)</th>
                  <th className="p-4 w-24 text-right">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ divideColor: 'rgba(200,131,74,0.05)' }}>
                {rates.map((op, idx) => (
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
                          className="w-full h-11 pl-7 pr-3 bg-white font-black text-sm border-2 rounded-xl outline-none transition-all shadow-sm focus:bg-white"
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
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => handleShowHistory(op.operation_code)} 
                        className="p-2 rounded-lg bg-white shadow-sm border transition-all hover:shadow-md group flex items-center justify-center ml-auto"
                        style={{ borderColor: 'rgba(200,131,74,0.2)' }}
                        title="View Rate History"
                      >
                        <History className="w-4 h-4 text-slate-400 group-hover:text-[#c8834a] transition-colors" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-4 flex justify-end">
            <button 
              onClick={handleSaveRates} 
              disabled={saving} 
              className="h-12 px-8 rounded-xl text-white font-black text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 hover:shadow-lg disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save New Rates'}
            </button>
          </div>
        </SpotlightCard>

        {/* Audit History Modal */}
        {historyModal && (
          <div 
            className="fixed inset-0 flex items-center justify-center p-4 z-[99999]"
            style={{ background: 'rgba(15, 23, 42, 0.6)' }}
            onClick={(e) => { if(e.target === e.currentTarget) setHistoryModal(null); }}
          >
            <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-md relative shadow-2xl animate-scale-up border" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
              <button 
                onClick={() => setHistoryModal(null)} 
                className="absolute top-6 right-6 p-2 bg-slate-50 text-slate-400 hover:text-slate-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h3 className="font-black text-lg mb-1" style={{ color: '#2d1f0e' }}>Rate Audit History</h3>
              <p className="text-xs font-bold text-[#c8834a] uppercase tracking-wider mb-6">OP: {historyModal.operation_code}</p>
              
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {historyModal.history.length === 0 ? (
                  <p className="text-sm font-medium text-slate-400 text-center py-4">No history recorded for this operation.</p>
                ) : (
                  historyModal.history.map((h, i) => (
                    <div key={i} className="flex justify-between items-center p-4 rounded-2xl border" style={{ background: i === 0 ? '#fff9f0' : '#faf6f0', borderColor: i === 0 ? 'rgba(200,131,74,0.3)' : 'rgba(200,131,74,0.1)' }}>
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Effective From</p>
                        <p className="font-bold text-sm" style={{ color: '#4a3a2a' }}>{h.effective_from}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Rate</p>
                        <p className="font-black text-lg" style={{ color: '#c8834a' }}>₹{h.rate}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
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

// ─── PAYROLL VIEW ────────────────────────────────────────────────────────────
function PayrollView({ token }) {
  const [runs, setRuns] = useState([]);
  const [selectedRunDetails, setSelectedRunDetails] = useState(null);
  
  // Default to current month's payroll dates
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Set default dates to first and 15th of current month
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    setStartDate(`${y}-${m}-01`);
    setEndDate(`${y}-${m}-15`);
    
    apiGetWageRuns(token).then(setRuns);
  }, [token]);

  const handleRunPayroll = async () => {
    if (!startDate || !endDate) return alert("Select dates");
    setLoading(true);
    try {
      await apiComputeWageRun(token, startDate, endDate);
      const data = await apiGetWageRuns(token);
      setRuns(data);
    } catch (err) { alert(err.message); } finally { setLoading(false); }
  };

  const handleViewDetails = async (runId) => {
    const details = await apiGetWageRunDetails(token, runId);
    setSelectedRunDetails(details);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <SpotlightCard className="p-6 sm:p-8 bg-white shadow-xl rounded-3xl" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.06)">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex-1 space-y-2">
            <h3 className="font-extrabold text-base uppercase tracking-wider" style={{ color: '#2d1f0e' }}>Active Computation Engine</h3>
            <p className="text-xs font-bold text-[#9a7a5a]">Select a period to parse floor logs and distribute wages.</p>
            
            <div className="flex items-center gap-3 pt-2">
              <input 
                type="date" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)} 
                className="h-12 px-4 bg-[#faf6f0] font-black text-sm border-2 outline-none rounded-xl transition-all w-full sm:w-auto"
                style={{ borderColor: 'rgba(200,131,74,0.2)', color: '#4a3a2a' }}
              />
              <span className="font-bold text-slate-300">to</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)} 
                className="h-12 px-4 bg-[#faf6f0] font-black text-sm border-2 outline-none rounded-xl transition-all w-full sm:w-auto"
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
      </SpotlightCard>
      
      <div className="bg-white rounded-3xl border shadow-sm overflow-hidden" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
        <div className="px-6 py-5 border-b" style={{ borderColor: 'rgba(200,131,74,0.1)', background: '#faf6f0' }}>
          <h3 className="font-black text-sm uppercase tracking-wider" style={{ color: '#9a7a5a' }}>Payroll Ledger History</h3>
        </div>
        
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
                  <th className="p-4">Disbursement Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 pr-6 text-right">View Ledger</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ divideColor: 'rgba(200,131,74,0.05)' }}>
                {runs.map(r => (
                  <tr key={r.id} className="hover:bg-[#fcfaf8] transition-colors">
                    <td className="p-4 pl-6 font-bold" style={{ color: '#4a3a2a' }}>{r.period_start} <span className="text-slate-300 font-normal mx-1">to</span> {r.period_end}</td>
                    <td className="p-4 font-black text-lg" style={{ color: '#2d1f0e' }}>₹{r.total_amount.toLocaleString()}</td>
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
        )}
      </div>

      {/* Wage Run Breakdown Modal */}
      {selectedRunDetails && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-4 z-[99999]"
          style={{ background: 'rgba(15, 23, 42, 0.6)' }}
          onClick={(e) => { if(e.target === e.currentTarget) setSelectedRunDetails(null); }}
        >
          <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-2xl relative max-h-[90vh] flex flex-col shadow-2xl animate-scale-up border" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
            <button 
              onClick={() => setSelectedRunDetails(null)} 
              className="absolute top-6 right-6 p-2 bg-slate-50 text-slate-400 hover:text-slate-800 rounded-xl transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="mb-6 pr-12 shrink-0">
              <h3 className="font-black text-xl" style={{ color: '#2d1f0e' }}>Run Breakdown</h3>
              <p className="text-xs font-bold text-[#9a7a5a] uppercase tracking-wider mt-1">ID: {selectedRunDetails.id}</p>
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
                  {selectedRunDetails.lines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-[#fcfaf8] transition-colors">
                      <td className="p-4 font-bold" style={{ color: '#2d1f0e' }}>{line.employee_name}</td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md uppercase text-[10px] font-bold">
                          {line.wage_type}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-center" style={{ color: '#9a7a5a' }}>{line.total_pieces}</td>
                      <td className="p-4 text-right font-black text-lg" style={{ color: '#c8834a' }}>₹{line.amount_calculated?.toLocaleString() ?? 0}</td>
                    </tr>
                  ))}
                  {(!selectedRunDetails.lines || selectedRunDetails.lines.length === 0) && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-400 font-bold">No wage records generated in this ledger run.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="mt-6 pt-6 border-t flex justify-between items-center shrink-0" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
              <div className="text-xs font-bold text-slate-400">Total Records: {selectedRunDetails.lines.length}</div>
              <button 
                onClick={() => setSelectedRunDetails(null)}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-colors"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
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
