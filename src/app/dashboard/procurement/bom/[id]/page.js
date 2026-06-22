 'use client';
import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, CheckCircle2, XCircle, Edit3, Save, X,
  Loader2, AlertCircle, Package, AlertTriangle,
  ChevronDown, Lock,
} from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';
import { useAuth } from '@/context/AuthContext';
import { MOCK_SUBMISSIONS } from '../../page';

// ─── MOCK BOM DATA ────────────────────────────────────────────────────────────
// TODO: Replace with GET /api/v1/procurement/submissions/{id}/bom when API is live
const MOCK_BOM = {
  'SUB-001': [
    { id: 1, category: 'Upper',    component: 'Upper Leather',    material: 'Full Grain Calf — Cognac',  unit: 'sq.ft', qty_per_pair: 2.5,  total_qty: 1250, unit_cost: 180, status: 'confirmed' },
    { id: 2, category: 'Lining',   component: 'Lining Leather',   material: 'Split Grain Lamb',           unit: 'sq.ft', qty_per_pair: 1.8,  total_qty: 900,  unit_cost: 90,  status: 'confirmed' },
    { id: 3, category: 'Bottom',   component: 'Outsole',          material: 'Rubber Compound — Black',    unit: 'pairs', qty_per_pair: 1,    total_qty: 500,  unit_cost: 120, status: 'confirmed' },
    { id: 4, category: 'Bottom',   component: 'Insole Board',     material: 'Cellulose Fibre',            unit: 'pairs', qty_per_pair: 1,    total_qty: 500,  unit_cost: 45,  status: 'pending'   },
    { id: 5, category: 'Trims',    component: 'Thread',           material: 'Nylon 40s — Brown',          unit: 'spools',qty_per_pair: 0.1,  total_qty: 50,   unit_cost: 200, status: 'pending'   },
    { id: 6, category: 'Hardware', component: 'Zip Puller',       material: 'Antique Brass — 5mm',        unit: 'pairs', qty_per_pair: 1,    total_qty: 500,  unit_cost: 12,  status: 'confirmed' },
    { id: 7, category: 'Trims',    component: 'Toe Stiffener',    material: 'Thermoplastic',              unit: 'pairs', qty_per_pair: 1,    total_qty: 500,  unit_cost: 28,  status: 'pending'   },
  ],
  'SUB-002': [
    { id: 1, category: 'Upper',    component: 'Upper Leather',    material: 'Corrected Grain — Black',    unit: 'sq.ft', qty_per_pair: 2.2,  total_qty: 660,  unit_cost: 150, status: 'pending'   },
    { id: 2, category: 'Lining',   component: 'Sock Lining',      material: 'Genuine Leather — Tan',      unit: 'pairs', qty_per_pair: 1,    total_qty: 300,  unit_cost: 60,  status: 'pending'   },
    { id: 3, category: 'Bottom',   component: 'Leather Outsole',  material: 'Vegtan Oak-Bark',             unit: 'pairs', qty_per_pair: 1,    total_qty: 300,  unit_cost: 180, status: 'pending'   },
    { id: 4, category: 'Hardware', component: 'Brass Brogue Cap', material: 'Solid Brass — Burnished',    unit: 'pairs', qty_per_pair: 1,    total_qty: 300,  unit_cost: 45,  status: 'pending'   },
    { id: 5, category: 'Trims',    component: 'Wax Laces',        material: 'Cotton Wax — Black 75cm',    unit: 'pairs', qty_per_pair: 1,    total_qty: 300,  unit_cost: 18,  status: 'pending'   },
  ],
};

const STATUS_CONFIG = {
  approved:      { label: 'BOM Approved',  color: '#16a34a', bg: '#f0fdf4', border: 'rgba(22,163,74,0.2)' },
  ready_for_bom: { label: 'Pending Review',color: '#c8834a', bg: '#fff9f0', border: 'rgba(200,131,74,0.3)' },
  rejected:      { label: 'Rejected',      color: '#dc2626', bg: '#fef2f2', border: 'rgba(220,38,38,0.2)' },
  processing:    { label: 'Processing',    color: '#9a7a5a', bg: '#faf6f0', border: 'rgba(200,131,74,0.15)' },
};

const CATEGORIES = ['All', 'Upper', 'Lining', 'Bottom', 'Hardware', 'Trims'];

// ─── MOCK API ─────────────────────────────────────────────────────────────────
// TODO: Replace with PATCH /api/v1/procurement/submissions/{id}/bom/items
async function mockSaveBOMItem(id, itemId, patch) {
  await new Promise(r => setTimeout(r, 600));
  return { ...patch };
}
// TODO: Replace with POST /api/v1/procurement/submissions/{id}/approve
async function mockApprove(id) {
  await new Promise(r => setTimeout(r, 800));
  return { status: 'approved' };
}
// TODO: Replace with POST /api/v1/procurement/submissions/{id}/reject
async function mockReject(id, reason) {
  await new Promise(r => setTimeout(r, 600));
  return { status: 'rejected' };
}
// TODO: Replace with POST /api/v1/procurement/submissions/{id}/confirm-cutting
async function mockConfirmCutting(id) {
  await new Promise(r => setTimeout(r, 700));
  return { status: 'ready_for_bom' };
}

export default function BOMReviewPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const isManager = user === 'direct_manager';
  const isCuttingMgr = user === 'cutting_manager';

  // Find the submission from mock data
  const submission = useMemo(() => MOCK_SUBMISSIONS.find(s => s.id === id), [id]);

  // BOM state — initialized from mock, editable
  const [bom, setBom] = useState(() => MOCK_BOM[id] ?? []);
  const [subStatus, setSubStatus] = useState(submission?.status ?? 'ready_for_bom');

  // Editing
  const [editingId, setEditingId] = useState(null);
  const [editBuf, setEditBuf] = useState({});

  // Category filter
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Action states
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  if (!submission) {
    return (
      <div className="text-center py-20" style={{ color: '#9a7a5a' }}>
        <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p className="font-bold">Submission not found: {id}</p>
        <Link href="/dashboard/procurement" className="text-xs underline mt-2 inline-block" style={{ color: '#c8834a' }}>
          ← Back to Submissions
        </Link>
      </div>
    );
  }

  // ─── COMPUTED ────────────────────────────────────────────────────────────────
  const filteredBOM = categoryFilter === 'All' ? bom : bom.filter(i => i.category === categoryFilter);
  const totalCost = bom.reduce((sum, item) => sum + item.total_qty * item.unit_cost, 0);
  const confirmedCount = bom.filter(i => i.status === 'confirmed').length;
  const allConfirmed = confirmedCount === bom.length;
  const cfg = STATUS_CONFIG[subStatus] ?? STATUS_CONFIG.processing;

  // ─── EDIT HANDLERS ───────────────────────────────────────────────────────────
  const startEdit = (item) => {
    setEditingId(item.id);
    setEditBuf({ unit_cost: item.unit_cost, qty_per_pair: item.qty_per_pair, material: item.material });
  };

  const cancelEdit = () => { setEditingId(null); setEditBuf({}); };

  const saveEdit = async (item) => {
    setSaving(true);
    try {
      const patch = {
        unit_cost: parseFloat(editBuf.unit_cost) || item.unit_cost,
        qty_per_pair: parseFloat(editBuf.qty_per_pair) || item.qty_per_pair,
        material: editBuf.material || item.material,
        total_qty: (parseFloat(editBuf.qty_per_pair) || item.qty_per_pair) * submission.order_qty,
        status: 'confirmed',
      };
      await mockSaveBOMItem(id, item.id, patch);
      setBom(prev => prev.map(i => i.id === item.id ? { ...i, ...patch } : i));
      setEditingId(null);
      setEditBuf({});
      showToast('success', `${item.component} updated & confirmed.`);
    } catch {
      showToast('error', 'Failed to save. Please retry.');
    } finally {
      setSaving(false);
    }
  };

  // ─── APPROVAL HANDLERS ───────────────────────────────────────────────────────
  const handleConfirmCutting = async () => {
    setConfirming(true);
    try {
      await mockConfirmCutting(id);
      setSubStatus('ready_for_bom');
      showToast('success', 'Cutting confirmed. Submission sent to Direct Manager for approval.');
    } catch {
      showToast('error', 'Action failed. Please retry.');
    } finally {
      setConfirming(false);
    }
  };

  const handleApprove = async () => {
    setApproving(true);
    try {
      await mockApprove(id);
      setSubStatus('approved');
      showToast('success', 'BOM approved! Procurement order initiated.');
    } catch {
      showToast('error', 'Approval failed. Please retry.');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { showToast('error', 'Please provide a rejection reason.'); return; }
    setRejecting(true);
    try {
      await mockReject(id, rejectReason);
      setSubStatus('rejected');
      setShowRejectDialog(false);
      showToast('success', 'BOM rejected. Cutting manager has been notified.');
    } catch {
      showToast('error', 'Rejection failed. Please retry.');
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ─── TOAST ─── */}
      {toast && (
        <div className="fixed top-6 right-6 z-[999] max-w-sm animate-fade-in">
          <div className="flex items-start gap-3 p-4 rounded-2xl shadow-xl font-semibold text-sm"
            style={{
              background: toast.type === 'success' ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${toast.type === 'success' ? 'rgba(22,163,74,0.25)' : 'rgba(220,38,38,0.2)'}`,
              color: toast.type === 'success' ? '#166534' : '#991b1b',
            }}>
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
            <p>{toast.msg}</p>
          </div>
        </div>
      )}

      {/* ─── BREADCRUMB + HEADER ─── */}
      <div>
        <Link href="/dashboard/procurement" className="flex items-center gap-1.5 text-xs font-bold mb-3 w-fit transition-opacity hover:opacity-70" style={{ color: '#9a7a5a' }}>
          <ArrowLeft className="w-3.5 h-3.5" /> All Submissions
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: '#c8834a' }}>
              Procurement · Stage {subStatus === 'approved' || subStatus === 'rejected' ? '3' : '2'} — BOM Review
            </p>
            <h1 className="text-3xl font-black tracking-tight" style={{ color: '#2d1f0e' }}>
              {submission.client}
            </h1>
            <p className="font-medium mt-0.5" style={{ color: '#9a7a5a' }}>
              {submission.style} · {submission.colorway} · {submission.order_qty} pairs
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-[10px] font-black font-mono" style={{ color: '#9a7a5a' }}>{submission.id}</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                {cfg.label}
              </span>
            </div>
          </div>

          {/* Stage 2 Action — Cutting Manager confirms cutting */}
          {isCuttingMgr && subStatus === 'ready_for_bom' && (
            <button
              onClick={handleConfirmCutting}
              disabled={confirming || !allConfirmed}
              title={!allConfirmed ? 'Confirm all BOM items before submitting' : ''}
              className="h-11 px-6 rounded-xl font-black text-sm text-white flex items-center gap-2 transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}
            >
              {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {confirming ? 'Submitting…' : `Confirm Cutting${!allConfirmed ? ` (${confirmedCount}/${bom.length})` : ''}`}
            </button>
          )}

          {/* Stage 3 Actions — Direct Manager approves or rejects */}
          {isManager && (subStatus === 'ready_for_bom' || subStatus === 'approved') && subStatus !== 'approved' && subStatus !== 'rejected' && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowRejectDialog(true)}
                className="h-11 px-5 rounded-xl font-black text-sm flex items-center gap-2 transition-all hover:shadow-md"
                style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid rgba(220,38,38,0.25)' }}
              >
                <XCircle className="w-4 h-4" /> Reject
              </button>
              <button
                onClick={handleApprove}
                disabled={approving}
                className="h-11 px-5 rounded-xl font-black text-sm text-white flex items-center gap-2 transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #16a34a, #22c55e)' }}
              >
                {approving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {approving ? 'Approving…' : 'Approve BOM'}
              </button>
            </div>
          )}

          {subStatus === 'approved' && (
            <span className="flex items-center gap-2 h-11 px-5 rounded-xl text-sm font-black" style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid rgba(22,163,74,0.2)' }}>
              <CheckCircle2 className="w-4 h-4" /> BOM Approved
            </span>
          )}
          {subStatus === 'rejected' && (
            <span className="flex items-center gap-2 h-11 px-5 rounded-xl text-sm font-black" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>
              <XCircle className="w-4 h-4" /> Rejected
            </span>
          )}
        </div>
      </div>

      {/* ─── SUMMARY STAT STRIP ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total BOM Lines',   value: bom.length },
          { label: 'Confirmed Lines',   value: `${confirmedCount} / ${bom.length}` },
          { label: 'Order Quantity',     value: `${submission.order_qty} pairs` },
          { label: 'Est. Material Cost',value: `₹${totalCost.toLocaleString()}` },
        ].map(({ label, value }) => (
          <SpotlightCard key={label} className="p-4 bg-white rounded-2xl shadow-sm" style={{ border: '1px solid rgba(200,131,74,0.12)' }} spotlightColor="rgba(200,131,74,0.05)">
            <p className="text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: '#9a7a5a' }}>{label}</p>
            <p className="text-lg font-black" style={{ color: '#2d1f0e' }}>{value}</p>
          </SpotlightCard>
        ))}
      </div>

      {/* ─── BOM TABLE ─── */}
      <SpotlightCard className="p-0 bg-white shadow-xl rounded-3xl overflow-hidden" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.04)">

        {/* Table header with category filter */}
        <div className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
          <h3 className="text-lg font-extrabold flex items-center gap-2" style={{ color: '#2d1f0e' }}>
            <Package className="w-5 h-5" style={{ color: '#c8834a' }} /> Bill of Materials
          </h3>
          <div className="flex items-center gap-1.5 flex-wrap">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setCategoryFilter(cat)}
                className="px-3 py-1 rounded-full text-[10px] font-black transition-all"
                style={{
                  background: categoryFilter === cat ? '#c8834a' : '#faf6f0',
                  color: categoryFilter === cat ? 'white' : '#9a7a5a',
                  border: `1px solid ${categoryFilter === cat ? '#c8834a' : 'rgba(200,131,74,0.2)'}`,
                }}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Role banner */}
        {!isCuttingMgr && !isManager && (
          <div className="flex items-center gap-2 px-5 py-3 border-b" style={{ background: '#faf6f0', borderColor: 'rgba(200,131,74,0.1)' }}>
            <Lock className="w-3.5 h-3.5" style={{ color: '#c8834a' }} />
            <p className="text-[11px] font-semibold" style={{ color: '#9a7a5a' }}>View-only mode. Edit access requires Cutting Manager or Direct Manager role.</p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-semibold">
            <thead>
              <tr className="font-black uppercase tracking-wider" style={{ background: '#faf6f0', borderBottom: '1px solid rgba(200,131,74,0.12)', color: '#9a7a5a' }}>
                <th className="p-3 pl-5">Category</th>
                <th className="p-3">Component</th>
                <th className="p-3">Material</th>
                <th className="p-3">Qty/Pair</th>
                <th className="p-3">Total Qty</th>
                <th className="p-3">Unit Cost (₹)</th>
                <th className="p-3">Line Total (₹)</th>
                <th className="p-3">Status</th>
                {(isCuttingMgr && subStatus === 'ready_for_bom') && <th className="p-3">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredBOM.map((item) => {
                const isEditing = editingId === item.id;
                const lineTotal = item.total_qty * item.unit_cost;
                return (
                  <tr key={item.id}
                    className="border-b transition-colors hover:bg-[#fcfaf8]"
                    style={{ borderColor: 'rgba(200,131,74,0.07)' }}>
                    <td className="p-3 pl-5">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black" style={{ background: '#fff9f0', color: '#c8834a', border: '1px solid rgba(200,131,74,0.2)' }}>
                        {item.category}
                      </span>
                    </td>
                    <td className="p-3 font-black" style={{ color: '#2d1f0e' }}>{item.component}</td>
                    <td className="p-3" style={{ color: '#9a7a5a' }}>
                      {isEditing
                        ? <input value={editBuf.material} onChange={e => setEditBuf(b => ({ ...b, material: e.target.value }))}
                            className="w-36 px-2 py-1 rounded-lg text-xs font-semibold focus:outline-none"
                            style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.3)', color: '#2d1f0e' }} />
                        : item.material}
                    </td>
                    <td className="p-3" style={{ color: '#2d1f0e' }}>
                      {isEditing
                        ? <input type="number" value={editBuf.qty_per_pair} onChange={e => setEditBuf(b => ({ ...b, qty_per_pair: e.target.value }))}
                            className="w-16 px-2 py-1 rounded-lg text-xs font-semibold focus:outline-none"
                            style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.3)', color: '#2d1f0e' }} />
                        : item.qty_per_pair}
                    </td>
                    <td className="p-3 font-semibold" style={{ color: '#9a7a5a' }}>
                      {isEditing
                        ? Math.round((parseFloat(editBuf.qty_per_pair) || 0) * submission.order_qty)
                        : item.total_qty}
                    </td>
                    <td className="p-3" style={{ color: '#2d1f0e' }}>
                      {isEditing
                        ? <input type="number" value={editBuf.unit_cost} onChange={e => setEditBuf(b => ({ ...b, unit_cost: e.target.value }))}
                            className="w-20 px-2 py-1 rounded-lg text-xs font-semibold focus:outline-none"
                            style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.3)', color: '#2d1f0e' }} />
                        : `₹${item.unit_cost}`}
                    </td>
                    <td className="p-3 font-black" style={{ color: '#2d1f0e' }}>
                      ₹{(isEditing
                          ? Math.round((parseFloat(editBuf.qty_per_pair) || 0) * submission.order_qty * (parseFloat(editBuf.unit_cost) || 0))
                          : lineTotal
                        ).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black"
                        style={{
                          background: item.status === 'confirmed' ? '#f0fdf4' : '#fff9f0',
                          color: item.status === 'confirmed' ? '#16a34a' : '#c8834a',
                          border: `1px solid ${item.status === 'confirmed' ? 'rgba(22,163,74,0.2)' : 'rgba(200,131,74,0.2)'}`,
                        }}>
                        {item.status === 'confirmed' ? <CheckCircle2 className="w-3 h-3" /> : null}
                        {item.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                      </span>
                    </td>
                    {(isCuttingMgr && subStatus === 'ready_for_bom') && (
                      <td className="p-3">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => saveEdit(item)} disabled={saving}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-black text-white transition-all"
                              style={{ background: '#c8834a' }}>
                              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
                            </button>
                            <button onClick={cancelEdit} className="p-1.5 rounded-lg transition-colors hover:bg-slate-100">
                              <X className="w-3.5 h-3.5" style={{ color: '#9a7a5a' }} />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => startEdit(item)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-black transition-all hover:shadow-sm"
                            style={{ background: '#faf6f0', color: '#c8834a', border: '1px solid rgba(200,131,74,0.2)' }}>
                            <Edit3 className="w-3 h-3" /> Edit
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: '#faf6f0', borderTop: '1px solid rgba(200,131,74,0.15)' }}>
                <td colSpan={6} className="p-3 pl-5 font-black uppercase text-[10px] tracking-wider" style={{ color: '#9a7a5a' }}>Total Estimated Material Cost</td>
                <td className="p-3 text-sm font-black" style={{ color: '#c8834a' }}>₹{totalCost.toLocaleString()}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </SpotlightCard>

      {/* ─── REJECT DIALOG ─── */}
      {showRejectDialog && (
        <div className="fixed inset-0 z-[999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <SpotlightCard className="bg-white rounded-3xl shadow-2xl p-6 max-w-md w-full space-y-4 animate-fade-in" style={{ border: '1px solid rgba(220,38,38,0.2)' }} spotlightColor="rgba(220,38,38,0.04)">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6" style={{ color: '#dc2626' }} />
                <h3 className="font-black text-lg" style={{ color: '#2d1f0e' }}>Reject BOM</h3>
              </div>
              <button onClick={() => setShowRejectDialog(false)}>
                <X className="w-5 h-5" style={{ color: '#9a7a5a' }} />
              </button>
            </div>
            <p className="text-xs font-semibold" style={{ color: '#9a7a5a' }}>
              Provide a clear reason so the Cutting Manager knows what to fix and resubmit.
            </p>
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider block mb-1" style={{ color: '#9a7a5a' }}>Rejection Reason *</label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                rows={3}
                placeholder="e.g. Unit costs for Upper Leather are too high. Source from Kanpur alternative supplier."
                className="w-full px-3 py-2 rounded-xl text-sm font-semibold focus:outline-none resize-none"
                style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.2)', color: '#2d1f0e' }}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowRejectDialog(false)}
                className="flex-1 h-10 rounded-xl text-xs font-black"
                style={{ background: '#faf6f0', color: '#9a7a5a', border: '1px solid rgba(200,131,74,0.2)' }}>
                Cancel
              </button>
              <button onClick={handleReject} disabled={rejecting}
                className="flex-1 h-10 rounded-xl text-xs font-black text-white flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #dc2626, #ef4444)' }}>
                {rejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                {rejecting ? 'Rejecting…' : 'Confirm Reject'}
              </button>
            </div>
          </SpotlightCard>
        </div>
      )}
    </div>
  );
}
