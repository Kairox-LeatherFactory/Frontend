'use client';
import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import {
  apiGetSkus,
  apiGetSkuPieces,
  apiProductionCutting,
  apiGetAnalyticsExplore,
  apiGetStyleDetail,
  apiBarcodeResolve,
  apiProductionLogTwoDoor,
  apiGetMaterialLots,
} from '@/lib/api';
import { Lock, CheckCircle2, XCircle, Rocket, Ruler, Scissors, Plus, Calendar, Users, FileSpreadsheet, X, Upload, Loader2, ListChecks, BarChart3, Search, ChevronDown, AlertTriangle, QrCode, Barcode, Check, Camera } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { manualStages, useRoleAccess, normalizeRosterArray } from './shared';

// Helper components used only by this door's Traveler Card Print Modal and
// Analytics Popup Modal — moved here from the top of the original page.js
// (they were plain top-level function declarations there too, not exported).
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
  if (data.error) return <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex items-center gap-2 font-bold"><XCircle className="w-5 h-5" /> {data.error}</div>;
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

// Extracted from src/app/dashboard/entry/page.js (Manual Logger door).
// Props come from page.js's shared state — see SPLIT_GUIDE.md for the full map.
// commitSuccess/uploadError moved to page.js's shared toast per an explicit
// decision (kept separate from successMsg/errorMsg but still centralized,
// since the toast UI that renders them lives in page.js).
export default function ManualDoorSection({
  activeDoor,
  setSuccessMsg, setErrorMsg,
  recordStageCompletion,
  date,
  storeSendedSkus,
  storeReceiveStatus,
  lotArticle, setLotArticle, lotColor, setLotColor, lotThickness, setLotThickness,
  lotOptions, setLotOptions, lotResults, setLotResults, lotLoading, setLotLoading, setLotCategory,
  barcodeDcm, setBarcodeDcm,
  setBucketResult, setShowBucketModal,
  mounted,
}) {
  const { user, token } = useAuth();
  const { workers, addScanEvent, operations } = useData();
  const router = useRouter();
  const { isReadOnly, allowedOperations, isFullAccess, isStageAllowedForRole } = useRoleAccess();
  const [selectedStage, setSelectedStage] = useState('Cutting');
  const [customDesignation, setCustomDesignation] = useState('');
  const [workerId, setWorkerId] = useState('');
  const [skuCode, setSkuCode] = useState('');
  const [pieceSeqs, setPieceSeqs] = useState('');
  const [cuttingCount, setCuttingCount] = useState('');
  const [fetchedSkus, setFetchedSkus] = useState([]);
  const [skusLoading, setSkusLoading] = useState(false);
  const [cuttingPieces, setCuttingPieces] = useState([]);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [isSavingCutting, setIsSavingCutting] = useState(false);
  const [mintedCountMap, setMintedCountMap] = useState({});
  const [showCheckInWarning, setShowCheckInWarning] = useState(false);
  const [showCheckOutWarning, setShowCheckOutWarning] = useState(false);
  const [warningWorkerName, setWarningWorkerName] = useState('');
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [analyticsData, setAnalyticsData] = useState({ loading: false, detail: null, error: null });
  const [isSkuOpen, setIsSkuOpen] = useState(false);
  const [skuSearchQuery, setSkuSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(60);
  const skuModalRef = useRef(null);
  const [isWorkerOpen, setIsWorkerOpen] = useState(false);
  const [workerSearchQuery, setWorkerSearchQuery] = useState('');
  const workerModalRef = useRef(null);
  const [lastSubmittedPieceSeqs, setLastSubmittedPieceSeqs] = useState([]);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [checklistPieces, setChecklistPieces] = useState([]);
  const [selectedPieces, setSelectedPieces] = useState([]);
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const [loadingPieces, setLoadingPieces] = useState(false);
  const [piecesMeta, setPiecesMeta] = useState(null);
  const [checklistError, setChecklistError] = useState('');
  const [checklistSubmitting, setChecklistSubmitting] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [scannedBarcodes, setScannedBarcodes] = useState([]);
  const [isResolvingScan, setIsResolvingScan] = useState(false);
  const [scanResolutionResult, setScanResolutionResult] = useState(null);
  const [workerVerifying, setWorkerVerifying] = useState(false);
  // Already-logged count for the selected SKU at the current stage — parity
  // with the duplicate-submit guard we added for Barcode Gun Scanner.
  // apiProductionCutting always targets piece_seqs [1..count], so re-submitting
  // the same (or lower) count re-logs the SAME pieces as backend "rework"
  // instead of adding anything new.
  const [alreadyCutCount, setAlreadyCutCount] = useState(0);

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

  const [skuRefreshKey, setSkuRefreshKey] = useState(0);

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
    apiGetSkus(token).then(res => {
      // Handle both plain array and paginated {items:[...]} format
      const items = res?.items || res?.skus || (Array.isArray(res) ? res : []);
      console.log('[fetchedSkus] loaded:', items.length, 'SKUs');
      setFetchedSkus(items);
    }).catch(console.warn).finally(() => setSkusLoading(false));
  }, [token, skuRefreshKey]);

  useEffect(() => {
    if (skuCode) {
      const skuObj = fetchedSkus.find(s => s.code === skuCode);
      if (skuObj?.qty_ordered) setCuttingCount(skuObj.qty_ordered.toString());
    }
  }, [skuCode, fetchedSkus]);

  // Barcode Gun Scanner parity: know how many pieces are already logged for
  // this SKU at this stage BEFORE the operator submits, so a duplicate
  // Cutting/Lining run can be caught instead of silently re-logging as rework.
  useEffect(() => {
    if (!skuCode || (selectedStage !== 'Cutting' && selectedStage !== 'Lining')) {
      setAlreadyCutCount(0);
      return;
    }
    const skuObj = fetchedSkus.find(s => s.code === skuCode);
    const searchOp = String(selectedStage || '').toLowerCase().replace(/[^a-z]/g, '');
    const opRecord = operations.find(o => {
      const opLabel = String(o.label || '').toLowerCase().replace(/[^a-z]/g, '');
      return opLabel === searchOp || opLabel.includes(searchOp) || searchOp.includes(opLabel);
    }) || operations[0];
    if (!skuObj || !opRecord) { setAlreadyCutCount(0); return; }

    let isMounted = true;
    apiGetSkuPieces(token, skuObj.sku_id, opRecord.id).then(data => {
      if (!isMounted) return;
      const arr = Array.isArray(data) ? data : (data.pieces || []);
      setAlreadyCutCount(arr.length);
    }).catch(() => { if (isMounted) setAlreadyCutCount(0); });
    return () => { isMounted = false; };
  }, [skuCode, selectedStage, fetchedSkus, operations, token]);

  // Dynamic Material Lots Fetcher — Manual-door half. See the matching copy
  // in BarcodeDoorSection.js for why this was split into two door-local
  // effects instead of staying as one shared effect in page.js.
  useEffect(() => {
    const isCutting = selectedStage === 'Cutting';
    const isLining = selectedStage === 'Lining';
    if (!isCutting && !isLining) return;

    const category = isLining ? 'LINING' : 'LEATHER';
    setLotCategory(category);

    const currentSku = skuCode;
    if (!currentSku) return;

    const parsedDcm = parseInt(barcodeDcm, 10) || 0;
    const parsedPieces = parseInt(cuttingCount, 10) || 0;
    const requiredQty = parsedDcm * parsedPieces; // eslint-disable-line no-unused-vars -- matches original file's own dead calculation, kept for fidelity

    const params = {
      category,
      article: lotArticle,
      colour: lotColor,
      thickness: lotThickness
    };

    let isMounted = true;
    setLotLoading(true);
    apiGetMaterialLots(token, params).then(data => {
      if (!isMounted) return;
      setLotOptions(data.options || { article: [], colour: [], thickness: [], size: [] });
      setLotResults(data.lots || []);

      if (data.suggested_lot_id && data.lots) {
        const suggestedLot = data.lots.find(l => l.lot_id === data.suggested_lot_id);
        if (suggestedLot && !lotArticle && !lotColor && !lotThickness) {
          setLotArticle(suggestedLot.article || '');
          setLotColor(suggestedLot.colour || '');
          setLotThickness(suggestedLot.thickness || '');
        }
      }
    }).catch(err => {
      console.warn("Failed to fetch lots:", err);
    }).finally(() => {
      if (isMounted) setLotLoading(false);
    });

    return () => { isMounted = false; };
  }, [
    selectedStage, skuCode,
    lotArticle, lotColor, lotThickness, barcodeDcm, cuttingCount, token
  ]);

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

  // Barcode Gun Scanner parity: verify attendance check-in the moment a
  // worker is picked, not only at submit time — same GET /attendance/today
  // gate as handleVerifyBarcodeWorker, just triggered earlier so the operator
  // finds out before filling out the rest of the form. Kept alongside (not
  // instead of) the existing submit-time checks below, since a worker could
  // still check out in the gap between selecting them and hitting submit.
  const handleSelectWorker = async (w) => {
    setIsWorkerOpen(false);
    setWorkerVerifying(true);
    try {
      const response = await fetch(`/api/v1/attendance/today?t=${Date.now()}`, { headers: { Authorization: `Bearer ${token}` } });
      const rosterData = await response.json();
      const rosterArray = normalizeRosterArray(rosterData);
      const workerRoster = rosterArray.find(r => String(r.employee_id) === String(w.id));
      if (!workerRoster) {
        setWarningWorkerName(w.name || 'Unknown');
        setShowCheckInWarning(true);
        setTimeout(() => setShowCheckInWarning(false), 2000);
        return;
      }
      if (workerRoster.check_out_at) {
        setWarningWorkerName(w.name || 'Unknown');
        setShowCheckOutWarning(true);
        setTimeout(() => setShowCheckOutWarning(false), 2000);
        return;
      }
    } catch (e) {
      console.warn("Failed to verify attendance", e);
    } finally {
      setWorkerVerifying(false);
    }
    setWorkerId(w.id);
  };

  // SUBMIT HANDLER: Shows Traveler Card Modal FIRST for Cutting
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg(''); setErrorMsg('');
    if (isReadOnly) return setErrorMsg('Unauthorized');


    // Check-in validation removed here to let Traveler Cards modal open first


    if (!workerId || !date || !skuCode) return setErrorMsg('Missing mandatory fields');

    const activeOp = selectedStage;
    const skuObj = fetchedSkus.find(s => s.code === skuCode);

    // 1. CUTTING & LINING STAGES (Mint / Initial Cut Count)
    if (activeOp === 'Cutting' || activeOp === 'Lining') {
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
      const rosterArray = normalizeRosterArray(rosterData);
      const workerRoster = rosterArray.find(r => String(r.employee_id) === String(workerId));
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
      const rosterArray = normalizeRosterArray(rosterData);
      const workerRoster = rosterArray.find(r => String(r.employee_id) === String(workerId));
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

      // Duplicate-submit guard (Barcode Gun Scanner parity): apiProductionCutting
      // always targets piece_seqs [1..count], so submitting a count that's
      // already covered just re-logs the SAME pieces as backend "rework" —
      // nothing new gets created. Block it here instead of letting the
      // operator find out only from a misleading success message.
      if (alreadyCutCount > 0 && parsedCount <= alreadyCutCount) {
        setErrorMsg(`⚠️ This SKU already has ${alreadyCutCount} piece(s) logged for ${selectedStage}. Enter a count higher than ${alreadyCutCount} to add new pieces.`);
        return;
      }

      const result = await apiProductionCutting(token, {
        sku_id: skuObj.sku_id,
        employee_id: workerId,
        work_date: date,
        count: parsedCount,
        dcm: barcodeDcm ? parseInt(barcodeDcm, 10) : parsedCount,
        stage: selectedStage, // 'Cutting' or 'Lining'
        lot_id: lotResults.length === 1 ? lotResults[0].lot_id : null
      });

      // Bug fix: the real response field is `count_logged`/`logged` (piece
      // code strings) — `result.count`/`result.pieces` never existed, so this
      // always silently fell back to the requested count even when nothing
      // was actually logged (e.g. all pieces already recorded as rework).
      if (result.count_logged > 0) {
        setSuccessMsg(`✅ Cut ${result.count_logged} pieces successfully saved.`);
        setAlreadyCutCount(parsedCount);
      } else {
        setErrorMsg(`⚠️ ${result.message || 'Nothing new was logged — pieces may already be recorded at this stage.'}`);
      }
      if (result.skill_warnings?.length) {
        setErrorMsg(prev => `${prev ? prev + ' ' : ''}${result.skill_warnings[0].note}`);
      }
      const extractSeq = (code) => {
        const n = parseInt(String(code).split('-').pop(), 10);
        return isNaN(n) ? null : n;
      };
      setLastSubmittedPieceSeqs((result.logged || []).map(extractSeq).filter(n => n !== null));
      setMintedCountMap(prev => ({
        ...prev,
        [skuObj.sku_id]: Math.max(prev[skuObj.sku_id] || 0, parsedCount)
      }));
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
      const rosterArray = normalizeRosterArray(rosterData);
      const workerRoster = rosterArray.find(r => String(r.employee_id) === String(workerId));
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
    setRangeFrom(''); setRangeTo('');
    try {
      const data = await apiGetSkuPieces(token, skuObj.sku_id, opRecord.id);
      let piecesArr = Array.isArray(data) ? data : (data.pieces || []);

      // Dynamically sync piece list with submitted count for this SKU (e.g. 12 pieces)
      const maxCount = mintedCountMap[skuObj.sku_id] || 0;
      if (maxCount > 0 && piecesArr.length < maxCount) {
        piecesArr = Array.from({ length: maxCount }, (_, i) => {
          const seqNum = i + 1;
          const existing = piecesArr.find(p => p.seq === seqNum);
          return existing || {
            piece_id: `piece-${skuObj.sku_id}-${seqNum}`,
            seq: seqNum,
            current_stage_label: 'Cutting',
            done_at_op: false
          };
        });
      }

      // Store Gate Check removed: it filtered on `p.store_sended` and
      // `current_stage_label === 'SENDED'` — fields that don't match the
      // real API shape (the actual fields are `store_status: "sended"` and a
      // free-text current_stage_label like "In store · sent · moved to
      // line-stitching..."), so it silently dropped every real piece for
      // Line/Shell Stitching, even ones the backend had already marked
      // `eligible: true`. The per-piece `eligible`/`blocked_reason` fields
      // (used below when rendering the checklist) already correctly reflect
      // Store Hub gating — no separate check needed here.

      setChecklistPieces(piecesArr);
      const total = piecesArr.length;
      const done = piecesArr.filter(p => p.done_at_op).length;
      setPiecesMeta({ total, done, pending: total - done });
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
      const rosterArray = normalizeRosterArray(rosterData);
      const workerRoster = rosterArray.find(r => String(r.employee_id) === String(workerId));
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
        const isCutStage = selectedStage.toUpperCase().includes('CUT');
        const logPayload = {
          screen_context: isCutStage ? 'LEATHER_CUT' : 'PIPELINE',
          actor: currentWorker?.employee_barcode ? { employee_barcode: currentWorker.employee_barcode } : { employee_id: workerId },
          targets: scannedBarcodes.length > 0 ? { piece_barcodes: scannedBarcodes } : { sku_id: skuObj.sku_id, piece_seqs: selectedPieces },
          work_date: date,
          ...(isCutStage ? { consumption: { dcm: Number(barcodeDcm || 10) } } : {})
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

      // Record local stage completion for whichever pieces were actually submitted —
      // this is what isStageReady()/PREREQUISITE_MAP reads to unlock the next stage
      // button. Manual door was missing this entirely, so completions here never
      // propagated to the sequence gate (parity fix with the barcode door).
      const submittedCodes = scannedBarcodes.length > 0
        ? scannedBarcodes
        : selectedPieces.map(seq => `${skuObj?.code || skuCode}-${seq}`);
      submittedCodes.forEach(code => recordStageCompletion(selectedStage, code));
      if (skuObj?.code) recordStageCompletion(selectedStage, skuObj.code);

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

  // NOTE: the Excel/Breakdown-Sheet import feature (handleFileUpload,
  // handleCommit, fileInputRef, uploadLoading/showPreviewModal/previewData/
  // fileName/commitLoading/showOrderNumModal/uploadOrderNumber/
  // uploadOrderNumberError, plus the Order Number Modal and Excel Preview
  // Modal JSX) moved to page.js — its trigger button + hidden file input
  // live in the shared TITLE SECTION, rendered unconditionally regardless of
  // which door is active, not nested inside this door's own block.

  return (
    <>
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
                                disabled={workerVerifying}
                                onClick={() => handleSelectWorker(w)}
                                className={`w-full p-3 text-left transition-colors rounded-xl flex items-center justify-between text-xs font-bold my-0.5 cursor-pointer disabled:opacity-50 ${isSelected ? 'bg-[#c8834a] text-white' : 'hover:bg-amber-50 text-slate-800'}`}
                              >
                                <span>{w.name}</span>
                                {isSelected && <span className="font-black text-sm">✓</span>}
                                {workerVerifying && !isSelected && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
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

                {/* 7 Operation Stage Banners — same Sequential Stage Dependency State
                    Machine as the Barcode Gun door (parity: isStageReady/PREREQUISITE_MAP) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {manualStages.map((stage) => {
                    const isSelected = selectedStage === stage;
                    const isRoleAllowed = isStageAllowedForRole(stage);
                    const roleLocked = !isRoleAllowed;
                    // Barcode Gun Scanner parity: worker must be verified
                    // before the stage step unlocks. Sequence completion is
                    // per-piece and session-independent enforcement already
                    // happens correctly at scan time via GET /production/piece-state.
                    const noWorker = !workerId;
                    const isDisabled = roleLocked || noWorker;

                    return (
                      <button
                        key={stage}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => {
                          if (noWorker) {
                            setErrorMsg('⚠️ Please select a Worker first!');
                            return;
                          }
                          if (roleLocked) {
                            setErrorMsg(`⚠️ Role Restricted: Your role cannot log the '${stage}' stage.`);
                            return;
                          }
                          setSelectedStage(stage);
                          setPieceSeqs('');
                        }}
                        className={`p-2.5 rounded-xl text-xs font-black transition-all text-center border relative ${isDisabled
                            ? 'opacity-40 grayscale bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                            : isSelected
                              ? 'bg-[#c8834a] text-white border-[#c8834a] shadow-sm scale-[1.02] cursor-pointer'
                              : 'bg-[#faf6f0] text-slate-700 border-slate-200/60 hover:border-[#c8834a]/50 cursor-pointer'
                          }`}
                        title={noWorker ? '🔒 Select a worker first' : roleLocked ? '🔒 Not permitted for your role' : stage}
                      >
                        {!isFullAccess && isStageAllowedForRole(stage) && (
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white shadow-sm z-10" title="Your Assigned Stage"></span>
                        )}
                        {(roleLocked || noWorker) && <span className="mr-0.5 text-[9px]">🔒</span>}
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
                                  className={`w-full p-3 text-left transition-colors rounded-xl flex items-center justify-between text-xs font-bold my-1 cursor-pointer border ${isSelected
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

                  {/* Duplicate-submit guard visual cue (Barcode Gun Scanner parity) */}
                  {(selectedStage === 'Cutting' || selectedStage === 'Lining') && alreadyCutCount > 0 && (
                    <div className="mt-1 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between shadow-sm animate-fade-in">
                      <span className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" /> Already Logged ({selectedStage})
                      </span>
                      <span className="text-sm font-black text-amber-700">{alreadyCutCount} pcs</span>
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

                {selectedStage === 'Cutting' || selectedStage === 'Lining' ? (
                  <div className="flex flex-col gap-3 md:col-span-2 space-y-4">
                    <div>
                      <label htmlFor="cutting-count-input" className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                        <Scissors className="w-4 h-4 text-amber-600" /> Cut Piece Count (Total Quantity) *
                      </label>
                      <p className="text-[10px] text-slate-500 mb-2">Enter the exact total number of cut pieces for this SKU bundle block creation.</p>
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

                    {(selectedStage === 'Cutting' || selectedStage === 'Lining') && (
                      <div className="space-y-4 pt-4 border-t border-slate-200">
                        <div>
                          <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-2">
                            <Scissors className="w-4 h-4 text-[#c8834a]" /> Total Cut Area (DCM) / Count *
                          </label>
                          <input
                            type="number"
                            min="1"
                            placeholder="Enter DCM value or Cut Piece count (e.g. 45)..."
                            value={barcodeDcm}
                            onChange={(e) => setBarcodeDcm(e.target.value)}
                            className="input-field w-full sm:w-1/2 h-14 px-4 bg-white font-black text-xl border-2 border-slate-200 focus:border-[#c8834a] shadow-sm rounded-xl outline-none transition-all"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <label className="text-[11px] font-bold text-slate-600 uppercase">{selectedStage === 'Lining' ? 'Lining' : 'Leather'} Article *</label>
                            <select
                              value={lotArticle}
                              onChange={(e) => { setLotArticle(e.target.value); setLotColor(''); setLotThickness(''); }}
                              className="w-full h-12 px-3 bg-white border-2 border-slate-200 focus:border-[#c8834a] rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
                            >
                              <option value="">-- Select Article --</option>
                              {lotOptions.article?.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[11px] font-bold text-slate-600 uppercase">{selectedStage === 'Lining' ? 'Lining' : 'Leather'} Colour *</label>
                            <select
                              value={lotColor}
                              onChange={(e) => { setLotColor(e.target.value); setLotThickness(''); }}
                              className="w-full h-12 px-3 bg-white border-2 border-slate-200 focus:border-[#c8834a] rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
                            >
                              <option value="">-- Select Color --</option>
                              {lotOptions.colour?.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                          {/* Bug #9/#10: Thickness is optional and a free-text input, not a mandatory dropdown */}
                          <div className="space-y-2">
                            <label className="text-[11px] font-bold text-slate-600 uppercase flex items-center justify-between">
                              <span>Thickness</span>
                              <span className="text-[10px] text-slate-400 font-bold lowercase">(optional)</span>
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. 1.2mm, 0.8mm..."
                              value={lotThickness}
                              onChange={(e) => setLotThickness(e.target.value)}
                              className="w-full h-12 px-3 bg-white border-2 border-slate-200 focus:border-[#c8834a] rounded-xl text-xs font-bold text-slate-700 outline-none"
                            />
                          </div>
                        </div>

                        {/* Lot Status Indicator — Bug #9: Thickness is optional, so this must not wait on it */}
                        {lotArticle && lotColor && (
                          <div className={`p-4 rounded-xl border flex items-center justify-between ${lotResults.length === 1 && lotResults[0].covers_required !== false ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                            <div>
                              <div className="text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">Material Availability</div>
                              <div className="text-sm font-bold">
                                {lotLoading ? 'Checking...' : (
                                  lotResults.length === 1 ? (
                                    lotResults[0].covers_required === false
                                      ? <span className="text-red-600">Not enough stock (Available: {lotResults[0].available} {lotResults[0].uom})</span>
                                      : <span className="text-emerald-700">Available: {lotResults[0].available} {lotResults[0].uom}</span>
                                  ) : (
                                    <span className="text-red-600">{lotResults.length === 0 ? 'No matching lot found.' : 'Multiple lots found. Refine filters.'}</span>
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
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
                  disabled={
                    isSavingCutting || checklistSubmitting ||
                    ((selectedStage === 'Cutting' || selectedStage === 'Lining') &&
                      (lotResults.length !== 1 || lotResults[0].covers_required === false))
                  }
                  className="flex-1 h-14 font-black rounded-xl text-base shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-40"
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

      {/* Excel Preview Modal + Order Number Modal moved to page.js — see note above. */}

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
                <div className="flex flex-col items-center justify-center h-36 gap-2 text-center p-4">
                  <AlertTriangle className="w-8 h-8 text-amber-500" />
                  <p className="text-sm font-bold text-slate-700">
                    {selectedStage.toLowerCase().includes('line') || selectedStage.toLowerCase().includes('stitch')
                      ? "No pieces sent from Store Hub yet!"
                      : "No pending pieces found for this SKU/stage."}
                  </p>
                  <p className="text-xs text-slate-500">
                    {selectedStage.toLowerCase().includes('line') || selectedStage.toLowerCase().includes('stitch')
                      ? "Drawers must be Received and SENDED from Store Hub before Line Stitching can begin."
                      : "Complete the previous stage first to advance pieces."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(() => {
                    // Trust the backend's own eligibility computation
                    // (`piece.eligible` / `piece.blocked_reason`, returned by
                    // GET /production/skus/{id}/pieces) instead of guessing.
                    // Two local heuristics used to be OR'd in here and both
                    // caused real false-positives: `piece.fusing_done`/
                    // `piece.pasting_done` never existed in the real API
                    // response, and a local `submittedStageMap` optimistically
                    // marked every *selected* piece as done at submit time
                    // even when the backend actually rejected/reworked it —
                    // openChecklistModal re-fetches fresh piece data on every
                    // open, so `piece.done_at_op` alone is always current.
                    const isPieceEligible = (p) => {
                      if (p.done_at_op) return false;
                      return p.eligible !== undefined ? p.eligible : true;
                    };

                    const handleSelectRange = () => {
                      const from = parseInt(rangeFrom, 10);
                      const to = parseInt(rangeTo, 10);
                      if (isNaN(from) || isNaN(to)) return;
                      const lo = Math.min(from, to);
                      const hi = Math.max(from, to);
                      const rangeSeqs = checklistPieces
                        .filter(p => p.seq >= lo && p.seq <= hi && isPieceEligible(p))
                        .map(p => p.seq);
                      setSelectedPieces(prev => Array.from(new Set([...prev, ...rangeSeqs])));
                    };

                    return (
                      <>
                        <div className="col-span-2 sm:col-span-3 flex flex-wrap items-center gap-2 mb-2">
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

                          {/* Range Select: e.g. 001 to 009 — picks every eligible piece
                              in that seq range instead of tapping each one individually. */}
                          <div className="flex items-center gap-1.5 ml-auto">
                            <input
                              type="number"
                              min="1"
                              inputMode="numeric"
                              placeholder="001"
                              value={rangeFrom}
                              onChange={(e) => setRangeFrom(e.target.value)}
                              className="w-14 h-7 px-2 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-700 text-center focus:outline-none focus:border-[#c8834a]"
                            />
                            <span className="text-[10px] font-bold text-slate-400">to</span>
                            <input
                              type="number"
                              min="1"
                              inputMode="numeric"
                              placeholder="009"
                              value={rangeTo}
                              onChange={(e) => setRangeTo(e.target.value)}
                              className="w-14 h-7 px-2 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-700 text-center focus:outline-none focus:border-[#c8834a]"
                            />
                            <button
                              type="button"
                              onClick={handleSelectRange}
                              disabled={rangeFrom === '' || rangeTo === ''}
                              className="text-[10px] font-black px-3 py-1.5 rounded-lg cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                              style={{ background: 'rgba(99,102,241,0.12)', color: '#4f46e5' }}
                            >
                              Select Range
                            </button>
                          </div>
                        </div>

                        {checklistPieces.map((piece) => {
                          const isSelected = selectedPieces.includes(piece.seq);

                          const isDone = Boolean(piece.done_at_op);
                          const isEligible = !isDone && (piece.eligible !== undefined ? piece.eligible : true);
                          const isDisabled = isDone || !isEligible;
                          const stageBadgeText = isDone
                            ? `${selectedStage} Done`
                            : !isEligible
                              ? (piece.blocked_reason || 'Not Ready')
                              : (piece.event_stage_label || 'Ready');

                          return (
                            <button
                              key={piece.piece_id || piece.seq}
                              type="button"
                              disabled={isDisabled}
                              onClick={() => {
                                if (isDisabled) return;
                                setSelectedPieces(prev =>
                                  prev.includes(piece.seq)
                                    ? prev.filter(s => s !== piece.seq)
                                    : [...prev, piece.seq]
                                );
                              }}
                              className={`relative p-3 rounded-xl border-2 text-left transition-all ${!isDisabled ? 'cursor-pointer hover:border-[#c8834a]' : 'cursor-not-allowed opacity-60 bg-slate-100'} ${isSelected
                                ? 'border-[#c8834a] bg-[#c8834a]/10 shadow-md'
                                : isDone
                                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                                  : !isEligible
                                    ? 'border-slate-200 bg-slate-100 text-slate-400'
                                    : 'border-slate-200 bg-white'
                                }`}
                            >
                              <p className="text-xs font-black" style={{ color: isSelected ? '#c8834a' : (isDone ? '#047857' : !isEligible ? '#94a3b8' : '#2d1f0e') }}>
                                #{piece.seq}
                              </p>
                              <p className={`text-[9px] font-bold truncate ${isDone ? 'text-emerald-700 font-extrabold' : isSelected ? 'text-[#c8834a]' : 'text-slate-500'}`}>
                                {stageBadgeText}
                              </p>
                              {isDone && (
                                <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm">
                                  <CheckCircle2 className="w-3 h-3 text-white" />
                                </span>
                              )}
                              {isSelected && !isDone && (
                                <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center shadow-sm" style={{ background: '#c8834a' }}>
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

    </>
  );
}
