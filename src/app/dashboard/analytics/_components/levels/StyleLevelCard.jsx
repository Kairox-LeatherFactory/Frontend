'use client';
import { Package } from 'lucide-react';
import { getPieces } from '../../_lib/helpers';

/**
 * StyleLevelCard Component (Level 2)
 *
 * Displays detailed style intelligence for a selected garment/product style:
 * - Style Name, Article identifier, and Lifecycle Status badge
 * - 4 Summary KPI counters (Total Pieces, Completed, In Progress, Defects / Rework)
 * - Scrollable piece traveler list enabling one-click drill down into Level 3
 *
 * @param {Object} props
 * @param {Object} props.style - The active style item object.
 * @param {Object|null} props.sDetail - The detailed style data fetched from the API.
 * @param {string|null} props.selectedPieceCode - The currently selected piece code (if any).
 * @param {Function} props.onSelectPiece - Callback fired when a piece is clicked: `(code: string) => void`.
 * @returns {JSX.Element} Level 2 style detail card.
 */
export default function StyleLevelCard({
  style,
  sDetail,
  selectedPieceCode,
  onSelectPiece,
}) {
  if (!style) return null;

  const piecesList = getPieces(sDetail);
  const totalPieces = piecesList.length || style.piece_count || style.pieces?.length || 0;
  const completedCount = piecesList.filter(
    (p) => p.current_stage === 'FINAL_FINISH' || p.status === 'Completed'
  ).length;
  const inProgressCount = Math.max(0, totalPieces - completedCount);
  const reworkCount = piecesList.filter(
    (p) => p.is_rework || p.status === 'Damaged' || p.status === 'Rework'
  ).length;

  return (
    <div className="bg-white rounded-2xl border border-[#c8834a]/30 shadow-md overflow-hidden animate-fade-in relative mt-4">
      {/* Header with Title and Drill-down prompt */}
      <div className="bg-[#c8834a]/10 border-b border-[#c8834a]/20 px-5 py-3.5 flex justify-between items-center gap-2">
        <div className="flex items-center gap-2.5">
          <Package className="w-4 h-4 text-[#c8834a]" />
          <span className="text-xs font-black uppercase tracking-widest text-[#c8834a]">
            Level 2 · Style Details
          </span>
        </div>
        {!selectedPieceCode && (
          <span className="text-xs bg-white text-[#c8834a] px-3 py-1.5 rounded-lg font-bold shrink-0">
            Select a piece below ↓
          </span>
        )}
      </div>

      <div className="p-6">
        {/* Style Name and Status Badge */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div>
            <p className="text-2xl font-black text-[#2d1f0e]">
              {style.style_name || style.style}{' '}
              <span className="text-slate-400 font-semibold text-base">
                ({style.article || sDetail?.article || 'Standard Article'})
              </span>
            </p>
            <p className="text-xs text-slate-400 font-mono mt-1">
              {style.style_id || style.id}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
              {sDetail?.status || style.status || 'Active in Pipeline'}
            </span>
          </div>
        </div>

        {/* 4 Dynamic Metric Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="rounded-xl bg-amber-50/70 border border-amber-100 p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-0.5">
              Total Pieces
            </p>
            <p className="text-xl font-black text-slate-900">{totalPieces}</p>
          </div>

          <div className="rounded-xl bg-emerald-50/70 border border-emerald-100 p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-0.5">
              Completed
            </p>
            <p className="text-xl font-black text-emerald-800">{completedCount}</p>
          </div>

          <div className="rounded-xl bg-blue-50/70 border border-blue-100 p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700 mb-0.5">
              In Progress
            </p>
            <p className="text-xl font-black text-blue-800">{inProgressCount}</p>
          </div>

          <div className="rounded-xl bg-rose-50/70 border border-rose-100 p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700 mb-0.5">
              Defects / Rework
            </p>
            <p className="text-xl font-black text-rose-800">{reworkCount}</p>
          </div>
        </div>

        {/* Pieces Traveler Selection List */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-black uppercase tracking-wider text-slate-500">
            Tracked Pieces &amp; Travelers
          </span>
          <span className="text-[11px] font-bold text-slate-400">
            {piecesList.length} pieces loaded
          </span>
        </div>

        <div
          className={`border border-slate-200 rounded-xl overflow-hidden transition-all duration-300 max-h-80 overflow-y-auto ${
            selectedPieceCode ? 'opacity-50 h-32' : ''
          }`}
        >
          {piecesList.map((p) => {
            const pieceCode = p.bundle_id || p.piece_code;
            const isSelected = selectedPieceCode === pieceCode;

            return (
              <div
                key={pieceCode}
                onClick={() => onSelectPiece(pieceCode)}
                className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3.5 border-b border-slate-100 last:border-b-0 cursor-pointer transition-colors ${
                  isSelected ? 'bg-[#c8834a]/10' : 'hover:bg-slate-50'
                }`}
              >
                <span className="text-sm font-bold text-slate-400 w-8 shrink-0">
                  #{p.seq || 1}
                </span>
                <span className="text-sm font-black text-slate-800 flex-1 min-w-[100px] truncate">
                  {pieceCode}
                </span>
                <span className="text-sm text-slate-500 shrink-0">
                  {p.colour || p.color} / {p.size}
                </span>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-full text-xs font-black shrink-0">
                  {p.current_stage || 'Active'}
                </span>
              </div>
            );
          })}

          {piecesList.length === 0 && (
            <div className="p-8 text-center text-slate-400 italic text-sm">
              Loading or no pieces logged for this style yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
