'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scissors,
  X,
  Search,
  Calculator,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  useGetBarcodeOrdersQuery,
  useIssueCuttingJobSheetMutation,
  useGetMaterialLotsQuery,
} from '@/store/slices/apiSlice';
import { useGetOrderBarcodeSkusQuery } from '@/store/slices/progressapiSlice';
import { useGetEmployeesQuery } from '@/store/slices/adminApiSlice';

export default function CuttingJobSheetModal({ isOpen, onClose }) {
  // Queries
  const { data: orders = [], isLoading: ordersLoading } = useGetBarcodeOrdersQuery(undefined, { skip: !isOpen });
  const { data: lots = [], isLoading: lotsLoading } = useGetMaterialLotsQuery('category=leather', { skip: !isOpen });
  const { data: workers = [], isLoading: workersLoading } = useGetEmployeesQuery(undefined, { skip: !isOpen });
  const [issueJobSheet, { isLoading: issuing }] = useIssueCuttingJobSheetMutation();

  // State
  const [mounted, setMounted] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedSkuId, setSelectedSkuId] = useState('');
  const [selectedLotId, setSelectedLotId] = useState('');
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [jobDate, setJobDate] = useState(new Date().toISOString().slice(0, 10));
  const [successMsg, setSuccessMsg] = useState(null);

  // Excel Grid State (Start with 5 empty skins, can add more)
  const [skins, setSkins] = useState(Array(10).fill(''));
  const inputRefs = useRef([]);

  // Fetch SKUs when order is selected
  const { data: skusData = [], isLoading: skusLoading } = useGetOrderBarcodeSkusQuery(selectedOrderId, {
    skip: !selectedOrderId || !isOpen,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const ordersList = Array.isArray(orders) ? orders : orders?.items || [];
  const lotsList = Array.isArray(lots) ? lots : lots?.lots || lots?.items || [];
  const skusList = Array.isArray(skusData) ? skusData : skusData?.items || [];

  // Calculate totals
  const totalSkins = skins.filter((s) => s !== '' && !isNaN(s) && Number(s) > 0).length;
  const totalSqft = skins
    .reduce((acc, curr) => acc + (curr !== '' && !isNaN(curr) ? parseFloat(curr) : 0), 0)
    .toFixed(2);

  // Selected Lot Details
  const selectedLot = useMemo(() => {
    if (!selectedLotId || !lotsList) return null;
    return lotsList.find((l) => String(l.lot_id) === String(selectedLotId));
  }, [selectedLotId, lotsList]);

  // Selected Garment Details
  const selectedGarment = useMemo(() => {
    if (!selectedSkuId || !skusList) return null;
    return skusList.find((s) => String(s.sku_id) === String(selectedSkuId));
  }, [selectedSkuId, skusList]);

  const handleSkinChange = (index, value) => {
    const newSkins = [...skins];
    newSkins[index] = value;
    setSkins(newSkins);
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      // Jump to next cell, if we're at the end, add a new cell
      if (index === skins.length - 1) {
        setSkins([...skins, '']);
        setTimeout(() => {
          inputRefs.current[index + 1]?.focus();
        }, 10);
      } else {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleSubmit = async () => {
    if (!selectedOrderId || !selectedSkuId || !selectedLotId || totalSkins === 0) return;

    const payload = {
      order_id: selectedOrderId,
      sku_id: selectedSkuId,
      lot_id: selectedLotId,
      worker_id: selectedWorkerId,
      measurements: skins.filter((s) => s !== '' && !isNaN(s) && Number(s) > 0).map(Number),
      total_skins: totalSkins,
      total_sqft: Number(totalSqft),
      date: jobDate || new Date().toISOString().slice(0, 10),
    };

    try {
      const res = await issueJobSheet(payload).unwrap();
      setSuccessMsg(`Success! Barcode Issued: ${res.barcode_id || 'CUT-SUCCESS'}`);
      setSkins(Array(10).fill(''));
      
      // Keep it open for 3 seconds to show success, then reset
      setTimeout(() => {
        setSuccessMsg(null);
        setSelectedOrderId('');
        setSelectedSkuId('');
        setSelectedLotId('');
        onClose();
      }, 3000);
    } catch (err) {
      console.error('Failed to issue job sheet:', err);
      alert('Failed to issue job sheet. Check console.');
    }
  };

  const resetAndClose = () => {
    setSuccessMsg(null);
    setSkins(Array(10).fill(''));
    setSelectedOrderId('');
    setSelectedSkuId('');
    setSelectedLotId('');
    setSelectedWorkerId('');
    onClose();
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-gradient-to-r from-[#fcfaf8] to-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#c8834a]/10 text-[#c8834a]">
                <Scissors className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-800">Issue Cutting Job Sheet</h2>
                <p className="text-xs font-bold text-slate-500">Allocate Leather Lot to a Garment SKU</p>
              </div>
            </div>
            <button
              onClick={resetAndClose}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {successMsg && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                {successMsg}
              </div>
            )}

            {/* Selection Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Date Selection */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  Date *
                </label>
                <input
                  type="date"
                  value={jobDate}
                  onChange={(e) => setJobDate(e.target.value)}
                  className="w-full h-12 px-4 bg-slate-50 border-2 border-slate-200 focus:border-[#c8834a] rounded-xl text-sm font-bold text-slate-700 outline-none cursor-pointer"
                />
              </div>

              {/* Order Selection */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  1. Select Order *
                </label>
                <select
                  value={selectedOrderId}
                  onChange={(e) => {
                    setSelectedOrderId(e.target.value);
                    setSelectedSkuId('');
                  }}
                  className="w-full h-12 px-4 bg-slate-50 border-2 border-slate-200 focus:border-[#c8834a] rounded-xl text-sm font-bold text-slate-700 outline-none cursor-pointer"
                  disabled={ordersLoading}
                >
                  <option value="">-- Choose Order --</option>
                  {ordersList.map((o) => (
                    <option key={o.order_id} value={o.order_id}>
                      {o.order_number}
                    </option>
                  ))}
                </select>
                {ordersLoading && <p className="text-[10px] text-slate-400">Loading orders...</p>}
              </div>

              {/* Garment SKU Selection */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  2. Select Style/Garment *
                </label>
                <select
                  value={selectedSkuId}
                  onChange={(e) => setSelectedSkuId(e.target.value)}
                  className="w-full h-12 px-4 bg-slate-50 border-2 border-slate-200 focus:border-[#c8834a] rounded-xl text-sm font-bold text-slate-700 outline-none cursor-pointer"
                  disabled={!selectedOrderId || skusLoading}
                >
                  <option value="">-- Choose Garment SKU --</option>
                  {skusList.map((s) => (
                    <option key={s.sku_id} value={s.sku_id}>
                      {s.style} ({s.colour} - {s.size})
                    </option>
                  ))}
                </select>
                {skusLoading && <p className="text-[10px] text-slate-400">Loading SKUs...</p>}
              </div>

              {/* Leather Lot Selection */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  3. Allocate Leather Lot *
                </label>
                <select
                  value={selectedLotId}
                  onChange={(e) => setSelectedLotId(e.target.value)}
                  className="w-full h-12 px-4 bg-slate-50 border-2 border-slate-200 focus:border-[#c8834a] rounded-xl text-sm font-bold text-slate-700 outline-none cursor-pointer"
                  disabled={lotsLoading}
                >
                  <option value="">-- Choose Leather Lot --</option>
                  {lotsList.map((l) => (
                    <option key={l.lot_id} value={l.lot_id}>
                      {l.article} - {l.colour} ({l.lot_id})
                    </option>
                  ))}
                </select>
                {lotsLoading && <p className="text-[10px] text-slate-400">Loading lots...</p>}
              </div>

              {/* Worker Selection */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  5. Allocated Worker
                </label>
                <select
                  value={selectedWorkerId}
                  onChange={(e) => setSelectedWorkerId(e.target.value)}
                  className="w-full h-12 px-4 bg-slate-50 border-2 border-slate-200 focus:border-[#c8834a] rounded-xl text-sm font-bold text-slate-700 outline-none cursor-pointer"
                  disabled={workersLoading}
                >
                  <option value="">-- Choose Worker --</option>
                  {workers?.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
                {workersLoading && <p className="text-[10px] text-slate-400">Loading workers...</p>}
              </div>
            </div>

            {/* Selection Summaries (Alerts) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedGarment && (
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
                  <InfoIcon className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className="text-xs font-black text-blue-900 uppercase">Target Garment</p>
                    <p className="text-sm font-medium text-blue-800">
                      We need leather for: <span className="font-bold">{selectedGarment.qty_ordered} pcs</span> of{' '}
                      {selectedGarment.style}
                    </p>
                  </div>
                </div>
              )}
              {selectedLot && (
                <div className={`p-3 border rounded-xl flex items-start gap-3 ${selectedLot.remaining < 0 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                  <AlertTriangle className={`w-5 h-5 mt-0.5 ${selectedLot.remaining < 0 ? 'text-red-500' : 'text-amber-500'}`} />
                  <div>
                    <p className={`text-xs font-black uppercase ${selectedLot.remaining < 0 ? 'text-red-900' : 'text-amber-900'}`}>Selected Lot Stock</p>
                    <p className={`text-sm font-medium ${selectedLot.remaining < 0 ? 'text-red-800' : 'text-amber-800'}`}>
                      Available to cut: <span className="font-bold">{selectedLot.remaining ?? selectedLot.available} DCM</span>
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Excel Grid for Skin Measurements */}
            <div className="bg-[#FAF6F0] rounded-2xl p-6 border border-[#c8834a]/10 overflow-x-auto relative shadow-inner">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#4a3a2a] mb-4 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-[#c8834a]" />
                Skin Measurements (SqFt / DCM)
              </h3>
              <p className="text-[10px] font-bold text-slate-400 mb-4 bg-white/50 inline-block px-2 py-1 rounded-lg">
                Press <strong>ENTER</strong> or <strong>TAB</strong> to auto-advance to the next skin cell.
              </p>

              <div className="flex gap-3 min-w-max pb-2">
                {skins.map((skin, i) => (
                  <div key={i} className="flex flex-col items-center gap-2 group">
                    <span className="text-[10px] font-black text-[#c8834a]/60 group-hover:text-[#c8834a] transition-colors">
                      SKIN {i + 1}
                    </span>
                    <input
                      ref={(el) => (inputRefs.current[i] = el)}
                      type="number"
                      step="0.01"
                      value={skin}
                      onChange={(e) => handleSkinChange(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, i)}
                      placeholder="--"
                      className="w-16 h-16 text-center text-lg font-black text-slate-800 bg-white border-2 border-transparent focus:border-[#c8834a] rounded-xl shadow-sm transition-all focus:outline-none focus:shadow-[0_0_0_4px_rgba(200,131,74,0.1)] hover:border-slate-200"
                    />
                  </div>
                ))}
                
                {/* Add skin button */}
                <div className="flex flex-col items-center justify-end pb-0.5 ml-2">
                   <button 
                     type="button"
                     onClick={() => {
                       setSkins([...skins, '']);
                       setTimeout(() => inputRefs.current[skins.length]?.focus(), 10);
                     }}
                     className="w-16 h-16 rounded-xl border-2 border-dashed border-[#c8834a]/30 text-[#c8834a]/50 hover:bg-[#c8834a]/5 hover:text-[#c8834a] hover:border-[#c8834a] flex items-center justify-center transition-all cursor-pointer shadow-sm bg-white/50"
                   >
                     <span className="text-2xl font-light">+</span>
                   </button>
                </div>
              </div>
            </div>

          </div>

          {/* Footer Calculations & Action */}
          <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex gap-8 w-full sm:w-auto">
              <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Skins</p>
                <p className="text-2xl font-black text-[#c8834a]">{totalSkins}</p>
              </div>
              <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Material</p>
                <p className="text-2xl font-black text-[#c8834a]">{totalSqft} <span className="text-sm">DCM</span></p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={totalSkins === 0 || !selectedOrderId || !selectedSkuId || !selectedLotId || !selectedWorkerId || issuing}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-[#c8834a] to-[#e8a06a] hover:from-[#b0713b] hover:to-[#c8834a] text-white rounded-2xl font-black text-sm transition-all shadow-[0_8px_20px_-8px_rgba(200,131,74,0.6)] disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 cursor-pointer"
            >
              <Scissors className="w-4 h-4" />
              {issuing ? 'Issuing Job Sheet...' : 'Issue Job Sheet & Allocate'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}

function InfoIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}
