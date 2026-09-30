// manula logger selct from checklist code
'use client';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { CheckCircle2, XCircle, Rocket, X, Loader2, ListChecks, AlertTriangle } from 'lucide-react';

export default function PieceChecklistModal({
  mounted,
  show,
  setShow,
  selectedStage,
  skuCode,
  piecesMeta,
  selectedPieces,
  setSelectedPieces,
  loadingPieces,
  checklistError,
  setChecklistError,
  checklistPieces,
  openChecklistModal,
  rangeFrom,
  setRangeFrom,
  rangeTo,
  setRangeTo,
  checklistSubmitting,
  submitChecklist,
  currentSelectedSku,
}) {
  if (!mounted || typeof document === 'undefined' || !document.body || !show) return null;

  // Trust the backend's own eligibility computation (`piece.eligible` /
  // `piece.blocked_reason`, returned by GET /production/skus/{id}/pieces)
  // instead of guessing. Two local heuristics used to be OR'd in here and
  // both caused real false-positives: `piece.fusing_done`/`piece.pasting_done`
  // never existed in the real API response, and a local `submittedStageMap`
  // optimistically marked every *selected* piece as done at submit time even
  // when the backend actually rejected/reworked it — openChecklistModal
  // re-fetches fresh piece data on every open, so `piece.done_at_op` alone
  // is always current.
  const isPieceEligible = (p) => {
    if (p.done_at_op) return false;
    return p.eligible !== undefined ? p.eligible : true;
  };

  const handleSelectRange = () => {
    const from = parseInt(rangeFrom, 10);
    const to = parseInt(rangeTo, 10);
    if (isNaN(from) || isNaN(to)) return;
    const lo = Math.min(from, to);
    const hi = Math.max(from, to);
    const rangeSeqs = checklistPieces.filter((p) => p.seq >= lo && p.seq <= hi && isPieceEligible(p)).map((p) => p.seq);
    setSelectedPieces((prev) => Array.from(new Set([...prev, ...rangeSeqs])));
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-end sm:justify-center bg-slate-900/70 backdrop-blur-md animate-fade-in p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-100 w-full sm:max-w-lg h-[92vh] sm:h-auto sm:max-h-[85vh] flex flex-col overflow-hidden relative">
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(200,131,74,0.12)' }}>
              <ListChecks className="w-4 h-4" style={{ color: '#c8834a' }} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black line-clamp-1" style={{ color: '#2d1f0e' }}>
                Select Pieces — {selectedStage}
              </h3>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 max-w-[250px] sm:max-w-sm whitespace-normal break-words leading-tight">
                {skuCode}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShow(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {piecesMeta && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 sm:px-6 py-2.5 sm:py-3 bg-slate-50 border-b border-slate-100 shrink-0">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500">
              Total: <strong className="text-slate-700">{piecesMeta.total}</strong>
            </span>
            <span className="text-[11px] sm:text-xs font-bold text-emerald-600">
              Done: <strong>{piecesMeta.done}</strong>
            </span>
            <span className="text-[11px] sm:text-xs font-bold text-amber-600">
              Pending: <strong>{piecesMeta.pending}</strong>
            </span>
            <span className="text-[11px] sm:text-xs font-bold ml-auto" style={{ color: '#c8834a' }}>
              Selected: <strong>{selectedPieces.length}</strong>
            </span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 overscroll-contain">
          {loadingPieces ? (
            <div className="flex flex-col items-center justify-center h-32 gap-3">
              <Loader2 className="w-7 h-7 animate-spin" style={{ color: '#c8834a' }} />
              <p className="text-sm font-bold text-slate-400">Loading pieces...</p>
            </div>
          ) : checklistError && checklistPieces.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2 text-center">
              <XCircle className="w-8 h-8 text-red-400" />
              <p className="text-sm font-bold text-red-500">{checklistError}</p>
              <button
                type="button"
                onClick={openChecklistModal}
                className="text-xs font-black px-3 py-1.5 rounded-lg mt-1 cursor-pointer"
                style={{ background: 'rgba(200,131,74,0.1)', color: '#c8834a' }}
              >
                Retry
              </button>
            </div>
          ) : checklistPieces.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-36 gap-2 text-center p-4">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
              <p className="text-sm font-bold text-slate-700">
                {selectedStage.toLowerCase().includes('line') || selectedStage.toLowerCase().includes('stitch')
                  ? 'No pieces sent from Store Hub yet!'
                  : 'No pending pieces found for this SKU/stage.'}
              </p>
              <p className="text-xs text-slate-500">
                {selectedStage.toLowerCase().includes('line') || selectedStage.toLowerCase().includes('stitch')
                  ? 'Drawers must be Received and SENDED from Store Hub before Line Stitching can begin.'
                  : 'Complete the previous stage first to advance pieces.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div className="col-span-2 sm:col-span-3 flex flex-wrap items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => {
                    const eligibleSeqs = checklistPieces.filter((p) => isPieceEligible(p)).map((p) => p.seq);
                    setSelectedPieces(eligibleSeqs);
                  }}
                  className="text-[10px] font-black px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                  style={{ background: 'rgba(200,131,74,0.12)', color: '#c8834a' }}
                >
                  Select All Pending
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPieces([])}
                  className="text-[10px] font-black px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                  style={{ background: '#f1f5f9', color: '#475569' }}
                >
                  Deselect All
                </button>

                {/* Range Select: e.g. 001 to 009 — picks every eligible piece
                  in that seq range instead of tapping each one individually. */}
                <div className="flex items-center gap-1.5 ml-auto">
                  <input
                    type="number"
                    min="1"
                    inputMode="numeric"
                    placeholder="001"
                    value={rangeFrom}
                    onChange={(e) => setRangeFrom(e.target.value)}
                    className="w-14 h-7 px-2 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-700 text-center focus:outline-none focus:border-[#c8834a]"
                  />
                  <span className="text-[10px] font-bold text-slate-400">to</span>
                  <input
                    type="number"
                    min="1"
                    inputMode="numeric"
                    placeholder="009"
                    value={rangeTo}
                    onChange={(e) => setRangeTo(e.target.value)}
                    className="w-14 h-7 px-2 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-700 text-center focus:outline-none focus:border-[#c8834a]"
                  />
                  <button
                    type="button"
                    onClick={handleSelectRange}
                    disabled={rangeFrom === '' || rangeTo === ''}
                    className="text-[10px] font-black px-3 py-1.5 rounded-lg cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: 'rgba(99,102,241,0.12)', color: '#4f46e5' }}
                  >
                    Select Range
                  </button>
                </div>
              </div>

              {checklistPieces.map((piece) => {
                const isSelected = selectedPieces.includes(piece.seq);
                const isDone = Boolean(piece.done_at_op);
                const isEligible = !isDone && (piece.eligible !== undefined ? piece.eligible : true);
                const isDisabled = isDone || !isEligible;
                const stageBadgeText = isDone
                  ? `${selectedStage} Done`
                  : !isEligible
                    ? piece.blocked_reason || 'Not Ready'
                    : piece.event_stage_label || 'Ready';

                return (
                  <button
                    key={piece.piece_id || piece.seq}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => {
                      if (isDisabled) return;
                      setSelectedPieces((prev) =>
                        prev.includes(piece.seq) ? prev.filter((s) => s !== piece.seq) : [...prev, piece.seq]
                      );
                    }}
                    className={`relative p-3 rounded-xl border-2 text-left transition-all ${!isDisabled ? 'cursor-pointer hover:border-[#c8834a]' : 'cursor-not-allowed opacity-60 bg-slate-100'} ${
                      isSelected
                        ? 'border-[#c8834a] bg-[#c8834a]/10 shadow-md'
                        : isDone
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                          : !isEligible
                            ? 'border-slate-200 bg-slate-100 text-slate-400'
                            : 'border-slate-200 bg-white'
                    }`}
                  >
                    <p
                      className="text-xs font-black"
                      style={{
                        color: isSelected ? '#c8834a' : isDone ? '#047857' : !isEligible ? '#94a3b8' : '#2d1f0e',
                      }}
                    >
                      #{piece.seq}
                    </p>
                    <p
                      className={`text-[9px] font-bold truncate ${isDone ? 'text-emerald-700 font-extrabold' : isSelected ? 'text-[#c8834a]' : 'text-slate-500'}`}
                    >
                      {stageBadgeText}
                    </p>
                    {isDone && (
                      <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      </span>
                    )}
                    {isSelected && !isDone && (
                      <span
                        className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center shadow-sm"
                        style={{ background: '#c8834a' }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2.5 p-4 sm:p-6 border-t border-slate-100 shrink-0 bg-white pb-6 sm:pb-6">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setShow(false);
                setChecklistError('');
              }}
              className="flex-1 py-3 rounded-xl text-xs font-extrabold transition-colors cursor-pointer"
              style={{ background: '#f1f5f9', color: '#475569' }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={selectedPieces.length === 0 || checklistSubmitting}
              onClick={submitChecklist}
              className="flex-1 py-3 rounded-xl text-xs font-extrabold text-white shadow-md flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:translate-y-0 cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}
            >
              {checklistSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <Rocket className="w-3.5 h-3.5" /> Submit {selectedPieces.length > 0 ? `${selectedPieces.length} Pieces` : 'Event'}
                </>
              )}
            </button>
          </div>

          {currentSelectedSku && (
            <Link
              href={`/dashboard/analytics?order_number=${encodeURIComponent(currentSelectedSku.order_number || '')}&style_name=${encodeURIComponent(currentSelectedSku.style_name || '')}`}
              onClick={() => setShow(false)}
              className="w-full py-2.5 rounded-xl text-xs font-extrabold text-[#0ea5e9] bg-[#0ea5e9]/10 border border-[#0ea5e9]/20 shadow-sm flex items-center justify-center gap-1.5 transition-all hover:bg-[#0ea5e9]/20 text-center"
            >
              <Rocket className="w-3.5 h-3.5" /> Navigate to Order Explorer
            </Link>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
