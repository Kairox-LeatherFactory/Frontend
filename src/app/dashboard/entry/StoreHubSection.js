'use client';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import {
  apiBarcodeResolve,
  apiListDrawers,
  apiGetDrawer,
  apiGetPieceState,
  apiReceiveDrawer,
  apiSendDrawers,
  apiStoreDrawerScan,
} from '@/lib/api';
import { Lock, CheckCircle2, XCircle, Barcode, Check, Layers, PackageCheck, ChevronRight, ChevronDown, Camera, Send, RefreshCw, X, Loader2 } from 'lucide-react';
import { CameraScannerModal } from './shared';

// Shared by the list endpoint (GET /drawers, item shape) and the single-drawer
// endpoints (GET /drawers/{id}, GET /drawers/by-code/{code} — full detail
// shape, e.g. a nested `piece` object) — the fallback chains below already
// cover both, so one mapper keeps every place that loads a drawer row in sync.
function mapDrawerRecord(d) {
  const leatherIn = !!d.leather_in;
  const liningIn = !!d.lining_in;
  let type;
  if (d.leather_in !== undefined || d.lining_in !== undefined) {
    type = (leatherIn && liningIn) ? 'Both' : leatherIn ? 'Leather' : liningIn ? 'Lining' : 'Empty';
  } else {
    const holdingNorm = (d.holding || '').toLowerCase();
    const stateNorm = (d.state || '').toLowerCase();
    type = holdingNorm.includes('both') ? 'Both'
      : holdingNorm.includes('leather') ? 'Leather'
        : holdingNorm.includes('lining') ? 'Lining'
          : stateNorm.includes('both') ? 'Both'
            : stateNorm.includes('leather') ? 'Leather'
              : stateNorm.includes('lining') ? 'Lining'
                : 'Empty';
  }

  return {
    id: d.code || d.barcode || `DRW-${String(d.seq).padStart(4, '0')}`,
    drawer_id: d.drawer_id || d.id, // Keep the UUID for API calls
    type,
    holding: d.holding || 'EMPTY',
    status: d.state || 'Free',
    client: d.caption || 'Store Rack',
    style: d.code || '-',
    pieces: d.seq || 0,
    // Expanded Piece & Stage Breakdown Details
    order_number: d.order_number || d.order_id || 'PO-1001',
    style_name: d.style_name || d.style || d.code || 'ADELE-38',
    article: d.article || d.material || 'LEATHER',
    serial: d.serial || d.serial_no || '001',
    colour: d.colour || d.color || 'BLACK',
    size: d.size || '38',
    drawer_code: d.code || d.drawer_code || `DRW-${String(d.seq || 1).padStart(4, '0')}`,
    // Bug #13: Hold Leather / Hold Lining breakdown — the API returns
    // these as real booleans (what's physically inside right now).
    leather_in: leatherIn,
    lining_in: liningIn,
    can_send: d.can_send,
    // Bug #17: whichever piece this drawer already holds — lets the
    // Store Verification Gateway show "the other side" as a reference
    // the moment either the drawer OR the piece has been scanned, so
    // the operator can eyeball-verify before/while scanning the pair.
    piece_code: d.piece_code || d.piece?.code || null,
    // Bug #19/#20: per-part detail, when the backend exposes it —
    // falls back to the shared fields above so the expanded card still
    // renders sensibly even before the backend splits these out.
    leather_piece_code: d.leather_piece_code || d.leather?.piece_code || d.piece_code || d.piece?.code || null,
    leather_article: d.leather_article || d.leather?.article || d.article || null,
    leather_colour: d.leather_colour || d.leather_color || d.leather?.colour || d.leather?.color || d.colour || d.color || null,
    // Confirmed live (2026-08-18): there is no separate lining piece object
    // at all — a drawer holds ONE piece, and LINING_CUTTING is just a
    // stage that same piece passes through. `lining_in` only ever means
    // "this piece's lining part is physically in", so its identity is the
    // same piece/label_line as the leather side, not a distinct record.
    lining_piece_code: d.lining_piece_code || d.lining?.piece_code || d.piece_code || d.piece?.code || d.piece?.label_line || null,
    lining_article: d.lining_article || d.lining?.article || d.article || null,
    lining_colour: d.lining_colour || d.lining_color || d.lining?.colour || d.lining?.color || d.colour || d.color || null,
  };
}

// "Fetch a big page and search client-side" doesn't scale — the backend
// caps `limit` at 2000 (confirmed live), and the pool is already 5800+
// drawers, so no page size can guarantee the target drawer is on it. Use
// the real server-side search instead: GET /drawers?code= (Item 6,
// 17-Aug delta) does a case-insensitive contains match on the backend.
async function findDrawerByCodeFallback(token, code) {
  const target = String(code || '').trim();
  if (!target) return null;
  const res = await apiListDrawers(token, { code: target, limit: 50 });
  const items = res?.items || (Array.isArray(res) ? res : []);
  const upper = target.toUpperCase();
  const exact = items.find((d) => (d.code || d.barcode || '').toUpperCase() === upper);
  const item = exact || items[0] || null;
  return item ? mapDrawerRecord(item) : null;
}

// Extracted from src/app/dashboard/entry/page.js (Store Management Hub door).
// Props come from page.js's shared state: toast setters, recordStageCompletion,
// storeSendedSkus/storeReceiveStatus (also read by Manual Door), the shared
// barcodeWorker verification group (also used by Barcode Door), cameraScanTarget,
// and mounted. See SPLIT_GUIDE.md at the project root for the full boundary map.
export default function StoreHubSection({
  setSuccessMsg, setErrorMsg,
  recordStageCompletion,
  storeSendedSkus, setStoreSendedSkus,
  storeReceiveStatus, setStoreReceiveStatus,
  barcodeWorker, setBarcodeWorker, barcodeWorkerInput, setBarcodeWorkerInput, barcodeWorkerChecking,
  handleVerifyBarcodeWorker, workerInputRef,
  cameraScanTarget, setCameraScanTarget,
}) {
  const { token } = useAuth();
  const { workers } = useData();

  const [storeDrawerInput, setStoreDrawerInput] = useState('');
  const [storePieceInput, setStorePieceInput] = useState('');
  const [storeScanPart, setStoreScanPart] = useState('LEATHER'); // 'LEATHER' or 'LINING' — same barcode, different part gate
  const [storeCurrentScan, setStoreCurrentScan] = useState('');
  // FIX: `skuCode` below (in handleStoreTransition) was reading Manual Door's
  // own selected-SKU state — that only worked by accident when this was one
  // shared component scope; Store Hub has no SKU-selection concept of its
  // own. The real, correct completion-tracking already runs right alongside
  // it via `storePieceInput`. Kept as an inert empty string (rather than
  // deleting the `if (skuCode)` blocks) so that fallback path stays
  // structurally intact but simply never fires here, same as it would for
  // any Store-only session that never touched the Manual Logger tab.
  const skuCode = '';
  const [storeVerifyResult, setStoreVerifyResult] = useState(null);
  const [storeApiLoading, setStoreApiLoading] = useState(false);
  const [storeDrawers, setStoreDrawers] = useState([]);
  const [storeFilterClient, setStoreFilterClient] = useState('All');
  const [storeFilterStyle, setStoreFilterStyle] = useState('All');
  const [storeFilterType, setStoreFilterType] = useState('All');
  const [storeDrawerSearch, setStoreDrawerSearch] = useState('');
  const [expandedDrawer, setExpandedDrawer] = useState(null);
  const [storeLoading, setStoreLoading] = useState(false);
  const [pieceLookupInput, setPieceLookupInput] = useState('');
  const [pieceLookupLoading, setPieceLookupLoading] = useState(false);

  // Bug #13 & #14: Multi-drawer selection for batch assignment
  const [selectedDrawers, setSelectedDrawers] = useState(new Set());
  const [batchSendTarget, setBatchSendTarget] = useState(''); // 'LINING' | 'STITCHING'
  const [batchSending, setBatchSending] = useState(false);

  const [storeVisibleCount, setStoreVisibleCount] = useState(50);

  const observerRef = useRef();
  const lastDrawerElementRef = useCallback(node => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setStoreVisibleCount(prev => prev + 50);
      }
    }, { rootMargin: '400px' });
    if (node) observerRef.current.observe(node);
  }, []);

  // Item 6 (17-Aug delta): production view only needs the 10 latest drawers,
  // not the whole pool — the backend now supports a real `limit`, so a huge
  // default fetch is no longer the only way to have something to show.
  const fetchLiveDrawers = useCallback(async () => {
    if (!token) return;
    setStoreLoading(true);
    try {
      const res = await apiListDrawers(token, { limit: 10 });
      console.log('[Store Hub] GET /api/v1/drawers?limit=10 response:', res);
      const drawerItems = res?.items || (Array.isArray(res) ? res : []);
      if (Array.isArray(drawerItems)) {
        setStoreDrawers(drawerItems.map(mapDrawerRecord));
      }
    } catch (err) {
      console.warn('[Store Hub] GET /api/v1/drawers:', err);
      if (err.message && err.message.includes('401')) {
        setErrorMsg('⚠️ Authentication 401: Token expired or role unauthorized. Please log in with a valid Manager / Store account.');
      }
    } finally {
      setStoreLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchLiveDrawers(); }, [fetchLiveDrawers]);

  const resolveDrawerUuid = async (input) => {
    const isUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str || '');
    if (isUUID(input)) return input.toLowerCase();
    const code = String(input || '').trim().toUpperCase();
    if (!code) return null;

    let matchingDrawer = storeDrawers.find(d =>
      (d.barcode?.toUpperCase() === code) ||
      (d.code?.toUpperCase() === code) ||
      (d.id === code) ||
      (d.drawer_id === code)
    );

    if (!matchingDrawer) {
      try {
        matchingDrawer = await findDrawerByCodeFallback(token, code);
      } catch {
        // Backend lookup failed — fall through, caller handles a null return.
      }
    }

    return (matchingDrawer && isUUID(matchingDrawer.drawer_id)) ? matchingDrawer.drawer_id : null;
  };

  // Resolves a piece code to its assigned drawer (via the universal
  // GET /barcode/resolve front door) and highlights/expands that row in the
  // Drawers list below — so the operator doesn't have to guess/trial-and-error
  // which drawer a scanned piece belongs to.
  const handleFindDrawerForPiece = async (valOverride) => {
    const val = (typeof valOverride === 'string' ? valOverride : pieceLookupInput).trim();
    if (!val || pieceLookupLoading) return;
    setPieceLookupLoading(true);
    setErrorMsg('');
    try {
      const res = await apiBarcodeResolve(token, val);
      // For a resolved PIECE, the drawer is nested as piece.drawer.code (an
      // object), not a flat piece.drawer_code string — that mismatch was why
      // this always reported "no drawer assigned" even when one existed.
      const drawerCode = res?.type === 'DRAWER'
        ? res.code
        : (res?.piece?.drawer?.code || res?.drawer?.drawer_code || null);
      if (!drawerCode) {
        setErrorMsg(`No drawer is assigned to '${val}' yet.`);
        return;
      }

      // Item 6 (17-Aug delta): the default Drawers list is now only the
      // latest 10 — fetch this one directly by code if it isn't already in
      // that page, so it has something to render.
      let target = storeDrawers.find(d => d.id.toUpperCase() === drawerCode.toUpperCase());
      if (!target) {
        try {
          target = await findDrawerByCodeFallback(token, drawerCode);
          if (target) {
            setStoreDrawers(prev => prev.some(d => d.id === target.id) ? prev : [target, ...prev]);
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
    } catch (err) {
      setErrorMsg(err.message || `'${val}' was not found.`);
    } finally {
      setPieceLookupLoading(false);
    }
  };

  // API Flow: Inspect (GET) -> Conditional Execution (POST only if unprocessed)
  // Bug #17: drawerOverride mirrors the existing pieceOverride trick — when a
  // scan just completed the pair (either order), the state setter for that
  // slot hasn't flushed into this closure yet, so the just-scanned value has
  // to be passed in explicitly rather than read off state.
  const handleStoreVerify = async (pieceOverride, drawerOverride) => {
    setStoreApiLoading(true);
    setErrorMsg('');
    // Reset to a clean slate for this scan — otherwise a stale value from a
    // previous (possibly incorrect) short-circuit stays stuck across scans,
    // showing "Received ✅" for a drawer that was never actually received.
    setStoreReceiveStatus('pending');
    try {
      const isUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

      const drawerVal = (typeof drawerOverride === 'string' ? drawerOverride : storeDrawerInput).trim().toUpperCase();
      const pieceVal = (typeof pieceOverride === 'string' ? pieceOverride : storePieceInput).trim();

      // Step 1: Inspect via GET first — never blindly POST a store-scan
      // without knowing the drawer's real current state.
      const drawerUuid = await resolveDrawerUuid(drawerVal);
      if (drawerUuid) {
        try {
          const drawerDetail = await apiGetDrawer(token, drawerUuid);

          // A drawer code can be REUSED across cycles — DRW-1374 may already
          // hold a fully-sent OLDER piece while the operator is scanning a
          // brand-new piece into it now. Only treat this as "already
          // processed" if the piece we're about to scan is the SAME piece
          // the drawer already holds; otherwise it's a legitimate fresh scan
          // and must fall through to the real POST below.
          const occupantCode = String(drawerDetail?.piece?.code || '').toUpperCase();
          const scanningSamePiece = !pieceVal || !occupantCode || occupantCode === pieceVal.toUpperCase();

          // `complete` only describes CONTENTS (drawer has everything it
          // needs — true the instant a leather-only piece's leather goes in,
          // since it never needs lining). It does NOT mean the drawer has
          // been formally RECEIVED — that's a separate state-machine step,
          // and per the API docs leather-only pieces don't auto-receive at
          // all. Treating `complete` as "already processed" was skipping the
          // real store-scan/receive call and leaving the UI falsely showing
          // "Received ✅" while the backend was still stuck at holding_leather
          // with received_at: null. Only a real state transition (or `sent`)
          // means there's nothing left to do here.
          const alreadyProcessed = scanningSamePiece && (
            drawerDetail?.sent === true ||
            ['sended', 'received'].includes(String(drawerDetail?.state || '').toLowerCase())
          );

          if (alreadyProcessed) {
            // Step 2 (already processed): show its status directly, do NOT
            // POST store-scan, and halt smoothly — no error thrown.
            // Carry can_send/needs_lining/lining_reason/awaiting through too
            // — without them, "Send to Line Stitching" below can't tell a
            // genuinely-ready drawer from one that's stale-marked
            // received/sended but still actually incomplete (confirmed live
            // as a real, if rare, backend data state).
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
            setStoreReceiveStatus(drawerDetail.sent || drawerDetail.state === 'sended' ? 'sended' : 'received');
            setSuccessMsg(
              `ℹ️ Drawer Status: ${drawerDetail.state || 'unknown'} | Holding: ${drawerDetail.holding || 'EMPTY'} | Sent to: ${drawerDetail.sent_to || '—'}`
            );
            return;
          }
        } catch {
          // GET failed (e.g. drawer genuinely not found yet) — fall through
          // to the normal scan-and-create flow below rather than blocking.
        }
      }

      // Step 2 (fresh/unprocessed): proceed with the real store-scan POST.
      // Bug #19: explicitly send which part this scan is for — the Leather /
      // Lining tab (storeScanPart) the operator picked before scanning is
      // the actual source of truth here (the same piece barcode is scanned
      // once per part), so the backend must not have to infer it from
      // request order alone.
      const payload = { part: storeScanPart };

      if (barcodeWorker) {
        if (barcodeWorker.employee_barcode || barcodeWorker.barcode) {
          payload.employee_barcode = barcodeWorker.employee_barcode || barcodeWorker.barcode;
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
      setStoreVerifyResult(res);
      // Bug #21: track whether the backend already auto-received this drawer
      // (e.g. it just completed to HOLDING BOTH) so the combined "Send to
      // Line Stitching" action below knows whether it still needs to fire
      // the RECEIVED transition first, or can go straight to SENDED.
      setStoreReceiveStatus(res.auto_received ? 'received' : 'pending');
      setSuccessMsg(`Scan logged successfully! (${res.state || 'OK'})`);

      // Refresh the live (latest-10) drawers list first, THEN pin the
      // just-verified drawer to the top — otherwise this refresh (which
      // replaces the whole list) would stomp over the pin if it ran after.
      await fetchLiveDrawers();

      // Team request: the drawer just verified should be pinned to the top
      // of the list below, not wherever it happens to land in a re-fetch —
      // with the default view cut to the latest 10 (Item 6), a drawer that
      // isn't recently-created could vanish from the list entirely even
      // though it was JUST scanned. Fetch its full detail directly (we
      // already have drawerUuid resolved above) and prepend it.
      if (drawerUuid) {
        try {
          const freshDetail = await apiGetDrawer(token, drawerUuid);
          const mapped = mapDrawerRecord(freshDetail);
          setStoreDrawers(prev => [mapped, ...prev.filter(d => d.id !== mapped.id)]);
          setExpandedDrawer(mapped.id);
        } catch {
          // Non-critical — the list still refreshed above.
        }
      }
    } catch (err) {
      // Show the backend's real reason (e.g. "piece is not merged to drawer
      // X — scan the drawer the upload assigned to this piece") instead of a
      // generic conflict message — err.status is now set by apiStoreDrawerScan.
      const isConflict = err.status === 409;
      setErrorMsg(isConflict ? `⚠️ ${err.message}` : (err.message || 'Verification Failed'));
    } finally {
      setStoreApiLoading(false);
    }
  };

  // Bug #11/#17/#19: detect the scanned code's actual type (Drawer vs Piece)
  // via the barcode registry instead of assuming a fixed scan order. Either
  // the Drawer or the Piece can be scanned first — whichever slot the code
  // resolves to gets filled. IMPORTANT: this only fills the two fields — it
  // never calls handleStoreVerify itself. The same physical piece barcode is
  // scanned once under the Leather tab and again under the Lining tab, and
  // the actual store-scan POST (which decides/records which part this scan
  // represents) must only fire when the operator explicitly presses "Verify
  // & Log Scan" — auto-firing on the 2nd scan used to submit before the
  // operator had even chosen/confirmed the correct Leather/Lining tab.
  const [storeScanResolving, setStoreScanResolving] = useState(false);
  const handleStoreScanInput = async (val) => {
    if (!val || storeScanResolving) return;
    setStoreCurrentScan('');
    setStoreScanResolving(true);
    setErrorMsg('');
    try {
      let resolvedType = null;
      try {
        const resolved = await apiBarcodeResolve(token, val);
        resolvedType = resolved?.type || null;
      } catch {
        // Code not yet in the registry (e.g. a drawer label printed but not
        // scanned before) — fall back to the ordinal guess rather than
        // blocking the whole flow on an unresolvable lookup.
        resolvedType = null;
      }

      // Trust the registry's resolved type when known. When the code isn't
      // registered yet, guess from whichever slot is still open — if the
      // Drawer slot is empty, assume this scan fills it; otherwise it must
      // be the Piece.
      const kind = resolvedType || (!storeDrawerInput ? 'DRAWER' : 'PIECE');

      if (kind === 'DRAWER') {
        setStoreDrawerInput(val);
        setSuccessMsg(storePieceInput
          ? `✅ Drawer '${val}' detected! Both scanned — press "Verify & Log Scan" to submit.`
          : `✅ Drawer '${val}' detected! Now scan the piece barcode.`);
      } else {
        setStorePieceInput(val);
        setSuccessMsg(storeDrawerInput
          ? `✅ Piece '${val}' detected! Both scanned — press "Verify & Log Scan" to submit.`
          : `✅ Piece '${val}' detected! Now scan the drawer barcode.`);
      }

      setTimeout(() => storeInputRef.current?.focus(), 150);
    } finally {
      setStoreScanResolving(false);
    }
  };

  // Bug #3/#18: auto-focus the Store scan input whenever this tab becomes
  // active, and ALSO the moment the Worker ID gets verified (barcodeWorker
  // flips from null to set) — previously this only fired on the tab switch,
  // so verifying the worker while already on the tab left the cursor sitting
  // in the now-hidden Worker ID box, forcing a manual click into the scanner.
  useEffect(() => {
    if (barcodeWorker) {
      setTimeout(() => storeInputRef.current?.focus(), 150);
    }
  }, [barcodeWorker]);

  const handleStoreTransition = async (transition, overrideDrawerId = null) => {
    setStoreApiLoading(true);
    setErrorMsg('');
    try {
      const isUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str || '');
      let finalUuid = null;
      const drawerCode = storeVerifyResult?.drawer_code || storeDrawerInput.trim().toUpperCase() || 'Unknown';

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
        let matchingDrawer = storeDrawers.find(d =>
          (d.barcode?.toUpperCase() === drawerCode) ||
          (d.code?.toUpperCase() === drawerCode) ||
          (d.id === drawerCode) ||
          (d.drawer_id === drawerCode)
        );

        // Not in the loaded latest-10 — search the full live list instead
        // (GET /drawers/by-code/{code} 404s, not deployed yet).
        if (!matchingDrawer && drawerCode.startsWith('DRW-')) {
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
        setErrorMsg("System could not resolve the true UUID for this Drawer. Please refresh the page or try scanning again.");
        return;
      }

      const res = await apiReceiveDrawer(token, finalUuid, transition);

      setStoreReceiveStatus(transition.toLowerCase());
      setSuccessMsg(`Drawer ${drawerCode} transitioned to ${transition} successfully!`);
      fetchLiveDrawers();

      if (transition === 'SENDED') {
        if (skuCode) {
          setStoreSendedSkus(prev => Array.from(new Set([...prev, skuCode])));
          recordStageCompletion('Pasting', skuCode);
          recordStageCompletion('Fusing', skuCode);
          recordStageCompletion('Store', skuCode);
        }
        if (storePieceInput) {
          recordStageCompletion('Pasting', storePieceInput);
          recordStageCompletion('Fusing', storePieceInput);
          recordStageCompletion('Store', storePieceInput);
        }
        setStoreReceiveStatus('sended');
        setTimeout(() => {
          setStoreDrawerInput('');
          setStorePieceInput('');
          setStoreVerifyResult(null);
          setStoreDrawerSearch(''); // Clear list filter after reset
        }, 1500);
      }
    } catch (err) {
      const isConflict = err.status === 409 || err.message.includes('409');
      if (isConflict && transition === 'SENDED') {
        // The drawer is ALREADY sent server-side (just not by this click) — that
        // still satisfies the Store gate. Record it locally so Line Stitching
        // unlocks instead of staying stuck just because this specific request
        // was a no-op conflict rather than a fresh transition.
        const skuFromResult = storeVerifyResult?.style || storeVerifyResult?.sku_code || skuCode;
        if (skuFromResult) {
          setStoreSendedSkus(prev => Array.from(new Set([...prev, skuFromResult])));
          recordStageCompletion('Pasting', skuFromResult);
          recordStageCompletion('Fusing', skuFromResult);
          recordStageCompletion('Store', skuFromResult);
        }
        if (storePieceInput) {
          recordStageCompletion('Pasting', storePieceInput);
          recordStageCompletion('Fusing', storePieceInput);
          recordStageCompletion('Store', storePieceInput);
        }
        setStoreReceiveStatus('sended');
        setSuccessMsg(`ℹ️ Drawer was already sent — marked as complete, Line Stitching is now unlocked.`);
      } else if (isConflict) {
        setErrorMsg('409 CONFLICT: Drawer already in this state or cannot be transitioned!');
      } else {
        setErrorMsg(err.message || 'Transition Failed');
      }
    } finally {
      setStoreApiLoading(false);
    }
  };

  // Bug #21: collapse the Receive -> Send two-click flow into one button.
  // The backend state machine still requires RECEIVED before SENDED, but the
  // operator shouldn't have to know or care about that — "Send to Line
  // Stitching" now fires RECEIVED first (skipped if the store-scan already
  // auto-received the drawer, e.g. it just completed to HOLDING BOTH) and
  // immediately follows with SENDED.
  const handleSendToLineStitching = async () => {
    if (storeReceiveStatus !== 'received' && storeReceiveStatus !== 'sended') {
      await handleStoreTransition('RECEIVED');
    }
    await handleStoreTransition('SENDED');
  };

  const toggleDrawerSelection = (drawerId) => {
    setSelectedDrawers(prev => {
      const next = new Set(prev);
      next.has(drawerId) ? next.delete(drawerId) : next.add(drawerId);
      return next;
    });
  };

  // Bug #14/#20: Batch send selected drawers to Lining or Stitching. Also
  // doubles as the single-drawer send (pass explicitDrawerIds with one code)
  // so a drawer can be sent straight from its own row in the list — the
  // operator doesn't have to have just scanned it, or use the checkbox
  // multi-select, to send a drawer that was verified earlier.
  // POST /api/v1/drawers/send — the ONLY write here. It accepts PARTIALLY:
  // some drawers may come back not_ready/not_found while others succeed in
  // `sent`, so this must render both buckets, not treat the call as all-or-nothing.
  const handleBatchSendDrawers = async (target, explicitDrawerIds) => {
    const sourceIds = explicitDrawerIds || Array.from(selectedDrawers);
    if (sourceIds.length === 0) return;
    setBatchSending(true);
    try {
      // These are the mapped `.id` (drawer code, e.g. "DRW-0001"), not the
      // real UUID — resolve each to its `drawer_id` for the API call.
      const drawerIds = sourceIds
        .map(id => storeDrawers.find(d => d.id === id)?.drawer_id)
        .filter(Boolean);

      if (drawerIds.length === 0) {
        setErrorMsg('Could not resolve drawer IDs for the selected drawers. Try refreshing the list.');
        return;
      }

      const result = await apiSendDrawers(token, { drawer_ids: drawerIds, destination: target });

      // Record local stage completion only for drawers the backend actually
      // confirms as sent — using the real piece_code from the response, not
      // the drawer's own code (which isn't a piece/SKU identity).
      const sentList = Array.isArray(result?.sent) ? result.sent : [];
      sentList.forEach(item => {
        const key = item.piece_code || item.drawer_code;
        if (!key) return;
        if (target === 'STITCHING') {
          recordStageCompletion('Pasting', key);
          recordStageCompletion('Fusing', key);
          recordStageCompletion('Store', key);
          setStoreSendedSkus(prev => Array.from(new Set([...prev, key])));
        } else if (target === 'LINING') {
          recordStageCompletion('Store', key);
        }
      });

      const notReady = Array.isArray(result?.not_ready) ? result.not_ready : [];
      const notFound = Array.isArray(result?.not_found) ? result.not_found : [];

      setSelectedDrawers(new Set());

      if (notReady.length > 0 || notFound.length > 0) {
        const reasonSample = notReady[0]?.reason ? ` (${notReady[0].reason})` : '';
        setErrorMsg(
          `⚠️ ${result?.count_sent ?? sentList.length}/${result?.requested ?? drawerIds.length} drawers sent.` +
          `${notReady.length ? ` ${notReady.length} not ready${reasonSample}.` : ''}` +
          `${notFound.length ? ` ${notFound.length} not found.` : ''}`
        );
      }
      if (sentList.length > 0) {
        setSuccessMsg(result?.message || `✅ ${sentList.length} drawer(s) sent to ${target === 'STITCHING' ? 'Line Stitching' : 'Lining'} successfully!`);
      } else if (notReady.length === 0 && notFound.length === 0) {
        setErrorMsg('No drawers were sent.');
      }

      await fetchLiveDrawers();
    } catch (err) {
      setErrorMsg('Batch send failed: ' + (err.message || 'Unknown error'));
    } finally {
      setBatchSending(false);
    }
  };

  // Resolution handler for universal scan input
  const storeTotal = storeDrawers.length;
  const { storeFree, storeLeather, storeLining, storeBoth } = useMemo(() => ({
    storeFree: storeDrawers.filter(d => d.status === 'Free').length,
    storeLeather: storeDrawers.filter(d => d.type === 'Leather').length,
    storeLining: storeDrawers.filter(d => d.type === 'Lining').length,
    storeBoth: storeDrawers.filter(d => d.type === 'Both').length,
  }), [storeDrawers]);

  const filteredStoreDrawers = useMemo(() => {
    return storeDrawers
      .filter(d => {
        if (!storeDrawerSearch.trim()) return true;
        const q = storeDrawerSearch.trim().toLowerCase();
        return (
          (d.id && d.id.toLowerCase().includes(q)) ||
          (d.code && d.code.toLowerCase().includes(q)) ||
          (d.client && d.client.toLowerCase().includes(q)) ||
          (d.style && d.style.toLowerCase().includes(q))
        );
      })
      .filter(d => {
        if (storeFilterType === 'All') return true;
        if (storeFilterType === 'Free') return d.status === 'Free';
        return d.type === storeFilterType;
      });
  }, [storeDrawers, storeDrawerSearch, storeFilterType]);

  // Bug #17: whichever side of the pair hasn't been scanned yet, look up
  // what it SHOULD be from the already-loaded drawers?limit=500 list — pure
  // reference for the operator to eyeball-verify against, never auto-filled.
  // Team fix: this used to search the loaded `storeDrawers` list — that
  // worked when the default load was up to 500 drawers, but broke silently
  // once the default view was cut down to the latest 10 (Item 6). Query
  // GET /barcode/resolve live instead, so it works regardless of what's
  // currently loaded. Debounced so it doesn't fire on every keystroke.
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
          const drawerCode = res?.piece?.drawer?.code || res?.drawer?.drawer_code || res?.drawer?.code || null;
          if (!cancelled) setStoreExpectedMatch(drawerCode ? { forSide: 'DRAWER', value: drawerCode } : null);
        } else {
          // Drawer -> piece: resolve only returns the piece's UUID
          // (`current_piece_id`), not its code — a second call reads the
          // actual piece code off that id.
          const res = await apiBarcodeResolve(token, drawerVal);
          const pieceId = res?.drawer?.current_piece_id || res?.piece?.piece_id || null;
          if (!pieceId) { if (!cancelled) setStoreExpectedMatch(null); return; }
          const pieceState = await apiGetPieceState(token, { piece_id: pieceId });
          const pieceCode = pieceState?.piece?.code || null;
          if (!cancelled) setStoreExpectedMatch(pieceCode ? { forSide: 'PIECE', value: pieceCode } : null);
        }
      } catch {
        if (!cancelled) setStoreExpectedMatch(null);
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [storeDrawerInput, storePieceInput, token]);

  useEffect(() => {
    setStoreVisibleCount(50);
  }, [storeDrawerSearch, storeFilterType]);

  // The isReadOnly "Access Restricted" guard that sat right before the
  // original file's single `return (` belongs to page.js (it gates the
  // WHOLE page render once, before any door is chosen) — not duplicated
  // per section here.

  const storeInputRef = useRef(null);

  return (
    <>
      {cameraScanTarget === 'store' && (
        <CameraScannerModal
          title="Scan Store Drawer / Piece"
          onClose={() => setCameraScanTarget(null)}
          onScan={(scannedCode) => {
            const cleanCode = String(scannedCode || '').replace(/[\r\n]+/g, '').trim();
            if (!cleanCode) return;
            const val = cleanCode.toUpperCase();
            if (val.startsWith('DRW-') || val.startsWith('DRAWER')) {
              setStoreDrawerInput(val);
              setStoreDrawerSearch(val);
            } else {
              setStorePieceInput(cleanCode);
            }
            setStoreCurrentScan(cleanCode);
          }}
        />
      )}
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

          {/* FIX 1: WORKER BARCODE SCAN & ATTENDANCE GATE (STORE HUB INTEGRATION) */}
          <div className="p-6 rounded-3xl shadow-lg relative overflow-hidden space-y-5" style={{ background: 'linear-gradient(135deg, #1c1207, #2d1f0e)', border: '1px solid rgba(200,131,74,0.3)' }}>
            <div className="absolute -right-16 -top-16 w-48 h-48 bg-[#c8834a]/15 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#c8834a]/20 pb-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#c8834a]/20 border border-[#c8834a]/40 flex items-center justify-center text-[#f5d4a4] font-black text-sm shadow-inner">
                  1
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    Store Worker Verification
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#c8834a]/30 text-[#f5d4a4]">
                      Mandatory First
                    </span>
                  </h3>
                  <p className="text-xs text-[#e2d5c3]/80">Scan Worker ID Badge / Card (e.g. EMP-000123) to unlock Store Hub scanning</p>
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
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleVerifyBarcodeWorker();
                        }
                      }}
                      style={{ paddingLeft: barcodeWorkerInput ? '1rem' : '3.25rem', paddingRight: '3rem' }}
                      className="w-full h-14 bg-white/10 text-white placeholder-[#e2d5c3]/40 font-mono font-bold text-base border-2 border-[#c8834a]/40 rounded-2xl focus:outline-none focus:border-[#f5d4a4] transition-all"
                    />
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

                {/* Quick Select Worker Dropdown Fallback — same as Barcode Scanner page */}
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
              <div className="p-4 rounded-2xl bg-[#c8834a]/15 border border-[#c8834a]/40 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 font-bold">
                    ✓
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-white text-sm">{barcodeWorker.name}</h4>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Verified Operator
                      </span>
                    </div>
                    <p className="text-xs text-[#f5d4a4] font-medium mt-0.5">
                      ID: <strong className="font-mono">{barcodeWorker.employee_barcode || barcodeWorker.id}</strong> · {barcodeWorker.designation || 'Store Craftsman'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* Header & Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col items-center justify-center">
              <div className="text-xs text-slate-500 font-bold mb-1">Total Drawers</div>
              <div className="text-2xl font-black text-slate-800">{storeTotal}</div>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 shadow-sm flex flex-col items-center justify-center">
              <div className="text-xs text-emerald-600 font-bold mb-1">Drawers Free</div>
              <div className="text-2xl font-black text-emerald-700">{storeFree}</div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm flex flex-col items-center justify-center">
              <div className="text-xs text-amber-700 font-bold mb-1">Leather</div>
              <div className="text-2xl font-black text-amber-800">{storeLeather}</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-sm flex flex-col items-center justify-center">
              <div className="text-xs text-blue-700 font-bold mb-1">Lining</div>
              <div className="text-2xl font-black text-blue-800">{storeLining}</div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 shadow-sm flex flex-col items-center justify-center">
              <div className="text-xs text-purple-700 font-bold mb-1">Both</div>
              <div className="text-2xl font-black text-purple-800">{storeBoth}</div>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 shadow-sm flex flex-col items-center justify-center">
              <div className="text-xs text-indigo-700 font-bold mb-1">Upcoming Bundles</div>
              <div className="text-2xl font-black text-indigo-800">8</div>
            </div>
          </div>

          {/* Barcode Scanner & Filters */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Store Verification Gateway</h3>
              </div>

              <div className="flex flex-col gap-4 mt-2">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 block">Scanning For</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setStoreScanPart('LEATHER');
                        setStoreDrawerInput('');
                        setStorePieceInput('');
                        setStoreCurrentScan('');
                        setStoreVerifyResult(null);
                      }}
                      className={`h-12 rounded-xl font-black text-sm border-2 transition-all ${storeScanPart === 'LEATHER' ? 'bg-amber-100 border-amber-400 text-amber-800' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'}`}
                    >
                      Leather
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStoreScanPart('LINING');
                        setStoreDrawerInput('');
                        setStorePieceInput('');
                        setStoreCurrentScan('');
                        setStoreVerifyResult(null);
                      }}
                      className={`h-12 rounded-xl font-black text-sm border-2 transition-all ${storeScanPart === 'LINING' ? 'bg-blue-100 border-blue-400 text-blue-800' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'}`}
                    >
                      Lining
                    </button>
                  </div>
                </div>
                {/* Bug #11/#17: Auto-detect Next Required Scan Guidance Card —
                    either Drawer or Piece can be scanned first now, so this
                    reflects whichever slot is still open and shows the
                    other side's expected code (from the already-loaded
                    drawers list) as a reference to verify against. */}
                <div className={`p-3 rounded-xl border-2 flex items-center gap-3 transition-all ${!storeDrawerInput && !storePieceInput
                    ? 'bg-amber-50 border-amber-300'
                    : 'bg-emerald-50 border-emerald-300'
                  }`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-lg ${!storeDrawerInput && !storePieceInput ? 'bg-amber-100' : 'bg-emerald-100'
                    }`}>
                    {!storeDrawerInput && !storePieceInput ? '📦' : '🏷️'}
                  </div>
                  <div>
                    <div className={`text-xs font-black uppercase tracking-wider ${!storeDrawerInput && !storePieceInput ? 'text-amber-800' : 'text-emerald-800'}`}>
                      {!storeDrawerInput && !storePieceInput
                        ? 'Step 1: Scan Drawer or Piece — either order'
                        : storeDrawerInput ? 'Step 2: Scan Piece Barcode' : 'Step 2: Scan Drawer Barcode'}
                    </div>
                    <div className={`text-[10px] font-bold mt-0.5 ${!storeDrawerInput && !storePieceInput ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {!storeDrawerInput && !storePieceInput
                        ? 'Point your barcode gun at a drawer label OR a piece barcode — whichever is handy'
                        : storeDrawerInput
                          ? `Drawer ${storeDrawerInput} ready — scan the piece barcode now`
                          : `Piece ${storePieceInput} ready — scan the drawer barcode now`}
                    </div>
                    {storeExpectedMatch && (
                      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                          Expected {storeExpectedMatch.forSide === 'PIECE' ? 'Piece' : 'Drawer'}:
                        </span>
                        <span className="font-mono font-black text-sm text-slate-800 bg-white border border-slate-300 px-2 py-0.5 rounded-md shadow-sm">
                          {storeExpectedMatch.value}
                        </span>
                      </div>
                    )}
                  </div>
                  {(storeDrawerInput || storePieceInput) && (
                    <button
                      type="button"
                      onClick={() => { setStoreDrawerInput(''); setStorePieceInput(''); setStoreVerifyResult(null); setStoreCurrentScan(''); }}
                      className="ml-auto text-slate-400 hover:text-red-500 transition-colors"
                      title="Reset Scan"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="relative">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 block">Scanner Input</label>
                  {/* This warning was nested inside the input's horizontal flex
                      row below, so on narrow screens it squeezed in side-by-side
                      with the input instead of stacking above it as intended
                      (its own mb-2 assumed vertical stacking). Moved it out to
                      its own block so it always sits above, full width. */}
                  {!barcodeWorker && (
                    <div className="p-3 mb-2 bg-amber-100/90 border border-amber-300/80 rounded-xl text-amber-900 text-xs font-bold flex items-center justify-center gap-2 shadow-sm">
                      <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>Scan &amp; Verify Worker ID in Step 1 Banner above to Unlock Store Scanner</span>
                    </div>
                  )}
                  {/* Wrapped in a <form> because mobile virtual keyboards
                      don't reliably fire a raw onKeyDown "Enter" event — the
                      Go/Search/Done action key needs a real form submit to be
                      caught consistently across mobile browsers. enterKeyHint
                      also hints the keyboard to show a "Go"-style action key. */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleStoreScanInput(storeCurrentScan.trim());
                    }}
                    className="relative flex items-center"
                  >
                    {!storeCurrentScan && (
                      <Barcode className="w-5 h-5 text-[#c8834a] absolute left-4 pointer-events-none transition-opacity duration-200" />
                    )}
                    <input
                      ref={storeInputRef}
                      type="text"
                      inputMode="text"
                      enterKeyHint="go"
                      placeholder={!barcodeWorker
                        ? "Scan Worker ID in Step 1 Banner above..."
                        : (!storeDrawerInput && !storePieceInput
                          ? "Scan Drawer or Piece Barcode..."
                          : storeDrawerInput ? "Scan Piece Barcode..." : "Scan Drawer Barcode...")}
                      value={storeCurrentScan}
                      onChange={(e) => setStoreCurrentScan(e.target.value)}
                      disabled={!barcodeWorker || storeScanResolving}
                      style={{ paddingLeft: storeCurrentScan ? '1rem' : '3.25rem', paddingRight: '3rem' }}
                      className="w-full h-16 bg-slate-50 font-mono font-bold text-lg text-[#2d1f0e] border-2 border-slate-200 focus:border-[#c8834a] focus:bg-white shadow-inner rounded-xl outline-none transition-all disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setCameraScanTarget('store')}
                      className="sm:hidden absolute right-3 text-[#c8834a] bg-amber-50 border border-[#c8834a]/30 hover:bg-amber-100 p-2 rounded-xl transition-all active:scale-95 cursor-pointer z-10"
                      title="Scan Drawer/Piece with Mobile Camera"
                    >
                      <Camera className="w-5 h-5" />
                    </button>
                  </form>
                </div>

                {/* Status Badges — when one side is still empty but the other
                    side's scanned code matches a known drawer, show the
                    expected code here too as a second, always-visible
                    reference point (mirrors the guidance card above). */}
                <div className="flex items-center gap-3">
                  <div className={`flex-1 p-3 rounded-lg border flex flex-col gap-0.5 ${storeDrawerInput ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold uppercase">Drawer</span>
                      <span className="font-mono text-xs font-black">{storeDrawerInput || 'Waiting...'}</span>
                    </div>
                    {!storeDrawerInput && storeExpectedMatch?.forSide === 'DRAWER' && (
                      <span className="text-sm font-bold text-amber-700">Expected: <span className="font-mono font-black">{storeExpectedMatch.value}</span></span>
                    )}
                  </div>
                  <div className={`flex-1 p-3 rounded-lg border flex flex-col gap-0.5 ${storePieceInput ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold uppercase">Piece</span>
                      <span className="font-mono text-xs font-black">{storePieceInput || 'Waiting...'}</span>
                    </div>
                    {!storePieceInput && storeExpectedMatch?.forSide === 'PIECE' && (
                      <span className="text-sm font-bold text-amber-700">Expected: <span className="font-mono font-black">{storeExpectedMatch.value}</span></span>
                    )}
                  </div>
                </div>
              </div>

              {/* Verify Button */}
              {storeDrawerInput && storePieceInput && (
                <button
                  type="button"
                  onClick={handleStoreVerify}
                  disabled={storeApiLoading}
                  className="w-full h-14 mt-5 rounded-xl font-black text-sm text-white shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  style={{ background: '#c8834a' }}
                >
                  {storeApiLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  Verify & Log Scan
                </button>
              )}

              {/* Server-Driven Status Panel & 3-Hold Logic */}
              {storeVerifyResult && (
                <div className="mt-6 bg-slate-50 border-2 border-[#c8834a]/30 rounded-2xl p-5 shadow-inner space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-[#c8834a]/20 pb-3">
                    <div>
                      <h4 className="text-sm font-black text-slate-800">Scan Verified</h4>
                      <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                        Drawer: {storeVerifyResult.drawer_code} | Piece: {storeVerifyResult.piece_code}
                      </p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-black px-3 py-1 rounded uppercase bg-emerald-100 text-emerald-800">
                        {storeVerifyResult.holding || storeVerifyResult.state?.replace('_', ' ') || 'MERGED'}
                      </span>
                    </div>
                  </div>

                  {/* Bug #18: Auto-classified hold state based on backend response */}
                  {storeVerifyResult && (
                    <div className="py-2 space-y-2">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Auto-Classified Hold Status</p>
                      <div className="flex flex-wrap gap-2">
                        {/* Auto-detect leather hold from backend state */}
                        {(storeVerifyResult.state?.toLowerCase().includes('leather') || storeVerifyResult.state?.toLowerCase().includes('both') || storeVerifyResult.holding?.toLowerCase().includes('leather')) ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-black rounded-xl">
                            ✅ Leather Piece — Confirmed
                          </span>
                        ) : null}
                        {/* Auto-detect lining hold from backend state */}
                        {(storeVerifyResult.state?.toLowerCase().includes('lining') || storeVerifyResult.state?.toLowerCase().includes('both') || storeVerifyResult.holding?.toLowerCase().includes('lining')) ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-black rounded-xl">
                            ✅ Lining Piece — Confirmed
                          </span>
                        ) : null}
                        {/* Show generic merged badge if no specific type detected */}
                        {!storeVerifyResult.state?.toLowerCase().includes('leather') && !storeVerifyResult.state?.toLowerCase().includes('lining') && !storeVerifyResult.holding && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black rounded-xl">
                            ✅ Piece Verified — Ready to Receive
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Team request: the Leather tab is a receiving step only —
                      no Send action there regardless of can_send (even a
                      needs_lining:false piece that's already sendable right
                      after its leather scan). Sending happens either from
                      the Lining tab's verify screen, or later from the
                      drawer's own card in the list below (which has its own
                      can_send-gated Send button). */}
                  {storeScanPart === 'LINING' ? (
                    // Bug #21: single direct action — no separate "Receive"
                    // step. Clicking this fires RECEIVED (if the drawer
                    // isn't already auto-received) then SENDED right after.
                    // Confirmed live: `can_send` sits top-level on the
                    // store-scan response (storeVerifyResult.can_send) —
                    // false the instant a needs_lining piece is only
                    // HOLDING LEATHER (`awaiting: ["LINING"]`). This button
                    // never checked it, so scanning leather alone made
                    // "Send to Line Stitching" look ready before lining had
                    // even been scanned.
                    <div className="pt-4 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={handleSendToLineStitching}
                        disabled={storeReceiveStatus === 'sended' || storeApiLoading || storeVerifyResult?.can_send === false}
                        title={storeVerifyResult?.can_send === false ? (storeVerifyResult?.lining_reason || 'Not ready — this drawer is still awaiting a part.') : ''}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm rounded-xl transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:cursor-not-allowed"
                      >
                        {storeApiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : storeReceiveStatus === 'sended' ? <CheckCircle2 className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                        {storeReceiveStatus === 'sended' ? 'Sent to Line Stitching ✅' : 'Send to Line Stitching'}
                      </button>
                      {storeVerifyResult?.can_send === false && storeReceiveStatus !== 'sended' && (
                        <p className="text-[10px] text-slate-400 font-bold pt-1.5">
                          {storeVerifyResult?.lining_reason || (Array.isArray(storeVerifyResult?.awaiting) && storeVerifyResult.awaiting.length > 0
                            ? `Waiting on: ${storeVerifyResult.awaiting.join(', ')}`
                            : 'Not ready to send yet.')}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="pt-4 border-t border-slate-200">
                      <p className="text-xs font-black text-center text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                        ✅ Leather Confirmed — send from the Lining tab once lining arrives, or from this drawer's card in the list below.
                      </p>
                    </div>
                  )}
                </div>
              )}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <h3 className="font-black text-slate-800 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-[#c8834a]" />
                    Drawers
                    {storeDrawerSearch && (
                      <button
                        type="button"
                        onClick={() => { setStoreDrawerSearch(''); setStoreDrawerInput(''); }}
                        className="ml-1 flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full bg-[#c8834a]/15 text-[#8a5a2a] hover:bg-[#c8834a]/25 cursor-pointer"
                        title="Clear filter"
                      >
                        Filtered: {storeDrawerSearch} <X className="w-3 h-3" />
                      </button>
                    )}
                  </h3>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Search by Drawer or Piece Code */}
                    <div className="relative w-full sm:flex-1 sm:min-w-[220px]">
                      <PackageCheck className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#c8834a]" />
                      <input
                        type="text"
                        value={pieceLookupInput}
                        onChange={(e) => setPieceLookupInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleFindDrawerForPiece();
                          }
                        }}
                        placeholder="Search by Drawer or Piece Code..."
                        disabled={pieceLookupLoading}
                        className="w-full pl-9 pr-16 py-2.5 bg-amber-50/50 border border-[#c8834a]/30 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-[#c8834a] shadow-sm disabled:opacity-60"
                      />
                      <button
                        type="button"
                        onClick={() => handleFindDrawerForPiece()}
                        disabled={pieceLookupLoading || !pieceLookupInput.trim()}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-md bg-[#c8834a] text-white text-[10px] font-black disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        {pieceLookupLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Find'}
                      </button>
                    </div>

                    {/* Type/Status Filter + Refresh — grouped so they stay
                        side-by-side even on mobile, instead of wrapping
                        awkwardly with the full-width search box above. */}
                    <div className="flex items-center gap-2">
                      <select
                        value={storeFilterType}
                        onChange={(e) => setStoreFilterType(e.target.value)}
                        className="flex-1 sm:flex-none px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-[#c8834a]"
                      >
                        <option value="All">All Types</option>
                        <option value="Leather">Leather Only ({storeLeather})</option>
                        <option value="Lining">Lining Only ({storeLining})</option>
                        <option value="Both">Both ({storeBoth})</option>
                        <option value="Free">Empty Drawers ({storeFree})</option>
                      </select>
                      <button
                        type="button"
                        onClick={fetchLiveDrawers}
                        disabled={storeLoading}
                        className="shrink-0 px-3 py-1.5 bg-[#c8834a] hover:bg-[#b07038] text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                        title="Reload Live Drawers"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${storeLoading ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Refresh</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bug #13 & #14: Multi-Drawer Selection Toolbar */}
                {selectedDrawers.size > 0 && (() => {
                  // Team fix: this button used to stay enabled regardless of
                  // whether the selected drawer(s) could actually be sent —
                  // contradicting the same drawer's own card, which already
                  // disables correctly. Enable only if at least one selected
                  // drawer is really sendable; the backend still partial-
                  // accepts a mixed batch, so this doesn't block legit sends.
                  const anySelectedCanSend = Array.from(selectedDrawers).some(id => storeDrawers.find(d => d.id === id)?.can_send);
                  return (
                    <div className="mx-4 my-3 p-3 rounded-xl bg-indigo-50 border-2 border-indigo-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center">{selectedDrawers.size}</span>
                        <span className="text-sm font-black text-indigo-800">{selectedDrawers.size} Drawer{selectedDrawers.size > 1 ? 's' : ''} Selected</span>
                      </div>
                      <div className="flex items-center flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleBatchSendDrawers('STITCHING')}
                          disabled={batchSending || !anySelectedCanSend}
                          title={anySelectedCanSend ? '' : 'None of the selected drawers are ready to send yet'}
                          className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-lg flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                          {batchSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                          Send to Line Stitching
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedDrawers(new Set())}
                          className="px-3 py-2 bg-white border border-slate-200 text-slate-600 font-bold text-xs rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  );
                })()}

                <div className="divide-y divide-slate-100">
                  {filteredStoreDrawers
                    .slice(0, storeVisibleCount)
                    .map(drawer => {
                      const isScannedDrawer = storeDrawerInput.trim().toUpperCase() === drawer.id.toUpperCase();
                      const isExpanded = expandedDrawer === drawer.id;
                      const isChecked = selectedDrawers.has(drawer.id);
                      return (
                        <div key={drawer.id} className={`transition-colors hover:bg-slate-50 ${isScannedDrawer ? 'ring-2 ring-[#c8834a] ring-inset bg-amber-50/30' : ''} ${isChecked ? 'bg-indigo-50/50' : ''}`}>
                          <div className="px-3 sm:px-5 py-3 sm:py-4 flex items-start sm:items-center gap-2 sm:gap-0 cursor-pointer">
                            {/* Bug #13: Checkbox for multi-select */}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); toggleDrawerSelection(drawer.id); }}
                              className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center mr-2 sm:mr-3 mt-0.5 sm:mt-0 transition-all ${isChecked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white hover:border-indigo-400'
                                }`}
                            >
                              {isChecked && <Check className="w-3 h-3" />}
                            </button>
                            <div
                              onClick={() => setExpandedDrawer(isExpanded ? null : drawer.id)}
                              className="flex flex-col sm:flex-row sm:items-center sm:justify-between flex-1 min-w-0 gap-2"
                            >
                              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                <div className={`w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-xl flex items-center justify-center font-bold text-[10px] sm:text-xs shadow-sm ${drawer.type === 'Both' ? 'bg-purple-100 text-purple-700' :
                                    drawer.type === 'Leather' ? 'bg-amber-100 text-amber-700' :
                                      drawer.type === 'Lining' ? 'bg-blue-100 text-blue-700' :
                                        'bg-emerald-100 text-emerald-700'
                                  }`}>
                                  {drawer.id.replace('DRW-', '')}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-black text-slate-800 text-sm flex items-center flex-wrap gap-1.5">
                                    {drawer.id}
                                    {/* Bug #12: Assigned Drawer badge */}
                                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">📦 {drawer.holding}</span>
                                    {storeSendedSkus.some(sku => drawer.style?.includes(sku) || drawer.client?.includes(sku)) && (
                                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">✓ Sent to Stitching</span>
                                    )}
                                  </div>
                                  <div className="text-xs font-bold text-slate-500 mt-0.5 truncate">
                                    {drawer.client !== '-' ? `${drawer.client} / ${drawer.style}` : 'Empty Drawer'}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 sm:gap-4 ml-[3rem] sm:ml-0 shrink-0">
                                <span className={`px-2.5 py-1 rounded-md text-[10px] font-black tracking-wide uppercase border ${drawer.type === 'Empty' ? 'bg-slate-200 text-slate-600 border-slate-300' :
                                  drawer.type === 'Both' ? 'bg-purple-600 text-white border-purple-700 shadow-sm' :
                                    drawer.type === 'Leather' ? 'bg-amber-600 text-white border-amber-700 shadow-sm' :
                                      drawer.type === 'Lining' ? 'bg-blue-600 text-white border-blue-700 shadow-sm' :
                                        'bg-[#c8834a] text-white border-[#b06f36] shadow-sm'
                                  }`}>
                                  {drawer.type}
                                </span>
                                {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                                {isScannedDrawer && (
                                  <span className="bg-[#c8834a] text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase">Scanned</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Expanded Details */}
                          {isExpanded && (
                            <div className="px-5 pb-5 pt-2 bg-slate-50/50 border-t border-slate-100">
                              <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                  <h4 className="font-black text-sm text-slate-700">Drawer Contents</h4>
                                  <div className="flex flex-col items-end gap-1">
                                    <span className="text-xs font-bold text-slate-500">Status: <span className="text-emerald-600">{drawer.status}</span></span>
                                    <span className="text-[10px] font-bold text-indigo-500">Holding: <span className="text-indigo-700">{drawer.holding}</span></span>
                                  </div>
                                </div>
                                {drawer.type !== 'Empty' ? (
                                  <div className="space-y-4">
                                    {/* Complete Piece & Stage Details Breakdown Card */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                      <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/60">
                                        <div className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">Order &amp; Style</div>
                                        <div className="text-xs font-black text-slate-800 mt-0.5">{drawer.order_number} · {drawer.style_name}</div>
                                      </div>
                                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Article &amp; Serial</div>
                                        <div className="text-xs font-black text-slate-800 mt-0.5">{drawer.article} (#{drawer.serial || '001'})</div>
                                      </div>
                                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Color / Size</div>
                                        <div className="text-xs font-black text-slate-800 mt-0.5">{drawer.colour} / {drawer.size}</div>
                                      </div>
                                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Assigned Drawer</div>
                                        <div className="text-xs font-black text-slate-800 mt-0.5">{drawer.drawer_code || drawer.id}</div>
                                      </div>
                                      <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/60">
                                        <div className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Holding State</div>
                                        <div className="text-xs font-black text-emerald-800 mt-0.5">{drawer.holding}</div>
                                      </div>
                                    </div>
                                    {/* Bug #13/#19: Leather Part / Lining Part detail cards —
                                        each part's own piece code, article and colour, plus
                                        whether it's physically in the drawer yet. */}
                                    <div className="pt-3 border-t border-slate-100 space-y-2">
                                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-2">Part Breakdown</div>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <div className={`p-3 rounded-xl border space-y-1.5 ${drawer.leather_in ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
                                          <div className="flex items-center gap-2">
                                            {drawer.leather_in ? <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" /> : <XCircle className="w-4 h-4 text-slate-300 shrink-0" />}
                                            <div className="text-[10px] font-black uppercase tracking-wider text-amber-700">Leather Part</div>
                                            <span className={`ml-auto text-[10px] font-black uppercase ${drawer.leather_in ? 'text-amber-700' : 'text-slate-400'}`}>{drawer.leather_in ? 'In Drawer' : 'Not Yet'}</span>
                                          </div>
                                          {drawer.leather_in && (
                                            <div className="text-[11px] font-bold text-slate-600 space-y-0.5 pl-6">
                                              {drawer.leather_piece_code && <div className="font-mono text-slate-800">{drawer.leather_piece_code}</div>}
                                              <div>{drawer.leather_article || '—'} {drawer.leather_colour ? `· ${drawer.leather_colour}` : ''}</div>
                                            </div>
                                          )}
                                        </div>
                                        <div className={`p-3 rounded-xl border space-y-1.5 ${drawer.lining_in ? 'bg-blue-50 border-blue-300' : 'bg-slate-50 border-slate-200'}`}>
                                          <div className="flex items-center gap-2">
                                            {drawer.lining_in ? <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" /> : <XCircle className="w-4 h-4 text-slate-300 shrink-0" />}
                                            <div className="text-[10px] font-black uppercase tracking-wider text-blue-700">Lining Part</div>
                                            <span className={`ml-auto text-[10px] font-black uppercase ${drawer.lining_in ? 'text-blue-700' : 'text-slate-400'}`}>{drawer.lining_in ? 'In Drawer' : 'Not Yet'}</span>
                                          </div>
                                          {drawer.lining_in && (
                                            <div className="text-[11px] font-bold text-slate-600 space-y-0.5 pl-6">
                                              {drawer.lining_piece_code && <div className="font-mono text-slate-800">{drawer.lining_piece_code}</div>}
                                              <div>{drawer.lining_article || '—'} {drawer.lining_colour ? `· ${drawer.lining_colour}` : ''}</div>
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {/* Bug #20: send this one drawer directly from its own
                                          card — no need to have just scanned it, or use the
                                          checkbox multi-select above, to send it on. */}
                                      {(() => {
                                        // `can_send` is false BOTH when a drawer genuinely
                                        // isn't complete yet AND when it's already been sent —
                                        // those need different copy, or "already sent" reads
                                        // as "still waiting", which is backwards.
                                        const alreadySent = String(drawer.status || '').toLowerCase() === 'sended';
                                        return (
                                          <>
                                            <div className="pt-2">
                                              <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); handleBatchSendDrawers('STITCHING', [drawer.id]); }}
                                                disabled={!drawer.can_send || batchSending}
                                                className="w-full h-10 rounded-lg font-black text-xs text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                              >
                                                {batchSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} {alreadySent ? 'Already Sent to Line Stitching' : 'Send to Line Stitching'}
                                              </button>
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-bold pt-0.5">
                                              {drawer.can_send
                                                ? '✓ Ready to send.'
                                                : alreadySent
                                                  ? '✓ Already sent to Line Stitching.'
                                                  : 'Not ready to send yet — waiting on more parts or a prior stage.'}
                                            </p>
                                          </>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-center py-6 text-slate-400 text-sm font-bold italic">
                                    This drawer is currently empty and available for use.
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  {filteredStoreDrawers.length > storeVisibleCount && (
                    <div ref={lastDrawerElementRef} className="p-4 flex justify-center">
                      <button
                        onClick={() => setStoreVisibleCount(v => v + 50)}
                        className="px-6 py-2 bg-[#f4ece3] hover:bg-[#e8decb] text-[#c8834a] font-bold text-xs rounded-lg transition-colors cursor-pointer"
                      >
                        Load More Drawers ({filteredStoreDrawers.length - storeVisibleCount} remaining)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
    </>
  );
}
