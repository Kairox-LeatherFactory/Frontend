'use client';

// Cards shared by the cutting floors (leather Cutting, Lining Cutting): the
// material stock by lot, and the cutters from the cut log.

import React, { useMemo, useState } from 'react';
import { ChevronRight, Layers3, Users, X } from 'lucide-react';
import {
  UNIT_LABELS,
  buildCutWorkerRows,
  formatConsumed,
  formatDcm,
  localDateKey,
  mainUnit,
  rowDate,
  rowOrderKey,
  toNum,
} from './format';
import { CARD, DateFilterCalendar, EmptyNote, FilterSelect, IconBubble, PieceList, ShowAllButton } from './ui';

const STOCK_PREVIEW_COUNT = 5;
const CUTTERS_PREVIEW_COUNT = 10;

function unitLabel(uom, fallback = 'dcm') {
  const u = String(uom || fallback).trim().toLowerCase();
  return UNIT_LABELS[u] || u.toUpperCase();
}

// A lot that needs a look: used more than it had, or under a tenth of what it
// received left. "Received" is the larger of the lot's available and used +
// left, since the lining lots report what's on hand as available.
export function lotStatus(lot, usedKey) {
  const left = toNum(lot.remaining) ?? 0;
  const received = Math.max(toNum(lot.available) ?? 0, (toNum(lot[usedKey]) ?? 0) + left);
  if (left < 0) return { rank: 0, label: 'Overdrawn', cls: 'bg-[#fde4e1] text-[#d9443f]' };
  if (received > 0 && left / received < 0.1) return { rank: 1, label: 'Running low', cls: 'bg-[#fff1d6] text-[#b8730a]' };
  return null;
}

// In the column's unit: DCM as whole numbers, others to one decimal. A lot in
// another unit says which.
function formatStock(value, uom, columnUnit) {
  const n = toNum(value);
  if (n === null) return '—';
  const unit = unitLabel(uom);
  if (unit !== columnUnit) return `${formatConsumed(n, unit)} ${unit}`;
  return unit === 'DCM' ? formatDcm(n) : formatConsumed(n, unit);
}

// ─── Material stock ─────────────────────────────────────────────────────────

// One row per lot — those overdrawn or running low first — with the pieces
// cut from it, and how much is used and left in the lots' usual unit.
// `usedKey` / `piecesKey`: the lot fields for used material and pieces cut
// (leather: consumed / pieces_cut; lining: used / pieces_lined).
// `showAmounts` off drops the Used / Left columns (lining asked for that);
// a lot's Running low / Overdrawn tag then sits by its name.
export function StockCard({
  title,
  description,
  nameLabel,
  lots,
  usedKey,
  piecesKey,
  defaultUnit,
  emptyText,
  showType = false,
  showAmounts = true,
  className = '',
}) {
  const [showAll, setShowAll] = useState(false);
  const rows = useMemo(
    () =>
      (Array.isArray(lots) ? lots : [])
        .map((lot) => ({ ...lot, status: lotStatus(lot, usedKey) }))
        .sort(
          (a, b) =>
            (a.status?.rank ?? 2) - (b.status?.rank ?? 2) ||
            String(a.article || '').localeCompare(String(b.article || ''), undefined, { numeric: true }) ||
            String(a.colour || '').localeCompare(String(b.colour || ''))
        ),
    [lots, usedKey]
  );
  // The unit most lots are in heads the Used / Left columns.
  const columnUnit = useMemo(() => {
    const counts = new Map();
    rows.forEach((lot) => counts.set(unitLabel(lot.uom, defaultUnit), (counts.get(unitLabel(lot.uom, defaultUnit)) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? unitLabel(defaultUnit);
  }, [rows, defaultUnit]);
  const visible = showAll ? rows : rows.slice(0, STOCK_PREVIEW_COUNT);

  return (
    <section className={`${CARD} p-6 min-w-0 ${className}`}>
      <div className="flex flex-wrap items-center gap-3">
        <IconBubble icon={Layers3} />
        <div className="flex-1 min-w-[200px]">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-xs text-[#8b7f6e] mt-0.5">{description}</p>
        </div>
        {rows.length > STOCK_PREVIEW_COUNT && <ShowAllButton showAll={showAll} onToggle={() => setShowAll((v) => !v)} />}
      </div>

      {rows.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-2xl border border-[#efe6d6]">
          <table className={`w-full ${showAmounts ? 'min-w-[640px]' : 'min-w-[480px]'} text-sm`}>
            <thead className="bg-[#faf5ec] text-xs text-[#8b7f6e]">
              <tr>
                <th scope="col" className="px-4 py-3 text-left font-semibold">{nameLabel}</th>
                {showType && <th scope="col" className="px-4 py-3 text-left font-semibold">Type</th>}
                <th scope="col" className="px-4 py-3 text-left font-semibold">Colour</th>
                <th scope="col" className="px-4 py-3 text-left font-semibold">Thickness</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold whitespace-nowrap">Pieces Cut</th>
                {showAmounts && (
                  <>
                    <th scope="col" className="px-4 py-3 text-right font-semibold whitespace-nowrap">{columnUnit} Used</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold whitespace-nowrap">{columnUnit} Left</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f3ece0]">
              {visible.map((lot, idx) => {
                const tag = lot.status && (
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold normal-case ${lot.status.cls}`}>
                    {lot.status.label}
                  </span>
                );
                return (
                  <tr key={lot.lot_id ?? `lot-${idx}`}>
                    <td className="px-4 py-3 font-semibold uppercase">
                      {showAmounts || !tag ? (
                        lot.article || '—'
                      ) : (
                        <span className="flex flex-wrap items-center gap-2">
                          {lot.article || '—'}
                          {tag}
                        </span>
                      )}
                    </td>
                    {showType && <td className="px-4 py-3 text-[#5b5146] uppercase">{lot.lining_type || lot.leather_type || '—'}</td>}
                    <td className="px-4 py-3 text-[#5b5146] uppercase">{lot.colour || '—'}</td>
                    <td className="px-4 py-3 text-[#5b5146] whitespace-nowrap">{lot.thickness || '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{(toNum(lot[piecesKey]) ?? 0).toLocaleString()}</td>
                    {showAmounts && (
                      <>
                        <td className="px-4 py-3 text-right tabular-nums">{formatStock(lot[usedKey], lot.uom, columnUnit)}</td>
                        <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                          {tag && <span className="mr-2">{tag}</span>}
                          <span className={lot.status ? 'font-semibold' : ''}>{formatStock(lot.remaining, lot.uom, columnUnit)}</span>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyNote>{emptyText}</EmptyNote>
      )}
    </section>
  );
}

// ─── Cutters ────────────────────────────────────────────────────────────────

// One line per cutter from a cut log: pieces cut and material used, under the
// card's own date (starts on today; "All dates" = overall) and order filters.
// Click a cutter for the pieces behind their line. `defaultUnit`: the
// material's unit until the log has a measured cut ('dcm' leather, 'm' lining).
// `showUsed` off drops the material column, here and in the piece list
// (lining asked for that).
export function CutLogWorkersCard({ log, title = 'Cutters', description, defaultUnit = 'dcm', className = '', showUsed = true }) {
  // The card only renders once data has loaded in the browser, so reading
  // the clock here is safe.
  const [todayKey] = useState(() => localDateKey(new Date()));
  const [dateFilter, setDateFilter] = useState(todayKey);
  const [orderFilter, setOrderFilter] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [openKey, setOpenKey] = useState(null);
  const filtering = dateFilter !== '' || orderFilter !== '';

  // Choices come from the whole log, so they don't vanish as the other filter changes.
  const filterOptions = useMemo(() => {
    const dates = new Set(log.map(rowDate).filter(Boolean));
    const orders = new Map();
    log.forEach((r) => {
      const key = rowOrderKey(r);
      if (key && !orders.has(key)) orders.set(key, String(r.order_number).trim());
    });
    return {
      dates,
      latestDate: [...dates].sort((a, b) => b.localeCompare(a))[0] ?? null,
      orders: [...orders.entries()]
        .sort((a, b) => a[1].localeCompare(b[1], undefined, { numeric: true, sensitivity: 'base' }))
        .map(([value, label]) => ({ value, label })),
    };
  }, [log]);

  const table = useMemo(() => {
    const picked = log.filter(
      (r) => (!dateFilter || rowDate(r) === dateFilter) && (!orderFilter || rowOrderKey(r) === orderFilter)
    );
    return buildCutWorkerRows(picked, mainUnit(log, defaultUnit));
  }, [log, dateFilter, orderFilter, defaultUnit]);

  const rows = table.rows;
  const visibleRows = showAll ? rows : rows.slice(0, CUTTERS_PREVIEW_COUNT);
  const toggle = (key) => setOpenKey((current) => (current === key ? null : key));
  const clearFilters = () => {
    setDateFilter('');
    setOrderFilter('');
  };

  let body;
  if (rows.length === 0 && filtering) {
    body = (
      <p className="py-10 text-center text-sm text-[#a89c8a]">
        {dateFilter === todayKey && !orderFilter
          ? 'Nothing has been cut today yet.'
          : `Nothing was cut for this ${dateFilter && orderFilter ? 'date and order' : dateFilter ? 'date' : 'order'}.`}{' '}
        <button type="button" onClick={clearFilters} className="font-semibold text-[#3e6fd6] hover:underline cursor-pointer">
          {orderFilter ? 'Clear filters' : 'See all dates'}
        </button>
      </p>
    );
  } else if (rows.length === 0) {
    body = <EmptyNote>No pieces have been cut yet.</EmptyNote>;
  } else {
    body = (
      <div className="mt-5 overflow-x-auto rounded-2xl border border-[#efe6d6]">
        <table className="w-full text-sm">
          <thead className="bg-[#faf5ec] text-xs text-[#8b7f6e]">
            <tr>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Cutter</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold whitespace-nowrap">Pieces Cut</th>
              {showUsed && (
                <th scope="col" className="px-4 py-3 text-right font-semibold whitespace-nowrap">{table.unitLabel} Used</th>
              )}
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
                        title={open ? 'Hide pieces' : `Show pieces cut by ${r.worker}`}
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
                    {showUsed && (
                      <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                        {r.consumed !== null ? formatConsumed(r.consumed, table.unitLabel) : '—'}
                      </td>
                    )}
                  </tr>
                  {open && (
                    <tr>
                      <td colSpan={showUsed ? 3 : 2} className="bg-[#fffaf1] px-4 pt-1 pb-4">
                        <PieceList
                          caption={`Pieces cut by ${r.worker}`}
                          pieces={r.pieceList}
                          unitLabel={showUsed ? table.unitLabel : null}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
          {/* Every piece in the current filter, including cutters hidden behind "View All". */}
          <tfoot className="border-t-2 border-[#efe6d6] bg-[#faf5ec] font-semibold">
            <tr>
              <th scope="row" className="px-4 py-3 text-left">Total</th>
              <td className="px-4 py-3 text-right tabular-nums">{table.totalPieces.toLocaleString()}</td>
              {showUsed && (
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

  return (
    <section className={`${CARD} p-6 min-w-0 ${className}`}>
      <div className="flex flex-wrap items-center gap-3">
        <IconBubble icon={Users} />
        <div className="min-w-0">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-xs text-[#8b7f6e] mt-0.5">{description}</p>
        </div>
        {table.workerCount > 0 && (
          <span className="rounded-full bg-[#f3eee5] px-3 py-1 text-xs font-semibold text-[#5b5146] tabular-nums">
            {table.workerCount} cutter{table.workerCount === 1 ? '' : 's'}
          </span>
        )}
        {rows.length > CUTTERS_PREVIEW_COUNT && <ShowAllButton showAll={showAll} onToggle={() => setShowAll((v) => !v)} />}
      </div>

      {log.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
          <DateFilterCalendar
            label="Date"
            value={dateFilter}
            onChange={setDateFilter}
            markedDates={filterOptions.dates}
            latestDate={filterOptions.latestDate}
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
