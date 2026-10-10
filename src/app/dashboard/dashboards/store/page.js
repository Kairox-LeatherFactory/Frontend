'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardList, PackageCheck, PackageOpen, Send, TrendingUp, X } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useAuth } from '@/context/AuthContext';
import { apiGetStoreDashboard } from '@/lib/api';
import { formatShortDate, lastDays, localDateKey, localDayOf, rowOrderKey, toNum } from '../_shared/format';
import {
  CARD,
  ChartTooltip,
  DashboardHeader,
  DateFilterCalendar,
  EmptyNote,
  FilterSelect,
  IconBubble,
  LoadFailedAlert,
  PageLoading,
  ShowAllButton,
  useClock,
} from '../_shared/ui';

/**
 * ============================================================================
 * STORE DASHBOARD — "Store Today"
 * ============================================================================
 * One page in the style of the other dashboards: no tabs, each number once.
 *   1. Received today — garments that got all their parts today (the store
 *      marks a garment received once leather, lining and any accessory kit
 *      are in)
 *   2. Sent today — garments sent on to Line Stitching today
 *   3. In the store — garments by where they are: need lining, need
 *      leather, both in (accessories still to come), ready to send, sent.
 *      Click a tile to show just those garments in 4.
 *   4. Garments — every garment in the store, with the card's own date
 *      (completed or sent that day) + order filters
 *   5. Styles in store, soonest due first: garments in / ready to send
 *   6. Last 14 days: garments received and sent each day
 * From GET /api/v1/dashboard/store (garments, current_styles). A garment
 * that has shipped hands its drawer back and leaves this list, so "sent"
 * counts garments not yet shipped.
 */

const AUTO_REFRESH_MS = 5 * 60 * 1000;
const CLOCK_TICK_MS = 30 * 1000;
const CHART_DAYS = 14;
const GARMENTS_PREVIEW_COUNT = 10;
const STYLES_PREVIEW_COUNT = 5;

// Where a garment is, in store order. Its parts decide it until the store
// marks it received (ready to send) or sent.
const STATUSES = [
  { key: 'need_lining', label: 'Need Lining', note: 'Leather in, lining not yet.', row: 'Needs lining' },
  { key: 'need_leather', label: 'Need Leather', note: 'Lining in, leather not yet.', row: 'Needs leather' },
  { key: 'both', label: 'Both In', note: 'Leather and lining in, accessories not yet.', row: 'Needs accessories' },
  { key: 'ready', label: 'Ready to Send', note: 'Complete, not sent yet.', row: 'Ready to send' },
  { key: 'sent', label: 'Sent', note: 'Sent to Line Stitching.', row: 'Sent' },
];
const STATUS_RANK = Object.fromEntries(STATUSES.map((s, i) => [s.key, i]));
const STATUS_ROW = Object.fromEntries(STATUSES.map((s) => [s.key, s.row]));

function storeStatus(g) {
  const state = String(g?.state || '').toLowerCase();
  if (state === 'sended') return 'sent';
  if (state === 'received') return 'ready';
  if (g?.leather_in && g?.lining_in) return 'both';
  if (g?.leather_in) return 'need_lining';
  return 'need_leather';
}

function partsLabel(g) {
  if (g?.leather_in && g?.lining_in) return 'Leather + Lining';
  if (g?.leather_in) return 'Leather';
  if (g?.lining_in) return 'Lining';
  return 'Accessories';
}

// The store's garments → table rows, with their status and local days.
function buildGarments(list) {
  return (Array.isArray(list) ? list : [])
    .map((g, idx) => ({
      key: g.piece_id || g.piece_code || `garment-${idx}`,
      code: g.piece_code || '—',
      order: String(g.order_number || '—').trim(),
      orderKey: rowOrderKey(g),
      style: String(g.style || '—').trim(),
      colour: String(g.colour || '—').trim(),
      size: String(g.size || '').trim(),
      parts: partsLabel(g),
      status: storeStatus(g),
      receivedDay: localDayOf(g.received_at),
      sentDay: localDayOf(g.sended_at),
    }))
    .sort(
      (a, b) =>
        STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
        String(b.sentDay || b.receivedDay).localeCompare(String(a.sentDay || a.receivedDay)) ||
        String(a.code).localeCompare(String(b.code), undefined, { numeric: true })
    );
}

// ─── Garments ───────────────────────────────────────────────────────────────

// Every garment in the store, narrowed by the status tile picked above and the
// card's own date (completed or sent that day) and order filters.
function GarmentsCard({ garments, status, onClearStatus }) {
  const [dateFilter, setDateFilter] = useState('');
  const [orderFilter, setOrderFilter] = useState('');
  const [showAll, setShowAll] = useState(false);
  const filtering = dateFilter !== '' || orderFilter !== '' || status !== '';

  const filterOptions = useMemo(() => {
    const dates = new Set();
    const orders = new Map();
    garments.forEach((g) => {
      if (g.receivedDay) dates.add(g.receivedDay);
      if (g.sentDay) dates.add(g.sentDay);
      if (g.orderKey && !orders.has(g.orderKey)) orders.set(g.orderKey, g.order);
    });
    return {
      dates,
      latestDate: [...dates].sort((a, b) => b.localeCompare(a))[0] ?? null,
      orders: [...orders.entries()]
        .sort((a, b) => a[1].localeCompare(b[1], undefined, { numeric: true, sensitivity: 'base' }))
        .map(([value, label]) => ({ value, label })),
    };
  }, [garments]);

  const rows = useMemo(
    () =>
      garments.filter(
        (g) =>
          (!status || g.status === status) &&
          (!orderFilter || g.orderKey === orderFilter) &&
          (!dateFilter || g.receivedDay === dateFilter || g.sentDay === dateFilter)
      ),
    [garments, status, orderFilter, dateFilter]
  );
  const visible = showAll ? rows : rows.slice(0, GARMENTS_PREVIEW_COUNT);
  const statusLabel = STATUSES.find((s) => s.key === status)?.label ?? '';
  const clearFilters = () => {
    setDateFilter('');
    setOrderFilter('');
    onClearStatus();
  };

  let body;
  if (rows.length === 0) {
    body = filtering ? (
      <p className="py-10 text-center text-sm text-[#a89c8a]">
        No garments match.{' '}
        <button type="button" onClick={clearFilters} className="font-semibold text-[#3e6fd6] hover:underline cursor-pointer">
          Clear filters
        </button>
      </p>
    ) : (
      <EmptyNote>No garments in the store.</EmptyNote>
    );
  } else {
    body = (
      <div className="mt-5 overflow-x-auto rounded-2xl border border-[#efe6d6]">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-[#faf5ec] text-xs text-[#8b7f6e]">
            <tr>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Piece</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Order</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Style</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Colour</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Size</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Has</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Status</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Complete</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Sent</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f3ece0]">
            {visible.map((g) => (
              <tr key={g.key}>
                <td className="px-4 py-3 font-semibold whitespace-nowrap">{g.code}</td>
                <td className="px-4 py-3 whitespace-nowrap">{g.order}</td>
                <td className="px-4 py-3 text-[#5b5146] uppercase">{g.style}</td>
                <td className="px-4 py-3 text-[#5b5146] uppercase">{g.colour}</td>
                <td className="px-4 py-3 text-[#5b5146] whitespace-nowrap">{g.size || '—'}</td>
                <td className="px-4 py-3 whitespace-nowrap">{g.parts}</td>
                <td
                  className={`px-4 py-3 whitespace-nowrap ${
                    g.status === 'ready' ? 'font-semibold text-[#2f8f6b]' : g.status === 'sent' ? 'text-[#8b7f6e]' : 'text-[#b8730a]'
                  }`}
                >
                  {STATUS_ROW[g.status]}
                </td>
                <td className="px-4 py-3 whitespace-nowrap tabular-nums">{g.receivedDay ? formatShortDate(g.receivedDay) : '—'}</td>
                <td className="px-4 py-3 whitespace-nowrap tabular-nums">{g.sentDay ? formatShortDate(g.sentDay) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <section className={`${CARD} p-6`}>
      <div className="flex flex-wrap items-center gap-3">
        <IconBubble icon={PackageOpen} />
        <div className="min-w-0">
          <h3 className="text-lg font-semibold">Garments{statusLabel ? ` · ${statusLabel}` : ''}</h3>
          <p className="text-xs text-[#8b7f6e] mt-0.5">Every garment in the store and what it has. Complete = all its parts in.</p>
        </div>
        <span className="rounded-full bg-[#f3eee5] px-3 py-1 text-xs font-semibold text-[#5b5146] tabular-nums">
          {rows.length.toLocaleString()} garment{rows.length === 1 ? '' : 's'}
        </span>
        {rows.length > GARMENTS_PREVIEW_COUNT && <ShowAllButton showAll={showAll} onToggle={() => setShowAll((v) => !v)} />}
      </div>

      {garments.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
          <DateFilterCalendar
            label="Date"
            value={dateFilter}
            onChange={setDateFilter}
            markedDates={filterOptions.dates}
            latestDate={filterOptions.latestDate}
            markLabel="Days with garments completed or sent"
          />
          <FilterSelect label="Order" value={orderFilter} onChange={setOrderFilter} allLabel="All orders" options={filterOptions.orders} />
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
    </section>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function StoreDashboard() {
  const { token } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showAllStyles, setShowAllStyles] = useState(false);
  // The status tile picked in "In the Store" ('' = all).
  const [status, setStatus] = useState('');
  const now = useClock(CLOCK_TICK_MS);

  // ── LIVE BACKEND CALL: GET /api/v1/dashboard/store ──
  // Loads on mount, on the refresh button (refreshKey), and every 5 minutes.
  // A failed reload keeps the last good numbers.
  useEffect(() => {
    let isMounted = true;
    async function loadDashboard() {
      if (!token) return;
      try {
        setLoading(true);
        const dashboard = await apiGetStoreDashboard(token);
        if (!isMounted) return;
        setData(dashboard || {});
        setLoadFailed(false);
        setUpdatedAt(Date.now());
      } catch (err) {
        console.warn('Store dashboard fetch failed:', err?.message);
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

  const garments = useMemo(() => buildGarments(data?.garments), [data]);

  // ── 1 + 2. Received and sent today ──
  const receivedToday = todayKey ? garments.filter((g) => g.receivedDay === todayKey).length : 0;
  const sentToday = todayKey ? garments.filter((g) => g.sentDay === todayKey).length : 0;

  // ── 3. Garments by status ──
  const statusCounts = useMemo(() => {
    const counts = Object.fromEntries(STATUSES.map((s) => [s.key, 0]));
    garments.forEach((g) => {
      counts[g.status] += 1;
    });
    return counts;
  }, [garments]);
  const toggleStatus = (key) => setStatus((current) => (current === key ? '' : key));

  // ── 5. Styles in store, soonest due first ──
  const styles = useMemo(
    () =>
      (Array.isArray(data?.current_styles) ? data.current_styles : [])
        .map((s, idx) => ({
          key: `${s.order_id || s.order_number || 'order'}-${s.style_id || s.style || 'style'}-${idx}`,
          order: String(s.order_number || '—').trim(),
          style: String(s.style || '—').trim(),
          garments: toNum(s.garments) ?? 0,
          ready: toNum(s.ready_to_send) ?? 0,
          due: s.target_date ? String(s.target_date).slice(0, 10) : null,
        }))
        .sort((a, b) => (a.due && b.due ? a.due.localeCompare(b.due) : a.due ? -1 : b.due ? 1 : 0)),
    [data]
  );
  const visibleStyles = showAllStyles ? styles : styles.slice(0, STYLES_PREVIEW_COUNT);

  // ── 6. Last 14 days, every day shown ──
  const chartDays = useMemo(() => {
    if (!now) return [];
    const received = new Map();
    const sent = new Map();
    garments.forEach((g) => {
      if (g.receivedDay) received.set(g.receivedDay, (received.get(g.receivedDay) ?? 0) + 1);
      if (g.sentDay) sent.set(g.sentDay, (sent.get(g.sentDay) ?? 0) + 1);
    });
    return lastDays(now, CHART_DAYS).map((day) => ({
      day: formatShortDate(day),
      Received: received.get(day) ?? 0,
      Sent: sent.get(day) ?? 0,
    }));
    // Only a new day changes the window, not every clock tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayKey, garments]);
  const anyInChart = chartDays.some((d) => d.Received > 0 || d.Sent > 0);

  return (
    <div className="relative isolate w-full min-w-0 space-y-6 text-[#2b2118]">
      <DashboardHeader
        title="Store Today"
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
          {/* ─── Today: received + sent ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <section className="lg:col-span-7 rounded-[28px] border border-[#f6dd9e] bg-gradient-to-br from-[#fff7e0] via-[#fff2cf] to-[#ffeab9] p-6 sm:p-7 shadow-[0_12px_32px_-16px_rgba(200,140,40,0.35)]">
              <div className="flex gap-5">
                <IconBubble icon={PackageCheck} large />
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold">Received Today</h3>
                  <p className="mt-3 text-5xl font-semibold tabular-nums">{receivedToday.toLocaleString()}</p>
                  <p className="mt-4 text-sm text-[#7a6d5c]">Garments that got all their parts today.</p>
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
                <IconBubble icon={Send} large />
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold">Sent Today</h3>
                  <p className="mt-3 text-5xl font-semibold tabular-nums">{sentToday.toLocaleString()}</p>
                  <p className="mt-4 text-sm text-[#7a6d5c]">Garments sent to Line Stitching today.</p>
                </div>
              </div>
            </section>
          </div>

          {/* ─── In the store: a tile per status; a tile filters the garments ─── */}
          <section className={`${CARD} p-6`}>
            <div className="flex flex-wrap items-center gap-3">
              <IconBubble icon={ClipboardList} />
              <div className="min-w-0">
                <h3 className="text-lg font-semibold">In the Store</h3>
                <p className="text-xs text-[#8b7f6e] mt-0.5">Garments by what they still need. Click one to see those garments.</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {STATUSES.map((s) => {
                const selected = status === s.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => toggleStatus(s.key)}
                    aria-pressed={selected}
                    title={selected ? 'Show all garments' : `Show garments: ${s.label}`}
                    className={`rounded-2xl border p-4 text-left cursor-pointer transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c8834a] ${
                      selected
                        ? 'border-[#f4cf7a] bg-[#fff6df] ring-2 ring-[#c8834a] ring-offset-2 ring-offset-[#fffdf9]'
                        : 'border-[#efe6d6] bg-white hover:shadow-[0_8px_20px_-12px_rgba(160,110,40,0.35)]'
                    }`}
                  >
                    <span className="block text-[13px] font-semibold text-[#2b2118]">{s.label}</span>
                    <span
                      className={`mt-2 block text-3xl font-semibold tabular-nums ${
                        s.key === 'ready' ? 'text-[#2f8f6b]' : s.key === 'sent' ? 'text-[#5b5146]' : 'text-[#df8d1c]'
                      }`}
                    >
                      {statusCounts[s.key].toLocaleString()}
                    </span>
                    <span className="mt-1 block text-[11px] leading-snug text-[#8b7f6e]">{s.note}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ─── Garments ─── */}
          <GarmentsCard garments={garments} status={status} onClearStatus={() => setStatus('')} />

          {/* ─── Styles + last 14 days, side by side, the same height ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <section className={`${CARD} lg:col-span-7 p-6 flex flex-col min-w-0`}>
              <div className="flex flex-wrap items-center gap-3">
                <IconBubble icon={ClipboardList} />
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold">Styles in Store</h3>
                  <p className="text-xs text-[#8b7f6e] mt-0.5">Garments in the store per style, soonest due first.</p>
                </div>
                {styles.length > STYLES_PREVIEW_COUNT && (
                  <ShowAllButton showAll={showAllStyles} onToggle={() => setShowAllStyles((v) => !v)} />
                )}
              </div>

              {styles.length > 0 ? (
                <div className="mt-5 overflow-x-auto rounded-2xl border border-[#efe6d6]">
                  <table className="w-full min-w-[480px] text-sm">
                    <thead className="bg-[#faf5ec] text-xs text-[#8b7f6e]">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left font-semibold">Order</th>
                        <th scope="col" className="px-4 py-3 text-left font-semibold">Style</th>
                        <th scope="col" className="px-4 py-3 text-right font-semibold whitespace-nowrap">In Store</th>
                        <th scope="col" className="px-4 py-3 text-right font-semibold whitespace-nowrap">Ready to Send</th>
                        <th scope="col" className="px-4 py-3 text-right font-semibold">Due</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f3ece0]">
                      {visibleStyles.map((s) => {
                        const late = s.due && todayKey && s.due < todayKey;
                        return (
                          <tr key={s.key}>
                            <td className="px-4 py-3 font-semibold whitespace-nowrap">{s.order}</td>
                            <td className="px-4 py-3 text-[#5b5146] uppercase">{s.style}</td>
                            <td className="px-4 py-3 text-right tabular-nums">{s.garments.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right tabular-nums">{s.ready.toLocaleString()}</td>
                            <td className={`px-4 py-3 text-right whitespace-nowrap tabular-nums ${late ? 'font-semibold text-[#b8730a]' : ''}`}>
                              {s.due ? formatShortDate(s.due) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyNote>No styles in the store right now.</EmptyNote>
              )}
            </section>

            <section className={`${CARD} lg:col-span-5 p-6 flex flex-col min-w-0`}>
              <div className="flex flex-wrap items-start gap-3">
                <IconBubble icon={TrendingUp} />
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold">Last 14 Days</h3>
                  <p className="text-xs text-[#8b7f6e] mt-0.5">Garments received and sent each day.</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-[#8b7f6e] pt-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f6b73c]" /> Received
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#4caf8a]" /> Sent
                  </span>
                </div>
              </div>

              {anyInChart ? (
                <div className="relative mt-5 min-h-[240px] w-full flex-1">
                  {/* At least 240px, taller when the styles beside it are. */}
                  <div className="absolute inset-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartDays} barGap={2} barCategoryGap="25%" margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="#f1ebe0" />
                        <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#8b7f6e' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#8b7f6e' }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip cursor={{ fill: 'rgba(245,165,36,0.08)' }} content={<ChartTooltip />} />
                        <Bar dataKey="Received" fill="#f6b73c" radius={[4, 4, 0, 0]} maxBarSize={14} />
                        <Bar dataKey="Sent" fill="#4caf8a" radius={[4, 4, 0, 0]} maxBarSize={14} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <EmptyNote>No garments received or sent in the last 14 days.</EmptyNote>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
