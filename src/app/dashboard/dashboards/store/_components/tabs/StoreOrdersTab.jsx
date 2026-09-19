'use client';
import { motion } from 'framer-motion';
import { Waypoints } from 'lucide-react';

/**
 * ============================================================================
 * StoreOrdersTab Component
 * ============================================================================
 */
export default function StoreOrdersTab({
  orderProgress = [],
}) {
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
              <Waypoints className="w-5 h-5 text-cyan-600" />
              Store Order &amp; Style Fulfillment Matrix
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Pieces received, stored in drawer &amp; issued to line stitching
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-cyan-50 text-cyan-700">
            {orderProgress.length} Orders
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200/60">
          <table className="w-full text-xs md:text-sm text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Style</th>
                <th className="py-3 px-4 text-right">Received from Pasting</th>
                <th className="py-3 px-4 text-right">In Drawer Buffer</th>
                <th className="py-3 px-4 text-right">Released to Stitching</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {orderProgress.map((row, idx) => (
                <tr key={`store-order-${row.order_id || row.order_number}-${idx}`} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{row.order_number}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">{row.style_name}</td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                    {(row.total_received ?? row.received ?? 0).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-amber-700 font-bold">
                    {(row.in_drawer ?? 0).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-emerald-700 font-black">
                    {(row.released ?? row.ready_for_stitching ?? 0).toLocaleString()}
                  </td>
                </tr>
              ))}
              {orderProgress.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400 font-medium">
                    No store order progress records found.
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
