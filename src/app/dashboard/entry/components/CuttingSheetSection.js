'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Plus, Copy, Trash2, Scissors, CheckCircle2, AlertCircle, Loader2, Play, FileSpreadsheet } from 'lucide-react';
import {
  useGetBarcodeOrdersQuery,
  useIssueCuttingJobSheetMutation,
  useGetMaterialLotsQuery,
} from '@/store/slices/apiSlice';
import { useGetOrderBarcodeSkusQuery } from '@/store/slices/progressapiSlice';
import { useGetAttendanceTodayQuery } from '@/store/slices/attendanceApiSlice';

const generateId = () => Math.random().toString(36).substr(2, 9);

const INITIAL_ROW = {
  id: '',
  date: '',
  orderId: '',
  styleName: '',
  sizeName: '',
  skuId: '',
  lotId: '',
  colour: '',
  workerId: '',
  rcNo: '',
  skins: Array(17).fill(''),
  status: 'draft',
  barcode: null,
  errorMsg: null,
};

const createDefaultRow = (overrides = {}) => ({
  ...INITIAL_ROW,
  id: generateId(),
  date: new Date().toISOString().slice(0, 10),
  ...overrides
});

export default function CuttingSheetSection() {
  const { data: orders = [], isLoading: ordersLoading } = useGetBarcodeOrdersQuery();
  const { data: lots = [], isLoading: lotsLoading } = useGetMaterialLotsQuery('category=leather');
  const { data: rosterResponse, isLoading: workersLoading } = useGetAttendanceTodayQuery();

  const workers = useMemo(() => {
    const data = rosterResponse?.items || rosterResponse?.data || rosterResponse || [];
    const arr = Array.isArray(data) ? data : (data?.employee_id ? [data] : []);

    return arr.map(r => {
      // If it's a nested employee object
      if (r.employee) return r.employee;
      // If it's flat roster record
      if (r.employee_id) return { id: r.employee_id, name: r.name || r.employee_name || r.first_name || 'Unknown' };
      if (r.id) return { id: r.id, name: r.name || r.employee_name || 'Unknown' };
      return null;
    }).filter(Boolean);
  }, [rosterResponse]);

  const [issueJobSheet] = useIssueCuttingJobSheetMutation();

  const ordersList = Array.isArray(orders) ? orders : orders?.items || [];
  const lotsList = Array.isArray(lots) ? lots : lots?.lots || lots?.items || [];

  // Excel Multi-Sheet Workbook state
  const [sheets, setSheets] = useState([
    { id: 'sheet-1', name: 'Sheet 1', rows: Array.from({ length: 8 }, () => createDefaultRow()) }
  ]);
  const [activeSheetId, setActiveSheetId] = useState('sheet-1');
  const activeSheetIdRef = useRef(activeSheetId);

  useEffect(() => {
    activeSheetIdRef.current = activeSheetId;
  }, [activeSheetId]);

  const activeSheet = useMemo(() => {
    return sheets.find(s => s.id === activeSheetId) || sheets[0];
  }, [sheets, activeSheetId]);

  const rows = activeSheet.rows;

  const setRows = useCallback((updater) => {
    const currentActiveId = activeSheetIdRef.current;
    setSheets(prev => prev.map(s => {
      if (s.id !== currentActiveId) return s;
      const newRows = typeof updater === 'function' ? updater(s.rows) : updater;
      return { ...s, rows: newRows };
    }));
  }, []);

  const handleAddSheet = useCallback(() => {
    const newIdx = sheets.length + 1;
    const newSheet = {
      id: `sheet-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: `Sheet ${newIdx}`,
      rows: Array.from({ length: 8 }, () => createDefaultRow()),
    };
    setSheets(prev => [...prev, newSheet]);
    setActiveSheetId(newSheet.id);
  }, [sheets.length]);

  const handleRemoveSheet = useCallback((sheetId, e) => {
    e.stopPropagation();
    if (sheets.length === 1) return;
    setSheets(prev => {
      const filtered = prev.filter(s => s.id !== sheetId);
      if (activeSheetId === sheetId) {
        setActiveSheetId(filtered[0].id);
      }
      return filtered;
    });
  }, [sheets.length, activeSheetId]);

  const handleRowChange = useCallback((id, field, value) => {
    setRows(prev => {
      const index = prev.findIndex(r => r.id === id);
      if (index === -1) return prev;

      const newRows = [...prev];
      newRows[index] = { ...newRows[index], [field]: value };

      if (field === 'styleName' || field === 'sizeName') {
        newRows[index].skuId = '';
      }

      const cascadeFields = ['date', 'orderId', 'styleName', 'lotId', 'colour'];
      const currentRow = newRows[index];

      if (cascadeFields.includes(field)) {
        if (field === 'colour') {
          for (let i = index + 1; i < newRows.length; i++) {
            const targetRow = newRows[i];
            const isTargetEmpty = !targetRow.colour;
            const isTargetMatchingOld = targetRow.colour === prev[index].colour;
            if (isTargetEmpty || isTargetMatchingOld) {
              newRows[i] = { ...targetRow, colour: currentRow.colour };
            } else {
              break;
            }
          }
        } else if (currentRow.orderId && currentRow.styleName && currentRow.lotId) {
          for (let i = index + 1; i < newRows.length; i++) {
            const targetRow = newRows[i];
            const isTargetEmpty = !targetRow.orderId && !targetRow.styleName && !targetRow.lotId;
            const isTargetMatchingOld =
              targetRow.orderId === prev[index].orderId &&
              targetRow.styleName === prev[index].styleName &&
              targetRow.lotId === prev[index].lotId;

            if (isTargetEmpty || isTargetMatchingOld) {
              newRows[i] = {
                ...targetRow,
                date: currentRow.date,
                orderId: currentRow.orderId,
                styleName: currentRow.styleName,
                lotId: currentRow.lotId
              };
              if (field === 'orderId' || field === 'styleName') {
                newRows[i].sizeName = '';
                newRows[i].skuId = '';
              }
            } else {
              break;
            }
          }
        }
      }
      return newRows;
    });
  }, []);

  const handleSkinChange = useCallback((id, skinIndex, value) => {
    setRows(prev =>
      prev.map(r => {
        if (r.id !== id) return r;
        const newSkins = [...r.skins];
        newSkins[skinIndex] = value;
        return { ...r, skins: newSkins };
      })
    );
  }, []);

  const insertRowBelow = useCallback((index) => {
    setRows(prev => {
      const newRows = [...prev];
      // Insert a completely fresh blank row (no date copied) to act as a pure separator
      newRows.splice(index + 1, 0, createDefaultRow({ date: '' }));
      return newRows;
    });

    // Auto-focus the new row's date or order dropdown slightly after render
    setTimeout(() => { }, 50);
  }, []);

  const duplicateRow = useCallback((index) => {
    setRows(prev => {
      const rowToCopy = prev[index];
      const newRow = {
        ...rowToCopy,
        id: generateId(),
        status: 'draft',
        barcode: null,
        errorMsg: null,
        skins: Array(17).fill(''),
      };
      const newRows = [...prev];
      newRows.splice(index + 1, 0, newRow);
      return newRows;
    });
  }, []);

  const deleteRow = useCallback((id) => {
    setRows(prev => {
      if (prev.length === 1) return prev;
      return prev.filter(r => r.id !== id);
    });
  }, []);

  const clearIssued = () => {
    const remaining = rows.filter(r => r.status !== 'success');
    if (remaining.length === 0) {
      setRows(Array.from({ length: 8 }, () => createDefaultRow()));
    } else {
      setRows(remaining);
    }
  };

  const isRowValid = (r) => {
    const totalSkins = r.skins.filter(s => s !== '' && !isNaN(s) && Number(s) > 0).length;
    return r.orderId && r.skuId && r.lotId && r.workerId && totalSkins > 0 && r.status === 'draft';
  };

  const getValidRows = () => rows.filter(isRowValid);

  const processRowIssue = async (rowId) => {
    const row = rows.find(r => r.id === rowId);
    if (!row || !isRowValid(row)) return;

    setRows(prev => prev.map(r => r.id === row.id ? { ...r, status: 'loading' } : r));

    const totalSkins = row.skins.filter(s => s !== '' && !isNaN(s) && Number(s) > 0).length;
    const totalSqft = row.skins.reduce((acc, curr) => acc + (curr !== '' && !isNaN(curr) ? parseFloat(curr) : 0), 0).toFixed(2);

    const payload = {
      order_id: row.orderId,
      sku_id: row.skuId,
      lot_id: row.lotId,
      worker_id: row.workerId,
      rc_no: row.rcNo || undefined,
      measurements: row.skins.filter(s => s !== '' && !isNaN(s) && Number(s) > 0).map(Number),
      total_skins: totalSkins,
      total_sqft: Number(totalSqft),
      date: row.date || new Date().toISOString().slice(0, 10),
    };

    try {
      const res = await issueJobSheet(payload).unwrap();
      setRows(prev => prev.map(r => r.id === row.id ? { ...r, status: 'success', barcode: res.barcode_id || 'ISSUED' } : r));
    } catch (err) {
      setRows(prev => prev.map(r => r.id === row.id ? { ...r, status: 'error', errorMsg: err?.data?.message || 'Failed' } : r));
    }
  };

  const handleBulkIssue = async () => {
    const validRows = getValidRows();
    if (validRows.length === 0) return;
    for (const row of validRows) {
      await processRowIssue(row.id);
    }
  };

  const handleSingleIssue = useCallback((rowId) => {
    processRowIssue(rowId);
  }, [rows]); // Need rows in dependency to get latest state for the specific row

  const validCount = getValidRows().length;
  const isAnyLoading = rows.some(r => r.status === 'loading');

  const grandTotalSkins = rows.reduce((sum, r) => sum + r.skins.filter(s => s !== '' && !isNaN(s) && Number(s) > 0).length, 0);
  const grandTotalSqft = rows.reduce((sum, r) => sum + r.skins.reduce((acc, curr) => acc + (curr !== '' && !isNaN(curr) ? parseFloat(curr) : 0), 0), 0).toFixed(2);

  const sNoArray = useMemo(() => {
    let currentSNo = 0;
    return rows.map((row) => {
      const isEmpty = !row.orderId && !row.styleName && !row.lotId && !row.date && !row.workerId;
      if (isEmpty) {
        currentSNo = 0; // reset for the next group
        return '';
      } else {
        currentSNo += 1;
        return currentSNo;
      }
    });
  }, [rows]);

  const orderTotals = useMemo(() => {
    const totals = {};
    rows.forEach(r => {
      if (!r.orderId) return;
      if (!totals[r.orderId]) {
        const orderInfo = ordersList.find(o => (o.id || o.order_id) === r.orderId);
        totals[r.orderId] = {
          name: orderInfo ? (orderInfo.order_number || orderInfo.id) : r.orderId,
          skins: 0,
          sqft: 0
        };
      }
      const s = r.skins.filter(s => s !== '' && !isNaN(s) && Number(s) > 0).length;
      const a = r.skins.reduce((acc, curr) => acc + (curr !== '' && !isNaN(curr) ? parseFloat(curr) : 0), 0);
      totals[r.orderId].skins += s;
      totals[r.orderId].sqft += a;
    });
    return totals;
  }, [rows, ordersList]);

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa] overflow-hidden animate-fade-in text-xs">
      <style>{`
        /* Hide number arrows for a cleaner Excel feel */
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
        /* Active Row Highlight using focus-within */
        tr.excel-row:focus-within {
          background-color: #fefce8 !important; /* light yellow */
          box-shadow: inset 0 0 0 2px #c8834a;
          position: relative;
          z-index: 30;
        }
        tr.excel-row:focus-within td {
          border-color: #fefce8;
        }
      `}</style>

      {/* Header */}
      <div className="flex-none bg-white border-b px-4 py-3 flex items-center justify-between z-40 shadow-sm relative">
        <div>
          <h2 className="text-lg font-black text-[#1e293b] flex items-center gap-2 tracking-tight">
            <span className="bg-[#c8834a]/10 p-1.5 rounded-lg text-[#c8834a]"><Scissors className="w-4 h-4" /></span>
            PTE Cutting Grid
          </h2>
          <p className="text-[10px] text-slate-400 font-bold mt-1">Use Arrow Keys to navigate cells. The active row highlights automatically.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={clearIssued}
            className="px-3 py-1.5 font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
          >
            Clear Issued
          </button>
          <button
            onClick={handleBulkIssue}
            disabled={validCount === 0 || isAnyLoading}
            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-black transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Approve All Valid Rows ({validCount})
          </button>
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
              {rows.map((row, index) => (
                <CuttingSheetRow
                  key={row.id}
                  index={index}
                  sNo={sNoArray[index]}
                  row={row}
                  ordersList={ordersList}
                  lotsList={lotsList}
                  workers={workers}
                  onChange={handleRowChange}
                  onSkinChange={handleSkinChange}
                  onAddBelow={insertRowBelow}
                  onDuplicate={duplicateRow}
                  onDelete={deleteRow}
                  onSingleIssue={() => handleSingleIssue(row.id)}
                  isValid={isRowValid(row)}
                />
              ))}
            </tbody>
            <tfoot>
              {Object.entries(orderTotals).map(([orderId, data]) => (
                <tr key={orderId} className="bg-[#1e293b] text-white font-black border-b border-slate-600">
                  <td colSpan={26} className="p-2 text-right border-r border-slate-600 tracking-widest text-[11px] text-slate-300">
                    {data.name} TOTAL
                  </td>
                  <td className="p-2 text-center border-r border-slate-600 bg-[#334155] text-amber-400 text-sm">
                    {data.skins}
                  </td>
                  <td className="p-2 text-center border-r border-slate-600 bg-[#334155] text-amber-400 text-sm">
                    {data.sqft.toFixed(2)}
                  </td>
                  <td className="p-2 bg-[#334155] sticky right-0 z-20 shadow-[-4px_0_10px_rgba(0,0,0,0.1)]"></td>
                </tr>
              ))}
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
          </table>
        </div>
      </div>

      {/* Excel Bottom Multi-Sheet Navigation Tabs */}
      <div className="flex-none bg-[#1e293b] border-t border-slate-700 px-4 py-2.5 flex items-center justify-between z-30 shadow-lg">
        <div className="flex items-center gap-2 overflow-x-auto py-0.5 no-scrollbar">
          <span className="text-[10px] font-black uppercase text-slate-400 mr-1 tracking-widest hidden sm:inline">
            Worksheets:
          </span>
          {sheets.map((sheet, index) => {
            const isActive = sheet.id === activeSheetId;
            return (
              <div
                key={sheet.id}
                onClick={() => setActiveSheetId(sheet.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer flex items-center gap-2 transition-all border select-none ${isActive
                    ? 'bg-[#c8834a] text-white border-[#e0985c] shadow-md scale-105'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                  }`}
              >
                <FileSpreadsheet className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-amber-400'}`} />
                <span>{sheet.name}</span>
                {sheets.length > 1 && (
                  <button
                    onClick={(e) => handleRemoveSheet(sheet.id, e)}
                    className="ml-1 p-0.5 rounded hover:bg-black/20 text-slate-300 hover:text-white"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}

          <button
            onClick={handleAddSheet}
            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-amber-400 hover:bg-[#c8834a] hover:text-white transition-all font-black text-xs flex items-center gap-1 shadow-sm"
            title="Add a new sheet tab for another style/batch"
          >
            <Plus className="w-4 h-4" />
            <span>Add Sheet</span>
          </button>
        </div>

        <div className="text-right text-[11px] font-bold text-slate-400 hidden sm:block">
          Active Sheet Skins: <strong className="text-emerald-400 font-mono">{grandTotalSkins}</strong> ({grandTotalSqft} dcm)
        </div>
      </div>
    </div>
  );
}

const CuttingSheetRow = React.memo(({
  index,
  sNo,
  row,
  ordersList,
  lotsList,
  workers,
  onChange,
  onSkinChange,
  onAddBelow,
  onDuplicate,
  onDelete,
  onSingleIssue,
  isValid
}) => {
  const { data: skusData = [], isFetching: skusLoading } = useGetOrderBarcodeSkusQuery(row.orderId, {
    skip: !row.orderId,
  });
  const skusList = Array.isArray(skusData) ? skusData : skusData?.items || [];

  const availableStyles = useMemo(() => {
    const styles = skusList.map(s => s.style_name || s.style).filter(Boolean);
    return [...new Set(styles)];
  }, [skusList]);

  const availableSizes = useMemo(() => {
    if (!row.styleName) return [];
    return skusList
      .filter(s => (s.style_name || s.style) === row.styleName)
      .map(s => s.size)
      .filter(Boolean);
  }, [skusList, row.styleName]);

  useEffect(() => {
    if (row.styleName && row.sizeName && !row.skuId) {
      const match = skusList.find(s => (s.style_name || s.style) === row.styleName && s.size === row.sizeName);
      if (match) {
        onChange(row.id, 'skuId', match.sku_id || match.style_id || match.id);
      }
    }
  }, [row.styleName, row.sizeName, skusList, row.skuId, row.id, onChange]);

  const selectedLot = lotsList.find(l => l.lot_id === row.lotId);
  const articleDisplay = selectedLot ? selectedLot.article : '';

  const availableColours = useMemo(() => {
    const colours = lotsList.map(l => l.colour).filter(Boolean);
    if (selectedLot?.colour && !colours.includes(selectedLot.colour)) {
      colours.push(selectedLot.colour);
    }
    return [...new Set(colours)];
  }, [lotsList, selectedLot]);

  const totalSkins = row.skins.filter((s) => s !== '' && !isNaN(s) && Number(s) > 0).length;
  const totalSqft = row.skins.reduce((acc, curr) => acc + (curr !== '' && !isNaN(curr) ? parseFloat(curr) : 0), 0).toFixed(2);

  let rowClass = "excel-row hover:bg-slate-50 transition-colors border-b border-slate-200 group relative";
  if (row.status === 'success') rowClass = "excel-row bg-emerald-50 hover:bg-emerald-100 border-b border-emerald-200 group relative";
  else if (row.status === 'error') rowClass = "excel-row bg-red-50 hover:bg-red-100 border-b border-red-200 group relative";

  const isLocked = row.status === 'loading' || row.status === 'success';

  const cellInputClass = "w-full h-9 text-center font-bold text-slate-800 bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-slate-300 transition-all";
  const cellSelectClass = "w-full h-9 font-bold text-slate-800 bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-slate-300 transition-all truncate px-1 appearance-none cursor-pointer";

  // Arrow Key Navigation handler
  const handleGridKeyDown = (e, currentSkinIndex) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      let r = index;
      let c = currentSkinIndex;
      if (e.key === 'ArrowUp') r -= 1;
      if (e.key === 'ArrowDown') r += 1;
      if (e.key === 'ArrowLeft') c -= 1;
      if (e.key === 'ArrowRight') c += 1;

      const target = document.querySelector(`input[data-row="${r}"][data-col="${c}"]`);
      if (target) {
        target.focus();
        target.select();
      }
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      let target;
      if (e.shiftKey && e.key === 'Tab') {
        target = document.querySelector(`input[data-row="${index}"][data-col="${currentSkinIndex - 1}"]`);
      } else {
        target = document.querySelector(`input[data-row="${index}"][data-col="${currentSkinIndex + 1}"]`);
        if (!target && e.key === 'Enter') {
          // Wrap around to next row if pressing Enter at the end of skins
          target = document.querySelector(`input[data-row="${index + 1}"][data-col="0"]`);
        }
      }
      if (target) {
        target.focus();
        target.select();
      }
    }
  };

  return (
    <tr className={rowClass}>
      <td className="p-0 sticky left-0 z-10 border-r border-slate-300 bg-slate-100 group-focus-within:bg-yellow-100 text-center font-bold text-slate-500">
        <span>{sNo}</span>
      </td>

      <td className="p-0 sticky left-10 z-10 border-r border-slate-300 bg-white group-focus-within:bg-[#fefce8]">
        <input
          type="date"
          value={row.date}
          onChange={(e) => onChange(row.id, 'date', e.target.value)}
          disabled={isLocked}
          className={`${cellInputClass} px-2`}
        />
      </td>

      <td className="p-0 border-r border-slate-300 bg-[#e2e8f0]/30 group-focus-within:bg-transparent">
        <select
          value={row.orderId}
          onChange={(e) => onChange(row.id, 'orderId', e.target.value)}
          disabled={isLocked}
          className={cellSelectClass}
        >
          <option value=""></option>
          {ordersList.map((o, idx) => {
            const oId = o.order_id || o.id;
            return <option key={`ord-${oId}-${idx}`} value={oId}>{o.order_number || oId}</option>;
          })}
        </select>
      </td>

      <td className="p-0 border-r border-slate-300 bg-[#dcfce7]/30 group-focus-within:bg-transparent">
        <select
          value={row.styleName}
          onChange={(e) => onChange(row.id, 'styleName', e.target.value)}
          disabled={isLocked || !row.orderId}
          className={`${cellSelectClass} text-[#166534]`}
        >
          <option value="">{skusLoading ? '...' : ''}</option>
          {availableStyles.map((sName, idx) => (
            <option key={`style-${sName}-${idx}`} value={sName}>{sName}</option>
          ))}
        </select>
      </td>

      <td className="p-0 border-r border-slate-300 bg-[#dcfce7]/30 relative group/lot group-focus-within:bg-transparent">
        <select
          value={row.lotId}
          onChange={(e) => onChange(row.id, 'lotId', e.target.value)}
          disabled={isLocked}
          className={`${cellSelectClass} text-[#166534]`}
          title={articleDisplay}
        >
          <option value="">{articleDisplay ? articleDisplay : ''}</option>
          {lotsList.map((l, idx) => (
            <option key={`lot-${l.lot_id}-${idx}`} value={l.lot_id}>{l.article}</option>
          ))}
        </select>
      </td>

      <td className="p-0 border-r border-slate-300 bg-[#dcfce7]/30 group-focus-within:bg-transparent">
        <select
          value={row.colour || ''}
          onChange={(e) => onChange(row.id, 'colour', e.target.value)}
          disabled={isLocked}
          className={`${cellSelectClass} text-[#166534] text-center font-bold`}
        >
          <option value=""></option>
          {availableColours.map((col, idx) => (
            <option key={`col-${col}-${idx}`} value={col}>{col}</option>
          ))}
        </select>
      </td>

      <td className="p-0 border-r border-slate-300 bg-[#f8fafc] group-focus-within:bg-transparent">
        <select
          value={row.workerId}
          onChange={(e) => onChange(row.id, 'workerId', e.target.value)}
          disabled={isLocked}
          className={cellSelectClass}
        >
          <option value=""></option>
          {workers?.map((w, idx) => (
            <option key={`work-${w.id || w.employee_id || idx}-${idx}`} value={w.id || w.employee_id}>{w.name ? w.name.toUpperCase() : ''}</option>
          ))}
        </select>
      </td>

      <td className="p-0 border-r border-slate-300 bg-white group-focus-within:bg-transparent">
        <select
          data-col="sizeName"
          value={row.sizeName}
          onChange={(e) => onChange(row.id, 'sizeName', e.target.value)}
          disabled={isLocked || !row.styleName}
          className={`${cellSelectClass} text-center`}
        >
          <option value=""></option>
          {availableSizes.map((sz) => (
            <option key={sz} value={sz}>{sz}</option>
          ))}
        </select>
      </td>

      <td className="p-0 border-r border-slate-300 bg-white group-focus-within:bg-transparent">
        <input
          type="text"
          value={row.rcNo}
          onChange={(e) => onChange(row.id, 'rcNo', e.target.value)}
          disabled={isLocked}
          className={`${cellInputClass} text-blue-800`}
        />
      </td>

      {row.skins.map((skin, i) => (
        <td key={i} className="p-0 border-r border-slate-200 bg-white group-focus-within:bg-transparent">
          <input
            data-row={index}
            data-col={i}
            type="number"
            step="0.01"
            value={skin}
            onChange={(e) => onSkinChange(row.id, i, e.target.value)}
            disabled={isLocked}
            onKeyDown={(e) => handleGridKeyDown(e, i)}
            className={`${cellInputClass} w-16 focus:bg-white`}
          />
        </td>
      ))}

      <td className="p-0 border-r border-slate-300 bg-slate-100 text-center font-black text-slate-700 group-focus-within:bg-[#fefce8]">
        {totalSkins > 0 ? totalSkins : ''}
      </td>
      <td className="p-0 border-r border-slate-300 bg-slate-100 text-center font-black text-slate-700 group-focus-within:bg-[#fefce8]">
        {totalSqft > 0 ? totalSqft : ''}
      </td>

      {/* Static Action Column with Inline Approve */}
      <td className="p-1 border-r border-slate-300 sticky right-0 z-20 bg-white group-focus-within:bg-[#fefce8] shadow-[-4px_0_10px_rgba(0,0,0,0.05)] text-center">
        {row.status === 'success' ? (
          <span className="text-[10px] font-black text-emerald-700 px-2 py-1 bg-emerald-100 border border-emerald-300 rounded shadow-sm break-keep">{row.barcode}</span>
        ) : row.status === 'error' ? (
          <span className="text-[10px] font-bold text-red-600 flex flex-col items-center leading-tight">
            <AlertCircle className="w-4 h-4 mb-0.5" />
            Failed
          </span>
        ) : row.status === 'loading' ? (
          <Loader2 className="w-5 h-5 animate-spin text-[#c8834a] mx-auto" />
        ) : isValid ? (
          <button
            onClick={onSingleIssue}
            className="flex items-center justify-center gap-1 w-full py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded font-black text-[10px] uppercase shadow-sm transition-transform active:scale-95"
          >
            <Play className="w-3 h-3 fill-current" /> Issue
          </button>
        ) : (
          <span className="text-[10px] text-slate-300 font-bold uppercase cursor-not-allowed">Incomplete</span>
        )}

        {/* Floating Actions on Hover (Crud) */}
        {!isLocked && (
          <div className="absolute right-full top-0 bottom-0 flex items-center opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-l from-slate-100 via-slate-100 to-transparent pl-4 pr-1 z-10 pointer-events-none">
            <div className="pointer-events-auto flex items-center">
              <button
                onClick={() => onAddBelow(index)}
                title="Add Row Below"
                className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-100 rounded mr-1"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDuplicate(index)}
                title="Duplicate Row"
                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded mr-1"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(row.id)}
                title="Delete Row"
                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-100 rounded"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </td>
    </tr>
  );
});
