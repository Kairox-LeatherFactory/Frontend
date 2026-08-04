'use client';
import { useState, useEffect, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { Building2, Plus, X, Loader2, Search, CheckCircle2, XCircle } from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';
import { createPortal } from 'react-dom';

export default function OrdersTreeBrowser() {
  const { clients = [], createClient, apiLoading } = useData();
  const { user } = useAuth();
  
  // Local state for dynamically created clients (fallback if no API)
  const [localClients, setLocalClients] = useState([]);

  // Toast Notification States
  const [successMsg, setSuccessMsg] = useState('');
  const [toastErrorMsg, setToastErrorMsg] = useState('');

  // ⏱️ Auto-dismiss Toast Messages after 2 seconds
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(''), 2000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  useEffect(() => {
    if (toastErrorMsg) {
      const timer = setTimeout(() => setToastErrorMsg(''), 2000);
      return () => clearTimeout(timer);
    }
  }, [toastErrorMsg]);

  // Modal states — Create Client
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newCompanyCode, setNewCompanyCode] = useState('');
  const [newCountry, setNewCountry] = useState('');
  const [newOrderNumber, setNewOrderNumber] = useState('');
  const [orderNumberError, setOrderNumberError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');

  const allClients = [
    ...clients,
    ...localClients
  ];

  // Filter Logic: Search by Client Name, Company Code, or Country
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return allClients;
    const term = searchQuery.toLowerCase().trim();
    return allClients.filter(client => 
      (client.name && client.name.toLowerCase().includes(term)) || 
      (client.key && client.key.toLowerCase().includes(term)) ||
      (client.code && client.code.toLowerCase().includes(term)) ||
      (client.country && client.country.toLowerCase().includes(term))
    );
  }, [allClients, searchQuery]);

  return (
    <div className="space-y-8 animate-fade-in relative">
      {/* ─── SCREEN CENTER FLOATING TOAST NOTIFICATION ─── */}
      {typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 pointer-events-none transition-all duration-300">
          <div className="w-full max-w-sm flex flex-col gap-3">

            {/* Success Toast */}
            {successMsg && (
              <div className="bg-slate-900/95 text-white border-2 border-emerald-500/50 p-4 rounded-3xl shadow-2xl animate-fade-in flex items-center justify-between gap-3 pointer-events-auto backdrop-blur-xl">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-emerald-400 text-xs uppercase tracking-wider">Success</p>
                    <p className="text-xs font-semibold text-slate-200 mt-0.5 break-words line-clamp-3">{successMsg}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSuccessMsg('')}
                  className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Toast Error */}
            {toastErrorMsg && (
              <div className="bg-slate-900/95 text-white border-2 border-rose-500/50 p-4 rounded-3xl shadow-2xl animate-fade-in flex items-center justify-between gap-3 pointer-events-auto backdrop-blur-xl">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/20 flex items-center justify-center shrink-0">
                    <XCircle className="w-6 h-6 text-rose-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-rose-400 text-xs uppercase tracking-wider">Error</p>
                    <p className="text-xs font-semibold text-slate-200 mt-0.5 break-words line-clamp-3">{toastErrorMsg}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setToastErrorMsg('')}
                  className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* ─── TITLE SECTION ─── */}
      <div>
        <h1 className="text-3xl font-black tracking-tight" style={{ color: '#2d1f0e' }}>Client Directory</h1>
        <p className="font-medium mt-1" style={{ color: '#9a7a5a' }}>Manage active client accounts and associated purchase orders.</p>
      </div>

      {apiLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
        </div>
      ) : (
        /* ─── CLIENT DIRECTORY LIST VIEW ─── */
        <SpotlightCard className="p-6 sm:p-8 bg-white shadow-xl space-y-6 rounded-3xl" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.06)">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 gap-4" style={{ borderBottom: '1px solid rgba(200,131,74,0.1)' }}>
            <h3 className="text-lg font-extrabold flex items-center gap-2" style={{ color: '#2d1f0e' }}>
              <Building2 className="w-5 h-5" style={{ color: '#c8834a' }} /> Active Client Directory
            </h3>
            
            {/* Search bar & Create button container */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search name, code, or country..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#c8834a]/30 focus:border-[#c8834a]"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    Clear
                  </button>
                )}
              </div>

              {user === 'direct_manager' && (
                <button
                  onClick={() => {
                    setShowCreateModal(true);
                    setCreateError('');
                  }}
                  className="py-2 px-4 font-extrabold text-xs rounded-lg transition-all flex items-center gap-2 cursor-pointer shadow-md active:scale-95 min-h-[40px] text-white hover:shadow-lg hover:-translate-y-0.5 shrink-0"
                  style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}
                >
                  <Plus className="w-4 h-4" />
                  Create Client
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.length > 0 ? (
              filteredClients.map((client, index) => {
                return (
                  <SpotlightCard
                    key={`${client.id}-${index}`}
                    className="rounded-2xl p-5 transition-all shadow-sm hover:shadow-md flex flex-col justify-between min-h-[160px] bg-white hover:-translate-y-1"
                    style={{ border: '1px solid rgba(200,131,74,0.15)' }}
                    spotlightColor="rgba(200,131,74,0.06)"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl" style={{ background: 'rgba(200,131,74,0.1)' }}>
                          <Building2 className="w-5 h-5" style={{ color: '#c8834a' }} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-black leading-tight truncate" style={{ color: '#2d1f0e' }}>{client.name}</h4>
                          {/* 👈 முழுமையான ஆர்டர் ID (Full Order ID) ஐ இங்கே காண்பித்தல் */}
                          <p className="text-[9px] font-bold uppercase tracking-wider mt-0.5 text-slate-500 break-all">
                            Order ID: {client.order_id || client.id || '—'}
                          </p>
                        </div>
                      </div>

                      <div className="pt-3 grid grid-cols-2 gap-4 text-xs font-semibold" style={{ borderTop: '1px solid rgba(200,131,74,0.1)' }}>
                        <div>
                          <span className="text-[9px] font-bold block uppercase tracking-wider" style={{ color: '#9a7a5a' }}>Company Code</span>
                          <span className="font-extrabold" style={{ color: '#2d1f0e' }}>{client.key || client.code || '—'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold block uppercase tracking-wider" style={{ color: '#9a7a5a' }}>Country</span>
                          <span className="font-extrabold" style={{ color: '#2d1f0e' }}>{client.country || 'International'}</span>
                        </div>
                      </div>
                    </div>
                  </SpotlightCard>
                );
              })
            ) : (
              <div className="col-span-full py-12 text-center text-slate-400 font-bold text-sm">
                No clients found matching "{searchQuery}"
              </div>
            )}
          </div>
        </SpotlightCard>
      )}

      {/* ─── CREATE CLIENT MODAL POPUP ─── */}
      {showCreateModal && typeof window !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            padding: '16px',
            pointerEvents: 'auto'
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid #e2e8f0',
              width: '100%',
              maxWidth: '448px',
              padding: '24px',
              position: 'relative',
              zIndex: 1000000,
              pointerEvents: 'auto'
            }}
            className="space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-600" />
                Create New Client
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setNewClientName('');
                  setNewCompanyCode('');
                  setNewCountry('');
                  setNewOrderNumber('');
                  setOrderNumberError('');
                  setCreateError('');
                }}
                disabled={isCreating}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50 relative z-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
                {createError}
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newClientName.trim() || !newCompanyCode.trim() || !newOrderNumber.trim()) return;

                setIsCreating(true);
                setCreateError('');
                setOrderNumberError('');

                try {
                  if (createClient) {
                    await createClient(
                      newClientName.trim(), 
                      newCompanyCode.trim(), 
                      newOrderNumber.trim(), 
                      newCountry.trim()
                    );
                  } else {
                    const newClient = {
                      id: 'cli_' + Math.random().toString(36).substring(2, 10),
                      order_id: 'ord_' + Math.random().toString(36).substring(2, 15),
                      name: newClientName.trim(),
                      key: newCompanyCode.trim().toUpperCase(),
                      country: newCountry.trim() || '—'
                    };
                    setLocalClients(prev => [...prev, newClient]);
                  }

                  setShowCreateModal(false);
                  setSuccessMsg(`Client "${newClientName.trim()}" created successfully!`);
                  setNewClientName('');
                  setNewCompanyCode('');
                  setNewCountry('');
                  setNewOrderNumber('');
                  setOrderNumberError('');
                } catch (err) {
                  if (err.status === 409 || err.message?.includes('409') || err.message?.toLowerCase().includes('already exists')) {
                    setOrderNumberError(`Order number "${newOrderNumber.trim()}" is already in use.`);
                  } else {
                    setCreateError(err.message || 'Failed to create client.');
                  }
                } finally {
                  setIsCreating(false);
                }
              }}
              className="space-y-3.5 text-left"
            >
              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                  Client Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder="e.g. RICANO LEATHER Co."
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  disabled={isCreating}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#c8834a] focus:border-[#c8834a] text-xs font-semibold text-slate-900 bg-white shadow-sm disabled:opacity-50 cursor-text relative z-20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                  Company Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. RICANO"
                  value={newCompanyCode}
                  onChange={(e) => setNewCompanyCode(e.target.value)}
                  disabled={isCreating}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#c8834a] focus:border-[#c8834a] text-xs font-semibold text-slate-900 bg-white shadow-sm disabled:opacity-50 cursor-text relative z-20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                  Country
                </label>
                <input
                  type="text"
                  placeholder="e.g. India / USA"
                  value={newCountry}
                  onChange={(e) => setNewCountry(e.target.value)}
                  disabled={isCreating}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#c8834a] focus:border-[#c8834a] text-xs font-semibold text-slate-900 bg-white shadow-sm disabled:opacity-50 cursor-text relative z-20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                  Order Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1001"
                  value={newOrderNumber}
                  onChange={(e) => { setNewOrderNumber(e.target.value.trim()); setOrderNumberError(''); }}
                  disabled={isCreating}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold text-slate-900 bg-white shadow-sm focus:outline-none focus:ring-2 disabled:opacity-50 transition-colors cursor-text relative z-25 ${orderNumberError
                    ? 'border-red-500 focus:ring-red-500 bg-red-50'
                    : 'border-slate-300 focus:ring-[#c8834a] focus:border-[#c8834a]'
                    }`}
                />
                {orderNumberError && (
                  <p className="text-[11px] font-bold text-red-600 flex items-center gap-1 mt-0.5">
                    <span className="w-3 h-3 rounded-full bg-red-500 text-white text-[8px] font-black flex items-center justify-center shrink-0">!</span>
                    {orderNumberError}
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100 relative z-30">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewClientName('');
                    setNewCompanyCode('');
                    setNewCountry('');
                    setNewOrderNumber('');
                    setOrderNumberError('');
                    setCreateError('');
                  }}
                  disabled={isCreating}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer text-center disabled:opacity-50 pointer-events-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newClientName.trim() || !newCompanyCode.trim() || !newOrderNumber.trim()}
                  className="flex-1 py-3 px-4 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer text-center shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 pointer-events-auto"
                  style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}
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
        </div>,
        document.body
      )}

    </div>
  );
}

