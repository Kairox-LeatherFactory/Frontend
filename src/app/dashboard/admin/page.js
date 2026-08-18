'use client';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { apiGetUsers, apiCreateUser, apiPatchEmployeeBarcode } from '@/lib/api';
import {
  CheckCircle2, Users, UserPlus, Factory, Loader2,
  ShieldCheck, Lock, AlertCircle, Building2, User,
  Search, Barcode, Printer, RefreshCw, XCircle, QrCode, X, Check
} from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';
import JsBarcode from 'jsbarcode';
import { createPortal } from 'react-dom';
import { staggerContainer, fadeUpItem, rowStagger } from '@/lib/motionVariants';

// ─── Shared styled input ─────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div>
      <label className="text-[11px] font-black uppercase tracking-wider block mb-1" style={{ color: '#9a7a5a' }}>{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full h-11 px-4 rounded-xl text-sm font-semibold outline-none transition-all focus:ring-2 focus:ring-[#c8834a]/30 focus:border-[#c8834a] hover:border-[#c8834a]/50 bg-[#faf6f0] text-[#2d1f0e] border-[1.5px] border-[#c8834a]/20";

const ROLE_COLORS = {
  direct_manager: { bg: '#fff9f0', color: '#c8834a', border: 'rgba(200,131,74,0.3)', label: 'Direct Manager' },
  cutting_manager: { bg: '#eff6ff', color: '#2563eb', border: 'rgba(37,99,235,0.2)', label: 'Cutting Manager' },
  lining_manager: { bg: '#fff1f2', color: '#e11d48', border: 'rgba(225,29,72,0.2)', label: 'Lining Manager' },
  stitching_manager: { bg: '#f5f3ff', color: '#7c3aed', border: 'rgba(124,58,237,0.2)', label: 'Stitching Manager' },
  hr_admin: { bg: '#f0fdf4', color: '#16a34a', border: 'rgba(22,163,74,0.2)', label: 'HR Admin' },
  client_viewer: { bg: '#faf6f0', color: '#9a7a5a', border: 'rgba(200,131,74,0.15)', label: 'Client Viewer' },
  viewer: { bg: '#f1f5f9', color: '#64748b', border: 'rgba(100,116,139,0.15)', label: 'Viewer' },
  employee: { bg: '#ecfdf5', color: '#059669', border: 'rgba(5,150,105,0.15)', label: 'Employee' },
};

function EmployeeIdCardModal({ employee, onClose }) {
  const svgRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  const barcodeCode = employee?.employee_barcode || `EMP-${String(employee?.id || '000000').padStart(6, '0')}`;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && svgRef.current && barcodeCode) {
      try {
        JsBarcode(svgRef.current, barcodeCode, {
          format: 'CODE128',
          width: 1.8,
          height: 48,
          displayValue: true,
          fontSize: 12,
          fontOptions: 'bold',
          margin: 6,
        });
      } catch (err) {
        console.error('JsBarcode error:', err);
      }
    }
  }, [mounted, barcodeCode]);

  if (!mounted || typeof document === 'undefined' || !document.body) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-sm overflow-hidden relative">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-[#2d1f0e] to-[#3a2817] p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#c8834a]/20 border border-[#c8834a]/40 flex items-center justify-center">
              <Barcode className="w-5 h-5 text-[#f5d4a4]" />
            </div>
            <div>
              <h3 className="text-sm font-black">Employee ID Badge Tag</h3>
              <p className="text-[10px] text-[#e2d5c3]">Official Factory Scanner Tag</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Badge Body */}
        <div className="p-6 bg-[#faf6f0] flex flex-col items-center gap-4 text-center">
          <div className="w-full bg-white border-2 border-[#c8834a]/30 rounded-2xl p-5 shadow-lg space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-[10px] font-black uppercase text-[#9a7a5a] tracking-widest">KairoX Leather ERP</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">ACTIVE</span>
            </div>
            <div className="space-y-0.5">
              <h4 className="text-lg font-black text-[#2d1f0e]">{employee?.name}</h4>
              <p className="text-xs font-bold text-[#c8834a]">{employee?.designation || 'Floor Operator'}</p>
            </div>
            <div className="py-2 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100">
              <svg ref={svgRef} className="max-w-full" />
            </div>
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 pt-1">
              <span>ID: #{employee?.id}</span>
              <span>Type: {employee?.wage_type === 'monthly' ? 'Monthly Salary' : 'Piece Rate'}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 bg-white border-t border-slate-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl text-xs font-extrabold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer">
            Close
          </button>
          <button onClick={() => window.print()} className="flex-1 py-3 rounded-xl text-xs font-extrabold text-white shadow-md flex items-center justify-center gap-2 cursor-pointer" style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}>
            <Printer className="w-4 h-4" /> Print Badge
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function AdminDashboard() {
  const { user, token } = useAuth();

  const isHRAdmin = user === 'hr_admin' || user === 'direct_manager';

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');

  // 1. Worker Form State
  const [workerForm, setWorkerForm] = useState({
    name: '',
    phone: '',
    designation: '',
    wage_type: '',
    daily_rate: ''
  });
  const [isOther, setIsOther] = useState(false)
  const [isSubmittingWorker, setIsSubmittingWorker] = useState(false);
  const handleChange = (e) => {
    const { name, value } = e.target;
    setWorkerForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };
  // 2. User Form State
  const [userForm, setUserForm] = useState({
    name: '',
    phone: '',
    email: '',
    role: '',
    password: '',
    employee_id: ''
  });
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  const [selectedEmployeeModal, setSelectedEmployeeModal] = useState(null);
  const [barcodeActionLoading, setBarcodeActionLoading] = useState({});

  const handleReissueBarcode = async (emp) => {
    const empId = emp.id || emp.employee_id;
    if (!empId) return;
    setBarcodeActionLoading(prev => ({ ...prev, [empId]: 'reissue' }));
    try {
      await apiPatchEmployeeBarcode(token, empId, 'reissue');
      showToast('global', 'success', `🟢 Barcode reissued for ${emp.name}! Old code retired (410), new card minted.`);
      refreshUsers();
    } catch (err) {
      showToast('global', 'error', err.message || 'Failed to reissue barcode.');
    } finally {
      setBarcodeActionLoading(prev => ({ ...prev, [empId]: null }));
    }
  };

  const handleDeactivateBarcode = async (emp) => {
    const empId = emp.id || emp.employee_id;
    if (!empId) return;
    if (!confirm(`Are you sure you want to deactivate barcode for ${emp.name}? Scans will return RETIRED status while history remains sacred.`)) return;
    setBarcodeActionLoading(prev => ({ ...prev, [empId]: 'deactivate' }));
    try {
      await apiPatchEmployeeBarcode(token, empId, 'deactivate');
      showToast('global', 'success', `🔴 Barcode deactivated for ${emp.name} (Status: RETIRED).`);
      refreshUsers();
    } catch (err) {
      showToast('global', 'error', err.message || 'Failed to deactivate barcode.');
    } finally {
      setBarcodeActionLoading(prev => ({ ...prev, [empId]: null }));
    }
  };

  const showToast = (form, type, msg) => {
    setToast({ form, type, msg });
    setTimeout(() => setToast(null), 2500);
  };

  const refreshUsers = async () => {
    try { setUsers(await apiGetUsers(token)); } catch { }
  };

  useEffect(() => {
    if (!token) return;
    (async () => {
      try { setUsers(await apiGetUsers(token)); }
      catch { showToast('global', 'error', 'Failed to load users.'); }
      finally { setLoading(false); }
    })();
  }, [token]);

  // Handle Add Worker Submission (Strictly Pure Network Action — NO GPS Triggers)
  const handleCreateWorker = async (e) => {
    e.preventDefault();
    const { name, phone, designation, wage_type, daily_rate } = workerForm;

    if (!name.trim() || !designation.trim()) {
      showToast('worker', 'error', 'Name and designation are required.');
      return;
    }
    if (wage_type === 'monthly' && !phone.trim()) {
      showToast('worker', 'error', 'Phone number is required for monthly employees.');
      return;
    }
    if (phone.trim() && phone.trim().length !== 10) {
      showToast('worker', 'error', 'Phone number must be exactly 10 digits.');
      return;
    }

    setIsSubmittingWorker(true);
    try {
      const payload = {
        name: name.trim(),
        designation: designation.trim(),
        wage_type: wage_type,
        phone: phone.trim() || null,
        daily_rate: daily_rate ? parseFloat(daily_rate) : null,
      };

      const res = await fetch(`/api/v1/employees`, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Server error: ${res.status}`);
      }

      showToast('worker', 'success', `Worker "${name}" successfully registered onto the system roster.`);
      setWorkerForm({ name: '', phone: '', designation: '', wage_type: '', daily_rate: '' });
      await refreshUsers();
    } catch (err) {
      showToast('worker', 'error', err.message || 'Onboarding registration failed.');
    } finally {
      setIsSubmittingWorker(false);
    }
  };

  // Handle Add User Login Submission
  const handleCreateUser = async (e) => {
    e.preventDefault();
    const { name, phone, password, role, email, employee_id } = userForm;
    if (!name.trim() || !phone.trim() || !password.trim()) {
      showToast('user', 'error', 'Name, Phone, and Password are required.');
      return;
    }
    if (phone.trim().length !== 10) {
      showToast('user', 'error', 'Phone number must be exactly 10 digits.');
      return;
    }

    setIsSubmittingUser(true);
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        password: password,
        role: role,
        email: email.trim() || null,
        employee_id: employee_id.trim() || null,
      };

      await apiCreateUser(token, payload);
      showToast('user', 'success', `User account login for "${name}" created successfully.`);
      setUserForm({ name: '', phone: '', email: '', role: '', password: '', employee_id: '' });
      await refreshUsers();
    } catch (err) {
      showToast('user', 'error', err.message || 'Failed to create user login.');
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const filteredUsers = users.filter(u =>
    !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.role?.toLowerCase().includes(search.toLowerCase())
  );

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

        {/* 1. REGISTER FACTORY EMPLOYEE CARD */}
        <SpotlightCard variants={fadeUpItem} className="p-6 bg-white shadow-xl rounded-3xl" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.06)">
          <h3 className="text-lg font-extrabold pb-4 mb-4 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(200,131,74,0.1)', color: '#2d1f0e' }}>
            <Factory className="w-5 h-5" style={{ color: '#c8834a' }} /> Register Factory Employee
          </h3>
          <form onSubmit={handleCreateWorker} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Field label="Employee Full Name *">
                  <input type="text" className={inputCls}
                    value={workerForm.name}
                    onChange={e => setWorkerForm({ ...workerForm, name: e.target.value })}
                    placeholder="e.g. Ramesh Kumar" required />
                </Field>
              </div>

              <div className="sm:col-span-2">
                <Field label="Designation *">
                  <select
                    className={inputCls}
                    value={isOther ? 'Other' : workerForm.designation}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === 'Other') {
                        setIsOther(true);
                        setWorkerForm({ ...workerForm, designation: '' });
                      } else {
                        setIsOther(false);
                        setWorkerForm({ ...workerForm, designation: val });
                      }
                    }}
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
                </Field>
              </div>

              {isOther && (
                <div className="sm:col-span-2 animate-fade-in">
                  <Field label="Custom Designation *">
                    <input
                      type="text"
                      className={inputCls}
                      value={workerForm.designation}
                      placeholder="Type here"
                      required
                      onChange={e => setWorkerForm({ ...workerForm, designation: e.target.value })}
                    />
                  </Field>
                </div>
              )}

              <Field label="Wage Type">
                <select className={inputCls}
                  value={workerForm.wage_type}
                  onChange={e => setWorkerForm({ ...workerForm, wage_type: e.target.value })}>
                  <option value="" disabled>-- Select Wage Type --</option>
                  <option value="piece_rate">Piece Rate / Daily Wage</option>
                  <option value="monthly">Monthly Salary</option>
                </select>
              </Field>

              {workerForm.wage_type === 'monthly' ? (
                <>
                  <Field label="Phone Number *">
                    <input type="tel" inputMode="numeric" pattern="[0-9]*" className={inputCls}
                      value={workerForm.phone}
                      placeholder="10-digit mobile number"
                      maxLength={10}
                      onChange={e => setWorkerForm({ ...workerForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} required />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="Phone Number (Optional)">
                    <input type="tel" inputMode="numeric" pattern="[0-9]*" className={inputCls}
                      value={workerForm.phone}
                      placeholder="Optional for daily wage"
                      maxLength={10}
                      onChange={e => setWorkerForm({ ...workerForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
                  </Field>
                  <Field label="Daily Rate (₹)">
                    <input type="number" className={inputCls}
                      value={workerForm.daily_rate}
                      placeholder="e.g. 500"
                      onChange={e => setWorkerForm({ ...workerForm, daily_rate: e.target.value })} />
                  </Field>
                </>
              )}
            </div>

            <button type="submit" disabled={isSubmittingWorker}
              className="w-full h-11 rounded-xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-40 disabled:translate-y-0"
              style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}>
              {isSubmittingWorker ? <><Loader2 className="w-4 h-4 animate-spin" /> Registering...</> : <><UserPlus className="w-4 h-4" /> Register Employee</>}
            </button>

            <AnimatePresence>
              {toast && toast.form === 'worker' && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}
                  className="mt-3 p-3.5 rounded-xl text-xs font-bold border text-center backdrop-blur-sm"
                  style={{
                    background: toast.type === 'success' ? 'rgba(240, 253, 244, 0.95)' : 'rgba(254, 242, 242, 0.95)',
                    borderColor: toast.type === 'success' ? 'rgba(22, 163, 74, 0.25)' : 'rgba(220, 38, 38, 0.2)',
                    color: toast.type === 'success' ? '#166534' : '#991b1b',
                  }}>
                  {toast.msg}
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </SpotlightCard>

        {/* 2. PROVISION USER LOGIN CARD */}
        <SpotlightCard variants={fadeUpItem} className="p-6 bg-white shadow-xl rounded-3xl" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.06)">
          <h3 className="text-lg font-extrabold pb-4 mb-4 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(200,131,74,0.1)', color: '#2d1f0e' }}>
            <Users className="w-5 h-5" style={{ color: '#c8834a' }} /> Create User Login
          </h3>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Field label="Full Name *">
                  <input type="text" className={inputCls}
                    value={userForm.name}
                    placeholder="e.g. Priya Nair" required
                    onChange={e => setUserForm({ ...userForm, name: e.target.value })} />
                </Field>
              </div>

              <Field label="Phone Number (Login ID) *">
                <input type="tel" inputMode="numeric" pattern="[0-9]*" className={inputCls}
                  value={userForm.phone}
                  placeholder="10-digit mobile number" required
                  maxLength={10}
                  onChange={e => setUserForm({ ...userForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
              </Field>

              <Field label="Password *">
                <input type="password" className={inputCls}
                  value={userForm.password}
                  placeholder="Min. 6 characters" required minLength="6"
                  onChange={e => setUserForm({ ...userForm, password: e.target.value })} />
              </Field>

              <div className="sm:col-span-2">
                <Field label="User Role">
                  <select
                    className={inputCls}
                    value={userForm.role}
                    onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                  >
                    <option value="" disabled>-- Select Role --</option>
                    <option value="viewer">Viewer</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="cutting_manager">Cutting Manager</option>
                    <option value="lining_manager">Lining Manager</option>
                    <option value="stitching_manager">Stitching Manager</option>
                    <option value="store_manager">Store Manager</option>
                    <option value="hr">HR</option>
                    <option value="direct_manager">Direct Manager</option>
                    <option value="managing_director">Managing Director</option>
                    <option value="merchandiser">Merchandiser</option>
                    <option value="client">Client</option>
                    <option value="security">Security</option>
                  </select>
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Email (Optional)">
                  <input type="email" className={inputCls}
                    value={userForm.email}
                    placeholder="e.g. priya@factory.local"
                    onChange={e => setUserForm({ ...userForm, email: e.target.value })} />
                </Field>
              </div>
            </div>

            <button type="submit" disabled={isSubmittingUser}
              className="w-full h-11 rounded-xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-40 disabled:translate-y-0"
              style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}>
              {isSubmittingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Create User Account
            </button>

            <AnimatePresence>
              {toast && toast.form === 'user' && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}
                  className="mt-3 p-3.5 rounded-xl text-xs font-bold border text-center backdrop-blur-sm"
                  style={{
                    background: toast.type === 'success' ? 'rgba(240, 253, 244, 0.95)' : 'rgba(254, 242, 242, 0.95)',
                    borderColor: toast.type === 'success' ? 'rgba(22, 163, 74, 0.25)' : 'rgba(220, 38, 38, 0.2)',
                    color: toast.type === 'success' ? '#166534' : '#991b1b',
                  }}>
                  {toast.msg}
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </SpotlightCard>
      </motion.div>

      {/* ─── USERS DIRECTORY ─── */}
      <SpotlightCard variants={fadeUpItem} className="p-0 bg-white shadow-xl rounded-3xl overflow-hidden" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.04)">
        <div className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
          <h3 className="text-lg font-extrabold flex items-center gap-2" style={{ color: '#2d1f0e' }}>
            <Users className="w-5 h-5" style={{ color: '#c8834a' }} /> System Users Directory
            <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{ background: '#faf6f0', color: '#a86022', border: '1px solid rgba(200,131,74,0.2)' }}>
              {users.length}
            </span>
          </h3>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9a7a5a' }} />
            <input
              type="text" placeholder="Search users…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="h-9 w-52 rounded-lg pl-9 pr-3 text-xs font-semibold focus:outline-none"
              style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.2)', color: '#2d1f0e' }}
            />
          </div>
        </div>

        {loading ? (
          <div className="py-16 flex items-center justify-center">
            <Loader2 className="w-7 h-7 animate-spin" style={{ color: '#c8834a' }} />
          </div>
        ) : (
          <div className="w-full overflow-x-auto rounded-2xl border bg-white shadow-sm" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>

            {/*                                                                           */}
            <table className="w-full min-w-[700px] text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="font-black uppercase tracking-wider text-[10px]" style={{ background: '#faf6f0', borderBottom: '1px solid rgba(200,131,74,0.1)', color: '#9a7a5a' }}>
                  <th className="p-3 pl-5">User / Employee</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Barcode Tag (Contract v3.0)</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 pr-5 text-right">Barcode Actions</th>
                </tr>
              </thead>
              <motion.tbody variants={rowStagger} initial="hidden" animate="show">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-14 text-center font-semibold" style={{ color: '#9a7a5a' }}>
                      <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      No users found.
                    </td>
                  </tr>
                ) : filteredUsers.map(u => {
                  const roleCfg = ROLE_COLORS[u.role] || { bg: '#faf6f0', color: '#9a7a5a', border: 'rgba(200,131,74,0.15)', label: u.role };
                  const barcodeTag = u.employee_barcode || `EMP-${String(u.id || '000000').padStart(6, '0')}`;
                  const empId = u.id || u.employee_id;
                  const isActionLoading = barcodeActionLoading[empId];

                  return (
                    <motion.tr key={u.id} variants={fadeUpItem} className="border-b hover:bg-[#fcfaf8] transition-colors text-xs" style={{ borderColor: 'rgba(200,131,74,0.07)' }}>

                      {/* User Name & Avatar */}
                      <td className="p-3 pl-5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black text-white flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}>
                            {(u.name || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <span className="font-black block" style={{ color: '#2d1f0e' }}>{u.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">ID: #{u.id}</span>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="p-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase"
                          style={{ background: roleCfg.bg, color: roleCfg.color, border: `1px solid ${roleCfg.border}` }}>
                          {roleCfg.label}
                        </span>
                      </td>

                      {/* Barcode Tag Badge */}
                      <td className="p-3">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-black bg-[#faf6f0] text-[#2d1f0e] border border-[#c8834a]/30 shadow-2xs">
                          <Barcode className="w-3.5 h-3.5 text-[#c8834a]" />
                          {barcodeTag}
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="p-3 font-mono text-slate-600">
                        <span className="font-black" style={{ color: '#2d1f0e' }}>{u.phone || 'N/A'}</span>
                      </td>

                      {/* Beautiful Status Badge UI */}
                      <td className="p-3">
                        {u.is_active !== false ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            RETIRED
                          </span>
                        )}
                      </td>

                      {/* Barcode Actions (Print, Reissue, Deactivate) */}
                      <td className="p-3 pr-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedEmployeeModal(u)}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold text-[#c8834a] bg-[#faf6f0] hover:bg-[#f4ece1] border border-[#c8834a]/30 flex items-center gap-1 cursor-pointer transition-all"
                            title="Print Employee ID Badge"
                          >
                            <Printer className="w-3.5 h-3.5" /> Badge
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReissueBarcode(u)}
                            disabled={!!isActionLoading}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
                            title="Reissue Barcode (Lost/Damaged Card)"
                          >
                            {isActionLoading === 'reissue' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                            Reissue
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeactivateBarcode(u)}
                            disabled={!!isActionLoading || u.is_active === false}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center gap-1 cursor-pointer transition-all disabled:opacity-40"
                            title="Deactivate Barcode (Worker Resigns)"
                          >
                            {isActionLoading === 'deactivate' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                            Retire
                          </button>
                        </div>
                      </td>

                    </motion.tr>
                  );
                })}
              </motion.tbody>
            </table>
          </div>
        )}
      </SpotlightCard>

      {/* Employee ID Badge Printable Modal */}
      {selectedEmployeeModal && (
        <EmployeeIdCardModal
          employee={selectedEmployeeModal}
          onClose={() => setSelectedEmployeeModal(null)}
        />
      )}
    </motion.div>
  );
}
