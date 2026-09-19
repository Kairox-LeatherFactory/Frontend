'use client';
import { motion } from 'framer-motion';
import { Activity, Scissors, Calendar } from 'lucide-react';
import { formatDCM } from '../../_lib/helpers';

/**
 * ============================================================================
 * LiveCutLogTab Component
 * ============================================================================
 * WHAT IT IS:
 * Real-time cut piece stream showing individual piece barcodes, cutter name,
 * cutting date, DCM leather consumption, and assigned lot article/colour.
 */
export default function LiveCutLogTab({
  pieceLog = [],
  onSelectPiece,
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
              <Activity className="w-5 h-5 text-blue-600" />
              Live Cut Piece Stream &amp; Consumption Log
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Piece-level leather consumption records &bull; Click any row to view piece audit
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700">
            {pieceLog.length} Pieces Logged
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200/60">
          <table className="w-full text-xs md:text-sm text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Piece Code</th>
                <th className="py-3 px-4">Cut By (Operator)</th>
                <th className="py-3 px-4">Style &bull; Article</th>
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4 text-right">Consumption</th>
                <th className="py-3 px-4">Leather Lot</th>
                <th className="py-3 px-4">Cut Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {pieceLog.map((piece, idx) => (
                <tr
                  key={`piece-${piece.piece_code || idx}`}
                  onClick={() => onSelectPiece && onSelectPiece(piece)}
                  className="hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                    {piece.piece_code}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">
                    {piece.cutter_name || piece.employee_name || '—'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 font-medium">
                    {piece.style_name} {piece.article ? `• ${piece.article}` : ''}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">{piece.order_number}</td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-blue-700">
                    {formatDCM(piece.consumption_dcm ?? piece.consumption)}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    {piece.lot_article || piece.leather_lot || '—'}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-500">{piece.cut_date || piece.work_date || '—'}</td>
                </tr>
              ))}
              {pieceLog.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400 font-medium">
                    No cut piece logs recorded.
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
