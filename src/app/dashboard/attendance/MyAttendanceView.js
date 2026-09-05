// attendance view and check in and checkout logic code
'use client';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Timer, Loader2, LogIn, LogOut, Clock, Zap, CalendarDays } from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';
import { motion } from 'framer-motion';
import {AlertBanner, padTime, fmtTime, Badge, fmtDate, fmtDist, Paginator } from './shared';
import { 
  useGetMyStatusQuery, 
  useGetMyHistoryQuery, 
  useCheckInMutation, 
  useCheckOutMutation 
} from '@/store/slices/apiSlice';

export default function MyAttendanceView() {
   const user = useSelector(state => state.auth.user);
 const isManagingDirector = user === 'managing_director';
 const isFloorManager = user === 'stitching_manager' || user === 'cutting_manager' || user === 'lining_manager';


 const [startDate, setStartDate] = useState(() => {
 const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0];
 });
 const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  // --- RTK QUERY HOOKS ---
  const { data: status, isLoading: statusLoading } = useGetMyStatusQuery();
  const { data: historyData, isLoading: histLoading } = useGetMyHistoryQuery({ start: startDate, end: endDate });
  
 
  const history = useMemo(() => historyData ? [...historyData].reverse() : [], [historyData]);

  const [checkInApi, { isLoading: isCheckingIn }] = useCheckInMutation();
  const [countdown, setCountdown] = useState(null);
  const [checkOutApi, { isLoading: isCheckingOut }] = useCheckOutMutation();
  const actionLoading = isCheckingIn || isCheckingOut;
  useEffect(() => {
    if (status?.remaining_seconds != null && status?.checked_in && !status?.checked_out) {
      setCountdown(status.remaining_seconds);
    } else {
      setCountdown(null);
    }
  }, [status]);

  
 const intervalRef = useRef(null);
 const [page, setPage] = useState(1);
 const PER_PAGE = 8;

 const [alert, setAlert] = useState(null);

 const showAlert = (type, message) => {
 setAlert({ type, message });
 if (type === 'success') setTimeout(() => setAlert(null), 5000);
 };


  const handleCheckIn = async () => {
    try {
      await checkInApi().unwrap(); // .unwrap() pota dhaan success/error catch aagum
      showAlert('success', 'Checked in successfully!');
    } catch (e) {
      showAlert('error', e.data?.message || e.data?.detail || 'Check-in failed.');
    }
  };

  const handleCheckOut = async () => {
    try {
      await checkOutApi().unwrap();
      showAlert('success', 'Checked out. Shift complete!');
      if (intervalRef.current) clearInterval(intervalRef.current);
    } catch (e) {
      showAlert('error', e.data?.message || e.data?.detail || 'Check-out failed.');
    }
  };
 const paginated = useMemo(() => history.slice((page - 1) * PER_PAGE, page * PER_PAGE), [history, page]);
 const totalPages = Math.ceil(history.length / PER_PAGE);
 const checkedIn = status?.checked_in ?? false;
 const checkedOut = status?.checked_out ?? false;
 const busy = actionLoading;

 return (
 <motion.div className="space-y-6">
 <div>
 <h1 className="text-3xl font-black tracking-tight" style={{ color: '#2d1f0e' }}>My Attendance</h1>
 <p className="font-medium mt-1" style={{ color: '#9a7a5a' }}>Track your shift status and review personal attendance history.</p>
 </div>

 <AlertBanner type={alert?.type} message={alert?.message} onClose={() => setAlert(null)} />

 {/* Hero row — Managing Director */}
 {!isManagingDirector && (
 <motion.div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Shift Timer */}
 <SpotlightCard
 
 whileHover={{ y: -6, scale: 1.02 }}
 transition={{ type: 'spring', stiffness: 320, damping: 22 }}
 className="p-6 bg-white shadow-xl space-y-4 rounded-3xl" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.06)">
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
 <SpotlightCard
 
 whileHover={{ y: -6, scale: 1.02 }}
 transition={{ type: 'spring', stiffness: 320, damping: 22 }}
 className="lg:col-span-2 p-6 bg-white shadow-xl space-y-5 rounded-3xl" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.06)">
 <h3 className="text-sm font-extrabold uppercase tracking-widest flex items-center gap-2" style={{ color: '#9a7a5a' }}>
 <Zap className="w-4 h-4" style={{ color: '#c8834a' }} /> Action Terminal
 </h3>
 <div className="flex flex-col gap-3">
 <button onClick={handleCheckIn}
 disabled={checkedIn || busy}
 className="w-full flex items-center justify-center gap-3 h-14 sm:h-16 min-h-[56px] rounded-2xl font-black text-base sm:text-sm text-white transition-all shadow-lg shadow-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation hover:-translate-y-0.5 active:translate-y-0"
 style={{ background: 'linear-gradient(135deg, #38a169, #48bb78)' }}>
 {busy && !checkedIn
 ? <><Loader2 className="w-5 h-5 animate-spin" /> Checking in…</>
 : <><LogIn className="w-5 h-5" /> Check In</>}
 </button>
 <button onClick={handleCheckOut}
 disabled={!checkedIn || checkedOut || busy}
 className="w-full flex items-center justify-center gap-3 h-14 sm:h-16 min-h-[56px] rounded-2xl font-black text-base sm:text-sm text-white transition-all shadow-lg shadow-red-200 disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation hover:-translate-y-0.5 active:translate-y-0"
 style={{ background: 'linear-gradient(135deg, #e53e3e, #f56565)' }}>
 {busy && checkedIn && !checkedOut
 ? <><Loader2 className="w-5 h-5 animate-spin" /> Checking out…</>
 : <><LogOut className="w-5 h-5" /> Check Out</>}
 </button>
 </div>
 <div className="flex items-center gap-2 text-[11px] font-semibold" style={{ color: '#9a7a5a' }}>
 <Clock className="w-3.5 h-3.5" style={{ color: '#c8834a' }} /> One-Tap Attendance Terminal
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
 </motion.div>
 )}

 {/* Personal History */}
 {!isFloorManager && (
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
 <motion.tbody className="divide-y" style={{ divideColor: 'rgba(200,131,74,0.1)', color: '#2d1f0e' }}>
 {paginated.map((row) => (
 <motion.tr key={row.id} className="hover:bg-[#fcfaf8] transition-colors">
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
 </motion.tr>
 ))}
 </motion.tbody>
 </table>
 </div>

 {/* Mobile cards — shown only on mobile */}
 <motion.div className="sm:hidden space-y-3">
 {paginated.map((row) => (
 <motion.div key={row.id} className="rounded-xl p-4 space-y-3" style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.1)' }}>
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
 </motion.div>
 ))}
 </motion.div>
 <Paginator page={page} totalPages={totalPages} setPage={setPage} total={history.length} perPage={PER_PAGE} />
 </>
 )}
 </SpotlightCard>
 )}
 </motion.div>
 );
}