// barcode main file
"use client";
import { useState, useRef, useEffect } from "react";
import { useGetEmployeesQuery } from '@/store/slices/adminApiSlice';
import { useAuth } from "@/context/AuthContext";
import BarcodeDoorForm from "./BarcodeDoorForm";
import {
  useProductionLogTwoDoorMutation,
  useLazyGetPieceStateQuery,
  useLazyGetMaterialLotsQuery,
} from "@/store/slices/apiSlice";

import {
  manualStages,
  UI_TO_API_STAGE,
  API_TO_UI_STAGE,
  PREREQUISITE_MAP,
  PIPELINE_STAGE_ORDER,
  useRoleAccess,

} from "../shared";
import { useSelector, useDispatch } from 'react-redux';
import {
  setCuttingBatchPieces as reduxSetCuttingBatchPieces,
  setBarcodeSelectedSku as reduxSetBarcodeSelectedSku
} from '@/store/slices/entrySlice';

// Extracted from src/app/dashboard/entry/page.js (Barcode Gun Scanner door:
// Cutting/Lining DCM screen + Fusing->Package Export pipeline scan). Props
// come from page.js's shared state — see SPLIT_GUIDE.md for the full map.
export default function BarcodeDoorSection({
  setSuccessMsg,
  setErrorMsg,
  recordStageCompletion,
  completedStagesMap,
  storeSendedSkus,
  date,
  barcodeStage,
  setBarcodeStage,
  lotArticle,
  setLotArticle,
  lotColor,
  setLotColor,
  lotThickness,
  setLotThickness,
  lotOptions,
  setLotOptions,
  lotResults,
  setLotResults,
  lotLoading,
  setLotLoading,
  lotCategory,
  setLotCategory,
  barcodeDcm,
  setBarcodeDcm,
  setBucketResult,
  setShowBucketModal,
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
}) {

  const { token, user } = useAuth();
  const { data: workers = [] } = useGetEmployeesQuery();
  const { allowedOperations, isFullAccess, isStageAllowedForRole } =
    useRoleAccess();
  const [barcodeSkuInput, setBarcodeSkuInput] = useState("");
  const [barcodeSkuVerifying, setBarcodeSkuVerifying] = useState(false);
  const [barcodeDcmConfirmed, setBarcodeDcmConfirmed] = useState(false);
  const [sessionCutSkus, setSessionCutSkus] = useState([]); // Track duplicate cuts in session
  const [closedCuttingSkus, setClosedCuttingSkus] = useState([]); // sku_code[] fully cut, closed for further scanning
  const [barcodePieceResolving, setBarcodePieceResolving] = useState(false);
  const [barcodePieceValidating, setBarcodePieceValidating] = useState(false); // FIX: referenced in JSX but never declared in the original file either (also no setter call anywhere — was silently always false); declared here to match that same de-facto behavior.
  const [scannedPieceStoreInfo, setScannedPieceStoreInfo] = useState(null); // { code, holding }
  const [barcodePieceInput, setBarcodePieceInput] = useState("");
  const [barcodeBatchPieces, setBarcodeBatchPieces] = useState([]); // Array of scanned piece objects
  const [barcodeSubmitting, setBarcodeSubmitting] = useState(false);
  const [barcodeSuccessModal, setBarcodeSuccessModal] = useState(null);
  const dispatch = useDispatch();
  const barcodeSelectedSku = useSelector(state => state.entry.barcodeSelectedSku);
  const cuttingBatchPieces = useSelector(state => state.entry.cuttingBatchPieces);
  const [productionLogTwoDoor] = useProductionLogTwoDoorMutation();
  const [triggerGetPieceState] = useLazyGetPieceStateQuery();
  const [triggerGetMaterialLots] = useLazyGetMaterialLotsQuery();


  const setBarcodeSelectedSku = (sku) => dispatch(reduxSetBarcodeSelectedSku(sku));
  const setCuttingBatchPieces = (pieces) => {
    if (typeof pieces === 'function') {
      const newPieces = pieces(cuttingBatchPieces);
      dispatch(reduxSetCuttingBatchPieces(newPieces));
    } else {
      dispatch(reduxSetCuttingBatchPieces(pieces));
    }
  };

  const resolveWorkableStage = (pieceState) => {
    const primary = pieceState?.next_stage
      ? API_TO_UI_STAGE[pieceState.next_stage] || null
      : null;
    if (primary && (isFullAccess || allowedOperations.includes(primary)))
      return primary;
    const altEntry = (pieceState?.stages || []).find((s) => {
      const uiStage = API_TO_UI_STAGE[s.stage];
      return (
        s.state === "next" &&
        uiStage &&
        manualStages.includes(uiStage) &&
        (isFullAccess || allowedOperations.includes(uiStage))
      );
    });
    return altEntry ? API_TO_UI_STAGE[altEntry.stage] : primary;
  };
  const advanceToNextPipelineStage = () => {
    const idx = PIPELINE_STAGE_ORDER.indexOf(barcodeStage);
    if (idx === -1) return;
    for (let i = idx + 1; i < PIPELINE_STAGE_ORDER.length; i++) {
      const candidate = PIPELINE_STAGE_ORDER[i];
      if (isFullAccess || allowedOperations.includes(candidate)) {
        setBarcodeStage(candidate);
        return;
      }
    }
  };

  // Stage-button tabs are gated by ROLE only (see button click handlers below).
  // validateStageSequence remains as an OFFLINE FALLBACK sequence check, used
  // only inside handleBarcodePieceScan when the live GET /production/piece-state
  // call itself fails — the real, session-independent sequence gate.
  const validateStageSequence = (targetStage, pieceOrSkuKey) => {
    if (!targetStage || targetStage === "Cutting" || targetStage === "Lining")
      return { valid: true };
    const requiredPrereqs = PREREQUISITE_MAP[targetStage] || [];
    if (requiredPrereqs.length === 0) return { valid: true };

    const rawKey = String(pieceOrSkuKey || "")
      .toUpperCase()
      .trim();
    if (!rawKey) return { valid: true };

    // 1. Exact key match check against completedStagesMap
    const completedSet = completedStagesMap[rawKey] || new Set();
    if (requiredPrereqs.every((prereq) => completedSet.has(prereq)))
      return { valid: true };

    // 2. Check if parent SKU was cut in session (unlocks Pasting for pieces of that cut SKU)
    const hasCutInSession = sessionCutSkus.some((sku) => {
      const uSku = String(sku).toUpperCase();
      return rawKey === uSku || rawKey.includes(uSku);
    });

    const hasStoreSended = storeSendedSkus.some((sku) => {
      const uSku = String(sku).toUpperCase();
      return rawKey === uSku || rawKey.includes(uSku);
    });

    if (requiredPrereqs.includes("Cutting") && hasCutInSession)
      return { valid: true };
    if (requiredPrereqs.includes("Store") && hasStoreSended)
      return { valid: true };

    return {
      valid: false,
      error: `⚠️ Production Sequence Blocked: Piece '${rawKey}' has not completed '${requiredPrereqs.join(" & ")}' stage yet!`,
    };
  };

  // A `checkRealPieceStage` helper used to live here (real-backend prerequisite
  // check via /api/v1/barcode/resolve's single current_stage field). Removed:
  // it was never actually called anywhere — the live scan flow already asks
  // the backend directly "is THIS target stage ready for this piece?" via
  // stages[]/state (see the SKU-verify and pipeline-scan checks below), which
  // handles multi-prerequisite stages (e.g. Line Stitching needing both
  // Lining and Pasting done) correctly without reconstructing it client-side.

  const skuInputRef = useRef(null);
  const dcmInputRef = useRef(null);
  const pieceInputRef = useRef(null);
  useEffect(() => {
    if (!barcodeWorker) return;
    const isCutOrLining =
      barcodeStage === "Cutting" || barcodeStage === "Lining";
    const targetRef = isCutOrLining ? skuInputRef : pieceInputRef;
    setTimeout(() => targetRef.current?.focus(), 150);
  }, [barcodeWorker, barcodeStage]);

  useEffect(() => {
    if (barcodeSelectedSku) {
      setTimeout(() => dcmInputRef.current?.focus(), 150);
    }
  }, [barcodeSelectedSku]);

  // Item 5: DCM confirm used to hand focus to the "add another piece to the
  // batch" input — that step no longer exists (one piece in, one piece
  // submitted), so this only still applies to the Fusing-onward pipeline.
  useEffect(() => {
    if (
      barcodeDcmConfirmed &&
      barcodeStage !== "Cutting" &&
      barcodeStage !== "Lining"
    ) {
      setTimeout(() => pieceInputRef.current?.focus(), 150);
    }
  }, [barcodeDcmConfirmed, barcodeStage]);

  // Dynamic Material Lots Fetcher — Barcode-door half. Originally one shared
  // effect in page.js keyed off `activeDoor` to pick between this door's
  // state and Manual door's; split into two door-local copies (this one and
  // the matching one in ManualDoorSection.js) since each door's own state
  // (barcodeStage/barcodeSelectedSku/barcodePieceInput here) isn't reachable
  // from page.js anymore post-split. Both copies write into the same shared
  // lot state via the setters passed down from page.js.
  useEffect(() => {
    const isCutting = barcodeStage === "Cutting";
    const isLining = barcodeStage === "Lining";
    if (!isCutting && !isLining) return;

    const category = isLining ? "LINING" : "LEATHER";
    setLotCategory(category);

    const currentSku = barcodeSelectedSku?.code;
    if (!currentSku) return;

    const parsedDcm = parseInt(barcodeDcm, 10) || 0;
    const parsedPieces = barcodePieceInput
      ? barcodePieceInput.split(",").reduce((acc, curr) => {
        if (curr.includes("-")) {
          const [s, e] = curr.split("-").map(Number);
          return acc + (e - s + 1);
        }
        return acc + 1;
      }, 0)
      : 0;
    const requiredQty = parsedDcm * parsedPieces; // eslint-disable-line no-unused-vars -- matches original file's own dead calculation, kept for fidelity

    const params = {
      category,
      article: lotArticle,
      colour: lotColor,
      thickness: lotThickness,
    };

    let isMounted = true;
    setLotLoading(true);
    triggerGetMaterialLots(params).unwrap()
      .then((data) => {
        if (!isMounted) return;
        setLotOptions(
          data.options || { article: [], colour: [], thickness: [], size: [] },
        );
        setLotResults(data.lots || []);

        if (data.suggested_lot_id && data.lots) {
          const suggestedLot = data.lots.find(
            (l) => l.lot_id === data.suggested_lot_id,
          );
          if (suggestedLot && !lotArticle && !lotColor && !lotThickness) {
            setLotArticle(suggestedLot.article || "");
            setLotColor(suggestedLot.colour || "");
            setLotThickness(suggestedLot.thickness || "");
          }
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch lots:", err);
      })
      .finally(() => {
        if (isMounted) setLotLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [
    barcodeStage,
    barcodeSelectedSku,
    lotArticle,
    lotColor,
    lotThickness,
    barcodeDcm,
    barcodePieceInput,
    token,
  ]);

  const handleVerifySkuBarcode = async (valToVerify) => {
    const rawVal =
      typeof valToVerify === "string" ? valToVerify : barcodeSkuInput;
    const val = (rawVal || "").trim();
    if (!val) return;

    setBarcodeSkuVerifying(true);
    setBarcodeSelectedSku(null);
    setBarcodeDcmConfirmed(false);
    setErrorMsg("");


  };
  // API Flow: Verify (GET) -> Local UI Update -> Submit (POST)


  // Dedicated Barcode Pipeline Scan & Submit
  const handleBarcodePieceScan = async (codeToScan) => {
    const code = (codeToScan || barcodePieceInput).trim();
    if (!code || barcodePieceResolving) return;

    // FIX 2: Hard role-boundary gate — checked before ANY scan work
    if (!isStageAllowedForRole(barcodeStage)) {
      setErrorMsg(
        `⚠️ Role Restricted: Your role cannot scan for the '${barcodeStage}' stage.`,
      );
      setBarcodePieceInput("");
      setTimeout(() => pieceInputRef.current?.focus(), 100);
      return;
    }

    if (barcodeBatchPieces.some((p) => p.code === code)) {
      setBarcodePieceInput("");
      setTimeout(() => pieceInputRef.current?.focus(), 100);
      return;
    }

    setBarcodePieceResolving(true);
    try {
      let targetStage = barcodeStage;
      let drawerInfo = null;
      let pieceMeta = null;

      // Bug #4 + #6 + #12: call GET /production/piece-state — THE server-authoritative
      // scan-and-verify call. It returns the piece's next stage, drawer, whether the
      // worker can log it right now (ready_to_log), and per-item blockers[].
      // Per API docs: NEVER choose a stage on the client side — let next_stage drive it.
      try {
        const pieceState = await triggerGetPieceState({
          code,
          employee_barcode:
            barcodeWorker?.employee_barcode ||
            barcodeWorker?.barcode ||
            barcodeWorker?.id,
        }).unwrap();

        // Pull store_state info from the response
        const piece = pieceState?.piece || {};
        drawerInfo =
          piece.store_state ||
          pieceState?.store_state ||
          null;
        // Bug #7 (Line Stitching etc.): capture the piece's real identity so
        // the success modal shows Serial/Article/Style/Color/Size instead of
        // "undefined" — barcodeBatchPieces previously only stored the code.
        pieceMeta = {
          seq: piece.seq,
          serial_str: piece.serial,
          article: piece.article,
          style_name: piece.style_name,
          color: piece.colour,
          size: piece.size,
          order_number: piece.order_number,
        };

        // Auto-detect & switch to the server-determined next stage (Bug #4).
        // Never auto-switch into a stage this role isn't permitted to work —
        // surface a clear message instead of silently jumping tabs and then
        // failing a secondary role check.
        const mappedStage = resolveWorkableStage(pieceState);
        if (mappedStage && manualStages.includes(mappedStage)) {
          const roleCanWorkMappedStage = isStageAllowedForRole(mappedStage);
          if (!roleCanWorkMappedStage) {
            if (barcodeStage === "Lining") {
              // Operator forced Lining — ignore the mappedStage and continue
            } else {
              setErrorMsg(
                `⚠️ This piece's next stage is '${mappedStage}', which isn't assigned to your role.`,
              );
              setBarcodePieceInput("");
              return;
            }
          } else {
            // Role can handle mappedStage — auto-switch only if operator
            // hasn't explicitly chosen Lining.
            if (barcodeStage !== "Lining") {
              targetStage = mappedStage;
              if (mappedStage !== barcodeStage) {
                setBarcodeStage(mappedStage);
                setSuccessMsg(`🔄 Auto-detected stage: ${mappedStage}`);
              }
            } else {
              setSuccessMsg(
                `🔄 Detected next stage: ${mappedStage}. Keeping Lining as selected.`,
              );
            }
          }


        }

        // Filter blockers: skill/role/designation are handled by the auto-stage
        // logic above. consumption/screen_context mean "use the Cutting screen",
        // not a hard scan rejection — show a specific hint for that.
        const allBlockers = pieceState?.blockers || [];
        const consumptionBlocked = allBlockers.some(
          (b) => b.gate === "consumption" || b.gate === "screen_context",
        );
        const realBlockers = allBlockers.filter(
          (b) =>
            b.gate !== "consumption" &&
            b.gate !== "screen_context" &&
            b.gate !== "skill" &&
            b.gate !== "role" &&
            b.gate !== "designation",
        );

        // If the only reason it can't log is that it requires a cut-screen
        // (consumption gate), tell the user to use the Cutting Sheet instead.
        if (
          !(barcodeStage === "Lining" || targetStage === "Lining") &&
          pieceState?.ready_to_log === false &&
          consumptionBlocked &&
          realBlockers.length === 0
        ) {
          setErrorMsg(
            `⚠️ This piece needs to be logged from the Cutting Sheet — it requires material consumption data (DCM) to be recorded first.`,
          );
          setBarcodePieceInput("");
          return;
        }

        if (
          !(barcodeStage === "Lining" || targetStage === "Lining") &&
          pieceState?.ready_to_log === false &&
          realBlockers.length > 0
        ) {
          const firstBlocker = realBlockers[0];
          setErrorMsg(`⚠️ ${firstBlocker.reason || "Scan blocked by server"}`);
          setBarcodePieceInput("");
          return;
        }


        // Use stages[] from piece-state to enforce the pipeline gate (Bug #6)
        // Allow Lining to bypass this gate so lining cuts can be scanned
        // regardless of the backend's current-stage flags.
        const stageEntry = (pieceState?.stages || []).find(
          (s) => s.stage === UI_TO_API_STAGE[targetStage],
        );
        if (
          targetStage !== "Lining" &&
          stageEntry &&
          stageEntry.state !== "next" &&
          stageEntry.state !== "completed"
        ) {
          setErrorMsg(
            stageEntry.state === "not_applicable"
              ? `⚠️ '${targetStage}' does not apply to this piece${stageEntry.reason ? ` (${stageEntry.reason})` : ""}.`
              : `⚠️ Production Sequence Blocked: '${targetStage}' isn't ready yet.${stageEntry.reason ? ` ${stageEntry.reason}` : ""}`,
          );
          setBarcodePieceInput("");
          return;
        }
      } catch {
        // Piece-detail lookup failed (e.g. code not minted yet) — fall back
        // to the local heuristic so scanning still works offline of the API.
        const seqCheck = validateStageSequence(targetStage, code);
        if (!seqCheck.valid) {
          setErrorMsg(seqCheck.error);
          setBarcodePieceInput("");
          return;
        }
      }

      setScannedPieceStoreInfo(drawerInfo);
      setBarcodeBatchPieces((prev) =>
        prev.some((p) => p.code === code)
          ? prev
          : [
            ...prev,
            {
              code,
              scanned_at: new Date().toLocaleTimeString(),
              ...pieceMeta,
            },
          ],
      );
      setBarcodePieceInput("");
    } finally {
      setBarcodePieceResolving(false);
      // Keep the scanner focused here on every outcome (success, blocked,
      // sequence error) so the gun can keep firing without a manual re-click.
      setTimeout(() => pieceInputRef.current?.focus(), 100);
    }
  };

  const handleBarcodeBatchSubmit = async () => {
    if (!barcodeWorker)
      return setErrorMsg("Please scan and verify Worker ID first!");
    if (barcodeBatchPieces.length === 0)
      return setErrorMsg("Please scan at least one piece barcode!");

    // FIX 2: Secondary hard role-boundary gate — safety net before API call
    if (!isStageAllowedForRole(barcodeStage)) {
      setErrorMsg(
        `⚠️ Role Restricted: Your role (${user.replace("_", " ")}) is not permitted to submit logs for the '${barcodeStage}' stage.`,
      );
      return;
    }

    setBarcodeSubmitting(true);
    try {
      let context = "PIPELINE";
      if (barcodeStage === "Cutting") context = "LEATHER_CUT";
      else if (barcodeStage === "Lining") context = "LINING_CUT";

      const payload = {
        screen_context: context,
        actor: {
          employee_barcode:
            barcodeWorker.employee_barcode ||
            barcodeWorker.barcode ||
            barcodeWorker.id,
        },
        targets: { piece_barcodes: barcodeBatchPieces.map((p) => p.code) },
        work_date: date,
      };

      const result = await productionLogTwoDoor(payload).unwrap();

      // Batch writes accept partially — some pieces logged, others blocked.
      // Always record local stage completion for whichever pieces the backend
      // actually confirmed (logged or rework), independent of whether the rest
      // need the bucket modal. `result.logged` is always present per the API
      // contract (even as []), so checking its mere presence here would always
      // take this branch and skip recordStageCompletion entirely — check length instead.
      const loggedCodes = Array.isArray(result?.logged) ? result.logged : [];
      const reworkCodes = Array.isArray(result?.rework) ? result.rework : [];
      [...loggedCodes, ...reworkCodes].forEach((code) =>
        recordStageCompletion(barcodeStage, code),
      );
      if (loggedCodes.length > 0 || reworkCodes.length > 0)
        advanceToNextPipelineStage();

      const hasBlockedItems = result?.blocked?.length > 0;

      // Bug fix (parity with ManualDoorSection): `logged`/`rework` only say a
      // piece is RECORDED at this stage — a rescan of a piece already logged
      // here comes back with rework populated but count_logged: 0 and an
      // empty `logged` array (backend message: "Nothing new logged — already
      // recorded at this stage"). Branching success on logged/rework length
      // showed a success modal even though nothing new happened, which is why
      // the dashboard's completed count didn't move. `count_logged` is the
      // only field that reflects whether the backend actually recorded new work.
      const actuallyLogged = (result?.count_logged ?? 0) > 0;

      if (hasBlockedItems) {
        result.stage = barcodeStage;
        setBucketResult(result);
        setShowBucketModal(true);
      } else if (actuallyLogged) {
        setBarcodeSuccessModal({
          stage: barcodeStage,
          count: result.count_logged,
          pieces: barcodeBatchPieces,
        });
      } else {
        setErrorMsg(result?.message || "No pieces were logged.");
      }

      setBarcodeBatchPieces([]);
      setScannedPieceStoreInfo(null);

      // Bug #16: force a fresh Worker ID scan for the next log, same as the
      // Cutting/Lining door — only once pieces actually got logged/reworked.
      if (loggedCodes.length > 0 || reworkCodes.length > 0) {
        setBarcodeWorker(null);
        setBarcodeWorkerInput("");
        setTimeout(() => workerInputRef.current?.focus(), 150);
      }
    } catch (err) {
      setErrorMsg(`Pipeline submission failed: ${err.message}`);
    } finally {
      setBarcodeSubmitting(false);
    }
  };

  return (
    <BarcodeDoorForm
      setErrorMsg={setErrorMsg}
      barcodeStage={barcodeStage}
      setBarcodeStage={setBarcodeStage}
      lotArticle={lotArticle}
      setLotArticle={setLotArticle}
      lotColor={lotColor}
      setLotColor={setLotColor}
      lotThickness={lotThickness}
      setLotThickness={setLotThickness}
      lotOptions={lotOptions}
      lotResults={lotResults}
      lotLoading={lotLoading}
      lotCategory={lotCategory}
      barcodeDcm={barcodeDcm}
      setBarcodeDcm={setBarcodeDcm}
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
      user={user}
      workers={workers}
      isFullAccess={isFullAccess}
      isStageAllowedForRole={isStageAllowedForRole}
      barcodeSkuInput={barcodeSkuInput}
      setBarcodeSkuInput={setBarcodeSkuInput}
      barcodeSelectedSku={barcodeSelectedSku}
      barcodeSkuVerifying={barcodeSkuVerifying}
      barcodeDcmConfirmed={barcodeDcmConfirmed}
      setBarcodeDcmConfirmed={setBarcodeDcmConfirmed}
      cuttingBatchPieces={cuttingBatchPieces}
      barcodePieceResolving={barcodePieceResolving}
      barcodePieceValidating={barcodePieceValidating}
      scannedPieceStoreInfo={scannedPieceStoreInfo}
      setScannedPieceStoreInfo={setScannedPieceStoreInfo}
      barcodePieceInput={barcodePieceInput}
      setBarcodePieceInput={setBarcodePieceInput}
      barcodeBatchPieces={barcodeBatchPieces}
      setBarcodeBatchPieces={setBarcodeBatchPieces}
      barcodeSubmitting={barcodeSubmitting}
      barcodeSuccessModal={barcodeSuccessModal}
      setBarcodeSuccessModal={setBarcodeSuccessModal}
      skuInputRef={skuInputRef}
      dcmInputRef={dcmInputRef}
      pieceInputRef={pieceInputRef}
      handleBarcodePieceScan={handleBarcodePieceScan}
      handleBarcodeBatchSubmit={handleBarcodeBatchSubmit}
    />
  );
}



