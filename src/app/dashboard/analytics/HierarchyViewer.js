'use client';
import { useMemo } from 'react';
import { Warehouse, Package, Activity, Loader2 } from 'lucide-react';
import getPieces from './utils'

// Stage ranking ensuring Lining Cutting comes directly after Leather Cutting
function getStageRank(st) {
  const rawKey = String(st?.stage || st?.stage_code || st?.label || st?.stage_label || st?.stage_name || '')
    .toUpperCase()
    .replace(/[\s-]+/g, '_');

  if (rawKey.includes('LEATHER_CUT') || rawKey === 'CUTTING') return 1;
  if (rawKey.includes('LINING_CUT') || rawKey === 'LINING' || rawKey.includes('LINE_CUT')) return 2;
  if (rawKey.includes('FUS')) return 3;
  if (rawKey.includes('PAST')) return 4;
  if (rawKey.includes('LINE_STITCH')) return 5;
  if (rawKey.includes('SHELL_STITCH') || rawKey.includes('STITCH')) return 6;
  if (rawKey.includes('FINAL_FINISH') || rawKey.includes('FINISH')) return 7;
  if (rawKey.includes('INSPECT')) return 8;
  if (rawKey.includes('EXPORT') || rawKey.includes('PACKAGE')) return 9;
  return 99;
}

export default function HierarchyViewer({ activeItem, orderTrees, styleDetails, selectedPieceCode, pieceDetail, onSelectPiece, loadingPiece }) {
  if (!activeItem) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full text-center py-16 animate-fade-in">
        <Warehouse className="w-10 h-10 text-slate-300 mb-2" />
        <p className="font-black text-slate-400 text-base">Select a Client / Order</p>
        <p className="text-slate-400/60 text-xs mt-1">Click a group on the left to start exploring.</p>
      </div>
    );
  }

  const group = activeItem.type === 'order' ? activeItem.data : activeItem.parentGroup;
  const treeData = group ? orderTrees[group.rawId] : null;

  const style = activeItem.type === 'style' ? activeItem.data : null;
  const sDetail = style ? styleDetails[style.style_id || style.id] : null;

  const sortedStages = useMemo(() => {
    if (!pieceDetail?.stages || !Array.isArray(pieceDetail.stages)) return [];
    return [...pieceDetail.stages].sort((a, b) => getStageRank(a) - getStageRank(b));
  }, [pieceDetail?.stages]);

  return (
    <div className="space-y-6 pb-20">
      {/* LEVEL 1: Client / Order Data */}
      {group && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
          <div className="bg-slate-50 border-b border-slate-200 px-5 py-3.5 flex items-center gap-2.5">
            <Warehouse className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-black uppercase tracking-widest text-slate-500">Level 1 · Client / Order</span>
          </div>
          <div className="p-6">
            <p className="text-2xl font-black" style={{ color: '#c8834a' }}>{group.client}</p>
            <p className="text-sm text-slate-400 font-mono mt-1 mb-5">{group.rawId}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">PO Number</p>
                <p className="text-lg font-black text-slate-800 truncate">{group.po}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Styles Released</p>
                <p className="text-lg font-black text-slate-800">
                  {(treeData?.styles || []).filter((s) => !s.production_status || s.production_status === 'RELEASED').length || 0}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Pieces</p>
                <p className="text-lg font-black text-slate-800">{treeData?.piece_count || 0}</p>
              </div>
            </div>

            {treeData?.store && (
              <div className="mt-5 pt-5 border-t border-slate-100">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">Store Holding</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'holding_leather', label: 'Holding Leather', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
                    { key: 'holding_lining', label: 'Holding Lining', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
                    { key: 'holding_both', label: 'Holding Both', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
                    { key: 'received', label: 'Received', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                    { key: 'sended', label: 'Sent', cls: 'bg-slate-100 text-slate-700 border-slate-200' },
                    { key: 'awaiting_parts', label: 'Awaiting Parts', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
                    { key: 'no_drawer', label: 'No Drawer', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
                  ].map(({ key, label, cls }) => (
                    <span key={key} className={`text-xs font-black px-3 py-1.5 rounded-full border ${cls}`}>
                      {label}: {treeData.store[key] ?? 0}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* LEVEL 2: Style Data */}
      {style && (
        <div className="bg-white rounded-2xl border border-[#c8834a]/30 shadow-md overflow-hidden animate-fade-in relative mt-4">
          <div className="bg-[#c8834a]/10 border-b border-[#c8834a]/20 px-5 py-3.5 flex justify-between items-center gap-2">
            <div className="flex items-center gap-2.5">
              <Package className="w-4 h-4 text-[#c8834a]" />
              <span className="text-xs font-black uppercase tracking-widest text-[#c8834a]">Level 2 · Style Details</span>
            </div>
            {!selectedPieceCode && (
              <span className="text-xs bg-white text-[#c8834a] px-3 py-1.5 rounded-lg font-bold shrink-0">Select a piece below ↓</span>
            )}
          </div>
          <div className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
              <div>
                <p className="text-2xl font-black text-[#2d1f0e]">
                  {style.style_name || style.style} <span className="text-slate-400 font-semibold text-base">({style.article || sDetail?.article || 'Standard Article'})</span>
                </p>
                <p className="text-xs text-slate-400 font-mono mt-1">{style.style_id || style.id}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {sDetail?.status || style.status || 'Active in Pipeline'}
                </span>
              </div>
            </div>

            {/* Dynamic Level 2 Style Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="rounded-xl bg-amber-50/70 border border-amber-100 p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-0.5">Total Pieces</p>
                <p className="text-xl font-black text-slate-900">{getPieces(sDetail).length || style.piece_count || style.pieces?.length || 0}</p>
              </div>
              <div className="rounded-xl bg-emerald-50/70 border border-emerald-100 p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-0.5">Completed</p>
                <p className="text-xl font-black text-emerald-800">
                  {getPieces(sDetail).filter(p => p.current_stage === 'FINAL_FINISH' || p.status === 'Completed').length || 0}
                </p>
              </div>
              <div className="rounded-xl bg-blue-50/70 border border-blue-100 p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700 mb-0.5">In Progress</p>
                <p className="text-xl font-black text-blue-800">
                  {Math.max(0, (getPieces(sDetail).length || style.piece_count || 0) - getPieces(sDetail).filter(p => p.current_stage === 'FINAL_FINISH' || p.status === 'Completed').length)}
                </p>
              </div>
              <div className="rounded-xl bg-rose-50/70 border border-rose-100 p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700 mb-0.5">Defects / Rework</p>
                <p className="text-xl font-black text-rose-800">
                  {getPieces(sDetail).filter(p => p.is_rework || p.status === 'Damaged' || p.status === 'Rework').length || 0}
                </p>
              </div>
            </div>

            {/* Pieces list inside Level 2 */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500">Tracked Pieces &amp; Travelers</span>
              <span className="text-[11px] font-bold text-slate-400">{getPieces(sDetail).length} pieces loaded</span>
            </div>
            <div className={`border border-slate-200 rounded-xl overflow-hidden transition-all duration-300 max-h-80 overflow-y-auto ${selectedPieceCode ? 'opacity-50 h-32' : ''}`}>
              {getPieces(sDetail).map((p) => (
                <div
                  key={p.bundle_id || p.piece_code}
                  onClick={() => onSelectPiece(p.bundle_id || p.piece_code)}
                  className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3.5 border-b border-slate-100 last:border-b-0 cursor-pointer transition-colors ${selectedPieceCode === (p.bundle_id || p.piece_code) ? 'bg-[#c8834a]/10' : 'hover:bg-slate-50'}`}
                >
                  <span className="text-sm font-bold text-slate-400 w-8 shrink-0">#{p.seq || 1}</span>
                  <span className="text-sm font-black text-slate-800 flex-1 min-w-[100px] truncate">{p.bundle_id || p.piece_code}</span>
                  <span className="text-sm text-slate-500 shrink-0">{p.colour || p.color} / {p.size}</span>
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-full text-xs font-black shrink-0">{p.current_stage || 'Active'}</span>
                </div>
              ))}
              {getPieces(sDetail).length === 0 && (
                <div className="p-8 text-center text-slate-400 italic text-sm">Loading or no pieces logged for this style yet.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* LEVEL 3: Piece Data */}
      {selectedPieceCode && (
        <div className="bg-white rounded-2xl border border-emerald-500/30 shadow-lg overflow-hidden animate-fade-in relative mt-4">
          <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-3.5 flex justify-between items-center gap-2">
            <div className="flex items-center gap-2.5">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-black uppercase tracking-widest text-emerald-700">Level 3 · Piece Traveler</span>
            </div>
            <button onClick={() => onSelectPiece(null)} className="text-xs font-black bg-white border border-emerald-200 text-emerald-700 px-3.5 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors shrink-0 cursor-pointer">Close View</button>
          </div>
          {loadingPiece ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <span className="text-xs font-bold">Loading Piece Details…</span>
            </div>
          ) : pieceDetail ? (
            <div className="p-6 space-y-6">
              <div>
                <p className="text-xl font-black text-[#2d1f0e] font-mono">{pieceDetail.bundle_id || pieceDetail.piece_code || pieceDetail.code || pieceDetail.piece_id || selectedPieceCode}</p>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  {(pieceDetail.style_name || pieceDetail.style) && (
                    <span className="text-sm text-slate-700 font-bold">{pieceDetail.style_name || pieceDetail.style}</span>
                  )}
                  {(pieceDetail.colour || pieceDetail.color || pieceDetail.size) && (
                    <span className="text-sm text-slate-500 font-semibold">{pieceDetail.colour || pieceDetail.color} {pieceDetail.size ? `/ ${pieceDetail.size}` : ''}</span>
                  )}
                  {(pieceDetail.current_stage || pieceDetail.current_stage_label || pieceDetail.status) && (
                    <span className="text-emerald-700 font-black bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full text-xs">
                      {pieceDetail.current_stage_label || pieceDetail.current_stage || pieceDetail.status}
                    </span>
                  )}
                </div>
              </div>

            {pieceDetail.store && (
              <div className="bg-blue-50/60 rounded-xl p-5 border border-blue-100">
                <p className="text-xs font-black uppercase text-blue-700 mb-3 tracking-widest">Store Status</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Drawer</p>
                    <p className="text-sm font-black text-slate-800 font-mono">{pieceDetail.store.drawer_code || '—'}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Holding</p>
                    <p className="text-sm font-black text-slate-800">{pieceDetail.store.holding || '—'}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Awaiting</p>
                    <p className="text-sm font-black text-slate-800">
                      {Array.isArray(pieceDetail.store.awaiting) && pieceDetail.store.awaiting.length > 0
                        ? pieceDetail.store.awaiting.join(', ')
                        : 'Nothing'}
                    </p>
                  </div>
                </div>
              </div>
            )}

              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                <p className="text-xs font-black uppercase text-slate-400 mb-4 tracking-widest">Stage History Details</p>
                <div className="space-y-3">
                  {sortedStages.map((st, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-white border border-slate-200 flex justify-between items-center shadow-sm gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-slate-700 text-sm">
                            {st.label || st.stage_label || st.stage_name || st.stage || st.stage_code}
                          </span>
                          {st.is_rework && <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-md font-bold text-[10px]">REWORK</span>}
                          {st.state && (
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                              st.state === 'completed'
                                ? 'bg-emerald-100 text-emerald-700'
                                : st.state === 'in_progress'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {st.state}
                            </span>
                          )}
                        </div>
                        <div className="text-slate-500 mt-1 font-medium text-sm">By {st.employee_name || st.worker_name || 'N/A'}</div>
                      </div>
                      <div className="text-right text-slate-400 shrink-0">
                        <div className="font-bold text-sm">{st.work_date || st.date}</div>
                        <div className="text-xs mt-0.5">
                          {st.logged_at
                            ? (isNaN(new Date(st.logged_at).getTime())
                                ? st.logged_at
                                : new Date(st.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
                            : (st.time || '')}
                        </div>
                      </div>
                    </div>
                  ))}
                  {sortedStages.length === 0 && (
                    <div className="p-4 text-center text-slate-400 italic text-sm">No stage history logged yet.</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 italic text-sm">Could not load piece details.</div>
          )}
        </div>
      )}
    </div>
  );
}
