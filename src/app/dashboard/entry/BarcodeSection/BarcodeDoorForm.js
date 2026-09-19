// barcode form code
"use client";
import {
  Lock,
  Rocket,
  Scissors,
  X,
  Loader2,
  Barcode,
  Check,
  PackageCheck,
  Camera,
} from "lucide-react";
import {
  manualStages,
  CameraScannerModal,
  WorkerPickerDropdown,
} from "../shared";
import BarcodeNotCheckedInModal from "./BarcodeNotCheckedInModal";
import BarcodeSuccessModal from "./BarcodeSuccessModal";

// Extracted from BarcodeDoorSection.js (STEP 1 + STEP 2 JSX). Pure
// presentational — all state/handlers come from BarcodeDoorSection.js as props.
export default function BarcodeDoorForm({
  setErrorMsg,
  barcodeStage,
  setBarcodeStage,
  lotArticle,
  setLotArticle,
  lotColor,
  setLotColor,
  lotThickness,
  setLotThickness,
  lotOptions,
  lotResults,
  lotLoading,
  lotCategory,
  barcodeDcm,
  setBarcodeDcm,
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
  user,
  workers,
  isFullAccess,
  isStageAllowedForRole,
  barcodeSkuInput,
  setBarcodeSkuInput,
  barcodeSelectedSku,
  barcodeSkuVerifying,
  barcodeDcmConfirmed,
  setBarcodeDcmConfirmed,
  cuttingBatchPieces,
  barcodePieceResolving,
  barcodePieceValidating,
  scannedPieceDrawerInfo,
  setScannedPieceDrawerInfo,
  barcodePieceInput,
  setBarcodePieceInput,
  barcodeBatchPieces,
  setBarcodeBatchPieces,
  barcodeSubmitting,
  barcodeSuccessModal,
  setBarcodeSuccessModal,
  skuInputRef,
  dcmInputRef,
  pieceInputRef,
  handleVerifySkuBarcode,
  handleBarcodeCuttingSubmit,
  handleBarcodePieceScan,
  handleBarcodeBatchSubmit,
}) {
  return (
    <>
      {cameraScanTarget === "sku" && (
        <CameraScannerModal
          title="Scan SKU Barcode"
          onClose={() => setCameraScanTarget(null)}
          onScan={(scannedCode) => {
            const cleanCode = String(scannedCode || "")
              .replace(/[\r\n]+/g, "")
              .trim();
            if (!cleanCode) return;
            setBarcodeSkuInput(cleanCode);
            setTimeout(() => handleVerifySkuBarcode(cleanCode), 50);
          }}
        />
      )}
      {cameraScanTarget === "piece" && (
        <CameraScannerModal
          title="Scan Piece Barcode"
          onClose={() => setCameraScanTarget(null)}
          onScan={(scannedCode) => {
            const cleanCode = String(scannedCode || "")
              .replace(/[\r\n]+/g, "")
              .trim();
            if (!cleanCode) return;
            setBarcodePieceInput(cleanCode);
            setTimeout(() => handleBarcodePieceScan(cleanCode), 50);
          }}
        />
      )}
      <div className="space-y-8 animate-fade-in">
        {/* STEP 1: WORKER BARCODE SCAN & ATTENDANCE GATE */}
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
                  Worker Barcode Verification
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#c8834a]/30 text-[#f5d4a4]">
                    Step 1
                  </span>
                </h3>
                <p className="text-xs text-[#e2d5c3]/80">
                  Scan Worker ID Badge / Card (e.g. EMP-000123) to verify
                  Check-In status
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
                    autoFocus
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

              {/* Quick Select Worker Dropdown Fallback */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 text-xs text-[#e2d5c3]/70">
                <span className="shrink-0">Or select active worker:</span>
                <WorkerPickerDropdown
                  workers={workers}
                  onSelect={handleVerifyBarcodeWorker}
                />
              </div>
            </div>
          ) : (
            /* VERIFIED WORKER PROFILE CARD */
            <div className="p-4 rounded-2xl bg-white/10 border border-[#c8834a]/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in relative z-10">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#c8834a]/30 border border-[#c8834a] flex items-center justify-center text-white font-black text-lg shadow-md">
                  {barcodeWorker.name ? barcodeWorker.name[0] : "W"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-black text-white">
                      {barcodeWorker.name}
                    </h4>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      🟢 Checked-In Today
                    </span>
                  </div>
                  <p className="text-xs text-[#f5d4a4] font-medium mt-0.5">
                    ID:{" "}
                    <strong className="font-mono">
                      {barcodeWorker.employee_barcode || barcodeWorker.id}
                    </strong>{" "}
                    · {barcodeWorker.designation || "Master Craftsman"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        <BarcodeNotCheckedInModal
          barcodeNotCheckedInModal={barcodeNotCheckedInModal}
          setBarcodeNotCheckedInModal={setBarcodeNotCheckedInModal}
          workerInputRef={workerInputRef}
        />

        {/* STEP 2: SELECT PRODUCTION OPERATION STAGE */}
        <div
          className={`space-y-6 p-6 rounded-3xl bg-[#fcfaf8] shadow-sm border border-[#c8834a]/20 transition-all duration-300 relative ${!barcodeWorker ? "opacity-50 pointer-events-none select-none filter blur-[0.5px]" : "animate-fade-in"}`}
        >
          {!barcodeWorker && (
            <div className="p-3.5 bg-amber-100/90 border border-amber-300/80 rounded-2xl text-amber-900 text-xs font-bold flex items-center justify-center gap-2 shadow-sm mb-4">
              <Lock className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                Scan &amp; Verify Employee Barcode in Step 1 to Unlock Remaining
                Production Stage Cards
              </span>
            </div>
          )}
          <div className="flex items-center gap-3 pb-3 border-b border-[#c8834a]/15">
            <div className="w-8 h-8 rounded-xl bg-[#c8834a]/15 flex items-center justify-center text-[#c8834a] font-black text-xs">
              2
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-[#2d1f0e]">
                Select Production Operation Stage *
              </h3>
              <p className="text-xs text-[#9a7a5a]">
                Choose stage to log barcode scan events
              </p>
            </div>
          </div>

          {/* Stitching Manager works a 5-stage pipeline (Fusing through
              Final Finish) on the same pieces the server already tracks
              per-piece via GET /production/piece-state — per the API doc's
              own rule ("the client never chooses a production stage...a
              stage picker in the UI will disagree with the server
              eventually"), manual tab-picking is switched off entirely for
              this role. Scanning a piece auto-selects the right stage.
              DM/MD keep full manual access; Cutting/Lining Managers only
              ever have one stage each, so the mismatch risk this guards
              against doesn't apply to them. */}
          {user === "stitching_manager" && (
            <p className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-2.5">
              ⚠️ Stage picking is automatic for your role — scan a piece and its
              correct stage selects itself.
            </p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {manualStages.map((stage) => {
              const isSelected = barcodeStage === stage;
              const isRoleAllowed = isStageAllowedForRole(stage);
              const roleLocked = !isRoleAllowed;
              const autoOnly = user === "stitching_manager";
              // Tab access is gated by ROLE only. Sequence completion is
              // inherently per-piece (many pieces sit at many different
              // stages at once), and completion tracking is only ever this
              // browser session's memory — a different login (e.g. a
              // Stitching Manager working pieces someone else already cut
              // in an earlier session) would see every stage permanently
              // locked with no way in. The real sequence gate already
              // runs correctly and session-independently at scan time via
              // GET /production/piece-state — that's the source of truth,
              // not this button.
              const isDisabled = roleLocked || autoOnly;

              return (
                <button
                  key={stage}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    if (roleLocked) {
                      setErrorMsg(
                        `⚠️ Role Restricted: Your role cannot log the '${stage}' stage.`,
                      );
                      return;
                    }
                    if (autoOnly) return;
                    setBarcodeStage(stage);
                  }}
                  className={`p-3.5 rounded-2xl text-xs transition-all text-center border shadow-sm relative ${
                    isDisabled
                      ? isSelected
                        ? "bg-gradient-to-r from-[#c8834a] to-[#e8a06a] text-white border-[#c8834a] scale-[1.02] shadow-md cursor-not-allowed font-black"
                        : "opacity-35 grayscale bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                      : isSelected
                        ? "bg-gradient-to-r from-[#c8834a] to-[#e8a06a] text-white border-[#c8834a] scale-[1.02] shadow-md cursor-pointer font-black"
                        : "bg-white text-slate-800 border-slate-200 hover:border-[#c8834a] hover:bg-amber-50/50 cursor-pointer font-bold"
                  }`}
                  title={
                    roleLocked
                      ? "🔒 Not permitted for your role"
                      : autoOnly
                        ? isSelected
                          ? "Auto-selected from the scanned piece"
                          : "Not the current stage — scan a piece to update it"
                        : stage
                  }
                >
                  {!isFullAccess && isStageAllowedForRole(stage) && (
                    <span
                      className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white shadow-sm z-10"
                      title="Your Assigned Stage"
                    ></span>
                  )}
                  {roleLocked && <span className="mr-0.5 text-[9px]">🔒</span>}
                  {stage}
                </button>
              );
            })}
          </div>

          {/* STEP 3A: CUTTING/LINING STAGE FLOW — Bug #10: same dedicated
                  consumption screen (Verify SKU -> DCM/Article/Colour/Thickness
                  -> batch-scan pieces -> submit) shared by both, since both are
                  cut stages requiring material consumption data. */}
          {barcodeStage === "Cutting" || barcodeStage === "Lining" ? (
            <div className="space-y-6 pt-4 border-t border-[#c8834a]/15 animate-fade-in">
              {/* SKU BARCODE GUN INPUT */}
              <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-wider text-[#4a3a2a] flex items-center gap-1.5">
                  <Barcode className="w-4 h-4 text-[#c8834a]" /> Scan SKU
                  Barcode *
                </label>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    {!barcodeSkuInput && (
                      <Barcode className="w-5 h-5 text-[#c8834a] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-opacity duration-200" />
                    )}
                    <input
                      ref={skuInputRef}
                      type="text"
                      placeholder="Scan SKU Barcode (e.g. ADELE-38, 100123-ADELE-38)..."
                      value={barcodeSkuInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBarcodeSkuInput(val);
                        setBarcodeDcmConfirmed(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleVerifySkuBarcode(barcodeSkuInput);
                        }
                      }}
                      style={{
                        paddingLeft: barcodeSkuInput ? "1rem" : "3.25rem",
                        paddingRight: "3rem",
                      }}
                      className="w-full h-14 bg-white font-mono font-bold text-base text-[#2d1f0e] border-2 border-[#c8834a]/30 focus:border-[#c8834a] shadow-sm rounded-xl outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!barcodeWorker || barcodeSkuVerifying}
                    />
                    <button
                      type="button"
                      onClick={() => setCameraScanTarget("sku")}
                      disabled={!barcodeWorker}
                      className="sm:hidden absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-amber-50 text-[#c8834a] border border-[#c8834a]/30 hover:bg-amber-100 active:scale-95 transition-all cursor-pointer z-10 disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Scan SKU Barcode with Mobile Camera"
                    >
                      <Camera className="w-5 h-5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleVerifySkuBarcode(barcodeSkuInput)}
                    disabled={
                      !barcodeWorker ||
                      !barcodeSkuInput.trim() ||
                      barcodeSkuVerifying
                    }
                    className="h-14 px-6 rounded-xl font-black text-xs text-white bg-[#c8834a] hover:bg-[#b0723e] active:scale-95 transition-all shadow-md cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1.5 shrink-0"
                  >
                    {barcodeSkuVerifying ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Verify SKU
                  </button>
                </div>

                {/* Verified SKU Preview Badge — Bug #7: full breakdown
                        (Order/Style/Article/Colour/Size/Serial), not just the
                        raw code string with the serial buried inside it. */}
                {barcodeSelectedSku && (
                  <div className="p-3 rounded-xl bg-amber-50/80 border border-[#c8834a]/30 space-y-2 animate-fade-in text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="font-extrabold text-[#2d1f0e]">
                          Order #{barcodeSelectedSku.order_number || "N/A"} ·{" "}
                          {barcodeSelectedSku.style_name ||
                            barcodeSelectedSku.code}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-[#c8834a]">
                        {barcodeSelectedSku.code}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1.5 border-t border-[#c8834a]/15 text-[11px] font-bold text-[#4a3a2a]">
                      {barcodeSelectedSku.article && (
                        <span>
                          Article:{" "}
                          <span className="text-[#2d1f0e]">
                            {barcodeSelectedSku.article}
                          </span>
                        </span>
                      )}
                      {barcodeSelectedSku.color_code && (
                        <span>
                          Color:{" "}
                          <span className="text-[#2d1f0e]">
                            {barcodeSelectedSku.color_code}
                          </span>
                        </span>
                      )}
                      {barcodeSelectedSku.size && (
                        <span>
                          Size:{" "}
                          <span className="text-[#2d1f0e]">
                            {barcodeSelectedSku.size}
                          </span>
                        </span>
                      )}
                      {barcodeSelectedSku.serial && (
                        <span>
                          Serial/Qty:{" "}
                          <span className="text-[#2d1f0e]">
                            {barcodeSelectedSku.serial}
                          </span>
                        </span>
                      )}
                      {barcodeSelectedSku.drawer?.code && (
                        <span className="flex items-center gap-1">
                          <PackageCheck className="w-3 h-3 text-[#c8834a]" />
                          Assigned Drawer:{" "}
                          <span className="font-mono text-[#2d1f0e]">
                            {barcodeSelectedSku.drawer.code}
                          </span>
                          {barcodeSelectedSku.drawer.holding && (
                            <span className="text-[9px] uppercase tracking-wider text-[#9a7a5a]">
                              ({barcodeSelectedSku.drawer.holding})
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Total Cut Area (DCM) Field — APPEARS ONLY AFTER SKU IS VERIFIED.
                  Hidden for Lining: it's not a "measured cut" on the backend,
                  so no DCM is collected or sent for that stage. */}
              {barcodeSelectedSku && barcodeStage !== "Lining" && (
                <div className="space-y-3 animate-fade-in pt-2 border-t border-[#c8834a]/15">
                  <label className="text-xs font-black uppercase tracking-wider text-[#4a3a2a] flex items-center gap-1.5">
                    <Scissors className="w-4 h-4 text-[#c8834a]" /> Total Cut
                    Area (DCM) / Count *
                  </label>
                  <div className="flex gap-3">
                    <input
                      ref={dcmInputRef}
                      type="number"
                      min="1"
                      placeholder="Enter DCM value or Cut Piece count (e.g. 45)..."
                      value={barcodeDcm}
                      onChange={(e) => {
                        setBarcodeDcm(e.target.value);
                        setBarcodeDcmConfirmed(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && barcodeDcm) {
                          e.preventDefault();
                          setBarcodeDcmConfirmed(true);
                        }
                      }}
                      className="input-field flex-1 h-14 px-4 bg-white font-black text-xl text-[#2d1f0e] border-2 border-[#c8834a]/30 focus:border-[#c8834a] shadow-sm rounded-xl outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setBarcodeDcmConfirmed(true)}
                      disabled={!barcodeDcm || isNaN(parseInt(barcodeDcm, 10))}
                      className="h-14 px-6 rounded-xl font-black text-xs text-white bg-[#c8834a] hover:bg-[#b0723e] active:scale-95 transition-all shadow-md cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1.5 shrink-0"
                    >
                      <Check className="w-4 h-4" />
                      Verify DCM
                    </button>
                  </div>
                </div>
              )}

              {/* ORDER DETAILS SUMMARY & 3 MATERIAL SPEC DROPDOWNS.
                  Lining has no DCM step to confirm, so it unlocks this block
                  as soon as the SKU is verified; Cutting still waits on the
                  DCM confirm above. */}
              {barcodeSelectedSku &&
                (barcodeStage === "Lining" ||
                  (barcodeDcmConfirmed && barcodeDcm)) && (
                  <div className="p-6 rounded-2xl bg-white border-2 border-[#c8834a]/30 shadow-md space-y-5 animate-fade-in">
                    {/* Order Details Header */}
                    <div className="p-4 rounded-xl bg-[#faf6f0] border border-[#c8834a]/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#c8834a]">
                          Order Summary
                        </span>
                        <h4 className="text-sm font-black text-[#2d1f0e] mt-0.5">
                          Order #{barcodeSelectedSku.order_number || "100123"} ·{" "}
                          {barcodeSelectedSku.style_name ||
                            barcodeSelectedSku.code}
                        </h4>
                      </div>
                      {barcodeStage !== "Lining" && (
                        <div className="text-right">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Total DCM
                          </span>
                          <p className="text-lg font-black text-[#c8834a]">
                            {barcodeDcm} DCM
                          </p>
                        </div>
                      )}
                    </div>

                    {/* 3 Dropdowns */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* 1 & 2. Article / Color — hidden for Lining: backend has no
                        Lining material-lot data yet (confirmed by backend team),
                        so the dropdowns are always empty there and article gets
                        derived automatically on their side. Cutting keeps them. */}
                      {barcodeStage !== "Lining" && (
                        <>
                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-[#4a3a2a] uppercase tracking-wider flex items-center justify-between">
                              <span>
                                {lotCategory === "LINING"
                                  ? "Lining"
                                  : "Leather"}{" "}
                                Article{barcodeStage === "Cutting" ? " *" : ""}
                              </span>
                              {barcodeStage !== "Cutting" && (
                                <span className="text-[10px] text-slate-400 font-bold lowercase">
                                  (optional)
                                </span>
                              )}
                            </label>
                            <select
                              value={lotArticle}
                              onChange={(e) => {
                                setLotArticle(e.target.value);
                                setLotColor("");
                                setLotThickness("");
                              }}
                              className="w-full h-12 px-3 bg-[#faf6f0] font-bold text-xs border border-[#c8834a]/30 rounded-xl focus:outline-none cursor-pointer"
                            >
                              <option value="">-- Select Article --</option>
                              {lotOptions.article?.map((a) => (
                                <option key={a} value={a}>
                                  {a}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-[#4a3a2a] uppercase tracking-wider flex items-center justify-between">
                              <span>
                                {lotCategory === "LINING"
                                  ? "Lining"
                                  : "Leather"}{" "}
                                Color{barcodeStage === "Cutting" ? " *" : ""}
                              </span>
                              {barcodeStage !== "Cutting" && (
                                <span className="text-[10px] text-slate-400 font-bold lowercase">
                                  (optional)
                                </span>
                              )}
                            </label>

                            <select
                              value={lotColor}
                              onChange={(e) => {
                                setLotColor(e.target.value);
                                setLotThickness("");
                              }}
                              className="w-full h-12 px-3 bg-[#faf6f0] font-bold text-xs border border-[#c8834a]/30 rounded-xl focus:outline-none cursor-pointer"
                            >
                              <option value="">-- Select Color --</option>
                              {lotOptions.colour?.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>
                        </>
                      )}
                      {/* 3. Thickness */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-[#4a3a2a] uppercase tracking-wider flex items-center justify-between">
                          <span> Thickness</span>
                          <span className="text-[10px] text-slate-400 font-bold lowercase">
                            (optional)
                          </span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 1.2mm, 0.8mm..."
                          value={lotThickness}
                          onChange={(e) => setLotThickness(e.target.value)}
                          className="w-full h-12 px-3 bg-[#faf6f0] font-bold text-xs border border-[#c8834a]/30 rounded-xl focus:outline-none focus:border-[#c8834a]"
                        />
                      </div>
                    </div>

                    {/* Item 5 (per team request): Cutting logs exactly the ONE
                      piece resolved by Verify SKU above — each piece needs its
                      own DCM measurement, so there is no "scan more, batch,
                      submit together under one shared DCM" step anymore. The
                      piece's own code/article/colour/size/drawer are already
                      shown in the confirmation card right after Verify SKU. */}

                    {/* Lot Status Indicator — Bug #9: Thickness is optional, so this must not wait on it */}
                    {lotArticle && lotColor && (
                      <div
                        className={`p-4 rounded-xl border flex items-center justify-between ${lotResults.length === 1 && lotResults[0].covers_required !== false ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}
                      >
                        <div>
                          <div className="text-xs font-black uppercase tracking-wider mb-1">
                            Material Availability
                          </div>
                          <div className="text-sm font-bold">
                            {lotLoading ? (
                              "Checking..."
                            ) : lotResults.length === 1 ? (
                              lotResults[0].covers_required === false ? (
                                <span className="text-red-600">
                                  Not enough stock (Available:{" "}
                                  {lotResults[0].available} {lotResults[0].uom})
                                </span>
                              ) : (
                                <span className="text-emerald-700">
                                  Available: {lotResults[0].available}{" "}
                                  {lotResults[0].uom}
                                </span>
                              )
                            ) : (
                              <span className="text-red-600">
                                {lotResults.length === 0
                                  ? "No matching lot found."
                                  : "Multiple lots found. Refine filters."}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Submit Cutting Button */}
                    <button
                      type="button"
                      onClick={handleBarcodeCuttingSubmit}
                      disabled={
                        barcodeSubmitting ||
                        cuttingBatchPieces.length === 0 ||
                        ((barcodeStage === "Cutting" ||
                          barcodeStage === "LEATHER_CUTTING") &&
                          (!lotArticle || !lotColor))
                      }
                      className="w-full h-14 rounded-xl font-black text-sm text-[#0f0a06] shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-40"
                      style={{
                        background: "linear-gradient(135deg, #c8834a, #e8a06a)",
                      }}
                    >
                      {barcodeSubmitting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Rocket className="w-5 h-5" />
                      )}
                      Log {barcodeStage} Event &amp; Mint Traveler Card Barcodes
                    </button>
                  </div>
                )}
            </div>
          ) : (
            /* STEP 3B: PIPELINE STAGES FLOW (Fusing -> Final Finish) */
            <div className="space-y-6 pt-4 border-t border-[#c8834a]/15 animate-fade-in">
              <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-wider text-[#4a3a2a] flex items-center gap-1.5">
                  <Barcode className="w-4 h-4 text-[#c8834a]" /> Scan Piece
                  Barcodes for {barcodeStage} *
                </label>

                <div className="flex gap-3">
                  <div className="relative flex-1">
                    {!barcodePieceInput && (
                      <Barcode className="w-5 h-5 text-[#c8834a] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-opacity duration-200" />
                    )}
                    <input
                      ref={pieceInputRef}
                      type="text"
                      placeholder={
                        barcodePieceValidating
                          ? "Checking piece stage…"
                          : `Scan piece barcode (e.g. KL_1-${barcodeSelectedSku?.code || "ADELE-38"}-001)...`
                      }
                      value={barcodePieceInput}
                      onChange={(e) => setBarcodePieceInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleBarcodePieceScan();
                        }
                      }}
                      style={{
                        paddingLeft: barcodePieceInput ? "1rem" : "3.25rem",
                        paddingRight: "3rem",
                      }}
                      className="w-full h-14 bg-white font-mono font-bold text-sm text-[#2d1f0e] border-2 border-[#c8834a]/30 focus:border-[#c8834a] shadow-sm rounded-xl outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={
                        !barcodeWorker ||
                        barcodePieceResolving ||
                        barcodePieceValidating
                      }
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setCameraScanTarget("piece")}
                      disabled={
                        !barcodeWorker ||
                        barcodePieceResolving ||
                        barcodePieceValidating
                      }
                      className="sm:hidden absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-amber-50 text-[#c8834a] border border-[#c8834a]/30 hover:bg-amber-100 active:scale-95 transition-all cursor-pointer z-10 disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Scan Piece Barcode with Mobile Camera"
                    >
                      <Camera className="w-5 h-5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleBarcodePieceScan()}
                    disabled={!barcodeWorker || barcodePieceResolving}
                    className="h-14 px-6 rounded-xl font-black text-xs text-white shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                    style={{ background: "#c8834a" }}
                  >
                    {barcodePieceResolving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : null}
                    Add Piece
                  </button>
                </div>

                {/* Bug #12: assigned drawer for the most recently scanned piece */}
                {scannedPieceDrawerInfo && (
                  <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 border border-[#c8834a]/25 text-xs font-bold text-[#7a5a34] w-fit animate-fade-in">
                    <PackageCheck className="w-3.5 h-3.5 text-[#c8834a] shrink-0" />
                    Assigned Drawer:{" "}
                    <span className="font-mono font-black text-[#4a3a2a]">
                      {scannedPieceDrawerInfo.code || "—"}
                    </span>
                    {scannedPieceDrawerInfo.holding && (
                      <span className="text-[10px] uppercase tracking-wider text-[#9a7a5a]">
                        ({scannedPieceDrawerInfo.holding})
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Scanned Pieces Batch List */}
              {barcodeBatchPieces.length > 0 && (
                <div className="p-5 rounded-2xl bg-white border-2 border-[#c8834a]/20 shadow-md space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="text-xs font-black text-[#2d1f0e] flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      Scanned Pieces Batch ({barcodeBatchPieces.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setBarcodeBatchPieces([]);
                        setScannedPieceDrawerInfo(null);
                      }}
                      className="text-xs font-bold text-red-500 hover:underline cursor-pointer"
                    >
                      Clear Batch
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                    {barcodeBatchPieces.map((p, idx) => (
                      <div
                        key={p.code}
                        className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-mono font-bold text-slate-800 text-[11px]">
                            {p.code}
                          </p>
                          <p className="text-[9px] font-semibold text-slate-400">
                            Scanned #{idx + 1}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setBarcodeBatchPieces((prev) =>
                              prev.filter((item) => item.code !== p.code),
                            )
                          }
                          className="text-slate-400 hover:text-red-500 transition-colors p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleBarcodeBatchSubmit}
                    disabled={barcodeSubmitting}
                    className="w-full h-14 rounded-xl font-black text-sm text-[#0f0a06] shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-40"
                    style={{
                      background: "linear-gradient(135deg, #c8834a, #e8a06a)",
                    }}
                  >
                    {barcodeSubmitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Rocket className="w-5 h-5" />
                    )}
                    Submit Batch ({barcodeBatchPieces.length} Pieces) for{" "}
                    {barcodeStage}
                  </button>
                </div>
              )}
            </div>
          )}
          <BarcodeSuccessModal
            barcodeSuccessModal={barcodeSuccessModal}
            setBarcodeSuccessModal={setBarcodeSuccessModal}
          />
        </div>
      </div>
    </>
  );
}
