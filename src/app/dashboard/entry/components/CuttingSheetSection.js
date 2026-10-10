'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import JsBarcode from 'jsbarcode';
import { Scissors, Loader2, FileSpreadsheet, LockOpen, Check, Barcode, Printer, ArrowUp } from 'lucide-react';

import {
  useLazyGetMaterialLotsQuery,
  useLazyGetCuttingGridQuery,
  useLazyGetCuttingSheetQuery,
  useGenerateCuttingRowsMutation,
  useCreateCuttingSheetMutation,
  useUpdateCuttingSheetMutation,
  useDeleteCuttingSheetMutation,
  useUpdateCuttingRowMutation,
  useApproveCuttingRowMutation,
  useReopenCuttingRowMutation,
  useLazyGetClientStylesQuery,
  useLazyGetStyleMaterialSpecQuery,
  useLazyBarcodeResolveQuery
} from '@/store/slices/apiSlice';
import { useGetAttendanceTodayQuery } from '@/store/slices/attendanceApiSlice';
import { useDispatch } from 'react-redux';
import { setMessages } from '@/store/slices/entrySlice';

const toastListeners = new Set();

// const toast = {
//   success: (msg) => toastListeners.forEach(fn => fn({ type: 'success', message: msg })),
//   error: (msg) => toastListeners.forEach(fn => fn({ type: 'error', message: msg })),
//   warning: (msg) => toastListeners.forEach(fn => fn({ type: 'warning', message: msg }))
// };
const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', 'XXXL', '3XL', '4XL', '5XL'];
const sizeRank = (s) => {
  const i = SIZE_ORDER.indexOf(s);
  if (i >= 0) return i;
  const n = parseFloat(s);
  return Number.isFinite(n) ? 100 + n : 1000;
};
const sizeAnchorId = (s) => `cs-size-${String(s).replace(/[^A-Za-z0-9]/g, '_')}`;
const rowSize = (row) => String(row?.size || row?.size_name || '').toUpperCase();

function useLoggerToast() {
  const dispatch = useDispatch();
  return useMemo(() => ({
    success: (msg) => dispatch(setMessages({ success: msg, error: '' })),
    error: (msg) => dispatch(setMessages({ error: msg, success: '' })),
  }), [dispatch]);
}

export default function CuttingSheetSection() {
  const toast = useLoggerToast();
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
    fetchStyles({ limit: 200 });
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

  // Picking a style fills in the rest: article from the style itself, colour
  // from the style's leather spec line. Both stay editable. The ref drops a
  // slow spec response if the user has already switched to another style.
  const latestStyleRef = useRef(styleId);
  const handleStyleChange = async (newStyleId) => {
    latestStyleRef.current = newStyleId;
    setStyleId(newStyleId);
    const style = stylesList.find((s) => (s.id || s.style_id || s.style_code) === newStyleId);
    setSelectedArticle(style?.article || '');
    setColour('');
    if (!newStyleId) return;
    try {
      const spec = await fetchSpec(newStyleId).unwrap();
      if (latestStyleRef.current !== newStyleId) return;
      const lines = Array.isArray(spec) ? spec : spec?.lines || [];
      const leatherColour = lines
        .filter((l) => l.category === 'LEATHER')
        .map((l) => l.colour || l.color)
        .find(Boolean);
      if (leatherColour) setColour(leatherColour);
    } catch {
      // no spec yet — colour stays for a manual pick
    }
  };

  const [generateRows] = useGenerateCuttingRowsMutation();

  // 📡 GET /api/v1/cutting/grid with 50-by-50 sequential batching & 1s delay
  const [fetchCuttingGridBatch] = useLazyGetCuttingGridQuery();
  const [accumulatedGridData, setAccumulatedGridData] = useState({
    rows: [],
    total: 0,
    colours: [],
    present_cutters: []
  });
  const [isFetchingGrid, setIsFetchingGrid] = useState(false);
  const [gridError, setGridError] = useState(null);

  useEffect(() => {
    if (!styleId) {
      setAccumulatedGridData({ rows: [], total: 0, colours: [], present_cutters: [] });
      setIsFetchingGrid(false);
      setGridError(null);
      return;
    }

    let isCancelled = false;

    const fetchAllGridBatches = async () => {
      setIsFetchingGrid(true);
      setGridError(null);
      setAccumulatedGridData({ rows: [], total: 0, colours: [], present_cutters: [] });

      let currentOffset = 0;
      const batchLimit = 50;
      let hasMore = true;

      while (hasMore && !isCancelled) {
        try {
          const res = await fetchCuttingGridBatch({
            style_id: styleId,
            colour: colour || undefined,
            limit: batchLimit,
            offset: currentOffset
          }, false).unwrap();

          if (isCancelled) break;

          const batchRows = Array.isArray(res?.rows) ? res.rows : (Array.isArray(res) ? res : []);
          const totalCount = typeof res?.total === 'number' ? res.total : 0;
          const resHasMore = res?.has_more;

          setAccumulatedGridData(prev => {
            const existingIds = new Set(prev.rows.map(r => r.row_id || r.id));
            const freshRows = batchRows.filter(r => !existingIds.has(r.row_id || r.id));
            return {
              rows: [...prev.rows, ...freshRows],
              total: totalCount || (prev.rows.length + freshRows.length),
              colours: res?.colours || prev.colours || [],
              present_cutters: res?.present_cutters || prev.present_cutters || []
            };
          });

          // Check if more 50-row batches exist
          if (resHasMore !== undefined) {
            hasMore = resHasMore;
          } else if (batchRows.length < batchLimit) {
            hasMore = false;
          } else if (totalCount && (currentOffset + batchRows.length >= totalCount)) {
            hasMore = false;
          }

          if (hasMore && !isCancelled) {
            currentOffset += batchLimit;
            // ⏱ 1-second delay between 50-row batch requests
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (err) {
          if (!isCancelled) {
            console.warn('Batch fetch cutting grid error:', err);
            setGridError(err);
          }
          hasMore = false;
        }
      }

      if (!isCancelled) {
        setIsFetchingGrid(false);
      }
    };

    fetchAllGridBatches();

    return () => {
      isCancelled = true;
    };
  }, [styleId, colour, fetchCuttingGridBatch]);

  useEffect(() => {
    if (gridError) {
      console.warn('Backend Grid Error:', gridError);
    }
  }, [gridError]);


  // 📡 GET /api/v1/attendance/today
  const { data: attendanceRes } = useGetAttendanceTodayQuery();
  const presentWorkers = useMemo(() => {
    const raw = Array.isArray(attendanceRes)
      ? attendanceRes
      : (attendanceRes?.roster || attendanceRes?.items || attendanceRes?.employees || attendanceRes?.attendance || []);
    const gridCutters = Array.isArray(accumulatedGridData?.present_cutters) ? accumulatedGridData.present_cutters : [];
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
  }, [attendanceRes, accumulatedGridData]);

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
    const gridColours = Array.isArray(accumulatedGridData?.colours) ? accumulatedGridData.colours : (accumulatedGridData?.colour ? [accumulatedGridData.colour] : []);
    const specExtraColours = Array.isArray(specData?.colours) ? specData.colours : [];
    const savedColour = colour ? [colour] : [];

    return [...new Set([...specColours, ...gridColours, ...specExtraColours, ...lotColours, ...savedColour])];
  }, [leatherLines, lotsList, accumulatedGridData, specData, colour]);

  // Grid state
  const [rows, setRows] = useState([]);
  const [isLooping, setIsLooping] = useState(false);

  // Size index: row count per size (sorted S → 3XL) and the first row of each
  // size, which carries the scroll anchor the right-hand panel jumps to.
  const { sizeIndex, firstRowOfSize } = useMemo(() => {
    const counts = new Map();
    const first = new Map();
    rows.forEach((r, i) => {
      const s = rowSize(r);
      if (!s) return;
      counts.set(s, (counts.get(s) || 0) + 1);
      if (!first.has(s)) first.set(s, i);
    });
    return {
      sizeIndex: [...counts.entries()]
        .map(([size, count]) => ({ size, count }))
        .sort((a, b) => sizeRank(a.size) - sizeRank(b.size)),
      firstRowOfSize: first,
    };
  }, [rows]);
  const showSizeIndex = sizeIndex.length > 1;
  const jumpTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Scroll-spy: the size whose divider has most recently passed the upper
  // third of the screen is the one on view — the panel highlights it. Listens
  // in the capture phase so it catches the dashboard's own scroll container.
  const [activeSize, setActiveSize] = useState(null);
  useEffect(() => {
    if (!showSizeIndex) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const anchors = sizeIndex
        .map(({ size }) => ({ size, el: document.getElementById(sizeAnchorId(size)) }))
        .filter((a) => a.el)
        .map((a) => ({ size: a.size, top: a.el.getBoundingClientRect().top }))
        .sort((a, b) => a.top - b.top);
      if (anchors.length === 0) return;
      const threshold = window.innerHeight * 0.35;
      let current = anchors[0].size;
      for (const a of anchors) {
        if (a.top > threshold) break;
        current = a.size;
      }
      setActiveSize(current);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    window.addEventListener('resize', onScroll);
    frame = requestAnimationFrame(update);
    return () => {
      document.removeEventListener('scroll', onScroll, { capture: true });
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [showSizeIndex, sizeIndex]);
  const [reopenTargetRow, setReopenTargetRow] = useState(null);
  const [reopenReasonText, setReopenReasonText] = useState('');
  const [printBarcodeRow, setPrintBarcodeRow] = useState(null);
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

  // Sync loaded grid rows (filtered by Article, Colour, workDate & status rules)
  useEffect(() => {
    if (accumulatedGridData?.rows && Array.isArray(accumulatedGridData.rows)) {
      const todayStr = new Date().toISOString().slice(0, 10);

      const filtered = accumulatedGridData.rows.filter(r => {
        // Article & Colour filter (if selected in top bar)
        if (selectedArticle && r.article && r.article.toLowerCase() !== selectedArticle.toLowerCase()) {
          return false;
        }
        if (colour && (r.colour || r.color) && (r.colour || r.color).toLowerCase() !== colour.toLowerCase()) {
          return false;
        }

        if (!workDate) return true;

        const rowDate = (r.work_date || r.date || '').slice(0, 10);
        const approvedDate = (r.approved_at || r.logged_at || '').slice(0, 10);
        const updatedDate = (r.updated_at || r.reopened_at || '').slice(0, 10);
        const isApproved = r.status === 'APPROVED' || r.status === 'ISSUED' || r.status === 'LOGGED';
        const isReopened = r.status === 'REOPENED';

        // Calculate the "effective" date for this row based on its latest major action
        let effectiveDate = rowDate;
        if (isApproved && approvedDate) {
          effectiveDate = approvedDate;
        } else if (isReopened && updatedDate) {
          effectiveDate = updatedDate;
        }

        // Rule 1: Future date selected -> EMPTY (0 rows)
        if (workDate > todayStr) {
          return false;
        }

        // Rule 2: Past date selected -> Show ONLY if the row's effective action happened on this exact past date
        if (workDate < todayStr) {
          return effectiveDate === workDate && (isReopened || isApproved);
        }

        // Rule 3: Today's date selected ->
        if (workDate === todayStr) {
          // If it was created/approved/reopened TODAY, show it.
          if (effectiveDate === todayStr) return true;

          // If its effective date is in the past, only show it if it's an active (carried forward) task
          if (effectiveDate < todayStr) {
            if (!isApproved) return true; // Drafts and old Reopened rows carry forward
          }
          return false;
        }

        return false;
      });

      setRows(filtered);
    }
  }, [accumulatedGridData, workDate, selectedArticle, colour]);
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
        allocate: false,
        limit: 10
      };

      let lastMessage = '';
      const allWarnings = [];

      while (keepGenerating) {
        const res = await generateRows(payload).unwrap();

        if (res.message) lastMessage = res.message;
        else if (res.detail) lastMessage = res.detail;

        if (res.rows && Array.isArray(res.rows) && res.rows.length > 0) {
          const freshEmptyRows = res.rows.map(r => ({
            ...r,
            sheets: []
          }));


          setRows(prev => {
            const existingIds = new Set(prev.map(r => r.row_id || r.id));
            const uniqueFresh = freshEmptyRows.filter(r => !existingIds.has(r.row_id || r.id));
            return [...prev, ...uniqueFresh];
          });

          const createdThisBatch = res.created || res.rows.length;
          totalGenerated += createdThisBatch;


          if (res.warnings && res.warnings.length > 0) {
            allWarnings.push(...res.warnings);
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

      // One toast slot — fold any warnings into the final message so they aren't lost
      const warningText = allWarnings.length > 0 ? ` ⚠ ${allWarnings.join(' · ')}` : '';
      if (totalGenerated > 0) {
        toast.success(`Generated a total of ${totalGenerated} rows successfully.${warningText}`);
      } else {
        toast.success(`${lastMessage || 'No new rows to generate.'}${warningText}`);
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
    setAccumulatedGridData(prev => ({
      ...prev,
      rows: prev.rows.map(r => {
        const rId = r.row_id || r.id;
        const uId = updatedRow.row_id || updatedRow.id;
        return rId === uId ? updatedRow : r;
      })
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
              Pick a style — its article and colour fill in automatically. Then press Generate.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200 shadow-inner overflow-x-auto">
            {isFetchingGrid && rows.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-300 rounded-lg text-[11px] font-bold animate-pulse whitespace-nowrap">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                <span>Loading...</span>
              </div>
            )}
            <input
              type="date"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 text-xs outline-none focus:border-[#c8834a] focus:ring-1 focus:ring-[#c8834a] transition-all"
            />
            <select
              value={styleId}
              onChange={(e) => handleStyleChange(e.target.value)}
              onFocus={() => fetchStyles({ limit: 200 })}
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

      {/* Table Container — extra right padding on desktop keeps the size panel off the Approve column */}
      <div id="cs-grid-top" className={`flex-1 overflow-auto p-4 z-0 relative scroll-mt-4 ${showSizeIndex ? 'lg:pr-24' : ''}`}>
        <div className="bg-white rounded-lg shadow-sm border border-slate-300 inline-block min-w-full">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-[#475569] text-white uppercase font-black tracking-wider border-b border-slate-300">
                <th className="p-2 sticky left-0 z-20 bg-[#334155] border-r border-slate-400 w-10 text-center">S.No</th>
                <th className="p-2 sticky left-10 z-20 bg-[#334155] border-r border-slate-400 w-28 text-center">DATE</th>
                <th className="p-2 border-r border-slate-400 w-36 text-center">Style</th>
                <th className="p-2 border-r border-slate-400 w-32 text-center">Article</th>
                <th className="p-2 border-r border-slate-400 w-24 text-center">Colour</th>
                <th className="p-2 border-r border-slate-400 w-28 min-w-[100px] text-center">Name</th>
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
              {isFetchingGrid && rows.length === 0 ? (
                <tr>
                  <td colSpan={28} className="p-12 text-center text-slate-500 font-bold bg-slate-50">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-[#c8834a]" />
                      <span>Loading cutting grid...</span>
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={28} className="p-12 text-center text-slate-400 font-bold bg-slate-50">
                    No rows found for this selection. Click Generate to create new rows.
                  </td>
                </tr>
              ) : (

                rows.map((row, index) => {
                  const curSize = rowSize(row);
                  // Divider before every size group (the first one too) — it is
                  // also the jump target for the size panel on its first occurrence
                  const isNewSizeGroup = curSize && (index === 0 || curSize !== rowSize(rows[index - 1]));
                  const isAnchor = firstRowOfSize.get(curSize) === index;

                  return (
                    <React.Fragment key={row.row_id || row.id || index}>
                      {isNewSizeGroup && (
                        <tr id={isAnchor ? sizeAnchorId(curSize) : undefined} className="bg-slate-200/80 border-y-2 border-slate-300 scroll-mt-4">
                          <td colSpan={28} className="py-1.5 px-4 text-left font-black text-[11px] text-slate-600 bg-slate-200/70 tracking-widest uppercase">
                            ── Size: {curSize} ──
                          </td>
                        </tr>
                      )}
                      <CuttingSheetRow
                        index={index}
                        sNo={index + 1}
                        row={row}
                        updateRowInState={updateRowInState}
                        stylesList={stylesList}
                        presentWorkers={presentWorkers}
                        onOpenReopenModal={setReopenTargetRow}
                        onApproveSuccess={setPrintBarcodeRow}
                        workDate={workDate}
                      />
                    </React.Fragment>
                  );
                })
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

      {/* Size index — fixed to the screen's right edge (portalled so the grid's
          overflow-hidden wrapper can't clip it); click a size to jump to it */}
      {isMounted && showSizeIndex && createPortal(
        <nav
          aria-label="Jump to size"
          className="hidden lg:flex fixed right-3 top-1/2 -translate-y-1/2 z-40 flex-col items-center gap-1 p-1.5 rounded-2xl bg-white/95 backdrop-blur border shadow-lg max-h-[80vh] overflow-y-auto"
          style={{ borderColor: 'rgba(200,131,74,0.3)' }}
        >
          <button
            type="button"
            onClick={() => jumpTo('cs-grid-top')}
            title="Back to top"
            className="w-14 py-1.5 rounded-xl flex items-center justify-center transition-colors hover:bg-[#faf6f0] cursor-pointer"
            style={{ color: '#9a7a5a' }}
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          <span className="text-[9px] font-black uppercase tracking-wider pb-0.5" style={{ color: '#9a7a5a' }}>Size</span>
          {sizeIndex.map(({ size, count }) => {
            const isActive = activeSize === size;
            return (
              <button
                key={size}
                type="button"
                onClick={() => { setActiveSize(size); jumpTo(sizeAnchorId(size)); }}
                title={`Jump to ${size} — ${count} row(s)`}
                aria-current={isActive ? 'true' : undefined}
                className={`w-14 py-1.5 rounded-xl border transition-all active:scale-95 cursor-pointer ${isActive ? 'shadow-md' : 'hover:bg-[#faf6f0] hover:border-[#c8834a]'}`}
                style={isActive
                  ? { background: '#c8834a', borderColor: '#c8834a' }
                  : { borderColor: 'rgba(200,131,74,0.15)' }}
              >
                <span className="block text-xs font-black" style={{ color: isActive ? '#ffffff' : '#2d1f0e' }}>{size}</span>
                <span className="block text-[9px] font-bold" style={{ color: isActive ? 'rgba(255,255,255,0.85)' : '#9a7a5a' }}>{count}</span>
              </button>
            );
          })}
        </nav>,
        document.body
      )}

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

      {/* Piece Code Barcode Print Modal using createPortal */}
      {isMounted && printBarcodeRow && (
        <CuttingBarcodePrintModal
          rowData={printBarcodeRow}
          stylesList={stylesList}
          onClose={() => setPrintBarcodeRow(null)}
        />
      )}

      {/* Floating UI Toast Container */}
      {isMounted && <GlobalToastContainer />}
    </div>
  );
}


const CuttingSheetRow = React.memo(({ sNo, row, updateRowInState, stylesList, presentWorkers = [], onOpenReopenModal, onApproveSuccess, workDate }) => {
  const toast = useLoggerToast();
  const [createSheet] = useCreateCuttingSheetMutation();
  const [updateSheet] = useUpdateCuttingSheetMutation();
  const [deleteSheet] = useDeleteCuttingSheetMutation();
  const [updateRowMutation] = useUpdateCuttingRowMutation();
  const [approveRow, { isLoading: isApproving }] = useApproveCuttingRowMutation();
  // const [reopenRow, { isLoading: isReopening }] = useReopenCuttingRowMutation();
  // const [fetchSheetDetail] = useLazyGetCuttingSheetQuery();

  const [localCells, setLocalCells] = useState({});
  const [loadingCells, setLoadingCells] = useState({});
  const [rcNo, setRcNo] = useState(row.rc_no || row.rc_number || '');
  const [sizeVal, setSizeVal] = useState(row.size || row.size_name || '');

  const todayStr = new Date().toISOString().slice(0, 10);
  const rawRowDate = (row.work_date || row.date || '').slice(0, 10);
  const isLocked = row.status === 'APPROVED' || row.status === 'ISSUED' || row.status === 'LOGGED';

  const defaultDate = (workDate === todayStr && rawRowDate < todayStr && !isLocked)
    ? todayStr
    : (rawRowDate || workDate || todayStr);

  const [dateVal, setDateVal] = useState(defaultDate);

  useEffect(() => {
    const curDate = (row.work_date || row.date || '').slice(0, 10);
    const calculated = (workDate === todayStr && curDate < todayStr && !isLocked)
      ? todayStr
      : (curDate || workDate || todayStr);
    setDateVal(calculated);
  }, [row.work_date, row.date, workDate, isLocked, todayStr]);

  useEffect(() => {
    setRcNo(row.rc_no || row.rc_number || '');
  }, [row.rc_no, row.rc_number]);

  useEffect(() => {
    setSizeVal(row.size || row.size_name || '');
  }, [row.size, row.size_name]);

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

  const handleDeleteSheet = async (sheetIndex, existingSheet) => {
    if (!existingSheet || isLocked) return;
    const sheetId = existingSheet.id || existingSheet.sheet_id;
    if (!sheetId) return;

    setLoadingCells(prev => ({ ...prev, [sheetIndex]: true }));
    try {
      const res = await deleteSheet({
        row_id: row.row_id || row.id,
        sheet_id: sheetId
      }).unwrap();
      updateRowInState(res.row || res);
      setLocalCells(prev => {
        const next = { ...prev };
        delete next[sheetIndex];
        return next;
      });
      toast.success('Sheet deleted');
    } catch (err) {
      const errorMsg =
        (typeof err?.data?.detail === 'string' && err.data.detail) ||
        (Array.isArray(err?.data?.detail) && err.data.detail.map(d => d.msg || d.detail || JSON.stringify(d)).join('; ')) ||
        err?.data?.message ||
        err?.message ||
        'Failed to delete sheet';
      toast.error(errorMsg);
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
    const effectiveRc = (rcNo || '').trim();
    if (!effectiveRc) {
      toast.error('⚠️ R.C NO is required before approving row.');
      return;
    }

    const workerId = row.cutter_employee_id || row.cutter_id;
    const isWorkerValid = workerId && presentWorkers.some(w => String(w.id) === String(workerId));

    if (!workerId || !isWorkerValid) {
      toast.error('⚠️ Worker Name is required before approving row.');
      return;
    }

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
      const updatedRow = res.row || res;
      updateRowInState(updatedRow);
      toast.success(res.message || 'Row Approved successfully');

      if (onApproveSuccess) {
        onApproveSuccess({
          ...row,
          ...updatedRow,
          rc_no: effectiveRc,
          sNo
        });
      }
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
  if (row.status === 'APPROVED' || row.status === 'ISSUED' || row.status === 'LOGGED') {
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
          value={dateVal}
          disabled={isLocked}
          onChange={(e) => setDateVal(e.target.value)}
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
          className="w-full h-9 px-1 text-center font-bold text-slate-800 bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-slate-300 transition-all text-xs cursor-pointer min-w-[100px]"
        >
          <option value="">-- Select --</option>
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
        const hasSheet = !!sheet && (displayValue !== '' && displayValue !== null && displayValue !== undefined);

        return (
          <td key={i} className="p-0 border-r border-slate-200 bg-white group-focus-within:bg-transparent relative group/cell">
            <input
              type="number"
              step="0.01"
              value={displayValue}
              onChange={(e) => setLocalCells(prev => ({ ...prev, [i]: e.target.value }))}
              onBlur={(e) => handleCellBlur(i, e.target.value)}
              disabled={isLocked || isSaving}
              className={`${cellInputClass} w-16 focus:bg-white ${isSaving ? 'opacity-50' : ''}`}
            />
            {hasSheet && !isLocked && !isSaving && (
              <button
                type="button"
                onClick={() => handleDeleteSheet(i, sheet)}
                title="Delete Sheet"
                className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-rose-500 hover:bg-rose-700 text-white flex items-center justify-center text-[10px] font-black leading-none z-10 shadow-xs cursor-pointer"
              >
                ×
              </button>
            )}
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
            className="flex items-center justify-center gap-1 w-full py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded font-black text-[10px] uppercase shadow-sm transition-transform active:scale-95 border border-amber-300 cursor-pointer"
          >
            <LockOpen className="w-3 h-3" />
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

function BarcodeSticker({ code }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (svgRef.current && code) {
      try {
        JsBarcode(svgRef.current, code, {
          format: 'CODE128',
          width: 2,
          height: 50,
          displayValue: false,
          margin: 0,
          background: '#ffffff',
          lineColor: '#000000',
        });
      } catch (err) {
        console.error('JsBarcode render error:', err);
      }
    }
  }, [code]);

  // Stretched to fill the label's barcode box (see .label-bars); crispEdges keeps bars sharp on thermal heads
  return <svg ref={svgRef} preserveAspectRatio="none" shapeRendering="crispEdges" className="block w-full h-full" />;
}

const isUuidString = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(str || '').trim());

function CuttingBarcodePrintModal({ rowData, stylesList = [], onClose }) {
  if (!rowData) return null;

  const [triggerResolve, { data: resolveData, isLoading: isResolving }] = useLazyBarcodeResolveQuery();

  useEffect(() => {
    const targetCode =
      rowData.short_code ||
      rowData.shortCode ||
      rowData.piece_code ||
      rowData.code ||
      rowData.barcode ||
      (rowData.rc_no ? `PC-${rowData.rc_no}` : '') ||
      (rowData.rc_number ? `PC-${rowData.rc_number}` : '') ||
      rowData.piece_id ||
      rowData.id;

    if (targetCode) {
      triggerResolve(targetCode);
    }
  }, [rowData, triggerResolve]);

  const piece = resolveData?.piece || resolveData?.data || null;

  const displayRc = rowData.rc_no || rowData.rc_number || piece?.rc_no || '';
  const displayArticle = piece?.article || rowData.article || '';

  const matchingStyle = stylesList?.find(s =>
    (s.id && s.id === (piece?.style_id || rowData.style_id)) ||
    (s.style_id && s.style_id === (piece?.style_id || rowData.style_id)) ||
    (s.style_code && s.style_code === (piece?.style_id || rowData.style_id))
  );

  const rawStyle =
    piece?.style_code ||
    piece?.style_name ||
    rowData.style_name ||
    rowData.style_code ||
    matchingStyle?.style_name ||
    matchingStyle?.name ||
    matchingStyle?.style_code ||
    (isUuidString(rowData.style_id) ? '' : rowData.style_id) ||
    '';
  const displayStyle = isUuidString(rawStyle) ? '' : rawStyle;

  const displayColor = piece?.colour || piece?.color || rowData.colour || rowData.color || '';
  const displaySize = piece?.size || piece?.size_name || rowData.size || rowData.size_name || '';

  // Strictly prioritize short_code for barcode and label
  const pieceCode =
    resolveData?.short_code ||
    piece?.short_code ||
    rowData.short_code ||
    rowData.shortCode ||
    (resolveData?.code && String(resolveData.code).length <= 15 ? resolveData.code : '') ||
    (piece?.code && String(piece.code).length <= 15 ? piece.code : '') ||
    (displayRc ? `PC-${displayRc}` : '') ||
    (rowData.code && String(rowData.code).length <= 15 ? rowData.code : '') ||
    'PC-BARCODE';

  // Subtitle caption without #1 / serial numbers: Style · Article · Colour · Size
  const subtitleStr =
    resolveData?.caption ||
    [displayStyle, displayArticle, displayColor, displaySize]
      .filter(val => val && !isUuidString(val))
      .join(' · ');

  useEffect(() => {
    const handleAfterPrint = () => {
      if (onClose) onClose();
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [onClose]);

  const handlePrint = () => {
    window.print();
    setTimeout(() => {
      if (onClose) onClose();
    }, 150);
  };

  return createPortal(
    <div id="cutting-barcode-print-wrapper" className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <style>{`
        /* Physical label: Posiflow SRS20 thermal roll, 50mm wide x 25mm tall */
        #printable-barcode-ticket {
          width: 50mm;
          height: 25mm;
          box-sizing: border-box;
          padding: 1.2mm 2mm;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: #ffffff;
          color: #000000;
          outline: 1px dashed #94a3b8;
        }
        /* 42mm leaves a 4mm quiet zone each side for CODE128 */
        #printable-barcode-ticket .label-bars {
          width: 42mm;
          height: 11mm;
          flex-shrink: 0;
        }
        #printable-barcode-ticket .label-code {
          margin-top: 0.7mm;
          max-width: 100%;
          font-size: 9pt;
          font-weight: 800;
          line-height: 1;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        #printable-barcode-ticket .label-caption {
          margin-top: 0.5mm;
          max-width: 100%;
          font-size: 6pt;
          font-weight: 700;
          line-height: 1.15;
          text-align: center;
          text-transform: uppercase;
          word-break: break-word;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        /* Enlarges the on-screen preview only; the print is true size */
        #cutting-barcode-print-wrapper .label-zoom {
          zoom: 1.7;
        }

        @media print {
          @page {
            size: 50mm 25mm;
            margin: 0;
          }
          html, body {
            width: 50mm !important;
            height: 25mm !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background: #ffffff !important;
          }
          body > * {
            display: none !important;
          }
          body > #cutting-barcode-print-wrapper {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 50mm !important;
            height: 25mm !important;
            background: #ffffff !important;
            backdrop-filter: none !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
          }
          #cutting-barcode-print-wrapper .print-hide {
            display: none !important;
          }
          #cutting-barcode-print-wrapper .print-flat {
            display: block !important;
            width: auto !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: transparent !important;
            zoom: 1 !important;
          }
          /* A hair under the page height so rounding never spills onto a second (blank) label */
          #printable-barcode-ticket {
            height: 24.5mm !important;
            outline: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden print-flat">
        {/* Modal Header (hidden on print) */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-6 py-4 flex items-center justify-between print:hidden print-hide">
          <div className="flex items-center gap-2">
            <Barcode className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base">Print Barcode Ticket?</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg font-bold w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Modal Content / Ticket Preview */}
        <div className="p-6 space-y-5 text-center print-flat">
          <p className="text-xs text-slate-500 font-medium print:hidden print-hide">
            Label preview (50 × 25 mm) for approved cutting row:
          </p>

          {/* 50 × 25 mm label — same markup prints at true size */}
          <div className="flex justify-center print-flat">
            <div className="label-zoom print-flat">
              <div id="printable-barcode-ticket">
                {isResolving ? (
                  <div className="flex items-center gap-1 text-slate-400 text-[7pt]">
                    <Loader2 className="w-3 h-3 animate-spin text-[#c8834a]" />
                    <span>Resolving barcode...</span>
                  </div>
                ) : (
                  <>
                    <div className="label-bars">
                      <BarcodeSticker code={pieceCode} />
                    </div>

                    <div className="label-code font-mono">{pieceCode}</div>

                    {/* Style · Article · Colour · Size */}
                    {subtitleStr && <div className="label-caption">{subtitleStr}</div>}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons (hidden on print) */}
          <div className="flex items-center gap-3 pt-2 print:hidden print-hide">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase rounded-xl transition-all border border-slate-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={isResolving}
              className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              Print Barcode
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function GlobalToastContainer() {
  const [toastItem, setToastItem] = useState(null);

  useEffect(() => {
    let timer;
    const handler = (item) => {
      setToastItem(item);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        setToastItem(null);
      }, 3500);
    };
    toastListeners.add(handler);
    return () => {
      toastListeners.delete(handler);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!toastItem) return null;

  const bgClasses = {
    error: 'bg-rose-950/90 text-rose-100 border-rose-700 shadow-rose-950/40',
    success: 'bg-emerald-950/90 text-emerald-100 border-emerald-700 shadow-emerald-950/40',
    warning: 'bg-amber-950/90 text-amber-100 border-amber-700 shadow-amber-950/40'
  };

  const icons = {
    error: '⚠️',
    success: '✅',
    warning: '⚡'
  };

  return createPortal(
    <div className="fixed bottom-6 right-6 z-[999999] flex items-center gap-3 animate-fade-in print:hidden">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur-md shadow-2xl text-xs font-bold ${bgClasses[toastItem.type] || bgClasses.error}`}>
        <span className="text-base">{icons[toastItem.type] || 'ℹ️'}</span>
        <span className="leading-snug">{toastItem.message}</span>
        <button
          type="button"
          onClick={() => setToastItem(null)}
          className="ml-2 text-white/70 hover:text-white font-black text-sm transition-colors cursor-pointer"
        >
          ✕
        </button>
      </div>
    </div>,
    document.body
  );
}
