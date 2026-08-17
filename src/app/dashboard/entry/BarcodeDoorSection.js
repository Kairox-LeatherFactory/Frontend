'use client';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import {
  apiProductionLogTwoDoor,
  apiGetPieceState,
  apiGetMaterialLots,
} from '@/lib/api';
import { Lock, CheckCircle2, Rocket, Scissors, X, Loader2, AlertTriangle, Barcode, Check, PackageCheck, Camera } from 'lucide-react';
import { manualStages, UI_TO_API_STAGE, API_TO_UI_STAGE, PREREQUISITE_MAP, PIPELINE_STAGE_ORDER, useRoleAccess, CameraScannerModal } from './shared';

// Extracted from src/app/dashboard/entry/page.js (Barcode Gun Scanner door:
// Cutting/Lining DCM screen + Fusing->Package Export pipeline scan). Props
// come from page.js's shared state — see SPLIT_GUIDE.md for the full map.
//
// KNOWN PRE-EXISTING BUG (not introduced by this split, kept as-is for
// fidelity): the third focus effect below references `cuttingPieceInputRef`,
// which is never declared anywhere in the original file either — it will
// throw a ReferenceError the moment barcodeDcmConfirmed becomes true while
// on the Cutting/Lining stage. Flagged for a separate fix, not touched here.
export default function BarcodeDoorSection({
  setSuccessMsg, setErrorMsg,
  recordStageCompletion, completedStagesMap, storeSendedSkus,
  date,
  barcodeStage, setBarcodeStage,
  lotArticle, setLotArticle, lotColor, setLotColor, lotThickness, setLotThickness,
  lotOptions, setLotOptions, lotResults, setLotResults, lotLoading, setLotLoading, lotCategory, setLotCategory,
  barcodeDcm, setBarcodeDcm,
  setBucketResult, setShowBucketModal,
  barcodeWorker, setBarcodeWorker, barcodeWorkerInput, setBarcodeWorkerInput, barcodeWorkerChecking,
  handleVerifyBarcodeWorker, barcodeNotCheckedInModal, setBarcodeNotCheckedInModal, workerInputRef,
  cameraScanTarget, setCameraScanTarget,
}) {
  const { token, user } = useAuth();
  const { workers } = useData();
  const { allowedOperations, isFullAccess, isStageAllowedForRole } = useRoleAccess();
  const [barcodeSkuInput, setBarcodeSkuInput] = useState('');
  const [barcodeSelectedSku, setBarcodeSelectedSku] = useState(null);
  const [barcodeSkuVerifying, setBarcodeSkuVerifying] = useState(false);
  const [barcodeDcmConfirmed, setBarcodeDcmConfirmed] = useState(false);
  const [sessionCutSkus, setSessionCutSkus] = useState([]); // Track duplicate cuts in session
  const [cuttingBatchPieces, setCuttingBatchPieces] = useState([]); // [{ code, seq, serial_str, article, style_name, color, size, order_number }]
  const [cuttingPieceInput, setCuttingPieceInput] = useState('');
  const [cuttingPieceResolving, setCuttingPieceResolving] = useState(false);
  const [closedCuttingSkus, setClosedCuttingSkus] = useState([]); // sku_code[] fully cut, closed for further scanning
  const [barcodePieceResolving, setBarcodePieceResolving] = useState(false);
  const [barcodePieceValidating, setBarcodePieceValidating] = useState(false); // FIX: referenced in JSX but never declared in the original file either (also no setter call anywhere — was silently always false); declared here to match that same de-facto behavior.
  const [scannedPieceDrawerInfo, setScannedPieceDrawerInfo] = useState(null); // { code, holding }
  const [barcodePieceInput, setBarcodePieceInput] = useState('');
  const [barcodeBatchPieces, setBarcodeBatchPieces] = useState([]); // Array of scanned piece objects
  const [barcodeSubmitting, setBarcodeSubmitting] = useState(false);
  const [barcodeSuccessModal, setBarcodeSuccessModal] = useState(null); // Success popup details
  const [barcodeSequenceWarning, setBarcodeSequenceWarning] = useState(null); // Sequence gate alert

  const resolveWorkableStage = (pieceState) => {
    const primary = pieceState?.next_stage ? (API_TO_UI_STAGE[pieceState.next_stage] || null) : null;
    if (primary && (isFullAccess || allowedOperations.includes(primary))) return primary;
    const altEntry = (pieceState?.stages || []).find((s) => {
      const uiStage = API_TO_UI_STAGE[s.stage];
      return s.state === 'next' && uiStage && manualStages.includes(uiStage) &&
        (isFullAccess || allowedOperations.includes(uiStage));
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
    if (!targetStage || targetStage === 'Cutting' || targetStage === 'Lining') return { valid: true };
    const requiredPrereqs = PREREQUISITE_MAP[targetStage] || [];
    if (requiredPrereqs.length === 0) return { valid: true };

    const rawKey = String(pieceOrSkuKey || '').toUpperCase().trim();
    if (!rawKey) return { valid: true };

    // 1. Exact key match check against completedStagesMap
    const completedSet = completedStagesMap[rawKey] || new Set();
    if (requiredPrereqs.every(prereq => completedSet.has(prereq))) return { valid: true };

    // 2. Check if parent SKU was cut in session (unlocks Pasting for pieces of that cut SKU)
    const hasCutInSession = sessionCutSkus.some(sku => {
      const uSku = String(sku).toUpperCase();
      return rawKey === uSku || rawKey.includes(uSku);
    });

    const hasStoreSended = storeSendedSkus.some(sku => {
      const uSku = String(sku).toUpperCase();
      return rawKey === uSku || rawKey.includes(uSku);
    });

    if (requiredPrereqs.includes('Cutting') && hasCutInSession) return { valid: true };
    if (requiredPrereqs.includes('Store') && hasStoreSended) return { valid: true };

    return {
      valid: false,
      error: `⚠️ Production Sequence Blocked: Piece '${rawKey}' has not completed '${requiredPrereqs.join(' & ')}' stage yet!`
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
  const cuttingPieceInputRef = useRef(null); // FIX: this ref was referenced (line ~173) but never declared in the original file either — a real pre-existing bug, now fixed since it's blocking testing.
  useEffect(() => {
    if (!barcodeWorker) return;
    const isCutOrLining = barcodeStage === 'Cutting' || barcodeStage === 'Lining';
    const targetRef = isCutOrLining ? skuInputRef : pieceInputRef;
    setTimeout(() => targetRef.current?.focus(), 150);
  }, [barcodeWorker, barcodeStage]);

  useEffect(() => {
    if (barcodeSelectedSku) {
      setTimeout(() => dcmInputRef.current?.focus(), 150);
    }
  }, [barcodeSelectedSku]);

  useEffect(() => {
    if (barcodeDcmConfirmed) {
      const isCutOrLining = barcodeStage === 'Cutting' || barcodeStage === 'Lining';
      const targetRef = isCutOrLining ? cuttingPieceInputRef : pieceInputRef;
      setTimeout(() => targetRef.current?.focus(), 150);
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
    const isCutting = barcodeStage === 'Cutting';
    const isLining = barcodeStage === 'Lining';
    if (!isCutting && !isLining) return;

    const category = isLining ? 'LINING' : 'LEATHER';
    setLotCategory(category);

    const currentSku = barcodeSelectedSku?.code;
    if (!currentSku) return;

    const parsedDcm = parseInt(barcodeDcm, 10) || 0;
    const parsedPieces = barcodePieceInput ? barcodePieceInput.split(',').reduce((acc, curr) => {
      if (curr.includes('-')) {
        const [s, e] = curr.split('-').map(Number);
        return acc + (e - s + 1);
      }
      return acc + 1;
    }, 0) : 0;
    const requiredQty = parsedDcm * parsedPieces; // eslint-disable-line no-unused-vars -- matches original file's own dead calculation, kept for fidelity

    const params = {
      category,
      article: lotArticle,
      colour: lotColor,
      thickness: lotThickness
    };

    let isMounted = true;
    setLotLoading(true);
    apiGetMaterialLots(token, params).then(data => {
      if (!isMounted) return;
      setLotOptions(data.options || { article: [], colour: [], thickness: [], size: [] });
      setLotResults(data.lots || []);

      if (data.suggested_lot_id && data.lots) {
        const suggestedLot = data.lots.find(l => l.lot_id === data.suggested_lot_id);
        if (suggestedLot && !lotArticle && !lotColor && !lotThickness) {
          setLotArticle(suggestedLot.article || '');
          setLotColor(suggestedLot.colour || '');
          setLotThickness(suggestedLot.thickness || '');
        }
      }
    }).catch(err => {
      console.warn("Failed to fetch lots:", err);
    }).finally(() => {
      if (isMounted) setLotLoading(false);
    });

    return () => { isMounted = false; };
  }, [
    barcodeStage, barcodeSelectedSku,
    lotArticle, lotColor, lotThickness, barcodeDcm, barcodePieceInput, token
  ]);

  const handleVerifySkuBarcode = async (valToVerify) => {
    const rawVal = typeof valToVerify === 'string' ? valToVerify : barcodeSkuInput;
    const val = (rawVal || '').trim();
    if (!val) return;

    setBarcodeSkuVerifying(true);
    setBarcodeSelectedSku(null);
    setBarcodeDcmConfirmed(false);
    setErrorMsg('');

    try {
      // GET /production/piece-state — verification/viewing ONLY, no logging here.
      const pieceState = await apiGetPieceState(token, {
        code: val,
        employee_barcode: barcodeWorker?.employee_barcode || barcodeWorker?.barcode || barcodeWorker?.id,
      });

      const piece = pieceState?.piece;
      if (!piece || !piece.code) {
        throw new Error(`Piece '${val}' not found. Please scan a valid piece barcode.`);
      }

      // Local Validation: Check if this piece has already been leather-cut in
      // this session. Scoped to the Cutting stage only — sessionCutSkus
      // tracks LEATHER_CUTTING completions specifically (it's also what
      // unlocks Fusing locally), so it must never block a legitimate Lining
      // scan of the same piece. The authoritative per-stage check still runs
      // below via stageEntry regardless.
      if (barcodeStage === 'Cutting' && sessionCutSkus.includes(piece.code)) {
        throw new Error(`Piece ${piece.code} has already been cut! It cannot be scanned again in Cutting.`);
      }

      // Bug #8: once a style's full required quantity has been submitted, the
      // backend reports it closed (sku_progress.closed) — block re-scanning
      // any more of its pieces here rather than silently re-adding them.
      if (piece.sku_code && closedCuttingSkus.includes(piece.sku_code)) {
        throw new Error(`Style ${piece.sku_code} is closed — all required quantities have already been cut.`);
      }

      // Check if THIS stage even applies to this piece BEFORE looking at
      // next_stage/role gating below. A piece that doesn't need Lining will
      // have next_stage pointing straight to Line Stitching — that must read
      // as "Lining doesn't apply here," not "you're not allowed on that stage."
      const currentStageEntry = (pieceState?.stages || []).find(s => s.stage === UI_TO_API_STAGE[barcodeStage]);
      // Allow Lining scans irrespective of API 'not_applicable' flags —
      // Lining is permitted to be performed in any stage context per request.
      if (barcodeStage !== 'Lining' && currentStageEntry?.state === 'not_applicable') {
        throw new Error(
          `'${barcodeStage}' does not apply to this piece${currentStageEntry.reason ? ` (${currentStageEntry.reason})` : ''}. It skips straight to its next required stage.`
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
      if (mappedStage && manualStages.includes(mappedStage) && mappedStage !== barcodeStage) {
        const roleCanWorkMappedStage = isStageAllowedForRole(mappedStage);
        if (!roleCanWorkMappedStage) {
          // If the operator intentionally chose Lining, allow them to proceed
          // even when the server's next_stage points elsewhere.
          if (barcodeStage !== 'Lining') {
            throw new Error(`This piece's next stage is '${mappedStage}', which isn't assigned to your role. Please have the appropriate manager scan this piece.`);
          }
          // otherwise ignore mappedStage and continue with Lining
        } else {
          // Role can work the mapped stage. Auto-switch only if the
          // operator has not explicitly chosen Lining (we prefer an
          // intentional Lining selection over auto-switching away).
          if (barcodeStage !== 'Lining') {
            setBarcodeStage(mappedStage);
            setSuccessMsg(`🔄 Auto-detected stage: ${mappedStage}`);
          } else {
            setSuccessMsg(`🔄 Detected next stage: ${mappedStage}. Keeping Lining as selected.`);
          }
        }
      }
      const targetStage = (barcodeStage === 'Lining') ? 'Lining' : (mappedStage || barcodeStage);

      // Enforce the pipeline gate using stages[] before letting the operator proceed.
      const stageEntry = (pieceState?.stages || []).find(s => s.stage === UI_TO_API_STAGE[targetStage]);
      if (targetStage !== 'Lining' && stageEntry && stageEntry.state !== 'next' && stageEntry.state !== 'completed') {
        throw new Error(
          stageEntry.reason ||
          (stageEntry.state === 'not_applicable'
            ? `'${targetStage}' does not apply to this piece.`
            : `Production sequence blocked: '${targetStage}' isn't ready yet.`)
        );
      }
      const usingAlternateStage = !!(pieceState?.next_stage && UI_TO_API_STAGE[targetStage] !== pieceState.next_stage);
      const realBlockers = (pieceState?.blockers || []).filter(b => b.gate !== 'consumption');
      if (!(barcodeStage === 'Lining' || (typeof targetStage !== 'undefined' && targetStage === 'Lining')) && pieceState?.ready_to_log === false && realBlockers.length > 0) {
        throw new Error(realBlockers[0].reason || 'Scan blocked by server');
      }

      // Skill mismatch is a WARNING per the API docs, never a hard block.
      const skillWarning = (pieceState?.actor?.skill_ok === false && pieceState.actor?.skill_note)
        ? ` ⚠️ ${pieceState.actor.skill_note}`
        : '';

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
      setCuttingBatchPieces([{
        code: piece.code,
        seq: piece.seq,
        serial_str: piece.serial,
        article: piece.article,
        style_name: piece.style_name,
        color: piece.colour,
        size: piece.size,
        order_number: piece.order_number,
      }]);
      setSuccessMsg(`✅ Piece ${piece.code} verified — next stage: ${targetStage}${skillWarning}`);
    } catch (err) {
      setErrorMsg(err.message);
      setBarcodeSkuInput('');
      setTimeout(() => skuInputRef.current?.focus(), 100);
    } finally {
      setBarcodeSkuVerifying(false);
    }
  };
  const handleCuttingPieceScan = async (codeToScan) => {
    const code = (codeToScan || cuttingPieceInput).trim();
    if (!code || cuttingPieceResolving || !barcodeSelectedSku) return;

    if (cuttingBatchPieces.some(p => p.code === code)) {
      setCuttingPieceInput('');
      return;
    }

    setCuttingPieceResolving(true);
    setErrorMsg('');
    try {
      const pieceState = await apiGetPieceState(token, {
        code,
        employee_barcode: barcodeWorker?.employee_barcode || barcodeWorker?.barcode || barcodeWorker?.id,
      });

      const piece = pieceState?.piece;
      if (!piece || !piece.code) {
        throw new Error(`Piece '${code}' not found. Please scan a valid piece barcode.`);
      }
      if (barcodeSelectedSku.sku_code && piece.sku_code && piece.sku_code !== barcodeSelectedSku.sku_code) {
        throw new Error(`This piece belongs to a different style (${piece.sku_code}). Submit the current batch first, or scan a piece from ${barcodeSelectedSku.sku_code}.`);
      }

      const stageEntry = (pieceState?.stages || []).find(s => s.stage === UI_TO_API_STAGE[barcodeStage]);
      if (barcodeStage !== 'Lining' && stageEntry && stageEntry.state !== 'next' && stageEntry.state !== 'completed') {
        throw new Error(
          stageEntry.reason ||
          (stageEntry.state === 'not_applicable'
            ? `'${barcodeStage}' does not apply to this piece.`
            : `Production sequence blocked: '${barcodeStage}' isn't ready yet.`)
        );
      }
      const realBlockers = (pieceState?.blockers || []).filter(b => b.gate !== 'consumption');
      // Exempt Lining from blocker enforcement so lining piece scans aren't
      // blocked by server readiness flags.
      if (barcodeStage !== 'Lining' && pieceState?.ready_to_log === false && realBlockers.length > 0) {
        throw new Error(realBlockers[0].reason || 'Scan blocked by server');
      }

      setCuttingBatchPieces(prev => prev.some(p => p.code === piece.code) ? prev : [...prev, {
        code: piece.code,
        seq: piece.seq,
        serial_str: piece.serial,
        article: piece.article,
        style_name: piece.style_name,
        color: piece.colour,
        size: piece.size,
        order_number: piece.order_number,
      }]);
      // Same "Assigned Drawer" indicator the pipeline (Fusing onward) flow
      // already shows — piece-state already returns this here too, it was
      // just never captured for Cutting/Lining scans.
      setScannedPieceDrawerInfo(pieceState.drawer ? { code: pieceState.drawer.code, holding: pieceState.drawer.holding } : null);
      setCuttingPieceInput('');
      setSuccessMsg(`✅ Added piece ${piece.code} (${cuttingBatchPieces.length + 1} scanned)`);
    } catch (err) {
      setErrorMsg(err.message);
      setCuttingPieceInput('');
    } finally {
      setCuttingPieceResolving(false);
    }
  };

  // API Flow: Verify (GET) -> Local UI Update -> Submit (POST)
  // Dedicated Barcode Cutting/Lining Submit Handler. THE ONLY WRITE for this door —
  // logs the exact piece that handleVerifySkuBarcode already confirmed via piece-state.
  // Never re-derives or re-guesses the target piece; it targets barcodeSelectedSku.code.
  const handleBarcodeCuttingSubmit = async () => {
    if (!barcodeWorker) return setErrorMsg("Please scan and verify Worker ID first!");
    if (!barcodeSelectedSku) return setErrorMsg("Please verify a piece barcode first!");
    if (cuttingBatchPieces.length === 0) return setErrorMsg("Please scan at least one piece!");
    const isLining = barcodeStage === 'Lining';
    // Lining is not a "measured cut" on the backend — no DCM, no material lot.
    // Sending consumption.dcm at all makes the backend demand article/lot_id
    // (its "measured cut needs to name its material" rule), so Lining skips
    // consumption entirely and only sends actor + targets.
    let parsedDcm = null;
    if (!isLining) {
      parsedDcm = parseFloat(barcodeDcm);
      if (!barcodeDcm || isNaN(parsedDcm) || parsedDcm <= 0) return setErrorMsg("Please enter a valid Cut Area (DCM) value");
    }
    if (barcodeStage === 'Cutting' || barcodeStage === 'LEATHER_CUTTING') {
      if (!lotArticle) return setErrorMsg("Please select the Article!");
      if (!lotColor) return setErrorMsg("Please select the Color!");
    }
    setBarcodeSubmitting(true);
    try {
      const pieceCodes = cuttingBatchPieces.map(p => p.code);

      const payload = {
        screen_context: isLining ? 'LINING_CUT' : 'LEATHER_CUT',
        actor: { employee_barcode: barcodeWorker.employee_barcode || barcodeWorker.barcode || barcodeWorker.id },
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

      const loggedPieces = cuttingBatchPieces.map(p => ({
        id: p.code,
        seq: p.seq || 1,
        code: p.code,
        serial_str: p.serial_str,
        order_number: p.order_number || barcodeSelectedSku.order_number || '',
        article: lotArticle || p.article || '',
        style_name: p.style_name || barcodeSelectedSku.style_name || barcodeSelectedSku.code,
        color: lotColor || p.color || '',
        size: p.size || barcodeSelectedSku.size || '',
        dcm: parsedDcm,
      }));

      setBarcodeSuccessModal({
        stage: barcodeStage,
        count: result?.count_logged ?? pieceCodes.length,
        skuCode: barcodeSelectedSku.style_name || barcodeSelectedSku.code,
        orderNumber: barcodeSelectedSku.order_number || '',
        article: lotArticle || barcodeSelectedSku.article || '',
        style: barcodeSelectedSku.style_name || barcodeSelectedSku.code,
        color: lotColor || '',
        size: barcodeSelectedSku.size || '',
        thickness: lotThickness || 'N/A',
        pieces: loggedPieces
      });

      // sessionCutSkus specifically tracks LEATHER_CUTTING completions (it's
      // what unlocks Fusing locally) — only record it for actual Cutting
      // submits, not Lining, so a Lining submit never blocks a real re-cut.
      if (!isLining) setSessionCutSkus(prev => [...prev, ...pieceCodes]);
      pieceCodes.forEach(code => recordStageCompletion(barcodeStage, code));
      // Cutting has a clear linear next stage (Fusing); Lining is a parallel,
      // independent branch feeding the Store merge gate, not a tab in this
      // linear chain — only advance the highlighted tab for a Cutting submit.
      if (!isLining) advanceToNextPipelineStage();

      // Bug #8: once the backend confirms this style's full required
      // quantity has been submitted, close it — no more scanning into it.
      if (result?.sku_progress?.closed && barcodeSelectedSku.sku_code) {
        setClosedCuttingSkus(prev => Array.from(new Set([...prev, barcodeSelectedSku.sku_code])));
      }

      setBarcodeDcm('');
      setBarcodeSkuInput('');
      setBarcodeSelectedSku(null);
      setBarcodeDcmConfirmed(false);
      setCuttingBatchPieces([]);
      setLotArticle('');
      setLotColor('');
      setLotThickness('');

      // Bug #16: force a fresh Worker ID scan for the next log — one operator
      // shouldn't be able to keep submitting under the previous scan's identity.
      setBarcodeWorker(null);
      setBarcodeWorkerInput('');
      setTimeout(() => workerInputRef.current?.focus(), 150);
    } catch (err) {
      const msg = typeof err?.message === 'string'
        ? err.message
        : (typeof err === 'string' ? err : JSON.stringify(err));
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
      setErrorMsg(`⚠️ Role Restricted: Your role cannot scan for the '${barcodeStage}' stage.`);
      setBarcodePieceInput('');
      setTimeout(() => pieceInputRef.current?.focus(), 100);
      return;
    }

    if (barcodeBatchPieces.some(p => p.code === code)) {
      setBarcodePieceInput('');
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
          employee_barcode: barcodeWorker?.employee_barcode || barcodeWorker?.barcode || barcodeWorker?.id,
        });

        // Pull drawer info from the response (piece.drawer or top-level drawer)
        const piece = pieceState?.piece || {};
        drawerInfo = piece.drawer || pieceState?.drawer || (piece.drawer_code ? { code: piece.drawer_code } : null);
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
            if (barcodeStage === 'Lining') {
              // Operator forced Lining — ignore the mappedStage and continue
            } else {
              setErrorMsg(`⚠️ This piece's next stage is '${mappedStage}', which isn't assigned to your role.`);
              setBarcodePieceInput('');
              return;
            }
          } else {
            // Role can handle mappedStage — auto-switch only if operator
            // hasn't explicitly chosen Lining.
            if (barcodeStage !== 'Lining') {
              targetStage = mappedStage;
              if (mappedStage !== barcodeStage) {
                setBarcodeStage(mappedStage);
                setSuccessMsg(`🔄 Auto-detected stage: ${mappedStage}`);
              }
            } else {
              setSuccessMsg(`🔄 Detected next stage: ${mappedStage}. Keeping Lining as selected.`);
            }
          }

          // Cutting/Lining have their own dedicated consumption screen (DCM/
          // Article/Colour). If either the mappedStage OR the operator's
          // selected stage is a cut stage, route to the dedicated flow.
          if (mappedStage === 'Cutting' || mappedStage === 'Lining' || barcodeStage === 'Cutting' || barcodeStage === 'Lining') {
            setBarcodePieceInput('');
            await handleVerifySkuBarcode(code);
            return;
          }
        }

        // If the server says NOT ready_to_log, surface the first blocker reason verbatim
        // Exempt Lining so it's not prevented by ready_to_log blockers.
        if (!(barcodeStage === 'Lining' || targetStage === 'Lining') && pieceState?.ready_to_log === false && Array.isArray(pieceState?.blockers) && pieceState.blockers.length > 0) {
          const firstBlocker = pieceState.blockers[0];
          setErrorMsg(`⚠️ ${firstBlocker.reason || 'Scan blocked by server'}`);
          setBarcodePieceInput('');
          return;
        }

        // Use stages[] from piece-state to enforce the pipeline gate (Bug #6)
        // Allow Lining to bypass this gate so lining cuts can be scanned
        // regardless of the backend's current-stage flags.
        const stageEntry = (pieceState?.stages || []).find(s => s.stage === UI_TO_API_STAGE[targetStage]);
        if (targetStage !== 'Lining' && stageEntry && stageEntry.state !== 'next' && stageEntry.state !== 'completed') {
          setErrorMsg(
            stageEntry.state === 'not_applicable'
              ? `⚠️ '${targetStage}' does not apply to this piece${stageEntry.reason ? ` (${stageEntry.reason})` : ''}.`
              : `⚠️ Production Sequence Blocked: '${targetStage}' isn't ready yet.${stageEntry.reason ? ` ${stageEntry.reason}` : ''}`
          );
          setBarcodePieceInput('');
          return;
        }
      } catch {
        // Piece-detail lookup failed (e.g. code not minted yet) — fall back
        // to the local heuristic so scanning still works offline of the API.
        const seqCheck = validateStageSequence(targetStage, code);
        if (!seqCheck.valid) {
          setErrorMsg(seqCheck.error);
          setBarcodePieceInput('');
          return;
        }
      }

      setScannedPieceDrawerInfo(drawerInfo);
      setBarcodeBatchPieces(prev => prev.some(p => p.code === code) ? prev : [...prev, { code, scanned_at: new Date().toLocaleTimeString(), ...pieceMeta }]);
      setBarcodePieceInput('');
    } finally {
      setBarcodePieceResolving(false);
      // Keep the scanner focused here on every outcome (success, blocked,
      // sequence error) so the gun can keep firing without a manual re-click.
      setTimeout(() => pieceInputRef.current?.focus(), 100);
    }
  };

  const handleBarcodeBatchSubmit = async () => {
    if (!barcodeWorker) return setErrorMsg("Please scan and verify Worker ID first!");
    if (barcodeBatchPieces.length === 0) return setErrorMsg("Please scan at least one piece barcode!");

    // FIX 2: Secondary hard role-boundary gate — safety net before API call
    if (!isStageAllowedForRole(barcodeStage)) {
      setErrorMsg(`⚠️ Role Restricted: Your role (${user.replace('_', ' ')}) is not permitted to submit logs for the '${barcodeStage}' stage.`);
      return;
    }

    setBarcodeSubmitting(true);
    try {
      const payload = {
        screen_context: 'PIPELINE',
        actor: { employee_barcode: barcodeWorker.employee_barcode || barcodeWorker.barcode || barcodeWorker.id },
        targets: { piece_barcodes: barcodeBatchPieces.map(p => p.code) },
        work_date: date
      };

      if (barcodeStage === 'Lining') {
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
      [...loggedCodes, ...reworkCodes].forEach(code => recordStageCompletion(barcodeStage, code));
      if (loggedCodes.length > 0 || reworkCodes.length > 0) advanceToNextPipelineStage();

      const hasBlockedItems =
        (result?.sequence_blocked?.length > 0) ||
        (result?.skill_blocked?.length > 0) ||
        (result?.merge_blocked?.length > 0) ||
        (result?.role_blocked?.length > 0) ||
        (Array.isArray(result?.blocked) && result.blocked.length > 0);

      if (hasBlockedItems) {
        result.stage = barcodeStage;
        setBucketResult(result);
        setShowBucketModal(true);
      } else if (loggedCodes.length > 0 || reworkCodes.length > 0) {
        setBarcodeSuccessModal({
          stage: barcodeStage,
          count: result.count_logged ?? (loggedCodes.length + reworkCodes.length),
          pieces: barcodeBatchPieces
        });
      } else {
        setErrorMsg(result?.message || 'No pieces were logged.');
      }

      setBarcodeBatchPieces([]);
      setScannedPieceDrawerInfo(null);

      // Bug #16: force a fresh Worker ID scan for the next log, same as the
      // Cutting/Lining door — only once pieces actually got logged/reworked.
      if (loggedCodes.length > 0 || reworkCodes.length > 0) {
        setBarcodeWorker(null);
        setBarcodeWorkerInput('');
        setTimeout(() => workerInputRef.current?.focus(), 150);
      }
    } catch (err) {
      setErrorMsg(`Pipeline submission failed: ${err.message}`);
    } finally {
      setBarcodeSubmitting(false);
    }
  };


  return (
    <>
      {cameraScanTarget === 'sku' && (
        <CameraScannerModal
          title="Scan SKU Barcode"
          onClose={() => setCameraScanTarget(null)}
          onScan={(scannedCode) => {
            const cleanCode = String(scannedCode || '').replace(/[\r\n]+/g, '').trim();
            if (!cleanCode) return;
            setBarcodeSkuInput(cleanCode);
            setTimeout(() => handleVerifySkuBarcode(cleanCode), 50);
          }}
        />
      )}
      <div className="space-y-8 animate-fade-in">

        {/* STEP 1: WORKER BARCODE SCAN & ATTENDANCE GATE */}
        <div className="p-6 rounded-3xl shadow-lg relative overflow-hidden space-y-5" style={{ background: 'linear-gradient(135deg, #1c1207, #2d1f0e)', border: '1px solid rgba(200,131,74,0.3)' }}>
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
                <p className="text-xs text-[#e2d5c3]/80">Scan Worker ID Badge / Card (e.g. EMP-000123) to verify Check-In status</p>
              </div>
            </div>

            {barcodeWorker && (
              <button
                type="button"
                onClick={() => {
                  setBarcodeWorker(null);
                  setBarcodeWorkerInput('');
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
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleVerifyBarcodeWorker();
                      }
                    }}
                    style={{ paddingLeft: barcodeWorkerInput ? '1rem' : '3.25rem', paddingRight: '3rem' }}
                    className="w-full h-14 bg-white/10 text-white placeholder-[#e2d5c3]/40 font-mono font-bold text-base border-2 border-[#c8834a]/40 rounded-2xl focus:outline-none focus:border-[#f5d4a4] transition-all"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setCameraScanTarget('worker')}
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
                  {barcodeWorkerChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Verify Worker ID
                </button>
              </div>

              {/* Quick Select Worker Dropdown Fallback */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 text-xs text-[#e2d5c3]/70">
                <span className="shrink-0">Or select active worker:</span>
                <select
                  onChange={(e) => {
                    if (e.target.value) handleVerifyBarcodeWorker(e.target.value);
                  }}
                  className="w-full sm:w-auto max-w-full min-w-0 bg-white/10 text-white font-bold text-xs py-1.5 px-3 rounded-xl border border-[#c8834a]/30 focus:outline-none cursor-pointer"
                >
                  <option value="" className="bg-[#1c1207] text-white">-- Choose Worker --</option>
                  {workers.map(w => (
                    <option key={w.id} value={w.id} className="bg-[#1c1207] text-white">
                      {w.name} ({w.designation || 'Worker'})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            /* VERIFIED WORKER PROFILE CARD */
            <div className="p-4 rounded-2xl bg-white/10 border border-[#c8834a]/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in relative z-10">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#c8834a]/30 border border-[#c8834a] flex items-center justify-center text-white font-black text-lg shadow-md">
                  {barcodeWorker.name ? barcodeWorker.name[0] : 'W'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-black text-white">{barcodeWorker.name}</h4>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      🟢 Checked-In Today
                    </span>
                  </div>
                  <p className="text-xs text-[#f5d4a4] font-medium mt-0.5">
                    ID: <strong className="font-mono">{barcodeWorker.employee_barcode || barcodeWorker.id}</strong> · {barcodeWorker.designation || 'Master Craftsman'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* WORKER NOT CHECKED IN POPUP MODAL */}
        {barcodeNotCheckedInModal && createPortal(
          <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-900/80 backdrop-blur-md animate-fade-in p-4">
            <div className="bg-gradient-to-b from-slate-900 to-rose-950 text-white rounded-3xl shadow-2xl border-2 border-rose-500/50 w-full max-w-md p-6 space-y-5 text-center relative overflow-hidden">
              <div className="w-16 h-16 rounded-full bg-rose-500/20 border-2 border-rose-500/50 flex items-center justify-center mx-auto shadow-inner">
                <AlertTriangle className="w-8 h-8 text-rose-400" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-rose-400 uppercase tracking-wide">
                  Worker Not Checked-In!
                </h3>
                <p className="text-xs font-semibold text-slate-200">
                  Worker <strong className="text-white text-sm font-black">{barcodeNotCheckedInModal.workerName}</strong> has not completed Attendance Check-In for today.
                </p>
                <p className="text-[11px] text-rose-200/80">
                  Factory Rule: Production logging is restricted to active checked-in workers.
                </p>
              </div>

              <div className="pt-3 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/attendance')}
                  className="w-full py-3.5 rounded-xl font-black text-xs text-white bg-rose-600 hover:bg-rose-500 transition-all shadow-lg cursor-pointer"
                >
                  Go to Attendance Check-In Page
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBarcodeNotCheckedInModal(null);
                    setTimeout(() => workerInputRef.current?.focus(), 100);
                  }}
                  className="w-full py-3 rounded-xl font-bold text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Close &amp; Dismiss
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* STEP 2: SELECT PRODUCTION OPERATION STAGE */}
        <div className={`space-y-6 p-6 rounded-3xl bg-[#fcfaf8] shadow-sm border border-[#c8834a]/20 transition-all duration-300 relative ${!barcodeWorker ? 'opacity-50 pointer-events-none select-none filter blur-[0.5px]' : 'animate-fade-in'}`}>
          {!barcodeWorker && (
            <div className="p-3.5 bg-amber-100/90 border border-amber-300/80 rounded-2xl text-amber-900 text-xs font-bold flex items-center justify-center gap-2 shadow-sm mb-4">
              <Lock className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Scan &amp; Verify Employee Barcode in Step 1 to Unlock Remaining Production Stage Cards</span>
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
              <p className="text-xs text-[#9a7a5a]">Choose stage to log barcode scan events</p>
            </div>
          </div>

          {/* Stitching Manager works a 5-stage pipeline (Fusing through
              Final Finish) on the same pieces the server already tracks
              per-piece via GET /production/piece-state — per the API doc's
              own rule ("the client never chooses a production stage...a
              stage picker in the UI will disagree with the server
              eventually"), manual tab-picking is switched off entirely for
              this role. Scanning a piece auto-selects the right stage
              (resolveWorkableStage, below). DM/MD keep full manual access;
              Cutting/Lining Managers only ever have one stage each, so the
              mismatch risk this guards against doesn't apply to them. */}
          {user === 'stitching_manager' && (
            <p className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-2.5">
              ⚠️ Stage picking is automatic for your role — scan a piece and its correct stage selects itself.
            </p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {manualStages.map((stage) => {
              const isSelected = barcodeStage === stage;
              const isRoleAllowed = isStageAllowedForRole(stage);
              const roleLocked = !isRoleAllowed;
              const autoOnly = user === 'stitching_manager';
              // Tab access is gated by ROLE only. Sequence completion is
              // inherently per-piece (many pieces sit at many different
              // stages at once), and completedStagesMap is only ever this
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
                      setErrorMsg(`⚠️ Role Restricted: Your role cannot log the '${stage}' stage.`);
                      return;
                    }
                    if (autoOnly) return;
                    setBarcodeStage(stage);
                  }}
                  className={`p-3.5 rounded-2xl text-xs transition-all text-center border shadow-sm relative ${isDisabled
                    ? 'opacity-35 grayscale bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                    : isSelected
                      ? 'bg-gradient-to-r from-[#c8834a] to-[#e8a06a] text-white border-[#c8834a] scale-[1.02] shadow-md cursor-pointer font-black'
                      : 'bg-white text-slate-800 border-slate-200 hover:border-[#c8834a] hover:bg-amber-50/50 cursor-pointer font-bold'
                    }`}
                  title={roleLocked ? '🔒 Not permitted for your role' : autoOnly ? 'Auto-selected from the scanned piece' : stage}
                >
                  {!isFullAccess && isStageAllowedForRole(stage) && (
                    <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white shadow-sm z-10" title="Your Assigned Stage"></span>
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
          {(barcodeStage === 'Cutting' || barcodeStage === 'Lining') ? (
            <div className="space-y-6 pt-4 border-t border-[#c8834a]/15 animate-fade-in">

              {/* SKU BARCODE GUN INPUT */}
              <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-wider text-[#4a3a2a] flex items-center gap-1.5">
                  <Barcode className="w-4 h-4 text-[#c8834a]" /> Scan SKU Barcode *
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
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleVerifySkuBarcode(barcodeSkuInput);
                        }
                      }}
                      style={{ paddingLeft: barcodeSkuInput ? '1rem' : '3.25rem', paddingRight: '3rem' }}
                      className="w-full h-14 bg-white font-mono font-bold text-base text-[#2d1f0e] border-2 border-[#c8834a]/30 focus:border-[#c8834a] shadow-sm rounded-xl outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!barcodeWorker || barcodeSkuVerifying}
                    />
                    <button
                      type="button"
                      onClick={() => setCameraScanTarget('sku')}
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
                    disabled={!barcodeWorker || !barcodeSkuInput.trim() || barcodeSkuVerifying}
                    className="h-14 px-6 rounded-xl font-black text-xs text-white bg-[#c8834a] hover:bg-[#b0723e] active:scale-95 transition-all shadow-md cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1.5 shrink-0"
                  >
                    {barcodeSkuVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
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
                          Order #{barcodeSelectedSku.order_number || 'N/A'} · {barcodeSelectedSku.style_name || barcodeSelectedSku.code}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-[#c8834a]">
                        {barcodeSelectedSku.code}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1.5 border-t border-[#c8834a]/15 text-[11px] font-bold text-[#4a3a2a]">
                      {barcodeSelectedSku.article && (
                        <span>Article: <span className="text-[#2d1f0e]">{barcodeSelectedSku.article}</span></span>
                      )}
                      {barcodeSelectedSku.color_code && (
                        <span>Color: <span className="text-[#2d1f0e]">{barcodeSelectedSku.color_code}</span></span>
                      )}
                      {barcodeSelectedSku.size && (
                        <span>Size: <span className="text-[#2d1f0e]">{barcodeSelectedSku.size}</span></span>
                      )}
                      {barcodeSelectedSku.serial && (
                        <span>Serial/Qty: <span className="text-[#2d1f0e]">{barcodeSelectedSku.serial}</span></span>
                      )}
                      {barcodeSelectedSku.drawer?.code && (
                        <span className="flex items-center gap-1">
                          <PackageCheck className="w-3 h-3 text-[#c8834a]" />
                          Assigned Drawer: <span className="font-mono text-[#2d1f0e]">{barcodeSelectedSku.drawer.code}</span>
                          {barcodeSelectedSku.drawer.holding && (
                            <span className="text-[9px] uppercase tracking-wider text-[#9a7a5a]">({barcodeSelectedSku.drawer.holding})</span>
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
              {barcodeSelectedSku && barcodeStage !== 'Lining' && (
                <div className="space-y-3 animate-fade-in pt-2 border-t border-[#c8834a]/15">
                  <label className="text-xs font-black uppercase tracking-wider text-[#4a3a2a] flex items-center gap-1.5">
                    <Scissors className="w-4 h-4 text-[#c8834a]" /> Total Cut Area (DCM) / Count *
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
                        if (e.key === 'Enter' && barcodeDcm) {
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
              {barcodeSelectedSku && (barcodeStage === 'Lining' || (barcodeDcmConfirmed && barcodeDcm)) && (
                <div className="p-6 rounded-2xl bg-white border-2 border-[#c8834a]/30 shadow-md space-y-5 animate-fade-in">

                  {/* Order Details Header */}
                  <div className="p-4 rounded-xl bg-[#faf6f0] border border-[#c8834a]/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#c8834a]">Order Summary</span>
                      <h4 className="text-sm font-black text-[#2d1f0e] mt-0.5">
                        Order #{barcodeSelectedSku.order_number || '100123'} · {barcodeSelectedSku.style_name || barcodeSelectedSku.code}
                      </h4>
                    </div>
                    {barcodeStage !== 'Lining' && (
                      <div className="text-right">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total DCM</span>
                        <p className="text-lg font-black text-[#c8834a]">{barcodeDcm} DCM</p>
                      </div>
                    )}
                  </div>

                  {/* 3 Dropdowns */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* 1 & 2. Article / Color — hidden for Lining: backend has no
                        Lining material-lot data yet (confirmed by backend team),
                        so the dropdowns are always empty there and article gets
                        derived automatically on their side. Cutting keeps them. */}
                    {barcodeStage !== 'Lining' && (
                      <>
                        <div className="space-y-1.5">
                          <label className="text-xs font-black text-[#4a3a2a] uppercase tracking-wider flex items-center justify-between">
                            <span>{lotCategory === 'LINING' ? 'Lining' : 'Leather'} Article{barcodeStage === 'Cutting' ? ' *' : ''}</span>
                            {barcodeStage !== 'Cutting' && (
                              <span className="text-[10px] text-slate-400 font-bold lowercase">(optional)</span>
                            )}

                          </label>
                          <select
                            value={lotArticle}
                            onChange={(e) => { setLotArticle(e.target.value); setLotColor(''); setLotThickness(''); }}
                            className="w-full h-12 px-3 bg-[#faf6f0] font-bold text-xs border border-[#c8834a]/30 rounded-xl focus:outline-none cursor-pointer"
                          >
                            <option value="">-- Select Article --</option>
                            {lotOptions.article?.map(a => <option key={a} value={a}>{a}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-black text-[#4a3a2a] uppercase tracking-wider flex items-center justify-between">
                            <span>{lotCategory === 'LINING' ? 'Lining' : 'Leather'} Color{barcodeStage === 'Cutting' ? ' *' : ''}</span>
                            {barcodeStage !== 'Cutting' && (
                              <span className="text-[10px] text-slate-400 font-bold lowercase">(optional)</span>
                            )}

                          </label>

                          <select
                            value={lotColor}
                            onChange={(e) => { setLotColor(e.target.value); setLotThickness(''); }}
                            className="w-full h-12 px-3 bg-[#faf6f0] font-bold text-xs border border-[#c8834a]/30 rounded-xl focus:outline-none cursor-pointer"
                          >
                            <option value="">-- Select Color --</option>
                            {lotOptions.colour?.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      </>
                    )}
                    {/* 3. Thickness */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-[#4a3a2a] uppercase tracking-wider flex items-center justify-between">
                        <span> Thickness</span>
                        <span className="text-[10px] text-slate-400 font-bold lowercase">(optional)</span>
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

                  {/* Bug #8: Individual Quantity Scanning — every remaining
                          piece of this style must be scanned one at a time;
                          each scan is verified live via piece-state before
                          being added to the batch that Submit sends together. */}
                  <div className="space-y-3 pt-2 border-t border-[#c8834a]/15">
                    <label className="text-xs font-black uppercase tracking-wider text-[#4a3a2a] flex items-center gap-1.5">
                      <Barcode className="w-4 h-4 text-[#c8834a]" /> Scan Piece Barcodes ({cuttingBatchPieces.length} scanned) *
                    </label>
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        {!cuttingPieceInput && (
                          <Barcode className="w-5 h-5 text-[#c8834a] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-opacity duration-200" />
                        )}
                        <input
                          ref={cuttingPieceInputRef}
                          type="text"
                          placeholder="Scan next piece barcode..."
                          value={cuttingPieceInput}
                          onChange={(e) => setCuttingPieceInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleCuttingPieceScan(cuttingPieceInput);
                            }
                          }}
                          style={{ paddingLeft: cuttingPieceInput ? '1rem' : '3.25rem' }}
                          disabled={cuttingPieceResolving}
                          className="w-full h-12 bg-[#faf6f0] font-mono font-bold text-sm text-[#2d1f0e] border-2 border-[#c8834a]/30 focus:border-[#c8834a] rounded-xl outline-none disabled:opacity-50"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCuttingPieceScan(cuttingPieceInput)}
                        disabled={cuttingPieceResolving || !cuttingPieceInput.trim()}
                        className="h-12 px-5 rounded-xl font-black text-xs text-white bg-[#c8834a] hover:bg-[#b0723e] active:scale-95 transition-all shadow-md cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1.5 shrink-0"
                      >
                        {cuttingPieceResolving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Add Piece
                      </button>
                    </div>

                    {scannedPieceDrawerInfo && (
                      <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 border border-[#c8834a]/25 text-xs font-bold text-[#7a5a34] w-fit animate-fade-in">
                        <PackageCheck className="w-3.5 h-3.5 text-[#c8834a] shrink-0" />
                        Assigned Drawer: <span className="font-mono font-black text-[#4a3a2a]">{scannedPieceDrawerInfo.code || '—'}</span>
                        {scannedPieceDrawerInfo.holding && (
                          <span className="text-[10px] uppercase tracking-wider text-[#9a7a5a]">({scannedPieceDrawerInfo.holding})</span>
                        )}
                      </div>
                    )}

                    {cuttingBatchPieces.length > 0 && (
                      <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                        {cuttingBatchPieces.map((p) => (
                          <div key={p.code} className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                            <span className="font-mono font-bold text-xs text-[#2d1f0e]">{p.code}</span>
                            <span className="text-[10px] bg-emerald-100 text-emerald-700 font-extrabold uppercase px-1.5 py-0.5 rounded-md">
                              #{p.serial_str || (p.seq != null ? String(p.seq).padStart(3, '0') : '—')}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Lot Status Indicator — Bug #9: Thickness is optional, so this must not wait on it */}
                  {lotArticle && lotColor && (
                    <div className={`p-4 rounded-xl border flex items-center justify-between ${lotResults.length === 1 && lotResults[0].covers_required !== false ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                      <div>
                        <div className="text-xs font-black uppercase tracking-wider mb-1">Material Availability</div>
                        <div className="text-sm font-bold">
                          {lotLoading ? 'Checking...' : (
                            lotResults.length === 1 ? (
                              lotResults[0].covers_required === false
                                ? <span className="text-red-600">Not enough stock (Available: {lotResults[0].available} {lotResults[0].uom})</span>
                                : <span className="text-emerald-700">Available: {lotResults[0].available} {lotResults[0].uom}</span>
                            ) : (
                              <span className="text-red-600">{lotResults.length === 0 ? 'No matching lot found.' : 'Multiple lots found. Refine filters.'}</span>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Submit Cutting Button */}
                  <button
                    type="button"
                    onClick={handleBarcodeCuttingSubmit}
                    disabled={barcodeSubmitting || cuttingBatchPieces.length === 0 || ((barcodeStage === 'Cutting' || barcodeStage === 'LEATHER_CUTTING') && (!lotArticle || !lotColor))}

                    className="w-full h-14 rounded-xl font-black text-sm text-[#0f0a06] shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}
                  >
                    {barcodeSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Rocket className="w-5 h-5" />}
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
                  <Barcode className="w-4 h-4 text-[#c8834a]" /> Scan Piece Barcodes for {barcodeStage} *
                </label>

                <div className="flex gap-3">
                  <div className="relative flex-1">
                    {!barcodePieceInput && (
                      <Barcode className="w-5 h-5 text-[#c8834a] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-opacity duration-200" />
                    )}
                    <input
                      ref={pieceInputRef}
                      type="text"
                      placeholder={barcodePieceValidating ? 'Checking piece stage…' : `Scan piece barcode (e.g. KL_1-${barcodeSelectedSku?.code || 'ADELE-38'}-001)...`}
                      value={barcodePieceInput}
                      onChange={(e) => setBarcodePieceInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleBarcodePieceScan();
                        }
                      }}
                      style={{ paddingLeft: barcodePieceInput ? '1rem' : '3.25rem', paddingRight: '1rem' }}
                      className="w-full h-14 bg-white font-mono font-bold text-sm text-[#2d1f0e] border-2 border-[#c8834a]/30 focus:border-[#c8834a] shadow-sm rounded-xl outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!barcodeWorker || barcodePieceResolving || barcodePieceValidating}
                      autoFocus
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleBarcodePieceScan()}
                    disabled={!barcodeWorker || barcodePieceResolving}
                    className="h-14 px-6 rounded-xl font-black text-xs text-white shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                    style={{ background: '#c8834a' }}
                  >
                    {barcodePieceResolving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Add Piece
                  </button>
                </div>

                {/* Bug #12: assigned drawer for the most recently scanned piece */}
                {scannedPieceDrawerInfo && (
                  <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 border border-[#c8834a]/25 text-xs font-bold text-[#7a5a34] w-fit animate-fade-in">
                    <PackageCheck className="w-3.5 h-3.5 text-[#c8834a] shrink-0" />
                    Assigned Drawer: <span className="font-mono font-black text-[#4a3a2a]">{scannedPieceDrawerInfo.code || '—'}</span>
                    {scannedPieceDrawerInfo.holding && (
                      <span className="text-[10px] uppercase tracking-wider text-[#9a7a5a]">({scannedPieceDrawerInfo.holding})</span>
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
                      onClick={() => { setBarcodeBatchPieces([]); setScannedPieceDrawerInfo(null); }}
                      className="text-xs font-bold text-red-500 hover:underline cursor-pointer"
                    >
                      Clear Batch
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                    {barcodeBatchPieces.map((p, idx) => (
                      <div key={p.code} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-mono font-bold text-slate-800 text-[11px]">{p.code}</p>
                          <p className="text-[9px] font-semibold text-slate-400">Scanned #{idx + 1}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setBarcodeBatchPieces(prev => prev.filter(item => item.code !== p.code))}
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
                    style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}
                  >
                    {barcodeSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Rocket className="w-5 h-5" />}
                    Submit Batch ({barcodeBatchPieces.length} Pieces) for {barcodeStage}
                  </button>
                </div>
              )}

            </div>
          )}

        </div>

        {/* GOLDEN SUCCESS POPUP MODAL */}
        {barcodeSuccessModal && createPortal(
          <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-900/80 backdrop-blur-md animate-fade-in p-4">
            <div className="bg-white rounded-3xl shadow-2xl border-2 border-[#c8834a]/40 w-full max-w-lg p-6 sm:p-8 space-y-6 relative overflow-hidden">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-[#c8834a]/30 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8 text-[#c8834a]" />
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-xl font-black text-[#2d1f0e]">
                  {barcodeSuccessModal.stage} Event Successfully Saved!
                </h3>
                <p className="text-xs font-bold text-slate-500">
                  Logged {barcodeSuccessModal.count} pieces for {barcodeSuccessModal.skuCode || 'Production Batch'}
                </p>
              </div>

              {barcodeSuccessModal.pieces && barcodeSuccessModal.pieces.length > 0 && (
                <div className="p-4 rounded-2xl bg-[#faf6f0] border border-[#c8834a]/20 space-y-3">
                  <div className="flex items-center justify-between text-xs font-black text-[#2d1f0e]">
                    <span>Generated Traveler Card Barcodes</span>
                    <span>{barcodeSuccessModal.pieces.length} Barcodes</span>
                  </div>

                  <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                    {barcodeSuccessModal.pieces.map((p) => (
                      <div key={p.code} className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-black text-xs text-[#2d1f0e]">{p.code}</span>
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 font-extrabold uppercase px-1.5 py-0.5 rounded-md">#{p.serial_str || String(p.seq).padStart(3, '0')}</span>
                        </div>
                        <div className="flex items-center flex-wrap gap-1">
                          {(barcodeSuccessModal.article || p.article) && <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 font-bold px-1.5 py-0.5 rounded-md">{p.article || barcodeSuccessModal.article}</span>}
                          {(barcodeSuccessModal.style || p.style_name) && <span className="text-[9px] bg-blue-50 text-blue-700 border border-blue-200 font-bold px-1.5 py-0.5 rounded-md">{p.style_name || barcodeSuccessModal.style}</span>}
                          {(barcodeSuccessModal.color || p.color) && <span className="text-[9px] bg-slate-50 text-slate-600 border border-slate-200 font-bold px-1.5 py-0.5 rounded-md">{p.color || barcodeSuccessModal.color}</span>}
                          {(barcodeSuccessModal.size || p.size) && <span className="text-[9px] bg-purple-50 text-purple-700 border border-purple-200 font-bold px-1.5 py-0.5 rounded-md">Sz: {p.size || barcodeSuccessModal.size}</span>}
                          {(barcodeSuccessModal.orderNumber || p.order_number) && <span className="text-[9px] bg-rose-50 text-rose-700 border border-rose-200 font-bold px-1.5 py-0.5 rounded-md">#{p.order_number || barcodeSuccessModal.orderNumber}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setBarcodeSuccessModal(null)}
                className="w-full h-14 rounded-2xl font-black text-sm text-[#0f0a06] shadow-md transition-all active:scale-95 cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}
              >
                Done &amp; Close Modal
              </button>
            </div>
          </div>,
          document.body
        )}

      </div>
    </>
  );
}
