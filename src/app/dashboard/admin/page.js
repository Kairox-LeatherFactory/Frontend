'use client';
import { useState} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useGetUsersQuery, useGetEmployeesQuery } from '@/store/slices/adminApiSlice';

import {
  CheckCircle2, Users,Factory,
  ShieldCheck, Lock, AlertCircle, Building2
} from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';
import { staggerContainer, fadeUpItem} from '@/lib/motionVariants';
import { RegisterEmployeeForm } from './components/EmployeeForm';
import { CreateUserForm } from './components/UserForm';
import { UsersDirectory } from './components/UserDirectory';
import { EmployeeDirectory } from './components/EmployeeDirectory';

export default function AdminDashboard() {
  const { user} = useAuth();

  const isHRAdmin = user === 'hr' || user === 'direct_manager';
  const [toast, setToast] = useState(null);
  const { data: users = [], isLoading: usersLoading } = useGetUsersQuery();
const { data: employees = [], isLoading: empLoading } = useGetEmployeesQuery();
const loading = usersLoading || empLoading;
  const showToast = (form, type, msg) => {
    setToast({ form, type, msg });
    setTimeout(() => setToast(null), 2500);
  };

 
  // ─── ACCESS DENIED ──────────────────────────────────────────────────────────
  if (!isHRAdmin) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
        <SpotlightCard className="p-12 text-center rounded-3xl max-w-lg mx-auto mt-12" style={{ background: '#fff9f0', border: '1px solid rgba(200,131,74,0.3)' }} spotlightColor="rgba(200,131,74,0.1)">
          <Lock className="w-14 h-14 mx-auto mb-3" style={{ color: '#c8834a' }} />
          <h3 className="text-xl font-black uppercase tracking-wide" style={{ color: '#9c4221' }}>Admin Access Required</h3>
          <p className="text-sm font-semibold mt-2" style={{ color: '#a86022' }}>
            Manager or HR Admin privileges are required to view and manage users.
          </p>
        </SpotlightCard>
      </motion.div>
    );
  }

  return (
    <motion.div className="space-y-8 pb-12" variants={staggerContainer} initial="hidden" animate="show">

      {/* ─── GLOBAL TOAST (fallback) ─── */}
      <AnimatePresence>
        {toast && toast.form === 'global' && (
          <motion.div
            className="fixed bottom-6 right-4 sm:right-6 z-[999999] max-w-sm w-full"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center gap-3 p-4 rounded-2xl shadow-2xl font-semibold text-sm backdrop-blur-md border"
              style={{
                background: toast.type === 'success' ? 'rgba(240, 253, 244, 0.95)' : 'rgba(254, 242, 242, 0.95)',
                borderColor: toast.type === 'success' ? 'rgba(22, 163, 74, 0.25)' : 'rgba(220, 38, 38, 0.2)',
                color: toast.type === 'success' ? '#166534' : '#991b1b',
              }}>
              {toast.type === 'success'
                ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
              <p>{toast.msg}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── HEADER ─── */}
      <motion.div variants={fadeUpItem}>
        <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: '#c8834a' }}>Platform Administration</p>
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3" style={{ color: '#2d1f0e' }}>
          <ShieldCheck className="w-8 h-8" style={{ color: '#c8834a' }} />
          Admin &amp; User Management
        </h1>
        <p className="font-medium mt-1" style={{ color: '#9a7a5a' }}>
          Register factory floor employees and provision system login accounts.
        </p>
      </motion.div>

      {/* ─── STATS STRIP ─── */}
      <motion.div className="grid grid-cols-2 sm:grid-cols-3 gap-4" variants={staggerContainer}>
        {[
          { label: 'Total Accounts', value: users.length, icon: Users },
          { label: 'Internal Staff', value: users.filter(u => !u.client_id).length, icon: Factory },
          { label: 'Client Portals', value: users.filter(u => !!u.client_id).length, icon: Building2 },
        ].map(({ label, value, icon: Icon }) => (
          <SpotlightCard
            key={label}
            variants={fadeUpItem}
            whileHover={{ y: -4, scale: 1.015 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            className="p-4 bg-white rounded-2xl shadow-sm"
            style={{ border: '1px solid rgba(200,131,74,0.12)' }}
            spotlightColor="rgba(200,131,74,0.05)"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: '#9a7a5a' }}>{label}</span>
              <Icon className="w-4 h-4" style={{ color: '#c8834a' }} />
            </div>
            <p className="text-2xl font-black" style={{ color: '#2d1f0e' }}>{loading ? '—' : value}</p>
          </SpotlightCard>
        ))}
      </motion.div>

      {/* ─── FORMS GRID ─── */}
      <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-6" variants={staggerContainer}>
<RegisterEmployeeForm onSuccess={()=>{}} toast={toast} showToast={showToast} />
<CreateUserForm  onSuccess={()=>{}} toast={toast} showToast={showToast} />
 </motion.div>

    <UsersDirectory 
  users={users} 
  employees={employees} 
  loading={loading} 
  refreshUsers={()=>{}} 
  showToast={showToast} 
/>
<EmployeeDirectory employees={employees} loading={loading} />

</motion.div>

  );
}
