// manual logger main file
"use client";
import { useState, useRef, useEffect, useMemo } from "react";
import { useData } from "@/context/DataContext";
import CheckInWarningModal from "./CheckInWarningModal";
import CheckOutWarningModal from "./CheckOutWarningModal";
import TravelerPrintModal from "./TravelerPrintModal";
import AnalyticsPopupModal from "./AnalyticsPopupModal";
import PieceChecklistModal from "./PieceChecklistModal";
import ManualDoorForm from "./form";
import {
  useGetSkusQuery,
  useGetSkuPiecesQuery,
  useGetMaterialLotsQuery,
  useProductionCuttingMutation,
  useProductionLogTwoDoorMutation,
  useLazyGetSkuPiecesQuery,
  useLazyGetAttendanceTodayQuery,
} from "@/store/slices/apiSlice";

import { useRoleAccess, normalizeRosterArray } from "../shared";
import { useSelector, useDispatch } from 'react-redux';
import { 
  setSelectedStage as reduxSetSelectedStage, 
  setWorkerId as reduxSetWorkerId, 
  setSkuCode as reduxSetSkuCode, 
  setPieceSeqs as reduxSetPieceSeqs, 
  setCuttingCount as reduxSetCuttingCount, 
  setSkuSearchQuery as reduxSetSkuSearchQuery, 
  setWorkerSearchQuery as reduxSetWorkerSearchQuery 
} from '@/store/slices/manualSlice';

export default function ManualDoorSection({
  activeDoor,
  setSuccessMsg,
  setErrorMsg,
  recordStageCompletion,
  date,
  setDate,
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
  setLotCategory,
  barcodeDcm,
  setBarcodeDcm,
  setBucketResult,
  setShowBucketModal,
  mounted,
}) {
  const { workers, addScanEvent, operations } = useData();
  const { isReadOnly, isFullAccess, isStageAllowedForRole } =
    useRoleAccess();
  
  const [triggerGetAttendance] = useLazyGetAttendanceTodayQuery();
  const [cuttingPieces, setCuttingPieces] = useState([]);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [isSavingCutting, setIsSavingCutting] = useState(false);
  const [mintedCountMap, setMintedCountMap] = useState({});
  const [showCheckInWarning, setShowCheckInWarning] = useState(false);
  const [showCheckOutWarning, setShowCheckOutWarning] = useState(false);
  const [warningWorkerName, setWarningWorkerName] = useState("");
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [analyticsData, setAnalyticsData] = useState({
    loading: false,
    detail: null,
    error: null,
  }); 
  const [isSkuOpen, setIsSkuOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(60);
  const skuModalRef = useRef(null);
  const [isWorkerOpen, setIsWorkerOpen] = useState(false);
  const workerModalRef = useRef(null);
  const [lastSubmittedPieceSeqs, setLastSubmittedPieceSeqs] = useState([]);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [checklistPieces, setChecklistPieces] = useState([]);
  const [selectedPieces, setSelectedPieces] = useState([]);
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [loadingPieces, setLoadingPieces] = useState(false);
  const [piecesMeta, setPiecesMeta] = useState(null);
  const [checklistError, setChecklistError] = useState("");
  const [checklistSubmitting, setChecklistSubmitting] = useState(false);
  const [scannedBarcodes, setScannedBarcodes] = useState([]);
  const [workerVerifying, setWorkerVerifying] = useState(false);
  const dispatch = useDispatch();

  const selectedStage = useSelector(state => state.manual.selectedStage);
  const workerId = useSelector(state => state.manual.workerId);
  const skuCode = useSelector(state => state.manual.skuCode);
  const pieceSeqs = useSelector(state => state.manual.pieceSeqs);
  const cuttingCount = useSelector(state => state.manual.cuttingCount);
  const skuSearchQuery = useSelector(state => state.manual.skuSearchQuery);
  const workerSearchQuery = useSelector(state => state.manual.workerSearchQuery);

  // REDUX WRAPPERS
  const setSelectedStage = (val) => dispatch(reduxSetSelectedStage(val));
  const setWorkerId = (val) => dispatch(reduxSetWorkerId(val));
  const setSkuCode = (val) => dispatch(reduxSetSkuCode(val));
  const setPieceSeqs = (val) => dispatch(reduxSetPieceSeqs(val));
  const setCuttingCount = (val) => dispatch(reduxSetCuttingCount(val));
  const setSkuSearchQuery = (val) => dispatch(reduxSetSkuSearchQuery(val));
  const setWorkerSearchQuery = (val) => dispatch(reduxSetWorkerSearchQuery(val));

  // --- RTK QUERY HOOKS ---
  const { data: skusData = [], isLoading: skusLoading, refetch: refetchSkus } = useGetSkusQuery();
  const fetchedSkus = skusData?.items || skusData?.skus || (Array.isArray(skusData) ? skusData : []);

  const searchOp = String(selectedStage || "").toLowerCase().replace(/[^a-z]/g, "");
  const opRecord = operations?.find((o) => {
    const opLabel = String(o.label || "").toLowerCase().replace(/[^a-z]/g, "");
    return opLabel === searchOp || opLabel.includes(searchOp) || searchOp.includes(opLabel);
  }) || (operations && operations[0]);

  const skuObj = fetchedSkus.find((s) => s.code === skuCode);

  const { data: piecesData } = useGetSkuPiecesQuery(
    { skuId: skuObj?.sku_id, operationId: opRecord?.id },
    { skip: !skuCode || !opRecord || (selectedStage !== "Cutting" && selectedStage !== "Lining") }
  );
  
  const piecesArray = Array.isArray(piecesData) ? piecesData : (piecesData?.pieces || []);
  const alreadyCutCount = piecesArray.filter(p => p.done_at_op).length;

  const [productionCutting] = useProductionCuttingMutation();
  const [productionLogTwoDoor] = useProductionLogTwoDoorMutation();
const [triggerGetPieces] = useLazyGetSkuPiecesQuery();

  useEffect(() => {
    function handleClickOutside(e) {
      if (skuModalRef.current && !skuModalRef.current.contains(e.target)) {
        setIsSkuOpen(false);
      }
      if (
        workerModalRef.current &&
        !workerModalRef.current.contains(e.target)
      ) {
        setIsWorkerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  useEffect(() => {
    if (skuCode) {
      const skuObj = fetchedSkus.find((s) => s.code === skuCode);
      if (skuObj?.qty_ordered) setCuttingCount(skuObj.qty_ordered.toString());
    }
  }, [skuCode, fetchedSkus]);
    const isCutting = selectedStage === "Cutting";
  const isLining = selectedStage === "Lining";
  const lotCategoryLocal = isLining ? "LINING" : "LEATHER";

  const { data: lotsData, isFetching: lotsFetching } = useGetMaterialLotsQuery(
    { category: lotCategoryLocal, article: lotArticle, colour: lotColor, thickness: lotThickness },
    { skip: !skuCode || (!isCutting && !isLining) }
  );

  useEffect(() => {
    if (!isCutting && !isLining) return;
    setLotCategory(lotCategoryLocal);
    
    if (lotsFetching) {
      setLotLoading(true);
    } else if (lotsData) {
      setLotLoading(false);
      setLotOptions(lotsData.options || { article: [], colour: [], thickness: [], size: [] });
      setLotResults(lotsData.lots || []);

      if (lotsData.suggested_lot_id && lotsData.lots) {
        const suggestedLot = lotsData.lots.find((l) => l.lot_id === lotsData.suggested_lot_id);
        if (suggestedLot && !lotArticle && !lotColor && !lotThickness) {
          setLotArticle(suggestedLot.article || "");
          setLotColor(suggestedLot.colour || "");
          setLotThickness(suggestedLot.thickness || "");
        }
      }
    }
  }, [lotsData, lotsFetching, isCutting, isLining, lotCategoryLocal, lotArticle, lotColor, lotThickness, setLotCategory, setLotLoading, setLotOptions, setLotResults, setLotArticle, setLotColor, setLotThickness]);

  const searchFilteredSkus = useMemo(() => {
    if (!skuSearchQuery.trim()) return fetchedSkus;

    const searchTerms = skuSearchQuery.toLowerCase().trim().split(/\s+/);
    return fetchedSkus.filter((s) => {
      const fullText =
        `[${s.order_number || ""}] ${s.label || ""} ${s.style_name || ""} ${s.color_code || ""} ${s.size || ""} ${s.code || ""}`.toLowerCase();
      return searchTerms.every((term) => fullText.includes(term));
    });
  }, [fetchedSkus, skuSearchQuery]);

  const currentSelectedSku = fetchedSkus.find((s) => s.code === skuCode);

  const searchFilteredWorkers = useMemo(() => {
    if (!workerSearchQuery.trim()) return workers;
    const searchTerms = workerSearchQuery.toLowerCase().trim().split(/\s+/);
    return workers.filter((w) => {
      const fullText = `${w.name || ""} ${w.id || ""}`.toLowerCase();
      return searchTerms.every((term) => fullText.includes(term));
    });
  }, [workers, workerSearchQuery]);

  const currentSelectedWorker = workers.find((w) => w.id === workerId);

  // Barcode Gun Scanner parity: verify attendance check-in the moment a
  // worker is picked, not only at submit time — same GET /attendance/today
  // gate as handleVerifyBarcodeWorker, just triggered earlier so the operator
  // finds out before filling out the rest of the form. Kept alongside (not
  // instead of) the existing submit-time checks below, since a worker could
  // still check out in the gap between selecting them and hitting submit.
  const handleSelectWorker = async (w) => {
    setIsWorkerOpen(false);
    setWorkerVerifying(true);
    try {
      const rosterData = await triggerGetAttendance().unwrap();
      const rosterArray = normalizeRosterArray(rosterData);
      const workerRoster = rosterArray.find(
        (r) => String(r.employee_id) === String(w.id),
      );
      if (!workerRoster) {
        setWarningWorkerName(w.name || "Unknown");
        setShowCheckInWarning(true);
        setTimeout(() => setShowCheckInWarning(false), 2000);
        return;
      }
      if (workerRoster.check_out_at) {
        setWarningWorkerName(w.name || "Unknown");
        setShowCheckOutWarning(true);
        setTimeout(() => setShowCheckOutWarning(false), 2000);
        return;
      }
    } catch (e) {
      console.warn("Failed to verify attendance", e);
    } finally {
      setWorkerVerifying(false);
    }
    setWorkerId(w.id);
  };

  // SUBMIT HANDLER: Shows Traveler Card Modal FIRST for Cutting
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");
    if (isReadOnly) return setErrorMsg("Unauthorized");

    // Check-in validation removed here to let Traveler Cards modal open first

    if (!workerId || !date || !skuCode)
      return setErrorMsg("Missing mandatory fields");

    const activeOp = selectedStage;
    const skuObj = fetchedSkus.find((s) => s.code === skuCode);

    // 1. CUTTING & LINING STAGES (Mint / Initial Cut Count)
    if (activeOp === "Cutting" || activeOp === "Lining") {
      const parsedCount = parseInt(cuttingCount, 10);
      if (!cuttingCount || isNaN(parsedCount) || parsedCount <= 0) {
        return setErrorMsg("Please enter a valid total Cut Piece Count");
      }

      // If in Barcode Mode -> Opens Traveler Card Print Modal FIRST
      if (activeDoor === "barcode") {
        const generatedPreviewPieces = Array.from(
          { length: parsedCount },
          (_, i) => ({
            id: `temp-${i + 1}`,
            seq: i + 1,
            code: `${skuObj.code}-${i + 1}`,
          }),
        );

        setCuttingPieces(generatedPreviewPieces);
        setShowPrintModal(true); // Open Modal First
        return;
      }

      // If in Manual Mode -> Direct Save Without Traveler Card Popup!
      return handleDirectCuttingSave();
    }

    // 2. OTHER STAGES
    const searchOp = String(activeOp || "")
      .toLowerCase()
      .replace(/[^a-z]/g, "");
    const opRecord =
      operations.find((o) => {
        const opLabel = String(o.label || "")
          .toLowerCase()
          .replace(/[^a-z]/g, "");
        return (
          opLabel === searchOp ||
          opLabel.includes(searchOp) ||
          searchOp.includes(opLabel)
        );
      }) || operations[0];

    if (!opRecord)
      return setErrorMsg(`Could not find Operation ID for: ${activeOp}`);

    // Instant block for non-checked in workers on other stages
    const currentWorker = workers.find((w) => w.id === workerId);
    try {
      const rosterData = await triggerGetAttendance().unwrap();
      const rosterArray = normalizeRosterArray(rosterData);
      const workerRoster = rosterArray.find(
        (r) => String(r.employee_id) === String(workerId),
      );
      if (!workerRoster) {
        setWarningWorkerName(currentWorker?.name || "Unknown");
        setShowCheckInWarning(true);
        setTimeout(() => setShowCheckInWarning(false), 2000);
        return;
      } else if (workerRoster.check_out_at) {
        setWarningWorkerName(currentWorker?.name || "Unknown");
        setShowCheckOutWarning(true);
        setTimeout(() => setShowCheckOutWarning(false), 2000);
        return;
      }
    } catch (e) {
      console.warn("Failed to verify attendance", e);
    }

    let parsedSeqs = [];
    if (pieceSeqs) {
      const parts = pieceSeqs
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      parts.forEach((part) => {
        if (part.includes("-")) {
          const [s, e] = part.split("-").map((n) => parseInt(n, 10));
          for (let i = s; i <= e; i++) parsedSeqs.push(i);
        } else {
          parsedSeqs.push(parseInt(part, 10));
        }
      });
    }

    if (parsedSeqs.length === 0) {
      return setErrorMsg(
        "Please enter valid Piece Sequence numbers (e.g. 1, 2, 5-8)",
      );
    }

    try {
      const result = await addScanEvent({
        operation_id: opRecord.id,
        employee_id: workerId,
        work_date: date,
        sku_id: skuObj.sku_id,
        piece_seqs: parsedSeqs,
      });
      setSuccessMsg(
        `Logged ${result.count_logged ?? parsedSeqs.length} pieces for ${activeOp}.`,
      );
      setLastSubmittedPieceSeqs(parsedSeqs);

      setPieceSeqs("");
      setWorkerId("");
      setCuttingCount("");
    } catch (err) {
      setErrorMsg(`Failed: ${err.message}`);
    }
  };

  // CONFIRM CUTTING API CALL (Triggered ONLY when clicking OK on Traveler Card Modal)
  const handleDirectCuttingSave = async () => {
    const currentWorker = workers.find((w) => w.id === workerId);
    try {
      const rosterData = await triggerGetAttendance().unwrap();
      const rosterArray = normalizeRosterArray(rosterData);
      const workerRoster = rosterArray.find(
        (r) => String(r.employee_id) === String(workerId),
      );
      if (!workerRoster) {
        setWarningWorkerName(currentWorker?.name || "Unknown");
        setShowCheckInWarning(true);
        setTimeout(() => setShowCheckInWarning(false), 2000);
        return;
      } else if (workerRoster.check_out_at) {
        setWarningWorkerName(currentWorker?.name || "Unknown");
        setShowCheckOutWarning(true);
        setTimeout(() => setShowCheckOutWarning(false), 2000);
        return;
      }
    } catch (e) {
      console.warn("Failed to verify attendance", e);
    }

    setIsSavingCutting(true);
    try {
      const skuObj = fetchedSkus.find((s) => s.code === skuCode);
      const parsedCount = parseInt(cuttingCount, 10);

      // Duplicate-submit guard (Barcode Gun Scanner parity): apiProductionCutting
      // always targets piece_seqs [1..count], so submitting a count that's
      // already covered just re-logs the SAME pieces as backend "rework" —
      // nothing new gets created. Block it here instead of letting the
      // operator find out only from a misleading success message.
      if (alreadyCutCount > 0 && parsedCount <= alreadyCutCount) {
        setErrorMsg(
          `⚠️ This SKU already has ${alreadyCutCount} piece(s) logged for ${selectedStage}. Enter a count higher than ${alreadyCutCount} to add new pieces.`,
        );
        return;
      }

      const isLiningLocal = selectedStage === 'Lining';
      const lotIdLocal = lotResults.length === 1 ? lotResults[0].lot_id : null;
      const logPayload = {
        screen_context: isLiningLocal ? 'LINING_CUT' : 'LEATHER_CUT',
        actor: { employee_id: workerId },
        targets: {
          sku_id: skuObj.sku_id,
          piece_seqs: Array.from({ length: parsedCount }, (_, i) => i + 1)
        },
        work_date: date,
        consumption: {
          dcm: barcodeDcm ? Number(barcodeDcm) : 10
        }
      };
      if (lotIdLocal) {
        if (isLiningLocal) logPayload.consumption.lining_lot_id = lotIdLocal;
        else logPayload.consumption.leather_lot_id = lotIdLocal;
      } else {
        logPayload.consumption.article = lotArticle;
        if (lotColor) logPayload.consumption.colour = lotColor;
        if (lotThickness) logPayload.consumption.thickness = lotThickness;
      }
      if (isLiningLocal) {
        delete logPayload.consumption; // Lining ku consumption thevaiyilla!
      }
      const result = await productionCutting(logPayload).unwrap();

      // Bug fix: the real response field is `count_logged`/`logged` (piece
      // code strings) — `result.count`/`result.pieces` never existed, so this
      // always silently fell back to the requested count even when nothing
      // was actually logged (e.g. all pieces already recorded as rework).
      if (result.count_logged > 0) {
        setSuccessMsg(
          `✅ Cut ${result.count_logged} pieces successfully saved.`,
        );
      } else {
        setErrorMsg(
          `⚠️ ${result.message || "Nothing new was logged — pieces may already be recorded at this stage."}`,
        );
      }
      const extractSeq = (code) => {
        const n = parseInt(String(code).split("-").pop(), 10);
        return isNaN(n) ? null : n;
      };
      setLastSubmittedPieceSeqs(
        (result.logged || []).map(extractSeq).filter((n) => n !== null),
      );
      setMintedCountMap((prev) => ({
        ...prev,
        [skuObj.sku_id]: Math.max(prev[skuObj.sku_id] || 0, parsedCount),
      }));
      setCuttingCount("");
      setPieceSeqs("");
    } catch (err) {
      setErrorMsg(`Cutting failed: ${err.message}`);
    } finally {
      setIsSavingCutting(false);
    }
  };

  const handleConfirmCuttingSave = async () => {
    // Double check check-in status when confirming
    const currentWorker = workers.find((w) => w.id === workerId);
    try {
      const rosterData = await triggerGetAttendance().unwrap();
      const rosterArray = normalizeRosterArray(rosterData);
      const workerRoster = rosterArray.find(
        (r) => String(r.employee_id) === String(workerId),
      );
      if (!workerRoster) {
        setShowPrintModal(false);
        setCuttingPieces([]);
        setWarningWorkerName(currentWorker?.name || "Unknown");
        setShowCheckInWarning(true);
        setTimeout(() => setShowCheckInWarning(false), 2000);
        return;
      } else if (workerRoster.check_out_at) {
        setShowPrintModal(false);
        setCuttingPieces([]);
        setWarningWorkerName(currentWorker?.name || "Unknown");
        setShowCheckOutWarning(true);
        setTimeout(() => setShowCheckOutWarning(false), 2000);
        return;
      }
    } catch (e) {
      console.warn("Failed to verify attendance", e);
    }

    setIsSavingCutting(true);
    try {
      const skuObj = fetchedSkus.find((s) => s.code === skuCode);
      const parsedCount = parseInt(cuttingCount, 10);

      const isLiningLocal = selectedStage === 'Lining';
      const lotIdLocal = lotResults.length === 1 ? lotResults[0].lot_id : null;
      const logPayload = {
        screen_context: isLiningLocal ? 'LINING_CUT' : 'LEATHER_CUT',
        actor: { employee_id: workerId },
        targets: {
          sku_id: skuObj.sku_id,
          piece_seqs: Array.from({ length: parsedCount }, (_, i) => i + 1)
        },
        work_date: date,
        consumption: {
          dcm: barcodeDcm ? Number(barcodeDcm) : 10
        }
      };
      if (lotIdLocal) {
        if (isLiningLocal) logPayload.consumption.lining_lot_id = lotIdLocal;
        else logPayload.consumption.leather_lot_id = lotIdLocal;
      } else {
        logPayload.consumption.article = lotArticle;
        if (lotColor) logPayload.consumption.colour = lotColor;
        if (lotThickness) logPayload.consumption.thickness = lotThickness;
      }
      if (isLiningLocal) {
        delete logPayload.consumption; // Lining ku consumption thevaiyilla!
      }
      const result = await productionCutting(logPayload).unwrap();

      setSuccessMsg(
        `✅ Cut ${result.count_logged || parsedCount} pieces successfully saved.`,
      );
      const extractSeq = (code) => {
        const n = parseInt(String(code).split("-").pop(), 10);
        return isNaN(n) ? null : n;
      };
      setLastSubmittedPieceSeqs(
        (result.logged || []).map(extractSeq).filter((n) => n !== null),
      );

      setShowPrintModal(false);
      setCuttingPieces([]);
      setSkuCode("");
      setCuttingCount("");
      setWorkerId("");
    } catch (err) {
      setErrorMsg(`Cutting failed: ${err.message}`);
    } finally {
      setIsSavingCutting(false);
    }
  };

  const openChecklistModal = async () => {
    const activeOp = selectedStage;
    const searchOp = String(activeOp || "")
      .toLowerCase()
      .replace(/[^a-z]/g, "");
    const opRecord =
      operations.find((o) => {
        const opLabel = String(o.label || "")
          .toLowerCase()
          .replace(/[^a-z]/g, "");
        return (
          opLabel === searchOp ||
          opLabel.includes(searchOp) ||
          searchOp.includes(opLabel)
        );
      }) || operations[0];
    const skuObj = fetchedSkus.find((s) => s.code === skuCode);
    if (!opRecord || !skuObj) return setErrorMsg("Operation or SKU invalid");
    setLoadingPieces(true);
    setShowChecklistModal(true);
    setRangeFrom("");
    setRangeTo("");
    try {
    const data = await triggerGetPieces({ skuId: skuObj.sku_id, operationId: opRecord.id }).unwrap();

      let piecesArr = Array.isArray(data) ? data : data.pieces || [];

      // Dynamically sync piece list with submitted count for this SKU (e.g. 12 pieces)
      const maxCount = mintedCountMap[skuObj.sku_id] || 0;
      if (maxCount > 0 && piecesArr.length < maxCount) {
        piecesArr = Array.from({ length: maxCount }, (_, i) => {
          const seqNum = i + 1;
          const existing = piecesArr.find((p) => p.seq === seqNum);
          return (
            existing || {
              piece_id: `piece-${skuObj.sku_id}-${seqNum}`,
              seq: seqNum,
              current_stage_label: "Cutting",
              done_at_op: false,
            }
          );
        });
      }

      setChecklistPieces(piecesArr);
      const total = piecesArr.length;
      const done = piecesArr.filter((p) => p.done_at_op).length;
      setPiecesMeta({ total, done, pending: total - done });
    } catch (err) {
      setChecklistError(err.message);
    } finally {
      setLoadingPieces(false);
    }
  };

  const submitChecklist = async () => {
    const activeOp = selectedStage;
    const searchOp = String(activeOp || "")
      .toLowerCase()
      .replace(/[^a-z]/g, "");
    const opRecord =
      operations.find((o) => {
        const opLabel = String(o.label || "")
          .toLowerCase()
          .replace(/[^a-z]/g, "");
        return (
          opLabel === searchOp ||
          opLabel.includes(searchOp) ||
          searchOp.includes(opLabel)
        );
      }) || operations[0];
    const skuObj = fetchedSkus.find((s) => s.code === skuCode);
    const currentWorker = workers.find((w) => w.id === workerId);

    try {
      const rosterData = await triggerGetAttendance().unwrap();
      const rosterArray = normalizeRosterArray(rosterData);
      const workerRoster = rosterArray.find(
        (r) => String(r.employee_id) === String(workerId),
      );
      if (!workerRoster) {
        setShowChecklistModal(false);
        setWarningWorkerName(currentWorker?.name || "Unknown");
        setShowCheckInWarning(true);
        setTimeout(() => setShowCheckInWarning(false), 2000);
        return;
      } else if (workerRoster.check_out_at) {
        setShowChecklistModal(false);
        setWarningWorkerName(currentWorker?.name || "Unknown");
        setShowCheckOutWarning(true);
        setTimeout(() => setShowCheckOutWarning(false), 2000);
        return;
      }
    } catch (e) {
      console.warn("Failed to verify attendance", e);
    }

    setChecklistSubmitting(true);
    try {
      let bucketRes = null;
      try {
        const isCutStage = selectedStage.toUpperCase().includes("CUT");
        const logPayload = {
          screen_context: isCutStage ? "LEATHER_CUT" : "PIPELINE",
          actor: currentWorker?.employee_barcode
            ? { employee_barcode: currentWorker.employee_barcode }
            : { employee_id: workerId },
          targets:
            scannedBarcodes.length > 0
              ? { piece_barcodes: scannedBarcodes }
              : { sku_id: skuObj.sku_id, piece_seqs: selectedPieces },
          work_date: date,
          ...(isCutStage
            ? { consumption: { dcm: Number(barcodeDcm || 10) } }
            : {}),
        };
        bucketRes = await productionLogTwoDoor(logPayload).unwrap();
        const hasRealBlocks =
          bucketRes?.sequence_blocked?.length > 0 ||
          bucketRes?.merge_blocked?.length > 0 ||
          bucketRes?.not_found?.length > 0;
        if (bucketRes && hasRealBlocks) {
          setBucketResult(bucketRes);
          setShowBucketModal(true);
        }
      } catch (twoDoorErr) {
        console.warn("Two-door API fallback to addScanEvent", twoDoorErr);
        await addScanEvent({
          operation_id: opRecord.id,
          employee_id: workerId,
          work_date: date,
          sku_id: skuObj.sku_id,
          piece_seqs: selectedPieces,
        });
      }

      // Record local stage completion for whichever pieces were actually submitted —
      // this is what isStageReady()/PREREQUISITE_MAP reads to unlock the next stage
      // button. Manual door was missing this entirely, so completions here never
      // propagated to the sequence gate (parity fix with the barcode door).
      const submittedCodes =
        scannedBarcodes.length > 0
          ? scannedBarcodes
          : selectedPieces.map((seq) => `${skuObj?.code || skuCode}-${seq}`);
      submittedCodes.forEach((code) =>
        recordStageCompletion(selectedStage, code),
      );
      if (skuObj?.code) recordStageCompletion(selectedStage, skuObj.code);

      setSuccessMsg("Success!");
      setLastSubmittedPieceSeqs([...selectedPieces]);
      setShowChecklistModal(false);
      setSelectedPieces([]);
      setScannedBarcodes([]);
      setPieceSeqs("");
      setWorkerId("");
      setCuttingCount("");
    } catch (err) {
      setChecklistError(err.message);
    } finally {
      setChecklistSubmitting(false);
    }
  };

  // NOTE: the Excel/Breakdown-Sheet import feature (handleFileUpload,
  // handleCommit, fileInputRef, uploadLoading/showPreviewModal/previewData/
  // fileName/commitLoading/showOrderNumModal/uploadOrderNumber/
  // uploadOrderNumberError, plus the Order Number Modal and Excel Preview
  // Modal JSX) moved to page.js — its trigger button + hidden file input
  // live in the shared TITLE SECTION, rendered unconditionally regardless of
  // which door is active, not nested inside this door's own block.

  return (
    <>
      <ManualDoorForm
  handleSubmit={handleSubmit}
  isFullAccess={isFullAccess}
  isStageAllowedForRole={isStageAllowedForRole}
  workerModalRef={workerModalRef}
  isWorkerOpen={isWorkerOpen}
  setIsWorkerOpen={setIsWorkerOpen}
  workerSearchQuery={workerSearchQuery}
  setWorkerSearchQuery={setWorkerSearchQuery}
  currentSelectedWorker={currentSelectedWorker}
  searchFilteredWorkers={searchFilteredWorkers}
  workerId={workerId}
  workerVerifying={workerVerifying}
  handleSelectWorker={handleSelectWorker}
  setErrorMsg={setErrorMsg}
  selectedStage={selectedStage}
  setSelectedStage={setSelectedStage}
  pieceSeqs={pieceSeqs}
  setPieceSeqs={setPieceSeqs}
  skuModalRef={skuModalRef}
  setSkuRefreshKey={refetchSkus}
  skusLoading={skusLoading}
  isSkuOpen={isSkuOpen}
  setIsSkuOpen={setIsSkuOpen}
  skuSearchQuery={skuSearchQuery}
  setSkuSearchQuery={setSkuSearchQuery}
  visibleCount={visibleCount}
  setVisibleCount={setVisibleCount}
  searchFilteredSkus={searchFilteredSkus}
  skuCode={skuCode}
  setSkuCode={setSkuCode}
  currentSelectedSku={currentSelectedSku}
  alreadyCutCount={alreadyCutCount}
  lotArticle={lotArticle}
  setLotArticle={setLotArticle}
  lotColor={lotColor}
  setLotColor={setLotColor}
  lotThickness={lotThickness}
  setLotThickness={setLotThickness}
  lotOptions={lotOptions}
  lotResults={lotResults}
  lotLoading={lotLoading}
  barcodeDcm={barcodeDcm}
  setBarcodeDcm={setBarcodeDcm}
  cuttingCount={cuttingCount}
  setCuttingCount={setCuttingCount}
  openChecklistModal={openChecklistModal}
  date={date}
  setDate={setDate}
  isSavingCutting={isSavingCutting}
  checklistSubmitting={checklistSubmitting}
  setShowAnalyticsModal={setShowAnalyticsModal}
/>

   <TravelerPrintModal
  mounted={mounted}
  show={showPrintModal}
  setShow={setShowPrintModal}
  cuttingPieces={cuttingPieces}
  setCuttingPieces={setCuttingPieces}
  isSavingCutting={isSavingCutting}
  onConfirm={handleConfirmCuttingSave}
/>

<CheckInWarningModal mounted={mounted} show={showCheckInWarning} workerName={warningWorkerName} />
<CheckOutWarningModal mounted={mounted} show={showCheckOutWarning} workerName={warningWorkerName} />
 <AnalyticsPopupModal
  mounted={mounted}
  show={showAnalyticsModal}
  setShow={setShowAnalyticsModal}
  currentSelectedSku={currentSelectedSku}
  analyticsData={analyticsData}
  setAnalyticsData={setAnalyticsData}
  lastSubmittedPieceSeqs={lastSubmittedPieceSeqs}
/>
<PieceChecklistModal
  mounted={mounted}
  show={showChecklistModal}
  setShow={setShowChecklistModal}
  selectedStage={selectedStage}
  skuCode={skuCode}
  piecesMeta={piecesMeta}
  selectedPieces={selectedPieces}
  setSelectedPieces={setSelectedPieces}
  loadingPieces={loadingPieces}
  checklistError={checklistError}
  setChecklistError={setChecklistError}
  checklistPieces={checklistPieces}
  openChecklistModal={openChecklistModal}
  rangeFrom={rangeFrom}
  setRangeFrom={setRangeFrom}
  rangeTo={rangeTo}
  setRangeTo={setRangeTo}
  checklistSubmitting={checklistSubmitting}
  submitChecklist={submitChecklist}
  currentSelectedSku={currentSelectedSku}
/>
</>
  );
}
