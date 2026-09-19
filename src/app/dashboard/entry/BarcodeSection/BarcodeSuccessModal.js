// barcode worker verify success modal
'use client';
import { createPortal } from 'react-dom';
import { CheckCircle2 } from 'lucide-react';

export default function BarcodeSuccessModal({ barcodeSuccessModal, setBarcodeSuccessModal }) {
  if (!barcodeSuccessModal) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-900/80 backdrop-blur-md animate-fade-in p-4">
      <div className="bg-white rounded-3xl shadow-2xl border-2 border-[#c8834a]/40 w-full max-w-lg p-6 sm:p-8 space-y-6 relative overflow-hidden">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-[#c8834a]/30 flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-8 h-8 text-[#c8834a]" />
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-xl font-black text-[#2d1f0e]">{barcodeSuccessModal.stage} Event Successfully Saved!</h3>
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

            <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
              {barcodeSuccessModal.pieces.map((p) => (
                <div key={p.code} className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-xs text-[#2d1f0e]">{p.code}</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 font-extrabold uppercase px-1.5 py-0.5 rounded-md">
                      #{p.serial_str || String(p.seq).padStart(3, '0')}
                    </span>
                  </div>
                  <div className="flex items-center flex-wrap gap-1">
                    {(barcodeSuccessModal.article || p.article) && (
                      <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 font-bold px-1.5 py-0.5 rounded-md">
                        {p.article || barcodeSuccessModal.article}
                      </span>
                    )}
                    {(barcodeSuccessModal.style || p.style_name) && (
                      <span className="text-[9px] bg-blue-50 text-blue-700 border border-blue-200 font-bold px-1.5 py-0.5 rounded-md">
                        {p.style_name || barcodeSuccessModal.style}
                      </span>
                    )}
                    {(barcodeSuccessModal.color || p.color) && (
                      <span className="text-[9px] bg-slate-50 text-slate-600 border border-slate-200 font-bold px-1.5 py-0.5 rounded-md">
                        {p.color || barcodeSuccessModal.color}
                      </span>
                    )}
                    {(barcodeSuccessModal.size || p.size) && (
                      <span className="text-[9px] bg-purple-50 text-purple-700 border border-purple-200 font-bold px-1.5 py-0.5 rounded-md">
                        Sz: {p.size || barcodeSuccessModal.size}
                      </span>
                    )}
                    {(barcodeSuccessModal.orderNumber || p.order_number) && (
                      <span className="text-[9px] bg-rose-50 text-rose-700 border border-rose-200 font-bold px-1.5 py-0.5 rounded-md">
                        #{p.order_number || barcodeSuccessModal.orderNumber}
                      </span>
                    )}
                  </div>
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
  );
}
