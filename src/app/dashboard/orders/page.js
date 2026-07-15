'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { TreePine, Building2, ClipboardList, Shirt, Plus, X, Loader2, FileSpreadsheet, PackagePlus, Calendar, Ship } from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';

export default function OrdersTreeBrowser() {
  const { orders, clients = [], createClient, addClientOrder, apiLoading } = useData();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('tree'); // 'tree' or 'list'

  // Local state for dynamically created clients (fallback if no API)
  const [localClients, setLocalClients] = useState([]);

  // Modal states — Create Client
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newCompanyCode, setNewCompanyCode] = useState('');
  const [newOrderNumber, setNewOrderNumber] = useState('');
  const [orderNumberError, setOrderNumberError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Modal states — Add Order
  const [showAddOrderModal, setShowAddOrderModal] = useState(false);
  const [addOrderClient, setAddOrderClient] = useState(null); // { id, name }
  const [addOrderNum, setAddOrderNum] = useState('');
  const [addOrderNumError, setAddOrderNumError] = useState('');
  const [addOrderDate, setAddOrderDate] = useState('');
  const [addDeadline, setAddDeadline] = useState('');
  const [addSeaCutoff, setAddSeaCutoff] = useState('');
  const [addShipMode, setAddShipMode] = useState('sea');
  const [isAddingOrder, setIsAddingOrder] = useState(false);
  const [addOrderError, setAddOrderError] = useState('');

  // Excel Upload States
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [excelData, setExcelData] = useState([]);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        setExcelData(data);
        setShowPreviewModal(true);
      } catch (err) {
        console.error("Error parsing Excel:", err);
        alert("Failed to parse the Excel file.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = null;
  };

  // Safeguard: if user is not direct_manager, force activeTab to 'tree'
  useEffect(() => {
    if (user !== 'direct_manager' && activeTab === 'list') {
      setActiveTab('tree');
    }
  }, [user, activeTab]);

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

  // Group orders by Client Name — memoized
  const clientsMap = useMemo(() => {
    const map = {};
    orders.forEach((o) => {
      if (!map[o.client]) {
        map[o.client] = [];
      }
      map[o.client].push(o);
    });
    return map;
  }, [orders]);

  // Combine default clients with dynamically created ones
  const allClients = useMemo(
    () => [...clients, ...localClients],
    [clients, localClients]
  );

  // All clients to show in the SKU tree — include clients with no orders too
  const treeClients = useMemo(() => {
    const inMap = new Set(Object.keys(clientsMap));
    const noOrderClients = allClients
      .filter((c) => !inMap.has(c.name))
      .map((c) => ({ name: c.name, orders: [] }));
    const withOrders = Object.entries(clientsMap).map(([name, ords]) => ({ name, orders: ords }));
    return [...withOrders, ...noOrderClients];
  }, [clientsMap, allClients]);

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* ─── TITLE SECTION ─── */}
      <div>
        <h1 className="text-3xl font-black tracking-tight" style={{ color: '#2d1f0e' }}>Client SKU Tree</h1>
        <p className="font-medium mt-1" style={{ color: '#9a7a5a' }}>Explore active order components. Collapsible tree drilling down from clients down to size-level SKUs.</p>
      </div>

      {/* ─── SUB-NAVIGATION TABS ─── */}
      <div className="flex gap-1 p-1 rounded-xl shadow-sm max-w-md" style={{ background: '#ffffff', border: '1px solid rgba(200,131,74,0.15)' }}>
        <button
          onClick={() => setActiveTab('tree')}
          className={`flex-1 py-2.5 px-4 font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[40px] ${
            activeTab === 'tree'
              ? 'text-white shadow-md'
              : 'text-[#9a7a5a] hover:text-[#2d1f0e] hover:bg-[#faf6f0]'
          }`}
          style={activeTab === 'tree' ? { background: '#c8834a' } : {}}
        >
          <TreePine className="w-4 h-4" />
          SKU Tree Browser
        </button>
        {user === 'direct_manager' && (
          <button
            onClick={() => setActiveTab('list')}
            className={`flex-1 py-2.5 px-4 font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[40px] ${
              activeTab === 'list'
                ? 'text-white shadow-md'
                : 'text-[#9a7a5a] hover:text-[#2d1f0e] hover:bg-[#faf6f0]'
            }`}
            style={activeTab === 'list' ? { background: '#c8834a' } : {}}
          >
            <Building2 className="w-4 h-4" />
            Client List
          </button>
        )}
      </div>

      {apiLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : activeTab === 'tree' ? (
        /* ─── TREE CARD WRAPPER ─── */
        <SpotlightCard className="p-6 sm:p-8 bg-white shadow-xl space-y-6 rounded-3xl" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.06)">
          <h3 className="text-lg font-extrabold pb-4 flex items-center gap-2" style={{ color: '#2d1f0e', borderBottom: '1px solid rgba(200,131,74,0.1)' }}>
            <TreePine className="w-5 h-5" style={{ color: '#c8834a' }} /> Interactive SKU Hierarchy Browser
          </h3>

          <div className="space-y-4 text-sm font-semibold">
            {treeClients.map(({ name: clientName, orders: clientOrders }) => {
              const isClientOpen = !!openedClients[clientName];

              return (
                <div key={clientName} className="rounded-xl overflow-hidden shadow-sm" style={{ border: '1px solid rgba(200,131,74,0.2)' }}>
                  
                  {/* ── LEVEL 1: CLIENT ── */}
                  <button
                    onClick={() => toggleClient(clientName)}
                    className="w-full flex items-center justify-between p-4 transition-colors text-left font-bold cursor-pointer min-h-[48px]"
                    style={{ background: isClientOpen ? '#faf6f0' : '#ffffff', color: '#2d1f0e' }}
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5" style={{ color: '#c8834a' }} />
                      <div>
                        <span className="font-extrabold" style={{ color: '#2d1f0e' }}>{clientName}</span>
                        <p className="text-[10px] font-bold uppercase mt-0.5" style={{ color: '#9a7a5a' }}>
                          {clientOrders.length} {clientOrders.length === 1 ? 'Order PO' : 'Order POs'} Active
                        </p>
                      </div>
                    </div>
                    <span className="font-black" style={{ color: '#c8834a' }}>{isClientOpen ? '▼' : '►'}</span>
                  </button>

                  {/* CLIENT CONTENT */}
                  {isClientOpen && (
                    <div className="p-4 bg-white space-y-3 pl-8" style={{ borderTop: '1px solid rgba(200,131,74,0.15)' }}>
                      {clientOrders.length === 0 ? (
                        <div className="text-center py-8" style={{ color: '#9a7a5a' }}>
                          <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="font-semibold text-xs">No purchase orders yet for this client.</p>
                        </div>
                      ) : clientOrders.map((order) => {
                        const isOrderOpen = !!openedOrders[order.id];

                        return (
                          <div key={order.id} className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(200,131,74,0.1)' }}>
                            
                            {/* ── LEVEL 2: PURCHASE ORDER ── */}
                            <button
                              onClick={() => toggleOrder(order.id)}
                              className="w-full flex items-center justify-between p-3 hover:bg-[#faf6f0] transition-colors text-left cursor-pointer min-h-[48px]"
                              style={{ background: isOrderOpen ? '#faf6f0' : '#ffffff' }}
                            >
                              <div className="flex items-center gap-2">
                                <ClipboardList className="w-4 h-4" style={{ color: '#a86022' }} />
                                <div>
                                  <span className="font-extrabold" style={{ color: '#4a3a2a' }}>{order.id}</span>
                                  <span className="text-[10px] font-bold ml-2 uppercase" style={{ color: '#9a7a5a' }}>
                                    ({order.type})
                                  </span>
                                </div>
                              </div>
                              <span className="font-black" style={{ color: '#c8834a' }}>{isOrderOpen ? '▼' : '►'}</span>
                            </button>

                            {/* ORDER CONTENT */}
                            {isOrderOpen && (
                              <div className="p-3 bg-white pl-6 space-y-2" style={{ borderTop: '1px solid rgba(200,131,74,0.08)' }}>
                                
                                {/* ── LEVEL 3: STYLE ── */}
                                <div className="pl-4 py-2 space-y-3" style={{ borderLeft: '2px solid rgba(200,131,74,0.15)' }}>
                                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                    <div>
                                      <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: '#9a7a5a' }}>Style SKU</span>
                                      <span className="font-extrabold text-base flex items-center gap-1.5" style={{ color: '#2d1f0e' }}>
                                        <Shirt className="w-4 h-4" style={{ color: '#c8834a' }} /> Style: {order.style}
                                      </span>
                                    </div>
                                    <div className="flex gap-2">
                                      <span className="px-2 py-1 rounded text-xs font-bold border" style={order.freight_mode.includes('RISK') ? { background: '#fff0f0', color: '#e53e3e', borderColor: '#feb2b2' } : { background: '#f0f4ff', color: '#3182ce', borderColor: '#bee3f8' }}>
                                        {order.freight_mode}
                                      </span>
                                      <span className="px-2 py-1 rounded text-xs font-bold border" style={{ background: '#f0fff4', color: '#38a169', borderColor: '#c6f6d5' }}>
                                        {order.progress}% Done
                                      </span>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs p-3 rounded-lg border" style={{ background: '#faf6f0', borderColor: 'rgba(200,131,74,0.1)' }}>
                                    <div>
                                      <span className="text-[10px] block uppercase font-bold" style={{ color: '#9a7a5a' }}>Total Batch Qty</span>
                                      <span className="font-black" style={{ color: '#2d1f0e' }}>{order.quantity} Pcs</span>
                                    </div>
                                    <div>
                                      <span className="text-[10px] block uppercase font-bold" style={{ color: '#9a7a5a' }}>Delivery Deadline</span>
                                      <span className="font-extrabold" style={{ color: '#2d1f0e' }}>{order.deadline}</span>
                                    </div>
                                    <div>
                                      <span className="text-[10px] block uppercase font-bold" style={{ color: '#9a7a5a' }}>Order Placement</span>
                                      <span style={{ color: '#2d1f0e' }}>{order.order_date}</span>
                                    </div>
                                    <div>
                                      <span className="text-[10px] block uppercase font-bold" style={{ color: '#9a7a5a' }}>Active Station</span>
                                      <span className="font-extrabold" style={{ color: '#a86022' }}>{order.status}</span>
                                    </div>
                                  </div>

                                  {/* ── LEVEL 4: COLORWAY & ── LEVEL 5: SIZE-SKU GRID ── */}
                                  <div className="space-y-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: '#9a7a5a' }}>Colorway &amp; Size Breakdown</span>
                                    <div className="p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ background: '#ffffff', borderColor: 'rgba(200,131,74,0.15)' }}>
                                      <div className="flex items-center gap-2">
                                        <span className="h-3 w-3 rounded-full border border-white shadow-sm" style={{ background: '#c8834a' }} />
                                        <span className="text-xs font-black" style={{ color: '#4a3a2a' }}>Colorway: {order.colorway}</span>
                                      </div>
                                      <div className="flex flex-wrap gap-2">
                                        {order.sizes.map((size) => (
                                          <span
                                            key={size}
                                            className="px-2.5 py-1 rounded-md bg-white border font-black text-xs shadow-sm"
                                            style={{ color: '#a86022', borderColor: 'rgba(200,131,74,0.2)' }}
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
        </SpotlightCard>
      ) : (
        /* ─── CLIENT DIRECTORY LIST VIEW ─── */
        <SpotlightCard className="p-6 sm:p-8 bg-white shadow-xl space-y-6 rounded-3xl" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.06)">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 gap-4" style={{ borderBottom: '1px solid rgba(200,131,74,0.1)' }}>
            <h3 className="text-lg font-extrabold flex items-center gap-2" style={{ color: '#2d1f0e' }}>
              <Building2 className="w-5 h-5" style={{ color: '#c8834a' }} /> Active Client Directory
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowCreateModal(true);
                  setCreateError('');
                }}
                className="py-2 px-4 font-extrabold text-xs rounded-lg transition-all flex items-center gap-2 cursor-pointer shadow-md active:scale-95 min-h-[40px] text-white hover:shadow-lg hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}
              >
                <Plus className="w-4 h-4" />
                Create Client
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allClients.map((client) => {
              const activePOs = orders.filter((o) => o.client === client.name).length;
              return (
                <SpotlightCard 
                  key={client.id} 
                  className="rounded-2xl p-5 transition-all shadow-sm hover:shadow-md flex flex-col justify-between min-h-[160px] bg-white hover:-translate-y-1"
                  style={{ border: '1px solid rgba(200,131,74,0.15)' }}
                  spotlightColor="rgba(200,131,74,0.06)"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl" style={{ background: 'rgba(200,131,74,0.1)' }}>
                        <Building2 className="w-5 h-5" style={{ color: '#c8834a' }} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black leading-tight" style={{ color: '#2d1f0e' }}>{client.name}</h4>
                        <p className="text-[9px] font-bold uppercase tracking-wider mt-0.5" style={{ color: '#9a7a5a' }}>Account ID: {client.id.substring(0, 8)}</p>
                      </div>
                    </div>

                    <div className="pt-3 grid grid-cols-2 gap-4 text-xs font-semibold" style={{ borderTop: '1px solid rgba(200,131,74,0.1)' }}>
                      <div>
                        <span className="text-[9px] font-bold block uppercase tracking-wider" style={{ color: '#9a7a5a' }}>Company Code</span>
                        <span className="font-extrabold" style={{ color: '#2d1f0e' }}>{client.key}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold block uppercase tracking-wider" style={{ color: '#9a7a5a' }}>Country</span>
                        <span className="font-extrabold" style={{ color: '#2d1f0e' }}>{client.country === '—' ? 'International' : client.country}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 flex items-center justify-between text-xs" style={{ borderTop: '1px solid rgba(200,131,74,0.1)' }}>
                    <span className="text-[10px] font-bold uppercase" style={{ color: '#9a7a5a' }}>Active Orders</span>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 font-black rounded-lg" style={{ background: 'rgba(200,131,74,0.1)', color: '#a86022' }}>
                        {activePOs} {activePOs === 1 ? 'PO' : 'POs'}
                      </span>
                      {user === 'direct_manager' && (
                        <button
                          onClick={() => {
                            setAddOrderClient({ id: client.id, name: client.name });
                            setAddOrderNum('');
                            setAddOrderNumError('');
                            setAddOrderDate('');
                            setAddDeadline('');
                            setAddSeaCutoff('');
                            setAddShipMode('sea');
                            setAddOrderError('');
                            setShowAddOrderModal(true);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg font-black text-[10px] transition-all hover:shadow-sm active:scale-95 cursor-pointer"
                          style={{ background: 'rgba(200,131,74,0.15)', color: '#c8834a', border: '1px solid rgba(200,131,74,0.25)' }}
                          title="Add new order to this client"
                        >
                          <Plus className="w-3 h-3" /> Add Order
                        </button>
                      )}
                    </div>
                  </div>
                </SpotlightCard>
              );
            })}
          </div>
        </SpotlightCard>
      )}

      {/* ─── CREATE CLIENT MODAL POPUP ─── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full p-6 sm:p-8 space-y-6 mx-4 relative animate-scale-up">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-xl font-black text-slate-950 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                Create New Client
              </h3>
              <button 
                onClick={() => {
                  setShowCreateModal(false);
                  setNewClientName('');
                  setNewCompanyCode('');
                  setNewOrderNumber('');
                  setOrderNumberError('');
                  setCreateError('');
                }}
                disabled={isCreating}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
                {createError}
              </div>
            )}

            {/* Modal Form */}
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newClientName.trim() || !newCompanyCode.trim() || !newOrderNumber.trim()) return;
                
                setIsCreating(true);
                setCreateError('');
                setOrderNumberError('');

                try {
                  if (createClient) {
                    await createClient(newClientName.trim(), newCompanyCode.trim(), newOrderNumber.trim());
                  } else {
                    // Fallback to local state if not logged in via API
                    const newClient = {
                      id: 'cli_' + Math.random().toString(36).substring(2, 10),
                      name: newClientName.trim(),
                      key: newCompanyCode.trim().toUpperCase(),
                      country: '—'
                    };
                    setLocalClients(prev => [...prev, newClient]);
                  }
                  
                  setShowCreateModal(false);
                  setNewClientName('');
                  setNewCompanyCode('');
                  setNewOrderNumber('');
                  setOrderNumberError('');
                } catch (err) {
                  if (err.status === 409 || err.message?.includes('409') || err.message?.toLowerCase().includes('already exists')) {
                    setOrderNumberError(`Order number "${newOrderNumber.trim()}" is already in use. Choose a unique one.`);
                  } else {
                    setCreateError(err.message || 'Failed to create client. Please try again.');
                  }
                } finally {
                  setIsCreating(false);
                }
              }}
              className="space-y-4 text-left"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                  Client Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. RICANO LEATHER Co."
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  disabled={isCreating}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-semibold text-slate-800 disabled:opacity-50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. RICANO LEATHER"
                  value={newCompanyCode}
                  onChange={(e) => setNewCompanyCode(e.target.value)}
                  disabled={isCreating}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-semibold text-slate-800 disabled:opacity-50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                  Order Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1001"
                  value={newOrderNumber}
                  onChange={(e) => { setNewOrderNumber(e.target.value.trim()); setOrderNumberError(''); }}
                  disabled={isCreating}
                  className={`w-full px-4 py-3 rounded-xl border text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 disabled:opacity-50 transition-colors ${
                    orderNumberError
                      ? 'border-red-400 focus:ring-red-500/20 focus:border-red-500 bg-red-50'
                      : 'border-slate-200 focus:ring-[#c8834a]/20 focus:border-[#c8834a]'
                  }`}
                />
                {orderNumberError && (
                  <p className="text-xs font-bold text-red-600 flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[8px] font-black flex items-center justify-center shrink-0">!</span>
                    {orderNumberError}
                  </p>
                )}
                <p className="text-[10px] text-slate-400 font-medium">Globally unique. This becomes the first order for this client (e.g. 1001, 1002).</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewClientName('');
                    setNewCompanyCode('');
                    setNewOrderNumber('');
                    setOrderNumberError('');
                    setCreateError('');
                  }}
                  disabled={isCreating}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer text-center disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newClientName.trim() || !newCompanyCode.trim() || !newOrderNumber.trim()}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer text-center shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Client'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── EXCEL PREVIEW MODAL ─── */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-4xl max-h-[90vh] flex flex-col animate-scale-up">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-black text-slate-950 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  Excel Data Preview
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  File: {fileName} ({excelData.length} rows)
                </p>
              </div>
              <button 
                onClick={() => setShowPreviewModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-auto bg-slate-50 flex-1">
              {excelData.length > 0 ? (
                <table className="w-full text-left text-sm whitespace-nowrap bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <thead className="bg-slate-100 text-slate-600 font-extrabold text-xs uppercase tracking-wider">
                    <tr>
                      {Object.keys(excelData[0]).map((key, idx) => (
                        <th key={idx} className="px-4 py-3 border-b border-slate-200">{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {excelData.slice(0, 50).map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-slate-50 transition-colors">
                        {Object.values(row).map((val, colIndex) => (
                          <td key={colIndex} className="px-4 py-3 text-slate-700 font-medium">
                            {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12 text-slate-500 font-bold">No data found in the Excel file.</div>
              )}
              {excelData.length > 50 && (
                <div className="text-center py-3 text-xs font-bold text-slate-400">
                  Showing first 50 rows...
                </div>
              )}
            </div>

            <div className="flex gap-3 p-6 border-t border-slate-100 bg-white rounded-b-2xl">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="py-3 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
              >
                Close Preview
              </button>
              <button
                disabled
                className="py-3 px-6 bg-emerald-600 opacity-50 cursor-not-allowed text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2"
              >
                Upload to Backend (Coming Soon)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ADD ORDER MODAL ─── */}
      {showAddOrderModal && addOrderClient && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full p-6 sm:p-8 space-y-5 relative">

            {/* Header */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(200,131,74,0.12)' }}>
                  <PackagePlus className="w-4 h-4" style={{ color: '#c8834a' }} />
                </div>
                <div>
                  <h3 className="text-base font-black" style={{ color: '#2d1f0e' }}>Add New Order</h3>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{addOrderClient.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddOrderModal(false)}
                disabled={isAddingOrder}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {addOrderError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
                {addOrderError}
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!addOrderNum.trim()) return;
                setIsAddingOrder(true);
                setAddOrderNumError('');
                setAddOrderError('');
                try {
                  await addClientOrder(addOrderClient.id, {
                    order_number: addOrderNum.trim(),
                    ...(addOrderDate && { order_date: addOrderDate }),
                    ...(addDeadline && { delivery_deadline: addDeadline }),
                    ...(addSeaCutoff && { sea_cutoff_date: addSeaCutoff }),
                    ship_mode: addShipMode,
                  });
                  setShowAddOrderModal(false);
                } catch (err) {
                  if (err.status === 409 || err.message?.includes('409') || err.message?.toLowerCase().includes('already exists')) {
                    setAddOrderNumError(`Order number "${addOrderNum.trim()}" already exists. Choose a unique one.`);
                  } else if (err.status === 404) {
                    setAddOrderError('Client not found. Please refresh the page.');
                  } else {
                    setAddOrderError(err.message || 'Failed to add order. Please try again.');
                  }
                } finally {
                  setIsAddingOrder(false);
                }
              }}
              className="space-y-4"
            >
              {/* Order Number — Required */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-widest block" style={{ color: '#9a7a5a' }}>
                  Order Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder="e.g. 1002"
                  value={addOrderNum}
                  onChange={(e) => { setAddOrderNum(e.target.value.trim()); setAddOrderNumError(''); }}
                  disabled={isAddingOrder}
                  className={`w-full px-4 py-3 rounded-xl border text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 disabled:opacity-50 transition-colors ${
                    addOrderNumError
                      ? 'border-red-400 bg-red-50 focus:ring-red-400/20'
                      : 'border-slate-200 focus:ring-[#c8834a]/20 focus:border-[#c8834a]'
                  }`}
                />
                {addOrderNumError && (
                  <p className="text-xs font-bold text-red-600 flex items-start gap-1.5">
                    <span className="mt-0.5 w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[8px] font-black flex items-center justify-center shrink-0">!</span>
                    {addOrderNumError}
                  </p>
                )}
              </div>

              {/* Optional date fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-widest flex items-center gap-1" style={{ color: '#9a7a5a' }}>
                    <Calendar className="w-3 h-3" /> Order Date
                  </label>
                  <input
                    type="date"
                    value={addOrderDate}
                    onChange={(e) => setAddOrderDate(e.target.value)}
                    disabled={isAddingOrder}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#c8834a]/20 focus:border-[#c8834a] disabled:opacity-50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-widest flex items-center gap-1" style={{ color: '#9a7a5a' }}>
                    <Calendar className="w-3 h-3" /> Delivery Deadline
                  </label>
                  <input
                    type="date"
                    value={addDeadline}
                    onChange={(e) => setAddDeadline(e.target.value)}
                    disabled={isAddingOrder}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#c8834a]/20 focus:border-[#c8834a] disabled:opacity-50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-widest flex items-center gap-1" style={{ color: '#9a7a5a' }}>
                    <Ship className="w-3 h-3" /> Sea Cutoff Date
                  </label>
                  <input
                    type="date"
                    value={addSeaCutoff}
                    onChange={(e) => setAddSeaCutoff(e.target.value)}
                    disabled={isAddingOrder}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#c8834a]/20 focus:border-[#c8834a] disabled:opacity-50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-widest block" style={{ color: '#9a7a5a' }}>
                    Ship Mode
                  </label>
                  <select
                    value={addShipMode}
                    onChange={(e) => setAddShipMode(e.target.value)}
                    disabled={isAddingOrder}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#c8834a]/20 focus:border-[#c8834a] disabled:opacity-50"
                  >
                    <option value="sea">Sea Freight</option>
                    <option value="air">Air Freight</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddOrderModal(false)}
                  disabled={isAddingOrder}
                  className="flex-1 py-3 rounded-xl text-xs font-extrabold transition-colors disabled:opacity-50"
                  style={{ background: '#f1f5f9', color: '#475569' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingOrder || !addOrderNum.trim()}
                  className="flex-1 py-3 rounded-xl text-xs font-extrabold text-white shadow-md flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:translate-y-0"
                  style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}
                >
                  {isAddingOrder
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Adding...</>
                    : <><PackagePlus className="w-3.5 h-3.5" /> Add Order</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
