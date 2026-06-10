'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { apiGetUsers, apiCreateClientUser, apiCreateEmployee } from '@/lib/api';
import { CheckCircle2, Users, UserPlus, Factory, Loader2, ShieldCheck, Lock } from 'lucide-react';

export default function AdminDashboard() {
  const { user, token } = useAuth();
  const { clients } = useData();

  // Role Gate check
  const isHRAdmin = user === 'hr_admin' || user === 'direct_manager'; // Depending on role logic

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Forms State
  const [clientForm, setClientForm] = useState({ name: '', phone: '', username: '', password: '', role: 'client_viewer', client_id: '' });
  const [employeeForm, setEmployeeForm] = useState({ name: '', designation: 'Cutter', wage_type: 'piece_rate', monthly_salary: 0 });
  const [isSubmittingClient, setIsSubmittingClient] = useState(false);
  const [isSubmittingEmployee, setIsSubmittingEmployee] = useState(false);

  useEffect(() => {
    if (!token) return;
    const fetchUsers = async () => {
      try {
        const data = await apiGetUsers(token);
        setUsers(data);
      } catch (err) {
        console.error('Failed to fetch users', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [token]);

  const handleCreateClientUser = async (e) => {
    e.preventDefault();
    setIsSubmittingClient(true);
    setErrorMsg('');
    try {
      if (!clientForm.client_id) {
        throw new Error('Please select a client brand to associate with.');
      }
      await apiCreateClientUser(token, {
        name: clientForm.name,
        phone: clientForm.phone,
        username: clientForm.username,
        password: clientForm.password,
        role: clientForm.role,
        client_id: clientForm.client_id
      });
      setSuccessMsg(`Client user '${clientForm.username}' created successfully.`);
      setTimeout(() => setSuccessMsg(''), 5000);
      setClientForm({ name: '', phone: '', username: '', password: '', role: 'client_viewer', client_id: '' });
      // Refresh user list
      const data = await apiGetUsers(token);
      setUsers(data);
    } catch (err) {
      setErrorMsg(err.message);
      setTimeout(() => setErrorMsg(''), 5000);
    } finally {
      setIsSubmittingClient(false);
    }
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    setIsSubmittingEmployee(true);
    setErrorMsg('');
    try {
      await apiCreateEmployee(token, {
        name: employeeForm.name,
        designation: employeeForm.designation,
        wage_type: employeeForm.wage_type,
        monthly_salary: parseFloat(employeeForm.monthly_salary) || 0
      });
      setSuccessMsg(`Employee '${employeeForm.name}' registered successfully.`);
      setTimeout(() => setSuccessMsg(''), 5000);
      setEmployeeForm({ name: '', designation: 'Cutter', wage_type: 'piece_rate', monthly_salary: 0 });
    } catch (err) {
      setErrorMsg(err.message);
      setTimeout(() => setErrorMsg(''), 5000);
    } finally {
      setIsSubmittingEmployee(false);
    }
  };

  if (!isHRAdmin) {
    return (
      <div className="card p-12 bg-white border border-slate-100 shadow-xl text-center space-y-4 max-w-lg mx-auto mt-12">
        <Lock className="w-16 h-16 text-slate-300 mx-auto" />
        <h3 className="text-xl font-black text-slate-900 tracking-tight">Admin Access Required</h3>
        <p className="text-slate-500 font-medium">You need Manager or HR privileges to view and manage users.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <ShieldCheck className="w-8 h-8 text-blue-600" />
          Admin &amp; User Management
        </h1>
        <p className="text-slate-500 font-medium">Register factory employees and provision external client accounts.</p>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl font-bold text-sm shadow-md animate-fade-in flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <p>{successMsg}</p>
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl font-bold text-sm shadow-md animate-fade-in">
          <p>{errorMsg}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* FACTORY EMPLOYEE CREATION */}
        <div className="card p-6 bg-white border border-blue-100 shadow-xl space-y-6">
          <h3 className="text-lg font-extrabold text-slate-900 border-b border-slate-100 pb-4 flex items-center gap-2">
            <Factory className="w-5 h-5 text-indigo-600" /> Register Factory Employee
          </h3>
          <form onSubmit={handleCreateEmployee} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase">Employee Full Name</label>
              <input 
                type="text" 
                className="input-field mt-1" 
                value={employeeForm.name} 
                onChange={(e) => setEmployeeForm({...employeeForm, name: e.target.value})}
                placeholder="e.g. Ramesh Kumar"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Designation</label>
                <select 
                  className="input-field mt-1" 
                  value={employeeForm.designation} 
                  onChange={(e) => setEmployeeForm({...employeeForm, designation: e.target.value})}
                >
                  <option value="Cutter">Cutter</option>
                  <option value="Stitcher">Stitcher</option>
                  <option value="Fusing Operator">Fusing Operator</option>
                  <option value="Helper">Helper</option>
                  <option value="QC Inspector">QC Inspector</option>
                  <option value="Manager">Manager</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Wage Type</label>
                <select 
                  className="input-field mt-1" 
                  value={employeeForm.wage_type} 
                  onChange={(e) => setEmployeeForm({...employeeForm, wage_type: e.target.value})}
                >
                  <option value="piece_rate">Piece-rate</option>
                  <option value="monthly">Monthly Salary</option>
                  <option value="daily_wage">Daily Wage</option>
                </select>
              </div>
            </div>
            
            {employeeForm.wage_type === 'monthly' && (
              <div className="animate-fade-in">
                <label className="text-xs font-bold text-slate-600 uppercase">Monthly Salary (₹)</label>
                <input 
                  type="number" 
                  className="input-field mt-1" 
                  value={employeeForm.monthly_salary} 
                  onChange={(e) => setEmployeeForm({...employeeForm, monthly_salary: e.target.value})}
                  min="0"
                  required
                />
              </div>
            )}

            <button 
              type="submit" 
              disabled={isSubmittingEmployee}
              className="btn-primary w-full py-3 bg-indigo-600 hover:bg-indigo-700 flex justify-center items-center gap-2"
            >
              {isSubmittingEmployee ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Register Employee
            </button>
          </form>
        </div>

        {/* CLIENT USER CREATION */}
        <div className="card p-6 bg-white border border-blue-100 shadow-xl space-y-6">
          <h3 className="text-lg font-extrabold text-slate-900 border-b border-slate-100 pb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" /> Provision Client Login
          </h3>
          <form onSubmit={handleCreateClientUser} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase">Client Brand</label>
              <select 
                className="input-field mt-1" 
                value={clientForm.client_id} 
                onChange={(e) => setClientForm({...clientForm, client_id: e.target.value})}
                required
              >
                <option value="" disabled>Select Brand...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Contact Name</label>
                <input 
                  type="text" 
                  className="input-field mt-1" 
                  value={clientForm.name} 
                  onChange={(e) => setClientForm({...clientForm, name: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Phone Number</label>
                <input 
                  type="tel" 
                  className="input-field mt-1" 
                  value={clientForm.phone} 
                  onChange={(e) => setClientForm({...clientForm, phone: e.target.value})}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Username</label>
                <input 
                  type="text" 
                  className="input-field mt-1" 
                  value={clientForm.username} 
                  onChange={(e) => setClientForm({...clientForm, username: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Password</label>
                <input 
                  type="password" 
                  className="input-field mt-1" 
                  value={clientForm.password} 
                  onChange={(e) => setClientForm({...clientForm, password: e.target.value})}
                  required
                  minLength="6"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isSubmittingClient}
              className="btn-primary w-full py-3 bg-blue-600 hover:bg-blue-700 flex justify-center items-center gap-2"
            >
              {isSubmittingClient ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Create Client Account
            </button>
          </form>
        </div>

      </div>

      {/* USERS LIST DIRECTORY */}
      <div className="card p-6 bg-white border border-slate-100 shadow-xl space-y-4">
        <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
          System Users Directory
        </h3>
        
        {loading ? (
          <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left text-xs font-semibold">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-150 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="p-3">Username</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Client Associated</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50">
                    <td className="p-3 text-slate-900 font-bold">{u.username}</td>
                    <td className="p-3">
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-[10px] uppercase font-black tracking-wider">
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500 font-medium">{u.client_id ? 'Linked Brand' : 'Internal Factory'}</td>
                    <td className="p-3 text-emerald-600 font-bold">Active</td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-slate-400 font-medium">No users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
