"use client";
import { useState, useRef } from "react";
import {
  Barcode,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  FlaskConical,
  Hash,
  Layers,
  Loader2,
  Lock,
  Package,
  AlertTriangle,
  Wrench,
  RefreshCw,
  ScanLine,
  Search,
  Send,
  Store,
  UserCheck,
  X,
} from "lucide-react";
import { CameraScannerModal, WorkerPickerDropdown } from "../shared";
import StoreNotCheckedInModal from "./StoreNotCheckedInModal";
import StoreSubstitutionsView from "./StoreSubstitutionsView";
import StorePieceMaterialsModal from "./StorePieceMaterialsModal";
import StoreManualIssueModal from "./StoreManualIssueModal";
import { getStoreParts } from "./storeParts";

// Leather hide outline
function HideIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M7 3c1.2 1 2.6 1.5 5 1.5S15.8 4 17 3l2 2c-.6 1.6-.4 3.1 1 4.5-1 1.6-1 3.4 0 5-1.4 1.4-1.6 2.9-1 4.5l-2 2c-1.2-1-2.6-1.5-5-1.5S8.2 20 7 21l-2-2c.6-1.6.4-3.1-1-4.5 1-1.6 1-3.4 0-5 1.4-1.4 1.6-2.9 1-4.5z" />
    </svg>
  );
}

// Four-hole button
function ButtonIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <circle cx="9.5" cy="9.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="9.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="9.5" cy="14.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="14.5" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

const STATE_BADGE = {
  waiting: "bg-slate-100 text-slate-600 border-slate-200",
  merged: "bg-stone-50 text-stone-700 border-stone-200",
  holding_leather: "bg-amber-50 text-amber-700 border-amber-200",
  holding_lining: "bg-amber-50 text-amber-700 border-amber-200",
  holding_both: "bg-teal-50 text-teal-700 border-teal-200",
  received: "bg-emerald-50 text-emerald-700 border-emerald-200",
  sended: "bg-[#faf6f0] text-[#8a5a2e] border-[#c8834a]/30",
};

const PART_STATUS = {
  in: { text: "IN STORE", box: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "text-emerald-700" },
  awaiting: { text: "AWAITING", box: "bg-amber-50 text-amber-600 border-amber-200", label: "text-amber-700" },
  na: { text: "NOT NEEDED", box: "bg-slate-50 text-slate-400 border-slate-200", label: "text-slate-400" },
};

const LAST_SCAN_CHIP = {
  in: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  awaiting: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  na: "bg-white/5 text-white/40 border-white/10",
};

function PartCell({ status }) {
  const s = PART_STATUS[status];
  return (
    <td className="px-4 py-4 align-middle">
      <span className={`text-xs font-bold ${s.label}`}>{s.text}</span>
    </td>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border bg-white px-3.5 py-2.5 flex flex-col items-center justify-center min-w-0" style={{ borderColor: "rgba(200,131,74,0.15)" }}>
      <div className="text-[11px] font-bold text-slate-500 truncate text-center">{label}</div>
      <div className="text-lg font-black text-[#2d1f0e] leading-tight text-center">{value}</div>
    </div>
  );
}

export default function StoreHubForm({
  barcodeWorker,
  setBarcodeWorker,
  barcodeWorkerInput,
  setBarcodeWorkerInput,
  barcodeWorkerChecking,
  handleVerifyBarcodeWorker,
  barcodeNotCheckedInModal,
  setBarcodeNotCheckedInModal,
  workerInputRef,
  cameraScanTarget,
  setCameraScanTarget,
  workers,
  mounted,
  storePieceInput,
  setStorePieceInput,
  storeCurrentScan,
  setStoreCurrentScan,
  storeLotInput,
  setStoreLotInput,
  userRole,
  canApproveSubstitutions,
  canScanAndSend,
  canRecordManualIssue,
  substitutionsModalOpen,
  setSubstitutionsModalOpen,
  inspectPieceCode,
  setInspectPieceCode,
  manualIssueModalOpen,
  setManualIssueModalOpen,
  setSuccessMsg,
  setErrorMsg,
  storeApiLoading,
  storePieces,
  filteredStorePieces,
  storeTotal,
  storeFilterType,
  setStoreFilterType,
  storePieceSearch,
  setStorePieceSearch,
  pieceLookupInput,
  setPieceLookupInput,
  handleFindPiece,
  selectedPieces,
  setSelectedPieces,
  togglePieceSelection,
  batchSending,
  handleBatchSendPieces,
  storeVisibleCount,
  setStoreVisibleCount,
  lastPieceElementRef,
  fetchLivePieces,
  storeLoading,
  storeInputRef,
  handleStoreVerify,
  handleStoreScanInput,
  lastScan,
  mockAvailable,
  useMock,
  toggleMock,
}) {
  const [partMode, setPartMode] = useState("leather");
  const counts = { LEATHER: 0, LINING: 0, ACCESSORIES: 0, COMPLETE: 0, awaiting: 0, sent: 0 };
  storePieces.forEach((piece) => {
    const p = getStoreParts(piece);
    if (p.leather) counts.LEATHER += 1;
    if (p.lining) counts.LINING += 1;
    if (p.accessories) counts.ACCESSORIES += 1;
    if (p.sent) counts.sent += 1;
    else if (p.complete) counts.COMPLETE += 1;
    else counts.awaiting += 1;
  });
  const totalInStore = storeTotal || storePieces.length;

  const tabs = [
    { key: "All", label: "Store", Icon: Store, count: totalInStore },
    { key: "LEATHER", label: "Leather", Icon: HideIcon, count: counts.LEATHER },
    { key: "LINING", label: "Lining", Icon: Layers, count: counts.LINING },
    { key: "ACCESSORIES", label: "Accessories", Icon: ButtonIcon, count: counts.ACCESSORIES },
  ];
  const activeTab = ["LEATHER", "LINING", "ACCESSORIES", "COMPLETE", "SUBSTITUTIONS"].includes(storeFilterType) ? storeFilterType : "All";

  const visiblePieces = filteredStorePieces.slice(0, storeVisibleCount);
  const selectableIds = visiblePieces.filter((piece) => !getStoreParts(piece).sent).map((piece) => piece.id || piece.piece_id);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedPieces.has(id));
  const toggleSelectAll = () => {
    setSelectedPieces(allSelected ? new Set() : new Set(selectableIds));
  };

  const storeLotInputRef = useRef(null);

  const locked = !barcodeWorker;
  const lastParts = lastScan ? getStoreParts(lastScan) : null;

  return (
    <>
      {cameraScanTarget === "store" && (
        <CameraScannerModal
          title="Scan Piece Barcode"
          onClose={() => setCameraScanTarget(null)}
          onScan={(scannedCode) => {
            const cleanCode = String(scannedCode || "").replace(/[\r\n]+/g, "").trim();
            if (!cleanCode) return;
            setStoreCurrentScan(cleanCode);
            setCameraScanTarget(null);
            if (partMode === "accessory" && !storeLotInput.trim()) {
              setSuccessMsg?.(`✅ Piece '${cleanCode}' scanned! Now scan Accessory Barcode...`);
              setTimeout(() => storeLotInputRef.current?.focus(), 200);
            } else {
              handleStoreScanInput(cleanCode, storeLotInput.trim(), partMode);
            }
          }}
        />
      )}

      {cameraScanTarget === "store_lot" && (
        <CameraScannerModal
          title="Scan Accessory Barcode"
          onClose={() => setCameraScanTarget(null)}
          onScan={(scannedCode) => {
            const cleanCode = String(scannedCode || "").replace(/[\r\n]+/g, "").trim();
            if (!cleanCode) return;
            setStoreLotInput(cleanCode);
            setCameraScanTarget(null);
            const pVal = storeCurrentScan.trim() || storePieceInput.trim();
            if (pVal) {
              handleStoreScanInput(pVal, cleanCode, partMode);
            } else {
              setSuccessMsg?.(`✅ Accessory '${cleanCode}' scanned! Now scan Piece Barcode...`);
              setTimeout(() => storeInputRef.current?.focus(), 200);
            }
          }}
        />
      )}

      <StoreNotCheckedInModal
        mounted={mounted}
        barcodeNotCheckedInModal={barcodeNotCheckedInModal}
        setBarcodeNotCheckedInModal={setBarcodeNotCheckedInModal}
        workerInputRef={workerInputRef}
      />

      <StorePieceMaterialsModal
        isOpen={!!inspectPieceCode}
        pieceCode={inspectPieceCode}
        onClose={() => setInspectPieceCode(null)}
      />

      <StoreManualIssueModal
        isOpen={manualIssueModalOpen}
        onClose={() => setManualIssueModalOpen(false)}
        barcodeWorker={barcodeWorker}
        setSuccessMsg={setSuccessMsg}
        setErrorMsg={setErrorMsg}
      />

      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-400">
        {/* Worker Verification (Matching Barcode Gun Scanner) */}
        <div
          className="p-6 rounded-3xl shadow-lg relative overflow-hidden space-y-5 text-white"
          style={{ background: "linear-gradient(135deg, #1c1207, #2d1f0e)", border: "1px solid rgba(200,131,74,0.3)" }}
        >
          <div className="absolute -right-16 -top-16 w-48 h-48 bg-[#c8834a]/15 rounded-full blur-3xl pointer-events-none" />
          {barcodeWorker ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
              <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-white text-sm truncate">{barcodeWorker.name}</h3>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Verified
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    if (!canRecordManualIssue) {
                      setErrorMsg("🔒 Off-spec issue recording is allowed for Store Manager, Direct Manager, or Managing Director only.");
                      return;
                    }
                    setManualIssueModalOpen(true);
                  }}
                  className={`text-xs font-black px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${
                    canRecordManualIssue
                      ? "text-[#f5d4a4] hover:text-white bg-white/10 hover:bg-white/20 border-white/15 cursor-pointer"
                      : "text-slate-400 bg-white/5 border-white/10 cursor-not-allowed opacity-60"
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5 text-[#f5d4a4]" />
                  Raise issue
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBarcodeWorker(null);
                    setBarcodeWorkerInput("");
                  }}
                  className="text-xs font-bold text-[#e2d5c3]/70 hover:text-white px-2.5 py-1.5 transition-colors cursor-pointer"
                >
                  Change Worker
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full space-y-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#c8834a]/20 border border-[#c8834a]/40 flex items-center justify-center text-[#f5d4a4] font-black text-sm shadow-inner shrink-0">
                  1
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    Worker Barcode Verification
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#c8834a]/30 text-[#f5d4a4]">
                      Step 1
                    </span>
                  </h3>
                  <p className="text-xs text-[#e2d5c3]/80">
                    Scan Worker ID Badge / Card (e.g. EMP-000123) to verify Check-In status
                  </p>
                </div>
              </div>
              
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleVerifyBarcodeWorker();
                }}
                className="flex flex-col sm:flex-row gap-3 pt-2"
              >
                <div className="relative flex-1">
                  {!barcodeWorkerInput && (
                    <Barcode className="w-5 h-5 text-[#f5d4a4] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-opacity duration-200" />
                  )}
                  <input
                    ref={workerInputRef}
                    type="text"
                    placeholder="Scan or type Worker ID (e.g. EMP-000123)..."
                    value={barcodeWorkerInput}
                    onChange={(e) => setBarcodeWorkerInput(e.target.value)}
                    autoFocus
                    style={{
                      paddingLeft: barcodeWorkerInput ? "1rem" : "3.25rem",
                      paddingRight: "3rem",
                    }}
                    className="w-full h-14 bg-white/10 text-white placeholder-[#e2d5c3]/40 font-mono font-bold text-base border-2 border-[#c8834a]/40 rounded-2xl focus:outline-none focus:border-[#f5d4a4] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setCameraScanTarget("worker")}
                    className="sm:hidden absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-[#c8834a]/30 text-[#f5d4a4] border border-[#c8834a]/50 hover:bg-[#c8834a]/50 active:scale-95 transition-all cursor-pointer z-10"
                    title="Scan with camera"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={barcodeWorkerChecking || !barcodeWorkerInput.trim()}
                  className="h-14 px-6 rounded-2xl font-black text-sm text-[#1c1207] bg-gradient-to-r from-[#e8a06a] to-[#c8834a] hover:brightness-110 active:scale-95 transition-all shadow-lg cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {barcodeWorkerChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Verify Worker ID
                </button>
              </form>
              
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 text-xs text-[#e2d5c3]/70">
                <span className="shrink-0">Or select active worker:</span>
                <WorkerPickerDropdown workers={workers} onSelect={handleVerifyBarcodeWorker} />
              </div>
            </div>
          )}
        </div>

        {locked && (
          <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold">
            <Lock className="w-4 h-4 text-amber-700 shrink-0" />
            Verify a worker to unlock scanning
          </div>
        )}

        <div
          inert={locked}
          aria-disabled={locked}
          className={`space-y-4 transition-all duration-300 ${locked ? "opacity-45 grayscale-[35%] select-none" : ""}`}
        >
          {/* Compact Leather Brown Store Scanner */}
          <div
            className="rounded-2xl p-4 sm:p-5 shadow-lg space-y-4 text-white relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, #2d1f0e 0%, #1c1207 100%)", border: "1px solid rgba(200,131,74,0.25)" }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-white">Store Scanner</h3>
              </div>

              {/* Compact Last Scan Result Pill */}
              {lastScan && (
                <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/15">
                  <ScanLine className="w-4 h-4 text-[#f5d4a4]" />
                  <div className="text-xs">
                    <span className="font-mono font-black text-white">{lastScan.piece_code || lastScan.code}</span>
                    <span className="ml-2 font-bold text-[#f5d4a4]">({lastScan.holding || "SCANNED"})</span>
                  </div>
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const pieceScan = (storeCurrentScan || storePieceInput || "").trim();
                const lotScan = storeLotInput.trim();
                if (!pieceScan) {
                  setErrorMsg?.("Please scan or enter Piece Barcode.");
                  storeInputRef.current?.focus();
                  return;
                }
                if (partMode === "accessory") {
                  if (!lotScan) {
                    setSuccessMsg?.(`✅ Piece '${pieceScan}' ready! Now scan Accessory Barcode...`);
                    storeLotInputRef.current?.focus();
                    return;
                  }
                  handleStoreScanInput(pieceScan, lotScan, partMode);
                } else {
                  handleStoreScanInput(pieceScan, "", partMode);
                }
              }}
              className="flex flex-col gap-4"
            >
              {/* Full Width Tabs */}
              <div className="flex w-full bg-[#faf6f0] p-1 rounded-xl border" style={{ borderColor: "rgba(200,131,74,0.15)" }}>
                <button
                  type="button"
                  onClick={() => {
                    setPartMode("leather");
                    setTimeout(() => storeInputRef.current?.focus(), 100);
                  }}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${partMode === "leather" ? "bg-white text-[#c8834a] shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                >
                  Leather
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPartMode("lining");
                    setTimeout(() => storeInputRef.current?.focus(), 100);
                  }}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${partMode === "lining" ? "bg-white text-[#c8834a] shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                >
                  Lining
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPartMode("accessory");
                    setTimeout(() => {
                      if (storeCurrentScan.trim() && !storeLotInput.trim()) {
                        storeLotInputRef.current?.focus();
                      } else {
                        storeInputRef.current?.focus();
                      }
                    }, 100);
                  }}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${partMode === "accessory" ? "bg-white text-[#c8834a] shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                >
                  Accessory
                </button>
              </div>

              {partMode === "accessory" && (
                <div className="flex items-center gap-2 text-xs font-bold px-1 text-[#f5d4a4]">
                  <span className={`px-2 py-0.5 rounded-md border text-[11px] ${!storeCurrentScan.trim() ? "bg-[#c8834a] text-white border-[#f5d4a4]/40 animate-pulse" : "bg-emerald-800/60 text-emerald-200 border-emerald-500/40"}`}>
                    Step 1: Piece {!storeCurrentScan.trim() ? "⏳" : "✓"}
                  </span>
                  <span className="text-white/40">➔</span>
                  <span className={`px-2 py-0.5 rounded-md border text-[11px] ${storeCurrentScan.trim() && !storeLotInput.trim() ? "bg-[#c8834a] text-white border-[#f5d4a4]/40 animate-pulse" : !storeLotInput.trim() ? "bg-white/5 text-white/50 border-white/10" : "bg-emerald-800/60 text-emerald-200 border-emerald-500/40"}`}>
                    Step 2: Accessory Lot {storeLotInput.trim() ? "✓" : ""}
                  </span>
                </div>
              )}

              <div className="flex flex-col lg:flex-row items-center gap-3 w-full">
                <div className="relative flex-1 w-full">
                  <Barcode className="w-5 h-5 text-[#f5d4a4] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    name="pieceScan"
                    ref={storeInputRef}
                    type="text"
                    placeholder="Scan piece barcode (PC-100231)…"
                    value={storeCurrentScan}
                    onChange={(e) => setStoreCurrentScan(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const pVal = (e.target.value || storeCurrentScan || "").trim();
                        if (!pVal) return;
                        if (partMode === "accessory") {
                          if (!storeLotInput.trim()) {
                            setStoreCurrentScan(pVal);
                            setSuccessMsg?.(`✅ Piece '${pVal}' scanned! Now scan Accessory Barcode...`);
                            setTimeout(() => storeLotInputRef.current?.focus(), 60);
                          } else {
                            handleStoreScanInput(pVal, storeLotInput.trim(), partMode);
                          }
                        } else {
                          handleStoreScanInput(pVal, "", partMode);
                        }
                      }
                    }}
                    disabled={locked || storeApiLoading}
                    className={`w-full h-11 pl-11 pr-11 bg-white/[0.06] text-white placeholder-[#e2d5c3]/40 font-mono font-bold text-sm border rounded-xl focus:outline-none transition-all disabled:opacity-60 ${partMode === "accessory" && !storeCurrentScan.trim() ? "border-[#f5d4a4] ring-1 ring-[#f5d4a4]/40" : "border-[#e2d5c3]/30 focus:border-[#f5d4a4] focus:bg-white/10"}`}
                  />
                  <button
                    type="button"
                    onClick={() => setCameraScanTarget("store")}
                    className="sm:hidden absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-[#c8834a]/30 text-[#f5d4a4]"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>

                {partMode === "accessory" && (
                  <div className="relative flex-1 w-full animate-in fade-in zoom-in-95 duration-200">
                    <Package className="w-5 h-5 text-[#f5d4a4] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      name="lotScan"
                      ref={storeLotInputRef}
                      type="text"
                      placeholder="Scan accessory lot barcode (LOT-ACC-…)…"
                      value={storeLotInput}
                      onChange={(e) => setStoreLotInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const lVal = (e.target.value || storeLotInput || "").trim();
                          const pVal = (storeCurrentScan || storePieceInput || "").trim();
                          if (!lVal) return;
                          if (!pVal) {
                            setErrorMsg?.("Please scan Piece Barcode first.");
                            storeInputRef.current?.focus();
                            return;
                          }
                          handleStoreScanInput(pVal, lVal, partMode);
                        }
                      }}
                      disabled={locked || storeApiLoading}
                      className={`w-full h-11 pl-11 pr-11 bg-white/[0.06] text-white placeholder-[#e2d5c3]/40 font-mono font-bold text-sm border rounded-xl focus:outline-none transition-all disabled:opacity-60 ${storeCurrentScan.trim() && !storeLotInput.trim() ? "border-amber-400 ring-2 ring-amber-400/40 bg-white/10" : "border-[#e2d5c3]/30 focus:border-[#f5d4a4] focus:bg-white/10"}`}
                    />
                    <button
                      type="button"
                      onClick={() => setCameraScanTarget("store_lot")}
                      className="sm:hidden absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-[#c8834a]/30 text-[#f5d4a4]"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={locked || storeApiLoading || !storeCurrentScan.trim() || (partMode === "accessory" && !storeLotInput.trim()) || !canScanAndSend}
                  title={!canScanAndSend ? "🔒 Store scanning is restricted for your role" : ""}
                  className="w-full lg:w-auto h-11 px-7 rounded-xl font-black text-xs text-[#2d1f0e] bg-gradient-to-br from-[#f5d4a4] to-[#d99a62] hover:brightness-105 transition-all shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shrink-0"
                >
                  {storeApiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
                  Log Scan
                </button>
              </div>
            </form>

            {/* Mobile / Inline last scan result */}
            {lastScan && (
              <div className="md:hidden flex items-center justify-between p-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-xs">
                <div className="flex items-center gap-2">
                  <ScanLine className="w-4 h-4 text-[#f5d4a4]" />
                  <span className="font-mono font-black text-white">{lastScan.piece_code || lastScan.code}</span>
                </div>
                <span className="font-extrabold text-[#f5d4a4]">{lastScan.holding || "SCANNED"}</span>
              </div>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="inline-flex items-center p-1.5 bg-[#faf6f0] border rounded-full overflow-x-auto gap-1" style={{ borderColor: "rgba(200,131,74,0.15)" }}>
            {tabs.map(({ key, label, Icon, count }) => {
              const active = activeTab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStoreFilterType(key)}
                  className={`h-10 px-5 rounded-full flex items-center justify-center gap-2.5 whitespace-nowrap transition-all cursor-pointer ${
                    active
                      ? "bg-white shadow-sm text-[#c8834a] ring-1 ring-slate-200/50"
                      : "text-slate-500 hover:text-[#5a3518] hover:bg-white/50"
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? "text-[#c8834a]" : "text-slate-400"}`} />
                  <span className={`text-sm ${active ? "font-extrabold" : "font-bold"}`}>{label}</span>
                  {count > 0 && (
                    <span
                      className={`ml-1 h-5 px-1.5 rounded-full flex items-center justify-center text-[10px] font-black ${
                        active ? "bg-[#c8834a]/10 text-[#c8834a]" : "bg-slate-200/50 text-slate-500"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
            
            <div className="w-px h-6 bg-[#e2d5c3]/50 mx-1 shrink-0" />
            
            <button
              type="button"
              onClick={() => setStoreFilterType("SUBSTITUTIONS")}
              className={`h-10 px-5 rounded-full flex items-center justify-center gap-2.5 whitespace-nowrap transition-all cursor-pointer ${
                activeTab === "SUBSTITUTIONS"
                  ? "bg-white shadow-sm text-amber-600 ring-1 ring-slate-200/50"
                  : "text-slate-500 hover:text-amber-700 hover:bg-white/50"
              }`}
            >
              <AlertTriangle className={`w-4 h-4 shrink-0 ${activeTab === "SUBSTITUTIONS" ? "text-amber-500" : "text-slate-400"}`} strokeWidth={3} />
              <span className={`text-sm ${activeTab === "SUBSTITUTIONS" ? "font-extrabold" : "font-bold"}`}>Substitutions Queue</span>
            </button>

            {/* <button
              type="button"
              onClick={() => setStoreFilterType("COMPLETE")}
              className={`h-10 px-5 rounded-full flex items-center justify-center gap-2.5 whitespace-nowrap transition-all cursor-pointer ${
                activeTab === "COMPLETE"
                  ? "bg-white shadow-sm text-emerald-600 ring-1 ring-slate-200/50"
                  : "text-slate-500 hover:text-emerald-700 hover:bg-white/50"
              }`}
            >
              <Check className={`w-4 h-4 shrink-0 ${activeTab === "COMPLETE" ? "text-emerald-500" : "text-slate-400"}`} strokeWidth={3} />
              <span className={`text-sm ${activeTab === "COMPLETE" ? "font-extrabold" : "font-bold"}`}>Complete Sets</span>
              {counts.COMPLETE > 0 && (
                <span
                  className={`ml-1 h-5 px-1.5 rounded-full flex items-center justify-center text-[10px] font-black ${
                    activeTab === "COMPLETE" ? "bg-emerald-50 text-emerald-600" : "bg-slate-200/50 text-slate-500"
                  }`}
                >
                  {counts.COMPLETE}
                </span>
              )}
            </button> */}
          </div>

          {/* Content Area */}
          {activeTab === "SUBSTITUTIONS" ? (
            <StoreSubstitutionsView
              canApproveSubstitutions={canApproveSubstitutions}
              setSuccessMsg={setSuccessMsg}
              setErrorMsg={setErrorMsg}
            />
          ) : (
          <div className="bg-white rounded-3xl border shadow-sm p-4 sm:p-6 space-y-5" style={{ borderColor: "rgba(200,131,74,0.15)" }}>
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-14 h-14 rounded-2xl bg-[#faf6f0] border flex items-center justify-center text-[#5a3518] shrink-0" style={{ borderColor: "rgba(200,131,74,0.2)" }}>
                  <Store className="w-7 h-7" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center flex-wrap gap-2">
                    <h3 className="text-lg sm:text-xl font-extrabold text-[#2d1f0e]">Store Inventory</h3>
                  </div>
                  {storePieceSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setStorePieceSearch("");
                        setPieceLookupInput("");
                      }}
                      className="mt-1 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full bg-[#c8834a]/15 text-[#8a5a2a] hover:bg-[#c8834a]/25 cursor-pointer"
                    >
                      Filtered: {storePieceSearch} <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 xl:w-[560px]">
                <StatCard label="Total" value={totalInStore} />
                <StatCard label="Awaiting" value={counts.awaiting} />
                <StatCard label="Complete" value={counts.COMPLETE} />
                <StatCard label="Sent" value={counts.sent} />
              </div>
            </div>

            {/* Search & Actions */}
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="relative flex-1 md:max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#c8834a]" />
                <input
                  type="text"
                  value={pieceLookupInput}
                  onChange={(e) => setPieceLookupInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleFindPiece();
                    }
                  }}
                  placeholder="Search piece code…"
                  className="w-full h-11 pl-10 pr-20 bg-[#faf6f0] border rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-[#c8834a] focus:bg-white transition-all"
                  style={{ borderColor: "rgba(200,131,74,0.25)" }}
                />
                <button
                  type="button"
                  onClick={handleFindPiece}
                  disabled={!pieceLookupInput.trim()}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 px-3 rounded-lg bg-[#c8834a] text-white text-xs font-black disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  Find
                </button>
              </div>

              <button
                type="button"
                onClick={fetchLivePieces}
                disabled={storeLoading}
                className="h-11 px-4 rounded-xl border bg-white text-[#5a3518] font-bold text-xs flex items-center justify-center gap-2 hover:bg-[#faf6f0] transition-all cursor-pointer disabled:opacity-50"
                style={{ borderColor: "rgba(200,131,74,0.25)" }}
              >
                <RefreshCw className={`w-4 h-4 ${storeLoading ? "animate-spin" : ""}`} />
                Refresh
              </button>

              {selectedPieces.size > 0 && (
                <button
                  type="button"
                  onClick={() => handleBatchSendPieces()}
                  disabled={batchSending || !canScanAndSend}
                  title={!canScanAndSend ? "🔒 Releasing garments to stitching is restricted for your role" : ""}
                  className="md:ml-auto h-11 px-5 rounded-xl font-black text-xs text-white flex items-center justify-center gap-2 shadow-md hover:brightness-110 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(135deg, #8a5a2e, #5a3518)" }}
                >
                  {batchSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Send {selectedPieces.size} to Line Stitching
                </button>
              )}
            </div>
            
            {/* Table */}
            <div className="rounded-2xl border overflow-x-auto bg-white" style={{ borderColor: "rgba(200,131,74,0.15)" }}>
              <table className="w-full min-w-[920px] text-left">
                <thead className="bg-white border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="w-12 px-4 py-3.5">
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        disabled={selectableIds.length === 0}
                        aria-label="Select all"
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all disabled:opacity-40 ${
                          allSelected ? "bg-[#8a5a2e] border-[#8a5a2e] text-white" : "border-slate-300 bg-white hover:border-[#c8834a]"
                        }`}
                      >
                        {allSelected && <Check className="w-3 h-3" />}
                      </button>
                    </th>
                    <th className="px-4 py-3.5">Barcode / SKU</th>
                    <th className="px-4 py-3.5">Leather</th>
                    <th className="px-4 py-3.5">Lining</th>
                    <th className="px-4 py-3.5">Accessories</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#c8834a]/10">
                  {visiblePieces.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-sm font-bold text-slate-400">
                        {storeLoading ? (
                          <span className="inline-flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> Loading pieces…
                          </span>
                        ) : (
                          "No pieces found."
                        )}
                      </td>
                    </tr>
                  )}
                  {visiblePieces.map((piece, idx) => {
                    const parts = getStoreParts(piece);
                    const pieceUUID = piece.id || piece.piece_id;
                    const pCode = piece.piece_code || piece.code || piece.barcode || pieceUUID;
                    const isChecked = selectedPieces.has(pieceUUID || pCode);
                    const stateLabel = parts.state === "sended" ? "SENT" : piece.holding || (parts.state ? parts.state.replace(/_/g, " ").toUpperCase() : "UNKNOWN");
                    return (
                      <tr key={pieceUUID || pCode} className={`transition-colors ${isChecked ? "bg-[#c8834a]/[0.06]" : "hover:bg-[#faf6f0]/70"}`}>
                        <td className="px-4 py-4 align-middle">
                          <button
                            type="button"
                            onClick={() => togglePieceSelection(pieceUUID || pCode)}
                            disabled={parts.sent}
                            aria-label={`Select ${pCode}`}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                              isChecked ? "bg-[#8a5a2e] border-[#8a5a2e] text-white" : "border-slate-300 bg-white hover:border-[#c8834a]"
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3" />}
                          </button>
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="min-w-0">
                              <div className="font-mono font-black text-sm text-[#2d1f0e] truncate">{pCode}</div>
                            </div>
                          </div>
                        </td>
                        <PartCell status={parts.leather ? "in" : "awaiting"} />
                        <PartCell status={!parts.liningNeeded ? "na" : parts.lining ? "in" : "awaiting"} />
                        <PartCell status={parts.accessories ? "in" : "awaiting"} />
                        <td className="px-4 py-4 align-middle max-w-[240px]">
                          <span className={`inline-block text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md border ${STATE_BADGE[parts.state] || STATE_BADGE.waiting}`}>
                            {stateLabel}
                          </span>
                          {piece.next_action && !parts.sent && (
                            <p className="text-[11px] font-medium text-slate-500 mt-1 line-clamp-2">{piece.next_action}</p>
                          )}
                        </td>
                        <td className="px-4 py-4 align-middle text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setInspectPieceCode(pCode);
                              }}
                              title="Inspect merged materials spec & issue ledger"
                              className="h-10 px-3 rounded-xl border bg-white text-slate-700 hover:bg-slate-50 font-extrabold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
                              style={{ borderColor: "rgba(200,131,74,0.3)" }}
                            >
                              <Eye className="w-4 h-4 text-[#8a5a2e]" />
                              Inspect
                            </button>
                            <button
                              type="button"
                              onClick={() => handleBatchSendPieces([pieceUUID])}
                              disabled={batchSending || parts.sent || !canScanAndSend}
                              title={!canScanAndSend ? "🔒 Releasing garments to stitching is restricted for your role" : ""}
                              className="h-10 px-4 rounded-xl border bg-[#faf6f0] text-[#5a3518] font-bold text-xs inline-flex items-center gap-2 hover:bg-[#f4ece3] hover:border-[#c8834a]/50 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              style={{ borderColor: "rgba(200,131,74,0.3)" }}
                            >
                              {parts.sent ? <CheckCircle2 className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                              {parts.sent ? "Sent" : "Send"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredStorePieces.length > storeVisibleCount && (
              <div ref={lastPieceElementRef} className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setStoreVisibleCount((v) => v + 50)}
                  className="px-6 py-2.5 bg-[#f4ece3] hover:bg-[#e8decb] text-[#8a5a2e] font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Load More ({filteredStorePieces.length - storeVisibleCount} remaining)
                </button>
              </div>
            )}
          </div>
          )}
        </div>
      </div>
    </>
  );
}
