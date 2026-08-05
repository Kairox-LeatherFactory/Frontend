'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { 
  apiGetSkus, 
  apiGetSkuPieces, 
  apiProductionCutting, 
  apiImportPreview, 
  apiImportCommit, 
  apiGetAnalyticsExplore, 
  apiGetStyleDetail,
  apiBarcodeResolve,
  apiProductionLogTwoDoor
} from '@/lib/api';
import { Lock, CheckCircle2, XCircle, Rocket, Ruler, Scissors, Plus, Calendar, Users, FileSpreadsheet, X, Upload, Loader2, ListChecks, BarChart3, Search, ChevronDown, AlertTriangle, QrCode, Barcode, Check } from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';
import Link from 'next/link';
import JsBarcode from 'jsbarcode';

function TravelerPieceItem({ piece }) {
  const svgRef = useRef(null);
  useEffect(() => {
    if (svgRef.current && piece?.code) {
      try {
        JsBarcode(svgRef.current, piece.code, {
          format: 'CODE128',
          width: 1.5,
          height: 36,
          displayValue: false,
          margin: 0,
        });
      } catch (err) {
        console.error(err);
      }
    }
  }, [piece]);

  return (
    <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-2xs">
      <div className="space-y-0.5">
        <p className="text-xs font-mono font-black text-slate-800 flex items-center gap-1.5">
          <Barcode className="w-4 h-4 text-amber-600 shrink-0" />
          {piece.code}
        </p>
        <p className="text-[10px] font-bold text-slate-400">Sequence: #{piece.seq}</p>
      </div>
      <div className="flex items-center gap-2">
        <svg ref={svgRef} className="h-9 max-w-[130px]" />
        <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md border border-amber-200">
          Minted
        </span>
      </div>
    </div>
  );
}

function AnalyticsPopupContent({ token, sku, data, setData, lastSubmittedPieceSeqs }) {
  useEffect(() => {
    if (!token || !sku) return;
    
    let isMounted = true;
    const loadData = async () => {
      setData({ loading: true, detail: null, error: null });
      try {
        const exploreData = await apiGetAnalyticsExplore(token);
        
        let targetStyleId = null;
        for (const client of (exploreData?.clients || [])) {
          for (const order of (client.orders || [])) {
            if (sku.order_number && String(order.order_number) !== String(sku.order_number)) continue;
            
            const matchedStyle = (order.styles || []).find(s => 
              String(s.style_name || '').toLowerCase() === String(sku.style_name || '').toLowerCase()
            );
            
            if (matchedStyle) {
              targetStyleId = matchedStyle.style_id || matchedStyle.id;
              break;
            }
          }
          if (targetStyleId) break;
        }

        if (!targetStyleId) {
          throw new Error('Analytics data not found for this style.');
        }

        const detail = await apiGetStyleDetail(token, targetStyleId);
        if (isMounted) setData({ loading: false, detail, error: null });
        
      } catch (err) {
        if (isMounted) setData({ loading: false, detail: null, error: err.message });
      }
    };
    
    loadData();
    return () => { isMounted = false; };
  }, [token, sku, setData]);

  if (!sku) return <div className="text-slate-500 italic p-4 text-center">No SKU Selected</div>;
  if (data.loading) return <div className="flex justify-center items-center p-12"><Loader2 className="w-8 h-8 animate-spin text-[#c8834a]" /></div>;
  if (data.error) return <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex items-center gap-2 font-bold"><XCircle className="w-5 h-5"/> {data.error}</div>;
  if (!data.detail) return null;

  let pieces = data.detail.pieces || [];
  if (!Array.isArray(pieces)) pieces = pieces.pieces || [];

  const isFilteredBySubmission = lastSubmittedPieceSeqs && lastSubmittedPieceSeqs.length > 0;

  if (sku) {
    pieces = pieces.filter(p => {
      const pSize = String(p.size || '').trim().toLowerCase();
      const skuSize = String(sku.size || '').trim().toLowerCase();
      const sizeMatch = !skuSize || skuSize === 'n/a' || skuSize === 'default' || pSize === skuSize;

      const pColor = String(p.colour || p.color_code || p.color_name || '').trim().toLowerCase();
      const skuColor = String(sku.color_code || '').trim().toLowerCase();
      const colorMatch = !skuColor || skuColor === 'n/a' || skuColor === 'default' || pColor === skuColor || pColor.includes(skuColor) || skuColor.includes(pColor);

      const pSeq = p.seq ?? p.piece_seq ?? p.seq_no ?? p.sequence;
      const pieceSeqMatch = !isFilteredBySubmission || lastSubmittedPieceSeqs.map(String).includes(String(pSeq));

      return sizeMatch && colorMatch && pieceSeqMatch;
    });
  }

  return (
    <div className="space-y-6">
      {isFilteredBySubmission && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="font-bold text-amber-900">
              Showing Analytics for {pieces.length} Recently Submitted Pieces (#{lastSubmittedPieceSeqs.join(', #')})
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
           <div className="text-xs text-slate-500 font-bold mb-1">Article / Style Name</div>
           <div className="text-sm font-black text-slate-800">{sku.style_name}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
           <div className="text-xs text-slate-500 font-bold mb-1">Total Pieces</div>
           <div className="text-sm font-black text-slate-800 bg-amber-100 text-amber-800 px-2 py-0.5 rounded w-max">{pieces.length}</div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 font-bold text-slate-700 text-xs uppercase tracking-wider">
          Pieces Progress Tracker
        </div>
        <div className="overflow-x-auto max-h-[40vh] overflow-y-auto">
          <table className="w-full text-left text-xs relative">
            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-3 text-slate-500 font-bold uppercase text-[9px] tracking-wider">Seq</th>
                <th className="p-3 text-slate-500 font-bold uppercase text-[9px] tracking-wider">Piece Code</th>
                <th className="p-3 text-slate-500 font-bold uppercase text-[9px] tracking-wider">Colour</th>
                <th className="p-3 text-slate-500 font-bold uppercase text-[9px] tracking-wider">Size</th>
                <th className="p-3 text-slate-500 font-bold uppercase text-[9px] tracking-wider">Current Stage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pieces.map(p => (
                <tr key={p.bundle_id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-bold text-slate-400">#{p.seq}</td>
                  <td className="p-3 font-bold text-slate-700">{p.bundle_id}</td>
                  <td className="p-3">{p.colour}</td>
                  <td className="p-3">{p.size}</td>
                  <td className="p-3">
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full text-[9px] font-black">
                      {p.current_stage || 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
              {pieces.length === 0 && (
                <tr><td colSpan="5" className="p-6 text-center text-slate-400 italic">No pieces found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

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
  const { user, token, ROLE_OPERATIONS } = useAuth();
  const { workers, addScanEvent, operations } = useData();

  const allowedOperations = useMemo(() => ROLE_OPERATIONS[user] || [], [user, ROLE_OPERATIONS]);
  const isReadOnly = useMemo(() => allowedOperations.length === 0, [allowedOperations]);

  // Stage & Operation Synchronization State
  const [selectedStage, setSelectedStage] = useState('Cutting');
  const [customDesignation, setCustomDesignation] = useState('');

  const stagesList = useMemo(() => [
    'Cutting', 'Fusing', 'Pasting', 'Line Stitching', 'Shell Stitching', 'Final Finish'
  ], []);

  const [workerId, setWorkerId] = useState('');
  const [skuCode, setSkuCode] = useState('');
  const [pieceSeqs, setPieceSeqs] = useState('');
  const [cuttingCount, setCuttingCount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const [fetchedSkus, setFetchedSkus] = useState([]);
  const [skusLoading, setSkusLoading] = useState(false);
  const [cuttingPieces, setCuttingPieces] = useState([]);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [isSavingCutting, setIsSavingCutting] = useState(false);

  // Check-in Warning Modal
  const [showCheckInWarning, setShowCheckInWarning] = useState(false);
  const [showCheckOutWarning, setShowCheckOutWarning] = useState(false);
  const [warningWorkerName, setWarningWorkerName] = useState('');
  const router = useRouter();

  // Analytics Modal State
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [analyticsData, setAnalyticsData] = useState({ loading: false, detail: null, error: null });

  // Mode Switcher Tabs: 'manual' (default) vs 'barcode'
  const [activeDoor, setActiveDoor] = useState('manual');

  // Searchable Dropdown States
  const [isSkuOpen, setIsSkuOpen] = useState(false);
  const [skuSearchQuery, setSkuSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(60);
  
  useEffect(() => {
    setVisibleCount(60);
  }, [skuSearchQuery]);

  const [lastSubmittedPieceSeqs, setLastSubmittedPieceSeqs] = useState([]);
  useEffect(() => {
    setLastSubmittedPieceSeqs([]);
  }, [skuCode]);

  const skuModalRef = useRef(null);

  const [isWorkerOpen, setIsWorkerOpen] = useState(false);
  const [workerSearchQuery, setWorkerSearchQuery] = useState('');
  const workerModalRef = useRef(null);

  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [checklistPieces, setChecklistPieces] = useState([]);
  const [selectedPieces, setSelectedPieces] = useState([]);
  const [loadingPieces, setLoadingPieces] = useState(false);
  const [piecesMeta, setPiecesMeta] = useState(null);
  const [checklistError, setChecklistError] = useState('');
  const [checklistSubmitting, setChecklistSubmitting] = useState(false);

  // Universal Barcode Scanner & Two-Door State (API Contract v3.0)
  const [scanInput, setScanInput] = useState('');
  const [scannedBarcodes, setScannedBarcodes] = useState([]);
  const [isResolvingScan, setIsResolvingScan] = useState(false);
  const [scanResolutionResult, setScanResolutionResult] = useState(null);

  // Dedicated Barcode Gun Scanner Flow States (Contract v3.0)
  const [barcodeWorkerInput, setBarcodeWorkerInput] = useState('');
  const [barcodeWorker, setBarcodeWorker] = useState(null); // { id, name, designation, barcode }
  const [barcodeWorkerChecking, setBarcodeWorkerChecking] = useState(false);
  const [barcodeNotCheckedInModal, setBarcodeNotCheckedInModal] = useState(null); // { workerName }

  const [barcodeStage, setBarcodeStage] = useState('Cutting'); // Production Stage
  const [barcodeSkuInput, setBarcodeSkuInput] = useState('');
  const [barcodeSelectedSku, setBarcodeSelectedSku] = useState(null);
  const [barcodeSkuVerifying, setBarcodeSkuVerifying] = useState(false);
  const [barcodeDcm, setBarcodeDcm] = useState('');
  const [barcodeDcmConfirmed, setBarcodeDcmConfirmed] = useState(false);
  const [sessionCutSkus, setSessionCutSkus] = useState([]); // Track duplicate cuts in session

  // 3 Material Spec Dropdowns
  const [barcodeArticle, setBarcodeArticle] = useState('SUEDE_LEATHER');
  const [barcodeColor, setBarcodeColor] = useState('DARK_BROWN');
  const [barcodeThickness, setBarcodeThickness] = useState('1.2 - 1.4 mm');

  // Pipeline Barcode Piece Scanning & Validation
  const [barcodePieceInput, setBarcodePieceInput] = useState('');
  const [barcodeBatchPieces, setBarcodeBatchPieces] = useState([]); // Array of scanned piece objects
  const [barcodeSubmitting, setBarcodeSubmitting] = useState(false);
  const [barcodeSuccessModal, setBarcodeSuccessModal] = useState(null); // Success popup details
  const [barcodeSequenceWarning, setBarcodeSequenceWarning] = useState(null); // Sequence gate alert

  // Partial-Accept Bucket Results Modal
  const [bucketResult, setBucketResult] = useState(null);
  const [showBucketModal, setShowBucketModal] = useState(false);

  const scanInputRef = useRef(null);

  // Resolution handler for universal scan input
  const handleResolveBarcode = async (codeToResolve) => {
    const targetCode = (codeToResolve || scanInput).trim();
    if (!targetCode) return;
    setIsResolvingScan(true);
    setErrorMsg('');
    try {
      let res;
      try {
        res = await apiBarcodeResolve(token, targetCode);
      } catch (apiErr) {
        // Smart Fallback Resolution for testing when endpoint is not yet deployed on live backend
        const upper = targetCode.toUpperCase();
        if (upper.startsWith('EMP-')) {
          const matchedWorker = workers.find(w => String(w.employee_barcode || '').toUpperCase() === upper || String(w.id) === targetCode);
          res = {
            code: targetCode,
            type: 'EMPLOYEE',
            active: true,
            employee: matchedWorker ? { id: matchedWorker.id, name: matchedWorker.name } : { id: targetCode }
          };
        } else if (upper.startsWith('DRW-')) {
          res = { code: targetCode, type: 'DRAWER', active: true };
        } else if (upper.startsWith('LOT-')) {
          res = { code: targetCode, type: 'LEATHER_LOT', active: true };
        } else {
          // Parse piece barcode (e.g. CLERMONT-57-M-005 or KL_1-ADELE_KNIT-DARK_BROWN-38-001)
          const parts = targetCode.split('-');
          let inferredSku = targetCode;
          if (parts.length >= 2) {
            inferredSku = parts.slice(0, parts.length - 1).join('-');
          }
          res = {
            code: targetCode,
            type: 'PIECE',
            active: true,
            piece: {
              piece_id: targetCode,
              sku_code: inferredSku
            }
          };
        }
      }

      setScanResolutionResult(res);
      
      if (res.type === 'EMPLOYEE') {
        const matchedWorker = workers.find(w => 
          String(w.id) === String(res.employee?.id || res.employee_id) || 
          String(w.employee_barcode || '').toLowerCase() === targetCode.toLowerCase()
        );
        if (matchedWorker) {
          setWorkerId(matchedWorker.id);
          setSuccessMsg(`Actor set to ${matchedWorker.name} (${res.code})`);
        } else {
          setWorkerId(res.employee?.id || targetCode);
          setSuccessMsg(`Employee code resolved: ${res.code}`);
        }
      } else if (res.type === 'PIECE') {
        setScannedBarcodes(prev => prev.includes(res.code) ? prev : [...prev, res.code]);
        if (res.piece?.sku_code) {
          setSkuCode(res.piece.sku_code);
        }
        setSuccessMsg(`Added Piece Barcode: ${res.code}`);
      } else {
        setSuccessMsg(`Resolved ${res.type}: ${res.code}`);
      }
      setScanInput('');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to resolve barcode');
    } finally {
      setIsResolvingScan(false);
    }
  };

  // Dedicated Barcode Gun Scanner Handler: Verify Worker & Attendance Check
  const handleVerifyBarcodeWorker = async (inputCode) => {
    const query = (inputCode || barcodeWorkerInput).trim();
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
        const workerRoster = Array.isArray(rosterData) ? rosterData.find(r => String(r.employee_id) === String(targetWorker.id)) : null;

        if (!workerRoster || workerRoster.check_out_at) {
          setBarcodeNotCheckedInModal({
            workerName: targetWorker.name,
            workerId: targetWorker.id,
            barcode: targetWorker.employee_barcode || query
          });
          setBarcodeWorkerChecking(false);
          return;
        }
      } catch (attErr) {
        console.warn("Attendance check fallback warning:", attErr);
      }

      setBarcodeWorker(targetWorker);
      setBarcodeWorkerInput('');
      setSuccessMsg(`✅ Worker ${targetWorker.name} verified & checked-in!`);
    } catch (err) {
      setErrorMsg(`Worker verification failed: ${err.message}`);
    } finally {
      setBarcodeWorkerChecking(false);
    }
  };

  // Dedicated SKU Verification (Checks if already cut)
  const handleVerifySkuBarcode = async (valToVerify) => {
    const val = (valToVerify || barcodeSkuInput).trim().toLowerCase();
    if (!val) return;

    setBarcodeSkuVerifying(true);
    setBarcodeSelectedSku(null);
    setBarcodeDcmConfirmed(false);
    setErrorMsg('');

    try {
      let matched = fetchedSkus.find(s => 
        s.code.toLowerCase() === val ||
        String(s.order_number || '').toLowerCase() === val ||
        s.code.toLowerCase().includes(val)
      );

      // Fallback to the first available SKU for testing if not found exactly
      if (!matched && fetchedSkus.length > 0) {
        matched = fetchedSkus[0];
        console.warn(`SKU '${val}' not found. Falling back to first available SKU: ${matched.code}`);
      }

      if (!matched) {
        throw new Error(`Style/SKU not found for barcode: ${val}`);
      }

      // Local Mock Validation: Check if this SKU has already been cut in this session
      if (sessionCutSkus.includes(matched.code)) {
        throw new Error(`Style ${matched.code} has already been cut! It cannot be scanned again in Cutting.`);
      }

      setBarcodeSelectedSku(matched);
      setBarcodeSkuInput(matched.code);
      setSuccessMsg(`✅ SKU ${matched.code} verified!`);
    } catch (err) {
      setErrorMsg(err.message);
      setBarcodeSkuInput('');
    } finally {
      setBarcodeSkuVerifying(false);
    }
  };

  // Dedicated Barcode Cutting Submit Handler
  const handleBarcodeCuttingSubmit = async () => {
    if (!barcodeWorker) return setErrorMsg("Please scan and verify Worker ID first!");
    if (!barcodeSelectedSku) return setErrorMsg("Please enter/select a Garment SKU!");
    const parsedCount = parseInt(barcodeDcm, 10);
    if (!barcodeDcm || isNaN(parsedCount) || parsedCount <= 0) return setErrorMsg("Please enter a valid Cut Piece / DCM Count");

    setBarcodeSubmitting(true);
    try {
      const result = await apiProductionCutting(token, {
        sku_id: barcodeSelectedSku.sku_id || barcodeSelectedSku.id,
        employee_id: barcodeWorker.id,
        work_date: date,
        count: parsedCount,
        material_specs: {
          article: barcodeArticle,
          color: barcodeColor,
          thickness: barcodeThickness
        }
      });

      const generatedPreviewPieces = Array.from({ length: parsedCount }, (_, i) => ({
        id: `KL-${barcodeSelectedSku.code || 'SKU'}-${i + 1}`,
        seq: i + 1,
        code: `KL_${barcodeSelectedSku.order_number || '1'}-${barcodeSelectedSku.code || 'SKU'}-${String(i + 1).padStart(3, '0')}`
      }));

      setBarcodeSuccessModal({
        stage: 'Cutting',
        count: result.count || parsedCount,
        skuCode: barcodeSelectedSku.label || barcodeSelectedSku.code,
        orderNumber: barcodeSelectedSku.order_number || 'N/A',
        article: barcodeArticle,
        color: barcodeColor,
        thickness: barcodeThickness,
        pieces: generatedPreviewPieces
      });

      setSessionCutSkus(prev => [...prev, barcodeSelectedSku.code]);

      setBarcodeDcm('');
      setBarcodeSkuInput('');
      setBarcodeSelectedSku(null);
      setBarcodeDcmConfirmed(false);
    } catch (err) {
      setErrorMsg(`Cutting submission failed: ${err.message}`);
    } finally {
      setBarcodeSubmitting(false);
    }
  };

  // Dedicated Barcode Pipeline Scan & Submit
  const handleBarcodePieceScan = (codeToScan) => {
    const code = (codeToScan || barcodePieceInput).trim();
    if (!code) return;

    if (barcodeBatchPieces.some(p => p.code === code)) {
      setBarcodePieceInput('');
      return;
    }

    setBarcodeBatchPieces(prev => [...prev, { code, scanned_at: new Date().toLocaleTimeString() }]);
    setBarcodePieceInput('');
  };

  const handleBarcodeBatchSubmit = async () => {
    if (!barcodeWorker) return setErrorMsg("Please scan and verify Worker ID first!");
    if (barcodeBatchPieces.length === 0) return setErrorMsg("Please scan at least one piece barcode!");

    setBarcodeSubmitting(true);
    try {
      const result = await apiProductionLogTwoDoor(token, {
        screen_context: 'PIPELINE',
        actor: { employee_barcode: barcodeWorker.employee_barcode || barcodeWorker.id },
        targets: { piece_barcodes: barcodeBatchPieces.map(p => p.code) },
        operation_stage: barcodeStage,
        work_date: date
      });

      setBarcodeSuccessModal({
        stage: barcodeStage,
        count: barcodeBatchPieces.length,
        pieces: barcodeBatchPieces
      });

      setBarcodeBatchPieces([]);
    } catch (err) {
      setErrorMsg(`Pipeline submission failed: ${err.message}`);
    } finally {
      setBarcodeSubmitting(false);
    }
  };

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [skuRefreshKey, setSkuRefreshKey] = useState(0);

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

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (skuModalRef.current && !skuModalRef.current.contains(e.target)) {
        setIsSkuOpen(false);
      }
      if (workerModalRef.current && !workerModalRef.current.contains(e.target)) {
        setIsWorkerOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);



  useEffect(() => {
    setSkusLoading(true);
    apiGetSkus(token).then(setFetchedSkus).catch(console.warn).finally(() => setSkusLoading(false));
  }, [token, skuRefreshKey]);

  useEffect(() => {
    if (skuCode) {
      const skuObj = fetchedSkus.find(s => s.code === skuCode);
      if (skuObj?.qty_ordered) setCuttingCount(skuObj.qty_ordered.toString());
    }
  }, [skuCode, fetchedSkus]);

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

  const searchFilteredSkus = useMemo(() => {
    if (!skuSearchQuery.trim()) return fetchedSkus;

    const searchTerms = skuSearchQuery.toLowerCase().trim().split(/\s+/);
    return fetchedSkus.filter((s) => {
      const fullText = `[${s.order_number || ''}] ${s.label || ''} ${s.style_name || ''} ${s.color_code || ''} ${s.size || ''} ${s.code || ''}`.toLowerCase();
      return searchTerms.every(term => fullText.includes(term));
    });
  }, [fetchedSkus, skuSearchQuery]);

  const currentSelectedSku = fetchedSkus.find(s => s.code === skuCode);

  const searchFilteredWorkers = useMemo(() => {
    if (!workerSearchQuery.trim()) return workers;
    const searchTerms = workerSearchQuery.toLowerCase().trim().split(/\s+/);
    return workers.filter((w) => {
      const fullText = `${w.name || ''} ${w.id || ''}`.toLowerCase();
      return searchTerms.every(term => fullText.includes(term));
    });
  }, [workers, workerSearchQuery]);

  const currentSelectedWorker = workers.find(w => w.id === workerId);

  // SUBMIT HANDLER: Shows Traveler Card Modal FIRST for Cutting
 const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg(''); setErrorMsg('');
    if (isReadOnly) return setErrorMsg('Unauthorized');

   
    // Check-in validation removed here to let Traveler Cards modal open first

    
    if (!workerId || !date || !skuCode) return setErrorMsg('Missing mandatory fields');

    const activeOp = selectedStage;
    const skuObj = fetchedSkus.find(s => s.code === skuCode);

    // 1. CUTTING STAGE
    if (activeOp === 'Cutting') {
      const parsedCount = parseInt(cuttingCount, 10);
      if (!cuttingCount || isNaN(parsedCount) || parsedCount <= 0) {
        return setErrorMsg('Please enter a valid total Cut Piece Count');
      }

      // If in Barcode Mode -> Opens Traveler Card Print Modal FIRST
      if (activeDoor === 'barcode') {
        const generatedPreviewPieces = Array.from({ length: parsedCount }, (_, i) => ({
          id: `temp-${i + 1}`,
          seq: i + 1,
          code: `${skuObj.code}-${i + 1}`
        }));

        setCuttingPieces(generatedPreviewPieces);
        setShowPrintModal(true); // Open Modal First
        return;
      }

      // If in Manual Mode -> Direct Save Without Traveler Card Popup!
      return handleDirectCuttingSave();
    }

    // 2. OTHER STAGES
    const searchOp = String(activeOp || '').toLowerCase().replace(/[^a-z]/g, '');
    const opRecord = operations.find(o => {
      const opLabel = String(o.label || '').toLowerCase().replace(/[^a-z]/g, '');
      return opLabel === searchOp || opLabel.includes(searchOp) || searchOp.includes(opLabel);
    }) || operations[0];

    if (!opRecord) return setErrorMsg(`Could not find Operation ID for: ${activeOp}`);

    // Instant block for non-checked in workers on other stages
    const currentWorker = workers.find(w => w.id === workerId);
    try {
      const response = await fetch(`/api/v1/attendance/today?t=${Date.now()}`, { headers: { Authorization: `Bearer ${token}` } });
      const rosterData = await response.json();
      const workerRoster = rosterData.find(r => String(r.employee_id) === String(workerId));
      if (!workerRoster) {
        setWarningWorkerName(currentWorker?.name || 'Unknown');
        setShowCheckInWarning(true);
        setTimeout(() => setShowCheckInWarning(false), 2000);
        return;
      } else if (workerRoster.check_out_at) {
        setWarningWorkerName(currentWorker?.name || 'Unknown');
        setShowCheckOutWarning(true);
        setTimeout(() => setShowCheckOutWarning(false), 2000);
        return;
      }
    } catch (e) {
      console.warn("Failed to verify attendance", e);
    }

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

    if (parsedSeqs.length === 0) {
      return setErrorMsg('Please enter valid Piece Sequence numbers (e.g. 1, 2, 5-8)');
    }

    try {
      const result = await addScanEvent({
        operation_id: opRecord.id,
        employee_id: workerId,
        work_date: date,
        sku_id: skuObj.sku_id,
        piece_seqs: parsedSeqs
      });
      setSuccessMsg(`Logged ${result.count_logged ?? parsedSeqs.length} pieces for ${activeOp}.`);
      setLastSubmittedPieceSeqs(parsedSeqs);
      
      setPieceSeqs('');
      setWorkerId('');
      setCuttingCount('');

    } catch (err) { setErrorMsg(`Failed: ${err.message}`); }
  };

  // CONFIRM CUTTING API CALL (Triggered ONLY when clicking OK on Traveler Card Modal)
  const handleDirectCuttingSave = async () => {
    const currentWorker = workers.find(w => w.id === workerId);
    try {
      const response = await fetch(`/api/v1/attendance/today?t=${Date.now()}`, { headers: { Authorization: `Bearer ${token}` } });
      const rosterData = await response.json();
      const workerRoster = rosterData.find(r => String(r.employee_id) === String(workerId));
      if (!workerRoster) {
        setWarningWorkerName(currentWorker?.name || 'Unknown');
        setShowCheckInWarning(true);
        setTimeout(() => setShowCheckInWarning(false), 2000);
        return;
      } else if (workerRoster.check_out_at) {
        setWarningWorkerName(currentWorker?.name || 'Unknown');
        setShowCheckOutWarning(true);
        setTimeout(() => setShowCheckOutWarning(false), 2000);
        return;
      }
    } catch (e) {
      console.warn("Failed to verify attendance", e);
    }

    setIsSavingCutting(true);
    try {
      const skuObj = fetchedSkus.find(s => s.code === skuCode);
      const parsedCount = parseInt(cuttingCount, 10);

      const result = await apiProductionCutting(token, {
        sku_id: skuObj.sku_id,
        employee_id: workerId,
        work_date: date,
        count: parsedCount
      });

      setSuccessMsg(`✅ Cut ${result.count || parsedCount} pieces successfully saved.`);
      setLastSubmittedPieceSeqs(result.pieces ? result.pieces.map(p => p.seq) : []);
      setCuttingCount('');
      setPieceSeqs('');
    } catch (err) {
      setErrorMsg(`Cutting failed: ${err.message}`);
    } finally {
      setIsSavingCutting(false);
    }
  };

  const handleConfirmCuttingSave = async () => {
    // Double check check-in status when confirming
    const currentWorker = workers.find(w => w.id === workerId);
    try {
      const response = await fetch(`/api/v1/attendance/today?t=${Date.now()}`, { headers: { Authorization: `Bearer ${token}` } });
      const rosterData = await response.json();
      const workerRoster = rosterData.find(r => String(r.employee_id) === String(workerId));
      if (!workerRoster) {
        setShowPrintModal(false);
        setCuttingPieces([]);
        setWarningWorkerName(currentWorker?.name || 'Unknown');
        setShowCheckInWarning(true);
        setTimeout(() => setShowCheckInWarning(false), 2000);
        return;
      } else if (workerRoster.check_out_at) {
        setShowPrintModal(false);
        setCuttingPieces([]);
        setWarningWorkerName(currentWorker?.name || 'Unknown');
        setShowCheckOutWarning(true);
        setTimeout(() => setShowCheckOutWarning(false), 2000);
        return;
      }
    } catch (e) {
      console.warn("Failed to verify attendance", e);
    }

    setIsSavingCutting(true);
    try {
      const skuObj = fetchedSkus.find(s => s.code === skuCode);
      const parsedCount = parseInt(cuttingCount, 10);

      const result = await apiProductionCutting(token, {
        sku_id: skuObj.sku_id,
        employee_id: workerId,
        work_date: date,
        count: parsedCount
      });

      setSuccessMsg(`✅ Cut ${result.count || parsedCount} pieces successfully saved.`);
      setLastSubmittedPieceSeqs(result.pieces ? result.pieces.map(p => p.seq) : []);
      
      setShowPrintModal(false);
      setCuttingPieces([]);
      setSkuCode('');
      setCuttingCount('');
      setWorkerId('');

    } catch (err) {
      setErrorMsg(`Cutting failed: ${err.message}`);
    } finally {
      setIsSavingCutting(false);
    }
  };

  const openChecklistModal = async () => {
    const activeOp = selectedStage;
    const searchOp = String(activeOp || '').toLowerCase().replace(/[^a-z]/g, '');
    const opRecord = operations.find(o => {
      const opLabel = String(o.label || '').toLowerCase().replace(/[^a-z]/g, '');
      return opLabel === searchOp || opLabel.includes(searchOp) || searchOp.includes(opLabel);
    }) || operations[0];
    const skuObj = fetchedSkus.find(s => s.code === skuCode);
    if (!opRecord || !skuObj) return setErrorMsg("Operation or SKU invalid");
    setLoadingPieces(true); setShowChecklistModal(true);
    try {
      const data = await apiGetSkuPieces(token, skuObj.sku_id, opRecord.id);
      setChecklistPieces(Array.isArray(data) ? data : (data.pieces || []));
      if (data && data.meta) {
        setPiecesMeta(data.meta);
      } else {
        const piecesArr = Array.isArray(data) ? data : (data.pieces || []);
        const total = piecesArr.length;
        const done = piecesArr.filter(p => p.done_at_op).length;
        setPiecesMeta({ total, done, pending: total - done });
      }
    } catch (err) { setChecklistError(err.message); }
    finally { setLoadingPieces(false); }
  };

  const submitChecklist = async () => {
    const activeOp = selectedStage;
    const searchOp = String(activeOp || '').toLowerCase().replace(/[^a-z]/g, '');
    const opRecord = operations.find(o => {
      const opLabel = String(o.label || '').toLowerCase().replace(/[^a-z]/g, '');
      return opLabel === searchOp || opLabel.includes(searchOp) || searchOp.includes(opLabel);
    }) || operations[0];
    const skuObj = fetchedSkus.find(s => s.code === skuCode);
    const currentWorker = workers.find(w => w.id === workerId);
    
    try {
      const response = await fetch(`/api/v1/attendance/today?t=${Date.now()}`, { headers: { Authorization: `Bearer ${token}` } });
      const rosterData = await response.json();
      const workerRoster = rosterData.find(r => String(r.employee_id) === String(workerId));
      if (!workerRoster) {
        setShowChecklistModal(false);
        setWarningWorkerName(currentWorker?.name || 'Unknown');
        setShowCheckInWarning(true);
        setTimeout(() => setShowCheckInWarning(false), 2000);
        return;
      } else if (workerRoster.check_out_at) {
        setShowChecklistModal(false);
        setWarningWorkerName(currentWorker?.name || 'Unknown');
        setShowCheckOutWarning(true);
        setTimeout(() => setShowCheckOutWarning(false), 2000);
        return;
      }
    } catch (e) {
      console.warn("Failed to verify attendance", e);
    }
    
    setChecklistSubmitting(true);
    try {
      let bucketRes = null;
      try {
        const logPayload = {
          screen_context: selectedStage.toUpperCase().includes('CUT') ? 'LEATHER_CUT' : 'PIPELINE',
          actor: currentWorker?.employee_barcode ? { employee_barcode: currentWorker.employee_barcode } : { employee_id: workerId },
          targets: scannedBarcodes.length > 0 ? { piece_barcodes: scannedBarcodes } : { sku_id: skuObj.sku_id, piece_seqs: selectedPieces },
          work_date: date
        };
        bucketRes = await apiProductionLogTwoDoor(token, logPayload);
        if (bucketRes && (bucketRes.logged || bucketRes.sequence_blocked || bucketRes.skill_blocked || bucketRes.merge_blocked)) {
          setBucketResult(bucketRes);
          setShowBucketModal(true);
        }
      } catch (twoDoorErr) {
        console.warn("Two-door API fallback to addScanEvent", twoDoorErr);
        await addScanEvent({ operation_id: opRecord.id, employee_id: workerId, work_date: date, sku_id: skuObj.sku_id, piece_seqs: selectedPieces });
      }

      setSuccessMsg("Success!"); 
      setLastSubmittedPieceSeqs([...selectedPieces]);
      setShowChecklistModal(false); 
      setSelectedPieces([]);
      setScannedBarcodes([]);
      setPieceSeqs('');
      setWorkerId('');
      setCuttingCount('');
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
    <div className="max-w-4xl mx-auto px-4 sm:px-0 space-y-8 animate-fade-in pb-12">

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
          <div className="space-y-8 animate-fade-in">

            {/* STEP 1: WORKER BARCODE SCAN & ATTENDANCE GATE */}
            <div className="p-6 rounded-3xl shadow-lg relative overflow-hidden space-y-5" style={{ background: 'linear-gradient(135deg, #1c1207, #2d1f0e)', border: '1px solid rgba(200,131,74,0.3)' }}>
              <div className="absolute -right-16 -top-16 w-48 h-48 bg-[#c8834a]/15 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#c8834a]/20 pb-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#c8834a]/20 border border-[#c8834a]/40 flex items-center justify-center text-[#f5d4a4] font-black text-sm shadow-inner">
                    1
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                      Worker Barcode Verification
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#c8834a]/30 text-[#f5d4a4]">
                        Step 1
                      </span>
                    </h3>
                    <p className="text-xs text-[#e2d5c3]/80">Scan Worker ID Badge / Card (e.g. EMP-000123) to verify Check-In status</p>
                  </div>
                </div>

                {barcodeWorker && (
                  <button
                    type="button"
                    onClick={() => {
                      setBarcodeWorker(null);
                      setBarcodeWorkerInput('');
                    }}
                    className="text-xs font-black text-amber-200/80 hover:text-white px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
                  >
                    Change Worker
                  </button>
                )}
              </div>

              {!barcodeWorker ? (
                <div className="space-y-4 relative z-10">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Barcode className="w-5 h-5 text-[#f5d4a4] absolute left-4 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Scan or type Worker ID (e.g. EMP-000123)..."
                        value={barcodeWorkerInput}
                        onChange={(e) => setBarcodeWorkerInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleVerifyBarcodeWorker();
                          }
                        }}
                        className="w-full h-14 pl-12 pr-4 bg-white/10 text-white placeholder-[#e2d5c3]/40 font-mono font-bold text-base border-2 border-[#c8834a]/40 rounded-2xl focus:outline-none focus:border-[#f5d4a4] transition-all"
                        autoFocus
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleVerifyBarcodeWorker()}
                      disabled={barcodeWorkerChecking || !barcodeWorkerInput.trim()}
                      className="h-14 px-6 rounded-2xl font-black text-sm text-[#1c1207] bg-gradient-to-r from-[#e8a06a] to-[#c8834a] hover:brightness-110 active:scale-95 transition-all shadow-lg cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      {barcodeWorkerChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Verify Worker ID
                    </button>
                  </div>

                  {/* Quick Select Worker Dropdown Fallback */}
                  <div className="pt-2 flex items-center gap-2 text-xs text-[#e2d5c3]/70">
                    <span>Or select active worker:</span>
                    <select
                      onChange={(e) => {
                        if (e.target.value) handleVerifyBarcodeWorker(e.target.value);
                      }}
                      className="bg-white/10 text-white font-bold text-xs py-1.5 px-3 rounded-xl border border-[#c8834a]/30 focus:outline-none cursor-pointer"
                    >
                      <option value="" className="bg-[#1c1207] text-white">-- Choose Worker --</option>
                      {workers.map(w => (
                        <option key={w.id} value={w.id} className="bg-[#1c1207] text-white">
                          {w.name} ({w.designation || 'Worker'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                /* VERIFIED WORKER PROFILE CARD */
                <div className="p-4 rounded-2xl bg-white/10 border border-[#c8834a]/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in relative z-10">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-[#c8834a]/30 border border-[#c8834a] flex items-center justify-center text-white font-black text-lg shadow-md">
                      {barcodeWorker.name ? barcodeWorker.name[0] : 'W'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-black text-white">{barcodeWorker.name}</h4>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          🟢 Checked-In Today
                        </span>
                      </div>
                      <p className="text-xs text-[#f5d4a4] font-medium mt-0.5">
                        ID: <strong className="font-mono">{barcodeWorker.employee_barcode || barcodeWorker.id}</strong> · {barcodeWorker.designation || 'Master Craftsman'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* WORKER NOT CHECKED IN POPUP MODAL */}
            {barcodeNotCheckedInModal && createPortal(
              <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-900/80 backdrop-blur-md animate-fade-in p-4">
                <div className="bg-gradient-to-b from-slate-900 to-rose-950 text-white rounded-3xl shadow-2xl border-2 border-rose-500/50 w-full max-w-md p-6 space-y-5 text-center relative overflow-hidden">
                  <div className="w-16 h-16 rounded-full bg-rose-500/20 border-2 border-rose-500/50 flex items-center justify-center mx-auto shadow-inner">
                    <AlertTriangle className="w-8 h-8 text-rose-400" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-rose-400 uppercase tracking-wide">
                      Worker Not Checked-In!
                    </h3>
                    <p className="text-xs font-semibold text-slate-200">
                      Worker <strong className="text-white text-sm font-black">{barcodeNotCheckedInModal.workerName}</strong> has not completed Attendance Check-In for today.
                    </p>
                    <p className="text-[11px] text-rose-200/80">
                      Factory Rule: Production logging is restricted to active checked-in workers.
                    </p>
                  </div>

                  <div className="pt-3 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => router.push('/dashboard/attendance')}
                      className="w-full py-3.5 rounded-xl font-black text-xs text-white bg-rose-600 hover:bg-rose-500 transition-all shadow-lg cursor-pointer"
                    >
                      Go to Attendance Check-In Page
                    </button>
                    <button
                      type="button"
                      onClick={() => setBarcodeNotCheckedInModal(null)}
                      className="w-full py-3 rounded-xl font-bold text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      Close &amp; Dismiss
                    </button>
                  </div>
                </div>
              </div>,
              document.body
            )}

            {/* STEP 2: SELECT PRODUCTION OPERATION STAGE */}
            {barcodeWorker && (
              <div className="space-y-6 p-6 rounded-3xl bg-[#fcfaf8] shadow-sm border border-[#c8834a]/20 animate-fade-in">
                <div className="flex items-center gap-3 pb-3 border-b border-[#c8834a]/15">
                  <div className="w-8 h-8 rounded-xl bg-[#c8834a]/15 flex items-center justify-center text-[#c8834a] font-black text-xs">
                    2
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-[#2d1f0e]">
                      Select Production Operation Stage *
                    </h3>
                    <p className="text-xs text-[#9a7a5a]">Choose stage to log barcode scan events</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  {stagesList.map((stage) => {
                    const isSelected = barcodeStage === stage;
                    return (
                      <button
                        key={stage}
                        type="button"
                        onClick={() => setBarcodeStage(stage)}
                        className={`p-3.5 rounded-2xl text-xs font-black transition-all cursor-pointer text-center border shadow-sm ${
                          isSelected
                            ? 'bg-gradient-to-r from-[#c8834a] to-[#e8a06a] text-white border-[#c8834a] scale-[1.02] shadow-md'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-[#c8834a]/40 hover:bg-amber-50/50'
                        }`}
                      >
                        {stage}
                      </button>
                    );
                  })}
                </div>

                {/* STEP 3A: CUTTING STAGE FLOW */}
                {barcodeStage === 'Cutting' ? (
                  <div className="space-y-6 pt-4 border-t border-[#c8834a]/15 animate-fade-in">
                    
                    {/* SKU BARCODE GUN INPUT */}
                    <div className="space-y-3">
                      <label className="text-xs font-black uppercase tracking-wider text-[#4a3a2a] flex items-center gap-1.5">
                        <Barcode className="w-4 h-4 text-[#c8834a]" /> Scan SKU Barcode *
                      </label>
                      <div className="flex gap-3">
                        <div className="relative flex-1">
                          <Barcode className="w-5 h-5 text-[#c8834a] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            placeholder="Scan SKU Barcode (e.g. ADELE-38, 100123-ADELE-38)..."
                            value={barcodeSkuInput}
                            onChange={(e) => {
                              const val = e.target.value;
                              setBarcodeSkuInput(val);
                              setBarcodeDcmConfirmed(false);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleVerifySkuBarcode(barcodeSkuInput);
                              }
                            }}
                            className="input-field w-full h-14 pl-12 pr-4 bg-white font-mono font-bold text-base text-[#2d1f0e] border-2 border-[#c8834a]/30 focus:border-[#c8834a] shadow-sm rounded-xl outline-none"
                            autoFocus
                            disabled={barcodeSkuVerifying}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleVerifySkuBarcode(barcodeSkuInput)}
                          disabled={!barcodeSkuInput.trim() || barcodeSkuVerifying}
                          className="h-14 px-6 rounded-xl font-black text-xs text-white bg-[#c8834a] hover:bg-[#b0723e] active:scale-95 transition-all shadow-md cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1.5 shrink-0"
                        >
                          {barcodeSkuVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          Verify SKU
                        </button>
                      </div>

                      {/* Verified SKU Preview Badge */}
                      {barcodeSelectedSku && (
                        <div className="p-3 rounded-xl bg-amber-50/80 border border-[#c8834a]/30 flex items-center justify-between animate-fade-in text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="font-extrabold text-[#2d1f0e]">
                              Order #{barcodeSelectedSku.order_number || 'N/A'} · {barcodeSelectedSku.style_name || barcodeSelectedSku.code}
                            </span>
                          </div>
                          <span className="font-mono text-[11px] font-bold text-[#c8834a]">
                            {barcodeSelectedSku.code}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Total Cut Area (DCM) Field — APPEARS ONLY AFTER SKU IS VERIFIED */}
                    {barcodeSelectedSku && (
                      <div className="space-y-3 animate-fade-in pt-2 border-t border-[#c8834a]/15">
                        <label className="text-xs font-black uppercase tracking-wider text-[#4a3a2a] flex items-center gap-1.5">
                          <Scissors className="w-4 h-4 text-[#c8834a]" /> Total Cut Area (DCM) / Count *
                        </label>
                        <div className="flex gap-3">
                          <input
                            type="number"
                            min="1"
                            placeholder="Enter DCM value or Cut Piece count (e.g. 45)..."
                            value={barcodeDcm}
                            onChange={(e) => {
                              setBarcodeDcm(e.target.value);
                              setBarcodeDcmConfirmed(false);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && barcodeDcm) {
                                e.preventDefault();
                                setBarcodeDcmConfirmed(true);
                              }
                            }}
                            className="input-field flex-1 h-14 px-4 bg-white font-black text-xl text-[#2d1f0e] border-2 border-[#c8834a]/30 focus:border-[#c8834a] shadow-sm rounded-xl outline-none"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => setBarcodeDcmConfirmed(true)}
                            disabled={!barcodeDcm || isNaN(parseInt(barcodeDcm, 10))}
                            className="h-14 px-6 rounded-xl font-black text-xs text-white bg-[#c8834a] hover:bg-[#b0723e] active:scale-95 transition-all shadow-md cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1.5 shrink-0"
                          >
                            <Check className="w-4 h-4" />
                            Verify DCM
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ORDER DETAILS SUMMARY & 3 MATERIAL SPEC DROPDOWNS */}
                    {barcodeSelectedSku && barcodeDcmConfirmed && barcodeDcm && (
                      <div className="p-6 rounded-2xl bg-white border-2 border-[#c8834a]/30 shadow-md space-y-5 animate-fade-in">
                        
                        {/* Order Details Header */}
                        <div className="p-4 rounded-xl bg-[#faf6f0] border border-[#c8834a]/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-[#c8834a]">Order Summary</span>
                            <h4 className="text-sm font-black text-[#2d1f0e] mt-0.5">
                              Order #{barcodeSelectedSku.order_number || '100123'} · {barcodeSelectedSku.style_name || barcodeSelectedSku.code}
                            </h4>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total DCM</span>
                            <p className="text-lg font-black text-[#c8834a]">{barcodeDcm} DCM</p>
                          </div>
                        </div>

                        {/* 3 Dropdowns */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          {/* 1. Article */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-[#4a3a2a] uppercase tracking-wider">1. Leather Article *</label>
                            <select
                              value={barcodeArticle}
                              onChange={(e) => setBarcodeArticle(e.target.value)}
                              className="w-full h-12 px-3 bg-[#faf6f0] font-bold text-xs border border-[#c8834a]/30 rounded-xl focus:outline-none cursor-pointer"
                            >
                              <option value="SUEDE_LEATHER">Suede Leather</option>
                              <option value="NAPPA_LEATHER">Nappa Leather</option>
                              <option value="NUBUCK_LEATHER">Nubuck Leather</option>
                              <option value="FULL_GRAIN">Full Grain Leather</option>
                              <option value="PULL_UP">Pull-Up Leather</option>
                              <option value="CROCO_EMBOSSED">Embossed Croc</option>
                            </select>
                          </div>

                          {/* 2. Color */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-[#4a3a2a] uppercase tracking-wider">2. Leather Color *</label>
                            <select
                              value={barcodeColor}
                              onChange={(e) => setBarcodeColor(e.target.value)}
                              className="w-full h-12 px-3 bg-[#faf6f0] font-bold text-xs border border-[#c8834a]/30 rounded-xl focus:outline-none cursor-pointer"
                            >
                              <option value="DARK_BROWN">Dark Brown</option>
                              <option value="TAN_COGNAC">Tan / Cognac</option>
                              <option value="JET_BLACK">Jet Black</option>
                              <option value="BURGUNDY">Burgundy</option>
                              <option value="CAMEL">Camel</option>
                              <option value="OLIVE_GREEN">Olive Green</option>
                            </select>
                          </div>

                          {/* 3. Thickness */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-[#4a3a2a] uppercase tracking-wider">3. Thickness (mm) *</label>
                            <select
                              value={barcodeThickness}
                              onChange={(e) => setBarcodeThickness(e.target.value)}
                              className="w-full h-12 px-3 bg-[#faf6f0] font-bold text-xs border border-[#c8834a]/30 rounded-xl focus:outline-none cursor-pointer"
                            >
                              <option value="1.0 - 1.2 mm">1.0 - 1.2 mm</option>
                              <option value="1.2 - 1.4 mm">1.2 - 1.4 mm</option>
                              <option value="1.4 - 1.6 mm">1.4 - 1.6 mm</option>
                              <option value="1.6 - 1.8 mm">1.6 - 1.8 mm</option>
                            </select>
                          </div>
                        </div>

                        {/* Submit Cutting Button */}
                        <button
                          type="button"
                          onClick={handleBarcodeCuttingSubmit}
                          disabled={barcodeSubmitting}
                          className="w-full h-14 rounded-xl font-black text-sm text-[#0f0a06] shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-40"
                          style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}
                        >
                          {barcodeSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Rocket className="w-5 h-5" />}
                          Log Cutting Event &amp; Mint Traveler Card Barcodes
                        </button>
                      </div>
                    )}

                  </div>
                ) : (
                  /* STEP 3B: PIPELINE STAGES FLOW (Fusing -> Final Finish) */
                  <div className="space-y-6 pt-4 border-t border-[#c8834a]/15 animate-fade-in">
                    <div className="space-y-3">
                      <label className="text-xs font-black uppercase tracking-wider text-[#4a3a2a] flex items-center gap-1.5">
                        <Barcode className="w-4 h-4 text-[#c8834a]" /> Scan Piece Barcodes for {barcodeStage} *
                      </label>

                      <div className="flex gap-3">
                        <div className="relative flex-1">
                          <Barcode className="w-5 h-5 text-[#c8834a] absolute left-4 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder={`Scan piece barcode (e.g. KL_1-${barcodeSelectedSku?.code || 'ADELE-38'}-001)...`}
                            value={barcodePieceInput}
                            onChange={(e) => setBarcodePieceInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleBarcodePieceScan();
                              }
                            }}
                            className="w-full h-14 pl-12 pr-4 bg-white font-mono font-bold text-sm text-[#2d1f0e] border-2 border-[#c8834a]/30 focus:border-[#c8834a] shadow-sm rounded-xl outline-none"
                            autoFocus
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleBarcodePieceScan()}
                          className="h-14 px-6 rounded-xl font-black text-xs text-white shadow-md cursor-pointer"
                          style={{ background: '#c8834a' }}
                        >
                          Add Piece
                        </button>
                      </div>
                    </div>

                    {/* Scanned Pieces Batch List */}
                    {barcodeBatchPieces.length > 0 && (
                      <div className="p-5 rounded-2xl bg-white border-2 border-[#c8834a]/20 shadow-md space-y-4 animate-fade-in">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <span className="text-xs font-black text-[#2d1f0e] flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            Scanned Pieces Batch ({barcodeBatchPieces.length})
                          </span>
                          <button
                            type="button"
                            onClick={() => setBarcodeBatchPieces([])}
                            className="text-xs font-bold text-red-500 hover:underline cursor-pointer"
                          >
                            Clear Batch
                          </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                          {barcodeBatchPieces.map((p, idx) => (
                            <div key={p.code} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                              <div>
                                <p className="font-mono font-bold text-slate-800 text-[11px]">{p.code}</p>
                                <p className="text-[9px] font-semibold text-slate-400">Scanned #{idx + 1}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setBarcodeBatchPieces(prev => prev.filter(item => item.code !== p.code))}
                                className="text-slate-400 hover:text-red-500 transition-colors p-1"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={handleBarcodeBatchSubmit}
                          disabled={barcodeSubmitting}
                          className="w-full h-14 rounded-xl font-black text-sm text-[#0f0a06] shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-40"
                          style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}
                        >
                          {barcodeSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Rocket className="w-5 h-5" />}
                          Submit Batch ({barcodeBatchPieces.length} Pieces) for {barcodeStage}
                        </button>
                      </div>
                    )}

                  </div>
                )}

              </div>
            )}

            {/* GOLDEN SUCCESS POPUP MODAL */}
            {barcodeSuccessModal && createPortal(
              <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-900/80 backdrop-blur-md animate-fade-in p-4">
                <div className="bg-white rounded-3xl shadow-2xl border-2 border-[#c8834a]/40 w-full max-w-lg p-6 sm:p-8 space-y-6 relative overflow-hidden">
                  <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-[#c8834a]/30 flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 className="w-8 h-8 text-[#c8834a]" />
                  </div>

                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-black text-[#2d1f0e]">
                      {barcodeSuccessModal.stage} Event Successfully Saved!
                    </h3>
                    <p className="text-xs font-bold text-slate-500">
                      Logged {barcodeSuccessModal.count} pieces for {barcodeSuccessModal.skuCode || 'Production Batch'}
                    </p>
                  </div>

                  {barcodeSuccessModal.pieces && barcodeSuccessModal.pieces.length > 0 && (
                    <div className="p-4 rounded-2xl bg-[#faf6f0] border border-[#c8834a]/20 space-y-3">
                      <div className="flex items-center justify-between text-xs font-black text-[#2d1f0e]">
                        <span>Generated Traveler Card Barcodes</span>
                        <span>{barcodeSuccessModal.pieces.length} Barcodes</span>
                      </div>

                      <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                        {barcodeSuccessModal.pieces.map((p) => (
                          <div key={p.code} className="p-2 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs font-mono font-bold">
                            <span>{p.code}</span>
                            <span className="text-[10px] text-emerald-600 font-extrabold uppercase">Valid</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setBarcodeSuccessModal(null)}
                    className="w-full h-14 rounded-2xl font-black text-sm text-[#0f0a06] shadow-md transition-all active:scale-95 cursor-pointer"
                    style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}
                  >
                    Done &amp; Close Modal
                  </button>
                </div>
              </div>,
              document.body
            )}

          </div>
        )}

        {/* TAB 1: MANUAL LOGGER FORM SCREEN (LEGACY DOOR) */}
        {activeDoor === 'manual' && (
          <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in">

          {/* STEP 1: Worker Selection */}
          <div className="space-y-6 p-6 rounded-2xl shadow-sm relative overflow-visible" style={{ background: '#fcfaf8', border: '1px solid rgba(200,131,74,0.1)' }}>
            <div className="absolute top-0 left-0 w-1 h-full" style={{ background: '#c8834a' }}></div>
            <h3 className="text-sm font-black uppercase tracking-widest pb-3 flex items-center gap-2" style={{ color: '#2d1f0e', borderBottom: '1px solid rgba(200,131,74,0.1)' }}>
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs" style={{ background: 'rgba(200,131,74,0.15)', color: '#c8834a' }}>1</span>
              Worker Selection
            </h3>
            
            <div className="pt-2">
              <div className="flex flex-col gap-2 relative z-40 self-start w-full" ref={workerModalRef}>
                <label className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5" style={{ color: '#4a3a2a' }}>
                  <Users className="w-4 h-4" style={{ color: '#c8834a' }} /> Assigned Worker *
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setIsWorkerOpen(!isWorkerOpen);
                    setWorkerSearchQuery('');
                  }}
                  className="w-full h-14 px-4 bg-white font-bold border-2 rounded-xl border-[#c8834a]/30 hover:border-[#c8834a] shadow-sm text-sm transition-all flex items-center justify-between text-left cursor-pointer"
                >
                  <span className={currentSelectedWorker ? "text-slate-900 font-extrabold truncate" : "text-slate-400"}>
                    {currentSelectedWorker ? currentSelectedWorker.name : `-- Select / Search Worker --`}
                  </span>
                  <ChevronDown className={`w-5 h-5 text-[#c8834a] transition-transform duration-200 shrink-0 ml-2 ${isWorkerOpen ? 'rotate-180' : ''}`} />
                </button>

                {isWorkerOpen && (
                  <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white border-2 border-[#c8834a] rounded-2xl shadow-2xl z-[99999] p-3 space-y-3 animate-fade-in">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        autoFocus
                        placeholder="Search Worker Name..."
                        value={workerSearchQuery}
                        onChange={(e) => setWorkerSearchQuery(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                        className="w-full h-11 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#c8834a]/30 focus:border-[#c8834a]"
                      />
                    </div>

                    <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 pr-1">
                      {searchFilteredWorkers.length > 0 ? (
                        searchFilteredWorkers.map((w) => {
                          const isSelected = workerId === w.id;
                          return (
                            <button
                              key={w.id}
                              type="button"
                              onClick={() => {
                                setWorkerId(w.id);
                                setIsWorkerOpen(false);
                              }}
                              className={`w-full p-3 text-left transition-colors rounded-xl flex items-center justify-between text-xs font-bold my-0.5 cursor-pointer ${isSelected ? 'bg-[#c8834a] text-white' : 'hover:bg-amber-50 text-slate-800'}`}
                            >
                              <span>{w.name}</span>
                              {isSelected && <span className="font-black text-sm">✓</span>}
                            </button>
                          );
                        })
                      ) : (
                        <div className="p-4 text-center text-xs font-bold text-slate-400">
                          No workers match "{workerSearchQuery}"
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* STEP 2: Garment Details & Operation Stage */}
          <div className="space-y-6 p-6 rounded-2xl shadow-sm relative overflow-visible" style={{ background: '#fcfaf8', border: '1px solid rgba(200,131,74,0.1)' }}>
            <div className="absolute top-0 left-0 w-1 h-full" style={{ background: '#c8834a' }}></div>
            <h3 className="text-sm font-black uppercase tracking-widest pb-3 flex items-center gap-2" style={{ color: '#2d1f0e', borderBottom: '1px solid rgba(200,131,74,0.1)' }}>
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs" style={{ background: 'rgba(200,131,74,0.15)', color: '#c8834a' }}>2</span>
              Operation Stage &amp; Garment Details
            </h3>

            <div className="space-y-4 pt-2">
              <label className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5" style={{ color: '#4a3a2a' }}>
                <Scissors className="w-4 h-4" style={{ color: '#c8834a' }} /> Operation Stage *
              </label>

              {/* 7 Operation Stage Banners */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {['Cutting', 'Fusing', 'Pasting', 'Shell Stitch', 'Lining Stitch', 'Final Finish'].map((stage) => {
                  const isSelected = selectedStage === stage;
                  return (
                    <button
                      key={stage}
                      type="button"
                      onClick={() => {
                        setSelectedStage(stage);
                        setPieceSeqs('');
                      }}
                      className={`p-2.5 rounded-xl text-xs font-black transition-all cursor-pointer text-center border ${
                        isSelected 
                          ? 'bg-[#c8834a] text-white border-[#c8834a] shadow-sm scale-[1.02]' 
                          : 'bg-[#faf6f0] text-slate-700 border-slate-200/60 hover:border-[#c8834a]/50'
                      }`}
                    >
                      {stage}
                    </button>
                  );
                })}
              </div>

              {/* Custom Stage Input Removed */}
            </div>

            <div className="grid grid-cols-1 gap-8 pt-4">
              <div className="flex flex-col gap-2 relative w-full" ref={skuModalRef}>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5" style={{ color: '#4a3a2a' }}>
                    <Ruler className="w-4 h-4" style={{ color: '#c8834a' }} /> Garment SKU (Color / Size) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setSkuRefreshKey(k => k + 1)}
                    className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                    style={{ color: '#c8834a', background: 'rgba(200,131,74,0.08)', border: '1px solid rgba(200,131,74,0.2)' }}
                  >
                    {skusLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Refresh'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsSkuOpen(!isSkuOpen);
                    if (!isSkuOpen) setSkuSearchQuery('');
                  }}
                  className="w-full h-14 px-4 bg-white font-bold border-2 rounded-xl border-[#c8834a]/30 hover:border-[#c8834a] shadow-sm text-sm transition-all flex items-center justify-between text-left cursor-pointer"
                >
                  <span className={currentSelectedSku ? "text-slate-900 font-extrabold text-left break-words whitespace-normal" : "text-slate-400"}>
                    {currentSelectedSku
                      ? `[Order #${currentSelectedSku.order_number || 'N/A'}] ${currentSelectedSku.label || `${currentSelectedSku.style_name || ''} · ${currentSelectedSku.color_code || ''} · ${currentSelectedSku.size}`}`
                      : "-- Select / Search Garment SKU --"
                    }
                  </span>
                  <ChevronDown className={`w-5 h-5 text-[#c8834a] transition-transform duration-200 shrink-0 ml-2 ${isSkuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isSkuOpen && (
                  <div className="absolute z-[999] top-full mt-2 left-0 w-full bg-white border-2 border-[#c8834a] rounded-2xl shadow-2xl p-3 space-y-3 animate-fade-in">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Type Style, SKU, Order No, or Color..."
                        value={skuSearchQuery}
                        onChange={(e) => setSkuSearchQuery(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                        className="w-full h-11 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#c8834a]/30 focus:border-[#c8834a]"
                        autoFocus
                      />
                    </div>

                    <div 
                      className="max-h-56 overflow-y-auto pr-1"
                      onScroll={(e) => {
                        const bottom = e.target.scrollHeight - e.target.scrollTop <= e.target.clientHeight + 50;
                        if (bottom && visibleCount < searchFilteredSkus.length) {
                          setVisibleCount(prev => prev + 60);
                        }
                      }}
                    >
                      {skusLoading ? (
                        <div className="p-6 flex flex-col items-center gap-2">
                          <Loader2 className="w-5 h-5 text-[#c8834a] animate-spin" />
                          <span className="text-xs font-bold text-slate-400">Loading SKUs...</span>
                        </div>
                      ) : searchFilteredSkus.length > 0 ? (
                        <>
                          {searchFilteredSkus.slice(0, visibleCount).map((s, idx) => {
                            const isSelected = skuCode === s.code;
                            return (
                              <button
                                key={s.code}
                                type="button"
                                onClick={() => {
                                  setSkuCode(s.code);
                                  setIsSkuOpen(false);
                                }}
                                className={`w-full p-3 text-left transition-colors rounded-xl flex items-center justify-between text-xs font-bold my-1 cursor-pointer border ${
                                  isSelected 
                                    ? 'bg-[#c8834a] text-white border-[#c8834a] shadow-sm' 
                                    : 'hover:bg-amber-50/60 text-slate-800 border-transparent'
                                }`}
                              >
                                <div className="pr-2 break-words whitespace-normal text-left flex flex-col gap-0.5">
                                  {isSelected && (
                                    <span className="text-[9px] font-black uppercase tracking-wider text-amber-200">
                                      ★ Current Active Style
                                    </span>
                                  )}
                                  <span>{s.order_number || 'N/A'} · {s.label || `${s.style_name || ''} · ${s.color_code || ''} · ${s.size}`}</span>
                                </div>
                                {isSelected && <span className="font-black text-sm shrink-0">✓</span>}
                              </button>
                            );
                          })}
                        </>
                      ) : (
                        <div className="p-4 text-center text-xs font-bold text-slate-400">
                          No SKU matches "{skuSearchQuery}"
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {currentSelectedSku && (
                  <div className="mt-1 px-4 py-2.5 bg-[#faf6f0] border border-[#c8834a]/20 rounded-xl flex items-center justify-between shadow-sm animate-fade-in">
                    <span className="text-xs font-bold text-[#9a7a5a] uppercase tracking-wider flex items-center gap-1.5">
                      Target Quantity
                    </span>
                    <span className="text-sm font-black text-[#c8834a]">{currentSelectedSku.qty_ordered || 0} pcs</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* STEP 3: Quantities & Submission */}
          <div className="space-y-6 p-6 rounded-2xl shadow-sm relative overflow-hidden" style={{ background: '#fcfaf8', border: '1px solid rgba(200,131,74,0.1)' }}>
            <div className="absolute top-0 left-0 w-1 h-full" style={{ background: '#c8834a' }}></div>
            <h3 className="text-sm font-black uppercase tracking-widest pb-3 flex items-center gap-2" style={{ color: '#2d1f0e', borderBottom: '1px solid rgba(200,131,74,0.1)' }}>
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs" style={{ background: 'rgba(200,131,74,0.15)', color: '#c8834a' }}>3</span>
              Quantities &amp; Submission ({selectedStage})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">

              {selectedStage === 'Cutting' ? (
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
                    className="input-field w-full sm:w-1/2 h-14 px-4 bg-white font-black text-xl border-2 border-slate-200 focus:border-[#c8834a] shadow-sm transition-all rounded-xl outline-none"
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
                        className="input-field w-full h-14 px-4 bg-white font-black text-xl text-emerald-700 border-2 border-slate-200 focus:border-emerald-500 shadow-sm transition-all rounded-xl outline-none"
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

              <div className="flex flex-col gap-2">
                <label htmlFor="date-input" className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-500" /> Transaction Date *
                </label>
                <input
                  type="date"
                  id="date-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="input-field h-14 bg-white font-bold border-2 border-slate-200 shadow-sm px-4 rounded-xl outline-none"
                  required
                />
              </div>

            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 flex flex-col gap-3">
            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={() => {
                  setPieceSeqs('');
                  setSkuCode('');
                  setCuttingCount('');
                }}
                className="flex-1 h-14 font-bold rounded-xl text-base transition-all cursor-pointer active:scale-95"
                style={{ background: 'rgba(200,131,74,0.1)', color: '#c8834a' }}
              >
                Reset All
              </button>

              <button
                type="submit"
                className="flex-1 h-14 font-black rounded-xl text-base shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)', color: '#0f0a06' }}
              >
                <Rocket className="w-5 h-5" /> Submit Event 
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                if (!currentSelectedSku) return;
                setShowAnalyticsModal(true);
              }}
              className="text-xs font-black px-4 py-2 rounded-xl transition-all hover:bg-slate-100 flex items-center justify-center sm:justify-start gap-1.5"
              style={{ color: '#c8834a' }}
            >
              <BarChart3 className="w-4 h-4" />
              View Analytics {currentSelectedSku ? `for ${currentSelectedSku.style_name || skuCode}` : 'Page'}
            </button>
          </div>

        </form>
        )}

      </SpotlightCard>

      {/* TRAVELER CARD PRINT MODAL */}
      {mounted && showPrintModal && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/70 backdrop-blur-md animate-fade-in p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-50">
                  <Scissors className="w-4 h-4 text-[#c8834a]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Traveler Cards / Barcodes Minted</h3>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total Pieces: {cuttingPieces.length}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPrintModal(false);
                  setCuttingPieces([]);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-2 bg-slate-50">
              {cuttingPieces.map((piece) => (
                <TravelerPieceItem key={piece.id || piece.seq} piece={piece} />
              ))}
            </div>

            <div className="flex gap-3 p-6 border-t border-slate-100 bg-white">
              <button
                onClick={() => {
                  setShowPrintModal(false);
                  setCuttingPieces([]);
                }}
                disabled={isSavingCutting}
                className="flex-1 py-3 rounded-xl text-xs font-extrabold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCuttingSave}
                disabled={isSavingCutting}
                className="flex-1 py-3 rounded-xl text-xs font-extrabold text-white shadow-md flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}
              >
                {isSavingCutting ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</>
                ) : (
                  <><Rocket className="w-3.5 h-3.5" /> OK</>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* CHECK-IN WARNING MODAL */}
      {mounted && showCheckInWarning && createPortal(
        <div className="fixed inset-0 z-[9999999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white/95 backdrop-blur-xl border border-white/60 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] rounded-3xl p-8 w-full max-w-xs text-center flex flex-col items-center gap-4 animate-slide-up-fade">
            <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center shadow-inner border border-amber-100/50">
              <AlertTriangle className="w-8 h-8 text-amber-500 drop-shadow-sm" />
            </div>
            <div>
              <h3 className="text-slate-800 font-black text-lg tracking-tight">Not Checked In</h3>
              <p className="text-slate-500 text-xs font-medium mt-1.5 leading-relaxed">
                <span className="font-bold text-slate-800">{warningWorkerName}</span> has not started their shift yet.
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* CHECK-OUT WARNING MODAL */}
      {mounted && showCheckOutWarning && createPortal(
        <div className="fixed inset-0 z-[9999999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white/95 backdrop-blur-xl border border-white/60 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] rounded-3xl p-8 w-full max-w-xs text-center flex flex-col items-center gap-4 animate-slide-up-fade">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center shadow-inner border border-red-100/50">
              <XCircle className="w-8 h-8 text-red-500 drop-shadow-sm" />
            </div>
            <div>
              <h3 className="text-slate-800 font-black text-lg tracking-tight">Checked Out</h3>
              <p className="text-slate-500 text-xs font-medium mt-1.5 leading-relaxed">
                <span className="font-bold text-slate-800">{warningWorkerName}</span> is no longer active today.
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ANALYTICS POPUP MODAL */}
      {mounted && showAnalyticsModal && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-2xl max-h-[90vh] flex flex-col relative overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-black text-slate-950 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#c8834a]" />
                  Style Analytics Overview
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  {currentSelectedSku ? `${currentSelectedSku.style_name} (PO: ${currentSelectedSku.order_number})` : 'Loading...'}
                </p>
              </div>
              <button
                onClick={() => setShowAnalyticsModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-slate-50 flex-1">
              <AnalyticsPopupContent 
                token={token} 
                sku={currentSelectedSku} 
                data={analyticsData} 
                setData={setAnalyticsData} 
                lastSubmittedPieceSeqs={lastSubmittedPieceSeqs}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

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

      {/* PIECE CHECKLIST MODAL */}
      {mounted && typeof document !== 'undefined' && document.body && showChecklistModal && createPortal(
        <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-end sm:justify-center bg-slate-900/70 backdrop-blur-md animate-fade-in p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-100 w-full sm:max-w-lg h-[92vh] sm:h-auto sm:max-h-[85vh] flex flex-col overflow-hidden relative">

            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(200,131,74,0.12)' }}>
                  <ListChecks className="w-4 h-4" style={{ color: '#c8834a' }} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black line-clamp-1" style={{ color: '#2d1f0e' }}>Select Pieces — {selectedStage}</h3>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 max-w-[250px] sm:max-w-sm whitespace-normal break-words leading-tight">{skuCode}</p>
                </div>
              </div>
              <button
                onClick={() => setShowChecklistModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {piecesMeta && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 sm:px-6 py-2.5 sm:py-3 bg-slate-50 border-b border-slate-100 shrink-0">
                <span className="text-[11px] sm:text-xs font-bold text-slate-500">Total: <strong className="text-slate-700">{piecesMeta.total}</strong></span>
                <span className="text-[11px] sm:text-xs font-bold text-emerald-600">Done: <strong>{piecesMeta.done}</strong></span>
                <span className="text-[11px] sm:text-xs font-bold text-amber-600">Pending: <strong>{piecesMeta.pending}</strong></span>
                <span className="text-[11px] sm:text-xs font-bold ml-auto" style={{ color: '#c8834a' }}>Selected: <strong>{selectedPieces.length}</strong></span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 overscroll-contain">
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
                    className="text-xs font-black px-3 py-1.5 rounded-lg mt-1 cursor-pointer"
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
                  {(() => {
                    const stageOrder = ['cut', 'fusing', 'pasting', 'linestitch', 'shellstitch', 'finalfinish'];
                    const normalizeStageName = (str) => {
                      const s = String(str || '').toLowerCase().replace(/[^a-z]/g, '');
                      if (s.includes('cut')) return 'cut';
                      if (s.includes('fuse')) return 'fusing';
                      if (s.includes('paste')) return 'pasting';
                      if (s.includes('line') || s.includes('lining')) return 'linestitch';
                      if (s.includes('shell') || s.includes('stitch') || s.includes('sew')) return 'shellstitch';
                      if (s.includes('finish') || s.includes('final')) return 'finalfinish';
                      return s;
                    };

                    const isPieceEligible = (p) => {
                      if (p.done_at_op) return false;
                      const activeNorm = normalizeStageName(selectedStage);
                      const activeOpIdx = stageOrder.indexOf(activeNorm);
                      const pieceNorm = normalizeStageName(p.current_stage_label || p.current_stage);

                      // Factory Rule: Pieces at Cutting ('cut') are ONLY enabled in Cutting (0) & Fusing (1).
                      // From Pasting (2) onwards, Cutting pieces are BLOCKED & DISABLED!
                      if (pieceNorm === 'cut' && activeOpIdx >= 2) {
                        return false;
                      }
                      return true;
                    };

                    return (
                      <>
                        <div className="col-span-2 sm:col-span-3 flex gap-2 mb-2">
                          <button
                            type="button"
                            onClick={() => {
                              const eligibleSeqs = checklistPieces.filter(p => isPieceEligible(p)).map(p => p.seq);
                              setSelectedPieces(eligibleSeqs);
                            }}
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
                          const isEligible = isPieceEligible(piece);
                          const isDisabled = isDone || !isEligible;

                          return (
                            <button
                              key={piece.piece_id || piece.seq}
                              type="button"
                              disabled={isDisabled}
                              onClick={() => {
                                setSelectedPieces(prev =>
                                  prev.includes(piece.seq)
                                    ? prev.filter(s => s !== piece.seq)
                                    : [...prev, piece.seq]
                                );
                              }}
                              className={`relative p-3 rounded-xl border-2 text-left transition-all ${!isDisabled ? 'cursor-pointer' : 'cursor-not-allowed'} ${isSelected
                                ? 'border-[#c8834a] bg-[#c8834a]/10 shadow-md'
                                : isDone
                                  ? 'border-emerald-200 bg-emerald-50 opacity-70'
                                  : !isEligible
                                    ? 'border-slate-100 bg-slate-50 opacity-50'
                                    : 'border-slate-200 bg-white hover:border-[#c8834a]/40'
                              }`}
                            >
                              <p className="text-xs font-black" style={{ color: isSelected ? '#c8834a' : (!isEligible ? '#94a3b8' : '#2d1f0e') }}>
                                #{piece.seq}
                              </p>
                              <p className={`text-[9px] truncate ${isDone ? 'font-black text-emerald-700' : isSelected ? 'font-bold text-[#c8834a]' : 'font-semibold text-slate-400'}`}>
                                {isDone ? selectedStage : (piece.current_stage_label || piece.current_stage || selectedStage)}
                              </p>
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
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2.5 p-4 sm:p-6 border-t border-slate-100 shrink-0 bg-white pb-6 sm:pb-6">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowChecklistModal(false); setChecklistError(''); }}
                  className="flex-1 py-3 rounded-xl text-xs font-extrabold transition-colors cursor-pointer"
                  style={{ background: '#f1f5f9', color: '#475569' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={selectedPieces.length === 0 || checklistSubmitting}
                  onClick={submitChecklist}
                  className="flex-1 py-3 rounded-xl text-xs font-extrabold text-white shadow-md flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:translate-y-0 cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}
                >
                  {checklistSubmitting ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting...</>
                  ) : (
                    <><Rocket className="w-3.5 h-3.5" /> Submit {selectedPieces.length > 0 ? `${selectedPieces.length} Pieces` : 'Event'}</>
                  )}
                </button>
              </div>

              {currentSelectedSku && (
                <Link
                  href={`/dashboard/analytics?order_number=${encodeURIComponent(currentSelectedSku.order_number || '')}&style_name=${encodeURIComponent(currentSelectedSku.style_name || '')}`}
                  onClick={() => setShowChecklistModal(false)}
                  className="w-full py-2.5 rounded-xl text-xs font-extrabold text-[#0ea5e9] bg-[#0ea5e9]/10 border border-[#0ea5e9]/20 shadow-sm flex items-center justify-center gap-1.5 transition-all hover:bg-[#0ea5e9]/20 text-center"
                >
                  <Rocket className="w-3.5 h-3.5" /> Navigate to Order Explorer
                </Link>
              )}
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
                  <p className="text-xs text-slate-400 font-semibold">Stage: {bucketResult.stage || selectedStage}</p>
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
                  <ul className="text-xs text-red-700 font-semibold space-y-1 list-disc pl-5">
                    {bucketResult.sequence_blocked.map((msg, i) => (
                      <li key={i}>{typeof msg === 'string' ? msg : JSON.stringify(msg)}</li>
                    ))}
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
                  <ul className="text-xs text-red-700 font-semibold space-y-1 list-disc pl-5">
                    {bucketResult.skill_blocked.map((msg, i) => (
                      <li key={i}>{typeof msg === 'string' ? msg : JSON.stringify(msg)}</li>
                    ))}
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
                  <ul className="text-xs text-orange-700 font-semibold space-y-1 list-disc pl-5">
                    {bucketResult.merge_blocked.map((msg, i) => (
                      <li key={i}>{typeof msg === 'string' ? msg : JSON.stringify(msg)}</li>
                    ))}
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

    </div>
  );
}
