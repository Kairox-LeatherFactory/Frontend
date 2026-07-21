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
      <div className="flex gap-6 border-b border-orange-100 pb-4">
        <button 
          onClick={() => setActiveTab('styles')} 
          className={`font-black text-sm pb-2 border-b-2 transition-colors ${activeTab === 'styles' ? 'text-orange-600 border-orange-600' : 'text-slate-400 border-transparent'}`}
        >
          Styles & Rates
        </button>
        <button 
          onClick={() => setActiveTab('payroll')} 
          className={`font-black text-sm pb-2 border-b-2 transition-colors ${activeTab === 'payroll' ? 'text-orange-600 border-orange-600' : 'text-slate-400 border-transparent'}`}
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

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-orange-600" /></div>;

  if (selectedStyle) {
    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedStyle(null)} className="text-sm font-bold text-orange-600 hover:underline">← Back to Styles</button>
        <div className="p-6 bg-white rounded-2xl shadow-sm border border-orange-100 relative">
          <h2 className="font-black text-lg">{selectedStyle.style_name}</h2>
          <table className="w-full mt-4 text-sm">
            <thead>
              <tr className="text-left text-slate-400 uppercase text-[10px]">
                <th className="p-2">Operation</th>
                <th className="p-2">Rate (₹)</th>
                <th className="p-2 text-right">History</th>
              </tr>
            </thead>
            <tbody>
              {rates.map((op, idx) => (
                <tr key={op.operation_code} className="border-b">
                  <td className="p-2 font-bold">{op.label}</td>
                  <td className="p-2">
                    <input 
                      type="number" 
                      className="w-24 p-1 border rounded font-bold"
                      value={op.rate ?? ''} 
                      onChange={(e) => {
                        const newRates = [...rates];
                        newRates[idx].rate = e.target.value;
                        setRates(newRates);
                      }}
                    />
                  </td>
                  <td className="p-2 text-right">
                    <button onClick={() => handleShowHistory(op.operation_code)} className="p-1 text-slate-400 hover:text-orange-600">
                      <History className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={handleSaveRates} disabled={saving} className="mt-4 px-6 py-2 bg-orange-600 text-white rounded-xl font-black">
            {saving ? 'Saving...' : 'Save All Rates'}
          </button>
        </div>

        {/* Audit History Modal */}
        {historyModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md relative">
              <button onClick={() => setHistoryModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-black text-base mb-2">Rate History ({historyModal.operation_code})</h3>
              <ul className="divide-y text-xs">
                {historyModal.history.map((h, i) => (
                  <li key={i} className="py-2 flex justify-between">
                    <span>Effective: {h.effective_from}</span>
                    <span className="font-bold text-orange-600">₹{h.rate}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {styles.map(s => (
        <SpotlightCard key={s.style_code} onClick={() => handleSelectStyle(s)} className="p-4 cursor-pointer hover:border-orange-300">
          <h3 className="font-black text-sm">{s.style_code}</h3>
          <p className="text-xs text-slate-500">{s.style_name}</p>
          <div className="mt-2 text-[10px] font-bold text-orange-600">
            {s.rated_operations} / {s.total_operations} Priced
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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  // Initial fetch for history
  useEffect(() => {
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
    <div className="space-y-6">
      <div className="flex gap-4 p-4 bg-orange-50 rounded-xl items-center">
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2 rounded border text-xs" />
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-2 rounded border text-xs" />
        <button onClick={handleRunPayroll} disabled={loading} className="px-6 py-2 bg-orange-600 text-white rounded-xl font-black text-xs">
          {loading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Compute & Freeze'}
        </button>
      </div>
      
      <div className="bg-white rounded-xl border p-4">
        {runs.length === 0 ? <p className="text-sm text-slate-500">No payroll history found.</p> : (
            <table className="w-full text-xs">
                <thead>
                    <tr className="border-b uppercase text-slate-500 text-left">
                        <th className="p-2">Period</th>
                        <th className="p-2">Amount</th>
                        <th className="p-2">Status</th>
                        <th className="p-2 text-right">Action</th>
                    </tr>
                </thead>
                <tbody>
                    {runs.map(r => (
                        <tr key={r.id} className="border-b hover:bg-slate-50">
                            <td className="p-2 font-medium">{r.period_start} to {r.period_end}</td>
                            <td className="p-2 font-bold text-orange-600">₹{r.total_amount.toLocaleString()}</td>
                            <td className="p-2"><span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] uppercase font-bold">{r.status}</span></td>
                            <td className="p-2 text-right">
                              <button onClick={() => handleViewDetails(r.id)} className="p-1 text-slate-400 hover:text-orange-600">
                                <Eye className="w-4 h-4" />
                              </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        )}
      </div>

      {/* Wage Run Breakdown Modal */}
      {selectedRunDetails && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg relative">
            <button onClick={() => setSelectedRunDetails(null)} className="absolute top-4 right-4 text-slate-400 hover:text-black">
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-black text-base mb-4">Run Details ({selectedRunDetails.id})</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-left text-slate-400 uppercase text-[10px]">
                  <th className="p-2">Employee</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Pieces</th>
                  <th className="p-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {selectedRunDetails.lines.map((line, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="p-2 font-bold">{line.employee_name}</td>
                    <td className="p-2 uppercase">{line.wage_type}</td>
                    <td className="p-2">{line.total_pieces}</td>
                    <td className="p-2 text-right font-bold">₹{line.amount_calculated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
