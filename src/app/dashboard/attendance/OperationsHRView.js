// operation and hr view code
'use client';
import { useState, useEffect, useMemo } from 'react';
import { Activity, Filter, CheckCircle2, RefreshCw, Loader2, Users, Edit2, AlertTriangle, X, Save } from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertBanner, Badge, fmtTime, fmtDate, Paginator } from './shared';
import { useGetAttendanceTodayQuery, useUpdateAttendanceMutation, useDeleteAttendanceMutation } from '@/store/slices/attendanceApiSlice';

// Factory clock is IST (fixed +05:30, no DST) — the same zone fmtTime displays in.
const istHHMM = (iso) => (iso
  ? new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Kolkata' }).format(new Date(iso))
  : '');
const istDate = (iso) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(iso));
const istToIso = (ymd, hhmm) => new Date(`${ymd}T${hhmm}:00+05:30`).toISOString();

export default function OperationsHRView({ workers = [] }) {
 const [alert, setAlert] = useState(null);
 const [page, setPage] = useState(1);
 const [filter, setFilter] = useState('all');
 const [filterOpen, setFilterOpen] = useState(false);
 const PER_PAGE = 10;

 const [updateAttendance] = useUpdateAttendanceMutation();
 const [editModal, setEditModal] = useState(null);
 const [editForm, setEditForm] = useState({ employee_id: '', reason: '', check_in: '', check_out: '' });
 const [actionLoading, setActionLoading] = useState(false);
 const [deleteAttendance] = useDeleteAttendanceMutation();
 const [deleteModal, setDeleteModal] = useState(null);
 const [deleteReason, setDeleteReason] = useState('');

   // --- RTK QUERY HOOKS ---
  const { data: roster = [], isLoading: rosterLoading, refetch: refetchRoster } = useGetAttendanceTodayQuery();
  const showAlert = (type, message) => {
    setAlert({ type, message });
    if (type === 'success') setTimeout(() => setAlert(null), 5000);
  };

  const handleEditClick = (row) => {
    setEditForm({
      employee_id: row.employee_id,
      reason: '',
      check_in: istHHMM(row.check_in_at),
      check_out: istHHMM(row.check_out_at),
    });
    setEditModal(row);
  };

  const editWorkDate = editModal ? String(editModal.work_date || istDate(editModal.check_in_at)).slice(0, 10) : '';
  const isReassign = !!editModal && !!editForm.employee_id && String(editForm.employee_id) !== String(editModal.employee_id);

  const handleSaveCorrection = async () => {
    // PATCH takes any subset — send only what actually changed.
    const patch = {};
    if (isReassign) patch.employee_id = editForm.employee_id;
    if (editForm.check_in && editForm.check_in !== istHHMM(editModal.check_in_at)) {
      patch.check_in_at = istToIso(editWorkDate, editForm.check_in);
    }
    if (editForm.check_out && editForm.check_out !== istHHMM(editModal.check_out_at)) {
      patch.check_out_at = istToIso(editWorkDate, editForm.check_out);
    }

    if (Object.keys(patch).length === 0) {
      showAlert('warning', 'Nothing changed — pick a different worker or adjust the times.');
      return;
    }
    if (editForm.check_in && editForm.check_out && editForm.check_out <= editForm.check_in) {
      showAlert('warning', 'Check-out must be after check-in.');
      return;
    }
    if (!editForm.reason.trim()) {
      showAlert('warning', 'Reason is required for correction (e.g. "Card swapped").');
      return;
    }

    setActionLoading(true);
    try {
      const res = await updateAttendance({
        id: editModal.id,
        ...patch,
        reason: editForm.reason
      }).unwrap();

      showAlert('success', res?.message || 'Attendance corrected.');
      setEditModal(null);
    } catch (err) {
      showAlert('error', err.message || 'Failed to reassign attendance.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteClick = (row) => {
    setDeleteReason('');
    setDeleteModal(row);
  };

  const handleConfirmDelete = async () => {
    if (!deleteReason.trim()) {
      showAlert('warning', 'Reason is required to hard-delete an attendance record.');
      return;
    }
    setActionLoading(true);
    try {
      await deleteAttendance({ id: deleteModal.id, reason: deleteReason }).unwrap();
      showAlert('success', 'Attendance record deleted successfully.');
      setDeleteModal(null);
    } catch (err) {
      showAlert('error', err.message || 'Failed to delete attendance.');
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
 if (!filterOpen) return;
 const close = (e) => { if (!e.target.closest('.filter-dropdown')) setFilterOpen(false); };
 document.addEventListener('mousedown', close);
 return () => document.removeEventListener('mousedown', close);
 }, [filterOpen]);
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
 <p className="font-medium mt-1" style={{ color: '#9a7a5a' }}>Live roster audit and attendance corrections.</p>
 </div>

 <AlertBanner type={alert?.type} message={alert?.message} onClose={() => setAlert(null)} />

 <SpotlightCard className="p-6 bg-white shadow-xl space-y-5 rounded-3xl" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.06)">
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4" style={{ borderBottom: '1px solid rgba(200,131,74,0.1)' }}>
 <h3 className="text-lg font-extrabold flex items-center gap-2" style={{ color: '#2d1f0e' }}>
 <Activity className="w-5 h-5" style={{ color: '#c8834a' }} /> Today&apos;s Roster
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

 <button onClick={refetchRoster} title="Refresh roster"
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
 <th className="p-3">Flags</th>
 <th className="p-3 text-right pr-5">Actions</th>
 </tr>
 </thead>
 <motion.tbody className="divide-y" style={{ divideColor: 'rgba(200,131,74,0.1)' }}>
 {paginated.map((row) => (
 <motion.tr key={row.id} className="hover:bg-[#fcfaf8] transition-colors">
 <td className="p-3 text-sm font-black uppercase" style={{ color: '#2d1f0e' }}>
 {row.name}
 </td>
 <td className="p-3 font-black" style={{ color: '#2d1f0e' }}>{fmtTime(row.check_in_at)}</td>
 <td className="p-3">
 {row.check_out_at
 ? fmtTime(row.check_out_at)
 : <Badge label="Active" type="active" />}
 </td>
 <td className="p-3">
 <div className="flex flex-wrap gap-1">
 {row.is_late && <Badge label="Late" type="late" />}
 {row.is_short && <Badge label="Short" type="short" />}
 {row.is_overtime && <Badge label="OT" type="overtime" />}
 {!row.is_late && !row.is_short && !row.is_overtime && <Badge label="Clean" type="active" />}
 </div>
 </td>
 <td className="p-3 text-right pr-5">
 <div className="flex justify-end gap-2">
 <button
 onClick={() => handleEditClick(row)}
 className="p-1.5 rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
 title="Correct / Reassign Worker"
 >
 <Edit2 className="w-4 h-4" />
 </button>
 <button
 onClick={() => handleDeleteClick(row)}
 className="p-1.5 rounded-md text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors"
 title="Hard Delete Attendance"
 >
 <X className="w-4 h-4" />
 </button>
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

 {/* Edit / Reassign Attendance Modal */}
 <AnimatePresence>
 {editModal && (
 <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
 <motion.div
 initial={{ opacity: 0, scale: 0.95, y: 10 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 10 }}
 className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100"
 >
 <div className="p-5 border-b border-slate-100 flex items-center justify-between">
 <div>
 <h3 className="text-lg font-black flex items-center gap-2" style={{ color: '#2d1f0e' }}>
 <Edit2 className="w-5 h-5" style={{ color: '#c8834a' }} /> Edit Attendance
 </h3>
 <p className="text-xs font-black uppercase mt-1" style={{ color: '#9a7a5a' }}>
 {editModal.name}
 </p>
 </div>
 <button onClick={() => setEditModal(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-full transition-colors self-start">
 <X className="w-5 h-5" />
 </button>
 </div>

 <div className="p-5 space-y-4 bg-slate-50/50 text-left">
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 <div>
 <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-1">Work Date</label>
 <div className="h-11 px-3 flex items-center rounded-xl border border-slate-200 bg-slate-100 text-xs font-black text-slate-700">
 {fmtDate(editWorkDate)}
 </div>
 </div>
 <div>
 <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-1">Check In</label>
 <input
 type="time"
 className="w-full h-11 px-3 text-xs font-bold rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#c8834a]"
 value={editForm.check_in}
 onChange={e => setEditForm({ ...editForm, check_in: e.target.value })}
 />
 </div>
 <div>
 <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-1">Check Out</label>
 <input
 type="time"
 className="w-full h-11 px-3 text-xs font-bold rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#c8834a]"
 value={editForm.check_out}
 onChange={e => setEditForm({ ...editForm, check_out: e.target.value })}
 />
 </div>
 </div>

 <div>
 <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-1">Correct Worker (Who actually worked)</label>
 <select
 className="w-full h-11 px-3 text-xs font-bold rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#c8834a]"
 value={editForm.employee_id}
 onChange={e => setEditForm({ ...editForm, employee_id: e.target.value })}
 >
 <option value="" disabled>Select the correct worker</option>
 {workers.map(w => (
 <option key={w.id} value={w.id}>{w.name} ({w.employee_barcode || String(w.id).slice(0,6)})</option>
 ))}
 </select>
 </div>

 {isReassign && (
 <div className="p-3 rounded-xl flex items-start gap-2" style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.25)' }}>
 <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#c8834a' }} />
 <p className="text-[11px] font-bold" style={{ color: '#a86022' }}>
 Changing the worker moves this attendance and all of today&apos;s production events (and wages) from <span className="font-black uppercase">{editModal.name}</span> to the selected worker.
 </p>
 </div>
 )}

 <div>
 <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-1">Reason for correction *</label>
 <input
 type="text"
 placeholder="e.g. Card swapped by mistake at gate"
 className="w-full h-11 px-3 text-xs font-bold rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#c8834a]"
 value={editForm.reason}
 onChange={e => setEditForm({ ...editForm, reason: e.target.value })}
 />
 </div>
 </div>
 
 <div className="p-5 bg-white border-t border-slate-100 flex gap-3">
 <button onClick={() => setEditModal(null)} className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer text-center">
 Cancel
 </button>
 <button
 onClick={handleSaveCorrection}
 disabled={actionLoading}
 className="flex-1 py-3 px-4 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer text-center shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
 style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}
 >
 {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
 Save Changes
 </button>
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>

 <AnimatePresence>
 {deleteModal && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
 <motion.div
 initial={{ opacity: 0, scale: 0.95, y: 10 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 10 }}
 className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100"
 >
 <div className="p-5 border-b border-slate-100 flex items-center justify-between">
 <div>
 <h3 className="text-lg font-black text-rose-700 flex items-center gap-2">
 <AlertTriangle className="w-5 h-5" /> Hard Delete Attendance
 </h3>
 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">
 Irreversible action
 </p>
 </div>
 <button onClick={() => setDeleteModal(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-full transition-colors self-start">
 <X className="w-5 h-5" />
 </button>
 </div>
 
 <div className="p-5 space-y-4 bg-slate-50/50 text-left">
 <div className="p-3 bg-red-50 border border-red-100 rounded-xl mb-2">
 <p className="text-[11px] font-bold text-red-700">
 You are about to permanently delete the attendance record for <span className="font-black underline">{deleteModal.name}</span>. This will remove this check-in entirely.
 </p>
 </div>
 
 <div>
 <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-1">Reason for deletion *</label>
 <input
 type="text"
 placeholder="e.g. Accidental proxy entry"
 className="w-full h-11 px-3 text-xs font-bold rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-400"
 value={deleteReason}
 onChange={e => setDeleteReason(e.target.value)}
 />
 </div>
 </div>
 
 <div className="p-5 bg-white border-t border-slate-100 flex gap-3">
 <button onClick={() => setDeleteModal(null)} className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer text-center">
 Cancel
 </button>
 <button
 onClick={handleConfirmDelete}
 disabled={actionLoading}
 className="flex-1 py-3 px-4 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer text-center shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
 style={{ background: 'linear-gradient(135deg, #e11d48, #9f1239)' }}
 >
 {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
 Confirm Delete
 </button>
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>
 </motion.div>
 );
}