// floor command section code
'use client';
import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Users, Search, CheckSquare, Square, X,
  UserPlus, Loader2, Barcode, QrCode, Check, Camera,
} from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';
import AnimatedModal from '@/components/AnimatedModal';
import { motion } from 'framer-motion';
import { CameraScanner,normalizeRosterArray, Badge, AlertBanner } from './shared';
import { 
  useGetAttendanceTodayQuery, 
  useScanCheckInMutation, 
  useAddEmployeeMutation, 
  useProxyCheckInMutation, 
  useProxyCheckOutMutation 
} from '@/store/slices/apiSlice';

export default function FloorCommandView({ workers = [], onWorkerAdded, isSecurity }) {
 const [search, setSearch] = useState('');
 const [selected, setSelected] = useState(new Set());
 const scanLockRef = useRef(false);
 const [actionLoading, setActionLoading] = useState(false);
 const [alert, setAlert] = useState(null);
 const [diffModal, setDiffModal] = useState(null);

 const [addModal, setAddModal] = useState(false);
 const [addForm, setAddForm] = useState({ name: '', phone: '', designation: '', wage_type: 'piece_rate', daily_rate: '', password: '' });
 const [addLoading, setAddLoading] = useState(false);
 const [isOther, setIsOther] = useState(false);

 const [showCamera, setShowCamera] = useState(false);

 // Prevent duplicate submissions in current session
 const [checkedInIds, setCheckedInIds] = useState(new Set());
 const [checkedOutIds, setCheckedOutIds] = useState(new Set());

 // Automatic Barcode Gun Scanner State & Sound Feedback
 const [scanInput, setScanInput] = useState('');
 const [isResolvingScan, setIsResolvingScan] = useState(false);
 const scanInputRef = useRef(null);
  // --- RTK QUERY HOOKS ---
  const { data: rosterDataRaw = [] } = useGetAttendanceTodayQuery();
  const rosterArray = useMemo(() => normalizeRosterArray(rosterDataRaw), [rosterDataRaw]);

  const [scanCheckInApi] = useScanCheckInMutation();
  const [addEmployeeApi] = useAddEmployeeMutation();
  const [proxyCheckInApi] = useProxyCheckInMutation();
  const [proxyCheckOutApi] = useProxyCheckOutMutation();

 const playBeep = (freq = 880, type = 'sine') => {
 try {
 const ctx = new (window.AudioContext || window.webkitAudioContext)();
 const osc = ctx.createOscillator();
 const gain = ctx.createGain();
 osc.type = type;
 osc.frequency.value = freq;
 gain.gain.value = 0.1;
 osc.connect(gain);
 gain.connect(ctx.destination);
 osc.start();
 osc.stop(ctx.currentTime + 0.15);
 } catch (e) { }
 };

 const handleScanAttendance = async (codeToResolve) => {
 const rawCode = (codeToResolve || scanInput).trim();
 if (!rawCode) return;
 if (scanLockRef.current) return;

 scanLockRef.current = true;
 setIsResolvingScan(true);
 setAlert(null);

 try {
 const targetCode = rawCode.toUpperCase();

 const matchedWorker = workers.find(w =>
 String(w.employee_barcode || '').toUpperCase() === targetCode ||
 String(w.id).toUpperCase() === targetCode ||
 String(w.id).toUpperCase() === targetCode.replace('EMP-', '') ||
 String(w.phone || '').includes(targetCode)
 );

 let targetId = targetCode;
 let targetName = "Unknown Worker";
 if (matchedWorker) {
 targetId = String(matchedWorker.id);
 targetName = matchedWorker.name;
 }

 const isAlreadyIn = checkedInIds.has(targetId);
 const isAlreadyOut = checkedOutIds.has(targetId);

 if (isAlreadyIn && isAlreadyOut) {
 playBeep(440, 'triangle');
 showAlert('info', `✓ ${targetName} (${targetCode}) has already completed shift today.`);
 setScanInput('');
 return;
 }

 const direction = !isAlreadyIn ? 'in' : 'out';

 const payload = {
 employee_barcode: targetCode,
 proxy: false,
 direction: direction
 };

const response = await scanCheckInApi(payload).unwrap();

 playBeep(1046, 'sine'); // High-pitch scanner gun success sound

 const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
 const respWorkerIdStr = String(response.employee_id);

 // If backend returned check_out_at, it means this scan triggered a check-out
 if (response.check_out_at) {
 setCheckedOutIds(prev => new Set([...prev, respWorkerIdStr]));
 showAlert('success', `🔴 AUTOMATIC CHECK-OUT CONFIRMED: ${response.employee_name} (${targetCode}) at ${timeStr} (Shift Complete)`);
 } else {
 setCheckedInIds(prev => new Set([...prev, respWorkerIdStr]));
 showAlert('success', `🟢 AUTOMATIC CHECK-IN CONFIRMED: ${response.employee_name} (${targetCode}) at ${timeStr}`);
 }

 setScanInput('');
 } catch (err) {
 playBeep(220, 'sawtooth');
 showAlert('error', err.message || 'Scan attendance failed');
 setScanInput('');
 } finally {
 setIsResolvingScan(false);
 scanLockRef.current = false;
 scanInputRef.current?.focus();
 }
 };
  
  useEffect(() => {
    if (rosterArray.length > 0) {
      const inIds = rosterArray.map(r => String(r.employee_id));
      const outIds = rosterArray.filter(r => r.check_out_at).map(r => String(r.employee_id));
      setCheckedInIds(prev => new Set([...prev, ...inIds]));
      setCheckedOutIds(prev => new Set([...prev, ...outIds]));
    }
  }, [rosterArray]);


//  useEffect(() => {
//  async function initStatus() {
//  try {
//  const rosterData = await apiFetch(`/api/v1/attendance/today?t=${Date.now()}`, {}, token);
//  const rosterArray = normalizeRosterArray(rosterData);
//  if (rosterArray.length > 0) {
//  // One-time per day logic:
//  // 1. If they have ANY record today, they have already checked in (disable Check-In)
//  const inIds = rosterArray.map(r => String(r.employee_id));

//  // 2. If their record has check_out_at, they have already checked out (disable Check-Out)
//  const outIds = rosterArray.filter(r => r.check_out_at).map(r => String(r.check_out_at ? r.employee_id : null)).filter(id => id !== null);

//  setCheckedInIds(prev => new Set([...prev, ...inIds]));
//  setCheckedOutIds(prev => new Set([...prev, ...outIds]));
//  }
//  } catch (e) {
//  console.error("Failed to fetch floor roster", e);
//  }
//  }
//  if (token) {
//  initStatus();
//  }
//  }, [token]);

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
 if (wage_type === 'monthly' && !phone.trim()) {
 showAlert('warning', 'Phone number is required for monthly employees.');
 return;
 }
 if (phone.trim() && phone.trim().length !== 10) {
 showAlert('warning', 'Phone number must be exactly 10 digits.');
 return;
 }
 setAddLoading(true);
 try {
 const payload = {
 name: name.trim(),
 designation: designation.trim(),
 wage_type: wage_type,
 phone: phone.trim() || null,
 daily_rate: daily_rate ? parseFloat(daily_rate) : null,
 };
await addEmployeeApi(payload).unwrap();


 showAlert('success', `Worker "${name}" onboarded to floor roster.`);
 setAddModal(false);
 setAddForm({ name: '', phone: '', designation: '', wage_type: 'piece_rate', daily_rate: '' });
 setIsOther(false);
 if (onWorkerAdded)
 onWorkerAdded();
 } catch (e) {
 showAlert('error', typeof e === 'string' ? e : e.message || 'Failed to add worker.');
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
 const requestedIds = [...selected];
const payload = { employee_ids: requestedIds };
const result = type === 'check-in' 
  ? await proxyCheckInApi(payload).unwrap()
  : await proxyCheckOutApi(payload).unwrap();
 const succeededIds = new Set(result.map((r) => String(r.employee_id)));
 const normalizedRequested = requestedIds.map((id) => String(id));
 const succeeded = normalizedRequested.filter((id) => succeededIds.has(id));
 const failed = normalizedRequested.filter((id) => !succeededIds.has(id));

 if (type === 'check-in') {
 setCheckedInIds(prev => new Set([...prev, ...succeeded]));
 } else {
 setCheckedOutIds(prev => new Set([...prev, ...succeeded]));
 }

 setSelected(new Set());
 setTimeout(() => setDiffModal({ type, succeeded, failed }), 0);
 } catch (e) {
 showAlert('error', typeof e === 'string' ? e : e.message || 'Batch action failed.');
 } finally {
 setActionLoading(false);
 }
 };

 return (
 <motion.div className="space-y-6">
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

 <AlertBanner type={alert?.type} message={alert?.message} onClose={() => setAlert(null)} />

 {/* AUTOMATIC BARCODE GUN ATTENDANCE SCANNER HEADER BAR */}
 <div className="bg-gradient-to-r from-[#2d1f0e] via-[#3a2817] to-[#1c1207] p-5 sm:p-6 rounded-3xl shadow-2xl text-white relative overflow-hidden border border-[#c8834a]/30">
 <div className="absolute -right-16 -top-16 w-48 h-48 bg-[#c8834a]/15 rounded-full blur-3xl pointer-events-none" />

 <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-5 relative z-10">
 <div className="flex items-center gap-3.5">
 <div className="w-12 h-12 rounded-2xl bg-[#c8834a]/20 border border-[#c8834a]/40 flex items-center justify-center shrink-0 shadow-inner">
 <Barcode className="w-6 h-6 text-[#f5d4a4]" />
 </div>
 <div>
 <h3 className="text-base font-extrabold text-white flex items-center gap-2.5">
 Automatic Barcode Attendance
 <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 shadow-sm animate-pulse">
 Auto Scan Mode
 </span>
 </h3>
 <p className="text-xs text-[#e2d5c3]/80 font-medium mt-0.5">
 Scan any worker ID barcode card (e.g. EMP-000123) for instant automatic Check-In or Check-Out
 </p>
 </div>
 </div>

 <div className="flex-1 max-w-xl">
 <div className="relative flex items-center shadow-lg rounded-2xl overflow-hidden border border-[#c8834a]/40 bg-white/10 backdrop-blur-md focus-within:border-[#f5d4a4] transition-all">
 <QrCode className="w-5 h-5 text-[#f5d4a4] absolute left-4 pointer-events-none" />
 <input
 ref={scanInputRef}
 type="text"
 autoFocus
 placeholder="Scan worker ID card (e.g. EMP-000123)..."
 value={scanInput}
 onChange={(e) => setScanInput(e.target.value)}
 onKeyDown={(e) => {
 if (e.key === 'Enter') {
 e.preventDefault();
 handleScanAttendance();
 }
 }}
 className="w-full h-12 pl-12 pr-28 bg-transparent text-white placeholder-[#e2d5c3]/50 font-mono font-bold text-sm focus:outline-none transition-all"
 />
 <div className="absolute right-1.5 flex gap-1">
 <button
 type="button"
 onClick={() => setShowCamera(true)}
 className="sm:hidden px-3 py-2 rounded-xl text-[#c8834a] bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center cursor-pointer"
 >
 <Camera className="w-4 h-4" />
 </button>
 <button
 type="button"
 onClick={() => handleScanAttendance()}
 disabled={isResolvingScan || !scanInput.trim()}
 className="px-4 py-2 rounded-xl text-xs font-black text-[#1c1207] bg-gradient-to-r from-[#e8a06a] to-[#c8834a] hover:brightness-110 active:scale-95 transition-all shadow-md cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
 >
 {isResolvingScan ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-4 h-4" />}
 <span className="hidden sm:inline">Scan</span>
 </button>
 </div>
 </div>
 </div>
 </div>
 </div>

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
 <motion.tbody className="divide-y" style={{ divideColor: 'rgba(200,131,74,0.1)' }}>
 {filtered.map((w) => {
 const isSelected = selected.has(w.id);
 const isPieceRate = w.wage_type === 'piece_rate';
 return (
 <motion.tr key={w.id} onClick={() => toggleSelect(w.id)}
 className="cursor-pointer transition-colors relative" style={{ background: isSelected ? '#fff9f0' : 'transparent' }}>
 <td className="p-3">
 {isSelected
 ? <CheckSquare className="w-4 h-4" style={{ color: '#c8834a' }} />
 : <Square className="w-4 h-4" style={{ color: '#d1d5db' }} />}
 </td>
 <td className="p-3">
 <span className="block font-black" style={{ color: '#2d1f0e' }}>{w.name}</span>
 <span className="block text-[10px] font-mono" style={{ color: '#9a7a5a' }}>{String(w.id).slice(0, 8)}…</span>
 </td>
 <td className="p-3 font-semibold" style={{ color: '#a86022' }}>{w.designation || '—'}</td>
 <td className="p-3 relative">
 <Badge
 label={isPieceRate ? 'Daily Wage' : 'Monthly'}
 type={isPieceRate ? 'proxy' : 'active'}
 />
 {isSelected &&  (
 <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-20" onClick={(e) => e.stopPropagation()}>
 <button onClick={() => { setSelected(new Set([w.id])); batchAction('check-in'); }} disabled={actionLoading || checkedInIds.has(String(w.id))}
 className={`bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black px-2.5 py-1.5 rounded-lg shadow-md transition-colors cursor-pointer ${checkedInIds.has(String(w.id)) ? 'opacity-50' : ''}`}>
 {checkedInIds.has(String(w.id)) ? 'Checked In' : 'Check-In'}
 </button>
 <button onClick={() => { setSelected(new Set([w.id])); batchAction('check-out'); }} disabled={actionLoading || !checkedInIds.has(String(w.id)) || checkedOutIds.has(String(w.id))}
 className={`bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black px-2.5 py-1.5 rounded-lg shadow-md transition-colors cursor-pointer ${checkedOutIds.has(String(w.id)) ? 'opacity-50' : ''}`}>
 {checkedOutIds.has(String(w.id)) ? 'Checked Out' : 'Check-Out'}
 </button>
 </div>
 )}
 </td>
 </motion.tr>
 );
 })}
 </motion.tbody>
 </table>
 </div>
 )}
 </SpotlightCard>

 {/* Diff result modal */}
 <AnimatedModal
 isOpen={!!diffModal}
 onClose={() => setDiffModal(null)}
 panelClassName="space-y-4 w-full max-w-md"
 panelStyle={{ backgroundColor: '#ffffff', borderRadius: '20px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)', border: '1px solid #e2e8f0', padding: '24px' }}
 >
 {diffModal && (
 <>
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
 {diffModal.succeeded.length > 0 ? `${diffModal.succeeded.length} worker(s) marked successfully.` : 'None succeeded.'}
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
 </div>
 )}
 </div>
 <button onClick={() => setDiffModal(null)} className="btn-primary w-full h-11 sm:h-10 text-xs font-black cursor-pointer relative z-30 pointer-events-auto">Done</button>
 </>
 )}
 </AnimatedModal>

 {/* Add floor worker modal */}
 <AnimatedModal
 isOpen={addModal}
 onClose={() => setAddModal(false)}
 panelClassName="space-y-4 w-full max-w-md"
 panelStyle={{ backgroundColor: '#ffffff', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)', border: '1px solid #e2e8f0', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}
 >
 {addModal && (
 <>
 <div className="flex-shrink-0 flex items-center justify-between pb-3 border-b border-slate-100">
 <h3 id="add-worker-title" className="font-black text-slate-900 text-base sm:text-lg flex items-center gap-2">
 <UserPlus className="w-5 h-5 text-blue-600" /> Add Floor Worker
 </h3>
 <button onClick={() => setAddModal(false)} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer relative z-50">
 <X className="w-5 h-5" aria-label="Close modal" />
 </button>
 </div>

 <div className="space-y-4">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
 <div className="sm:col-span-2">
 <label className="input-label text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-1">Full Name *</label>
 <input type="text" value={addForm.name} placeholder="e.g. Ramesh Kumar"
 onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
 className="input-field w-full h-10 px-3.5 text-xs font-semibold text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#c8834a] bg-white relative z-20 cursor-text" />
 </div>
 <div>
 <label className="input-label text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-1">Designation *</label>
 <select
 value={isOther ? 'Other' : addForm.designation}
 onChange={(e) => {
 const val = e.target.value;
 if (val === 'Other') {
 setIsOther(true);
 setAddForm((f) => ({ ...f, designation: '' }));
 } else {
 setIsOther(false);
 setAddForm((f) => ({ ...f, designation: val }));
 }
 }}
 className="input-field w-full h-10 px-3 text-xs font-bold rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#c8834a] relative z-20 cursor-pointer"
 >
 <option value="" disabled>Select Designation</option>
 <option value="Cutting">Cutting</option>
 <option value="Fusing">Fusing</option>
 <option value="Pasting">Pasting</option>
 <option value="Shell stitch">Shell stitch</option>
 <option value="Lining attach">Lining attach</option>
 <option value="Lining stitch">Lining stitch</option>
 <option value="Final finish">Final finish</option>
 <option value="Supervisor">Supervisor</option>
 <option value="Other">Other (Custom)</option>
 </select>
 </div>

 {isOther && (
 <div className="sm:col-span-2 animate-fade-in">
 <label className="input-label text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-1">Custom Designation *</label>
 <input
 type="text"
 value={addForm.designation}
 placeholder="Type here"
 required
 onChange={(e) => setAddForm((f) => ({ ...f, designation: e.target.value }))}
 className="input-field w-full h-10 px-3.5 text-xs font-semibold text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#c8834a] bg-white relative z-20 cursor-text"
 />
 </div>
 )}
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
 maxLength={10}
 onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
 className="input-field w-full h-10 px-3.5 text-xs font-semibold text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#c8834a] bg-white relative z-20 cursor-text" />
 </div>
 </>
 ) : (
 <>
 <div>
 <label className="input-label text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-1">Phone Number (Optional)</label>
 <input type="tel" inputMode="numeric" pattern="[0-9]*" value={addForm.phone} placeholder="Optional for daily workers"
 maxLength={10}
 onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
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
 </>
 )}
 </AnimatedModal>

 {/* Camera Scanner Modal */}
 {showCamera && (
 <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
 <div className="w-full max-w-md transform transition-all">
 <CameraScanner
 onClose={() => setShowCamera(false)}
 onScan={(code) => {
 setScanInput(code);
 setShowCamera(false);
 handleScanAttendance(code);
 }}
 />
 </div>
 </div>
 )}
 </motion.div>
 );
}
