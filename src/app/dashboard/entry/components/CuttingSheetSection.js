'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Scissors, CheckCircle2, AlertCircle, Loader2, FileSpreadsheet, LockOpen, Check } from 'lucide-react';
import {
  useLazyGetMaterialLotsQuery,
  useGenerateCuttingRowsMutation,
  useCreateCuttingSheetMutation,
  useUpdateCuttingSheetMutation,
  useApproveCuttingRowMutation,
  useReopenCuttingRowMutation,
  useLazyGetClientStylesQuery,
  useLazyGetStyleMaterialSpecQuery
} from '@/store/slices/apiSlice';

const toast = {
  success: (msg) => console.log('SUCCESS:', msg),
  error: (msg) => window.alert('ERROR: ' + msg),
  warning: (msg) => console.warn('WARNING:', msg)
};


export default function CuttingSheetSection() {
  // -- Lazy queries: fire only when dropdown is focused/opened --
  const [fetchLots, { data: lots }] = useLazyGetMaterialLotsQuery();
  const lotsList = Array.isArray(lots) ? lots : lots?.lots || lots?.items || [];

  const [fetchStyles, { data: stylesData }] = useLazyGetClientStylesQuery();
  const stylesList = Array.isArray(stylesData) ? stylesData : stylesData?.items || [];

  const [workDate, setWorkDate] = useState(new Date().toISOString().slice(0, 10));
  const [styleId, setStyleId] = useState('');
  const [colour, setColour] = useState('');
  const [selectedArticle, setSelectedArticle] = useState('');

  // Material spec: fires only when a style is selected
  const [fetchSpec, { data: specData }] = useLazyGetStyleMaterialSpecQuery();

  // When styleId changes, fetch the spec
  useEffect(() => {
    if (styleId) fetchSpec(styleId);
  }, [styleId, fetchSpec]);

  const leatherLines = useMemo(() => {
    const lines = Array.isArray(specData) ? specData : specData?.lines || [];
    return lines.filter(l => l.category === 'LEATHER');
  }, [specData]);

  const availableArticles = useMemo(() => {
    if (!styleId) return [...new Set(lotsList.map(l => l.article).filter(Boolean))];
    return [...new Set(leatherLines.map(l => l.article).filter(Boolean))];
  }, [styleId, leatherLines, lotsList]);

  const availableColours = useMemo(() => {
    if (!styleId) return [...new Set(lotsList.map(l => l.colour).filter(Boolean))];
    return [...new Set(leatherLines.map(l => l.colour).filter(Boolean))];
  }, [styleId, leatherLines, lotsList]);

  const [generateRows, { isLoading: isGenerating }] = useGenerateCuttingRowsMutation();

  // Grid state
  const [rows, setRows] = useState([]);

  const handleGenerate = async () => {
    if (!styleId) {
      toast.error('Style ID is required');
      return;
    }
    try {
      const matchingLot = lotsList.find(l => l.article === selectedArticle && l.colour === colour);
      const payload = {
        style_id: styleId,
        colour: colour || undefined,
        material_lot_id: matchingLot ? matchingLot.lot_id : undefined,
        work_date: workDate || undefined,
        allocate: true,
        limit: 200
      };

      const res = await generateRows(payload).unwrap();
      if (res.rows && Array.isArray(res.rows)) {
        setRows(prev => [...prev, ...res.rows]);
        toast.success(`Generated ${res.created || res.rows.length} rows successfully`);
        if (res.warnings && res.warnings.length > 0) {
          res.warnings.forEach(w => toast.warning(w));
        }
      }
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to generate rows');
    }
  };

  const updateRowInState = useCallback((updatedRow) => {
    setRows(prev => prev.map(r => r.id === updatedRow.id ? updatedRow : r));
  }, []);

  const grandTotalSkins = rows.reduce((sum, r) => sum + (r.sheets?.length || 0), 0);
  const grandTotalSqft = rows.reduce((sum, r) => sum + (r.sheets?.reduce((acc, s) => acc + (parseFloat(s.dcm) || 0), 0) || 0), 0).toFixed(2);

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa] overflow-hidden animate-fade-in text-xs">
      <style>{`
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
        tr.excel-row:focus-within {
          background-color: #fefce8 !important;
          box-shadow: inset 0 0 0 2px #c8834a;
          position: relative;
          z-index: 30;
        }
        tr.excel-row:focus-within td {
          border-color: #fefce8;
        }
      `}</style>

      {/* Header & Generator Bar */}
      <div className="flex-none bg-white border-b z-40 shadow-sm relative">
        <div className="px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-[#1e293b] flex items-center gap-2 tracking-tight">
              <span className="bg-[#c8834a]/10 p-1.5 rounded-lg text-[#c8834a]"><Scissors className="w-4 h-4" /></span>
              PTE Cutting Grid
            </h2>
            <p className="text-[10px] text-slate-400 font-bold mt-1">
              Use Generate to create rows. Cells save automatically on blur.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200 shadow-inner overflow-x-auto">
            <input
              type="date"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 text-xs outline-none focus:border-[#c8834a] focus:ring-1 focus:ring-[#c8834a] transition-all"
            />
            <select
              value={styleId}
              onChange={(e) => { setStyleId(e.target.value); setSelectedArticle(''); setColour(''); }}
              onFocus={() => fetchStyles()}
              className="px-3 py-2 w-32 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 text-xs outline-none focus:border-[#c8834a] focus:ring-1 focus:ring-[#c8834a] transition-all truncate"
            >
              <option value="">-- Style * --</option>
              {stylesList.map((s, idx) => {
                const sId = s.style_id || s.style_code || s.id;
                return <option key={`style-${sId}-${idx}`} value={sId}>{s.style_name || s.name || sId}</option>;
              })}
            </select>
            <select
              value={selectedArticle}
              onChange={(e) => setSelectedArticle(e.target.value)}
              onFocus={() => !styleId && fetchLots('category=leather')}
              className="px-3 py-2 w-40 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 text-xs outline-none focus:border-[#c8834a] focus:ring-1 focus:ring-[#c8834a] transition-all truncate"
            >
              <option value="">-- Article --</option>
              {availableArticles.map((a, idx) => (
                <option key={`art-${a}-${idx}`} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <select
              value={colour}
              onChange={(e) => setColour(e.target.value)}
              onFocus={() => !styleId && fetchLots('category=leather')}
              className="px-3 py-2 w-28 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 text-xs outline-none focus:border-[#c8834a] focus:ring-1 focus:ring-[#c8834a] transition-all"
            >
              <option value="">-- Colour --</option>
              {availableColours.map((c, idx) => (
                <option key={`col-${c}-${idx}`} value={c}>{c}</option>
              ))}
            </select>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !styleId}
              className="flex items-center gap-2 px-6 py-2 bg-[#1e293b] hover:bg-[#0f172a] text-white rounded-lg font-black text-xs transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
              Generate
            </button>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-auto p-4 z-0 relative">
        <div className="bg-white rounded-lg shadow-sm border border-slate-300 inline-block min-w-full">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-[#475569] text-white uppercase font-black tracking-wider border-b border-slate-300">
                <th className="p-2 sticky left-0 z-20 bg-[#334155] border-r border-slate-400 w-10 text-center">S.No</th>
                <th className="p-2 sticky left-10 z-20 bg-[#334155] border-r border-slate-400 w-28 text-center">DATE</th>
                <th className="p-2 border-r border-slate-400 w-32 text-center">Order</th>
                <th className="p-2 border-r border-slate-400 w-36 text-center">Style</th>
                <th className="p-2 border-r border-slate-400 w-32 text-center">Article</th>
                <th className="p-2 border-r border-slate-400 w-24 text-center">Colour</th>
                <th className="p-2 border-r border-slate-400 w-32 text-center">Name</th>
                <th className="p-2 border-r border-slate-400 w-16 text-center">Size</th>
                <th className="p-2 border-r border-slate-400 w-20 text-center">R.C.NO</th>
                {Array(17).fill(0).map((_, i) => (
                  <th key={i} className="p-1 w-16 text-center border-r border-slate-400 bg-[#64748b]">{i + 1}</th>
                ))}
                <th className="p-2 w-16 text-center border-r border-slate-400 bg-[#334155]">Total</th>
                <th className="p-2 w-16 text-center border-r border-slate-400 bg-[#334155]">Dcm</th>
                <th className="p-2 w-28 text-center sticky right-0 z-20 bg-[#334155] shadow-[-4px_0_10px_rgba(0,0,0,0.1)]">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={29} className="p-12 text-center text-slate-400 font-bold bg-slate-50">
                    No rows generated yet. Use the top bar to generate rows.
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <CuttingSheetRow
                    key={row.id}
                    index={index}
                    sNo={index + 1}
                    row={row}
                    updateRowInState={updateRowInState}
                  />
                ))
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="bg-[#475569] text-white font-black">
                  <td colSpan={26} className="p-2 text-right border-r border-slate-500 tracking-widest text-[13px]">
                    GRAND TOTAL
                  </td>
                  <td className="p-2 text-center border-r border-slate-500 bg-[#334155] text-emerald-400 text-sm">
                    {grandTotalSkins}
                  </td>
                  <td className="p-2 text-center border-r border-slate-500 bg-[#334155] text-emerald-400 text-sm">
                    {grandTotalSqft}
                  </td>
                  <td className="p-2 bg-[#334155] sticky right-0 z-20 shadow-[-4px_0_10px_rgba(0,0,0,0.1)]"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

const CuttingSheetRow = React.memo(({ index, sNo, row, updateRowInState }) => {
  const [createSheet] = useCreateCuttingSheetMutation();
  const [updateSheet] = useUpdateCuttingSheetMutation();
  const [approveRow, { isLoading: isApproving }] = useApproveCuttingRowMutation();
  const [reopenRow, { isLoading: isReopening }] = useReopenCuttingRowMutation();

  const [localCells, setLocalCells] = useState({});
  const [loadingCells, setLoadingCells] = useState({});

  const isLocked = row.status === 'APPROVED' || row.status === 'ISSUED';
  const sheets = row.sheets || [];

  const handleCellBlur = async (sheetIndex, value) => {
    const numValue = parseFloat(value);
    const existingSheet = sheets[sheetIndex];

    if (!value || isNaN(numValue) || numValue <= 0) {
      if (!existingSheet) return;
      // User cleared an existing sheet - normally requires DELETE /sheets/{id}
      toast.warning('Cannot delete sheets via grid yet.');
      return;
    }

    if (existingSheet && existingSheet.dcm === numValue) return; // No change

    setLoadingCells(prev => ({ ...prev, [sheetIndex]: true }));
    try {
      if (existingSheet) {
        const res = await updateSheet({ id: row.id, sheet_id: existingSheet.id, payload: { dcm: numValue } }).unwrap();
        updateRowInState(res.row || res);
        toast.success(`Sheet updated to ${numValue} dcm`);
      } else {
        const res = await createSheet({ id: row.id, payload: { dcm: numValue } }).unwrap();
        updateRowInState(res.row || res);
        toast.success(`Sheet created: ${numValue} dcm`);
      }
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to save sheet');
      setLocalCells(prev => ({ ...prev, [sheetIndex]: existingSheet ? existingSheet.dcm : '' }));
    } finally {
      setLoadingCells(prev => ({ ...prev, [sheetIndex]: false }));
    }
  };

  const handleApprove = async () => {
    try {
      const res = await approveRow(row.id).unwrap();
      updateRowInState(res.row || res);
      toast.success(res.message || 'Row Approved successfully');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to approve row');
    }
  };

  const handleReopen = async () => {
    const reason = window.prompt("Reason for reopening this row?");
    if (!reason) return;
    try {
      const res = await reopenRow({ id: row.id, reason }).unwrap();
      updateRowInState(res.row || res);
      toast.success('Row Reopened successfully');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to reopen row');
    }
  };

  const cellInputClass = "w-full h-9 text-center font-bold text-slate-800 bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-slate-300 transition-all";

  const totalSkins = sheets.length;
  const totalSqft = sheets.reduce((acc, curr) => acc + (parseFloat(curr.dcm) || 0), 0).toFixed(2);

  let rowClass = "excel-row transition-colors border-b border-slate-200 group relative bg-white hover:bg-slate-50";
  if (row.status === 'APPROVED' || row.status === 'ISSUED') {
    rowClass = "excel-row bg-emerald-50 hover:bg-emerald-100 border-b border-emerald-200 group relative";
  }

  return (
    <tr className={rowClass}>
      <td className="p-0 sticky left-0 z-10 border-r border-slate-300 bg-slate-100 group-focus-within:bg-yellow-100 text-center font-bold text-slate-500">
        <span>{sNo}</span>
      </td>
      <td className="p-2 sticky left-10 z-10 border-r border-slate-300 bg-white group-focus-within:bg-[#fefce8] text-center font-bold text-slate-700">
        {row.work_date || row.date || ''}
      </td>
      <td className="p-2 border-r border-slate-300 bg-[#e2e8f0]/30 text-center font-bold text-slate-700">
        {row.order_number || row.order_id || ''}
      </td>
      <td className="p-2 border-r border-slate-300 bg-[#dcfce7]/30 text-center font-bold text-[#166534]">
        {row.style_name || row.style_id || ''}
      </td>
      <td className="p-2 border-r border-slate-300 bg-[#dcfce7]/30 text-center font-bold text-[#166534]">
        {row.article || ''}
      </td>
      <td className="p-2 border-r border-slate-300 bg-[#dcfce7]/30 text-center font-bold text-[#166534]">
        {row.colour || ''}
      </td>
      <td className="p-2 border-r border-slate-300 bg-[#f8fafc] text-center font-bold text-slate-700">
        {row.name || ''}
      </td>
      <td className="p-2 border-r border-slate-300 bg-white text-center font-bold text-slate-800">
        {row.size || row.size_name || ''}
      </td>
      <td className="p-2 border-r border-slate-300 bg-white text-center font-bold text-blue-800">
        {row.rc_no || ''}
      </td>

      {/* 17 Sheet Cells */}
      {Array(17).fill(0).map((_, i) => {
        const sheet = sheets[i];
        const displayValue = localCells[i] !== undefined ? localCells[i] : (sheet ? sheet.dcm : '');
        const isSaving = loadingCells[i];

        return (
          <td key={i} className="p-0 border-r border-slate-200 bg-white group-focus-within:bg-transparent relative">
            <input
              type="number"
              step="0.01"
              value={displayValue}
              onChange={(e) => setLocalCells(prev => ({ ...prev, [i]: e.target.value }))}
              onBlur={(e) => handleCellBlur(i, e.target.value)}
              disabled={isLocked || isSaving}
              className={`${cellInputClass} w-16 focus:bg-white ${isSaving ? 'opacity-50' : ''}`}
            />
            {isSaving && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/50 pointer-events-none">
                <Loader2 className="w-3 h-3 animate-spin text-[#c8834a]" />
              </div>
            )}
          </td>
        );
      })}

      <td className="p-0 border-r border-slate-300 bg-slate-100 text-center font-black text-slate-700 group-focus-within:bg-[#fefce8]">
        {totalSkins > 0 ? totalSkins : ''}
      </td>
      <td className="p-0 border-r border-slate-300 bg-slate-100 text-center font-black text-slate-700 group-focus-within:bg-[#fefce8]">
        {totalSqft > 0 ? totalSqft : ''}
      </td>

      <td className="p-2 border-r border-slate-300 sticky right-0 z-20 bg-white group-focus-within:bg-[#fefce8] shadow-[-4px_0_10px_rgba(0,0,0,0.05)] text-center">
        {isLocked ? (
          <button
            onClick={handleReopen}
            disabled={isReopening}
            className="flex items-center justify-center gap-1 w-full py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded font-black text-[10px] uppercase shadow-sm transition-transform active:scale-95 border border-amber-300"
          >
            {isReopening ? <Loader2 className="w-3 h-3 animate-spin" /> : <LockOpen className="w-3 h-3" />}
            Reopen
          </button>
        ) : (
          <button
            onClick={handleApprove}
            disabled={isApproving || totalSkins === 0}
            className="flex items-center justify-center gap-1 w-full py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded font-black text-[10px] uppercase shadow-sm transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isApproving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            Approve
          </button>
        )}
      </td>
    </tr>
  );
});
