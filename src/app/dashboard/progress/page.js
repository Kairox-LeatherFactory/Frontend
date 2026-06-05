'use client';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { apiGetStyleProgress } from '@/lib/api';
import { Lightbulb, TrendingUp, Loader2 } from 'lucide-react';

export default function StyleStageProgress() {
  const { token } = useAuth();
  const { orders, events } = useData();
  const searchParams = useSearchParams();
  const orderParam = searchParams.get('order');

  const [selectedOrderId, setSelectedOrderId] = useState(orderParam || '');
  const [apiProgress, setApiProgress] = useState(null);
  const [progressLoading, setProgressLoading] = useState(false);

  // Set default selected order when orders data loads from context
  useEffect(() => {
    if (!selectedOrderId && orders.length > 0) {
      setSelectedOrderId(orderParam || orders[2]?.id || orders[0]?.id);
    }
  }, [orders, selectedOrderId, orderParam]);

  // Active selected order details
  const activeOrder = orders.find((o) => o.id === selectedOrderId);

  // Fetch real stage progress from backend when order changes
  useEffect(() => {
    if (!token || !activeOrder?.style_id) {
      setApiProgress(null);
      return;
    }
    setProgressLoading(true);
    apiGetStyleProgress(token, activeOrder.style_id)
      .then((data) => {
        setApiProgress(data);
      })
      .catch(() => {
        setApiProgress(null);
      })
      .finally(() => {
        setProgressLoading(false);
      });
  }, [token, selectedOrderId, activeOrder?.style_id]);

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
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Stage-Spread Progress</h1>
          <p className="text-slate-500 font-medium">Verify piece conservation and count discrepancies stage-by-stage across shop floors.</p>
        </div>

        {/* Order Selector Card */}
        <div className="flex items-center gap-2">
          <label htmlFor="order-selector" className="text-xs font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">
            Selected PO:
          </label>
          <select
            id="order-selector"
            value={selectedOrderId}
            onChange={(e) => setSelectedOrderId(e.target.value)}
            className="input-field h-12 py-0 min-h-[48px] bg-white font-bold border-2 border-blue-100 cursor-pointer w-48 shadow-sm"
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
      <div className="bg-blue-50 border border-blue-200 text-blue-900 p-6 rounded-2xl shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <h4 className="font-extrabold text-blue-950 uppercase tracking-wider text-xs sm:text-sm">
            Shop Floor Quantities &amp; Discrepancy Signal Logic
          </h4>
        </div>
        <p className="text-xs sm:text-sm leading-relaxed font-medium">
          In a leather garment facility, pieces <strong>do not strictly conserve</strong> across assembly stages (e.g. Cutting = 152, Pasting = 155 is highly valid). This happens due to <strong>material yields variation, component rework, or duplicate cutting runs</strong>. The platform highlights these count variances as operational <em>signals</em> rather than hard database errors, allowing managers to inspect bottlenecks without pausing operations.
        </p>
      </div>

      {/* ─── DYNAMIC SPREAD SUMMARY CARD ─── */}
      {activeOrder && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
          <div className="card p-4 bg-white border border-blue-50">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Style Code</span>
            <p className="text-lg font-black text-slate-800 mt-1">{activeOrder.style}</p>
          </div>
          <div className="card p-4 bg-white border border-blue-50">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Target Order Qty</span>
            <p className="text-lg font-black text-blue-600 mt-1">{activeOrder.quantity} Pcs</p>
          </div>
          <div className="card p-4 bg-white border border-blue-50">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Active Stage</span>
            <p className="text-lg font-black text-slate-800 mt-1 truncate">{activeOrder.status}</p>
          </div>
          <div className="card p-4 bg-white border border-blue-50">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Client PO</span>
            <p className="text-lg font-black text-slate-800 mt-1 truncate">{activeOrder.client}</p>
          </div>
        </div>
      )}

      {/* ─── FLOW GRAPH & STAGE SPREAD TABLE ─── */}
      <div className="card p-6 sm:p-8 bg-white border border-blue-100 shadow-xl space-y-6">
        <h3 className="text-lg font-extrabold text-slate-900 border-b border-slate-100 pb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" /> Operations Stage Spread Ledger
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-4 px-2">Flow Stage</th>
                <th className="py-4 px-4">Operation</th>
                <th className="py-4 px-4">Yield / Pieces Logged</th>
                <th className="py-4 px-4">Variance vs Target</th>
                <th className="py-4 px-4">Stage Status Signal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {stageQuantities.map((stage, idx) => {
                const target = activeOrder?.quantity || 1;
                const diff = stage.qtyLogged - target;
                const percentDone = Math.round((stage.qtyLogged / target) * 100);

                let signalBadge = <span className="badge badge-warning">INACTIVE</span>;
                let textClass = 'text-slate-500';
                
                if (stage.qtyLogged > 0) {
                  if (percentDone >= 100) {
                    signalBadge = <span className="badge badge-success">COMPLETED</span>;
                    textClass = 'text-emerald-700 font-black';
                  } else {
                    signalBadge = <span className="badge badge-info">IN-PROGRESS</span>;
                    textClass = 'text-blue-700 font-bold';
                  }
                }

                return (
                  <tr key={stage.name} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-2 font-black text-slate-400">
                      #{idx + 1}
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-800">{stage.name}</div>
                      <div className="text-[10px] text-slate-400 font-medium">{stage.desc}</div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`text-base ${textClass}`}>
                        {stage.qtyLogged}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1.5">/ {target} pcs</span>
                    </td>
                    <td className="py-4 px-4">
                      {stage.qtyLogged === 0 ? (
                        <span className="text-slate-300 font-bold">-</span>
                      ) : diff === 0 ? (
                        <span className="text-emerald-600 font-black">Exact Match</span>
                      ) : diff > 0 ? (
                        <span className="text-blue-600 font-black">+{diff} pcs (Rework / Overrun)</span>
                      ) : (
                        <span className="text-amber-600 font-black">{diff} pcs (Incomplete)</span>
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

      </div>

    </div>
  );
}
