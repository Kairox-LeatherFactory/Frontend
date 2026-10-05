'use client';

import React from 'react';
import { UserCheck, Play } from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';

export default function EmptyIntakeState({
  selectedClientId,
  promptConfirmation,
}) {
  return (
    <SpotlightCard
      className="p-10 text-center rounded-3xl bg-white border"
      style={{ borderColor: 'rgba(200,131,74,.15)' }}
    >
      <UserCheck className="w-10 h-10 mx-auto text-[#c8834a] mb-3" />
      <h3 className="font-black text-lg text-[#c8834a]">
        No Submission Initialized Yet
      </h3>
      <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
        Select a client from the dropdown above and click{' '}
        <strong>Initialize</strong> to confirm and open a new intake submission.
      </p>

      <button
        type="button"
        onClick={() => promptConfirmation(selectedClientId)}
        disabled={!selectedClientId}
        className="mt-4 px-5 py-2.5 rounded-xl bg-[#c8834a] text-white text-xs font-black inline-flex items-center gap-2 disabled:opacity-40 shadow-md transition-all hover:bg-[#b0703c]"
      >
        <Play className="w-3.5 h-3.5 fill-current" />
        <span>Select Client & Initialize Submission</span>
      </button>
    </SpotlightCard>
  );
}
