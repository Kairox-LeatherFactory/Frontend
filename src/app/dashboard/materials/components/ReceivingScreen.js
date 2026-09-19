'use client';
import { useState, useEffect } from 'react';
import { CheckCircle2, Loader2, PackagePlus } from 'lucide-react';
import { useGetMaterialLotQuery, useReceiveMaterialsMutation }
    from '@/store/slices/materialApiSlice';
import { errMsg } from './shared';
export function ReceivingScreen({ showToast, prefill }) {

    const [receiveMaterials] = useReceiveMaterialsMutation();
    const [lotId, setLotId] = useState(prefill?.lotId || '');

    const [approvedQty, setApprovedQty] = useState('');
    const [rejectedQty, setRejectedQty] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [reserveFor, setReserveFor] = useState('');
    const [supplierOrderId, setSupplierOrderId] = useState(prefill?.orderId || '');
    const [submitting, setSubmitting] = useState(false);
    const [mismatch, setMismatch] = useState(null);
    const [result, setResult] = useState(null);

    useEffect(() => {
        if (prefill?.lotId) setLotId(prefill.lotId);
        if (prefill?.orderId) setSupplierOrderId(prefill.orderId);
    }, [prefill]);

    const { data: lot } = useGetMaterialLotQuery(lotId, { skip: !lotId });

    const submit = async (approveMismatch = false) => {
        setSubmitting(true);
        try {
            const payload = { lot_id: lotId, approved_qty: Number(approvedQty), rejected_qty: Number(rejectedQty) || 0 };
            if (supplierOrderId) payload.supplier_order_id = supplierOrderId;
            if (reserveFor) payload.reserve_for_required = Number(reserveFor);
            if (approveMismatch) payload.approve_mismatch = true;
            const res = await receiveMaterials(payload).unwrap();
            setMismatch(null);
            setResult(res);
            if (res.lot_id !== lotId) {
                setLotId(res.lot_id);
            }
            showToast(res.substituted ? 'Received into a substitute lot.' : 'Stock received.', 'success');
        } catch (e) {
            if (e.status === 409 && e.mismatchFields) {
                setMismatch(e);
            } else {
                showToast(errMsg(e), 'error');
            }
        } finally { setSubmitting(false); }
    };

    if (result) {
        return (
            <div className="bg-white p-8 rounded-3xl shadow-sm border text-center space-y-3 max-w-md mx-auto" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                {result.substituted ? (
                    <>
                        <h3 className="font-black text-lg text-amber-700">Received Into a Substitute Lot</h3>
                        <p className="text-xs font-bold text-slate-500">The delivery didn&apos;t match the original lot&apos;s spec on {result.mismatch_fields?.join(', ')}. A new lot ({result.lot_id}) now holds it.</p>
                    </>
                ) : (
                    <h3 className="font-black text-lg" style={{ color: '#2d1f0e' }}>Stock Received</h3>
                )}
                <p className="text-xs font-bold text-slate-600">On hand: {result.on_hand} · Available: {result.available}{result.rejected_logged > 0 ? ` · Rejected logged: ${result.rejected_logged}` : ''}</p>
                <button onClick={() => { setResult(null); setLotId(''); setApprovedQty(''); setRejectedQty(''); setSupplierOrderId(''); }} className="h-10 px-5 rounded-xl font-black text-xs uppercase text-white" style={{ background: '#c8834a' }}>Receive Another</button>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-3xl shadow-sm border space-y-4 max-w-xl mx-auto" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
            <div>
                <label className="text-[10px] font-bold text-slate-400">Target Lot (lot_id, or paste one from the Lot List)</label>
                <input value={lotId} onChange={(e) => setLotId(e.target.value)} className="w-full h-9 px-3 border rounded-lg text-xs font-bold font-mono mt-1" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
                {lot && <p className="text-[11px] font-bold text-slate-500 mt-1">{lot.article} · {lot.colour} — currently {lot.on_hand} {lot.uom} on hand, {lot.available} available</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-[10px] font-bold text-emerald-600">Approved Qty (adds to stock)</label>
                    <input type="number" value={approvedQty} onChange={(e) => setApprovedQty(e.target.value)} className="w-full h-9 px-3 border rounded-lg text-xs font-bold mt-1" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-red-500">Rejected Qty (logged only, never stock)</label>
                    <input type="number" value={rejectedQty} onChange={(e) => setRejectedQty(e.target.value)} className="w-full h-9 px-3 border rounded-lg text-xs font-bold mt-1" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
                </div>
            </div>

            <div>
                <label className="text-[10px] font-bold text-slate-400">Supplier Order ID (optional — matches against a PO)</label>
                <input value={supplierOrderId} onChange={(e) => setSupplierOrderId(e.target.value)} className="w-full h-9 px-3 border rounded-lg text-xs font-bold font-mono mt-1" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
            </div>

            <button onClick={() => setShowAdvanced((s) => !s)} className="text-[10px] font-black uppercase text-slate-400">{showAdvanced ? '− Hide' : '+'} Advanced</button>
            {showAdvanced && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                    <label className="text-[10px] font-bold text-amber-700">Reserve for requirement (no release endpoint yet — use sparingly, a reserved lot can&apos;t be adjusted or retired until it&apos;s released)</label>
                    <input type="number" value={reserveFor} onChange={(e) => setReserveFor(e.target.value)} className="w-full h-9 px-3 border rounded-lg text-xs font-bold mt-1" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
                </div>
            )}

            {mismatch && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 space-y-2">
                    <p className="text-xs font-bold text-red-700">{mismatch.message}</p>
                    <div className="flex gap-2">
                        <button onClick={() => submit(true)} disabled={submitting} className="h-9 px-4 rounded-lg font-black text-[10px] uppercase text-white bg-red-600">Accept as Substitution</button>
                        <button onClick={() => setMismatch(null)} className="h-9 px-4 rounded-lg font-black text-[10px] uppercase text-slate-500 bg-slate-100">Cancel</button>
                    </div>
                </div>
            )}

            <button onClick={() => submit(false)} disabled={submitting || !lotId || !approvedQty} className="w-full h-11 rounded-xl font-black text-xs uppercase text-white disabled:opacity-40 flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackagePlus className="w-4 h-4" />} Receive Stock
            </button>
        </div>
    );
}
