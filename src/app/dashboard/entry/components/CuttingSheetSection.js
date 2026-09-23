'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Scissors, Loader2, FileSpreadsheet, LockOpen, Check } from 'lucide-react';
import {
  useLazyGetMaterialLotsQuery,
  useGenerateCuttingRowsMutation,
  useCreateCuttingSheetMutation,
  useUpdateCuttingSheetMutation,
  useUpdateCuttingRowMutation,
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
    const lotArticles = lotsList.map(l => l.article).filter(Boolean);
    const specArticles = leatherLines.map(l => l.article).filter(Boolean);
    return [...new Set([...lotArticles, ...specArticles])];
  }, [leatherLines, lotsList]);

  const availableColours = useMemo(() => {
    const lotColours = lotsList.flatMap(l => {
      const c = l.colour || l.color || l.colours || l.colors || [];
      return Array.isArray(c) ? c : [c];
    }).filter(Boolean);

    const specColours = leatherLines.map(l => l.colour || l.color).filter(Boolean);

    return [...new Set([...lotColours, ...specColours])];
  }, [leatherLines, lotsList]);

  const [generateRows] = useGenerateCuttingRowsMutation();

  // Grid state
  const [rows, setRows] = useState([]);
  const [isLooping, setIsLooping] = useState(false);

  const handleGenerate = async () => {
    if (!styleId) {
      toast.error('Style ID is required');
      return;
    }

    setIsLooping(true);
    let keepGenerating = true;
    let totalGenerated = 0;

    try {
      const matchingLot = lotsList.find(l => l.article === selectedArticle && (l.colour === colour || l.color === colour));
      const payload = {
        style_id: styleId,
        colour: colour || undefined,
        material_lot_id: matchingLot ? (matchingLot.lot_id || matchingLot.id) : undefined,
        work_date: workDate || undefined,
        allocate: true,
        limit: 10
      };

      let lastMessage = '';

      while (keepGenerating) {
        const res = await generateRows(payload).unwrap();
        
        if (res.message) lastMessage = res.message;
        else if (res.detail) lastMessage = res.detail;
        
        if (res.rows && Array.isArray(res.rows) && res.rows.length > 0) {
          setRows(prev => [...prev, ...res.rows]);
          const createdThisBatch = res.created || res.rows.length;
          totalGenerated += createdThisBatch;

          if (res.warnings && res.warnings.length > 0) {
            res.warnings.forEach(w => toast.warning(w));
          }

          // If the backend returns less than what we asked for, it means it's done
          if (createdThisBatch < 10) {
            keepGenerating = false;
          } else {
            // Wait 1 second before requesting the next batch
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } else {
          // No more rows created, we are done
          keepGenerating = false;
        }
      }
      
      if (totalGenerated > 0) {
        toast.success(`Generated a total of ${totalGenerated} rows successfully`);
      } else {
        toast.success(lastMessage || 'No new rows to generate.');
      }
    } catch (err) {
      console.error('Failed to generate rows:', err);
      const errorMsg =
        (typeof err?.data?.detail === 'string' && err.data.detail) ||
        (Array.isArray(err?.data?.detail) && err.data.detail.map(d => d.msg || d.detail || JSON.stringify(d)).join('; ')) ||
        err?.data?.message ||
        err?.message ||
        'Failed to generate rows';
      toast.error(errorMsg);
    } finally {
      setIsLooping(false);
    }
  };

  const updateRowInState = useCallback((updatedRow) => {
    setRows(prev => prev.map(r => {
      const rId = r.row_id || r.id;
      const uId = updatedRow.row_id || updatedRow.id;
      return rId === uId ? updatedRow : r;
    }));
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
                const sId = s.id || s.style_id || s.style_code;
                const label = s.style_name || s.name || s.style_code || sId;
                return <option key={`style-${sId}-${idx}`} value={sId}>{label}</option>;
              })}
            </select>
            <select
              value={selectedArticle}
              onChange={(e) => setSelectedArticle(e.target.value)}
              onFocus={() => fetchLots({ category: 'leather' })}
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
              onFocus={() => fetchLots({ category: 'leather' })}
              className="px-3 py-2 w-28 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 text-xs outline-none focus:border-[#c8834a] focus:ring-1 focus:ring-[#c8834a] transition-all"
            >
              <option value="">-- Colour --</option>
              {availableColours.map((c, idx) => (
                <option key={`col-${c}-${idx}`} value={c}>{c}</option>
              ))}
            </select>
            <button
              onClick={handleGenerate}
              disabled={isLooping || !styleId}
              className="flex items-center gap-2 px-6 py-2 bg-[#1e293b] hover:bg-[#0f172a] text-white rounded-lg font-black text-xs transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {isLooping ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
              {isLooping ? 'Generating...' : 'Generate'}
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
                    key={row.row_id || row.id || index}
                    index={index}
                    sNo={index + 1}
                    row={row}
                    updateRowInState={updateRowInState}
                    stylesList={stylesList}
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

const CuttingSheetRow = React.memo(({ index, sNo, row, updateRowInState, stylesList }) => {
  const [createSheet] = useCreateCuttingSheetMutation();
  const [updateSheet] = useUpdateCuttingSheetMutation();
  const [updateRowMutation] = useUpdateCuttingRowMutation();
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
        const res = await updateSheet({ row_id: row.row_id || row.id, sheet_id: existingSheet.id, payload: { dcm: numValue } }).unwrap();
        updateRowInState(res.row || res);
        toast.success(`Sheet updated to ${numValue} dcm`);
      } else {
        const res = await createSheet({ row_id: row.row_id || row.id, payload: { dcm: numValue } }).unwrap();
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

  const handleRowCellBlur = async (field, value) => {
    if (isLocked) return;
    const trimmed = value.trim();
    if (trimmed === (row[field] || '')) return; // No change

    try {
      const res = await updateRowMutation({ row_id: row.row_id || row.id, payload: { [field]: trimmed } }).unwrap();
      updateRowInState(res.row || res);
      toast.success(`${field} updated`);
    } catch (err) {
      toast.error(err?.data?.message || `Failed to update ${field}`);
      // The input will keep the failed typed value unless we force reset, but since it's uncontrolled defaultValue it might stay.
      // Re-rendering happens on updateRowInState if success.
    }
  };

  const handleApprove = async () => {
    try {
      const res = await approveRow(row.row_id || row.id).unwrap();
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
      const res = await reopenRow({ row_id: row.row_id || row.id, reason }).unwrap();
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

  const matchingStyle = stylesList?.find(s => s.id === row.style_id || s.style_id === row.style_id || s.style_code === row.style_id);
  const displayStyleName = row.style_name || matchingStyle?.style_name || matchingStyle?.name || matchingStyle?.style_code || row.style_id || '';

  return (
    <tr className={rowClass}>
      <td className="p-0 sticky left-0 z-10 border-r border-slate-300 bg-slate-100 group-focus-within:bg-yellow-100 text-center font-bold text-slate-500">
        <span>{sNo}</span>
      </td>
      <td className="p-0 sticky left-10 z-10 border-r border-slate-300 bg-white group-focus-within:bg-[#fefce8]">
        <input
          type="date"
          defaultValue={row.work_date || row.date || ''}
          disabled={isLocked}
          onBlur={(e) => handleRowCellBlur('work_date', e.target.value)}
          className="w-full h-9 px-1 text-center font-bold text-slate-700 bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-slate-300"
        />
      </td>
      <td className="p-2 border-r border-slate-300 bg-[#e2e8f0]/30 text-center font-bold text-slate-700">
        {row.order_number || row.order_id || ''}
      </td>
      <td className="p-2 border-r border-slate-300 bg-[#dcfce7]/30 text-center font-bold text-[#166534]">
        {displayStyleName}
      </td>
      <td className="p-0 border-r border-slate-300 bg-[#dcfce7]/30">
        <input
          type="text"
          defaultValue={row.article || ''}
          disabled={isLocked}
          onBlur={(e) => handleRowCellBlur('article', e.target.value)}
          className="w-full h-9 text-center font-bold text-[#166534] bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-slate-300"
        />
      </td>
      <td className="p-0 border-r border-slate-300 bg-[#dcfce7]/30">
        <input
          type="text"
          defaultValue={row.colour || ''}
          disabled={isLocked}
          onBlur={(e) => handleRowCellBlur('colour', e.target.value)}
          className="w-full h-9 text-center font-bold text-[#166534] bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-slate-300"
        />
      </td>
      <td className="p-2 border-r border-slate-300 bg-[#f8fafc] text-center font-bold text-slate-700">
        {row.name || ''}
      </td>
      <td className="p-0 border-r border-slate-300 bg-white">
        <input
          type="text"
          defaultValue={row.size || row.size_name || ''}
          disabled={isLocked}
          onBlur={(e) => handleRowCellBlur('size', e.target.value)}
          className="w-full h-9 text-center font-bold text-slate-800 bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-slate-300"
        />
      </td>
      <td className="p-0 border-r border-slate-300 bg-white">
        <input
          type="text"
          defaultValue={row.rc_no || ''}
          disabled={isLocked}
          onBlur={(e) => handleRowCellBlur('rc_no', e.target.value)}
          className="w-full h-9 text-center font-bold text-blue-800 bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-slate-300"
        />
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
