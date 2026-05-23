'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { Lock, CheckCircle2, XCircle, Rocket } from 'lucide-react';

export default function ProductionLogEntry() {
  const { user, ROLE_OPERATIONS } = useAuth();
  const { orders, workers, addEvent } = useData();

  // Role operational permissions
  const allowedOperations = ROLE_OPERATIONS[user] || [];
  const isReadOnly = allowedOperations.length === 0;

  // Form State
  const [orderId, setOrderId] = useState(orders[0]?.id || '');
  const [operation, setOperation] = useState(allowedOperations[0] || '');
  const [workerId, setWorkerId] = useState(workers[0]?.id || '');
  const [size, setSize] = useState('M');
  const [qty, setQty] = useState('');
  const [garmentId, setGarmentId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  // Alert Success banner state
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Handle selected order details
  const selectedOrder = orders.find((o) => o.id === orderId);

  const handleSubmit = (e) => {
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

    addEvent(newEvent);

    // Reset quantity and garment ID, show success
    setQty('');
    setGarmentId('');
    setSuccessMsg(`Successfully registered ${parsedQty} pieces for ${operation} (Order ${orderId})! All dashboards have been recomputed dynamically.`);
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
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Shop Floor Production Logger</h1>
        <p className="text-slate-500 font-medium">Record work bundles completed by operators. Touch-friendly screens optimized for fast, accurate floor entry.</p>
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

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl font-bold text-sm shadow-md animate-fade-in flex items-start gap-2.5">
          <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-extrabold">Operation Log Refused</p>
            <p className="text-xs text-red-600 mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* ─── LOGGING FORM CARD ─── */}
      <div className="card p-8 bg-white border border-blue-100 shadow-xl space-y-8">
        
        {/* Helper context showing details about the active logging environment */}
        <div className="p-4 bg-gradient-brand-light rounded-xl border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-xs font-bold text-blue-900">
            <span>Logged By: </span>
            <span className="bg-blue-600 text-white px-2 py-0.5 rounded font-black uppercase tracking-wider">{user.replace('_', ' ')}</span>
          </div>
          {selectedOrder && (
            <div className="text-xs font-semibold text-blue-800">
              Style Tracked: <strong className="font-black text-slate-900">{selectedOrder.style} ({selectedOrder.colorway})</strong> • Qty target: {selectedOrder.quantity}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Order Selection (Target 48px) */}
            <div className="flex flex-col gap-2">
              <label htmlFor="order-select" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                1. Select Client Order / PO *
              </label>
              <select
                id="order-select"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="input-field h-12 py-0 min-h-[48px] bg-slate-50 font-bold border-2 border-blue-100 cursor-pointer"
                required
              >
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.id} — {o.client} ({o.style})
                  </option>
                ))}
              </select>
            </div>

            {/* Stage Operation selection (Target 48px) - Role gated */}
            <div className="flex flex-col gap-2">
              <label htmlFor="operation-select" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                2. Operation Stage * <span className="text-[10px] text-blue-600">(Role-Gated)</span>
              </label>
              <select
                id="operation-select"
                value={operation}
                onChange={(e) => setOperation(e.target.value)}
                className="input-field h-12 py-0 min-h-[48px] bg-slate-50 font-bold border-2 border-blue-100 cursor-pointer"
                required
              >
                {allowedOperations.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
            </div>

            {/* Worker Selection */}
            <div className="flex flex-col gap-2">
              <label htmlFor="worker-select" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                3. Assigned Worker / Operator *
              </label>
              <select
                id="worker-select"
                value={workerId}
                onChange={(e) => setWorkerId(e.target.value)}
                className="input-field h-12 py-0 min-h-[48px] bg-slate-50 font-bold border-2 border-blue-100 cursor-pointer"
                required
              >
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.id} — {w.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Size & Date Selector Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="size-select" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  4. Size *
                </label>
                <select
                  id="size-select"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  className="input-field h-12 py-0 min-h-[48px] bg-slate-50 font-bold border-2 border-blue-100 cursor-pointer"
                  required
                >
                  <option value="S">S</option>
                  <option value="M">M</option>
                  <option value="L">L</option>
                  <option value="XL">XL</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="date-input" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  5. Transaction Date *
                </label>
                <input
                  type="date"
                  id="date-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="input-field h-12 min-h-[48px] bg-slate-50 font-bold border-2 border-blue-100"
                  required
                />
              </div>
            </div>

            {/* Quantity Input (Large tactile 48px picker) */}
            <div className="flex flex-col gap-2">
              <label htmlFor="qty-input" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                6. Quantity Completed (Pieces) *
              </label>
              <div className="relative flex items-stretch">
                <input
                  type="number"
                  id="qty-input"
                  placeholder="e.g. 150"
                  min="1"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="input-field h-12 min-h-[48px] pl-12 bg-slate-50 font-black text-lg border-2 border-blue-100"
                  required
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                  #
                </span>
              </div>
            </div>

            {/* Optional Garment Tracing barcode (for Timeline validation) */}
            <div className="flex flex-col gap-2">
              <label htmlFor="garment-id-input" className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                7. Garment ID / QR Code <span className="text-[10px] text-slate-400 font-medium">(Optional for QC timelines)</span>
              </label>
              <input
                type="text"
                id="garment-id-input"
                placeholder="e.g. LTH-BLK-009"
                value={garmentId}
                onChange={(e) => setGarmentId(e.target.value)}
                className="input-field h-12 min-h-[48px] bg-slate-50 font-semibold border-2 border-blue-100"
              />
            </div>

          </div>

          {/* Form Actions with massive touch targets */}
          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row gap-4 justify-end">
            <button
              type="button"
              onClick={() => {
                setQty('');
                setGarmentId('');
              }}
              className="btn-secondary h-14 min-h-[48px] font-bold rounded-xl text-base"
            >
              Reset Form
            </button>
            <button
              type="submit"
              className="btn-primary h-14 min-h-[48px] font-black rounded-xl text-base px-8 bg-gradient-brand shadow-lg flex items-center justify-center gap-2"
            >
              <Rocket className="w-5 h-5" /> Submit Production Event
            </button>
          </div>

        </form>

      </div>

    </div>
  );
}
