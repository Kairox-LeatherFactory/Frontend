'use client';
import { motion } from 'framer-motion';
import { Users, Shirt } from 'lucide-react';
import { initials, formatMeters } from '../../_lib/helpers';

/**
 * ============================================================================
 * LiningProductivityTab Component
 * ============================================================================
 */
export default function LiningProductivityTab({
  operators = [],
  onSelectOperator,
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
              <Users className="w-5 h-5 text-rose-600" />
              Lining Operator Productivity &amp; Allocations
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Piece completions, daily cut pace &amp; fabric meter consumption
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-50 text-rose-700">
            {operators.length} Operators Active
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200/60">
          <table className="w-full text-xs md:text-sm text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Operator</th>
                <th className="py-3 px-4">Designation</th>
                <th className="py-3 px-4 text-right">Assigned</th>
                <th className="py-3 px-4 text-right">Completed Pieces</th>
                <th className="py-3 px-4 text-right">Today Cut</th>
                <th className="py-3 px-4 text-right">Fabric Consumed</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {operators.map((op, idx) => {
                const assigned = op.assigned_pieces ?? op.total_assigned ?? 0;
                const completed = op.completed_pieces ?? op.total_completed ?? 0;
                const today = op.completed_today ?? op.daily_completed ?? 0;
                const consumption = op.total_consumption ?? op.consumption ?? 0;

                return (
                  <tr
                    key={`op-${op.id || op.employee_id || idx}`}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-700 flex items-center justify-center text-xs font-black shrink-0">
                          {initials(op.name)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{op.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            ID: {op.employee_id || op.id || '—'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {op.designation || 'Lining Cutter'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700 font-bold">
                      {assigned.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-700 font-black">
                      {completed.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-rose-700 font-black">
                      {today.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-800 font-bold">
                      {formatMeters(consumption)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onSelectOperator && onSelectOperator(op)}
                        className="px-3 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold transition-all cursor-pointer"
                      >
                        Inspect Trace &rarr;
                      </button>
                    </td>
                  </tr>
                );
              })}
              {operators.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400 font-medium">
                    No operator records found.
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
