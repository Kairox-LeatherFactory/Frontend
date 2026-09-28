"use client";
import { useState } from "react";
import { X, Wrench, Barcode, User, Loader2, CheckCircle2 } from "lucide-react";
import { useRecordMaterialIssueMutation } from "@/store/slices/apiSlice";

export default function StoreManualIssueModal({ isOpen, onClose, barcodeWorker, setSuccessMsg, setErrorMsg }) {
  const [pieceBarcode, setPieceBarcode] = useState("");
  const [lotBarcode, setLotBarcode] = useState("");
  const [employeeBarcode, setEmployeeBarcode] = useState("");
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [recordIssue] = useRecordMaterialIssueMutation();

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pieceBarcode.trim()) {
      setErrorMsg("Please scan or enter a Piece Barcode.");
      return;
    }
    if (!lotBarcode.trim()) {
      setErrorMsg("Please scan or enter a Material Lot Barcode.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    const empBarcode = employeeBarcode.trim() || barcodeWorker?.employee_barcode || barcodeWorker?.barcode || "EMP-STORE";
    const payload = {
      piece_barcode: pieceBarcode.trim(),
      lot_barcode: lotBarcode.trim(),
      employee_barcode: empBarcode,
      qty: parseFloat(qty) || 1,
      note: note.trim() || null,
    };

    try {
      const res = await recordIssue(payload).unwrap();
      setSuccessMsg(`Manual issue recorded successfully! (${res.article || "Material"} x ${res.qty})`);
      onClose();
    } catch (err) {
      const msg = err?.data?.detail || err.message || "Failed to record manual issue.";
      setErrorMsg(typeof msg === "string" ? msg : "Failed to record manual issue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border w-full max-w-lg overflow-hidden" style={{ borderColor: "rgba(200,131,74,0.3)" }}>
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-[#2d1f0e] to-[#3d2b1a] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <Wrench className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-base">Raise Issue</h3>
              <p className="text-xs text-[#e2d5c3]/70">Escape hatch for materials issued outside frozen spec</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700">Garment Piece Barcode *</label>
            <div className="relative">
              <Barcode className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder="Scan or type piece barcode (e.g. PC-100231)…"
                value={pieceBarcode}
                onChange={(e) => setPieceBarcode(e.target.value)}
                className="w-full h-11 pl-10 pr-3 bg-slate-50 border rounded-xl font-mono text-sm font-bold text-slate-800 outline-none focus:border-[#c8834a] focus:bg-white"
                style={{ borderColor: "rgba(200,131,74,0.25)" }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700">Material Lot Barcode *</label>
            <div className="relative">
              <Barcode className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder="Scan or type packet/lot barcode (e.g. LOT-ACC-000007)…"
                value={lotBarcode}
                onChange={(e) => setLotBarcode(e.target.value)}
                className="w-full h-11 pl-10 pr-3 bg-slate-50 border rounded-xl font-mono text-sm font-bold text-slate-800 outline-none focus:border-[#c8834a] focus:bg-white"
                style={{ borderColor: "rgba(200,131,74,0.25)" }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700">Worker Card</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={barcodeWorker?.employee_barcode || "Worker Barcode"}
                  value={employeeBarcode}
                  onChange={(e) => setEmployeeBarcode(e.target.value)}
                  className="w-full h-11 pl-9 pr-3 bg-slate-50 border rounded-xl font-mono text-xs font-bold text-slate-800 outline-none focus:border-[#c8834a]"
                  style={{ borderColor: "rgba(200,131,74,0.25)" }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700">Quantity *</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                required
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="w-full h-11 px-3 bg-slate-50 border rounded-xl text-sm font-extrabold text-slate-800 outline-none focus:border-[#c8834a]"
                style={{ borderColor: "rgba(200,131,74,0.25)" }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700">Off-Spec Correction Reason / Note</label>
            <textarea
              rows={2}
              placeholder="Why is this material being issued outside normal spec…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-[#c8834a]"
              style={{ borderColor: "rgba(200,131,74,0.25)" }}
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-5 rounded-xl border bg-white text-slate-700 font-extrabold text-xs hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-11 px-6 rounded-xl font-black text-xs text-white bg-gradient-to-r from-[#8a5a2e] to-[#5a3518] hover:brightness-110 flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Record Issue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
