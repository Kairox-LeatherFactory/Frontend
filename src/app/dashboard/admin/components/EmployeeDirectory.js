'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Search, Filter, Loader2, Barcode, Edit2, Trash2, Save, X, Eye } from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';
import { fadeUpItem, rowStagger } from '@/lib/motionVariants';
import { useAuth } from '@/context/AuthContext';
import { useUpdateEmployeeMutation, useDeleteEmployeeMutation, useLazyGetEmployeeQuery } from '@/store/slices/adminApiSlice';
import { Field, inputCls } from './shared';

export function EmployeeDirectory({ employees, loading, showToast }) {
  const { user } = useAuth();
  const canSeeSalary = user === 'hr' || user === 'direct_manager' || user === 'managing_director';
  const canEdit = user === 'hr' || user === 'direct_manager' || user === 'managing_director';
  const canDelete = user === 'direct_manager' || user === 'managing_director';
  const [search, setSearch] = useState('');
  const [wageFilter, setWageFilter] = useState('all'); // 'all', 'piece_rate', 'monthly'

  const [updateEmployee] = useUpdateEmployeeMutation();
  const [deleteEmployee] = useDeleteEmployeeMutation();
  const [actionLoading, setActionLoading] = useState(false);

  // View Profile State
  const [triggerGetEmployee] = useLazyGetEmployeeQuery();
  const [viewModal, setViewModal] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Edit State
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({});

  const handleViewProfile = async (id) => {
    setProfileLoading(true);
    setViewModal(true);
    setProfileData(null);
    try {
      const data = await triggerGetEmployee(id).unwrap();
      setProfileData(data);
    } catch (err) {
      showToast('global', 'error', err.message || 'Failed to fetch profile.');
      setViewModal(false);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleEditClick = (emp) => {
    setEditForm({
      id: emp.id,
      name: emp.name || '',
      designation: emp.designation || '',
      wage_type: emp.wage_type || 'piece_rate',
      daily_rate: emp.daily_rate || '',
      phone: emp.phone || ''
    });
    setEditModal(emp.id);
  };

  const handleSaveEdit = async () => {
    setActionLoading(true);
    try {
      const payload = {
        id: editForm.id,
        name: editForm.name,
        designation: editForm.designation,
        wage_type: editForm.wage_type,
        phone: editForm.phone || null,
        daily_rate: editForm.wage_type === 'piece_rate' && editForm.daily_rate ? parseFloat(editForm.daily_rate) : null,
      };
      await updateEmployee(payload).unwrap();
      showToast('global', 'success', `Employee ${editForm.name} updated successfully.`);
      setEditModal(null);
    } catch (err) {
      showToast('global', 'error', err.message || 'Failed to update employee.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`CAUTION: Are you sure you want to delete ${name}? This will retire their barcode, but their history is preserved. This cannot be undone.`)) return;
    setActionLoading(true);
    try {
      await deleteEmployee(id).unwrap();
      showToast('global', 'success', `Employee ${name} deleted successfully.`);
    } catch (err) {
      showToast('global', 'error', err.message || 'Failed to delete employee.');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = !search || 
      emp.name?.toLowerCase().includes(search.toLowerCase()) || 
      emp.designation?.toLowerCase().includes(search.toLowerCase()) ||
      emp.employee_barcode?.toLowerCase().includes(search.toLowerCase());
      
    const matchesFilter = wageFilter === 'all' ||emp.wage_type==='piece_rate'|| emp.wage_type === wageFilter;
    
    return matchesSearch && matchesFilter;
  });

  return (
    <SpotlightCard variants={fadeUpItem} className="p-0 bg-white shadow-xl rounded-3xl overflow-hidden mt-8" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.04)">
      <div className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
        <h3 className="text-lg font-extrabold flex items-center gap-2" style={{ color: '#2d1f0e' }}>
          <Users className="w-5 h-5" style={{ color: '#c8834a' }} /> Factory Workers Directory
          <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{ background: '#faf6f0', color: '#a86022', border: '1px solid rgba(200,131,74,0.2)' }}>
            {filteredEmployees.length}
          </span>
        </h3>
        <div className="flex items-center gap-3">
          {/* Filter Dropdown */}
          <div className="relative">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9a7a5a' }} />
            <select
              value={wageFilter}
              onChange={e => setWageFilter(e.target.value)}
              className="h-9 rounded-lg pl-9 pr-3 text-xs font-bold focus:outline-none appearance-none cursor-pointer"
              style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.2)', color: '#2d1f0e' }}
            >
              <option value="all">All Wages</option>
              <option value="daily">Daily Wage</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9a7a5a' }} />
            <input
              type="text" placeholder="Search workers…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="h-9 w-52 rounded-lg pl-9 pr-3 text-xs font-semibold focus:outline-none"
              style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.2)', color: '#2d1f0e' }}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-16 flex items-center justify-center">
          <Loader2 className="w-7 h-7 animate-spin" style={{ color: '#c8834a' }} />
        </div>
      ) : (
        <div className="w-full overflow-x-auto rounded-2xl border bg-white shadow-sm" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
          <table className="w-full min-w-[700px] text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="font-black uppercase tracking-wider text-[10px]" style={{ background: '#faf6f0', borderBottom: '1px solid rgba(200,131,74,0.1)', color: '#9a7a5a' }}>
                <th className="p-3 pl-5">Worker Name</th>
                <th className="p-3">Designation</th>
                <th className="p-3">Wage Type</th>
                {canSeeSalary && <th className="p-3">Daily Rate</th>}
                <th className="p-3">Phone</th>
                <th className="p-3">Barcode Tag</th>
                {(canEdit || canDelete) && <th className="p-3 pr-5 text-right">Actions</th>}
              </tr>
            </thead>
            <motion.tbody variants={rowStagger} initial="hidden" animate="show">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center font-semibold" style={{ color: '#9a7a5a' }}>
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    No workers found.
                  </td>
                </tr>
              ) : filteredEmployees.map(emp => (
                <motion.tr
                  key={emp.id}
                  variants={fadeUpItem}
                  className="border-b hover:bg-[#fcfaf8] transition-colors text-xs"
                  style={{ borderColor: 'rgba(200,131,74,0.07)', opacity: emp.is_active === false ? 0.5 : 1 }}
                >
                  
                  {/* Name & ID */}
                  <td className="p-3 pl-5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black text-white flex-shrink-0"
                        style={{ background: emp.is_active === false ? '#9ca3af' : 'linear-gradient(135deg, #c8834a, #e8a06a)' }}
                      >
                        {(emp.name || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-black" style={{ color: '#2d1f0e' }}>{emp.name}</span>
                          {emp.is_active === false && (
                            <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded bg-slate-200 text-slate-500">Inactive</span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">ID: #{emp.id}</span>
                      </div>
                    </div>
                  </td>

                  {/* Designation */}
                  <td className="p-3 font-bold" style={{ color: '#9a7a5a' }}>
                    {emp.designation || 'Worker'}
                  </td>

                                   {/* Wage Type */}
                  <td className="p-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase"
                      style={{ 
                        background: emp.wage_type === 'piece_rate' ? '#fffbeb' : '#f0fdf4', 
                        color: emp.wage_type === 'piece_rate' ? '#b45309' : '#15803d',
                        border: `1px solid ${emp.wage_type === 'piece_rate' ? '#fde68a' : '#bbf7d0'}`
                      }}>
                      {emp.wage_type === 'piece_rate' ? 'daily_wage' : emp.wage_type}
                    </span>
                  </td>

                  {/* Daily Rate — HR / DM / MD only */}
                  {canSeeSalary && (
                    <td className="p-3 font-mono font-bold" style={{ color: '#2d1f0e' }}>
                      {emp.daily_rate ? `₹${emp.daily_rate}` : '—'}
                    </td>
                  )}

                  {/* Phone */}
                  <td className="p-3 font-mono text-slate-600 font-bold">
                    {emp.phone || '—'}
                  </td>

                  {/* Barcode Tag */}
                  <td className="p-3">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-black bg-[#faf6f0] text-[#2d1f0e] border border-[#c8834a]/30 shadow-2xs">
                      <Barcode className="w-3.5 h-3.5 text-[#c8834a]" />
                      {emp.employee_barcode || '—'}
                    </div>
                  </td>

                  {/* Actions */}
                  {(canEdit || canDelete) && (
                    <td className="p-3 pr-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleViewProfile(emp.id)}
                          disabled={actionLoading}
                          className="p-1.5 rounded-md text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                          title="View Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => handleEditClick(emp)}
                            disabled={actionLoading}
                            className="p-1.5 rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors disabled:opacity-50"
                            title="Edit Employee"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(emp.id, emp.name)}
                            disabled={actionLoading || emp.is_active === false}
                            className="p-1.5 rounded-md text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors disabled:opacity-50"
                            title="Delete Employee"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}

                </motion.tr>
              ))}
            </motion.tbody>
          </table>
        </div>
      )}

      {/* Edit Employee Modal */}
      <AnimatePresence>
        {editModal && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-black text-[#2d1f0e] flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-[#c8834a]" /> Edit Employee
                </h3>
                <button onClick={() => setEditModal(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <Field label="Worker Name">
                  <input type="text" className={inputCls} value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Designation">
                    <input type="text" className={inputCls} value={editForm.designation} onChange={e => setEditForm({ ...editForm, designation: e.target.value })} />
                  </Field>
                  <Field label="Phone">
                    <input type="text" className={inputCls} value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Wage Type">
                    <select className={inputCls} value={editForm.wage_type} onChange={e => setEditForm({ ...editForm, wage_type: e.target.value })}>
                      <option value="piece_rate">Daily Wage</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </Field>
                  {editForm.wage_type === 'piece_rate' && (
                    <Field label="Daily Rate (₹)">
                      <input type="number" className={inputCls} value={editForm.daily_rate} onChange={e => setEditForm({ ...editForm, daily_rate: e.target.value })} />
                    </Field>
                  )}
                </div>
              </div>
              <div className="p-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button onClick={() => setEditModal(null)} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl font-black text-white flex items-center gap-2 shadow-lg hover:-translate-y-0.5 transition-all active:translate-y-0 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #c8834a, #a86022)' }}
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Profile Modal */}
      <AnimatePresence>
        {viewModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-black flex items-center gap-2" style={{ color: '#2d1f0e' }}>
                  <Users className="w-5 h-5" style={{ color: '#c8834a' }} /> Worker Profile (GET)
                </h3>
                <button onClick={() => setViewModal(false)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 bg-slate-50/50">
                {profileLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#c8834a' }} />
                  </div>
                ) : profileData ? (
                  <div className="space-y-3 text-sm">
                    <pre className="p-3 rounded-xl bg-white border border-slate-200 text-[10px] overflow-auto max-h-64 font-mono">
                      {JSON.stringify(profileData, null, 2)}
                    </pre>
                  </div>
                ) : null}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </SpotlightCard>
  );
}
