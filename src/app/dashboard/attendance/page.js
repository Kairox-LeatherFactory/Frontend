'use client';
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  MapPin, CheckCircle2, LogIn, LogOut, Clock, AlertTriangle,
  Users, Search, Settings, ChevronLeft, ChevronRight,
  Lock, RefreshCw, CheckSquare, Square, X,
  Timer, CalendarDays, Shield, Zap, Filter,
  UserPlus, AlertCircle, Loader2, Building2, Activity, WifiOff
} from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';
import { createPortal } from 'react-dom';

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

// ─── FETCH HELPER ────────────────────────────────────────────────────────────
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
    } catch { }
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
    late: 'bg-red-100 text-red-700 border-red-200',
    short: 'bg-orange-100 text-orange-700 border-orange-200',
    overtime: 'bg-purple-100 text-purple-700 border-purple-200',
    self: 'bg-blue-100 text-blue-700 border-blue-200',
    proxy: 'bg-amber-100 text-amber-700 border-amber-200',
    active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    frozen: 'bg-slate-100 text-slate-600 border-slate-200',
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
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
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
    <SpotlightCard className="p-12 shadow text-center space-y-3 rounded-3xl" style={{ background: '#fff9f0', border: '1px solid rgba(200,131,74,0.3)' }} spotlightColor="rgba(200,131,74,0.1)">
      <Lock className="w-12 h-12 mx-auto" style={{ color: '#c8834a' }} />
      <h3 className="font-black uppercase tracking-wide" style={{ color: '#9c4221' }}>{title}</h3>
      <p className="text-xs font-semibold max-w-md mx-auto" style={{ color: '#a86022' }}>{description}</p>
    </SpotlightCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW A — MY ATTENDANCE
// ═══════════════════════════════════════════════════════════════════════════════
function MyAttendanceView({ token }) {
  const gps = useGps();

  const [status, setStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [countdown, setCountdown] = useState(null);
  const intervalRef = useRef(null);

  const [history, setHistory] = useState([]);
  const [histLoading, setHistLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [page, setPage] = useState(1);
  const PER_PAGE = 8;

  const [actionLoading, setActionLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const showAlert = (type, message) => {
    setAlert({ type, message });
    if (type === 'success') setTimeout(() => setAlert(null), 5000);
  };

  const fetchStatus = useCallback(async () => {
    try {
      const data = await apiFetch(`${API}/me/status`, {}, token);
      setStatus(data);
      if (data.remaining_seconds != null && data.checked_in && !data.checked_out) {
        setCountdown(data.remaining_seconds);
      } else {
        setCountdown(null);
      }
    } catch (e) {
      console.error('Status fetch failed:', e.message);
      try {
        const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
        const histData = await apiFetch(`${API}/me?start=${todayStr}&end=${todayStr}`, {}, token);
        const todayRec = histData.find(r => r.work_date === todayStr);
        if (todayRec) {
          setStatus({
            checked_in: true,
            checked_out: !!todayRec.check_out_at,
            check_in_at: todayRec.check_in_at,
            is_late: todayRec.is_late,
            is_short: todayRec.is_short,
            is_overtime: todayRec.is_overtime,
            shift_end_at: null,
            remaining_seconds: null,
          });
        } else {
          setStatus(null);
        }
        setCountdown(null);
      } catch { }
    } finally {
      setStatusLoading(false);
    }
  }, [token]);

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

  const paginated = useMemo(() => history.slice((page - 1) * PER_PAGE, page * PER_PAGE), [history, page]);
  const totalPages = Math.ceil(history.length / PER_PAGE);
  const checkedIn = status?.checked_in ?? false;
  const checkedOut = status?.checked_out ?? false;
  const gpsBlocked = !!gps.error;
  const busy = actionLoading || gps.loading;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-black tracking-tight" style={{ color: '#2d1f0e' }}>My Attendance</h1>
        <p className="font-medium mt-1" style={{ color: '#9a7a5a' }}>Track your shift status and review personal attendance history.</p>
      </div>

      {alert && <AlertBanner type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}
      <GpsWarning error={gps.error} />

      {/* Hero row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Shift Timer */}
        <SpotlightCard className="p-6 bg-white shadow-xl space-y-4 rounded-3xl" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.06)">
          <h3 className="text-sm font-extrabold uppercase tracking-widest flex items-center gap-2" style={{ color: '#9a7a5a' }}>
            <Timer className="w-4 h-4" style={{ color: '#c8834a' }} /> Shift Timer
          </h3>
          {statusLoading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#c8834a' }} />
            </div>
          ) : (
            <>
              <div className={`text-5xl font-black tabular-nums tracking-tight`} style={{ color: checkedIn && !checkedOut ? '#c8834a' : '#d1d5db' }}>
                {checkedIn && !checkedOut ? padTime(countdown) : '—:—:—'}
              </div>
              <div className="text-xs font-bold" style={{ color: '#9a7a5a' }}>
                {!checkedIn && 'Not checked in today'}
                {checkedIn && !checkedOut && status?.shift_end_at && (
                  <span>Ends at <strong style={{ color: '#2d1f0e' }}>{fmtTime(status.shift_end_at)}</strong></span>
                )}
                {checkedOut && <span className="font-black" style={{ color: '#38a169' }}>✓ Shift complete</span>}
              </div>
              {status?.check_in_at && (
                <div className="text-[11px] font-semibold pt-3" style={{ borderTop: '1px solid rgba(200,131,74,0.1)', color: '#9a7a5a' }}>
                  Clocked in: <strong style={{ color: '#2d1f0e' }}>{fmtTime(status.check_in_at)}</strong>
                </div>
              )}
            </>
          )}
        </SpotlightCard>

        {/* Action Terminal */}
        <SpotlightCard className="lg:col-span-2 p-6 bg-white shadow-xl space-y-5 rounded-3xl" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.06)">
          <h3 className="text-sm font-extrabold uppercase tracking-widest flex items-center gap-2" style={{ color: '#9a7a5a' }}>
            <Zap className="w-4 h-4" style={{ color: '#c8834a' }} /> Action Terminal
          </h3>
          <div className="flex flex-col gap-3">
            <button onClick={handleCheckIn}
              disabled={checkedIn || gpsBlocked || busy}
              className="w-full flex items-center justify-center gap-3 h-14 sm:h-16 min-h-[56px] rounded-2xl font-black text-base sm:text-sm text-white transition-all shadow-lg shadow-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation hover:-translate-y-0.5 active:translate-y-0"
              style={{ background: 'linear-gradient(135deg, #38a169, #48bb78)' }}>
              {busy && !checkedIn
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Fetching GPS…</>
                : <><LogIn className="w-5 h-5" /> Check In</>}
            </button>
            <button onClick={handleCheckOut}
              disabled={!checkedIn || checkedOut || gpsBlocked || busy}
              className="w-full flex items-center justify-center gap-3 h-14 sm:h-16 min-h-[56px] rounded-2xl font-black text-base sm:text-sm text-white transition-all shadow-lg shadow-red-200 disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation hover:-translate-y-0.5 active:translate-y-0"
              style={{ background: 'linear-gradient(135deg, #e53e3e, #f56565)' }}>
              {busy && checkedIn && !checkedOut
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Fetching GPS…</>
                : <><LogOut className="w-5 h-5" /> Check Out</>}
            </button>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-semibold" style={{ color: '#9a7a5a' }}>
            {gps.lat
              ? <><MapPin className="w-3.5 h-3.5" style={{ color: '#38a169' }} /> GPS active — {gps.lat.toFixed(5)}, {gps.lon.toFixed(5)}</>
              : <><MapPin className="w-3.5 h-3.5" style={{ color: '#d1d5db' }} /> GPS coordinates resolved on action</>}
          </div>
          {checkedIn && (
            <div className="flex flex-wrap gap-2 pt-4" style={{ borderTop: '1px solid rgba(200,131,74,0.1)' }}>
              {status?.is_late && <Badge label="Late" type="late" />}
              {status?.is_short && <Badge label="Short Shift" type="short" />}
              {status?.is_overtime && <Badge label="Overtime" type="overtime" />}
              {!status?.is_late && <Badge label="On Time" type="active" />}
            </div>
          )}
        </SpotlightCard>
      </div>

      {/* Personal History */}
      <SpotlightCard className="p-6 bg-white shadow-xl space-y-5 rounded-3xl" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.06)">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4" style={{ borderBottom: '1px solid rgba(200,131,74,0.1)' }}>
          <h3 className="text-lg font-extrabold flex items-center gap-2" style={{ color: '#2d1f0e' }}>
            <CalendarDays className="w-5 h-5" style={{ color: '#c8834a' }} /> Attendance History
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <input type="date" value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="px-3 py-2 text-xs font-bold rounded-xl cursor-pointer flex-1 min-w-[130px] focus:outline-none transition-all" style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.2)', color: '#2d1f0e' }} />
            <span className="font-bold text-xs" style={{ color: '#9a7a5a' }}>to</span>
            <input type="date" value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="px-3 py-2 text-xs font-bold rounded-xl cursor-pointer flex-1 min-w-[130px] focus:outline-none transition-all" style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.2)', color: '#2d1f0e' }} />
          </div>
        </div>

        {histLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#c8834a' }} />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12" style={{ color: '#9a7a5a' }}>
            <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="font-semibold text-sm">No attendance records found for this period.</p>
          </div>
        ) : (
          <>
            {/* Desktop table — hidden on mobile */}
            <div className="hidden sm:block overflow-x-auto rounded-xl" style={{ border: '1px solid rgba(200,131,74,0.15)' }}>
              <table className="w-full text-left text-xs font-semibold">
                <thead>
                  <tr className="font-bold uppercase tracking-wider" style={{ background: '#faf6f0', borderBottom: '1px solid rgba(200,131,74,0.15)', color: '#9a7a5a' }}>
                    <th className="p-3">Date</th>
                    <th className="p-3">Check In</th>
                    <th className="p-3">Check Out</th>
                    <th className="p-3">Distance</th>
                    <th className="p-3">Source</th>
                    <th className="p-3">Flags</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ divideColor: 'rgba(200,131,74,0.1)', color: '#2d1f0e' }}>
                  {paginated.map((row) => (
                    <tr key={row.id} className="hover:bg-[#fcfaf8] transition-colors">
                      <td className="p-3 font-black" style={{ color: '#2d1f0e' }}>{fmtDate(row.work_date)}</td>
                      <td className="p-3">{fmtTime(row.check_in_at)}</td>
                      <td className="p-3">
                        {row.check_out_at
                          ? fmtTime(row.check_out_at)
                          : <span className="font-black" style={{ color: '#38a169' }}>Active</span>}
                      </td>
                      <td className="p-3" style={{ color: '#9a7a5a' }}>{fmtDist(row.distance_m)}</td>
                      <td className="p-3"><Badge label={row.source} type={row.source} /></td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {row.is_late && <Badge label="Late" type="late" />}
                          {row.is_short && <Badge label="Short" type="short" />}
                          {row.is_overtime && <Badge label="OT" type="overtime" />}
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
                <div key={row.id} className="rounded-xl p-4 space-y-3" style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.1)' }}>
                  <div className="flex items-center justify-between">
                    <span className="font-black text-sm" style={{ color: '#2d1f0e' }}>{fmtDate(row.work_date)}</span>
                    <Badge label={row.source} type={row.source} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="font-bold uppercase tracking-wider text-[10px] mb-0.5" style={{ color: '#9a7a5a' }}>Check In</p>
                      <p className="font-black" style={{ color: '#2d1f0e' }}>{fmtTime(row.check_in_at)}</p>
                    </div>
                    <div>
                      <p className="font-bold uppercase tracking-wider text-[10px] mb-0.5" style={{ color: '#9a7a5a' }}>Check Out</p>
                      <p className="font-black" style={{ color: '#2d1f0e' }}>
                        {row.check_out_at
                          ? fmtTime(row.check_out_at)
                          : <span style={{ color: '#38a169' }}>Active</span>}
                      </p>
                    </div>
                    <div>
                      <p className="font-bold uppercase tracking-wider text-[10px] mb-0.5" style={{ color: '#9a7a5a' }}>Distance</p>
                      <p className="font-semibold" style={{ color: '#a86022' }}>{fmtDist(row.distance_m)}</p>
                    </div>
                    <div>
                      <p className="font-bold uppercase tracking-wider text-[10px] mb-0.5" style={{ color: '#9a7a5a' }}>Flags</p>
                      <div className="flex flex-wrap gap-1">
                        {row.is_late && <Badge label="Late" type="late" />}
                        {row.is_short && <Badge label="Short" type="short" />}
                        {row.is_overtime && <Badge label="OT" type="overtime" />}
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
      </SpotlightCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW B — FLOOR COMMAND
// ═══════════════════════════════════════════════════════════════════════════════
function FloorCommandView({ workers = [], token }) {
  const gps = useGps();

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [actionLoading, setActionLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [diffModal, setDiffModal] = useState(null);

  // Unified State for Add Worker
  const [addModal, setAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', phone: '', designation: '', wage_type: 'piece_rate', daily_rate: '', password: '' });
  const [addLoading, setAddLoading] = useState(false);

  const showAlert = (type, message) => {
    setAlert({ type, message });
    if (type === 'success') setTimeout(() => setAlert(null), 6000);
  };

  const handleAddWorker = async () => {
    const { name, phone, designation, wage_type, daily_rate, password } = addForm;
    if (!name.trim() || !designation.trim()) {
      showAlert('warning', 'Name and designation are required.');
      return;
    }
    if (wage_type === 'monthly' && (!phone.trim() || !password.trim())) {
      showAlert('warning', 'Phone number and password are required for monthly employees.');
      return;
    }
    setAddLoading(true);
    try {
      await gps.getPosition();

      const payload = {
        name: name.trim(),
        designation: designation.trim(),
        wage_type: wage_type,
        phone: phone.trim() || null,
        password: wage_type === 'monthly' ? password : null,
        daily_rate: daily_rate ? parseFloat(daily_rate) : null,
      };

      await apiFetch(`/api/v1/employees`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }, token);

      showAlert('success', `Worker "${name}" onboarded to floor roster.`);
      setAddModal(false);
      setAddForm({ name: '', phone: '', designation: '', wage_type: 'piece_rate', daily_rate: '', password: '' });
    } catch (e) {
      if (e.status === 403) showAlert('error', `Geofence check failed: ${e.message}`);
      else showAlert('error', typeof e === 'string' ? e : e.message || 'Failed to add worker.');
    } finally {
      setAddLoading(false);
    }
  };

  const dailyWorkers = useMemo(() => {
    return workers; 
  }, [workers]);

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
      const failed = normalizedRequested.filter((id) => !succeededIds.has(id));
      setSelected(new Set());
      setTimeout(() => setDiffModal({ type, succeeded, failed }), 0);
    } catch (e) {
      if (e.status === 403) showAlert('error', `Geofence: ${e.message}`);
      else showAlert('error', typeof e === 'string' ? e : e.message || 'Batch action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: '#2d1f0e' }}>Floor Command</h1>
          <p className="font-medium mt-1" style={{ color: '#9a7a5a' }}>Proxy check-in / check-out for daily-wage floor workers.</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button onClick={() => setAddModal(true)}
            className="btn-primary h-10 px-4 text-xs font-black flex items-center gap-2 cursor-pointer relative z-20">
            <UserPlus className="w-4 h-4" /> Add Worker
          </button>
        </div>
      </div>

      {alert && <AlertBanner type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}
      <GpsWarning error={gps.error} />

      {/* Roster table */}
      <SpotlightCard className="p-6 bg-white shadow-xl space-y-4 relative overflow-hidden rounded-3xl" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.06)">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pb-4" style={{ borderBottom: '1px solid rgba(200,131,74,0.1)' }}>
          <h3 className="text-lg font-extrabold flex items-center gap-2 flex-1" style={{ color: '#2d1f0e' }}>
            <Users className="w-5 h-5" style={{ color: '#c8834a' }} /> Daily Wage Roster
            <span className="ml-2 text-xs font-black px-2 py-0.5 rounded-full" style={{ background: '#faf6f0', color: '#a86022', border: '1px solid rgba(200,131,74,0.2)' }}>
              {dailyWorkers.length} workers
            </span>
          </h3>
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" style={{ color: '#9a7a5a' }} />
            <input
              type="text"
              placeholder="Search workers…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full sm:w-52 rounded-lg pl-9 pr-3 text-xs font-semibold focus:outline-none transition-colors"
              style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.2)', color: '#2d1f0e' }}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12" style={{ color: '#9a7a5a' }}>
            <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="font-semibold text-sm">No daily-wage workers found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid rgba(200,131,74,0.15)' }}>
            <table className="w-full text-left text-xs font-semibold">
              <thead>
                <tr className="font-bold uppercase tracking-wider" style={{ background: '#faf6f0', borderBottom: '1px solid rgba(200,131,74,0.15)', color: '#9a7a5a' }}>
                  <th className="p-3 w-10">
                    <button onClick={toggleAll} className="hover:opacity-80 transition-opacity">
                      {selected.size === filtered.length && filtered.length > 0
                        ? <CheckSquare className="w-4 h-4" style={{ color: '#c8834a' }} />
                        : <Square className="w-4 h-4" style={{ color: '#9a7a5a' }} />}
                    </button>
                  </th>
                  <th className="p-3">Worker</th>
                  <th className="p-3">Designation</th>
                  <th className="p-3">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ divideColor: 'rgba(200,131,74,0.1)' }}>
                {filtered.map((w) => (
                  <tr key={w.id} onClick={() => toggleSelect(w.id)}
                    className="cursor-pointer transition-colors" style={{ background: selected.has(w.id) ? '#fff9f0' : 'transparent' }}>
                    <td className="p-3">
                      {selected.has(w.id)
                        ? <CheckSquare className="w-4 h-4" style={{ color: '#c8834a' }} />
                        : <Square className="w-4 h-4" style={{ color: '#d1d5db' }} />}
                    </td>
                    <td className="p-3">
                      <span className="block font-black" style={{ color: '#2d1f0e' }}>{w.name}</span>
                      <span className="block text-[10px] font-mono" style={{ color: '#9a7a5a' }}>{String(w.id).slice(0, 8)}…</span>
                    </td>
                    <td className="p-3 font-semibold" style={{ color: '#a86022' }}>{w.designation || '—'}</td>
                    <td className="p-3">
                      <Badge 
                        label={w.wage_type === 'piece_rate' ? 'Daily Wage' : 'Monthly'} 
                        type={w.wage_type === 'piece_rate' ? 'proxy' : 'active'} 
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SpotlightCard>

      {/* Floating batch action bar */}
      {selected.size > 0 && (
        <div className="fixed sm:absolute bottom-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-40 flex flex-wrap sm:flex-nowrap items-center justify-center gap-2 sm:gap-3 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl animate-fade-in border border-slate-700">
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
      {diffModal && typeof window !== 'undefined' && createPortal(
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.65)', padding: '16px', pointerEvents: 'auto'
          }}
        >
          <div 
            style={{
              backgroundColor: '#ffffff', borderRadius: '20px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid #e2e8f0', width: '100%', maxWidth: '448px', padding: '24px',
              position: 'relative', zIndex: 1000000, pointerEvents: 'auto'
            }}
            className="space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base sm:text-lg">
                {diffModal.type === 'check-in' ? 'Check-In' : 'Check-Out'} Results
              </h3>
              <button onClick={() => setDiffModal(null)} className="cursor-pointer relative z-50 p-2"><X className="w-5 h-5 text-slate-400" /></button>
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
            <button onClick={() => setDiffModal(null)} className="btn-primary w-full h-11 sm:h-10 text-xs font-black cursor-pointer relative z-30 pointer-events-auto">Done</button>
          </div>
        </div>,
        document.body
      )}

      {/* Add floor worker modal — FIXED WITH createPortal & Center Alignment */}
      {addModal && typeof window !== 'undefined' && createPortal(
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.65)', padding: '16px', pointerEvents: 'auto'
          }}
        >
          <div 
            style={{
              backgroundColor: '#ffffff', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid #e2e8f0', width: '100%', maxWidth: '448px', maxHeight: '90vh',
              overflowY: 'auto', padding: '24px', position: 'relative', zIndex: 1000000, pointerEvents: 'auto'
            }}
            className="space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog" 
            aria-modal="true" 
            aria-labelledby="add-worker-title"
          >
            <div className="flex-shrink-0 flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 id="add-worker-title" className="font-black text-slate-900 text-base sm:text-lg flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" /> Add Floor Worker
              </h3>
              <button onClick={() => setAddModal(false)} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer relative z-50">
                <X className="w-5 h-5" aria-label="Close modal" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                GPS location will be verified before submission — floor-only onboarding rule.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                <div className="sm:col-span-2">
                  <label className="input-label text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-1">Full Name *</label>
                  <input type="text" value={addForm.name} placeholder="e.g. Ramesh Kumar"
                    onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                    className="input-field w-full h-10 px-3.5 text-xs font-semibold text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#c8834a] bg-white relative z-20 cursor-text" />
                </div>
                <div>
                  <label className="input-label text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-1">Designation *</label>
                  <input type="text" value={addForm.designation} placeholder="e.g. Cutter, Stitcher, Helper"
                    onChange={(e) => setAddForm((f) => ({ ...f, designation: e.target.value }))}
                    className="input-field w-full h-10 px-3.5 text-xs font-semibold text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#c8834a] bg-white relative z-20 cursor-text" />
                </div>
                <div>
                  <label className="input-label text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-1">Wage Type</label>
                  <select value={addForm.wage_type}
                    onChange={(e) => setAddForm(f => ({ ...f, wage_type: e.target.value, password: '' }))}
                    className="input-field w-full h-10 px-3 text-xs font-bold rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#c8834a] relative z-20 cursor-pointer">
                    <option value="piece_rate">Piece Rate / Daily Wage</option>
                    <option value="monthly">Monthly Salary</option>
                  </select>
                </div>
                {addForm.wage_type === 'monthly' ? (
                  <>
                    <div>
                      <label className="input-label text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-1">Phone Number *</label>
                      <input type="tel" inputMode="numeric" pattern="[0-9]*" value={addForm.phone} placeholder="10-digit mobile number"
                        onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))}
                        className="input-field w-full h-10 px-3.5 text-xs font-semibold text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#c8834a] bg-white relative z-20 cursor-text" />
                    </div>
                    <div>
                      <label className="input-label text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-1">Set Password *</label>
                      <input type="password" value={addForm.password} placeholder="Min. 6 characters"
                        onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))}
                        className="input-field w-full h-10 px-3.5 text-xs font-semibold text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#c8834a] bg-white relative z-20 cursor-text" />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="input-label text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-1">Phone Number (Optional)</label>
                      <input type="tel" inputMode="numeric" pattern="[0-9]*" value={addForm.phone} placeholder="Optional for daily workers"
                        onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))}
                        className="input-field w-full h-10 px-3.5 text-xs font-semibold text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#c8834a] bg-white relative z-20 cursor-text" />
                    </div>
                    <div>
                      <label className="input-label text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-1">Daily Rate (₹)</label>
                      <input type="number" inputMode="decimal" placeholder="e.g. 500" value={addForm.daily_rate}
                        onChange={(e) => setAddForm((f) => ({ ...f, daily_rate: e.target.value }))}
                        className="input-field w-full h-10 px-3.5 text-xs font-semibold text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#c8834a] bg-white relative z-20 cursor-text" />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex-shrink-0 flex gap-3 pt-3 border-t border-slate-100 relative z-30">
              <button onClick={() => setAddModal(false)} type="button" className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer text-center pointer-events-auto">Cancel</button>
              <button onClick={handleAddWorker} disabled={addLoading} type="button"
                className="flex-1 py-3 px-4 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer text-center shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 pointer-events-auto"
                style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}>
                {addLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</> : <><UserPlus className="w-4 h-4" /> Add Worker</>}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW C — OPERATIONS & HR
// ═══════════════════════════════════════════════════════════════════════════════
function OperationsHRView({ token }) {
  const [roster, setRoster] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(true);

  const [configForm, setConfigForm] = useState({});
  const [configSaving, setConfigSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const PER_PAGE = 10;

  const showAlert = (type, message) => {
    setAlert({ type, message });
    if (type === 'success') setTimeout(() => setAlert(null), 5000);
  };

  useEffect(() => {
    if (!filterOpen) return;
    const close = (e) => { if (!e.target.closest('.filter-dropdown')) setFilterOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [filterOpen]);

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

  const fetchConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const data = await apiFetch(`${API}/config`, {}, token);
      setConfig(data);
      setConfigForm({
        shift_start: data.shift_start,
        shift_length_hours: data.shift_length_hours,
        late_grace_minutes: data.late_grace_minutes,
        factory_lat: data.factory_lat,
        factory_lon: data.factory_lon,
        radius_m: data.radius_m,
      });
    } catch {
      showAlert('error', 'Failed to load shift configuration.');
    } finally {
      setConfigLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchRoster(); fetchConfig(); }, [fetchRoster, fetchConfig]);

  const handleSaveConfig = async () => {
    const timeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
    if (!timeRegex.test(configForm.shift_start || '')) {
      showAlert('error', 'Shift start must be strict HH:MM 24-hour format (e.g. 09:00, 14:30).');
      return;
    }
    setConfigSaving(true);
    try {
      const payload = {
        shift_start: configForm.shift_start,
        shift_length_hours: parseFloat(configForm.shift_length_hours),
        late_grace_minutes: parseInt(configForm.late_grace_minutes, 10),
        factory_lat: parseFloat(configForm.factory_lat),
        factory_lon: parseFloat(configForm.factory_lon),
        radius_m: parseInt(configForm.radius_m, 10),
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
    if (filter === 'late') rows = rows.filter((r) => r.is_late);
    return rows;
  }, [roster, filter]);

  const paginated = useMemo(() => filteredRoster.slice((page - 1) * PER_PAGE, page * PER_PAGE), [filteredRoster, page]);
  const totalPages = Math.ceil(filteredRoster.length / PER_PAGE);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-black tracking-tight" style={{ color: '#2d1f0e' }}>Operations &amp; HR</h1>
        <p className="font-medium mt-1" style={{ color: '#9a7a5a' }}>Live roster audit and shift policy configuration.</p>
      </div>

      {alert && <AlertBanner type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      {/* Live Daily Roster */}
      <SpotlightCard className="p-6 bg-white shadow-xl space-y-5 rounded-3xl" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.06)">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4" style={{ borderBottom: '1px solid rgba(200,131,74,0.1)' }}>
          <h3 className="text-lg font-extrabold flex items-center gap-2" style={{ color: '#2d1f0e' }}>
            <Activity className="w-5 h-5" style={{ color: '#c8834a' }} /> Today's Roster
            <span className="text-xs font-black px-2 py-0.5 rounded-full ml-1" style={{ background: '#faf6f0', color: '#a86022', border: '1px solid rgba(200,131,74,0.2)' }}>
              {roster.length} Live
            </span>
          </h3>
          <div className="flex items-center gap-2">
            {/* Filter dropdown */}
            <div className="relative filter-dropdown">
              <button onClick={() => setFilterOpen((o) => !o)}
                className="flex items-center gap-2 h-8 px-3 rounded-lg text-xs font-black transition-colors border"
                style={{
                  background: filter !== 'all' ? '#c8834a' : '#faf6f0',
                  color: filter !== 'all' ? 'white' : '#9a7a5a',
                  borderColor: filter !== 'all' ? '#c8834a' : 'rgba(200,131,74,0.2)'
                }}>
                <Filter className="w-3.5 h-3.5" />
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
              {filterOpen && (
                <div className="absolute right-0 mt-1 w-36 bg-white rounded-xl shadow-lg z-20 overflow-hidden" style={{ border: '1px solid rgba(200,131,74,0.2)' }}>
                  {['all', 'active', 'late'].map((f) => (
                    <button key={f} onClick={() => { setFilter(f); setPage(1); setFilterOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-xs font-black transition-colors flex items-center justify-between"
                      style={{
                        background: filter === f ? '#fff9f0' : 'transparent',
                        color: filter === f ? '#c8834a' : '#9a7a5a'
                      }}>
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                      {filter === f && <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#c8834a' }} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Refresh button */}
            <button onClick={fetchRoster} title="Refresh roster"
              className="h-8 w-8 p-0 flex items-center justify-center rounded-lg transition-all duration-200 hover:rotate-180"
              style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.2)' }}>
              <RefreshCw className="w-4 h-4" style={{ color: '#c8834a' }} />
            </button>
          </div>
        </div>

        {rosterLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#c8834a' }} />
          </div>
        ) : filteredRoster.length === 0 ? (
          <div className="text-center py-12" style={{ color: '#9a7a5a' }}>
            <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="font-semibold text-sm">
              {filter === 'all' ? 'No workers checked in today.' : `No ${filter} shifts found.`}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid rgba(200,131,74,0.15)' }}>
              <table className="w-full text-left text-xs font-semibold">
                <thead>
                  <tr className="font-bold uppercase tracking-wider" style={{ background: '#faf6f0', borderBottom: '1px solid rgba(200,131,74,0.15)', color: '#9a7a5a' }}>
                    <th className="p-3">Employee ID</th>
                    <th className="p-3">Check In</th>
                    <th className="p-3">Check Out</th>
                    <th className="p-3">Distance</th>
                    <th className="p-3">Source</th>
                    <th className="p-3">Flags</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ divideColor: 'rgba(200,131,74,0.1)' }}>
                  {paginated.map((row) => (
                    <tr key={row.id} className="hover:bg-[#fcfaf8] transition-colors">
                      <td className="p-3 font-mono text-[10px] font-black" style={{ color: '#9a7a5a' }}>
                        {String(row.employee_id).slice(0, 8)}…
                      </td>
                      <td className="p-3 font-black" style={{ color: '#2d1f0e' }}>{fmtTime(row.check_in_at)}</td>
                      <td className="p-3">
                        {row.check_out_at
                          ? fmtTime(row.check_out_at)
                          : <Badge label="Active" type="active" />}
                      </td>
                      <td className="p-3 font-bold" style={{ color: '#9a7a5a' }}>{fmtDist(row.distance_m)}</td>
                      <td className="p-3"><Badge label={row.source} type={row.source} /></td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {row.is_late && <Badge label="Late" type="late" />}
                          {row.is_short && <Badge label="Short" type="short" />}
                          {row.is_overtime && <Badge label="OT" type="overtime" />}
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
      </SpotlightCard>

      {/* Shift & Geofence Config */}
      <SpotlightCard className="p-6 bg-white shadow-xl space-y-6 rounded-3xl" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.06)">
        <h3 className="text-lg font-extrabold pb-4 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(200,131,74,0.1)', color: '#2d1f0e' }}>
          <Settings className="w-5 h-5" style={{ color: '#c8834a' }} /> Shift &amp; Geofence Configuration
        </h3>

        {configLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#c8834a' }} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* Shift Policy */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest flex items-center gap-2" style={{ color: '#9a7a5a' }}>
                <Clock className="w-3.5 h-3.5" /> Shift Policy
              </h4>
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider block mb-1" style={{ color: '#9a7a5a' }}>
                  Shift Start — HH:MM (24-hour) *
                </label>
                <input type="text" placeholder="09:00"
                  value={configForm.shift_start || ''}
                  onChange={(e) => setConfigForm((f) => ({ ...f, shift_start: e.target.value }))}
                  className="w-full h-11 sm:h-10 text-base sm:text-sm font-black font-mono px-3 rounded-lg focus:outline-none transition-colors"
                  style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.2)', color: '#2d1f0e' }} />
                <p className="text-[10px] mt-1 font-semibold" style={{ color: '#c8834a' }}>
                  Strict format — e.g. 09:00, 14:30. Malformed values break check-in for all workers.
                </p>
              </div>
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider block mb-1" style={{ color: '#9a7a5a' }}>Shift Length (hours)</label>
                <input type="number" step="0.5" min="1" max="24"
                  value={configForm.shift_length_hours || ''}
                  onChange={(e) => setConfigForm((f) => ({ ...f, shift_length_hours: e.target.value }))}
                  className="w-full h-11 sm:h-10 text-base sm:text-sm font-semibold px-3 rounded-lg focus:outline-none transition-colors"
                  style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.2)', color: '#2d1f0e' }} />
              </div>
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider block mb-1" style={{ color: '#9a7a5a' }}>Late Grace Period (minutes)</label>
                <input type="number" min="0" max="120"
                  value={configForm.late_grace_minutes || ''}
                  onChange={(e) => setConfigForm((f) => ({ ...f, late_grace_minutes: e.target.value }))}
                  className="w-full h-11 sm:h-10 text-base sm:text-sm font-semibold px-3 rounded-lg focus:outline-none transition-colors"
                  style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.2)', color: '#2d1f0e' }} />
              </div>
              <div className="p-3 rounded-xl text-[10px] font-semibold leading-relaxed" style={{ background: '#fff9f0', border: '1px solid rgba(200,131,74,0.3)', color: '#a86022' }}>
                <strong>Timezone:</strong> Managed automatically by the backend (Asia/Kolkata). Intentionally excluded from the save payload.
              </div>
            </div>

            {/* Geofence */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest flex items-center gap-2" style={{ color: '#9a7a5a' }}>
                <Shield className="w-3.5 h-3.5" /> Geofence Parameters
              </h4>
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider block mb-1" style={{ color: '#9a7a5a' }}>Factory Latitude</label>
                <input type="number" step="0.0000001"
                  value={configForm.factory_lat ?? ''}
                  onChange={(e) => setConfigForm((f) => ({ ...f, factory_lat: e.target.value }))}
                  className="w-full h-11 sm:h-10 text-base sm:text-sm font-semibold font-mono px-3 rounded-lg focus:outline-none transition-colors"
                  style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.2)', color: '#2d1f0e' }} />
              </div>
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider block mb-1" style={{ color: '#9a7a5a' }}>Factory Longitude</label>
                <input type="number" step="0.0000001"
                  value={configForm.factory_lon ?? ''}
                  onChange={(e) => setConfigForm((f) => ({ ...f, factory_lon: e.target.value }))}
                  className="w-full h-11 sm:h-10 text-base sm:text-sm font-semibold font-mono px-3 rounded-lg focus:outline-none transition-colors"
                  style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.2)', color: '#2d1f0e' }} />
              </div>
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider block mb-1" style={{ color: '#9a7a5a' }}>Radius (meters)</label>
                <input type="number" min="10" max="5000"
                  value={configForm.radius_m ?? ''}
                  onChange={(e) => setConfigForm((f) => ({ ...f, radius_m: e.target.value }))}
                  className="w-full h-11 sm:h-10 text-base sm:text-sm font-semibold px-3 rounded-lg focus:outline-none transition-colors"
                  style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.2)', color: '#2d1f0e' }} />
              </div>
              <div className="rounded-xl overflow-hidden h-40 flex items-center justify-center" style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.2)' }}>
                {configForm.factory_lat && configForm.factory_lon ? (
                  <div className="text-center" style={{ color: '#9a7a5a' }}>
                    <MapPin className="w-8 h-8 mx-auto mb-1" style={{ color: '#c8834a' }} />
                    <p className="text-[11px] font-bold" style={{ color: '#2d1f0e' }}>
                      {parseFloat(configForm.factory_lat).toFixed(5)}, {parseFloat(configForm.factory_lon).toFixed(5)}
                    </p>
                    <p className="text-[10px] mt-0.5">Radius: {configForm.radius_m} m</p>
                    <p className="text-[9px] mt-2 font-semibold max-w-[180px] mx-auto opacity-70">
                      Mount Leaflet here — L.map() + L.circle() with radius_m
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] font-semibold opacity-70" style={{ color: '#9a7a5a' }}>Enter coordinates to preview geofence</p>
                )}
              </div>
            </div>
          </div>
        )}

        {!configLoading && (
          <div className="flex justify-end pt-5" style={{ borderTop: '1px solid rgba(200,131,74,0.1)' }}>
            <button onClick={handleSaveConfig} disabled={configSaving}
              className="h-11 px-8 text-xs font-black flex items-center gap-2 rounded-xl text-white shadow-md transition-all active:scale-95 hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}>
              {configSaving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                : <><CheckCircle2 className="w-4 h-4" /> Save Configuration</>}
            </button>
          </div>
        )}
      </SpotlightCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT EXPORT — Attendance Module Router
// ═══════════════════════════════════════════════════════════════════════════════
export default function AttendancePage() {
  const { user, token } = useAuth();

  const isManager = user === 'direct_manager';
  const isSupervisor = user === 'cutting_manager' || user === 'stitching_manager' || isManager;

  const tabs = [
    { key: 'me', label: 'My Attendance', icon: Clock, show: true },
    { key: 'proxy', label: 'Floor Command', icon: Users, show: isSupervisor },
    { key: 'admin', label: 'Operations & HR', icon: Building2, show: isManager },
  ].filter((t) => t.show);

  const [activeTab, setActiveTab] = useState('me');
  const [workers, setWorkers] = useState([]);
  const [workerRefreshKey, setWorkerRefreshKey] = useState(0);

  const refreshWorkers = () => {
    setWorkerRefreshKey(k => k + 1);
  };

  useEffect(() => {
    if ((activeTab === 'proxy' || activeTab === 'admin')) {
      apiFetch('/api/v1/employees', {}, token)
        .then(setWorkers)
        .catch(() => { });
    }
  }, [activeTab, token, workerRefreshKey]);

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b overflow-x-auto" style={{ borderBottomColor: 'rgba(200,131,74,0.2)' }}>
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className="flex items-center gap-2 px-4 py-3 text-xs font-black whitespace-nowrap border-b-2 transition-colors"
            style={{
              borderColor: activeTab === key ? '#c8834a' : 'transparent',
              color: activeTab === key ? '#c8834a' : '#9a7a5a',
            }}>
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Views */}
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
// 'use client';
// import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
// import { useAuth } from '@/context/AuthContext';
// import {
//   MapPin, CheckCircle2, LogIn, LogOut, Clock, AlertTriangle,
//   Users, Search, Settings, ChevronLeft, ChevronRight,
//   Lock, RefreshCw, CheckSquare, Square, X,
//   Timer, CalendarDays, Shield, Zap, Filter,
//   UserPlus, AlertCircle, Loader2, Building2, Activity, WifiOff
// } from 'lucide-react';
// import SpotlightCard from '@/components/SpotlightCard';
// import { createPortal } from 'react-dom';

// // ─── API BASE ────────────────────────────────────────────────────────────────
// const API = '/api/v1/attendance';

// // ─── HELPERS ─────────────────────────────────────────────────────────────────
// function fmtTime(isoUtc) {
//   if (!isoUtc) return '—';
//   return new Intl.DateTimeFormat('en-IN', {
//     hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
//   }).format(new Date(isoUtc));
// }
// function fmtDate(isoDate) {
//   if (!isoDate) return '—';
//   return new Intl.DateTimeFormat('en-IN', {
//     day: '2-digit', month: 'short', year: 'numeric',
//   }).format(new Date(isoDate));
// }
// function fmtDist(m) {
//   if (m == null) return '—';
//   return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(2)} km`;
// }
// function padTime(secs) {
//   if (secs == null || secs < 0) return '00:00:00';
//   const h = Math.floor(secs / 3600);
//   const m = Math.floor((secs % 3600) / 60);
//   const s = secs % 60;
//   return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
// }

// // ─── FETCH HELPER ────────────────────────────────────────────────────────────
// async function apiFetch(url, options = {}, token = null) {
//   const res = await fetch(url, {
//     ...options,
//     headers: {
//       'Content-Type': 'application/json',
//       ...(token ? { Authorization: `Bearer ${token}` } : {}),
//       ...options.headers,
//     },
//   });
//   if (!res.ok) {
//     let errMsg = `Server error: ${res.status}`;
//     try {
//       const body = await res.json();
//       errMsg = body.detail || errMsg;
//     } catch { }
//     const err = new Error(errMsg);
//     err.status = res.status;
//     throw err;
//   }
//   return res.json();
// }

// // ─── GPS HOOK ─────────────────────────────────────────────────────────────────
// function useGps() {
//   const [state, setState] = useState({ lat: null, lon: null, error: null, loading: false });
//   const getPosition = useCallback(() => {
//     return new Promise((resolve, reject) => {
//       setState((s) => ({ ...s, loading: true, error: null }));
//       if (!navigator.geolocation) {
//         const err = 'Geolocation is not supported by this browser.';
//         setState((s) => ({ ...s, loading: false, error: err }));
//         return reject(err);
//       }
//       navigator.geolocation.getCurrentPosition(
//         (pos) => {
//           const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
//           setState({ ...coords, loading: false, error: null });
//           resolve(coords);
//         },
//         (err) => {
//           const msg =
//             err.code === 1
//               ? 'Location access denied. Enable GPS to check in/out.'
//               : 'Unable to retrieve location. Please try again.';
//           setState({ lat: null, lon: null, loading: false, error: msg });
//           reject(msg);
//         },
//         { timeout: 10000, maximumAge: 30000 }
//       );
//     });
//   }, []);
//   return { ...state, getPosition };
// }

// // ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
// function Badge({ label, type }) {
//   const map = {
//     late: 'bg-red-100 text-red-700 border-red-200',
//     short: 'bg-orange-100 text-orange-700 border-orange-200',
//     overtime: 'bg-purple-100 text-purple-700 border-purple-200',
//     self: 'bg-blue-100 text-blue-700 border-blue-200',
//     proxy: 'bg-amber-100 text-amber-700 border-amber-200',
//     active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
//     frozen: 'bg-slate-100 text-slate-600 border-slate-200',
//   };
//   return (
//     <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${map[type] || map.frozen}`}>
//       {label}
//     </span>
//   );
// }

// function AlertBanner({ type, message, onClose }) {
//   if (!message) return null;
//   const styles = {
//     success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
//     error: 'bg-red-50 border-red-200 text-red-800',
//     warning: 'bg-amber-50 border-amber-200 text-amber-800',
//     info: 'bg-blue-50 border-blue-200 text-blue-800',
//   };
//   const icons = { success: CheckCircle2, error: AlertCircle, warning: AlertTriangle, info: Activity };
//   const Icon = icons[type] || AlertCircle;
//   return (
//     <div className={`flex items-start gap-2.5 p-4 rounded-xl border text-sm font-semibold shadow-sm animate-fade-in ${styles[type] || styles.info}`}>
//       <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
//       <p className="flex-1">{message}</p>
//       {onClose && (
//         <button onClick={onClose} className="opacity-60 hover:opacity-100">
//           <X className="w-4 h-4" />
//         </button>
//       )}
//     </div>
//   );
// }

// function GpsWarning({ error }) {
//   if (!error) return null;
//   return (
//     <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-semibold">
//       <WifiOff className="w-5 h-5 flex-shrink-0" />
//       <span>{error}</span>
//     </div>
//   );
// }

// function Paginator({ page, totalPages, setPage, total, perPage }) {
//   if (totalPages <= 1) return null;
//   return (
//     <div className="flex items-center justify-between pt-2">
//       <span className="text-xs text-slate-400 font-semibold">
//         {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
//       </span>
//       <div className="flex items-center gap-1">
//         <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
//           className="btn-secondary h-8 w-8 p-0 flex items-center justify-center disabled:opacity-30">
//           <ChevronLeft className="w-4 h-4" />
//         </button>
//         {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
//           <button key={pg} onClick={() => setPage(pg)}
//             className={`h-8 w-8 rounded-lg text-xs font-black transition-colors ${pg === page ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
//             {pg}
//           </button>
//         ))}
//         <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
//           className="btn-secondary h-8 w-8 p-0 flex items-center justify-center disabled:opacity-30">
//           <ChevronRight className="w-4 h-4" />
//         </button>
//       </div>
//     </div>
//   );
// }

// function LockedView({ title, description }) {
//   return (
//     <SpotlightCard className="p-12 shadow text-center space-y-3 rounded-3xl" style={{ background: '#fff9f0', border: '1px solid rgba(200,131,74,0.3)' }} spotlightColor="rgba(200,131,74,0.1)">
//       <Lock className="w-12 h-12 mx-auto" style={{ color: '#c8834a' }} />
//       <h3 className="font-black uppercase tracking-wide" style={{ color: '#9c4221' }}>{title}</h3>
//       <p className="text-xs font-semibold max-w-md mx-auto" style={{ color: '#a86022' }}>{description}</p>
//     </SpotlightCard>
//   );
// }

// // ═══════════════════════════════════════════════════════════════════════════════
// // VIEW A — MY ATTENDANCE
// // ═══════════════════════════════════════════════════════════════════════════════
// function MyAttendanceView({ token }) {
//   const gps = useGps();

//   const [status, setStatus] = useState(null);
//   const [statusLoading, setStatusLoading] = useState(true);
//   const [countdown, setCountdown] = useState(null);
//   const intervalRef = useRef(null);

//   const [history, setHistory] = useState([]);
//   const [histLoading, setHistLoading] = useState(true);
//   const [startDate, setStartDate] = useState(() => {
//     const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0];
//   });
//   const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
//   const [page, setPage] = useState(1);
//   const PER_PAGE = 8;

//   const [actionLoading, setActionLoading] = useState(false);
//   const [alert, setAlert] = useState(null);

//   const showAlert = (type, message) => {
//     setAlert({ type, message });
//     if (type === 'success') setTimeout(() => setAlert(null), 5000);
//   };

//   const fetchStatus = useCallback(async () => {
//     try {
//       const data = await apiFetch(`${API}/me/status`, {}, token);
//       setStatus(data);
//       if (data.remaining_seconds != null && data.checked_in && !data.checked_out) {
//         setCountdown(data.remaining_seconds);
//       } else {
//         setCountdown(null);
//       }
//     } catch (e) {
//       console.error('Status fetch failed:', e.message);
//       try {
//         const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
//         const histData = await apiFetch(`${API}/me?start=${todayStr}&end=${todayStr}`, {}, token);
//         const todayRec = histData.find(r => r.work_date === todayStr);
//         if (todayRec) {
//           setStatus({
//             checked_in: true,
//             checked_out: !!todayRec.check_out_at,
//             check_in_at: todayRec.check_in_at,
//             is_late: todayRec.is_late,
//             is_short: todayRec.is_short,
//             is_overtime: todayRec.is_overtime,
//             shift_end_at: null,
//             remaining_seconds: null,
//           });
//         } else {
//           setStatus(null);
//         }
//         setCountdown(null);
//       } catch { }
//     } finally {
//       setStatusLoading(false);
//     }
//   }, [token]);

//   const fetchHistory = useCallback(async () => {
//     setHistLoading(true);
//     try {
//       const data = await apiFetch(`${API}/me?start=${startDate}&end=${endDate}`, {}, token);
//       setHistory([...data].reverse());
//     } catch (e) {
//       showAlert('error', e.message || 'Failed to load history.');
//     } finally {
//       setHistLoading(false);
//     }
//   }, [startDate, endDate, token]);

//   useEffect(() => { fetchStatus(); }, [fetchStatus]);
//   useEffect(() => { fetchHistory(); setPage(1); }, [fetchHistory]);

//   useEffect(() => {
//     if (intervalRef.current) clearInterval(intervalRef.current);
//     if (status?.remaining_seconds == null || status?.checked_out) return;
//     intervalRef.current = setInterval(() => {
//       setCountdown((prev) => {
//         if (prev == null || prev <= 0) { clearInterval(intervalRef.current); return 0; }
//         return prev - 1;
//       });
//     }, 1000);
//     return () => clearInterval(intervalRef.current);
//   }, [status]);

//   const handleCheckIn = async () => {
//     setActionLoading(true);
//     try {
//       const coords = await gps.getPosition();
//       await apiFetch(`${API}/check-in`, { method: 'POST', body: JSON.stringify(coords) }, token);
//       showAlert('success', 'Checked in successfully!');
//       await fetchStatus();
//       await fetchHistory();
//     } catch (e) {
//       if (e.status === 403) showAlert('error', `Geofence violation — ${e.message}`);
//       else showAlert('error', typeof e === 'string' ? e : e.message || 'Check-in failed.');
//     } finally {
//       setActionLoading(false);
//     }
//   };

//   const handleCheckOut = async () => {
//     setActionLoading(true);
//     try {
//       const coords = await gps.getPosition();
//       await apiFetch(`${API}/check-out`, { method: 'POST', body: JSON.stringify(coords) }, token);
//       showAlert('success', 'Checked out. Shift complete!');
//       clearInterval(intervalRef.current);
//       await fetchStatus();
//       await fetchHistory();
//     } catch (e) {
//       if (e.status === 403) showAlert('error', `Geofence violation — ${e.message}`);
//       else showAlert('error', typeof e === 'string' ? e : e.message || 'Check-out failed.');
//     } finally {
//       setActionLoading(false);
//     }
//   };

//   const paginated = useMemo(() => history.slice((page - 1) * PER_PAGE, page * PER_PAGE), [history, page]);
//   const totalPages = Math.ceil(history.length / PER_PAGE);
//   const checkedIn = status?.checked_in ?? false;
//   const checkedOut = status?.checked_out ?? false;
//   const gpsBlocked = !!gps.error;
//   const busy = actionLoading || gps.loading;

//   return (
//     <div className="space-y-6 animate-fade-in">
//       <div>
//         <h1 className="text-3xl font-black tracking-tight" style={{ color: '#2d1f0e' }}>My Attendance</h1>
//         <p className="font-medium mt-1" style={{ color: '#9a7a5a' }}>Track your shift status and review personal attendance history.</p>
//       </div>

//       {alert && <AlertBanner type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}
//       <GpsWarning error={gps.error} />

//       {/* Hero row */}
//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

//         {/* Shift Timer */}
//         <SpotlightCard className="p-6 bg-white shadow-xl space-y-4 rounded-3xl" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.06)">
//           <h3 className="text-sm font-extrabold uppercase tracking-widest flex items-center gap-2" style={{ color: '#9a7a5a' }}>
//             <Timer className="w-4 h-4" style={{ color: '#c8834a' }} /> Shift Timer
//           </h3>
//           {statusLoading ? (
//             <div className="flex items-center justify-center h-24">
//               <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#c8834a' }} />
//             </div>
//           ) : (
//             <>
//               <div className={`text-5xl font-black tabular-nums tracking-tight`} style={{ color: checkedIn && !checkedOut ? '#c8834a' : '#d1d5db' }}>
//                 {checkedIn && !checkedOut ? padTime(countdown) : '—:—:—'}
//               </div>
//               <div className="text-xs font-bold" style={{ color: '#9a7a5a' }}>
//                 {!checkedIn && 'Not checked in today'}
//                 {checkedIn && !checkedOut && status?.shift_end_at && (
//                   <span>Ends at <strong style={{ color: '#2d1f0e' }}>{fmtTime(status.shift_end_at)}</strong></span>
//                 )}
//                 {checkedOut && <span className="font-black" style={{ color: '#38a169' }}>✓ Shift complete</span>}
//               </div>
//               {status?.check_in_at && (
//                 <div className="text-[11px] font-semibold pt-3" style={{ borderTop: '1px solid rgba(200,131,74,0.1)', color: '#9a7a5a' }}>
//                   Clocked in: <strong style={{ color: '#2d1f0e' }}>{fmtTime(status.check_in_at)}</strong>
//                 </div>
//               )}
//             </>
//           )}
//         </SpotlightCard>

//         {/* Action Terminal */}
//         <SpotlightCard className="lg:col-span-2 p-6 bg-white shadow-xl space-y-5 rounded-3xl" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.06)">
//           <h3 className="text-sm font-extrabold uppercase tracking-widest flex items-center gap-2" style={{ color: '#9a7a5a' }}>
//             <Zap className="w-4 h-4" style={{ color: '#c8834a' }} /> Action Terminal
//           </h3>
//           <div className="flex flex-col gap-3">
//             <button onClick={handleCheckIn}
//               disabled={checkedIn || gpsBlocked || busy}
//               className="w-full flex items-center justify-center gap-3 h-14 sm:h-16 min-h-[56px] rounded-2xl font-black text-base sm:text-sm text-white transition-all shadow-lg shadow-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation hover:-translate-y-0.5 active:translate-y-0"
//               style={{ background: 'linear-gradient(135deg, #38a169, #48bb78)' }}>
//               {busy && !checkedIn
//                 ? <><Loader2 className="w-5 h-5 animate-spin" /> Fetching GPS…</>
//                 : <><LogIn className="w-5 h-5" /> Check In</>}
//             </button>
//             <button onClick={handleCheckOut}
//               disabled={!checkedIn || checkedOut || gpsBlocked || busy}
//               className="w-full flex items-center justify-center gap-3 h-14 sm:h-16 min-h-[56px] rounded-2xl font-black text-base sm:text-sm text-white transition-all shadow-lg shadow-red-200 disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation hover:-translate-y-0.5 active:translate-y-0"
//               style={{ background: 'linear-gradient(135deg, #e53e3e, #f56565)' }}>
//               {busy && checkedIn && !checkedOut
//                 ? <><Loader2 className="w-5 h-5 animate-spin" /> Fetching GPS…</>
//                 : <><LogOut className="w-5 h-5" /> Check Out</>}
//             </button>
//           </div>
//           <div className="flex items-center gap-2 text-[11px] font-semibold" style={{ color: '#9a7a5a' }}>
//             {gps.lat
//               ? <><MapPin className="w-3.5 h-3.5" style={{ color: '#38a169' }} /> GPS active — {gps.lat.toFixed(5)}, {gps.lon.toFixed(5)}</>
//               : <><MapPin className="w-3.5 h-3.5" style={{ color: '#d1d5db' }} /> GPS coordinates resolved on action</>}
//           </div>
//           {checkedIn && (
//             <div className="flex flex-wrap gap-2 pt-4" style={{ borderTop: '1px solid rgba(200,131,74,0.1)' }}>
//               {status?.is_late && <Badge label="Late" type="late" />}
//               {status?.is_short && <Badge label="Short Shift" type="short" />}
//               {status?.is_overtime && <Badge label="Overtime" type="overtime" />}
//               {!status?.is_late && <Badge label="On Time" type="active" />}
//             </div>
//           )}
//         </SpotlightCard>
//       </div>

//       {/* Personal History */}
//       <SpotlightCard className="p-6 bg-white shadow-xl space-y-5 rounded-3xl" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.06)">
//         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4" style={{ borderBottom: '1px solid rgba(200,131,74,0.1)' }}>
//           <h3 className="text-lg font-extrabold flex items-center gap-2" style={{ color: '#2d1f0e' }}>
//             <CalendarDays className="w-5 h-5" style={{ color: '#c8834a' }} /> Attendance History
//           </h3>
//           <div className="flex flex-wrap items-center gap-2">
//             <input type="date" value={startDate}
//               onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
//               className="px-3 py-2 text-xs font-bold rounded-xl cursor-pointer flex-1 min-w-[130px] focus:outline-none transition-all" style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.2)', color: '#2d1f0e' }} />
//             <span className="font-bold text-xs" style={{ color: '#9a7a5a' }}>to</span>
//             <input type="date" value={endDate}
//               onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
//               className="px-3 py-2 text-xs font-bold rounded-xl cursor-pointer flex-1 min-w-[130px] focus:outline-none transition-all" style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.2)', color: '#2d1f0e' }} />
//           </div>
//         </div>

//         {histLoading ? (
//           <div className="flex items-center justify-center py-12">
//             <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#c8834a' }} />
//           </div>
//         ) : history.length === 0 ? (
//           <div className="text-center py-12" style={{ color: '#9a7a5a' }}>
//             <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-50" />
//             <p className="font-semibold text-sm">No attendance records found for this period.</p>
//           </div>
//         ) : (
//           <>
//             {/* Desktop table — hidden on mobile */}
//             <div className="hidden sm:block overflow-x-auto rounded-xl" style={{ border: '1px solid rgba(200,131,74,0.15)' }}>
//               <table className="w-full text-left text-xs font-semibold">
//                 <thead>
//                   <tr className="font-bold uppercase tracking-wider" style={{ background: '#faf6f0', borderBottom: '1px solid rgba(200,131,74,0.15)', color: '#9a7a5a' }}>
//                     <th className="p-3">Date</th>
//                     <th className="p-3">Check In</th>
//                     <th className="p-3">Check Out</th>
//                     <th className="p-3">Distance</th>
//                     <th className="p-3">Source</th>
//                     <th className="p-3">Flags</th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y" style={{ divideColor: 'rgba(200,131,74,0.1)', color: '#2d1f0e' }}>
//                   {paginated.map((row) => (
//                     <tr key={row.id} className="hover:bg-[#fcfaf8] transition-colors">
//                       <td className="p-3 font-black" style={{ color: '#2d1f0e' }}>{fmtDate(row.work_date)}</td>
//                       <td className="p-3">{fmtTime(row.check_in_at)}</td>
//                       <td className="p-3">
//                         {row.check_out_at
//                           ? fmtTime(row.check_out_at)
//                           : <span className="font-black" style={{ color: '#38a169' }}>Active</span>}
//                       </td>
//                       <td className="p-3" style={{ color: '#9a7a5a' }}>{fmtDist(row.distance_m)}</td>
//                       <td className="p-3"><Badge label={row.source} type={row.source} /></td>
//                       <td className="p-3">
//                         <div className="flex flex-wrap gap-1">
//                           {row.is_late && <Badge label="Late" type="late" />}
//                           {row.is_short && <Badge label="Short" type="short" />}
//                           {row.is_overtime && <Badge label="OT" type="overtime" />}
//                           {!row.is_late && !row.is_short && !row.is_overtime && <Badge label="Clean" type="active" />}
//                         </div>
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>

//             {/* Mobile cards — shown only on mobile */}
//             <div className="sm:hidden space-y-3">
//               {paginated.map((row) => (
//                 <div key={row.id} className="rounded-xl p-4 space-y-3" style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.1)' }}>
//                   <div className="flex items-center justify-between">
//                     <span className="font-black text-sm" style={{ color: '#2d1f0e' }}>{fmtDate(row.work_date)}</span>
//                     <Badge label={row.source} type={row.source} />
//                   </div>
//                   <div className="grid grid-cols-2 gap-2 text-xs">
//                     <div>
//                       <p className="font-bold uppercase tracking-wider text-[10px] mb-0.5" style={{ color: '#9a7a5a' }}>Check In</p>
//                       <p className="font-black" style={{ color: '#2d1f0e' }}>{fmtTime(row.check_in_at)}</p>
//                     </div>
//                     <div>
//                       <p className="font-bold uppercase tracking-wider text-[10px] mb-0.5" style={{ color: '#9a7a5a' }}>Check Out</p>
//                       <p className="font-black" style={{ color: '#2d1f0e' }}>
//                         {row.check_out_at
//                           ? fmtTime(row.check_out_at)
//                           : <span style={{ color: '#38a169' }}>Active</span>}
//                       </p>
//                     </div>
//                     <div>
//                       <p className="font-bold uppercase tracking-wider text-[10px] mb-0.5" style={{ color: '#9a7a5a' }}>Distance</p>
//                       <p className="font-semibold" style={{ color: '#a86022' }}>{fmtDist(row.distance_m)}</p>
//                     </div>
//                     <div>
//                       <p className="font-bold uppercase tracking-wider text-[10px] mb-0.5" style={{ color: '#9a7a5a' }}>Flags</p>
//                       <div className="flex flex-wrap gap-1">
//                         {row.is_late && <Badge label="Late" type="late" />}
//                         {row.is_short && <Badge label="Short" type="short" />}
//                         {row.is_overtime && <Badge label="OT" type="overtime" />}
//                         {!row.is_late && !row.is_short && !row.is_overtime && <Badge label="Clean" type="active" />}
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//             <Paginator page={page} totalPages={totalPages} setPage={setPage} total={history.length} perPage={PER_PAGE} />
//           </>
//         )}
//       </SpotlightCard>
//     </div>
//   );
// }

// // ═══════════════════════════════════════════════════════════════════════════════
// // VIEW B — FLOOR COMMAND
// // ═══════════════════════════════════════════════════════════════════════════════
// function FloorCommandView({ workers = [], token }) {
//   const gps = useGps();

//   const [search, setSearch] = useState('');
//   const [selected, setSelected] = useState(new Set());
//   const [actionLoading, setActionLoading] = useState(false);
//   const [alert, setAlert] = useState(null);
//   const [diffModal, setDiffModal] = useState(null);

//   // Unified State for Add Worker
//   const [addModal, setAddModal] = useState(false);
//   const [addForm, setAddForm] = useState({ name: '', phone: '', designation: '', wage_type: 'piece_rate', daily_rate: '', password: '' });
//   const [addLoading, setAddLoading] = useState(false);

//   const showAlert = (type, message) => {
//     setAlert({ type, message });
//     if (type === 'success') setTimeout(() => setAlert(null), 6000);
//   };

//   const handleAddWorker = async () => {
//     const { name, phone, designation, wage_type, daily_rate, password } = addForm;
//     if (!name.trim() || !designation.trim()) {
//       showAlert('warning', 'Name and designation are required.');
//       return;
//     }
//     if (wage_type === 'monthly' && (!phone.trim() || !password.trim())) {
//       showAlert('warning', 'Phone number and password are required for monthly employees.');
//       return;
//     }
//     setAddLoading(true);
//     try {
//       await gps.getPosition();

//       const payload = {
//         name: name.trim(),
//         designation: designation.trim(),
//         wage_type: wage_type,
//         phone: phone.trim() || null,
//         password: wage_type === 'monthly' ? password : null,
//         daily_rate: daily_rate ? parseFloat(daily_rate) : null,
//       };

//       await apiFetch(`/api/v1/employees`, {
//         method: 'POST',
//         body: JSON.stringify(payload),
//       }, token);

//       showAlert('success', `Worker "${name}" onboarded to floor roster.`);
//       setAddModal(false);
//       setAddForm({ name: '', phone: '', designation: '', wage_type: 'piece_rate', daily_rate: '', password: '' });
//     } catch (e) {
//       if (e.status === 403) showAlert('error', `Geofence check failed: ${e.message}`);
//       else showAlert('error', typeof e === 'string' ? e : e.message || 'Failed to add worker.');
//     } finally {
//       setAddLoading(false);
//     }
//   };

//   const dailyWorkers = useMemo(() => {
 
//   return workers; 
// }, [workers]);

//   const filtered = useMemo(() => {
//     const q = search.trim().toLowerCase();
//     if (!q) return dailyWorkers;
//     return dailyWorkers.filter(
//       (w) => w.name?.toLowerCase().includes(q) || String(w.id).includes(q)
//     );
//   }, [dailyWorkers, search]);

//   const toggleSelect = (id) =>
//     setSelected((prev) => {
//       const next = new Set(prev);
//       next.has(id) ? next.delete(id) : next.add(id);
//       return next;
//     });

//   const toggleAll = () =>
//     setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map((w) => w.id)));

//   const batchAction = async (type) => {
//     if (selected.size === 0) return;
//     setActionLoading(true);
//     try {
//       const coords = await gps.getPosition();
//       const requestedIds = [...selected];
//       const endpoint = type === 'check-in' ? `${API}/proxy/check-in` : `${API}/proxy/check-out`;
//       const result = await apiFetch(endpoint, {
//         method: 'POST',
//         body: JSON.stringify({ employee_ids: requestedIds, lat: coords.lat, lon: coords.lon }),
//       }, token);
//       const succeededIds = new Set(result.map((r) => String(r.employee_id)));
//       const normalizedRequested = requestedIds.map((id) => String(id));
//       const succeeded = normalizedRequested.filter((id) => succeededIds.has(id));
//       const failed = normalizedRequested.filter((id) => !succeededIds.has(id));
//       setSelected(new Set());
//       setTimeout(() => setDiffModal({ type, succeeded, failed }), 0);
//     } catch (e) {
//       if (e.status === 403) showAlert('error', `Geofence: ${e.message}`);
//       else showAlert('error', typeof e === 'string' ? e : e.message || 'Batch action failed.');
//     } finally {
//       setActionLoading(false);
//     }
//   };

//   return (
//     <div className="space-y-6 animate-fade-in">
//       <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
//         <div>
//           <h1 className="text-3xl font-black tracking-tight" style={{ color: '#2d1f0e' }}>Floor Command</h1>
//           <p className="font-medium mt-1" style={{ color: '#9a7a5a' }}>Proxy check-in / check-out for daily-wage floor workers.</p>
//         </div>
//         <div className="flex items-center gap-2 self-start sm:self-auto">
//           <button onClick={() => setAddModal(true)}
//             className="btn-primary h-10 px-4 text-xs font-black flex items-center gap-2">
//             <UserPlus className="w-4 h-4" /> Add Worker
//           </button>
//         </div>
//       </div>

//       {alert && <AlertBanner type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}
//       <GpsWarning error={gps.error} />

//       {/* Roster table */}
//       <SpotlightCard className="p-6 bg-white shadow-xl space-y-4 relative overflow-hidden rounded-3xl" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.06)">
//         <div className="flex flex-col sm:flex-row sm:items-center gap-3 pb-4" style={{ borderBottom: '1px solid rgba(200,131,74,0.1)' }}>
//           <h3 className="text-lg font-extrabold flex items-center gap-2 flex-1" style={{ color: '#2d1f0e' }}>
//             <Users className="w-5 h-5" style={{ color: '#c8834a' }} /> Daily Wage Roster
//             <span className="ml-2 text-xs font-black px-2 py-0.5 rounded-full" style={{ background: '#faf6f0', color: '#a86022', border: '1px solid rgba(200,131,74,0.2)' }}>
//               {dailyWorkers.length} workers
//             </span>
//           </h3>
//           <div className="relative flex items-center">
//             <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" style={{ color: '#9a7a5a' }} />
//             <input
//               type="text"
//               placeholder="Search workers…"
//               value={search}
//               onChange={(e) => setSearch(e.target.value)}
//               className="h-9 w-full sm:w-52 rounded-lg pl-9 pr-3 text-xs font-semibold focus:outline-none transition-colors"
//               style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.2)', color: '#2d1f0e' }}
//             />
//           </div>
//         </div>

//         {filtered.length === 0 ? (
//           <div className="text-center py-12" style={{ color: '#9a7a5a' }}>
//             <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
//             <p className="font-semibold text-sm">No daily-wage workers found.</p>
//           </div>
//         ) : (
//           <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid rgba(200,131,74,0.15)' }}>
//             <table className="w-full text-left text-xs font-semibold">
//               <thead>
//                 <tr className="font-bold uppercase tracking-wider" style={{ background: '#faf6f0', borderBottom: '1px solid rgba(200,131,74,0.15)', color: '#9a7a5a' }}>
//                   <th className="p-3 w-10">
//                     <button onClick={toggleAll} className="hover:opacity-80 transition-opacity">
//                       {selected.size === filtered.length && filtered.length > 0
//                         ? <CheckSquare className="w-4 h-4" style={{ color: '#c8834a' }} />
//                         : <Square className="w-4 h-4" style={{ color: '#9a7a5a' }} />}
//                     </button>
//                   </th>
//                   <th className="p-3">Worker</th>
//                   <th className="p-3">Designation</th>
//                   <th className="p-3">Type</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y" style={{ divideColor: 'rgba(200,131,74,0.1)' }}>
//                 {filtered.map((w) => (
//                   <tr key={w.id} onClick={() => toggleSelect(w.id)}
//                     className="cursor-pointer transition-colors" style={{ background: selected.has(w.id) ? '#fff9f0' : 'transparent' }}>
//                     <td className="p-3">
//                       {selected.has(w.id)
//                         ? <CheckSquare className="w-4 h-4" style={{ color: '#c8834a' }} />
//                         : <Square className="w-4 h-4" style={{ color: '#d1d5db' }} />}
//                     </td>
//                     <td className="p-3">
//                       <span className="block font-black" style={{ color: '#2d1f0e' }}>{w.name}</span>
//                       <span className="block text-[10px] font-mono" style={{ color: '#9a7a5a' }}>{String(w.id).slice(0, 8)}…</span>
//                     </td>
//                     <td className="p-3 font-semibold" style={{ color: '#a86022' }}>{w.designation || '—'}</td>
              
// <td className="p-3">
//   <Badge 
//     label={w.wage_type === 'piece_rate' ? 'Daily Wage' : 'Monthly'} 
//     type={w.wage_type === 'piece_rate' ? 'proxy' : 'active'} 
//   />
// </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         )}
//       </SpotlightCard>

//       {/* Floating batch action bar */}
//       {selected.size > 0 && (
//         <div className="fixed sm:absolute bottom-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-40 flex flex-wrap sm:flex-nowrap items-center justify-center gap-2 sm:gap-3 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl animate-fade-in border border-slate-700">
//           <span className="text-xs font-black text-slate-300">{selected.size} selected</span>
//           <div className="w-px h-5 bg-slate-700" />
//           <button onClick={() => batchAction('check-in')} disabled={actionLoading || !!gps.error}
//             className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black px-4 py-2 rounded-xl disabled:opacity-50 transition-colors">
//             {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
//             Batch Check-In
//           </button>
//           <button onClick={() => batchAction('check-out')} disabled={actionLoading || !!gps.error}
//             className="flex items-center gap-2 border border-slate-600 text-slate-200 hover:bg-slate-800 text-xs font-black px-4 py-2 rounded-xl disabled:opacity-50 transition-colors">
//             {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
//             Batch Check-Out
//           </button>
//           <button onClick={() => setSelected(new Set())} className="text-slate-500 hover:text-slate-300 ml-1">
//             <X className="w-4 h-4" />
//           </button>
//         </div>
//       )}

//       {/* Diff result modal */}
//       {diffModal && (
//         <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[999] flex items-end sm:items-center justify-center p-0 sm:p-4">
//           <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-4 animate-fade-in">
//             <div className="sm:hidden w-10 h-1.5 bg-slate-200 rounded-full mx-auto -mt-1" />
//             <div className="flex items-center justify-between">
//               <h3 className="font-black text-slate-900 text-base sm:text-lg">
//                 {diffModal.type === 'check-in' ? 'Check-In' : 'Check-Out'} Results
//               </h3>
//               <button onClick={() => setDiffModal(null)}><X className="w-5 h-5 text-slate-400" /></button>
//             </div>
//             <div className="space-y-3">
//               <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
//                 <p className="text-xs font-black text-emerald-700 mb-1">✓ Succeeded ({diffModal.succeeded.length})</p>
//                 <p className="text-[11px] text-emerald-600 font-semibold">
//                   {diffModal.succeeded.length > 0
//                     ? `${diffModal.succeeded.length} worker(s) marked successfully.`
//                     : 'None succeeded.'}
//                 </p>
//               </div>
//               {diffModal.failed.length > 0 && (
//                 <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
//                   <p className="text-xs font-black text-red-700 mb-1">✗ Skipped ({diffModal.failed.length})</p>
//                   <div className="space-y-0.5 max-h-32 overflow-y-auto">
//                     {diffModal.failed.map((id) => (
//                       <p key={id} className="text-[11px] text-red-600 font-semibold font-mono">{id}</p>
//                     ))}
//                   </div>
//                   <p className="text-[10px] text-red-400 mt-2 font-semibold">
//                     These workers may already be checked in/out, or IDs are invalid.
//                   </p>
//                 </div>
//               )}
//             </div>
//             <button onClick={() => setDiffModal(null)} className="btn-primary w-full h-11 sm:h-10 text-xs font-black">Done</button>
//           </div>
//         </div>
//       )}

//       {/* Add floor worker modal */}
//       {addModal && (
//         <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
//           <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl max-h-[85vh] flex flex-col animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="add-worker-title">
//             <div className="flex-shrink-0 flex items-center justify-between p-5 sm:p-6 border-b border-slate-100">
//               <h3 className="font-black text-slate-900 text-base sm:text-lg flex items-center gap-2">
//                 <UserPlus className="w-5 h-5 text-blue-600" /> Add Floor Worker
//               </h3>
//               <button onClick={() => setAddModal(false)} className="p-1 -m-1 text-slate-400 hover:text-slate-600">
//                 <X className="w-5 h-5" aria-label="Close modal" />
//               </button>
//             </div>

//             <div className="flex-1 p-5 sm:p-6 space-y-4 overflow-y-auto min-h-[100px]">
//               <p className="text-xs text-slate-400 font-semibold leading-relaxed">
//                 GPS location will be verified before submission — floor-only onboarding rule.
//               </p>
//               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                 <div className="sm:col-span-2">
//                   <label className="input-label text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-1">Full Name *</label>
//                   <input type="text" value={addForm.name} placeholder="e.g. Ramesh Kumar"
//                     onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
//                     className="input-field w-full h-10 px-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
//                 </div>
//                 <div>
//                   <label className="input-label text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-1">Designation *</label>
//                   <input type="text" value={addForm.designation} placeholder="e.g. Cutter, Stitcher, Helper"
//                     onChange={(e) => setAddForm((f) => ({ ...f, designation: e.target.value }))}
//                     className="input-field w-full h-10 px-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
//                 </div>
//                 <div>
//                   <label className="input-label text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-1">Wage Type</label>
//                   <select value={addForm.wage_type}
//                     onChange={(e) => setAddForm(f => ({ ...f, wage_type: e.target.value, password: '' }))}
//                     className="input-field w-full h-10 px-3 text-xs font-bold rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20">
//                     <option value="piece_rate">Piece Rate / Daily Wage</option>
//                     <option value="monthly">Monthly Salary</option>
//                   </select>
//                 </div>
//                 {addForm.wage_type === 'monthly' ? (
//                   <>
//                     <div>
//                       <label className="input-label text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-1">Phone Number *</label>
//                       <input type="tel" inputMode="numeric" pattern="[0-9]*" value={addForm.phone} placeholder="10-digit mobile number"
//                         onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))}
//                         className="input-field w-full h-10 px-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
//                     </div>
//                     <div>
//                       <label className="input-label text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-1">Set Password *</label>
//                       <input type="password" value={addForm.password} placeholder="Min. 6 characters"
//                         onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))}
//                         className="input-field w-full h-10 px-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
//                     </div>
//                   </>
//                 ) : (
//                   <>
//                     <div>
//                       <label className="input-label text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-1">Phone Number (Optional)</label>
//                       <input type="tel" inputMode="numeric" pattern="[0-9]*" value={addForm.phone} placeholder="Optional for daily workers"
//                         onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))}
//                         className="input-field w-full h-10 px-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
//                     </div>
//                     <div>
//                       <label className="input-label text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-1">Daily Rate (₹)</label>
//                       <input type="number" inputMode="decimal" placeholder="e.g. 500" value={addForm.daily_rate}
//                         onChange={(e) => setAddForm((f) => ({ ...f, daily_rate: e.target.value }))}
//                         className="input-field w-full h-10 px-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
//                     </div>
//                   </>
//                 )}
//               </div>
//             </div>
//             <div className="flex-shrink-0 flex flex-col-reverse sm:flex-row gap-3 p-5 sm:p-6 border-t border-slate-100">
//               <button onClick={() => setAddModal(false)} className="btn-secondary flex-1 h-11 sm:h-10 text-xs font-bold">Cancel</button>
//               <button onClick={handleAddWorker} disabled={addLoading}
//                 className="btn-primary flex-1 h-11 sm:h-10 text-xs font-black flex items-center justify-center gap-2">
//                 {addLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</> : <><UserPlus className="w-4 h-4" /> Add Worker</>}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// // ═══════════════════════════════════════════════════════════════════════════════
// // VIEW C — OPERATIONS & HR
// // ═══════════════════════════════════════════════════════════════════════════════
// function OperationsHRView({ token }) {
//   const [roster, setRoster] = useState([]);
//   const [rosterLoading, setRosterLoading] = useState(true);
//   const [config, setConfig] = useState(null);
//   const [configLoading, setConfigLoading] = useState(true);

//   const [configForm, setConfigForm] = useState({});
//   const [configSaving, setConfigSaving] = useState(false);
//   const [alert, setAlert] = useState(null);
//   const [page, setPage] = useState(1);
//   const [filter, setFilter] = useState('all');
//   const [filterOpen, setFilterOpen] = useState(false);
//   const PER_PAGE = 10;

//   const showAlert = (type, message) => {
//     setAlert({ type, message });
//     if (type === 'success') setTimeout(() => setAlert(null), 5000);
//   };

//   useEffect(() => {
//     if (!filterOpen) return;
//     const close = (e) => { if (!e.target.closest('.filter-dropdown')) setFilterOpen(false); };
//     document.addEventListener('mousedown', close);
//     return () => document.removeEventListener('mousedown', close);
//   }, [filterOpen]);

//   const fetchRoster = useCallback(async () => {
//     setRosterLoading(true);
//     try {
//       const data = await apiFetch(`${API}/today`, {}, token);
//       setRoster(data);
//     } catch {
//       showAlert('error', "Failed to load today's roster.");
//     } finally {
//       setRosterLoading(false);
//     }
//   }, [token]);

//   const fetchConfig = useCallback(async () => {
//     setConfigLoading(true);
//     try {
//       const data = await apiFetch(`${API}/config`, {}, token);
//       setConfig(data);
//       setConfigForm({
//         shift_start: data.shift_start,
//         shift_length_hours: data.shift_length_hours,
//         late_grace_minutes: data.late_grace_minutes,
//         factory_lat: data.factory_lat,
//         factory_lon: data.factory_lon,
//         radius_m: data.radius_m,
//       });
//     } catch {
//       showAlert('error', 'Failed to load shift configuration.');
//     } finally {
//       setConfigLoading(false);
//     }
//   }, [token]);

//   useEffect(() => { fetchRoster(); fetchConfig(); }, [fetchRoster, fetchConfig]);

//   const handleSaveConfig = async () => {
//     const timeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
//     if (!timeRegex.test(configForm.shift_start || '')) {
//       showAlert('error', 'Shift start must be strict HH:MM 24-hour format (e.g. 09:00, 14:30).');
//       return;
//     }
//     setConfigSaving(true);
//     try {
//       const payload = {
//         shift_start: configForm.shift_start,
//         shift_length_hours: parseFloat(configForm.shift_length_hours),
//         late_grace_minutes: parseInt(configForm.late_grace_minutes, 10),
//         factory_lat: parseFloat(configForm.factory_lat),
//         factory_lon: parseFloat(configForm.factory_lon),
//         radius_m: parseInt(configForm.radius_m, 10),
//       };
//       const updated = await apiFetch(`${API}/config`, { method: 'PATCH', body: JSON.stringify(payload) }, token);
//       setConfig(updated);
//       showAlert('success', 'Shift & geofence configuration saved successfully.');
//     } catch (e) {
//       showAlert('error', e.message || 'Failed to save configuration.');
//     } finally {
//       setConfigSaving(false);
//     }
//   };

//   const filteredRoster = useMemo(() => {
//     let rows = [...roster];
//     if (filter === 'active') rows = rows.filter((r) => !r.check_out_at);
//     if (filter === 'late') rows = rows.filter((r) => r.is_late);
//     return rows;
//   }, [roster, filter]);

//   const paginated = useMemo(() => filteredRoster.slice((page - 1) * PER_PAGE, page * PER_PAGE), [filteredRoster, page]);
//   const totalPages = Math.ceil(filteredRoster.length / PER_PAGE);

//   return (
//     <div className="space-y-6 animate-fade-in">
//       <div>
//         <h1 className="text-3xl font-black tracking-tight" style={{ color: '#2d1f0e' }}>Operations &amp; HR</h1>
//         <p className="font-medium mt-1" style={{ color: '#9a7a5a' }}>Live roster audit and shift policy configuration.</p>
//       </div>

//       {alert && <AlertBanner type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

//       {/* Live Daily Roster */}
//       <SpotlightCard className="p-6 bg-white shadow-xl space-y-5 rounded-3xl" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.06)">
//         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4" style={{ borderBottom: '1px solid rgba(200,131,74,0.1)' }}>
//           <h3 className="text-lg font-extrabold flex items-center gap-2" style={{ color: '#2d1f0e' }}>
//             <Activity className="w-5 h-5" style={{ color: '#c8834a' }} /> Today's Roster
//             <span className="text-xs font-black px-2 py-0.5 rounded-full ml-1" style={{ background: '#faf6f0', color: '#a86022', border: '1px solid rgba(200,131,74,0.2)' }}>
//               {roster.length} Live
//             </span>
//           </h3>
//           <div className="flex items-center gap-2">
//             {/* Filter dropdown */}
//             <div className="relative filter-dropdown">
//               <button onClick={() => setFilterOpen((o) => !o)}
//                 className="flex items-center gap-2 h-8 px-3 rounded-lg text-xs font-black transition-colors border"
//                 style={{
//                   background: filter !== 'all' ? '#c8834a' : '#faf6f0',
//                   color: filter !== 'all' ? 'white' : '#9a7a5a',
//                   borderColor: filter !== 'all' ? '#c8834a' : 'rgba(200,131,74,0.2)'
//                 }}>
//                 <Filter className="w-3.5 h-3.5" />
//                 {filter.charAt(0).toUpperCase() + filter.slice(1)}
//               </button>
//               {filterOpen && (
//                 <div className="absolute right-0 mt-1 w-36 bg-white rounded-xl shadow-lg z-20 overflow-hidden" style={{ border: '1px solid rgba(200,131,74,0.2)' }}>
//                   {['all', 'active', 'late'].map((f) => (
//                     <button key={f} onClick={() => { setFilter(f); setPage(1); setFilterOpen(false); }}
//                       className="w-full text-left px-4 py-2.5 text-xs font-black transition-colors flex items-center justify-between"
//                       style={{
//                         background: filter === f ? '#fff9f0' : 'transparent',
//                         color: filter === f ? '#c8834a' : '#9a7a5a'
//                       }}>
//                       {f.charAt(0).toUpperCase() + f.slice(1)}
//                       {filter === f && <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#c8834a' }} />}
//                     </button>
//                   ))}
//                 </div>
//               )}
//             </div>

//             {/* Refresh button */}
//             <button onClick={fetchRoster} title="Refresh roster"
//               className="h-8 w-8 p-0 flex items-center justify-center rounded-lg transition-all duration-200 hover:rotate-180"
//               style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.2)' }}>
//               <RefreshCw className="w-4 h-4" style={{ color: '#c8834a' }} />
//             </button>
//           </div>
//         </div>

//         {rosterLoading ? (
//           <div className="flex items-center justify-center py-12">
//             <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#c8834a' }} />
//           </div>
//         ) : filteredRoster.length === 0 ? (
//           <div className="text-center py-12" style={{ color: '#9a7a5a' }}>
//             <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
//             <p className="font-semibold text-sm">
//               {filter === 'all' ? 'No workers checked in today.' : `No ${filter} shifts found.`}
//             </p>
//           </div>
//         ) : (
//           <>
//             <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid rgba(200,131,74,0.15)' }}>
//               <table className="w-full text-left text-xs font-semibold">
//                 <thead>
//                   <tr className="font-bold uppercase tracking-wider" style={{ background: '#faf6f0', borderBottom: '1px solid rgba(200,131,74,0.15)', color: '#9a7a5a' }}>
//                     <th className="p-3">Employee ID</th>
//                     <th className="p-3">Check In</th>
//                     <th className="p-3">Check Out</th>
//                     <th className="p-3">Distance</th>
//                     <th className="p-3">Source</th>
//                     <th className="p-3">Flags</th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y" style={{ divideColor: 'rgba(200,131,74,0.1)' }}>
//                   {paginated.map((row) => (
//                     <tr key={row.id} className="hover:bg-[#fcfaf8] transition-colors">
//                       <td className="p-3 font-mono text-[10px] font-black" style={{ color: '#9a7a5a' }}>
//                         {String(row.employee_id).slice(0, 8)}…
//                       </td>
//                       <td className="p-3 font-black" style={{ color: '#2d1f0e' }}>{fmtTime(row.check_in_at)}</td>
//                       <td className="p-3">
//                         {row.check_out_at
//                           ? fmtTime(row.check_out_at)
//                           : <Badge label="Active" type="active" />}
//                       </td>
//                       <td className="p-3 font-bold" style={{ color: '#9a7a5a' }}>{fmtDist(row.distance_m)}</td>
//                       <td className="p-3"><Badge label={row.source} type={row.source} /></td>
//                       <td className="p-3">
//                         <div className="flex flex-wrap gap-1">
//                           {row.is_late && <Badge label="Late" type="late" />}
//                           {row.is_short && <Badge label="Short" type="short" />}
//                           {row.is_overtime && <Badge label="OT" type="overtime" />}
//                           {!row.is_late && !row.is_short && !row.is_overtime && <Badge label="Clean" type="active" />}
//                         </div>
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//             <Paginator page={page} totalPages={totalPages} setPage={setPage} total={filteredRoster.length} perPage={PER_PAGE} />
//           </>
//         )}
//       </SpotlightCard>

//       {/* Shift & Geofence Config */}
//       <SpotlightCard className="p-6 bg-white shadow-xl space-y-6 rounded-3xl" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.06)">
//         <h3 className="text-lg font-extrabold pb-4 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(200,131,74,0.1)', color: '#2d1f0e' }}>
//           <Settings className="w-5 h-5" style={{ color: '#c8834a' }} /> Shift &amp; Geofence Configuration
//         </h3>

//         {configLoading ? (
//           <div className="flex items-center justify-center py-10">
//             <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#c8834a' }} />
//           </div>
//         ) : (
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

//             {/* Shift Policy */}
//             <div className="space-y-4">
//               <h4 className="text-xs font-black uppercase tracking-widest flex items-center gap-2" style={{ color: '#9a7a5a' }}>
//                 <Clock className="w-3.5 h-3.5" /> Shift Policy
//               </h4>
//               <div>
//                 <label className="text-[11px] font-black uppercase tracking-wider block mb-1" style={{ color: '#9a7a5a' }}>
//                   Shift Start — HH:MM (24-hour) *
//                 </label>
//                 <input type="text" placeholder="09:00"
//                   value={configForm.shift_start || ''}
//                   onChange={(e) => setConfigForm((f) => ({ ...f, shift_start: e.target.value }))}
//                   className="w-full h-11 sm:h-10 text-base sm:text-sm font-black font-mono px-3 rounded-lg focus:outline-none transition-colors"
//                   style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.2)', color: '#2d1f0e' }} />
//                 <p className="text-[10px] mt-1 font-semibold" style={{ color: '#c8834a' }}>
//                   Strict format — e.g. 09:00, 14:30. Malformed values break check-in for all workers.
//                 </p>
//               </div>
//               <div>
//                 <label className="text-[11px] font-black uppercase tracking-wider block mb-1" style={{ color: '#9a7a5a' }}>Shift Length (hours)</label>
//                 <input type="number" step="0.5" min="1" max="24"
//                   value={configForm.shift_length_hours || ''}
//                   onChange={(e) => setConfigForm((f) => ({ ...f, shift_length_hours: e.target.value }))}
//                   className="w-full h-11 sm:h-10 text-base sm:text-sm font-semibold px-3 rounded-lg focus:outline-none transition-colors"
//                   style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.2)', color: '#2d1f0e' }} />
//               </div>
//               <div>
//                 <label className="text-[11px] font-black uppercase tracking-wider block mb-1" style={{ color: '#9a7a5a' }}>Late Grace Period (minutes)</label>
//                 <input type="number" min="0" max="120"
//                   value={configForm.late_grace_minutes || ''}
//                   onChange={(e) => setConfigForm((f) => ({ ...f, late_grace_minutes: e.target.value }))}
//                   className="w-full h-11 sm:h-10 text-base sm:text-sm font-semibold px-3 rounded-lg focus:outline-none transition-colors"
//                   style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.2)', color: '#2d1f0e' }} />
//               </div>
//               <div className="p-3 rounded-xl text-[10px] font-semibold leading-relaxed" style={{ background: '#fff9f0', border: '1px solid rgba(200,131,74,0.3)', color: '#a86022' }}>
//                 <strong>Timezone:</strong> Managed automatically by the backend (Asia/Kolkata). Intentionally excluded from the save payload.
//               </div>
//             </div>

//             {/* Geofence */}
//             <div className="space-y-4">
//               <h4 className="text-xs font-black uppercase tracking-widest flex items-center gap-2" style={{ color: '#9a7a5a' }}>
//                 <Shield className="w-3.5 h-3.5" /> Geofence Parameters
//               </h4>
//               <div>
//                 <label className="text-[11px] font-black uppercase tracking-wider block mb-1" style={{ color: '#9a7a5a' }}>Factory Latitude</label>
//                 <input type="number" step="0.0000001"
//                   value={configForm.factory_lat ?? ''}
//                   onChange={(e) => setConfigForm((f) => ({ ...f, factory_lat: e.target.value }))}
//                   className="w-full h-11 sm:h-10 text-base sm:text-sm font-semibold font-mono px-3 rounded-lg focus:outline-none transition-colors"
//                   style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.2)', color: '#2d1f0e' }} />
//               </div>
//               <div>
//                 <label className="text-[11px] font-black uppercase tracking-wider block mb-1" style={{ color: '#9a7a5a' }}>Factory Longitude</label>
//                 <input type="number" step="0.0000001"
//                   value={configForm.factory_lon ?? ''}
//                   onChange={(e) => setConfigForm((f) => ({ ...f, factory_lon: e.target.value }))}
//                   className="w-full h-11 sm:h-10 text-base sm:text-sm font-semibold font-mono px-3 rounded-lg focus:outline-none transition-colors"
//                   style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.2)', color: '#2d1f0e' }} />
//               </div>
//               <div>
//                 <label className="text-[11px] font-black uppercase tracking-wider block mb-1" style={{ color: '#9a7a5a' }}>Radius (meters)</label>
//                 <input type="number" min="10" max="5000"
//                   value={configForm.radius_m ?? ''}
//                   onChange={(e) => setConfigForm((f) => ({ ...f, radius_m: e.target.value }))}
//                   className="w-full h-11 sm:h-10 text-base sm:text-sm font-semibold px-3 rounded-lg focus:outline-none transition-colors"
//                   style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.2)', color: '#2d1f0e' }} />
//               </div>
//               <div className="rounded-xl overflow-hidden h-40 flex items-center justify-center" style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.2)' }}>
//                 {configForm.factory_lat && configForm.factory_lon ? (
//                   <div className="text-center" style={{ color: '#9a7a5a' }}>
//                     <MapPin className="w-8 h-8 mx-auto mb-1" style={{ color: '#c8834a' }} />
//                     <p className="text-[11px] font-bold" style={{ color: '#2d1f0e' }}>
//                       {parseFloat(configForm.factory_lat).toFixed(5)}, {parseFloat(configForm.factory_lon).toFixed(5)}
//                     </p>
//                     <p className="text-[10px] mt-0.5">Radius: {configForm.radius_m} m</p>
//                     <p className="text-[9px] mt-2 font-semibold max-w-[180px] mx-auto opacity-70">
//                       Mount Leaflet here — L.map() + L.circle() with radius_m
//                     </p>
//                   </div>
//                 ) : (
//                   <p className="text-[11px] font-semibold opacity-70" style={{ color: '#9a7a5a' }}>Enter coordinates to preview geofence</p>
//                 )}
//               </div>
//             </div>
//           </div>
//         )}

//         {!configLoading && (
//           <div className="flex justify-end pt-5" style={{ borderTop: '1px solid rgba(200,131,74,0.1)' }}>
//             <button onClick={handleSaveConfig} disabled={configSaving}
//               className="h-11 px-8 text-xs font-black flex items-center gap-2 rounded-xl text-white shadow-md transition-all active:scale-95 hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50"
//               style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}>
//               {configSaving
//                 ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
//                 : <><CheckCircle2 className="w-4 h-4" /> Save Configuration</>}
//             </button>
//           </div>
//         )}
//       </SpotlightCard>
//     </div>
//   );
// }

// // ═══════════════════════════════════════════════════════════════════════════════
// // ROOT EXPORT — Attendance Module Router
// // ═══════════════════════════════════════════════════════════════════════════════
// export default function AttendancePage() {
//   const { user, token } = useAuth();

//   const isManager = user === 'direct_manager';
//   const isSupervisor = user === 'cutting_manager' || user === 'stitching_manager' || isManager;

//   const tabs = [
//     { key: 'me', label: 'My Attendance', icon: Clock, show: true },
//     { key: 'proxy', label: 'Floor Command', icon: Users, show: isSupervisor },
//     { key: 'admin', label: 'Operations & HR', icon: Building2, show: isManager },
//   ].filter((t) => t.show);

//   const [activeTab, setActiveTab] = useState('me');
//   const [workers, setWorkers] = useState([]);
//   const [workerRefreshKey, setWorkerRefreshKey] = useState(0);

//   const refreshWorkers = () => {
//     setWorkerRefreshKey(k => k + 1);
//   };

//   useEffect(() => {
//     if ((activeTab === 'proxy' || activeTab === 'admin')) {
//       apiFetch('/api/v1/employees', {}, token)
//         .then(setWorkers)
//         .catch(() => { });
//     }
//   }, [activeTab, token, workerRefreshKey]);

//   return (
//     <div className="space-y-6">
//       {/* Tab bar */}
//       <div className="flex items-center gap-1 border-b overflow-x-auto" style={{ borderBottomColor: 'rgba(200,131,74,0.2)' }}>
//         {tabs.map(({ key, label, icon: Icon }) => (
//           <button key={key} onClick={() => setActiveTab(key)}
//             className="flex items-center gap-2 px-4 py-3 text-xs font-black whitespace-nowrap border-b-2 transition-colors"
//             style={{
//               borderColor: activeTab === key ? '#c8834a' : 'transparent',
//               color: activeTab === key ? '#c8834a' : '#9a7a5a',
//             }}>
//             <Icon className="w-4 h-4" />
//             {label}
//           </button>
//         ))}
//       </div>

//       {/* Views */}
//       {activeTab === 'me' && <MyAttendanceView token={token} />}

//       {activeTab === 'proxy' && (
//         isSupervisor
//           ? <FloorCommandView workers={workers} token={token} />
//           : <LockedView
//             title="Supervisor Authorization Required"
//             description="Floor Command is restricted to Supervisors and Direct Managers." />
//       )}

//       {activeTab === 'admin' && (
//         isManager
//           ? <OperationsHRView token={token} />
//           : <LockedView
//             title="Direct Manager Authorization Required"
//             description="Operations & HR is restricted to Direct Managers only." />
//       )}
//     </div>
//   );
// }