'use client';
import { useState } from 'react';
import { SlidersHorizontal, Truck, Zap, UserX, Calculator, AlertTriangle, Ship, BarChart3 } from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';

export default function DelayImpactSimulator() {
  // Slider states
  const [supplierDelay, setSupplierDelay] = useState(0); // 0 to 15 days
  const [defectRate, setDefectRate] = useState(2); // 0 to 20 %
  const [absenteeism, setAbsenteeism] = useState(5); // 0 to 30 %

  // Base assumptions
  const baseOrderValue = 5000000; // ₹50 Lakhs standard bulk batch value
  const baseMargin = 50; // 50% baseline gross profit margin

  // ─── CALCULATE SIMULATION MATH ───
  const defectDelayDays = Math.round((defectRate * 0.4) * 10) / 10;
  const absenteeismDelayDays = Math.round((absenteeism * 0.3) * 10) / 10;
  const totalOverrunDays = Math.round((supplierDelay + defectDelayDays + absenteeismDelayDays) * 10) / 10;

  const isAirFreightTriggered = totalOverrunDays > 2;

  let freightPenalty = 0;
  if (isAirFreightTriggered) freightPenalty = 35;
  const defectPenalty = Math.round((defectRate * 0.5) * 10) / 10;
  const laborPenalty = Math.round((absenteeism * 0.2) * 10) / 10;

  const projectedMargin = Math.max(0, baseMargin - freightPenalty - defectPenalty - laborPenalty);
  const expectedNetEarnings = Math.round(baseOrderValue * (projectedMargin / 100));
  const profitLoss = baseOrderValue * (baseMargin / 100) - expectedNetEarnings;

  // Slider fill percentage helpers
  const supplierPct = (supplierDelay / 15) * 100;
  const defectPct = (defectRate / 20) * 100;
  const absenteeismPct = (absenteeism / 30) * 100;

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ─── TITLE SECTION ─── */}
      <div>
        <h1 className="text-3xl font-black tracking-tight" style={{ color: '#2d1f0e' }}>Delay Impact Simulator</h1>
        <p className="font-medium mt-1" style={{ color: '#9a7a5a' }}>Model supply-chain bottlenecks and live labor defect penalties to test freight margin outcomes.</p>
      </div>

      {/* ─── GRID: SLIDERS & LIVE CALCULATION DISPLAY ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* LEFT COLUMN: INTERACTIVE SLIDERS (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          <SpotlightCard
            className="p-6 sm:p-8 bg-white shadow-xl space-y-8 rounded-3xl"
            style={{ border: '1px solid rgba(200,131,74,0.15)' }}
            spotlightColor="rgba(200,131,74,0.06)"
          >
            <h3 className="text-lg font-extrabold pb-4 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(200,131,74,0.1)', color: '#2d1f0e' }}>
              <SlidersHorizontal className="w-5 h-5" style={{ color: '#c8834a' }} /> Operational Parameter Adjustments
            </h3>

            {/* Slider 1: Supplier Delay */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm font-bold" style={{ color: '#2d1f0e' }}>
                <span className="flex items-center gap-2">
                  <Truck className="w-4 h-4" style={{ color: '#c8834a' }} /> Supplier Material Delay
                </span>
                <span className="px-3 py-1 rounded-xl text-xs font-black" style={{ background: '#fff9f0', color: '#c8834a', border: '1px solid rgba(200,131,74,0.25)' }}>
                  {supplierDelay} Days
                </span>
              </div>
              <div className="relative">
                <input
                  type="range"
                  min="0" max="15" step="1"
                  value={supplierDelay}
                  onChange={(e) => setSupplierDelay(parseInt(e.target.value, 10))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer focus:outline-none"
                  style={{
                    background: `linear-gradient(to right, #c8834a ${supplierPct}%, rgba(200,131,74,0.15) ${supplierPct}%)`,
                    accentColor: '#c8834a',
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-bold uppercase" style={{ color: '#9a7a5a' }}>
                <span>0 days (On-time Delivery)</span>
                <span>15 days (Severe Delay)</span>
              </div>
            </div>

            {/* Slider 2: Defect Rate */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm font-bold" style={{ color: '#2d1f0e' }}>
                <span className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" /> QC Assembly Defect Rate
                </span>
                <span className="px-3 py-1 rounded-xl text-xs font-black bg-amber-50 text-amber-700" style={{ border: '1px solid rgba(245,158,11,0.25)' }}>
                  {defectRate}% Defects
                </span>
              </div>
              <input
                type="range"
                min="0" max="20" step="1"
                value={defectRate}
                onChange={(e) => setDefectRate(parseInt(e.target.value, 10))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer focus:outline-none"
                style={{
                  background: `linear-gradient(to right, #f59e0b ${defectPct}%, rgba(245,158,11,0.15) ${defectPct}%)`,
                  accentColor: '#f59e0b',
                }}
              />
              <div className="flex justify-between text-[10px] font-bold uppercase" style={{ color: '#9a7a5a' }}>
                <span>0% (Perfect Craftsmanship)</span>
                <span>20% (High Rework Strain)</span>
              </div>
            </div>

            {/* Slider 3: Absenteeism */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm font-bold" style={{ color: '#2d1f0e' }}>
                <span className="flex items-center gap-2">
                  <UserX className="w-4 h-4 text-purple-500" /> Worker Absenteeism Rate
                </span>
                <span className="px-3 py-1 rounded-xl text-xs font-black bg-purple-50 text-purple-700" style={{ border: '1px solid rgba(147,51,234,0.2)' }}>
                  {absenteeism}% Absent
                </span>
              </div>
              <input
                type="range"
                min="0" max="30" step="1"
                value={absenteeism}
                onChange={(e) => setAbsenteeism(parseInt(e.target.value, 10))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer focus:outline-none"
                style={{
                  background: `linear-gradient(to right, #9333ea ${absenteeismPct}%, rgba(147,51,234,0.15) ${absenteeismPct}%)`,
                  accentColor: '#9333ea',
                }}
              />
              <div className="flex justify-between text-[10px] font-bold uppercase" style={{ color: '#9a7a5a' }}>
                <span>0% (Full Shop Floor Capacity)</span>
                <span>30% (High Floor Bottlenecks)</span>
              </div>
            </div>

            {/* Mathematical Formulas Breakdown */}
            <div className="p-4 rounded-xl space-y-2 text-[11px] leading-relaxed font-semibold" style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.15)', color: '#9a7a5a' }}>
              <p className="font-extrabold uppercase text-xs flex items-center gap-1.5" style={{ color: '#2d1f0e' }}>
                <Calculator className="w-3.5 h-3.5" style={{ color: '#c8834a' }} /> Simulator Calculation Models:
              </p>
              <p>• <strong style={{ color: '#2d1f0e' }}>Overrun days</strong> = Supplier Days + (QC Defects × 0.4) + (Absenteeism × 0.3)</p>
              <p>• <strong style={{ color: '#2d1f0e' }}>Air Freight Mode Trigger</strong> = Automatic if Total Overrun Days exceeds 2.0 Days.</p>
              <p>• <strong style={{ color: '#2d1f0e' }}>Projected Gross Margin</strong> = Base 50% − Air Freight Penalty (35%) − Defect Penalty (Defects × 0.5) − Labor Penalty (Absenteeism × 0.2)</p>
            </div>

          </SpotlightCard>
        </div>

        {/* RIGHT COLUMN: REAL-TIME FINANCIAL EQUATION DISPLAY (1 Col) */}
        <div className="space-y-6">

          {/* Air freight warning card */}
          {isAirFreightTriggered ? (
            <SpotlightCard
              className="p-6 text-center shadow-xl space-y-3 rounded-3xl"
              style={{ background: 'linear-gradient(135deg, #c0392b, #e74c3c)', border: 'none' }}
              spotlightColor="rgba(255,255,255,0.08)"
            >
              <AlertTriangle className="w-10 h-10 mx-auto text-white animate-bounce" />
              <h4 className="text-lg font-black uppercase tracking-wider text-white">Air Freight Triggered!</h4>
              <p className="text-xs font-medium text-red-100 leading-relaxed">
                Projected overrun is <strong>{totalOverrunDays} Days</strong>, which is over the 2-day sea limit. Cargo must ship by Air, shrinking the profit margin by 35%!
              </p>
            </SpotlightCard>
          ) : (
            <SpotlightCard
              className="p-6 text-center shadow-xl space-y-3 rounded-3xl"
              style={{ background: 'linear-gradient(135deg, #1a6b3a, #27ae60)', border: 'none' }}
              spotlightColor="rgba(255,255,255,0.08)"
            >
              <Ship className="w-10 h-10 mx-auto text-white" />
              <h4 className="text-lg font-black uppercase tracking-wider text-white">Sea Freight Safe</h4>
              <p className="text-xs font-medium text-emerald-100 leading-relaxed">
                Projected overrun is <strong>{totalOverrunDays} Days</strong> (within the 2-day limit). Standard sea cargo mode preserved. No shipping profit penalties.
              </p>
            </SpotlightCard>
          )}

          {/* FINANCIAL EQUATION METRIC BOX */}
          <SpotlightCard
            className="p-6 bg-white shadow-xl space-y-6 rounded-3xl overflow-hidden"
            style={{ border: '1px solid rgba(200,131,74,0.15)' }}
            spotlightColor="rgba(200,131,74,0.06)"
          >
            <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: '#9a7a5a' }}>
              <BarChart3 className="w-4 h-4" style={{ color: '#c8834a' }} /> Simulated Financial Ledger
            </h3>

            <div className="space-y-4">
              <div>
                <span className="text-[10px] block uppercase font-bold" style={{ color: '#9a7a5a' }}>Standard Batch Valuation</span>
                <span className="text-lg font-black" style={{ color: '#2d1f0e' }}>₹{(baseOrderValue).toLocaleString()} INR</span>
              </div>

              <div className="pt-4" style={{ borderTop: '1px solid rgba(200,131,74,0.1)' }}>
                <span className="text-[10px] block uppercase font-bold" style={{ color: '#9a7a5a' }}>Simulated Delay Overrun</span>
                <span className="text-xl font-black" style={{ color: totalOverrunDays > 2 ? '#e53e3e' : '#2d1f0e' }}>
                  {totalOverrunDays} Overrun Days
                </span>
              </div>

              <div className="pt-4" style={{ borderTop: '1px solid rgba(200,131,74,0.1)' }}>
                <span className="text-[10px] block uppercase font-bold" style={{ color: '#9a7a5a' }}>Projected Profit Margin</span>
                <div className="flex items-end gap-2 mt-1">
                  <span className="text-3xl font-black" style={{ color: projectedMargin < 20 ? '#e53e3e' : '#c8834a' }}>
                    {projectedMargin}%
                  </span>
                  <span className="text-xs font-bold mb-1 line-through" style={{ color: '#9a7a5a' }}>
                    (50% Base)
                  </span>
                </div>
                {/* Progress bar */}
                <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(200,131,74,0.15)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${projectedMargin * 2}%`,
                      background: projectedMargin < 20
                        ? 'linear-gradient(to right, #e53e3e, #fc8181)'
                        : 'linear-gradient(to right, #c8834a, #e8a06a)',
                    }}
                  />
                </div>
              </div>

              <div className="-mx-6 -mb-6 p-6 rounded-b-3xl" style={{ background: isAirFreightTriggered ? 'linear-gradient(135deg, #fff0f0, #ffe8e8)' : 'linear-gradient(135deg, #fff9f0, #fef3e7)', borderTop: '1px solid rgba(200,131,74,0.1)' }}>
                <span className="text-[10px] block uppercase font-black" style={{ color: isAirFreightTriggered ? '#9c4221' : '#9c4221' }}>Expected Net Yield Earnings</span>
                <span className="text-2xl font-black block mt-1" style={{ color: isAirFreightTriggered ? '#e53e3e' : '#c8834a' }}>
                  ₹{expectedNetEarnings.toLocaleString()} INR
                </span>
                <p className="text-[9px] font-bold mt-1" style={{ color: '#a86022' }}>
                  Estimated profit loss of ₹{profitLoss.toLocaleString()} INR based on current sliders.
                </p>
              </div>

            </div>

          </SpotlightCard>

        </div>

      </div>

    </div>
  );
}
