'use client';
import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { apiImportPreview, apiImportCommit } from '@/lib/api';
import { Lock, CheckCircle2, XCircle, Users, FileSpreadsheet, X, Upload, Barcode, Loader2, Store, Camera, AlertTriangle } from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';
import { useRoleAccess, CameraScannerModal } from './shared';
import dynamic from 'next/dynamic';
const BarcodeDoorSection = dynamic(() => import('./BarcodeDoorSection'));
const ManualDoorSection = dynamic(() => import('./ManualDoorSection'));
const StoreHubSection = dynamic(() => import('./StoreHubSection'));
// import BarcodeDoorSection from './BarcodeDoorSection';
// import ManualDoorSection from './ManualDoorSection';
// import StoreHubSection from './StoreHubSection';
function DynamicDataViewer({ data }) {
  if (!data) return <div className="text-slate-400 italic text-center p-4">No data available</div>;

  if (typeof data === 'string') {
    return <div className="p-4 text-slate-700 bg-slate-50 rounded-xl">{data}</div>;
  }

  if (data.clients && typeof data.clients === 'object') {
    const clientsData = Object.entries(data.clients);

    return (
      <div className="space-y-6">
        {clientsData.map(([clientName, details]) => (
          <div key={clientName} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-xs font-black uppercase text-amber-700 bg-amber-50 px-3 py-1 rounded-lg border border-amber-200">
                Sheet / Client: {clientName}
              </span>
              <span className="text-xs font-bold text-slate-500">
                Warnings: <strong className="text-emerald-600">{details.warnings?.length || 0}</strong>
              </span>
            </div>

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
                {String(k).replace(/_/g, ' ')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {tableRows.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50 transition-colors">
              {keys.map(k => {
                const val = row ? row[k] : '-';
                return (
                  <td key={k} className="px-4 py-2.5 text-slate-700 font-medium whitespace-nowrap">
                    {typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val ?? '-')}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}



export default function ProductionLogEntry() {
  const { user, token } = useAuth();
  const { workers } = useData();
  const { isReadOnly, isFullAccess, isStoreAccess, allowedOperations, isStageAllowedForRole } = useRoleAccess();

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [storeSendedSkus, setStoreSendedSkus] = useState([]);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [cameraScanTarget, setCameraScanTarget] = useState(null); // null | 'sku' | 'worker'
  const [activeDoor, setActiveDoor] = useState(
    (user === 'store_manager' || user === 'store_scan') ? 'store' : 'manual'
  );
  const [barcodeWorkerInput, setBarcodeWorkerInput] = useState('');
  const [barcodeWorker, setBarcodeWorker] = useState(null); // { id, name, designation, barcode }
  const [barcodeWorkerChecking, setBarcodeWorkerChecking] = useState(false);
  const [barcodeNotCheckedInModal, setBarcodeNotCheckedInModal] = useState(null); // { workerName }
  const [barcodeStage, setBarcodeStage] = useState('Cutting'); // Production Stage — lifted here since handleVerifyBarcodeWorker (shared with Store Hub) auto-adjusts it
  const [barcodeDcm, setBarcodeDcm] = useState('');
  const [lotArticle, setLotArticle] = useState('');
  const [lotColor, setLotColor] = useState('');
  const [lotThickness, setLotThickness] = useState('');
  const [lotOptions, setLotOptions] = useState({ article: [], colour: [], thickness: [], size: [] });
  const [lotResults, setLotResults] = useState([]);
  const [lotLoading, setLotLoading] = useState(false);
  const [lotCategory, setLotCategory] = useState('LEATHER'); // LEATHER or LINING
  const [bucketResult, setBucketResult] = useState(null);
  const [showBucketModal, setShowBucketModal] = useState(false);
  const [completedStagesMap, setCompletedStagesMap] = useState({});
  const [storeReceiveStatus, setStoreReceiveStatus] = useState('pending'); // 'pending', 'received', 'sended'

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
  const [mounted, setMounted] = useState(false);

  const workerInputRef = useRef(null);

  const recordStageCompletion = (stage, pieceOrSkuKey) => {
    if (!stage || !pieceOrSkuKey) return;
    const rawKey = String(pieceOrSkuKey).toUpperCase().trim();
    if (!rawKey) return;

    setCompletedStagesMap(prev => {
      const next = { ...prev };
      const set1 = next[rawKey] ? new Set(next[rawKey]) : new Set();
      set1.add(stage);
      next[rawKey] = set1;
      return next;
    });
  };


  const handleVerifyBarcodeWorker = async (inputCode) => {
    const rawCode = typeof inputCode === 'string' ? inputCode : barcodeWorkerInput;
    const query = (rawCode || '').trim();
    if (!query) return;
    setBarcodeWorkerChecking(true);
    setBarcodeNotCheckedInModal(null);
    setErrorMsg('');

    try {
      const queryLower = query.toLowerCase();
      const matchedWorker = workers.find(w =>
        String(w.id) === query ||
        String(w.employee_barcode || '').toLowerCase() === queryLower ||
        String(w.name || '').toLowerCase().includes(queryLower)
      );

      const targetWorker = matchedWorker || {
        id: query,
        name: `Worker (${query})`,
        designation: 'Production Worker',
        employee_barcode: query
      };

      // Check Attendance Check-In Status
      try {
        const response = await fetch(`/api/v1/attendance/today?t=${Date.now()}`, { headers: { Authorization: `Bearer ${token}` } });
        const rosterData = await response.json();
        const rosterArray = Array.isArray(rosterData) ? rosterData : (rosterData?.data || rosterData?.items || []);
        const workerRoster = rosterArray.find(r =>
          String(r.employee_id) === String(targetWorker.id) ||
          (r.employee_barcode && String(r.employee_barcode).toLowerCase() === query.toLowerCase()) ||
          (r.barcode && String(r.barcode).toLowerCase() === query.toLowerCase())
        ) || null;

        if (!workerRoster || workerRoster.check_out_at) {
          setBarcodeNotCheckedInModal({
            workerName: targetWorker.name,
            workerId: targetWorker.id,
            barcode: targetWorker.employee_barcode || query
          });
          setBarcodeWorkerChecking(false);
          setTimeout(() => workerInputRef.current?.focus(), 100);
          return;
        }
      } catch (attErr) {
        console.warn("Attendance check fallback warning:", attErr);
      }

      setBarcodeWorker(targetWorker);
      setBarcodeWorkerInput('');
      setSuccessMsg(`✅ Worker ${targetWorker.name} verified & checked-in!`);

      // FIX 2: Auto-switch barcodeStage to first allowed operation if current stage is restricted for this role (e.g. stitching_manager)
      if (!isStageAllowedForRole(barcodeStage) && allowedOperations.length > 0) {
        setBarcodeStage(allowedOperations[0]);
      }
    } catch (err) {
      setErrorMsg(`Worker verification failed: ${err.message}`);
      setTimeout(() => workerInputRef.current?.focus(), 100);
    } finally {
      setBarcodeWorkerChecking(false);
    }
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
      setUploadError(err.message);
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
      setUploadError(err.message);
    } finally {
      setCommitLoading(false);
    }
  };

  // Store Hub role-redirect guard — moved out of StoreHubSection's own
  // activation effect (which now just fetches on mount, since it only ever
  // mounts while activeDoor==='store'). This is the "don't let an
  // unauthorized role land on Store" half of the original combined effect.
  useEffect(() => {
    if (activeDoor === 'store' && !isFullAccess && !isStoreAccess) {
      setActiveDoor('manual');
    }
  }, [activeDoor, isFullAccess, isStoreAccess]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(''), 2000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  useEffect(() => {
    if (commitSuccess) {
      const timer = setTimeout(() => setCommitSuccess(''), 2000);
      return () => clearTimeout(timer);
    }
  }, [commitSuccess]);

  useEffect(() => {
    if (errorMsg || uploadError) {
      const timer = setTimeout(() => {
        setErrorMsg('');
        setUploadError('');
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg, uploadError]);

  // Dynamic Material Lots Fetcher

  // NOTE: the "Dynamic Material Lots Fetcher" effect that lived here in the
  // original file was split into two door-local copies (inside
  // BarcodeDoorSection.js and ManualDoorSection.js) instead of staying here —
  // it needs each door's own local state (selectedStage/skuCode/cuttingCount
  // for Manual, barcodeStage/barcodeSelectedSku/barcodePieceInput for
  // Barcode), which page.js no longer has direct access to post-split. Both
  // copies write into this shared lot state via the setters passed down.

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
    <div className="w-full min-w-0 space-y-8 animate-fade-in pb-12">

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
            className="h-12 py-0 px-5 flex items-center gap-2 font-bold text-sm rounded-xl transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
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

      {/* BOTTOM-RIGHT TOAST NOTIFICATION */}
      {typeof window !== 'undefined' && createPortal(
        <div className="fixed bottom-6 right-4 sm:right-6 z-[9999999] flex flex-col items-end gap-3 pointer-events-none max-w-sm w-full">

          {/* Success Toast */}
          {successMsg && (
            <div className="bg-slate-900/95 text-white border-2 border-emerald-500/50 p-4 rounded-3xl shadow-2xl animate-fade-in flex items-center justify-between gap-3 pointer-events-auto backdrop-blur-xl">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <p className="font-black text-emerald-400 text-xs uppercase tracking-wider">Transaction Confirmed</p>
                  <p className="text-xs font-semibold text-slate-200 mt-0.5 break-words line-clamp-3">{successMsg}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSuccessMsg('')}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Commit Success Toast */}
          {commitSuccess && (
            <div className="bg-slate-900/95 text-white border-2 border-emerald-500/50 p-4 rounded-3xl shadow-2xl animate-fade-in flex items-center justify-between gap-3 pointer-events-auto backdrop-blur-xl">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <p className="font-black text-emerald-400 text-xs uppercase tracking-wider">Import Successful</p>
                  <p className="text-xs font-semibold text-slate-200 mt-0.5 break-words line-clamp-3">{commitSuccess}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCommitSuccess('')}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Error Toast */}
          {(errorMsg || uploadError) && (
            <div className="bg-slate-900/95 text-white border-2 border-rose-500/50 p-4 rounded-3xl shadow-2xl animate-fade-in flex items-center justify-between gap-3 pointer-events-auto backdrop-blur-xl">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 flex items-center justify-center shrink-0">
                  <XCircle className="w-6 h-6 text-rose-400" />
                </div>
                <div className="min-w-0">
                  <p className="font-black text-rose-400 text-xs uppercase tracking-wider">Operation Failed</p>
                  <p className="text-xs font-semibold text-slate-200 mt-0.5 break-words line-clamp-3">{errorMsg || uploadError}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setErrorMsg(''); setUploadError(''); }}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

        </div>,
        document.body
      )}

      {/* MOBILE CAMERA BARCODE SCANNER MODAL — worker-verify case only.
          The 'sku' and 'store' cases now render their own instance locally
          inside BarcodeDoorSection.js / StoreHubSection.js — this one shared
          instance can't reach into their local state anymore post-split. */}
      {cameraScanTarget === 'worker' && (
        <CameraScannerModal
          title="Scan Worker Barcode"
          onClose={() => setCameraScanTarget(null)}
          onScan={(scannedCode) => {
            const cleanCode = String(scannedCode || '').replace(/[\r\n]+/g, '').trim();
            if (!cleanCode) return;
            setBarcodeWorkerInput(cleanCode);
            setTimeout(() => handleVerifyBarcodeWorker(cleanCode), 50);
          }}
        />
      )}

      {/* TOP TAB BAR (MATCHING ATTENDANCE PAGE STYLE) */}
      <div className="flex items-center gap-1 border-b overflow-x-auto" style={{ borderBottomColor: 'rgba(200,131,74,0.2)' }}>
        <button
          type="button"
          onClick={() => setActiveDoor('manual')}
          className="flex items-center gap-2 px-5 py-3.5 text-xs font-black whitespace-nowrap border-b-2 transition-colors cursor-pointer"
          style={{
            borderColor: activeDoor === 'manual' ? '#c8834a' : 'transparent',
            color: activeDoor === 'manual' ? '#c8834a' : '#9a7a5a',
          }}
        >
          <Users className="w-4 h-4" />
          Manual Logger
        </button>
        <button
          type="button"
          onClick={() => setActiveDoor('barcode')}
          className="flex items-center gap-2 px-5 py-3.5 text-xs font-black whitespace-nowrap border-b-2 transition-colors cursor-pointer"
          style={{
            borderColor: activeDoor === 'barcode' ? '#c8834a' : 'transparent',
            color: activeDoor === 'barcode' ? '#c8834a' : '#9a7a5a',
          }}
        >
          <Barcode className="w-4 h-4" />
          Barcode Gun Scanner
        </button>
        {isStoreAccess && (
          <button
            type="button"
            onClick={() => setActiveDoor('store')}
            className="flex items-center gap-2 px-5 py-3.5 text-xs font-black whitespace-nowrap border-b-2 transition-colors cursor-pointer"
            style={{
              borderColor: activeDoor === 'store' ? '#c8834a' : 'transparent',
              color: activeDoor === 'store' ? '#c8834a' : '#9a7a5a',
            }}
          >
            <Store className="w-4 h-4" />
            ✨ Store Manager Hub
          </button>
        )}
      </div>

      {/* LOGGING FORM CARD */}
      <SpotlightCard className="p-4 sm:p-8 bg-white shadow-xl space-y-8 rounded-3xl" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.06)">

        <div className="p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm" style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.25)' }}>
          <div className="text-xs font-bold flex items-center gap-2" style={{ color: '#4a3a2a' }}>
            <span>Logged By: </span>
            <span className="text-white px-2.5 py-1 rounded-lg font-black uppercase tracking-wider text-[11px] shadow-sm" style={{ background: '#c8834a' }}>{user.replace('_', ' ')}</span>
          </div>
        </div>

        {/* TAB 2: DEDICATED BARCODE GUN SCANNER FLOW (CONTRACT V3.0) */}
        {activeDoor === 'barcode' && (
          <BarcodeDoorSection
            setSuccessMsg={setSuccessMsg} setErrorMsg={setErrorMsg}
            recordStageCompletion={recordStageCompletion} completedStagesMap={completedStagesMap} storeSendedSkus={storeSendedSkus}
            date={date}
            barcodeStage={barcodeStage} setBarcodeStage={setBarcodeStage}
            lotArticle={lotArticle} setLotArticle={setLotArticle} lotColor={lotColor} setLotColor={setLotColor} lotThickness={lotThickness} setLotThickness={setLotThickness}
            lotOptions={lotOptions} setLotOptions={setLotOptions} lotResults={lotResults} setLotResults={setLotResults} lotLoading={lotLoading} setLotLoading={setLotLoading} lotCategory={lotCategory} setLotCategory={setLotCategory}
            barcodeDcm={barcodeDcm} setBarcodeDcm={setBarcodeDcm}
            setBucketResult={setBucketResult} setShowBucketModal={setShowBucketModal}
            barcodeWorker={barcodeWorker} setBarcodeWorker={setBarcodeWorker} barcodeWorkerInput={barcodeWorkerInput} setBarcodeWorkerInput={setBarcodeWorkerInput} barcodeWorkerChecking={barcodeWorkerChecking}
            handleVerifyBarcodeWorker={handleVerifyBarcodeWorker} barcodeNotCheckedInModal={barcodeNotCheckedInModal} setBarcodeNotCheckedInModal={setBarcodeNotCheckedInModal} workerInputRef={workerInputRef}
            setCameraScanTarget={setCameraScanTarget}
          />
        )}
        {activeDoor === 'manual' && (
          <ManualDoorSection
            activeDoor={activeDoor}
            setSuccessMsg={setSuccessMsg} setErrorMsg={setErrorMsg}
            recordStageCompletion={recordStageCompletion}
            date={date}
            storeSendedSkus={storeSendedSkus}
            storeReceiveStatus={storeReceiveStatus}
            lotArticle={lotArticle} setLotArticle={setLotArticle} lotColor={lotColor} setLotColor={setLotColor} lotThickness={lotThickness} setLotThickness={setLotThickness}
            lotOptions={lotOptions} setLotOptions={setLotOptions} lotResults={lotResults} setLotResults={setLotResults} lotLoading={lotLoading} setLotLoading={setLotLoading} setLotCategory={setLotCategory}
            barcodeDcm={barcodeDcm} setBarcodeDcm={setBarcodeDcm}
            setBucketResult={setBucketResult} setShowBucketModal={setShowBucketModal}
            mounted={mounted}
          />
        )}

      </SpotlightCard>

      {/* EXCEL PREVIEW MODAL */}
            {mounted && showPreviewModal && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-4xl max-h-[90vh] flex flex-col relative overflow-hidden">
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
                disabled={commitLoading || !!uploadError}
                className="py-3 px-6 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                {commitLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Importing...</>
                ) : (
                  <><Upload className="w-4 h-4" /> Confirm &amp; Import to Database</>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ORDER NUMBER MODAL */}
            {mounted && typeof document !== 'undefined' && document.body && showOrderNumModal && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in p-4">
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
                className="flex-1 py-3 rounded-xl text-xs font-extrabold transition-colors cursor-pointer"
                style={{ background: '#f1f5f9', color: '#475569' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!uploadOrderNumber.trim() || uploadLoading}
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-3 rounded-xl text-xs font-extrabold text-white shadow-md flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:translate-y-0 cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}
              >
                {uploadLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...</> : <><FileSpreadsheet className="w-3.5 h-3.5" /> Choose File</>}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* PARTIAL-ACCEPT BUCKET RESULTS MODAL (Contract v3.0) */}
            {mounted && showBucketModal && bucketResult && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/70 backdrop-blur-md animate-fade-in p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden relative">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base">Production Logging Response</h3>
                  <p className="text-xs text-slate-400 font-semibold">Stage: {bucketResult.stage || bucketResult.stages?.[0] || 'N/A'}</p>
                </div>
              </div>
              <button
                onClick={() => setShowBucketModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Logged Bucket */}
              {bucketResult.logged && bucketResult.logged.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 font-black text-xs text-emerald-800 uppercase tracking-wider">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    Logged Successfully ({bucketResult.logged.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {bucketResult.logged.map(code => (
                      <span key={code} className="px-2 py-1 rounded bg-white text-emerald-700 font-mono font-bold text-xs border border-emerald-200 shadow-sm">
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Rework Bucket */}
              {bucketResult.rework && bucketResult.rework.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 font-black text-xs text-amber-800 uppercase tracking-wider">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    Rework Flagged ({bucketResult.rework.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {bucketResult.rework.map(code => (
                      <span key={code} className="px-2 py-1 rounded bg-white text-amber-700 font-mono font-bold text-xs border border-amber-200 shadow-sm">
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Sequence Blocked Bucket */}
              {bucketResult.sequence_blocked && bucketResult.sequence_blocked.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 font-black text-xs text-red-800 uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    Sequence Blocked ({bucketResult.sequence_blocked.length})
                  </div>
                  <ul className="text-xs text-red-700 font-semibold space-y-1.5 list-disc pl-5">
                    {bucketResult.sequence_blocked.map((msg, i) => {
                      const pieceStr = typeof msg === 'string' ? msg : JSON.stringify(msg);
                      const reasonObj = bucketResult.blocked?.find(b => b.piece === pieceStr);
                      return (
                        <li key={i}>
                          <span>{pieceStr}</span>
                          {reasonObj && <div className="text-[10px] text-red-500 font-medium mt-0.5">{reasonObj.reason}</div>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Skill Blocked Bucket */}
              {bucketResult.skill_blocked && bucketResult.skill_blocked.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 font-black text-xs text-red-800 uppercase tracking-wider">
                    <Lock className="w-4 h-4 text-red-500" />
                    Skill / Designation Blocked ({bucketResult.skill_blocked.length})
                  </div>
                  <ul className="text-xs text-red-700 font-semibold space-y-1.5 list-disc pl-5">
                    {bucketResult.skill_blocked.map((msg, i) => {
                      const pieceStr = typeof msg === 'string' ? msg : JSON.stringify(msg);
                      const reasonObj = bucketResult.blocked?.find(b => b.piece === pieceStr);
                      return (
                        <li key={i}>
                          <span>{pieceStr}</span>
                          {reasonObj && <div className="text-[10px] text-red-500 font-medium mt-0.5">{reasonObj.reason}</div>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Merge Blocked Bucket */}
              {bucketResult.merge_blocked && bucketResult.merge_blocked.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 font-black text-xs text-orange-800 uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    Merge Gate Blocked ({bucketResult.merge_blocked.length})
                  </div>
                  <ul className="text-xs text-orange-700 font-semibold space-y-1.5 list-disc pl-5">
                    {bucketResult.merge_blocked.map((msg, i) => {
                      const pieceStr = typeof msg === 'string' ? msg : JSON.stringify(msg);
                      const reasonObj = bucketResult.blocked?.find(b => b.piece === pieceStr);
                      return (
                        <li key={i}>
                          <span>{pieceStr}</span>
                          {reasonObj && <div className="text-[10px] text-orange-600 font-medium mt-0.5">{reasonObj.reason}</div>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Not Found Bucket */}
              {bucketResult.not_found && bucketResult.not_found.length > 0 && (
                <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 font-black text-xs text-slate-700 uppercase tracking-wider">
                    <XCircle className="w-4 h-4 text-slate-400" />
                    Not Found ({bucketResult.not_found.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {bucketResult.not_found.map(code => (
                      <span key={code} className="px-2 py-1 rounded bg-white text-slate-600 font-mono font-bold text-xs border border-slate-200">
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowBucketModal(false)}
                className="px-6 py-2.5 rounded-xl text-xs font-black text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-md cursor-pointer"
              >
                Close & Continue
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}



      {activeDoor === 'store' && (
        <StoreHubSection
          setSuccessMsg={setSuccessMsg} setErrorMsg={setErrorMsg}
          recordStageCompletion={recordStageCompletion}
          storeSendedSkus={storeSendedSkus} setStoreSendedSkus={setStoreSendedSkus}
          storeReceiveStatus={storeReceiveStatus} setStoreReceiveStatus={setStoreReceiveStatus}
          barcodeWorker={barcodeWorker} setBarcodeWorker={setBarcodeWorker} barcodeWorkerInput={barcodeWorkerInput} setBarcodeWorkerInput={setBarcodeWorkerInput} barcodeWorkerChecking={barcodeWorkerChecking}
          handleVerifyBarcodeWorker={handleVerifyBarcodeWorker} workerInputRef={workerInputRef}
          setCameraScanTarget={setCameraScanTarget}
        />
      )}

    </div>
  );
}
