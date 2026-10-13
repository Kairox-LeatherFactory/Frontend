"use client";
import { useState } from "react";
import {
  X,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  FileText,
  Package,
} from "lucide-react";
import {
  useListStoreSubstitutionsQuery,
  useApproveStoreSubstitutionMutation,
  useRejectStoreSubstitutionMutation,
} from "@/store/slices/apiSlice";

export default function StoreSubstitutionsModal({ isOpen, onClose, canApproveSubstitutions = true, setSuccessMsg, setErrorMsg }) {
  const [noteInputs, setNoteInputs] = useState({});
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const { data: liveData, isLoading: isFetching, refetch } = useListStoreSubstitutionsQuery({}, { skip: !isOpen });
  const [approveSub] = useApproveStoreSubstitutionMutation();
  const [rejectSub] = useRejectStoreSubstitutionMutation();

  if (!isOpen) return null;

  const requests = liveData?.requests || (Array.isArray(liveData) ? liveData : []);
  const pendingCount = requests.filter((r) => (r.status || "").toUpperCase() === "PENDING").length;

  const handleApprove = async (reqId) => {
    setActionLoadingId(reqId);
    const note = noteInputs[reqId] || "";
    try {
      await approveSub({ requestId: reqId, note }).unwrap();
      setSuccessMsg(`Substitution approved successfully!`);
      refetch();
    } catch (err) {
      const msg = err?.data?.detail || err.message || "Failed to approve substitution.";
      setErrorMsg(typeof msg === "string" ? msg : "Failed to approve substitution.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (reqId) => {
    setActionLoadingId(reqId);
    const note = noteInputs[reqId] || "";
    try {
      await rejectSub({ requestId: reqId, note }).unwrap();
      setSuccessMsg(`Substitution rejected.`);
      refetch();
    } catch (err) {
      const msg = err?.data?.detail || err.message || "Failed to reject substitution.";
      setErrorMsg(typeof msg === "string" ? msg : "Failed to reject substitution.");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]" style={{ borderColor: "rgba(200,131,74,0.3)" }}>
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-[#2d1f0e] to-[#3d2b1a] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <AlertTriangle className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-lg flex items-center gap-2">
                Wrong-Size Substitutions Queue
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500 text-[#2d1f0e]">
                  {pendingCount} Pending
                </span>
              </h3>
              <p className="text-xs text-[#e2d5c3]/70">DM / MD approval gate for wrong-size accessory packets</p>
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {isFetching && (
            <div className="py-12 flex items-center justify-center text-slate-500 gap-2 text-sm font-bold">
              <Loader2 className="w-5 h-5 animate-spin text-[#c8834a]" /> Loading substitution queue…
            </div>
          )}

          {!isFetching && requests.length === 0 && (
            <div className="py-12 text-center text-slate-400 font-bold text-sm space-y-2">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500/60" />
              <p>No substitution requests in queue.</p>
            </div>
          )}

          {!isFetching &&
            requests.map((req) => {
              const reqStatus = (req.status || "").toUpperCase();
              const isPending = reqStatus === "PENDING";
              const isApproved = reqStatus === "APPROVED";
              const isRejected = reqStatus === "REJECTED";
              const isLoading = actionLoadingId === req.request_id;

              return (
                <div
                  key={req.request_id}
                  className={`p-5 rounded-2xl border transition-all ${
                    isPending
                      ? "bg-amber-50/50 border-amber-200"
                      : isApproved
                      ? "bg-emerald-50/40 border-emerald-200"
                      : "bg-rose-50/40 border-rose-200"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60">
                    <div className="flex items-center gap-3">
                      <Package className="w-5 h-5 text-[#8a5a2e]" />
                      <div>
                        <span className="font-mono font-black text-slate-900 text-sm">{req.piece_code}</span>
                        <div className="text-xs font-bold text-slate-600 mt-0.5">
                          Article: <span className="text-[#3d2b1a]">{req.article || "Accessory Packet"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1 rounded-xl bg-white border border-slate-200 text-xs font-black text-slate-700">
                        Garment: <span className="text-amber-700 font-bold">{req.garment_size || "M"}</span> → Packet:{" "}
                        <span className="text-purple-700 font-bold">{req.lot_size || "L"}</span>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                          isPending
                            ? "bg-amber-100 text-amber-800 border-amber-300"
                            : isApproved
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : "bg-rose-100 text-rose-800 border-rose-300"
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>
                  </div>

                  {req.substitution_reason && (
                    <p className="text-xs font-medium text-slate-600 mt-2 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {req.substitution_reason}
                    </p>
                  )}

                  {isPending ? (
                    <div className="mt-4 pt-3 border-t border-slate-200/60 space-y-2">
                      {!canApproveSubstitutions && (
                        <p className="text-[11px] font-bold text-amber-800 bg-amber-100/80 px-3 py-1.5 rounded-lg">
                          🔒 Substitution decisions are reserved for Direct Manager (DM) & Managing Director (MD).
                        </p>
                      )}
                      <div className="flex flex-col sm:flex-row items-center gap-3">
                        <input
                          type="text"
                          disabled={!canApproveSubstitutions}
                          placeholder={canApproveSubstitutions ? "Add decision note (optional)…" : "DM / MD approval required"}
                          value={noteInputs[req.request_id] || ""}
                          onChange={(e) => setNoteInputs({ ...noteInputs, [req.request_id]: e.target.value })}
                          className="w-full sm:flex-1 h-10 px-3 rounded-xl border bg-white text-xs font-bold outline-none focus:border-[#c8834a] disabled:opacity-60 disabled:bg-slate-100"
                          style={{ borderColor: "rgba(200,131,74,0.25)" }}
                        />
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                          <button
                            type="button"
                            onClick={() => handleReject(req.request_id)}
                            disabled={isLoading || !canApproveSubstitutions}
                            className="h-10 px-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                            Reject
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApprove(req.request_id)}
                            disabled={isLoading || !canApproveSubstitutions}
                            className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            Approve
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 text-xs text-slate-500 flex items-center justify-between">
                      <span>
                        Decided by: <strong className="text-slate-800">{req.decided_by || "Manager"}</strong>
                      </span>
                      {req.decision_note && <span className="italic">"{req.decision_note}"</span>}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
