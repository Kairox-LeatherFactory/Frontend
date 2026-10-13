// traveler card print code
'use client';
import { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import JsBarcode from 'jsbarcode';
import { Scissors, X, Loader2, Rocket, Barcode } from 'lucide-react';

function TravelerPieceItem({ piece }) {
  const svgRef = useRef(null);
  useEffect(() => {
    if (svgRef.current && piece?.code) {
      try {
        JsBarcode(svgRef.current, piece.code, {
          format: 'CODE128',
          width: 1.5,
          height: 36,
          displayValue: false,
          margin: 0,
        });
      } catch (err) {
        console.error(err);
      }
    }
  }, [piece]);

  return (
    <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-2xs">
      <div className="space-y-0.5">
        <p className="text-xs font-mono font-black text-slate-800 flex items-center gap-1.5">
          <Barcode className="w-4 h-4 text-amber-600 shrink-0" />
          {piece.code}
        </p>
        <p className="text-[10px] font-bold text-slate-400">Sequence: #{piece.seq}</p>
      </div>
      <div className="flex items-center gap-2">
        <svg ref={svgRef} className="h-9 max-w-[130px]" />
        <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md border border-amber-200">
          Minted
        </span>
      </div>
    </div>
  );
}

export default function TravelerPrintModal({ mounted, show, setShow, cuttingPieces, setCuttingPieces, isSavingCutting, onConfirm }) {
  if (!mounted || !show) return null;
  const handleClose = () => { setShow(false); setCuttingPieces([]); };
  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/70 backdrop-blur-md animate-fade-in p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-50">
              <Scissors className="w-4 h-4 text-[#c8834a]" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Traveler Cards / Barcodes Minted</h3>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total Pieces: {cuttingPieces.length}</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-2 bg-slate-50">
          {cuttingPieces.map((piece) => (
            <TravelerPieceItem key={piece.id || piece.seq} piece={piece} />
          ))}
        </div>

        <div className="flex gap-3 p-6 border-t border-slate-100 bg-white">
          <button onClick={handleClose} disabled={isSavingCutting} className="flex-1 py-3 rounded-xl text-xs font-extrabold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isSavingCutting}
            className="flex-1 py-3 rounded-xl text-xs font-extrabold text-white shadow-md flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}
          >
            {isSavingCutting ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</>
            ) : (
              <><Rocket className="w-3.5 h-3.5" /> OK</>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
