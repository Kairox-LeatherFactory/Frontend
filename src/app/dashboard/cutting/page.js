'use client';
import { useState, useMemo } from 'react';
import { 
  Scissors, Plus, Trash2, FileSpreadsheet, Save, RefreshCw, CheckCircle2, 
  Layers, Calculator, ChevronRight, AlertCircle, Sparkles, User, Calendar
} from 'lucide-react';
import { 
  useGetMaterialLotsQuery, 
  useGetLeatherByStyleQuery 
} from '@/store/slices/materialApiSlice';
import { 
  useGetWageStylesQuery, 
  useGetEmployeesQuery,
  useProductionCuttingMutation 
} from '@/store/slices/apiSlice';

// Helper to generate a fresh default sheet object
const createNewSheet = (index) => ({
  id: `sheet-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
  name: `Sheet ${index}`,
  styleId: '',
  styleCode: '',
  lotId: '',
  lotArticle: '',
  lotColour: '',
  uom: 'dcm',
  operatorName: '',
  notes: '',
  hides: [
    { id: 1, hideBarcode: 'HIDE-001', hideArea: 45, frontPanels: 2, backPanels: 2, sleeves: 2, collars: 1, actualConsumed: 41.5, waste: 3.5 },
    { id: 2, hideBarcode: 'HIDE-002', hideArea: 48, frontPanels: 2, backPanels: 2, sleeves: 2, collars: 1, actualConsumed: 44.0, waste: 4.0 },
  ],
});

export default function CuttingGridPage() {
  const currentDateStr = new Date().toISOString().split('T')[0];
  const [entryDate, setEntryDate] = useState(currentDateStr);
  const [toast, setToast] = useState(null);

  // Multi-Sheet State (Excel workbook model)
  const [sheets, setSheets] = useState([createNewSheet(1)]);
  const [activeSheetId, setActiveSheetId] = useState(sheets[0].id);

  // Queries
  const { data: wageStylesData, isLoading: stylesLoading } = useGetWageStylesQuery();
  const availableStyles = Array.isArray(wageStylesData) ? wageStylesData : wageStylesData?.styles || wageStylesData?.items || [];

  const { data: lotsRes, isLoading: lotsLoading } = useGetMaterialLotsQuery({ category: 'LEATHER' });
  const availableLots = lotsRes?.lots || [];

  const { data: employeesData } = useGetEmployeesQuery();
  const availableEmployees = Array.isArray(employeesData) ? employeesData : employeesData?.items || [];

  const [submitCutting, { isLoading: isSubmitting }] = useProductionCuttingMutation();

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Active sheet reference
  const activeSheet = useMemo(() => {
    return sheets.find((s) => s.id === activeSheetId) || sheets[0];
  }, [sheets, activeSheetId]);

  // Handlers for Multi-Sheet workbook
  const handleAddSheet = () => {
    const newIdx = sheets.length + 1;
    const newS = createNewSheet(newIdx);
    setSheets((prev) => [...prev, newS]);
    setActiveSheetId(newS.id);
    showToast(`Added new Cutting Sheet (${newS.name})`, 'success');
  };

  const handleRemoveSheet = (sheetId, e) => {
    e.stopPropagation();
    if (sheets.length === 1) {
      showToast('Cannot delete the last remaining sheet!', 'error');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this cutting sheet tab?')) return;
    const filtered = sheets.filter((s) => s.id !== sheetId);
    setSheets(filtered);
    if (activeSheetId === sheetId) {
      setActiveSheetId(filtered[0].id);
    }
    showToast('Cutting Sheet deleted', 'info');
  };

  const updateActiveSheet = (updater) => {
    setSheets((prev) =>
      prev.map((s) => (s.id === activeSheetId ? updater(s) : s))
    );
  };

  // Active Sheet Lot & Style change handlers
  const handleSelectStyle = (e) => {
    const sId = e.target.value;
    const found = availableStyles.find((st) => (st.style_id || st.id || st.style_code) === sId);
    const code = found?.style_code || found?.style_name || sId;
    updateActiveSheet((s) => ({
      ...s,
      styleId: sId,
      styleCode: code,
      name: code ? `Sheet: ${code}` : s.name,
    }));
  };

  const handleSelectLot = (e) => {
    const lId = e.target.value;
    const found = availableLots.find((l) => (l.lot_id || l.id) === lId);
    updateActiveSheet((s) => ({
      ...s,
      lotId: lId,
      lotArticle: found?.article || '',
      lotColour: found?.colour || '',
      uom: found?.uom || 'dcm',
    }));
  };

  // Hide rows handlers for active sheet
  const handleAddHideRow = () => {
    updateActiveSheet((s) => {
      const nextId = s.hides.length + 1;
      const newHide = {
        id: nextId,
        hideBarcode: `HIDE-${String(nextId).padStart(3, '0')}`,
        hideArea: 40,
        frontPanels: 2,
        backPanels: 2,
        sleeves: 2,
        collars: 1,
        actualConsumed: 37,
        waste: 3,
      };
      return { ...s, hides: [...s.hides, newHide] };
    });
  };

  const handleUpdateHide = (hideId, field, val) => {
    updateActiveSheet((s) => ({
      ...s,
      hides: s.hides.map((h) => {
        if (h.id !== hideId) return h;
        const updated = { ...h, [field]: val };
        if (field === 'hideArea' || field === 'actualConsumed') {
          const area = Number(field === 'hideArea' ? val : updated.hideArea) || 0;
          const cons = Number(field === 'actualConsumed' ? val : updated.actualConsumed) || 0;
          updated.waste = Math.max(0, Number((area - cons).toFixed(2)));
        }
        return updated;
      }),
    }));
  };

  const handleRemoveHideRow = (hideId) => {
    updateActiveSheet((s) => ({
      ...s,
      hides: s.hides.filter((h) => h.id !== hideId),
    }));
  };

  // Calculations for Active Sheet
  const activeTotals = useMemo(() => {
    if (!activeSheet?.hides) return { totalArea: 0, totalConsumed: 0, totalWaste: 0, wastePct: 0, totalHides: 0 };
    const totalArea = activeSheet.hides.reduce((acc, h) => acc + (Number(h.hideArea) || 0), 0);
    const totalConsumed = activeSheet.hides.reduce((acc, h) => acc + (Number(h.actualConsumed) || 0), 0);
    const totalWaste = activeSheet.hides.reduce((acc, h) => acc + (Number(h.waste) || 0), 0);
    const wastePct = totalArea > 0 ? ((totalWaste / totalArea) * 100).toFixed(1) : 0;
    return { totalArea, totalConsumed, totalWaste, wastePct, totalHides: activeSheet.hides.length };
  }, [activeSheet]);

  // Overall calculations across ALL sheets for the date
  const overallTotals = useMemo(() => {
    let totalHides = 0;
    let totalConsumed = 0;
    let totalWaste = 0;
    let totalArea = 0;
    sheets.forEach((s) => {
      s.hides.forEach((h) => {
        totalHides += 1;
        totalArea += Number(h.hideArea) || 0;
        totalConsumed += Number(h.actualConsumed) || 0;
        totalWaste += Number(h.waste) || 0;
      });
    });
    const avgWastePct = totalArea > 0 ? ((totalWaste / totalArea) * 100).toFixed(1) : 0;
    return { totalSheets: sheets.length, totalHides, totalConsumed, totalWaste, avgWastePct };
  }, [sheets]);

  // Submit all sheets to backend
  const handleSubmitAllSheets = async () => {
    const invalidSheet = sheets.find((s) => !s.styleId || !s.lotId);
    if (invalidSheet) {
      showToast(`Please select Style and Leather Lot for "${invalidSheet.name}" before saving.`, 'error');
      return;
    }

    try {
      const payload = {
        entry_date: entryDate,
        sheets: sheets.map((s) => ({
          sheet_id: s.id,
          style_id: s.styleId,
          lot_id: s.lotId,
          operator_name: s.operatorName,
          hides: s.hides.map((h) => ({
            barcode: h.hideBarcode,
            area: Number(h.hideArea),
            consumed: Number(h.actualConsumed),
            waste: Number(h.waste),
            parts: {
              front_panels: Number(h.frontPanels),
              back_panels: Number(h.backPanels),
              sleeves: Number(h.sleeves),
              collars: Number(h.collars),
            },
          })),
        })),
      };

      await submitCutting(payload).unwrap();
      showToast(`Successfully logged ${sheets.length} Cutting Sheet(s) for ${entryDate}!`, 'success');
    } catch (e) {
      showToast(e?.data?.detail || e?.message || 'Failed to save cutting sheets', 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 animate-fade-in">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl shadow-2xl font-bold text-xs flex items-center gap-2 ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* ─── HEADER BAR ─── */}
      <div className="bg-slate-900 rounded-[2.5rem] p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-700 rounded-2xl text-white shadow-lg">
                <Scissors className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Cutting Grid Engine</h1>
                <p className="text-xs text-amber-200/70 font-medium mt-0.5">
                  Multi-Sheet Hide-by-Hide Leather Consumption &amp; Pattern Layout Management
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-800/80 px-4 py-2.5 rounded-2xl border border-slate-700">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-slate-300">Date:</span>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="bg-transparent text-xs font-black text-white focus:outline-none cursor-pointer"
              />
            </div>

            <button
              onClick={handleSubmitAllSheets}
              disabled={isSubmitting}
              className="px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider text-slate-950 shadow-xl transition-all flex items-center gap-2 disabled:opacity-50 hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
            >
              {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save All Sheets ({overallTotals.totalSheets})
            </button>
          </div>
        </div>

        {/* Overall Day Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/50 p-3.5 rounded-2xl border border-slate-700/50">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Active Sheets (Styles)</p>
            <p className="text-xl font-black text-amber-400 mt-1">{overallTotals.totalSheets}</p>
          </div>
          <div className="bg-slate-800/50 p-3.5 rounded-2xl border border-slate-700/50">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Total Hides Cut</p>
            <p className="text-xl font-black text-white mt-1">{overallTotals.totalHides} hides</p>
          </div>
          <div className="bg-slate-800/50 p-3.5 rounded-2xl border border-slate-700/50">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Total Consumed</p>
            <p className="text-xl font-black text-emerald-400 mt-1">{overallTotals.totalConsumed.toFixed(1)} dcm</p>
          </div>
          <div className="bg-slate-800/50 p-3.5 rounded-2xl border border-slate-700/50">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Avg Waste %</p>
            <p className="text-xl font-black text-amber-500 mt-1">{overallTotals.avgWastePct}%</p>
          </div>
        </div>
      </div>

      {/* ─── ACTIVE SHEET SETTINGS & CONTROL BAR ─── */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border space-y-6" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 font-black">
              {sheets.findIndex((s) => s.id === activeSheetId) + 1}
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">{activeSheet.name} Setup</h2>
              <p className="text-xs text-slate-400 font-medium">Configure Style, Leather Lot &amp; Cutter for this sheet.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-400">Sheet Waste:</span>
            <span className={`px-3 py-1 rounded-xl text-xs font-black ${
              Number(activeTotals.wastePct) > 12 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {activeTotals.wastePct}% ({activeTotals.totalWaste} dcm)
            </span>
          </div>
        </div>

        {/* 3 Config Fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Style Selector */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">1. Target Garment Style</label>
            <select
              value={activeSheet.styleId}
              onChange={handleSelectStyle}
              className="w-full h-11 px-3.5 rounded-xl border text-xs font-bold bg-slate-50 focus:outline-none focus:border-amber-500"
              style={{ borderColor: 'rgba(200,131,74,0.2)' }}
            >
              <option value="">Select Garment Style...</option>
              {availableStyles.map((st, idx) => {
                const id = st.style_id || st.id || st.style_code;
                const name = st.style_name || st.style_code || id;
                return (
                  <option key={id || idx} value={id}>
                    {name} {id !== name ? `(${id})` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Leather Lot Selector */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">2. Leather Lot (Stock)</label>
            <select
              value={activeSheet.lotId}
              onChange={handleSelectLot}
              className="w-full h-11 px-3.5 rounded-xl border text-xs font-bold bg-slate-50 focus:outline-none focus:border-amber-500"
              style={{ borderColor: 'rgba(200,131,74,0.2)' }}
            >
              <option value="">Select Leather Lot...</option>
              {availableLots.map((l, idx) => {
                const id = l.lot_id || l.id;
                return (
                  <option key={id || idx} value={id}>
                    {l.article} - {l.colour} ({l.available} {l.uom || 'dcm'} avail)
                  </option>
                );
              })}
            </select>
          </div>

          {/* Cutter Operator */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">3. Cutter Operator</label>
            <select
              value={activeSheet.operatorName}
              onChange={(e) => updateActiveSheet((s) => ({ ...s, operatorName: e.target.value }))}
              className="w-full h-11 px-3.5 rounded-xl border text-xs font-bold bg-slate-50 focus:outline-none focus:border-amber-500"
              style={{ borderColor: 'rgba(200,131,74,0.2)' }}
            >
              <option value="">Select Cutter Operator...</option>
              {availableEmployees.map((emp, idx) => (
                <option key={emp.employee_id || emp.id || idx} value={emp.full_name || emp.name}>
                  {emp.full_name || emp.name} ({emp.role || 'Cutter'})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ─── HIDE-BY-HIDE CUTTING GRID TABLE ─── */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border space-y-4" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-black text-slate-900">Hide-by-Hide Cutting Breakdown</h3>
          </div>

          <button
            onClick={handleAddHideRow}
            className="px-4 py-2 rounded-xl text-xs font-black text-white shadow-sm flex items-center gap-1.5"
            style={{ background: '#c8834a' }}
          >
            <Plus className="w-4 h-4" /> Add Hide Row
          </button>
        </div>

        <div className="overflow-x-auto border rounded-2xl" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-amber-50/60 border-b text-[11px] font-black uppercase text-slate-600 tracking-wider">
                <th className="p-3">Hide #</th>
                <th className="p-3">Hide Barcode</th>
                <th className="p-3">Total Area ({activeSheet.uom})</th>
                <th className="p-3 text-center">Front Panels</th>
                <th className="p-3 text-center">Back Panels</th>
                <th className="p-3 text-center">Sleeves</th>
                <th className="p-3 text-center">Collars</th>
                <th className="p-3">Consumed ({activeSheet.uom})</th>
                <th className="p-3">Waste ({activeSheet.uom})</th>
                <th className="p-3 text-center font-bold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
              {activeSheet.hides.map((hide, idx) => (
                <tr key={hide.id} className="hover:bg-amber-50/30 transition-all">
                  <td className="p-3 font-black text-slate-400">{idx + 1}</td>
                  <td className="p-3 font-mono font-bold text-amber-800">
                    <input
                      type="text"
                      value={hide.hideBarcode}
                      onChange={(e) => handleUpdateHide(hide.id, 'hideBarcode', e.target.value)}
                      className="w-24 px-2 py-1 bg-slate-50 border rounded-lg text-xs font-mono font-bold"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      value={hide.hideArea}
                      onChange={(e) => handleUpdateHide(hide.id, 'hideArea', e.target.value)}
                      className="w-20 px-2 py-1 bg-slate-50 border rounded-lg text-xs font-bold"
                    />
                  </td>
                  <td className="p-3 text-center">
                    <input
                      type="number"
                      value={hide.frontPanels}
                      onChange={(e) => handleUpdateHide(hide.id, 'frontPanels', e.target.value)}
                      className="w-14 text-center py-1 bg-slate-50 border rounded-lg text-xs font-bold"
                    />
                  </td>
                  <td className="p-3 text-center">
                    <input
                      type="number"
                      value={hide.backPanels}
                      onChange={(e) => handleUpdateHide(hide.id, 'backPanels', e.target.value)}
                      className="w-14 text-center py-1 bg-slate-50 border rounded-lg text-xs font-bold"
                    />
                  </td>
                  <td className="p-3 text-center">
                    <input
                      type="number"
                      value={hide.sleeves}
                      onChange={(e) => handleUpdateHide(hide.id, 'sleeves', e.target.value)}
                      className="w-14 text-center py-1 bg-slate-50 border rounded-lg text-xs font-bold"
                    />
                  </td>
                  <td className="p-3 text-center">
                    <input
                      type="number"
                      value={hide.collars}
                      onChange={(e) => handleUpdateHide(hide.id, 'collars', e.target.value)}
                      className="w-14 text-center py-1 bg-slate-50 border rounded-lg text-xs font-bold"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      value={hide.actualConsumed}
                      onChange={(e) => handleUpdateHide(hide.id, 'actualConsumed', e.target.value)}
                      className="w-20 px-2 py-1 bg-slate-50 border rounded-lg text-xs font-bold text-emerald-700"
                    />
                  </td>
                  <td className="p-3 font-mono font-bold text-amber-700">
                    {hide.waste} {activeSheet.uom}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleRemoveHideRow(hide.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50/80 border-t font-black text-xs text-slate-800">
              <tr>
                <td colSpan="2" className="p-3 uppercase text-slate-500">Sheet Totals:</td>
                <td className="p-3 text-amber-800">{activeTotals.totalArea} {activeSheet.uom}</td>
                <td colSpan="4" className="p-3 text-center text-slate-400">Total Hides: {activeTotals.totalHides}</td>
                <td className="p-3 text-emerald-700">{activeTotals.totalConsumed} {activeSheet.uom}</td>
                <td className="p-3 text-amber-700">{activeTotals.totalWaste} {activeSheet.uom} ({activeTotals.wastePct}%)</td>
                <td className="p-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ─── EXCEL MULTI-SHEET BOTTOM TAB NAVIGATION BAR ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800 px-4 py-2.5 shadow-2xl backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Excel Style Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar">
            <span className="text-[10px] font-black text-slate-500 uppercase mr-2 tracking-widest hidden sm:inline">
              Worksheet Tabs:
            </span>

            {sheets.map((sheet, index) => {
              const isActive = sheet.id === activeSheetId;
              return (
                <div
                  key={sheet.id}
                  onClick={() => setActiveSheetId(sheet.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 border select-none ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg scale-105'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <FileSpreadsheet className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-amber-400'}`} />
                  <span>{sheet.name}</span>

                  {/* Close tab X button */}
                  {sheets.length > 1 && (
                    <button
                      onClick={(e) => handleRemoveSheet(sheet.id, e)}
                      className={`p-0.5 rounded-md transition-all ${
                        isActive ? 'hover:bg-amber-600 text-slate-900' : 'hover:bg-slate-600 text-slate-400'
                      }`}
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}

            {/* + Add Sheet Button */}
            <button
              onClick={handleAddSheet}
              className="px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-amber-400 hover:bg-amber-500 hover:text-slate-950 transition-all font-black text-xs flex items-center gap-1 shadow-sm"
              title="Add a new Cutting Sheet tab for another style on this date"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Sheet</span>
            </button>
          </div>

          <div className="text-right hidden md:block">
            <span className="text-[11px] font-bold text-slate-400">
              Total Day Consumed: <strong className="text-emerald-400 font-mono">{overallTotals.totalConsumed.toFixed(1)} dcm</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
