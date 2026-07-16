'use client';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { apiGetUsers, apiCreateUser, apiCreateEmployee } from '@/lib/api';
import {
  CheckCircle2, Users, UserPlus, Factory, Loader2,
  ShieldCheck, Lock, AlertCircle, Building2, User,
  Search, MapPin
} from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';

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
  direct_manager:   { bg: '#fff9f0', color: '#c8834a', border: 'rgba(200,131,74,0.3)', label: 'Direct Manager' },
  cutting_manager:  { bg: '#eff6ff', color: '#2563eb', border: 'rgba(37,99,235,0.2)',  label: 'Cutting Manager' },
  stitching_manager:{ bg: '#f5f3ff', color: '#7c3aed', border: 'rgba(124,58,237,0.2)', label: 'Stitching Manager' },
  hr_admin:         { bg: '#f0fdf4', color: '#16a34a', border: 'rgba(22,163,74,0.2)',  label: 'HR Admin' },
  client_viewer:    { bg: '#faf6f0', color: '#9a7a5a', border: 'rgba(200,131,74,0.15)',label: 'Client Viewer' },
  viewer:           { bg: '#f1f5f9', color: '#64748b', border: 'rgba(100,116,139,0.15)',label: 'Viewer' },
  employee:         { bg: '#ecfdf5', color: '#059669', border: 'rgba(5,150,105,0.15)', label: 'Employee' },
};

// GPS helper hook within component context for Floor/Admin verification
function useGps() {
  const [state, setState] = useState({ lat: null, lon: null, error: null, loading: false });
  const getPosition = () => {
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
          const msg = 'Location access denied or timed out. Unable to resolve GPS coordinates.';
          setState({ lat: null, lon: null, loading: false, error: msg });
          reject(msg);
        },
        { timeout: 8000 }
      );
    });
  };
  return { ...state, getPosition };
}

export default function AdminDashboard() {
  const { user, token } = useAuth();
  const gps = useGps();

  const isHRAdmin = user === 'hr_admin' || user === 'direct_manager';

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');

  // 1. Corrected Worker Form State matching the Floor Command specification
  const [workerForm, setWorkerForm] = useState({
    name: '',
    phone: '',
    designation: 'Cutter',
    wage_type: 'piece_rate',
    daily_rate: '',
    password: ''
  });
  const [isSubmittingWorker, setIsSubmittingWorker] = useState(false);

  // 2. Corrected Add User Form State matching the User specification
  const [userForm, setUserForm] = useState({
    name: '',
    phone: '',
    email: '',
    role: 'viewer',
    password: '',
    employee_id: ''
  });
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
  };

  const refreshUsers = async () => {
    try { setUsers(await apiGetUsers(token)); } catch {}
  };

  useEffect(() => {
    if (!token) return;
    (async () => {
      try { setUsers(await apiGetUsers(token)); }
      catch { showToast('error', 'Failed to load users.'); }
      finally { setLoading(false); }
    })();
  }, [token]);

  // Handle Add Worker Submission (strictly using JSON payload as verified)
  const handleCreateWorker = async (e) => {
    e.preventDefault();
    const { name, phone, designation, wage_type, daily_rate, password } = workerForm;
    
    if (!name.trim() || !designation.trim()) {
      showToast('error', 'Name and designation are required.');
      return;
    }
    if (wage_type === 'monthly' && (!phone.trim() || !password.trim())) {
      showToast('error', 'Phone number and password are required for monthly employees.');
      return;
    }

    setIsSubmittingWorker(true);
    try {
      // Fetch GPS coordinates to fulfill floor-only location onboarding requirement
      await gps.getPosition();

      const payload = {
        name: name.trim(),
        designation: designation.trim(),
        wage_type: wage_type,
        phone: phone.trim() || null,
        password: wage_type === 'monthly' ? password : null,
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

      showToast('success', `Worker "${name}" successfully registered onto the floor.`);
      setWorkerForm({ name: '', phone: '', designation: 'Cutter', wage_type: 'piece_rate', daily_rate: '', password: '' });
      await refreshUsers();
    } catch (err) {
      showToast('error', err.message || 'Onboarding failed.');
    } finally {
      setIsSubmittingWorker(false);
    }
  };

  // Handle Add User Login Submission
  const handleCreateUser = async (e) => {
    e.preventDefault();
    const { name, phone, password, role, email, employee_id } = userForm;
    if (!name.trim() || !phone.trim() || !password.trim()) {
      showToast('error', 'Name, Phone, and Password are required.');
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
      showToast('success', `User account login for "${name}" created successfully.`);
      setUserForm({ name: '', phone: '', email: '', role: 'viewer', password: '', employee_id: '' });
      await refreshUsers();
    } catch (err) {
      showToast('error', err.message || 'Failed to create user login.');
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const filteredUsers = users.filter(u =>
    !search || u.username?.toLowerCase().includes(search.toLowerCase()) || u.role?.toLowerCase().includes(search.toLowerCase())
  );

  // ─── ACCESS DENIED ──────────────────────────────────────────────────────────
  if (!isHRAdmin) {
    return (
      <SpotlightCard className="p-12 text-center rounded-3xl max-w-lg mx-auto mt-12" style={{ background: '#fff9f0', border: '1px solid rgba(200,131,74,0.3)' }} spotlightColor="rgba(200,131,74,0.1)">
        <Lock className="w-14 h-14 mx-auto mb-3" style={{ color: '#c8834a' }} />
        <h3 className="text-xl font-black uppercase tracking-wide" style={{ color: '#9c4221' }}>Admin Access Required</h3>
        <p className="text-sm font-semibold mt-2" style={{ color: '#a86022' }}>
          Manager or HR Admin privileges are required to view and manage users.
        </p>
      </SpotlightCard>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">

      {/* ─── TOAST ─── */}
      {toast && (
        <div className="fixed top-6 right-6 z-[999] max-w-sm animate-fade-in">
          <div className="flex items-center gap-3 p-4 rounded-2xl shadow-xl font-semibold text-sm"
            style={{
              background: toast.type === 'success' ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${toast.type === 'success' ? 'rgba(22,163,74,0.25)' : 'rgba(220,38,38,0.2)'}`,
              color: toast.type === 'success' ? '#166534' : '#991b1b',
            }}>
            {toast.type === 'success'
              ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            <p>{toast.msg}</p>
          </div>
        </div>
      )}

      {/* ─── HEADER ─── */}
      <div>
        <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: '#c8834a' }}>Platform Administration</p>
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3" style={{ color: '#2d1f0e' }}>
          <ShieldCheck className="w-8 h-8" style={{ color: '#c8834a' }} />
          Admin &amp; User Management
        </h1>
        <p className="font-medium mt-1" style={{ color: '#9a7a5a' }}>
          Register factory floor employees and provision system login accounts.
        </p>
      </div>

      {/* ─── STATS STRIP ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Accounts',  value: users.length,                                      icon: Users },
          { label: 'Internal Staff',  value: users.filter(u => !u.client_id).length,           icon: Factory },
          { label: 'Client Portals',  value: users.filter(u => !!u.client_id).length,          icon: Building2 },
        ].map(({ label, value, icon: Icon }) => (
          <SpotlightCard key={label} className="p-4 bg-white rounded-2xl shadow-sm" style={{ border: '1px solid rgba(200,131,74,0.12)' }} spotlightColor="rgba(200,131,74,0.05)">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: '#9a7a5a' }}>{label}</span>
              <Icon className="w-4 h-4" style={{ color: '#c8834a' }} />
            </div>
            <p className="text-2xl font-black" style={{ color: '#2d1f0e' }}>{loading ? '—' : value}</p>
          </SpotlightCard>
        ))}
      </div>

      {/* ─── FORMS GRID ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 1. REGISTER FACTORY EMPLOYEE CARD */}
        <SpotlightCard className="p-6 bg-white shadow-xl rounded-3xl" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.06)">
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

              <Field label="Designation *">
  <input type="text" className={inputCls}
    value={workerForm.designation}
    placeholder="e.g. Cutter, Stitcher, Helper" required
    onChange={e => setWorkerForm({ ...workerForm, designation: e.target.value })} />
</Field>

              <Field label="Wage Type">
                <select className={inputCls}
                  value={workerForm.wage_type}
                  onChange={e => setWorkerForm({ ...workerForm, wage_type: e.target.value, password: '' })}>
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
                      onChange={e => setWorkerForm({ ...workerForm, phone: e.target.value.replace(/\D/g, '') })} required />
                  </Field>
                  <Field label="Set Password *">
                    <input type="password" className={inputCls}
                      value={workerForm.password}
                      placeholder="Min. 6 characters"
                      onChange={e => setWorkerForm({ ...workerForm, password: e.target.value })} required minLength="6" />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="Phone Number (Optional)">
                    <input type="tel" inputMode="numeric" pattern="[0-9]*" className={inputCls}
                      value={workerForm.phone}
                      placeholder="Optional for daily wage"
                      onChange={e => setWorkerForm({ ...workerForm, phone: e.target.value.replace(/\D/g, '') })} />
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

            <div className="flex items-center gap-2 text-[10px] font-semibold" style={{ color: '#9a7a5a' }}>
              <MapPin className="w-3.5 h-3.5" style={{ color: '#c8834a' }} />
              GPS verification will be performed automatically upon submission.
            </div>

            <button type="submit" disabled={isSubmittingWorker}
              className="w-full h-11 rounded-xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-40 disabled:translate-y-0"
              style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}>
              {isSubmittingWorker ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying GPS...</> : <><UserPlus className="w-4 h-4" /> Register Employee</>}
            </button>
          </form>
        </SpotlightCard>

        {/* 2. PROVISION USER LOGIN CARD */}
        <SpotlightCard className="p-6 bg-white shadow-xl rounded-3xl" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.06)">
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
                  onChange={e => setUserForm({ ...userForm, phone: e.target.value.replace(/\D/g, '') })} />
              </Field>

              <Field label="Password *">
                <input type="password" className={inputCls}
                  value={userForm.password}
                  placeholder="Min. 6 characters" required minLength="6"
                  onChange={e => setUserForm({ ...userForm, password: e.target.value })} />
              </Field>

              <div className="sm:col-span-2">
                <Field label="User Role">
                  <select className={inputCls}
                    value={userForm.role}
                    onChange={e => setUserForm({ ...userForm, role: e.target.value })}>
                    <option value="viewer">Viewer</option>
                    <option value="employee">Employee</option>
                    <option value="cutting_manager">Cutting Manager</option>
                    <option value="stitching_manager">Stitching Manager</option>
                    <option value="direct_manager">Direct Manager</option>
                    <option value="client">Client</option>
                  </select>
                </Field>
              </div>

              <Field label="Email (Optional)">
                <input type="email" className={inputCls}
                  value={userForm.email}
                  placeholder="e.g. priya@factory.local"
                  onChange={e => setUserForm({ ...userForm, email: e.target.value })} />
              </Field>

              <Field label="Employee ID (Optional)">
                <input type="text" className={inputCls}
                  value={userForm.employee_id}
                  placeholder="e.g. emp_123"
                  onChange={e => setUserForm({ ...userForm, employee_id: e.target.value })} />
              </Field>
            </div>

            <button type="submit" disabled={isSubmittingUser}
              className="w-full h-11 rounded-xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-40 disabled:translate-y-0"
              style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}>
              {isSubmittingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Create User Account
            </button>
          </form>
        </SpotlightCard>
      </div>

      {/* ─── USERS DIRECTORY ─── */}
      <SpotlightCard className="p-0 bg-white shadow-xl rounded-3xl overflow-hidden" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.04)">
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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-semibold">
              <thead>
                <tr className="font-black uppercase tracking-wider" style={{ background: '#faf6f0', borderBottom: '1px solid rgba(200,131,74,0.1)', color: '#9a7a5a' }}>
                  <th className="p-3 pl-5">User</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-14 text-center font-semibold" style={{ color: '#9a7a5a' }}>
                      <User className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      No users found.
                    </td>
                  </tr>
                ) : filteredUsers.map(u => {
                  const roleCfg = ROLE_COLORS[u.role] || { bg: '#faf6f0', color: '#9a7a5a', border: 'rgba(200,131,74,0.15)', label: u.role };
                  return (
                    <tr key={u.id} className="border-b hover:bg-[#fcfaf8] transition-colors" style={{ borderColor: 'rgba(200,131,74,0.07)' }}>
                      <td className="p-3 pl-5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black text-white flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}>
                            {(u.username || '?')[0].toUpperCase()}
                          </div>
                          <span className="font-black" style={{ color: '#2d1f0e' }}>{u.username}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black"
                          style={{ background: roleCfg.bg, color: roleCfg.color, border: `1px solid ${roleCfg.border}` }}>
                          {roleCfg.label}
                        </span>
                      </td>
                      <td className="p-3 font-semibold" style={{ color: '#9a7a5a' }}>
                        {u.client_id ? 'Client Portal' : 'Internal Factory'}
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 text-[10px] font-black" style={{ color: '#16a34a' }}>
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" /> Active
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SpotlightCard>
    </div>
  );
}