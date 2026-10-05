'use client';

import React from 'react';
import { Calendar, UserCheck } from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';

export default function PoKanbanBoard({
  COLUMNS,
  filteredPos,
  handleDragOver,
  handleDrop,
  handleDragStart,
  setSelectedPo,
  setAssignModalPo,
}) {
  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
      <div className="flex gap-4 h-full min-w-max">
        {COLUMNS.map((col) => {
          const columnPos = filteredPos.filter((po) => po.status === col.id);
          const ColIcon = col.icon;

          return (
            <div
              key={col.id}
              className="w-[300px] flex flex-col rounded-3xl overflow-hidden transition-colors"
              style={{ background: col.bg, border: `1px solid ${col.border}` }}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              {/* Column Header */}
              <div
                className="p-4 border-b flex items-center justify-between"
                style={{ borderColor: col.border }}
              >
                <div className="flex items-center gap-2">
                  <ColIcon
                    className="w-4 h-4"
                    style={{ color: col.color }}
                  />
                  <h3
                    className="font-black text-xs uppercase tracking-wide"
                    style={{ color: col.color }}
                  >
                    {col.title}
                  </h3>
                </div>
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black"
                  style={{
                    background: 'white',
                    color: col.color,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  }}
                >
                  {columnPos.length}
                </span>
              </div>

              {/* Column Cards Container */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 max-h-[calc(100vh-18rem)]">
                {columnPos.map((po) => {
                  const supName =
                    po.supplier?.name || 'Unassigned Supplier';
                  const firstItem = po.items?.[0];
                  return (
                    <SpotlightCard
                      key={po.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, po.id)}
                      onClick={() => setSelectedPo(po)}
                      className="p-4 bg-white rounded-2xl shadow-sm cursor-pointer hover:shadow-md transition-shadow relative group"
                      style={{
                        border: po.needs_supplier
                          ? '1.5px solid #ef4444'
                          : '1px solid rgba(200,131,74,0.1)',
                      }}
                      spotlightColor="rgba(200,131,74,0.04)"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-[10px] font-black font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {po.po_number || 'NO-PO-ID'}
                        </span>
                        {po.needs_supplier ? (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-700 animate-pulse">
                            Needs Supplier
                          </span>
                        ) : (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            Rev {po.revision || 1}
                          </span>
                        )}
                      </div>

                      <h4
                        className="font-black text-sm mb-1 line-clamp-1"
                        style={{ color: '#2d1f0e' }}
                        title={supName}
                      >
                        {supName}
                      </h4>
                      <p
                        className="text-xs font-semibold mb-3 line-clamp-1"
                        style={{ color: '#9a7a5a' }}
                      >
                        {firstItem
                          ? `${firstItem.description} (${firstItem.qty} ${firstItem.uom})`
                          : 'Line item'}
                      </p>

                      <div
                        className="flex items-center justify-between text-[11px] font-black pt-3 border-t"
                        style={{ borderColor: 'rgba(200,131,74,0.1)' }}
                      >
                        <div
                          className="flex items-center gap-1.5"
                          style={{ color: '#c8834a' }}
                        >
                          <Calendar className="w-3.5 h-3.5" />{' '}
                          {po.buyer_ref || 'Ref'}
                        </div>
                        <span style={{ color: '#2d1f0e' }}>
                          ₹{po.total?.toLocaleString() || '0'}
                        </span>
                      </div>

                      {po.needs_supplier && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAssignModalPo(po);
                          }}
                          className="w-full mt-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all"
                        >
                          <UserCheck className="w-3.5 h-3.5" /> Assign Supplier
                        </button>
                      )}
                    </SpotlightCard>
                  );
                })}

                {columnPos.length === 0 && (
                  <div
                    className="h-24 border-2 border-dashed rounded-2xl flex items-center justify-center text-xs font-bold"
                    style={{
                      borderColor: col.border,
                      color: col.color,
                      opacity: 0.5,
                    }}
                  >
                    No POs in {col.title}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
