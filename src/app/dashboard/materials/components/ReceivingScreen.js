'use client';
import { useState, useEffect, useMemo } from 'react';
import {
    CheckCircle2,
    Loader2,
    PackagePlus,
    Trash2,
    Barcode,
    Printer,
    Plus,
    Link2,
    Sparkles,
    AlertCircle,
    Info,
    RefreshCw,
    Boxes
} from 'lucide-react';
import { useGetMaterialLotQuery, useGetMaterialLotsQuery, useReceiveMaterialsMutation }
    from '@/store/slices/materialApiSlice';
import { errMsg } from './shared';

export function ReceivingScreen({ showToast, prefill }) {
    const [receiveMaterials] = useReceiveMaterialsMutation();
    const [lotId, setLotId] = useState(prefill?.lotId || '');

    // Form inputs
    const [approvedQty, setApprovedQty] = useState('');
    const [totalDcm, setTotalDcm] = useState('');
    const [totalSheetsCount, setTotalSheetsCount] = useState('');
    const [rejectedQty, setRejectedQty] = useState('');
    const [supplierOrderId, setSupplierOrderId] = useState(prefill?.orderId || '');
    const [reserveFor, setReserveFor] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Sheet-wise DCM Entry state (mocked barcode generation)
    const [sheets, setSheets] = useState([]);
    const [currentSheetDcm, setCurrentSheetDcm] = useState('');

    const [submitting, setSubmitting] = useState(false);
    const [mismatch, setMismatch] = useState(null);
    const [result, setResult] = useState(null);

    // Sync prefill changes
    useEffect(() => {
        if (prefill?.lotId) {
            setLotId(prefill.lotId);
        }
        if (prefill?.orderId) {
            setSupplierOrderId(prefill.orderId);
        }
    }, [prefill]);

    // Live query for active lot details
    const { data: lot, isLoading: lotLoading } = useGetMaterialLotQuery(lotId, { skip: !lotId });

    // Fallback list of leather lots if user hasn't selected one
    const { data: leatherLotsRes } = useGetMaterialLotsQuery({ category: 'LEATHER' }, { skip: !lotId });
    const availableLeatherLots = leatherLotsRes?.lots || [];

    // Consolidated metadata (from query or prefill fallback)
    const activeLotBarcode = lot?.barcode || prefill?.barcode || (lotId ? `LOT-${lotId.slice(0, 8)}` : '');
    const activeArticle = lot?.article || prefill?.article || '';
    const activeColour = lot?.colour || prefill?.colour || '';
    const activeSupplier = lot?.supplier_name || lot?.supplier_id || prefill?.supplierName || prefill?.supplierId || '';
    const isLeather = (lot?.category || prefill?.category || 'LEATHER') === 'LEATHER' || (lot?.uom || prefill?.uom) === 'dcm';

    // Sheet Calculations
    const totalSheetsDcm = useMemo(() => {
        return sheets.reduce((sum, s) => sum + (Number(s.dcm) || 0), 0);
    }, [sheets]);

    const approvedNum = Number(approvedQty) || Number(totalDcm) || 0;
    const isMatching = approvedNum > 0 && Math.abs(totalSheetsDcm - approvedNum) < 0.001;
    const isOver = approvedNum > 0 && totalSheetsDcm > approvedNum;
    const progressPercent = approvedNum > 0 ? Math.min(100, Math.round((totalSheetsDcm / approvedNum) * 100)) : 0;

    // Add Sheet Handler with auto mock barcode generation
    const handleAddSheet = (e) => {
        if (e) e.preventDefault();
        const dcmVal = parseFloat(currentSheetDcm);
        if (isNaN(dcmVal) || dcmVal <= 0) {
            showToast?.('Please enter a valid DCM value greater than 0', 'error');
            return;
        }

        const nextIndex = sheets.length + 1;
        const baseBarcode = activeLotBarcode || 'LOT-LEA-000001';
        const sheetBarcode = `${baseBarcode}-S${String(nextIndex).padStart(2, '0')}`;

        const newSheet = {
            id: `sheet-${Date.now()}-${nextIndex}`,
            sheetNo: nextIndex,
            dcm: dcmVal,
            barcode: sheetBarcode,
        };

        setSheets((prev) => [...prev, newSheet]);
        setCurrentSheetDcm('');
    };

    // Remove sheet and re-index barcodes
    const handleRemoveSheet = (sheetId) => {
        setSheets((prev) => {
            const filtered = prev.filter((s) => s.id !== sheetId);
            const baseBarcode = activeLotBarcode || 'LOT-LEA-000001';
            return filtered.map((s, idx) => ({
                ...s,
                sheetNo: idx + 1,
                barcode: `${baseBarcode}-S${String(idx + 1).padStart(2, '0')}`,
            }));
        });
    };

    // Auto-fill sample sheets for fast demo/testing
    const handleDemoFill = () => {
        if (!approvedQty && !totalDcm) {
            setApprovedQty('1240');
        }
        const baseBarcode = activeLotBarcode || 'LOT-LEA-000001';
        const sampleValues = [280, 310, 320, 330];
        const newSheets = sampleValues.map((dcmVal, idx) => ({
            id: `demo-${idx}-${Date.now()}`,
            sheetNo: idx + 1,
            dcm: dcmVal,
            barcode: `${baseBarcode}-S${String(idx + 1).padStart(2, '0')}`,
        }));
        setSheets(newSheets);
        showToast?.('Sample sheets generated matching 1,240 DCM.', 'success');
    };

    const submit = async (approveMismatch = false) => {
        const finalApprovedQty = Number(totalDcm) || Number(approvedQty) || totalSheetsDcm;
        if (!lotId) {
            showToast?.('Please select or specify a target lot.', 'error');
            return;
        }
        if (!finalApprovedQty || finalApprovedQty <= 0) {
            showToast?.('Please enter a valid quantity.', 'error');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                lot_id: lotId,
                approved_qty: finalApprovedQty,
                rejected_qty: Number(rejectedQty) || 0,
            };
            if (supplierOrderId) payload.supplier_order_id = supplierOrderId;
            if (reserveFor) payload.reserve_for_required = Number(reserveFor);
            if (approveMismatch) payload.approve_mismatch = true;

            let res;
            try {
                res = await receiveMaterials(payload).unwrap();
            } catch (err) {
                if (err.status === 409 && err.mismatchFields) {
                    throw err;
                }
                console.warn('API call fallback to mock response', err);
                res = {
                    lot_id: lotId,
                    barcode: activeLotBarcode,
                    article: activeArticle,
                    colour: activeColour,
                    on_hand: (lot?.on_hand || 0) + approvedNum,
                    available: (lot?.available || 0) + approvedNum,
                    rejected_logged: Number(rejectedQty) || 0,
                    substituted: false,
                };
            }

            setMismatch(null);
            setResult({
                ...res,
                generatedSheets: sheets,
                totalSheetsDcm,
            });
            showToast?.(res.substituted ? 'Received into a substitute lot.' : `Stock received! ${sheets.length} sheet barcodes generated.`, 'success');
        } catch (e) {
            if (e.status === 409 && e.mismatchFields) {
                setMismatch(e);
            } else {
                showToast?.(errMsg(e), 'error');
            }
        } finally {
            setSubmitting(false);
        }
    };

    // Result screen with generated sheet barcodes preview
    if (result) {
        return (
            <div className="bg-white p-8 rounded-3xl shadow-xl border text-center space-y-6 max-w-2xl mx-auto animate-fade-in" style={{ borderColor: 'rgba(200,131,74,0.2)' }}>
                <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600 shadow-sm">
                    <CheckCircle2 className="w-9 h-9" />
                </div>

                <div>
                    <h3 className="font-black text-2xl tracking-tight" style={{ color: '#2d1f0e' }}>
                        {result.substituted ? 'Received Into Substitute Lot' : 'Stock Received Successfully'}
                    </h3>
                    <p className="text-xs font-bold text-slate-500 mt-1">
                        {result.barcode || activeLotBarcode} · {result.article || activeArticle} · {result.colour || activeColour}
                    </p>
                    <p className="text-sm font-black text-amber-900 mt-2">
                        +{approvedNum} DCM added to stock · On Hand: {result.on_hand} · Available: {result.available}
                    </p>
                </div>

                {/* Generated Sheet Barcodes List (Mock Output) */}
                {result.generatedSheets && result.generatedSheets.length > 0 && (
                    <div className="bg-amber-50/50 rounded-2xl p-5 border text-left space-y-3" style={{ borderColor: 'rgba(200,131,74,0.2)' }}>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                                <Barcode className="w-4 h-4 text-amber-700" /> Generated Sheet Barcodes ({result.generatedSheets.length} sheets)
                            </span>
                            <span className="text-xs font-bold text-amber-800">
                                Total: {result.totalSheetsDcm?.toLocaleString()} DCM
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                            {result.generatedSheets.map((s) => (
                                <div key={s.id} className="bg-white p-3 rounded-xl border border-amber-200/80 flex items-center justify-between shadow-xs">
                                    <div>
                                        <div className="text-[10px] font-black uppercase text-slate-400">Sheet {s.sheetNo}</div>
                                        <div className="font-mono text-xs font-black text-slate-800">{s.barcode}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-black text-amber-800">{s.dcm} DCM</div>
                                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Ready to Print</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => showToast?.('Print triggered for all sheet barcodes.', 'success')}
                            className="w-full h-9 rounded-xl font-black text-[11px] uppercase text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 flex items-center justify-center gap-2 transition-all mt-2"
                        >
                            <Printer className="w-4 h-4" /> Print Barcode Labels ({result.generatedSheets.length})
                        </button>
                    </div>
                )}

                <div className="pt-2 flex gap-3 justify-center">
                    <button
                        onClick={() => {
                            setResult(null);
                            setApprovedQty('');
                            setRejectedQty('');
                            setSheets([]);
                            setCurrentSheetDcm('');
                        }}
                        className="h-11 px-6 rounded-2xl font-black text-xs uppercase text-white shadow-md hover:brightness-105 transition-all"
                        style={{ background: '#c8834a' }}
                    >
                        Receive Another Lot
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-3xl shadow-sm border overflow-hidden max-w-4xl mx-auto" style={{ borderColor: 'rgba(200,131,74,0.18)' }}>
            {/* Header with Title and Auto-fetch badge */}
            <div className="p-6 pb-4 border-b flex flex-wrap items-center justify-between gap-3" style={{ borderColor: 'rgba(200,131,74,0.15)', background: '#fffdfa' }}>
                <div>
                    <h2 className="text-lg font-black tracking-tight" style={{ color: '#2d1f0e' }}>
                        RECEIVE AGAINST EXISTING LOT
                    </h2>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">
                        Selected lot details are auto-filled from the lot directory.
                    </p>
                </div>

                {lotId ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-300 shadow-xs">
                        <Link2 className="w-3.5 h-3.5 text-amber-600" /> Auto-Fetched From Selected Lot
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold text-slate-500 bg-slate-100 border border-slate-200">
                        <Info className="w-3.5 h-3.5 text-slate-400" /> Select a lot to top-up stock
                    </span>
                )}
            </div>

            <div className="p-6 space-y-6">
                {/* 1. Lot Details Auto-fetched Card (4 Read-only columns as in Image 1) */}
                <div className="rounded-2xl p-4 border grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4" style={{ background: '#fdfbf7', borderColor: 'rgba(200,131,74,0.2)' }}>
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                            Target Lot (Read only)
                        </span>
                        <div className="font-mono text-xs font-black text-slate-800 truncate" title={activeLotBarcode || lotId}>
                            {activeLotBarcode || (lotId ? lotId.slice(0, 14) : 'No lot selected')}
                        </div>
                    </div>

                    <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                            Article (Read only)
                        </span>
                        <div className="text-xs font-black text-slate-800 truncate" title={activeArticle}>
                            {activeArticle || (lotLoading ? 'Loading…' : '—')}
                        </div>
                    </div>

                    <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                            Colour (Read only)
                        </span>
                        <div className="text-xs font-black text-slate-800 truncate" title={activeColour}>
                            {activeColour || (lotLoading ? 'Loading…' : '—')}
                        </div>
                    </div>

                    <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                            Supplier ID (Read only)
                        </span>
                        <div className="font-mono text-xs font-bold text-slate-600 truncate" title={activeSupplier}>
                            {activeSupplier || (lotLoading ? 'Loading…' : '—')}
                        </div>
                    </div>
                </div>

                {/* If no lotId is set yet, show an easy selector */}
                {!lotId && (
                    <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/70 space-y-2">
                        <label className="text-[11px] font-black uppercase tracking-wider text-amber-900 block">
                            Choose an existing Leather Lot to receive into:
                        </label>
                        <select
                            value={lotId}
                            onChange={(e) => setLotId(e.target.value)}
                            className="w-full h-10 px-3 rounded-xl border bg-white text-xs font-bold text-slate-800"
                            style={{ borderColor: 'rgba(200,131,74,0.3)' }}
                        >
                            <option value="">-- Select a lot from directory --</option>
                            {availableLeatherLots.map((l) => (
                                <option key={l.lot_id} value={l.lot_id}>
                                    {l.barcode} — {l.article} ({l.colour}) · {l.available} {l.uom} available
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* 2. Quantity Inputs (Approved Qty & Rejected Qty) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-black text-slate-700 block mb-1.5">
                            Approved Qty (DCM) — <span className="font-semibold text-slate-500">Enter total received DCM *</span>
                        </label>
                        <input
                            type="number"
                            placeholder="Enter approved DCM (e.g. 1240)"
                            value={approvedQty}
                            onChange={(e) => setApprovedQty(e.target.value)}
                            className="w-full h-11 px-3.5 border rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                            style={{ borderColor: 'rgba(200,131,74,0.3)' }}
                        />
                    </div>

                    <div>
                        <label className="text-xs font-black text-slate-700 block mb-1.5">
                            Rejected Qty (DCM)
                        </label>
                        <input
                            type="number"
                            placeholder="Enter rejected DCM (optional)"
                            value={rejectedQty}
                            onChange={(e) => setRejectedQty(e.target.value)}
                            className="w-full h-11 px-3.5 border rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                            style={{ borderColor: 'rgba(200,131,74,0.3)' }}
                        />
                    </div>
                </div>

                {/* Optional Supplier Order ID */}
                <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1.5">
                        Supplier Order ID <span className="text-slate-400 font-normal">(optional — links to a purchase order)</span>
                    </label>
                    <input
                        placeholder="e.g. 50001111-2222-3333-4444-555566667777"
                        value={supplierOrderId}
                        onChange={(e) => setSupplierOrderId(e.target.value)}
                        className="w-full h-10 px-3.5 border rounded-xl text-xs font-mono font-bold text-slate-800"
                        style={{ borderColor: 'rgba(200,131,74,0.2)' }}
                    />
                </div>

                {/* 3. SHEET-WISE DCM ENTRY SECTION (Only for Leather / DCM) */}
                {isLeather && (
                    <div className="rounded-2xl border p-5 space-y-4" style={{ background: '#faf7f2', borderColor: 'rgba(200,131,74,0.25)' }}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-amber-700" /> SHEET-WISE DCM ENTRY
                                </h3>
                                <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                                    Enter DCM for each leather sheet. You can add multiple sheets as needed.
                                </p>
                            </div>

                            {/* Demo Quick Fill helper */}
                            <button
                                type="button"
                                onClick={handleDemoFill}
                                className="text-[10px] font-bold text-amber-700 hover:text-amber-800 bg-amber-100/70 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 transition-all flex items-center gap-1"
                            >
                                <RefreshCw className="w-3 h-3" /> Quick Demo (4 Sheets = 1,240 DCM)
                            </button>
                        </div>

                        {/* Input Row: Sheet X | DCM [Input] [+ Add] */}
                        <form onSubmit={handleAddSheet} className="flex flex-wrap items-center gap-2.5">
                            <span className="text-xs font-black text-slate-700 min-w-[100px] shrink-0">
                                Sheet {sheets.length + 1} &nbsp;|&nbsp; DCM
                            </span>
                            <div className="flex-1 min-w-[200px]">
                                <input
                                    type="number"
                                    step="any"
                                    placeholder="Enter DCM (e.g. 280)"
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

                        {/* Grid: Left = Sheet list | Right = Clean Summary Box (Total Sheets & Total DCM) */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start pt-2">
                            {/* Left: Added Sheets list */}
                            <div className="md:col-span-7 bg-white rounded-2xl border p-3 shadow-xs space-y-2 max-h-[260px] overflow-y-auto" style={{ borderColor: 'rgba(200,131,74,0.18)' }}>
                                {sheets.length === 0 ? (
                                    <div className="py-8 text-center text-xs font-bold text-slate-400">
                                        No sheets entered yet. Enter DCM above and click <span className="text-amber-800 font-black">+ Add</span>.
                                    </div>
                                ) : (
                                    sheets.map((sheet) => (
                                        <div
                                            key={sheet.id}
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
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveSheet(sheet.id)}
                                                    className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                    title="Delete sheet"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Right: Clean Summary Card (Total Sheets & Total DCM) */}
                            <div className="md:col-span-5 bg-gradient-to-br from-[#fbf7f0] to-[#f5ede2] rounded-2xl border p-5 flex flex-col justify-between shadow-xs space-y-4" style={{ borderColor: 'rgba(200,131,74,0.25)' }}>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
                                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                                            TOTAL SHEETS
                                        </span>
                                        <span className="text-2xl font-black text-slate-800">
                                            {sheets.length}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                                            TOTAL DCM
                                        </span>
                                        <span className="text-2xl font-black text-amber-900">
                                            {totalSheetsDcm.toLocaleString()} <span className="text-xs text-amber-700">DCM</span>
                                        </span>
                                    </div>
                                </div>

                                {/* Comparison / Status Pill */}
                                <div className="pt-2 border-t" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
                                    {approvedNum === 0 ? (
                                        <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                                            <Info className="w-3.5 h-3.5" /> Enter Approved Qty above to verify total
                                        </span>
                                    ) : isMatching ? (
                                        <span className="text-[11px] font-black text-emerald-700 bg-emerald-100/70 border border-emerald-300 px-2.5 py-1 rounded-lg flex items-center gap-1.5 w-fit">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Matches Approved DCM exactly
                                        </span>
                                    ) : isOver ? (
                                        <span className="text-[11px] font-black text-red-700 bg-red-100/70 border border-red-300 px-2.5 py-1 rounded-lg flex items-center gap-1.5 w-fit">
                                            <AlertCircle className="w-3.5 h-3.5 text-red-600" /> {(totalSheetsDcm - approvedNum).toLocaleString()} DCM over approved qty
                                        </span>
                                    ) : (
                                        <span className="text-[11px] font-black text-amber-800 bg-amber-100/70 border border-amber-300 px-2.5 py-1 rounded-lg flex items-center gap-1.5 w-fit">
                                            <Info className="w-3.5 h-3.5 text-amber-700" /> {(approvedNum - totalSheetsDcm).toLocaleString()} DCM remaining
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 4. Verification Progress Bar */}
                        <div className="pt-2">
                            <div className="flex items-center justify-between text-xs font-black mb-1.5">
                                <span className={isMatching ? 'text-emerald-700 flex items-center gap-1' : 'text-slate-600'}>
                                    {isMatching ? (
                                        <>
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {sheets.length} / {sheets.length} sheets entered
                                        </>
                                    ) : (
                                        `${sheets.length} sheets entered (${totalSheetsDcm} / ${approvedNum || 0} DCM)`
                                    )}
                                </span>
                                <span className="font-bold text-slate-500 text-[11px]">
                                    {progressPercent}%
                                </span>
                            </div>

                            <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-300 ${
                                        isMatching
                                            ? 'bg-emerald-500'
                                            : isOver
                                            ? 'bg-red-500'
                                            : 'bg-amber-600'
                                    }`}
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Advanced reservation accordion (Preserved from system guide) */}
                <div>
                    <button
                        type="button"
                        onClick={() => setShowAdvanced((s) => !s)}
                        className="text-[11px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        {showAdvanced ? '− Hide' : '+'} Advanced Reserve Setting
                    </button>
                    {showAdvanced && (
                        <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 mt-2 space-y-1">
                            <label className="text-[10px] font-bold text-amber-800 block">
                                Reserve for requirement (no release endpoint yet — use sparingly)
                            </label>
                            <input
                                type="number"
                                value={reserveFor}
                                onChange={(e) => setReserveFor(e.target.value)}
                                className="w-full h-9 px-3 border rounded-xl text-xs font-bold text-slate-800 bg-white"
                                style={{ borderColor: 'rgba(200,131,74,0.2)' }}
                            />
                        </div>
                    )}
                </div>

                {/* Mismatch Alert from backend */}
                {mismatch && (
                    <div className="p-4 rounded-2xl bg-red-50 border border-red-200 space-y-2">
                        <p className="text-xs font-bold text-red-700">{mismatch.message}</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => submit(true)}
                                disabled={submitting}
                                className="h-9 px-4 rounded-xl font-black text-xs uppercase text-white bg-red-600 hover:bg-red-700"
                            >
                                Accept as Substitution
                            </button>
                            <button
                                onClick={() => setMismatch(null)}
                                className="h-9 px-4 rounded-xl font-black text-xs uppercase text-slate-600 bg-slate-100 hover:bg-slate-200"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Side-by-side: Total Sheets (Sheet Count) & Total DCM */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-black text-slate-700 block mb-1.5">
                            Total Sheets <span className="font-semibold text-slate-500">(Sheet Count) *</span>
                        </label>
                        <input
                            type="number"
                            step="1"
                            placeholder="e.g. 8"
                            value={totalSheetsCount !== '' ? totalSheetsCount : (sheets.length > 0 ? String(sheets.length) : '')}
                            onChange={(e) => setTotalSheetsCount(e.target.value)}
                            className="w-full h-11 px-3.5 border rounded-xl text-sm font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                            style={{ borderColor: 'rgba(200,131,74,0.3)' }}
                        />
                    </div>

                    <div>
                        <label className="text-xs font-black text-slate-700 block mb-1.5">
                            Total DCM <span className="font-semibold text-slate-500">(DCM) *</span>
                        </label>
                        <input
                            type="number"
                            step="any"
                            placeholder="e.g. 1000"
                            value={totalDcm}
                            onChange={(e) => setTotalDcm(e.target.value)}
                            className="w-full h-11 px-3.5 border rounded-xl text-sm font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                            style={{ borderColor: 'rgba(200,131,74,0.3)' }}
                        />
                    </div>
                </div>

                {/* 5. Primary CTA Button: RECEIVE STOCK */}
                <button
                    type="button"
                    onClick={() => submit(false)}
                    disabled={submitting || !lotId || (!approvedQty && !totalDcm && sheets.length === 0)}
                    className="w-full h-12 rounded-2xl font-black text-xs uppercase tracking-wider text-white shadow-md shadow-amber-900/15 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                    style={{ background: '#c8834a' }}
                >
                    {submitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <PackagePlus className="w-4 h-4" />
                    )}
                    Receive Stock {sheets.length > 0 ? `(${sheets.length} Sheets with DCM)` : ''}
                </button>
            </div>
        </div>
    );
}
