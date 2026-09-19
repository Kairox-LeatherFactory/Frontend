'use client';
import { useState, useEffect } from 'react';
import { Loader2, Pencil,Truck} from 'lucide-react';
import {usePatchSupplierOrderMutation, usePatchSupplierOrderSpecMutation } 
from '@/store/slices/materialApiSlice';
import { useCreateSupplierOrderMutation } from '@/store/slices/apiSlice';
import { errMsg, CategoryPicker } from './shared';
export function SupplierOrdersScreen({showToast, prefill, onArrived }) {
    const [createSupplierOrder] = useCreateSupplierOrderMutation();
  const [patchSupplierOrder] = usePatchSupplierOrderMutation();
  const [patchSupplierOrderSpec] = usePatchSupplierOrderSpecMutation();
    const [orders, setOrders] = useState([]);
  const [category, setCategory] = useState(prefill?.category || 'LEATHER');
  const [subtype, setSubtype] = useState(prefill?.subtype || '');
  const [article, setArticle] = useState(prefill?.article || '');
  const [colour, setColour] = useState(prefill?.colour || '');
  const [thickness, setThickness] = useState(prefill?.thickness || '');
  const [dcm, setDcm] = useState('');
  const [qty, setQty] = useState(prefill?.qty || '');
  const [supplierId, setSupplierId] = useState(prefill?.supplier_id || '');
  const [supplierName, setSupplierName] = useState(prefill?.supplier_name || '');
  const [submitting, setSubmitting] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [editForm, setEditForm] = useState({ article: '', colour: '', thickness: '', dcm: '', qty: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (!prefill) return;
    setCategory(prefill.category || 'LEATHER'); setSubtype(prefill.subtype || ''); setArticle(prefill.article || '');
    setColour(prefill.colour || ''); setThickness(prefill.thickness || ''); setQty(prefill.qty || ''); setSupplierId(prefill.supplier_id || '');
    setSupplierName(prefill.supplier_name || '');
  }, [prefill]);

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      const res = await createSupplierOrder({
        category, subtype: subtype || undefined, article, colour: colour || undefined,
        thickness: thickness || undefined, dcm: dcm || undefined, qty: Number(qty), supplier_id: supplierId || undefined,
        // supplier_name isn't in the API guide yet — backend team said they'll
        // add it later. Sent alongside supplier_id so it's captured now.
        supplier_name: supplierName || undefined,
      });
      showToast(`Order raised for ${res.article}${res.supplier ? ` via ${res.supplier.name}` : ' — no supplier assigned yet'}.`, 'success');
      setOrders((prev) => [{ ...res, status: 'ordered', arrived_at: null }, ...prev]);
      setArticle(''); setColour(''); setThickness(''); setDcm(''); setQty(''); setSupplierId(''); setSupplierName('');
    } catch (e) { showToast(errMsg(e), 'error'); } finally { setSubmitting(false); }
  };

  const markArrived = async (order) => {
    try {
const res = await patchSupplierOrder({ orderId: order.order_id, status: 'ARRIVED' }).unwrap();
      setOrders((prev) => prev.map((o) => (o.order_id === order.order_id ? { ...o, status: 'arrived', arrived_at: res.arrived_at } : o)));
      showToast('Marked arrived.', 'success');
    } catch (e) { showToast(errMsg(e), 'error'); }
  };

  const startEdit = (order) => {
    setEditingOrderId(order.order_id);
    setEditForm({ article: order.article || '', colour: order.colour || '', thickness: order.thickness || '', dcm: order.dcm || '', qty: order.qty ?? '' });
  };

  const saveEdit = async (order) => {
    setSavingEdit(true);
    try {
      const payload = {};
      if (editForm.article !== (order.article || '')) payload.article = editForm.article;
      if (editForm.colour !== (order.colour || '')) payload.colour = editForm.colour;
      if (editForm.thickness !== (order.thickness || '')) payload.thickness = editForm.thickness;
      if (String(editForm.dcm) !== String(order.dcm ?? '')) payload.dcm = editForm.dcm || undefined;
      if (String(editForm.qty) !== String(order.qty ?? '')) payload.qty = Number(editForm.qty);
     const res = await patchSupplierOrderSpec({ orderId: order.order_id, ...payload }).unwrap();
      setOrders((prev) => prev.map((o) => (o.order_id === order.order_id ? { ...o, ...editForm, qty: Number(editForm.qty), status: res.status } : o)));
      showToast('Order spec updated.', 'success');
      setEditingOrderId(null);
    } catch (e) { showToast(errMsg(e), 'error'); } finally { setSavingEdit(false); }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white p-6 rounded-3xl shadow-sm border space-y-4 max-w-xl" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
        <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Raise Supplier Order</div>
        <CategoryPicker category={category} subtype={subtype} onCategory={(c) => { setCategory(c); setSubtype(''); }} onSubtype={setSubtype} subtypeRequired={false} />
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Article *" value={article} onChange={(e) => setArticle(e.target.value)} className="h-9 px-3 border rounded-lg text-xs font-bold" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
          <input placeholder="Colour (leave blank = any)" value={colour} onChange={(e) => setColour(e.target.value)} className="h-9 px-3 border rounded-lg text-xs font-bold" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
          <input placeholder="Thickness (leave blank = any)" value={thickness} onChange={(e) => setThickness(e.target.value)} className="h-9 px-3 border rounded-lg text-xs font-bold" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
          <input type="number" placeholder="dcm (leave blank = any)" value={dcm} onChange={(e) => setDcm(e.target.value)} className="h-9 px-3 border rounded-lg text-xs font-bold" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
          <input type="number" placeholder="Qty *" value={qty} onChange={(e) => setQty(e.target.value)} className="h-9 px-3 border rounded-lg text-xs font-bold" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
          <input placeholder="Supplier ID (optional)" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="h-9 px-3 border rounded-lg text-xs font-bold" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
          <input placeholder="Supplier Name (optional)" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} className="h-9 px-3 border rounded-lg text-xs font-bold" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
        </div>
        <p className="text-[11px] font-bold text-amber-600">Fields you fill here are checked against the delivery. Leave a field blank if any value is acceptable.</p>
        <p className="text-[11px] font-bold text-slate-400">No supplier directory yet — leave Supplier ID/Name blank to let the backend suggest one from the article, or a DM/MD assigns it later. Supplier Name isn&apos;t in the API guide yet; the backend team said they&apos;ll add it.</p>
        <button onClick={handleCreate} disabled={submitting || !article || !qty} className="w-full h-11 rounded-xl font-black text-xs uppercase text-white disabled:opacity-40 flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}>
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />} Raise Order
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border overflow-hidden" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
        <div className="p-4 border-b font-black text-xs uppercase tracking-wider text-slate-500 flex items-center justify-between" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
          <span>This Session&apos;s Orders</span>
          <span className="text-[10px] font-bold text-slate-400 normal-case">No list endpoint exists yet — orders raised elsewhere won&apos;t appear here until the backend adds one.</span>
        </div>
        <div className="divide-y" style={{ borderColor: 'rgba(200,131,74,0.08)' }}>
          {orders.map((o) => (
            <div key={o.order_id} className="p-3 text-xs">
              {editingOrderId === o.order_id ? (
                <div className="space-y-2 p-2 rounded-xl bg-amber-50/60 border border-amber-200">
                  <div className="grid grid-cols-2 gap-2">
                    <input placeholder="Article" value={editForm.article} onChange={(e) => setEditForm((p) => ({ ...p, article: e.target.value }))} className="h-8 px-2 border rounded-lg text-xs font-bold" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
                    <input placeholder="Colour" value={editForm.colour} onChange={(e) => setEditForm((p) => ({ ...p, colour: e.target.value }))} className="h-8 px-2 border rounded-lg text-xs font-bold" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
                    <input placeholder="Thickness" value={editForm.thickness} onChange={(e) => setEditForm((p) => ({ ...p, thickness: e.target.value }))} className="h-8 px-2 border rounded-lg text-xs font-bold" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
                    <input type="number" placeholder="dcm" value={editForm.dcm} onChange={(e) => setEditForm((p) => ({ ...p, dcm: e.target.value }))} className="h-8 px-2 border rounded-lg text-xs font-bold" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
                    <input type="number" placeholder="Qty" value={editForm.qty} onChange={(e) => setEditForm((p) => ({ ...p, qty: e.target.value }))} className="h-8 px-2 border rounded-lg text-xs font-bold col-span-2" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(o)} disabled={savingEdit} className="h-8 px-4 rounded-lg font-black text-[10px] uppercase text-white disabled:opacity-50" style={{ background: '#c8834a' }}>{savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}</button>
                    <button onClick={() => setEditingOrderId(null)} className="h-8 px-4 rounded-lg font-black text-[10px] uppercase text-slate-500 bg-slate-100">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded-md text-[9px] font-black shrink-0 ${o.status === 'arrived' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>{o.status.toUpperCase()}</span>
                  <span className="font-black text-slate-800 flex-1 min-w-0 truncate">{o.article} · {o.qty} {o.uom}{(o.supplier_name || o.supplier?.name) ? ` · ${o.supplier_name || o.supplier.name}` : ' · no supplier'}</span>
                  {o.status === 'ordered' ? (
                    <>
                      <button onClick={() => startEdit(o)} className="h-8 px-3 rounded-lg font-black text-[10px] uppercase text-slate-500 bg-slate-100 flex items-center gap-1"><Pencil className="w-3 h-3" /> Edit</button>
                      <button onClick={() => markArrived(o)} className="h-8 px-3 rounded-lg font-black text-[10px] uppercase text-white" style={{ background: '#c8834a' }}>Mark Arrived</button>
                    </>
                  ) : (
                    <button onClick={() => onArrived({ orderId: o.order_id, article: o.article })} className="h-8 px-3 rounded-lg font-black text-[10px] uppercase text-white bg-emerald-500">Receive</button>
                  )}
                </div>
              )}
            </div>
          ))}
          {orders.length === 0 && <div className="p-6 text-center text-xs font-bold text-slate-400">No orders raised this session yet.</div>}
        </div>
      </div>
    </div>
  );
}

