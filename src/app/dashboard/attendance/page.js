'use client';
import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Clock, 
 Users,
  CalendarDays,Building2,QrCode
} from 'lucide-react';

import { motion} from 'framer-motion';
import {
    apiFetch,
  LockedView, EmployeesListView, AttendanceHistoryView,
} from './shared';
import MyAttendanceView from './MyAttendanceView';
import FloorCommandView from './FloorCommandView';
import OperationsHRView from './OperationsHRView';
// ═══════════════════════════════════════════════════════════════════════════════
// ROOT EXPORT — Attendance Module Router
// ═══════════════════════════════════════════════════════════════════════════════
export default function AttendancePage() {
 const [hasMounted, setHasMounted] = useState(false);

 useEffect(() => {
 setHasMounted(true);
 }, []);

 const { user, token } = useAuth();

 const isManager = user === 'direct_manager' || user === 'managing_director' || user === 'hr';
 const isSupervisor = isManager;
 const isSecurity = user === 'security';
 const isMD = user === 'managing_director';

 const tabs = useMemo(() => {
 return isSecurity ? [
 { key: 'employees', label: 'Employees List', icon: Users, show: true },
 { key: 'proxy', label: 'Floor Command', icon: QrCode, show: true },
 { key: 'history', label: 'Attendance History', icon: CalendarDays, show: true },
 ] : [
 { key: 'me', label: 'My Attendance', icon: Clock, show: !isMD },
 { key: 'proxy', label: 'Floor Command', icon: Users, show: isSupervisor },
 { key: 'admin', label: 'Operations & HR', icon: Building2, show: isManager },
 ].filter((t) => t.show);
 }, [isSecurity, isMD, isSupervisor, isManager]);

 const defaultTab = useMemo(() => tabs[0]?.key || (isSecurity ? 'employees' : 'me'), [tabs, isSecurity]);
 const [activeTab, setActiveTab] = useState(defaultTab);
 const [workers, setWorkers] = useState([]);
 const [workerRefreshKey, setWorkerRefreshKey] = useState(0);

 const refreshWorkers = () => {
 setWorkerRefreshKey(k => k + 1);
 };

 useEffect(() => {
 if (defaultTab && !activeTab) {
 setActiveTab(defaultTab);
 }
 }, [defaultTab, activeTab]);

 useEffect(() => {
 if (tabs.length > 0 && !tabs.find(t => t.key === activeTab)) {
 setActiveTab(tabs[0].key);
 }
 }, [tabs, activeTab]);

 useEffect(() => {
 if (!hasMounted) return;
 const timer = setTimeout(() => {
 if ((activeTab === 'proxy' || activeTab === 'admin' || activeTab === 'employees')) {
 apiFetch('/api/v1/employees', {}, token)
 .then(setWorkers)
 .catch(() => { });
 }
 }, 100);
 return () => clearTimeout(timer);
 }, [activeTab, token, workerRefreshKey, hasMounted]);

 if (!hasMounted) {
 return (
 <div className="w-full py-20 flex items-center justify-center bg-[#faf6f0]">
 <div className="flex flex-col items-center text-[#c8834a] animate-pulse">
 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c8834a] mb-2" />
 <span className="text-xs font-bold tracking-widest uppercase">Loading Attendance...</span>
 </div>
 </div>
 );
 }

 return (
 <div className="w-full space-y-6 pb-12">
 <div className="flex items-center gap-1 border-b overflow-x-auto" style={{ borderBottomColor: 'rgba(200,131,74,0.2)' }}>
 {tabs.map(({ key, label, icon: Icon }) => {
 const isActive = activeTab === key;
 return (
 <button key={key} onClick={() => setActiveTab(key)}
 className="relative flex items-center gap-2 px-4 py-3 text-xs font-black whitespace-nowrap transition-colors"
 style={{ color: isActive ? '#c8834a' : '#9a7a5a' }}>
 <Icon className="w-4 h-4 relative" />
 <span className="relative">{label}</span>
 {isActive && (
 <motion.span
 layoutId="attendanceTabUnderline"
 className="absolute left-0 right-0 -bottom-px h-[2px]"
 style={{ background: '#c8834a' }}
 transition={{ type: 'spring', stiffness: 450, damping: 32 }}
 />
 )}
 </button>
 );
 })}
 </div>

 <div key={activeTab} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
 {activeTab === 'me' ? (
 !isSecurity ? <MyAttendanceView token={token} /> : <LockedView title="Restricted" description="Access denied" />
 ) : activeTab === 'employees' ? (
 isSecurity ? <EmployeesListView workers={workers} /> : <LockedView title="Restricted" description="Access denied" />
 ) : activeTab === 'history' ? (
 isSecurity ? <AttendanceHistoryView token={token} /> : <LockedView title="Restricted" description="Access denied" />
 ) : activeTab === 'proxy' ? (
 (isSupervisor || isSecurity)
 ? <FloorCommandView workers={workers} token={token} onWorkerAdded={refreshWorkers} isSecurity={isSecurity} />
 : <LockedView title="Authorization Required" description="Floor Command is restricted." />
 ) : activeTab === 'admin' ? (
 (isManager && !isSecurity)
 ? <OperationsHRView token={token} />
 : <LockedView title="Direct Manager Authorization Required" description="Operations & HR is restricted to Direct Managers only." />
 ) : (
 <LockedView title="Loading State" description="Preparing module..." />
 )}
 </div>
 </div>
 );
}










