'use client';

// Building blocks shared by the role dashboards (DM, Cutting, …) so they look
// and behave the same: card style, header, notes, piece list, filters, the
// date picker and the chart tooltip.

import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Sun,
  Moon,
  Info,
  RefreshCw,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  X,
} from 'lucide-react';
import { MONTH_NAMES, dayLabel, formatConsumed, formatShortDate, formatToday, localDateKey, pad2, parseDateKey, updatedAgo } from './format';

export const CARD = 'rounded-[28px] border border-[#f1e6d3] bg-[#fffdf9] shadow-[0_12px_32px_-16px_rgba(160,110,40,0.25)]';

export function greetingFor(d) {
  const h = d.getHours();
  if (h < 12) return { text: 'Good Morning', Icon: Sun };
  if (h < 17) return { text: 'Good Afternoon', Icon: Sun };
  return { text: 'Good Evening', Icon: Moon };
}

// The current time, ticking every `tickMs`. null until mounted: the clock only
// starts in the browser so the greeting/date never differ between the server
// render and the client.
export function useClock(tickMs) {
  const [now, setNow] = useState(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, tickMs);
    return () => clearInterval(id);
  }, [tickMs]);
  return now;
}

// Greeting, page title, today's date, when the numbers were fetched and a
// refresh button, over a soft amber glow. `actions` sit on the right.
export function DashboardHeader({ title, now, updatedAt, loading, refreshDisabled, onRefresh, actions = null }) {
  const greeting = now ? greetingFor(now) : { text: 'Good Morning', Icon: Sun };
  const GreetingIcon = greeting.Icon;
  return (
    <>
      {/* Soft amber glow behind the header */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-7 h-[380px] -z-10"
        style={{ background: 'radial-gradient(ellipse 70% 100% at 85% 0%, rgba(251,191,36,0.22), rgba(251,191,36,0) 70%)' }}
      />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={`flex items-center gap-2 text-lg text-[#5b4c3a] ${now ? '' : 'invisible'}`}>
            <GreetingIcon className="w-6 h-6 text-[#f5a524]" strokeWidth={1.8} />
            {greeting.text},
          </p>
          <h2 className="mt-1 text-4xl sm:text-5xl font-semibold tracking-tight">{title}</h2>
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#8b7f6e] min-h-[32px]">
            {now && <span>{formatToday(now)}</span>}
            {now && updatedAt && (
              <>
                <span aria-hidden="true">·</span>
                <span>{updatedAgo(updatedAt, now)}</span>
              </>
            )}
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading || refreshDisabled}
              className="p-1.5 rounded-full text-[#6b5e4c] hover:bg-[#f3ead9] disabled:opacity-60 cursor-pointer"
              aria-label="Refresh numbers"
              title="Refresh now"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-3 pb-1">{actions}</div>}
      </header>
    </>
  );
}

// The page's numbers didn't load (or refresh).
export function LoadFailedAlert({ hasData, onRetry }) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#f5c9c4] bg-[#fdf0ee] px-4 py-3 text-sm text-[#a33a33]"
    >
      <AlertTriangle className="w-4 h-4 shrink-0" />
      <span className="flex-1 min-w-[200px]">
        {hasData ? "Couldn't refresh. Showing the last numbers we received." : "Couldn't load today's numbers."}
      </span>
      <button type="button" onClick={onRetry} className="font-semibold underline cursor-pointer">
        Try again
      </button>
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="flex items-center justify-center gap-2 py-24 text-sm text-[#8b7f6e]">
      <Loader2 className="w-5 h-5 animate-spin text-[#e8961a]" />
      Loading today&apos;s numbers…
    </div>
  );
}

export function IconBubble({ icon: Icon, large = false }) {
  return (
    <span
      className={`${large ? 'w-14 h-14' : 'w-11 h-11'} shrink-0 rounded-full bg-[#ffe7a8] text-[#e8961a] flex items-center justify-center shadow-[inset_0_0_0_5px_rgba(255,255,255,0.45)]`}
    >
      <Icon className={large ? 'w-7 h-7' : 'w-5 h-5'} strokeWidth={1.8} />
    </span>
  );
}

export function FootNote({ children, className = '' }) {
  return (
    <p className={`flex items-center gap-2 text-xs text-[#8b7f6e] ${className}`}>
      <Info className="w-4 h-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

// "View All" / "Show Less" for a card's list.
export function ShowAllButton({ showAll, onToggle, className = 'ml-auto' }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`${className} flex items-center gap-1 text-sm font-semibold text-[#3e6fd6] hover:underline cursor-pointer`}
      aria-expanded={showAll}
    >
      {showAll ? 'Show Less' : 'View All'}
      <ArrowRight className={`w-4 h-4 transition-transform ${showAll ? '-rotate-90' : ''}`} />
    </button>
  );
}

// Closes a detail card (a stage's workers, …) opened from the page.
export function CloseButton({ onClose, className = 'ml-auto' }) {
  return (
    <button
      type="button"
      onClick={onClose}
      className={`${className} flex items-center gap-1.5 rounded-full border border-[#e6d9c3] bg-white px-3 py-1.5 text-sm font-semibold text-[#5b4c3a] hover:bg-[#fff5e0] cursor-pointer`}
    >
      <X className="w-4 h-4" />
      Close
    </button>
  );
}

export function EmptyNote({ children }) {
  return <p className="py-10 text-center text-sm text-[#a89c8a]">{children}</p>;
}

// A list of pieces: one worker's, opened under their row in a workers table,
// or the store's. Columns follow the data — Order and Size when any piece has
// them, a stage column (`stageLabel`) when any has `stage`, the material
// column when `unitLabel` is given. Scrolls inside itself (unless `scroll` is
// off) so a busy worker doesn't push the rest of the table away.
export function PieceList({ caption, pieces, dateLabel = 'Date', stageLabel = 'Now at', unitLabel = null, scroll = true }) {
  const showOrder = pieces.some((p) => p.order);
  const showSize = pieces.some((p) => p.size);
  const showStage = pieces.some((p) => p.stage);
  return (
    <div className={`${scroll ? 'max-h-80' : ''} overflow-auto rounded-xl border border-[#efe6d6] bg-white`}>
      <table className="w-full min-w-[560px] text-[13px]">
        <caption className="sr-only">{caption}</caption>
        <thead className="sticky top-0 bg-[#faf5ec] text-[11px] text-[#8b7f6e]">
          <tr>
            <th scope="col" className="px-3 py-2 text-left font-semibold">Piece</th>
            <th scope="col" className="px-3 py-2 text-left font-semibold">{dateLabel}</th>
            {showOrder && <th scope="col" className="px-3 py-2 text-left font-semibold">Order</th>}
            <th scope="col" className="px-3 py-2 text-left font-semibold">Style</th>
            <th scope="col" className="px-3 py-2 text-left font-semibold">Colour</th>
            {showSize && <th scope="col" className="px-3 py-2 text-left font-semibold">Size</th>}
            {showStage && <th scope="col" className="px-3 py-2 text-left font-semibold">{stageLabel}</th>}
            {unitLabel && <th scope="col" className="px-3 py-2 text-right font-semibold">{unitLabel}</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f3ece0] text-[#5b5146]">
          {pieces.map((p, idx) => (
            <tr key={p.pieceId ?? p.code ?? `uncoded-${idx}`}>
              <td className="px-3 py-2 font-semibold text-[#2b2118] whitespace-nowrap">
                {p.code ??
                  (p.codePending ? (
                    <Loader2 aria-label="Loading piece code" className="w-3.5 h-3.5 animate-spin text-[#e8961a]" />
                  ) : (
                    '—'
                  ))}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">{p.date ? formatShortDate(p.date) : '—'}</td>
              {showOrder && <td className="px-3 py-2 whitespace-nowrap">{p.order || '—'}</td>}
              <td className="px-3 py-2 uppercase">{p.style}</td>
              <td className="px-3 py-2 uppercase">{p.colour}</td>
              {showSize && <td className="px-3 py-2 whitespace-nowrap">{p.size || '—'}</td>}
              {showStage && <td className="px-3 py-2 whitespace-nowrap">{p.stage}</td>}
              {unitLabel && (
                <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                  {p.consumed !== null ? formatConsumed(p.consumed, unitLabel) : '—'}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// '' = no filter (the "All …" option).
export function FilterSelect({ label, value, onChange, allLabel, options }) {
  return (
    <label className="flex items-center gap-2 text-xs font-semibold text-[#8b7f6e]">
      {label}
      <span className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`appearance-none rounded-full border py-1.5 pl-3 pr-8 text-sm font-semibold cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c8834a] ${
            value ? 'border-[#f4cf7a] bg-[#fff6df] text-[#7a4b06]' : 'border-[#e6d9c3] bg-white text-[#5b4c3a] hover:bg-[#fff5e0]'
          }`}
        >
          <option value="">{allLabel}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b7f6e]"
        />
      </span>
    </label>
  );
}

// Date filter as a pop-up month calendar. Days with records (`markedDates`,
// a Set of YYYY-MM-DD) carry a dot, explained by `markLabel`; only they and
// today can be picked, so a pick always shows someone's work. '' = all dates.
export function DateFilterCalendar({ label, value, onChange, markedDates, latestDate, markLabel = 'Days with cutting' }) {
  const wrapRef = useRef(null);
  // First day of the month on show; null = closed.
  const [viewMonth, setViewMonth] = useState(null);
  const open = viewMonth !== null;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setViewMonth(null);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setViewMonth(null);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  // Opens on the picked day's month, else the month of the latest cut.
  const toggle = () => {
    if (open) {
      setViewMonth(null);
      return;
    }
    const d = parseDateKey(value || latestDate) ?? new Date();
    setViewMonth(new Date(d.getFullYear(), d.getMonth(), 1));
  };

  const shiftMonth = (by) => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + by, 1));

  const pick = (dateKey) => {
    onChange(dateKey);
    setViewMonth(null);
  };

  const today = new Date();
  const todayKey = localDateKey(today);
  const yesterdayKey = localDateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1));
  const buttonText = value ? dayLabel(value, todayKey, yesterdayKey) : 'All dates';

  let grid = null;
  if (open) {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const leadingBlanks = viewMonth.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    grid = (
      <div className="grid grid-cols-7 gap-1 text-center">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <span key={d} className="pb-1 text-[11px] font-semibold text-[#a89c8a]">
            {d}
          </span>
        ))}
        {Array.from({ length: leadingBlanks }, (_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const key = `${year}-${pad2(month + 1)}-${pad2(day)}`;
          const marked = markedDates.has(key);
          const pickable = marked || key === todayKey;
          const selected = key === value;
          return (
            <button
              key={key}
              type="button"
              disabled={!pickable}
              onClick={() => pick(key)}
              aria-pressed={selected}
              aria-label={dayLabel(key, todayKey, yesterdayKey)}
              className={`relative flex h-9 flex-col items-center justify-center rounded-lg text-sm tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c8834a] ${
                selected
                  ? 'bg-[#c8834a] font-semibold text-white'
                  : pickable
                    ? 'font-semibold text-[#2b2118] hover:bg-[#fff0d1] cursor-pointer'
                    : 'text-[#cfc5b5] cursor-default'
              } ${key === todayKey && !selected ? 'ring-1 ring-inset ring-[#e6d9c3]' : ''}`}
            >
              {day}
              {marked && (
                <span
                  aria-hidden="true"
                  className={`absolute bottom-1 h-1 w-1 rounded-full ${selected ? 'bg-white' : 'bg-[#e8961a]'}`}
                />
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative flex items-center gap-2 text-xs font-semibold text-[#8b7f6e]">
      {label}
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`${label}: ${buttonText}`}
        className={`flex items-center gap-2 rounded-full border py-1.5 pl-3 pr-2.5 text-sm font-semibold cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c8834a] ${
          value ? 'border-[#f4cf7a] bg-[#fff6df] text-[#7a4b06]' : 'border-[#e6d9c3] bg-white text-[#5b4c3a] hover:bg-[#fff5e0]'
        }`}
      >
        <CalendarDays aria-hidden="true" className="w-4 h-4 text-[#c8834a]" />
        {buttonText}
        <ChevronDown aria-hidden="true" className={`w-4 h-4 text-[#8b7f6e] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Pick a date"
          className="absolute left-0 top-full z-30 mt-2 w-[min(18rem,calc(100vw-3rem))] rounded-2xl border border-[#efe6d6] bg-white p-4 text-[#2b2118] shadow-[0_16px_40px_-12px_rgba(120,80,30,0.35)]"
        >
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              aria-label="Previous month"
              className="rounded-full p-1.5 text-[#8b7f6e] hover:bg-[#fff5e0] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c8834a]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold" aria-live="polite">
              {MONTH_NAMES[viewMonth.getMonth()]} {viewMonth.getFullYear()}
            </span>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
              className="rounded-full p-1.5 text-[#8b7f6e] hover:bg-[#fff5e0] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c8834a]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {grid}

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#f3ece0] pt-3">
            <span className="flex items-center gap-1.5 text-[11px] font-normal text-[#8b7f6e]">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#e8961a]" />
              {markLabel}
            </span>
            <button
              type="button"
              onClick={() => pick('')}
              className={`rounded-full px-3 py-1 text-xs font-semibold cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c8834a] ${
                value ? 'text-[#3e6fd6] hover:bg-[#eef3fd]' : 'bg-[#f3eee5] text-[#5b5146]'
              }`}
            >
              All dates
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ChartTooltip({ active, payload, label, unit = 'pcs' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[#efe6d6] bg-white px-3 py-2 text-xs text-[#2b2118] shadow-lg">
      <p className="mb-1 font-semibold">{label}</p>
      {payload.map((item) => (
        <p key={item.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
          <span className="text-[#8b7f6e]">{item.name}:</span>
          <span className="font-semibold tabular-nums">
            {item.value} {unit}
          </span>
        </p>
      ))}
    </div>
  );
}
