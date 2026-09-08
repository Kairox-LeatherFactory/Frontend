'use client';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';

/**
 * ============================================================================
 * StoreMovementsTab Component
 * ============================================================================
 */
export default function StoreMovementsTab({
  movements = [],
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
              <Activity className="w-5 h-5 text-cyan-600" />
              Store Piece Check-In &amp; Release Log
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live audit stream of pieces moving in and out of store drawers
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-cyan-50 text-cyan-700">
            {movements.length} Movements Logged
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200/60">
          <table className="w-full text-xs md:text-sm text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Piece Code</th>
                <th className="py-3 px-4">Movement Action</th>
                <th className="py-3 px-4">Drawer</th>
                <th className="py-3 px-4">Logged By</th>
                <th className="py-3 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {movements.map((m, idx) => (
                <tr key={`mov-${m.id || idx}`} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{m.piece_code}</td>
                  <td className="py-3.5 px-4 font-bold">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        m.action === 'CHECK_IN'
                          ? 'bg-blue-50 text-blue-700'
                          : m.action === 'RELEASE'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {m.action || 'STAGE'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-cyan-700 font-bold">{m.drawer_code || '—'}</td>
                  <td className="py-3.5 px-4 text-slate-700">{m.operator_name || m.user_name || 'Store Scanner'}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-500">{m.created_at || m.timestamp || '—'}</td>
                </tr>
              ))}
              {movements.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400 font-medium">
                    No store movements logged yet.
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
