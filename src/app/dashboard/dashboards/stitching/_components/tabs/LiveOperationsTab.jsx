'use client';
import { motion } from 'framer-motion';
import { Waypoints, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
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
 * LiveOperationsTab Component
 * ============================================================================
 * WHAT IT IS:
 * Real-time floor operations tab showcasing:
 * 1. 5-Stage Live Production Funnel (Fusing, Pasting, Line Stitch, Shell Stitch, Final Finish)
 * 2. Store Handoff & Drawer buffer status
 * 3. Daily stage output cadence chart and chronological production log
 */
export default function LiveOperationsTab({
  pipelineStages = [],
  filterStage = 'all',
  onSelectStage,
  storeHandoff = {},
  dailyChartData = [],
  currentStyle = null,
  onNavigateTab,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full space-y-6"
    >
      {/* ====================================================================
          DIVISION 1: 5-STAGE PIPELINE FUNNEL CARDS
          ==================================================================== */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                Floor Flow &bull; 5 Sequential Stages
              </span>
              {currentStyle?.style && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                  Spotlight: {currentStyle.style} ({currentStyle.article || 'Article'})
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Waypoints className="w-5 h-5 text-indigo-600" />
              Stitching Production Pipeline
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any stage card below to isolate and filter floor operations.
            </p>
          </div>

          {filterStage !== 'all' && (
            <button
              onClick={() => onSelectStage('all')}
              className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer"
            >
              Clear Stage Filter
            </button>
          )}
        </div>

        {/* 5 Sequential Stage Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {pipelineStages.map((st, idx) => {
            const isSelected = filterStage === st.stage;
            const completed = st.completed_pieces ?? 0;
            const queue = st.pending_pieces ?? st.queue ?? 0;
            const isBacklog = queue > 20;

            return (
              <div
                key={`pipeline-stage-${st.stage}-${idx}`}
                onClick={() => onSelectStage(isSelected ? 'all' : st.stage)}
                className={`relative p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/80 shadow-md ring-2 ring-indigo-500/20'
                    : isBacklog
                    ? 'border-amber-300 bg-amber-50/40 hover:border-amber-400'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-md font-mono ${
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : isBacklog
                          ? 'bg-amber-200 text-amber-900 font-bold'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      #{idx + 1}
                    </span>
                    {isSelected && (
                      <span className="text-[9px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">
                        Active
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-black text-slate-900 leading-tight truncate">
                    {st.label || formatStage(st.stage)}
                  </h4>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] font-semibold space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Done:</span>
                    <span className="font-bold text-emerald-700 font-mono">{completed}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Queue:</span>
                    <span
                      className={`font-bold font-mono ${
                        isBacklog ? 'text-amber-600 font-black' : 'text-slate-700'
                      }`}
                    >
                      {queue}
                    </span>
                  </div>
                </div>

                {isBacklog && (
                  <div className="mt-2 text-center bg-amber-100 border border-amber-200 text-amber-800 text-[9px] font-black uppercase rounded-lg py-0.5">
                    High Backlog
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ====================================================================
          DIVISION 2: STORE HANDOFF & DRAWER STATE CARDS
          ==================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Sent to Store */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Pre-Store Handoff</span>
          <div className="text-xl font-black text-slate-900 mt-1">
            {(storeHandoff.sent_to_store ?? 0).toLocaleString()} pcs
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Moved from Pasting to Store</p>
        </div>

        {/* Card 2: In Store Buffer */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Inside Store</span>
          <div className="text-xl font-black text-indigo-600 mt-1">
            {(storeHandoff.in_store ?? 0).toLocaleString()} pcs
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Currently residing in Store stock</p>
        </div>

        {/* Card 3: In Drawer */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Holding In Drawer</span>
          <div className="text-xl font-black text-amber-600 mt-1">
            {(storeHandoff.in_drawer ?? 0).toLocaleString()} pcs
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Ready for Line Stitching release</p>
        </div>

        {/* Card 4: Ready for Line Stitching */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Released to Line</span>
          <div className="text-xl font-black text-emerald-600 mt-1">
            {(storeHandoff.ready_for_stitching ?? 0).toLocaleString()} pcs
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Active on line stitching tables</p>
        </div>
      </div>

      {/* ====================================================================
          DIVISION 3: DAILY OUTPUT CADENCE CHART & LOG
          ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black text-slate-900">Daily Stage Output</h3>
              <p className="text-xs text-slate-500">
                Completed pieces by stage across active production dates
              </p>
            </div>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="work_date" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Bar dataKey="FUSING" name="Fusing" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="PASTING" name="Pasting" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="LINE_STITCHING" name="Line Stitch" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="SHELL_STITCHING" name="Shell Stitch" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="FINAL_FINISH" name="Final Finish" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Production Activity Feed */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900 mb-1">Production Log</h3>
            <p className="text-xs text-slate-500 mb-3">Daily output history</p>
            <div className="overflow-y-auto max-h-[240px] space-y-2 pr-1">
              {[...dailyChartData].reverse().map((log, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                >
                  <span className="font-bold text-slate-800">{log.work_date}</span>
                  <span className="font-black text-indigo-700">{log.total ?? 0} pcs</span>
                </div>
              ))}
              {dailyChartData.length === 0 && (
                <div className="text-center py-8 text-slate-400 font-medium text-xs">
                  No production logged yet.
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => onNavigateTab && onNavigateTab('tab-stages')}
            className="mt-4 w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>View All Stage Details</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
