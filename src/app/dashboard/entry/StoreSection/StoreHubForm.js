"use client";
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
import StoreSubstitutionsModal from "./StoreSubstitutionsModal";
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
  merged: "bg-blue-50 text-blue-700 border-blue-200",
  holding_leather: "bg-amber-50 text-amber-700 border-amber-200",
  holding_lining: "bg-amber-50 text-amber-700 border-amber-200",
  holding_both: "bg-teal-50 text-teal-700 border-teal-200",
  received: "bg-emerald-50 text-emerald-700 border-emerald-200",
  sended: "bg-purple-50 text-purple-700 border-purple-200",
};

const PART_STATUS = {
  in: { text: "In store", box: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "text-emerald-700" },
  awaiting: { text: "Awaiting", box: "bg-amber-50 text-amber-600 border-amber-200", label: "text-amber-700" },
  na: { text: "Not needed", box: "bg-slate-50 text-slate-400 border-slate-200", label: "text-slate-400" },
};

const LAST_SCAN_CHIP = {
  in: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  awaiting: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  na: "bg-white/5 text-white/40 border-white/10",
};

function PartCell({ Icon, status }) {
  const s = PART_STATUS[status];
  return (
    <td className="px-4 py-4 align-middle">
      <div className="flex items-center gap-2.5">
        <span className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${s.box}`}>
          <Icon className="w-[18px] h-[18px]" />
        </span>
        <span className={`text-xs font-black ${s.label}`}>{s.text}</span>
      </div>
    </td>
  );
}

function StatCard({ Icon, label, value, iconClass }) {
  return (
    <div className="rounded-2xl border bg-white px-3.5 py-2.5 flex items-center gap-2.5 min-w-0" style={{ borderColor: "rgba(200,131,74,0.15)" }}>
      <Icon className={`w-5 h-5 shrink-0 ${iconClass}`} />
      <div className="min-w-0">
        <div className="text-[11px] font-bold text-slate-500 truncate">{label}</div>
        <div className="text-lg font-black text-[#2d1f0e] leading-tight">{value}</div>
      </div>
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
  const activeTab = ["LEATHER", "LINING", "ACCESSORIES", "COMPLETE"].includes(storeFilterType) ? storeFilterType : "All";

  const visiblePieces = filteredStorePieces.slice(0, storeVisibleCount);
  const selectableIds = visiblePieces.filter((piece) => !getStoreParts(piece).sent).map((piece) => piece.id || piece.piece_id);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedPieces.has(id));
  const toggleSelectAll = () => {
    setSelectedPieces(allSelected ? new Set() : new Set(selectableIds));
  };

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
            handleStoreScanInput(cleanCode);
          }}
        />
      )}

      <StoreNotCheckedInModal
        mounted={mounted}
        barcodeNotCheckedInModal={barcodeNotCheckedInModal}
        setBarcodeNotCheckedInModal={setBarcodeNotCheckedInModal}
        workerInputRef={workerInputRef}
      />

      <StoreSubstitutionsModal
        isOpen={substitutionsModalOpen}
        onClose={() => setSubstitutionsModalOpen(false)}
        canApproveSubstitutions={canApproveSubstitutions}
        setSuccessMsg={setSuccessMsg}
        setErrorMsg={setErrorMsg}
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
        {/* Sleek Compact Worker Verification Bar */}
        <div
          className="rounded-2xl shadow-md p-3.5 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-white"
          style={{ background: "linear-gradient(135deg, #3d2b1a 0%, #2d1f0e 100%)", border: "1px solid rgba(200,131,74,0.3)" }}
        >
          {barcodeWorker ? (
            <>
              <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-white text-sm truncate">{barcodeWorker.name}</h3>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Verified
                    </span>
                  </div>
                  <p className="text-xs text-[#e2d5c3]/70 font-mono truncate">
                    {barcodeWorker.employee_barcode || barcodeWorker.id} · {barcodeWorker.designation || "Store"}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setSubstitutionsModalOpen(true)}
                  className="text-xs font-black text-amber-200 hover:text-white px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
                  Substitutions Queue
                </button>
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
                  Off-Spec Issue
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
            </>
          ) : (
            <div className="w-full space-y-3">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-extrabold text-white">Worker Verification</h3>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleVerifyBarcodeWorker();
                }}
                className="flex flex-col sm:flex-row gap-2.5"
              >
                <div className="relative flex-1">
                  <Barcode className="w-5 h-5 text-[#f5d4a4] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    ref={workerInputRef}
                    type="text"
                    placeholder="Scan or type worker ID (e.g. EMP-000123)…"
                    value={barcodeWorkerInput}
                    onChange={(e) => setBarcodeWorkerInput(e.target.value)}
                    autoFocus
                    className="w-full h-11 pl-11 pr-11 sm:pr-3 bg-white/[0.06] text-white placeholder-[#e2d5c3]/40 font-mono font-bold text-sm border border-[#e2d5c3]/30 rounded-xl focus:outline-none focus:border-[#f5d4a4] focus:bg-white/10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setCameraScanTarget("worker")}
                    className="sm:hidden absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-[#c8834a]/30 text-[#f5d4a4]"
                    title="Scan with camera"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={barcodeWorkerChecking || !barcodeWorkerInput.trim()}
                  className="h-11 px-6 rounded-xl font-black text-xs text-[#2d1f0e] bg-gradient-to-br from-[#f5d4a4] to-[#d99a62] hover:brightness-105 transition-all shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  {barcodeWorkerChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Verify Worker
                </button>
              </form>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-[#e2d5c3]/70">
                <span className="shrink-0 font-bold">Or select worker:</span>
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
                <h3 className="text-base font-extrabold text-white">Store Scanner (Two-Scan Merge)</h3>
                <p className="text-xs font-medium text-[#e2d5c3]/70">Scan worker & garment piece barcode to merge into store</p>
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
                handleStoreScanInput(storeCurrentScan.trim());
              }}
              className="flex flex-col lg:flex-row items-center gap-3"
            >
              <div className="relative flex-1 w-full">
                <Barcode className="w-5 h-5 text-[#f5d4a4] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={storeInputRef}
                  type="text"
                  placeholder="Scan piece barcode (PC-100231)…"
                  value={storeCurrentScan}
                  onChange={(e) => setStoreCurrentScan(e.target.value)}
                  disabled={locked || storeApiLoading}
                  className="w-full h-11 pl-11 pr-11 bg-white/[0.06] text-white placeholder-[#e2d5c3]/40 font-mono font-bold text-sm border border-[#e2d5c3]/30 rounded-xl focus:outline-none focus:border-[#f5d4a4] focus:bg-white/10 transition-all disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setCameraScanTarget("store")}
                  className="sm:hidden absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-[#c8834a]/30 text-[#f5d4a4]"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              <div className="relative flex-1 w-full">
                <Package className="w-5 h-5 text-[#f5d4a4] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Optional packet barcode (LOT-ACC-…)…"
                  value={storeLotInput}
                  onChange={(e) => setStoreLotInput(e.target.value)}
                  disabled={locked || storeApiLoading}
                  className="w-full h-11 pl-11 pr-3 bg-white/[0.06] text-white placeholder-[#e2d5c3]/40 font-mono font-bold text-sm border border-[#e2d5c3]/30 rounded-xl focus:outline-none focus:border-[#f5d4a4] focus:bg-white/10 transition-all disabled:opacity-60"
                />
              </div>

              <button
                type="submit"
                disabled={locked || storeApiLoading || !storeCurrentScan.trim() || !canScanAndSend}
                title={!canScanAndSend ? "🔒 Store scanning is restricted for your role" : ""}
                className="w-full lg:w-auto h-11 px-7 rounded-xl font-black text-xs text-[#2d1f0e] bg-gradient-to-br from-[#f5d4a4] to-[#d99a62] hover:brightness-105 transition-all shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shrink-0"
              >
                {storeApiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
                Log Scan
              </button>
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
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-[1.25fr_1fr_1fr_1fr_1.35fr] gap-3">
            {tabs.map(({ key, label, Icon, count }) => {
              const active = activeTab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStoreFilterType(key)}
                  className={`h-16 px-4 rounded-2xl border flex items-center gap-3 text-left transition-all cursor-pointer ${
                    active
                      ? "text-white border-transparent shadow-lg"
                      : "bg-white text-[#3d2b1a] hover:border-[#c8834a]/50 hover:shadow-sm"
                  }`}
                  style={active ? { background: "linear-gradient(135deg, #3d2b1a, #1c1207)" } : { borderColor: "rgba(200,131,74,0.18)" }}
                >
                  <Icon className={`w-6 h-6 shrink-0 ${active ? "text-[#f5d4a4]" : "text-[#8a5a2e]"}`} />
                  <span className={`flex-1 truncate ${active ? "font-extrabold text-base" : "font-bold text-sm"}`}>{label}</span>
                  <span
                    className={`min-w-7 h-7 px-2 rounded-full flex items-center justify-center text-xs font-black ${
                      active ? "bg-[#c8834a]/35 text-[#f5d4a4]" : "bg-[#f4ece3] text-[#5a3518]"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setStoreFilterType("COMPLETE")}
              className={`col-span-2 sm:col-span-4 xl:col-span-1 h-16 px-4 rounded-2xl border flex items-center gap-3 text-left transition-all cursor-pointer bg-emerald-50/80 border-emerald-200 hover:border-emerald-400 ${
                activeTab === "COMPLETE" ? "ring-2 ring-emerald-500/60" : ""
              }`}
            >
              <span className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Check className="w-5 h-5" strokeWidth={3} />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-bold text-emerald-800 truncate">Complete Sets</span>
                <span className="block text-lg font-black text-emerald-900 leading-tight">{counts.COMPLETE}</span>
              </span>
            </button>
          </div>

          {/* Table */}
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
                <StatCard Icon={Hash} label="Total" value={totalInStore} iconClass="text-[#8a5a2e]" />
                <StatCard Icon={Clock} label="Awaiting" value={counts.awaiting} iconClass="text-amber-600" />
                <StatCard Icon={CheckCircle2} label="Complete" value={counts.COMPLETE} iconClass="text-emerald-600" />
                <StatCard Icon={Send} label="Sent" value={counts.sent} iconClass="text-purple-600" />
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
            <div className="rounded-2xl border overflow-x-auto" style={{ borderColor: "rgba(200,131,74,0.15)" }}>
              <table className="w-full min-w-[920px] text-left">
                <thead className="bg-[#faf6f0] text-[11px] font-black uppercase tracking-wider text-[#5a3518]/80">
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
                    <th className="w-12 px-2 py-3.5">#</th>
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
                      <td colSpan={8} className="px-4 py-12 text-center text-sm font-bold text-slate-400">
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
                        <td className="px-2 py-4 align-middle text-sm font-black text-[#3d2b1a]">{idx + 1}</td>
                        <td className="px-4 py-4 align-middle">
                          <div className="flex items-center gap-3 min-w-0">
                            <Barcode className="w-7 h-7 text-[#5a3518] shrink-0" />
                            <div className="min-w-0">
                              <div className="font-mono font-black text-sm text-[#2d1f0e] truncate">{pCode}</div>
                              <div className="text-xs font-medium text-slate-500 truncate">
                                {[piece.style_name, piece.order_number].filter(Boolean).join(" · ") || "—"}
                              </div>
                              {(piece.color || piece.size) && (
                                <div className="text-xs font-medium text-slate-400 truncate">
                                  {[piece.color, piece.size].filter(Boolean).join(" · ")}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <PartCell Icon={HideIcon} status={parts.leather ? "in" : "awaiting"} />
                        <PartCell Icon={Layers} status={!parts.liningNeeded ? "na" : parts.lining ? "in" : "awaiting"} />
                        <PartCell Icon={ButtonIcon} status={parts.accessories ? "in" : "awaiting"} />
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
        </div>
      </div>
    </>
  );
}
