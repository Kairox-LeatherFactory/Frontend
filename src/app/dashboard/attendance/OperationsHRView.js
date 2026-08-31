// operation and hr view code
'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Activity, Filter, CheckCircle2, RefreshCw, Loader2, Users, Settings, Clock } from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';
import { motion } from 'framer-motion';
import { API, apiFetch, AlertBanner, Badge, fmtTime, fmtDist, Paginator } from './shared';
export default function OperationsHRView({ token }) {
 const [roster, setRoster] = useState([]);
 const [rosterLoading, setRosterLoading] = useState(true);
 // const [config, setConfig] = useState(null);
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
 //setConfig(data);
 setConfigForm({
 shift_start: data.shift_start,
 shift_length_hours: data.shift_length_hours,
 late_grace_minutes: data.late_grace_minutes,
 // Geofence Parameters — commented out so attendance can be configured
 // and marked without requiring factory lat/lon/radius. Re-enable by
 // uncommenting these fields alongside the JSX block further below.
 // factory_lat: data.factory_lat,
 // factory_lon: data.factory_lon,
 // radius_m: data.radius_m,
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

 };
// const updated = await apiFetch(`${API}/config`, { method: 'PATCH', body: JSON.stringify(payload) }, token);
 //setConfig(updated);
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
 <motion.div className="space-y-6">
 <div>
 <h1 className="text-3xl font-black tracking-tight" style={{ color: '#2d1f0e' }}>Operations &amp; HR</h1>
 <p className="font-medium mt-1" style={{ color: '#9a7a5a' }}>Live roster audit and shift policy configuration.</p>
 </div>

 <AlertBanner type={alert?.type} message={alert?.message} onClose={() => setAlert(null)} />

 <SpotlightCard className="p-6 bg-white shadow-xl space-y-5 rounded-3xl" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.06)">
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4" style={{ borderBottom: '1px solid rgba(200,131,74,0.1)' }}>
 <h3 className="text-lg font-extrabold flex items-center gap-2" style={{ color: '#2d1f0e' }}>
 <Activity className="w-5 h-5" style={{ color: '#c8834a' }} /> Today's Roster
 <span className="text-xs font-black px-2 py-0.5 rounded-full ml-1" style={{ background: '#faf6f0', color: '#a86022', border: '1px solid rgba(200,131,74,0.2)' }}>
 {roster.length} Live
 </span>
 </h3>
 <div className="flex items-center gap-2">
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
 <div className="absolute left-0 sm:left-auto sm:right-0 mt-1 w-36 bg-white rounded-xl shadow-lg z-20 overflow-hidden" style={{ border: '1px solid rgba(200,131,74,0.2)' }}>
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
 <th className="p-3">Name</th>
 <th className="p-3">Check In</th>
 <th className="p-3">Check Out</th>
 <th className="p-3">Distance</th>
 <th className="p-3">Source</th>
 <th className="p-3">Flags</th>
 </tr>
 </thead>
 <motion.tbody className="divide-y" style={{ divideColor: 'rgba(200,131,74,0.1)' }}>
 {paginated.map((row) => (
 <motion.tr key={row.id} className="hover:bg-[#fcfaf8] transition-colors">
 <td className="p-3 font-mono text-[10px] font-black" style={{ color: '#9a7a5a' }}>
 {String(row.name)}…
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
 </motion.tr>
 ))}
 </motion.tbody>
 </table>
 </div>
 <Paginator page={page} totalPages={totalPages} setPage={setPage} total={filteredRoster.length} perPage={PER_PAGE} />
 </>
 )}
 </SpotlightCard>

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
 </div>

 {/* Geofence Parameters — commented out so shift config can be saved and
 attendance marked without requiring factory lat/lon/radius. Uncomment
 this block (and the matching fields in fetchConfig/handleSaveConfig
 above) to bring geofencing back.
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
 </div>
 */}
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
 </motion.div>
 );
}