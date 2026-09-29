"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useGetEmployeesQuery } from "@/store/slices/adminApiSlice";

import {
  useLazyBarcodeResolveQuery,
  useLazyListStorePiecesQuery,
  useStoreScanMutation,
  useStoreSendMutation,
} from "@/store/slices/apiSlice";

import StoreHubForm from "./StoreHubForm";
import { matchesStoreTab, getStoreParts } from "./storeParts";
import { useSelector, useDispatch } from "react-redux";
import {
  setStorePieceInput as reduxSetStorePieceInput,
  setStoreCurrentScan as reduxSetStoreCurrentScan,
  setStoreFilters,
  setPieceLookupInput as reduxSetPieceLookupInput,
} from "@/store/slices/storeHubSlice";

export default function StoreHubSection({
  setSuccessMsg,
  setErrorMsg,
  recordStageCompletion,
  storeSendedSkus,
  setStoreSendedSkus,
  storeReceiveStatus,
  setStoreReceiveStatus,
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
  const userRole = String(
    (typeof user === "object" ? user?.role : user) ||
    (typeof window !== "undefined" ? localStorage.getItem("kairox_user") : "") ||
    ""
  ).toLowerCase();

  const isSuperuser = userRole === "managing_director" || userRole === "direct_manager" || userRole === "admin";
  const canApproveSubstitutions = isSuperuser;
  const canScanAndSend = isSuperuser || userRole === "stitching_manager" || userRole === "store_manager" || userRole === "store_scan";
  const canRecordManualIssue = isSuperuser || userRole === "store_manager" || userRole === "store_scan";

  const { data: workers = [] } = useGetEmployeesQuery();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [storeApiLoading, setStoreApiLoading] = useState(false);
  const [storePieces, setStorePieces] = useState([]);
  const [storeLoading, setStoreLoading] = useState(false);
  const [selectedPieces, setSelectedPieces] = useState(new Set());
  const [batchSending, setBatchSending] = useState(false);
  const [storeTotal, setStoreTotal] = useState(0);
  const [lastScan, setLastScan] = useState(null);

  const dispatch = useDispatch();
  const [triggerBarcodeResolve] = useLazyBarcodeResolveQuery();
  const [triggerListStorePieces] = useLazyListStorePiecesQuery();
  const [storeScan] = useStoreScanMutation();
  const [storeSend] = useStoreSendMutation();

  const storePieceInput = useSelector((state) => state.storeHub.storePieceInput);
  const storeCurrentScan = useSelector((state) => state.storeHub.storeCurrentScan);
  const storeFilterType = useSelector((state) => state.storeHub.storeFilterType);
  const storePieceSearch = useSelector((state) => state.storeHub.storeDrawerSearch);
  const pieceLookupInput = useSelector((state) => state.storeHub.pieceLookupInput);

  const setStorePieceInput = (val) => dispatch(reduxSetStorePieceInput(val));
  const setStoreCurrentScan = (val) => dispatch(reduxSetStoreCurrentScan(val));
  const setPieceLookupInput = (val) => dispatch(reduxSetPieceLookupInput(val));
  const setStoreFilterType = (val) => dispatch(setStoreFilters({ type: val }));
  const setStorePieceSearch = (val) => dispatch(setStoreFilters({ search: val }));

  const [storeVisibleCount, setStoreVisibleCount] = useState(50);
  const [storeLotInput, setStoreLotInput] = useState("");
  const [inspectPieceCode, setInspectPieceCode] = useState(null);
  const [manualIssueModalOpen, setManualIssueModalOpen] = useState(false);

  const storeInputRef = useRef(null);
  const observerRef = useRef();
  const lastPieceElementRef = useCallback((node) => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setStoreVisibleCount((prev) => prev + 50);
        }
      },
      { rootMargin: "400px" }
    );
    if (node) observerRef.current.observe(node);
  }, []);

  const fetchLivePieces = useCallback(async () => {
    if (!token) return;
    setStoreLoading(true);
    try {
      const res = await triggerListStorePieces({ limit: 50 }).unwrap();
      const items = res?.pieces || res?.items || (Array.isArray(res) ? res : []);
      setStorePieces(items);
      if (typeof res?.total === "number") setStoreTotal(res.total);
    } catch (err) {
      console.warn("[Store Hub] GET /api/v1/store/pieces:", err);
      const msg = err?.data?.detail || err.message;
      if (msg && String(msg).includes("401")) {
        setErrorMsg("⚠️ Authentication 401: Token expired or role unauthorized.");
      } else if (msg) {
        setErrorMsg(typeof msg === "string" ? msg : "Failed to load store pieces.");
      }
    } finally {
      setStoreLoading(false);
    }
  }, [token, triggerListStorePieces, setErrorMsg]);

  useEffect(() => {
    fetchLivePieces();
  }, [fetchLivePieces]);

  const handleStoreVerify = async (pieceOverride, lotOverride) => {
    setStoreApiLoading(true);
    setErrorMsg("");
    setStoreReceiveStatus("pending");
    try {
      const pieceVal = (typeof pieceOverride === "string" ? pieceOverride : storePieceInput).trim();
      const lotVal = (typeof lotOverride === "string" ? lotOverride : storeLotInput).trim();

      if (!pieceVal) {
        setErrorMsg("No piece barcode provided.");
        setStoreApiLoading(false);
        return;
      }

      const payload = {};
      if (barcodeWorker) {
        if (barcodeWorker.employee_barcode || barcodeWorker.barcode) {
          payload.employee_barcode = barcodeWorker.employee_barcode || barcodeWorker.barcode;
        } else if (barcodeWorker.id) {
          payload.employee_id = barcodeWorker.id;
        }
      }

      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(pieceVal);
      if (isUUID) {
        payload.piece_id = pieceVal.toLowerCase();
      } else {
        payload.piece_barcode = pieceVal;
      }

      if (lotVal) {
        payload.lot_barcode = lotVal;
        payload.part = "accessory";
      }

      const res = await storeScan(payload).unwrap();
      setLastScan(res);
      setStoreReceiveStatus("received");
      setSuccessMsg(`Piece scan logged successfully! (${res.store_state || res.state || "OK"})`);

      setTimeout(() => {
        setStorePieceInput("");
        setStoreCurrentScan("");
        setStoreLotInput("");
        setTimeout(() => storeInputRef.current?.focus(), 150);
      }, 1500);

      await fetchLivePieces();
    } catch (err) {
      const msg = err?.data?.detail || err.message || "Store scan failed.";
      if (typeof msg === "string" && msg.includes("WRONG SIZE")) {
        setErrorMsg(`⚠️ ${msg}`);
        setSubstitutionsModalOpen(true);
      } else {
        setErrorMsg(typeof msg === "string" ? msg : "Store scan failed.");
      }
    } finally {
      setStoreApiLoading(false);
    }
  };

  const handleStoreScanInput = async (rawVal, lotVal) => {
    const val = String(rawVal || "").trim();
    if (!val) return;
    setStoreCurrentScan("");
    setErrorMsg("");

    setStorePieceInput(val);
    setSuccessMsg(`✅ Piece '${val}' detected! Ready to Log Scan.`);
    setTimeout(() => handleStoreVerify(val, lotVal), 100);
  };

  useEffect(() => {
    if (barcodeWorker) {
      setTimeout(() => storeInputRef.current?.focus(), 150);
    }
  }, [barcodeWorker]);

  const togglePieceSelection = (pieceId) => {
    setSelectedPieces((prev) => {
      const next = new Set(prev);
      next.has(pieceId) ? next.delete(pieceId) : next.add(pieceId);
      return next;
    });
  };

  const handleBatchSendPieces = async (explicitPieceIds) => {
    const sourceIds = explicitPieceIds || Array.from(selectedPieces);
    if (sourceIds.length === 0) return;

    setBatchSending(true);
    try {
      const res = await storeSend({ piece_ids: sourceIds }).unwrap();
      const count = res?.count_sent ?? sourceIds.length;
      setSuccessMsg(`Released ${count} piece(s) to line stitching! ${res?.message || ""}`);
      setSelectedPieces(new Set());
      await fetchLivePieces();
    } catch (err) {
      const msg = err?.data?.detail || err.message || "Failed to send pieces.";
      setErrorMsg(typeof msg === "string" ? msg : "Failed to send pieces.");
    } finally {
      setBatchSending(false);
    }
  };

  const handleFindPiece = async () => {
    const val = pieceLookupInput.trim();
    if (!val) return;
    setStorePieceSearch(val);
  };

  const filteredStorePieces = storePieces.filter((p) => {
    if (!matchesStoreTab(p, storeFilterType)) {
      return false;
    }
    if (storePieceSearch) {
      const search = storePieceSearch.toLowerCase();
      const codeMatches = (p.piece_code || p.code || "").toLowerCase().includes(search);
      const articleMatches = (p.article || "").toLowerCase().includes(search);
      return codeMatches || articleMatches;
    }
    return true;
  });

  return (
    <StoreHubForm
      token={token}
      workers={workers}
      mounted={mounted}
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

      storePieceInput={storePieceInput}
      setStorePieceInput={setStorePieceInput}
      storeCurrentScan={storeCurrentScan}
      setStoreCurrentScan={setStoreCurrentScan}

      storeLotInput={storeLotInput}
      setStoreLotInput={setStoreLotInput}

      userRole={userRole}
      canApproveSubstitutions={canApproveSubstitutions}
      canScanAndSend={canScanAndSend}
      canRecordManualIssue={canRecordManualIssue}

      inspectPieceCode={inspectPieceCode}
      setInspectPieceCode={setInspectPieceCode}
      manualIssueModalOpen={manualIssueModalOpen}
      setManualIssueModalOpen={setManualIssueModalOpen}
      setSuccessMsg={setSuccessMsg}
      setErrorMsg={setErrorMsg}

      storeApiLoading={storeApiLoading}
      storePieces={storePieces}
      filteredStorePieces={filteredStorePieces}
      storeTotal={storeTotal}
      lastScan={lastScan}

      storeFilterType={storeFilterType}
      setStoreFilterType={setStoreFilterType}
      storePieceSearch={storePieceSearch}
      setStorePieceSearch={setStorePieceSearch}

      pieceLookupInput={pieceLookupInput}
      setPieceLookupInput={setPieceLookupInput}
      handleFindPiece={handleFindPiece}

      selectedPieces={selectedPieces}
      setSelectedPieces={setSelectedPieces}
      togglePieceSelection={togglePieceSelection}
      batchSending={batchSending}
      handleBatchSendPieces={handleBatchSendPieces}

      storeVisibleCount={storeVisibleCount}
      setStoreVisibleCount={setStoreVisibleCount}
      lastPieceElementRef={lastPieceElementRef}

      fetchLivePieces={fetchLivePieces}
      storeLoading={storeLoading}
      storeInputRef={storeInputRef}

      handleStoreVerify={handleStoreVerify}
      handleStoreScanInput={handleStoreScanInput}
    />
  );
}
