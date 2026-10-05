'use client';

import React from 'react';
import { FileText, ArrowRight } from 'lucide-react';

export default function DxfUploadModal({
  showDxfModal,
  setShowDxfModal,
  dxfTargetStyle,
  patternNameInput,
  setPatternNameInput,
  confirmDxfPatternName,
  uploadingDxf,
  dxfFileInputRef,
  handleDxfFileSelected,
}) {
  return (
    <>
      {/* HIDDEN DXF INPUT */}
      <input
        type="file"
        ref={dxfFileInputRef}
        accept=".dxf,.zip,.pdf,.dwg"
        className="hidden"
        onChange={handleDxfFileSelected}
      />

      {/* DXF MODAL */}
      {showDxfModal && dxfTargetStyle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white shadow-2xl border border-amber-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-2xl bg-amber-50 text-[#c8834a]">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#c8834a]">
                  Upload DXF Pattern
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Style: {dxfTargetStyle.style_name}
                </p>
              </div>
            </div>

            <div className="my-4">
              <label className="text-xs font-bold text-[#c8834a] block mb-1.5">
                Enter Pattern Name / Reference Name:
              </label>
              <input
                type="text"
                value={patternNameInput}
                onChange={(event) => setPatternNameInput(event.target.value)}
                placeholder="e.g. CLERMONT_PATTERN_V1"
                className="w-full p-3 rounded-xl border border-amber-200 bg-[#faf6f0] text-xs font-bold text-[#c8834a] outline-none focus:border-[#c8834a]"
              />
              <p className="text-[11px] text-slate-500 mt-2">
                Clicking <strong>Next</strong> will open your file browser to select
                the DXF file.
              </p>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setShowDxfModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDxfPatternName}
                disabled={uploadingDxf}
                className="px-5 py-2.5 rounded-xl bg-[#c8834a] text-white text-xs font-black hover:bg-[#b0703c] transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
              >
                <span>Next: Select DXF File</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
