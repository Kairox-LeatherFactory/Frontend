'use client';
import { motion } from 'framer-motion';
import { Factory, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { formatStage } from '../../_lib/helpers';

/**
 * ============================================================================
 * FactoryOverviewTab Component (Direct Manager)
 * ============================================================================
 */
export default function FactoryOverviewTab({
  departments = [],
  bottlenecks = [],
  onSelectDepartment,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full space-y-6"
    >
      {/* Plant Department Throughput Flow */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Factory className="w-5 h-5 text-slate-800" />
              Plant Department Flow &amp; Throughput
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live sequential throughput across all active factory sections
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {departments.map((dept, idx) => {
            const completed = dept.completed_pieces ?? dept.completed ?? 0;
            const wip = dept.pending_pieces ?? dept.wip ?? 0;
            const isBottleneck = wip > 25;

            return (
              <div
                key={`dept-${dept.name || idx}`}
                onClick={() => onSelectDepartment && onSelectDepartment(dept)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isBottleneck
                    ? 'border-amber-300 bg-amber-50/40 hover:border-amber-400'
                    : 'border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md font-mono bg-slate-100 text-slate-600">
                      STAGE #{idx + 1}
                    </span>
                    {isBottleneck && (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                        Bottleneck
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-black text-slate-900 truncate">
                    {dept.name || formatStage(dept.stage)}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">{dept.manager || 'Section Floor'}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1 text-xs font-semibold">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Output Done:</span>
                    <span className="font-bold text-emerald-700 font-mono">{completed.toLocaleString()} pcs</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Floor WIP Queue:</span>
                    <span className={`font-mono font-bold ${isBottleneck ? 'text-amber-700 font-black' : 'text-slate-800'}`}>
                      {wip.toLocaleString()} pcs
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
