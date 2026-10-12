'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Box,
  Users,
  ChevronRight,
  Zap,
  ClipboardList,
  TrendingUp,
  ArrowRight,
  Factory,
  Loader2,
  X,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useAuth } from '@/context/AuthContext';
import {
  apiGetDirectManagerDashboard,
  apiGetDirectManagerOrderDetail,
  apiGetCuttingConsumption,
  apiGetLiningConsumption,
  apiGetStitchingDashboard,
  apiGetStoreDashboard,
  apiGetOrderBarcodes,
  apiGetOperations,
  apiGetProductionEventsPage,
  apiGetEmployeesPage,
  apiGetSkusPage,
  apiGetSkuPiecesPage,
  apiGetJobWork,
  apiGetStoreGarment,
} from '@/lib/api';
import {
  ORDER_STATUS,
  buildCutWorkerRows,
  compareNewest,
  compareOrders,
  countCutPieces,
  cutRowOrderStyleKey,
  formatConsumed,
  formatDcm,
  formatShortDate,
  lastCutDays,
  localDateKey,
  localDayOf,
  mainUnit,
  orderStatusKey,
  orderStyleKey,
  parseDateKey,
  rowDate,
  rowOrderKey,
  toNum,
} from '../_shared/format';
import { fetchAllPages, inBatches } from '../_shared/paging';
import { StageGrid, StageIcon, isSideStage, stageName, withFlowQueues } from '../_shared/stages';
import {
  CARD,
  ChartTooltip,
  DashboardHeader,
  DateFilterCalendar,
  EmptyNote,
  FilterSelect,
  FootNote,
  IconBubble,
  LoadFailedAlert,
  PageLoading,
  PieceList,
  SCROLL_TABLE,
  SCROLL_TABLE_HEAD,
  useClock,
} from '../_shared/ui';

/**
 * ============================================================================
 * DIRECT MANAGER / MD DASHBOARD — "Factory Today"
 * ============================================================================
 * One page, no tabs, no page filters. Every number appears once:
 *   1. Pieces made today vs today's target   (daily_production, today's row)
 *   2. Workers in today                      (attendance.employees_present)
 *   3. Production line — done / waiting per stage, busiest stage highlighted
 *                                            (pipeline + bottleneck)
 *      and, unfiltered, what outside factories did there and still have
 *                                            (jobwork)
 *      with the card's own date + order filters (start on all / all):
 *        Order → every stage's done / waiting for that order, busiest stage
 *                highlighted (direct-manager/orders/{order_id})
 *        Date  → pieces each stage finished that day; "waiting" stays the
 *                live queue. No endpoint counts a stage by day, so each
 *                stage uses its own log, and a stage with none shows "—":
 *                  Leather / Lining Cutting → cut logs (also per order)
 *                  Store                    → pieces sent on (also per order)
 *                  Fusing … Final Finish    → stitching per-stage daily
 *                                             trend: last 14 days, not by order
 *                  Final Inspection, Package Export → no log
 *   4. Orders, most recently cut first, then late first
 *                                            (order_progress + overall counts)
 *      with leather DCM consumed per order/style (cutting consumption log)
 *   5. Last 14 days, made vs target          (daily_production)
 *   6. Click a stage → its workers (or pieces) replace blocks 4 + 5:
 *        Leather / Lining Cutting → one line per worker: pieces cut, consumed,
 *                                   narrowed by the card's own date (starts on
 *                                   the production line's date, else today) +
 *                                   order filters (cutting / lining consumption)
 *        Fusing … Package Export  → one line per worker: distinct pieces they
 *                                   finished there, so the total is the
 *                                   stage's "done"; same date (starts on the
 *                                   line's date, else all dates) + order
 *                                   filters (production event feed); plus an
 *                                   Outside factory line (pieces it did here)
 *                                   and, under the table, Done outside: pieces
 *                                   already at a later stage that were never
 *                                   logged here (production SKU pieces)
 *        Store                    → its done pieces: sent on (store dashboard,
 *                                   state "sended") + already shipped (order
 *                                   barcodes at the last stage — shipping
 *                                   recycles the drawer, so the store drops
 *                                   them), with the same date (starts on the
 *                                   line's date, else all dates) + order filters
 *      Click a worker → the pieces they did open under their row (cut log;
 *      event stages: piece codes looked up per SKU on click).
 *      Under it, if outside factories worked the stage: each job sent out
 *      for it, latest first — factory, sent / due back, pieces still out /
 *      back / rejected / missing         (jobwork)
 * From GET /api/v1/dashboard/direct-manager, plus
 * GET /api/v1/dashboard/cutting/consumption (DCM column + Leather Cutting
 * workers). Lining consumption, the event feed, the stitching trend and the
 * store's done pieces load only when their stage is clicked or the production
 * line's date filter needs them; an order's journey loads when it's picked.
 */

const AUTO_REFRESH_MS = 5 * 60 * 1000;
const CLOCK_TICK_MS = 30 * 1000;
const ORDERS_PREVIEW_COUNT = 5;
const WORKERS_PREVIEW_COUNT = 10;
// Row key of an event stage's outside-factory line (worker keys are ids).
const OUTSIDE_KEY = 'outside-factory';
// Row key of an event stage's done-outside line (pieces that went past it).
const DONE_OUTSIDE_KEY = 'done-outside';
// How far back the stitching dashboard's per-stage daily trend goes.
const STITCH_TREND_DAYS = 14;

// ─── Small helpers ──────────────────────────────────────────────────────────

// Which data source has the workers (or, for the store, the pieces) for a
// stage: the cut logs, the store, else the production event feed — every
// other stage is logged as one event per piece, which is what its "done"
// counts.
function stageSource(stageKey) {
  const k = String(stageKey).toUpperCase();
  if (k.includes('LINING')) return 'lining';
  if (k.includes('CUT')) return 'cutting';
  if (k.includes('STORE')) return 'store';
  return 'events';
}

// Stages the stitching dashboard's per-stage daily trend covers.
function inStitchTrend(stageKey) {
  const k = String(stageKey).toUpperCase();
  return k.includes('FUS') || k.includes('PAST') || k.includes('STITCH') || k.includes('FINISH');
}

// Every production event, read one worker at a time (eight at once). The
// whole-feed pages 500 when they hold an event with no worker — a piece an
// outside factory sent back — and a worker-filtered page never holds one.
// Those outside-factory pieces are found another way (StageWorkersCard).
async function fetchEventsByWorker(token, employees) {
  const pages = await inBatches(employees, 8, (e) =>
    fetchAllPages((offset, limit) => apiGetProductionEventsPage(token, { employeeId: e.id, offset, limit }))
  );
  return pages.flat();
}

// Piece id → its code (null = couldn't load). Events carry only piece ids.
// Kept for the whole visit (codes never change) and shared by every stage
// card, so reopening a worker or another stage doesn't look them up again.
// Cards listen for new codes, so a list fills in as lookups finish.
const pieceCodeCache = new Map();
const pieceCodePending = new Set();
const pieceCodeListeners = new Set();

// A SKU with more of its pieces to look up than this is paged through (200
// codes a page) rather than looked up one garment at a time.
const CODES_BY_SKU_PAST = 40;

// ── LIVE BACKEND CALLS: the codes of `pieces` ([{ pieceId, skuId }]) not
//    known or already on their way, eight requests at a time:
//    GET /api/v1/dashboard/store/garments/{piece_id} — one small lookup each
//    GET /api/v1/production/skus/{sku_id}/pieces (every page) — instead, for
//      a SKU with more than CODES_BY_SKU_PAST pieces to look up. ──
async function lookUpPieceCodes(token, pieces) {
  const bySku = new Map();
  pieces.forEach(({ pieceId, skuId }) => {
    if (!pieceId || pieceCodeCache.has(pieceId) || pieceCodePending.has(pieceId)) return;
    pieceCodePending.add(pieceId);
    if (!bySku.has(skuId)) bySku.set(skuId, []);
    bySku.get(skuId).push(pieceId);
  });
  const tasks = [];
  bySku.forEach((ids, skuId) => {
    if (skuId && ids.length > CODES_BY_SKU_PAST) {
      tasks.push(async () => {
        try {
          const all = await fetchAllPages((offset, limit) => apiGetSkuPiecesPage(token, skuId, { offset, limit }));
          all.forEach((p) => p?.piece_id && pieceCodeCache.set(p.piece_id, p.code || null));
        } catch (err) {
          console.warn('SKU pieces fetch failed:', err?.message);
        }
        ids.forEach((id) => !pieceCodeCache.has(id) && pieceCodeCache.set(id, null));
      });
    } else {
      ids.forEach((id) =>
        tasks.push(async () => {
          try {
            pieceCodeCache.set(id, (await apiGetStoreGarment(token, id))?.piece_code || null);
          } catch (err) {
            console.warn('Garment fetch failed:', err?.message);
            pieceCodeCache.set(id, null);
          }
        })
      );
    }
  });
  for (let i = 0; i < tasks.length; i += 8) {
    await Promise.all(tasks.slice(i, i + 8).map((task) => task()));
    pieceCodeListeners.forEach((listener) => listener());
  }
  bySku.forEach((ids) => ids.forEach((id) => pieceCodePending.delete(id)));
}

// The store's done pieces, in the cut log's row shape so the same date /
// order filters and piece list fit. Two kinds:
//   Sent on — store garment in state "sended", dated by when it left.
//   Shipped — finished at the last stage. Its drawer recycles once it ships,
//             so the store no longer lists it and its sent date is gone.
function storeLogRow(g) {
  return {
    piece_code: g?.piece_code || null,
    work_date: localDayOf(g?.sended_at),
    order_number: g?.order_number || '',
    style: g?.style || '',
    colour: g?.colour || '',
    size: g?.size || '',
    status: 'Sent on',
  };
}

function shippedLogRow(barcode, orderNumber) {
  return {
    piece_code: barcode?.piece_code || barcode?.code || null,
    work_date: '',
    order_number: orderNumber || '',
    style: barcode?.style_name || '',
    colour: barcode?.colour || '',
    size: barcode?.size || '',
    status: 'Shipped',
  };
}

// Store rows → piece-list rows, newest first (shipped, undated, last).
function buildStorePieces(logRows) {
  return logRows
    .map((r) => ({
      code: r.piece_code,
      date: r.work_date,
      order: String(r.order_number || '—').trim(),
      style: String(r.style || '—').trim(),
      colour: String(r.colour || '—').trim(),
      size: String(r.size || '').trim(),
      stage: r.status,
    }))
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        String(a.code ?? '').localeCompare(String(b.code ?? ''), undefined, { numeric: true })
    );
}

// The production event feed → rows in the cut log's shape (so the same
// date / order filters fit), tagged with their stage. Events only carry ids:
// the operation names the stage, the roster the worker (leavers included),
// the SKU the order / style / colour / size. The piece code is looked up
// per SKU when a worker is opened.
function buildEventFeed(operations, employees, skus, events) {
  const ops = new Map(
    (Array.isArray(operations) ? operations : []).map((o) => [o.id, { code: String(o.code || '').toUpperCase(), label: o.label || '' }])
  );
  const names = new Map(employees.map((e) => [e.id, e.name]));
  const skuInfo = new Map(skus.map((s) => [s.sku_id, s]));
  const seen = new Set();
  const rows = [];
  events.forEach((e) => {
    // The feed is newest first, so a page can repeat a row that slid over
    // while paging.
    if (!e?.id || seen.has(e.id)) return;
    seen.add(e.id);
    const op = ops.get(e.operation_id);
    const sku = skuInfo.get(e.sku_id);
    rows.push({
      stage_code: op?.code ?? '',
      stage_label: op?.label ?? '',
      piece_key: e.piece_id || `event-${e.id}`,
      piece_id: e.piece_id || null,
      sku_id: e.sku_id || null,
      work_date: localDayOf(e.work_date),
      order_number: sku?.order_number || '',
      style: sku?.style_name || '',
      colour: sku?.color_name || sku?.color_code || '',
      size: sku?.size || '',
      employee_id: e.employee_id || null,
      employee: names.get(e.employee_id) || 'Unknown worker',
    });
  });
  return rows;
}

// One stage's events → one line per worker with the distinct pieces they
// finished there, busiest first; their pieces newest first. The total counts
// each piece once however many workers touched it — the stage's "done".
function buildEventWorkerRows(logRows) {
  const byWorker = new Map();
  const allPieces = new Set();
  logRows.forEach((r) => {
    allPieces.add(r.piece_key);
    const key = r.employee_id || 'unknown';
    if (!byWorker.has(key)) byWorker.set(key, { key, worker: r.employee, pieces: new Map() });
    const pieces = byWorker.get(key).pieces;
    const prev = pieces.get(r.piece_key);
    if (!prev || r.work_date > prev.date) {
      pieces.set(r.piece_key, {
        pieceId: r.piece_id,
        skuId: r.sku_id,
        date: r.work_date,
        order: String(r.order_number || '—').trim(),
        style: String(r.style || '—').trim(),
        colour: String(r.colour || '—').trim(),
        size: String(r.size || '').trim(),
      });
    }
  });
  const rows = [...byWorker.values()]
    .map((w) => ({
      key: w.key,
      worker: w.worker,
      pieces: w.pieces.size,
      pieceList: [...w.pieces.values()].sort((a, b) => b.date.localeCompare(a.date)),
    }))
    .sort((a, b) => b.pieces - a.pieces || a.worker.localeCompare(b.worker));
  return { rows, workerCount: rows.length, totalPieces: allPieces.size };
}

// ─── Presentational pieces ──────────────────────────────────────────────────

// Replaces the Orders + Last 14 Days cards while a stage is selected.
// `logRows`: array = loaded, undefined = still loading, null = failed to load.
// `lineDate` / `lineOrder`: the production line's filters ('' = all).
// Worker stages list workers — click one for their pieces. The store has no
// workers, so it lists the pieces it has sent on instead.
function StageWorkersCard({ stage, source, logRows, lineDate, lineOrder, onClose, onRetry, outsideSource, outsideVendors }) {
  const { token } = useAuth();
  const cardRef = useRef(null);
  const [showAll, setShowAll] = useState(false);
  const isCut = source === 'cutting' || source === 'lining';
  const isStore = source === 'store';
  const isEvents = source === 'events';
  // '' = all; else a YYYY-MM-DD / upper-cased order number. Starts on the
  // production line's filters; with no line date, cutting starts on today
  // and the rest on all dates, so the list adds up to the stage's "done".
  // Picking "All dates" switches to the overall list. Changing the line's
  // filters resets these.
  // (The card only mounts on a stage click, so reading the clock here is safe.)
  const [todayKey] = useState(() => localDateKey(new Date()));
  const startDate = (date) => date || (isCut ? todayKey : '');
  const [dateFilter, setDateFilter] = useState(() => startDate(lineDate));
  const [orderFilter, setOrderFilter] = useState(lineOrder);
  const [seenLine, setSeenLine] = useState({ date: lineDate, order: lineOrder });
  if (seenLine.date !== lineDate || seenLine.order !== lineOrder) {
    setSeenLine({ date: lineDate, order: lineOrder });
    setDateFilter(startDate(lineDate));
    setOrderFilter(lineOrder);
  }
  // Worker whose pieces are open under their row (one at a time).
  const [openWorkerKey, setOpenWorkerKey] = useState(null);
  // Event stages: piece id → code, from pieceCodeCache (undefined = still
  // looking it up, null = couldn't load).
  const [pieceCodes, setPieceCodes] = useState(() => Object.fromEntries(pieceCodeCache));
  // Event stages: { pieces, passed } (undefined = not loaded, null = failed)
  // — pieces an outside factory did here, and pieces done outside that went
  // past this stage without it being logged. `outsideVendors`: the name(s).
  const [outside, setOutside] = useState(undefined);
  const filtering = dateFilter !== '' || orderFilter !== '';

  useEffect(() => {
    cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  // Filter choices come from the whole log, so they don't vanish as the other
  // filter changes. Days in the log mark the calendar; orders sort naturally (2, 10, 12).
  // An order picked on the production line stays listed even if this log
  // never has it, so the dropdown shows what's applied.
  const filterOptions = useMemo(() => {
    if (!Array.isArray(logRows) || logRows.length === 0) return null;
    const dates = new Set(logRows.map(rowDate).filter(Boolean));
    const orders = new Map();
    logRows.forEach((r) => {
      const key = rowOrderKey(r);
      if (key && !orders.has(key)) orders.set(key, String(r.order_number).trim());
    });
    [...(outside?.pieces ?? []), ...(outside?.passed ?? [])].forEach((p) => {
      if (p.orderKey && !orders.has(p.orderKey)) orders.set(p.orderKey, p.order);
    });
    if (orderFilter && !orders.has(orderFilter)) orders.set(orderFilter, orderFilter);
    return {
      dates,
      latestDate: [...dates].sort((a, b) => b.localeCompare(a))[0] ?? null,
      orders: [...orders.entries()]
        .sort((a, b) => a[1].localeCompare(b[1], undefined, { numeric: true, sensitivity: 'base' }))
        .map(([value, label]) => ({ value, label })),
    };
  }, [logRows, orderFilter, outside]);

  const table = useMemo(() => {
    if (!Array.isArray(logRows)) return null;
    const picked = logRows.filter(
      (r) => (!dateFilter || rowDate(r) === dateFilter) && (!orderFilter || rowOrderKey(r) === orderFilter)
    );
    if (isStore) return { kind: 'store', rows: buildStorePieces(picked) };
    if (isEvents) return { kind: 'events', ...buildEventWorkerRows(picked) };
    return { kind: 'cut', ...buildCutWorkerRows(picked, mainUnit(logRows)) };
  }, [logRows, isStore, isEvents, dateFilter, orderFilter]);

  const rows = table?.rows ?? [];
  const visibleRows = showAll ? rows : rows.slice(0, WORKERS_PREVIEW_COUNT);

  // Event stages: the pieces each SKU's workers did here (all dates), and
  // how many short of the stage's "done" they fall — the pieces an outside
  // factory did (job work), which the event feed can't list yet.
  const workerDone = useMemo(() => {
    if (!isEvents || !Array.isArray(logRows)) return null;
    const bySku = new Map();
    const all = new Set();
    logRows.forEach((r) => {
      all.add(r.piece_key);
      if (!r.piece_id || !r.sku_id) return;
      if (!bySku.has(r.sku_id)) bySku.set(r.sku_id, new Set());
      bySku.get(r.sku_id).add(r.piece_id);
    });
    return { bySku, total: all.size };
  }, [isEvents, logRows]);
  const outsideGap = workerDone ? Math.max((stage.done ?? 0) - workerDone.total, 0) : 0;
  // Pieces that reached a later stage without being done here (the stage
  // card's "done outside") — an outside factory did the work.
  const passedCount = isEvents ? (stage.skipped ?? 0) : 0;

  // ── LIVE BACKEND CALLS, at an event stage whose workers fall short of its
  //    "done" (the rest came back from an outside factory), or whose pieces
  //    went past it done outside:
  //    GET /api/v1/production/skus/{sku_id}/pieces?operation_id=… — whether
  //      each piece is done here, whoever did it, and the stage it's at now.
  //      Only short: one row per SKU in the feed for how many are done here,
  //      then every page of each SKU that's short. Gone past: every page of
  //      every SKU in the feed. A piece done here that none of our workers
  //      did is the outside factory's; one not done here but already at a
  //      later stage was done outside.
  //    It doesn't say which day a piece came back. ──
  const outsideOpId = outsideSource?.operationId ?? null;
  const outsideSkus = outsideSource?.skus ?? null;
  const laterStages = outsideSource?.laterStages ?? null;
  useEffect(() => {
    if (!token || (outsideGap === 0 && passedCount === 0) || !workerDone || !outsideOpId || !outsideSkus || !laterStages) {
      return;
    }
    let isMounted = true;
    async function loadPieces() {
      let skuIds = [...outsideSkus.keys()];
      if (passedCount === 0) {
        const heads = await inBatches(skuIds, 8, (skuId) =>
          apiGetSkuPiecesPage(token, skuId, { operationId: outsideOpId, limit: 1 })
        );
        skuIds = skuIds.filter((skuId, i) => (toNum(heads[i]?.done) ?? 0) > (workerDone.bySku.get(skuId)?.size ?? 0));
      }
      const pages = await inBatches(skuIds, 4, (skuId) =>
        fetchAllPages((offset, limit) => apiGetSkuPiecesPage(token, skuId, { operationId: outsideOpId, offset, limit }))
      );
      const pieces = [];
      const passed = [];
      skuIds.forEach((skuId, i) => {
        const sku = outsideSkus.get(skuId);
        const ours = workerDone.bySku.get(skuId);
        pages[i].forEach((p) => {
          if (!p?.piece_id) return;
          const piece = {
            pieceId: p.piece_id,
            skuId,
            code: p.code || null,
            date: '',
            order: String(sku?.order_number || '—').trim(),
            orderKey: rowOrderKey(sku),
            style: String(sku?.style || '—').trim(),
            colour: String(sku?.colour || '—').trim(),
            size: String(sku?.size || '').trim(),
          };
          if (p.done_at_op) {
            if (!ours?.has(p.piece_id)) pieces.push(piece);
          } else if (
            laterStages.keys.has(String(p.current_stage || '').toUpperCase()) ||
            laterStages.names.has(p.current_stage_label)
          ) {
            passed.push({ ...piece, stage: p.current_stage_label || stageName(p.current_stage) });
          }
        });
      });
      const byCode = (a, b) => String(a.code).localeCompare(String(b.code), undefined, { numeric: true });
      return { pieces: pieces.sort(byCode), passed: passed.sort(byCode) };
    }
    loadPieces()
      .then((found) => {
        if (isMounted) setOutside(found);
      })
      .catch((err) => {
        console.warn('Outside factory pieces fetch failed:', err?.message);
        if (isMounted) setOutside((prev) => prev ?? null);
      });
    return () => {
      isMounted = false;
    };
  }, [token, outsideGap, passedCount, workerDone, outsideOpId, outsideSkus, laterStages]);

  // The outside factory's line under the current filters. Its pieces have no
  // date, so a date filter leaves them out. Until they load (or if they
  // can't), the line is the gap to the stage's "done" with no filter on.
  const outsideList = outside?.pieces
    ? outside.pieces.filter((p) => !dateFilter && (!orderFilter || p.orderKey === orderFilter))
    : null;
  const outsidePieces = !isEvents ? 0 : outsideList ? outsideList.length : filtering ? 0 : outsideGap;
  // The done-outside line, the same way: no date, so a date filter hides it.
  const passedList = outside?.passed
    ? outside.passed.filter((p) => !dateFilter && (!orderFilter || p.orderKey === orderFilter))
    : null;
  const passedPieces = !isEvents ? 0 : passedList ? passedList.length : filtering ? 0 : passedCount;
  const outsideName = outsideVendors?.length ? outsideVendors.join(', ') : null;

  // New codes in the shared cache → this card's copy.
  useEffect(() => {
    const update = () => setPieceCodes(Object.fromEntries(pieceCodeCache));
    pieceCodeListeners.add(update);
    return () => {
      pieceCodeListeners.delete(update);
    };
  }, []);

  // When a worker at an event stage is opened: look up the codes of their
  // pieces not known yet (lookUpPieceCodes). The list shows at once; codes
  // fill in as they arrive.
  const openRow = isEvents ? (rows.find((r) => r.key === openWorkerKey) ?? null) : null;
  const missingCodesKey = openRow
    ? openRow.pieceList
        .filter((p) => p.pieceId && pieceCodes[p.pieceId] === undefined)
        .map((p) => `${p.skuId || ''}:${p.pieceId}`)
        .join(',')
    : '';
  useEffect(() => {
    if (!token || !missingCodesKey) return;
    lookUpPieceCodes(
      token,
      missingCodesKey.split(',').map((k) => {
        const [skuId, pieceId] = k.split(':');
        return { skuId: skuId || null, pieceId };
      })
    );
  }, [token, missingCodesKey]);

  const clearFilters = () => {
    setDateFilter('');
    setOrderFilter('');
  };

  const toggleWorker = (key) => setOpenWorkerKey((current) => (current === key ? null : key));

  // What opens under a worker's row.
  const workerPieces = (r) => {
    if (isCut) return <PieceList caption={`Pieces cut by ${r.worker}`} pieces={r.pieceList} unitLabel={table.unitLabel} />;
    const pieces = r.pieceList.map((p) => {
      const code = p.pieceId ? pieceCodes[p.pieceId] : null;
      return { ...p, code: code ?? null, codePending: code === undefined };
    });
    return <PieceList caption={`Pieces done by ${r.worker}`} pieces={pieces} />;
  };

  // What opens under the outside factory's row.
  const outsidePieceList = () => {
    if (outside === undefined && outsideOpId && outsideSkus) {
      return (
        <p className="flex items-center gap-2 py-3 text-sm text-[#8b7f6e]">
          <Loader2 className="w-4 h-4 animate-spin text-[#e8961a]" />
          Loading pieces…
        </p>
      );
    }
    if (!outsideList) return <p className="py-3 text-sm text-[#a33a33]">Couldn&apos;t load these pieces.</p>;
    return <PieceList caption="Pieces done by an outside factory" pieces={outsideList} />;
  };

  // What opens under the done-outside line: the pieces and where they are now.
  const passedPieceList = () => {
    if (outside === undefined && outsideOpId && outsideSkus) {
      return (
        <p className="flex items-center gap-2 py-3 text-sm text-[#8b7f6e]">
          <Loader2 className="w-4 h-4 animate-spin text-[#e8961a]" />
          Loading pieces…
        </p>
      );
    }
    if (!passedList) return <p className="py-3 text-sm text-[#a33a33]">Couldn&apos;t load these pieces.</p>;
    return <PieceList caption={`Pieces done outside, never logged at ${stage.name}`} pieces={passedList} />;
  };

  const noun = isStore ? 'pieces' : 'workers';
  const verb = isStore ? 'sent on' : isCut ? 'cut' : 'finished here';
  let body;
  if (logRows === undefined) {
    body = (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-[#8b7f6e]">
        <Loader2 className="w-5 h-5 animate-spin text-[#e8961a]" />
        Loading {noun}…
      </div>
    );
  } else if (logRows === null) {
    body = (
      <p className="py-10 text-center text-sm text-[#a33a33]">
        Couldn&apos;t load the {noun} for this stage.{' '}
        <button type="button" onClick={onRetry} className="font-semibold underline cursor-pointer">
          Try again
        </button>
      </p>
    );
  } else if (rows.length === 0 && outsidePieces === 0 && filtering) {
    body = (
      <p className="py-10 text-center text-sm text-[#a89c8a]">
        {dateFilter === todayKey && !orderFilter
          ? `Nothing has been ${verb} today yet.`
          : `Nothing was ${verb} for this ${dateFilter && orderFilter ? 'date and order' : dateFilter ? 'date' : 'order'}.`}{' '}
        <button type="button" onClick={clearFilters} className="font-semibold text-[#3e6fd6] hover:underline cursor-pointer">
          {orderFilter ? 'Clear filters' : 'See all dates'}
        </button>
      </p>
    );
  } else if (rows.length === 0 && outsidePieces === 0) {
    body = <EmptyNote>{isStore ? 'No pieces have left the store yet.' : 'No pieces recorded at this stage yet.'}</EmptyNote>;
  } else if (isStore) {
    body = (
      <div className="mt-5">
        <PieceList
          caption="Pieces the store has sent on"
          pieces={visibleRows}
          dateLabel="Sent"
          stageLabel="Status"
          scroll={false}
        />
      </div>
    );
  } else {
    const columns = isCut ? 3 : 2;
    body = (
      <div className="mt-5 overflow-x-auto rounded-2xl border border-[#efe6d6]">
        <table className="w-full text-sm">
          <thead className="bg-[#faf5ec] text-xs text-[#8b7f6e]">
            <tr>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Worker</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                {isCut ? 'Pieces Cut' : 'Pieces Done'}
              </th>
              {isCut && (
                <th scope="col" className="px-4 py-3 text-right font-semibold whitespace-nowrap">{table.unitLabel} Consumed</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f3ece0]">
            {visibleRows.map((r) => {
              const open = r.key === openWorkerKey;
              return (
                <React.Fragment key={r.key}>
                  <tr
                    onClick={() => toggleWorker(r.key)}
                    className={`cursor-pointer transition-colors ${open ? 'bg-[#fff6df]' : 'hover:bg-[#fffaf1]'}`}
                  >
                    <td className="px-4 py-3 font-semibold">
                      {/* The button is for keyboard users; a mouse click anywhere on the row toggles. */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWorker(r.key);
                        }}
                        aria-expanded={open}
                        title={open ? 'Hide pieces' : `Show pieces ${isCut ? 'cut' : 'done'} by ${r.worker}`}
                        className="flex items-center gap-2 text-left cursor-pointer rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c8834a]"
                      >
                        <ChevronRight
                          aria-hidden="true"
                          className={`w-4 h-4 shrink-0 text-[#a89c8a] transition-transform ${open ? 'rotate-90' : ''}`}
                        />
                        {r.worker}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.pieces.toLocaleString()}</td>
                    {isCut && (
                      <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                        {r.consumed !== null ? formatConsumed(r.consumed, table.unitLabel) : '—'}
                      </td>
                    )}
                  </tr>
                  {open && (
                    <tr>
                      <td colSpan={columns} className="bg-[#fffaf1] px-4 pt-1 pb-4">
                        {workerPieces(r)}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {outsidePieces > 0 &&
              (() => {
                const open = openWorkerKey === OUTSIDE_KEY;
                return (
                  <>
                    <tr
                      onClick={() => toggleWorker(OUTSIDE_KEY)}
                      className={`cursor-pointer transition-colors ${open ? 'bg-[#fff6df]' : 'hover:bg-[#fffaf1]'}`}
                    >
                      <td className="px-4 py-3 font-semibold">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleWorker(OUTSIDE_KEY);
                          }}
                          aria-expanded={open}
                          title={open ? 'Hide pieces' : 'Show pieces done by an outside factory'}
                          className="flex items-center gap-2 text-left cursor-pointer rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c8834a]"
                        >
                          <ChevronRight
                            aria-hidden="true"
                            className={`w-4 h-4 shrink-0 text-[#a89c8a] transition-transform ${open ? 'rotate-90' : ''}`}
                          />
                          Outside factory
                          <span className="text-xs font-normal text-[#8b7f6e]">{outsideName ?? 'job work'}</span>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{outsidePieces.toLocaleString()}</td>
                    </tr>
                    {open && (
                      <tr>
                        <td colSpan={columns} className="bg-[#fffaf1] px-4 pt-1 pb-4">
                          {outsidePieceList()}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })()}
          </tbody>
          {/* Every piece in the current filter, including workers hidden
              behind "View All" and the outside factory's. */}
          <tfoot className="border-t-2 border-[#efe6d6] bg-[#faf5ec] font-semibold">
            <tr>
              <th scope="row" className="px-4 py-3 text-left">Total</th>
              <td className="px-4 py-3 text-right tabular-nums">{(table.totalPieces + outsidePieces).toLocaleString()}</td>
              {isCut && (
                <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                  {table.totalConsumed !== null ? formatConsumed(table.totalConsumed, table.unitLabel) : '—'}
                </td>
              )}
            </tr>
          </tfoot>
        </table>
      </div>
    );
  }

  const count = isStore ? rows.length : (table?.workerCount ?? 0);

  return (
    <section ref={cardRef} className={`${CARD} p-6 flex flex-col scroll-mt-4`}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="w-11 h-11 shrink-0 rounded-full bg-[#ffe7a8] text-[#e8961a] flex items-center justify-center shadow-[inset_0_0_0_5px_rgba(255,255,255,0.45)]">
          <StageIcon stageKey={stage.key} className="w-5 h-5" strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <h3 className="text-xl font-semibold">
            {stage.name} {isStore ? 'Pieces' : 'Workers'}
          </h3>
        </div>
        {count > 0 && (
          <span className="rounded-full bg-[#f3eee5] px-3 py-1 text-xs font-semibold text-[#5b5146] tabular-nums">
            {count} {isStore ? 'piece' : 'worker'}
            {count === 1 ? '' : 's'}
          </span>
        )}
        <div className="ml-auto flex items-center gap-4">
          {rows.length > WORKERS_PREVIEW_COUNT && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="flex items-center gap-1 text-sm font-semibold text-[#3e6fd6] hover:underline cursor-pointer"
              aria-expanded={showAll}
            >
              {showAll ? 'Show Less' : 'View All'}
              <ArrowRight className={`w-4 h-4 transition-transform ${showAll ? '-rotate-90' : ''}`} />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-full border border-[#e6d9c3] bg-white px-3 py-1.5 text-sm font-semibold text-[#5b4c3a] hover:bg-[#fff5e0] cursor-pointer"
          >
            <X className="w-4 h-4" />
            Close
          </button>
        </div>
      </div>

      {filterOptions && (
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
          <DateFilterCalendar
            label="Date"
            value={dateFilter}
            onChange={setDateFilter}
            markedDates={filterOptions.dates}
            latestDate={filterOptions.latestDate}
            markLabel={isStore ? 'Days with pieces sent' : isEvents ? 'Days with work' : undefined}
          />
          <FilterSelect
            label="Order"
            value={orderFilter}
            onChange={setOrderFilter}
            allLabel="All orders"
            options={filterOptions.orders}
          />
          {filtering && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1 text-sm font-semibold text-[#3e6fd6] hover:underline cursor-pointer"
            >
              <X className="w-4 h-4" />
              Show all
            </button>
          )}
        </div>
      )}

      {body}

      {/* Under the table, so its Total stays the stage's "done". */}
      {passedPieces > 0 && Array.isArray(logRows) && (
        <div className="mt-3 overflow-x-auto rounded-2xl border border-[#efe6d6]">
          <table className="w-full text-sm">
            <tbody>
              <tr
                onClick={() => toggleWorker(DONE_OUTSIDE_KEY)}
                className={`cursor-pointer transition-colors ${
                  openWorkerKey === DONE_OUTSIDE_KEY ? 'bg-[#fff6df]' : 'hover:bg-[#fffaf1]'
                }`}
              >
                <td className="px-4 py-3 font-semibold">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleWorker(DONE_OUTSIDE_KEY);
                    }}
                    aria-expanded={openWorkerKey === DONE_OUTSIDE_KEY}
                    title={openWorkerKey === DONE_OUTSIDE_KEY ? 'Hide pieces' : 'Show the pieces done outside'}
                    className="flex flex-wrap items-center gap-x-2 text-left cursor-pointer rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c8834a]"
                  >
                    <ChevronRight
                      aria-hidden="true"
                      className={`w-4 h-4 shrink-0 text-[#a89c8a] transition-transform ${
                        openWorkerKey === DONE_OUTSIDE_KEY ? 'rotate-90' : ''
                      }`}
                    />
                    Done outside
                    <span className="text-xs font-normal text-[#8b7f6e]">never logged at {stage.name}</span>
                  </button>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{passedPieces.toLocaleString()}</td>
              </tr>
              {openWorkerKey === DONE_OUTSIDE_KEY && (
                <tr>
                  <td colSpan={2} className="bg-[#fffaf1] px-4 pt-1 pb-4">
                    {passedPieceList()}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {isCut && rows.length > 0 && (
        <FootNote className="mt-auto pt-5">
          {table.unitLabel} Consumed = material used for those pieces.
        </FootNote>
      )}
    </section>
  );
}

// ─── Outside factories ──────────────────────────────────────────────────────

// Shown under a clicked stage's card: one row per job sent to an outside
// factory for that stage (job work), latest sent or returned first — the
// factory, when it went and is due back, and its pieces: still out there,
// back done, rejected, missing. Late = past its due-back date with pieces
// still out. `jobs`: that stage's jobwork rows.
function OutsideWorkCard({ stageName: name, jobs }) {
  const rows = useMemo(
    () =>
      jobs
        .map((j, idx) => {
          const stamps = [j.dispatched_at, j.returned_at]
            .map((at) => (at ? new Date(at) : null))
            .filter((t) => t && !Number.isNaN(t.getTime()))
            .map((t) => t.toISOString())
            .sort();
          const out = Math.max(toNum(j.pieces_out) ?? 0, 0);
          return {
            key: j.job_id || `job-${idx}`,
            vendor: String(j.vendor || '—').trim(),
            sentDay: localDayOf(j.dispatched_at),
            dueDay: j.expected_back ? String(j.expected_back).slice(0, 10) : '',
            out,
            back: Math.max(toNum(j.pieces_back) ?? 0, 0),
            rejected: Math.max(toNum(j.pieces_rejected) ?? 0, 0),
            missing: Math.max(toNum(j.pieces_short) ?? 0, 0),
            late: Boolean(j.overdue) && out > 0,
            lastMoved: stamps[stamps.length - 1] ?? '',
          };
        })
        .sort((a, b) => compareNewest(a.lastMoved, b.lastMoved)),
    [jobs]
  );

  const stillOut = rows.reduce((sum, r) => sum + r.out, 0);
  const lateJobs = rows.filter((r) => r.late).length;

  return (
    <section className={`${CARD} p-6 min-w-0`}>
      <div className="flex flex-wrap items-center gap-3">
        <IconBubble icon={Factory} />
        <h3 className="text-xl font-semibold">{name} at Outside Factories</h3>
        {stillOut > 0 && (
          <span className="rounded-full bg-[#f3eee5] px-3 py-1 text-xs font-semibold text-[#5b5146] tabular-nums">
            {stillOut} piece{stillOut === 1 ? '' : 's'} out
          </span>
        )}
        {lateJobs > 0 && (
          <span className="rounded-full bg-[#fde4e1] px-3 py-1 text-xs font-semibold text-[#d9443f] tabular-nums">
            {lateJobs} late
          </span>
        )}
      </div>
      <div className={`mt-5 rounded-2xl border border-[#efe6d6] ${SCROLL_TABLE}`}>
        <table className="w-full min-w-[640px] text-sm">
          <thead className={`bg-[#faf5ec] text-xs text-[#8b7f6e] ${SCROLL_TABLE_HEAD}`}>
            <tr>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Factory</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold whitespace-nowrap">Sent On</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold whitespace-nowrap">Due Back</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold whitespace-nowrap">Still Out</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Back</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Rejected</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Missing</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f3ece0]">
            {rows.map((r) => (
              <tr key={r.key}>
                <td className="px-4 py-3 font-semibold">{r.vendor}</td>
                <td className="px-4 py-3 text-[#5b5146] whitespace-nowrap">{r.sentDay ? formatShortDate(r.sentDay) : '—'}</td>
                <td className="px-4 py-3 text-[#5b5146] whitespace-nowrap">
                  {r.dueDay ? formatShortDate(r.dueDay) : '—'}
                  {r.late && (
                    <span className="ml-2 rounded-full bg-[#fde4e1] px-2 py-0.5 text-[11px] font-semibold text-[#d9443f]">Late</span>
                  )}
                </td>
                <td className={`px-4 py-3 text-right tabular-nums ${r.out > 0 ? 'font-semibold text-[#b8730a]' : ''}`}>
                  {r.out.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{r.back.toLocaleString()}</td>
                <td className="px-4 py-3 text-right tabular-nums">{r.rejected.toLocaleString()}</td>
                <td className="px-4 py-3 text-right tabular-nums">{r.missing.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function DirectManagerDashboard() {
  const { token } = useAuth();

  const [data, setData] = useState(null);
  const [consumptionRows, setConsumptionRows] = useState(null);
  // Work sent to outside factories, one row per dispatch (null = couldn't load).
  const [jobWork, setJobWork] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const now = useClock(CLOCK_TICK_MS);
  const [showAllOrders, setShowAllOrders] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  // Clicked stage → its workers replace the Orders + Last 14 Days cards.
  const [selectedStageKey, setSelectedStageKey] = useState(null);
  // Production line filters. '' = all; else a YYYY-MM-DD / upper-cased order
  // number (the order is only applied while it's still in production).
  const [lineDate, setLineDate] = useState('');
  const [pickedLineOrder, setPickedLineOrder] = useState('');
  // Per source: undefined = not loaded yet, null = failed, else loaded —
  // lining: its cut log; stitching: its per-stage daily trend; store /
  // shipped: the store's done pieces; events: the production event feed for
  // every other stage. All but the trend are in the cut log's row shape.
  const [stageLogs, setStageLogs] = useState({
    lining: undefined,
    stitching: undefined,
    store: undefined,
    shipped: undefined,
    events: undefined,
  });
  // Order id → its journey across the stages (undefined = loading, null = failed).
  const [orderTracks, setOrderTracks] = useState({});
  const selectedSource = selectedStageKey ? stageSource(selectedStageKey) : null;
  const needLining = selectedSource === 'lining' || lineDate !== '';
  const needStitching = lineDate !== '';
  const needStore = selectedSource === 'store' || lineDate !== '';
  const needEvents = selectedSource === 'events';
  // The dashboard load (updatedAt) the event feed was fetched for.
  const eventFeedFor = useRef(null);
  // Set once the whole event feed has failed: later loads go straight to
  // reading it worker by worker.
  const eventsByWorker = useRef(false);
  // The operations loaded with the event feed — an event stage's id, for
  // finding its outside-factory pieces.
  const [eventOps, setEventOps] = useState(null);

  // ── LIVE BACKEND CALLS: GET /api/v1/dashboard/direct-manager
  //    + GET /api/v1/dashboard/cutting/consumption (leather cut log: DCM per
  //      piece; with unmeasured cuts, so it also counts every piece cut)
  //    + GET /api/v1/jobwork (pieces each stage got back from outside
  //      factories, and the factories' names; counts only, no pieces) ──
  // Loads on mount, on the refresh button (refreshKey), and every 5 minutes.
  // A failed consumption call only blanks the DCM column, and a failed job
  // work call the outside-factory counts, never the page.
  useEffect(() => {
    let isMounted = true;
    async function loadDashboard() {
      if (!token) return;
      try {
        setLoading(true);
        const [dmRes, consumptionRes, jobWorkRes] = await Promise.allSettled([
          apiGetDirectManagerDashboard(token),
          apiGetCuttingConsumption(token, { include_unmeasured: true }),
          apiGetJobWork(token, { limit: 1000 }),
        ]);
        if (!isMounted) return;
        if (dmRes.status === 'rejected') throw dmRes.reason;
        setData(dmRes.value || null);
        setConsumptionRows(
          consumptionRes.status === 'fulfilled' && Array.isArray(consumptionRes.value) ? consumptionRes.value : null
        );
        if (consumptionRes.status === 'rejected') {
          console.warn('Cutting consumption fetch failed:', consumptionRes.reason?.message);
        }
        setJobWork(jobWorkRes.status === 'fulfilled' && Array.isArray(jobWorkRes.value) ? jobWorkRes.value : null);
        if (jobWorkRes.status === 'rejected') {
          console.warn('Job work fetch failed:', jobWorkRes.reason?.message);
        }
        setLoadFailed(false);
        setUpdatedAt(Date.now());
      } catch (err) {
        console.warn('Direct Manager dashboard fetch failed:', err?.message);
        if (isMounted) setLoadFailed(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadDashboard();
    const id = setInterval(loadDashboard, AUTO_REFRESH_MS);
    return () => {
      isMounted = false;
      clearInterval(id);
    };
  }, [token, refreshKey]);

  const refreshDashboard = () => setRefreshKey((k) => k + 1);

  // ── LIVE BACKEND CALLS, on demand:
  //    GET /api/v1/dashboard/lining/consumption — Lining Cutting workers, and
  //      Lining Cutting's count under any production line filter
  //    GET /api/v1/dashboard/stitching → employees (Fusing … Final Finish
  //      workers) + daily_production (their per-day counts for the line's
  //      date filter) ──
  // Leather Cutting reuses the cutting consumption rows already loaded above.
  // A failed reload keeps the last good data.
  useEffect(() => {
    if (!token || !needLining) return;
    let isMounted = true;
    apiGetLiningConsumption(token, { include_unmeasured: true })
      .then((rows) => {
        if (isMounted) setStageLogs((prev) => ({ ...prev, lining: Array.isArray(rows) ? rows : [] }));
      })
      .catch((err) => {
        console.warn('Lining cut log fetch failed:', err?.message);
        if (isMounted) setStageLogs((prev) => ({ ...prev, lining: Array.isArray(prev.lining) ? prev.lining : null }));
      });
    return () => {
      isMounted = false;
    };
  }, [token, needLining, refreshKey]);

  useEffect(() => {
    if (!token || !needStitching) return;
    let isMounted = true;
    apiGetStitchingDashboard(token)
      .then((res) => {
        if (!isMounted) return;
        setStageLogs((prev) => ({
          ...prev,
          stitching: Array.isArray(res?.daily_production) ? res.daily_production : [],
        }));
      })
      .catch((err) => {
        console.warn('Stitching dashboard fetch failed:', err?.message);
        if (isMounted) setStageLogs((prev) => ({ ...prev, stitching: prev.stitching ?? null }));
      });
    return () => {
      isMounted = false;
    };
  }, [token, needStitching, refreshKey]);

  // ── LIVE BACKEND CALLS, when a stage logged as events is clicked (Fusing …
  //    Package Export) — the same records its "done" counts:
  //    GET /api/v1/production/events (every page) — one row per piece per
  //      stage, with ids only, so also:
  //    GET /api/v1/production/operations — each event's stage
  //    GET /api/v1/employees?active_only=false — worker names, leavers too
  //    GET /api/v1/production/skus — order / style / colour / size
  //    Loaded once per dashboard load and shared by those stages. If the
  //    whole feed fails, it's read per worker instead (?employee_id=…). ──
  useEffect(() => {
    if (!token || !needEvents || !updatedAt || eventFeedFor.current === updatedAt) return;
    let isMounted = true;
    async function loadEvents(employeesLoad) {
      if (!eventsByWorker.current) {
        try {
          return await fetchAllPages((offset, limit) => apiGetProductionEventsPage(token, { offset, limit }));
        } catch (err) {
          console.warn('Whole production event feed failed, reading it per worker:', err?.message);
          eventsByWorker.current = true;
        }
      }
      return fetchEventsByWorker(token, await employeesLoad);
    }
    async function loadEventFeed() {
      try {
        const employeesLoad = fetchAllPages((offset, limit) =>
          apiGetEmployeesPage(token, { activeOnly: false, offset, limit })
        );
        const [operations, employees, skus, events] = await Promise.all([
          apiGetOperations(token),
          employeesLoad,
          fetchAllPages((offset, limit) => apiGetSkusPage(token, { offset, limit })),
          loadEvents(employeesLoad),
        ]);
        if (!isMounted) return;
        eventFeedFor.current = updatedAt;
        setStageLogs((prev) => ({ ...prev, events: buildEventFeed(operations, employees, skus, events) }));
        setEventOps(Array.isArray(operations) ? operations : []);
      } catch (err) {
        console.warn('Production event feed fetch failed:', err?.message);
        if (isMounted) setStageLogs((prev) => ({ ...prev, events: Array.isArray(prev.events) ? prev.events : null }));
      }
    }
    loadEventFeed();
    return () => {
      isMounted = false;
    };
  }, [token, needEvents, updatedAt]);

  // ── LIVE BACKEND CALL, on demand: GET /api/v1/dashboard/store?state=sended
  //    — the pieces the store has sent on (its "done"), for the Store card
  //    and Store's count under the line's date filter. ──
  useEffect(() => {
    if (!token || !needStore) return;
    let isMounted = true;
    apiGetStoreDashboard(token, { state: 'sended' })
      .then((res) => {
        if (!isMounted) return;
        const garments = Array.isArray(res?.garments) ? res.garments : [];
        setStageLogs((prev) => ({ ...prev, store: garments.map(storeLogRow) }));
      })
      .catch((err) => {
        console.warn('Store pieces fetch failed:', err?.message);
        if (isMounted) setStageLogs((prev) => ({ ...prev, store: Array.isArray(prev.store) ? prev.store : null }));
      });
    return () => {
      isMounted = false;
    };
  }, [token, needStore, refreshKey]);

  // ── Production line order choices: the orders in production (the Orders
  // card's list), sorted naturally. A picked order that drops out of
  // production on a refresh stops filtering. ──
  const lineOrderOptions = useMemo(() => {
    const orders = new Map();
    (Array.isArray(data?.order_progress) ? data.order_progress : []).forEach((o) => {
      const label = String(o?.order_number || '').trim();
      if (label && o.order_id && !orders.has(label.toUpperCase())) {
        orders.set(label.toUpperCase(), { value: label.toUpperCase(), label, orderId: o.order_id });
      }
    });
    return [...orders.values()].sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [data]);
  const lineOrderOption = lineOrderOptions.find((o) => o.value === pickedLineOrder) ?? null;
  const lineOrder = lineOrderOption?.value ?? '';
  const lineOrderId = lineOrderOption?.orderId ?? null;
  const lineFiltering = lineDate !== '' || lineOrder !== '';

  // ── LIVE BACKEND CALL, when an order is picked on the production line:
  //    GET /api/v1/dashboard/direct-manager/orders/{order_id} — that order's
  //    done / waiting at every stage, and the stage holding most of it.
  //    Kept per order, so switching back shows the last numbers at once. ──
  useEffect(() => {
    if (!token || !lineOrderId) return;
    let isMounted = true;
    apiGetDirectManagerOrderDetail(token, lineOrderId)
      .then((res) => {
        if (!isMounted) return;
        setOrderTracks((prev) => ({
          ...prev,
          [lineOrderId]: {
            blockedStage: res?.blocked_stage ?? null,
            stages: Array.isArray(res?.stages) ? res.stages : [],
          },
        }));
      })
      .catch((err) => {
        console.warn('Order tracking fetch failed:', err?.message);
        if (isMounted) setOrderTracks((prev) => ({ ...prev, [lineOrderId]: prev[lineOrderId] ?? null }));
      });
    return () => {
      isMounted = false;
    };
  }, [token, lineOrderId, refreshKey]);

  const toggleStage = (key) => setSelectedStageKey((current) => (current === key ? null : key));

  const retryStageLogs = () => {
    if (selectedSource === 'lining' || selectedSource === 'events') {
      setStageLogs((prev) => ({ ...prev, [selectedSource]: undefined }));
    }
    if (selectedSource === 'store') setStageLogs((prev) => ({ ...prev, store: undefined, shipped: undefined }));
    refreshDashboard();
  };

  // ── Daily rows (oldest → newest) ──
  const dailyRows = useMemo(
    () =>
      (Array.isArray(data?.daily_production) ? data.daily_production : [])
        .filter((r) => r?.work_date)
        .sort((a, b) => String(a.work_date).localeCompare(String(b.work_date))),
    [data]
  );

  // ── 1. Pieces made today ──
  const todayKey = now ? localDateKey(now) : null;
  const todayRow = todayKey ? dailyRows.find((r) => String(r.work_date).slice(0, 10) === todayKey) : null;
  const madeToday = toNum(todayRow?.completed) ?? 0;
  const targetToday = toNum(todayRow?.assigned);
  const todayPct = targetToday ? Math.round((madeToday / targetToday) * 100) : null;

  // ── 2. Workers in today ──
  const workersIn = toNum(data?.attendance?.employees_present);

  // ── 3. Production line ──
  const stages = useMemo(() => {
    const list = withFlowQueues(
      (Array.isArray(data?.pipeline) ? data.pipeline : []).map((st) => {
        const key = st.stage || st.label || '';
        return {
          key,
          kind: st.kind || null,
          name: st.label || stageName(key),
          done: toNum(st.completed ?? st.done) ?? 0,
          waiting: toNum(st.pending ?? st.queue) ?? 0,
        };
      })
    );

    // The deepest queue. (Not the backend's bottleneck: it's picked from the
    // backend's own waiting, which withFlowQueues replaces.)
    const deepest = list.reduce((max, s) => (s.waiting > (max?.waiting ?? 0) ? s : max), null);
    return list.map((s) => ({ ...s, stuck: s.key === deepest?.key && s.waiting > 0 }));
  }, [data]);

  // Stage code → { back, out, vendors }: the pieces outside factories sent
  // back done at that stage (part of its "done"), the pieces they still have
  // for it, and the factories that sent work back. All dates, whole factory.
  const outsideByStage = useMemo(() => {
    const map = new Map();
    (Array.isArray(jobWork) ? jobWork : []).forEach((j) => {
      const key = String(j?.stage || '').toUpperCase();
      if (!key) return;
      const back = Math.max(toNum(j.pieces_back) ?? 0, 0);
      const out = Math.max(toNum(j.pieces_out) ?? 0, 0);
      if (back === 0 && out === 0) return;
      if (!map.has(key)) map.set(key, { back: 0, out: 0, vendors: new Set() });
      const entry = map.get(key);
      entry.back += back;
      entry.out += out;
      const vendor = String(j.vendor || '').trim();
      if (vendor && back > 0) entry.vendors.add(vendor);
    });
    return map;
  }, [jobWork]);

  // ── LIVE BACKEND CALLS, when Store is clicked: the pieces that have
  //    already shipped. Store's "done" counts them, but their drawer
  //    recycles once they ship, so the store dashboard no longer lists them.
  //    GET /api/v1/barcode/orders/{order_id}/barcodes?style_id=… (every page)
  //    for each order style with finished pieces; a piece whose current
  //    (last completed) stage is the line's last stage has shipped. ──
  const lastStageKey = stages.length > 0 ? String(stages[stages.length - 1].key).toUpperCase() : null;
  const finishedStyles = useMemo(() => {
    const byKey = new Map();
    (Array.isArray(data?.order_progress) ? data.order_progress : []).forEach((o) => {
      if (!o?.order_id || !o.style_id || (toNum(o.completed) ?? 0) <= 0) return;
      byKey.set(`${o.order_id}::${o.style_id}`, { orderId: o.order_id, styleId: o.style_id, orderNumber: o.order_number });
    });
    return [...byKey.values()];
  }, [data]);

  useEffect(() => {
    if (!token || selectedSource !== 'store' || !lastStageKey) return;
    let isMounted = true;
    async function loadShipped() {
      try {
        const lists = await Promise.all(
          finishedStyles.map(async (st) => {
            const barcodes = [];
            for (let page = 1, pages = 1; page <= pages; page += 1) {
              const res = await apiGetOrderBarcodes(token, st.orderId, { styleId: st.styleId, page, pageSize: 200 });
              barcodes.push(...(Array.isArray(res?.items) ? res.items : []));
              pages = toNum(res?.pages) ?? 1;
            }
            return barcodes
              .filter((b) => String(b?.current_stage || '').toUpperCase() === lastStageKey)
              .map((b) => shippedLogRow(b, st.orderNumber));
          })
        );
        if (isMounted) setStageLogs((prev) => ({ ...prev, shipped: lists.flat() }));
      } catch (err) {
        console.warn('Shipped pieces fetch failed:', err?.message);
        if (isMounted) setStageLogs((prev) => ({ ...prev, shipped: Array.isArray(prev.shipped) ? prev.shipped : null }));
      }
    }
    loadShipped();
    return () => {
      isMounted = false;
    };
    // finishedStyles is rebuilt on every dashboard load, so it also re-runs
    // this on refresh.
  }, [token, selectedSource, lastStageKey, finishedStyles]);

  // ── 3a. Production line calendar dots: days with any logged work. ──
  // Same states as stageLogs: undefined = loading, null = failed.
  const liningLog = stageLogs.lining;
  const storeLog = stageLogs.store;
  // Store card: sent-on pieces plus shipped ones (a piece can't be both — its
  // drawer recycles when it ships — but codes are de-duplicated anyway).
  const storeCardRows = useMemo(() => {
    const shipped = stageLogs.shipped;
    if (storeLog === undefined || shipped === undefined) return undefined;
    if (!Array.isArray(storeLog) || !Array.isArray(shipped)) return null;
    const sentCodes = new Set(storeLog.map((r) => r.piece_code).filter(Boolean));
    return [...storeLog, ...shipped.filter((r) => !r.piece_code || !sentCodes.has(r.piece_code))];
  }, [storeLog, stageLogs.shipped]);
  const stitchDaily = stageLogs.stitching;
  // The picked order's journey: undefined = loading, null = failed / none.
  const lineOrderTrack = lineOrderId ? orderTracks[lineOrderId] : null;

  const lineDates = useMemo(() => {
    const dates = new Set();
    dailyRows.forEach((r) => {
      if ((toNum(r.events) ?? 0) > 0 || (toNum(r.completed) ?? 0) > 0) dates.add(String(r.work_date).slice(0, 10));
    });
    [consumptionRows, liningLog, storeLog].forEach((log) =>
      (Array.isArray(log) ? log : []).forEach((r) => rowDate(r) && dates.add(rowDate(r)))
    );
    (Array.isArray(stitchDaily) ? stitchDaily : []).forEach((r) => {
      if ((toNum(r?.completed) ?? 0) > 0 && r.work_date) dates.add(String(r.work_date).slice(0, 10));
    });
    return { marked: dates, latest: [...dates].sort((a, b) => b.localeCompare(a))[0] ?? null };
  }, [dailyRows, consumptionRows, liningLog, storeLog, stitchDaily]);

  // ── 3b. What each stage card shows under the line's filters.
  // Order, all dates → the order's own done / waiting at every stage.
  // A date → pieces each stage finished that day, from its own log (no
  // endpoint counts a stage by day); waiting stays the live queue — the
  // order's when one is picked, else the factory's. ──
  // Job work has no order and no per-piece date, so the outside-factory count
  // only shows unfiltered.
  const lineStages = useMemo(() => {
    if (!lineFiltering) {
      return stages.map((s) => ({
        ...s,
        outsideDone: outsideByStage.get(String(s.key).toUpperCase())?.back ?? 0,
        outsideOut: outsideByStage.get(String(s.key).toUpperCase())?.out ?? 0,
        waitingLabel: 'queue',
        showBar: true,
      }));
    }

    // The order's numbers by stage key, its waiting worked out like the
    // factory's (withFlowQueues). Its busiest stage is the backend's
    // blocked_stage if anything still waits there, else the deepest queue.
    const orderRows = new Map();
    let orderStuckKey = null;
    if (lineOrder && lineOrderTrack) {
      const tracked = [];
      stages.forEach((s) => {
        const row = lineOrderTrack.stages.find(
          (r) => String(r?.stage || '').toUpperCase() === String(s.key).toUpperCase() || (r?.label && r.label === s.name)
        );
        if (row) tracked.push({ key: s.key, kind: s.kind, done: toNum(row.completed) ?? 0, waiting: toNum(row.pending) ?? 0 });
      });
      withFlowQueues(tracked).forEach((r) => orderRows.set(r.key, r));
      const blocked = String(lineOrderTrack.blockedStage || '').toUpperCase();
      orderStuckKey = blocked ? (stages.find((s) => String(s.key).toUpperCase() === blocked)?.key ?? null) : null;
      if ((orderRows.get(orderStuckKey)?.waiting ?? 0) === 0) {
        orderStuckKey =
          [...orderRows.entries()].reduce(
            (max, [key, r]) => (r.waiting > (max?.waiting ?? 0) ? { key, waiting: r.waiting } : max),
            null
          )?.key ?? null;
      }
    }

    // Stitching trend → stage → date → pieces done. It only reaches back
    // STITCH_TREND_DAYS, so older dates have no count rather than 0.
    const stitchByStage = new Map();
    let stitchFrom = null;
    if (Array.isArray(stitchDaily) && todayKey) {
      const today = parseDateKey(todayKey);
      stitchFrom = localDateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - (STITCH_TREND_DAYS - 1)));
      stitchDaily.forEach((r) => {
        const day = String(r?.work_date || '').slice(0, 10);
        if (!r?.stage || !day) return;
        const key = String(r.stage).toUpperCase();
        if (!stitchByStage.has(key)) stitchByStage.set(key, new Map());
        const byDay = stitchByStage.get(key);
        byDay.set(day, (byDay.get(day) ?? 0) + (toNum(r.completed) ?? 0));
        if (day < stitchFrom) stitchFrom = day;
      });
    }

    const inFilter = (r) => (!lineDate || rowDate(r) === lineDate) && (!lineOrder || rowOrderKey(r) === lineOrder);

    return stages.map((s) => {
      const source = stageSource(s.key);
      const orderRow = orderRows.get(s.key) ?? null;
      // Hidden while the order's journey loads.
      const waiting = lineOrder ? (orderRow?.waiting ?? null) : s.waiting;
      const base = {
        ...s,
        waiting,
        // All-time, so not beside one day's done.
        skipped: lineDate ? 0 : (orderRow?.skipped ?? 0),
        waitingLabel: lineDate ? 'queue now' : 'queue',
        stuck: lineOrder ? s.key === orderStuckKey && waiting > 0 : s.stuck,
        showBar: false,
        missing: null,
      };

      if (!lineDate) {
        if (lineOrderTrack === undefined) return { ...base, done: undefined };
        if (!lineOrderTrack) return { ...base, done: null, missing: "Couldn't load" };
        if (!orderRow) return { ...base, done: null, missing: 'No count for this order' };
        return { ...base, done: orderRow.done, showBar: true };
      }

      // Cut logs and the store's sent pieces carry a date and an order.
      if (source === 'cutting' || source === 'lining' || source === 'store') {
        const log = source === 'cutting' ? consumptionRows : source === 'lining' ? liningLog : storeLog;
        if (log === undefined) return { ...base, done: undefined };
        if (!Array.isArray(log)) return { ...base, done: null, missing: "Couldn't load" };
        return { ...base, done: countCutPieces(log.filter(inFilter)) };
      }

      if (lineOrder) return { ...base, done: null, missing: 'No count by day for an order' };

      const byDay = stitchByStage.get(String(s.key).toUpperCase());
      if (inStitchTrend(s.key) || byDay) {
        if (stitchDaily === undefined) return { ...base, done: undefined };
        if (!Array.isArray(stitchDaily)) return { ...base, done: null, missing: "Couldn't load" };
        if (stitchFrom && lineDate < stitchFrom) return { ...base, done: null, missing: `Only last ${STITCH_TREND_DAYS} days` };
        return { ...base, done: byDay?.get(lineDate) ?? 0 };
      }
      return { ...base, done: null, missing: 'No count by day' };
    });
  }, [stages, outsideByStage, lineFiltering, lineDate, lineOrder, lineOrderTrack, consumptionRows, liningLog, storeLog, stitchDaily, todayKey]);

  const clearLineFilters = () => {
    setLineDate('');
    setPickedLineOrder('');
  };

  // Falls back to the orders view if a refresh no longer lists the stage.
  const selectedStage = stages.find((s) => s.key === selectedStageKey) ?? null;

  // The event feed's rows for the selected stage, matched by operation code
  // (else label) to the pipeline's stage. Same states as stageLogs.
  const eventFeed = stageLogs.events;
  const selectedEventLog = useMemo(() => {
    if (!selectedStage || !Array.isArray(eventFeed)) return eventFeed;
    const key = String(selectedStage.key).toUpperCase();
    return eventFeed.filter((r) => r.stage_code === key || (r.stage_label && r.stage_label === selectedStage.name));
  }, [eventFeed, selectedStage]);

  // What the selected event stage's card needs to find its outside-factory
  // pieces: the stage's operation (matched like the rows above) and every
  // SKU in the feed with its order / style / colour / size. Any piece an
  // outside factory worked was cut here first, so its SKU is in the feed.
  const outsideSource = useMemo(() => {
    if (selectedSource !== 'events' || !selectedStage || !Array.isArray(eventFeed) || !Array.isArray(eventOps)) return null;
    const key = String(selectedStage.key).toUpperCase();
    const op = eventOps.find((o) => String(o.code || '').toUpperCase() === key || (o.label && o.label === selectedStage.name));
    if (!op?.id) return null;
    const skus = new Map();
    eventFeed.forEach((r) => {
      if (r.sku_id && !skus.has(r.sku_id)) {
        skus.set(r.sku_id, { order_number: r.order_number, style: r.style, colour: r.colour, size: r.size });
      }
    });
    // The line's stages after this one (lining cutting isn't on it), by code
    // and name: a piece at one of them has gone past this stage.
    const chain = stages.filter((s) => !isSideStage(s));
    const at = chain.findIndex((s) => s.key === selectedStage.key);
    const later = at >= 0 ? chain.slice(at + 1) : [];
    const laterStages = {
      keys: new Set(later.map((s) => String(s.key).toUpperCase())),
      names: new Set(later.map((s) => s.name)),
    };
    return { operationId: op.id, skus, laterStages };
  }, [selectedSource, selectedStage, stages, eventFeed, eventOps]);
  const outsideVendors = useMemo(() => {
    const vendors = selectedStage ? outsideByStage.get(String(selectedStage.key).toUpperCase())?.vendors : null;
    return vendors ? [...vendors].sort() : [];
  }, [selectedStage, outsideByStage]);
  // The jobs sent to outside factories for the selected stage.
  const selectedStageJobs = useMemo(() => {
    if (!selectedStage || !Array.isArray(jobWork)) return [];
    const key = String(selectedStage.key).toUpperCase();
    return jobWork.filter((j) => String(j?.stage || '').toUpperCase() === key);
  }, [selectedStage, jobWork]);

  // ── 4a. Leather DCM consumed per order + style, summed from the cut log.
  // null = unknown (call failed, or rows carry no order number to match on),
  // so the column shows "—" instead of a misleading 0. ──
  const dcmByOrderStyle = useMemo(() => {
    if (!Array.isArray(consumptionRows)) return null;
    if (consumptionRows.length > 0 && !consumptionRows.some((r) => r?.order_number)) return null;
    const map = new Map();
    consumptionRows.forEach((r) => {
      const qty = toNum(r?.actual_consumption);
      if (qty === null) return;
      if (r.uom && String(r.uom).toLowerCase() !== 'dcm') return;
      const key = orderStyleKey(r.order_number, r.style ?? r.style_name);
      map.set(key, (map.get(key) || 0) + qty);
    });
    return map;
  }, [consumptionRows]);

  // ── 4b. Orders — most recently cut first (from the leather cut log); cut
  // the same day or never: late first, then soonest due date ──
  const orders = useMemo(() => {
    const lastCut = lastCutDays(consumptionRows, cutRowOrderStyleKey);
    const rows = (Array.isArray(data?.order_progress) ? data.order_progress : []).map((o, idx) => {
      const qty = toNum(o.total_ordered ?? o.total_quantity) ?? 0;
      return {
        id: `${o.order_number || 'order'}-${o.style_name || 'style'}-${idx}`,
        orderNumber: o.order_number || '—',
        style: o.style_name || '—',
        matchKey: orderStyleKey(o.order_number, o.style_name),
        qty,
        completed: toNum(o.completed) ?? 0,
        lastCut: lastCut.get(orderStyleKey(o.order_number, o.style_name)),
        due: o.delivery_deadline || null,
        status: orderStatusKey(o),
      };
    });
    return rows.sort((a, b) => compareNewest(a.lastCut, b.lastCut) || compareOrders(a, b));
  }, [data, consumptionRows]);

  const runningCount =
    toNum(data?.overall?.orders_in_progress) ?? new Set(orders.map((o) => o.orderNumber)).size;
  const lateCount =
    toNum(data?.overall?.delayed_orders) ??
    new Set(orders.filter((o) => o.status === 'late').map((o) => o.orderNumber)).size;
  const visibleOrders = showAllOrders ? orders : orders.slice(0, ORDERS_PREVIEW_COUNT);

  // ── 5. Last 14 days ──
  const last14Days = useMemo(
    () =>
      dailyRows.slice(-14).map((r) => ({
        day: formatShortDate(r.work_date),
        Made: toNum(r.completed) ?? 0,
        Target: toNum(r.assigned) ?? 0,
      })),
    [dailyRows]
  );

  return (
    <div className="relative isolate w-full min-w-0 space-y-6 text-[#2b2118]">
      <DashboardHeader
        title="Factory Today"
        now={now}
        updatedAt={updatedAt}
        loading={loading}
        refreshDisabled={!token}
        onRefresh={refreshDashboard}
      />

      {loadFailed && <LoadFailedAlert hasData={Boolean(data)} onRetry={refreshDashboard} />}

      {!data ? (
        !loadFailed && <PageLoading />
      ) : (
        <>
          {/* ─── Today: pieces + workers ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <section className="lg:col-span-7 rounded-[28px] border border-[#f6dd9e] bg-gradient-to-br from-[#fff7e0] via-[#fff2cf] to-[#ffeab9] p-6 sm:p-7 shadow-[0_12px_32px_-16px_rgba(200,140,40,0.35)]">
              <div className="flex gap-5">
                <IconBubble icon={Box} large />
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold">Pieces Made Today</h3>
                  <p className="mt-3 flex flex-wrap items-baseline gap-x-2">
                    <span className="text-5xl font-semibold tabular-nums">{madeToday.toLocaleString()}</span>
                    {targetToday !== null && (
                      <span className="text-2xl text-[#5b4c3a] tabular-nums">/ {targetToday.toLocaleString()}</span>
                    )}
                  </p>
                  {todayPct !== null && (
                    <div className="mt-4 flex items-center gap-4">
                      <div
                        className="h-2.5 flex-1 rounded-full bg-[#f1e3c2] overflow-hidden"
                        role="progressbar"
                        aria-label="Today's target done"
                        aria-valuenow={Math.min(100, todayPct)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#fbd36b] to-[#f5a524]"
                          style={{ width: `${Math.min(100, todayPct)}%` }}
                        />
                      </div>
                      <span className="text-lg font-semibold tabular-nums">{todayPct}%</span>
                    </div>
                  )}
                  <p className="mt-4 text-sm text-[#7a6d5c]">
                    {targetToday !== null
                      ? "Pieces finished today, compared with today's target."
                      : 'Pieces finished today. No target has been set for today.'}
                  </p>
                </div>
              </div>
            </section>

            <section className="lg:col-span-5 relative overflow-hidden rounded-[28px] border border-[#f1e6d3] bg-[#fffaf0] p-6 sm:p-7 shadow-[0_12px_32px_-16px_rgba(160,110,40,0.25)]">
              <svg
                aria-hidden="true"
                className="pointer-events-none absolute right-0 bottom-0 h-full w-1/2"
                viewBox="0 0 200 200"
                preserveAspectRatio="none"
              >
                <path d="M200 10 C 150 70, 175 130, 70 200 L 200 200 Z" fill="#fde9b8" opacity="0.7" />
                <path d="M200 80 C 165 120, 175 165, 120 200 L 200 200 Z" fill="#fbdc94" opacity="0.55" />
              </svg>
              <div className="relative flex gap-5">
                <IconBubble icon={Users} large />
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold">Workers In Today</h3>
                  <p className="mt-3 text-5xl font-semibold tabular-nums">
                    {workersIn !== null ? workersIn.toLocaleString() : '—'}
                  </p>
                  <p className="mt-4 text-sm text-[#7a6d5c]">People who checked in today.</p>
                </div>
                {/* Straight to the Operations & HR tab: today's roster. */}
                <Link
                  href="/dashboard/attendance?tab=admin"
                  aria-label="Open today's roster"
                  title="Open today's roster"
                  className="self-start w-10 h-10 shrink-0 rounded-full bg-white text-[#2b2118] shadow-[0_4px_12px_rgba(160,110,40,0.18)] flex items-center justify-center hover:bg-[#fff5e0] transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </Link>
              </div>
            </section>
          </div>

          {/* ─── Production line ─── */}
          <section className={`${CARD} p-6`}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-4">
              <IconBubble icon={Zap} />
              <div className="flex-1 min-w-[200px]">
                <h3 className="text-lg font-semibold">Production Line</h3>
              </div>
              {stages.length > 0 && (
                <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                  <DateFilterCalendar
                    label="Date"
                    value={lineDate}
                    onChange={setLineDate}
                    markedDates={lineDates.marked}
                    latestDate={lineDates.latest}
                    markLabel="Days with work"
                  />
                  <FilterSelect
                    label="Order"
                    value={lineOrder}
                    onChange={setPickedLineOrder}
                    allLabel="All orders"
                    options={lineOrderOptions}
                  />
                  {lineFiltering && (
                    <button
                      type="button"
                      onClick={clearLineFilters}
                      className="flex items-center gap-1 text-sm font-semibold text-[#3e6fd6] hover:underline cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                      Show all
                    </button>
                  )}
                </div>
              )}
            </div>

            {stages.length > 0 ? (
              <div className="mt-5 pb-6">
                <StageGrid stages={lineStages} selectedKey={selectedStage?.key ?? null} onSelect={toggleStage} />
              </div>
            ) : (
              <EmptyNote>No stage numbers yet.</EmptyNote>
            )}
          </section>

          {/* ─── Selected stage's workers, or Orders + last 14 days ─── */}
          {selectedStage ? (
            <>
              <StageWorkersCard
                key={selectedStage.key}
                stage={selectedStage}
                source={selectedSource}
                logRows={
                  selectedSource === 'cutting'
                    ? consumptionRows
                    : selectedSource === 'lining'
                      ? liningLog
                      : selectedSource === 'store'
                        ? storeCardRows
                        : selectedEventLog
                }
                lineDate={lineDate}
                lineOrder={lineOrder}
                onClose={() => setSelectedStageKey(null)}
                onRetry={retryStageLogs}
                outsideSource={outsideSource}
                outsideVendors={outsideVendors}
              />
              {selectedStageJobs.length > 0 && <OutsideWorkCard stageName={selectedStage.name} jobs={selectedStageJobs} />}
            </>
          ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <section className={`${CARD} lg:col-span-7 p-6 flex flex-col min-w-0`}>
              <div className="flex flex-wrap items-center gap-3">
                <IconBubble icon={ClipboardList} />
                <h3 className="text-xl font-semibold">Orders</h3>
                <span className="rounded-full bg-[#f3eee5] px-3 py-1 text-xs font-semibold text-[#5b5146] tabular-nums">
                  {runningCount} running
                </span>
                {lateCount > 0 && (
                  <span className="rounded-full bg-[#fde4e1] px-3 py-1 text-xs font-semibold text-[#d9443f] tabular-nums">
                    {lateCount} late
                  </span>
                )}
                {orders.length > ORDERS_PREVIEW_COUNT && (
                  <button
                    type="button"
                    onClick={() => setShowAllOrders((v) => !v)}
                    className="ml-auto flex items-center gap-1 text-sm font-semibold text-[#3e6fd6] hover:underline cursor-pointer"
                    aria-expanded={showAllOrders}
                  >
                    {showAllOrders ? 'Show Less' : 'View All'}
                    <ArrowRight className={`w-4 h-4 transition-transform ${showAllOrders ? '-rotate-90' : ''}`} />
                  </button>
                )}
              </div>

              {orders.length > 0 ? (
                <div className="mt-5 overflow-x-auto rounded-2xl border border-[#efe6d6]">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead className="bg-[#faf5ec] text-xs text-[#8b7f6e]">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left font-semibold">Order</th>
                        <th scope="col" className="px-4 py-3 text-left font-semibold">Style</th>
                        <th scope="col" className="px-4 py-3 text-right font-semibold">Qty</th>
                        <th scope="col" className="px-4 py-3 text-right font-semibold">Completed</th>
                        <th scope="col" className="px-4 py-3 text-right font-semibold whitespace-nowrap">DCM Consumed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f3ece0]">
                      {visibleOrders.map((o) => {
                        const status = ORDER_STATUS[o.status];
                        const dcm = dcmByOrderStyle ? (dcmByOrderStyle.get(o.matchKey) ?? 0) : null;
                        return (
                          <tr key={o.id}>
                            <td className="px-4 py-3 font-semibold whitespace-nowrap">{o.orderNumber}</td>
                            <td className="px-4 py-3 text-[#5b5146] uppercase">{o.style}</td>
                            <td className="px-4 py-3 text-right tabular-nums">{o.qty.toLocaleString()}</td>
                            <td className={`px-4 py-3 text-right tabular-nums ${status.text}`}>
                              {o.completed.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                              {dcm !== null ? formatDcm(dcm) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyNote>No orders in production right now.</EmptyNote>
              )}
            </section>

            <section className={`${CARD} lg:col-span-5 p-6 flex flex-col min-w-0`}>
              <div className="flex flex-wrap items-center gap-3">
                <IconBubble icon={TrendingUp} />
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold">Last 14 Days</h3>
                </div>
                <div className="flex items-center gap-4 text-xs text-[#8b7f6e]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f6b73c]" /> Made
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#d9d1c3]" /> Target
                  </span>
                </div>
              </div>

              {last14Days.length > 0 ? (
                <div className="mt-5 h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={last14Days} barGap={2} barCategoryGap="25%" margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="#f1ebe0" />
                      <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#8b7f6e' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#8b7f6e' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip cursor={{ fill: 'rgba(245,165,36,0.08)' }} content={<ChartTooltip />} />
                      <Bar dataKey="Made" fill="#f6b73c" radius={[4, 4, 0, 0]} maxBarSize={14} />
                      <Bar dataKey="Target" fill="#e3dccf" radius={[4, 4, 0, 0]} maxBarSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyNote>No production logged in the last 14 days.</EmptyNote>
              )}
            </section>
          </div>
          )}
        </>
      )}
    </div>
  );
}
