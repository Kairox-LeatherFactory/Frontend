'use client';

import React from 'react';
import { X, Download, Send } from 'lucide-react';
import {
  apiSimulateTwilioWhatsappWebhook,
  apiSimulateTwilioVoiceWebhook,
} from '../../lib/api';

export default function PoDetailModal({
  selectedPo,
  setSelectedPo,
  setAssignModalPo,
  handleStatusChange,
  actionLoading,
  setActionLoading,
  showToast,
  loadData,
}) {
  if (!selectedPo) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 bg-[#faf6f0] border-b border-amber-900/10 flex justify-between items-center">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#c8834a]">
              Purchase Order Details
            </span>
            <h2 className="text-2xl font-black text-[#2d1f0e]">
              {selectedPo.po_number || 'Draft Order (Unassigned)'}
            </h2>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Buyer Ref: {selectedPo.buyer_ref} · Status:{' '}
              <b className="uppercase text-amber-800">{selectedPo.status}</b>
            </p>
          </div>
          <button
            onClick={() => setSelectedPo(null)}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Supplier info box */}
          <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/60 flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black text-amber-900 uppercase tracking-wider mb-1">
                Supplier Info
              </p>
              <h4 className="font-black text-slate-900 text-sm">
                {selectedPo.supplier?.name || 'No Supplier Assigned'}
              </h4>
              <p className="text-xs text-slate-600 font-semibold mt-1">
                GSTIN: {selectedPo.supplier?.gstin || 'N/A'} · GST Mode:{' '}
                <b>{selectedPo.gst_mode}</b>
              </p>
              <p className="text-xs text-slate-500 font-semibold">
                Address: {selectedPo.supplier?.address || 'Chennai'}
              </p>
            </div>
            {selectedPo.needs_supplier && (
              <button
                onClick={() => {
                  const po = selectedPo;
                  setSelectedPo(null);
                  setAssignModalPo(po);
                }}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold"
              >
                Assign Supplier
              </button>
            )}
          </div>

          {/* Items Table */}
          <div>
            <h4 className="text-xs font-black uppercase text-slate-500 mb-2">
              Order Line Items
            </h4>
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-xs text-left font-semibold">
                <thead className="bg-slate-50 text-slate-700 font-black uppercase">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Color</th>
                    <th className="p-3">Qty</th>
                    <th className="p-3">Rate</th>
                    <th className="p-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedPo.items?.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td className="p-3 text-slate-400 font-mono">
                        {idx + 1}
                      </td>
                      <td className="p-3 font-bold text-slate-900">
                        {item.description}
                      </td>
                      <td className="p-3 text-slate-600">
                        {item.color || '-'}
                      </td>
                      <td className="p-3 font-mono">
                        {item.qty} {item.uom}
                      </td>
                      <td className="p-3 font-mono">₹{item.unit_price}</td>
                      <td className="p-3 text-right font-black text-slate-900">
                        ₹{item.amount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Calculation Breakdown */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs font-semibold">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono font-bold text-slate-900">
                ₹{selectedPo.subtotal}
              </span>
            </div>
            {selectedPo.gst_mode === 'INTRA' ? (
              <>
                <div className="flex justify-between text-slate-600">
                  <span>CGST (6%):</span>
                  <span className="font-mono text-slate-900">
                    ₹{selectedPo.cgst}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>SGST (6%):</span>
                  <span className="font-mono text-slate-900">
                    ₹{selectedPo.sgst}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-slate-600">
                <span>IGST (12%):</span>
                <span className="font-mono text-slate-900">
                  ₹{selectedPo.igst}
                </span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Round Off:</span>
              <span className="font-mono text-slate-900">
                ₹{selectedPo.round_off}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-slate-950">
              <span>Grand Total (INR):</span>
              <span className="font-mono text-emerald-700">
                ₹{selectedPo.total?.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-wrap gap-2 justify-between">
          <button
            onClick={() =>
              alert(
                `Exporting PO ${selectedPo.po_number || selectedPo.id} as PDF document...`
              )
            }
            className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-slate-100"
          >
            <Download className="w-3.5 h-3.5" /> PDF Preview
          </button>

          <div className="flex gap-2">
            {selectedPo.status === 'draft' && (
              <button
                onClick={() => handleStatusChange(selectedPo.id, 'submit')}
                disabled={actionLoading}
                className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white font-black text-xs rounded-xl"
              >
                Submit for Approval
              </button>
            )}
            {selectedPo.status === 'pending_approval' && (
              <>
                <button
                  onClick={() => handleStatusChange(selectedPo.id, 'reject')}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleStatusChange(selectedPo.id, 'approve')}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl"
                >
                  Approve PO
                </button>
              </>
            )}
            {selectedPo.status === 'approved' && (
              <button
                onClick={() => handleStatusChange(selectedPo.id, 'send')}
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl flex items-center gap-1"
              >
                <Send className="w-3.5 h-3.5" /> Dispatch to Supplier
              </button>
            )}
            {selectedPo.status === 'sent' && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={async () => {
                    setActionLoading(true);
                    await apiSimulateTwilioWhatsappWebhook({
                      po_id: selectedPo.id,
                    });
                    showToast(
                      'success',
                      'Simulated Twilio WhatsApp ACK Webhook!'
                    );
                    setActionLoading(false);
                    setSelectedPo(null);
                    loadData();
                  }}
                  disabled={actionLoading}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5"
                >
                  <span>📲 WhatsApp ACK</span>
                </button>

                <button
                  onClick={async () => {
                    setActionLoading(true);
                    await apiSimulateTwilioVoiceWebhook({
                      po_id: selectedPo.id,
                    });
                    showToast(
                      'success',
                      'Simulated Twilio IVR Call ACK Webhook!'
                    );
                    setActionLoading(false);
                    setSelectedPo(null);
                    loadData();
                  }}
                  disabled={actionLoading}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5"
                >
                  <span>📞 Phone IVR ACK</span>
                </button>

                <button
                  onClick={() =>
                    handleStatusChange(selectedPo.id, 'acknowledge')
                  }
                  disabled={actionLoading}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white font-black text-xs rounded-xl"
                >
                  Manual Acknowledge
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
