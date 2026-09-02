// STORE HUB — UI FILE
// Pure presentational component — the full JSX (worker verification gate,
// barcode scanner, drawer list, expanded drawer cards). No state or API
// calls of its own; every value and handler here is passed in as a prop
// from ./StoreHubSection.js.

"use client";
import {
  Lock,
  CheckCircle2,
  XCircle,
  Barcode,
  Check,
  Layers,
  PackageCheck,
  ChevronRight,
  ChevronDown,
  Camera,
  Send,
  RefreshCw,
  X,
  Loader2,
} from "lucide-react";
import { CameraScannerModal, WorkerPickerDropdown } from "../shared";
import { AccessoryKitCard, KitStatusMini } from "../AccessorySection/AccessoriesSpec";
import StoreNotCheckedInModal from "./StoreNotCheckedInModal";

// Extracted from StoreHubSection.js (the full return-JSX). Pure
// presentational — all state/handlers come from StoreHubSection.js as props.
export default function StoreHubForm({
  storeSendedSkus,
  storeReceiveStatus,
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
  token,
  workers,
  mounted,
  storeDrawerInput,
  setStoreDrawerInput,
  storePieceInput,
  setStorePieceInput,
  storeScanPart,
  setStoreScanPart,
  storeCurrentScan,
  setStoreCurrentScan,
  storeVerifyResult,
  setStoreVerifyResult,
  storeApiLoading,
  storeDrawers,
  storeFilterType,
  setStoreFilterType,
  storeDrawerSearch,
  setStoreDrawerSearch,
  expandedDrawer,
  setExpandedDrawer,
  storeLoading,
  pieceLookupInput,
  setPieceLookupInput,
  pieceLookupLoading,
  selectedDrawers,
  setSelectedDrawers,
  batchSending,
  storeVisibleCount,
  setStoreVisibleCount,
  lastDrawerElementRef,
  pinDrawer,
  fetchLiveDrawers,
  drawerPool,
  storeScanResolving,
  storeTotal,
  storeLeather,
  storeLining,
  storeBoth,
  storeFree,
  freeDrawersLoading,
  filteredStoreDrawers,
  storeExpectedMatch,
  storeInputRef,
  handleFindDrawerForPiece,
  handleStoreVerify,
  handleStoreScanInput,
  handleSendToLineStitching,
  toggleDrawerSelection,
  handleBatchSendDrawers,
  handleRefreshDrawers,
}) {
  return (
    <>
      {cameraScanTarget === "store" && (
        <CameraScannerModal
          title="Scan Store Drawer / Piece"
          onClose={() => setCameraScanTarget(null)}
          onScan={(scannedCode) => {
            const cleanCode = String(scannedCode || "")
              .replace(/[\r\n]+/g, "")
              .trim();
            if (!cleanCode) return;
            const val = cleanCode.toUpperCase();
            if (val.startsWith("DRW-") || val.startsWith("DRAWER")) {
              setStoreDrawerInput(val);
              setStoreDrawerSearch(val);
            } else {
              setStorePieceInput(cleanCode);
            }
            setStoreCurrentScan(cleanCode);
          }}
        />
      )}
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* FIX 1: WORKER BARCODE SCAN & ATTENDANCE GATE (STORE HUB INTEGRATION) */}
        <div
          className="p-6 rounded-3xl shadow-lg relative overflow-hidden space-y-5"
          style={{
            background: "linear-gradient(135deg, #1c1207, #2d1f0e)",
            border: "1px solid rgba(200,131,74,0.3)",
          }}
        >
          <div className="absolute -right-16 -top-16 w-48 h-48 bg-[#c8834a]/15 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#c8834a]/20 pb-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#c8834a]/20 border border-[#c8834a]/40 flex items-center justify-center text-[#f5d4a4] font-black text-sm shadow-inner">
                1
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  Store Worker Verification
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#c8834a]/30 text-[#f5d4a4]">
                    Mandatory First
                  </span>
                </h3>
                <p className="text-xs text-[#e2d5c3]/80">
                  Scan Worker ID Badge / Card (e.g. EMP-000123) to unlock Store
                  Hub scanning
                </p>
              </div>
            </div>

            {barcodeWorker && (
              <button
                type="button"
                onClick={() => {
                  setBarcodeWorker(null);
                  setBarcodeWorkerInput("");
                }}
                className="text-xs font-black text-amber-200/80 hover:text-white px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
              >
                Change Worker
              </button>
            )}
          </div>

          {!barcodeWorker ? (
            <div className="space-y-4 relative z-10">
              <div className="flex flex-col sm:flex-row gap-3">
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
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleVerifyBarcodeWorker();
                      }
                    }}
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
                    title="Scan Worker Barcode with Mobile Camera"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => handleVerifyBarcodeWorker()}
                  disabled={barcodeWorkerChecking || !barcodeWorkerInput.trim()}
                  className="h-14 px-6 rounded-2xl font-black text-sm text-[#1c1207] bg-gradient-to-r from-[#e8a06a] to-[#c8834a] hover:brightness-110 active:scale-95 transition-all shadow-lg cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {barcodeWorkerChecking ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Verify Worker ID
                </button>
              </div>

              {/* Quick Select Worker Dropdown Fallback — same as Barcode Scanner page */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 text-xs text-[#e2d5c3]/70">
                <span className="shrink-0">Or select active worker:</span>
                <WorkerPickerDropdown
                  workers={workers}
                  onSelect={handleVerifyBarcodeWorker}
                />
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-[#c8834a]/15 border border-[#c8834a]/40 flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 font-bold">
                  ✓
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-white text-sm">
                      {barcodeWorker.name}
                    </h4>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Verified Operator
                    </span>
                  </div>
                  <p className="text-xs text-[#f5d4a4] font-medium mt-0.5">
                    ID:{" "}
                    <strong className="font-mono">
                      {barcodeWorker.employee_barcode || barcodeWorker.id}
                    </strong>{" "}
                    · {barcodeWorker.designation || "Store Craftsman"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        <StoreNotCheckedInModal
          mounted={mounted}
          barcodeNotCheckedInModal={barcodeNotCheckedInModal}
          setBarcodeNotCheckedInModal={setBarcodeNotCheckedInModal}
          workerInputRef={workerInputRef}
        />


        {/* Header & Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col items-center justify-center">
            <div className="text-xs text-slate-500 font-bold mb-1">
              Total Drawers
            </div>
            <div className="text-2xl font-black text-slate-800">
              {storeTotal}
            </div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 shadow-sm flex flex-col items-center justify-center">
            <div className="text-xs text-emerald-600 font-bold mb-1">
              Drawers Free
            </div>
            <div className="text-2xl font-black text-emerald-700">
              {storeFree}
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm flex flex-col items-center justify-center">
            <div className="text-xs text-amber-700 font-bold mb-1">Leather</div>
            <div className="text-2xl font-black text-amber-800">
              {storeLeather}
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-sm flex flex-col items-center justify-center">
            <div className="text-xs text-blue-700 font-bold mb-1">Lining</div>
            <div className="text-2xl font-black text-blue-800">
              {storeLining}
            </div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 shadow-sm flex flex-col items-center justify-center">
            <div className="text-xs text-purple-700 font-bold mb-1">Both</div>
            <div className="text-2xl font-black text-purple-800">
              {storeBoth}
            </div>
          </div>
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 shadow-sm flex flex-col items-center justify-center">
            <div className="text-xs text-indigo-700 font-bold mb-1">
              Upcoming Bundles
            </div>
            <div className="text-2xl font-black text-indigo-800">
              {drawerPool?.pieces_waiting_for_drawer ?? "—"}
            </div>
          </div>
        </div>

        {/* Barcode Scanner & Filters */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                Store Verification Gateway
              </h3>
            </div>

            <div className="flex flex-col gap-4 mt-2">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 block">
                  Scanning For
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setStoreScanPart("LEATHER");
                      setStoreDrawerInput("");
                      setStorePieceInput("");
                      setStoreCurrentScan("");
                      setStoreVerifyResult(null);
                    }}
                    className={`h-12 rounded-xl font-black text-sm border-2 transition-all ${storeScanPart === "LEATHER" ? "bg-amber-100 border-amber-400 text-amber-800" : "bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300"}`}
                  >
                    Leather
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStoreScanPart("LINING");
                      setStoreDrawerInput("");
                      setStorePieceInput("");
                      setStoreCurrentScan("");
                      setStoreVerifyResult(null);
                    }}
                    className={`h-12 rounded-xl font-black text-sm border-2 transition-all ${storeScanPart === "LINING" ? "bg-blue-100 border-blue-400 text-blue-800" : "bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300"}`}
                  >
                    Lining
                  </button>
                </div>
              </div>
              {/* Bug #11/#17: Auto-detect Next Required Scan Guidance Card —
                    either Drawer or Piece can be scanned first now, so this
                    reflects whichever slot is still open and shows the
                    other side's expected code (from the already-loaded
                    drawers list) as a reference to verify against. */}
              <div
                className={`p-3 rounded-xl border-2 flex items-center gap-3 transition-all ${!storeDrawerInput && !storePieceInput
                    ? "bg-amber-50 border-amber-300"
                    : "bg-emerald-50 border-emerald-300"
                  }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-lg ${!storeDrawerInput && !storePieceInput
                      ? "bg-amber-100"
                      : "bg-emerald-100"
                    }`}
                >
                  {!storeDrawerInput && !storePieceInput ? "📦" : "🏷️"}
                </div>
                <div>
                  <div
                    className={`text-xs font-black uppercase tracking-wider ${!storeDrawerInput && !storePieceInput ? "text-amber-800" : "text-emerald-800"}`}
                  >
                    {!storeDrawerInput && !storePieceInput
                      ? "Step 1: Scan Drawer or Piece — either order"
                      : storeDrawerInput
                        ? "Step 2: Scan Piece Barcode"
                        : "Step 2: Scan Drawer Barcode"}
                  </div>
                  <div
                    className={`text-[10px] font-bold mt-0.5 ${!storeDrawerInput && !storePieceInput ? "text-amber-600" : "text-emerald-600"}`}
                  >
                    {!storeDrawerInput && !storePieceInput
                      ? "Point your barcode gun at a drawer label OR a piece barcode — whichever is handy"
                      : storeDrawerInput
                        ? `Drawer ${storeDrawerInput} ready — scan the piece barcode now`
                        : `Piece ${storePieceInput} ready — scan the drawer barcode now`}
                  </div>
                  {storeExpectedMatch && (
                    <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                        Expected{" "}
                        {storeExpectedMatch.forSide === "PIECE"
                          ? "Piece"
                          : "Drawer"}
                        :
                      </span>
                      <span className="font-mono font-black text-sm text-slate-800 bg-white border border-slate-300 px-2 py-0.5 rounded-md shadow-sm">
                        {storeExpectedMatch.value}
                      </span>
                    </div>
                  )}
                </div>
                {(storeDrawerInput || storePieceInput) && (
                  <button
                    type="button"
                    onClick={() => {
                      setStoreDrawerInput("");
                      setStorePieceInput("");
                      setStoreVerifyResult(null);
                      setStoreCurrentScan("");
                    }}
                    className="ml-auto text-slate-400 hover:text-red-500 transition-colors"
                    title="Reset Scan"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="relative">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 block">
                  Scanner Input
                </label>
                {/* This warning was nested inside the input's horizontal flex
                      row below, so on narrow screens it squeezed in side-by-side
                      with the input instead of stacking above it as intended
                      (its own mb-2 assumed vertical stacking). Moved it out to
                      its own block so it always sits above, full width. */}
                {!barcodeWorker && (
                  <div className="p-3 mb-2 bg-amber-100/90 border border-amber-300/80 rounded-xl text-amber-900 text-xs font-bold flex items-center justify-center gap-2 shadow-sm">
                    <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>
                      Scan &amp; Verify Worker ID in Step 1 Banner above to
                      Unlock Store Scanner
                    </span>
                  </div>
                )}
                {/* Wrapped in a <form> because mobile virtual keyboards
                      don't reliably fire a raw onKeyDown "Enter" event — the
                      Go/Search/Done action key needs a real form submit to be
                      caught consistently across mobile browsers. enterKeyHint
                      also hints the keyboard to show a "Go"-style action key. */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleStoreScanInput(storeCurrentScan.trim());
                  }}
                  className="relative flex items-center"
                >
                  {!storeCurrentScan && (
                    <Barcode className="w-5 h-5 text-[#c8834a] absolute left-4 pointer-events-none transition-opacity duration-200" />
                  )}
                  <input
                    ref={storeInputRef}
                    type="text"
                    inputMode="text"
                    enterKeyHint="go"
                    placeholder={
                      !barcodeWorker
                        ? "Scan Worker ID in Step 1 Banner above..."
                        : !storeDrawerInput && !storePieceInput
                          ? "Scan Drawer or Piece Barcode..."
                          : storeDrawerInput
                            ? "Scan Piece Barcode..."
                            : "Scan Drawer Barcode..."
                    }
                    value={storeCurrentScan}
                    onChange={(e) => setStoreCurrentScan(e.target.value)}
                    disabled={!barcodeWorker || storeScanResolving}
                    style={{
                      paddingLeft: storeCurrentScan ? "1rem" : "3.25rem",
                      paddingRight: "3rem",
                    }}
                    className="w-full h-16 bg-slate-50 font-mono font-bold text-lg text-[#2d1f0e] border-2 border-slate-200 focus:border-[#c8834a] focus:bg-white shadow-inner rounded-xl outline-none transition-all disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setCameraScanTarget("store")}
                    className="sm:hidden absolute right-3 text-[#c8834a] bg-amber-50 border border-[#c8834a]/30 hover:bg-amber-100 p-2 rounded-xl transition-all active:scale-95 cursor-pointer z-10"
                    title="Scan Drawer/Piece with Mobile Camera"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                </form>
              </div>

              {/* Status Badges with Independent Remove / Rescan buttons */}
              <div className="flex flex-col sm:flex-row items-stretch gap-3">
                {/* Drawer Slot Badge */}
                <div
                  className={`flex-1 p-3.5 rounded-2xl border-2 flex flex-col justify-between gap-1 transition-all ${storeDrawerInput
                      ? "bg-emerald-50/90 border-emerald-300 text-emerald-900 shadow-sm"
                      : "bg-slate-50 border-slate-200 text-slate-400"
                    }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      📦 Drawer Slot
                    </span>
                    {storeDrawerInput && (
                      <button
                        type="button"
                        onClick={() => {
                          setStoreDrawerInput("");
                          setStoreVerifyResult(null);
                          setTimeout(() => storeInputRef.current?.focus(), 100);
                        }}
                        className="px-2 py-0.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 text-[10px] font-black flex items-center gap-1 transition-colors cursor-pointer"
                        title="Remove Drawer and Rescan"
                      >
                        <X className="w-3 h-3" />
                        <span>Rescan</span>
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span
                      className={`font-mono text-sm font-black ${storeDrawerInput ? "text-emerald-950" : "text-slate-400"}`}
                    >
                      {storeDrawerInput || "Waiting for Drawer..."}
                    </span>
                    {storeDrawerInput && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    )}
                  </div>
                  {!storeDrawerInput &&
                    storeExpectedMatch?.forSide === "DRAWER" && (
                      <div className="pt-1 mt-1 border-t border-amber-200 text-xs font-bold text-amber-800 flex items-center gap-1">
                        <span>Expected:</span>
                        <span className="font-mono font-black">
                          {storeExpectedMatch.value}
                        </span>
                      </div>
                    )}
                </div>

                {/* Piece Slot Badge */}
                <div
                  className={`flex-1 p-3.5 rounded-2xl border-2 flex flex-col justify-between gap-1 transition-all ${storePieceInput
                      ? "bg-emerald-50/90 border-emerald-300 text-emerald-900 shadow-sm"
                      : "bg-slate-50 border-slate-200 text-slate-400"
                    }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      🏷️ Piece Slot
                    </span>
                    {storePieceInput && (
                      <button
                        type="button"
                        onClick={() => {
                          setStorePieceInput("");
                          setStoreVerifyResult(null);
                          setTimeout(() => storeInputRef.current?.focus(), 100);
                        }}
                        className="px-2 py-0.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 text-[10px] font-black flex items-center gap-1 transition-colors cursor-pointer"
                        title="Remove Piece and Rescan"
                      >
                        <X className="w-3 h-3" />
                        <span>Rescan</span>
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span
                      className={`font-mono text-sm font-black truncate max-w-[200px] ${storePieceInput ? "text-emerald-950" : "text-slate-400"}`}
                    >
                      {storePieceInput || "Waiting for Piece..."}
                    </span>
                    {storePieceInput && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    )}
                  </div>
                  {!storePieceInput &&
                    storeExpectedMatch?.forSide === "PIECE" && (
                      <div className="pt-1 mt-1 border-t border-amber-200 text-xs font-bold text-amber-800 flex items-center gap-1 truncate">
                        <span>Expected:</span>
                        <span className="font-mono font-black truncate">
                          {storeExpectedMatch.value}
                        </span>
                      </div>
                    )}
                </div>
              </div>
            </div>

            {/* Verify Button */}
            {storeDrawerInput && storePieceInput && (
              <button
                type="button"
                onClick={handleStoreVerify}
                disabled={storeApiLoading}
                className="w-full h-14 mt-5 rounded-xl font-black text-sm text-white shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                style={{ background: "#c8834a" }}
              >
                {storeApiLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
                Verify & Log Scan
              </button>
            )}

            {/* Server-Driven Status Panel & 3-Hold Logic */}
            {storeVerifyResult && (
              <div className="mt-6 bg-slate-50 border-2 border-[#c8834a]/30 rounded-2xl p-5 shadow-inner space-y-4 animate-fade-in">
                <div className="flex items-center justify-between border-b border-[#c8834a]/20 pb-3">
                  <div>
                    <h4 className="text-sm font-black text-slate-800">
                      Scan Verified
                    </h4>
                    <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                      Drawer: {storeVerifyResult.drawer_code} | Piece:{" "}
                      {storeVerifyResult.piece_code}
                    </p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-black px-3 py-1 rounded uppercase bg-emerald-100 text-emerald-800">
                      {storeVerifyResult.holding ||
                        storeVerifyResult.state?.replace("_", " ") ||
                        "MERGED"}
                    </span>
                  </div>
                </div>

                {/* Bug #18: Auto-classified hold state based on backend response */}
                {storeVerifyResult && (
                  <div className="py-2 space-y-2">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Auto-Classified Hold Status
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {/* Auto-detect leather hold from backend state */}
                      {storeVerifyResult.state
                        ?.toLowerCase()
                        .includes("leather") ||
                        storeVerifyResult.state?.toLowerCase().includes("both") ||
                        storeVerifyResult.holding
                          ?.toLowerCase()
                          .includes("leather") ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-black rounded-xl">
                          ✅ Leather Piece — Confirmed
                        </span>
                      ) : null}
                      {/* Auto-detect lining hold from backend state */}
                      {storeVerifyResult.state
                        ?.toLowerCase()
                        .includes("lining") ||
                        storeVerifyResult.state?.toLowerCase().includes("both") ||
                        storeVerifyResult.holding
                          ?.toLowerCase()
                          .includes("lining") ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-black rounded-xl">
                          ✅ Lining Piece — Confirmed
                        </span>
                      ) : null}
                      {/* Show generic merged badge if no specific type detected */}
                      {!storeVerifyResult.state
                        ?.toLowerCase()
                        .includes("leather") &&
                        !storeVerifyResult.state
                          ?.toLowerCase()
                          .includes("lining") &&
                        !storeVerifyResult.holding && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black rounded-xl">
                            ✅ Piece Verified — Ready to Receive
                          </span>
                        )}
                    </div>
                  </div>
                )}

                {/* Backend now returns a `kit` block on every scan
                      (leather or lining), not just accessory scans — the
                      checklist rides every scan per the spec. */}
                <KitStatusMini kit={storeVerifyResult?.kit} />

                {/* Team request: the Leather tab is a receiving step only —
                      no Send action there regardless of can_send (even a
                      needs_lining:false piece that's already sendable right
                      after its leather scan). Sending happens either from
                      the Lining tab's verify screen, or later from the
                      drawer's own card in the list below (which has its own
                      can_send-gated Send button). */}
                {storeScanPart === "LINING" ? (
                  // Bug #21: single direct action — no separate "Receive"
                  // step. Clicking this fires RECEIVED (if the drawer
                  // isn't already auto-received) then SENDED right after.
                  // Confirmed live: `can_send` sits top-level on the
                  // store-scan response (storeVerifyResult.can_send) —
                  // false the instant a needs_lining piece is only
                  // HOLDING LEATHER (`awaiting: ["LINING"]`). This button
                  // never checked it, so scanning leather alone made
                  // "Send to Line Stitching" look ready before lining had
                  // even been scanned.
                  <div className="pt-4 border-t border-slate-200">
                    {(() => {
                      // The kit block only says PENDING/PARTIAL when this
                      // style actually needs accessories — `can_send` from
                      // the backend doesn't factor that in yet, so a piece
                      // holding both leather and lining could look sendable
                      // here while its accessory kit was never issued.
                      const kitNotReady =
                        storeVerifyResult?.kit &&
                        ["PENDING", "PARTIAL"].includes(
                          storeVerifyResult.kit.status,
                        );
                      const blocked =
                        storeVerifyResult?.can_send === false || kitNotReady;
                      const reason =
                        storeVerifyResult?.can_send === false
                          ? storeVerifyResult?.lining_reason ||
                          (Array.isArray(storeVerifyResult?.awaiting) &&
                            storeVerifyResult.awaiting.length > 0
                            ? `Waiting on: ${storeVerifyResult.awaiting.join(", ")}`
                            : "Not ready to send yet.")
                          : kitNotReady
                            ? "Accessory kit not issued yet — issue it from the drawer card below before sending."
                            : "";
                      return (
                        <>
                          <button
                            type="button"
                            onClick={handleSendToLineStitching}
                            disabled={
                              storeReceiveStatus === "sended" ||
                              storeApiLoading ||
                              blocked
                            }
                            title={blocked ? reason : ""}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm rounded-xl transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:cursor-not-allowed"
                          >
                            {storeApiLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : storeReceiveStatus === "sended" ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                            {storeReceiveStatus === "sended"
                              ? "Sent to Line Stitching ✅"
                              : "Send to Line Stitching"}
                          </button>
                          {blocked && storeReceiveStatus !== "sended" && (
                            <p className="text-[10px] text-slate-400 font-bold pt-1.5">
                              {reason}
                            </p>
                          )}
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="pt-4 border-t border-slate-200">
                    <p className="text-xs font-black text-center text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                      ✅ Leather Confirmed — send from the Lining tab once
                      lining arrives, or from this drawer's card in the list
                      below.
                    </p>
                  </div>
                )}
              </div>
            )}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className="font-black text-slate-800 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#c8834a]" />
                  Drawers
                  {storeDrawerSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setStoreDrawerSearch("");
                        setStoreDrawerInput("");
                      }}
                      className="ml-1 flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full bg-[#c8834a]/15 text-[#8a5a2a] hover:bg-[#c8834a]/25 cursor-pointer"
                      title="Clear filter"
                    >
                      Filtered: {storeDrawerSearch} <X className="w-3 h-3" />
                    </button>
                  )}
                </h3>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Search by Drawer or Piece Code */}
                  <div className="relative w-full sm:flex-1 sm:min-w-[220px]">
                    <PackageCheck className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#c8834a]" />
                    <input
                      type="text"
                      value={pieceLookupInput}
                      onChange={(e) => setPieceLookupInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleFindDrawerForPiece();
                        }
                      }}
                      placeholder="Search by Drawer or Piece Code..."
                      disabled={pieceLookupLoading}
                      className="w-full pl-9 pr-16 py-2.5 bg-amber-50/50 border border-[#c8834a]/30 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-[#c8834a] shadow-sm disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => handleFindDrawerForPiece()}
                      disabled={pieceLookupLoading || !pieceLookupInput.trim()}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-md bg-[#c8834a] text-white text-[10px] font-black disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      {pieceLookupLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        "Find"
                      )}
                    </button>
                  </div>

                  {/* Type/Status Filter + Refresh — grouped so they stay
                        side-by-side even on mobile, instead of wrapping
                        awkwardly with the full-width search box above. */}
                  <div className="flex items-center gap-2">
                    <select
                      value={storeFilterType}
                      onChange={(e) => setStoreFilterType(e.target.value)}
                      className="flex-1 sm:flex-none px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-[#c8834a]"
                    >
                      <option value="All">All Types</option>
                      <option value="Leather">
                        Leather Only ({storeLeather})
                      </option>
                      <option value="Lining">
                        Lining Only ({storeLining})
                      </option>
                      <option value="Both">Both ({storeBoth})</option>
                      <option value="Free">Empty Drawers ({storeFree})</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleRefreshDrawers}
                      disabled={storeLoading || freeDrawersLoading}
                      className="shrink-0 px-3 py-1.5 bg-[#c8834a] hover:bg-[#b07038] text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                      title="Reload Live Drawers"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${storeLoading || freeDrawersLoading ? "animate-spin" : ""}`}
                      />
                      <span className="hidden sm:inline">Refresh</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Bug #13 & #14: Multi-Drawer Selection Toolbar */}
              {selectedDrawers.size > 0 &&
                (() => {
                  // Team fix: this button used to stay enabled regardless of
                  // whether the selected drawer(s) could actually be sent —
                  // contradicting the same drawer's own card, which already
                  // disables correctly. Enable only if at least one selected
                  // drawer is really sendable; the backend still partial-
                  // accepts a mixed batch, so this doesn't block legit sends.
                  const anySelectedCanSend = Array.from(selectedDrawers).some(
                    (id) => storeDrawers.find((d) => d.id === id)?.can_send,
                  );
                  return (
                    <div className="mx-4 my-3 p-3 rounded-xl bg-indigo-50 border-2 border-indigo-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center">
                          {selectedDrawers.size}
                        </span>
                        <span className="text-sm font-black text-indigo-800">
                          {selectedDrawers.size} Drawer
                          {selectedDrawers.size > 1 ? "s" : ""} Selected
                        </span>
                      </div>
                      <div className="flex items-center flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleBatchSendDrawers("STITCHING")}
                          disabled={batchSending || !anySelectedCanSend}
                          title={
                            anySelectedCanSend
                              ? ""
                              : "None of the selected drawers are ready to send yet"
                          }
                          className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-lg flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                          {batchSending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                          Send to Line Stitching
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedDrawers(new Set())}
                          className="px-3 py-2 bg-white border border-slate-200 text-slate-600 font-bold text-xs rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  );
                })()}

              <div className="divide-y divide-slate-100">
                {storeFilterType === "Free" && freeDrawersLoading && (
                  <div className="px-5 py-8 flex items-center justify-center gap-2 text-slate-400 text-xs font-bold">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading empty
                    drawers...
                  </div>
                )}
                {filteredStoreDrawers
                  .slice(0, storeVisibleCount)
                  .map((drawer) => {
                    const isScannedDrawer =
                      storeDrawerInput.trim().toUpperCase() ===
                      drawer.id.toUpperCase();
                    const isExpanded = expandedDrawer === drawer.id;
                    const isChecked = selectedDrawers.has(drawer.id);
                    return (
                      <div
                        key={drawer.id}
                        className={`transition-colors hover:bg-slate-50 ${isScannedDrawer ? "ring-2 ring-[#c8834a] ring-inset bg-amber-50/30" : ""} ${isChecked ? "bg-indigo-50/50" : ""}`}
                      >
                        <div className="px-3 sm:px-5 py-3 sm:py-4 flex items-start sm:items-center gap-2 sm:gap-0 cursor-pointer">
                          {/* Bug #13: Checkbox for multi-select */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleDrawerSelection(drawer.id);
                            }}
                            className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center mr-2 sm:mr-3 mt-0.5 sm:mt-0 transition-all ${isChecked
                                ? "bg-indigo-600 border-indigo-600 text-white"
                                : "border-slate-300 bg-white hover:border-indigo-400"
                              }`}
                          >
                            {isChecked && <Check className="w-3 h-3" />}
                          </button>
                          <div
                            onClick={() =>
                              setExpandedDrawer(isExpanded ? null : drawer.id)
                            }
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between flex-1 min-w-0 gap-2"
                          >
                            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                              <div
                                className={`w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-xl flex items-center justify-center font-bold text-[10px] sm:text-xs shadow-sm ${drawer.type === "Both"
                                    ? "bg-purple-100 text-purple-700"
                                    : drawer.type === "Leather"
                                      ? "bg-amber-100 text-amber-700"
                                      : drawer.type === "Lining"
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-emerald-100 text-emerald-700"
                                  }`}
                              >
                                {drawer.id.replace("DRW-", "")}
                              </div>
                              <div className="min-w-0">
                                <div className="font-black text-slate-800 text-sm flex items-center flex-wrap gap-1.5">
                                  {drawer.id}
                                  {/* Bug #12: Assigned Drawer badge */}
                                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
                                    📦 {drawer.holding}
                                  </span>
                                  {storeSendedSkus.some(
                                    (sku) =>
                                      drawer.style?.includes(sku) ||
                                      drawer.client?.includes(sku),
                                  ) && (
                                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                        ✓ Sent to Stitching
                                      </span>
                                    )}
                                </div>
                                <div className="text-xs font-bold text-slate-500 mt-0.5 truncate">
                                  {drawer.client !== "-"
                                    ? `${drawer.client} / ${drawer.style}`
                                    : "Empty Drawer"}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 sm:gap-4 ml-[3rem] sm:ml-0 shrink-0">
                              <span
                                className={`px-2.5 py-1 rounded-md text-[10px] font-black tracking-wide uppercase border ${drawer.type === "Empty"
                                    ? "bg-slate-200 text-slate-600 border-slate-300"
                                    : drawer.type === "Both"
                                      ? "bg-purple-600 text-white border-purple-700 shadow-sm"
                                      : drawer.type === "Leather"
                                        ? "bg-amber-600 text-white border-amber-700 shadow-sm"
                                        : drawer.type === "Lining"
                                          ? "bg-blue-600 text-white border-blue-700 shadow-sm"
                                          : "bg-[#c8834a] text-white border-[#b06f36] shadow-sm"
                                  }`}
                              >
                                {drawer.type}
                              </span>
                              {isExpanded ? (
                                <ChevronDown className="w-5 h-5 text-slate-400" />
                              ) : (
                                <ChevronRight className="w-5 h-5 text-slate-400" />
                              )}
                              {isScannedDrawer && (
                                <span className="bg-[#c8834a] text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                                  Scanned
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="px-5 pb-5 pt-2 bg-slate-50/50 border-t border-slate-100">
                            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="font-black text-sm text-slate-700">
                                  Drawer Contents
                                </h4>
                                <div className="flex flex-col items-end gap-1">
                                  <span className="text-xs font-bold text-slate-500">
                                    Status:{" "}
                                    <span className="text-emerald-600">
                                      {drawer.status}
                                    </span>
                                  </span>
                                  <span className="text-[10px] font-bold text-indigo-500">
                                    Holding:{" "}
                                    <span className="text-indigo-700">
                                      {drawer.holding}
                                    </span>
                                  </span>
                                </div>
                              </div>
                              {drawer.type !== "Empty" ? (
                                <div className="space-y-4">
                                  {/* Complete Piece & Stage Details Breakdown Card */}
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/60">
                                      <div className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">
                                        Order &amp; Style
                                      </div>
                                      <div className="text-xs font-black text-slate-800 mt-0.5">
                                        {drawer.order_number} ·{" "}
                                        {drawer.style_name}
                                      </div>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                        Article &amp; Serial
                                      </div>
                                      <div className="text-xs font-black text-slate-800 mt-0.5">
                                        {drawer.article} (#
                                        {drawer.serial || "001"})
                                      </div>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                        Color / Size
                                      </div>
                                      <div className="text-xs font-black text-slate-800 mt-0.5">
                                        {drawer.colour} / {drawer.size}
                                      </div>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                        Assigned Drawer
                                      </div>
                                      <div className="text-xs font-black text-slate-800 mt-0.5">
                                        {drawer.drawer_code || drawer.id}
                                      </div>
                                    </div>
                                    <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/60">
                                      <div className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">
                                        Holding State
                                      </div>
                                      <div className="text-xs font-black text-emerald-800 mt-0.5">
                                        {drawer.holding}
                                      </div>
                                    </div>
                                  </div>
                                  {/* Bug #13/#19: Leather Part / Lining Part detail cards —
                                        each part's own piece code, article and colour, plus
                                        whether it's physically in the drawer yet. */}
                                  <div className="pt-3 border-t border-slate-100 space-y-2">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-2">
                                      Part Breakdown
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                                      <div
                                        className={`p-3 rounded-xl border space-y-1.5 ${drawer.leather_in ? "bg-amber-50 border-amber-300" : "bg-slate-50 border-slate-200"}`}
                                      >
                                        <div className="flex items-center gap-2">
                                          {drawer.leather_in ? (
                                            <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                                          ) : (
                                            <XCircle className="w-4 h-4 text-slate-300 shrink-0" />
                                          )}
                                          <div className="text-[10px] font-black uppercase tracking-wider text-amber-700">
                                            Leather Part
                                          </div>
                                          <span
                                            className={`ml-auto text-[10px] font-black uppercase ${drawer.leather_in ? "text-amber-700" : "text-slate-400"}`}
                                          >
                                            {drawer.leather_in
                                              ? "In Drawer"
                                              : "Not Yet"}
                                          </span>
                                        </div>
                                        {drawer.leather_in && (
                                          <div className="text-[11px] font-bold text-slate-600 space-y-0.5 pl-6">
                                            {drawer.leather_piece_code && (
                                              <div className="font-mono text-slate-800">
                                                {drawer.leather_piece_code}
                                              </div>
                                            )}
                                            <div>
                                              {drawer.leather_article || "—"}{" "}
                                              {drawer.leather_colour
                                                ? `· ${drawer.leather_colour}`
                                                : ""}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                      <div
                                        className={`p-3 rounded-xl border space-y-1.5 ${drawer.lining_in ? "bg-blue-50 border-blue-300" : "bg-slate-50 border-slate-200"}`}
                                      >
                                        <div className="flex items-center gap-2">
                                          {drawer.lining_in ? (
                                            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                                          ) : (
                                            <XCircle className="w-4 h-4 text-slate-300 shrink-0" />
                                          )}
                                          <div className="text-[10px] font-black uppercase tracking-wider text-blue-700">
                                            Lining Part
                                          </div>
                                          <span
                                            className={`ml-auto text-[10px] font-black uppercase ${drawer.lining_in ? "text-blue-700" : "text-slate-400"}`}
                                          >
                                            {drawer.lining_in
                                              ? "In Drawer"
                                              : "Not Yet"}
                                          </span>
                                        </div>
                                        {drawer.lining_in && (
                                          <div className="text-[11px] font-bold text-slate-600 space-y-0.5 pl-6">
                                            {drawer.lining_piece_code && (
                                              <div className="font-mono text-slate-800">
                                                {drawer.lining_piece_code}
                                              </div>
                                            )}
                                            <div>
                                              {drawer.lining_article || "—"}{" "}
                                              {drawer.lining_colour
                                                ? `· ${drawer.lining_colour}`
                                                : ""}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                      {/* Full-width row of its own — the Qty/Status table
                                            columns need more room than a Leather/Lining-sized
                                            third of the grid gives them. */}
                                      <div className="sm:col-span-2 xl:col-span-3">
                                        <AccessoryKitCard
                                          drawer={drawer}
                                          token={token}
                                          employee={barcodeWorker}
                                          onIssued={() => {
                                            pinDrawer(drawer.drawer_id);
                                            fetchLiveDrawers();
                                            // The top scan-verify panel's `storeVerifyResult` is
                                            // frozen from the original scan — issuing the kit from
                                            // this drawer's own card down here wouldn't otherwise
                                            // be reflected up there, leaving its Send button stuck
                                            // disabled on stale PENDING/PARTIAL kit data.
                                            setStoreVerifyResult((prev) => {
                                              if (!prev || !prev.kit)
                                                return prev;
                                              const sameDrawer =
                                                (prev.drawer_id &&
                                                  prev.drawer_id ===
                                                  drawer.drawer_id) ||
                                                (prev.drawer_code &&
                                                  prev.drawer_code ===
                                                  drawer.id);
                                              if (!sameDrawer) return prev;
                                              return {
                                                ...prev,
                                                kit: {
                                                  ...prev.kit,
                                                  status: "ISSUED",
                                                },
                                              };
                                            });
                                          }}
                                        />
                                      </div>
                                    </div>

                                    {/* Bug #20: send this one drawer directly from its own
                                          card — no need to have just scanned it, or use the
                                          checkbox multi-select above, to send it on. */}
                                    {(() => {
                                      // `can_send` is false BOTH when a drawer genuinely
                                      // isn't complete yet AND when it's already been sent —
                                      // those need different copy, or "already sent" reads
                                      // as "still waiting", which is backwards.
                                      const alreadySent =
                                        String(
                                          drawer.status || "",
                                        ).toLowerCase() === "sended";
                                      return (
                                        <>
                                          <div className="pt-2">
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleBatchSendDrawers(
                                                  "STITCHING",
                                                  [drawer.id],
                                                );
                                              }}
                                              disabled={
                                                !drawer.can_send || batchSending
                                              }
                                              className="w-full h-10 rounded-lg font-black text-xs text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                            >
                                              {batchSending ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                              ) : (
                                                <Send className="w-3.5 h-3.5" />
                                              )}{" "}
                                              {alreadySent
                                                ? "Already Sent to Line Stitching"
                                                : "Send to Line Stitching"}
                                            </button>
                                          </div>
                                          <p className="text-[10px] text-slate-400 font-bold pt-0.5">
                                            {drawer.can_send
                                              ? "✓ Ready to send."
                                              : alreadySent
                                                ? "✓ Already sent to Line Stitching."
                                                : "Not ready to send yet — waiting on more parts or a prior stage."}
                                          </p>
                                        </>
                                      );
                                    })()}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center py-6 text-slate-400 text-sm font-bold italic">
                                  This drawer is currently empty and available
                                  for use.
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                {filteredStoreDrawers.length > storeVisibleCount && (
                  <div
                    ref={lastDrawerElementRef}
                    className="p-4 flex justify-center"
                  >
                    <button
                      onClick={() => setStoreVisibleCount((v) => v + 50)}
                      className="px-6 py-2 bg-[#f4ece3] hover:bg-[#e8decb] text-[#c8834a] font-bold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      Load More Drawers (
                      {filteredStoreDrawers.length - storeVisibleCount}{" "}
                      remaining)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}