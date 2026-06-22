'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, ShoppingCart, Search, Plus, 
  Truck, CheckCircle2, Clock, AlertCircle,
  MoreHorizontal, Calendar, FileText
} from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';

// ─── MOCK PO DATA ────────────────────────────────────────────────────────────
const MOCK_POS = [
  { id: 'PO-1042', supplier: 'Kanpur Leather Works', item: 'Upper Leather - Cognac', qty: '1,250 sq.ft', amount: '₹2,25,000', status: 'Draft', date: 'Oct 12' },
  { id: 'PO-1043', supplier: 'YKK Fasteners', item: 'Zip Puller - Antique Brass', qty: '500 pairs', amount: '₹6,000', status: 'Sent', date: 'Oct 10' },
  { id: 'PO-1044', supplier: 'Texon Materials', item: 'Insole Board - Cellulose', qty: '500 pairs', amount: '₹22,500', status: 'Sent', date: 'Oct 09' },
  { id: 'PO-1038', supplier: 'Coats Thread', item: 'Nylon 40s - Brown', qty: '50 spools', amount: '₹10,000', status: 'In Transit', date: 'Oct 05' },
  { id: 'PO-1039', supplier: 'ABC Thermoplastics', item: 'Toe Stiffener', qty: '500 pairs', amount: '₹14,000', status: 'In Transit', date: 'Oct 05' },
  { id: 'PO-1030', supplier: 'Chennai Tannery', item: 'Corrected Grain - Black', qty: '660 sq.ft', amount: '₹99,000', status: 'Received', date: 'Sep 28' },
  { id: 'PO-1031', supplier: 'Solid Brass Co', item: 'Brass Brogue Cap', qty: '300 pairs', amount: '₹13,500', status: 'Received', date: 'Sep 29' },
];

const COLUMNS = [
  { id: 'Draft', title: 'Draft', icon: FileText, color: '#9a7a5a', bg: '#faf6f0', border: 'rgba(200,131,74,0.2)' },
  { id: 'Sent', title: 'Sent to Supplier', icon: Clock, color: '#d97706', bg: '#fffbeb', border: 'rgba(217,119,6,0.2)' },
  { id: 'In Transit', title: 'In Transit', icon: Truck, color: '#2563eb', bg: '#eff6ff', border: 'rgba(37,99,235,0.2)' },
  { id: 'Received', title: 'Received (Intake)', icon: CheckCircle2, color: '#16a34a', bg: '#f0fdf4', border: 'rgba(22,163,74,0.2)' },
];

export default function KanbanPOPage() {
  const [pos, setPos] = useState(MOCK_POS);
  const [draggedPoId, setDraggedPoId] = useState(null);

  // Drag and Drop Handlers
  const handleDragStart = (e, id) => {
    setDraggedPoId(id);
    e.dataTransfer.effectAllowed = 'move';
    // Small delay to make dragged item slightly transparent on original spot
    setTimeout(() => e.target.classList.add('opacity-50'), 0);
  };

  const handleDragEnd = (e) => {
    e.target.classList.remove('opacity-50');
    setDraggedPoId(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, columnId) => {
    e.preventDefault();
    if (!draggedPoId) return;
    
    setPos(prev => prev.map(po => {
      if (po.id === draggedPoId) {
        return { ...po, status: columnId };
      }
      return po;
    }));
    setDraggedPoId(null);
  };

  return (
    <div className="space-y-6 animate-fade-in flex flex-col h-[calc(100vh-8rem)]">
      
      {/* ─── HEADER ─── */}
      <div className="flex-shrink-0">
        <Link href="/dashboard/procurement/inventory" className="flex items-center gap-1.5 text-xs font-bold mb-3 w-fit transition-opacity hover:opacity-70" style={{ color: '#9a7a5a' }}>
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Inventory Check
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: '#c8834a' }}>
              Procurement · Stage 5 — PO Tracking
            </p>
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-3" style={{ color: '#2d1f0e' }}>
              <ShoppingCart className="w-8 h-8" style={{ color: '#c8834a' }} /> Purchase Orders
            </h1>
            <p className="font-medium mt-0.5" style={{ color: '#9a7a5a' }}>
              Manage and track supplier orders. Drag and drop cards to update status.
            </p>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9a7a5a' }} />
              <input type="text" placeholder="Search POs..." className="h-11 pl-9 pr-4 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#c8834a]/30 transition-all" style={{ background: '#ffffff', border: '1px solid rgba(200,131,74,0.15)', color: '#2d1f0e' }} />
            </div>
            <button className="h-11 px-5 rounded-xl font-black text-sm text-white flex items-center gap-2 transition-all hover:shadow-lg hover:-translate-y-0.5" style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}>
              <Plus className="w-4 h-4" /> New PO
            </button>
          </div>
        </div>
      </div>

      {/* ─── KANBAN BOARD ─── */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
        <div className="flex gap-4 h-full min-w-max">
          {COLUMNS.map(col => {
            const columnPos = pos.filter(po => po.status === col.id);
            const ColIcon = col.icon;
            
            return (
              <div 
                key={col.id} 
                className="w-[320px] flex flex-col rounded-3xl overflow-hidden transition-colors"
                style={{ background: col.bg, border: `1px solid ${col.border}` }}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                {/* Column Header */}
                <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: col.border }}>
                  <div className="flex items-center gap-2">
                    <ColIcon className="w-4 h-4" style={{ color: col.color }} />
                    <h3 className="font-black text-sm uppercase tracking-wide" style={{ color: col.color }}>{col.title}</h3>
                  </div>
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black" style={{ background: 'white', color: col.color, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    {columnPos.length}
                  </span>
                </div>

                {/* Column Cards Container */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {columnPos.map(po => (
                    <SpotlightCard 
                      key={po.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, po.id)}
                      onDragEnd={handleDragEnd}
                      className="p-4 bg-white rounded-2xl shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow relative group"
                      style={{ border: '1px solid rgba(200,131,74,0.1)' }}
                      spotlightColor="rgba(200,131,74,0.04)"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-[10px] font-black font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {po.id}
                        </span>
                        <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-50" style={{ color: '#9a7a5a' }}>
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <h4 className="font-black text-sm mb-1 line-clamp-1" style={{ color: '#2d1f0e' }} title={po.supplier}>
                        {po.supplier}
                      </h4>
                      <p className="text-xs font-semibold mb-3 line-clamp-1" style={{ color: '#9a7a5a' }} title={po.item}>
                        {po.item}
                      </p>

                      <div className="flex items-center justify-between text-[11px] font-black pt-3 border-t" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
                        <div className="flex items-center gap-1.5" style={{ color: '#c8834a' }}>
                          <Calendar className="w-3.5 h-3.5" /> {po.date}
                        </div>
                        <span style={{ color: '#2d1f0e' }}>{po.amount}</span>
                      </div>
                      
                      {/* Interactive Drag Handle Hint */}
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 rounded-r-md opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: col.color }} />
                    </SpotlightCard>
                  ))}
                  
                  {columnPos.length === 0 && (
                    <div className="h-24 border-2 border-dashed rounded-2xl flex items-center justify-center text-xs font-bold" style={{ borderColor: col.border, color: col.color, opacity: 0.5 }}>
                      Drop PO here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
