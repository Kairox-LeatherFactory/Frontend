'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Scissors, Loader2, FileSpreadsheet, LockOpen, Check } from 'lucide-react';

import {
  useLazyGetMaterialLotsQuery,
  useGetCuttingGridQuery,
  useLazyGetCuttingSheetQuery,
  useGenerateCuttingRowsMutation,
  useCreateCuttingSheetMutation,
  useUpdateCuttingSheetMutation,
  useUpdateCuttingRowMutation,
  useApproveCuttingRowMutation,
  useReopenCuttingRowMutation,
  useLazyGetClientStylesQuery,
  useLazyGetStyleMaterialSpecQuery
} from '@/store/slices/apiSlice';
import { useGetAttendanceTodayQuery } from '@/store/slices/attendanceApiSlice';

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

  // Persist selections in localStorage so user doesn't lose state on refresh or navigation
  const [workDate, setWorkDate] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cs_workDate') || new Date().toISOString().slice(0, 10);
    }
    return new Date().toISOString().slice(0, 10);
  });

  const [styleId, setStyleId] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cs_styleId') || '';
    }
    return '';
  });

  const [colour, setColour] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cs_colour') || '';
    }
    return '';
  });

  const [selectedArticle, setSelectedArticle] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cs_article') || '';
    }
    return '';
  });

  // Auto-fetch lots & styles on mount so options are available
  useEffect(() => {
    fetchLots();
    fetchStyles();
  }, [fetchLots, fetchStyles]);

  // Save changes to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (workDate) localStorage.setItem('cs_workDate', workDate);
      if (styleId) localStorage.setItem('cs_styleId', styleId);
      if (colour) localStorage.setItem('cs_colour', colour);
      if (selectedArticle) localStorage.setItem('cs_article', selectedArticle);
    }
  }, [workDate, styleId, colour, selectedArticle]);

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

  const [generateRows] = useGenerateCuttingRowsMutation();

  // 📡 GET /api/v1/cutting/grid?style_id=&colour=
  const { data: gridData, isLoading: gridLoading, error: gridError } = useGetCuttingGridQuery(
    { style_id: styleId, colour },
    { skip: !styleId || !colour }
  );


  useEffect(() => {
    if (gridError) {
      console.warn('Backend Grid Error 500:', gridError);
    }
  }, [gridError]);


  // 📡 GET /api/v1/attendance/today
  const { data: attendanceRes } = useGetAttendanceTodayQuery();
  const presentWorkers = useMemo(() => {
    const raw = Array.isArray(attendanceRes)
      ? attendanceRes
      : (attendanceRes?.roster || attendanceRes?.items || attendanceRes?.employees || attendanceRes?.attendance || []);
    const gridCutters = Array.isArray(gridData?.present_cutters) ? gridData.present_cutters : [];
    const combined = [...raw, ...gridCutters];

    const uniqueMap = new Map();
    combined.forEach(w => {
      const id = w.employee_id || w.id || w.worker_id || w.employee_code;
      const name = w.employee_name || w.name || w.worker_name || w.cutter_name;
      const code = w.employee_code || w.code || '';
      if (id && name && !uniqueMap.has(String(id))) {
        uniqueMap.set(String(id), { id, name, code });
      }
    });
    return Array.from(uniqueMap.values());
  }, [attendanceRes, gridData]);

  const availableArticles = useMemo(() => {
    const lotArticles = lotsList.map(l => l.article).filter(Boolean);
    const specArticles = leatherLines.map(l => l.article).filter(Boolean);
    const savedArticle = selectedArticle ? [selectedArticle] : [];
    return [...new Set([...specArticles, ...lotArticles, ...savedArticle])];
  }, [leatherLines, lotsList, selectedArticle]);

  const availableColours = useMemo(() => {
    const lotColours = lotsList.flatMap(l => {
      const c = l.colour || l.color || l.colours || l.colors || [];
      return Array.isArray(c) ? c : [c];
    }).filter(Boolean);

    const specColours = leatherLines.map(l => l.colour || l.color).filter(Boolean);
    const gridColours = Array.isArray(gridData?.colours) ? gridData.colours : (gridData?.colour ? [gridData.colour] : []);
    const specExtraColours = Array.isArray(specData?.colours) ? specData.colours : [];
    const savedColour = colour ? [colour] : [];

    return [...new Set([...specColours, ...gridColours, ...specExtraColours, ...lotColours, ...savedColour])];
  }, [leatherLines, lotsList, gridData, specData, colour]);

  // Grid state
  const [rows, setRows] = useState([]);
  const [isLooping, setIsLooping] = useState(false);
  const [reopenTargetRow, setReopenTargetRow] = useState(null);
  const [reopenReasonText, setReopenReasonText] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [reopenRowMutation, { isLoading: isReopeningRow }] = useReopenCuttingRowMutation();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleConfirmReopen = async () => {
    if (!reopenTargetRow) return;
    if (!reopenReasonText.trim()) {
      toast.error('Please enter a reason for reopening');
      return;
    }
    try {
      const rowId = reopenTargetRow.row_id || reopenTargetRow.id;
      const res = await reopenRowMutation({ row_id: rowId, reason: reopenReasonText.trim() }).unwrap();
      updateRowInState(res.row || res);
      toast.success('Row Reopened successfully');
      setReopenTargetRow(null);
      setReopenReasonText('');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to reopen row');
    }
  };

  // Sync loaded grid rows (filtered by workDate on frontend)
  useEffect(() => {
    if (gridData?.rows && Array.isArray(gridData.rows)) {
      if (workDate) {
        const filtered = gridData.rows.filter(r => {
          const rowDate = (r.work_date || r.date || '').slice(0, 10);
          return !rowDate || rowDate === workDate;
        });
        setRows(filtered);
      } else {
        setRows(gridData.rows);
      }
    }
  }, [gridData, workDate]);



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
                  <td colSpan={28} className="p-12 text-center text-slate-400 font-bold bg-slate-50">
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
                    presentWorkers={presentWorkers}
                    onOpenReopenModal={setReopenTargetRow}
                  />
                ))
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="bg-[#475569] text-white font-black">
                  <td colSpan={25} className="p-2 text-right border-r border-slate-500 tracking-widest text-[13px]">
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

      {/* Modern Responsive Reopen Modal using createPortal */}
      {isMounted && reopenTargetRow && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <LockOpen className="w-4 h-4 text-amber-600" /> Reopen Cutting Row #{reopenTargetRow.sNo}
              </h3>
              <button
                onClick={() => { setReopenTargetRow(null); setReopenReasonText(''); }}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 font-bold transition-colors"
              >
                ✕
              </button>
            </div>
            <div>
              <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block mb-1.5">
                Reason for Reopening *
              </label>
              <textarea
                value={reopenReasonText}
                onChange={(e) => setReopenReasonText(e.target.value)}
                placeholder="e.g. Need to adjust sheet DCM or correct worker assignment"
                className="w-full h-24 p-3 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#c8834a] focus:bg-white transition-all resize-none"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => { setReopenTargetRow(null); setReopenReasonText(''); }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReopen}
                disabled={isReopeningRow}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isReopeningRow ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LockOpen className="w-3.5 h-3.5" />}
                Confirm Reopen
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}


const CuttingSheetRow = React.memo(({ index, sNo, row, updateRowInState, stylesList, presentWorkers = [], onOpenReopenModal }) => {
  const [createSheet] = useCreateCuttingSheetMutation();
  const [updateSheet] = useUpdateCuttingSheetMutation();
  const [updateRowMutation] = useUpdateCuttingRowMutation();
  const [approveRow, { isLoading: isApproving }] = useApproveCuttingRowMutation();
  const [reopenRow, { isLoading: isReopening }] = useReopenCuttingRowMutation();
  const [fetchSheetDetail] = useLazyGetCuttingSheetQuery();

  const [localCells, setLocalCells] = useState({});
  const [loadingCells, setLoadingCells] = useState({});
  const [rcNo, setRcNo] = useState(row.rc_no || row.rc_number || '');
  const [sizeVal, setSizeVal] = useState(row.size || row.size_name || '');

  useEffect(() => {
    setRcNo(row.rc_no || row.rc_number || '');
  }, [row.rc_no, row.rc_number]);

  useEffect(() => {
    setSizeVal(row.size || row.size_name || '');
  }, [row.size, row.size_name]);


  const isLocked = row.status === 'APPROVED' || row.status === 'ISSUED';
  const sheets = row.sheets || [];

  const handleCellBlur = async (sheetIndex, value) => {
    const numValue = parseFloat(value);
    const existingSheet = sheets[sheetIndex];

    // 1. Value removed / cleared from existing cell: PATCH without payload
    if (!value || isNaN(numValue) || numValue <= 0) {
      if (!existingSheet) return;
      setLoadingCells(prev => ({ ...prev, [sheetIndex]: true }));
      try {
        const sheetId = existingSheet.id || existingSheet.sheet_id;
        const res = await updateSheet({
          row_id: row.row_id || row.id,
          sheet_id: sheetId,
          payload: {}
        }).unwrap();
        updateRowInState(res.row || res);
        toast.success('Sheet cleared');
      } catch (err) {
        toast.error(err?.data?.message || 'Failed to clear sheet');
        setLocalCells(prev => ({ ...prev, [sheetIndex]: existingSheet.dcm }));
      } finally {
        setLoadingCells(prev => ({ ...prev, [sheetIndex]: false }));
      }
      return;
    }

    if (existingSheet && existingSheet.dcm === numValue) return; // No change

    // 2. Value entered / updated in cell: PATCH with { dcm: numValue }
    setLoadingCells(prev => ({ ...prev, [sheetIndex]: true }));
    try {
      const lotId = row.material_lot_id || row.lot_id || row.lot?.lot_id || row.lot?.id || (typeof row.lot === 'string' ? row.lot : undefined) || (existingSheet && (existingSheet.material_lot_id || existingSheet.lot_id));
      const sheetCode = (existingSheet && (existingSheet.code || existingSheet.sheet_code)) || row.sheet_code || (row.barcode ? `${row.barcode}-S${String(sheetIndex + 1).padStart(2, '0')}` : undefined);

      if (existingSheet) {
        const sheetId = existingSheet.id || existingSheet.sheet_id;
        const res = await updateSheet({
          row_id: row.row_id || row.id,
          sheet_id: sheetId,
          payload: { dcm: numValue }
        }).unwrap();
        updateRowInState(res.row || res);
        toast.success(`Sheet updated: ${numValue} dcm`);
      } else {
        const sheetPayload = {
          dcm: numValue,
        };
        if (lotId) sheetPayload.material_lot_id = lotId;
        if (sheetCode) sheetPayload.sheet_code = sheetCode;

        const res = await createSheet({ row_id: row.row_id || row.id, payload: sheetPayload }).unwrap();
        updateRowInState(res.row || res);
        toast.success(`Sheet created: ${numValue} dcm`);
      }
    } catch (err) {
      const errorMsg =
        (typeof err?.data?.detail === 'string' && err.data.detail) ||
        (Array.isArray(err?.data?.detail) && err.data.detail.map(d => d.msg || d.detail || JSON.stringify(d)).join('; ')) ||
        err?.data?.message ||
        err?.message ||
        'Failed to save sheet';
      toast.error(errorMsg);
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
      const payload = { [field]: trimmed };
      if (field === 'rc_no') {
        payload.rc_number = trimmed;
        payload.rc_no = trimmed;
      }
      const res = await updateRowMutation({ row_id: row.row_id || row.id, payload }).unwrap();
      updateRowInState(res.row || res);
      toast.success(`${field.toUpperCase()} updated`);
    } catch (err) {
      toast.error(err?.data?.message || `Failed to update ${field}`);
    }
  };

  const handleApprove = async () => {
    try {
      const rowId = row.row_id || row.id;

      // Automatically save un-saved RC No or Size first
      const trimmedRc = (rcNo || '').trim();
      const trimmedSize = (sizeVal || '').trim();
      const currentRc = (row.rc_no || row.rc_number || '').trim();
      const currentSize = (row.size || row.size_name || '').trim();

      if (trimmedRc !== currentRc || trimmedSize !== currentSize) {
        const patchPayload = {};
        if (trimmedRc !== currentRc) {
          patchPayload.rc_no = trimmedRc;
          patchPayload.rc_number = trimmedRc;
        }
        if (trimmedSize !== currentSize) {
          patchPayload.size = trimmedSize;
        }
        await updateRowMutation({ row_id: rowId, payload: patchPayload }).unwrap();
      }

      const res = await approveRow(rowId).unwrap();
      updateRowInState(res.row || res);
      toast.success(res.message || 'Row Approved successfully');
    } catch (err) {
      const errorMsg =
        (typeof err?.data?.detail === 'string' && err.data.detail) ||
        (Array.isArray(err?.data?.detail) && err.data.detail.map(d => d.msg || d.detail || JSON.stringify(d)).join('; ')) ||
        err?.data?.message ||
        err?.message ||
        'Failed to approve row';
      toast.error(errorMsg);
    }
  };

  const handleReopen = () => {
    if (onOpenReopenModal) {
      onOpenReopenModal({ ...row, sNo });
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
      <td className="p-0 border-r border-slate-300 bg-[#f8fafc]">
        <select
          value={row.cutter_employee_id || row.cutter_id || ''}
          disabled={isLocked}
          onChange={async (e) => {
            const selectedId = e.target.value;
            const selectedWorker = presentWorkers.find(w => String(w.id) === String(selectedId));
            const payload = { cutter_employee_id: selectedId };
            if (selectedWorker?.name) {
              payload.cutter_name = selectedWorker.name;
              payload.name = selectedWorker.name;
            }
            try {
              const res = await updateRowMutation({ row_id: row.row_id || row.id, payload }).unwrap();
              updateRowInState(res.row || res);
              toast.success('Worker assigned');
            } catch (err) {
              toast.error(err?.data?.message || 'Failed to assign worker');
            }
          }}
          className="w-full h-9 px-1 text-center font-bold text-slate-800 bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-slate-300 transition-all truncate text-xs cursor-pointer"
        >
          <option value="">{row.cutter_name || row.name || '-- Select Worker --'}</option>
          {presentWorkers.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name} {w.code ? `(${w.code})` : ''}
            </option>
          ))}
        </select>
      </td>
      <td className="p-0 border-r border-slate-300 bg-white">
        <input
          type="text"
          value={sizeVal}
          onChange={(e) => setSizeVal(e.target.value)}
          disabled={isLocked}
          onBlur={(e) => handleRowCellBlur('size', e.target.value)}
          className="w-full h-9 text-center font-bold text-slate-800 bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-slate-300"
          placeholder="Size"
        />
      </td>
      <td className="p-0 border-r border-slate-300 bg-white">
        <input
          type="text"
          value={rcNo}
          onChange={(e) => setRcNo(e.target.value)}
          disabled={isLocked}
          onBlur={(e) => handleRowCellBlur('rc_no', e.target.value)}
          className="w-full h-9 text-center font-bold text-blue-800 bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-slate-300"
          placeholder="RC No"
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
