// Helpers shared by the role dashboards (DM, Cutting, …): numbers, local
// dates, orders and the cut log. No React here — see ./ui.jsx for that.

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// ─── Numbers ────────────────────────────────────────────────────────────────

export function toNum(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export function pad2(n) {
  return String(n).padStart(2, '0');
}

export function formatDcm(value) {
  return Math.round(value).toLocaleString();
}

// DCM reads as whole numbers; meters (lining) keep one decimal.
export function formatConsumed(value, unitLabel) {
  return unitLabel === 'DCM' ? formatDcm(value) : value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

// ─── Dates ──────────────────────────────────────────────────────────────────

// Local calendar date (not toISOString, which is UTC and rolls the date back
// in the early morning for timezones ahead of UTC).
export function localDateKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function parseDateKey(value) {
  const [y, m, d] = String(value || '').slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function formatShortDate(value) {
  const d = parseDateKey(value);
  return d ? `${pad2(d.getDate())} ${MONTHS[d.getMonth()]}` : String(value || '');
}

export function formatToday(d) {
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function updatedAgo(updatedAt, now) {
  const mins = Math.max(0, Math.floor((now.getTime() - updatedAt) / 60000));
  if (mins < 1) return 'Updated just now';
  if (mins < 60) return `Updated ${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  return `Updated ${hrs} hr${hrs === 1 ? '' : 's'} ago`;
}

// YYYY-MM-DD in local time. Timestamps go through Date so a UTC time just
// after midnight here doesn't land on the day before.
export function localDayOf(value) {
  const text = String(value || '');
  if (!text || /^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const d = new Date(text);
  return Number.isNaN(d.getTime()) ? text.slice(0, 10) : localDateKey(d);
}

// A UTC timestamp as factory clock time, "09:05 am" — as the attendance
// pages show it (attendance/shared.js fmtTime).
const CLOCK_TIME = new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
export function formatClockTime(isoUtc) {
  return isoUtc ? CLOCK_TIME.format(new Date(isoUtc)) : '—';
}

// "Today", "Yesterday", else "Mon, 05 Oct 2026".
export function dayLabel(dateKey, todayKey, yesterdayKey) {
  if (dateKey === todayKey) return 'Today';
  if (dateKey === yesterdayKey) return 'Yesterday';
  const d = parseDateKey(dateKey);
  return d ? `${WEEKDAYS[d.getDay()]}, ${formatShortDate(dateKey)} ${d.getFullYear()}` : dateKey;
}

// The last `days` calendar days, oldest first, ending on `today`.
export function lastDays(today, days) {
  return Array.from({ length: days }, (_, i) =>
    localDateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - (days - 1 - i)))
  );
}

// ─── Orders ─────────────────────────────────────────────────────────────────

export function orderStyleKey(orderNumber, style) {
  return `${String(orderNumber ?? '').trim().toUpperCase()}::${String(style ?? '').trim().toUpperCase()}`;
}

// No status column — status only sets the row order (late first, then at
// risk) and turns a late / at-risk order's count amber.
export const ORDER_STATUS = {
  late: { rank: 0, text: 'text-[#b8730a] font-semibold' },
  risk: { rank: 1, text: 'text-[#b8730a] font-semibold' },
  ok: { rank: 2, text: '' },
  none: { rank: 3, text: '' },
};

export function orderStatusKey(row) {
  const s = String(row.delay_status || '').toUpperCase();
  if (s.includes('DELAY') || s.includes('LATE') || s.includes('OVERDUE')) return 'late';
  if (s.includes('RISK')) return 'risk';
  if (!row.delivery_deadline) return 'none';
  return 'ok';
}

// Late first, then at risk, then soonest due date.
export function compareOrders(a, b) {
  const byStatus = ORDER_STATUS[a.status].rank - ORDER_STATUS[b.status].rank;
  if (byStatus !== 0) return byStatus;
  if (a.due && b.due) return String(a.due).localeCompare(String(b.due));
  return a.due ? -1 : b.due ? 1 : 0;
}

// ─── Cut log (GET /dashboard/cutting|lining/consumption) ────────────────────

export const UNIT_LABELS = { dcm: 'DCM', m: 'Meters', mtr: 'Meters', mtrs: 'Meters', meter: 'Meters', meters: 'Meters', metre: 'Meters', metres: 'Meters' };

export function rowUnit(row) {
  return String(row?.uom || 'dcm').trim().toLowerCase();
}

// The unit most cut-log rows are measured in (DCM for leather, meters for
// lining). Taken from the whole log so the label doesn't flip with filters;
// `fallback` when nothing is measured yet.
export function mainUnit(logRows, fallback = 'dcm') {
  const unitCounts = new Map();
  logRows.forEach((r) => {
    if (toNum(r?.actual_consumption) !== null) unitCounts.set(rowUnit(r), (unitCounts.get(rowUnit(r)) || 0) + 1);
  });
  return [...unitCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? fallback;
}

export function rowDate(row) {
  return String(row?.work_date || row?.last_worked || row?.date || '').slice(0, 10);
}

// Upper-cased so "test3" and "TEST3" are one order in the filter.
export function rowOrderKey(row) {
  return String(row?.order_number || '').trim().toUpperCase();
}

// Pieces in a cut log: distinct piece codes, plus one per row with no code.
export function countCutPieces(logRows) {
  const codes = new Set();
  let uncoded = 0;
  logRows.forEach((r) => {
    if (!r) return;
    if (r.piece_code) codes.add(r.piece_code);
    else uncoded += 1;
  });
  return codes.size + uncoded;
}

// Cut log → one line per worker, however many orders they cut, each carrying
// the pieces behind it (shown when the worker is clicked). Pieces are distinct
// piece codes — repeat log rows for a code add to that piece's consumption;
// rows with no code count as a piece each. Consumption is summed in `unit`.
// Busiest workers first; their pieces newest first.
export function buildCutWorkerRows(logRows, unit) {
  const byWorker = new Map();
  logRows.forEach((r) => {
    if (!r) return;
    const worker = String(r.employee || r.employee_name || r.cutter_name || 'Unassigned').trim();
    // Case/space-insensitive so "Asmath " and "ASMATH" stay one line.
    const key = worker.toUpperCase();
    if (!byWorker.has(key)) byWorker.set(key, { key, worker, coded: new Map(), uncoded: [] });
    const w = byWorker.get(key);

    const qty = toNum(r.actual_consumption);
    const consumed = qty !== null && rowUnit(r) === unit ? qty : null;
    const existing = r.piece_code ? w.coded.get(r.piece_code) : null;
    if (existing) {
      if (consumed !== null) existing.consumed = (existing.consumed ?? 0) + consumed;
      return;
    }
    const piece = {
      code: r.piece_code || null,
      date: rowDate(r),
      order: String(r.order_number || '—').trim(),
      style: String(r.style || r.style_name || '—').trim(),
      colour: String(r.colour || r.color || '—').trim(),
      size: String(r.size || '').trim(),
      consumed,
    };
    if (piece.code) w.coded.set(piece.code, piece);
    else w.uncoded.push(piece);
  });

  const rows = [...byWorker.values()]
    .map((w) => {
      const pieceList = [...w.coded.values(), ...w.uncoded].sort(
        (a, b) =>
          b.date.localeCompare(a.date) ||
          String(a.code ?? '').localeCompare(String(b.code ?? ''), undefined, { numeric: true })
      );
      const measured = pieceList.filter((p) => p.consumed !== null);
      return {
        key: w.key,
        worker: w.worker,
        pieces: pieceList.length,
        consumed: measured.length > 0 ? measured.reduce((s, p) => s + p.consumed, 0) : null,
        pieceList,
      };
    })
    .sort((a, b) => b.pieces - a.pieces || a.worker.localeCompare(b.worker));

  return {
    rows,
    workerCount: rows.length,
    totalPieces: rows.reduce((s, r) => s + r.pieces, 0),
    unitLabel: UNIT_LABELS[unit] || unit.toUpperCase(),
    totalConsumed: rows.some((r) => r.consumed !== null) ? rows.reduce((s, r) => s + (r.consumed ?? 0), 0) : null,
  };
}
