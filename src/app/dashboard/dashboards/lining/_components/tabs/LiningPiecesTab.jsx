'use client';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { formatMeters } from '../../_lib/helpers';

/**
 * ============================================================================
 * LiningPiecesTab Component
 * ============================================================================
 */
export default function LiningPiecesTab({
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
              <Activity className="w-5 h-5 text-rose-600" />
              Live Lining Cut Stream &amp; Meter Log
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Piece-by-piece fabric consumption records
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-50 text-rose-700">
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
                <th className="py-3 px-4 text-right">Fabric Used</th>
                <th className="py-3 px-4">Roll Code</th>
                <th className="py-3 px-4">Work Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {pieceLog.map((piece, idx) => (
                <tr
                  key={`lining-piece-${piece.piece_code || idx}`}
                  onClick={() => onSelectPiece && onSelectPiece(piece)}
                  className="hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                    {piece.piece_code}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">
                    {piece.operator_name || piece.employee_name || '—'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 font-medium">
                    {piece.style_name} {piece.article ? `• ${piece.article}` : ''}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">{piece.order_number}</td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-700">
                    {formatMeters(piece.consumption_meters ?? piece.consumption)}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    {piece.roll_code || piece.lot_code || '—'}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-500">
                    {piece.work_date || piece.cut_date || '—'}
                  </td>
                </tr>
              ))}
              {pieceLog.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400 font-medium">
                    No lining piece logs recorded.
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
