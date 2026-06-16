'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { apiGetUsers, apiCreateClientUser, apiCreateEmployee } from '@/lib/api';
import {
  CheckCircle2, Users, UserPlus, Factory, Loader2,
  ShieldCheck, Lock, AlertCircle, Building2, User,
  ChevronRight, Search,
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
const inputStyle = {}; // Using tailwind arbitrary values above instead of inline to allow focus/hover cleanly

const ROLE_COLORS = {
  direct_manager:   { bg: '#fff9f0', color: '#c8834a', border: 'rgba(200,131,74,0.3)', label: 'Direct Manager' },
  cutting_manager:  { bg: '#eff6ff', color: '#2563eb', border: 'rgba(37,99,235,0.2)',  label: 'Cutting Manager' },
  stitching_manager:{ bg: '#f5f3ff', color: '#7c3aed', border: 'rgba(124,58,237,0.2)', label: 'Stitching Manager' },
  hr_admin:         { bg: '#f0fdf4', color: '#16a34a', border: 'rgba(22,163,74,0.2)',  label: 'HR Admin' },
  client_viewer:    { bg: '#faf6f0', color: '#9a7a5a', border: 'rgba(200,131,74,0.15)',label: 'Client Viewer' },
};

export default function AdminDashboard() {
  const { user, token } = useAuth();
  const { clients } = useData();

  const isHRAdmin = user === 'hr_admin' || user === 'direct_manager';

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');

  const [clientForm, setClientForm] = useState({ name: '', phone: '', username: '', password: '', role: 'client_viewer', client_id: '' });
  const [employeeForm, setEmployeeForm] = useState({ name: '', designation: 'Cutter', wage_type: 'piece_rate', monthly_salary: 0 });
  const [isSubmittingClient, setIsSubmittingClient] = useState(false);
  const [isSubmittingEmployee, setIsSubmittingEmployee] = useState(false);

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

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    setIsSubmittingEmployee(true);
    try {
      await apiCreateEmployee(token, {
        name: employeeForm.name,
        designation: employeeForm.designation,
        wage_type: employeeForm.wage_type,
        monthly_salary: parseFloat(employeeForm.monthly_salary) || 0,
      });
      showToast('success', `Employee '${employeeForm.name}' registered successfully.`);
      setEmployeeForm({ name: '', designation: 'Cutter', wage_type: 'piece_rate', monthly_salary: 0 });
      await refreshUsers();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setIsSubmittingEmployee(false);
    }
  };

  const handleCreateClientUser = async (e) => {
    e.preventDefault();
    setIsSubmittingClient(true);
    try {
      if (!clientForm.client_id) throw new Error('Please select a client brand.');
      await apiCreateClientUser(token, {
        name: clientForm.name,
        phone: clientForm.phone,
        username: clientForm.username,
        password: clientForm.password,
        role: clientForm.role,
        client_id: clientForm.client_id,
      });
      showToast('success', `Client account '${clientForm.username}' created.`);
      setClientForm({ name: '', phone: '', username: '', password: '', role: 'client_viewer', client_id: '' });
      await refreshUsers();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setIsSubmittingClient(false);
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
          Register factory employees and provision external client portal accounts.
        </p>
      </div>

      {/* ─── STATS STRIP ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Users',     value: users.length,                                     icon: Users },
          { label: 'Internal Staff',  value: users.filter(u => !u.client_id).length,           icon: Factory },
          { label: 'Client Accounts', value: users.filter(u => !!u.client_id).length,          icon: Building2 },
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

        {/* FACTORY EMPLOYEE CREATION */}
        <SpotlightCard className="p-6 bg-white shadow-xl rounded-3xl" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.06)">
          <h3 className="text-lg font-extrabold pb-4 mb-4 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(200,131,74,0.1)', color: '#2d1f0e' }}>
            <Factory className="w-5 h-5" style={{ color: '#c8834a' }} /> Register Factory Employee
          </h3>
          <form onSubmit={handleCreateEmployee} className="space-y-4">
            <Field label="Employee Full Name">
              <input type="text" className={inputCls} style={inputStyle}
                value={employeeForm.name}
                onChange={e => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                placeholder="e.g. Ramesh Kumar" required />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Designation">
                <select className={inputCls} style={inputStyle}
                  value={employeeForm.designation}
                  onChange={e => setEmployeeForm({ ...employeeForm, designation: e.target.value })}>
                  {['Cutter', 'Stitcher', 'Fusing Operator', 'Pasting Operator', 'Lining Attacher', 'Helper', 'QC Inspector', 'Packer', 'Manager'].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </Field>
              <Field label="Wage Type">
                <select className={inputCls} style={inputStyle}
                  value={employeeForm.wage_type}
                  onChange={e => setEmployeeForm({ ...employeeForm, wage_type: e.target.value })}>
                  <option value="piece_rate">Piece-rate</option>
                  <option value="monthly">Monthly Salary</option>
                  <option value="daily_wage">Daily Wage</option>
                </select>
              </Field>
            </div>
            {employeeForm.wage_type === 'monthly' && (
              <Field label="Monthly Salary (₹)">
                <input type="number" className={inputCls} style={inputStyle}
                  value={employeeForm.monthly_salary}
                  onChange={e => setEmployeeForm({ ...employeeForm, monthly_salary: e.target.value })}
                  min="0" required />
              </Field>
            )}
            <button type="submit" disabled={isSubmittingEmployee}
              className="w-full h-11 rounded-xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-40 disabled:translate-y-0"
              style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}>
              {isSubmittingEmployee ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Register Employee
            </button>
          </form>
        </SpotlightCard>

        {/* CLIENT USER CREATION */}
        <SpotlightCard className="p-6 bg-white shadow-xl rounded-3xl" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.06)">
          <h3 className="text-lg font-extrabold pb-4 mb-4 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(200,131,74,0.1)', color: '#2d1f0e' }}>
            <Users className="w-5 h-5" style={{ color: '#c8834a' }} /> Provision Client Login
          </h3>
          <form onSubmit={handleCreateClientUser} className="space-y-4">
            <Field label="Client Brand">
              <select className={inputCls} style={inputStyle}
                value={clientForm.client_id}
                onChange={e => setClientForm({ ...clientForm, client_id: e.target.value })} required>
                <option value="" disabled>Select brand…</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Contact Name">
                <input type="text" className={inputCls} style={inputStyle}
                  value={clientForm.name}
                  onChange={e => setClientForm({ ...clientForm, name: e.target.value })} required />
              </Field>
              <Field label="Phone Number">
                <input type="tel" className={inputCls} style={inputStyle}
                  value={clientForm.phone}
                  onChange={e => setClientForm({ ...clientForm, phone: e.target.value })} required />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Username">
                <input type="text" className={inputCls} style={inputStyle}
                  value={clientForm.username}
                  onChange={e => setClientForm({ ...clientForm, username: e.target.value })} required />
              </Field>
              <Field label="Password">
                <input type="password" className={inputCls} style={inputStyle}
                  value={clientForm.password}
                  onChange={e => setClientForm({ ...clientForm, password: e.target.value })} required minLength="6" />
              </Field>
            </div>
            <button type="submit" disabled={isSubmittingClient}
              className="w-full h-11 rounded-xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-40 disabled:translate-y-0"
              style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}>
              {isSubmittingClient ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Create Client Account
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
