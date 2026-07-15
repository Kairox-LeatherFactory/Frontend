'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { apiImportPreview, apiImportCommit, apiGetSkus } from '@/lib/api';
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
  const { orders, workers, addScanEvent } = useData();

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
  const [skuCode, setSkuCode] = useState('');
  const [pieceSeqs, setPieceSeqs] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [fetchedSkus, setFetchedSkus] = useState([]);

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
  const [showOrderNumModal, setShowOrderNumModal] = useState(false);
  const [uploadOrderNumber, setUploadOrderNumber] = useState('');
  const [uploadOrderNumberError, setUploadOrderNumberError] = useState('');
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
    setUploadOrderNumberError('');
    setCommitSuccess('');
    setUploadLoading(true);
    setShowOrderNumModal(false);

    try {
      const data = await apiImportPreview(token, file, uploadOrderNumber.trim());
      setPreviewData(data);
      setShowPreviewModal(true);
    } catch (err) {
      if (err.status === 404 || err.message?.includes('404') || err.message?.toLowerCase().includes('not found')) {
        setUploadOrderNumberError(`Order number "${uploadOrderNumber.trim()}" not found. Verify with the client record.`);
        setShowOrderNumModal(true); // re-open so user can fix it
      } else {
        setUploadError(`Preview failed: ${err.message}`);
      }
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
      const result = await apiImportCommit(token, selectedFile, uploadOrderNumber.trim());
      const orderNum = result?.written?.order_number || uploadOrderNumber.trim();
      const styles = result?.written?.styles ?? '';
      const skus = result?.written?.skus_created ?? '';
      setCommitSuccess(`Imported${styles ? ` ${styles} styles,` : ''} ${skus ? `${skus} new SKUs` : 'data'} into order ${orderNum}. Opening Orders Explorer to verify.`);
      setShowPreviewModal(false);
      setUploadOrderNumber('');
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

  // Fetch SKUs when order changes
  useEffect(() => {
    let active = true;
    if (selectedOrder?.style_id) {
      apiGetSkus(token, null, selectedOrder.style_id).then(skus => {
        if (active) {
          setFetchedSkus(skus || []);
          if (skus?.length > 0 && !skus.find(s => s.code === skuCode)) {
            setSkuCode(skus[0].code);
          }
        }
      }).catch(err => console.warn('Failed to fetch SKUs:', err));
    } else {
      setFetchedSkus([]);
      setSkuCode('');
    }
    return () => { active = false; };
  }, [selectedOrder, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (isReadOnly) {
      setErrorMsg('Unauthorized: Your active role profile is restricted to read-only viewing.');
      return;
    }

    if (!orderId || !operation || !workerId || !date || (!skuCode && !pieceSeqs)) {
      setErrorMsg('Please ensure all required shop floor logging fields are completed.');
      return;
    }

    // Parse pieceSeqs "1, 2, 3-5" into array of numbers
    let parsedSeqs = [];
    if (pieceSeqs) {
      const parts = pieceSeqs.split(',').map(s => s.trim()).filter(Boolean);
      for (const part of parts) {
        if (part.includes('-')) {
          const [start, end] = part.split('-').map(n => parseInt(n, 10));
          if (!isNaN(start) && !isNaN(end) && start <= end) {
            for (let i = start; i <= end; i++) parsedSeqs.push(i);
          }
        } else {
          const num = parseInt(part, 10);
          if (!isNaN(num)) parsedSeqs.push(num);
        }
      }
    }

    if (parsedSeqs.length === 0 && pieceSeqs) {
      // Maybe they typed full bundle codes? Let's check if it looks like a sequence
      setErrorMsg('Invalid piece numbers format. Use numbers and ranges like "1, 2, 5-8".');
      return;
    }

    // Prepare event data for POST /production/scan
    const newEvent = {
      operation_id: operation, // The context might need to map this to UUID or backend accepts name?
      employee_id: workerId,
      work_date: date,
      sku_code: skuCode,
      piece_seqs: parsedSeqs,
    };

    try {
      const result = await addScanEvent(newEvent);

      // Reset sequence, show success
      setPieceSeqs('');
      setSuccessMsg(`Logged ${result.count_logged || parsedSeqs.length} pieces for ${operation}. ` + 
        (result.rework?.length ? `(Rework: ${result.rework.length}) ` : '') +
        (result.not_found?.length ? `(Not Found: ${result.not_found.length})` : '')
      );
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
            accept=".xlsx,.xlsm,.xls"
            onChange={handleFileUpload}
            className="hidden"
            id="entry-file-upload"
          />
          <button
            type="button"
            onClick={() => {
              setUploadOrderNumberError('');
              setShowOrderNumModal(true);
            }}
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
              <><FileSpreadsheet className="w-4 h-4" /> Upload Breakdown Sheet</>
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

              {/* SKU Selection */}
              <div className="flex flex-col gap-3">
                <label className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5" style={{ color: '#4a3a2a' }}>
                  <Ruler className="w-4 h-4" style={{ color: '#c8834a' }} /> Garment SKU (Color / Size) *
                </label>
                <div className="flex flex-col gap-2">
                  <select
                    value={skuCode}
                    onChange={(e) => setSkuCode(e.target.value)}
                    className="input-field h-14 bg-white font-bold border-2 border-[#c8834a]/20 focus:border-[#c8834a] cursor-pointer shadow-sm text-sm transition-all"
                    required
                  >
                    <option value="" disabled>-- Select SKU --</option>
                    {fetchedSkus.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.label || `${s.color_name} - ${s.size}`}
                      </option>
                    ))}
                  </select>
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

              {/* Piece Sequences Input */}
              <div className="flex flex-col gap-3 md:col-span-2">
                <label htmlFor="piece-seq-input" className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-emerald-500" /> Piece Numbers (Sequence) *
                </label>
                <p className="text-[10px] text-slate-500 -mt-2">Enter numbers separated by commas or ranges (e.g. 1, 2, 5-8)</p>
                <div className="flex flex-col sm:flex-row items-stretch gap-4">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      id="piece-seq-input"
                      placeholder="e.g. 1, 2, 5-8"
                      value={pieceSeqs}
                      onChange={(e) => setPieceSeqs(e.target.value)}
                      className="input-field w-full h-14 px-4 bg-white font-black text-xl text-emerald-700 border-2 border-slate-200 focus:border-emerald-500 shadow-sm transition-all"
                      required
                    />
                  </div>
                  <div className="flex gap-2 w-1/4">
                    <button
                      type="button"
                      onClick={() => setPieceSeqs('')}
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




            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-end">
            <button
              type="button"
              onClick={() => {
                setPieceSeqs('');
                setSkuCode('');
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

      {/* ─── ORDER NUMBER MODAL (Step 1 before file pick) ─── */}
      {showOrderNumModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-sm p-6 sm:p-8 space-y-5 relative">
            {/* Header */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(200,131,74,0.12)' }}>
                  <FileSpreadsheet className="w-4 h-4" style={{ color: '#c8834a' }} />
                </div>
                <div>
                  <h3 className="text-base font-black" style={{ color: '#2d1f0e' }}>Upload Breakdown Sheet</h3>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Step 1 of 2 — Enter Order Number</p>
                </div>
              </div>
              <button
                onClick={() => { setShowOrderNumModal(false); setUploadOrderNumberError(''); }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-widest block" style={{ color: '#9a7a5a' }}>
                Order Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                autoFocus
                placeholder="e.g. 1001"
                value={uploadOrderNumber}
                onChange={(e) => { setUploadOrderNumber(e.target.value.trim()); setUploadOrderNumberError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter' && uploadOrderNumber.trim()) { e.preventDefault(); fileInputRef.current?.click(); } }}
                className={`w-full px-4 py-3 rounded-xl border text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 transition-colors ${
                  uploadOrderNumberError
                    ? 'border-red-400 bg-red-50 focus:ring-red-400/20'
                    : 'border-slate-200 focus:ring-[#c8834a]/20 focus:border-[#c8834a]'
                }`}
              />
              {uploadOrderNumberError ? (
                <p className="text-xs font-bold text-red-600 flex items-start gap-1.5 pt-1">
                  <span className="mt-0.5 w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[8px] font-black flex items-center justify-center shrink-0">!</span>
                  {uploadOrderNumberError}
                </p>
              ) : (
                <p className="text-[10px] text-slate-400 font-medium">Must match an existing order. The sheet SKUs will be written into this order.</p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowOrderNumModal(false); setUploadOrderNumberError(''); }}
                className="flex-1 py-3 rounded-xl text-xs font-extrabold transition-colors"
                style={{ background: '#f1f5f9', color: '#475569' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!uploadOrderNumber.trim() || uploadLoading}
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-3 rounded-xl text-xs font-extrabold text-white shadow-md flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:translate-y-0"
                style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}
              >
                {uploadLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...</> : <><FileSpreadsheet className="w-3.5 h-3.5" /> Choose File</>}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
