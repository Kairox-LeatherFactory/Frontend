'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, ClipboardList, Loader2, Package, Sparkles, TrendingUp, Users, X, Zap } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useAuth } from '@/context/AuthContext';
import { apiGetStitchingDashboard, apiGetStitchingEmployeeDetail, apiGetDirectManagerOrderDetail } from '@/lib/api';
import {
  ORDER_STATUS,
  compareOrders,
  dayLabel,
  formatShortDate,
  lastDays,
  localDateKey,
  orderStatusKey,
  toNum,
} from '../_shared/format';
import { StageGrid, StageIcon, stageName, withFlowQueues } from '../_shared/stages';
import {
  CARD,
  ChartTooltip,
  CloseButton,
  DashboardHeader,
  DateFilterCalendar,
  EmptyNote,
  FilterSelect,
  IconBubble,
  LoadFailedAlert,
  PageLoading,
  PieceList,
  ShowAllButton,
  useClock,
} from '../_shared/ui';
import { WorkersInCard, buildWorkersIn, useTodayAttendance } from '../_shared/workers-in';

/**
 * ============================================================================
 * STITCHING DASHBOARD — "Stitching Today"
 * ============================================================================
 * Laid out like the DM dashboard: one page, no tabs, each number once.
 *   1. Pieces finished today — pieces through Final Finish today
 *   2. Workers in today — how many people in a stitching job have checked
 *      in; its arrow opens the list (in place of 4 + 5)
 *   3. Stitching line — Fusing → Pasting → Store → Line Stitching → Shell
 *      Stitching → Final Finish: done / queue (/ skipped), the deepest queue
 *      marked. Queues are worked out as on the DM Production Line
 *      (withFlowQueues), so the two agree. The card's own filters:
 *        Order → that order's done / queue at each stage (the DM order
 *                journey, direct-manager/orders/{order_id})
 *        Date  → pieces each stage finished that day (the 14-day trend);
 *                the queue stays the live one, and the Store has no count
 *                by day
 *   4. Orders, late first: qty / completed
 *   5. Last 14 days, pieces finished a day
 *   Click a stage → its workers (in place of 4 + 5): done today and overall,
 *   plus an "Outside factory" line for job work (it has no worker), so the
 *   total is the stage's done; for the picked order when there is one. Click
 *   a worker for their pieces. Click the Store → what's in its queue.
 * From GET /api/v1/dashboard/stitching (stages, store_handoff, employees,
 * daily_production, order_progress) — with ?order_id= for a picked order's
 * workers — plus GET /api/v1/attendance/today + GET /api/v1/employees (2),
 * GET /api/v1/dashboard/direct-manager/orders/{order_id} (3, an order) and
 * GET /api/v1/dashboard/stitching/employees/{id} (a worker's pieces).
 */

const AUTO_REFRESH_MS = 5 * 60 * 1000;
const CLOCK_TICK_MS = 30 * 1000;
const CHART_DAYS = 14;
const ORDERS_PREVIEW_COUNT = 5;
const WORKERS_PREVIEW_COUNT = 10;

// The jobs (designations) that make up the stitching floor.
const STITCH_JOBS = ['FUSER', 'PASTER', 'LINE_TAILOR', 'SHELL_TAILOR', 'FINISHER', 'TAILOR', 'TRIMMER', 'STITCHING_INSTRUCTOR'];

// The line as the stitching floor sees it, in factory order. The Store has no
// production events; its numbers come from the garments' store state.
const LINE = [
  { key: 'FUSING', name: 'Fusing' },
  { key: 'PASTING', name: 'Pasting' },
  { key: 'STORE', name: 'Store', kind: 'STORE' },
  { key: 'LINE_STITCHING', name: 'Line Stitching' },
  { key: 'SHELL_STITCHING', name: 'Shell Stitching' },
  { key: 'FINAL_FINISH', name: 'Final Finish' },
];
const LAST_STAGE = 'FINAL_FINISH';
// Detail-area key for the "who's in" list (stage keys are stage codes).
const WORKERS_IN_KEY = 'WORKERS_IN';

// The stage blocks + store handoff → the line's cards: done / queue / skipped.
// The queue in front of Fusing needs the leather cut count (Fusing's
// "received"), so the chain starts there, unshown. The Store's done is the
// pieces it has sent on: those still marked sent, or — once later stages have
// done more, which happens as shipped garments hand their drawer back — at
// least that many.
function buildLine(data) {
  const blocks = new Map((Array.isArray(data?.stages) ? data.stages : []).map((b) => [String(b.stage).toUpperCase(), b]));
  const doneAt = (key) => toNum(blocks.get(key)?.completed_pieces) ?? 0;
  const later = Math.max(doneAt('LINE_STITCHING'), doneAt('SHELL_STITCHING'), doneAt('FINAL_FINISH'));
  const storeDone = Math.max(toNum(data?.store_handoff?.sent_to_store) ?? 0, later);
  const chain = withFlowQueues([
    { key: 'LEATHER_CUTTING', kind: 'CHAIN', done: toNum(blocks.get('FUSING')?.total_received) ?? 0, waiting: 0 },
    ...LINE.map((s) => ({
      ...s,
      kind: s.kind ?? 'CHAIN',
      done: s.key === 'STORE' ? storeDone : doneAt(s.key),
      today: s.key === 'STORE' ? null : (toNum(blocks.get(s.key)?.daily_completed) ?? 0),
      waiting: 0,
    })),
  ]).slice(1);
  const deepest = chain.reduce((max, s) => (s.waiting > (max?.waiting ?? 0) ? s : max), null);
  return chain.map((s) => ({
    ...s,
    waitingLabel: 'queue',
    showBar: true,
    missing: null,
    stuck: s.key === deepest?.key && s.waiting > 0,
    selectLabel: s.key === 'STORE' ? "Show what's in the store's queue" : undefined,
  }));
}

// An order's journey (direct-manager/orders/{id}) → its done / queue /
// skipped at every stage, worked out as for the whole line.
function buildOrderStages(track) {
  const rows = (Array.isArray(track?.stages) ? track.stages : []).map((r) => ({
    key: String(r?.stage || '').toUpperCase(),
    kind: r?.kind || null,
    done: toNum(r?.completed) ?? 0,
    waiting: toNum(r?.pending) ?? 0,
  }));
  return new Map(withFlowQueues(rows).map((r) => [r.key, r]));
}

// ─── Store ──────────────────────────────────────────────────────────────────

// What makes up the Store's queue, from the garments' store state: pasted but
// not received yet, received but waiting for their other parts (leather /
// lining), and complete, ready to send to Line Stitching. Whole factory only —
// the store state isn't counted per order.
function StoreCard({ queue, handoff, orderPicked, onClose }) {
  const holding = toNum(handoff?.ready_for_store) ?? 0;
  const received = Math.max((toNum(handoff?.in_store) ?? 0) - holding, 0);
  const notReceived = Math.max((queue ?? 0) - holding - received, 0);
  const parts = [
    { label: 'Not received yet', value: notReceived, note: 'Pasted, not in the store yet.' },
    { label: 'Waiting for parts', value: holding, note: 'In the store, waiting for leather or lining.' },
    { label: 'Ready to send', value: received, note: 'Complete, not sent to Line Stitching yet.' },
  ];
  return (
    <section className={`${CARD} p-6`}>
      <div className="flex flex-wrap items-center gap-3">
        <IconBubble icon={Package} />
        <div className="min-w-0">
          <h3 className="text-xl font-semibold">Store</h3>
          <p className="text-xs text-[#8b7f6e] mt-0.5">
            The pieces in the store&apos;s queue, and where each of them is{orderPicked ? ', for all orders' : ''}.
          </p>
        </div>
        <CloseButton onClose={onClose} />
      </div>
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {parts.map((p) => (
          <div key={p.label} className="rounded-2xl bg-[#faf5ec] px-4 py-3">
            <p className="text-xs font-semibold text-[#8b7f6e]">{p.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{p.value.toLocaleString()}</p>
            <p className="mt-1 text-xs text-[#8b7f6e]">{p.note}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── A stage's workers ──────────────────────────────────────────────────────

// One line per worker at the stage: pieces done today and overall. Work an
// outside factory did (job work) has no worker, so it's one more line — the
// gap to the stage's own counts — and the totals are the stage's. Click a
// worker for the pieces they've worked.
// `source`: { employees, stage: { done, today } } (the whole line, or the
// picked order's), undefined = loading, null = couldn't load.
function StageWorkersCard({ stage, source, orderLabel, onClose, onRetry }) {
  const { token } = useAuth();
  const [openKey, setOpenKey] = useState(null);
  const [showAll, setShowAll] = useState(false);
  // employee id → their pieces (undefined = loading, null = couldn't load).
  const [pieces, setPieces] = useState({});

  const table = useMemo(() => {
    if (!source) return null;
    const rows = (Array.isArray(source.employees) ? source.employees : [])
      .filter((e) => String(e?.stage || '').toUpperCase() === stage.key)
      .map((e) => ({
        key: e.employee_id,
        worker: e.name || 'Unknown worker',
        today: toNum(e.completed_today) ?? 0,
        overall: toNum(e.completed_pieces) ?? 0,
      }))
      .sort((a, b) => b.overall - a.overall || b.today - a.today || a.worker.localeCompare(b.worker));
    const sumToday = rows.reduce((s, r) => s + r.today, 0);
    const sumOverall = rows.reduce((s, r) => s + r.overall, 0);
    const outside = {
      today: Math.max((source.stage?.today ?? 0) - sumToday, 0),
      overall: Math.max((source.stage?.done ?? 0) - sumOverall, 0),
    };
    return {
      rows,
      outside: outside.overall > 0 || outside.today > 0 ? outside : null,
      totalToday: sumToday + outside.today,
      totalOverall: sumOverall + outside.overall,
    };
  }, [source, stage.key]);

  // ── LIVE BACKEND CALL, when a worker is opened:
  //    GET /api/v1/dashboard/stitching/employees/{employee_id} — their pieces. ──
  useEffect(() => {
    if (!token || !openKey || pieces[openKey] !== undefined) return;
    let isMounted = true;
    apiGetStitchingEmployeeDetail(token, openKey)
      .then((rows) => {
        if (isMounted) setPieces((prev) => ({ ...prev, [openKey]: Array.isArray(rows) ? rows : [] }));
      })
      .catch((err) => {
        console.warn('Worker pieces fetch failed:', err?.message);
        if (isMounted) setPieces((prev) => ({ ...prev, [openKey]: null }));
      });
    return () => {
      isMounted = false;
    };
  }, [token, openKey, pieces]);

  const toggle = (key) => setOpenKey((current) => (current === key ? null : key));
  const rows = table?.rows ?? [];
  const visibleRows = showAll ? rows : rows.slice(0, WORKERS_PREVIEW_COUNT);

  const workerPieces = (r) => {
    const list = pieces[r.key];
    if (list === undefined) {
      return (
        <p className="flex items-center gap-2 py-3 text-sm text-[#8b7f6e]">
          <Loader2 className="w-4 h-4 animate-spin text-[#e8961a]" />
          Loading pieces…
        </p>
      );
    }
    if (list === null) return <p className="py-3 text-sm text-[#a33a33]">Couldn&apos;t load their pieces.</p>;
    if (list.length === 0) return <p className="py-3 text-sm text-[#a89c8a]">No pieces found.</p>;
    return (
      <PieceList
        caption={`Pieces worked by ${r.worker}`}
        dateLabel="Last worked"
        pieces={list.map((p) => ({
          code: p.piece_code || null,
          date: String(p.last_worked || '').slice(0, 10),
          style: String(p.style || '—').trim(),
          colour: String(p.colour || '—').trim(),
          size: String(p.size || '').trim(),
          stage: p.current_stage ? stageName(p.current_stage) : '—',
        }))}
      />
    );
  };

  let body;
  if (source === undefined) {
    body = (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-[#8b7f6e]">
        <Loader2 className="w-5 h-5 animate-spin text-[#e8961a]" />
        Loading workers…
      </div>
    );
  } else if (source === null) {
    body = (
      <p className="py-10 text-center text-sm text-[#a33a33]">
        Couldn&apos;t load the workers for this stage.{' '}
        <button type="button" onClick={onRetry} className="font-semibold underline cursor-pointer">
          Try again
        </button>
      </p>
    );
  } else if (rows.length === 0 && !table.outside) {
    body = <EmptyNote>No pieces recorded at this stage{orderLabel ? ' for this order' : ''} yet.</EmptyNote>;
  } else {
    body = (
      <div className="mt-5 overflow-x-auto rounded-2xl border border-[#efe6d6]">
        <table className="w-full text-sm">
          <thead className="bg-[#faf5ec] text-xs text-[#8b7f6e]">
            <tr>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Worker</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold whitespace-nowrap">Done Today</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold whitespace-nowrap">Done Overall</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f3ece0]">
            {visibleRows.map((r) => {
              const open = r.key === openKey;
              return (
                <React.Fragment key={r.key}>
                  <tr
                    onClick={() => toggle(r.key)}
                    className={`cursor-pointer transition-colors ${open ? 'bg-[#fff6df]' : 'hover:bg-[#fffaf1]'}`}
                  >
                    <td className="px-4 py-3 font-semibold">
                      {/* The button is for keyboard users; a mouse click anywhere on the row toggles. */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggle(r.key);
                        }}
                        aria-expanded={open}
                        title={open ? 'Hide pieces' : `Show pieces worked by ${r.worker}`}
                        className="flex items-center gap-2 text-left cursor-pointer rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c8834a]"
                      >
                        <ChevronRight
                          aria-hidden="true"
                          className={`w-4 h-4 shrink-0 text-[#a89c8a] transition-transform ${open ? 'rotate-90' : ''}`}
                        />
                        {r.worker}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.today.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.overall.toLocaleString()}</td>
                  </tr>
                  {open && (
                    <tr>
                      <td colSpan={3} className="bg-[#fffaf1] px-4 pt-1 pb-4">
                        {workerPieces(r)}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {table.outside && (
              <tr>
                <td className="px-4 py-3 font-semibold">
                  {/* Lines up with the worker names past their chevrons. */}
                  <span className="flex items-center gap-2">
                    <span aria-hidden="true" className="w-4 shrink-0" />
                    Outside factory
                    <span className="text-xs font-normal text-[#8b7f6e]">job work</span>
                  </span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{table.outside.today.toLocaleString()}</td>
                <td className="px-4 py-3 text-right tabular-nums">{table.outside.overall.toLocaleString()}</td>
              </tr>
            )}
          </tbody>
          <tfoot className="border-t-2 border-[#efe6d6] bg-[#faf5ec] font-semibold">
            <tr>
              <th scope="row" className="px-4 py-3 text-left">Total</th>
              <td className="px-4 py-3 text-right tabular-nums">{table.totalToday.toLocaleString()}</td>
              <td className="px-4 py-3 text-right tabular-nums">{table.totalOverall.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  }

  return (
    <section className={`${CARD} p-6`}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="w-11 h-11 shrink-0 rounded-full bg-[#ffe7a8] text-[#e8961a] flex items-center justify-center shadow-[inset_0_0_0_5px_rgba(255,255,255,0.45)]">
          <StageIcon stageKey={stage.key} className="w-5 h-5" strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <h3 className="text-xl font-semibold">{stage.name} Workers</h3>
          <p className="text-xs text-[#8b7f6e] mt-0.5">
            Pieces each worker has done at this stage{orderLabel ? ` for order ${orderLabel}` : ''}. Click a worker to see their pieces.
          </p>
        </div>
        {rows.length > 0 && (
          <span className="rounded-full bg-[#f3eee5] px-3 py-1 text-xs font-semibold text-[#5b5146] tabular-nums">
            {rows.length} worker{rows.length === 1 ? '' : 's'}
          </span>
        )}
        <div className="ml-auto flex items-center gap-4">
          {rows.length > WORKERS_PREVIEW_COUNT && (
            <ShowAllButton showAll={showAll} onToggle={() => setShowAll((v) => !v)} className="" />
          )}
          <CloseButton onClose={onClose} className="" />
        </div>
      </div>
      {body}
    </section>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function StitchingDashboard() {
  const { token } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showAllOrders, setShowAllOrders] = useState(false);
  // What the detail area shows in place of Orders + Last 14 Days: a stage's
  // workers (its code), the Store's queue ('STORE') or who's in (WORKERS_IN_KEY).
  const [selectedKey, setSelectedKey] = useState(null);
  // The stitching line's filters. '' = all; else a YYYY-MM-DD / upper-cased
  // order number.
  const [lineDate, setLineDate] = useState('');
  const [pickedLineOrder, setPickedLineOrder] = useState('');
  // Order id → its journey across the stages / its stitching numbers
  // (undefined = loading, null = failed).
  const [orderTracks, setOrderTracks] = useState({});
  const [orderStitching, setOrderStitching] = useState({});
  const now = useClock(CLOCK_TICK_MS);
  // Today's check-ins + the roster (useTodayAttendance). It doesn't hold the
  // page up — only its card says if it fails.
  const attendance = useTodayAttendance(token, refreshKey);

  // ── LIVE BACKEND CALL: GET /api/v1/dashboard/stitching ──
  // Loads on mount, on the refresh button (refreshKey), and every 5 minutes.
  // A failed reload keeps the last good numbers.
  useEffect(() => {
    let isMounted = true;
    async function loadDashboard() {
      if (!token) return;
      try {
        setLoading(true);
        const dashboard = await apiGetStitchingDashboard(token);
        if (!isMounted) return;
        setData(dashboard || {});
        setLoadFailed(false);
        setUpdatedAt(Date.now());
      } catch (err) {
        console.warn('Stitching dashboard fetch failed:', err?.message);
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
  const todayKey = now ? localDateKey(now) : null;

  // ── 3. The stitching line, unfiltered ──
  const line = useMemo(() => buildLine(data), [data]);

  // ── Line order choices: the orders in production (the Orders card's
  // list), sorted naturally. A picked order that drops out of production on
  // a refresh stops filtering. ──
  const lineOrderOptions = useMemo(() => {
    const orders = new Map();
    (Array.isArray(data?.order_progress) ? data.order_progress : []).forEach((o) => {
      const label = String(o?.order_number || '').trim();
      if (label && o.order_id && !orders.has(label.toUpperCase())) {
        orders.set(label.toUpperCase(), { value: label.toUpperCase(), label, orderId: o.order_id });
      }
    });
    return [...orders.values()].sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' }));
  }, [data]);
  const lineOrderOption = lineOrderOptions.find((o) => o.value === pickedLineOrder) ?? null;
  const lineOrder = lineOrderOption?.value ?? '';
  const lineOrderId = lineOrderOption?.orderId ?? null;
  const lineFiltering = lineDate !== '' || lineOrder !== '';

  // ── LIVE BACKEND CALLS, when an order is picked on the line:
  //    GET /api/v1/dashboard/direct-manager/orders/{order_id} — its done /
  //      queue at every stage, and the stage holding most of it
  //    GET /api/v1/dashboard/stitching?order_id= — its workers at each stage
  //    Kept per order, so switching back shows the last numbers at once. ──
  useEffect(() => {
    if (!token || !lineOrderId) return;
    let isMounted = true;
    apiGetDirectManagerOrderDetail(token, lineOrderId)
      .then((res) => {
        if (!isMounted) return;
        setOrderTracks((prev) => ({
          ...prev,
          [lineOrderId]: { blockedStage: res?.blocked_stage ?? null, stages: Array.isArray(res?.stages) ? res.stages : [] },
        }));
      })
      .catch((err) => {
        console.warn('Order tracking fetch failed:', err?.message);
        if (isMounted) setOrderTracks((prev) => ({ ...prev, [lineOrderId]: prev[lineOrderId] ?? null }));
      });
    apiGetStitchingDashboard(token, { order_id: lineOrderId })
      .then((res) => {
        if (isMounted) setOrderStitching((prev) => ({ ...prev, [lineOrderId]: res || {} }));
      })
      .catch((err) => {
        console.warn("Order's stitching fetch failed:", err?.message);
        if (isMounted) setOrderStitching((prev) => ({ ...prev, [lineOrderId]: prev[lineOrderId] ?? null }));
      });
    return () => {
      isMounted = false;
    };
  }, [token, lineOrderId, refreshKey]);

  const orderTrack = lineOrderId ? orderTracks[lineOrderId] : null;

  // ── The 14-day trend: stage → day → pieces done, and the days with work ──
  const trend = useMemo(() => {
    const byStage = new Map();
    const marked = new Set();
    (Array.isArray(data?.daily_production) ? data.daily_production : []).forEach((r) => {
      const day = String(r?.work_date || '').slice(0, 10);
      const key = String(r?.stage || '').toUpperCase();
      const n = toNum(r?.completed) ?? 0;
      if (!day || !key) return;
      if (!byStage.has(key)) byStage.set(key, new Map());
      byStage.get(key).set(day, (byStage.get(key).get(day) ?? 0) + n);
      if (n > 0) marked.add(day);
    });
    return { byStage, marked, latest: [...marked].sort((a, b) => b.localeCompare(a))[0] ?? null };
  }, [data]);
  const trendFrom = now ? lastDays(now, CHART_DAYS)[0] : null;

  // ── 3b. What each stage card shows under the line's filters (as on the DM
  // Production Line).
  // Order, all dates → the order's own done / queue at every stage.
  // A date → pieces each stage finished that day (the 14-day trend); the
  // queue stays the live one — the order's when one is picked. ──
  const lineStages = useMemo(() => {
    if (!lineFiltering) return line;

    const orderStages = lineOrder && orderTrack ? buildOrderStages(orderTrack) : null;
    let orderStuckKey = null;
    if (orderStages) {
      const blocked = String(orderTrack.blockedStage || '').toUpperCase();
      orderStuckKey =
        LINE.some((s) => s.key === blocked) && (orderStages.get(blocked)?.waiting ?? 0) > 0
          ? blocked
          : (LINE.map((s) => orderStages.get(s.key)).filter(Boolean).reduce((max, r) => (r.waiting > (max?.waiting ?? 0) ? r : max), null)?.key ?? null);
    }

    return line.map((s) => {
      const o = orderStages?.get(s.key) ?? null;
      // Hidden while the order's journey loads.
      const waiting = lineOrder ? (o?.waiting ?? null) : s.waiting;
      const base = {
        ...s,
        waiting,
        // All-time, so not beside one day's done.
        skipped: lineDate ? 0 : lineOrder ? (o?.skipped ?? 0) : s.skipped,
        waitingLabel: lineDate ? 'queue now' : 'queue',
        stuck: lineOrder ? s.key === orderStuckKey && waiting > 0 : s.stuck,
        showBar: false,
        missing: null,
      };
      if (!lineDate) {
        if (orderTrack === undefined) return { ...base, done: undefined };
        if (!orderTrack) return { ...base, done: null, missing: "Couldn't load" };
        if (!o) return { ...base, done: null, missing: 'No count for this order' };
        return { ...base, done: o.done, showBar: true };
      }
      if (lineOrder) return { ...base, done: null, missing: 'No count by day for an order' };
      if (s.key === 'STORE') return { ...base, done: null, missing: 'No count by day' };
      if (trendFrom && lineDate < trendFrom) return { ...base, done: null, missing: `Only last ${CHART_DAYS} days` };
      return { ...base, done: trend.byStage.get(s.key)?.get(lineDate) ?? 0 };
    });
  }, [line, lineFiltering, lineOrder, lineDate, orderTrack, trend, trendFrom]);

  let lineDayText = '';
  if (lineDate && now) {
    const yesterdayKey = localDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
    lineDayText =
      lineDate === todayKey ? 'today' : lineDate === yesterdayKey ? 'yesterday' : `on ${dayLabel(lineDate, todayKey, yesterdayKey)}`;
  }
  const lineOrderLabel = lineOrderOption?.label ?? '';
  let lineSummary = 'Each stage shows how many pieces are done and how many are in the queue.';
  if (lineOrder && lineDate) lineSummary = `Order ${lineOrderLabel}: pieces each stage finished ${lineDayText}. The queue is as of now.`;
  else if (lineOrder) lineSummary = `Order ${lineOrderLabel}: pieces done and in the queue at each stage.`;
  else if (lineDate) lineSummary = `Pieces each stage finished ${lineDayText}. The queue is as of now.`;

  const clearLineFilters = () => {
    setLineDate('');
    setPickedLineOrder('');
  };
  const toggleDetail = (key) => setSelectedKey((current) => (current === key ? null : key));
  const selectedStage = line.find((s) => s.key === selectedKey) ?? null;

  // A picked stage's workers: for the picked order, else the whole line.
  const workersSource = useMemo(() => {
    if (!selectedStage || selectedStage.key === 'STORE') return null;
    const scoped = lineOrderId ? orderStitching[lineOrderId] : data;
    if (!scoped) return scoped; // undefined = loading, null = failed
    const stage = (lineOrderId ? buildLine(scoped) : line).find((s) => s.key === selectedStage.key);
    return { employees: scoped.employees, stage: { done: stage?.done ?? 0, today: stage?.today ?? 0 } };
  }, [selectedStage, lineOrderId, orderStitching, data, line]);

  const retryOrderStitching = () => {
    if (lineOrderId) setOrderStitching((prev) => ({ ...prev, [lineOrderId]: undefined }));
    refreshDashboard();
  };

  // ── 1. Pieces finished today ──
  const finishedToday = line.find((s) => s.key === LAST_STAGE)?.today ?? 0;

  // ── 2. Workers in today ──
  const workersIn = useMemo(
    () => (attendance ? buildWorkersIn(attendance.roster, attendance.employees, STITCH_JOBS) : attendance),
    [attendance]
  );

  // ── 4. Orders, late first ──
  const orders = useMemo(() => {
    const rows = (Array.isArray(data?.order_progress) ? data.order_progress : []).map((o, idx) => ({
      id: `${o.order_number || 'order'}-${o.style_name || 'style'}-${idx}`,
      orderNumber: o.order_number || '—',
      style: o.style_name || '—',
      qty: toNum(o.total_ordered) ?? 0,
      completed: toNum(o.completed) ?? 0,
      due: o.delivery_deadline || null,
      status: orderStatusKey(o),
    }));
    return rows.sort(compareOrders);
  }, [data]);
  const runningCount = new Set(orders.map((o) => o.orderNumber)).size;
  const lateCount = new Set(orders.filter((o) => o.status === 'late').map((o) => o.orderNumber)).size;
  const visibleOrders = showAllOrders ? orders : orders.slice(0, ORDERS_PREVIEW_COUNT);

  // ── 5. Last 14 days, every day shown (0 when nothing was finished) ──
  const chartDays = useMemo(
    () =>
      now
        ? lastDays(now, CHART_DAYS).map((day) => ({
            day: formatShortDate(day),
            Finished: trend.byStage.get(LAST_STAGE)?.get(day) ?? 0,
          }))
        : [],
    // Only a new day changes the window, not every clock tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [todayKey, trend]
  );
  const anyInChart = chartDays.some((d) => d.Finished > 0);

  let detail = null;
  if (selectedKey === WORKERS_IN_KEY) {
    detail = (
      <WorkersInCard
        title="Workers In Today"
        noun="Worker"
        showJob
        workersIn={workersIn}
        emptyText="No stitching workers on the employee list."
        onClose={() => setSelectedKey(null)}
      />
    );
  } else if (selectedStage?.key === 'STORE') {
    detail = (
      <StoreCard
        queue={line.find((s) => s.key === 'STORE')?.waiting}
        handoff={data?.store_handoff}
        orderPicked={Boolean(lineOrder)}
        onClose={() => setSelectedKey(null)}
      />
    );
  } else if (selectedStage) {
    detail = (
      <StageWorkersCard
        key={`${selectedStage.key}-${lineOrderId ?? 'all'}`}
        stage={selectedStage}
        source={workersSource}
        orderLabel={lineOrder ? lineOrderLabel : ''}
        onClose={() => setSelectedKey(null)}
        onRetry={retryOrderStitching}
      />
    );
  }

  return (
    <div className="relative isolate w-full min-w-0 space-y-6 text-[#2b2118]">
      <DashboardHeader
        title="Stitching Today"
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
          {/* ─── Today: pieces finished + workers in ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <section className="lg:col-span-7 rounded-[28px] border border-[#f6dd9e] bg-gradient-to-br from-[#fff7e0] via-[#fff2cf] to-[#ffeab9] p-6 sm:p-7 shadow-[0_12px_32px_-16px_rgba(200,140,40,0.35)]">
              <div className="flex gap-5">
                <IconBubble icon={Sparkles} large />
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold">Pieces Finished Today</h3>
                  <p className="mt-3 text-5xl font-semibold tabular-nums">{finishedToday.toLocaleString()}</p>
                  <p className="mt-4 text-sm text-[#7a6d5c]">Pieces through Final Finish so far today.</p>
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
                  <p className="mt-3 flex flex-wrap items-baseline gap-x-2">
                    <span className="text-5xl font-semibold tabular-nums">{workersIn ? workersIn.inCount.toLocaleString() : '—'}</span>
                    {workersIn?.total > 0 && (
                      <span className="text-2xl text-[#5b4c3a] tabular-nums">/ {workersIn.total.toLocaleString()}</span>
                    )}
                  </p>
                  <p className="mt-4 text-sm text-[#7a6d5c]">
                    {workersIn === null ? "Couldn't load today's attendance." : 'Stitching workers who checked in today.'}
                  </p>
                </div>
                {/* Opens the list in place of Orders + Last 14 Days. */}
                <button
                  type="button"
                  onClick={() => toggleDetail(WORKERS_IN_KEY)}
                  aria-expanded={selectedKey === WORKERS_IN_KEY}
                  aria-label={selectedKey === WORKERS_IN_KEY ? "Hide who's in" : "See who's in"}
                  title={selectedKey === WORKERS_IN_KEY ? "Hide who's in" : "See who's in"}
                  className={`self-start w-10 h-10 shrink-0 rounded-full shadow-[0_4px_12px_rgba(160,110,40,0.18)] flex items-center justify-center transition-colors cursor-pointer ${
                    selectedKey === WORKERS_IN_KEY ? 'bg-[#c8834a] text-white' : 'bg-white text-[#2b2118] hover:bg-[#fff5e0]'
                  }`}
                >
                  <ChevronRight className={`w-5 h-5 transition-transform ${selectedKey === WORKERS_IN_KEY ? 'rotate-90' : ''}`} />
                </button>
              </div>
            </section>
          </div>

          {/* ─── Stitching line ─── */}
          <section className={`${CARD} p-6`}>
            <div className="flex flex-wrap items-start gap-x-3 gap-y-4">
              <IconBubble icon={Zap} />
              <div className="flex-1 min-w-[200px]">
                <h3 className="text-lg font-semibold">Stitching Line</h3>
                <p className="text-xs text-[#8b7f6e] mt-0.5">{lineSummary}</p>
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3 pt-1">
                <DateFilterCalendar
                  label="Date"
                  value={lineDate}
                  onChange={setLineDate}
                  markedDates={trend.marked}
                  latestDate={trend.latest}
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
            </div>
            <div className="mt-5 pb-6">
              <StageGrid stages={lineStages} selectedKey={selectedStage?.key ?? null} onSelect={toggleDetail} />
            </div>
          </section>

          {/* ─── The picked detail, or Orders + last 14 days ─── */}
          {detail ?? (
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
                    <ShowAllButton showAll={showAllOrders} onToggle={() => setShowAllOrders((v) => !v)} />
                  )}
                </div>

                {orders.length > 0 ? (
                  <div className="mt-5 overflow-x-auto rounded-2xl border border-[#efe6d6]">
                    <table className="w-full min-w-[440px] text-sm">
                      <thead className="bg-[#faf5ec] text-xs text-[#8b7f6e]">
                        <tr>
                          <th scope="col" className="px-4 py-3 text-left font-semibold">Order</th>
                          <th scope="col" className="px-4 py-3 text-left font-semibold">Style</th>
                          <th scope="col" className="px-4 py-3 text-right font-semibold">Qty</th>
                          <th scope="col" className="px-4 py-3 text-right font-semibold">Completed</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f3ece0]">
                        {visibleOrders.map((o) => (
                          <tr key={o.id}>
                            <td className="px-4 py-3 font-semibold whitespace-nowrap">{o.orderNumber}</td>
                            <td className="px-4 py-3 text-[#5b5146] uppercase">{o.style}</td>
                            <td className="px-4 py-3 text-right tabular-nums">{o.qty.toLocaleString()}</td>
                            <td className={`px-4 py-3 text-right tabular-nums ${ORDER_STATUS[o.status].text}`}>
                              {o.completed.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyNote>No orders in production right now.</EmptyNote>
                )}
              </section>

              <section className={`${CARD} lg:col-span-5 p-6 flex flex-col min-w-0`}>
                <div className="flex flex-wrap items-start gap-3">
                  <IconBubble icon={TrendingUp} />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold">Last 14 Days</h3>
                    <p className="text-xs text-[#8b7f6e] mt-0.5">Pieces finished each day.</p>
                  </div>
                </div>

                {anyInChart ? (
                  <div className="mt-5 h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartDays} barCategoryGap="25%" margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="#f1ebe0" />
                        <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#8b7f6e' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#8b7f6e' }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip cursor={{ fill: 'rgba(245,165,36,0.08)' }} content={<ChartTooltip />} />
                        <Bar dataKey="Finished" fill="#f6b73c" radius={[4, 4, 0, 0]} maxBarSize={18} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyNote>Nothing finished in the last 14 days.</EmptyNote>
                )}
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}
