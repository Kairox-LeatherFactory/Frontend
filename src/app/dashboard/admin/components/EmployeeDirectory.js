'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Search, Filter, Loader2, Barcode } from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';
import { fadeUpItem, rowStagger } from '@/lib/motionVariants';

export function EmployeeDirectory({ employees, loading }) {
  const [search, setSearch] = useState('');
  const [wageFilter, setWageFilter] = useState('all'); // 'all', 'daily', 'monthly'

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
                <th className="p-3">Daily Rate</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Barcode Tag</th>
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
                <motion.tr key={emp.id} variants={fadeUpItem} className="border-b hover:bg-[#fcfaf8] transition-colors text-xs" style={{ borderColor: 'rgba(200,131,74,0.07)' }}>
                  
                  {/* Name & ID */}
                  <td className="p-3 pl-5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black text-white flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}>
                        {(emp.name || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <span className="font-black block" style={{ color: '#2d1f0e' }}>{emp.name}</span>
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

                  {/* Daily Rate */}
                  <td className="p-3 font-mono font-bold" style={{ color: '#2d1f0e' }}>
                    {emp.daily_rate ? `₹${emp.daily_rate}` : '—'}
                  </td>

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

                </motion.tr>
              ))}
            </motion.tbody>
          </table>
        </div>
      )}
    </SpotlightCard>
  );
}
