'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { apiGetSkus, apiGetSkuPieces, apiProductionCutting, apiImportPreview, apiImportCommit } from '@/lib/api';
import { Lock, CheckCircle2, XCircle, Rocket, Ruler, Scissors, Plus, Calendar, Users, FileSpreadsheet, X, Upload, Loader2, ListChecks, BarChart3 } from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';

function DynamicDataViewer({ data }) {
  if (!data) return <div className="text-slate-400 italic text-center p-4">No data available</div>;

  // 1. Backend response Summary Object-ஆக இருந்தால் (clients ஃபீல்ட் இருந்தால்)
  if (data.clients) {
    const clientsData = Object.entries(data.clients);

    return (
      <div className="space-y-6">
        {clientsData.map(([clientName, details]) => (
          <div key={clientName} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            
            {/* Header / Client Badge */}
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-xs font-black uppercase text-amber-700 bg-amber-50 px-3 py-1 rounded-lg border border-amber-200">
                Sheet / Client: {clientName}
              </span>
              <span className="text-xs font-bold text-slate-500">
                Warnings: <strong className="text-emerald-600">{details.warnings?.length || 0}</strong>
              </span>
            </div>

            {/* Key Summary Cards */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Order Lines</p>
                <p className="text-lg font-black text-slate-800">{details.order_lines}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Pieces Ordered</p>
                <p className="text-lg font-black text-amber-600">{details.pieces_ordered?.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Styles Count</p>
                <p className="text-lg font-black text-slate-800">{details.styles?.length || 0}</p>
              </div>
            </div>

            {/* Styles List Table */}
            {details.styles && details.styles.length > 0 && (
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Detected Styles</h4>
                <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex flex-wrap gap-2">
                    {details.styles.map((style, idx) => (
                      <span key={idx} className="text-xs font-bold bg-white text-slate-700 px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
                        {style}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>
        ))}
      </div>
    );
  }

  // 2. Normal Table Rows-ஆக இருந்தால் (Fallback Table Viewer)
  let tableRows = Array.isArray(data) ? data : (typeof data === 'object' ? Object.values(data).find(Array.isArray) || [data] : []);

  if (tableRows.length === 0) return <div className="text-slate-400 italic text-center p-4">No records found</div>;

  const keys = Array.from(new Set(tableRows.flatMap(row => (row && typeof row === 'object') ? Object.keys(row) : [])));

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
      <table className="min-w-full text-left text-xs bg-white">
        <thead className="bg-slate-100 text-slate-700 font-black uppercase tracking-wider">
          <tr>
            {keys.map(k => (
              <th key={k} className="px-4 py-3 border-b border-slate-200 whitespace-nowrap">
                {k.replace(/_/g, ' ')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {tableRows.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50 transition-colors">
              {keys.map(k => (
                <td key={k} className="px-4 py-2.5 text-slate-700 font-medium whitespace-nowrap">
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
export default function ProductionLogEntry() {
  const { user, token, ROLE_OPERATIONS } = useAuth();
  const { workers, addScanEvent, operations } = useData();

  const allowedOperations = useMemo(() => ROLE_OPERATIONS[user] || [], [user, ROLE_OPERATIONS]);
  const isReadOnly = useMemo(() => allowedOperations.length === 0, [allowedOperations]);

  const [operation, setOperation] = useState(allowedOperations[0] || '');
  const [workerId, setWorkerId] = useState('');
  const [skuCode, setSkuCode] = useState('');
  const [pieceSeqs, setPieceSeqs] = useState('');
  const [cuttingCount, setCuttingCount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [fetchedSkus, setFetchedSkus] = useState([]);

  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [checklistPieces, setChecklistPieces] = useState([]);
  const [selectedPieces, setSelectedPieces] = useState([]);
  const [loadingPieces, setLoadingPieces] = useState(false);
  const [piecesMeta, setPiecesMeta] = useState(null);
  const [checklistError, setChecklistError] = useState('');
  const [checklistSubmitting, setChecklistSubmitting] = useState(false);

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [skuRefreshKey, setSkuRefreshKey] = useState(0);

  // Note: Handle additional state variables like fileInputRef, uploadLoading, etc. 
  // if you have them defined elsewhere or need them for imports.
  const fileInputRef = useRef(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [fileName, setFileName] = useState('');
  const [commitLoading, setCommitLoading] = useState(false);
  const [commitSuccess, setCommitSuccess] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [showOrderNumModal, setShowOrderNumModal] = useState(false);
  const [uploadOrderNumber, setUploadOrderNumber] = useState('');
  const [uploadOrderNumberError, setUploadOrderNumberError] = useState('');

  useEffect(() => {
    if (!workerId && workers.length > 0) setWorkerId(workers[0].id);
  }, [workers, workerId]);

  useEffect(() => {
    apiGetSkus(token).then(setFetchedSkus).catch(console.warn);
  }, [token, skuRefreshKey]);

  useEffect(() => {
    if (skuCode) {
      const skuObj = fetchedSkus.find(s => s.code === skuCode);
      if (skuObj?.qty_ordered) setCuttingCount(skuObj.qty_ordered.toString());
    }
  }, [skuCode, fetchedSkus]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg(''); setErrorMsg('');
    if (isReadOnly) return setErrorMsg('Unauthorized');
    if (!operation || !workerId || !date || !skuCode) return setErrorMsg('Missing fields');

    const opRecord = operations.find(o => o.label === operation);
    const skuObj = fetchedSkus.find(s => s.code === skuCode);

    if (operation === 'Cutting') {
      try {
        const result = await apiProductionCutting(token, { sku_id: skuObj.sku_id, employee_id: workerId, work_date: date, count: parseInt(cuttingCount) });
        setSuccessMsg(`✅ Cut ${result.count} pieces.`);
      } catch (err) { setErrorMsg(`Cutting failed: ${err.message}`); }
      return;
    }

    if (!opRecord) return setErrorMsg(`Could not find ID for: ${operation}`);

    let parsedSeqs = [];
    if (pieceSeqs) {
      const parts = pieceSeqs.split(',').map(s => s.trim()).filter(Boolean);
      parts.forEach(part => {
        if (part.includes('-')) {
          const [s, e] = part.split('-').map(n => parseInt(n, 10));
          for (let i = s; i <= e; i++) parsedSeqs.push(i);
        } else {
          parsedSeqs.push(parseInt(part, 10));
        }
      });
    }

    try {
      const result = await addScanEvent({ operation_id: opRecord.id, employee_id: workerId, work_date: date, sku_id: skuObj.sku_id, piece_seqs: parsedSeqs });
      setSuccessMsg(`Logged ${result.count_logged ?? parsedSeqs.length} pieces for ${operation}.`);
      setPieceSeqs('');
    } catch (err) { setErrorMsg(`Failed: ${err.message}`); }
  };

  const openChecklistModal = async () => {
    const opRecord = operations.find(o => o.label === operation);
    const skuObj = fetchedSkus.find(s => s.code === skuCode);
    if (!opRecord || !skuObj) return setErrorMsg("Operation or SKU invalid");
    setLoadingPieces(true); setShowChecklistModal(true);
    try {
      const data = await apiGetSkuPieces(token, skuObj.sku_id, opRecord.id);
      setChecklistPieces(Array.isArray(data) ? data : (data.pieces || []));
    } catch (err) { setChecklistError(err.message); }
    finally { setLoadingPieces(false); }
  };

  const submitChecklist = async () => {
    const opRecord = operations.find(o => o.label === operation);
    const skuObj = fetchedSkus.find(s => s.code === skuCode);
    setChecklistSubmitting(true);
    try {
      await addScanEvent({ operation_id: opRecord.id, employee_id: workerId, work_date: date, sku_id: skuObj.sku_id, piece_seqs: selectedPieces });
      setSuccessMsg("Success!"); setShowChecklistModal(false); setSelectedPieces([]);
    } catch (err) { setChecklistError(err.message); }
    finally { setChecklistSubmitting(false); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !uploadOrderNumber) {
      setUploadOrderNumberError('Please enter an Order Number first');
      return;
    }
    setUploadLoading(true);
    setUploadError('');
    try {

      const data = await apiImportPreview(token, file, uploadOrderNumber);
      setPreviewData(data);
      setFileName(file.name);
      setShowPreviewModal(true);
      setShowOrderNumModal(false);
    } catch (err) {
      setUploadError(`Preview failed: ${err.message}`);
    } finally {
      setUploadLoading(false);
    }
  };

  const handleCommit = async () => {
    const file = fileInputRef.current?.files[0];
    if (!file) return;
    setCommitLoading(true);
    try {

      await apiImportCommit(token, file, uploadOrderNumber);
      setCommitSuccess('File imported and database updated successfully!');
      setShowPreviewModal(false);
      setUploadOrderNumber('');
    } catch (err) {
      setUploadError(`Commit failed: ${err.message}`);
    } finally {
      setCommitLoading(false);
    }
  };

  // -- MAIN UI RENDER --
  if (isReadOnly) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in pt-12 text-center">
        <div className="card p-8 bg-white border border-red-100 shadow-xl space-y-4">
          <Lock className="w-14 h-14 text-red-400 mx-auto" />
          <h1 className="text-2xl font-black text-slate-800">Access Restricted</h1>
          <p className="text-slate-500 font-medium">Your active persona does not have write access to the shop floor ledger.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">

      {/* TITLE SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: '#2d1f0e' }}>Shop Floor Production Logger</h1>
          <p className="font-medium mt-1" style={{ color: '#9a7a5a' }}>Record work bundles completed by operators. Touch-friendly screens optimized for fast, accurate floor entry.</p>
        </div>
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

      {/* ALERT BANNERS */}
      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
        {successMsg && (
          <div className="bg-emerald-50 border-2 border-emerald-200 text-emerald-800 p-4 rounded-xl font-bold text-sm shadow-2xl animate-fade-in flex items-start gap-2.5 pointer-events-auto">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <p className="font-extrabold">Transaction Confirmed</p>
                <button onClick={() => setSuccessMsg('')} className="opacity-50 hover:opacity-100"><X className="w-4 h-4" /></button>
              </div>
              <p className="text-xs text-emerald-600 mt-0.5 break-words whitespace-pre-wrap">{successMsg}</p>
            </div>
          </div>
        )}

        {commitSuccess && (
          <div className="bg-emerald-50 border-2 border-emerald-200 text-emerald-800 p-4 rounded-xl font-bold text-sm shadow-2xl animate-fade-in flex items-start gap-2.5 pointer-events-auto">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <p className="font-extrabold">Import Successful</p>
                <button onClick={() => setCommitSuccess('')} className="opacity-50 hover:opacity-100"><X className="w-4 h-4" /></button>
              </div>
              <p className="text-xs text-emerald-600 mt-0.5 break-words whitespace-pre-wrap">{commitSuccess}</p>
            </div>
          </div>
        )}

        {(errorMsg || uploadError) && (
          <div className="bg-red-50 border-2 border-red-200 text-red-800 p-4 rounded-xl font-bold text-sm shadow-2xl animate-fade-in flex items-start gap-2.5 pointer-events-auto">
            <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <p className="font-extrabold text-red-700">Operation Failed</p>
                <button onClick={() => { setErrorMsg(''); setUploadError(''); }} className="opacity-50 hover:opacity-100"><X className="w-4 h-4" /></button>
              </div>
              <p className="text-xs text-red-600 mt-0.5 break-words whitespace-pre-wrap">{errorMsg || uploadError}</p>
            </div>
          </div>
        )}
      </div>

      {/* LOGGING FORM CARD */}
      <SpotlightCard className="p-8 bg-white shadow-xl space-y-8 rounded-3xl" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.06)">

        <div className="p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.2)' }}>
          <div className="text-xs font-bold" style={{ color: '#4a3a2a' }}>
            <span>Logged By: </span>
            <span className="text-white px-2 py-0.5 rounded font-black uppercase tracking-wider" style={{ background: '#c8834a' }}>{user.replace('_', ' ')}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* STEP 1: Worker Selection */}
          <div className="space-y-6 p-6 rounded-2xl shadow-sm relative overflow-hidden" style={{ background: '#fcfaf8', border: '1px solid rgba(200,131,74,0.1)' }}>
            <div className="absolute top-0 left-0 w-1 h-full" style={{ background: '#c8834a' }}></div>
            <h3 className="text-sm font-black uppercase tracking-widest pb-3 flex items-center gap-2" style={{ color: '#2d1f0e', borderBottom: '1px solid rgba(200,131,74,0.1)' }}>
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs" style={{ background: 'rgba(200,131,74,0.15)', color: '#c8834a' }}>1</span>
              Worker Selection
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
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


          {/* STEP 2: Garment Details */}
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
                        [{s.order_number || 'N/A'}] {s.label || `${s.style_name || ''} · ${s.color_code || ''} · ${s.size}`}
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

          {/* STEP 3: Quantities & Submission */}
          <div className="space-y-6 p-6 rounded-2xl shadow-sm relative overflow-hidden" style={{ background: '#fcfaf8', border: '1px solid rgba(200,131,74,0.1)' }}>
            <div className="absolute top-0 left-0 w-1 h-full" style={{ background: '#c8834a' }}></div>
            <h3 className="text-sm font-black uppercase tracking-widest pb-3 flex items-center gap-2" style={{ color: '#2d1f0e', borderBottom: '1px solid rgba(200,131,74,0.1)' }}>
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs" style={{ background: 'rgba(200,131,74,0.15)', color: '#c8834a' }}>3</span>
              Quantities & Submission
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">

              {/* ── CUTTING PIECE COUNT TEXTBOX INPUT ── */}
              {operation === 'Cutting' ? (
                <div className="flex flex-col gap-3 md:col-span-2">
                  <label htmlFor="cutting-count-input" className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Scissors className="w-4 h-4 text-amber-600" /> Cut Piece Count (Total Quantity) *
                  </label>
                  <p className="text-[10px] text-slate-500 -mt-2">Enter the exact total number of cut pieces for this SKU bundle block creation.</p>
                  <input
                    type="number"
                    id="cutting-count-input"
                    placeholder="e.g. 50"
                    value={cuttingCount}
                    onChange={(e) => setCuttingCount(e.target.value)}
                    className="input-field w-full sm:w-1/2 h-14 px-4 bg-white font-black text-xl border-2 border-slate-200 focus:border-[#c8834a] shadow-sm transition-all"
                    required
                    min="1"
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-3 md:col-span-2">
                  <div className="flex justify-between items-end">
                    <label htmlFor="piece-seq-input" className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-emerald-500" /> Piece Numbers (Sequence) *
                    </label>
                    <button
                      type="button"
                      onClick={openChecklistModal}
                      className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                      style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)', color: '#fff' }}
                    >
                      <ListChecks className="w-3.5 h-3.5" /> Select from Checklist
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 -mt-2">Enter numbers separated by commas or ranges (e.g. 1, 2, 5-8), or use the checklist.</p>
                  <div className="flex flex-col sm:flex-row items-stretch gap-4">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        id="piece-seq-input"
                        placeholder="e.g. 1, 2, 5-8"
                        value={pieceSeqs}
                        onChange={(e) => setPieceSeqs(e.target.value)}
                        className="input-field w-full h-14 px-4 bg-white font-black text-xl text-emerald-700 border-2 border-slate-200 focus:border-emerald-500 shadow-sm transition-all"
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
              )}

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
          <div className="pt-4 flex flex-col items-center sm:items-end gap-3">
            <div className="flex flex-col sm:flex-row gap-4 justify-end w-full">
              <button
                type="button"
                onClick={() => {
                  setPieceSeqs('');
                  setSkuCode('');
                  setCuttingCount('');
                }}
                className="h-14 font-bold rounded-xl text-base px-8 transition-all"
                style={{ background: 'rgba(200,131,74,0.1)', color: '#c8834a' }}
              >
                Reset All
              </button>
              <button
                type="submit"
                className="h-14 font-black rounded-xl text-base px-10 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 flex-1 sm:flex-none"
                style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)', color: '#0f0a06' }}
              >
                <Rocket className="w-5 h-5" /> Submit Event
              </button>
            </div>

            {skuCode && (
              <a
                href={`/dashboard/analytics`}
                className="text-xs font-black px-4 py-2 rounded-xl transition-all hover:bg-slate-50 flex items-center gap-1.5"
                style={{ color: '#c8834a' }}
              >
                <BarChart3 className="w-3.5 h-3.5" /> View Analytics for Order
              </a>
            )}
          </div>

        </form>

      </SpotlightCard>

      {/* EXCEL PREVIEW MODAL */}
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

      {/* ORDER NUMBER MODAL */}
      {showOrderNumModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-sm p-6 sm:p-8 space-y-5 relative">
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
                className={`w-full px-4 py-3 rounded-xl border text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 transition-colors ${uploadOrderNumberError
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

      {/* PIECE CHECKLIST MODAL */}
      {showChecklistModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-md animate-fade-in p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">

            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(200,131,74,0.12)' }}>
                  <ListChecks className="w-4 h-4" style={{ color: '#c8834a' }} />
                </div>
                <div>
                  <h3 className="text-base font-black" style={{ color: '#2d1f0e' }}>Select Pieces — {operation}</h3>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{skuCode}</p>
                </div>
              </div>
              <button
                onClick={() => setShowChecklistModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Counts */}
            {piecesMeta && (
              <div className="flex gap-3 px-6 py-3 bg-slate-50 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-500">Total: <strong className="text-slate-700">{piecesMeta.total}</strong></span>
                <span className="text-xs font-bold text-emerald-600">Done: <strong>{piecesMeta.done}</strong></span>
                <span className="text-xs font-bold text-amber-600">Pending: <strong>{piecesMeta.pending}</strong></span>
                <span className="text-xs font-bold ml-auto" style={{ color: '#c8834a' }}>Selected: <strong>{selectedPieces.length}</strong></span>
              </div>
            )}

            {/* Piece List */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingPieces ? (
                <div className="flex flex-col items-center justify-center h-32 gap-3">
                  <Loader2 className="w-7 h-7 animate-spin" style={{ color: '#c8834a' }} />
                  <p className="text-sm font-bold text-slate-400">Loading pieces...</p>
                </div>
              ) : checklistError && checklistPieces.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 gap-2 text-center">
                  <XCircle className="w-8 h-8 text-red-400" />
                  <p className="text-sm font-bold text-red-500">{checklistError}</p>
                  <button
                    type="button"
                    onClick={openChecklistModal}
                    className="text-xs font-black px-3 py-1.5 rounded-lg mt-1"
                    style={{ background: 'rgba(200,131,74,0.1)', color: '#c8834a' }}
                  >Retry</button>
                </div>
              ) : checklistPieces.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 gap-2">
                  <p className="text-sm font-bold text-slate-400">No pieces found for this SKU/stage.</p>
                  <p className="text-xs text-slate-400">Run Cutting first to mint pieces for this SKU.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {/* Select All / Deselect All */}
                  <div className="col-span-2 sm:col-span-3 flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setSelectedPieces(checklistPieces.filter(p => !p.done_at_op).map(p => p.seq))}
                      className="text-[10px] font-black px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                      style={{ background: 'rgba(200,131,74,0.12)', color: '#c8834a' }}
                    >
                      Select All Pending
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPieces([])}
                      className="text-[10px] font-black px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                      style={{ background: '#f1f5f9', color: '#475569' }}
                    >
                      Deselect All
                    </button>
                  </div>

                  {checklistPieces.map((piece) => {
                    const isSelected = selectedPieces.includes(piece.seq);
                    const isDone = piece.done_at_op;
                    return (
                      <button
                        key={piece.piece_id || piece.seq}
                        type="button"
                        onClick={() => {
                          setSelectedPieces(prev =>
                            prev.includes(piece.seq)
                              ? prev.filter(s => s !== piece.seq)
                              : [...prev, piece.seq]
                          );
                        }}
                        className={`relative p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${isSelected
                          ? 'border-[#c8834a] bg-[#c8834a]/10 shadow-md'
                          : isDone
                            ? 'border-emerald-200 bg-emerald-50 opacity-70'
                            : 'border-slate-200 bg-white hover:border-[#c8834a]/40'
                          }`}
                      >
                        <p className="text-xs font-black" style={{ color: isSelected ? '#c8834a' : '#2d1f0e' }}>
                          #{piece.seq}
                        </p>
                        <p className="text-[9px] font-semibold text-slate-400 truncate">{piece.current_stage_label || piece.current_stage || '—'}</p>
                        {isDone && !isSelected && (
                          <span className="absolute top-1 right-1 w-3 h-3 rounded-full bg-emerald-500 flex items-center justify-center">
                            <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                          </span>
                        )}
                        {isSelected && (
                          <span className="absolute top-1 right-1 w-3 h-3 rounded-full flex items-center justify-center" style={{ background: '#c8834a' }}>
                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {/* Inline submit error */}
                  {checklistError && (
                    <div className="col-span-2 sm:col-span-3 mt-2 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                      <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-xs font-bold text-red-700">{checklistError}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex gap-3 p-6 border-t border-slate-100">
              <button
                type="button"
                onClick={() => { setShowChecklistModal(false); setChecklistError(''); }}
                className="flex-1 py-3 rounded-xl text-xs font-extrabold transition-colors"
                style={{ background: '#f1f5f9', color: '#475569' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={selectedPieces.length === 0 || checklistSubmitting}
                onClick={submitChecklist}
                className="flex-1 py-3 rounded-xl text-xs font-extrabold text-white shadow-md flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:translate-y-0"
                style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}
              >
                {checklistSubmitting ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting...</>
                ) : (
                  <><Rocket className="w-3.5 h-3.5" /> Submit {selectedPieces.length > 0 ? `${selectedPieces.length} Pieces` : 'Event'}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
