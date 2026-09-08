'use client';
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Zap, Send } from 'lucide-react';
import { BRAND, inputCls, selectCls, fieldStyle } from '../_lib/constants';
import { statusBadgeClass } from '../_lib/helpers';
import ScreenSafeSelect from './ScreenSafeSelect';
import BarcodeCanvas from './BarcodeCanvas';

/**
 * ============================================================================
 * EmployeeGenerationTab Component
 * ============================================================================
 * WHAT IT IS:
 * Dedicated batch generation interface for Employee ID Badge Barcodes.
 *
 * WHY IT EXISTS:
 * Pulls active factory employees from `GET /api/v1/employees`.
 * Allows filtering by designation/department, batch selecting staff members,
 * generating scannable `EMP-<ID>` barcodes, and passing badges to Print Center.
 */
export default function EmployeeGenerationTab({
  employees,
  employeesLoading,
  employeesError,
  onRetryEmployees,
  employeeGenerated,
  onGenerateSelected,
  onGenerateAllRemaining,
  onSendToPrintCenter,
  onOpenDetail,
  onPrintSingle,
}) {
  // --------------------------------------------------------------------------
  // 1. LOCAL STATE & DESIGNATION LIST
  // --------------------------------------------------------------------------
  const designations = useMemo(() => Array.from(new Set(employees.map((e) => e.designation))), [employees]);
  const [designationFilter, setDesignationFilter] = useState('ALL');
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [search, setSearch] = useState('');

  // Track already generated employee IDs to mark as completed
  const generatedIds = useMemo(() => new Set(employeeGenerated.map((r) => r.size)), [employeeGenerated]);

  // --------------------------------------------------------------------------
  // 2. SEARCH & DESIGNATION FILTERING
  // --------------------------------------------------------------------------
  const filteredEmployees = useMemo(() => {
    let list = employees;
    if (designationFilter !== 'ALL') list = list.filter((e) => e.designation === designationFilter);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((e) => e.name.toLowerCase().includes(q) || e.empId.toLowerCase().includes(q));
    return list;
  }, [employees, designationFilter, search]);

  const totals = useMemo(() => ({
    ordered: employees.length,
    generated: employeeGenerated.length,
  }), [employees, employeeGenerated]);

  // --------------------------------------------------------------------------
  // 3. SELECTION HANDLERS
  // --------------------------------------------------------------------------
  const toggleSelect = (empId) => setSelectedIds((prev) => {
    const next = new Set(prev);
    next.has(empId) ? next.delete(empId) : next.add(empId);
    return next;
  });

  const selectAllVisible = () => setSelectedIds((prev) => {
    const next = new Set(prev);
    filteredEmployees.forEach((e) => {
      if (!generatedIds.has(e.empId)) next.add(e.empId);
    });
    return next;
  });

  const clearSelection = () => setSelectedIds(new Set());

  // --------------------------------------------------------------------------
  // 4. GENERATE BARCODES HANDLER
  // --------------------------------------------------------------------------
  const handleGenerateClick = () => {
    const chosen = employees.filter((e) => selectedIds.has(e.empId));
    onGenerateSelected(chosen);
    setSelectedIds(new Set());
  };

  // Filter generated badges by search string
  const generatedBarcodes = useMemo(() => {
    let list = employeeGenerated;
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((b) => b.pieceCode.toLowerCase().includes(q) || b.style.toLowerCase().includes(q));
    return list;
  }, [employeeGenerated, search]);

  // --------------------------------------------------------------------------
  // 5. RENDER TAB INTERFACE
  // --------------------------------------------------------------------------
  return (
    <div className="space-y-6 animate-fade-in">
      {/* --- Section 1: Overview Summary Cards --- */}
      <div className="rounded-2xl p-6 shadow-sm flex items-center gap-6 flex-wrap" style={{ background: '#fff', border: `1.5px solid ${BRAND.border}` }}>
        <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Total Employees</p><p className="font-bold" style={{ color: BRAND.text }}>{totals.ordered}</p></div>
        <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Generated</p><p className="font-bold" style={{ color: BRAND.text }}>{totals.generated}</p></div>
        <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Remaining</p><p className="font-bold" style={{ color: '#d97706' }}>{totals.ordered - totals.generated}</p></div>
        <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Selected</p><p className="font-bold" style={{ color: BRAND.accent }}>{selectedIds.size}</p></div>
      </div>

      {/* --- Section 2: Employee Selection Table & Controls --- */}
      <div className="rounded-2xl p-6 shadow-sm" style={{ background: '#fff', border: `1.5px solid ${BRAND.border}` }}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h3 className="text-lg font-black" style={{ color: BRAND.text }}>Select Employees to Generate</h3>
            <p className="text-xs" style={{ color: BRAND.textMuted }}>Filter by designation, check employees, then generate.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={handleGenerateClick} disabled={selectedIds.size === 0} className="btn-warm-primary !min-h-0 !py-2.5 !px-4 text-xs disabled:opacity-50 disabled:cursor-default">
              <Zap className="w-4 h-4" /> Generate Selected ({selectedIds.size})
            </button>
            <button onClick={onGenerateAllRemaining} className="btn-warm-secondary !min-h-0 !py-2.5 !px-4 text-xs">Generate All Remaining</button>
            <button onClick={onSendToPrintCenter} className="btn-warm-secondary !min-h-0 !py-2.5 !px-4 text-xs"><Send className="w-4 h-4" /> Send All to Print Center</button>
          </div>
        </div>

        {/* Designation Filter & Search Bar */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[0.68rem] font-bold uppercase whitespace-nowrap" style={{ color: BRAND.textMuted }}>Designation:</span>
            <ScreenSafeSelect
              value={designationFilter}
              onChange={setDesignationFilter}
              placeholder="All Designations"
              className={`${selectCls} !w-56`}
              options={[{ value: 'ALL', label: 'All Designations' }, ...designations.map((d) => ({ value: d, label: d }))]}
            />
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: BRAND.textMuted }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or employee ID..." className={`${inputCls} !pl-8 !w-56 !py-2`} style={fieldStyle} />
          </div>
          <p className="text-xs" style={{ color: BRAND.textMuted }}>{filteredEmployees.length} employee{filteredEmployees.length === 1 ? '' : 's'} match this filter</p>
          <div className="flex gap-2">
            <button onClick={selectAllVisible} className="btn-warm-secondary !min-h-0 !py-1.5 !px-3 text-xs">Select All Visible</button>
            <button onClick={clearSelection} className="btn-warm-secondary !min-h-0 !py-1.5 !px-3 text-xs">Clear</button>
          </div>
        </div>

        {/* Employee Roster List */}
        {employeesLoading ? (
          <div className="text-center py-8 text-sm rounded-lg" style={{ color: BRAND.textMuted, border: `1px solid ${BRAND.border}` }}>Loading employee roster…</div>
        ) : employeesError ? (
          <div className="text-center py-8 text-sm space-y-2 rounded-lg" style={{ color: BRAND.textMuted, border: `1px solid ${BRAND.border}` }}>
            <p style={{ color: '#b91c1c' }}>{employeesError}</p>
            <button onClick={onRetryEmployees} className="btn-warm-secondary !min-h-0 !py-1.5 !px-3 text-xs">Retry</button>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="text-center py-8 text-sm rounded-lg" style={{ color: BRAND.textMuted, border: `1px solid ${BRAND.border}` }}>
            {employees.length === 0 ? 'No employees on the roster yet.' : 'No employees match this filter.'}
          </div>
        ) : (
          <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}>
            {filteredEmployees.map((e) => {
              const isGenerated = generatedIds.has(e.empId);
              const isChecked = selectedIds.has(e.empId);
              return (
                <label
                  key={e.empId}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer"
                  style={{ background: isChecked ? '#faf3ea' : '#fff', border: `1.5px solid ${isChecked ? BRAND.accent : BRAND.border}` }}
                >
                  <input type="checkbox" disabled={isGenerated} checked={isChecked} onChange={() => toggleSelect(e.empId)} className="w-4 h-4 accent-[#c8834a] cursor-pointer disabled:cursor-default flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate" style={{ color: '#5a3518' }}>{e.name}</div>
                    <div className="text-xs truncate" style={{ color: BRAND.textMuted }}>{e.designation} • {e.empId}</div>
                  </div>
                  <span className={`${statusBadgeClass(isGenerated ? 'PRINTED' : 'PENDING')} flex-shrink-0`}>{isGenerated ? 'Done' : 'Pending'}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* --- Section 3: Generated Employee ID Barcodes Grid --- */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <div>
            <h3 className="text-base font-black" style={{ color: BRAND.text }}>Generated Employee ID Barcodes</h3>
            <p className="text-xs" style={{ color: BRAND.textMuted }}>Showing {generatedBarcodes.length} badges</p>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: BRAND.textMuted }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter name/code..." className={`${inputCls} !pl-8 !w-52 !py-2`} style={fieldStyle} />
          </div>
        </div>

        {generatedBarcodes.length === 0 ? (
          <div className="text-center py-12 rounded-xl" style={{ background: '#fff', border: '1.5px dashed rgba(200,131,74,0.3)' }}>
            <p className="font-bold" style={{ color: BRAND.textMuted }}>No employee ID barcodes generated yet.</p>
            <p className="text-xs mt-1" style={{ color: BRAND.textMuted }}>Check employees above and click &quot;Generate Selected&quot;.</p>
          </div>
        ) : (
          <motion.div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
            {generatedBarcodes.map((b) => (
              <motion.div
                key={b.pieceCode}
                whileHover={{ y: -6, scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                onClick={() => onOpenDetail(b.pieceCode)}
                className="rounded-xl p-4 flex flex-col items-center gap-3 cursor-pointer"
                style={{ background: '#fff', border: `1.5px solid ${BRAND.border}` }}
              >
                <div className="w-full bg-white rounded-lg p-2 flex justify-center" style={{ border: '1px solid rgba(200,131,74,0.2)' }}>
                  <BarcodeCanvas code={b.pieceCode} displayWidth={200} />
                </div>
                <div className="text-center w-full">
                  <div className="font-mono font-bold text-xs break-all" style={{ color: '#5a3518' }}>{b.pieceCode}</div>
                  <div className="flex items-center justify-center gap-1.5 mt-1.5 flex-wrap">
                    <span className="text-[0.65rem] px-2 py-0.5 rounded font-semibold" style={{ background: BRAND.bg, color: BRAND.textMuted, border: '1px solid rgba(200,131,74,0.2)' }}>{b.style}</span>
                    <span className="text-[0.65rem] px-2 py-0.5 rounded font-semibold" style={{ background: BRAND.bg, color: BRAND.textMuted, border: '1px solid rgba(200,131,74,0.2)' }}>{b.color}</span>
                    <span className={statusBadgeClass(b.printStatus)}>{b.printStatus}</span>
                  </div>
                </div>
                <div className="flex gap-2 w-full" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => onOpenDetail(b.pieceCode)} className="flex-1 btn-warm-secondary !min-h-0 !py-1.5 text-xs">View</button>
                  <button onClick={() => onPrintSingle(b.pieceCode)} className="flex-1 btn-warm-primary !min-h-0 !py-1.5 text-xs">Print</button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
