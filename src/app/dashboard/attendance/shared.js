'use client';
import { useState, useEffect, useMemo } from 'react';
import { useGetAttendanceTodayQuery } from '@/store/slices/apiSlice';
import {
  CheckCircle2, AlertTriangle, AlertCircle, Activity,
  ChevronLeft, ChevronRight, Lock, Users, Search,
  CalendarDays, X, Camera,
} from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';


export const CameraScanner = ({ onScan, onClose }) => {
  useEffect(() => {
    let scanner;
    import('html5-qrcode').then(({ Html5Qrcode }) => {
      scanner = new Html5Qrcode("reader");
      scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (text) => {
          scanner.stop().then(() => {
            onScan(text);
          }).catch(() => {
            onScan(text);
          });
        },
        (err) => { }
      ).catch(err => console.error("Camera start error:", err));
    }).catch(err => console.error("Error loading html5-qrcode:", err));

    return () => {
      if (scanner && scanner.isScanning) {
        scanner.stop().catch(e => console.warn(e));
      }
    };
  }, [onScan]);

  return (
    <div className="bg-white p-4 rounded-3xl shadow-2xl relative w-full border border-slate-200">
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
        <h3 className="font-extrabold text-slate-800 flex items-center gap-2">
          <Camera className="w-5 h-5 text-[#c8834a]" /> Scan ID Card
        </h3>
        <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
          <X className="w-5 h-5 text-slate-400" />
        </button>
      </div>
      <div id="reader" className="w-full rounded-2xl overflow-hidden border-2 border-[#c8834a]/30"></div>
      <div className="mt-4 text-center">
        <button onClick={onClose} className="text-sm font-bold text-slate-500 hover:text-slate-800">
          Cancel Scanning
        </button>
      </div>
    </div>
  );
};

// ─── API BASE ────────────────────────────────────────────────────────────────
export const API = '/api/v1/attendance';

// ─── HELPERS ─────────────────────────────────────────────────────────────────
export function fmtTime(isoUtc) {
  if (!isoUtc) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
  }).format(new Date(isoUtc));
}
export function fmtDate(isoDate) {
  if (!isoDate) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(isoDate));
}
export function fmtDist(m) {
  if (m == null) return '—';
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(2)} km`;
}
export function padTime(secs) {
  if (secs == null || secs < 0) return '00:00:00';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

// ─── FETCH HELPER ────────────────────────────────────────────────────────────
export async function apiFetch(url, options = {}, token = null) {
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

export function normalizeRosterArray(rosterData) {
  if (Array.isArray(rosterData)) return rosterData;
  if (rosterData?.data && Array.isArray(rosterData.data)) return rosterData.data;
  if (rosterData?.items && Array.isArray(rosterData.items)) return rosterData.items;
  if (rosterData?.employee_id) return [rosterData];
  return [];
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
export function Badge({ label, type }) {
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

export function AlertBanner({ type, message, onClose }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  const styles = {
    success: 'bg-emerald-50/95 border-emerald-500/30 text-emerald-900 backdrop-blur-md',
    error: 'bg-red-50/95 border-red-500/30 text-red-900 backdrop-blur-md',
    warning: 'bg-amber-50/95 border-amber-500/30 text-amber-900 backdrop-blur-md',
    info: 'bg-blue-50/95 border-blue-500/30 text-blue-900 backdrop-blur-md',
  };
  const icons = { success: CheckCircle2, error: AlertCircle, warning: AlertTriangle, info: Activity };
  const Icon = icons[type] || AlertCircle;
  return createPortal(
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.96 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className={`fixed bottom-6 right-4 sm:right-6 z-[999999] flex items-start gap-2.5 p-4 rounded-2xl border text-sm font-semibold shadow-2xl max-w-sm w-full ${styles[type] || styles.info}`}
        >
          <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p className="flex-1">{message}</p>
          {onClose && (
            <button onClick={onClose} className="opacity-60 hover:opacity-100 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export function Paginator({ page, totalPages, setPage, total, perPage }) {
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

export function LockedView({ title, description }) {
  return (
    <SpotlightCard className="p-12 shadow text-center space-y-3 rounded-3xl" style={{ background: '#fff9f0', border: '1px solid rgba(200,131,74,0.3)' }} spotlightColor="rgba(200,131,74,0.1)">
      <Lock className="w-12 h-12 mx-auto" style={{ color: '#c8834a' }} />
      <h3 className="font-black uppercase tracking-wide" style={{ color: '#9c4221' }}>{title}</h3>
      <p className="text-xs font-semibold max-w-md mx-auto" style={{ color: '#a86022' }}>{description}</p>
    </SpotlightCard>
  );
}

export function EmployeesListView({ workers = [] }) {
  const [search, setSearch] = useState('');

  const filteredWorkers = workers.filter(w =>
    w.name?.toLowerCase().includes(search.toLowerCase()) ||
    w.employee_barcode?.toLowerCase().includes(search.toLowerCase()) ||
    w.phone?.includes(search)
  );

  return (
    <div className="space-y-6">
      <SpotlightCard className="p-6 bg-white shadow-xl rounded-3xl" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.06)">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h3 className="text-lg font-extrabold flex items-center gap-2" style={{ color: '#2d1f0e' }}>
            <Users className="w-5 h-5" style={{ color: '#c8834a' }} /> Employees Directory
          </h3>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search by name, ID or phone..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-xl text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-[#c8834a]/30"
              style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.2)', color: '#2d1f0e' }} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(200,131,74,0.1)' }}>
                <th className="p-3 font-black uppercase tracking-wider text-slate-400">Barcode</th>
                <th className="p-3 font-black uppercase tracking-wider text-slate-400">Name</th>
                <th className="p-3 font-black uppercase tracking-wider text-slate-400">Phone</th>
                <th className="p-3 font-black uppercase tracking-wider text-slate-400">Designation</th>
                <th className="p-3 font-black uppercase tracking-wider text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredWorkers.length > 0 ? filteredWorkers.map(w => (
                <tr key={w.id} className="hover:bg-[#fcfaf8] transition-colors">
                  <td className="p-3 font-mono font-black text-slate-600">{w.employee_barcode || '—'}</td>
                  <td className="p-3 font-black text-[#2d1f0e]">{w.name}</td>
                  <td className="p-3 text-slate-500">{w.phone}</td>
                  <td className="p-3 text-slate-500 capitalize">{w.designation?.replace('_', ' ')}</td>
                  <td className="p-3"><Badge label={w.is_active !== false ? 'Active' : 'Inactive'} type={w.is_active !== false ? 'active' : 'frozen'} /></td>
                </tr>
              )) : (
                <tr><td colSpan="5" className="p-8 text-center text-slate-400 font-semibold">No employees found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </SpotlightCard>
    </div>
  );
}

export function AttendanceHistoryView() {
  const { data: rosterDataRaw = [], isLoading: loading } = useGetAttendanceTodayQuery();
  const history = useMemo(() => normalizeRosterArray(rosterDataRaw), [rosterDataRaw]);

  return (
    <div className="space-y-6">
      <SpotlightCard className="p-6 bg-white shadow-xl rounded-3xl" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.06)">
        <h3 className="text-lg font-extrabold pb-4 flex items-center gap-2 mb-4" style={{ borderBottom: '1px solid rgba(200,131,74,0.1)', color: '#2d1f0e' }}>
          <CalendarDays className="w-5 h-5" style={{ color: '#c8834a' }} /> Today's Roster {loading && <span className="text-xs text-slate-400 animate-pulse">(Updating...)</span>}
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(200,131,74,0.1)' }}>
                <th className="p-3 font-black uppercase tracking-wider text-slate-400">Barcode</th>
                <th className="p-3 font-black uppercase tracking-wider text-slate-400">Name</th>
                <th className="p-3 font-black uppercase tracking-wider text-slate-400">Check In</th>
                <th className="p-3 font-black uppercase tracking-wider text-slate-400">Check Out</th>
                <th className="p-3 font-black uppercase tracking-wider text-slate-400">Source</th>
                <th className="p-3 font-black uppercase tracking-wider text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map(row => (
                <tr key={row.id} className="hover:bg-[#fcfaf8] transition-colors">
                  <td className="p-3 font-mono font-black text-slate-600">{row.employee_id}</td>
                  <td className="p-3 font-black text-[#2d1f0e]">{row.name}</td>
                  <td className="p-3 font-black" style={{ color: '#9a7a5a' }}>{fmtTime(row.check_in_at)}</td>
                  <td className="p-3 font-black" style={{ color: '#9a7a5a' }}>{fmtTime(row.check_out_at)}</td>
                  <td className="p-3"><Badge label={row.source} type={row.source} /></td>
                  <td className="p-3">
                    <Badge label={row.status || 'Active'} type={row.status?.toLowerCase() === 'late' ? 'late' : row.status?.toLowerCase() === 'short' ? 'short' : 'active'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SpotlightCard>
    </div>
  );
}
