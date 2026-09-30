'use client';

import { useState, useRef, useEffect } from 'react';
import { Scissors, FileText, CheckCircle2, Calculator } from 'lucide-react';
import { useIssueCuttingJobSheetMutation } from '@/store/slices/apiSlice';
import { apiIssueCuttingJobSheet } from '@/lib/api';

export default function CuttingJobSheetTab() {
  const [issueCuttingJobSheet, { isLoading }] = useIssueCuttingJobSheetMutation();
  const [successMsg, setSuccessMsg] = useState(null);

  // Form State
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [style, setStyle] = useState('BF27P010501');
  const [article, setArticle] = useState('GOAT SUEDE');
  const [colour, setColour] = useState('NAVY');
  const [worker, setWorker] = useState('MAJID');
  const [size, setSize] = useState('M');

  // Excel Grid State (10 skins)
  const [skins, setSkins] = useState(Array(10).fill(''));
  const inputRefs = useRef([]);

  // Auto-calculation
  const totalSkins = skins.filter(s => s !== '' && !isNaN(s)).length;
  const totalSqft = skins.reduce((acc, curr) => acc + (curr !== '' && !isNaN(curr) ? parseFloat(curr) : 0), 0).toFixed(2);

  const handleSkinChange = (index, value) => {
    const newSkins = [...skins];
    newSkins[index] = value;
    setSkins(newSkins);
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      // Jump to next cell
      if (index < 9) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleIssueJobSheet = async () => {
    if (totalSkins === 0) return;

    const payload = {
      date, style, article, colour, worker, size,
      measurements: skins.filter(s => s !== ''),
      total_skins: totalSkins,
      total_sqft: totalSqft
    };

    try {
      // Use RTK mutation if backend is up, else fallback
      let res;
      try {
        res = await issueCuttingJobSheet(payload).unwrap();
      } catch (err) {
        console.warn("Backend RTK failed, using mock API for UI flow");
        res = await apiIssueCuttingJobSheet('mock-token', payload);
      }

      setSuccessMsg(`Generated Barcode: ${res.barcode_id || 'CUT-SUCCESS'}`);
      setSkins(Array(10).fill(''));
      inputRefs.current[0]?.focus(); // auto focus back to first cell

      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-6">
          <FileText className="w-5 h-5 text-[#c8834a]" />
          Issue Job Sheet (Interactive Grid)
        </h2>

        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            {successMsg}
          </div>
        )}

        {/* Header Form */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full bg-[#fcfaf8] border border-[#c8834a]/20 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:border-[#c8834a]" />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Style</label>
            <input type="text" value={style} onChange={(e) => setStyle(e.target.value)}
              className="w-full bg-[#fcfaf8] border border-[#c8834a]/20 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:border-[#c8834a]" />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Article</label>
            <input type="text" value={article} onChange={(e) => setArticle(e.target.value)}
              className="w-full bg-[#fcfaf8] border border-[#c8834a]/20 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:border-[#c8834a]" />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Colour</label>
            <input type="text" value={colour} onChange={(e) => setColour(e.target.value)}
              className="w-full bg-[#fcfaf8] border border-[#c8834a]/20 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:border-[#c8834a]" />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Worker</label>
            <input type="text" value={worker} onChange={(e) => setWorker(e.target.value)}
              className="w-full bg-[#fcfaf8] border border-[#c8834a]/20 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:border-[#c8834a]" />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Size</label>
            <input type="text" value={size} onChange={(e) => setSize(e.target.value)}
              className="w-full bg-[#fcfaf8] border border-[#c8834a]/20 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:border-[#c8834a]" />
          </div>
        </div>

        {/* Excel Grid for Skin Measurements */}
        <div className="bg-[#FAF6F0] rounded-2xl p-6 border border-[#c8834a]/10 mb-8 overflow-x-auto">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#4a3a2a] mb-4 flex items-center gap-2">
            <Calculator className="w-4 h-4 text-[#c8834a]" />
            Skin Measurements (SqFt)
          </h3>
          <p className="text-[10px] font-bold text-slate-400 mb-4">Press ENTER or TAB to auto-advance to the next skin cell.</p>

          <div className="flex gap-2 min-w-max">
            {skins.map((skin, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <span className="text-[10px] font-black text-[#c8834a]/80">SKIN {i + 1}</span>
                <input
                  ref={el => inputRefs.current[i] = el}
                  type="number"
                  step="0.01"
                  value={skin}
                  onChange={(e) => handleSkinChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, i)}
                  className="w-16 h-16 text-center text-lg font-black text-slate-800 bg-white border-2 border-transparent focus:border-[#c8834a] rounded-xl shadow-sm transition-all focus:outline-none focus:shadow-[0_0_0_4px_rgba(200,131,74,0.1)]"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Footer Calculations & Action */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex gap-8">
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400">Total Skins</p>
              <p className="text-3xl font-black text-[#c8834a]">{totalSkins}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400">Total SqFt</p>
              <p className="text-3xl font-black text-[#c8834a]">{totalSqft}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleIssueJobSheet}
            disabled={totalSkins === 0 || isLoading}
            className="w-full sm:w-auto px-8 py-4 bg-[#c8834a] hover:bg-[#b0713b] text-white rounded-2xl font-black text-sm transition-all shadow-[0_8px_20px_-8px_rgba(200,131,74,0.6)] disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
          >
            <Scissors className="w-4 h-4" />
            {isLoading ? 'Issuing...' : 'Issue Job Sheet & Barcode'}
          </button>
        </div>
      </div>
    </div>
  );
}
