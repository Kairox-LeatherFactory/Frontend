'use client';
import { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';

export default function PieceRatesAndWages() {
  const { user } = useAuth();
  const { workers, rates, events, wageRuns, addWageRun } = useData();

  // Role Gate check
  const isDirectManager = user === 'direct_manager';

  // State for active pay computation run
  const [payPeriod, setPayPeriod] = useState('May 16–31, 2026');
  const [isCalculated, setIsCalculated] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // ─── 1. PIECE-RATES DATA BINDING ───
  const activeRates = rates.CARNABY || {};

  // ─── 2. LIVE WAGE COMPUTATION ENGINE ───
  const calculatedPayroll = useMemo(() => {
    return workers.map((worker) => {
      if (worker.wage_type === 'Monthly-salary') {
        // Monthly worker gets flat salary rate (assume half month for semi-monthly payroll)
        const payAmount = Math.round(worker.monthly_salary / 2);
        return {
          ...worker,
          piecesLogged: 0,
          details: 'Flat Monthly Salary (Pro-rated 15 days)',
          amount: payAmount,
        };
      }

      // Piece-rate worker: Qty × Rate for specific operations
      // Filter events by worker
      const workerEvents = events.filter((e) => e.worker_id === worker.id);
      let totalPieces = 0;
      let totalPay = 0;
      const breakdowns = [];

      workerEvents.forEach((evt) => {
        const rate = activeRates[evt.operation] || 0;
        const linePay = evt.qty * rate;
        totalPieces += evt.qty;
        totalPay += linePay;
        if (evt.qty > 0) {
          breakdowns.push(`${evt.qty} pcs @ ₹${rate} (${evt.operation})`);
        }
      });

      return {
        ...worker,
        piecesLogged: totalPieces,
        details: breakdowns.join(' + ') || 'No shop floor logs recorded',
        amount: totalPay,
      };
    });
  }, [workers, events, activeRates]);

  const totalPayrollAmount = useMemo(() => {
    return calculatedPayroll.reduce((acc, curr) => acc + curr.amount, 0);
  }, [calculatedPayroll]);

  // Save the compiled run
  const handleFreezeRun = () => {
    if (!isDirectManager) return;
    
    const newRun = {
      period: payPeriod,
      employee_count: workers.length,
      total_amount: totalPayrollAmount,
      status: 'Frozen',
    };

    addWageRun(newRun);
    setIsCalculated(false);
    setSuccessMsg(`Payroll Period "${payPeriod}" frozen successfully. Total distribution of ₹${totalPayrollAmount.toLocaleString()} logged in Ledger.`);
    
    // Auto clear alert
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* ─── TITLE SECTION ─── */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Payroll &amp; Rates Manager</h1>
        <p className="text-slate-500 font-medium">Verify piece-rates and execute audits on shop floor wage calculations.</p>
      </div>

      {/* ─── BANNER ALERTS ─── */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl font-bold text-sm shadow-md animate-fade-in flex items-center gap-2.5">
          <span>✅</span>
          <p>{successMsg}</p>
        </div>
      )}

      {/* ─── DOUBLE BLOCK ROW: RATES & STATUS ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: PIECE-RATE CONSTANTS (All roles can see) */}
        <div className="card p-6 bg-white border border-blue-100 shadow-xl space-y-6">
          <h3 className="text-lg font-extrabold text-slate-900 border-b border-slate-100 pb-4">
            🏷️ CARNABY Style Piece Rates
          </h3>
          <p className="text-xs font-semibold text-slate-400">
            Standard contract pieces pay scale allocated per completed operation:
          </p>

          <div className="overflow-hidden rounded-xl border border-slate-100">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-blue-50 border-b border-slate-150 text-blue-900 font-bold uppercase tracking-wider">
                  <th className="p-3">Operation Station</th>
                  <th className="p-3 text-right">Rate / Piece</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                {Object.entries(activeRates).map(([opName, rateVal]) => (
                  <tr key={opName} className="hover:bg-slate-50/50">
                    <td className="p-3 text-slate-800">{opName}</td>
                    <td className="p-3 text-right text-blue-700 font-black">₹{rateVal}.00</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-[10px] text-slate-400 font-semibold leading-relaxed">
            Note: Standard Cutter rate is validated at ₹80 per piece. (e.g. 152 pcs logged equals ₹12,160 pay scale).
          </div>
        </div>

        {/* RIGHT COLUMN: PAYROLL OPERATIONS ENGINE (Gated) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* GATED ACCESS ACCORDION IF VIEWER / FLOOR MANAGER */}
          {!isDirectManager ? (
            <div className="card p-8 bg-amber-50/60 border border-amber-200 shadow-lg text-center space-y-4">
              <div className="text-5xl">🔒</div>
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
                <h3 className="text-lg font-extrabold text-slate-900">
                  ⚙️ Active Computation Engine
                </h3>
                <div className="flex items-center gap-2">
                  <select
                    value={payPeriod}
                    onChange={(e) => setPayPeriod(e.target.value)}
                    className="input-field h-10 py-0 min-h-[40px] font-extrabold text-xs bg-slate-50 cursor-pointer w-44"
                  >
                    <option value="May 16–31, 2026">May 16–31, 2026</option>
                    <option value="June 01–15, 2026">June 01–15, 2026</option>
                  </select>
                  <button
                    onClick={() => setIsCalculated(true)}
                    className="btn-primary h-10 min-h-[40px] py-0 text-xs font-black px-4 bg-gradient-brand shadow"
                  >
                    Compute Pay
                  </button>
                </div>
              </div>

              {/* Computations Grid Panel */}
              {isCalculated ? (
                <div className="space-y-6">
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
                          <th className="p-3">Worker ID</th>
                          <th className="p-3">Worker Name</th>
                          <th className="p-3">Wage Category</th>
                          <th className="p-3">Total Qty Done</th>
                          <th className="p-3 text-right">Wage Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {calculatedPayroll.map((pay) => (
                          <tr key={pay.id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-bold text-slate-400">{pay.id}</td>
                            <td className="p-3 text-slate-900">
                              <span className="block font-black">{pay.name}</span>
                              <span className="block text-[9px] text-slate-400 font-bold max-w-xs truncate">{pay.details}</span>
                            </td>
                            <td className="p-3">
                              <span className={`badge ${pay.wage_type === 'Piece-rate' ? 'badge-info' : 'badge-warning'}`}>
                                {pay.wage_type}
                              </span>
                            </td>
                            <td className="p-3 font-black">{pay.piecesLogged} pcs</td>
                            <td className="p-3 text-right text-slate-900 font-black">₹{pay.amount.toLocaleString()}</td>
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
                      Reset Computation
                    </button>
                    <button
                      onClick={handleFreezeRun}
                      className="btn-primary h-12 min-h-[48px] px-6 text-xs font-black rounded-lg bg-emerald-600 hover:bg-emerald-700 shadow"
                    >
                      🔒 Freeze &amp; Log Payrun
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 font-medium">
                  <span className="text-4xl block mb-2">💰</span>
                  Select pay cycle period above and click "Compute Pay" to parse active floor logs and auto-calculate payroll distributions.
                </div>
              )}

            </div>
          )}

          {/* HISTORICAL WAGE RUNS TABLE */}
          {isDirectManager && (
            <div className="card p-6 sm:p-8 bg-white border border-blue-100 shadow-xl space-y-6">
              <h3 className="text-lg font-extrabold text-slate-900 border-b border-slate-100 pb-4">
                📂 Archived Frozen Payroll Runs
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm font-semibold">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-2">Run ID</th>
                      <th className="py-3 px-4">Period</th>
                      <th className="py-3 px-4">Worker Count</th>
                      <th className="py-3 px-4 text-right">Total Payout</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {wageRuns.map((run) => (
                      <tr key={run.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-2 font-black text-slate-400">{run.id}</td>
                        <td className="py-3 px-4 text-slate-900 font-extrabold">{run.period}</td>
                        <td className="py-3 px-4">{run.employee_count} active</td>
                        <td className="py-3 px-4 text-right font-black text-slate-900">₹{run.total_amount.toLocaleString()}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="badge badge-success">FROZEN LEDGER</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
