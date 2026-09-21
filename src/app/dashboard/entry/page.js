// production logger main file 
"use client";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useSelector, useDispatch } from 'react-redux';
import {
  setActiveDoor, setDate,
  setMessages, setBarcodeWorker as reduxSetBarcodeWorker,
  setBarcodeStage as reduxSetBarcodeStage, setLotDetails
} from '@/store/slices/entrySlice';
import {
  useLazyBarcodeResolveQuery,
  useLazyGetBarcodeOrdersQuery,
  useDeleteProductionEventMutation
} from "@/store/slices/apiSlice";
import { useGetEmployeesQuery } from '@/store/slices/adminApiSlice';
import {
  Lock,
  CheckCircle2,
  XCircle,
  Users,
  FileSpreadsheet,
  X,
  Barcode,
  Loader2,
  Store,
} from "lucide-react";
import SpotlightCard from "@/components/SpotlightCard";
import {
  useRoleAccess,
  CameraScannerModal,
} from "./shared";
import dynamic from "next/dynamic";
import DynamicDataViewer from "./components/DynamicDataViewer";
import BucketResultModal from "./components/BucketResultModal";
import OrderNumberModal from "./components/OrderNumberModal";
import { ExcelPreviewModal, CommitConfirmationModal } from "./components/ImportPreviewModal";
import { useWorkerVerification } from "./hooks/useWorkerVerification";
import { useBreakdownImport } from "./hooks/useBreakdownImport";

const BarcodeDoorSection = dynamic(
  () => import("./BarcodeSection/BarcodeDoorSection"),
);
const ManualDoorSection = dynamic(
  () => import("./ManualSection/ManualDoorSection"),
);
const StoreHubSection = dynamic(() => import("./StoreSection/StoreHubSection"));
const BreakdownReviewBody = dynamic(
  () => import("../imports/BreakdownReviewBody"),
);
const CuttingSheetSection = dynamic(
  () => import("./components/CuttingSheetSection"),
);


export default function ProductionLogEntry() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, token } = useAuth();
  const { data: workers = [] } = useGetEmployeesQuery();
  const {
    isReadOnly,
    isFullAccess,
    isStoreAccess,
    allowedOperations,
    isStageAllowedForRole,
  } = useRoleAccess();


  const [storeSendedSkus, setStoreSendedSkus] = useState([]);
  const [cameraScanTarget, setCameraScanTarget] = useState(null); // null | 'sku' | 'worker'
  const dispatch = useDispatch();
  const [triggerBarcodeResolve] = useLazyBarcodeResolveQuery();
  const [triggerGetBarcodeOrders] = useLazyGetBarcodeOrdersQuery();
  const [deleteProductionEvent] = useDeleteProductionEventMutation();
  const [testDeleteId, setTestDeleteId] = useState('');

  const date = useSelector(state => state.entry.date);
  const activeDoor = useSelector(state => state.entry.activeDoor);

  const handleSetDate = (newDate) => dispatch(setDate(newDate));
  const handleSetActiveDoor = (door) => dispatch(setActiveDoor(door));

  const [breakdownOrders, setBreakdownOrders] = useState([]);
  const [breakdownOrdersLoading, setBreakdownOrdersLoading] = useState(false);
  const [breakdownOrderSearch, setBreakdownOrderSearch] = useState("");

  const [selectedBreakdownOrder, setSelectedBreakdownOrder] = useState(
    searchParams.get("door") === "breakdown"
      ? searchParams.get("order") || null
      : null,
  ); // order_number | null — set = show the detail/release screen inline, unset = show the list
  // REDUX DATA PULL & ACTION WRAPPERS
  const successMsg = useSelector(state => state.entry.successMsg);
  const errorMsg = useSelector(state => state.entry.errorMsg);
  const barcodeWorker = useSelector(state => state.entry.barcodeWorker);
  const barcodeStage = useSelector(state => state.entry.barcodeStage);
  const lotArticle = useSelector(state => state.entry.lotArticle);
  const lotColor = useSelector(state => state.entry.lotColor);
  const lotThickness = useSelector(state => state.entry.lotThickness);
  const lotResults = useSelector(state => state.entry.lotResults);

  const setSuccessMsg = (msg) => dispatch(setMessages({ success: msg }));
  const setErrorMsg = (msg) => dispatch(setMessages({ error: msg }));
  const setBarcodeWorker = (worker) => dispatch(reduxSetBarcodeWorker(worker));
  const setBarcodeStage = (stage) => dispatch(reduxSetBarcodeStage(stage));

  const setLotArticle = (val) => dispatch(setLotDetails({ article: val }));
  const setLotColor = (val) => dispatch(setLotDetails({ color: val }));
  const setLotThickness = (val) => dispatch(setLotDetails({ thickness: val }));
  const setLotResults = (val) => dispatch(setLotDetails({ results: val }));
  const [barcodeDcm, setBarcodeDcm] = useState("");

  const {
    barcodeWorkerInput,
    setBarcodeWorkerInput,
    barcodeWorkerChecking,
    barcodeNotCheckedInModal,
    setBarcodeNotCheckedInModal,
    workerInputRef,
    handleVerifyBarcodeWorker,
  } = useWorkerVerification({
    workers,
    token,
    triggerBarcodeResolve,
    setBarcodeWorker,
    setErrorMsg,
    setSuccessMsg,
  });



  const [lotOptions, setLotOptions] = useState({
    article: [],
    colour: [],
    thickness: [],
    size: [],
  });
  //const [lotResults, setLotResults] = useState([]);
  const [lotLoading, setLotLoading] = useState(false);
  const [lotCategory, setLotCategory] = useState("LEATHER"); // LEATHER or LINING
  const [bucketResult, setBucketResult] = useState(null);
  const [showBucketModal, setShowBucketModal] = useState(false);

  const [completedStagesMap, setCompletedStagesMap] = useState({});
  const [storeReceiveStatus, setStoreReceiveStatus] = useState("pending"); // 'pending', 'received', 'sended'

  const {
    fileInputRef,
    uploadLoading,
    showPreviewModal,
    setShowPreviewModal,
    previewData,
    fileName,
    commitLoading,
    commitSuccess,
    setCommitSuccess,
    uploadError,
    setUploadError,
    showCommitConfirmation,
    setShowCommitConfirmation,
    commitResult,
    setCommitResult,
    pendingBreakdownOrder,
    setPendingBreakdownOrder,
    showOrderNumModal,
    setShowOrderNumModal,
    uploadOrderNumber,
    setUploadOrderNumber,
    uploadOrderNumberError,
    setUploadOrderNumberError,
    handleFileUpload,
    handleCommit,
  } = useBreakdownImport({ token });

  const [mounted, setMounted] = useState(false);
  // const workerInputRef = useRef(null);

  // Reset worker verification state when navigating between doors/tabs so each slide requires a fresh scan
  useEffect(() => {
    setBarcodeWorker(null);
    setBarcodeWorkerInput("");
    setBarcodeNotCheckedInModal(null);
    setErrorMsg("");
  }, [activeDoor]);

  const recordStageCompletion = (stage, pieceOrSkuKey) => {
    if (!stage || !pieceOrSkuKey) return;
    const rawKey = String(pieceOrSkuKey).toUpperCase().trim();
    if (!rawKey) return;

    setCompletedStagesMap((prev) => {
      const next = { ...prev };
      const set1 = next[rawKey] ? new Set(next[rawKey]) : new Set();
      set1.add(stage);
      next[rawKey] = set1;
      return next;
    });
  };

  useEffect(() => {
    if (activeDoor === "store" && !isFullAccess && !isStoreAccess) {
      handleSetActiveDoor("manual");
    }
  }, [activeDoor, isFullAccess, isStoreAccess]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Keeps the URL in sync with the Breakdown tab/order so a refresh restores
  // the exact same screen instead of dumping the operator back to Manual
  // Logger. replace (not push) — this mirrors state, it isn't a new page.
  useEffect(() => {
    if (activeDoor !== "breakdown") {
      if (searchParams.get("door") === "breakdown")
        router.replace("/dashboard/entry", { scroll: false });
      return;
    }
    const params = new URLSearchParams();
    params.set("door", "breakdown");
    if (selectedBreakdownOrder) params.set("order", selectedBreakdownOrder);
    router.replace(`/dashboard/entry?${params.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDoor, selectedBreakdownOrder, router]);

  // Refetches every time the list view is actually landed on — first visit,
  // coming back via "Back to Breakdown Review", or after a fresh commit
  // redirects here — instead of once ever. A stale one-time fetch was
  // hiding orders committed after that first load (they'd never appear
  // until a full page reload).
  useEffect(() => {
    if (activeDoor !== "breakdown" || selectedBreakdownOrder || !token) return;
    setBreakdownOrdersLoading(true);
    triggerGetBarcodeOrders().unwrap()
      .then((data) =>
        setBreakdownOrders(Array.isArray(data) ? data : data?.items || []),
      )
      .catch(() => setBreakdownOrders([]))
      .finally(() => setBreakdownOrdersLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDoor, selectedBreakdownOrder, token]);

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(""), 2000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  useEffect(() => {
    if (commitSuccess) {
      const timer = setTimeout(() => setCommitSuccess(""), 2000);
      return () => clearTimeout(timer);
    }
  }, [commitSuccess]);

  useEffect(() => {
    if (errorMsg || uploadError) {
      const timer = setTimeout(() => {
        setErrorMsg("");
        setUploadError("");
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg, uploadError]);

  // Dynamic Material Lots Fetcher

  // NOTE: the "Dynamic Material Lots Fetcher" effect that lived here in the
  // original file was split into two door-local copies (inside
  // BarcodeDoorSection.js and ManualDoorSection.js) instead of staying here —
  // it needs each door's own local state (selectedStage/skuCode/cuttingCount
  // for Manual, barcodeStage/barcodeSelectedSku/barcodePieceInput for
  // Barcode), which page.js no longer has direct access to post-split. Both
  // copies write into this shared lot state via the setters passed down.

  if (isReadOnly) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in pt-12 text-center">
        <div className="card p-8 bg-white border border-red-100 shadow-xl space-y-4">
          <Lock className="w-14 h-14 text-red-400 mx-auto" />
          <h1 className="text-2xl font-black text-slate-800">
            Access Restricted
          </h1>
          <p className="text-slate-500 font-medium">
            Your active persona does not have write access to the shop floor
            ledger.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-8 animate-fade-in pb-12">
      {/* TEMP TEST DELETE API */}
      <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-4">
        <span className="font-bold text-rose-800 text-sm">Test Delete API (§0.10):</span>
        <input
          type="text"
          placeholder="Enter event ID (e.g. evt_123)"
          className="border border-rose-300 rounded-md px-3 py-1 text-sm outline-none w-64"
          value={testDeleteId}
          onChange={(e) => setTestDeleteId(e.target.value)}
        />
        <button
          onClick={async () => {
            if (!testDeleteId) return;
            try {
              await deleteProductionEvent(testDeleteId).unwrap();
              alert("✅ Delete success! Event ID: " + testDeleteId);
            } catch (err) {
              alert("❌ Delete failed: " + (err.data?.detail || err.message || "Error"));
            }
          }}
          className="bg-rose-600 text-white px-4 py-1.5 rounded-md text-sm font-bold hover:bg-rose-700"
        >
          Fire DELETE
        </button>
      </div>

      {/* TITLE SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-3xl font-black tracking-tight"
            style={{ color: "#2d1f0e" }}
          >
            Shop Floor Production Logger
          </h1>
          <p className="font-medium mt-1" style={{ color: "#9a7a5a" }}>
            Record work bundles completed by operators. Touch-friendly screens
            optimized for fast, accurate floor entry.
          </p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xlsm,.xls"
            onChange={handleFileUpload}
            className="hidden"
            id="entry-file-upload"
          />
          <button
            type="button"
            onClick={() => {
              setUploadOrderNumberError("");
              setShowOrderNumModal(true);
            }}
            disabled={uploadLoading}
            className="h-12 py-0 px-5 flex items-center gap-2 font-bold text-sm rounded-xl transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            style={{
              background: "transparent",
              border: "1px solid #c8834a",
              color: "#c8834a",
            }}
          >
            {uploadLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Previewing...
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-4 h-4" /> Upload Breakdown Sheet
              </>
            )}
          </button>
        </div>
      </div>

      {/* BOTTOM-RIGHT TOAST NOTIFICATION */}
      {typeof window !== "undefined" &&
        createPortal(
          <div className="fixed bottom-6 right-4 sm:right-6 z-[9999999] flex flex-col items-end gap-3 pointer-events-none max-w-sm w-full">
            {/* Success Toast */}
            {successMsg && (
              <div className="bg-slate-900/95 text-white border-2 border-emerald-500/50 p-4 rounded-3xl shadow-2xl animate-fade-in flex items-center justify-between gap-3 pointer-events-auto backdrop-blur-xl">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-emerald-400 text-xs uppercase tracking-wider">
                      Transaction Confirmed
                    </p>
                    <p className="text-xs font-semibold text-slate-200 mt-0.5 break-words line-clamp-3">
                      {successMsg}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSuccessMsg("")}
                  className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Commit Success Toast */}
            {commitSuccess && (
              <div className="bg-slate-900/95 text-white border-2 border-emerald-500/50 p-4 rounded-3xl shadow-2xl animate-fade-in flex items-center justify-between gap-3 pointer-events-auto backdrop-blur-xl">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-emerald-400 text-xs uppercase tracking-wider">
                      Import Successful
                    </p>
                    <p className="text-xs font-semibold text-slate-200 mt-0.5 break-words line-clamp-3">
                      {commitSuccess}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCommitSuccess("")}
                  className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Error Toast */}
            {(errorMsg || uploadError) && (
              <div className="bg-slate-900/95 text-white border-2 border-rose-500/50 p-4 rounded-3xl shadow-2xl animate-fade-in flex items-center justify-between gap-3 pointer-events-auto backdrop-blur-xl">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/20 flex items-center justify-center shrink-0">
                    <XCircle className="w-6 h-6 text-rose-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-rose-400 text-xs uppercase tracking-wider">
                      Operation Failed
                    </p>
                    <p className="text-xs font-semibold text-slate-200 mt-0.5 break-words line-clamp-3">
                      {errorMsg || uploadError}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg("");
                    setUploadError("");
                  }}
                  className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>,
          document.body,
        )}

      {/* MOBILE CAMERA BARCODE SCANNER MODAL — worker-verify case only.
          The 'sku' and 'store' cases now render their own instance locally
          inside BarcodeDoorSection.js / StoreHubSection.js — this one shared
          instance can't reach into their local state anymore post-split. */}
      {cameraScanTarget === "worker" && (
        <CameraScannerModal
          title="Scan Worker Barcode"
          onClose={() => setCameraScanTarget(null)}
          onScan={(scannedCode) => {
            const cleanCode = String(scannedCode || "")
              .replace(/[\r\n]+/g, "")
              .trim();
            if (!cleanCode) return;
            setBarcodeWorkerInput(cleanCode);
            setTimeout(() => handleVerifyBarcodeWorker(cleanCode), 50);
          }}
        />
      )}

      {/* TOP TAB BAR (MATCHING ATTENDANCE PAGE STYLE) */}
      <div
        className="flex items-center gap-1 border-b overflow-x-auto"
        style={{ borderBottomColor: "rgba(200,131,74,0.2)" }}
      >
        <button
          type="button"
          onClick={() => handleSetActiveDoor("manual")}
          className="flex items-center gap-2 px-5 py-3.5 text-xs font-black whitespace-nowrap border-b-2 transition-colors cursor-pointer"
          style={{
            borderColor: activeDoor === "manual" ? "#c8834a" : "transparent",
            color: activeDoor === "manual" ? "#c8834a" : "#9a7a5a",
          }}
        >
          <Users className="w-4 h-4" />
          Manual Logger
        </button>
        <button
          type="button"
          onClick={() => handleSetActiveDoor("barcode")}
          className="flex items-center gap-2 px-5 py-3.5 text-xs font-black whitespace-nowrap border-b-2 transition-colors cursor-pointer"
          style={{
            borderColor: activeDoor === "barcode" ? "#c8834a" : "transparent",
            color: activeDoor === "barcode" ? "#c8834a" : "#9a7a5a",
          }}
        >
          <Barcode className="w-4 h-4" />
          Barcode Gun Scanner
        </button>
        {isStoreAccess && (
          <button
            type="button"
            onClick={() => handleSetActiveDoor("store")}
            className="flex items-center gap-2 px-5 py-3.5 text-xs font-black whitespace-nowrap border-b-2 transition-colors cursor-pointer"
            style={{
              borderColor: activeDoor === "store" ? "#c8834a" : "transparent",
              color: activeDoor === "store" ? "#c8834a" : "#9a7a5a",
            }}
          >
            <Store className="w-4 h-4" />✨ Store Manager Hub
          </button>
        )}
        <button
          type="button"
          onClick={() => handleSetActiveDoor("breakdown")}
          className="flex items-center gap-2 px-5 py-3.5 text-xs font-black whitespace-nowrap border-b-2 transition-colors cursor-pointer"
          style={{
            borderColor: activeDoor === "breakdown" ? "#c8834a" : "transparent",
            color: activeDoor === "breakdown" ? "#c8834a" : "#9a7a5a",
          }}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Breakdown Review
        </button>
        <button
          type="button"
          onClick={() => handleSetActiveDoor("cutting-sheet")}
          className="flex items-center gap-2 px-5 py-3.5 text-xs font-black whitespace-nowrap border-b-2 transition-colors cursor-pointer"
          style={{
            borderColor: activeDoor === "cutting-sheet" ? "#c8834a" : "transparent",
            color: activeDoor === "cutting-sheet" ? "#c8834a" : "#9a7a5a",
          }}
        >
          <span role="img" aria-label="scissors">✂️</span> Cutting Sheet
        </button>
      </div>

      {activeDoor === "cutting-sheet" && (
        <CuttingSheetSection />
      )}

      {/* LOGGING FORM CARD */}
      {["manual", "barcode", "breakdown"].includes(activeDoor) && (
        <SpotlightCard
          className="p-4 sm:p-8 bg-white shadow-xl space-y-8 rounded-3xl"
          style={{ border: "1px solid rgba(200,131,74,0.15)" }}
          spotlightColor="rgba(200,131,74,0.06)"
        >
          <div
            className="p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
            style={{
              background: "#faf6f0",
              border: "1px solid rgba(200,131,74,0.25)",
            }}
          >
            <div
              className="text-xs font-bold flex items-center gap-2"
              style={{ color: "#4a3a2a" }}
            >
              <span>Logged By: </span>
              <span
                className="text-white px-2.5 py-1 rounded-lg font-black uppercase tracking-wider text-[11px] shadow-sm"
                style={{ background: "#c8834a" }}
              >
                {user.replace("_", " ")}
              </span>
            </div>


          </div>

          {/* TAB 2: DEDICATED BARCODE GUN SCANNER FLOW (CONTRACT V3.0) */}
          {activeDoor === "barcode" && (
            <BarcodeDoorSection
              setSuccessMsg={setSuccessMsg}
              setErrorMsg={setErrorMsg}
              recordStageCompletion={recordStageCompletion}
              completedStagesMap={completedStagesMap}
              storeSendedSkus={storeSendedSkus}
              date={date}
              barcodeStage={barcodeStage}
              setBarcodeStage={setBarcodeStage}
              lotArticle={lotArticle}
              setLotArticle={setLotArticle}
              lotColor={lotColor}
              setLotColor={setLotColor}
              lotThickness={lotThickness}
              setLotThickness={setLotThickness}
              lotOptions={lotOptions}
              setLotOptions={setLotOptions}
              lotResults={lotResults}
              setLotResults={setLotResults}
              lotLoading={lotLoading}
              setLotLoading={setLotLoading}
              lotCategory={lotCategory}
              setLotCategory={setLotCategory}
              barcodeDcm={barcodeDcm}
              setBarcodeDcm={setBarcodeDcm}
              setBucketResult={setBucketResult}
              setShowBucketModal={setShowBucketModal}
              barcodeWorker={barcodeWorker}
              setBarcodeWorker={setBarcodeWorker}
              barcodeWorkerInput={barcodeWorkerInput}
              setBarcodeWorkerInput={setBarcodeWorkerInput}
              barcodeWorkerChecking={barcodeWorkerChecking}
              handleVerifyBarcodeWorker={handleVerifyBarcodeWorker}
              barcodeNotCheckedInModal={barcodeNotCheckedInModal}
              setBarcodeNotCheckedInModal={setBarcodeNotCheckedInModal}
              workerInputRef={workerInputRef}
              cameraScanTarget={cameraScanTarget}
              setCameraScanTarget={setCameraScanTarget}
            />
          )}
          {activeDoor === "manual" && (
            <ManualDoorSection
              activeDoor={activeDoor}
              setSuccessMsg={setSuccessMsg}
              setErrorMsg={setErrorMsg}
              recordStageCompletion={recordStageCompletion}
              date={date}
              setDate={handleSetDate}
              storeSendedSkus={storeSendedSkus}
              storeReceiveStatus={storeReceiveStatus}
              lotArticle={lotArticle}
              setLotArticle={setLotArticle}
              lotColor={lotColor}
              setLotColor={setLotColor}
              lotThickness={lotThickness}
              setLotThickness={setLotThickness}
              lotOptions={lotOptions}
              setLotOptions={setLotOptions}
              lotResults={lotResults}
              setLotResults={setLotResults}
              lotLoading={lotLoading}
              setLotLoading={setLotLoading}
              setLotCategory={setLotCategory}
              barcodeDcm={barcodeDcm}
              setBarcodeDcm={setBarcodeDcm}
              setBucketResult={setBucketResult}
              setShowBucketModal={setShowBucketModal}
              mounted={mounted}
            />
          )}

          {/* Team request: a permanent, browsable Breakdown Review entry
            point — not only the redirect right after a fresh upload — and
            fully inline (no navigation to /dashboard/imports): picking an
            order (or landing here straight from a fresh commit) shows the
            exact same review/release screen right in this tab; "Back"
            just clears the selection and returns to the list below. */}
          {activeDoor === "breakdown" &&
            (selectedBreakdownOrder ? (
              <BreakdownReviewBody
                initialOrderNumber={selectedBreakdownOrder}
                onBack={() => setSelectedBreakdownOrder(null)}
                backLabel="Back to Breakdown Review"
                onBackToProduction={() => {
                  setSelectedBreakdownOrder(null);
                  setActiveDoor("manual");
                }}
              />
            ) : (
              <div className="space-y-5 animate-fade-in">
                <div>
                  <h3
                    className="text-lg font-black flex items-center gap-2"
                    style={{ color: "#2d1f0e" }}
                  >
                    <FileSpreadsheet
                      className="w-5 h-5"
                      style={{ color: "#c8834a" }}
                    />{" "}
                    Breakdown Review
                  </h3>
                  <p
                    className="text-xs font-bold mt-1"
                    style={{ color: "#9a7a5a" }}
                  >
                    Pick an order to review its DRAFT styles, correct SKU lines,
                    and release into production.
                  </p>
                </div>
                <input
                  type="text"
                  value={breakdownOrderSearch}
                  onChange={(e) => setBreakdownOrderSearch(e.target.value)}
                  placeholder="Search order number…"
                  className="w-full h-12 px-4 bg-[#faf6f0] font-bold text-sm border rounded-xl outline-none focus:border-[#c8834a]"
                  style={{ borderColor: "rgba(200,131,74,0.2)" }}
                />
                {breakdownOrdersLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2
                      className="w-6 h-6 animate-spin"
                      style={{ color: "#c8834a" }}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[28rem] overflow-y-auto pr-1">
                    {breakdownOrders
                      .filter(
                        (o) =>
                          o.order_number
                            ?.toLowerCase()
                            .includes(breakdownOrderSearch.toLowerCase()) ||
                          o.client_name
                            ?.toLowerCase()
                            .includes(breakdownOrderSearch.toLowerCase()),
                      )
                      .map((o) => (
                        <div
                          key={o.order_id}
                          onClick={() =>
                            setSelectedBreakdownOrder(o.order_number)
                          }
                          className="p-4 bg-white rounded-xl border hover:border-[#c8834a] hover:shadow-md cursor-pointer transition-all group flex flex-col justify-between"
                          style={{ borderColor: "rgba(200,131,74,0.15)" }}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span
                              className="text-xs font-black px-2 py-1 bg-[#faf6f0] rounded-md"
                              style={{ color: "#c8834a" }}
                            >
                              {o.order_number}
                            </span>
                          </div>
                          <div>
                            <p
                              className="text-sm font-bold"
                              style={{ color: "#4a3a2a" }}
                            >
                              {o.client_name}
                            </p>
                          </div>
                        </div>
                      ))}
                    {!breakdownOrdersLoading && breakdownOrders.length === 0 && (
                      <p
                        className="col-span-full text-center text-xs font-bold py-10"
                        style={{ color: "#9a7a5a" }}
                      >
                        No orders found.
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
        </SpotlightCard>
      )}
      {/* EXCEL IMPORT PREVIEW MODAL */}
      <ExcelPreviewModal
        mounted={mounted}
        showPreviewModal={showPreviewModal}
        setShowPreviewModal={setShowPreviewModal}
        fileName={fileName}
        previewData={previewData}
        handleCommit={handleCommit}
        commitLoading={commitLoading}
        uploadError={uploadError}
      />

      {/* COMMIT CONFIRMATION MODAL */}
      <CommitConfirmationModal
        mounted={mounted}
        showCommitConfirmation={showCommitConfirmation}
        setShowCommitConfirmation={setShowCommitConfirmation}
        fileName={fileName}
        commitResult={commitResult}
        pendingBreakdownOrder={pendingBreakdownOrder}
        setSelectedBreakdownOrder={setSelectedBreakdownOrder}
        setPendingBreakdownOrder={setPendingBreakdownOrder}
        setCommitResult={setCommitResult}
        handleSetActiveDoor={handleSetActiveDoor}
      />


      {/* ORDER NUMBER MODAL */}
      <OrderNumberModal
        mounted={mounted}
        showOrderNumModal={showOrderNumModal}
        setShowOrderNumModal={setShowOrderNumModal}
        uploadOrderNumber={uploadOrderNumber}
        setUploadOrderNumber={setUploadOrderNumber}
        uploadOrderNumberError={uploadOrderNumberError}
        setUploadOrderNumberError={setUploadOrderNumberError}
        uploadLoading={uploadLoading}
        fileInputRef={fileInputRef}
      />


      {/* PARTIAL-ACCEPT BUCKET RESULTS MODAL (Contract v3.0) */}
      <BucketResultModal
        mounted={mounted}
        showBucketModal={showBucketModal}
        bucketResult={bucketResult}
        onClose={() => setShowBucketModal(false)}
      />
      {activeDoor === "store" && (
        <StoreHubSection
          setSuccessMsg={setSuccessMsg}
          setErrorMsg={setErrorMsg}
          recordStageCompletion={recordStageCompletion}
          storeSendedSkus={storeSendedSkus}
          setStoreSendedSkus={setStoreSendedSkus}
          storeReceiveStatus={storeReceiveStatus}
          setStoreReceiveStatus={setStoreReceiveStatus}
          barcodeWorker={barcodeWorker}
          setBarcodeWorker={setBarcodeWorker}
          barcodeWorkerInput={barcodeWorkerInput}
          setBarcodeWorkerInput={setBarcodeWorkerInput}
          barcodeWorkerChecking={barcodeWorkerChecking}
          handleVerifyBarcodeWorker={handleVerifyBarcodeWorker}
          barcodeNotCheckedInModal={barcodeNotCheckedInModal}
          setBarcodeNotCheckedInModal={setBarcodeNotCheckedInModal}
          workerInputRef={workerInputRef}
          cameraScanTarget={cameraScanTarget}
          setCameraScanTarget={setCameraScanTarget}
        />
      )}

    </div>
  );
}
