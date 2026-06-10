'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { apiSetWageRate, apiComputeWageRun } from '@/lib/api';
import { CheckCircle2, Tag, Lock, Settings, Coins, FolderOpen, Loader2 } from 'lucide-react';

export default function PieceRatesAndWages() {
  const { user, token } = useAuth();
  const { orders, operations } = useData();

  // Role Gate check
  const isDirectManager = user === 'direct_manager';

  // State for active pay computation run
  const [payPeriod, setPayPeriod] = useState('May 16-31, 2026');
  const [isCalculated, setIsCalculated] = useState(false);
  const [isFreezing, setIsFreezing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const [calculatedPayroll, setCalculatedPayroll] = useState([]);
  const [totalPayrollAmount, setTotalPayrollAmount] = useState(0);

  // Set Wage Rate Form State
  const [styleId, setStyleId] = useState('');
  const [operation, setOperation] = useState('CUTTING');
  const [pieceRate, setPieceRate] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [isSettingRate, setIsSettingRate] = useState(false);

  // Auto-select first order for the style dropdown
  useEffect(() => {
    if (!styleId && orders && orders.length > 0) {
      setStyleId(orders[0].style); // using style name as ID for now based on context
    }
  }, [orders, styleId]);

  const handleSetRate = async (e) => {
    e.preventDefault();
    if (!isDirectManager) return;
    setIsSettingRate(true);
    setErrorMsg('');
    try {
      // Find UUIDs
      const orderMatch = orders.find(o => o.style === styleId);
      const opMatch = operations.find(o => o.label.toLowerCase() === operation.toLowerCase());
      
      if (!orderMatch || !opMatch) {
        throw new Error("Could not find matching Style ID or Operation ID in database.");
      }

      await apiSetWageRate(token, {
        style_id: orderMatch.style_id,
        operation_id: opMatch.id,
        rate: parseFloat(pieceRate),
        effective_from: effectiveDate
      });
      setSuccessMsg(`Piece rate for ${operation} on ${styleId} set successfully.`);
      setTimeout(() => setSuccessMsg(''), 5000);
      setPieceRate('');
    } catch (err) {
      setErrorMsg(err.message);
      setTimeout(() => setErrorMsg(''), 5000);
    } finally {
      setIsSettingRate(false);
    }
  };

  const handleComputeRun = async () => {
    if (!isDirectManager) return;
    setIsFreezing(true);
    setErrorMsg('');
    try {
      // Parse the period dropdown (e.g. "May 16-31, 2026") into YYYY-MM-DD
      let start_date = '2026-05-16';
      let end_date = '2026-05-31';
      if (payPeriod.includes('June')) {
        start_date = '2026-06-01';
        end_date = '2026-06-15';
      }

      const runData = await apiComputeWageRun(token, start_date, end_date);
      // Backend returns run with lines
      const lines = runData.lines || [];
      setCalculatedPayroll(lines);
      setTotalPayrollAmount(runData.total_amount || lines.reduce((acc, l) => acc + (l.amount_calculated || 0), 0));
      setIsCalculated(true);
      setSuccessMsg(`Payroll Period "${payPeriod}" computed & frozen successfully!`);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setErrorMsg(`Failed to compute payroll: ${err.message}`);
      setTimeout(() => setErrorMsg(''), 6000);
    } finally {
      setIsFreezing(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      
      {/* ─── TITLE SECTION ─── */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Payroll &amp; Rates Manager</h1>
        <p className="text-slate-500 font-medium">Verify piece-rates and execute audits on shop floor wage calculations.</p>
      </div>

      {/* ─── BANNER ALERTS ─── */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl font-bold text-sm shadow-md animate-fade-in flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <p>{successMsg}</p>
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl font-bold text-sm shadow-md animate-fade-in flex items-center gap-2.5">
          <p>{errorMsg}</p>
        </div>
      )}

      {/* ─── DOUBLE BLOCK ROW: RATES & STATUS ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: SET PIECE RATE */}
        <div className="card p-6 bg-white border border-blue-100 shadow-xl space-y-6">
          <h3 className="text-lg font-extrabold text-slate-900 border-b border-slate-100 pb-4 flex items-center gap-2">
            <Tag className="w-5 h-5 text-blue-600" /> Set Piece Rate
          </h3>
          <p className="text-xs font-semibold text-slate-400">
            Define contract piece pay scale for specific styles and operations.
          </p>

          {!isDirectManager ? (
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs font-bold text-amber-800 flex items-center gap-2">
              <Lock className="w-4 h-4" /> Manager Access Required
            </div>
          ) : (
            <form onSubmit={handleSetRate} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Style</label>
                <select 
                  className="input-field mt-1" 
                  value={styleId} 
                  onChange={(e) => setStyleId(e.target.value)}
                  required
                >
                  {orders.map(o => (
                    <option key={o.id} value={o.style}>{o.style}</option>
                  ))}
                  <option value="CARNABY">CARNABY</option>
                  <option value="REGAL">REGAL</option>
                </select>
              </div>
              
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Operation</label>
                <select 
                  className="input-field mt-1" 
                  value={operation} 
                  onChange={(e) => setOperation(e.target.value)}
                  required
                >
                  <option value="CUTTING">Cutting</option>
                  <option value="FUSING">Fusing</option>
                  <option value="PASTING">Pasting</option>
                  <option value="FF">FF</option>
                  <option value="SHELL STITCH">Shell Stitch</option>
                  <option value="LINING STITCH">Lining Stitch</option>
                  <option value="LA">L/A</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Rate per Piece (₹)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0"
                  className="input-field mt-1" 
                  value={pieceRate} 
                  onChange={(e) => setPieceRate(e.target.value)}
                  placeholder="e.g. 80.00"
                  required
                />
              </div>

              <button 
                type="submit" 
                disabled={isSettingRate}
                className="btn-primary w-full py-3 bg-blue-600 hover:bg-blue-700 flex justify-center items-center gap-2"
              >
                {isSettingRate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
                Save Piece Rate
              </button>
            </form>
          )}
        </div>

        {/* RIGHT COLUMN: PAYROLL OPERATIONS ENGINE */}
        <div className="lg:col-span-2 space-y-6">
          
          {!isDirectManager ? (
            <div className="card p-8 bg-amber-50/60 border border-amber-200 shadow-lg text-center space-y-4">
              <Lock className="w-12 h-12 text-amber-500 mx-auto" />
              <h3 className="text-lg font-black text-amber-900 uppercase tracking-wide">
                Direct Manager Authorization Required
              </h3>
              <p className="text-xs text-amber-700 font-semibold max-w-lg mx-auto">
                While piece rates are open to read-only floor audits, payroll runs, frozen logs, and cash distributions are restricted. Switch profiles to run computations.
              </p>
            </div>
          ) : (
            <div className="card p-6 sm:p-8 bg-white border border-blue-100 shadow-xl space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 gap-4">
                <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-600" /> Active Computation Engine
                </h3>
                <div className="flex items-center gap-2">
                  <select
                    value={payPeriod}
                    onChange={(e) => setPayPeriod(e.target.value)}
                    className="input-field h-10 py-0 min-h-[40px] font-extrabold text-xs bg-slate-50 cursor-pointer w-44"
                  >
                    <option value="May 16-31, 2026">May 16-31, 2026</option>
                    <option value="June 01-15, 2026">June 01-15, 2026</option>
                  </select>
                  <button
                    onClick={handleComputeRun}
                    disabled={isFreezing}
                    className="btn-primary h-10 min-h-[40px] py-0 text-xs font-black px-4 bg-gradient-brand shadow flex items-center gap-2"
                  >
                    {isFreezing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Compute & Freeze Pay
                  </button>
                </div>
              </div>

              {/* Computations Grid Panel */}
              {isCalculated ? (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex items-center justify-between bg-blue-50 border border-blue-100 p-4 rounded-xl text-blue-900">
                    <span className="text-xs font-black uppercase">Distribution Period: {payPeriod}</span>
                    <span className="text-sm font-black">
                      Total Ledger: <strong className="text-blue-700 text-base">₹{totalPayrollAmount.toLocaleString()}</strong>
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="w-full text-left text-xs font-semibold">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-150 text-slate-400 font-bold uppercase tracking-wider">
                          <th className="p-3">Worker / Type</th>
                          <th className="p-3 text-center">Total Qty Done</th>
                          <th className="p-3 text-right">Wage Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {calculatedPayroll.map((pay, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-3 text-slate-900">
                              <span className="block font-black">{pay.employee_name || 'Unknown Worker'}</span>
                              <span className="block text-[10px] text-slate-400 font-bold mt-1 uppercase">
                                {pay.wage_type || 'Unknown'}
                              </span>
                            </td>
                            <td className="p-3 font-black text-center">{pay.total_pieces || 0} pcs</td>
                            <td className="p-3 text-right text-slate-900 font-black">₹{(pay.amount_calculated || 0).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setIsCalculated(false)}
                      className="btn-secondary h-12 min-h-[48px] px-6 text-xs font-bold rounded-lg"
                    >
                      Clear View
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 font-medium">
                  <Coins className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  Select pay cycle period above and click "Compute & Freeze Pay" to parse active floor logs and auto-calculate payroll distributions.
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
