"use client";
import { useState } from "react";
import {
  X,
  Layers,
  CheckCircle2,
  Clock,
  Scissors,
  FileText,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useGetPieceMaterialsQuery } from "@/store/slices/apiSlice";

function StatusBadge({ inStore }) {
  return inStore ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
      <CheckCircle2 className="w-3 h-3" /> Issued
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200">
      <Clock className="w-3 h-3" /> Outstanding
    </span>
  );
}

export default function StorePieceMaterialsModal({ isOpen, pieceCode, onClose }) {
  const [activeTab, setActiveTab] = useState("applies");

  const { data: liveData, isLoading: isFetching } = useGetPieceMaterialsQuery(pieceCode, {
    skip: !isOpen || !pieceCode,
  });

  if (!isOpen || !pieceCode) return null;

  const materialsData = liveData || {};
  const applies = materialsData?.applies || {};
  const notApplicable = materialsData?.not_applicable || [];
  const issuedLedger = materialsData?.issued || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]" style={{ borderColor: "rgba(200,131,74,0.3)" }}>
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-[#2d1f0e] to-[#3d2b1a] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-2xl bg-[#c8834a]/20 border border-[#c8834a]/30 flex items-center justify-center text-[#f5d4a4]">
              <Layers className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg tracking-tight font-mono">{pieceCode}</h3>
                {(materialsData.garment_size || materialsData.colour) && (
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-[#c8834a]/30 text-[#f5d4a4] border border-[#c8834a]/40">
                    {[materialsData.garment_size, materialsData.colour].filter(Boolean).join(" · ")}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#e2d5c3]/70">{materialsData.summary_line || "Complete garment material spec & issue ledger"}</p>
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

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-slate-200 bg-[#faf6f0] px-6 gap-2 shrink-0">
          {[
            { id: "applies", label: "Applies Recipe", icon: CheckCircle2 },
            { id: "not_applicable", label: `Not Applicable (${notApplicable.length})`, icon: AlertCircle },
            { id: "ledger", label: `Issued Ledger (${issuedLedger.length})`, icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`h-12 px-4 font-extrabold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                  active ? "border-[#c8834a] text-[#3d2b1a]" : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? "text-[#c8834a]" : "text-slate-400"}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {isFetching && (
            <div className="py-16 flex items-center justify-center text-slate-500 gap-2 text-sm font-bold">
              <Loader2 className="w-5 h-5 animate-spin text-[#c8834a]" /> Loading piece materials merged view…
            </div>
          )}

          {!isFetching && activeTab === "applies" && (
            <div className="space-y-5">
              {/* Leather & Lining cut summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-amber-900 flex items-center gap-1.5">
                      <Scissors className="w-4 h-4 text-amber-700" /> Leather Consumed
                    </span>
                    <span className="text-sm font-black text-amber-900">{materialsData.consumed ?? "—"} dcm</span>
                  </div>
                  <p className="text-xs font-medium text-amber-800/80">
                    Article: {applies.leather?.article || "Leather"} ({applies.leather?.qty_per_piece || "—"} dcm required)
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-teal-900 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-teal-700" /> Lining Spec
                    </span>
                    <span className="text-sm font-black text-teal-900">
                      {materialsData.needs_lining ? "Required" : "Not Required"}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-teal-800/80">
                    Article: {applies.lining?.article || "Lining Spec"} ({applies.lining?.qty_per_piece || "—"} mtrs)
                  </p>
                </div>
              </div>

              {/* Accessories Checklist */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">Accessory Kit Checklist</h4>
                <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "rgba(200,131,74,0.18)" }}>
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#faf6f0] text-[11px] font-black uppercase text-[#5a3518]">
                      <tr>
                        <th className="px-4 py-3">Accessory Line</th>
                        <th className="px-4 py-3 text-center">Required Qty</th>
                        <th className="px-4 py-3 text-center">Issued Qty</th>
                        <th className="px-4 py-3 text-center">Outstanding</th>
                        <th className="px-4 py-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-bold text-slate-800">
                      {(applies.accessories || []).length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-slate-400 font-medium">
                            No accessory lines declared for this style.
                          </td>
                        </tr>
                      )}
                      {(applies.accessories || []).map((line, idx) => {
                        const isDone = (line.outstanding || 0) <= 0;
                        return (
                          <tr key={line.line_id || idx} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-mono font-black text-slate-900">{line.article || "Accessory"}</td>
                            <td className="px-4 py-3 text-center">{line.qty_per_piece} {line.uom}</td>
                            <td className="px-4 py-3 text-center text-emerald-700 font-extrabold">{line.issued_qty ?? 0}</td>
                            <td className="px-4 py-3 text-center text-amber-700 font-extrabold">{line.outstanding ?? 0}</td>
                            <td className="px-4 py-3 text-right">
                              <StatusBadge inStore={isDone} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {!isFetching && activeTab === "not_applicable" && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-slate-500">
                These lines belong to the style's master specification but are excluded from THIS garment due to size or colourway scoping.
              </p>
              <div className="space-y-2.5">
                {notApplicable.length === 0 && (
                  <div className="py-12 text-center text-slate-400 font-bold text-xs">
                    No excluded lines. All style lines apply to this garment.
                  </div>
                )}
                {notApplicable.map((line, idx) => (
                  <div key={line.line_id || idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-xs text-slate-900">{line.article}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-200 text-slate-700">
                          {line.reason || "Excluded"}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-600 mt-1">{line.reason_note || "Not applicable for this size or colourway."}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isFetching && activeTab === "ledger" && (
            <div className="space-y-3">
              <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "rgba(200,131,74,0.18)" }}>
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#faf6f0] text-[11px] font-black uppercase text-[#5a3518]">
                    <tr>
                      <th className="px-4 py-3">Issue ID</th>
                      <th className="px-4 py-3">Material Lot / Article</th>
                      <th className="px-4 py-3 text-center">Issued Qty</th>
                      <th className="px-4 py-3">Employee</th>
                      <th className="px-4 py-3 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold text-slate-800">
                    {issuedLedger.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-slate-400 font-medium">
                          No physical issues recorded yet.
                        </td>
                      </tr>
                    )}
                    {issuedLedger.map((row) => (
                      <tr key={row.issue_id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono font-black text-slate-600">{row.issue_id}</td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{row.article || "Material Lot"}</div>
                          <div className="text-[10px] font-mono text-slate-400">{row.material_lot_id || row.lot_barcode}</div>
                        </td>
                        <td className="px-4 py-3 text-center font-extrabold text-emerald-700">{row.qty} {row.uom || "pcs"}</td>
                        <td className="px-4 py-3 text-slate-700">{row.issued_by_employee_id || "Store Worker"}</td>
                        <td className="px-4 py-3 text-right text-slate-500 font-mono text-[11px]">
                          {row.issued_at ? new Date(row.issued_at).toLocaleString() : "Just now"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
