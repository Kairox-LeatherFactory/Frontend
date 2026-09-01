// barcode main file
"use client";
import { useState, useRef, useEffect } from "react";

import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import BarcodeDoorForm from "./BarcodeDoorForm";
import {
  apiProductionLogTwoDoor,
  apiGetPieceState,
  apiGetMaterialLots,
} from "@/lib/api";

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
  const { workers } = useData();
  const { allowedOperations, isFullAccess, isStageAllowedForRole } =
    useRoleAccess();
  const [barcodeSkuInput, setBarcodeSkuInput] = useState("");
 // const [barcodeSelectedSku, setBarcodeSelectedSku] = useState(null);
  const [barcodeSkuVerifying, setBarcodeSkuVerifying] = useState(false);
  const [barcodeDcmConfirmed, setBarcodeDcmConfirmed] = useState(false);
  const [sessionCutSkus, setSessionCutSkus] = useState([]); // Track duplicate cuts in session
  // Item 5: always holds exactly the one piece Verify SKU resolved — Cutting
  // no longer batches multiple pieces under one shared DCM.
 // const [cuttingBatchPieces, setCuttingBatchPieces] = useState([]); // [{ code, seq, serial_str, article, style_name, color, size, order_number }]
  const [closedCuttingSkus, setClosedCuttingSkus] = useState([]); // sku_code[] fully cut, closed for further scanning
  const [barcodePieceResolving, setBarcodePieceResolving] = useState(false);
  const [barcodePieceValidating, setBarcodePieceValidating] = useState(false); // FIX: referenced in JSX but never declared in the original file either (also no setter call anywhere — was silently always false); declared here to match that same de-facto behavior.
  const [scannedPieceDrawerInfo, setScannedPieceDrawerInfo] = useState(null); // { code, holding }
  const [barcodePieceInput, setBarcodePieceInput] = useState("");
  const [barcodeBatchPieces, setBarcodeBatchPieces] = useState([]); // Array of scanned piece objects
  const [barcodeSubmitting, setBarcodeSubmitting] = useState(false);
  const [barcodeSuccessModal, setBarcodeSuccessModal] = useState(null);
    const dispatch = useDispatch();
  const barcodeSelectedSku = useSelector(state => state.entry.barcodeSelectedSku);
  const cuttingBatchPieces = useSelector(state => state.entry.cuttingBatchPieces);

 
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
    apiGetMaterialLots(token, params)
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

    try {
      // GET /production/piece-state — verification/viewing ONLY, no logging here.
      const pieceState = await apiGetPieceState(token, {
        code: val,
        employee_barcode:
          barcodeWorker?.employee_barcode ||
          barcodeWorker?.barcode ||
          barcodeWorker?.id,
      });

      const piece = pieceState?.piece;
      if (!piece || !piece.code) {
        throw new Error(
          `Piece '${val}' not found. Please scan a valid piece barcode.`,
        );
      }

      // Local Validation: Check if this piece has already been leather-cut in
      // this session. Scoped to the Cutting stage only — sessionCutSkus
      // tracks LEATHER_CUTTING completions specifically (it's also what
      // unlocks Fusing locally), so it must never block a legitimate Lining
      // scan of the same piece. The authoritative per-stage check still runs
      // below via stageEntry regardless.
      if (barcodeStage === "Cutting" && sessionCutSkus.includes(piece.code)) {
        throw new Error(
          `Piece ${piece.code} has already been cut! It cannot be scanned again in Cutting.`,
        );
      }

      // Bug #8: once a style's full required quantity has been submitted, the
      // backend reports it closed (sku_progress.closed) — block re-scanning
      // any more of its pieces here rather than silently re-adding them.
      if (piece.sku_code && closedCuttingSkus.includes(piece.sku_code)) {
        throw new Error(
          `Style ${piece.sku_code} is closed — all required quantities have already been cut.`,
        );
      }

      // Check if THIS stage even applies to this piece BEFORE looking at
      // next_stage/role gating below. A piece that doesn't need Lining will
      // have next_stage pointing straight to Line Stitching — that must read
      // as "Lining doesn't apply here," not "you're not allowed on that stage."
      const currentStageEntry = (pieceState?.stages || []).find(
        (s) => s.stage === UI_TO_API_STAGE[barcodeStage],
      );
      // Per the 17-Aug backend doc (Item 10): "The LINING_CUTTING stage
      // card's not_applicable verdict now uses the effective rule, so the
      // screen and the store gate agree" — no special case for Lining here
      // anymore. A style that doesn't need lining blocks the Lining stage
      // just like any other not_applicable stage.
      if (currentStageEntry?.state === "not_applicable") {
        throw new Error(
          `'${barcodeStage}' does not apply to this piece${currentStageEntry.reason ? ` (${currentStageEntry.reason})` : ""}. It skips straight to its next required stage.`,
        );
      }

      // The server names the stage — auto-switch the UI to match (never chosen

      // The server names the stage — auto-switch the UI to match (never chosen
      // by hand). But NEVER auto-switch into a stage this role can't work —
      // that silently dumped a Cutting Manager into the Lining tab (which
      // Cutting Manager has no permission for and has no DCM form anyway),
      // producing a confusing secondary "Role Restricted" error later instead
      // of a clear message right here.
      const mappedStage = resolveWorkableStage(pieceState);
      if (
        mappedStage &&
        manualStages.includes(mappedStage) &&
        mappedStage !== barcodeStage
      ) {
        const roleCanWorkMappedStage = isStageAllowedForRole(mappedStage);
        if (!roleCanWorkMappedStage) {
          // If the operator intentionally chose Lining, allow them to proceed
          // even when the server's next_stage points elsewhere.
          if (barcodeStage !== "Lining") {
            throw new Error(
              `This piece's next stage is '${mappedStage}', which isn't assigned to your role. Please have the appropriate manager scan this piece.`,
            );
          }
          // otherwise ignore mappedStage and continue with Lining
        } else {
          // Role can work the mapped stage. Auto-switch only if the
          // operator has not explicitly chosen Lining (we prefer an
          // intentional Lining selection over auto-switching away).
          if (barcodeStage !== "Lining") {
            setBarcodeStage(mappedStage);
            setSuccessMsg(`🔄 Auto-detected stage: ${mappedStage}`);
          } else {
            setSuccessMsg(
              `🔄 Detected next stage: ${mappedStage}. Keeping Lining as selected.`,
            );
          }
        }
      }
      const targetStage =
        barcodeStage === "Lining" ? "Lining" : mappedStage || barcodeStage;

      // Enforce the pipeline gate using stages[] before letting the operator proceed.
      const stageEntry = (pieceState?.stages || []).find(
        (s) => s.stage === UI_TO_API_STAGE[targetStage],
      );
      if (
        stageEntry &&
        stageEntry.state !== "next" &&
        stageEntry.state !== "completed"
      ) {
        throw new Error(
          stageEntry.reason ||
            (stageEntry.state === "not_applicable"
              ? `'${targetStage}' does not apply to this piece.`
              : `Production sequence blocked: '${targetStage}' isn't ready yet.`),
        );
      }
      const usingAlternateStage = !!(
        pieceState?.next_stage &&
        UI_TO_API_STAGE[targetStage] !== pieceState.next_stage
      );
      const realBlockers = (pieceState?.blockers || []).filter(
        (b) =>
          b.gate !== "consumption" &&
          b.gate !== "skill" &&
          b.gate !== "role" &&
          b.gate !== "designation",
      );
      if (
        !(
          barcodeStage === "Lining" ||
          (typeof targetStage !== "undefined" && targetStage === "Lining")
        ) &&
        pieceState?.ready_to_log === false &&
        realBlockers.length > 0
      ) {
        throw new Error(realBlockers[0].reason || "Scan blocked by server");
      }

      // Local UI update only — this piece's real identity + current/next stage.
      setBarcodeSelectedSku({
        piece_id: piece.piece_id,
        code: piece.code,
        short_code: piece.short_code,
        style_name: piece.style_name,
        order_number: piece.order_number,
        size: piece.size,
        serial: piece.serial,
        color_code: piece.colour,
        article: piece.article,
        sku_id: piece.sku_id,
        sku_code: piece.sku_code,
        current_stage: pieceState?.current_stage,
        current_stage_label: pieceState?.current_stage_label,
        next_stage: pieceState?.next_stage,
        next_stage_label: targetStage,
        drawer: piece.drawer || pieceState?.drawer || null,
      });
      setBarcodeSkuInput(piece.code);
      // Bug #8: Verify SKU starts a FRESH batch with this piece as #1 —
      // remaining pieces of this style get scanned individually into it below.
      setCuttingBatchPieces([
        {
          code: piece.code,
          seq: piece.seq,
          serial_str: piece.serial,
          article: piece.article,
          style_name: piece.style_name,
          color: piece.colour,
          size: piece.size,
          order_number: piece.order_number,
        },
      ]);
      setSuccessMsg(
        `✅ Piece ${piece.code} verified — next stage: ${targetStage}`,
      );
    } catch (err) {
      setErrorMsg(err.message);
      setBarcodeSkuInput("");
      setTimeout(() => skuInputRef.current?.focus(), 100);
    } finally {
      setBarcodeSkuVerifying(false);
    }
  };
  // API Flow: Verify (GET) -> Local UI Update -> Submit (POST)
  // Dedicated Barcode Cutting/Lining Submit Handler. THE ONLY WRITE for this door —
  // logs the exact piece that handleVerifySkuBarcode already confirmed via piece-state.
  // Never re-derives or re-guesses the target piece; it targets barcodeSelectedSku.code.
  const handleBarcodeCuttingSubmit = async () => {
    if (!barcodeWorker)
      return setErrorMsg("Please scan and verify Worker ID first!");
    if (!barcodeSelectedSku)
      return setErrorMsg("Please verify a piece barcode first!");
    if (cuttingBatchPieces.length === 0)
      return setErrorMsg("Please scan at least one piece!");
    const isLining = barcodeStage === "Lining";
    // Lining is not a "measured cut" on the backend — no DCM, no material lot.
    // Sending consumption.dcm at all makes the backend demand article/lot_id
    // (its "measured cut needs to name its material" rule), so Lining skips
    // consumption entirely and only sends actor + targets.
    let parsedDcm = null;
    if (!isLining) {
      parsedDcm = parseFloat(barcodeDcm);
      if (!barcodeDcm || isNaN(parsedDcm) || parsedDcm <= 0)
        return setErrorMsg("Please enter a valid Cut Area (DCM) value");
    }
    if (barcodeStage === "Cutting" || barcodeStage === "LEATHER_CUTTING") {
      if (!lotArticle) return setErrorMsg("Please select the Article!");
      if (!lotColor) return setErrorMsg("Please select the Color!");
    }
    setBarcodeSubmitting(true);
    try {
      const pieceCodes = cuttingBatchPieces.map((p) => p.code);

      const payload = {
        screen_context: isLining ? "LINING_CUT" : "LEATHER_CUT",
        actor: {
          employee_barcode:
            barcodeWorker.employee_barcode ||
            barcodeWorker.barcode ||
            barcodeWorker.id,
        },
        targets: { piece_barcodes: pieceCodes },
        work_date: date,
      };
      if (!isLining) {
        const lotId = lotResults.length === 1 ? lotResults[0].lot_id : null;
        payload.consumption = { dcm: parsedDcm, leather_lot_id: lotId };
      }

      // POST /production/log — the ONLY write on the floor. Bug #8: submits
      // the WHOLE scanned batch (every individually-verified piece) in one call.
      const result = await apiProductionLogTwoDoor(token, payload);

      const loggedPieces = cuttingBatchPieces.map((p) => ({
        id: p.code,
        seq: p.seq || 1,
        code: p.code,
        serial_str: p.serial_str,
        order_number: p.order_number || barcodeSelectedSku.order_number || "",
        article: lotArticle || p.article || "",
        style_name:
          p.style_name ||
          barcodeSelectedSku.style_name ||
          barcodeSelectedSku.code,
        color: lotColor || p.color || "",
        size: p.size || barcodeSelectedSku.size || "",
        dcm: parsedDcm,
      }));

      setBarcodeSuccessModal({
        stage: barcodeStage,
        count: result?.count_logged ?? pieceCodes.length,
        skuCode: barcodeSelectedSku.style_name || barcodeSelectedSku.code,
        orderNumber: barcodeSelectedSku.order_number || "",
        article: lotArticle || barcodeSelectedSku.article || "",
        style: barcodeSelectedSku.style_name || barcodeSelectedSku.code,
        color: lotColor || "",
        size: barcodeSelectedSku.size || "",
        thickness: lotThickness || "N/A",
        pieces: loggedPieces,
      });

      // sessionCutSkus specifically tracks LEATHER_CUTTING completions (it's
      // what unlocks Fusing locally) — only record it for actual Cutting
      // submits, not Lining, so a Lining submit never blocks a real re-cut.
      if (!isLining) setSessionCutSkus((prev) => [...prev, ...pieceCodes]);
      pieceCodes.forEach((code) => recordStageCompletion(barcodeStage, code));
      // Cutting has a clear linear next stage (Fusing); Lining is a parallel,
      // independent branch feeding the Store merge gate, not a tab in this
      // linear chain — only advance the highlighted tab for a Cutting submit.
      if (!isLining) advanceToNextPipelineStage();

      // Bug #8: once the backend confirms this style's full required
      // quantity has been submitted, close it — no more scanning into it.
      if (result?.sku_progress?.closed && barcodeSelectedSku.sku_code) {
        setClosedCuttingSkus((prev) =>
          Array.from(new Set([...prev, barcodeSelectedSku.sku_code])),
        );
      }

      setBarcodeDcm("");
      setBarcodeSkuInput("");
      setBarcodeSelectedSku(null);
      setBarcodeDcmConfirmed(false);
      setCuttingBatchPieces([]);
      setLotArticle("");
      setLotColor("");
      setLotThickness("");

      // Bug #16: force a fresh Worker ID scan for the next log — one operator
      // shouldn't be able to keep submitting under the previous scan's identity.
      setBarcodeWorker(null);
      setBarcodeWorkerInput("");
      setTimeout(() => workerInputRef.current?.focus(), 150);
    } catch (err) {
      const msg =
        typeof err?.message === "string"
          ? err.message
          : typeof err === "string"
            ? err
            : JSON.stringify(err);
      console.error(`[${barcodeStage} Submit Error]`, err);
      setErrorMsg(`${barcodeStage} failed: ${msg}`);
    } finally {
      setBarcodeSubmitting(false);
    }
  };

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
        const pieceState = await apiGetPieceState(token, {
          code,
          employee_barcode:
            barcodeWorker?.employee_barcode ||
            barcodeWorker?.barcode ||
            barcodeWorker?.id,
        });

        // Pull drawer info from the response (piece.drawer or top-level drawer)
        const piece = pieceState?.piece || {};
        drawerInfo =
          piece.drawer ||
          pieceState?.drawer ||
          (piece.drawer_code ? { code: piece.drawer_code } : null);
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

          // Cutting/Lining have their own dedicated consumption screen (DCM/
          // Article/Colour). If either the mappedStage OR the operator's
          // selected stage is a cut stage, route to the dedicated flow.
          if (
            mappedStage === "Cutting" ||
            mappedStage === "Lining" ||
            barcodeStage === "Cutting" ||
            barcodeStage === "Lining"
          ) {
            setBarcodePieceInput("");
            await handleVerifySkuBarcode(code);
            return;
          }
        }

        // If the server says NOT ready_to_log, surface the first blocker reason verbatim
        // Exempt Lining so it's not prevented by ready_to_log blockers.
        if (
          !(barcodeStage === "Lining" || targetStage === "Lining") &&
          pieceState?.ready_to_log === false &&
          Array.isArray(pieceState?.blockers) &&
          pieceState.blockers.length > 0
        ) {
          const firstBlocker = pieceState.blockers[0];
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

      setScannedPieceDrawerInfo(drawerInfo);
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
      const payload = {
        screen_context: "PIPELINE",
        actor: {
          employee_barcode:
            barcodeWorker.employee_barcode ||
            barcodeWorker.barcode ||
            barcodeWorker.id,
        },
        targets: { piece_barcodes: barcodeBatchPieces.map((p) => p.code) },
        work_date: date,
      };

      if (barcodeStage === "Lining") {
        if (lotResults.length === 1 && lotResults[0].lot_id) {
          payload.lot_id = lotResults[0].lot_id;
        } else {
          payload.consumption = {
            article: lotArticle,
            ...(lotColor ? { colour: lotColor } : {}),
            ...(lotThickness ? { thickness: lotThickness } : {}),
          };
        }
        if (barcodeDcm) payload.dcm = parseInt(barcodeDcm, 10);
      }

      const result = await apiProductionLogTwoDoor(token, payload);

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

      const hasBlockedItems =
        result?.sequence_blocked?.length > 0 ||
        result?.merge_blocked?.length > 0 ||
        (Array.isArray(result?.blocked) &&
          result.blocked.filter((b) => {
            const r = (b?.reason || "").toLowerCase();
            return (
              !r.includes("skill") &&
              !r.includes("designation") &&
              !r.includes("assigned")
            );
          }).length > 0);

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
      setScannedPieceDrawerInfo(null);

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
      scannedPieceDrawerInfo={scannedPieceDrawerInfo}
      setScannedPieceDrawerInfo={setScannedPieceDrawerInfo}
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
      handleVerifySkuBarcode={handleVerifySkuBarcode}
      handleBarcodeCuttingSubmit={handleBarcodeCuttingSubmit}
      handleBarcodePieceScan={handleBarcodePieceScan}
      handleBarcodeBatchSubmit={handleBarcodeBatchSubmit}
    />
  );
}

  

