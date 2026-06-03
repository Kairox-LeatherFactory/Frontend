'use client';
import { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { Lock, CheckCircle2, XCircle, Rocket, ScanBarcode, Ruler, Scissors, Plus, Calendar, FileBox, Users } from 'lucide-react';

export default function ProductionLogEntry() {
  const { user, ROLE_OPERATIONS } = useAuth();
  const { orders, workers, addEvent } = useData();

  // Role operational permissions — memoized: only recomputes when user role changes
  const allowedOperations = useMemo(
    () => ROLE_OPERATIONS[user] || [],
    [user, ROLE_OPERATIONS]
  );
  const isReadOnly = useMemo(() => allowedOperations.length === 0, [allowedOperations]);

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

  // Handle selected order details — memoized: .find() only reruns when orderId or orders change
  // Without this, every qty keystroke triggers a full orders array scan unnecessarily
  const selectedOrder = useMemo(() => {
    return orders.find((o) => o.id === orderId);
  }, [orders, orderId]);

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

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* STEP 1: Core Selection */}
          <div className="space-y-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-3 flex items-center gap-2">
              <span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span> 
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
          <div className="space-y-6 bg-blue-50/40 p-6 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b border-blue-200 pb-3 flex items-center gap-2">
              <span className="bg-indigo-100 text-indigo-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span> 
              Garment Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
              
              {/* Size Pill Buttons */}
              <div className="flex flex-col gap-3">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Ruler className="w-4 h-4 text-indigo-500" /> Garment Size *
                </label>
                <div className="flex gap-2 h-14">
                  {['S', 'M', 'L', 'XL'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSize(s)}
                      className={`flex-1 text-base font-black rounded-xl border-2 transition-all cursor-pointer ${size === s ? 'bg-indigo-600 border-indigo-600 text-white shadow-md scale-105' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 shadow-sm'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Operation Pill Buttons */}
              <div className="flex flex-col gap-3">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Scissors className="w-4 h-4 text-indigo-500" /> Operation Stage *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 min-h-[56px]">
                  {allowedOperations.map((op) => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => setOperation(op)}
                      className={`py-3 px-2 text-xs font-black rounded-xl border-2 transition-all cursor-pointer ${operation === op ? 'bg-indigo-600 border-indigo-600 text-white shadow-md scale-105' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 shadow-sm'}`}
                    >
                      {op}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* STEP 3: Quantity & Logging */}
          <div className="space-y-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-3 flex items-center gap-2">
              <span className="bg-emerald-100 text-emerald-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span> 
              Quantities & Submission
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              
              {/* Quantity Input with Quick Add Buttons */}
              <div className="flex flex-col gap-3 md:col-span-2">
                <label htmlFor="qty-input" className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-emerald-500" /> Quantity Completed (Pieces) *
                </label>
                <div className="flex flex-col sm:flex-row items-stretch gap-4">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      id="qty-input"
                      placeholder="0"
                      value={qty}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setQty(val);
                      }}
                      className="input-field w-full h-14 pl-12 bg-white font-black text-2xl text-emerald-700 border-2 border-slate-200 focus:border-emerald-500 shadow-sm transition-all"
                      required
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 font-bold text-xl">
                      
                    </span>
                  </div>
                  <div className="flex gap-2 w-1/4">
                    <button
                        type="button"
                        onClick={() => setQty('')}
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

              {/* Optional Garment Tracing barcode */}
              <div className="flex flex-col gap-2">
                <label htmlFor="garment-id-input" className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <ScanBarcode className="w-4 h-4 text-emerald-500" /> Garment ID / Barcode
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="garment-id-input"
                    placeholder="Scan or type (Optional)"
                    value={garmentId}
                    onChange={(e) => setGarmentId(e.target.value)}
                    className="input-field w-full h-14 pl-12 bg-white font-semibold border-2 border-slate-200 shadow-sm focus:border-emerald-500"
                  />
                  <ScanBarcode className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                </div>
              </div>

            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-end">
            <button
              type="button"
              onClick={() => {
                setQty('');
                setGarmentId('');
                setSize('M');
              }}
              className="btn-secondary h-14 font-bold rounded-xl text-base px-8"
            >
              Reset All
            </button>
            <button
              type="submit"
              className="btn-primary h-14 font-black rounded-xl text-base px-10 bg-gradient-brand shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
            >
              <Rocket className="w-5 h-5" /> Submit Event
            </button>
          </div>

        </form>

      </div>

    </div>
  );
}
