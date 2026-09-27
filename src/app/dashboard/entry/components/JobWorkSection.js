'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Truck,
  PackageCheck,
  Building2,
  AlertTriangle,
  Plus,
  Loader2,
  CheckCircle2,
  Clock,
  DollarSign,
  Search,
  Filter,
  X,
  FileText,
  Boxes,
  Camera,
  Barcode,
} from 'lucide-react';
import { CameraScannerModal } from '../shared';
import {
  useGetJobWorkListQuery,
  useDispatchJobWorkMutation,
  useGetJobWorkVendorsQuery,
  useCreateJobWorkVendorMutation,
  useReceiveJobWorkMutation,
} from '@/store/slices/jobWorkApiSlice';
import { useGetOperationsQuery } from '@/store/slices/clientApiSlice';

const toast = {
  success: (msg) => alert('✅ ' + msg),
  error: (msg) => alert('❌ ' + msg),
};

export default function JobWorkSection() {
  // Filters & Tabs state
  const [statusFilter, setStatusFilter] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [selectedJobForReceive, setSelectedJobForReceive] = useState(null);

  // RTK Query Hooks
  const {
    data: jobList = [],
    isLoading: isJobsLoading,
    isFetching: isJobsFetching,
    refetch: refetchJobs,
  } = useGetJobWorkListQuery({
    status: statusFilter || undefined,
    vendor_id: vendorFilter || undefined,
    overdue: overdueOnly ? true : undefined,
  });

  const { data: vendorsList = [], isLoading: isVendorsLoading } = useGetJobWorkVendorsQuery({
    active_only: true,
  });

  // Calculate Summary Stats
  const stats = useMemo(() => {
    const totalJobs = jobList.length;
    const activeJobs = jobList.filter((j) => {
      const st = (j.status || '').toUpperCase();
      return st !== 'COMPLETED' && st !== 'RETURNED';
    }).length;
    const overdueJobs = jobList.filter((j) => j.overdue).length;
    const totalCost = jobList.reduce((acc, curr) => acc + (parseFloat(curr.cost) || 0), 0);
    const totalPiecesOut = jobList.reduce((acc, curr) => acc + (parseInt(curr.pieces_out) || 0), 0);
    const totalPiecesBack = jobList.reduce((acc, curr) => acc + (parseInt(curr.pieces_back) || 0), 0);

    return { totalJobs, activeJobs, overdueJobs, totalCost, totalPiecesOut, totalPiecesBack };
  }, [jobList]);

  // Filtered jobs by search query
  const filteredJobs = useMemo(() => {
    if (!searchQuery.trim()) return jobList;
    const q = searchQuery.toLowerCase();
    return jobList.filter(
      (j) =>
        (j.vendor && j.vendor.toLowerCase().includes(q)) ||
        (j.stage && j.stage.toLowerCase().includes(q)) ||
        (j.job_id && j.job_id.toLowerCase().includes(q)) ||
        (j.status && j.status.toLowerCase().includes(q))
    );
  }, [jobList, searchQuery]);

  return (
    <div className="w-full space-y-6 animate-fade-in">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-amber-900/10 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2.5">
            <Truck className="w-6 h-6 text-[#c8834a]" />
            Job Work & Outsourcing Ledger
          </h2>
        </div>

        {/* PRIMARY ACTIONS */}
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => setShowVendorModal(true)}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 border border-slate-300/60 cursor-pointer"
          >
            <Building2 className="w-4 h-4 text-slate-600" />
            Manage Vendors
          </button>

          <button
            onClick={() => setShowDispatchModal(true)}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-[#c8834a] hover:bg-[#b0713d] text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Dispatch Job
          </button>
        </div>
      </div>

      {/* STATS SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
            <Boxes className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Active Jobs</p>
            <h3 className="text-xl font-black text-slate-800 mt-0.5">{stats.activeJobs} <span className="text-xs font-semibold text-slate-400">/ {stats.totalJobs} total</span></h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
            <Truck className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Pieces Returned</p>
            <h3 className="text-xl font-black text-slate-800 mt-0.5">{stats.totalPiecesBack} <span className="text-xs font-semibold text-slate-400">Pcs</span></h3>
          </div>
        </div>

        <div className={`p-5 rounded-2xl border shadow-sm flex items-center gap-4 transition-colors ${stats.overdueJobs > 0 ? 'bg-rose-50/60 border-rose-200' : 'bg-white border-slate-200/80'}`}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${stats.overdueJobs > 0 ? 'bg-rose-500/20' : 'bg-emerald-500/10'}`}>
            <AlertTriangle className={`w-6 h-6 ${stats.overdueJobs > 0 ? 'text-rose-600' : 'text-emerald-600'}`} />
          </div>
          <div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Overdue Jobs</p>
            <h3 className={`text-xl font-black mt-0.5 ${stats.overdueJobs > 0 ? 'text-rose-700' : 'text-slate-800'}`}>
              {stats.overdueJobs}
            </h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Total Cost</p>
            <h3 className="text-xl font-black text-slate-800 mt-0.5">₹{stats.totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
          </div>
        </div>
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by vendor, stage, or job ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#c8834a] transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2.5 overflow-x-auto">
          {/* Vendor Filter Dropdown */}
          <select
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#c8834a] transition-all cursor-pointer"
          >
            <option value="">All Vendors</option>
            {vendorsList.map((v) => (
              <option key={v.vendor_id || v.id} value={v.vendor_id || v.id}>
                {v.name}
              </option>
            ))}
          </select>

          {/* Status Filter Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#c8834a] transition-all cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="DISPATCHED">DISPATCHED</option>
            <option value="PARTIAL">PARTIAL</option>
            <option value="RETURNED">RETURNED</option>
            <option value="COMPLETED">COMPLETED</option>
          </select>
        </div>
      </div>

      {/* JOB WORK TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-[11px] font-black tracking-wider border-b border-slate-200">
                <th className="p-4">Vendor</th>
                <th className="p-4">Stage</th>
                <th className="p-4">Dispatched / Expected</th>
                <th className="p-4 text-center">Pieces</th>
                <th className="p-4 text-center">Rejects & Short</th>
                <th className="p-4 text-right">Rate / Pc</th>
                <th className="p-4 text-right">Total Cost</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {isJobsLoading ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#c8834a]" />
                    Loading Job Work Ledger...
                  </td>
                </tr>
              ) : filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400 font-bold bg-slate-50/50">
                    No job work dispatches found. Click "Dispatch Job" to send garments to a vendor.
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => {
                  const piecesOut = parseInt(job.pieces_out) || 0;
                  const piecesBack = parseInt(job.pieces_back) || 0;
                  const piecesRejected = parseInt(job.pieces_rejected) || 0;
                  const piecesShort = parseInt(job.pieces_short) || 0;
                  const totalHandled = piecesBack + piecesRejected + piecesShort;
                  const percentReturned = piecesOut > 0 ? Math.round((piecesBack / piecesOut) * 100) : 0;
                  const statusUpper = (job.status || '').toUpperCase();
                  const isCompleted = statusUpper === 'COMPLETED' || statusUpper === 'RETURNED' || (piecesOut > 0 && totalHandled >= piecesOut);

                  return (
                    <tr key={job.job_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 font-bold text-slate-800">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-amber-700 shrink-0" />
                          <span>{job.vendor || 'Vendor #' + (job.vendor_id?.slice(0, 8) || '')}</span>
                        </div>
                      </td>

                      <td className="p-4 font-black text-amber-800 uppercase tracking-wider">
                        <span className="px-2.5 py-1 bg-amber-50 border border-amber-200/60 rounded-lg">
                          {job.stage || 'N/A'}
                        </span>
                      </td>

                      <td className="p-4 text-slate-600">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-slate-700">Out: {job.dispatched_at ? new Date(job.dispatched_at).toLocaleDateString() : 'N/A'}</span>
                          <span className={`text-[11px] font-bold ${job.overdue ? 'text-rose-600' : 'text-slate-400'}`}>
                            Exp: {job.expected_back || 'N/A'}
                          </span>
                        </div>
                      </td>

                      <td className="p-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-black text-slate-800">
                            {piecesOut > 0 ? `${piecesBack} / ${piecesOut} Pcs` : `${piecesBack} Pcs`}
                          </span>
                          {piecesOut > 0 && (
                            <div className="w-24 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all ${isCompleted ? 'bg-emerald-500' : 'bg-[#c8834a]'}`}
                                style={{ width: `${Math.min(percentReturned, 100)}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="p-4 text-center">
                        {job.pieces_rejected > 0 || job.pieces_short > 0 ? (
                          <div className="flex items-center justify-center gap-2 text-[11px] font-bold">
                            {job.pieces_rejected > 0 && <span className="text-rose-600 font-black">Rej: {job.pieces_rejected}</span>}
                            {job.pieces_short > 0 && <span className="text-amber-600 font-black">Short: {job.pieces_short}</span>}
                          </div>
                        ) : (
                          <span className="text-slate-300 font-bold">-</span>
                        )}
                      </td>

                      <td className="p-4 text-right font-bold text-slate-700">
                        {job.rate_per_piece ? `₹${parseFloat(job.rate_per_piece).toFixed(2)}` : '-'}
                      </td>

                      <td className="p-4 text-right font-black text-slate-900">
                        {job.cost ? `₹${parseFloat(job.cost).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                      </td>

                      <td className="p-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase border ${isCompleted
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                            {job.status || 'DISPATCHED'}
                          </span>
                          {job.overdue && (
                            <span className="px-2 py-0.5 rounded text-[9px] font-black bg-rose-100 text-rose-700 uppercase tracking-widest flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" /> OVERDUE
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-4 text-center">
                        <button
                          onClick={() => {
                            setSelectedJobForReceive(job);
                            setShowReceiveModal(true);
                          }}
                          disabled={isCompleted}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-xl transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 mx-auto"
                        >
                          <PackageCheck className="w-3.5 h-3.5" />
                          Receive
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DISPATCH JOB MODAL */}
      {showDispatchModal && (
        <DispatchJobModal
          vendorsList={vendorsList}
          onClose={() => setShowDispatchModal(false)}
          onSuccess={() => {
            setShowDispatchModal(false);
            refetchJobs();
          }}
        />
      )}

      {/* RECEIVE JOB MODAL */}
      {showReceiveModal && selectedJobForReceive && (
        <ReceiveJobModal
          job={selectedJobForReceive}
          onClose={() => {
            setShowReceiveModal(false);
            setSelectedJobForReceive(null);
          }}
          onSuccess={() => {
            setShowReceiveModal(false);
            setSelectedJobForReceive(null);
            refetchJobs();
          }}
        />
      )}

      {/* MANAGE VENDORS MODAL */}
      {showVendorModal && (
        <VendorManagementModal
          vendorsList={vendorsList}
          onClose={() => setShowVendorModal(false)}
        />
      )}
    </div>
  );
}

// ==========================================
// 1. DISPATCH JOB MODAL COMPONENT
// ==========================================
function DispatchJobModal({ vendorsList, onClose, onSuccess }) {
  const [dispatchMutation, { isLoading }] = useDispatchJobWorkMutation();
  const { data: operationsData } = useGetOperationsQuery();

  const operationsList = useMemo(() => {
    if (Array.isArray(operationsData) && operationsData.length > 0) {
      return operationsData.map((op) => ({
        code: typeof op === 'string' ? op : (op.code || op.label || op.name),
        label: typeof op === 'string' ? op : (op.label || op.name || op.code),
      })).filter((op) => op.code && op.label);
    }
    return [
      { code: 'LEATHER_CUTTING', label: 'Leather Cutting' },
      { code: 'LINING_CUTTING', label: 'Lining Cutting' },
      { code: 'FUSING', label: 'Fusing' },
      { code: 'PASTING', label: 'Pasting' },
      { code: 'LINE_STITCHING', label: 'Line Stitching' },
      { code: 'SHELL_STITCHING', label: 'Shell Stitching' },
      { code: 'FINAL_FINISH', label: 'Final Finish' },
      { code: 'FINAL_INSPECTION', label: 'Final Inspection' },
      { code: 'PACKAGE_EXPORT', label: 'Package Export' },
    ];
  }, [operationsData]);

  const [vendorId, setVendorId] = useState('');
  const [stage, setStage] = useState(operationsList[0]?.code || 'LINE_STITCHING');
  const [pieceIdsText, setPieceIdsText] = useState('');
  const [scannedBarcodeInput, setScannedBarcodeInput] = useState('');
  const [showCameraScan, setShowCameraScan] = useState(false);
  const gunScanInputRef = useRef(null);

  const [expectedBack, setExpectedBack] = useState('');
  const [ratePerPiece, setRatePerPiece] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (gunScanInputRef.current) {
      gunScanInputRef.current.focus();
    }
  }, []);

  const handleAppendPieceId = (code) => {
    const clean = String(code || '').trim();
    if (!clean) return;
    setPieceIdsText((prev) => {
      const existing = prev.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
      if (existing.includes(clean)) return prev;
      return prev ? `${prev}\n${clean}` : clean;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!vendorId) {
      toast.error('Please select a vendor');
      return;
    }
    if (!stage.trim()) {
      toast.error('Please enter a stage');
      return;
    }

    const pieceIds = pieceIdsText
      .split(/[\n,]+/)
      .map((id) => id.trim())
      .filter(Boolean);

    const payload = {
      vendor_id: vendorId,
      stage: stage.trim(),
      piece_ids: pieceIds.length > 0 ? pieceIds : undefined,
      expected_back: expectedBack || null,
      rate_per_piece: ratePerPiece ? parseFloat(ratePerPiece) : null,
      currency: currency || 'INR',
      note: note.trim() || null,
    };

    try {
      await dispatchMutation(payload).unwrap();
      toast.success('Job Work Dispatched successfully!');
      onSuccess();
    } catch (err) {
      toast.error(err?.data?.detail || err?.data?.message || 'Failed to dispatch jobwork');
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-5">
        <div className="flex items-center justify-between border-b pb-4 border-slate-100">
          <h3 className="text-base font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Truck className="w-5 h-5 text-[#c8834a]" /> Dispatch Garments to Vendor
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block mb-1">
              Vendor *
            </label>
            <select
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              required
              className="w-full h-11 px-3.5 text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#c8834a] focus:bg-white transition-all cursor-pointer"
            >
              <option value="">-- Select Vendor --</option>
              {vendorsList.map((v) => (
                <option key={v.vendor_id || v.id} value={v.vendor_id || v.id}>
                  {v.name} {v.contact ? `(${v.contact})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block mb-1">
              Stage *
            </label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              required
              className="w-full h-11 px-3.5 text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#c8834a] focus:bg-white transition-all cursor-pointer"
            >
              <option value="">-- Select Stage --</option>
              {operationsList.map((op) => (
                <option key={op.code} value={op.code}>
                  {op.label}
                </option>
              ))}
            </select>
          </div>

          {/* BARCODE GUN SCANNER & CAMERA TRIGGER */}
          <div className="relative">
            <input
              ref={gunScanInputRef}
              type="text"
              value={scannedBarcodeInput}
              onChange={(e) => setScannedBarcodeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const code = scannedBarcodeInput.trim();
                  if (code) {
                    handleAppendPieceId(code);
                    setScannedBarcodeInput('');
                  }
                }
              }}
              placeholder="Point Barcode Gun & Scan Piece ID / Barcode..."
              className="w-full h-11 pl-10 pr-24 text-xs font-black bg-amber-50/60 border-2 border-amber-300 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#c8834a] transition-all"
            />
            <Barcode className="w-4 h-4 text-amber-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <button
              type="button"
              onClick={() => setShowCameraScan(true)}
              title="Scan with Camera"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[#c8834a] hover:bg-[#b0713d] text-white rounded-lg transition-colors flex items-center justify-center cursor-pointer shadow-sm"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          <div>
            <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block mb-1">
              Piece IDs
            </label>
            <textarea
              value={pieceIdsText}
              onChange={(e) => setPieceIdsText(e.target.value)}
              placeholder="Scanned piece IDs will appear here automatically..."
              rows={3}
              className="w-full p-3 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#c8834a] focus:bg-white transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block mb-1">
                Expected Back Date
              </label>
              <input
                type="date"
                value={expectedBack}
                onChange={(e) => setExpectedBack(e.target.value)}
                className="w-full h-11 px-3 text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#c8834a] transition-all"
              />
            </div>

            <div>
              <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block mb-1">
                Rate / Piece (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={ratePerPiece}
                onChange={(e) => setRatePerPiece(e.target.value)}
                placeholder="e.g. 250.00"
                className="w-full h-11 px-3 text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#c8834a] transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block mb-1">
              Note
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note for vendor..."
              className="w-full h-11 px-3.5 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#c8834a] transition-all"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#c8834a] hover:bg-[#b0713d] transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
              Dispatch Now
            </button>
          </div>
        </form>

        {/* MOBILE CAMERA SCANNER MODAL */}
        {showCameraScan && (
          <CameraScannerModal
            title="Scan Piece Barcode for Dispatch"
            onClose={() => setShowCameraScan(false)}
            onScan={(code) => {
              handleAppendPieceId(code);
            }}
          />
        )}
      </div>
    </div>,
    document.body
  );
}

// ==========================================
// 2. RECEIVE JOB MODAL COMPONENT
// ==========================================
function ReceiveJobModal({ job, onClose, onSuccess }) {
  const [receiveMutation, { isLoading }] = useReceiveJobWorkMutation();

  const [returnedPieceIds, setReturnedPieceIds] = useState('');
  const [rejectedPieceIds, setRejectedPieceIds] = useState('');
  const [shortPieceIds, setShortPieceIds] = useState('');
  const [workDate, setWorkDate] = useState(new Date().toISOString().slice(0, 10));

  const [scannedBarcodeInput, setScannedBarcodeInput] = useState('');
  const [showCameraScan, setShowCameraScan] = useState(false);
  const gunScanInputRef = useRef(null);

  useEffect(() => {
    if (gunScanInputRef.current) {
      gunScanInputRef.current.focus();
    }
  }, []);

  const handleAppendPieceId = (code) => {
    const clean = String(code || '').trim();
    if (!clean) return;
    setReturnedPieceIds((prev) => {
      const existing = prev.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
      if (existing.includes(clean)) return prev;
      return prev ? `${prev}\n${clean}` : clean;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const parseIds = (text) =>
      text
        .split(/[\n,]+/)
        .map((id) => id.trim())
        .filter(Boolean);

    const payload = {
      piece_ids: parseIds(returnedPieceIds),
      rejected_ids: parseIds(rejectedPieceIds),
      short_ids: parseIds(shortPieceIds),
      work_date: workDate || null,
    };

    try {
      await receiveMutation({ job_id: job.job_id, payload }).unwrap();
      toast.success('Garments received & vendor stage logged!');
      onSuccess();
    } catch (err) {
      toast.error(err?.data?.detail || err?.data?.message || 'Failed to receive garments');
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-5">
        <div className="flex items-center justify-between border-b pb-4 border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-emerald-600" /> Book Garments Back In
            </h3>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              Vendor: <span className="text-slate-800 font-bold">{job.vendor || job.vendor_id}</span> | Stage: <span className="text-amber-700 font-bold uppercase">{job.stage}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* BARCODE GUN SCANNER & CAMERA TRIGGER */}
          <div className="relative">
            <input
              ref={gunScanInputRef}
              type="text"
              value={scannedBarcodeInput}
              onChange={(e) => setScannedBarcodeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const code = scannedBarcodeInput.trim();
                  if (code) {
                    handleAppendPieceId(code);
                    setScannedBarcodeInput('');
                  }
                }
              }}
              placeholder="Point Barcode Gun & Scan Returned Piece ID..."
              className="w-full h-11 pl-10 pr-24 text-xs font-black bg-emerald-50/60 border-2 border-emerald-300 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all"
            />
            <Barcode className="w-4 h-4 text-emerald-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <button
              type="button"
              onClick={() => setShowCameraScan(true)}
              title="Scan with Camera"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center justify-center cursor-pointer shadow-sm"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          <div>
            <label className="text-[11px] font-black text-emerald-700 uppercase tracking-wider block mb-1">
              Returned Piece IDs
            </label>
            <textarea
              value={returnedPieceIds}
              onChange={(e) => setReturnedPieceIds(e.target.value)}
              placeholder="Paste Piece UUIDs returned in good condition..."
              rows={3}
              className="w-full p-3 text-xs font-semibold bg-emerald-50/50 border border-emerald-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all resize-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-black text-rose-700 uppercase tracking-wider block mb-1">
              Rejected Piece IDs
            </label>
            <textarea
              value={rejectedPieceIds}
              onChange={(e) => setRejectedPieceIds(e.target.value)}
              placeholder="Paste Piece UUIDs rejected..."
              rows={2}
              className="w-full p-3 text-xs font-semibold bg-rose-50/50 border border-rose-300 rounded-xl outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all resize-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-black text-amber-700 uppercase tracking-wider block mb-1">
              Shortage Piece IDs
            </label>
            <textarea
              value={shortPieceIds}
              onChange={(e) => setShortPieceIds(e.target.value)}
              placeholder="Paste Piece UUIDs missing..."
              rows={2}
              className="w-full p-3 text-xs font-semibold bg-amber-50/50 border border-amber-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all resize-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block mb-1">
              Work Date
            </label>
            <input
              type="date"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
              className="w-full h-11 px-3.5 text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />}
              Confirm Receive
            </button>
          </div>
        </form>

        {/* MOBILE CAMERA SCANNER MODAL */}
        {showCameraScan && (
          <CameraScannerModal
            title="Scan Returned Piece Barcode"
            onClose={() => setShowCameraScan(false)}
            onScan={(code) => {
              handleAppendPieceId(code);
            }}
          />
        )}
      </div>
    </div>,
    document.body
  );
}

// ==========================================
// 3. VENDOR MANAGEMENT MODAL COMPONENT
// ==========================================
function VendorManagementModal({ vendorsList, onClose }) {
  const [createVendor, { isLoading }] = useCreateJobWorkVendorMutation();

  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [note, setNote] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Vendor name is required');
      return;
    }

    try {
      await createVendor({
        name: name.trim(),
        contact: contact.trim() || null,
        note: note.trim() || null,
      }).unwrap();
      toast.success('Vendor registered successfully!');
      setName('');
      setContact('');
      setNote('');
    } catch (err) {
      toast.error(err?.data?.detail || err?.data?.message || 'Failed to register vendor');
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl p-6 space-y-6">
        <div className="flex items-center justify-between border-b pb-4 border-slate-100">
          <h3 className="text-base font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-5 h-5 text-slate-700" /> External Factories & Vendor Directory
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        {/* REGISTER NEW VENDOR FORM */}
        <form onSubmit={handleCreate} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
          <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Register New Outside Factory</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Factory Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-10 px-3 text-xs font-bold bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#c8834a]"
            />
            <input
              type="text"
              placeholder="Phone / Contact Info"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className="h-10 px-3 text-xs font-semibold bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#c8834a]"
            />
            <input
              type="text"
              placeholder="Specialization / Note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-10 px-3 text-xs font-semibold bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-[#c8834a]"
            />
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all shadow-sm disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Register Vendor
            </button>
          </div>
        </form>

        {/* VENDORS LIST TABLE */}
        <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-100 text-slate-500 uppercase text-[10px] font-black sticky top-0">
              <tr>
                <th className="p-3">Vendor Name</th>
                <th className="p-3">Contact</th>
                <th className="p-3">Note</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {vendorsList.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-400">
                    No registered vendors yet.
                  </td>
                </tr>
              ) : (
                vendorsList.map((v) => (
                  <tr key={v.vendor_id || v.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-800">{v.name}</td>
                    <td className="p-3">{v.contact || '-'}</td>
                    <td className="p-3 text-slate-500">{v.note || '-'}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${v.is_active !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                        {v.is_active !== false ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>,
    document.body
  );
}
