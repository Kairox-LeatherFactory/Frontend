'use client';
import { createPortal } from "react-dom";
import { FileSpreadsheet, X, Loader2 } from "lucide-react";

export default function OrderNumberModal({
  mounted,
  showOrderNumModal,
  setShowOrderNumModal,
  uploadOrderNumber,
  setUploadOrderNumber,
  uploadOrderNumberError,
  setUploadOrderNumberError,
  uploadLoading,
  fileInputRef,
}) {
  if (!mounted || typeof document === "undefined" || !document.body || !showOrderNumModal) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-sm p-6 sm:p-8 space-y-5 relative">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(200,131,74,0.12)" }}
            >
              <FileSpreadsheet
                className="w-4 h-4"
                style={{ color: "#c8834a" }}
              />
            </div>
            <div>
              <h3
                className="text-base font-black"
                style={{ color: "#2d1f0e" }}
              >
                Upload Breakdown Sheet
              </h3>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Step 1 of 2 — Enter Order Number
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setShowOrderNumModal(false);
              setUploadOrderNumberError("");
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1.5">
          <label
            className="text-[11px] font-black uppercase tracking-widest block"
            style={{ color: "#9a7a5a" }}
          >
            Order Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            autoFocus
            placeholder="e.g. 1001"
            value={uploadOrderNumber}
            onChange={(e) => {
              setUploadOrderNumber(e.target.value.trim());
              setUploadOrderNumberError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && uploadOrderNumber.trim()) {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            className={`w-full px-4 py-3 rounded-xl border text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 transition-colors ${
              uploadOrderNumberError
                ? "border-red-400 bg-red-50 focus:ring-red-400/20"
                : "border-slate-200 focus:ring-[#c8834a]/20 focus:border-[#c8834a]"
            }`}
          />
          {uploadOrderNumberError ? (
            <p className="text-xs font-bold text-red-600 flex items-start gap-1.5 pt-1">
              <span className="mt-0.5 w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[8px] font-black flex items-center justify-center shrink-0">
                !
              </span>
              {uploadOrderNumberError}
            </p>
          ) : (
            <p className="text-[10px] text-slate-400 font-medium">
              Must match an existing order. The sheet SKUs will be written
              into this order.
            </p>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              setShowOrderNumModal(false);
              setUploadOrderNumberError("");
            }}
            className="flex-1 py-3 rounded-xl text-xs font-extrabold transition-colors cursor-pointer"
            style={{ background: "#f1f5f9", color: "#475569" }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!uploadOrderNumber.trim() || uploadLoading}
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 py-3 rounded-xl text-xs font-extrabold text-white shadow-md flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:translate-y-0 cursor-pointer"
            style={{
              background: "linear-gradient(135deg, #c8834a, #e8a06a)",
            }}
          >
            {uploadLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />{" "}
                Uploading...
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-3.5 h-3.5" /> Choose File
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
