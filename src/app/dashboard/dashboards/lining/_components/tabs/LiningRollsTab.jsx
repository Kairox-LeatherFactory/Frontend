'use client';
import { motion } from 'framer-motion';
import { Layers } from 'lucide-react';
import { formatMeters } from '../../_lib/helpers';

/**
 * ============================================================================
 * LiningRollsTab Component
 * ============================================================================
 */
export default function LiningRollsTab({
  fabricRolls = [],
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
              <Layers className="w-5 h-5 text-rose-600" />
              Lining Fabric Roll Inventory
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Available roll lengths, issued batches &amp; cutting meters
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-50 text-rose-700">
            {fabricRolls.length} Fabric Rolls
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200/60">
          <table className="w-full text-xs md:text-sm text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Roll Code</th>
                <th className="py-3 px-4">Fabric Type</th>
                <th className="py-3 px-4">Colour</th>
                <th className="py-3 px-4 text-right">Initial Meters</th>
                <th className="py-3 px-4 text-right">Consumed Meters</th>
                <th className="py-3 px-4 text-right">Balance Meters</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {fabricRolls.map((roll, idx) => (
                <tr key={`roll-${roll.roll_code || idx}`} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{roll.roll_code}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">{roll.fabric_type || roll.article}</td>
                  <td className="py-3.5 px-4 text-slate-600">{roll.colour}</td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                    {formatMeters(roll.initial_meters || roll.received_meters)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-rose-700 font-bold">
                    {formatMeters(roll.consumed_meters)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-emerald-700 font-black">
                    {formatMeters(roll.balance_meters)}
                  </td>
                </tr>
              ))}
              {fabricRolls.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400 font-medium">
                    No fabric roll records available.
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
