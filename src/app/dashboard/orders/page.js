'use client';
import { useState } from 'react';
import { useData } from '@/context/DataContext';

export default function OrdersTreeBrowser() {
  const { orders } = useData();

  // Collapsible toggle states (stores IDs of opened elements)
  const [openedClients, setOpenedClients] = useState({});
  const [openedOrders, setOpenedOrders] = useState({});
  const [openedStyles, setOpenedStyles] = useState({});

  const toggleClient = (clientName) => {
    setOpenedClients((prev) => ({ ...prev, [clientName]: !prev[clientName] }));
  };

  const toggleOrder = (orderId) => {
    setOpenedOrders((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const toggleStyle = (styleKey) => {
    setOpenedStyles((prev) => ({ ...prev, [styleKey]: !prev[styleKey] }));
  };

  // Group orders by Client Name
  const clientsMap = {};
  orders.forEach((o) => {
    if (!clientsMap[o.client]) {
      clientsMap[o.client] = [];
    }
    clientsMap[o.client].push(o);
  });

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* ─── TITLE SECTION ─── */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Client SKU Tree</h1>
        <p className="text-slate-500 font-medium">Explore active order components. Collapsible tree drilling down from clients down to size-level SKUs.</p>
      </div>

      {/* ─── TREE CARD WRAPPER ─── */}
      <div className="card p-6 sm:p-8 bg-white border border-blue-100 shadow-xl space-y-6">
        <h3 className="text-lg font-extrabold text-slate-900 border-b border-slate-100 pb-4">
          🌲 Interactive SKU Hierarchy Browser
        </h3>

        <div className="space-y-4 text-sm font-semibold">
          {Object.entries(clientsMap).map(([clientName, clientOrders]) => {
            const isClientOpen = !!openedClients[clientName];

            return (
              <div key={clientName} className="border border-blue-50 rounded-xl overflow-hidden shadow-sm">
                
                {/* ── LEVEL 1: CLIENT ── */}
                <button
                  onClick={() => toggleClient(clientName)}
                  className="w-full flex items-center justify-between p-4 bg-blue-50/50 hover:bg-blue-100/50 transition-colors text-left font-bold text-slate-800 cursor-pointer min-h-[48px]"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🏢</span>
                    <div>
                      <span className="text-slate-900 font-extrabold">{clientName}</span>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                        {clientOrders.length} {clientOrders.length === 1 ? 'Order PO' : 'Order POs'} Active
                      </p>
                    </div>
                  </div>
                  <span className="text-slate-400 font-black">{isClientOpen ? '▼' : '►'}</span>
                </button>

                {/* CLIENT CONTENT */}
                {isClientOpen && (
                  <div className="p-4 bg-white border-t border-slate-100 space-y-3 pl-8">
                    {clientOrders.map((order) => {
                      const isOrderOpen = !!openedOrders[order.id];

                      return (
                        <div key={order.id} className="border border-slate-100 rounded-lg overflow-hidden">
                          
                          {/* ── LEVEL 2: PURCHASE ORDER ── */}
                          <button
                            onClick={() => toggleOrder(order.id)}
                            className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left cursor-pointer min-h-[48px]"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-lg">📋</span>
                              <div>
                                <span className="font-extrabold text-blue-900">{order.id}</span>
                                <span className="text-[10px] text-slate-400 font-bold ml-2 uppercase">
                                  ({order.type})
                                </span>
                              </div>
                            </div>
                            <span className="text-slate-400 font-black">{isOrderOpen ? '▼' : '►'}</span>
                          </button>

                          {/* ORDER CONTENT */}
                          {isOrderOpen && (
                            <div className="p-3 bg-white border-t border-slate-50 pl-6 space-y-2">
                              
                              {/* ── LEVEL 3: STYLE ── */}
                              <div className="border-l-2 border-blue-100 pl-4 py-2 space-y-3">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                  <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Style SKU</span>
                                    <span className="text-slate-800 font-extrabold text-base">🧥 Style: {order.style}</span>
                                  </div>
                                  <div className="flex gap-2">
                                    <span className={`badge ${order.freight_mode.includes('RISK') ? 'badge-danger' : 'badge-info'}`}>
                                      {order.freight_mode}
                                    </span>
                                    <span className="badge badge-success">
                                      {order.progress}% Done
                                    </span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
                                  <div>
                                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Total Batch Qty</span>
                                    <span className="text-slate-800 font-black">{order.quantity} Pcs</span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Delivery Deadline</span>
                                    <span className="text-slate-800 font-extrabold">{order.deadline}</span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Order Placement</span>
                                    <span className="text-slate-800">{order.order_date}</span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Active Station</span>
                                    <span className="text-blue-700 font-extrabold">{order.status}</span>
                                  </div>
                                </div>

                                {/* ── LEVEL 4: COLORWAY & ── LEVEL 5: SIZE-SKU GRID ── */}
                                <div className="space-y-2">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Colorway &amp; Size Breakdown</span>
                                  <div className="p-3 bg-blue-50/30 rounded-lg border border-blue-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-2">
                                      <span className="h-3 w-3 rounded-full bg-blue-500 border border-white" />
                                      <span className="text-xs font-black text-slate-700">Colorway: {order.colorway}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {order.sizes.map((size) => (
                                        <span
                                          key={size}
                                          className="px-2.5 py-1 rounded-md bg-white border border-blue-100 text-blue-800 font-black text-xs shadow-sm"
                                        >
                                          SKU Size: {size} (Active)
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>

                              </div>

                            </div>
                          )}

                        </div>
                      );
                    })}
                  </div>
                )}

              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
}
