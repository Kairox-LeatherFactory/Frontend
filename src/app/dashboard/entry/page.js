'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { apiImportPreview, apiImportCommit } from '@/lib/api';
import { Lock, CheckCircle2, XCircle, Rocket, ScanBarcode, Ruler, Scissors, Plus, Calendar, FileBox, Users, FileSpreadsheet, X, Upload, Loader2, Info } from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';

function DynamicDataViewer({ data }) {
  if (!data) return null;

  if (Array.isArray(data)) {
    if (data.length === 0) return <div className="text-slate-400 italic">Empty list</div>;
    // Check if it's an array of objects to render as a table
    if (typeof data[0] === 'object' && data[0] !== null) {
      const keys = Array.from(new Set(data.flatMap(Object.keys)));
      return (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-left text-sm whitespace-nowrap bg-white">
            <thead className="bg-slate-50 text-slate-600 font-bold text-xs uppercase tracking-wider">
              <tr>
                {keys.map(k => <th key={k} className="px-4 py-3 border-b border-slate-200">{k.replace(/_/g, ' ')}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  {keys.map(k => (
                    <td key={k} className="px-4 py-2 text-slate-700">
                      {typeof row[k] === 'object' ? JSON.stringify(row[k]) : String(row[k] ?? '-')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    // Simple array
    return (
      <ul className="list-disc pl-5 space-y-1 text-slate-700">
        {data.map((item, i) => <li key={i}>{String(item)}</li>)}
      </ul>
    );
  }

  if (typeof data === 'object' && data !== null) {
    return (
      <div className="space-y-6">
        {Object.entries(data).map(([key, val]) => (
          <div key={key} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <h4 className="text-md font-black text-slate-800 mb-3 capitalize flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              {key.replace(/_/g, ' ')}
            </h4>
            <DynamicDataViewer data={val} />
          </div>
        ))}
      </div>
    );
  }

  return <span className="text-slate-700 font-medium">{String(data)}</span>;
}


export default function ProductionLogEntry() {
  const { user, token, ROLE_OPERATIONS } = useAuth();
  const { orders, workers, addEvent } = useData();

  // Role operational permissions — memoized: only recomputes when user role changes
  const allowedOperations = useMemo(
    () => ROLE_OPERATIONS[user] || [],
    [user, ROLE_OPERATIONS]
  );
  const isReadOnly = useMemo(() => allowedOperations.length === 0, [allowedOperations]);

  // Form State
  const [orderId, setOrderId] = useState('');
  const [operation, setOperation] = useState(allowedOperations[0] || '');
  const [workerId, setWorkerId] = useState('');
  const [size, setSize] = useState('M');
  const [qty, setQty] = useState('');
  const [garmentId, setGarmentId] = useState('');
  const [bundleId, setBundleId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  // Auto-select first order and worker once backend data loads
  useEffect(() => {
    if (!orderId && orders.length > 0) setOrderId(orders[0].id);
  }, [orders, orderId]);

  useEffect(() => {
    if (!workerId && workers.length > 0) setWorkerId(workers[0].id);
  }, [workers, workerId]);

  // Alert Success banner state
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // ─── Excel Upload States ───
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [commitLoading, setCommitLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [commitSuccess, setCommitSuccess] = useState('');
  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setSelectedFile(file);
    setUploadError('');
    setCommitSuccess('');
    setUploadLoading(true);

    try {
      const data = await apiImportPreview(token, file);
      setPreviewData(data);
      setShowPreviewModal(true);
    } catch (err) {
      setUploadError(`Preview failed: ${err.message}`);
    } finally {
      setUploadLoading(false);
      e.target.value = null;
    }
  };

  const handleCommit = async () => {
    if (!selectedFile) return;
    setCommitLoading(true);
    setUploadError('');
    try {
      await apiImportCommit(token, selectedFile);
      setCommitSuccess('Import committed successfully! Data has been saved to the database.');
      setShowPreviewModal(false);
    } catch (err) {
      setUploadError(`Commit failed: ${err.message}`);
    } finally {
      setCommitLoading(false);
    }
  };

  // Handle selected order details — memoized: .find() only reruns when orderId or orders change
  const selectedOrder = useMemo(() => {
    return orders.find((o) => o.id === orderId);
  }, [orders, orderId]);

  // Update default size when order changes
  useEffect(() => {
    if (selectedOrder?.sizes?.length && !selectedOrder.sizes.includes(size)) {
      setSize(selectedOrder.sizes[0]);
    }
  }, [selectedOrder, size]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (isReadOnly) {
      setErrorMsg('Unauthorized: Your active role profile is restricted to read-only viewing.');
      return;
    }

    if (!orderId || !operation || !workerId || !qty || !size || !date) {
      setErrorMsg('Please ensure all required shop floor logging fields are completed.');
      return;
    }

    const parsedQty = parseInt(qty, 10);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      setErrorMsg('Operation logging aborted. Quantity logged must be a valid positive integer.');
      return;
    }

    // Prepare event data
    const newEvent = {
      order_id: orderId,
      style: selectedOrder?.style || 'CARNABY',
      colorway: selectedOrder?.colorway || 'Black',
      size,
      worker_id: workerId,
      operation,
      qty: parsedQty,
      date,
      garment_id: garmentId.trim() || null,
    };

    try {
      await addEvent(newEvent);

      // Reset quantity and garment ID, show success
      setQty('');
      setGarmentId('');
      setSuccessMsg(`Successfully registered ${parsedQty} pieces for ${operation} (Order ${orderId})! All dashboards have been recomputed dynamically.`);
    } catch (err) {
      setErrorMsg(`Failed to submit event: ${err.message}`);
    }
  };

  // If the user has a viewer role, display permission error
  if (isReadOnly) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in pt-12 text-center">
        <div className="card p-8 bg-white border border-red-100 shadow-xl space-y-4">
          <Lock className="w-14 h-14 text-red-400 mx-auto" />
          <h1 className="text-2xl font-black text-slate-800">Access Restricted</h1>
          <p className="text-slate-500 font-medium">
            Your active persona (<strong className="text-slate-700">Auditor / Viewer</strong>) does not have write access to the shop floor ledger.
          </p>
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-xs text-red-800 font-bold">
            Switch your profile in the top-bar header to Direct Manager, Cutting Manager, or Stitching Manager to log pieces.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">

      {/* ─── TITLE SECTION ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: '#2d1f0e' }}>Shop Floor Production Logger</h1>
          <p className="font-medium mt-1" style={{ color: '#9a7a5a' }}>Record work bundles completed by operators. Touch-friendly screens optimized for fast, accurate floor entry.</p>
        </div>
        {/* ─── UPLOAD FILE BUTTON ─── */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
            className="hidden"
            id="entry-file-upload"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadLoading}
            className="h-12 py-0 px-5 flex items-center gap-2 font-bold text-sm rounded-xl transition-all active:scale-95 disabled:opacity-50"
            style={{
              background: 'transparent',
              border: '1px solid #c8834a',
              color: '#c8834a'
            }}
          >
            {uploadLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Previewing...</>
            ) : (
              <><FileSpreadsheet className="w-4 h-4" /> Upload File</>
            )}
          </button>
        </div>
      </div>

      {/* ─── ALERT BANNERS ─── */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl font-bold text-sm shadow-md animate-fade-in flex items-start gap-2.5">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-extrabold">Shop Floor Transaction Confirmed</p>
            <p className="text-xs text-emerald-600 mt-0.5">{successMsg}</p>
          </div>
        </div>
      )}

      {commitSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl font-bold text-sm shadow-md animate-fade-in flex items-start gap-2.5">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-extrabold">Excel Import Successful</p>
            <p className="text-xs text-emerald-600 mt-0.5">{commitSuccess}</p>
          </div>
        </div>
      )}

      {(errorMsg || uploadError) && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl font-bold text-sm shadow-md animate-fade-in flex items-start gap-2.5">
          <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-extrabold">Operation Log Refused</p>
            <p className="text-xs text-red-600 mt-0.5">{errorMsg || uploadError}</p>
          </div>
        </div>
      )}

      {/* ─── LOGGING FORM CARD ─── */}
      <SpotlightCard className="p-8 bg-white shadow-xl space-y-8 rounded-3xl" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.06)">

        {/* Helper context showing details about the active logging environment */}
        <div className="p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.2)' }}>
          <div className="text-xs font-bold" style={{ color: '#4a3a2a' }}>
            <span>Logged By: </span>
            <span className="text-white px-2 py-0.5 rounded font-black uppercase tracking-wider" style={{ background: '#c8834a' }}>{user.replace('_', ' ')}</span>
          </div>
          {selectedOrder && (
            <div className="text-xs font-semibold" style={{ color: '#4a3a2a' }}>
              Style Tracked: <strong className="font-black" style={{ color: '#2d1f0e' }}>{selectedOrder.style} ({selectedOrder.colorway})</strong> • Qty target: {selectedOrder.quantity}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* STEP 1: Core Selection */}
          <div className="space-y-6 p-6 rounded-2xl shadow-sm relative overflow-hidden" style={{ background: '#fcfaf8', border: '1px solid rgba(200,131,74,0.1)' }}>
            <div className="absolute top-0 left-0 w-1 h-full" style={{ background: '#c8834a' }}></div>
            <h3 className="text-sm font-black uppercase tracking-widest pb-3 flex items-center gap-2" style={{ color: '#2d1f0e', borderBottom: '1px solid rgba(200,131,74,0.1)' }}>
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs" style={{ background: 'rgba(200,131,74,0.15)', color: '#c8834a' }}>1</span>
              Order & Worker Selection
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Bundle ID Submit Row */}
              <div className="md:col-span-2 flex flex-col gap-2 pb-4 border-b border-slate-100">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <FileBox className="w-4 h-4 text-violet-500" /> Track via Bundle ID
                </label>
                <div className="flex items-stretch gap-3">
                  <input
                    type="text"
                    id="bundle-id-input"
                    placeholder="Enter Bundle ID"
                    value={bundleId}
                    onChange={(e) => setBundleId(e.target.value)}
                    className="input-field flex-1 h-14 bg-white font-black text-lg border-2 border-slate-200 shadow-sm focus:border-violet-400 transition-all"
                  />
                  <button
                    type="button"
                    className="h-14 px-8 font-black text-sm rounded-xl border-2 transition-all active:scale-95 shadow-sm"
                    style={{ background: 'rgba(139,92,246,0.1)', border: '2px solid rgba(139,92,246,0.3)', color: '#7c3aed' }}
                  >
                    Submit BundleId
                  </button>
                </div>
              </div>

              {/* Order Selection */}
              <div className="flex flex-col gap-2">
                <label htmlFor="order-select" className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <FileBox className="w-4 h-4 text-blue-500" /> Select Client Order / PO *
                </label>
                <select
                  id="order-select"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="input-field h-14 bg-white font-bold border-2 border-slate-200 focus:border-blue-500 cursor-pointer shadow-sm text-sm transition-all"
                  required
                >
                  <option value="" disabled>-- Select Order --</option>
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.id} — {o.client} ({o.style})
                    </option>
                  ))}
                </select>
              </div>

              {/* Worker Selection */}
              <div className="flex flex-col gap-2">
                <label htmlFor="worker-select" className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-500" /> Assigned Worker / Operator *
                </label>
                <select
                  id="worker-select"
                  value={workerId}
                  onChange={(e) => setWorkerId(e.target.value)}
                  className="input-field h-14 bg-white font-bold border-2 border-slate-200 focus:border-blue-500 cursor-pointer shadow-sm text-sm transition-all"
                  required
                >
                  <option value="" disabled>-- Select Worker --</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.id} — {w.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* STEP 2: Operation & Size (Visual Cards) */}
          <div className="space-y-6 p-6 rounded-2xl shadow-sm relative overflow-hidden" style={{ background: '#fcfaf8', border: '1px solid rgba(200,131,74,0.1)' }}>
            <div className="absolute top-0 left-0 w-1 h-full" style={{ background: '#c8834a' }}></div>
            <h3 className="text-sm font-black uppercase tracking-widest pb-3 flex items-center gap-2" style={{ color: '#2d1f0e', borderBottom: '1px solid rgba(200,131,74,0.1)' }}>
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs" style={{ background: 'rgba(200,131,74,0.15)', color: '#c8834a' }}>2</span>
              Garment Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">

              {/* Size Pill Buttons */}
              <div className="flex flex-col gap-3">
                <label className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5" style={{ color: '#4a3a2a' }}>
                  <Ruler className="w-4 h-4" style={{ color: '#c8834a' }} /> Garment Size *
                </label>
                <div className="flex flex-wrap gap-2">
                  {(selectedOrder?.sizes?.length ? selectedOrder.sizes : ['S', 'M', 'L', 'XL']).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSize(String(s))}
                      className={`min-w-[3rem] h-11 px-3 text-sm font-black rounded-xl border-2 transition-all cursor-pointer ${String(size) === String(s) ? 'bg-[#c8834a] border-[#c8834a] text-white shadow-md scale-105' : 'bg-white border-[#c8834a]/20 text-[#9a7a5a] hover:border-[#c8834a] hover:text-[#c8834a] hover:bg-[#c8834a]/5 shadow-sm'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Operation Pill Buttons */}
              <div className="flex flex-col gap-3">
                <label className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5" style={{ color: '#4a3a2a' }}>
                  <Scissors className="w-4 h-4" style={{ color: '#c8834a' }} /> Operation Stage *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 min-h-[56px]">
                  {allowedOperations.map((op) => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => setOperation(op)}
                      className={`py-3 px-2 text-xs font-black rounded-xl border-2 transition-all cursor-pointer ${operation === op ? 'bg-[#c8834a] border-[#c8834a] text-white shadow-md scale-105' : 'bg-white border-[#c8834a]/20 text-[#9a7a5a] hover:border-[#c8834a] hover:text-[#c8834a] hover:bg-[#c8834a]/5 shadow-sm'}`}
                    >
                      {op}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* STEP 3: Quantity & Logging */}
          <div className="space-y-6 p-6 rounded-2xl shadow-sm relative overflow-hidden" style={{ background: '#fcfaf8', border: '1px solid rgba(200,131,74,0.1)' }}>
            <div className="absolute top-0 left-0 w-1 h-full" style={{ background: '#c8834a' }}></div>
            <h3 className="text-sm font-black uppercase tracking-widest pb-3 flex items-center gap-2" style={{ color: '#2d1f0e', borderBottom: '1px solid rgba(200,131,74,0.1)' }}>
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs" style={{ background: 'rgba(200,131,74,0.15)', color: '#c8834a' }}>3</span>
              Quantities & Submission
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">

              {/* Quantity Input with Quick Add Buttons */}
              <div className="flex flex-col gap-3 md:col-span-2">
                <label htmlFor="qty-input" className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-emerald-500" /> Quantity Completed (Pieces) *
                </label>
                <div className="flex flex-col sm:flex-row items-stretch gap-4">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      id="qty-input"
                      placeholder="0"
                      value={qty}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setQty(val);
                      }}
                      className="input-field w-full h-14 pl-12 bg-white font-black text-2xl text-emerald-700 border-2 border-slate-200 focus:border-emerald-500 shadow-sm transition-all"
                      required
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 font-bold text-xl">

                    </span>
                  </div>
                  <div className="flex gap-2 w-1/4">
                    <button
                      type="button"
                      onClick={() => setQty('')}
                      className="flex-1 h-14 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-black text-sm rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>

              {/* Date Selector Row */}
              <div className="flex flex-col gap-2">
                <label htmlFor="date-input" className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-500" /> Transaction Date *
                </label>
                <input
                  type="date"
                  id="date-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="input-field h-14 bg-white font-bold border-2 border-slate-200 shadow-sm"
                  required
                />
              </div>

              {/* Optional Garment Tracing barcode */}
              <div className="flex flex-col gap-2">
                <label htmlFor="garment-id-input" className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <ScanBarcode className="w-4 h-4 text-emerald-500" /> Garment ID / Barcode
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="garment-id-input"
                    placeholder="Scan or type (Optional)"
                    value={garmentId}
                    onChange={(e) => setGarmentId(e.target.value)}
                    className="input-field w-full h-14 pl-12 bg-white font-semibold border-2 border-slate-200 shadow-sm focus:border-emerald-500"
                  />
                  <ScanBarcode className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                </div>
              </div>


            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-end">
            <button
              type="button"
              onClick={() => {
                setQty('');
                setGarmentId('');
                setSize('M');
              }}
              className="h-14 font-bold rounded-xl text-base px-8 transition-all"
              style={{ background: 'rgba(200,131,74,0.1)', color: '#c8834a' }}
            >
              Reset All
            </button>
            <button
              type="submit"
              className="h-14 font-black rounded-xl text-base px-10 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)', color: '#0f0a06' }}
            >
              <Rocket className="w-5 h-5" /> Submit Event
            </button>
          </div>

        </form>

      </SpotlightCard>

      {/* ─── EXCEL PREVIEW MODAL ─── */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-black text-slate-950 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  Excel Import Preview
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  File: {fileName} — Review before importing to database
                </p>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-auto bg-slate-50 flex-1 text-sm">
              {previewData ? (
                <DynamicDataViewer data={previewData} />
              ) : (
                <div className="text-center py-12 text-slate-500 font-bold">No preview data available.</div>
              )}
              {uploadError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl">
                  {uploadError}
                </div>
              )}
            </div>

            <div className="flex gap-3 p-6 border-t border-slate-100 bg-white rounded-b-2xl">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="py-3 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCommit}
                disabled={commitLoading}
                className="py-3 px-6 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                {commitLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Importing...</>
                ) : (
                  <><Upload className="w-4 h-4" /> Confirm & Import to Database</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
