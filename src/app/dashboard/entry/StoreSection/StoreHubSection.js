"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useGetEmployeesQuery } from '@/store/slices/adminApiSlice';

import {
  useLazyBarcodeResolveQuery,
  useLazyListStorePiecesQuery,
  useStoreScanMutation,
  useStoreSendMutation,
} from "@/store/slices/apiSlice";

import StoreHubForm from "./StoreHubForm";
import { useSelector, useDispatch } from 'react-redux';
import { 
  setStorePieceInput as reduxSetStorePieceInput, 
  setStoreCurrentScan as reduxSetStoreCurrentScan, 
  setStoreFilters, 
  setExpandedPiece as reduxSetExpandedPiece, 
  setPieceLookupInput as reduxSetPieceLookupInput, 
} from '@/store/slices/storeHubSlice';

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
  const { token } = useAuth();
  const { data: workers = [] } = useGetEmployeesQuery();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [storeApiLoading, setStoreApiLoading] = useState(false);
  const [storePieces, setStorePieces] = useState([]);
  const [storeLoading, setStoreLoading] = useState(false);
  const [selectedPieces, setSelectedPieces] = useState(new Set());
  const [batchSending, setBatchSending] = useState(false);
  const [storeTotal, setStoreTotal] = useState(0);

  const dispatch = useDispatch();
  const [triggerBarcodeResolve] = useLazyBarcodeResolveQuery();
  const [triggerListStorePieces] = useLazyListStorePiecesQuery();
  const [storeScan] = useStoreScanMutation();
  const [storeSend] = useStoreSendMutation();

  const storePieceInput = useSelector(state => state.storeHub.storePieceInput);
  const storeCurrentScan = useSelector(state => state.storeHub.storeCurrentScan);
  const storeFilterType = useSelector(state => state.storeHub.storeFilterType);
  const storePieceSearch = useSelector(state => state.storeHub.storeDrawerSearch); // Reusing Redux field
  const expandedPiece = useSelector(state => state.storeHub.expandedDrawer); // Reusing Redux field
  const pieceLookupInput = useSelector(state => state.storeHub.pieceLookupInput);

  const setStorePieceInput = (val) => dispatch(reduxSetStorePieceInput(val));
  const setStoreCurrentScan = (val) => dispatch(reduxSetStoreCurrentScan(val));
  const setExpandedPiece = (val) => dispatch(reduxSetExpandedPiece(val));
  const setPieceLookupInput = (val) => dispatch(reduxSetPieceLookupInput(val));
  const setStoreFilterType = (val) => dispatch(setStoreFilters({ type: val }));
  const setStorePieceSearch = (val) => dispatch(setStoreFilters({ search: val }));

  const [storeVisibleCount, setStoreVisibleCount] = useState(50);
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
      { rootMargin: "400px" },
    );
    if (node) observerRef.current.observe(node);
  }, []);

  const fetchLivePieces = useCallback(async () => {
    if (!token) return;
    setStoreLoading(true);
    try {
      const res = await triggerListStorePieces({ limit: 50 }).unwrap();
      const items = res?.items || (Array.isArray(res) ? res : []);
      setStorePieces(items);
      if (typeof res?.total === "number") setStoreTotal(res.total);
    } catch (err) {
      console.warn("[Store Hub] GET /api/v1/store/pieces:", err);
      if (err.message && err.message.includes("401")) {
        setErrorMsg("⚠️ Authentication 401: Token expired or role unauthorized.");
      }
    } finally {
      setStoreLoading(false);
    }
  }, [token, triggerListStorePieces, setErrorMsg]);

  useEffect(() => {
    fetchLivePieces();
  }, [fetchLivePieces]);

  const handleStoreVerify = async (pieceOverride) => {
    setStoreApiLoading(true);
    setErrorMsg("");
    setStoreReceiveStatus("pending");
    try {
      const pieceVal = (typeof pieceOverride === "string" ? pieceOverride : storePieceInput).trim();
      if (!pieceVal) {
         setErrorMsg("No piece provided.");
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

      const res = await storeScan(payload).unwrap();
      setStoreReceiveStatus("received");
      setSuccessMsg(`Piece scan logged successfully! (${res.state || "OK"})`);

      setTimeout(() => {
        setStorePieceInput("");
        setStoreCurrentScan("");
        setTimeout(() => storeInputRef.current?.focus(), 150);
      }, 1500);

      await fetchLivePieces();
    } catch (err) {
      setErrorMsg(err.message || "Store scan failed.");
    } finally {
      setStoreApiLoading(false);
    }
  };

  const handleStoreScanInput = async (rawVal) => {
    const val = String(rawVal || "").trim();
    if (!val) return;
    setStoreCurrentScan("");
    setErrorMsg("");

    setStorePieceInput(val);
    setSuccessMsg(`✅ Piece '${val}' detected! Ready to Log Scan.`);
    setTimeout(() => handleStoreVerify(val), 100);
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
      await storeSend({ piece_ids: sourceIds }).unwrap();
      
      setSuccessMsg(`Sent ${sourceIds.length} pieces successfully!`);
      setSelectedPieces(new Set());
      await fetchLivePieces();
    } catch (err) {
      setErrorMsg(err.message || "Failed to send pieces.");
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
    if (storeFilterType !== "All" && p.store_state !== storeFilterType.toUpperCase()) {
      return false;
    }
    if (storePieceSearch) {
      const search = storePieceSearch.toLowerCase();
      const codeMatches = (p.code || "").toLowerCase().includes(search);
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
      
      storeApiLoading={storeApiLoading}
      storePieces={storePieces}
      filteredStorePieces={filteredStorePieces}
      storeTotal={storeTotal}
      
      storeFilterType={storeFilterType}
      setStoreFilterType={setStoreFilterType}
      storePieceSearch={storePieceSearch}
      setStorePieceSearch={setStorePieceSearch}
      
      expandedPiece={expandedPiece}
      setExpandedPiece={setExpandedPiece}
      
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
