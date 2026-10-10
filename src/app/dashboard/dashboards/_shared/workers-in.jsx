'use client';

// "Who's in today" for a department's dashboard: every employee in the given
// jobs (designations) with today's attendance, as a card with a table.

import { useEffect, useState } from 'react';
import { Loader2, UserCheck } from 'lucide-react';
import { apiGetAttendanceToday, apiGetEmployeesPage } from '@/lib/api';
import { formatClockTime } from './format';
import { fetchAllPages } from './paging';
import { stageName } from './stages';
import { CARD, CloseButton, IconBubble } from './ui';

const REFRESH_MS = 5 * 60 * 1000;

// ── LIVE BACKEND CALLS: GET /api/v1/attendance/today + GET /api/v1/employees
//    (every page) — today's check-ins and the roster with each person's job.
// Loads on mount, when `refreshKey` changes and every 5 minutes. Returns
// undefined while loading, null if it couldn't load (keeping the last good
// answer on a failed reload), else { roster, employees }. ──
export function useTodayAttendance(token, refreshKey) {
  const [attendance, setAttendance] = useState(undefined);
  useEffect(() => {
    if (!token) return;
    let isMounted = true;
    const load = () =>
      Promise.all([
        apiGetAttendanceToday(token),
        fetchAllPages((offset, limit) => apiGetEmployeesPage(token, { offset, limit })),
      ])
        .then(([roster, employees]) => {
          if (isMounted) setAttendance({ roster, employees });
        })
        .catch((err) => {
          console.warn("Today's attendance fetch failed:", err?.message);
          if (isMounted) setAttendance((prev) => prev ?? null);
        });
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      isMounted = false;
      clearInterval(id);
    };
  }, [token, refreshKey]);
  return attendance;
}

// Every employee whose designation is in `designations` (upper-case, e.g.
// ['CUTTER']), with today's attendance, one line each: first check-in, late or
// not, and when they left if they've checked out of every session. Those in
// first, earliest first; then those not in yet, by name.
export function buildWorkersIn(roster, employees, designations) {
  const jobs = new Set(designations);
  const workers = (Array.isArray(employees) ? employees : []).filter((e) =>
    jobs.has(String(e?.designation || '').toUpperCase())
  );
  const jobOf = new Map(workers.map((e) => [e.id, stageName(e.designation)]));
  const byEmployee = new Map();
  (Array.isArray(roster) ? roster : []).forEach((r) => {
    if (!jobOf.has(r?.employee_id)) return;
    const prev = byEmployee.get(r.employee_id);
    if (!prev) {
      byEmployee.set(r.employee_id, {
        key: r.employee_id,
        name: r.name,
        job: jobOf.get(r.employee_id),
        inAt: r.check_in_at,
        late: Boolean(r.is_late),
        open: !r.check_out_at,
        outAt: r.check_out_at,
      });
      return;
    }
    if (String(r.check_in_at) < String(prev.inAt)) {
      prev.inAt = r.check_in_at;
      prev.late = Boolean(r.is_late);
    }
    prev.open = prev.open || !r.check_out_at;
    if (r.check_out_at && String(r.check_out_at) > String(prev.outAt || '')) prev.outAt = r.check_out_at;
  });
  const arrived = [...byEmployee.values()].sort((a, b) => String(a.inAt).localeCompare(String(b.inAt)));
  const notIn = workers
    .filter((e) => !byEmployee.has(e.id))
    .map((e) => ({ key: e.id, name: e.name, job: jobOf.get(e.id), inAt: null, late: false, open: false, outAt: null }))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  return { total: workers.length, inCount: arrived.length, rows: [...arrived, ...notIn] };
}

// `workersIn`: undefined = loading, null = couldn't load, else buildWorkersIn's.
// `noun` heads the name column ("Cutter"); `showJob` adds a Job column for a
// card that mixes jobs; `onClose` adds a Close button (when it was opened
// from the page). Grows with the list — no scrolling inside.
export function WorkersInCard({ title, noun, workersIn, showJob = false, emptyText, className = '', onClose = null }) {
  let body;
  if (workersIn === undefined) {
    body = (
      <p className="mt-4 flex items-center gap-2 text-sm text-[#8b7f6e]">
        <Loader2 className="w-4 h-4 animate-spin text-[#e8961a]" />
        Loading today&apos;s attendance…
      </p>
    );
  } else if (workersIn === null) {
    body = <p className="mt-4 text-sm text-[#a33a33]">Couldn&apos;t load today&apos;s attendance.</p>;
  } else if (workersIn.total === 0) {
    body = <p className="mt-4 text-sm text-[#a89c8a]">{emptyText}</p>;
  } else {
    body = (
      <div className="mt-5 overflow-x-auto rounded-2xl border border-[#efe6d6]">
        <table className="w-full text-sm">
          <thead className="bg-[#faf5ec] text-xs text-[#8b7f6e]">
            <tr>
              <th scope="col" className="px-4 py-3 text-left font-semibold">{noun}</th>
              {showJob && <th scope="col" className="px-4 py-3 text-left font-semibold">Job</th>}
              <th scope="col" className="px-4 py-3 text-left font-semibold">In</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold">Out</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f3ece0]">
            {workersIn.rows.map((w) => (
              <tr key={w.key} className={w.inAt ? '' : 'text-[#a89c8a]'}>
                <td className={`px-4 py-3 ${w.inAt ? 'font-semibold' : ''}`}>{w.name}</td>
                {showJob && <td className="px-4 py-3 whitespace-nowrap">{w.job}</td>}
                <td className="px-4 py-3 tabular-nums whitespace-nowrap">
                  {w.inAt ? (
                    <>
                      {formatClockTime(w.inAt)}
                      {w.late && (
                        <span className="ml-2 rounded-full bg-[#fff1d6] px-2 py-0.5 text-[11px] font-semibold text-[#b8730a]">Late</span>
                      )}
                    </>
                  ) : (
                    'Not in yet'
                  )}
                </td>
                <td className="px-4 py-3 tabular-nums whitespace-nowrap">{!w.open && w.outAt ? formatClockTime(w.outAt) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <section className={`${CARD} p-6 flex flex-col min-w-0 ${className}`}>
      <div className="flex flex-wrap items-center gap-3">
        <IconBubble icon={UserCheck} />
        <h3 className="text-lg font-semibold">{title}</h3>
        {workersIn?.total > 0 && (
          <span className="rounded-full bg-[#f3eee5] px-3 py-1 text-xs font-semibold text-[#5b5146] tabular-nums">
            {workersIn.inCount} of {workersIn.total} in
          </span>
        )}
        {onClose && <CloseButton onClose={onClose} />}
      </div>
      {body}
    </section>
  );
}
