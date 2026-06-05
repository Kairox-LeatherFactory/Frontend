'use client';
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  MapPin, CheckCircle2, LogIn, LogOut, Clock, AlertTriangle,
  Users, Search, Settings, ChevronLeft, ChevronRight,
  Lock, RefreshCw, CheckSquare, Square, X,
  Timer, CalendarDays, Shield, Zap, Filter,
  UserPlus, AlertCircle, Loader2, Building2, Activity, WifiOff,
} from 'lucide-react';

// ─── API BASE ────────────────────────────────────────────────────────────────
const API = '/api/v1/attendance';

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function fmtTime(isoUtc) {
  if (!isoUtc) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
  }).format(new Date(isoUtc));
}
function fmtDate(isoDate) {
  if (!isoDate) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(isoDate));
}
function fmtDist(m) {
  if (m == null) return '—';
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(2)} km`;
}
function padTime(secs) {
  if (secs == null || secs < 0) return '00:00:00';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

// ─── FETCH HELPER — token passed explicitly from useAuth() state ─────────────
async function apiFetch(url, options = {}, token = null) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    let errMsg = `Server error: ${res.status}`;
    try {
      const body = await res.json();
      errMsg = body.detail || errMsg;
    } catch {}
    const err = new Error(errMsg);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// ─── GPS HOOK ─────────────────────────────────────────────────────────────────
function useGps() {
  const [state, setState] = useState({ lat: null, lon: null, error: null, loading: false });
  const getPosition = useCallback(() => {
    return new Promise((resolve, reject) => {
      setState((s) => ({ ...s, loading: true, error: null }));
      if (!navigator.geolocation) {
        const err = 'Geolocation is not supported by this browser.';
        setState((s) => ({ ...s, loading: false, error: err }));
        return reject(err);
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          setState({ ...coords, loading: false, error: null });
          resolve(coords);
        },
        (err) => {
          const msg =
            err.code === 1
              ? 'Location access denied. Enable GPS to check in/out.'
              : 'Unable to retrieve location. Please try again.';
          setState({ lat: null, lon: null, loading: false, error: msg });
          reject(msg);
        },
        { timeout: 10000, maximumAge: 30000 }
      );
    });
  }, []);
  return { ...state, getPosition };
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function Badge({ label, type }) {
  const map = {
    late:     'bg-red-100 text-red-700 border-red-200',
    short:    'bg-orange-100 text-orange-700 border-orange-200',
    overtime: 'bg-purple-100 text-purple-700 border-purple-200',
    self:     'bg-blue-100 text-blue-700 border-blue-200',
    proxy:    'bg-amber-100 text-amber-700 border-amber-200',
    active:   'bg-emerald-100 text-emerald-700 border-emerald-200',
    frozen:   'bg-slate-100 text-slate-600 border-slate-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${map[type] || map.frozen}`}>
      {label}
    </span>
  );
}

function AlertBanner({ type, message, onClose }) {
  if (!message) return null;
  const styles = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    error:   'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    info:    'bg-blue-50 border-blue-200 text-blue-800',
  };
  const icons = { success: CheckCircle2, error: AlertCircle, warning: AlertTriangle, info: Activity };
  const Icon = icons[type] || AlertCircle;
  return (
    <div className={`flex items-start gap-2.5 p-4 rounded-xl border text-sm font-semibold shadow-sm animate-fade-in ${styles[type] || styles.info}`}>
      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <p className="flex-1">{message}</p>
      {onClose && (
        <button onClick={onClose} className="opacity-60 hover:opacity-100">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

function GpsWarning({ error }) {
  if (!error) return null;
  return (
    <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-semibold">
      <WifiOff className="w-5 h-5 flex-shrink-0" />
      <span>{error}</span>
    </div>
  );
}

function Paginator({ page, totalPages, setPage, total, perPage }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-2">
      <span className="text-xs text-slate-400 font-semibold">
        {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
      </span>
      <div className="flex items-center gap-1">
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
          className="btn-secondary h-8 w-8 p-0 flex items-center justify-center disabled:opacity-30">
          <ChevronLeft className="w-4 h-4" />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
          <button key={pg} onClick={() => setPage(pg)}
            className={`h-8 w-8 rounded-lg text-xs font-black transition-colors ${pg === page ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
            {pg}
          </button>
        ))}
        <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
          className="btn-secondary h-8 w-8 p-0 flex items-center justify-center disabled:opacity-30">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function LockedView({ title, description }) {
  return (
    <div className="card p-12 bg-amber-50/60 border border-amber-200 shadow text-center space-y-3">
      <Lock className="w-12 h-12 text-amber-500 mx-auto" />
      <h3 className="font-black text-amber-900 uppercase tracking-wide">{title}</h3>
      <p className="text-xs text-amber-700 font-semibold max-w-md mx-auto">{description}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW A — MY ATTENDANCE
// Endpoints: GET /me/status · POST /check-in · POST /check-out · GET /me
// ═══════════════════════════════════════════════════════════════════════════════
function MyAttendanceView({ token }) {
  const gps = useGps();

  const [status, setStatus]               = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [countdown, setCountdown]         = useState(null);
  const intervalRef = useRef(null);

  const [history, setHistory]         = useState([]);
  const [histLoading, setHistLoading] = useState(true);
  const [startDate, setStartDate]     = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [page, setPage]       = useState(1);
  const PER_PAGE = 8;

  const [actionLoading, setActionLoading] = useState(false);
  const [alert, setAlert]                 = useState(null);

  const showAlert = (type, message) => {
    setAlert({ type, message });
    if (type === 'success') setTimeout(() => setAlert(null), 5000);
  };

  // GET /me/status — server-anchored shift data
  const fetchStatus = useCallback(async () => {
    try {
      const data = await apiFetch(`${API}/me/status`, {}, token);
      setStatus(data);
      if (data.remaining_seconds != null) setCountdown(data.remaining_seconds);
    } catch (e) {
      console.error('Status fetch failed:', e.message);
    } finally {
      setStatusLoading(false);
    }
  }, [token]);

  // GET /me?start=&end=
  const fetchHistory = useCallback(async () => {
    setHistLoading(true);
    try {
      const data = await apiFetch(`${API}/me?start=${startDate}&end=${endDate}`, {}, token);
      setHistory([...data].reverse());
    } catch (e) {
      showAlert('error', e.message || 'Failed to load history.');
    } finally {
      setHistLoading(false);
    }
  }, [startDate, endDate, token]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);
  useEffect(() => { fetchHistory(); setPage(1); }, [fetchHistory]);

  // Live countdown — no polling, pure setInterval ticking remaining_seconds
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (status?.remaining_seconds == null || status?.checked_out) return;
    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev == null || prev <= 0) { clearInterval(intervalRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [status]);

  // POST /check-in — payload: { lat, lon } only (identity + timestamp from JWT/server)
  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      const coords = await gps.getPosition();
      await apiFetch(`${API}/check-in`, { method: 'POST', body: JSON.stringify(coords) }, token);
      showAlert('success', 'Checked in successfully!');
      await fetchStatus();
      await fetchHistory();
    } catch (e) {
      if (e.status === 403) showAlert('error', `Geofence violation — ${e.message}`);
      else showAlert('error', typeof e === 'string' ? e : e.message || 'Check-in failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // POST /check-out — payload: { lat, lon }
  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      const coords = await gps.getPosition();
      await apiFetch(`${API}/check-out`, { method: 'POST', body: JSON.stringify(coords) }, token);
      showAlert('success', 'Checked out. Shift complete!');
      clearInterval(intervalRef.current);
      await fetchStatus();
      await fetchHistory();
    } catch (e) {
      if (e.status === 403) showAlert('error', `Geofence violation — ${e.message}`);
      else showAlert('error', typeof e === 'string' ? e : e.message || 'Check-out failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const paginated  = useMemo(() => history.slice((page - 1) * PER_PAGE, page * PER_PAGE), [history, page]);
  const totalPages = Math.ceil(history.length / PER_PAGE);
  const checkedIn  = status?.checked_in  ?? false;
  const checkedOut = status?.checked_out ?? false;
  const gpsBlocked = !!gps.error;
  const busy       = actionLoading || gps.loading;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">My Attendance</h1>
        <p className="text-slate-500 font-medium">Track your shift status and review personal attendance history.</p>
      </div>

      {alert && <AlertBanner type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}
      <GpsWarning error={gps.error} />

      {/* Hero row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Shift Timer */}
        <div className="card p-6 bg-white border border-blue-100 shadow-xl space-y-4">
          <h3 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Timer className="w-4 h-4 text-blue-600" /> Shift Timer
          </h3>
          {statusLoading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="w-8 h-8 text-blue-300 animate-spin" />
            </div>
          ) : (
            <>
              <div className={`text-5xl font-black tabular-nums tracking-tight ${checkedIn && !checkedOut ? 'text-blue-700' : 'text-slate-300'}`}>
                {checkedIn && !checkedOut ? padTime(countdown) : '—:—:—'}
              </div>
              <div className="text-xs font-bold text-slate-400">
                {!checkedIn && 'Not checked in today'}
                {checkedIn && !checkedOut && status?.shift_end_at && (
                  <span>Ends at <strong className="text-slate-700">{fmtTime(status.shift_end_at)}</strong></span>
                )}
                {checkedOut && <span className="text-emerald-600 font-black">✓ Shift complete</span>}
              </div>
              {status?.check_in_at && (
                <div className="text-[11px] text-slate-400 font-semibold border-t border-slate-50 pt-3">
                  Clocked in: <strong className="text-slate-600">{fmtTime(status.check_in_at)}</strong>
                </div>
              )}
            </>
          )}
        </div>

        {/* Action Terminal */}
        <div className="lg:col-span-2 card p-6 bg-white border border-blue-100 shadow-xl space-y-5">
          <h3 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-600" /> Action Terminal
          </h3>
          <div className="flex flex-col gap-3">
  <button onClick={handleCheckIn}
    disabled={checkedIn || gpsBlocked || busy}
    className="w-full flex items-center justify-center gap-3 h-14 sm:h-16 min-h-[56px] rounded-2xl font-black text-base sm:text-sm bg-green-600 text-white hover:bg-green-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-green-200 touch-manipulation">
    {busy && !checkedIn
      ? <><Loader2 className="w-5 h-5 animate-spin" /> Fetching GPS…</>
      : <><LogIn className="w-5 h-5" /> Check In</>}
  </button>
  <button onClick={handleCheckOut}
    disabled={!checkedIn || checkedOut || gpsBlocked || busy}
    className="w-full flex items-center justify-center gap-3 h-14 sm:h-16 min-h-[56px] rounded-2xl font-black text-base sm:text-sm border-2 border-slate-200 text-slate-700 bg-red-600 text-white hover:bg-red-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all touch-manipulation">
    {busy && checkedIn && !checkedOut
      ? <><Loader2 className="w-5 h-5 animate-spin" /> Fetching GPS…</>
      : <><LogOut className="w-5 h-5" /> Check Out</>}
  </button>
</div>
          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400">
            {gps.lat
              ? <><MapPin className="w-3.5 h-3.5 text-emerald-500" /> GPS active — {gps.lat.toFixed(5)}, {gps.lon.toFixed(5)}</>
              : <><MapPin className="w-3.5 h-3.5 text-slate-300" /> GPS coordinates resolved on action</>}
          </div>
          {checkedIn && (
            <div className="flex flex-wrap gap-2 border-t border-slate-50 pt-4">
              {status?.is_late     && <Badge label="Late"        type="late"     />}
              {status?.is_short    && <Badge label="Short Shift" type="short"    />}
              {status?.is_overtime && <Badge label="Overtime"    type="overtime" />}
              {!status?.is_late    && <Badge label="On Time"     type="active"   />}
            </div>
          )}
        </div>
      </div>

      {/* Personal History */}
      <div className="card p-6 bg-white border border-blue-100 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
          <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-blue-600" /> Attendance History
          </h3>
          <div className="flex flex-wrap items-center gap-2">
  <input type="date" value={startDate}
    onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
    className="input-field h-9 py-0 text-xs font-bold bg-slate-50 cursor-pointer flex-1 min-w-[130px]" />
  <span className="text-slate-400 font-bold text-xs">to</span>
  <input type="date" value={endDate}
    onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
    className="input-field h-9 py-0 text-xs font-bold bg-slate-50 cursor-pointer flex-1 min-w-[130px]" />
</div>
        </div>

        {histLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-300 animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <CalendarDays className="w-10 h-10 mx-auto mb-2 text-slate-200" />
            <p className="font-semibold text-sm">No attendance records found for this period.</p>
          </div>
        ) : (
          <>
            {/* Desktop table — hidden on mobile */}
<div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-100">
  <table className="w-full text-left text-xs font-semibold">
    <thead>
      <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
        <th className="p-3">Date</th>
        <th className="p-3">Check In</th>
        <th className="p-3">Check Out</th>
        <th className="p-3">Distance</th>
        <th className="p-3">Source</th>
        <th className="p-3">Flags</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-50 text-slate-700">
      {paginated.map((row) => (
        <tr key={row.id} className="hover:bg-slate-50/60">
          <td className="p-3 font-black text-slate-800">{fmtDate(row.work_date)}</td>
          <td className="p-3">{fmtTime(row.check_in_at)}</td>
          <td className="p-3">
            {row.check_out_at
              ? fmtTime(row.check_out_at)
              : <span className="text-emerald-600 font-black">Active</span>}
          </td>
          <td className="p-3 text-slate-400">{fmtDist(row.distance_m)}</td>
          <td className="p-3"><Badge label={row.source} type={row.source} /></td>
          <td className="p-3">
            <div className="flex flex-wrap gap-1">
              {row.is_late     && <Badge label="Late"  type="late"     />}
              {row.is_short    && <Badge label="Short" type="short"    />}
              {row.is_overtime && <Badge label="OT"    type="overtime" />}
              {!row.is_late && !row.is_short && !row.is_overtime && <Badge label="Clean" type="active" />}
            </div>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>

{/* Mobile cards — shown only on mobile */}
<div className="sm:hidden space-y-3">
  {paginated.map((row) => (
    <div key={row.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-black text-slate-900 text-sm">{fmtDate(row.work_date)}</span>
        <Badge label={row.source} type={row.source} />
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-0.5">Check In</p>
          <p className="font-black text-slate-800">{fmtTime(row.check_in_at)}</p>
        </div>
        <div>
          <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-0.5">Check Out</p>
          <p className="font-black text-slate-800">
            {row.check_out_at
              ? fmtTime(row.check_out_at)
              : <span className="text-emerald-600">Active</span>}
          </p>
        </div>
        <div>
          <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-0.5">Distance</p>
          <p className="font-semibold text-slate-600">{fmtDist(row.distance_m)}</p>
        </div>
        <div>
          <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-0.5">Flags</p>
          <div className="flex flex-wrap gap-1">
            {row.is_late     && <Badge label="Late"  type="late"     />}
            {row.is_short    && <Badge label="Short" type="short"    />}
            {row.is_overtime && <Badge label="OT"    type="overtime" />}
            {!row.is_late && !row.is_short && !row.is_overtime && <Badge label="Clean" type="active" />}
          </div>
        </div>
      </div>
    </div>
  ))}
</div>
            <Paginator page={page} totalPages={totalPages} setPage={setPage} total={history.length} perPage={PER_PAGE} />
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW B — FLOOR COMMAND
// Endpoints: POST /proxy/check-in · POST /proxy/check-out · POST /daily-workers
// ═══════════════════════════════════════════════════════════════════════════════
function FloorCommandView({ workers = [], token }) {
  const gps = useGps();

  const [search, setSearch]               = useState('');
  const [selected, setSelected]           = useState(new Set());
  const [actionLoading, setActionLoading] = useState(false);
  const [alert, setAlert]                 = useState(null);
  const [diffModal, setDiffModal]         = useState(null);
  const [addModal, setAddModal]           = useState(false);
  const [addForm, setAddForm]             = useState({ name: '', phone: '', designations: [], daily_rate: '' });
  const [addLoading, setAddLoading]       = useState(false);

  const showAlert = (type, message) => {
    setAlert({ type, message });
    if (type === 'success') setTimeout(() => setAlert(null), 6000);
  };

  const dailyWorkers = useMemo(
  () => workers.filter((w) => {
    const wt = (w.wage_type || '').toUpperCase();
    return wt === 'DAILY_WAGE' || wt === 'PIECE_RATE';
  }),
  [workers]
);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return dailyWorkers;
    return dailyWorkers.filter(
      (w) => w.name?.toLowerCase().includes(q) || String(w.id).includes(q)
    );
  }, [dailyWorkers, search]);

  const toggleSelect = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map((w) => w.id)));

  const batchAction = async (type) => {
    if (selected.size === 0) return;
    setActionLoading(true);
    try {
      const coords = await gps.getPosition();
      const requestedIds = [...selected];
      const endpoint = type === 'check-in' ? `${API}/proxy/check-in` : `${API}/proxy/check-out`;
      const result = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({ employee_ids: requestedIds, lat: coords.lat, lon: coords.lon }),
      }, token);
      const succeededIds = new Set(result.map((r) => String(r.employee_id)));
      const normalizedRequested = requestedIds.map((id) => String(id));
      const succeeded = normalizedRequested.filter((id) => succeededIds.has(id));
      const failed    = normalizedRequested.filter((id) => !succeededIds.has(id));
      setSelected(new Set());
// Defer modal open to next tick so cleared selection doesn't race with render
      setTimeout(() => setDiffModal({ type, succeeded, failed }), 0);
    } catch (e) {
      if (e.status === 403) showAlert('error', `Geofence: ${e.message}`);
      else showAlert('error', typeof e === 'string' ? e : e.message || 'Batch action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddWorker = async () => {
    if (!addForm.name.trim() || !addForm.phone.trim() || addForm.designations.length === 0) {
      showAlert('warning', 'Name, phone, and at least one designation are required.');
      return;
    }
    setAddLoading(true);
    try {
      await gps.getPosition();
      await apiFetch(`${API}/daily-workers`, {
        method: 'POST',
        body: JSON.stringify({
          name:        addForm.name,
          phone:       addForm.phone,
          designation: addForm.designations.join(', '),
          daily_rate:  addForm.daily_rate ? parseFloat(addForm.daily_rate) : null,
          wage_type:   'PIECE_RATE',
        }),
      }, token);  

      showAlert('success', `Worker "${addForm.name}" onboarded to floor roster.`);
      setAddModal(false);
      setAddForm({ name: '', phone: '', designations: [], daily_rate: '' });
    } catch (e) {
      if (e.status === 403) showAlert('error', `Geofence check failed: ${e.message}`);
      else showAlert('error', typeof e === 'string' ? e : e.message || 'Failed to add worker.');
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Floor Command</h1>
          <p className="text-slate-500 font-medium">Proxy check-in / check-out for daily-wage floor workers.</p>
        </div>
        <button onClick={() => setAddModal(true)}
          className="btn-primary h-10 px-4 text-xs font-black flex items-center gap-2 self-start sm:self-auto">
          <UserPlus className="w-4 h-4" /> Add Floor Worker
        </button>
      </div>

      {alert && <AlertBanner type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}
      <GpsWarning error={gps.error} />

      {/* Roster table */}
      <div className="card p-6 bg-white border border-blue-100 shadow-xl space-y-4 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 border-b border-slate-100 pb-4">
          <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2 flex-1">
            <Users className="w-5 h-5 text-blue-600" /> Daily Wage Roster
            <span className="ml-2 text-xs font-black bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">
              {dailyWorkers.length} workers
            </span>
          </h3>
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
            <input
              type="text"
              placeholder="Search workers…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-52 rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 transition-colors"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-2 text-slate-200" />
            <p className="font-semibold text-sm">No daily-wage workers found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left text-xs font-semibold">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="p-3 w-10">
                    <button onClick={toggleAll} className="text-slate-400 hover:text-blue-600">
                      {selected.size === filtered.length && filtered.length > 0
                        ? <CheckSquare className="w-4 h-4 text-blue-600" />
                        : <Square className="w-4 h-4" />}
                    </button>
                  </th>
                  <th className="p-3">Worker</th>
                  <th className="p-3">Designation</th>
                  <th className="p-3">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((w) => (
                  <tr key={w.id} onClick={() => toggleSelect(w.id)}
                    className={`cursor-pointer transition-colors hover:bg-blue-50/40 ${selected.has(w.id) ? 'bg-blue-50/60' : ''}`}>
                    <td className="p-3">
                      {selected.has(w.id)
                        ? <CheckSquare className="w-4 h-4 text-blue-600" />
                        : <Square className="w-4 h-4 text-slate-300" />}
                    </td>
                    <td className="p-3">
                      <span className="block font-black text-slate-900">{w.name}</span>
                      <span className="block text-[10px] text-slate-400 font-mono">{String(w.id).slice(0, 8)}…</span>
                    </td>
                    <td className="p-3 text-slate-600">{w.designation || '—'}</td>
                    <td className="p-3"><Badge label="Daily Wage" type="proxy" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Floating batch action bar */}
      {selected.size > 0 && (
        <div className="absolute bottom-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-40 flex flex-wrap sm:flex-nowrap items-center justify-center gap-2 sm:gap-3 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl animate-fade-in border border-slate-700">
          <span className="text-xs font-black text-slate-300">{selected.size} selected</span>
          <div className="w-px h-5 bg-slate-700" />
          <button onClick={() => batchAction('check-in')} disabled={actionLoading || !!gps.error}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black px-4 py-2 rounded-xl disabled:opacity-50 transition-colors">
            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            Batch Check-In
          </button>
          <button onClick={() => batchAction('check-out')} disabled={actionLoading || !!gps.error}
            className="flex items-center gap-2 border border-slate-600 text-slate-200 hover:bg-slate-800 text-xs font-black px-4 py-2 rounded-xl disabled:opacity-50 transition-colors">
            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            Batch Check-Out
          </button>
          <button onClick={() => setSelected(new Set())} className="text-slate-500 hover:text-slate-300 ml-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Diff result modal */}
      {diffModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[999] flex items-start justify-center pt-16 px-4 pb-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-fade-in my-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-lg">
                {diffModal.type === 'check-in' ? 'Check-In' : 'Check-Out'} Results
              </h3>
              <button onClick={() => setDiffModal(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                <p className="text-xs font-black text-emerald-700 mb-1">✓ Succeeded ({diffModal.succeeded.length})</p>
                <p className="text-[11px] text-emerald-600 font-semibold">
                  {diffModal.succeeded.length > 0
                    ? `${diffModal.succeeded.length} worker(s) marked successfully.`
                    : 'None succeeded.'}
                </p>
              </div>
              {diffModal.failed.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                  <p className="text-xs font-black text-red-700 mb-1">✗ Skipped ({diffModal.failed.length})</p>
                  <div className="space-y-0.5 max-h-32 overflow-y-auto">
                    {diffModal.failed.map((id) => (
                      <p key={id} className="text-[11px] text-red-600 font-semibold font-mono">{id}</p>
                    ))}
                  </div>
                  <p className="text-[10px] text-red-400 mt-2 font-semibold">
                    These workers may already be checked in/out, or IDs are invalid.
                  </p>
                </div>
              )}
            </div>
            <button onClick={() => setDiffModal(null)} className="btn-primary w-full h-10 text-xs font-black">Done</button>
          </div>
        </div>
      )}

      {/* Add floor worker modal */}
      {addModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[999] flex items-start justify-center pt-16 px-4 pb-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 animate-fade-in my-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" /> Add Floor Worker
              </h3>
              <button onClick={() => setAddModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <p className="text-xs text-slate-400 font-semibold">
              GPS location will be verified before submission — floor-only onboarding rule.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-1">Full Name *</label>
                <input type="text" value={addForm.name} placeholder="e.g. Ramesh Kumar"
                  onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                  className="input-field w-full h-10 text-sm font-semibold" />
              </div>
              <div>
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-1">Phone Number *</label>
                <input type="text" value={addForm.phone} placeholder="e.g. 9876543210"
                  onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))}
                  className="input-field w-full h-10 text-sm font-semibold" />
              </div>
              <div>
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                  Designation * <span className="normal-case text-slate-400 font-semibold">(hold Ctrl / Cmd for multiple)</span>
                </label>
                <select multiple value={addForm.designations}
                  onChange={(e) => {
                    const sel = Array.from(e.target.selectedOptions).map((o) => o.value);
                    setAddForm((f) => ({ ...f, designations: sel }));
                  }}
                  className="input-field w-full text-sm font-semibold rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 min-h-[120px] p-1">
                  {['Cutter', 'Fusing Operator', 'Pasting Operator', 'Shell Stitcher',
                    'Lining Attacher', 'Lining Stitcher',
                    'Helper', 'Packer'].map((role) => (
                    <option key={role} value={role}
                      className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
                        addForm.designations.includes(role) ? 'bg-blue-600 text-white' : 'text-slate-700'
                      }`}>
                      {role}
                    </option>
                  ))}
                </select>
                {addForm.designations.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {addForm.designations.map((d) => (
                      <span key={d} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 border border-blue-200 rounded-full text-[10px] font-black">
                        {d}
                        <button type="button" onClick={() => setAddForm((f) => ({ ...f, designations: f.designations.filter((x) => x !== d) }))}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-1">Daily Rate (₹)</label>
                <input type="number" value={addForm.daily_rate} placeholder="Optional"
                  onChange={(e) => setAddForm((f) => ({ ...f, daily_rate: e.target.value }))}
                  className="input-field w-full h-10 text-sm font-semibold" />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setAddModal(false)} className="btn-secondary flex-1 h-10 text-xs font-bold">Cancel</button>
              <button onClick={handleAddWorker} disabled={addLoading}
                className="btn-primary flex-1 h-10 text-xs font-black flex items-center justify-center gap-2">
                {addLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding…</>
                  : <><UserPlus className="w-4 h-4" /> Add Worker</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW C — OPERATIONS & HR
// Endpoints: GET /today · GET /config · PATCH /config
// ═══════════════════════════════════════════════════════════════════════════════
function OperationsHRView({ token }) {
  const [roster, setRoster]               = useState([]);
  const [rosterLoading, setRosterLoading] = useState(true);
  const [config, setConfig]               = useState(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configForm, setConfigForm]       = useState({});
  const [configSaving, setConfigSaving]   = useState(false);
  const [alert, setAlert]                 = useState(null);
  const [page, setPage]                   = useState(1);
  const [filter, setFilter]               = useState('all');
  const [filterOpen, setFilterOpen]       = useState(false);
  const PER_PAGE = 10;

  const showAlert = (type, message) => {
    setAlert({ type, message });
    if (type === 'success') setTimeout(() => setAlert(null), 5000);
  };

  // Click-outside close for filter dropdown
  useEffect(() => {
    if (!filterOpen) return;
    const close = (e) => { if (!e.target.closest('.filter-dropdown')) setFilterOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [filterOpen]);

  // GET /today
  const fetchRoster = useCallback(async () => {
    setRosterLoading(true);
    try {
      const data = await apiFetch(`${API}/today`, {}, token);
      setRoster(data);
    } catch {
      showAlert('error', "Failed to load today's roster.");
    } finally {
      setRosterLoading(false);
    }
  }, [token]);

  // GET /config
  const fetchConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const data = await apiFetch(`${API}/config`, {}, token);
      setConfig(data); 
      setConfigForm({
        shift_start:        data.shift_start,
        shift_length_hours: data.shift_length_hours,
        late_grace_minutes: data.late_grace_minutes,
        factory_lat:        data.factory_lat,
        factory_lon:        data.factory_lon,
        radius_m:           data.radius_m,
      });
    } catch {
      showAlert('error', 'Failed to load shift configuration.');
    } finally {
      setConfigLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchRoster(); fetchConfig(); }, [fetchRoster, fetchConfig]);

  // PATCH /config
  const handleSaveConfig = async () => {
    const timeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
    if (!timeRegex.test(configForm.shift_start || '')) {
      showAlert('error', 'Shift start must be strict HH:MM 24-hour format (e.g. 09:00, 14:30).');
      return;
    }
    setConfigSaving(true);
    try {
      const payload = {
        shift_start:        configForm.shift_start,
        shift_length_hours: parseFloat(configForm.shift_length_hours),
        late_grace_minutes: parseInt(configForm.late_grace_minutes, 10),
        factory_lat:        parseFloat(configForm.factory_lat),
        factory_lon:        parseFloat(configForm.factory_lon),
        radius_m:           parseInt(configForm.radius_m, 10),
      };
      const updated = await apiFetch(`${API}/config`, { method: 'PATCH', body: JSON.stringify(payload) }, token);
      setConfig(updated);
      showAlert('success', 'Shift & geofence configuration saved successfully.');
    } catch (e) {
      showAlert('error', e.message || 'Failed to save configuration.');
    } finally {
      setConfigSaving(false);
    }
  };

  const filteredRoster = useMemo(() => {
    let rows = [...roster];
    if (filter === 'active') rows = rows.filter((r) => !r.check_out_at);
    if (filter === 'late')   rows = rows.filter((r) => r.is_late);
    return rows;
  }, [roster, filter]);

  const paginated  = useMemo(() => filteredRoster.slice((page - 1) * PER_PAGE, page * PER_PAGE), [filteredRoster, page]);
  const totalPages = Math.ceil(filteredRoster.length / PER_PAGE);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Operations &amp; HR</h1>
        <p className="text-slate-500 font-medium">Live roster audit and shift policy configuration.</p>
      </div>

      {alert && <AlertBanner type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      {/* Live Daily Roster */}
      <div className="card p-6 bg-white border border-blue-100 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
          <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" /> Today's Roster
            <span className="text-xs font-black bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full ml-1">
              {roster.length}
            </span>
          </h3>
          <div className="flex items-center gap-2">

            {/* Filter dropdown */}
            <div className="relative filter-dropdown">
              <button onClick={() => setFilterOpen((o) => !o)}
                className={`flex items-center gap-2 h-8 px-3 rounded-lg text-xs font-black transition-colors border ${
                  filter !== 'all'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                }`}>
                <Filter className="w-3.5 h-3.5" />
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
              {filterOpen && (
                <div className="absolute right-0 mt-1 w-36 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden">
                  {['all', 'active', 'late'].map((f) => (
                    <button key={f} onClick={() => { setFilter(f); setPage(1); setFilterOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-xs font-black transition-colors flex items-center justify-between ${
                        filter === f ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
                      }`}>
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                      {filter === f && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Refresh button */}
            <button onClick={fetchRoster} title="Refresh roster"
              className="h-8 w-8 p-0 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 hover:rotate-180 transition-transform">
              <RefreshCw className="w-4 h-4 text-blue-600" />
            </button>

          </div>
        </div>

        {rosterLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-300 animate-spin" />
          </div>
        ) : filteredRoster.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-2 text-slate-200" />
            <p className="font-semibold text-sm">
              {filter === 'all' ? 'No workers checked in today.' : `No ${filter} shifts found.`}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-left text-xs font-semibold">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="p-3">Employee ID</th>
                    <th className="p-3">Check In</th>
                    <th className="p-3">Check Out</th>
                    <th className="p-3">Distance</th>
                    <th className="p-3">Source</th>
                    <th className="p-3">Flags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-700">
                  {paginated.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/60">
                      <td className="p-3 font-mono text-[10px] font-black text-slate-400">
                        {String(row.employee_id).slice(0, 8)}…
                      </td>
                      <td className="p-3 font-black text-slate-800">{fmtTime(row.check_in_at)}</td>
                      <td className="p-3">
                        {row.check_out_at
                          ? fmtTime(row.check_out_at)
                          : <Badge label="Active" type="active" />}
                      </td>
                      <td className="p-3 text-slate-400 font-bold">{fmtDist(row.distance_m)}</td>
                      <td className="p-3"><Badge label={row.source} type={row.source} /></td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {row.is_late     && <Badge label="Late"  type="late"     />}
                          {row.is_short    && <Badge label="Short" type="short"    />}
                          {row.is_overtime && <Badge label="OT"    type="overtime" />}
                          {!row.is_late && !row.is_short && !row.is_overtime && <Badge label="Clean" type="active" />}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginator page={page} totalPages={totalPages} setPage={setPage} total={filteredRoster.length} perPage={PER_PAGE} />
          </>
        )}
      </div>

      {/* Shift & Geofence Config */}
      <div className="card p-6 bg-white border border-blue-100 shadow-xl space-y-6">
        <h3 className="text-lg font-extrabold text-slate-900 border-b border-slate-100 pb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-600" /> Shift &amp; Geofence Configuration
        </h3>

        {configLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-8 h-8 text-blue-300 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* Shift Policy */}
            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" /> Shift Policy
              </h4>
              <div>
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                  Shift Start — HH:MM (24-hour) *
                </label>
                <input type="text" placeholder="09:00"
                  value={configForm.shift_start || ''}
                  onChange={(e) => setConfigForm((f) => ({ ...f, shift_start: e.target.value }))}
                  className="input-field w-full h-10 text-sm font-black font-mono" />
                <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                  Strict format — e.g. 09:00, 14:30. Malformed values break check-in for all workers.
                </p>
              </div>
              <div>
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-1">Shift Length (hours)</label>
                <input type="number" step="0.5" min="1" max="24"
                  value={configForm.shift_length_hours || ''}
                  onChange={(e) => setConfigForm((f) => ({ ...f, shift_length_hours: e.target.value }))}
                  className="input-field w-full h-10 text-sm font-semibold" />
              </div>
              <div>
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-1">Late Grace Period (minutes)</label>
                <input type="number" min="0" max="120"
                  value={configForm.late_grace_minutes || ''}
                  onChange={(e) => setConfigForm((f) => ({ ...f, late_grace_minutes: e.target.value }))}
                  className="input-field w-full h-10 text-sm font-semibold" />
              </div>
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-[10px] font-semibold text-blue-700 leading-relaxed">
                <strong>Timezone:</strong> Managed automatically by the backend (Asia/Kolkata). Intentionally excluded from the save payload.
              </div>
            </div>

            {/* Geofence */}
            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Shield className="w-3.5 h-3.5" /> Geofence Parameters
              </h4>
              <div>
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-1">Factory Latitude</label>
                <input type="number" step="0.0000001"
                  value={configForm.factory_lat ?? ''}
                  onChange={(e) => setConfigForm((f) => ({ ...f, factory_lat: e.target.value }))}
                  className="input-field w-full h-10 text-sm font-semibold font-mono" />
              </div>
              <div>
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-1">Factory Longitude</label>
                <input type="number" step="0.0000001"
                  value={configForm.factory_lon ?? ''}
                  onChange={(e) => setConfigForm((f) => ({ ...f, factory_lon: e.target.value }))}
                  className="input-field w-full h-10 text-sm font-semibold font-mono" />
              </div>
              <div>
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-1">Radius (meters)</label>
                <input type="number" min="10" max="5000"
                  value={configForm.radius_m ?? ''}
                  onChange={(e) => setConfigForm((f) => ({ ...f, radius_m: e.target.value }))}
                  className="input-field w-full h-10 text-sm font-semibold" />
              </div>
              <div className="rounded-xl border border-slate-100 overflow-hidden bg-slate-50 h-40 flex items-center justify-center">
                {configForm.factory_lat && configForm.factory_lon ? (
                  <div className="text-center text-slate-400">
                    <MapPin className="w-8 h-8 mx-auto mb-1 text-blue-400" />
                    <p className="text-[11px] font-bold text-slate-600">
                      {parseFloat(configForm.factory_lat).toFixed(5)}, {parseFloat(configForm.factory_lon).toFixed(5)}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Radius: {configForm.radius_m} m</p>
                    <p className="text-[9px] text-slate-300 mt-2 font-semibold max-w-[180px] mx-auto">
                      Mount Leaflet here — L.map() + L.circle() with radius_m
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-300 font-semibold">Enter coordinates to preview geofence</p>
                )}
              </div>
            </div>
          </div>
        )}

        {!configLoading && (
          <div className="flex justify-end border-t border-slate-100 pt-5">
            <button onClick={handleSaveConfig} disabled={configSaving}
              className="btn-primary h-11 px-8 text-xs font-black flex items-center gap-2">
              {configSaving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                : <><CheckCircle2 className="w-4 h-4" /> Save Configuration</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT EXPORT — Attendance Module Router
// ═══════════════════════════════════════════════════════════════════════════════
export default function AttendancePage() {
  const { user, token } = useAuth();  // token from React state, not localStorage

  // Role strings match AuthContext exactly: lowercase with underscores
  const isManager    = user === 'direct_manager';
  const isSupervisor = user === 'cutting_manager' || user === 'stitching_manager' || isManager;

  const tabs = [
    { key: 'me',    label: 'My Attendance',   icon: Clock,     show: true         },
    { key: 'proxy', label: 'Floor Command',   icon: Users,     show: isSupervisor },
    { key: 'admin', label: 'Operations & HR', icon: Building2, show: isManager    },
  ].filter((t) => t.show);

  const [activeTab, setActiveTab] = useState('me');
  const [workers, setWorkers]     = useState([]);

  // Load daily-wage workers lazily when Floor Command tab is first opened
  useEffect(() => {
    if (activeTab === 'proxy' && workers.length === 0) {
      apiFetch('/api/v1/employees?wage_type=PIECE_RATE', {}, token)
        .then(setWorkers)
        .catch(() => {});
    }
  }, [activeTab, workers.length, token]);

  return (
    <div className="space-y-6">
      {/* Tab bar — only shows tabs the current role can access */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-black whitespace-nowrap border-b-2 transition-colors ${
              activeTab === key
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}>
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Views — token passed as prop, role gates enforced */}
      {activeTab === 'me' && <MyAttendanceView token={token} />}

      {activeTab === 'proxy' && (
        isSupervisor
          ? <FloorCommandView workers={workers} token={token} />
          : <LockedView
              title="Supervisor Authorization Required"
              description="Floor Command is restricted to Supervisors and Direct Managers." />
      )}

      {activeTab === 'admin' && (
        isManager
          ? <OperationsHRView token={token} />
          : <LockedView
              title="Direct Manager Authorization Required"
              description="Operations & HR is restricted to Direct Managers only." />
      )}
    </div>
  );
}