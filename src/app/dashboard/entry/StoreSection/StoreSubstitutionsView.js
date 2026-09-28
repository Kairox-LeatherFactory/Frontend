"use client";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, XCircle, Loader2, FileText, Package } from "lucide-react";
import {
  useListStoreSubstitutionsQuery,
  useApproveStoreSubstitutionMutation,
  useRejectStoreSubstitutionMutation,
} from "@/store/slices/apiSlice";

export default function StoreSubstitutionsView({ canApproveSubstitutions = true, setSuccessMsg, setErrorMsg }) {
  const [noteInputs, setNoteInputs] = useState({});
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const { data: liveData, isLoading: isFetching, refetch } = useListStoreSubstitutionsQuery();
  const [approveSub] = useApproveStoreSubstitutionMutation();
  const [rejectSub] = useRejectStoreSubstitutionMutation();

  const requests = liveData?.requests || (Array.isArray(liveData) ? liveData : []);

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
    <div className="bg-white rounded-3xl border shadow-sm p-4 sm:p-6" style={{ borderColor: "rgba(200,131,74,0.15)" }}>
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

      {!isFetching && requests.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {requests.map((req) => {
            const reqStatus = (req.status || "").toUpperCase();
            const isPending = reqStatus === "PENDING";
            const isApproved = reqStatus === "APPROVED";
            const isRejected = reqStatus === "REJECTED";
            const isLoading = actionLoadingId === req.request_id;

            return (
              <div
                key={req.request_id}
                className={`p-5 rounded-2xl border transition-all ${isPending
                    ? "bg-[#faf6f0] border-[#c8834a]/30"
                    : isApproved
                      ? "bg-emerald-50 border-emerald-200"
                      : "bg-rose-50 border-rose-200"
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
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${isPending
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
                  <p className="text-xs font-medium text-slate-600 mt-3 flex items-center gap-1.5 bg-white p-2.5 rounded-lg border border-slate-200/60 shadow-sm">
                    <FileText className="w-3.5 h-3.5 text-[#8a5a2e] shrink-0" />
                    <span className="leading-relaxed">{req.substitution_reason}</span>
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
                  <div className="mt-3 text-xs text-slate-500 flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-100">
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
      )}
    </div>
  );
}
