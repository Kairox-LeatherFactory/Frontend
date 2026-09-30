'use client';
import { useState, useEffect } from 'react';
import { Loader2, Pencil, Truck, CheckCircle2, XCircle, ArrowRight, PlusCircle, Building2 } from 'lucide-react';
import {
  useCreateSupplierOrderMutation,
  usePatchSupplierOrderMutation,
  usePatchSupplierOrderSpecMutation,
} from '@/store/slices/materialApiSlice';
import { errMsg, CategoryPicker } from './shared';

export function SupplierOrdersScreen({ showToast, prefill, onArrived }) {
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

  const [submitting, setSubmitting] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [editForm, setEditForm] = useState({ article: '', colour: '', thickness: '', dcm: '', qty: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (!prefill) return;
    setCategory(prefill.category || 'LEATHER');
    setSubtype(prefill.subtype || '');
    setArticle(prefill.article || '');
    setColour(prefill.colour || '');
    setThickness(prefill.thickness || '');
    setQty(prefill.qty || '');
    setSupplierId(prefill.supplier_id || '');
  }, [prefill]);

  // 14.1 POST /suppliers/orders
  const handleCreate = async () => {
    if (!article.trim() || !qty || Number(qty) <= 0) {
      showToast('Please enter Article and a valid Quantity', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        category,
        subtype: subtype ? subtype : null,
        article: article.trim(),
        colour: colour.trim() ? colour.trim() : null,
        thickness: thickness.trim() ? thickness.trim() : null,
        dcm: dcm ? Number(dcm) : null,
        qty: Number(qty),
        supplier_id: supplierId.trim() ? supplierId.trim() : null,
      };

      const res = await createSupplierOrder(payload).unwrap();
      const supplierDisplay = res.supplier?.name ? ` via ${res.supplier.name}` : '';
      showToast(`Purchase order raised for ${res.article || article}${supplierDisplay}.`, 'success');

      setOrders((prev) => [
        {
          order_id: res.order_id || `temp-${Date.now()}`,
          status: res.status || 'ordered',
          article: res.article || article,
          colour: res.colour || colour,
          thickness: res.thickness || thickness,
          dcm: res.dcm || dcm,
          qty: res.qty || Number(qty),
          uom: res.uom || (category === 'LEATHER' ? 'dcm' : 'pcs'),
          supplier: res.supplier || (supplierId ? { name: supplierId } : null),
          arrived_at: null,
        },
        ...prev,
      ]);

      // Reset form
      setArticle('');
      setColour('');
      setThickness('');
      setDcm('');
      setQty('');
      setSupplierId('');
    } catch (e) {
      showToast(errMsg(e), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // 14.2 PATCH /suppliers/orders/{order_id} -> arrived
  const markArrived = async (order) => {
    try {
      const res = await patchSupplierOrder({ orderId: order.order_id, status: 'arrived' }).unwrap();
      setOrders((prev) =>
        prev.map((o) =>
          o.order_id === order.order_id
            ? { ...o, status: 'arrived', arrived_at: res.arrived_at || new Date().toISOString() }
            : o
        )
      );
      showToast(`Order marked as Arrived. Ready for Receiving.`, 'success');
    } catch (e) {
      showToast(errMsg(e), 'error');
    }
  };

  // 14.2 PATCH /suppliers/orders/{order_id} -> cancelled
  const cancelOrder = async (order) => {
    if (!confirm('Are you sure you want to cancel this purchase order?')) return;
    try {
      await patchSupplierOrder({ orderId: order.order_id, status: 'cancelled' }).unwrap();
      setOrders((prev) =>
        prev.map((o) => (o.order_id === order.order_id ? { ...o, status: 'cancelled' } : o))
      );
      showToast('Order cancelled.', 'info');
    } catch (e) {
      showToast(errMsg(e), 'error');
    }
  };

  // 14.3 PATCH /suppliers/orders/{order_id}/spec
  const startEdit = (order) => {
    setEditingOrderId(order.order_id);
    setEditForm({
      article: order.article || '',
      colour: order.colour || '',
      thickness: order.thickness || '',
      dcm: order.dcm ?? '',
      qty: order.qty ?? '',
    });
  };

  const saveEdit = async (order) => {
    setSavingEdit(true);
    try {
      const payload = {};
      if (editForm.article !== (order.article || '')) payload.article = editForm.article.trim();
      if (editForm.colour !== (order.colour || '')) payload.colour = editForm.colour.trim();
      if (editForm.thickness !== (order.thickness || '')) payload.thickness = editForm.thickness.trim();
      if (String(editForm.dcm) !== String(order.dcm ?? '')) payload.dcm = editForm.dcm ? Number(editForm.dcm) : null;
      if (String(editForm.qty) !== String(order.qty ?? '')) payload.qty = Number(editForm.qty);

      const res = await patchSupplierOrderSpec({ orderId: order.order_id, ...payload }).unwrap();
      setOrders((prev) =>
        prev.map((o) =>
          o.order_id === order.order_id
            ? { ...o, ...editForm, qty: Number(editForm.qty), status: res.status || o.status }
            : o
        )
      );
      showToast('Order details updated.', 'success');
      setEditingOrderId(null);
    } catch (e) {
      showToast(errMsg(e), 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Form Card */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border space-y-5 max-w-2xl" style={{ borderColor: 'rgba(200,131,74,0.18)' }}>
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white" style={{ background: '#c8834a' }}>
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-800">Raise Purchase Order (PO)</h2>
              <p className="text-[11px] font-medium text-slate-400">Create a material order with a supplier</p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">DM / MD Only</span>
        </div>

        <div className="space-y-4">
          <CategoryPicker
            category={category}
            subtype={subtype}
            onCategory={(c) => {
              setCategory(c);
              setSubtype('');
            }}
            onSubtype={setSubtype}
            subtypeRequired={false}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Article Name *</label>
              <input
                placeholder="e.g. SHEEP GLASS"
                value={article}
                onChange={(e) => setArticle(e.target.value)}
                className="w-full h-10 px-3 border rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                style={{ borderColor: 'rgba(200,131,74,0.25)' }}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Colour</label>
              <input
                placeholder="e.g. BLACK (optional)"
                value={colour}
                onChange={(e) => setColour(e.target.value)}
                className="w-full h-10 px-3 border rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                style={{ borderColor: 'rgba(200,131,74,0.25)' }}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Thickness / Size</label>
              <input
                placeholder="e.g. 0.7mm (optional)"
                value={thickness}
                onChange={(e) => setThickness(e.target.value)}
                className="w-full h-10 px-3 border rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                style={{ borderColor: 'rgba(200,131,74,0.25)' }}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Expected DCM</label>
              <input
                type="number"
                placeholder="e.g. 3400 (optional)"
                value={dcm}
                onChange={(e) => setDcm(e.target.value)}
                className="w-full h-10 px-3 border rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                style={{ borderColor: 'rgba(200,131,74,0.25)' }}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Order Quantity * ({category === 'LEATHER' ? 'dcm' : 'units'})
              </label>
              <input
                type="number"
                placeholder="e.g. 3400"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="w-full h-10 px-3 border rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                style={{ borderColor: 'rgba(200,131,74,0.25)' }}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Supplier ID</label>
              <input
                placeholder="Supplier UUID (optional)"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full h-10 px-3 border rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                style={{ borderColor: 'rgba(200,131,74,0.25)' }}
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleCreate}
          disabled={submitting || !article.trim() || !qty}
          className="w-full h-11 rounded-xl font-black text-xs uppercase tracking-wider text-white disabled:opacity-40 flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99]"
          style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />} Raise Purchase Order
        </button>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-3xl shadow-sm border overflow-hidden" style={{ borderColor: 'rgba(200,131,74,0.18)' }}>
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Recent Purchase Orders</h3>
            <p className="text-[11px] font-medium text-slate-400">Track and update supplier order statuses</p>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">{orders.length} orders</span>
        </div>

        <div className="divide-y" style={{ borderColor: 'rgba(200,131,74,0.08)' }}>
          {orders.map((o) => {
            const isOrdered = (o.status || '').toLowerCase() === 'ordered';
            const isArrived = (o.status || '').toLowerCase() === 'arrived';
            const isCancelled = (o.status || '').toLowerCase() === 'cancelled';

            return (
              <div key={o.order_id} className="p-4 hover:bg-amber-50/20 transition-colors">
                {editingOrderId === o.order_id ? (
                  <div className="space-y-3 p-3 rounded-2xl bg-amber-50/80 border border-amber-200">
                    <div className="text-xs font-black text-amber-900">Edit Order Spec (Pre-arrival only)</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <input
                        placeholder="Article"
                        value={editForm.article}
                        onChange={(e) => setEditForm((p) => ({ ...p, article: e.target.value }))}
                        className="h-9 px-3 border rounded-xl text-xs font-bold bg-white"
                        style={{ borderColor: 'rgba(200,131,74,0.3)' }}
                      />
                      <input
                        placeholder="Colour"
                        value={editForm.colour}
                        onChange={(e) => setEditForm((p) => ({ ...p, colour: e.target.value }))}
                        className="h-9 px-3 border rounded-xl text-xs font-bold bg-white"
                        style={{ borderColor: 'rgba(200,131,74,0.3)' }}
                      />
                      <input
                        placeholder="Thickness"
                        value={editForm.thickness}
                        onChange={(e) => setEditForm((p) => ({ ...p, thickness: e.target.value }))}
                        className="h-9 px-3 border rounded-xl text-xs font-bold bg-white"
                        style={{ borderColor: 'rgba(200,131,74,0.3)' }}
                      />
                      <input
                        type="number"
                        placeholder="DCM"
                        value={editForm.dcm}
                        onChange={(e) => setEditForm((p) => ({ ...p, dcm: e.target.value }))}
                        className="h-9 px-3 border rounded-xl text-xs font-bold bg-white"
                        style={{ borderColor: 'rgba(200,131,74,0.3)' }}
                      />
                      <input
                        type="number"
                        placeholder="Quantity"
                        value={editForm.qty}
                        onChange={(e) => setEditForm((p) => ({ ...p, qty: e.target.value }))}
                        className="h-9 px-3 border rounded-xl text-xs font-bold bg-white sm:col-span-2"
                        style={{ borderColor: 'rgba(200,131,74,0.3)' }}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(o)}
                        disabled={savingEdit}
                        className="h-8 px-4 rounded-xl font-black text-xs uppercase text-white disabled:opacity-50"
                        style={{ background: '#c8834a' }}
                      >
                        {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save Changes'}
                      </button>
                      <button
                        onClick={() => setEditingOrderId(null)}
                        className="h-8 px-4 rounded-xl font-black text-xs uppercase text-slate-500 bg-slate-100 hover:bg-slate-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase shrink-0 mt-0.5 ${isArrived
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : isCancelled
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                      >
                        {o.status || 'ORDERED'}
                      </span>
                      <div>
                        <div className="font-black text-slate-900 text-sm flex items-center gap-2">
                          <span>{o.article}</span>
                          {o.colour && <span className="text-xs font-bold text-slate-500 font-mono">({o.colour})</span>}
                        </div>
                        <div className="text-xs font-semibold text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>Qty: <strong className="text-slate-800">{o.qty} {o.uom || 'dcm'}</strong></span>
                          {o.thickness && <span>· Thick: {o.thickness}</span>}
                          {o.supplier?.name && (
                            <span className="flex items-center gap-1 text-amber-800">
                              · <Building2 className="w-3 h-3" /> {o.supplier.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {isOrdered && (
                        <>
                          <button
                            onClick={() => startEdit(o)}
                            className="h-8 px-3 rounded-xl font-bold text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 flex items-center gap-1"
                          >
                            <Pencil className="w-3 h-3" /> Edit
                          </button>
                          <button
                            onClick={() => markArrived(o)}
                            className="h-8 px-3 rounded-xl font-black text-xs text-white flex items-center gap-1 shadow-sm"
                            style={{ background: '#c8834a' }}
                          >
                            <Truck className="w-3.5 h-3.5" /> Mark Arrived
                          </button>
                          <button
                            onClick={() => cancelOrder(o)}
                            className="h-8 px-2.5 rounded-xl font-bold text-xs text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200"
                          >
                            Cancel
                          </button>
                        </>
                      )}

                      {isArrived && (
                        <button
                          onClick={() => onArrived?.({ orderId: o.order_id, article: o.article, colour: o.colour })}
                          className="h-8 px-4 rounded-xl font-black text-xs text-white bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5 shadow-sm"
                        >
                          Receive Stock <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {orders.length === 0 && (
            <div className="p-8 text-center text-xs font-semibold text-slate-400">
              No purchase orders raised this session yet. Use the form above to raise an order.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
