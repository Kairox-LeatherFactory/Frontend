'use client';

import React from 'react';
import SpotlightCard from '@/components/SpotlightCard';
import { apiTransitionTracking } from '../../lib/api';

export default function ProductionTrackersTab({
  trackers = [],
  token,
  showToast,
  loadData,
}) {
  return (
    <div className="space-y-4">
      {trackers.map((t) => (
        <SpotlightCard
          key={t.id}
          className="p-5 bg-white rounded-3xl shadow-sm border border-amber-900/10"
          spotlightColor="rgba(200,131,74,0.04)"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                Order #{t.order_number} · Client: {t.client_name}
              </span>
              <h3 className="text-lg font-black text-slate-900 mt-1">
                {t.style_name}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold px-3 py-1 rounded-xl bg-slate-100 text-slate-700 uppercase">
                Rung: {t.status.replace(/_/g, ' ')}
              </span>
              {t.status === 'material_ready' && (
                <button
                  onClick={async () => {
                    await apiTransitionTracking(
                      token,
                      t.id,
                      'released_to_production'
                    );
                    showToast(
                      'success',
                      'Released to Phase 1 Production Logger!'
                    );
                    loadData();
                  }}
                  className="px-4 py-2 bg-[#2d1f0e] hover:bg-[#3d2b1a] text-white font-black text-xs rounded-xl transition-all"
                >
                  Release to Production
                </button>
              )}
            </div>
          </div>
        </SpotlightCard>
      ))}
    </div>
  );
}
