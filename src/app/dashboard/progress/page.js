'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { apiGetStyleProgress } from '@/lib/api';
import { Lightbulb, TrendingUp, Loader2 } from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';

export default function StyleStageProgress() {
  const { token } = useAuth();
  const { orders, events } = useData();
  const searchParams = useSearchParams();
  const orderParam = searchParams.get('order');

  const [selectedOrderId, setSelectedOrderId] = useState(orderParam || '');
  const [apiProgress, setApiProgress] = useState(null);
  const [progressLoading, setProgressLoading] = useState(false);

  // Derive the effective order ID — use selectedOrderId if set by user,
  // otherwise fall back to the first available order from context (no useEffect needed)
  const effectiveOrderId = selectedOrderId || orderParam || orders[2]?.id || orders[0]?.id || '';

  // Active selected order details
  const activeOrder = orders.find((o) => o.id === effectiveOrderId);

  // Fetch real stage progress from backend when effective order changes
  useEffect(() => {
    if (!token || !activeOrder?.style_id) {
      setApiProgress(null);
      return;
    }
    setProgressLoading(true);
    apiGetStyleProgress(token, activeOrder.style_id)
      .then((data) => { setApiProgress(data); })
      .catch(() => { setApiProgress(null); })
      .finally(() => { setProgressLoading(false); });
  }, [token, effectiveOrderId, activeOrder?.style_id]);

  // Define operational stages
  const operations = [
    { name: 'Cutting',       desc: 'Raw leather hides die-cut into design panels' },
    { name: 'Fusing',        desc: 'Heat-bonding structural interlining to panels' },
    { name: 'Pasting',       desc: 'Adhering seams and align components temporarily' },
    { name: 'Shell stitch',  desc: 'Primary leather exterior structure stitch' },
    { name: 'Lining attach', desc: 'Inner satin lining matched and sewn to leather shell' },
    { name: 'Lining stitch', desc: 'Closing inner seams and pocket bag fittings' },
    { name: 'Final finish',  desc: 'Final visual inspection, edge coat, and label tag' },
  ];

  // Calculate quantities at each stage — use backend data if available, else compute locally from events
  const stageQuantities = operations.map((op) => {
    if (apiProgress && apiProgress.stages) {
      // Backend returns { stages: { CUTTING: 40, FUSING: 10, ... } }
      const upName = op.name.toUpperCase();
      const backendQty = apiProgress.stages[upName] ?? apiProgress.stages[upName.replace(/ /g, '_')] ?? 0;
      return { ...op, qtyLogged: backendQty };
    }
    // Local fallback
    const stageEvents = events.filter(
      (e) => e.order_id === selectedOrderId && e.operation === op.name
    );
    const sum = stageEvents.reduce((acc, curr) => acc + curr.qty, 0);
    return { ...op, qtyLogged: sum };
  });

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* ─── TITLE SECTION ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: '#2d1f0e' }}>Stage-Spread Progress</h1>
          <p className="font-medium mt-1" style={{ color: '#9a7a5a' }}>Verify piece conservation and count discrepancies stage-by-stage across shop floors.</p>
        </div>

        {/* Order Selector Card */}
        <div className="flex items-center gap-2">
          <label htmlFor="order-selector" className="text-xs font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">
            Selected PO:
          </label>
          <select
            id="order-selector"
            value={effectiveOrderId}
            onChange={(e) => setSelectedOrderId(e.target.value)}
            className="input-field h-12 py-0 min-h-[48px] font-bold cursor-pointer w-48 shadow-sm transition-all focus:ring-0 focus:outline-none"
            style={{ background: '#ffffff', border: '2px solid rgba(200,131,74,0.3)', color: '#2d1f0e', borderRadius: '0.75rem' }}
          >
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.id} ({o.style})
              </option>
            ))}
          </select>
          {progressLoading && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
        </div>
      </div>

      {/* ─── PIECE CONSERVATION INFORMATION BANNER ─── */}
      <div className="p-6 rounded-2xl shadow-sm space-y-3" style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.2)', color: '#4a3a2a' }}>
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 flex-shrink-0" style={{ color: '#c8834a' }} />
          <h4 className="font-extrabold uppercase tracking-wider text-xs sm:text-sm" style={{ color: '#2d1f0e' }}>
            Shop Floor Quantities &amp; Discrepancy Signal Logic
          </h4>
        </div>
        <p className="text-xs sm:text-sm leading-relaxed font-medium">
          In a leather garment facility, pieces <strong style={{ color: '#a86022' }}>do not strictly conserve</strong> across assembly stages (e.g. Cutting = 152, Pasting = 155 is highly valid). This happens due to <strong style={{ color: '#a86022' }}>material yields variation, component rework, or duplicate cutting runs</strong>. The platform highlights these count variances as operational <em>signals</em> rather than hard database errors, allowing managers to inspect bottlenecks without pausing operations.
        </p>
      </div>

      {/* ─── DYNAMIC SPREAD SUMMARY CARD ─── */}
      {activeOrder && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
          <SpotlightCard className="p-4 bg-white rounded-2xl hover:-translate-y-1 transition-transform" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.08)">
            <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: '#9a7a5a' }}>Style Code</span>
            <p className="text-lg font-black mt-1" style={{ color: '#2d1f0e' }}>{activeOrder.style}</p>
          </SpotlightCard>
          <SpotlightCard className="p-4 bg-white rounded-2xl hover:-translate-y-1 transition-transform" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.08)">
            <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: '#9a7a5a' }}>Target Order Qty</span>
            <p className="text-lg font-black mt-1" style={{ color: '#c8834a' }}>{activeOrder.quantity} Pcs</p>
          </SpotlightCard>
          <SpotlightCard className="p-4 bg-white rounded-2xl hover:-translate-y-1 transition-transform" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.08)">
            <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: '#9a7a5a' }}>Active Stage</span>
            <p className="text-lg font-black mt-1 truncate" style={{ color: '#2d1f0e' }}>{activeOrder.status}</p>
          </SpotlightCard>
          <SpotlightCard className="p-4 bg-white rounded-2xl hover:-translate-y-1 transition-transform" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.08)">
            <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: '#9a7a5a' }}>Client PO</span>
            <p className="text-lg font-black mt-1 truncate" style={{ color: '#2d1f0e' }}>{activeOrder.client}</p>
          </SpotlightCard>
        </div>
      )}

      {/* ─── FLOW GRAPH & STAGE SPREAD TABLE ─── */}
      <SpotlightCard className="p-6 sm:p-8 bg-white shadow-xl space-y-6 rounded-3xl" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.06)">
        <h3 className="text-lg font-extrabold pb-4 flex items-center gap-2" style={{ color: '#2d1f0e', borderBottom: '1px solid rgba(200,131,74,0.1)' }}>
          <TrendingUp className="w-5 h-5" style={{ color: '#c8834a' }} /> Operations Stage Spread Ledger
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="font-bold uppercase tracking-wider" style={{ color: '#9a7a5a', borderBottom: '2px solid rgba(200,131,74,0.15)' }}>
                <th className="py-4 px-2">Flow Stage</th>
                <th className="py-4 px-4">Operation</th>
                <th className="py-4 px-4">Yield / Pieces Logged</th>
                <th className="py-4 px-4">Variance vs Target</th>
                <th className="py-4 px-4">Stage Status Signal</th>
              </tr>
            </thead>
            <tbody className="divide-y font-medium" style={{ divideColor: 'rgba(200,131,74,0.1)' }}>
              {stageQuantities.map((stage, idx) => {
                const target = activeOrder?.quantity || 1;
                const diff = stage.qtyLogged - target;
                const percentDone = Math.round((stage.qtyLogged / target) * 100);

                let signalBadge = <span className="px-3 py-1 rounded-md text-[10px] font-black tracking-wider" style={{ background: '#f5f5f5', color: '#888' }}>INACTIVE</span>;
                let textClass = 'text-slate-500';
                
                if (stage.qtyLogged > 0) {
                  if (percentDone >= 100) {
                    signalBadge = <span className="px-3 py-1 rounded-md text-[10px] font-black tracking-wider" style={{ background: '#f0fff4', color: '#38a169', border: '1px solid #c6f6d5' }}>COMPLETED</span>;
                    textClass = 'font-black';
                  } else {
                    signalBadge = <span className="px-3 py-1 rounded-md text-[10px] font-black tracking-wider" style={{ background: 'rgba(200,131,74,0.15)', color: '#a86022', border: '1px solid rgba(200,131,74,0.3)' }}>IN-PROGRESS</span>;
                    textClass = 'font-bold';
                  }
                }

                return (
                  <tr key={stage.name} className="hover:bg-[#faf6f0] transition-colors border-b" style={{ borderColor: 'rgba(200,131,74,0.05)' }}>
                    <td className="py-4 px-2 font-black" style={{ color: '#9a7a5a' }}>
                      #{idx + 1}
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-bold" style={{ color: '#2d1f0e' }}>{stage.name}</div>
                      <div className="text-[10px] font-medium" style={{ color: '#9a7a5a' }}>{stage.desc}</div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`text-base ${textClass}`} style={textClass === 'text-slate-500' ? {} : { color: percentDone >= 100 ? '#38a169' : '#a86022' }}>
                        {stage.qtyLogged}
                      </span>
                      <span className="text-[10px] ml-1.5" style={{ color: '#9a7a5a' }}>/ {target} pcs</span>
                    </td>
                    <td className="py-4 px-4">
                      {stage.qtyLogged === 0 ? (
                        <span className="font-bold opacity-30">-</span>
                      ) : diff === 0 ? (
                        <span className="font-black" style={{ color: '#38a169' }}>Exact Match</span>
                      ) : diff > 0 ? (
                        <span className="font-black" style={{ color: '#c8834a' }}>+{diff} pcs (Rework / Overrun)</span>
                      ) : (
                        <span className="font-black" style={{ color: '#e53e3e' }}>{diff} pcs (Incomplete)</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {signalBadge}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </SpotlightCard>

    </div>
  );
}
