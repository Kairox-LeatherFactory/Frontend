'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { TreePine, Building2, ClipboardList, Shirt, Plus, X, Loader2, FileSpreadsheet } from 'lucide-react';

export default function OrdersTreeBrowser() {
  const { orders, clients = [], createClient, apiLoading } = useData();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('tree'); // 'tree' or 'list'

  // Local state for dynamically created clients (fallback if no API)
  const [localClients, setLocalClients] = useState([]);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newCompanyCode, setNewCompanyCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');

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
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Client SKU Tree</h1>
        <p className="text-slate-500 font-medium">Explore active order components. Collapsible tree drilling down from clients down to size-level SKUs.</p>
      </div>

      {/* ─── SUB-NAVIGATION TABS ─── */}
      <div className="flex border-b border-slate-200 gap-1 bg-white p-1 rounded-xl shadow-sm border border-slate-100 max-w-md">
        <button
          onClick={() => setActiveTab('tree')}
          className={`flex-1 py-2.5 px-4 font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[40px] ${
            activeTab === 'tree'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <TreePine className="w-4 h-4" />
          SKU Tree Browser
        </button>
        {user === 'direct_manager' && (
          <button
            onClick={() => setActiveTab('list')}
            className={`flex-1 py-2.5 px-4 font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[40px] ${
              activeTab === 'list'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
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
        <div className="card p-6 sm:p-8 bg-white border border-blue-100 shadow-xl space-y-6">
          <h3 className="text-lg font-extrabold text-slate-900 border-b border-slate-100 pb-4 flex items-center gap-2">
            <TreePine className="w-5 h-5 text-emerald-600" /> Interactive SKU Hierarchy Browser
          </h3>

          <div className="space-y-4 text-sm font-semibold">
            {treeClients.map(({ name: clientName, orders: clientOrders }) => {
              const isClientOpen = !!openedClients[clientName];

              return (
                <div key={clientName} className="border border-blue-50 rounded-xl overflow-hidden shadow-sm">
                  
                  {/* ── LEVEL 1: CLIENT ── */}
                  <button
                    onClick={() => toggleClient(clientName)}
                    className="w-full flex items-center justify-between p-4 bg-blue-50/50 hover:bg-blue-100/50 transition-colors text-left font-bold text-slate-800 cursor-pointer min-h-[48px]"
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-blue-600" />
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
                      {clientOrders.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                          <ClipboardList className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                          <p className="font-semibold text-xs">No purchase orders yet for this client.</p>
                        </div>
                      ) : clientOrders.map((order) => {
                        const isOrderOpen = !!openedOrders[order.id];

                        return (
                          <div key={order.id} className="border border-slate-100 rounded-lg overflow-hidden">
                            
                            {/* ── LEVEL 2: PURCHASE ORDER ── */}
                            <button
                              onClick={() => toggleOrder(order.id)}
                              className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left cursor-pointer min-h-[48px]"
                            >
                              <div className="flex items-center gap-2">
                                <ClipboardList className="w-4 h-4 text-blue-500" />
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
                                      <span className="text-slate-800 font-extrabold text-base flex items-center gap-1.5">
                                        <Shirt className="w-4 h-4 text-blue-500" /> Style: {order.style}
                                      </span>
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
      ) : (
        /* ─── CLIENT DIRECTORY LIST VIEW ─── */
        <div className="card p-6 sm:p-8 bg-white border border-blue-100 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-4 gap-4">
            <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" /> Active Client Directory
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowCreateModal(true);
                  setCreateError('');
                }}
                className="py-2 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs rounded-lg transition-all flex items-center gap-2 cursor-pointer shadow-md active:scale-95 min-h-[40px]"
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
                <div 
                  key={client.id} 
                  className="bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-2xl p-5 transition-all shadow-sm hover:shadow-md flex flex-col justify-between min-h-[160px]"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-blue-50 rounded-xl">
                        <Building2 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-800 leading-tight">{client.name}</h4>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Account ID: {client.id.substring(0, 8)}</p>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-3 grid grid-cols-2 gap-4 text-xs font-semibold">
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Company Code</span>
                        <span className="text-slate-700 font-extrabold">{client.key}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Country</span>
                        <span className="text-slate-700 font-extrabold">{client.country === '—' ? 'International' : client.country}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Active Orders</span>
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-black rounded-lg">
                      {activePOs} {activePOs === 1 ? 'PO' : 'POs'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
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
                if (!newClientName.trim() || !newCompanyCode.trim()) return;
                
                setIsCreating(true);
                setCreateError('');

                try {
                  if (createClient) {
                    await createClient(newClientName.trim(), newCompanyCode.trim());
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
                } catch (err) {
                  setCreateError('Failed to create client. Please try again.');
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

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewClientName('');
                    setNewCompanyCode('');
                    setCreateError('');
                  }}
                  disabled={isCreating}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer text-center disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newClientName.trim() || !newCompanyCode.trim()}
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

    </div>
  );
}
