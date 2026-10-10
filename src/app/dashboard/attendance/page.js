'use client';
import { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

import {
  Clock, 
 Users,
  CalendarDays,Building2,QrCode
} from 'lucide-react';
import { useGetEmployeesQuery } from '@/store/slices/attendanceApiSlice';
import { usePageTrail } from '@/context/PageTrailContext';

import { motion} from 'framer-motion';
import {
   
  LockedView, EmployeesListView, AttendanceHistoryView,
} from './shared';
import MyAttendanceView from './MyAttendanceView';
import FloorCommandView from './FloorCommandView';
import OperationsHRView from './OperationsHRView';
import { useSelector, useDispatch } from 'react-redux';
import { setWorkers, setActiveTab } from '@/store/slices/attendanceSlice';


function AttendanceLoading() {
 return (
 <div className="w-full py-20 flex items-center justify-center bg-[#faf6f0]">
 <div className="flex flex-col items-center text-[#c8834a] animate-pulse">
 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c8834a] mb-2" />
 <span className="text-xs font-bold tracking-widest uppercase">Loading Attendance...</span>
 </div>
 </div>
 );
}

// useSearchParams (the ?tab= link) needs a Suspense boundary.
export default function AttendancePage() {
 return (
 <Suspense fallback={<AttendanceLoading />}>
 <AttendanceInner />
 </Suspense>
 );
}

function AttendanceInner() {
 const [hasMounted, setHasMounted] = useState(false);
 const searchParams = useSearchParams();
 const tabParam = searchParams.get('tab');

 useEffect(() => {
 setHasMounted(true);
 }, []);

 const { user} = useSelector(state => state.auth); 
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
 const [workerRefreshKey, setWorkerRefreshKey] = useState(0);
   // Redux Attendance state
  const workers = useSelector(state => state.attendance.workers);
  const activeTab = useSelector(state => state.attendance.activeTab) || defaultTab;
 const dispatch = useDispatch();
    // --- RTK QUERY HOOKS ---
  const shouldFetchEmployees = activeTab === 'proxy' || activeTab === 'admin' || activeTab === 'employees';
  const { data: employeesData } = useGetEmployeesQuery(undefined, { skip: !shouldFetchEmployees });
console.log(employeesData,"employeesData",shouldFetchEmployees)
  useEffect(() => {
    if (employeesData) {
      dispatch(setWorkers(employeesData));
    }
  }, [employeesData, dispatch]);



 // Header path: Attendance › <tab>
 usePageTrail([tabs.find((t) => t.key === activeTab)?.label]);

 const refreshWorkers = () => {
 setWorkerRefreshKey(k => k + 1);
 };
   const handleTabChange = (key) => {
    dispatch(setActiveTab(key));
  };

 useEffect(() => {
 if (defaultTab && !activeTab) {
 handleTabChange(defaultTab);
 }
 }, [defaultTab, activeTab]);

 useEffect(() => {
 if (tabs.length > 0 && !tabs.find(t => t.key === activeTab)) {
 handleTabChange(tabs[0].key);
 }
 }, [tabs, activeTab]);

 // A link can open a tab directly, e.g. ?tab=admin from the DM dashboard's
 // "Workers In Today" card — if this user can see that tab.
 useEffect(() => {
 if (tabParam && tabs.some(t => t.key === tabParam)) {
 dispatch(setActiveTab(tabParam));
 }
 }, [tabParam, tabs, dispatch]);

if (!hasMounted) {
 return <AttendanceLoading />;
 }

 return (
 <div className="w-full space-y-6 pb-12">
 <div className="flex items-center gap-1 border-b overflow-x-auto" style={{ borderBottomColor: 'rgba(200,131,74,0.2)' }}>
 {tabs.map(({ key, label, icon: Icon }) => {
 const isActive = activeTab === key;
 return (
 <button key={key} onClick={() => handleTabChange(key)}
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
      !isSecurity ? <MyAttendanceView /> : <LockedView title="Restricted" description="Access denied" />
    ) : activeTab === 'employees' ? (
      isSecurity ? <EmployeesListView workers={workers} /> : <LockedView title="Restricted" description="Access denied" />
    ) : activeTab === 'history' ? (
      isSecurity ? <AttendanceHistoryView workers={workers} userRole={user} /> : <LockedView title="Restricted" description="Access denied" />
    ) : activeTab === 'proxy' ? (
      (isSupervisor || isSecurity)
        ? <FloorCommandView workers={workers} onWorkerAdded={refreshWorkers} isSecurity={isSecurity} />
        : <LockedView title="Authorization Required" description="Floor Command is restricted." />
    ) : activeTab === 'admin' ? (
      (isManager && !isSecurity)
        ? <OperationsHRView workers={workers} />
        : <LockedView title="Direct Manager Authorization Required" description="Operations & HR is restricted to Direct Managers only." />
    ) : (
      <LockedView title="Loading State" description="Preparing module..." />
    )}
  </div>

 </div>
 );
}










