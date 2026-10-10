'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Scissors, TrendingUp } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useAuth } from '@/context/AuthContext';
import { apiGetCuttingDashboard, apiGetCuttingConsumption } from '@/lib/api';
import {
  ORDER_STATUS,
  compareOrders,
  countCutPieces,
  formatDcm,
  formatShortDate,
  lastDays,
  localDateKey,
  orderStatusKey,
  orderStyleKey,
  rowDate,
  toNum,
} from '../_shared/format';
import {
  CARD,
  ChartTooltip,
  DashboardHeader,
  EmptyNote,
  IconBubble,
  LoadFailedAlert,
  PageLoading,
  ShowAllButton,
  useClock,
} from '../_shared/ui';
import { WorkersInCard, buildWorkersIn, useTodayAttendance } from '../_shared/workers-in';
import { CutLogWorkersCard, StockCard } from '../_shared/cut-floor';

/**
 * ============================================================================
 * CUTTING DASHBOARD — "Cutting Today"
 * ============================================================================
 * One page in the DM dashboard's style: no tabs, no page filters, each number
 * once.
 *   1. Pieces cut today                  (leather cut log, today's rows)
 *   2. Last 14 days, pieces cut a day — under 1 (leather cut log)
 *   3. Cutters in today, beside 1 + 2 — every cutter, in (when, late or
 *      not, when they left) or not in yet
 *                                        (attendance/today + the roster's
 *                                         CUTTER designation)
 *   4. Leather stock: each lot, those running low or overdrawn first
 *                                        (leather_lots)
 *   5. Cutters — one line per cutter: pieces cut, DCM used, with the card's
 *      own date (starts on today) + order filters; click a cutter for their
 *      pieces                            (leather cut log)
 *   6. Orders, late first: ordered / cut / left to cut / DCM used, beside
 *      4; 5 has the full width below, for its piece lists
 *                                        (order_progress + the cut log)
 * From GET /api/v1/dashboard/cutting and GET /api/v1/dashboard/cutting/
 * consumption?include_unmeasured=true — the leather cut log, one row per cut
 * with its piece, cutter, order and DCM, unmeasured cuts too, so it counts
 * every piece cut. The dashboard's own daily_production isn't cutting (its
 * "completed" is pieces shipped), and there's no cutting target per day.
 * Block 3 also reads GET /api/v1/attendance/today and GET /api/v1/employees.
 */

const AUTO_REFRESH_MS = 5 * 60 * 1000;
const CLOCK_TICK_MS = 30 * 1000;
const PREVIEW_COUNT = 5;
const CHART_DAYS = 14;

// ─── Page ───────────────────────────────────────────────────────────────────

export default function CuttingDashboard() {
  const { token } = useAuth();

  const [data, setData] = useState(null);
  // The leather cut log (GET /dashboard/cutting/consumption).
  const [log, setLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showAllOrders, setShowAllOrders] = useState(false);
  const now = useClock(CLOCK_TICK_MS);
  // Today's check-ins + the roster (useTodayAttendance). It doesn't hold the
  // page up — only its card says if it fails.
  const attendance = useTodayAttendance(token, refreshKey);

  // ── LIVE BACKEND CALLS: GET /api/v1/dashboard/cutting
  //    + GET /api/v1/dashboard/cutting/consumption?include_unmeasured=true ──
  // Loads on mount, on the refresh button (refreshKey), and every 5 minutes.
  // A failed reload keeps the last good numbers.
  useEffect(() => {
    let isMounted = true;
    async function loadDashboard() {
      if (!token) return;
      try {
        setLoading(true);
        const [dashboard, cutLog] = await Promise.all([
          apiGetCuttingDashboard(token),
          apiGetCuttingConsumption(token, { include_unmeasured: true }),
        ]);
        if (!isMounted) return;
        setData(dashboard || {});
        setLog(Array.isArray(cutLog) ? cutLog : []);
        setLoadFailed(false);
        setUpdatedAt(Date.now());
      } catch (err) {
        console.warn('Cutting dashboard fetch failed:', err?.message);
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

  // ── The cut log by day, and by order + style: distinct pieces and DCM. ──
  const cutByDay = useMemo(() => {
    const byDay = new Map();
    (log ?? []).forEach((r) => {
      const day = rowDate(r);
      if (!day) return;
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day).push(r);
    });
    return byDay;
  }, [log]);

  const cutByOrderStyle = useMemo(() => {
    const groups = new Map();
    (log ?? []).forEach((r) => {
      const key = orderStyleKey(r.order_number, r.style ?? r.style_name);
      if (!groups.has(key)) groups.set(key, { rows: [], dcm: 0, measured: false });
      const g = groups.get(key);
      g.rows.push(r);
      const qty = toNum(r.actual_consumption);
      if (qty !== null && String(r.uom || 'dcm').toLowerCase() === 'dcm') {
        g.dcm += qty;
        g.measured = true;
      }
    });
    return new Map([...groups].map(([key, g]) => [key, { cut: countCutPieces(g.rows), dcm: g.measured ? g.dcm : null }]));
  }, [log]);

  // ── 1. Pieces cut today ──
  const cutToday = todayKey ? countCutPieces(cutByDay.get(todayKey) ?? []) : 0;

  // ── 6. Orders, late first, with what's cut and left to cut ──
  const orders = useMemo(() => {
    const rows = (Array.isArray(data?.order_progress) ? data.order_progress : []).map((o, idx) => {
      const ordered = toNum(o.total_ordered) ?? 0;
      const cut = cutByOrderStyle.get(orderStyleKey(o.order_number, o.style_name));
      return {
        id: `${o.order_number || 'order'}-${o.style_name || 'style'}-${idx}`,
        orderNumber: o.order_number || '—',
        style: o.style_name || '—',
        ordered,
        cut: cut?.cut ?? 0,
        left: Math.max(ordered - (cut?.cut ?? 0), 0),
        dcm: cut?.dcm ?? null,
        due: o.delivery_deadline || null,
        status: orderStatusKey(o),
      };
    });
    return rows.sort(compareOrders);
  }, [data, cutByOrderStyle]);
  const runningCount = new Set(orders.map((o) => o.orderNumber)).size;
  const lateCount = new Set(orders.filter((o) => o.status === 'late').map((o) => o.orderNumber)).size;
  const visibleOrders = showAllOrders ? orders : orders.slice(0, PREVIEW_COUNT);

  // ── 3. Cutters in today ──
  const cuttersIn = useMemo(
    () => (attendance ? buildWorkersIn(attendance.roster, attendance.employees, ['CUTTER']) : attendance),
    [attendance]
  );

  // ── 2. Last 14 days, every day shown (0 when nothing was cut) ──
  const chartDays = useMemo(
    () =>
      now
        ? lastDays(now, CHART_DAYS).map((day) => ({
            day: formatShortDate(day),
            Cut: countCutPieces(cutByDay.get(day) ?? []),
          }))
        : [],
    // Only a new day changes the window, not every clock tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [todayKey, cutByDay]
  );
  const anyCutInChart = chartDays.some((d) => d.Cut > 0);

  return (
    <div className="relative isolate w-full min-w-0 space-y-6 text-[#2b2118]">
      <DashboardHeader
        title="Cutting Today"
        now={now}
        updatedAt={updatedAt}
        loading={loading}
        refreshDisabled={!token}
        onRefresh={refreshDashboard}
      />

      {loadFailed && <LoadFailedAlert hasData={Boolean(data)} onRetry={refreshDashboard} />}

      {!data || !log ? (
        !loadFailed && <PageLoading />
      ) : (
        <>
          {/* ─── Today: pieces cut + last 14 days, beside who's in ─── */}
          {/* Cards in a row share its height: the chart grows to meet a long
              list of cutters, and a short list's card reaches down to the chart. */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 flex flex-col gap-5 min-w-0">
              <section className="rounded-[28px] border border-[#f6dd9e] bg-gradient-to-br from-[#fff7e0] via-[#fff2cf] to-[#ffeab9] p-6 shadow-[0_12px_32px_-16px_rgba(200,140,40,0.35)]">
                <div className="flex items-center gap-4">
                  <IconBubble icon={Scissors} large />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold">Pieces Cut Today</h3>
                    <p className="mt-0.5 text-sm text-[#7a6d5c]">Leather pieces cut so far today.</p>
                  </div>
                  <p className="text-5xl font-semibold tabular-nums">{cutToday.toLocaleString()}</p>
                </div>
              </section>

              <section className={`${CARD} flex-1 p-6 flex flex-col min-w-0`}>
                <div className="flex flex-wrap items-start gap-3">
                  <IconBubble icon={TrendingUp} />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold">Last 14 Days</h3>
                    <p className="text-xs text-[#8b7f6e] mt-0.5">Leather pieces cut each day.</p>
                  </div>
                </div>

                {anyCutInChart ? (
                  <div className="relative mt-5 min-h-[220px] w-full flex-1">
                    {/* At least 220px, taller when the column is. The chart sits
                        absolutely so it takes the box's real size. */}
                    <div className="absolute inset-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartDays} barCategoryGap="25%" margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
                          <CartesianGrid vertical={false} stroke="#f1ebe0" />
                          <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#8b7f6e' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: '#8b7f6e' }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <Tooltip cursor={{ fill: 'rgba(245,165,36,0.08)' }} content={<ChartTooltip />} />
                          <Bar dataKey="Cut" fill="#f6b73c" radius={[4, 4, 0, 0]} maxBarSize={18} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ) : (
                  <EmptyNote>Nothing cut in the last 14 days.</EmptyNote>
                )}
              </section>
            </div>

            {/* Lining cutters are LINING_CUTTER, so only leather cutters show. */}
            <WorkersInCard
              title="Cutters In Today"
              noun="Cutter"
              workersIn={cuttersIn}
              emptyText="No cutters on the employee list."
              className="lg:col-span-5"
            />
          </div>

          {/* ─── Leather stock + orders, side by side, the same height ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <StockCard
              title="Leather Stock"
              description="Leather received, used for cutting and left, in DCM. Lots that need a look come first."
              nameLabel="Leather"
              lots={data.leather_lots}
              usedKey="consumed"
              piecesKey="pieces_cut"
              defaultUnit="dcm"
              emptyText="No leather lots received yet."
              className="lg:col-span-7"
            />
            <section className={`${CARD} lg:col-span-5 p-6 flex flex-col min-w-0`}>
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
                {orders.length > PREVIEW_COUNT && (
                  <ShowAllButton showAll={showAllOrders} onToggle={() => setShowAllOrders((v) => !v)} />
                )}
              </div>

              {orders.length > 0 ? (
                <div className="mt-5 overflow-x-auto rounded-2xl border border-[#efe6d6]">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead className="bg-[#faf5ec] text-xs text-[#8b7f6e]">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left font-semibold">Order</th>
                        <th scope="col" className="px-4 py-3 text-left font-semibold">Style</th>
                        <th scope="col" className="px-4 py-3 text-right font-semibold">Qty</th>
                        <th scope="col" className="px-4 py-3 text-right font-semibold">Cut</th>
                        <th scope="col" className="px-4 py-3 text-right font-semibold whitespace-nowrap">Left to Cut</th>
                        <th scope="col" className="px-4 py-3 text-right font-semibold whitespace-nowrap">DCM Used</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f3ece0]">
                      {visibleOrders.map((o) => (
                        <tr key={o.id}>
                          <td className="px-4 py-3 font-semibold whitespace-nowrap">{o.orderNumber}</td>
                          <td className="px-4 py-3 text-[#5b5146] uppercase">{o.style}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{o.ordered.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{o.cut.toLocaleString()}</td>
                          <td className={`px-4 py-3 text-right tabular-nums ${o.left > 0 ? ORDER_STATUS[o.status].text : ''}`}>
                            {o.left.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                            {o.dcm !== null ? formatDcm(o.dcm) : '—'}
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
          </div>

          {/* ─── Cutters, full width: a cutter's piece list needs the room ─── */}
          <CutLogWorkersCard
            log={log}
            description="Pieces each cutter has cut, and the leather they used. Click a cutter to see their pieces."
          />
        </>
      )}
    </div>
  );
}
