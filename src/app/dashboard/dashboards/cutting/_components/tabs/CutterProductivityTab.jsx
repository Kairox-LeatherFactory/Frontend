'use client';
import { motion } from 'framer-motion';
import { Users, Scissors, Award } from 'lucide-react';
import { initials, formatDCM } from '../../_lib/helpers';

/**
 * ============================================================================
 * CutterProductivityTab Component
 * ============================================================================
 * WHAT IT IS:
 * Cutter operator table showing total assigned pieces, completed cut pieces,
 * daily pieces, DCM leather consumption, and trace inspection shortcut.
 */
export default function CutterProductivityTab({
  cutters = [],
  onSelectCutter,
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
              <Users className="w-5 h-5 text-blue-600" />
              Cutter Performance &amp; Piece Allocations
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Piece completions, daily cut pace &amp; material DCM consumption
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700">
            {cutters.length} Cutters Active
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200/60">
          <table className="w-full text-xs md:text-sm text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Cutter</th>
                <th className="py-3 px-4">Designation</th>
                <th className="py-3 px-4 text-right">Assigned</th>
                <th className="py-3 px-4 text-right">Completed Pieces</th>
                <th className="py-3 px-4 text-right">Today Cut</th>
                <th className="py-3 px-4 text-right">Consumption</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {cutters.map((cutter, idx) => {
                const assigned = cutter.assigned_pieces ?? cutter.total_assigned ?? 0;
                const completed = cutter.completed_pieces ?? cutter.total_completed ?? 0;
                const today = cutter.completed_today ?? cutter.daily_completed ?? 0;
                const consumption = cutter.total_consumption ?? cutter.consumption ?? 0;

                return (
                  <tr
                    key={`cutter-${cutter.id || cutter.employee_id || idx}`}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center text-xs font-black shrink-0">
                          {initials(cutter.name)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{cutter.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            ID: {cutter.employee_id || cutter.id || '—'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {cutter.designation || 'Leather Cutter'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700 font-bold">
                      {assigned.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-700 font-black">
                      {completed.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-blue-700 font-black">
                      {today.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-800 font-bold">
                      {formatDCM(consumption)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onSelectCutter && onSelectCutter(cutter)}
                        className="px-3 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition-all cursor-pointer"
                      >
                        Inspect Cut Log &rarr;
                      </button>
                    </td>
                  </tr>
                );
              })}
              {cutters.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400 font-medium">
                    No cutter records found.
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
