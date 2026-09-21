"use client";
import {
  Lock,
  CheckCircle2,
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
import StoreNotCheckedInModal from "./StoreNotCheckedInModal";

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
  storeApiLoading,
  filteredStorePieces,
  storeTotal,
  storeFilterType,
  setStoreFilterType,
  storePieceSearch,
  setStorePieceSearch,
  expandedPiece,
  setExpandedPiece,
  pieceLookupInput,
  setPieceLookupInput,
  handleFindPiece,
  selectedPieces,
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
}) {
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
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                  Scan Worker ID Badge / Card (e.g. EMP-000123) to unlock Store Hub scanning
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
                    ID: <strong className="font-mono">{barcodeWorker.employee_barcode || barcodeWorker.id}</strong> · {barcodeWorker.designation || "Store Craftsman"}
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
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col items-center justify-center">
            <div className="text-xs text-slate-500 font-bold mb-1">Total Pieces in Store</div>
            <div className="text-2xl font-black text-slate-800">{storeTotal}</div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 shadow-sm flex flex-col items-center justify-center">
            <div className="text-xs text-emerald-600 font-bold mb-1">Active Batches</div>
            <div className="text-2xl font-black text-emerald-700">
              {filteredStorePieces.length}
            </div>
          </div>
        </div>

        {/* Barcode Scanner */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                Store Verification Gateway
              </h3>
            </div>

            <div className="flex flex-col gap-4 mt-2">
              <div className="relative">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 block">
                  Scanner Input
                </label>
                {!barcodeWorker && (
                  <div className="p-3 mb-2 bg-amber-100/90 border border-amber-300/80 rounded-xl text-amber-900 text-xs font-bold flex items-center justify-center gap-2 shadow-sm">
                    <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Scan &amp; Verify Worker ID in Step 1 Banner above to Unlock Store Scanner</span>
                  </div>
                )}
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
                        : "Scan Piece Barcode..."
                    }
                    value={storeCurrentScan}
                    onChange={(e) => setStoreCurrentScan(e.target.value)}
                    disabled={!barcodeWorker || storeApiLoading}
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
                    title="Scan Piece with Mobile Camera"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mt-6">
              <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className="font-black text-slate-800 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#c8834a]" />
                  Store Inventory
                  {storePieceSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setStorePieceSearch("");
                        setPieceLookupInput("");
                      }}
                      className="ml-1 flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full bg-[#c8834a]/15 text-[#8a5a2a] hover:bg-[#c8834a]/25 cursor-pointer"
                    >
                      Filtered: {storePieceSearch} <X className="w-3 h-3" />
                    </button>
                  )}
                </h3>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="relative w-full sm:flex-1 sm:min-w-[220px]">
                    <PackageCheck className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#c8834a]" />
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
                      placeholder="Search Piece Code..."
                      className="w-full pl-9 pr-16 py-2.5 bg-amber-50/50 border border-[#c8834a]/30 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-[#c8834a] shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={handleFindPiece}
                      disabled={!pieceLookupInput.trim()}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-md bg-[#c8834a] text-white text-[10px] font-black disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      Find
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={storeFilterType}
                      onChange={(e) => setStoreFilterType(e.target.value)}
                      className="flex-1 sm:flex-none px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-[#c8834a]"
                    >
                      <option value="All">All States</option>
                      <option value="WAITING_LINING">Waiting Lining</option>
                      <option value="READY_TO_STITCH">Ready to Stitch</option>
                      <option value="SENDED">Sended</option>
                    </select>
                    <button
                      type="button"
                      onClick={fetchLivePieces}
                      disabled={storeLoading}
                      className="shrink-0 px-3 py-1.5 bg-[#c8834a] hover:bg-[#b07038] text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${storeLoading ? "animate-spin" : ""}`} />
                      <span className="hidden sm:inline">Refresh</span>
                    </button>
                  </div>
                </div>
              </div>

              {selectedPieces.size > 0 && (
                <div className="mx-4 my-3 p-3 rounded-xl bg-indigo-50 border-2 border-indigo-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center">
                      {selectedPieces.size}
                    </span>
                    <span className="text-sm font-black text-indigo-800">
                      {selectedPieces.size} Piece{selectedPieces.size > 1 ? "s" : ""} Selected
                    </span>
                  </div>
                  <div className="flex items-center flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleBatchSendPieces()}
                      disabled={batchSending}
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-lg flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                      {batchSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      Send to Line Stitching
                    </button>
                  </div>
                </div>
              )}

              <div className="divide-y divide-slate-100">
                {filteredStorePieces.length === 0 && !storeLoading && (
                  <div className="p-8 text-center text-slate-400 text-sm font-bold italic">
                    No pieces found matching the current filters.
                  </div>
                )}
                {filteredStorePieces.slice(0, storeVisibleCount).map((piece) => {
                  const isExpanded = expandedPiece === piece.id;
                  const isChecked = selectedPieces.has(piece.id);
                  return (
                    <div
                      key={piece.id}
                      className={`transition-colors hover:bg-slate-50 ${isChecked ? "bg-indigo-50/50" : ""}`}
                    >
                      <div className="px-3 sm:px-5 py-3 sm:py-4 flex items-start sm:items-center gap-2 sm:gap-0 cursor-pointer">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePieceSelection(piece.id);
                          }}
                          className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center mr-2 sm:mr-3 mt-0.5 sm:mt-0 transition-all ${
                            isChecked
                              ? "bg-indigo-600 border-indigo-600 text-white"
                              : "border-slate-300 bg-white hover:border-indigo-400"
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3" />}
                        </button>
                        <div
                          onClick={() => setExpandedPiece(isExpanded ? null : piece.id)}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between flex-1 min-w-0 gap-2"
                        >
                          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                            <div className="min-w-0">
                              <div className="font-black text-slate-800 text-sm flex items-center flex-wrap gap-1.5">
                                {piece.code || piece.id}
                                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
                                  State: {piece.store_state || "UNKNOWN"}
                                </span>
                              </div>
                              <div className="text-xs font-bold text-slate-500 mt-0.5 truncate">
                                {piece.style_name || "—"} / {piece.order_number || "—"}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 sm:gap-4 ml-[3rem] sm:ml-0 shrink-0">
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5 text-slate-400" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-5 pb-5 pt-2 bg-slate-50/50 border-t border-slate-100">
                          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-4">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Order</div>
                                <div className="text-xs font-black text-slate-800 mt-0.5">{piece.order_number}</div>
                              </div>
                              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Style</div>
                                <div className="text-xs font-black text-slate-800 mt-0.5">{piece.style_name}</div>
                              </div>
                              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Color / Size</div>
                                <div className="text-xs font-black text-slate-800 mt-0.5">{piece.color} / {piece.size}</div>
                              </div>
                            </div>
                            <div className="pt-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleBatchSendPieces([piece.id]);
                                }}
                                disabled={batchSending || piece.store_state === "SENDED"}
                                className="w-full h-10 rounded-lg font-black text-xs text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                {batchSending ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Send className="w-3.5 h-3.5" />
                                )}
                                {piece.store_state === "SENDED" ? "Already Sent" : "Send to Line Stitching"}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {filteredStorePieces.length > storeVisibleCount && (
                  <div ref={lastPieceElementRef} className="p-4 flex justify-center">
                    <button
                      onClick={() => setStoreVisibleCount((v) => v + 50)}
                      className="px-6 py-2 bg-[#f4ece3] hover:bg-[#e8decb] text-[#c8834a] font-bold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      Load More ({filteredStorePieces.length - storeVisibleCount} remaining)
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
