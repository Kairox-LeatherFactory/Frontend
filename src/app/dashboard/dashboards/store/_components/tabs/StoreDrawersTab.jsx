'use client';
import { motion } from 'framer-motion';
import { Boxes, Package } from 'lucide-react';
import { formatDrawerStatus } from '../../_lib/helpers';

/**
 * ============================================================================
 * StoreDrawersTab Component
 * ============================================================================
 */
export default function StoreDrawersTab({
  drawers = [],
  onSelectDrawer,
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
              <Boxes className="w-5 h-5 text-cyan-600" />
              Storage Drawers &amp; Holding Capacity
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time drawer locations, capacity utilization &amp; stored styles
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-cyan-50 text-cyan-700">
            {drawers.length} Drawers Configured
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {drawers.map((d, idx) => {
            const count = d.piece_count ?? d.current_pieces ?? 0;
            const cap = d.capacity ?? 100;
            const isFull = count >= cap;

            return (
              <div
                key={`drawer-${d.id || d.drawer_code || idx}`}
                onClick={() => onSelectDrawer && onSelectDrawer(d)}
                className="p-4 rounded-2xl border border-slate-200/80 bg-white hover:border-cyan-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded-lg font-mono text-xs font-black bg-cyan-50 text-cyan-800">
                      {d.drawer_code || `DRAWER-${idx + 1}`}
                    </span>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        isFull
                          ? 'bg-red-50 text-red-700'
                          : count > 0
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {formatDrawerStatus(d.status)}
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-slate-900 truncate">
                    {d.style_name || 'Multi-Style Buffer'}
                  </h4>
                  <p className="text-[11px] text-slate-500">{d.location || 'Main Floor Rack'}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex justify-between items-center text-xs font-bold mb-1">
                    <span className="text-slate-500">Occupancy:</span>
                    <span className="font-mono text-slate-900">{count} / {cap} pcs</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-cyan-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.round((count / cap) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
          {drawers.length === 0 && (
            <div className="col-span-full text-center py-10 text-slate-400 font-medium text-xs">
              No drawer records configured yet.
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
