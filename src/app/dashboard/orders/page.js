'use client';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Building2, Plus, X, Loader2, Search, CheckCircle2, XCircle } from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';
import AnimatedModal from '@/components/AnimatedModal';
import { staggerContainer, fadeUpItem } from '@/lib/motionVariants';
import { createPortal } from 'react-dom';
import { useGetClientsQuery, useCreateClientMutation, useUpdateClientMutation, useGetClientOrdersQuery } from '@/store/slices/clientApiSlice';

// POST /clients only takes name, country and order_number; everything else is
// written afterwards with PATCH /clients/{id} (partial update).
const EMPTY_CLIENT_FORM = {
  name: '', country: '', order_number: '',
  code: '', currency: '', brand: '', label: '', contact_email: '', contact_phone: '', address: '',
};
const OPTIONAL_CLIENT_FIELDS = [
  { key: 'code', label: 'Company Code', placeholder: 'e.g. RICANO' },
  { key: 'currency', label: 'Currency', placeholder: 'e.g. EUR / USD / INR' },
  { key: 'brand', label: 'Brand', placeholder: 'e.g. RICANO' },
  { key: 'label', label: 'Label', placeholder: 'e.g. RICANO MILANO' },
  { key: 'contact_email', label: 'Contact Email', placeholder: 'e.g. purchasing@ricano.com', type: 'email' },
  { key: 'contact_phone', label: 'Contact Phone', placeholder: 'e.g. +39 02 1234 5678', type: 'tel' },
  { key: 'address', label: 'Address', placeholder: 'e.g. Via Durini 28, Milano', full: true },
];
const INPUT_CLS = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#c8834a] focus:border-[#c8834a] text-xs font-semibold text-slate-900 bg-white shadow-sm disabled:opacity-50 cursor-text relative z-20';

// fetchBaseQuery errors are { status, data }; FastAPI puts the text in data.detail.
const apiErrText = (err, fallback) => {
  const d = err?.data?.detail ?? err?.data?.message;
  if (Array.isArray(d)) return d.map((x) => x.msg).join(', ');
  return (typeof d === 'string' && d) || err?.message || fallback;
};

// GET /clients carries no orders — each card reads its own client's orders
// (GET /clients/{id}/orders, cached per client by RTK Query).
function ClientOrderNumbers({ clientId }) {
  const { data: orders = [], isLoading, isError } = useGetClientOrdersQuery(clientId, { skip: !clientId });

  if (isLoading) return <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: '#c8834a' }} />;
  if (isError || orders.length === 0) {
    return <span className="font-extrabold" style={{ color: '#2d1f0e' }}>—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {orders.map((o) => (
        <span
          key={o.id || o.order_number}
          className="px-2 py-0.5 rounded-md text-[11px] font-black"
          style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.25)', color: '#2d1f0e' }}
        >
          {o.order_number}
        </span>
      ))}
    </div>
  );
}

export default function OrdersTreeBrowser() {
  const { data: clientsData = [], isLoading: apiLoading } = useGetClientsQuery();
  const [createClient] = useCreateClientMutation();
  const [updateClient] = useUpdateClientMutation();
  const { user } = useAuth();
  
  // Transform data to match original format
  const clientsList = Array.isArray(clientsData) ? clientsData : (clientsData?.items || clientsData?.clients || []);
  const clients = useMemo(() => 
    clientsList.map(c => ({ id: c.id, key: c.name, name: c.name, country: c.country || '—', code: c.code, order_id: c.order_id, is_active: c.is_active !== false })), 
  [clientsList]);

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
  const [clientForm, setClientForm] = useState(EMPTY_CLIENT_FORM);
  const [orderNumberError, setOrderNumberError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const setField = (key, value) => setClientForm((f) => ({ ...f, [key]: value }));
  const canCreate = clientForm.name.trim() && clientForm.country.trim() && clientForm.order_number.trim();

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setClientForm(EMPTY_CLIENT_FORM);
    setOrderNumberError('');
    setCreateError('');
  };

  const handleCreateClient = async (e) => {
    e.preventDefault();
    if (!canCreate) return;

    const trimmed = Object.fromEntries(Object.entries(clientForm).map(([k, v]) => [k, v.trim()]));
    const { name, country, order_number, ...extras } = trimmed;
    const details = Object.fromEntries(Object.entries(extras).filter(([, v]) => v));

    setIsCreating(true);
    setCreateError('');
    setOrderNumberError('');

    let created;
    try {
      created = await createClient({ name, country, order_number }).unwrap();
    } catch (err) {
      if (err?.status === 409) {
        setOrderNumberError(`Order number "${order_number}" is already in use.`);
      } else {
        setCreateError(apiErrText(err, 'Failed to create client.'));
      }
      setIsCreating(false);
      return;
    }

    // The client now exists — a failure here must not look like the create failed.
    if (Object.keys(details).length > 0 && created?.id) {
      try {
        await updateClient({ id: created.id, ...details }).unwrap();
      } catch (err) {
        setIsCreating(false);
        closeCreateModal();
        setToastErrorMsg(`Client "${name}" was created, but the extra details were not saved: ${apiErrText(err, 'update failed')}`);
        return;
      }
    }

    setIsCreating(false);
    closeCreateModal();
    setSuccessMsg(`Client "${name}" created successfully!`);
  };
  
  const [searchQuery, setSearchQuery] = useState('');

  // Filter Logic: Search by Client Name, Company Code, or Country
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    const term = searchQuery.toLowerCase().trim();
    return clients.filter(client =>
      (client.name && client.name.toLowerCase().includes(term)) || 
      (client.key && client.key.toLowerCase().includes(term)) ||
      (client.code && client.code.toLowerCase().includes(term)) ||
      (client.country && client.country.toLowerCase().includes(term))
    );
  }, [clients, searchQuery]);

  return (
    <motion.div className="space-y-8 relative" variants={staggerContainer} initial="hidden" animate="show">
      {/* ─── SCREEN CENTER FLOATING TOAST NOTIFICATION ─── */}
      {typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 pointer-events-none transition-all duration-300">
          <div className="w-full max-w-sm flex flex-col gap-3">

            {/* Success Toast */}
            <AnimatePresence>
              {successMsg && (
                <motion.div
                  initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="bg-slate-900/95 text-white border-2 border-emerald-500/50 p-4 rounded-3xl shadow-2xl flex items-center justify-between gap-3 pointer-events-auto backdrop-blur-xl"
                >
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
                </motion.div>
              )}
            </AnimatePresence>

            {/* Toast Error */}
            <AnimatePresence>
              {toastErrorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="bg-slate-900/95 text-white border-2 border-rose-500/50 p-4 rounded-3xl shadow-2xl flex items-center justify-between gap-3 pointer-events-auto backdrop-blur-xl"
                >
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
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>,
        document.body
      )}

      {apiLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
        </div>
      ) : (
        /* ─── CLIENT DIRECTORY LIST VIEW ─── */
        <SpotlightCard variants={fadeUpItem} className="p-6 sm:p-8 bg-white shadow-xl space-y-6 rounded-3xl" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.06)">
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

          <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" variants={staggerContainer}>
            {filteredClients.length > 0 ? (
              filteredClients.map((client, index) => {
                return (
                  <SpotlightCard
                    key={`${client.id}-${index}`}
                    variants={fadeUpItem}
                    whileHover={{ y: -6, scale: 1.015 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                    className="rounded-2xl p-5 shadow-sm hover:shadow-md flex flex-col justify-between min-h-[160px] bg-white"
                    style={{ border: '1px solid rgba(200,131,74,0.15)' }}
                    spotlightColor="rgba(200,131,74,0.06)"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl" style={{ background: 'rgba(200,131,74,0.1)' }}>
                          <Building2 className="w-5 h-5" style={{ color: '#c8834a' }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="text-sm font-black leading-tight truncate" style={{ color: '#2d1f0e' }}>{client.name}</h4>
                            
                            {/* Deactivation Toggle */}
                            {user === 'direct_manager' && client.id && !client.id.startsWith('cli_') ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateClient({ id: client.id, is_active: !client.is_active })
                                    .unwrap()
                                    .then(() => setSuccessMsg(`Client ${client.name} ${!client.is_active ? 'activated' : 'deactivated'}!`))
                                    .catch((err) => setToastErrorMsg(err.message || 'Failed to update client'));
                                }}
                                title={client.is_active ? "Deactivate Client" : "Activate Client"}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-all cursor-pointer shrink-0 ${client.is_active ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'}`}
                              >
                                {client.is_active ? 'Active' : 'Inactive'}
                              </button>
                            ) : (
                              !client.is_active && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-rose-50 text-rose-600 border-rose-200 shrink-0">
                                  Inactive
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 grid grid-cols-2 gap-4 text-xs font-semibold" style={{ borderTop: '1px solid rgba(200,131,74,0.1)' }}>
                        <div>
                          <span className="text-[9px] font-bold block uppercase tracking-wider" style={{ color: '#9a7a5a' }}>Company Code</span>
                          <span className="font-extrabold" style={{ color: '#2d1f0e' }}>{client.code || '—'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold block uppercase tracking-wider" style={{ color: '#9a7a5a' }}>Country</span>
                          <span className="font-extrabold" style={{ color: '#2d1f0e' }}>{client.country || 'International'}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-[9px] font-bold block uppercase tracking-wider mb-1" style={{ color: '#9a7a5a' }}>Order Number</span>
                          <ClientOrderNumbers clientId={client.id} />
                        </div>
                      </div>
                    </div>
                  </SpotlightCard>
                );
              })
            ) : (
              <div className="col-span-full py-12 text-center text-slate-400 font-bold text-sm">
                No clients found matching &quot;{searchQuery}&quot;
              </div>
            )}
          </motion.div>
        </SpotlightCard>
      )}

      {/* ─── CREATE CLIENT MODAL POPUP ─── */}
      <AnimatedModal
        isOpen={showCreateModal}
        onClose={closeCreateModal}
        zIndex={999999}
        panelClassName="space-y-4"
        panelStyle={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: '1px solid #e2e8f0',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '24px',
          pointerEvents: 'auto'
        }}
      >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-600" />
                Create New Client
              </h3>
              <button
                type="button"
                onClick={closeCreateModal}
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

            <form onSubmit={handleCreateClient} className="space-y-4 text-left">
              {/* Required — what the client is created with */}
              <div className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                    Client Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    autoFocus
                    required
                    placeholder="e.g. RICANO LEATHER Co."
                    value={clientForm.name}
                    onChange={(e) => setField('name', e.target.value)}
                    disabled={isCreating}
                    className={INPUT_CLS}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                      Country <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. India / USA"
                      value={clientForm.country}
                      onChange={(e) => setField('country', e.target.value)}
                      disabled={isCreating}
                      className={INPUT_CLS}
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
                      value={clientForm.order_number}
                      onChange={(e) => { setField('order_number', e.target.value.trim()); setOrderNumberError(''); }}
                      disabled={isCreating}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold text-slate-900 bg-white shadow-sm focus:outline-none focus:ring-2 disabled:opacity-50 transition-colors cursor-text relative z-20 ${orderNumberError
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
                </div>
              </div>

              {/* Optional — saved onto the client right after it is created */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Other Details (optional)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {OPTIONAL_CLIENT_FIELDS.map((f) => (
                    <div key={f.key} className={`space-y-1 ${f.full ? 'sm:col-span-2' : ''}`}>
                      <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                        {f.label}
                      </label>
                      <input
                        type={f.type || 'text'}
                        placeholder={f.placeholder}
                        value={clientForm[f.key]}
                        onChange={(e) => setField(f.key, e.target.value)}
                        disabled={isCreating}
                        className={INPUT_CLS}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100 relative z-30">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={isCreating}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer text-center disabled:opacity-50 pointer-events-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !canCreate}
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
      </AnimatedModal>

    </motion.div>
  );
}

