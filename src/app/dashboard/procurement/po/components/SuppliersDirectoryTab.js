'use client';

import React from 'react';
import { Building2, MapPin, Phone, Mail } from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';

export default function SuppliersDirectoryTab({ suppliers = [] }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {suppliers.map((s) => (
        <SpotlightCard
          key={s.id}
          className="p-5 bg-white rounded-3xl shadow-sm border border-amber-900/10"
          spotlightColor="rgba(200,131,74,0.04)"
        >
          <div className="flex justify-between items-start mb-3">
            <div>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                {s.supplier_type || 'Supplier'}
              </span>
              <h3 className="text-base font-black text-slate-900 mt-1 line-clamp-1">
                {s.name}
              </h3>
            </div>
            {s.email_status === 'valid' ? (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Verified
              </span>
            ) : (
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                No Contact
              </span>
            )}
          </div>

          <div className="space-y-1.5 text-xs text-slate-600 font-semibold mb-4">
            <p className="flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-slate-400" /> GSTIN:{' '}
              <b className="font-mono text-slate-800">{s.gstin}</b> (State{' '}
              {s.state_code})
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />{' '}
              {s.address || 'Chennai'}
            </p>
            <p className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-slate-400" />{' '}
              {s.phone || s.whatsapp_phone || 'No Phone'}
            </p>
            <p className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-slate-400" />{' '}
              {s.email || 'No Email'}
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-[11px] font-bold text-slate-500">
            <span>Terms: {s.payment_terms_days} days</span>
            <span>Lead time: {s.lead_time_days} days</span>
          </div>
        </SpotlightCard>
      ))}
    </div>
  );
}
