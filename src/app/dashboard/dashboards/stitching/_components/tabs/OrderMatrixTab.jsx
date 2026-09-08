'use client';
import { motion } from 'framer-motion';
import { Waypoints, CheckCircle2, Clock } from 'lucide-react';

/**
 * ============================================================================
 * OrderMatrixTab Component
 * ============================================================================
 * WHAT IT IS:
 * Order and Style Progress Matrix displaying:
 * 1. PO Number, Article, Style Name, Ordered Qty, Minted, Completed, Pending
 * 2. Visual Progress Bar showing completion %
 * 3. Delivery timeline and delay status badge
 */
export default function OrderMatrixTab({
  orderProgress = [],
  onSelectOrderRow,
}) {
  const delayBadge = (status) => {
    switch (status) {
      case 'DELAYED':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'WARNING':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full space-y-6"
    >
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Waypoints className="w-5 h-5 text-indigo-600" />
              Order &amp; Style Progress Matrix
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Production fulfillment status across active purchase orders
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
            {orderProgress.length} Production Orders
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200/60">
          <table className="w-full text-xs md:text-sm text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Style</th>
                <th className="py-3 px-4">Article</th>
                <th className="py-3 px-4 text-right">Total Ordered</th>
                <th className="py-3 px-4 text-right">Minted</th>
                <th className="py-3 px-4 text-right">Completed</th>
                <th className="py-3 px-4 text-right">Pending</th>
                <th className="py-3 px-4">Fulfillment %</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {orderProgress.map((row, idx) => {
                const pct = row.completion_pct ?? 0;

                return (
                  <tr
                    key={`order-row-${row.order_id || row.order_number}-${idx}`}
                    onClick={() => onSelectOrderRow && onSelectOrderRow(row)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-black text-slate-900 font-mono">
                      {row.order_number}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {row.style_name || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{row.article || '—'}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                      {(row.total_ordered ?? 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                      {(row.minted ?? 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-emerald-700 font-black">
                      {(row.completed ?? 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-amber-700 font-bold">
                      {(row.pending ?? 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs font-bold text-slate-700">{pct}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${delayBadge(
                          row.delay_status
                        )}`}
                      >
                        {row.delay_status || 'On Track'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {orderProgress.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-400 font-medium">
                    No order progress records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
