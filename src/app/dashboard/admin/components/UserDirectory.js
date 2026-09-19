'use client';
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, Search, Loader2, Barcode, Printer, RefreshCw, XCircle } from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';
import { fadeUpItem, rowStagger } from '@/lib/motionVariants';
import { ROLE_COLORS, EmployeeIdCardModal } from './shared';
import { usePatchEmployeeBarcodeMutation } from '@/store/slices/adminApiSlice';
export function UsersDirectory({ users, employees, loading, refreshUsers, showToast }) {
   const [search, setSearch] = useState('');
  const [selectedEmployeeModal, setSelectedEmployeeModal] = useState(null);
  const [barcodeActionLoading, setBarcodeActionLoading] = useState({});
// ADD:
const [patchEmployeeBarcode] = usePatchEmployeeBarcodeMutation();

  const handleReissueBarcode = async (emp) => {
    const empId = emp.id || emp.employee_id;
    if (!empId) return;
    setBarcodeActionLoading(prev => ({ ...prev, [empId]: 'reissue' }));
    try {
      await patchEmployeeBarcode({ employeeId: empId, action: 'reissue' }).unwrap();
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
      await patchEmployeeBarcode({ employeeId: empId, action: 'deactivate' }).unwrap();
      showToast('global', 'success', `🔴 Barcode deactivated for ${emp.name} (Status: RETIRED).`);
      refreshUsers();
    } catch (err) {
      showToast('global', 'error', err.message || 'Failed to deactivate barcode.');
    } finally {
      setBarcodeActionLoading(prev => ({ ...prev, [empId]: null }));
    }
  };

  const employeesById = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);
  const employeesByPhone = useMemo(
    () => new Map(employees.filter(e => e.phone).map(e => [e.phone, e])),
    [employees]
  );
  const employeesByName = useMemo(
    () => new Map(employees.filter(e => e.name).map(e => [e.name.trim().toLowerCase(), e])),
    [employees]
  );
  const findMatchingEmployee = (u) =>
    employeesById.get(u.employee_id) ||
    employeesById.get(u.id) ||
    (u.phone && employeesByPhone.get(u.phone)) ||
    (u.name && employeesByName.get(u.name.trim().toLowerCase())) ||
    null;

  const filteredUsers = users.filter(u =>
    !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.role?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
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
                  const barcodeTag = u.employee_barcode || findMatchingEmployee(u)?.employee_barcode || `EMP-${String(u.id || '000000').padStart(6, '0')}`;
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
                            onClick={() => setSelectedEmployeeModal({ ...u, employee_barcode: barcodeTag })}
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

    </>
  );
}