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
        <div className="rounded-2xl border overflow-x-auto bg-white" style={{ borderColor: "rgba(200,131,74,0.15)" }}>
          <table className="w-full min-w-[920px] text-left">
            <thead className="bg-white border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3.5">Piece Code / Article</th>
                <th className="px-4 py-3.5">Garment → Packet</th>
                <th className="px-4 py-3.5">Reason</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right w-[350px]">Action / Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c8834a]/10">
              {requests.map((req) => {
                const reqStatus = (req.status || "").toUpperCase();
                const isPending = reqStatus === "PENDING";
                const isApproved = reqStatus === "APPROVED";
                const isRejected = reqStatus === "REJECTED";
                const isLoading = actionLoadingId === req.request_id;

                return (
                  <tr key={req.request_id} className={`transition-colors hover:bg-slate-50/50 ${isPending ? "bg-[#faf6f0]/30" : ""}`}>
                    <td className="px-4 py-4 align-top">
                      <div className="font-mono font-black text-slate-900 text-sm">{req.piece_code}</div>
                      <div className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wider">{req.article || "Accessory Packet"}</div>
                    </td>
                    
                    <td className="px-4 py-4 align-top">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-700 font-bold text-xs">{req.garment_size || "M"}</span>
                        <span className="text-slate-400 text-xs">→</span>
                        <span className="text-purple-700 font-bold text-xs">{req.lot_size || "L"}</span>
                      </div>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <p className="text-xs font-medium text-slate-600 max-w-[200px] leading-relaxed truncate" title={req.substitution_reason || "-"}>
                        {req.substitution_reason || "-"}
                      </p>
                    </td>

                    <td className="px-4 py-4 align-top">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                          isPending
                            ? "bg-amber-100 text-amber-800 border-amber-300"
                            : isApproved
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                              : "bg-rose-100 text-rose-800 border-rose-300"
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>

                    <td className="px-4 py-4 align-top text-right">
                      {isPending ? (
                        <div className="flex flex-col gap-2">
                          <input
                            type="text"
                            disabled={!canApproveSubstitutions}
                            placeholder={canApproveSubstitutions ? "Add decision note (optional)…" : "DM/MD approval needed"}
                            value={noteInputs[req.request_id] || ""}
                            onChange={(e) => setNoteInputs({ ...noteInputs, [req.request_id]: e.target.value })}
                            className="w-full h-9 px-3 rounded-xl border bg-white text-xs font-bold outline-none focus:border-[#c8834a] disabled:opacity-60 disabled:bg-slate-100"
                            style={{ borderColor: "rgba(200,131,74,0.25)" }}
                          />
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => handleReject(req.request_id)}
                              disabled={isLoading || !canApproveSubstitutions}
                              className="h-8 px-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 font-extrabold text-[10px] uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                            >
                              {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                              Reject
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApprove(req.request_id)}
                              disabled={isLoading || !canApproveSubstitutions}
                              className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                            >
                              {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                              Approve
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1 items-end text-xs text-slate-500">
                          <div>Decided by: <strong className="text-slate-800">{req.decided_by || "Manager"}</strong></div>
                          {req.decision_note && <div className="italic text-[11px]">"{req.decision_note}"</div>}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
