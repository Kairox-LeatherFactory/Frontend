'use client';
import { motion } from 'framer-motion';
import { Layers } from 'lucide-react';
import { formatStage } from '../../_lib/helpers';

/**
 * ============================================================================
 * DepartmentMatrixTab Component (Direct Manager)
 * ============================================================================
 */
export default function DepartmentMatrixTab({
  departments = [],
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
              <Layers className="w-5 h-5 text-slate-800" />
              Department Deep Dive &amp; Stage Breakdown
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Individual department capacities, completions, active operators &amp; efficiency
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-800">
            {departments.length} Units
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200/60">
          <table className="w-full text-xs md:text-sm text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Department / Stage</th>
                <th className="py-3 px-4 text-right">Completed Pieces</th>
                <th className="py-3 px-4 text-right">Floor Queue WIP</th>
                <th className="py-3 px-4 text-right">Active Operators</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {departments.map((d, idx) => {
                const completed = d.completed_pieces ?? d.completed ?? 0;
                const wip = d.pending_pieces ?? d.wip ?? 0;
                const active = d.active_employees ?? d.operators ?? 0;
                const isBacklog = wip > 25;

                return (
                  <tr key={`dept-row-${d.name || idx}`} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-black text-slate-900">
                      {d.name || formatStage(d.stage)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-emerald-700 font-black">
                      {completed.toLocaleString()} pcs
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold">
                      <span className={isBacklog ? 'text-amber-600 font-black' : 'text-slate-800'}>
                        {wip.toLocaleString()} pcs
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-700 font-bold">
                      {active.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                          isBacklog ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isBacklog ? '⚠️ Backlog' : '🟢 Flow Active'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {departments.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400 font-medium">
                    No department data available.
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
