'use client';
import { createPortal } from "react-dom";
import { X, Upload, Loader2, CheckCircle2 } from "lucide-react";
import DynamicDataViewer from "./DynamicDataViewer";

export function ExcelPreviewModal({
  mounted,
  showPreviewModal,
  setShowPreviewModal,
  fileName,
  previewData,
  handleCommit,
  commitLoading,
  uploadError,
}) {
  if (!mounted || !showPreviewModal) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-5xl h-[85vh] flex flex-col relative overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white rounded-t-2xl">
          <div>
            <h3 className="text-lg font-black text-slate-900">
              Excel Import Preview
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              File: {fileName} — Review before importing to database
            </p>
          </div>
          <button
            onClick={() => setShowPreviewModal(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-auto bg-slate-50 flex-1 text-sm">
          {previewData ? (
            <DynamicDataViewer data={previewData} />
          ) : (
            <div className="text-center py-12 text-slate-500 font-bold">
              No preview data available.
            </div>
          )}
        </div>

        <div className="flex gap-3 p-6 border-t border-slate-100 bg-white rounded-b-2xl">
          <button
            onClick={() => setShowPreviewModal(false)}
            className="py-3 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleCommit}
            disabled={commitLoading || !!uploadError}
            className="py-3 px-6 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            {commitLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" /> Confirm &amp; Import to Database
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function CommitConfirmationModal({
  mounted,
  showCommitConfirmation,
  setShowCommitConfirmation,
  fileName,
  commitResult,
  pendingBreakdownOrder,
  setSelectedBreakdownOrder,
  setPendingBreakdownOrder,
  setCommitResult,
  handleSetActiveDoor,
}) {
  if (!mounted || !showCommitConfirmation) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative overflow-hidden border-t-4 border-amber-500">
        <div className="p-6 pb-4 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-7 h-7 text-emerald-600" />
          </div>
          <h3 className="text-lg font-black text-slate-950">
            Committed to Database
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-1">
            File: {fileName} — saved as DRAFT, styles now awaiting release.
          </p>
        </div>

        <div className="px-6 pb-2">
          {commitResult ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
              <p className="text-[11px] font-black uppercase tracking-wide text-amber-800 text-center">
                Please review what was saved before continuing
              </p>
              <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-100">
                <span className="text-xs font-black text-slate-700">
                  Order {commitResult.order_number}
                </span>
                <span
                  className="text-[10px] font-black uppercase px-2 py-1 rounded-md"
                  style={
                    commitResult.release_required
                      ? {
                          color: "#a86022",
                          background: "rgba(200,131,74,0.12)",
                        }
                      : { color: "#047857", background: "#ecfdf5" }
                  }
                >
                  {commitResult.release_required
                    ? "Release Required"
                    : "No Release Needed"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2.5 bg-white rounded-lg border border-amber-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">
                    Styles
                  </p>
                  <p className="text-base font-black text-slate-800">
                    {commitResult.styles ?? 0}
                  </p>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-amber-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">
                    Pieces Minted
                  </p>
                  <p className="text-base font-black text-slate-800">
                    {commitResult.pieces_minted ?? 0}
                  </p>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-amber-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">
                    SKUs Created
                  </p>
                  <p className="text-base font-black text-emerald-600">
                    {commitResult.skus_created ?? 0}
                  </p>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-amber-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">
                    SKUs Updated
                  </p>
                  <p className="text-base font-black text-amber-600">
                    {commitResult.skus_updated ?? 0}
                  </p>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-amber-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">
                    Operations
                  </p>
                  <p className="text-base font-black text-slate-800">
                    {commitResult.operations ?? 0}
                  </p>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-amber-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">
                    Rates
                  </p>
                  <p className="text-base font-black text-slate-800">
                    {commitResult.rates ?? 0}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 font-bold">
              No summary available.
            </div>
          )}
        </div>

        <div className="p-6 pt-4">
          <button
            onClick={() => {
              setShowCommitConfirmation(false);
              handleSetActiveDoor("breakdown");
              setSelectedBreakdownOrder(pendingBreakdownOrder);
              setPendingBreakdownOrder(null);
              setCommitResult(null);
            }}
            className="w-full py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            Continue to Breakdown Review
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
