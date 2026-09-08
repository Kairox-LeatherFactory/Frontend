'use client';
import { motion } from 'framer-motion';
import { Search, Tag, CheckCircle2, Clock } from 'lucide-react';
import { formatStage, sortPieceHistory } from '../../_lib/helpers';

/**
 * ============================================================================
 * PieceTrackerTab Component
 * ============================================================================
 * WHAT IT IS:
 * Barcode piece-level inspection tab providing:
 * 1. Instant barcode lookup by piece code
 * 2. Piece summary card (Style, Article, Colour, Size, Current Stage, Store Status)
 * 3. Step-by-step chronological stage history showing which operator worked each step
 */
export default function PieceTrackerTab({
  searchInput,
  onSearchInputChange,
  onSearch,
  loading,
  error,
  searchedCode,
  pieceDetail,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full space-y-6"
    >
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
        <div>
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Tag className="w-5 h-5 text-indigo-600" />
            Piece-Level Barcode Tracker &amp; Audit
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Enter a piece barcode to trace its complete journey from cutting through final finish
          </p>
        </div>

        {/* Search Bar Input */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => onSearchInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSearch();
              }}
              placeholder="e.g. IS1234-CARNABY-PINE_GREEN-S-003"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-mono font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
            />
          </div>
          <button
            onClick={onSearch}
            disabled={!searchInput.trim() || loading}
            className="px-5 py-2.5 rounded-2xl bg-[#4f46e5] text-white text-xs font-bold hover:bg-[#4338ca] disabled:opacity-50 transition-all cursor-pointer shadow-sm shadow-indigo-200"
          >
            {loading ? 'Searching...' : 'Look Up Piece'}
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="text-xs text-red-600 font-semibold bg-red-50 border border-red-100 rounded-xl p-3">
            Error: {error}
          </div>
        )}

        {/* Empty Search Prompt */}
        {!searchedCode && !loading && (
          <div className="text-center py-10 text-slate-400 font-medium text-xs">
            Enter a piece code above or select an operator from the productivity tab to trace their piece.
          </div>
        )}

        {/* Piece Details & Full History */}
        {pieceDetail && !loading && (
          <div className="space-y-6 pt-2">
            {/* Piece Summary Attributes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Piece Code</span>
                <p className="text-xs font-mono font-black text-slate-900 truncate">
                  {pieceDetail.piece_code}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Style / Article</span>
                <p className="text-xs font-bold text-slate-800">
                  {pieceDetail.style} &bull; {pieceDetail.article || '—'}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Colour / Size</span>
                <p className="text-xs font-bold text-slate-800">
                  {pieceDetail.colour || '—'} &bull; {pieceDetail.size || '—'}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Current Stage</span>
                <p className="text-xs font-bold">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-100 text-indigo-800">
                    {pieceDetail.display_stage ? formatStage(pieceDetail.display_stage) : '—'}
                  </span>
                </p>
              </div>
            </div>

            {/* Stage-by-Stage History Journey */}
            <div>
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3">
                Production Stage Journey &amp; Operator History
              </h4>
              <div className="overflow-x-auto rounded-2xl border border-slate-200/60">
                <table className="w-full text-xs md:text-sm text-left">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                      <th className="py-3 px-4">Stage</th>
                      <th className="py-3 px-4">Worked By</th>
                      <th className="py-3 px-4">Work Date</th>
                      <th className="py-3 px-4 text-right">Consumption</th>
                      <th className="py-3 px-4">Lot Info</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {sortPieceHistory(pieceDetail.history).map((h, idx) => (
                      <tr key={`history-${h.stage}-${idx}`} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-black text-slate-900">
                          {h.label || formatStage(h.stage)}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800">{h.employee || '—'}</td>
                        <td className="py-3 px-4 font-mono text-slate-600">{h.work_date || '—'}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                          {typeof h.consumption === 'number' ? `${h.consumption} DCM` : '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {h.lot_article
                            ? `${h.lot_article}${h.lot_colour ? ` / ${h.lot_colour}` : ''}`
                            : '—'}
                        </td>
                      </tr>
                    ))}
                    {(!pieceDetail.history || pieceDetail.history.length === 0) && (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-slate-400 font-medium">
                          No stage history recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
