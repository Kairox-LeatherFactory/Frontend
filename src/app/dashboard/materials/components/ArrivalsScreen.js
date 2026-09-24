'use client';
import { useState, useMemo } from 'react';
import {
  PackageCheck,
  Search,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Barcode,
  Loader2,
  RefreshCw,
  Clock,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Boxes,
  Truck
} from 'lucide-react';
import {
  useGetMaterialArrivalsQuery,
  useCreateLotSheetMutation,
  useCompleteMaterialArrivalMutation,
  useGetMaterialLotsQuery
} from '@/store/slices/materialApiSlice';
import { errMsg } from './shared';

export function ArrivalsScreen({ showToast }) {
  const [selectedArrival, setSelectedArrival] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { data: arrivalsRes, isLoading, refetch } = useGetMaterialArrivalsQuery();
  const rawArrivals = Array.isArray(arrivalsRes) ? arrivalsRes : arrivalsRes?.items || arrivalsRes?.arrivals || [];

  // Sort by recent / descending
  const sortedArrivals = useMemo(() => {
    return [...rawArrivals].sort((a, b) => {
      if (a.created_at && b.created_at) {
        return new Date(b.created_at) - new Date(a.created_at);
      }
      const idA = String(a.receipt_id || a.id || '');
      const idB = String(b.receipt_id || b.id || '');
      return idB.localeCompare(idA);
    });
  }, [rawArrivals]);

  // Counts for status tabs
  const pendingCount = useMemo(() => {
    return rawArrivals.filter((a) => {
      const isCompleted = a.status === 'COMPLETED' || a.status === 'completed' || a.status === 'approved';
      return !isCompleted;
    }).length;
  }, [rawArrivals]);

  const completedCount = useMemo(() => {
    return rawArrivals.filter((a) => {
      const isCompleted = a.status === 'COMPLETED' || a.status === 'completed' || a.status === 'approved';
      return isCompleted;
    }).length;
  }, [rawArrivals]);

  // Filtered by selected tab
  const displayedArrivals = useMemo(() => {
    return sortedArrivals.filter((arrival) => {
      const isCompleted = arrival.status === 'COMPLETED' || arrival.status === 'completed' || arrival.status === 'approved';
      if (statusFilter === 'PENDING') return !isCompleted;
      if (statusFilter === 'COMPLETED') return isCompleted;
      return true; // 'ALL'
    });
  }, [sortedArrivals, statusFilter]);

  if (selectedArrival) {
    return (
      <ArrivalInspectionDetail
        arrival={selectedArrival}
        onBack={() => {
          setSelectedArrival(null);
          refetch();
        }}
        showToast={showToast}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border shadow-sm" style={{ borderColor: 'rgba(200,131,74,0.18)' }}>
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <PackageCheck className="w-6 h-6 text-[#c8834a]" /> Material Arrivals & Receipts
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Recent incoming leather & material lots listed by Article & Colour.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Filter Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 ${
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold">
                {rawArrivals.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 ${
                statusFilter === 'PENDING'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" /> Pending
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                statusFilter === 'PENDING' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-900'
              }`}>
                {pendingCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('COMPLETED')}
              className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 ${
                statusFilter === 'COMPLETED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Completed
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                statusFilter === 'COMPLETED' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-900'
              }`}>
                {completedCount}
              </span>
            </button>
          </div>

          <button
            onClick={() => refetch()}
            className="h-9 px-3.5 rounded-xl font-bold text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 flex items-center gap-1.5 transition-all"
            title="Refresh Arrivals"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* List of Arrival Cards */}
      {isLoading ? (
        <div className="py-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#c8834a] mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-500">Loading material arrivals…</p>
        </div>
      ) : displayedArrivals.length === 0 ? (
        <div className="py-16 text-center bg-white border border-dashed rounded-3xl p-8 space-y-3" style={{ borderColor: 'rgba(200,131,74,0.3)' }}>
          <Boxes className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-black text-slate-700">
            {statusFilter === 'PENDING'
              ? 'No Pending Arrivals Found'
              : statusFilter === 'COMPLETED'
              ? 'No Completed Arrivals Found'
              : 'No Material Arrivals Found'}
          </h3>
          <p className="text-xs text-slate-400 font-medium max-w-md mx-auto">
            {statusFilter === 'PENDING'
              ? 'All incoming arrivals have been inspected and completed.'
              : 'Create a new material arrival from the "Add Material" tab to begin receiving sheets.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedArrivals.map((arrival) => {
            const receiptId = arrival.receipt_id || arrival.id;
            const isCompleted = arrival.status === 'COMPLETED' || arrival.status === 'completed' || arrival.status === 'approved';

            return (
              <div
                key={receiptId}
                onClick={() => setSelectedArrival(arrival)}
                className="bg-white p-5 rounded-2xl border hover:border-[#c8834a] transition-all shadow-sm hover:shadow-md cursor-pointer space-y-4 group relative"
                style={{ borderColor: 'rgba(200,131,74,0.2)' }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      {receiptId}
                    </span>
                    <h4 className="text-base font-black text-slate-800 group-hover:text-[#c8834a] transition-colors mt-1">
                      {arrival.article}
                    </h4>
                  </div>
                  <span
                    className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase border ${
                      isCompleted
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {arrival.status || 'PENDING'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-50/80 p-3 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Colour</span>
                    <span className="font-black text-slate-800">{arrival.colour}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Quantity</span>
                    <span className="font-black text-amber-900">
                      {arrival.total_qty || arrival.qty || 0} {arrival.category === 'LEATHER' || !arrival.category ? 'DCM' : ''}
                    </span>
                  </div>
                  {arrival.sheet_count !== undefined && (
                    <div className="mt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Sheets</span>
                      <span className="font-black text-slate-700">{arrival.sheet_count} Sheets</span>
                    </div>
                  )}
                  {arrival.thickness && (
                    <div className="mt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Thickness</span>
                      <span className="font-black text-slate-700">{arrival.thickness}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px] font-bold text-slate-400">
                  <span>{arrival.created_at ? new Date(arrival.created_at).toLocaleDateString() : 'Recent Arrival'}</span>
                  <span className="text-[#c8834a] group-hover:underline flex items-center gap-1 font-black">
                    {isCompleted ? 'View Sheets →' : 'Enter Sheets & Inspect →'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Detail & Sheet Entry Inspection Screen ──────────────────────────────
function ArrivalInspectionDetail({ arrival, onBack, showToast }) {
  const receiptId = arrival.receipt_id || arrival.id;
  const isAlreadyCompleted = arrival.status === 'COMPLETED' || arrival.status === 'completed' || arrival.status === 'approved';

  const [createLotSheet] = useCreateLotSheetMutation();
  const [completeArrival, { isLoading: isCompleting }] = useCompleteMaterialArrivalMutation();

  const { data: lotsRes } = useGetMaterialLotsQuery({ category: arrival.category || 'LEATHER' });
  const matchingLot = (lotsRes?.lots || []).find(
    (l) => l.lot_id === arrival.lot_id || (l.article === arrival.article && l.colour === arrival.colour)
  );
  const activeLotId = arrival.lot_id || matchingLot?.lot_id || receiptId;

  // Sheets state
  const [sheets, setSheets] = useState(arrival.sheets || []);
  const [currentSheetDcm, setCurrentSheetDcm] = useState('');
  const [totalSheetsCount, setTotalSheetsCount] = useState(arrival.sheet_count || '');
  const [approvedQty, setApprovedQty] = useState(
    arrival.approved_qty !== undefined && arrival.approved_qty !== null
      ? String(arrival.approved_qty)
      : (arrival.declared_qty || arrival.total_qty || '')
  );
  const [rejectedQty, setRejectedQty] = useState(
    arrival.rejected_qty !== undefined && arrival.rejected_qty !== null
      ? String(arrival.rejected_qty)
      : '0'
  );
  const [thickness, setThickness] = useState(arrival.thickness || '0.6MM');
  const [note, setNote] = useState(arrival.note || '');

  const totalSheetsDcm = useMemo(() => {
    return sheets.reduce((sum, s) => sum + (Number(s.dcm) || 0), 0);
  }, [sheets]);

  const targetDcm = (Number(approvedQty) || 0) + (Number(rejectedQty) || 0);
  const isMatching = targetDcm > 0 && Math.abs(totalSheetsDcm - (Number(approvedQty) || 0)) < 0.001;
  const isOver = targetDcm > 0 && totalSheetsDcm > (Number(approvedQty) || targetDcm);
  const progressPercent = (Number(approvedQty) || targetDcm) > 0
    ? Math.min(100, Math.round((totalSheetsDcm / (Number(approvedQty) || targetDcm)) * 100))
    : 0;

  // Add individual sheet handler
  const handleAddSheet = async (e) => {
    if (e) e.preventDefault();
    const dcmVal = parseFloat(currentSheetDcm);
    if (isNaN(dcmVal) || dcmVal <= 0) {
      showToast?.('Please enter a valid DCM value greater than 0', 'error');
      return;
    }

    const nextIndex = sheets.length + 1;
    const newSheet = {
      id: `sheet-${Date.now()}-${nextIndex}`,
      sheetNo: nextIndex,
      dcm: dcmVal,
      barcode: `LOT-${String(activeLotId).slice(0, 8)}-S${String(nextIndex).padStart(2, '0')}`,
    };

    setSheets((prev) => [...prev, newSheet]);
    setCurrentSheetDcm('');

    // Trigger API call POST /api/v1/materials/lots/{lot_id}/sheets if lot_id exists
    if (activeLotId && activeLotId !== receiptId) {
      try {
        await createLotSheet({
          lotId: activeLotId,
          dcm: dcmVal,
          note: null,
        }).unwrap();
      } catch (err) {
        console.warn('Sheet created locally (will complete on batch approval):', err);
      }
    }
  };

  const handleRemoveSheet = (id) => {
    setSheets((prev) => prev.filter((s) => s.id !== id).map((s, idx) => ({ ...s, sheetNo: idx + 1 })));
  };

  // Complete Arrival Handler (POST /materials/arrivals/{receipt_id}/complete)
  const handleCompleteArrival = async () => {
    const appVal = parseFloat(approvedQty) || 0;
    const rejVal = parseFloat(rejectedQty) || 0;

    if (appVal === 0 && rejVal === 0 && totalSheetsDcm === 0) {
      showToast?.('Please enter Approved Qty or Rejected Qty', 'error');
      return;
    }

    try {
      const computedSheetCount = sheets.length > 0
        ? sheets.length
        : (totalSheetsCount ? parseInt(totalSheetsCount, 10) : null);

      const payload = {
        receiptId,
        approved_qty: appVal || totalSheetsDcm,
        rejected_qty: rejVal,
        total_qty: (appVal || totalSheetsDcm) + rejVal,
        sheet_count: computedSheetCount,
        sheets: sheets.map((s) => ({ dcm: Number(s.dcm), note: s.note || null })),
        thickness: thickness || null,
        note: note || (appVal > 0 ? 'Approved upon inspection' : 'Rejected upon inspection'),
      };

      await completeArrival(payload).unwrap();
      showToast?.(
        `Arrival completed successfully! (${payload.approved_qty} DCM approved · ${payload.rejected_qty} DCM rejected)`,
        'success'
      );
      onBack();
    } catch (err) {
      showToast?.(errMsg(err), 'error');
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border space-y-6 max-w-4xl mx-auto animate-fade-in" style={{ borderColor: 'rgba(200,131,74,0.18)' }}>
      {/* Header with Back Button */}
      <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-black text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Arrivals
        </button>

        <div className="text-right">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Receipt ID</span>
          <span className="font-mono text-xs font-bold text-slate-800">{receiptId}</span>
        </div>
      </div>

      {/* Fields (Article, Colour, Thickness, Supplier) - NO TOP DCM FIELD */}
      <div>
        <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Arrival Details</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-black text-slate-700 block mb-1">Article / Material Name *</label>
            <input
              type="text"
              readOnly
              value={arrival.article || ''}
              className="w-full h-10 px-3.5 border rounded-xl text-xs font-bold bg-slate-50 text-slate-800 focus:outline-none"
              style={{ borderColor: 'rgba(200,131,74,0.2)' }}
            />
          </div>

          <div>
            <label className="text-xs font-black text-slate-700 block mb-1">Colour *</label>
            <input
              type="text"
              readOnly
              value={arrival.colour || ''}
              className="w-full h-10 px-3.5 border rounded-xl text-xs font-bold bg-slate-50 text-slate-800 focus:outline-none"
              style={{ borderColor: 'rgba(200,131,74,0.2)' }}
            />
          </div>

          <div>
            <label className="text-xs font-black text-slate-700 block mb-1">Thickness</label>
            <input
              type="text"
              value={thickness}
              disabled={isAlreadyCompleted}
              onChange={(e) => setThickness(e.target.value)}
              placeholder="e.g. 0.6MM"
              className="w-full h-10 px-3.5 border rounded-xl text-xs font-bold bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              style={{ borderColor: 'rgba(200,131,74,0.3)' }}
            />
          </div>

          <div>
            <label className="text-xs font-black text-slate-700 block mb-1">Inspection Note (optional)</label>
            <input
              type="text"
              value={note}
              disabled={isAlreadyCompleted}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Batch quality check passed"
              className="w-full h-10 px-3.5 border rounded-xl text-xs font-bold bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              style={{ borderColor: 'rgba(200,131,74,0.3)' }}
            />
          </div>
        </div>
      </div>

      {/* Sheet-wise DCM Entry */}
      <div className="rounded-2xl border p-5 space-y-4" style={{ background: '#faf7f2', borderColor: 'rgba(200,131,74,0.25)' }}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-700" /> SHEET-WISE DCM ENTRY
            </h3>
            <p className="text-[11px] font-medium text-slate-500 mt-0.5">
              Enter DCM for each incoming leather sheet.
            </p>
          </div>
        </div>

        {/* Input Row: Sheet X | DCM [Input] [+ Add] */}
        {!isAlreadyCompleted && (
          <form onSubmit={handleAddSheet} className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-black text-slate-700 min-w-[100px] shrink-0">
              Sheet {sheets.length + 1} &nbsp;|&nbsp; DCM
            </span>
            <div className="flex-1 min-w-[200px]">
              <input
                type="number"
                step="any"
                placeholder="Enter DCM (e.g. 246)"
                value={currentSheetDcm}
                onChange={(e) => setCurrentSheetDcm(e.target.value)}
                className="w-full h-10 px-3 border rounded-xl text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                style={{ borderColor: 'rgba(200,131,74,0.3)' }}
              />
            </div>
            <button
              type="submit"
              className="h-10 px-5 rounded-xl font-black text-xs uppercase text-white shadow-xs hover:brightness-105 active:scale-[0.98] transition-all flex items-center gap-1.5"
              style={{ background: '#c8834a' }}
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </form>
        )}

        {/* Grid: Left = Sheet list | Right = Clean Summary Box */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start pt-2">
          <div className="md:col-span-7 bg-white rounded-2xl border p-3 shadow-xs space-y-2 max-h-[240px] overflow-y-auto" style={{ borderColor: 'rgba(200,131,74,0.18)' }}>
            {sheets.length === 0 ? (
              <div className="py-7 text-center text-xs font-bold text-slate-400">
                No sheets entered yet. Enter DCM above and click <span className="text-amber-800 font-black">+ Add</span>.
              </div>
            ) : (
              sheets.map((sheet) => (
                <div
                  key={sheet.id || sheet.barcode}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl border bg-slate-50/50 hover:bg-amber-50/40 transition-all text-xs"
                  style={{ borderColor: 'rgba(200,131,74,0.12)' }}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-700 w-16">
                      Sheet {sheet.sheetNo}
                    </span>
                    <span className="font-mono text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {sheet.barcode}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-black text-amber-900">
                      {sheet.dcm} <span className="text-[10px] text-slate-400 font-bold">DCM</span>
                    </span>
                    {!isAlreadyCompleted && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSheet(sheet.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete sheet"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="md:col-span-5 bg-white rounded-2xl border p-4 shadow-xs space-y-3" style={{ borderColor: 'rgba(200,131,74,0.18)' }}>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">TOTAL SHEETS</span>
                <span className="text-xl font-black text-slate-800">{sheets.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">TOTAL DCM</span>
                <span className="text-2xl font-black text-amber-900">
                  {totalSheetsDcm.toLocaleString()} <span className="text-xs text-amber-700">DCM</span>
                </span>
              </div>
            </div>

            <div className="pt-2 border-t" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
              {targetDcm === 0 ? (
                <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                  Enter DCM below to verify target
                </span>
              ) : isMatching ? (
                <span className="text-[11px] font-black text-emerald-700 bg-emerald-100/70 border border-emerald-300 px-2.5 py-1 rounded-lg flex items-center gap-1.5 w-fit">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Matches DCM exactly
                </span>
              ) : isOver ? (
                <span className="text-[11px] font-black text-red-700 bg-red-100/70 border border-red-300 px-2.5 py-1 rounded-lg flex items-center gap-1.5 w-fit">
                  {(totalSheetsDcm - targetDcm).toLocaleString()} DCM over total
                </span>
              ) : (
                <span className="text-[11px] font-black text-amber-800 bg-amber-100/70 border border-amber-300 px-2.5 py-1 rounded-lg flex items-center gap-1.5 w-fit">
                  {(targetDcm - totalSheetsDcm).toLocaleString()} DCM remaining
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Verification Progress Bar */}
        <div className="pt-2">
          <div className="flex items-center justify-between text-xs font-black mb-1.5">
            <span className={isMatching ? 'text-emerald-700 flex items-center gap-1' : 'text-slate-600'}>
              {`${sheets.length} sheets entered (${totalSheetsDcm} / ${targetDcm || 0} DCM)`}
            </span>
            <span className="font-bold text-slate-500 text-[11px]">{progressPercent}%</span>
          </div>

          <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isMatching ? 'bg-emerald-500' : isOver ? 'bg-red-500' : 'bg-amber-600'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Side-by-side: Approved Qty (DCM) & Rejected Qty (DCM) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-black text-slate-700 block mb-1.5">
            Approved Qty (DCM) <span className="font-semibold text-slate-500">— Enter total received DCM *</span>
          </label>
          <input
            type="number"
            step="any"
            disabled={isAlreadyCompleted}
            placeholder="Enter approved DCM (e.g. 10000)"
            value={approvedQty}
            onChange={(e) => setApprovedQty(e.target.value)}
            className="w-full h-11 px-3.5 border rounded-xl text-sm font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            style={{ borderColor: 'rgba(200,131,74,0.3)' }}
          />
        </div>

        <div>
          <label className="text-xs font-black text-slate-700 block mb-1.5">
            Rejected Qty (DCM) <span className="font-semibold text-slate-500">(optional)</span>
          </label>
          <input
            type="number"
            step="any"
            disabled={isAlreadyCompleted}
            placeholder="Enter rejected DCM (e.g. 0)"
            value={rejectedQty}
            onChange={(e) => setRejectedQty(e.target.value)}
            className="w-full h-11 px-3.5 border rounded-xl text-sm font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            style={{ borderColor: 'rgba(200,131,74,0.3)' }}
          />
        </div>
      </div>

      {/* Bottom Action: Complete Inspection (POST /materials/arrivals/{receipt_id}/complete) */}
      {!isAlreadyCompleted ? (
        <div className="pt-2">
          <button
            type="button"
            onClick={handleCompleteArrival}
            disabled={isCompleting || (parseFloat(approvedQty || 0) === 0 && parseFloat(rejectedQty || 0) === 0 && totalSheetsDcm === 0)}
            className="w-full h-12 rounded-2xl font-black text-xs uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-md hover:brightness-105 transition-all"
          >
            {isCompleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 text-white" />}
            Complete Inspection ({parseFloat(approvedQty || totalSheetsDcm || 0)} DCM Approved · {parseFloat(rejectedQty || 0)} DCM Rejected)
          </button>
        </div>
      ) : (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-black flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>This arrival has already been inspected & completed. Stock is available in the Lot Directory.</span>
        </div>
      )}
    </div>
  );
}
