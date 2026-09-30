'use client';
import { motion } from 'framer-motion';
import { Users, Search, Award } from 'lucide-react';
import { initials } from '../../_lib/helpers';

/**
 * ============================================================================
 * EmployeeProductivityTab Component
 * ============================================================================
 * WHAT IT IS:
 * Operator productivity roster displaying:
 * 1. Employee stage allocations, piece completions, daily assignments
 * 2. Instant operator click to inspect active piece trace
 * 3. Performance & output metrics
 */
export default function EmployeeProductivityTab({
  employees = [],
  onSelectEmployee,
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
              <Users className="w-5 h-5 text-indigo-600" />
              Operator Productivity &amp; Allocations
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Individual stitcher piece counts, daily target completions &bull; Click an operator to inspect their live piece trace
            </p>
          </div>
          <div className="text-xs font-bold text-slate-500">
            Total Operators: <strong className="text-slate-900">{employees.length}</strong>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200/60">
          <table className="w-full text-xs md:text-sm text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Operator</th>
                <th className="py-3 px-4">Designation</th>
                <th className="py-3 px-4 text-right">Assigned Pieces</th>
                <th className="py-3 px-4 text-right">Completed Pieces</th>
                <th className="py-3 px-4 text-right">Today Output</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {employees.map((emp, idx) => {
                const assigned = emp.assigned_pieces ?? emp.total_assigned ?? 0;
                const completed = emp.completed_pieces ?? emp.total_completed ?? 0;
                const today = emp.completed_today ?? emp.daily_completed ?? 0;

                return (
                  <tr
                    key={`emp-${emp.id || emp.employee_id || idx}`}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center text-xs font-black shrink-0">
                          {initials(emp.name)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{emp.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            ID: {emp.employee_id || emp.id || '—'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {emp.designation || 'Stitching Operator'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700 font-bold">
                      {assigned.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-700 font-black">
                      {completed.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-indigo-700 font-black">
                      {today.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onSelectEmployee && onSelectEmployee(emp)}
                        className="px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-all cursor-pointer"
                      >
                        Inspect Piece &rarr;
                      </button>
                    </td>
                  </tr>
                );
              })}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400 font-medium">
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
