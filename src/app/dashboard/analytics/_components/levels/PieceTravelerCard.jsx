'use client';
import { Activity, Loader2 } from 'lucide-react';
import { formatLoggedTime } from '../../_lib/helpers';

/**
 * PieceTravelerCard Component (Level 3)
 *
 * Displays the complete journey, traveler logs, and stage transitions for an individual piece:
 * - Bundle / Piece Code identifier
 * - Garment Style Name, Color, Size, and Current Operational Stage
 * - Chronological stage history table featuring worker names, rework tags, dates, and times
 *
 * @param {Object} props
 * @param {string} props.selectedPieceCode - The active piece code.
 * @param {boolean} props.loadingPiece - Loading flag for piece detail fetch.
 * @param {Object|null} props.pieceDetail - Complete piece traveler payload from the API.
 * @param {Array<Object>} props.sortedStages - Chronologically sorted production stage records.
 * @param {Function} props.onClose - Callback to dismiss the piece traveler view: `() => void`.
 * @returns {JSX.Element} Level 3 piece traveler journey card.
 */
export default function PieceTravelerCard({
  selectedPieceCode,
  loadingPiece,
  pieceDetail,
  sortedStages,
  onClose,
}) {
  if (!selectedPieceCode) return null;

  return (
    <div className="bg-white rounded-2xl border border-emerald-500/30 shadow-lg overflow-hidden animate-fade-in relative mt-4">
      {/* Header with Title and Close Action */}
      <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-3.5 flex justify-between items-center gap-2">
        <div className="flex items-center gap-2.5">
          <Activity className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-black uppercase tracking-widest text-emerald-700">
            Level 3 · Piece Traveler
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-xs font-black bg-white border border-emerald-200 text-emerald-700 px-3.5 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors shrink-0 cursor-pointer"
        >
          Close View
        </button>
      </div>

      {/* Loading Spinner State */}
      {loadingPiece ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
          <span className="text-xs font-bold">Loading Piece Details…</span>
        </div>
      ) : pieceDetail ? (
        <div className="p-6 space-y-6">
          {/* Piece Specifications Bar */}
          <div>
            <p className="text-xl font-black text-[#2d1f0e] font-mono">
              {pieceDetail.bundle_id ||
                pieceDetail.piece_code ||
                pieceDetail.code ||
                pieceDetail.piece_id ||
                selectedPieceCode}
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              {(pieceDetail.style_name || pieceDetail.style) && (
                <span className="text-sm text-slate-700 font-bold">
                  {pieceDetail.style_name || pieceDetail.style}
                </span>
              )}
              {(pieceDetail.colour || pieceDetail.color || pieceDetail.size) && (
                <span className="text-sm text-slate-500 font-semibold">
                  {pieceDetail.colour || pieceDetail.color}{' '}
                  {pieceDetail.size ? `/ ${pieceDetail.size}` : ''}
                </span>
              )}
              {(pieceDetail.current_stage ||
                pieceDetail.current_stage_label ||
                pieceDetail.status) && (
                <span className="text-emerald-700 font-black bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full text-xs">
                  {pieceDetail.current_stage_label ||
                    pieceDetail.current_stage ||
                    pieceDetail.status}
                </span>
              )}
            </div>
          </div>

          {/* Sequential Stage History Timeline */}
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <p className="text-xs font-black uppercase text-slate-400 mb-4 tracking-widest">
              Stage History Details
            </p>
            <div className="space-y-3">
              {sortedStages.map((st, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-white border border-slate-200 flex justify-between items-center shadow-sm gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-slate-700 text-sm">
                        {st.label || st.stage_label || st.stage_name || st.stage || st.stage_code}
                      </span>
                      {st.is_rework && (
                        <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-md font-bold text-[10px]">
                          REWORK
                        </span>
                      )}
                      {st.state && (
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                            st.state === 'completed'
                              ? 'bg-emerald-100 text-emerald-700'
                              : st.state === 'in_progress'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {st.state}
                        </span>
                      )}
                    </div>
                    <div className="text-slate-500 mt-1 font-medium text-sm">
                      By {st.employee_name || st.worker_name || 'N/A'}
                    </div>
                  </div>
                  <div className="text-right text-slate-400 shrink-0">
                    <div className="font-bold text-sm">{st.work_date || st.date}</div>
                    <div className="text-xs mt-0.5">
                      {formatLoggedTime(st.logged_at, st.time)}
                    </div>
                  </div>
                </div>
              ))}

              {sortedStages.length === 0 && (
                <div className="p-4 text-center text-slate-400 italic text-sm">
                  No stage history logged yet.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-slate-400 italic text-sm">
          Could not load piece details.
        </div>
      )}
    </div>
  );
}
