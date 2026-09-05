// manula logger form submission code
'use client';
import {
  Users,
  ChevronDown,
  Search,
  Loader2,
  Scissors,
  Ruler,
  AlertTriangle,
  ListChecks,
  Plus,
  Calendar,
  Rocket,
  BarChart3,
} from 'lucide-react';
import { manualStages } from '../shared';
export default function ManualDoorForm({
  handleSubmit,
  isFullAccess,
  isStageAllowedForRole,
  workerModalRef,
  isWorkerOpen,
  setIsWorkerOpen,
  workerSearchQuery,
  setWorkerSearchQuery,
  currentSelectedWorker,
  searchFilteredWorkers,
  workerId,
  workerVerifying,
  handleSelectWorker,
  setErrorMsg,
  selectedStage,
  setSelectedStage,
  pieceSeqs,
  setPieceSeqs,
  skuModalRef,
  setSkuRefreshKey,
  skusLoading,
  isSkuOpen,
  setIsSkuOpen,
  skuSearchQuery,
  setSkuSearchQuery,
  visibleCount,
  setVisibleCount,
  searchFilteredSkus,
  skuCode,
  setSkuCode,
  currentSelectedSku,
  alreadyCutCount,
  lotArticle,
  setLotArticle,
  lotColor,
  setLotColor,
  lotThickness,
  setLotThickness,
  lotOptions,
  lotResults,
  lotLoading,
  barcodeDcm,
  setBarcodeDcm,
  cuttingCount,
  setCuttingCount,
  openChecklistModal,
  date,
  setDate,
  isSavingCutting,
  checklistSubmitting,
  setShowAnalyticsModal,
})
{
    return(
        <>
<form onSubmit={handleSubmit} className="space-y-8 animate-fade-in">
        {/* STEP 1: Worker Selection */}
        <div
          className="space-y-6 p-6 rounded-2xl shadow-sm relative overflow-visible"
          style={{
            background: "#fcfaf8",
            border: "1px solid rgba(200,131,74,0.1)",
          }}
        >
          <div
            className="absolute top-0 left-0 w-1 h-full"
            style={{ background: "#c8834a" }}
          ></div>
          <h3
            className="text-sm font-black uppercase tracking-widest pb-3 flex items-center gap-2"
            style={{
              color: "#2d1f0e",
              borderBottom: "1px solid rgba(200,131,74,0.1)",
            }}
          >
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
              style={{ background: "rgba(200,131,74,0.15)", color: "#c8834a" }}
            >
              1
            </span>
            Worker Selection
          </h3>

          <div className="pt-2">
            <div
              className="flex flex-col gap-2 relative z-40 self-start w-full"
              ref={workerModalRef}
            >
              <label
                className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
                style={{ color: "#4a3a2a" }}
              >
                <Users className="w-4 h-4" style={{ color: "#c8834a" }} />{" "}
                Assigned Worker *
              </label>

              <button
                type="button"
                onClick={() => {
                  setIsWorkerOpen(!isWorkerOpen);
                  setWorkerSearchQuery("");
                }}
                className="w-full h-14 px-4 bg-white font-bold border-2 rounded-xl border-[#c8834a]/30 hover:border-[#c8834a] shadow-sm text-sm transition-all flex items-center justify-between text-left cursor-pointer"
              >
                <span
                  className={
                    currentSelectedWorker
                      ? "text-slate-900 font-extrabold truncate"
                      : "text-slate-400"
                  }
                >
                  {currentSelectedWorker
                    ? currentSelectedWorker.name
                    : `-- Select / Search Worker --`}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-[#c8834a] transition-transform duration-200 shrink-0 ml-2 ${isWorkerOpen ? "rotate-180" : ""}`}
                />
              </button>

              {isWorkerOpen && (
                <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white border-2 border-[#c8834a] rounded-2xl shadow-2xl z-[99999] p-3 space-y-3 animate-fade-in">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      autoFocus
                      placeholder="Search Worker Name..."
                      value={workerSearchQuery}
                      onChange={(e) => setWorkerSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.preventDefault();
                      }}
                      className="w-full h-11 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#c8834a]/30 focus:border-[#c8834a]"
                    />
                  </div>

                  <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 pr-1">
                    {searchFilteredWorkers.length > 0 ? (
                      searchFilteredWorkers.map((w) => {
                        const isSelected = workerId === w.id;
                        return (
                          <button
                            key={w.id}
                            type="button"
                            disabled={workerVerifying}
                            onClick={() => handleSelectWorker(w)}
                            className={`w-full p-3 text-left transition-colors rounded-xl flex items-center justify-between text-xs font-bold my-0.5 cursor-pointer disabled:opacity-50 ${isSelected ? "bg-[#c8834a] text-white" : "hover:bg-amber-50 text-slate-800"}`}
                          >
                            <span>{w.name}</span>
                            {isSelected && (
                              <span className="font-black text-sm">✓</span>
                            )}
                            {workerVerifying && !isSelected && (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            )}
                          </button>
                        );
                      })
                    ) : (
                      <div className="p-4 text-center text-xs font-bold text-slate-400">
                        No workers match "{workerSearchQuery}"
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* STEP 2: Garment Details & Operation Stage */}
        <div
          className="space-y-6 p-6 rounded-2xl shadow-sm relative overflow-visible"
          style={{
            background: "#fcfaf8",
            border: "1px solid rgba(200,131,74,0.1)",
          }}
        >
          <div
            className="absolute top-0 left-0 w-1 h-full"
            style={{ background: "#c8834a" }}
          ></div>
          <h3
            className="text-sm font-black uppercase tracking-widest pb-3 flex items-center gap-2"
            style={{
              color: "#2d1f0e",
              borderBottom: "1px solid rgba(200,131,74,0.1)",
            }}
          >
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
              style={{ background: "rgba(200,131,74,0.15)", color: "#c8834a" }}
            >
              2
            </span>
            Operation Stage &amp; Garment Details
          </h3>

          <div className="space-y-4 pt-2">
            <label
              className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
              style={{ color: "#4a3a2a" }}
            >
              <Scissors className="w-4 h-4" style={{ color: "#c8834a" }} />{" "}
              Operation Stage *
            </label>

            {/* 7 Operation Stage Banners — same Sequential Stage Dependency State
                    Machine as the Barcode Gun door (parity: isStageReady/PREREQUISITE_MAP) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {manualStages.map((stage) => {
                const isSelected = selectedStage === stage;
                const isRoleAllowed = isStageAllowedForRole(stage);
                const roleLocked = !isRoleAllowed;
                // Barcode Gun Scanner parity: worker must be verified
                // before the stage step unlocks. Sequence completion is
                // per-piece and session-independent enforcement already
                // happens correctly at scan time via GET /production/piece-state.
                const noWorker = !workerId;
                const isDisabled = roleLocked || noWorker;

                return (
                  <button
                    key={stage}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => {
                      if (noWorker) {
                        setErrorMsg("⚠️ Please select a Worker first!");
                        return;
                      }
                      if (roleLocked) {
                        setErrorMsg(
                          `⚠️ Role Restricted: Your role cannot log the '${stage}' stage.`,
                        );
                        return;
                      }
                      setSelectedStage(stage);
                      setPieceSeqs("");
                    }}
                    className={`p-2.5 rounded-xl text-xs font-black transition-all text-center border relative ${
                      isDisabled
                        ? "opacity-40 grayscale bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                        : isSelected
                          ? "bg-[#c8834a] text-white border-[#c8834a] shadow-sm scale-[1.02] cursor-pointer"
                          : "bg-[#faf6f0] text-slate-700 border-slate-200/60 hover:border-[#c8834a]/50 cursor-pointer"
                    }`}
                    title={
                      noWorker
                        ? "🔒 Select a worker first"
                        : roleLocked
                          ? "🔒 Not permitted for your role"
                          : stage
                    }
                  >
                    {!isFullAccess && isStageAllowedForRole(stage) && (
                      <span
                        className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white shadow-sm z-10"
                        title="Your Assigned Stage"
                      ></span>
                    )}
                    {(roleLocked || noWorker) && (
                      <span className="mr-0.5 text-[9px]">🔒</span>
                    )}
                    {stage}
                  </button>
                );
              })}
            </div>

            {/* Custom Stage Input Removed */}
          </div>

          <div className="grid grid-cols-1 gap-8 pt-4">
            <div
              className="flex flex-col gap-2 relative w-full"
              ref={skuModalRef}
            >
              <div className="flex items-center justify-between">
                <label
                  className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
                  style={{ color: "#4a3a2a" }}
                >
                  <Ruler className="w-4 h-4" style={{ color: "#c8834a" }} />{" "}
                  Garment SKU (Color / Size) *
                </label>
                <button
                  type="button"
                  onClick={() => setSkuRefreshKey((k) => k + 1)}
                  className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                  style={{
                    color: "#c8834a",
                    background: "rgba(200,131,74,0.08)",
                    border: "1px solid rgba(200,131,74,0.2)",
                  }}
                >
                  {skusLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    "Refresh"
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsSkuOpen(!isSkuOpen);
                  if (!isSkuOpen) setSkuSearchQuery("");
                }}
                className="w-full h-14 px-4 bg-white font-bold border-2 rounded-xl border-[#c8834a]/30 hover:border-[#c8834a] shadow-sm text-sm transition-all flex items-center justify-between text-left cursor-pointer"
              >
                <span
                  className={
                    currentSelectedSku
                      ? "text-slate-900 font-extrabold text-left break-words whitespace-normal"
                      : "text-slate-400"
                  }
                >
                  {currentSelectedSku
                    ? `[Order #${currentSelectedSku.order_number || "N/A"}] ${currentSelectedSku.label || `${currentSelectedSku.style_name || ""} · ${currentSelectedSku.color_code || ""} · ${currentSelectedSku.size}`}`
                    : "-- Select / Search Garment SKU --"}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-[#c8834a] transition-transform duration-200 shrink-0 ml-2 ${isSkuOpen ? "rotate-180" : ""}`}
                />
              </button>

              {isSkuOpen && (
                <div className="absolute z-[999] top-full mt-2 left-0 w-full bg-white border-2 border-[#c8834a] rounded-2xl shadow-2xl p-3 space-y-3 animate-fade-in">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Type Style, SKU, Order No, or Color..."
                      value={skuSearchQuery}
                      onChange={(e) => setSkuSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.preventDefault();
                      }}
                      className="w-full h-11 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#c8834a]/30 focus:border-[#c8834a]"
                      autoFocus
                    />
                  </div>

                  <div
                    className="max-h-56 overflow-y-auto pr-1"
                    onScroll={(e) => {
                      const bottom =
                        e.target.scrollHeight - e.target.scrollTop <=
                        e.target.clientHeight + 50;
                      if (bottom && visibleCount < searchFilteredSkus.length) {
                        setVisibleCount((prev) => prev + 60);
                      }
                    }}
                  >
                    {skusLoading ? (
                      <div className="p-6 flex flex-col items-center gap-2">
                        <Loader2 className="w-5 h-5 text-[#c8834a] animate-spin" />
                        <span className="text-xs font-bold text-slate-400">
                          Loading SKUs...
                        </span>
                      </div>
                    ) : searchFilteredSkus.length > 0 ? (
                      <>
                        {searchFilteredSkus
                          .slice(0, visibleCount)
                          .map((s, idx) => {
                            const isSelected = skuCode === s.code;
                            return (
                              <button
                                key={s.code}
                                type="button"
                                onClick={() => {
                                  setSkuCode(s.code);
                                  setIsSkuOpen(false);
                                }}
                                className={`w-full p-3 text-left transition-colors rounded-xl flex items-center justify-between text-xs font-bold my-1 cursor-pointer border ${
                                  isSelected
                                    ? "bg-[#c8834a] text-white border-[#c8834a] shadow-sm"
                                    : "hover:bg-amber-50/60 text-slate-800 border-transparent"
                                }`}
                              >
                                <div className="pr-2 break-words whitespace-normal text-left flex flex-col gap-0.5">
                                  {isSelected && (
                                    <span className="text-[9px] font-black uppercase tracking-wider text-amber-200">
                                      ★ Current Active Style
                                    </span>
                                  )}
                                  <span>
                                    {s.order_number || "N/A"} ·{" "}
                                    {s.label ||
                                      `${s.style_name || ""} · ${s.color_code || ""} · ${s.size}`}
                                  </span>
                                </div>
                                {isSelected && (
                                  <span className="font-black text-sm shrink-0">
                                    ✓
                                  </span>
                                )}
                              </button>
                            );
                          })}
                      </>
                    ) : (
                      <div className="p-4 text-center text-xs font-bold text-slate-400">
                        No SKU matches "{skuSearchQuery}"
                      </div>
                    )}
                  </div>
                </div>
              )}

              {currentSelectedSku && (
                <div className="mt-1 px-4 py-2.5 bg-[#faf6f0] border border-[#c8834a]/20 rounded-xl flex items-center justify-between shadow-sm animate-fade-in">
                  <span className="text-xs font-bold text-[#9a7a5a] uppercase tracking-wider flex items-center gap-1.5">
                    Target Quantity
                  </span>
                  <span className="text-sm font-black text-[#c8834a]">
                    {currentSelectedSku.qty_ordered || 0} pcs
                  </span>
                </div>
              )}

              {/* Duplicate-submit guard visual cue (Barcode Gun Scanner parity) */}
              {(selectedStage === "Cutting" || selectedStage === "Lining") &&
                alreadyCutCount > 0 && (
                  <div className="mt-1 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between shadow-sm animate-fade-in">
                    <span className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" /> Already Logged (
                      {selectedStage})
                    </span>
                    <span className="text-sm font-black text-amber-700">
                      {alreadyCutCount} pcs
                    </span>
                  </div>
                )}
            </div>
          </div>
        </div>

        {/* STEP 3: Quantities & Submission */}
        <div
          className="space-y-6 p-6 rounded-2xl shadow-sm relative overflow-hidden"
          style={{
            background: "#fcfaf8",
            border: "1px solid rgba(200,131,74,0.1)",
          }}
        >
          <div
            className="absolute top-0 left-0 w-1 h-full"
            style={{ background: "#c8834a" }}
          ></div>
          <h3
            className="text-sm font-black uppercase tracking-widest pb-3 flex items-center gap-2"
            style={{
              color: "#2d1f0e",
              borderBottom: "1px solid rgba(200,131,74,0.1)",
            }}
          >
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
              style={{ background: "rgba(200,131,74,0.15)", color: "#c8834a" }}
            >
              3
            </span>
            Quantities &amp; Submission ({selectedStage})
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {selectedStage === "Cutting" || selectedStage === "Lining" ? (
              <div className="flex flex-col gap-3 md:col-span-2 space-y-4">
                <div>
                  <label
                    htmlFor="cutting-count-input"
                    className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-2"
                  >
                    <Scissors className="w-4 h-4 text-amber-600" /> Cut Piece
                    Count (Total Quantity) *
                  </label>
                  <p className="text-[10px] text-slate-500 mb-2">
                    Enter the exact total number of cut pieces for this SKU
                    bundle block creation.
                  </p>
                  <input
                    type="number"
                    id="cutting-count-input"
                    placeholder="e.g. 50"
                    value={cuttingCount}
                    onChange={(e) => setCuttingCount(e.target.value)}
                    className="input-field w-full sm:w-1/2 h-14 px-4 bg-white font-black text-xl border-2 border-slate-200 focus:border-[#c8834a] shadow-sm transition-all rounded-xl outline-none"
                    required
                    min="1"
                  />
                </div>

                {(selectedStage === "Cutting" ||
                  selectedStage === "Lining") && (
                  <div className="space-y-4 pt-4 border-t border-slate-200">
                    <div>
                      <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-2">
                        <Scissors className="w-4 h-4 text-[#c8834a]" /> Total
                        Cut Area (DCM) / Count *
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="Enter DCM value or Cut Piece count (e.g. 45)..."
                        value={barcodeDcm}
                        onChange={(e) => setBarcodeDcm(e.target.value)}
                        className="input-field w-full sm:w-1/2 h-14 px-4 bg-white font-black text-xl border-2 border-slate-200 focus:border-[#c8834a] shadow-sm rounded-xl outline-none transition-all"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-600 uppercase">
                          {selectedStage === "Lining" ? "Lining" : "Leather"}{" "}
                          Article *
                        </label>
                        <select
                          value={lotArticle}
                          onChange={(e) => {
                            setLotArticle(e.target.value);
                            setLotColor("");
                            setLotThickness("");
                          }}
                          className="w-full h-12 px-3 bg-white border-2 border-slate-200 focus:border-[#c8834a] rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
                        >
                          <option value="">-- Select Article --</option>
                          {lotOptions.article?.map((a) => (
                            <option key={a} value={a}>
                              {a}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-600 uppercase">
                          {selectedStage === "Lining" ? "Lining" : "Leather"}{" "}
                          Colour *
                        </label>
                        <select
                          value={lotColor}
                          onChange={(e) => {
                            setLotColor(e.target.value);
                            setLotThickness("");
                          }}
                          className="w-full h-12 px-3 bg-white border-2 border-slate-200 focus:border-[#c8834a] rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
                        >
                          <option value="">-- Select Color --</option>
                          {lotOptions.colour?.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                      {/* Bug #9/#10: Thickness is optional and a free-text input, not a mandatory dropdown */}
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-600 uppercase flex items-center justify-between">
                          <span>Thickness</span>
                          <span className="text-[10px] text-slate-400 font-bold lowercase">
                            (optional)
                          </span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 1.2mm, 0.8mm..."
                          value={lotThickness}
                          onChange={(e) => setLotThickness(e.target.value)}
                          className="w-full h-12 px-3 bg-white border-2 border-slate-200 focus:border-[#c8834a] rounded-xl text-xs font-bold text-slate-700 outline-none"
                        />
                      </div>
                    </div>

                    {/* Lot Status Indicator — Bug #9: Thickness is optional, so this must not wait on it */}
                    {lotArticle && lotColor && (
                      <div
                        className={`p-4 rounded-xl border flex items-center justify-between ${lotResults.length === 1 && lotResults[0].covers_required !== false ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}
                      >
                        <div>
                          <div className="text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
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
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3 md:col-span-2">
                <div className="flex justify-between items-end">
                  <label
                    htmlFor="piece-seq-input"
                    className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4 text-emerald-500" /> Piece Numbers
                    (Sequence) *
                  </label>
                  <button
                    type="button"
                    onClick={openChecklistModal}
                    className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                    style={{
                      background: "linear-gradient(135deg, #c8834a, #e8a06a)",
                      color: "#fff",
                    }}
                  >
                    <ListChecks className="w-3.5 h-3.5" /> Select from Checklist
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 -mt-2">
                  Enter numbers separated by commas or ranges (e.g. 1, 2, 5-8),
                  or use the checklist.
                </p>
                <div className="flex flex-col sm:flex-row items-stretch gap-4">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      id="piece-seq-input"
                      placeholder="e.g. 1, 2, 5-8"
                      value={pieceSeqs}
                      onChange={(e) => setPieceSeqs(e.target.value)}
                      className="input-field w-full h-14 px-4 bg-white font-black text-xl text-emerald-700 border-2 border-slate-200 focus:border-emerald-500 shadow-sm transition-all rounded-xl outline-none"
                    />
                  </div>
                  <div className="flex gap-2 w-1/4">
                    <button
                      type="button"
                      onClick={() => setPieceSeqs("")}
                      className="flex-1 h-14 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-black text-sm rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label
                htmlFor="date-input"
                className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"
              >
                <Calendar className="w-4 h-4 text-emerald-500" /> Transaction
                Date *
              </label>
              <input
                type="date"
                id="date-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input-field h-14 bg-white font-bold border-2 border-slate-200 shadow-sm px-4 rounded-xl outline-none"
                required
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="pt-4 flex flex-col gap-3">
          <div className="flex gap-3 w-full">
            <button
              type="button"
              onClick={() => {
                setPieceSeqs("");
                setSkuCode("");
                setCuttingCount("");
              }}
              className="flex-1 h-14 font-bold rounded-xl text-base transition-all cursor-pointer active:scale-95"
              style={{ background: "rgba(200,131,74,0.1)", color: "#c8834a" }}
            >
              Reset All
            </button>

            <button
              type="submit"
              disabled={
                isSavingCutting ||
                checklistSubmitting ||
                (selectedStage === "Cutting" &&
                  (lotResults.length !== 1 ||
                    lotResults[0].covers_required === false))
              }
              className="flex-1 h-14 font-black rounded-xl text-base shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-40"
              style={{
                background: "linear-gradient(135deg, #c8834a, #e8a06a)",
                color: "#0f0a06",
              }}
            >
              <Rocket className="w-5 h-5" /> Submit Event
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              if (!currentSelectedSku) return;
              setShowAnalyticsModal(true);
            }}
            className="text-xs font-black px-4 py-2 rounded-xl transition-all hover:bg-slate-100 flex items-center justify-center sm:justify-start gap-1.5"
            style={{ color: "#c8834a" }}
          >
            <BarChart3 className="w-4 h-4" />
            View Analytics{" "}
            {currentSelectedSku
              ? `for ${currentSelectedSku.style_name || skuCode}`
              : "Page"}
          </button>
        </div>
      </form>
      </>
    )
}