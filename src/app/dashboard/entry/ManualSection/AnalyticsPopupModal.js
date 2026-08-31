// manual logger view from analytics code
'use client';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BarChart3, X, Loader2, XCircle } from 'lucide-react';
import { apiGetAnalyticsExplore, apiGetStyleDetail } from '@/lib/api';

function AnalyticsPopupContent({ token, sku, data, setData, lastSubmittedPieceSeqs }) {
  useEffect(() => {
    if (!token || !sku) return;

    let isMounted = true;
    const loadData = async () => {
      setData({ loading: true, detail: null, error: null });
      try {
        const exploreData = await apiGetAnalyticsExplore(token);

        let targetStyleId = null;
        for (const client of exploreData?.clients || []) {
          for (const order of client.orders || []) {
            if (sku.order_number && String(order.order_number) !== String(sku.order_number)) continue;

            const matchedStyle = (order.styles || []).find(
              (s) => String(s.style_name || '').toLowerCase() === String(sku.style_name || '').toLowerCase()
            );

            if (matchedStyle) {
              targetStyleId = matchedStyle.style_id || matchedStyle.id;
              break;
            }
          }
          if (targetStyleId) break;
        }

        if (!targetStyleId) {
          throw new Error('Analytics data not found for this style.');
        }

        const detail = await apiGetStyleDetail(token, targetStyleId);
        if (isMounted) setData({ loading: false, detail, error: null });
      } catch (err) {
        if (isMounted) setData({ loading: false, detail: null, error: err.message });
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [token, sku, setData]);

  if (!sku) return <div className="text-slate-500 italic p-4 text-center">No SKU Selected</div>;
  if (data.loading)
    return (
      <div className="flex justify-center items-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#c8834a]" />
      </div>
    );
  if (data.error)
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex items-center gap-2 font-bold">
        <XCircle className="w-5 h-5" /> {data.error}
      </div>
    );
  if (!data.detail) return null;

  let pieces = data.detail.pieces || [];
  if (!Array.isArray(pieces)) pieces = pieces.pieces || [];

  const isFilteredBySubmission = lastSubmittedPieceSeqs && lastSubmittedPieceSeqs.length > 0;

  if (sku) {
    pieces = pieces.filter((p) => {
      const pSize = String(p.size || '').trim().toLowerCase();
      const skuSize = String(sku.size || '').trim().toLowerCase();
      const sizeMatch = !skuSize || skuSize === 'n/a' || skuSize === 'default' || pSize === skuSize;

      const pColor = String(p.colour || p.color_code || p.color_name || '').trim().toLowerCase();
      const skuColor = String(sku.color_code || '').trim().toLowerCase();
      const colorMatch =
        !skuColor ||
        skuColor === 'n/a' ||
        skuColor === 'default' ||
        pColor === skuColor ||
        pColor.includes(skuColor) ||
        skuColor.includes(pColor);

      const pSeq = p.seq ?? p.piece_seq ?? p.seq_no ?? p.sequence;
      const pieceSeqMatch = !isFilteredBySubmission || lastSubmittedPieceSeqs.map(String).includes(String(pSeq));

      return sizeMatch && colorMatch && pieceSeqMatch;
    });
  }

  return (
    <div className="space-y-6">
      {isFilteredBySubmission && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="font-bold text-amber-900">
              Showing Analytics for {pieces.length} Recently Submitted Pieces (#{lastSubmittedPieceSeqs.join(', #')})
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-bold mb-1">Article / Style Name</div>
          <div className="text-sm font-black text-slate-800">{sku.style_name}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-bold mb-1">Total Pieces</div>
          <div className="text-sm font-black text-slate-800 bg-amber-100 text-amber-800 px-2 py-0.5 rounded w-max">
            {pieces.length}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 font-bold text-slate-700 text-xs uppercase tracking-wider">
          Pieces Progress Tracker
        </div>
        <div className="overflow-x-auto max-h-[40vh] overflow-y-auto">
          <table className="w-full text-left text-xs relative">
            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-3 text-slate-500 font-bold uppercase text-[9px] tracking-wider">Seq</th>
                <th className="p-3 text-slate-500 font-bold uppercase text-[9px] tracking-wider">Piece Code</th>
                <th className="p-3 text-slate-500 font-bold uppercase text-[9px] tracking-wider">Colour</th>
                <th className="p-3 text-slate-500 font-bold uppercase text-[9px] tracking-wider">Size</th>
                <th className="p-3 text-slate-500 font-bold uppercase text-[9px] tracking-wider">Current Stage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pieces.map((p) => (
                <tr key={p.bundle_id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-bold text-slate-400">#{p.seq}</td>
                  <td className="p-3 font-bold text-slate-700">{p.bundle_id}</td>
                  <td className="p-3">{p.colour}</td>
                  <td className="p-3">{p.size}</td>
                  <td className="p-3">
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full text-[9px] font-black">
                      {p.current_stage || 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
              {pieces.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-6 text-center text-slate-400 italic">
                    No pieces found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPopupModal({
  mounted,
  show,
  setShow,
  currentSelectedSku,
  token,
  analyticsData,
  setAnalyticsData,
  lastSubmittedPieceSeqs,
}) {
  if (!mounted || !show) return null;
  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-2xl max-h-[90vh] flex flex-col relative overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <div>
            <h3 className="text-xl font-black text-slate-950 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#c8834a]" />
              Style Analytics Overview
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {currentSelectedSku
                ? `${currentSelectedSku.style_name} (PO: ${currentSelectedSku.order_number})`
                : 'Loading...'}
            </p>
          </div>
          <button
            onClick={() => setShow(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto bg-slate-50 flex-1">
          <AnalyticsPopupContent
            token={token}
            sku={currentSelectedSku}
            data={analyticsData}
            setData={setAnalyticsData}
            lastSubmittedPieceSeqs={lastSubmittedPieceSeqs}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
