'use client';
// Accessories Requirement module — everything for the new per-style
// "material spec" (recipe) feature lives here, self-contained, so it's easy
// to find and doesn't spread across src/lib/api.js.
//
// Endpoints this file owns:
//   GET    /api/v1/styles/{style_id}/material-spec
//   PUT    /api/v1/styles/{style_id}/material-spec                (save whole grid, idempotent)
//   POST   /api/v1/styles/{style_id}/material-spec/lines           (add one line)
//   PATCH  /api/v1/styles/{style_id}/material-spec/lines/{line_id} (edit one line)
//   DELETE /api/v1/styles/{style_id}/material-spec/lines/{line_id} (soft-remove one line)
//   POST   /api/v1/styles/{style_id}/material-spec/confirm         (sign off — unlocks release)
//   POST   /api/v1/styles/{style_id}/material-spec/copy-from       (seed from another style)
//   GET    /api/v1/styles/{style_id}/material-spec/requirement     (qty x per-piece vs stock)
//   POST   /api/v1/materials/issues                                (off-spec correction, repeatable)
//
// Reused, not redefined here:
//   POST /api/v1/drawers/store-scan (src/lib/api.js `apiStoreDrawerScan`) now
//   accepts `part: 'ACCESSORY'` plus an optional `lines[]` — omitting `lines`
//   issues the whole kit the recipe calls for. Its response now also carries
//   a `kit` block on every scan (not just accessory scans).
//   GET /api/v1/barcode/resolve (`apiBarcodeResolve`) now returns a
//   `material_requirement` block (keyed by `kit_status`:
//   NOT_REQUIRED | PENDING | PARTIAL | ISSUED) on both the piece and the
//   drawer payload — that's what drives the Store Hub checklist below.
//   POST /api/v1/suppliers/orders (`apiCreateSupplierOrder`) is reused as-is
//   for the "Order" action on a short accessory line.

import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2, XCircle, AlertTriangle, Loader2, ChevronDown, ChevronRight,
  Plus, Trash2, Save, Copy, Truck, PackageCheck,
} from 'lucide-react';
import { apiStoreDrawerScan, apiBarcodeResolve, apiCreateSupplierOrder } from '@/lib/api';

export const ACCESSORY_SUBTYPES = ['BUTTON', 'ZIP', 'THREAD', 'OTHER'];

// ─────────────────────────── API layer ───────────────────────────

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

function parseSpecErrorDetail(detail) {
  if (!detail) return null;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((d) => d?.msg || d).join(', ');
  return null;
}

async function materialSpecApiError(res, fallback) {
  let detail;
  try { detail = (await res.json()).detail; } catch { /* no JSON body */ }
  const message = parseSpecErrorDetail(detail) || fallback;
  const err = new Error(message);
  err.status = res.status;
  err.detail = detail;
  return err;
}

export async function apiGetStyleMaterialSpec(token, styleId) {
  const res = await fetch(`${API_BASE_URL}/api/v1/styles/${encodeURIComponent(styleId)}/material-spec`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw await materialSpecApiError(res, `Failed to fetch material spec (${res.status})`);
  return res.json();
}

export async function apiPutStyleMaterialSpec(token, styleId, lines) {
  const res = await fetch(`${API_BASE_URL}/api/v1/styles/${encodeURIComponent(styleId)}/material-spec`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ lines }),
  });
  if (!res.ok) throw await materialSpecApiError(res, `Failed to save material spec (${res.status})`);
  return res.json();
}

export async function apiAddStyleMaterialSpecLine(token, styleId, line) {
  const res = await fetch(`${API_BASE_URL}/api/v1/styles/${encodeURIComponent(styleId)}/material-spec/lines`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(line),
  });
  if (!res.ok) throw await materialSpecApiError(res, `Failed to add accessory line (${res.status})`);
  return res.json();
}

export async function apiPatchStyleMaterialSpecLine(token, styleId, lineId, patch) {
  const res = await fetch(`${API_BASE_URL}/api/v1/styles/${encodeURIComponent(styleId)}/material-spec/lines/${encodeURIComponent(lineId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw await materialSpecApiError(res, `Failed to update accessory line (${res.status})`);
  return res.json();
}

export async function apiDeleteStyleMaterialSpecLine(token, styleId, lineId) {
  const res = await fetch(`${API_BASE_URL}/api/v1/styles/${encodeURIComponent(styleId)}/material-spec/lines/${encodeURIComponent(lineId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw await materialSpecApiError(res, `Failed to remove accessory line (${res.status})`);
  return res.json();
}

export async function apiConfirmStyleMaterialSpec(token, styleId, noAccessories = false) {
  const res = await fetch(`${API_BASE_URL}/api/v1/styles/${encodeURIComponent(styleId)}/material-spec/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ no_accessories: !!noAccessories }),
  });
  if (!res.ok) throw await materialSpecApiError(res, `Failed to confirm accessories spec (${res.status})`);
  return res.json();
}

export async function apiCopyStyleMaterialSpec(token, styleId, fromStyleId) {
  const res = await fetch(`${API_BASE_URL}/api/v1/styles/${encodeURIComponent(styleId)}/material-spec/copy-from`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ from_style_id: fromStyleId }),
  });
  if (!res.ok) throw await materialSpecApiError(res, `Failed to copy accessories spec (${res.status})`);
  return res.json();
}

export async function apiGetStyleMaterialRequirement(token, styleId) {
  const res = await fetch(`${API_BASE_URL}/api/v1/styles/${encodeURIComponent(styleId)}/material-spec/requirement`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw await materialSpecApiError(res, `Failed to fetch requirement check (${res.status})`);
  return res.json();
}

export async function apiRecordMaterialIssue(token, payload) {
  const res = await fetch(`${API_BASE_URL}/api/v1/materials/issues`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw await materialSpecApiError(res, `Failed to record material issue (${res.status})`);
  return res.json();
}

// Thin wrapper over the existing POST /drawers/store-scan — builds the
// ACCESSORY-part payload, no duplicate fetch/error-handling logic.
export async function apiIssueAccessoryKit(token, { employee, drawerId, drawerBarcode, pieceId, pieceBarcode, lines } = {}) {
  const payload = { part: 'ACCESSORY' };
  if (employee) {
    if (employee.employee_barcode || employee.barcode) payload.employee_barcode = employee.employee_barcode || employee.barcode;
    else if (employee.id) payload.employee_id = employee.id;
  }
  if (drawerId) payload.drawer_id = drawerId;
  else if (drawerBarcode) payload.drawer_barcode = drawerBarcode;
  if (pieceId) payload.piece_id = pieceId;
  else if (pieceBarcode) payload.piece_barcode = pieceBarcode;
  if (Array.isArray(lines) && lines.length > 0) payload.lines = lines;
  return apiStoreDrawerScan(token, payload);
}

// ─────────────────────── Breakdown Review — item 1 ───────────────────────

// One editable ACCESSORY line inside the recipe grid.
function AccessorySpecLine({ line, styleId, token, showToast, canEdit, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [article, setArticle] = useState(line.article || '');
  const [colour, setColour] = useState(line.colour || '');
  const [size, setSize] = useState(line.size || '');
  const [qty, setQty] = useState(line.qty_per_piece ?? '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiPatchStyleMaterialSpecLine(token, styleId, line.line_id, {
        article: article.trim() || undefined,
        colour: colour.trim() || undefined,
        size: size.trim() || undefined,
        qty_per_piece: qty === '' ? undefined : Number(qty),
      });
      showToast('Accessory line updated.', 'success');
      setEditing(false);
      onChanged();
    } catch (e) {
      showToast(e.message || 'Update failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiDeleteStyleMaterialSpecLine(token, styleId, line.line_id);
      showToast('Accessory line removed.', 'success');
      onChanged();
    } catch (e) {
      showToast(e.message || 'Delete failed.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const lot = line.lot;
  const isOverride = line.scope === 'SKU';
  const unresolved = line.resolution === 'NONE' || line.resolution === 'AMBIGUOUS';

  return (
    <div className={`flex flex-wrap items-center gap-2 p-2.5 rounded-lg border text-xs ${unresolved ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-500 shrink-0">{line.subtype || '—'}</span>
      {isOverride && <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-600 shrink-0">SKU override</span>}
      {editing ? (
        <input value={article} onChange={(e) => setArticle(e.target.value)} className="w-24 h-7 px-1.5 border rounded font-bold" style={{ borderColor: 'rgba(200,131,74,0.3)' }} placeholder="Article" />
      ) : (
        <span className="font-mono font-bold text-slate-700">{line.article}</span>
      )}
      {editing ? (
        <input value={colour} onChange={(e) => setColour(e.target.value)} className="w-20 h-7 px-1.5 border rounded font-bold" style={{ borderColor: 'rgba(200,131,74,0.3)' }} placeholder="Colour" />
      ) : (
        <span className="text-slate-500">{line.colour || '—'}</span>
      )}
      {editing ? (
        <input value={size} onChange={(e) => setSize(e.target.value)} className="w-16 h-7 px-1.5 border rounded text-center font-bold" style={{ borderColor: 'rgba(200,131,74,0.3)' }} placeholder="Size" />
      ) : (
        <span className="text-slate-500 w-14 text-center">{line.size || '—'}</span>
      )}
      {editing ? (
        <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} className="w-16 h-7 px-1.5 border rounded text-center font-bold" style={{ borderColor: 'rgba(200,131,74,0.3)' }} />
      ) : (
        <span className="font-black" style={{ color: '#c8834a' }}>{line.qty_per_piece} {line.uom || 'pcs'} / piece</span>
      )}
      {lot && <span className="text-[10px] font-bold text-slate-400">on hand {lot.on_hand ?? '—'} · avail {lot.available ?? '—'}</span>}
      {unresolved && <span className="text-[10px] font-black text-rose-600">⚠ no stock lot resolves this line</span>}
      {canEdit && (
        <div className="flex items-center gap-1.5 ml-auto shrink-0">
          {editing ? (
            <button onClick={handleSave} disabled={saving} className="p-1.5 rounded-lg bg-emerald-500 text-white disabled:opacity-50">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            </button>
          ) : (
            <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg bg-white border" style={{ borderColor: 'rgba(200,131,74,0.2)', color: '#c8834a' }}>Edit</button>
          )}
          <button onClick={handleDelete} disabled={deleting} className="p-1.5 rounded-lg bg-red-50 text-red-500 disabled:opacity-50">
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Embedded inline in the Breakdown Review style-expansion, before Release.
 * Lets a DM/MD declare the accessories a DRAFT style needs (or confirm it
 * needs none) so release doesn't come back rejected with material-spec
 * blockers. Read-only for everyone else / once the style is RELEASED.
 */
export function StyleAccessoriesPanel({ styleId, canEdit, token, showToast }) {
  const [spec, setSpec] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notDeployed, setNotDeployed] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ subtype: 'BUTTON', article: '', colour: '', size: '', qty_per_piece: '', sku_id: '', material_lot_id: '' });
  const [noAccessories, setNoAccessories] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmWarnings, setConfirmWarnings] = useState([]);
  const [copyFromInput, setCopyFromInput] = useState('');
  const [copying, setCopying] = useState(false);
  const [requirementOpen, setRequirementOpen] = useState(false);
  const [requirement, setRequirement] = useState(null);
  const [requirementLoading, setRequirementLoading] = useState(false);
  const [orderingKey, setOrderingKey] = useState(null);

  const load = useCallback(async () => {
    if (!token || !styleId) return;
    setLoading(true); setError(''); setNotDeployed(false);
    try {
      const data = await apiGetStyleMaterialSpec(token, styleId);
      setSpec(data);
      setNoAccessories(!!data.no_accessories_declared);
      setConfirmWarnings([]);
    } catch (e) {
      // 404 here means the backend hasn't shipped this endpoint yet, not
      // that something is broken — don't show it as an alarming error.
      if (e.status === 404) {
        setNotDeployed(true);
      } else {
        setError(e.message || 'Failed to load accessories requirement.');
      }
      setSpec(null);
    } finally {
      setLoading(false);
    }
  }, [token, styleId]);

  useEffect(() => { load(); }, [load]);

  const accessoryLines = (spec?.lines || []).filter((l) => l.category === 'ACCESSORY' && l.is_active !== false);

  const resetForm = () => setForm({ subtype: 'BUTTON', article: '', colour: '', size: '', qty_per_piece: '', sku_id: '', material_lot_id: '' });

  const handleAddLine = async () => {
    if (!form.article.trim() || form.qty_per_piece === '') {
      showToast('Article and per-piece quantity are required.', 'error');
      return;
    }
    setAdding(true);
    try {
      await apiAddStyleMaterialSpecLine(token, styleId, {
        sku_id: form.sku_id.trim() || null,
        category: 'ACCESSORY',
        subtype: form.subtype,
        article: form.article.trim(),
        colour: form.colour.trim() || undefined,
        size: form.size.trim() || undefined,
        qty_per_piece: Number(form.qty_per_piece),
        material_lot_id: form.material_lot_id.trim() || undefined,
      });
      showToast('Accessory requirement added.', 'success');
      resetForm();
      setShowAddForm(false);
      await load();
    } catch (e) {
      showToast(e.message || 'Failed to add accessory line.', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const res = await apiConfirmStyleMaterialSpec(token, styleId, accessoryLines.length === 0 && noAccessories);
      showToast(res.message || 'Accessories requirement confirmed.', 'success');
      setConfirmWarnings(res.warnings || []);
      await load();
    } catch (e) {
      showToast(e.message || 'Failed to confirm accessories requirement.', 'error');
    } finally {
      setConfirming(false);
    }
  };

  const handleCopyFrom = async () => {
    if (!copyFromInput.trim()) return;
    setCopying(true);
    try {
      const res = await apiCopyStyleMaterialSpec(token, styleId, copyFromInput.trim());
      showToast(res.message || 'Copied accessories from that style.', 'success');
      setCopyFromInput('');
      await load();
    } catch (e) {
      showToast(e.message || 'Copy failed.', 'error');
    } finally {
      setCopying(false);
    }
  };

  const toggleRequirement = async () => {
    const next = !requirementOpen;
    setRequirementOpen(next);
    if (next && !requirement) {
      setRequirementLoading(true);
      try {
        setRequirement(await apiGetStyleMaterialRequirement(token, styleId));
      } catch (e) {
        showToast(e.message || 'Failed to load requirement check.', 'error');
      } finally {
        setRequirementLoading(false);
      }
    }
  };

  const handleOrder = async (line) => {
    const key = line.spec_id || line.article;
    setOrderingKey(key);
    try {
      const res = await apiCreateSupplierOrder(token, {
        category: 'ACCESSORY',
        subtype: line.subtype || undefined,
        article: line.article,
        colour: line.colour || undefined,
        qty: line.short_by,
      });
      showToast(`Supplier order raised for ${res.article || line.article}.`, 'success');
    } catch (e) {
      showToast(e.message || 'Failed to raise supplier order.', 'error');
    } finally {
      setOrderingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="mt-3 p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2 text-xs font-bold text-slate-400">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading accessories requirement…
      </div>
    );
  }

  if (notDeployed) {
    return (
      <div className="mt-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-400">
        Accessories requirement isn&apos;t available from the server yet — check back once this is deployed.
      </div>
    );
  }

  if (error) {
    return <div className="mt-3 p-4 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700">{error}</div>;
  }

  if (!spec) return null;

  const requirementAccessoryLines = (requirement?.lines || []).filter((l) => l.category === 'ACCESSORY');

  return (
    <div className="mt-3 p-4 rounded-xl bg-white border space-y-3" style={{ borderColor: 'rgba(124,58,237,0.2)', background: 'linear-gradient(180deg, rgba(124,58,237,0.04), transparent)' }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-black uppercase tracking-widest text-violet-600">Accessories Requirement</span>
          {spec.confirmed ? (
            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Confirmed
            </span>
          ) : (
            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700">Not confirmed</span>
          )}
          {spec.no_accessories_declared && (
            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-500">No accessories needed</span>
          )}
        </div>
        <span className="text-[10px] font-bold text-slate-400">{accessoryLines.length} line(s)</span>
      </div>

      {spec.release_blockers?.length > 0 && (
        <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 space-y-0.5">
          {spec.release_blockers.map((b, i) => <p key={i} className="text-[11px] font-bold text-rose-700">⚠ {b}</p>)}
        </div>
      )}
      {confirmWarnings.length > 0 && (
        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 space-y-0.5">
          {confirmWarnings.map((w, i) => <p key={i} className="text-[11px] font-bold text-amber-700">ℹ {w}</p>)}
        </div>
      )}

      <div className="space-y-1.5">
        {accessoryLines.length === 0 ? (
          <p className="text-xs font-bold text-slate-400 italic">No accessories declared for this style yet.</p>
        ) : (
          accessoryLines.map((line) => (
            <AccessorySpecLine key={line.line_id} line={line} styleId={styleId} token={token} showToast={showToast} canEdit={canEdit} onChanged={load} />
          ))
        )}
      </div>

      {canEdit && (
        <>
          {showAddForm ? (
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex flex-wrap gap-2">
                <select value={form.subtype} onChange={(e) => setForm((f) => ({ ...f, subtype: e.target.value }))} className="h-8 px-2 border rounded-lg font-bold text-xs" style={{ borderColor: 'rgba(200,131,74,0.3)' }}>
                  {ACCESSORY_SUBTYPES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <input value={form.article} onChange={(e) => setForm((f) => ({ ...f, article: e.target.value }))} placeholder="Article (e.g. BTN-4H)" className="h-8 px-2 border rounded-lg font-bold text-xs flex-1 min-w-[8rem]" style={{ borderColor: 'rgba(200,131,74,0.3)' }} />
                <input value={form.colour} onChange={(e) => setForm((f) => ({ ...f, colour: e.target.value }))} placeholder="Colour" className="h-8 px-2 border rounded-lg font-bold text-xs w-24" style={{ borderColor: 'rgba(200,131,74,0.3)' }} />
                <input value={form.size} onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))} placeholder="Size" className="h-8 px-2 border rounded-lg font-bold text-xs w-20" style={{ borderColor: 'rgba(200,131,74,0.3)' }} />
                <input type="number" value={form.qty_per_piece} onChange={(e) => setForm((f) => ({ ...f, qty_per_piece: e.target.value }))} placeholder="Qty / piece" className="h-8 px-2 border rounded-lg font-bold text-xs w-24" style={{ borderColor: 'rgba(200,131,74,0.3)' }} />
              </div>
              <div className="flex flex-wrap gap-2">
                <input value={form.sku_id} onChange={(e) => setForm((f) => ({ ...f, sku_id: e.target.value }))} placeholder="SKU override ID (optional)" className="h-8 px-2 border rounded-lg font-bold text-xs flex-1 min-w-[10rem]" style={{ borderColor: 'rgba(200,131,74,0.3)' }} />
                <input value={form.material_lot_id} onChange={(e) => setForm((f) => ({ ...f, material_lot_id: e.target.value }))} placeholder="Lot barcode/ID (optional)" className="h-8 px-2 border rounded-lg font-bold text-xs flex-1 min-w-[10rem]" style={{ borderColor: 'rgba(200,131,74,0.3)' }} />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => { setShowAddForm(false); resetForm(); }} className="h-8 px-3 rounded-lg font-black text-[11px] uppercase bg-white border text-slate-500" style={{ borderColor: 'rgba(200,131,74,0.2)' }}>Cancel</button>
                <button onClick={handleAddLine} disabled={adding} className="h-8 px-3 rounded-lg font-black text-[11px] uppercase text-white flex items-center gap-1.5 disabled:opacity-50" style={{ background: '#7c3aed' }}>
                  {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Add
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAddForm(true)} className="h-8 px-3 rounded-lg font-black text-[11px] uppercase bg-white border text-violet-600 flex items-center gap-1.5" style={{ borderColor: 'rgba(124,58,237,0.25)' }}>
              <Plus className="w-3.5 h-3.5" /> Add accessory
            </button>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <input value={copyFromInput} onChange={(e) => setCopyFromInput(e.target.value)} placeholder="Copy from style code/ID…" className="h-8 px-2 border rounded-lg font-bold text-xs flex-1 min-w-[10rem]" style={{ borderColor: 'rgba(200,131,74,0.3)' }} />
            <button onClick={handleCopyFrom} disabled={copying || !copyFromInput.trim()} className="h-8 px-3 rounded-lg font-black text-[11px] uppercase bg-white border text-slate-600 flex items-center gap-1.5 disabled:opacity-50" style={{ borderColor: 'rgba(200,131,74,0.2)' }}>
              {copying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />} Copy
            </button>
          </div>

          {accessoryLines.length === 0 && (
            <label className="flex items-center gap-2 text-[11px] font-bold text-slate-500 pt-1">
              <input type="checkbox" checked={noAccessories} onChange={(e) => setNoAccessories(e.target.checked)} className="w-3.5 h-3.5 accent-violet-600" />
              This style takes no accessories
            </label>
          )}

          <button onClick={handleConfirm} disabled={confirming || (accessoryLines.length === 0 && !noAccessories)} className="h-9 px-4 rounded-lg font-black text-[11px] uppercase text-white flex items-center gap-1.5 disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #7c3aed, #a78bfa)' }}>
            {confirming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Confirm Accessories Spec
          </button>
        </>
      )}

      <div className="pt-2 border-t border-slate-100">
        <button onClick={toggleRequirement} className="flex items-center gap-1.5 text-[11px] font-black uppercase text-slate-500">
          {requirementOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />} Check Requirement vs Stock
        </button>
        {requirementOpen && (
          requirementLoading ? (
            <div className="pt-2 flex items-center gap-2 text-xs font-bold text-slate-400"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking stock…</div>
          ) : requirementAccessoryLines.length === 0 ? (
            <p className="pt-2 text-xs font-bold text-slate-400 italic">No accessory lines to check yet.</p>
          ) : (
            <div className="pt-2 space-y-1.5">
              {requirementAccessoryLines.map((l) => (
                <div key={l.spec_id || `${l.article}-${l.colour}-${l.size}`} className={`flex flex-wrap items-center gap-2 p-2 rounded-lg text-[11px] font-bold ${l.short_by > 0 ? 'bg-rose-50 border border-rose-200' : 'bg-emerald-50 border border-emerald-200'}`}>
                  <span className="font-mono text-slate-700">{l.article} {l.colour ? `· ${l.colour}` : ''} {l.size ? `· ${l.size}` : ''}</span>
                  <span className="text-slate-500">needs {l.total_required ?? l.pieces} {l.uom}</span>
                  <span className="text-slate-500">avail {l.available ?? l.lot?.available ?? 0}</span>
                  {l.short_by > 0 ? (
                    <>
                      <span className="text-rose-700">short {l.short_by}</span>
                      <button onClick={() => handleOrder(l)} disabled={orderingKey === (l.spec_id || l.article)} className="ml-auto h-7 px-2.5 rounded-lg font-black text-[10px] uppercase text-white flex items-center gap-1 disabled:opacity-50" style={{ background: '#c8834a' }}>
                        {orderingKey === (l.spec_id || l.article) ? <Loader2 className="w-3 h-3 animate-spin" /> : <Truck className="w-3 h-3" />} Order
                      </button>
                    </>
                  ) : (
                    <span className="ml-auto text-emerald-700">✓ covered</span>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ───────────────────────── Store Hub — item 2 ─────────────────────────

/**
 * Compact status readout reused inside Store Hub's post-scan panel — the
 * backend now returns a `kit` block on every LEATHER/LINING scan response
 * too, not just accessory scans, so the checklist rides every scan.
 */
export function KitStatusMini({ kit }) {
  if (!kit || kit.status === 'NOT_REQUIRED') return null;

  const style = {
    PENDING: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', label: 'Accessory Kit — Pending' },
    PARTIAL: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-800', label: 'Accessory Kit — Partial' },
    ISSUED: { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-800', label: 'Accessory Kit — Issued' },
  }[kit.status] || { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', label: 'Accessory Kit' };

  const unresolved = Array.isArray(kit.unresolved) ? kit.unresolved : [];
  const stockWarnings = Array.isArray(kit.stock_warnings) ? kit.stock_warnings : [];

  return (
    <div className={`mt-2 p-3 rounded-xl border ${style.bg} ${style.border} space-y-1`}>
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-black uppercase tracking-wider ${style.text}`}>{style.label}</span>
        {kit.status === 'ISSUED' && <CheckCircle2 className="w-4 h-4 text-violet-600" />}
      </div>
      {kit.summary_line && <p className="text-[11px] font-bold text-slate-600">{kit.summary_line}</p>}
      {unresolved.map((u, i) => (
        <p key={i} className="text-[10px] font-bold text-rose-700">⚠ {u.article ? `${u.article}: ` : ''}{u.reason || u.note || 'No stock lot resolves this line — issue it manually.'}</p>
      ))}
      {stockWarnings.map((w, i) => (
        <p key={i} className="text-[10px] font-bold text-amber-700">⚠ {typeof w === 'string' ? w : w.message}</p>
      ))}
    </div>
  );
}

/**
 * Third card in Store Hub's "Part Breakdown" grid, next to Leather/Lining.
 * Sourced from GET /barcode/resolve's `material_requirement` block (fetched
 * lazily when the drawer's own card is expanded) — self-hides when the
 * style needs no accessories (`kit_status: NOT_REQUIRED`) so existing
 * drawers render exactly as before.
 */
export function AccessoryKitCard({ drawer, token, employee, onIssued }) {
  const [loading, setLoading] = useState(true);
  const [requirement, setRequirement] = useState(null);
  const [issuing, setIssuing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const code = drawer?.id || drawer?.drawer_code;
    if (!token || !code) { setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const res = await apiBarcodeResolve(token, code);
      const req = res?.material_requirement || res?.drawer?.material_requirement || res?.piece?.material_requirement || null;
      setRequirement(req);
    } catch {
      // Not surfaced as an error — a failed lookup (e.g. the backend
      // hasn't shipped `material_requirement` yet, or a transient network
      // issue) should read the same as "no accessory kit for this drawer,"
      // which is what the `!kitStatus` check below already renders as
      // nothing. Not distinguishing the two keeps existing drawers looking
      // exactly as they did before this feature existed.
      setRequirement(null);
    } finally {
      setLoading(false);
    }
  }, [token, drawer?.id, drawer?.drawer_code]);

  useEffect(() => { load(); }, [load]);

  const handleIssue = async (e) => {
    e.stopPropagation();
    setIssuing(true); setError('');
    try {
      await apiIssueAccessoryKit(token, {
        employee,
        drawerId: drawer.drawer_id || undefined,
        drawerBarcode: drawer.drawer_id ? undefined : drawer.id,
        pieceBarcode: drawer.piece_code || undefined,
      });
      await load();
      onIssued?.();
    } catch (e2) {
      setError(e2.message || 'Failed to issue kit.');
    } finally {
      setIssuing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-3 rounded-xl border bg-slate-50 border-slate-200 flex items-center gap-2 text-[11px] font-bold text-slate-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking accessory kit…
      </div>
    );
  }

  const kitStatus = requirement?.kit_status;
  if (!kitStatus || kitStatus === 'NOT_REQUIRED') return null;

  const accessories = requirement?.accessories || [];
  const isIssued = kitStatus === 'ISSUED';
  const isPartial = kitStatus === 'PARTIAL';
  const cardClass = isIssued ? 'bg-violet-50 border-violet-300' : isPartial ? 'bg-rose-50 border-rose-300' : 'bg-slate-50 border-slate-200';
  const StatusIcon = isIssued ? CheckCircle2 : isPartial ? AlertTriangle : XCircle;
  const statusColor = isIssued ? 'text-violet-600' : isPartial ? 'text-rose-600' : 'text-slate-300';
  const statusLabelColor = isIssued ? 'text-violet-700' : isPartial ? 'text-rose-700' : 'text-slate-400';

  return (
    <div className={`p-3 rounded-xl border space-y-1.5 ${cardClass}`}>
      <div className="flex items-center gap-2">
        <StatusIcon className={`w-4 h-4 shrink-0 ${statusColor}`} />
        <div className="text-[10px] font-black uppercase tracking-wider text-violet-700">Accessory Kit</div>
        <span className={`ml-auto text-[10px] font-black uppercase ${statusLabelColor}`}>{isIssued ? 'Issued' : isPartial ? 'Partial' : 'Pending'}</span>
      </div>
      {requirement?.summary_line && <div className="text-[11px] font-bold text-slate-600 pl-6">{requirement.summary_line}</div>}
      {accessories.length > 0 && (
        <div className="text-[11px] font-bold text-slate-600 space-y-0.5 pl-6">
          {accessories.map((a, i) => (
            <div key={a.spec_id || i} className={a.short ? 'text-rose-700' : ''}>
              {a.outstanding > 0 ? `${a.outstanding} outstanding · ` : '✓ '}
              {a.article} {a.colour ? `· ${a.colour}` : ''} {a.size ? `· ${a.size}` : ''}
              {(a.resolution === 'NONE' || a.resolution === 'AMBIGUOUS') ? ' — ⚠ no stock lot' : ''}
            </div>
          ))}
        </div>
      )}
      {error && <div className="text-[10px] font-black text-rose-600 pl-6">{error}</div>}
      <div className="pt-1">
        <button
          type="button"
          onClick={handleIssue}
          disabled={isIssued || issuing || !employee}
          title={!employee ? 'Scan & verify a worker ID above to unlock issuing the kit.' : ''}
          className="w-full h-8 rounded-lg font-black text-[11px] text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer"
        >
          {issuing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PackageCheck className="w-3.5 h-3.5" />}
          {isIssued ? 'Kit Issued' : 'Issue Kit'}
        </button>
      </div>
    </div>
  );
}
