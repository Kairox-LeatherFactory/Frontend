'use client';
import { useState } from 'react';
import { useData } from '@/context/DataContext';
import TimelineItem from '@/components/TimelineItem';

export default function GarmentTracer() {
  const { traceCards } = useData();
  const [searchId, setSearchId] = useState('');
  const [searchedCard, setSearchedCard] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSearchedCard(null);

    const key = searchId.trim().toUpperCase();
    if (!key) {
      setErrorMsg('Please input a valid garment QR / Barcode ID to trace.');
      return;
    }

    const found = traceCards[key];
    if (found) {
      setSearchedCard(found);
    } else {
      setErrorMsg(`No active production tracing record found for Garment ID "${key}".`);
    }
  };

  const loadPreset = (presetId) => {
    setSearchId(presetId);
    setSearchedCard(traceCards[presetId]);
    setErrorMsg('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      
      {/* ─── TITLE SECTION ─── */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Garment QC Tracer</h1>
        <p className="text-slate-500 font-medium">Verify production accountability chains. Search Garment QR/Barcode IDs to audit stage-by-stage inspections.</p>
      </div>

      {/* ─── SEARCH INPUT BLOCK (Target 48px) ─── */}
      <div className="card p-6 bg-white border border-blue-100 shadow-xl space-y-6">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
          🔍 Barcode / QR Scan Simulation
        </h3>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 items-stretch">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="e.g. LTH-BLK-009"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              className="input-field h-14 min-h-[48px] pl-12 bg-slate-50 font-black text-lg border-2 border-blue-100"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl pointer-events-none">
              🏷️
            </span>
          </div>
          <button
            type="submit"
            className="btn-primary h-14 min-h-[48px] px-8 bg-gradient-brand font-black rounded-xl text-base shadow-lg"
          >
            Audit History
          </button>
        </form>

        {/* Search Suggest helpers */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 text-xs font-semibold text-slate-500">
          <span>Preset Test Barcodes:</span>
          <button
            onClick={() => loadPreset('LTH-BLK-009')}
            className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-100 text-blue-700 font-bold transition-all cursor-pointer"
          >
            LTH-BLK-009 (Full History)
          </button>
          <span className="text-[10px] text-slate-400 font-medium">(Or scan a custom Garment ID logged via Production Logger)</span>
        </div>
      </div>

      {/* ─── ERROR MSG ─── */}
      {errorMsg && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 p-6 rounded-2xl shadow-sm space-y-2 animate-fade-in">
          <div className="flex items-center gap-2 font-bold text-sm">
            <span>⚠</span>
            <h4>Audit Search Exception</h4>
          </div>
          <p className="text-xs sm:text-sm leading-relaxed">
            {errorMsg} Check that the barcode is entered correctly. You can register a new Garment QR tracing path by adding a custom Garment ID inside the <strong className="text-blue-800">Production Logger</strong> page!
          </p>
        </div>
      )}

      {/* ─── TIMELINE RESULT BLOCK ─── */}
      {searchedCard && (
        <div className="card p-6 sm:p-8 bg-white border border-blue-100 shadow-xl space-y-8 animate-fade-in">
          
          {/* Card metadata Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-6">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Inspected Item</span>
              <h3 className="text-xl font-black text-slate-900 mt-1">Jacket Barcode: {searchedCard.garment_id}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Style: {searchedCard.style} • PO Link: {searchedCard.order_id}</p>
            </div>
            <span className="badge badge-success py-1.5 px-3 text-xs uppercase">
              100% Audited
            </span>
          </div>

          {/* Stepper Timeline list */}
          <div className="relative pl-2 sm:pl-4 space-y-2">
            {searchedCard.operations.map((op, idx) => (
              <TimelineItem
                key={`${op.stage}-${idx}`}
                stage={op.stage}
                operator={op.operator}
                status={op.status}
                note={op.note}
                time={op.time}
                isLast={idx === searchedCard.operations.length - 1}
              />
            ))}
          </div>

        </div>
      )}

    </div>
  );
}
