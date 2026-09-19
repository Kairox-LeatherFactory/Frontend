'use client';
import { motion } from 'framer-motion';
import { Layers, AlertTriangle } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatStage } from '../../_lib/helpers';

/**
 * ============================================================================
 * StagesWipTab Component
 * ============================================================================
 * WHAT IT IS:
 * Comprehensive stage-wise table & analytical breakdown showing:
 * 1. Stage Received, Assigned, Completed, Pending Queue, and Target Fulfillment
 * 2. High Backlog Highlights & Stage Click-throughs
 * 3. Comparative Volume Bar Chart (Received vs Completed vs Pending)
 */
export default function StagesWipTab({
  stages = [],
  onSelectStageDetail,
  activeOrderLabel = 'All Orders',
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full space-y-6"
    >
      {/* ====================================================================
          DIVISION 1: STAGE-WISE PRODUCTION & WIP QUEUE TABLE
          ==================================================================== */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              Stitching Stage Queue &amp; WIP Breakdown
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Pre-Store &amp; Post-Store stage tracking &bull; Scoped to <strong>{activeOrderLabel}</strong>
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200/60">
          <table className="w-full text-xs md:text-sm text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Stage Name</th>
                <th className="py-3 px-4">Floor Section</th>
                <th className="py-3 px-4 text-right">Received</th>
                <th className="py-3 px-4 text-right">Assigned</th>
                <th className="py-3 px-4 text-right">Completed</th>
                <th className="py-3 px-4 text-right">Pending Queue</th>
                <th className="py-3 px-4 text-right">Daily Target</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {stages.map((st, idx) => {
                const pending = st.pending_pieces ?? 0;
                const isBacklog = pending > 20;

                return (
                  <tr
                    key={`stage-row-${st.stage}-${idx}`}
                    onClick={() => onSelectStageDetail && onSelectStageDetail(st)}
                    className={`cursor-pointer transition-all ${
                      isBacklog
                        ? 'bg-amber-50/50 hover:bg-amber-50'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-3.5 px-4 font-black text-slate-900 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                      <span>{st.label || formatStage(st.stage)}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {st.section || 'Stitching Floor'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                      {(st.total_received ?? 0).toLocaleString()} pcs
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-blue-700 font-semibold">
                      {(st.assigned_pieces ?? 0).toLocaleString()} pcs
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-emerald-700 font-black">
                      {(st.completed_pieces ?? 0).toLocaleString()} pcs
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold">
                      <span className={isBacklog ? 'text-amber-600 font-black text-sm' : 'text-slate-800'}>
                        {pending.toLocaleString()} pcs
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono">
                      {typeof st.daily_target === 'number' ? `${st.daily_target} pcs` : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 shadow-xs ${
                          isBacklog ? 'bg-amber-500 text-white' : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isBacklog ? `⚠️ High WIP (${pending})` : '🟢 Active Flow'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {stages.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400 font-medium">
                    No stage data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ====================================================================
          DIVISION 2: STAGE VOLUME COMPARISON CHART
          ==================================================================== */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <h3 className="text-sm font-black text-slate-900">
          Stage Volume: Received vs Completed vs Pending
        </h3>
        <p className="text-xs text-slate-500">Comparative capacity flow across stitching units</p>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={stages.map((s) => ({
                label: s.label || formatStage(s.stage),
                received: s.total_received || 0,
                completed: s.completed_pieces || 0,
                pending: s.pending_pieces || 0,
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
              <Bar dataKey="received" name="Total Received" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pending" name="Pending Queue" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}
