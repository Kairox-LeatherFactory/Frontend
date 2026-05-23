'use client';
import { useState } from 'react';

export default function DelayImpactSimulator() {
  // Slider states
  const [supplierDelay, setSupplierDelay] = useState(0); // 0 to 15 days
  const [defectRate, setDefectRate] = useState(2); // 0 to 20 %
  const [absenteeism, setAbsenteeism] = useState(5); // 0 to 30 %

  // Base assumptions
  const baseOrderValue = 5000000; // ₹50 Lakhs standard bulk batch value
  const baseMargin = 50; // 50% baseline gross profit margin

  // ─── CALCULATE SIMULATION MATH ───
  // Overrun days formula = Supplier material delay + Defect delay factor + absenteeism delay factor
  const defectDelayDays = Math.round((defectRate * 0.4) * 10) / 10;
  const absenteeismDelayDays = Math.round((absenteeism * 0.3) * 10) / 10;
  const totalOverrunDays = Math.round((supplierDelay + defectDelayDays + absenteeismDelayDays) * 10) / 10;

  // Shipment freight trigger: overrun > 2 days past deadline triggers Air Freight!
  const isAirFreightTriggered = totalOverrunDays > 2;

  // Margin penalties: Air freight drops margin by 35%. Material waste (defect) drops margin. Overtime (absenteeism) drops margin.
  let freightPenalty = 0;
  if (isAirFreightTriggered) {
    freightPenalty = 35; // Drops margin by ~35%
  }
  const defectPenalty = Math.round((defectRate * 0.5) * 10) / 10; // e.g. 10% defects = 5% margin drop from waste
  const laborPenalty = Math.round((absenteeism * 0.2) * 10) / 10; // e.g. 10% absenteeism = 2% margin drop from overtime premium

  const projectedMargin = Math.max(0, baseMargin - freightPenalty - defectPenalty - laborPenalty);

  // Net earnings calculation
  const expectedNetEarnings = Math.round(baseOrderValue * (projectedMargin / 100));

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* ─── TITLE SECTION ─── */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Delay Impact Simulator</h1>
        <p className="text-slate-500 font-medium">Model supply-chain bottlenecks and live labor defect penalties to test freight margin outcomes.</p>
      </div>

      {/* ─── GRID: SLIDERS & LIVE CALCULATION DISPLAY ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: INTERACTIVE SLIDERS (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6 sm:p-8 bg-white border border-blue-100 shadow-xl space-y-8">
            <h3 className="text-lg font-extrabold text-slate-900 border-b border-slate-100 pb-4">
              🎛️ Operational Parameter Adjustments
            </h3>

            {/* Slider 1: Supplier Delay */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm font-bold text-slate-700">
                <span className="flex items-center gap-2">
                  🚚 Supplier Material Delay
                </span>
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-xl text-xs font-black">
                  {supplierDelay} Days
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="15"
                step="1"
                value={supplierDelay}
                onChange={(e) => setSupplierDelay(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase">
                <span>0 days (On-time Delivery)</span>
                <span>15 days (Severe Delay)</span>
              </div>
            </div>

            {/* Slider 2: Defect Rate */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm font-bold text-slate-700">
                <span className="flex items-center gap-2">
                  ⚡ QC Assembly Defect Rate
                </span>
                <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-xl text-xs font-black">
                  {defectRate}% Defects
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                step="1"
                value={defectRate}
                onChange={(e) => setDefectRate(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase">
                <span>0% (Perfect Craftsmanship)</span>
                <span>20% (High Rework Strain)</span>
              </div>
            </div>

            {/* Slider 3: Absenteeism */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm font-bold text-slate-700">
                <span className="flex items-center gap-2">
                  👤 Worker Absenteeism Rate
                </span>
                <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-xl text-xs font-black">
                  {absenteeism}% Absent
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                step="1"
                value={absenteeism}
                onChange={(e) => setAbsenteeism(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-purple-600 focus:outline-none"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase">
                <span>0% (Full Shop Floor Capacity)</span>
                <span>30% (High Floor Bottlenecks)</span>
              </div>
            </div>

            {/* Mathematical Formulas Breakdown */}
            <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-2 text-[11px] text-slate-500 leading-relaxed font-semibold">
              <p className="text-slate-800 font-extrabold uppercase text-xs">🧮 Simulator Calculation Models:</p>
              <p>• <strong>Overrun days</strong> = Supplier Days + (QC Defects × 0.4) + (Absenteeism × 0.3)</p>
              <p>• <strong>Air Freight Mode Trigger</strong> = Automatic if Total Overrun Days exceeds 2.0 Days.</p>
              <p>• <strong>Projected Gross Margin</strong> = Base 50% − Air Freight Penalty (35%) − Defect Penalty (Defects × 0.5) − Labor Penalty (Absenteeism × 0.2)</p>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: REAL-TIME FINANCIAL EQUATION DISPLAY (1 Col) */}
        <div className="space-y-6">
          
          {/* Air freight warning card */}
          {isAirFreightTriggered ? (
            <div className="card p-6 bg-gradient-to-br from-red-600 to-red-500 border-none text-white text-center shadow-xl space-y-3 animate-pulse">
              <span className="text-4xl block">🚨</span>
              <h4 className="text-lg font-black uppercase tracking-wider">Air Freight Triggered!</h4>
              <p className="text-xs font-medium text-red-100 leading-relaxed">
                Projected overrun is <strong>{totalOverrunDays} Days</strong>, which is over the 2-day sea limit. Cargo must ship by Air, shrinking the profit margin by 35%!
              </p>
            </div>
          ) : (
            <div className="card p-6 bg-gradient-to-br from-emerald-600 to-emerald-500 border-none text-white text-center shadow-xl space-y-3">
              <span className="text-4xl block">🚢</span>
              <h4 className="text-lg font-black uppercase tracking-wider">Sea Freight Safe</h4>
              <p className="text-xs font-medium text-emerald-100 leading-relaxed">
                Projected overrun is <strong>{totalOverrunDays} Days</strong> (within the 2-day limit). Standard sea cargo mode preserved. No shipping profit penalties.
              </p>
            </div>
          )}

          {/* FINANCIAL EQUATION METRIC BOX */}
          <div className="card p-6 bg-white border border-blue-100 shadow-xl space-y-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
              📊 Simulated Financial Ledger
            </h3>

            <div className="space-y-4">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Standard Batch Valuation</span>
                <span className="text-lg font-black text-slate-800">₹{(baseOrderValue).toLocaleString()} INR</span>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Simulated Delay Overrun</span>
                <span className={`text-xl font-black ${totalOverrunDays > 2 ? 'text-red-600' : 'text-slate-800'}`}>
                  {totalOverrunDays} Overrun Days
                </span>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Projected Profit Margin</span>
                <div className="flex items-end gap-2 mt-1">
                  <span className={`text-3xl font-black ${projectedMargin < 20 ? 'text-red-600' : 'text-blue-700'}`}>
                    {projectedMargin}%
                  </span>
                  <span className="text-xs text-slate-400 font-bold mb-1 line-through">
                    (50% Base)
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 bg-gradient-brand-light -mx-6 -mb-6 p-6 rounded-b-xl border-t border-blue-200">
                <span className="text-[10px] text-blue-900 block uppercase font-black">Expected Net Yield Earnings</span>
                <span className={`text-2xl font-black block mt-1 ${isAirFreightTriggered ? 'text-red-700' : 'text-blue-900'}`}>
                  ₹{expectedNetEarnings.toLocaleString()} INR
                </span>
                <p className="text-[9px] text-blue-800 font-bold mt-1">
                  Estimated profit loss of ₹{(baseOrderValue * (baseMargin / 100) - expectedNetEarnings).toLocaleString()} INR based on current sliders.
                </p>
              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
