// STORE HUB — LOGIC FILE
// All state, effects, and handler functions (scan / verify / transition /
// batch-send / refresh) for the Store Hub door live here. This file has
// NO JSX of its own — it renders <StoreHubForm> and passes everything
// down as props. The actual UI/JSX is in ./StoreHubForm.js.

"use client";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import {
  apiBarcodeResolve,
  apiListDrawers,
  apiGetDrawer,
  apiGetDrawerPool,
  apiGetPieceState,
  apiReceiveDrawer,
  apiSendDrawers,
  apiStoreDrawerScan,
} from "@/lib/api";
import StoreHubForm from "./StoreHubForm";
function mapDrawerRecord(d) {
  const leatherIn = !!d.leather_in;
  const liningIn = !!d.lining_in;
  let type;
  if (d.leather_in !== undefined || d.lining_in !== undefined) {
    type =
      leatherIn && liningIn
        ? "Both"
        : leatherIn
          ? "Leather"
          : liningIn
            ? "Lining"
            : "Empty";
  } else {
    const holdingNorm = (d.holding || "").toLowerCase();
    const stateNorm = (d.state || "").toLowerCase();
    type = holdingNorm.includes("both")
      ? "Both"
      : holdingNorm.includes("leather")
        ? "Leather"
        : holdingNorm.includes("lining")
          ? "Lining"
          : stateNorm.includes("both")
            ? "Both"
            : stateNorm.includes("leather")
              ? "Leather"
              : stateNorm.includes("lining")
                ? "Lining"
                : "Empty";
  }
 return {
    id: d.code || d.barcode || `DRW-${String(d.seq).padStart(4, "0")}`,
    drawer_id: d.drawer_id || d.id, // Keep the UUID for API calls
    type,
    holding: d.holding || "EMPTY",
    status: d.state || "Free",
    client: d.caption || "Store Rack",
    style: d.code || "-",
    pieces: d.seq || 0,
    // Expanded Piece & Stage Breakdown Details
    order_number: d.order_number || d.order_id || "PO-1001",
    style_name: d.style_name || d.style || d.code || "ADELE-38",
    article: d.article || d.material || "LEATHER",
    serial: d.serial || d.serial_no || "001",
    colour: d.colour || d.color || "BLACK",
    size: d.size || "38",
    drawer_code:
      d.code || d.drawer_code || `DRW-${String(d.seq || 1).padStart(4, "0")}`,
    leather_in: leatherIn,
    lining_in: liningIn,
    can_send: d.can_send,
    piece_code: d.piece_code || d.piece?.code || null,
    leather_piece_code:
      d.leather_piece_code ||
      d.leather?.piece_code ||
      d.piece_code ||
      d.piece?.code ||
      null,
    leather_article:
      d.leather_article || d.leather?.article || d.article || null,
    leather_colour:
      d.leather_colour ||
      d.leather_color ||
      d.leather?.colour ||
      d.leather?.color ||
      d.colour ||
      d.color ||
      null,
    lining_piece_code:
      d.lining_piece_code ||
      d.lining?.piece_code ||
      d.piece_code ||
      d.piece?.code ||
      d.piece?.label_line ||
      null,
    lining_article: d.lining_article || d.lining?.article || d.article || null,
    lining_colour:
      d.lining_colour ||
      d.lining_color ||
      d.lining?.colour ||
      d.lining?.color ||
      d.colour ||
      d.color ||
      null,
    accessories_in: !!d.accessories_in,
    kit_required: !!d.kit_required,
  };
}
async function findDrawerByCodeFallback(token, code) {
  const target = String(code || "").trim();
  if (!target) return null;
  const res = await apiListDrawers(token, { code: target, limit: 50 });
  const items = res?.items || (Array.isArray(res) ? res : []);
  const upper = target.toUpperCase();
  const exact = items.find(
    (d) => (d.code || d.barcode || "").toUpperCase() === upper,
  );
  const item = exact || items[0] || null;
  return item ? mapDrawerRecord(item) : null;
}

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
  const { workers } = useData();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [storeDrawerInput, setStoreDrawerInput] = useState("");
  const [storePieceInput, setStorePieceInput] = useState("");
  const [storeScanPart, setStoreScanPart] = useState("LEATHER"); // 'LEATHER' or 'LINING' — same barcode, different part gate
  const [storeCurrentScan, setStoreCurrentScan] = useState("");
  const skuCode = "";
  const [storeVerifyResult, setStoreVerifyResult] = useState(null);
  const [storeApiLoading, setStoreApiLoading] = useState(false);
  const [storeDrawers, setStoreDrawers] = useState([]);
  const [storeFilterClient, setStoreFilterClient] = useState("All");
  const [storeFilterStyle, setStoreFilterStyle] = useState("All");
  const [storeFilterType, setStoreFilterType] = useState("All");
  const [storeDrawerSearch, setStoreDrawerSearch] = useState("");
  const [expandedDrawer, setExpandedDrawer] = useState(null);
  const [storeLoading, setStoreLoading] = useState(false);
  const [pieceLookupInput, setPieceLookupInput] = useState("");
  const [pieceLookupLoading, setPieceLookupLoading] = useState(false);

  // Bug #13 & #14: Multi-drawer selection for batch assignment
  const [selectedDrawers, setSelectedDrawers] = useState(new Set());
  const [batchSendTarget, setBatchSendTarget] = useState(""); // 'LINING' | 'STITCHING'
  const [batchSending, setBatchSending] = useState(false);

  const [storeVisibleCount, setStoreVisibleCount] = useState(50);

  const observerRef = useRef();
  const lastDrawerElementRef = useCallback((node) => {
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
  const [drawersTotal, setDrawersTotal] = useState(null);
  const pinnedIdsRef = useRef([]); // drawer_id UUIDs, most-recently-touched first
  const pinDrawer = useCallback((drawerId) => {
    if (!drawerId) return;
    pinnedIdsRef.current = [
      drawerId,
      ...pinnedIdsRef.current.filter((id) => id !== drawerId),
    ].slice(0, 10);
  }, []);

  const fetchLiveDrawers = useCallback(async () => {
    if (!token) return;
    setStoreLoading(true);
    try {
      const res = await apiListDrawers(token, { limit: 10 });
      console.log("[Store Hub] GET /api/v1/drawers?limit=10 response:", res);
      const drawerItems = res?.items || (Array.isArray(res) ? res : []);
      let mapped = Array.isArray(drawerItems)
        ? drawerItems.map(mapDrawerRecord)
        : [];
      if (typeof res?.total === "number") setDrawersTotal(res.total);
      const pins = pinnedIdsRef.current;
      if (pins.length > 0) {
        const byUuid = new Map(mapped.map((d) => [d.drawer_id, d]));
        const missing = pins.filter((uuid) => !byUuid.has(uuid));
        if (missing.length > 0) {
          const fetchedMissing = await Promise.all(
            missing.map(async (uuid) => {
              try {
                return mapDrawerRecord(await apiGetDrawer(token, uuid));
              } catch {
                return null;
              }
            }),
          );
          fetchedMissing.forEach((d) => {
            if (d) byUuid.set(d.drawer_id, d);
          });
        }
        const pinnedFirst = pins
          .map((uuid) => byUuid.get(uuid))
          .filter(Boolean);
        // Drop any pin that no longer resolves (drawer gone / fetch failed)
        // so it doesn't keep getting retried forever.
        pinnedIdsRef.current = pinnedFirst.map((d) => d.drawer_id);
        const rest = mapped.filter((d) => !pins.includes(d.drawer_id));
        mapped = [...pinnedFirst, ...rest];
      }
setStoreDrawers(mapped);
    } catch (err) {
      console.warn("[Store Hub] GET /api/v1/drawers:", err);
      if (err.message && err.message.includes("401")) {
        setErrorMsg(
          "⚠️ Authentication 401: Token expired or role unauthorized. Please log in with a valid Manager / Store account.",
        );
      }
    } finally {
      setStoreLoading(false);
    }
  }, [token]);
  const [drawerPool, setDrawerPool] = useState(null);
  const fetchDrawerPool = useCallback(async () => {
    if (!token) return;
    try {
      const pool = await apiGetDrawerPool(token);
      setDrawerPool(pool);
    } catch (err) {
      console.warn("[Store Hub] GET /api/v1/drawers/pool:", err);
    }
  }, [token]);

  useEffect(() => {
    fetchLiveDrawers();
    fetchDrawerPool();
  }, [fetchLiveDrawers, fetchDrawerPool]);

  const resolveDrawerUuid = async (input) => {
    const isUUID = (str) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        str || "",
      );
    if (isUUID(input)) return input.toLowerCase();
    const code = String(input || "")
      .trim()
      .toUpperCase();
    if (!code) return null;

    let matchingDrawer = storeDrawers.find(
      (d) =>
        d.barcode?.toUpperCase() === code ||
        d.code?.toUpperCase() === code ||
        d.id === code ||
        d.drawer_id === code,
    );

    if (!matchingDrawer) {
      try {
        matchingDrawer = await findDrawerByCodeFallback(token, code);
      } catch {
        // Backend lookup failed — fall through, caller handles a null return.
      }
    }

    return matchingDrawer && isUUID(matchingDrawer.drawer_id)
      ? matchingDrawer.drawer_id
      : null;
  };
  const handleFindDrawerForPiece = async (valOverride) => {
    const val = (
      typeof valOverride === "string" ? valOverride : pieceLookupInput
    ).trim();
    if (!val || pieceLookupLoading) return;
    setPieceLookupLoading(true);
    setErrorMsg("");
    try {
      const res = await apiBarcodeResolve(token, val);
      const drawerCode =
        res?.type === "DRAWER"
          ? res.code
          : res?.piece?.drawer?.code || res?.drawer?.drawer_code || null;
      if (!drawerCode) {
        setErrorMsg(`No drawer is assigned to '${val}' yet.`);
        setPieceLookupInput("");
        return;
      }
      let target = storeDrawers.find(
        (d) => d.id.toUpperCase() === drawerCode.toUpperCase(),
      );
      if (!target) {
        try {
          target = await findDrawerByCodeFallback(token, drawerCode);
          if (target) {
            setStoreDrawers((prev) =>
              prev.some((d) => d.id === target.id) ? prev : [target, ...prev],
            );
          }
        } catch {
          // Direct fetch failed — the search/highlight below still runs on
          // whatever's already loaded, just without a forced-in row.
        }
      }

      setStoreDrawerSearch(drawerCode);
      setStoreDrawerInput(drawerCode.toUpperCase());
      if (target) setExpandedDrawer(target.id);
      setSuccessMsg(`📦 '${val}' is assigned to drawer ${drawerCode}.`);
      setPieceLookupInput("");
    } catch (err) {
      setErrorMsg(err.message || `'${val}' was not found.`);
      setPieceLookupInput("");
    } finally {
      setPieceLookupLoading(false);
    }
  };
  const handleStoreVerify = async (pieceOverride, drawerOverride) => {
    setStoreApiLoading(true);
    setErrorMsg("");
    setStoreReceiveStatus("pending");
    try {
      const isUUID = (str) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          str,
        );

      const drawerVal = (
        typeof drawerOverride === "string" ? drawerOverride : storeDrawerInput
      )
        .trim()
        .toUpperCase();
      const pieceVal = (
        typeof pieceOverride === "string" ? pieceOverride : storePieceInput
      ).trim();

      // Step 1: Inspect via GET first — never blindly POST a store-scan
      // without knowing the drawer's real current state.
      const drawerUuid = await resolveDrawerUuid(drawerVal);
      if (drawerUuid) {
        try {
          const drawerDetail = await apiGetDrawer(token, drawerUuid);
          const occupantCode = String(
            drawerDetail?.piece?.code || "",
          ).toUpperCase();
          const scanningSamePiece =
            !pieceVal ||
            !occupantCode ||
            occupantCode === pieceVal.toUpperCase();
          const alreadyProcessed =
            scanningSamePiece &&
            (drawerDetail?.sent === true ||
              ["sended", "received"].includes(
                String(drawerDetail?.state || "").toLowerCase(),
              ));

          if (alreadyProcessed) {
      
            setStoreVerifyResult({
              drawer_id: drawerDetail.drawer_id,
              drawer_code: drawerDetail.code,
              piece_code: drawerDetail.piece?.code,
              state: drawerDetail.state,
              holding: drawerDetail.holding,
              sent_to: drawerDetail.sent_to,
              can_send: drawerDetail.can_send,
              needs_lining: drawerDetail.needs_lining,
              lining_reason: drawerDetail.lining_reason,
              awaiting: drawerDetail.awaiting,
            });
            setStoreReceiveStatus(
              drawerDetail.sent || drawerDetail.state === "sended"
                ? "sended"
                : "received",
            );
            setSuccessMsg(
              `ℹ️ Drawer Status: ${drawerDetail.state || "unknown"} | Holding: ${drawerDetail.holding || "EMPTY"} | Sent to: ${drawerDetail.sent_to || "—"}`,
            );
            return;
          }
        } catch {
          // GET failed (e.g. drawer genuinely not found yet) — fall through
          // to the normal scan-and-create flow below rather than blocking.
        }
      }
      const payload = { part: storeScanPart };

      if (barcodeWorker) {
        if (barcodeWorker.employee_barcode || barcodeWorker.barcode) {
          payload.employee_barcode =
            barcodeWorker.employee_barcode || barcodeWorker.barcode;
        } else if (barcodeWorker.id) {
          payload.employee_id = barcodeWorker.id;
        }
      }

      if (isUUID(drawerVal)) {
        payload.drawer_id = drawerVal.toLowerCase();
      } else {
        payload.drawer_barcode = drawerVal;
      }

      if (isUUID(pieceVal)) {
        payload.piece_id = pieceVal.toLowerCase();
      } else {
        payload.piece_barcode = pieceVal;
      }

      const res = await apiStoreDrawerScan(token, payload);
 
      setStoreReceiveStatus(res.auto_received ? "received" : "pending");
      setSuccessMsg(`Scan logged successfully! (${res.state || "OK"})`);

      // Auto-reset entire scan state and employee scan for leather intake so system is ready for next transaction
      if (storeScanPart === "LEATHER") {
        setTimeout(() => {
          setStoreDrawerInput("");
          setStorePieceInput("");
          setStoreVerifyResult(null);
          setStoreCurrentScan("");
          setBarcodeWorker(null);
          setBarcodeWorkerInput("");
          setTimeout(() => workerInputRef.current?.focus(), 150);
        }, 1800);
      }
      if (drawerUuid) {
        try {
          const freshDetail = await apiGetDrawer(token, drawerUuid);
          const mapped = mapDrawerRecord(freshDetail);
          pinDrawer(mapped.drawer_id);
          setExpandedDrawer(mapped.id);
        } catch {
          // Non-critical — fetchLiveDrawers below still refreshes the list.
        }
      }
      await fetchLiveDrawers();
    } catch (err) {
      const isConflict = err.status === 409;
      setErrorMsg(
        isConflict ? `⚠️ ${err.message}` : err.message || "Verification Failed",
      );
    } finally {
      setStoreApiLoading(false);
    }
  };
  const [storeScanResolving, setStoreScanResolving] = useState(false);
  const handleStoreScanInput = async (rawVal) => {
    const val = String(rawVal || "").trim();
    if (!val || storeScanResolving) return;
    setStoreCurrentScan("");
    setStoreScanResolving(true);
    setErrorMsg("");

    try {
      let resolvedType = null;
      let resolveData = null;
      try {
        resolveData = await apiBarcodeResolve(token, val);
        resolvedType = resolveData?.type || null;
      } catch {
        // Fall back to pattern guessing if not found in registry
        resolvedType = null;
      }

      const valUpper = val.toUpperCase();
      const isDrawerCode =
        resolvedType === "DRAWER" ||
        valUpper.startsWith("DRW-") ||
        valUpper.startsWith("DRAWER");

      const kind = isDrawerCode
        ? "DRAWER"
        : resolvedType === "PIECE"
          ? "PIECE"
          : !storeDrawerInput
            ? "DRAWER"
            : "PIECE";

      if (kind === "DRAWER") {
        const drawerVal = valUpper;

        // Immediate Validation against already scanned Piece
        if (storePieceInput) {
          let expectedDrawerCode = null;
          try {
            const pRes = await apiBarcodeResolve(token, storePieceInput);
            expectedDrawerCode = (
              pRes?.piece?.drawer?.code ||
              pRes?.drawer?.drawer_code ||
              pRes?.drawer?.code ||
              ""
            ).toUpperCase();
            if (!expectedDrawerCode) {
              const pState = await apiGetPieceState(token, {
                code: storePieceInput,
              });
              expectedDrawerCode = (
                pState?.piece?.drawer?.code ||
                pState?.drawer?.code ||
                pState?.piece?.drawer_code ||
                ""
              ).toUpperCase();
            }
          } catch (_) {}

          if (expectedDrawerCode && expectedDrawerCode !== drawerVal) {
            setErrorMsg(
              `⚠️ Mismatch Detected: Scanned Drawer '${drawerVal}' does NOT match Piece '${storePieceInput}' (Assigned Drawer: '${expectedDrawerCode}'). Please rescan the correct Drawer.`,
            );
            setStoreCurrentScan("");
            setTimeout(() => storeInputRef.current?.focus(), 150);
            return;
          }
        }

        setStoreDrawerInput(drawerVal);
        setStoreDrawerSearch(drawerVal);
        if (storePieceInput) {
          setSuccessMsg(
            `✅ Drawer '${drawerVal}' and Piece '${storePieceInput}' verified! Ready to Log Scan.`,
          );
        } else {
          setSuccessMsg(
            `✅ Drawer '${drawerVal}' detected! Now scan the piece barcode.`,
          );
        }
      } else {
        const pieceVal = val;

        // Immediate Validation against already scanned Drawer
        if (storeDrawerInput) {
          let pieceAssignedDrawer = null;
          try {
            const pRes =
              resolveData?.type === "PIECE"
                ? resolveData
                : await apiBarcodeResolve(token, pieceVal);
            pieceAssignedDrawer = (
              pRes?.piece?.drawer?.code ||
              pRes?.drawer?.drawer_code ||
              pRes?.drawer?.code ||
              ""
            ).toUpperCase();
            if (!pieceAssignedDrawer) {
              const pState = await apiGetPieceState(token, { code: pieceVal });
              pieceAssignedDrawer = (
                pState?.piece?.drawer?.code ||
                pState?.drawer?.code ||
                pState?.piece?.drawer_code ||
                ""
              ).toUpperCase();
            }
          } catch (_) {}

          if (
            pieceAssignedDrawer &&
            pieceAssignedDrawer !== storeDrawerInput.toUpperCase()
          ) {
            setErrorMsg(
              `⚠️ Mismatch Detected: Scanned Piece '${pieceVal}' belongs to '${pieceAssignedDrawer}' (not Drawer '${storeDrawerInput}'). Please rescan the correct Piece.`,
            );
            setStoreCurrentScan("");
            setTimeout(() => storeInputRef.current?.focus(), 150);
            return;
          }
        }

        setStorePieceInput(pieceVal);
        if (storeDrawerInput) {
          setSuccessMsg(
            `✅ Piece '${pieceVal}' and Drawer '${storeDrawerInput}' verified! Ready to Log Scan.`,
          );
        } else {
          setSuccessMsg(
            `✅ Piece '${pieceVal}' detected! Now scan the drawer barcode.`,
          );
        }
      }

      setTimeout(() => storeInputRef.current?.focus(), 150);
    } catch (err) {
      setErrorMsg(err.message || "Failed to process barcode scan.");
    } finally {
      setStoreScanResolving(false);
    }
  };
  useEffect(() => {
    if (barcodeWorker) {
      setTimeout(() => storeInputRef.current?.focus(), 150);
    }
  }, [barcodeWorker]);

  const handleStoreTransition = async (transition, overrideDrawerId = null) => {
    setStoreApiLoading(true);
    setErrorMsg("");
    try {
      const isUUID = (str) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          str || "",
        );
      let finalUuid = null;
      const drawerCode =
        storeVerifyResult?.drawer_code ||
        storeDrawerInput.trim().toUpperCase() ||
        "Unknown";

      // 1. Check if override is a valid UUID
      if (isUUID(overrideDrawerId)) {
        finalUuid = overrideDrawerId;
      }

      // 2. Check if storeVerifyResult already contains the valid UUID
      if (!finalUuid && isUUID(storeVerifyResult?.drawer_id)) {
        finalUuid = storeVerifyResult.drawer_id;
      }

      // 3. Fallback: Search in storeDrawers list
      if (!finalUuid) {
        let matchingDrawer = storeDrawers.find(
          (d) =>
            d.barcode?.toUpperCase() === drawerCode ||
            d.code?.toUpperCase() === drawerCode ||
            d.id === drawerCode ||
            d.drawer_id === drawerCode,
        );

        // Not in the loaded latest-10 — search the full live list instead
        // (GET /drawers/by-code/{code} 404s, not deployed yet).
        if (!matchingDrawer && drawerCode.startsWith("DRW-")) {
          try {
            matchingDrawer = await findDrawerByCodeFallback(token, drawerCode);
          } catch (e) {
            console.error("Failed to query specific drawer from backend", e);
          }
        }

        if (matchingDrawer && isUUID(matchingDrawer.drawer_id)) {
          finalUuid = matchingDrawer.drawer_id;
        }
      }

      if (!finalUuid) {
        setStoreApiLoading(false);
        setErrorMsg(
          "System could not resolve the true UUID for this Drawer. Please refresh the page or try scanning again.",
        );
        return;
      }

      const res = await apiReceiveDrawer(token, finalUuid, transition);

      setStoreReceiveStatus(transition.toLowerCase());
      setSuccessMsg(
        `Drawer ${drawerCode} transitioned to ${transition} successfully!`,
      );
      pinDrawer(finalUuid);
      fetchLiveDrawers();

      if (transition === "SENDED") {
        if (skuCode) {
          setStoreSendedSkus((prev) => Array.from(new Set([...prev, skuCode])));
          recordStageCompletion("Pasting", skuCode);
          recordStageCompletion("Fusing", skuCode);
          recordStageCompletion("Store", skuCode);
        }
        if (storePieceInput) {
          recordStageCompletion("Pasting", storePieceInput);
          recordStageCompletion("Fusing", storePieceInput);
          recordStageCompletion("Store", storePieceInput);
        }
        setStoreReceiveStatus("sended");
        setTimeout(() => {
          setStoreDrawerInput("");
          setStorePieceInput("");
          setStoreVerifyResult(null);
          setStoreCurrentScan("");
          setStoreDrawerSearch(""); // Clear list filter after reset
          setBarcodeWorker(null);
          setBarcodeWorkerInput("");
          setTimeout(() => workerInputRef.current?.focus(), 150);
        }, 1500);
      }
    } catch (err) {
      const isConflict = err.status === 409 || err.message.includes("409");
      if (isConflict && transition === "SENDED") {
        const skuFromResult =
          storeVerifyResult?.style || storeVerifyResult?.sku_code || skuCode;
        if (skuFromResult) {
          setStoreSendedSkus((prev) =>
            Array.from(new Set([...prev, skuFromResult])),
          );
          recordStageCompletion("Pasting", skuFromResult);
          recordStageCompletion("Fusing", skuFromResult);
          recordStageCompletion("Store", skuFromResult);
        }
        if (storePieceInput) {
          recordStageCompletion("Pasting", storePieceInput);
          recordStageCompletion("Fusing", storePieceInput);
          recordStageCompletion("Store", storePieceInput);
        }
        setStoreReceiveStatus("sended");
        setSuccessMsg(
          `ℹ️ Drawer was already sent — marked as complete, Line Stitching is now unlocked.`,
        );
      } else if (isConflict) {
        setErrorMsg(
          "409 CONFLICT: Drawer already in this state or cannot be transitioned!",
        );
      } else {
        setErrorMsg(err.message || "Transition Failed");
      }
    } finally {
      setStoreApiLoading(false);
    }
  };
  const handleSendToLineStitching = async () => {
    if (storeReceiveStatus !== "received" && storeReceiveStatus !== "sended") {
      await handleStoreTransition("RECEIVED");
    }
    await handleStoreTransition("SENDED");
  };

  const toggleDrawerSelection = (drawerId) => {
    setSelectedDrawers((prev) => {
      const next = new Set(prev);
      next.has(drawerId) ? next.delete(drawerId) : next.add(drawerId);
      return next;
    });
  };
  const handleBatchSendDrawers = async (target, explicitDrawerIds) => {
    const sourceIds = explicitDrawerIds || Array.from(selectedDrawers);
    if (sourceIds.length === 0) return;
    setBatchSending(true);
    try {
      // These are the mapped `.id` (drawer code, e.g. "DRW-0001"), not the
      // real UUID — resolve each to its `drawer_id` for the API call.
      const drawerIds = sourceIds
        .map((id) => storeDrawers.find((d) => d.id === id)?.drawer_id)
        .filter(Boolean);

      if (drawerIds.length === 0) {
        setErrorMsg(
          "Could not resolve drawer IDs for the selected drawers. Try refreshing the list.",
        );
        return;
      }
        const result = await apiSendDrawers(token, {
        drawer_ids: drawerIds,
        destination: target,
      });
      const sentList = Array.isArray(result?.sent) ? result.sent : [];
      sentList.forEach((item) => {
        const key = item.piece_code || item.drawer_code;
        if (!key) return;
        if (target === "STITCHING") {
          recordStageCompletion("Pasting", key);
          recordStageCompletion("Fusing", key);
          recordStageCompletion("Store", key);
          setStoreSendedSkus((prev) => Array.from(new Set([...prev, key])));
        } else if (target === "LINING") {
          recordStageCompletion("Store", key);
        }
      });

      const notReady = Array.isArray(result?.not_ready) ? result.not_ready : [];
      const notFound = Array.isArray(result?.not_found) ? result.not_found : [];

      setSelectedDrawers(new Set());

      if (notReady.length > 0 || notFound.length > 0) {
        const reasonSample = notReady[0]?.reason
          ? ` (${notReady[0].reason})`
          : "";
        setErrorMsg(
          `⚠️ ${result?.count_sent ?? sentList.length}/${result?.requested ?? drawerIds.length} drawers sent.` +
            `${notReady.length ? ` ${notReady.length} not ready${reasonSample}.` : ""}` +
            `${notFound.length ? ` ${notFound.length} not found.` : ""}`,
        );
      }
      if (sentList.length > 0) {
        setSuccessMsg(
          result?.message ||
            `✅ ${sentList.length} drawer(s) sent to ${target === "STITCHING" ? "Line Stitching" : "Lining"} successfully!`,
        );
      } else if (notReady.length === 0 && notFound.length === 0) {
        setErrorMsg("No drawers were sent.");
      }
      drawerIds.forEach(pinDrawer);
      await fetchLiveDrawers();
    } catch (err) {
      setErrorMsg("Batch send failed: " + (err.message || "Unknown error"));
    } finally {
      setBatchSending(false);
    }
  };
  const storeTotal =
    drawerPool?.pool_size ?? drawersTotal ?? storeDrawers.length;
  const storeFree =
    drawerPool?.free_drawers ??
    storeDrawers.filter((d) => d.type === "Empty").length;
  const { storeLeather, storeLining, storeBoth } = useMemo(
    () => ({
      storeLeather: storeDrawers.filter((d) => d.type === "Leather").length,
      storeLining: storeDrawers.filter((d) => d.type === "Lining").length,
      storeBoth: storeDrawers.filter((d) => d.type === "Both").length,
    }),
    [storeDrawers],
  );
const [freeDrawers, setFreeDrawers] = useState([]);
  const [freeDrawersLoading, setFreeDrawersLoading] = useState(false);
  const fetchFreeDrawers = useCallback(async () => {
    if (!token) return;
    setFreeDrawersLoading(true);
    try {
      const res = await apiListDrawers(token, { has_piece: false, limit: 200 });
      const items = res?.items || (Array.isArray(res) ? res : []);
      setFreeDrawers(Array.isArray(items) ? items.map(mapDrawerRecord) : []);
    } catch (err) {
      console.warn("[Store Hub] GET /api/v1/drawers?has_piece=false:", err);
      setFreeDrawers([]);
    } finally {
      setFreeDrawersLoading(false);
    }
  }, [token]);
 useEffect(() => {
    if (storeFilterType === "Free") fetchFreeDrawers();
  }, [storeFilterType, fetchFreeDrawers]);
  const handleRefreshDrawers = () => {
    fetchLiveDrawers();
    fetchDrawerPool();
    if (storeFilterType === "Free") fetchFreeDrawers();
  };

  const filteredStoreDrawers = useMemo(() => {
    const source = storeFilterType === "Free" ? freeDrawers : storeDrawers;
    return source
      .filter((d) => {
        if (!storeDrawerSearch.trim()) return true;
        const q = storeDrawerSearch.trim().toLowerCase();
        return (
          (d.id && d.id.toLowerCase().includes(q)) ||
          (d.code && d.code.toLowerCase().includes(q)) ||
          (d.client && d.client.toLowerCase().includes(q)) ||
          (d.style && d.style.toLowerCase().includes(q))
        );
      })
      .filter((d) => {
        if (storeFilterType === "All") return true;
        if (storeFilterType === "Free") return d.type === "Empty";
        return d.type === storeFilterType;
      });
  }, [storeDrawers, freeDrawers, storeDrawerSearch, storeFilterType]);
 const [storeExpectedMatch, setStoreExpectedMatch] = useState(null);
  useEffect(() => {
    const drawerVal = storeDrawerInput.trim();
    const pieceVal = storePieceInput.trim();
    if ((!drawerVal && !pieceVal) || (drawerVal && pieceVal) || !token) {
      setStoreExpectedMatch(null);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        if (pieceVal) {
          // Piece -> drawer is a single resolve call.
          const res = await apiBarcodeResolve(token, pieceVal);
          const drawerCode =
            res?.piece?.drawer?.code ||
            res?.drawer?.drawer_code ||
            res?.drawer?.code ||
            null;
          if (!cancelled)
            setStoreExpectedMatch(
              drawerCode ? { forSide: "DRAWER", value: drawerCode } : null,
            );
        } else {
          // Drawer -> piece: resolve only returns the piece's UUID
          // (`current_piece_id`), not its code — a second call reads the
          // actual piece code off that id.
          const res = await apiBarcodeResolve(token, drawerVal);
          const pieceId =
            res?.drawer?.current_piece_id || res?.piece?.piece_id || null;
          if (!pieceId) {
            if (!cancelled) setStoreExpectedMatch(null);
            return;
          }
          const pieceState = await apiGetPieceState(token, {
            piece_id: pieceId,
          });
          const pieceCode = pieceState?.piece?.code || null;
          if (!cancelled)
            setStoreExpectedMatch(
              pieceCode ? { forSide: "PIECE", value: pieceCode } : null,
            );
        }
      } catch {
        if (!cancelled) setStoreExpectedMatch(null);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [storeDrawerInput, storePieceInput, token]);
useEffect(() => {
    setStoreVisibleCount(50);
  }, [storeDrawerSearch, storeFilterType]);
const storeInputRef = useRef(null);
 return (
    <StoreHubForm
      storeSendedSkus={storeSendedSkus}
      storeReceiveStatus={storeReceiveStatus}
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
      token={token}
      workers={workers}
      mounted={mounted}
      storeDrawerInput={storeDrawerInput}
      setStoreDrawerInput={setStoreDrawerInput}
      storePieceInput={storePieceInput}
      setStorePieceInput={setStorePieceInput}
      storeScanPart={storeScanPart}
      setStoreScanPart={setStoreScanPart}
      storeCurrentScan={storeCurrentScan}
      setStoreCurrentScan={setStoreCurrentScan}
      storeVerifyResult={storeVerifyResult}
      setStoreVerifyResult={setStoreVerifyResult}
      storeApiLoading={storeApiLoading}
      storeDrawers={storeDrawers}
      storeFilterType={storeFilterType}
      setStoreFilterType={setStoreFilterType}
      storeDrawerSearch={storeDrawerSearch}
      setStoreDrawerSearch={setStoreDrawerSearch}
      expandedDrawer={expandedDrawer}
      setExpandedDrawer={setExpandedDrawer}
      storeLoading={storeLoading}
      pieceLookupInput={pieceLookupInput}
      setPieceLookupInput={setPieceLookupInput}
      pieceLookupLoading={pieceLookupLoading}
      selectedDrawers={selectedDrawers}
      setSelectedDrawers={setSelectedDrawers}
      batchSending={batchSending}
      storeVisibleCount={storeVisibleCount}
      setStoreVisibleCount={setStoreVisibleCount}
      lastDrawerElementRef={lastDrawerElementRef}
      pinDrawer={pinDrawer}
      fetchLiveDrawers={fetchLiveDrawers}
      drawerPool={drawerPool}
      storeScanResolving={storeScanResolving}
      storeTotal={storeTotal}
      storeLeather={storeLeather}
      storeLining={storeLining}
      storeBoth={storeBoth}
      storeFree={storeFree}
      freeDrawersLoading={freeDrawersLoading}
      filteredStoreDrawers={filteredStoreDrawers}
      storeExpectedMatch={storeExpectedMatch}
      storeInputRef={storeInputRef}
      handleFindDrawerForPiece={handleFindDrawerForPiece}
      handleStoreVerify={handleStoreVerify}
      handleStoreScanInput={handleStoreScanInput}
      handleSendToLineStitching={handleSendToLineStitching}
      toggleDrawerSelection={toggleDrawerSelection}
      handleBatchSendDrawers={handleBatchSendDrawers}
      handleRefreshDrawers={handleRefreshDrawers}
    />
  );
}


