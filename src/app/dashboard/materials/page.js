'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  apiGetMaterialSpec as realApiGetMaterialSpec,
  apiGetMaterialLots as realApiGetMaterialLots,
  apiGetMaterialLot as realApiGetMaterialLot,
  apiCreateMaterialLot as realApiCreateMaterialLot,
  apiPatchMaterialLot as realApiPatchMaterialLot,
  apiAdjustMaterialLot as realApiAdjustMaterialLot,
  apiRetireMaterialLot as realApiRetireMaterialLot,
  apiGetMaterialsStock as realApiGetMaterialsStock,
  apiReceiveMaterials as realApiReceiveMaterials,
  apiCreateSupplierOrder as realApiCreateSupplierOrder,
  apiPatchSupplierOrder as realApiPatchSupplierOrder,
  apiPatchSupplierOrderSpec as realApiPatchSupplierOrderSpec,
} from '@/lib/api';
import {
  Package, Search, Plus, Loader2, CheckCircle2, XCircle, AlertTriangle,
  ChevronRight, X, RefreshCw, Truck, Pencil, Trash2, PackagePlus, Printer,
  Lock, ArrowUpRight, ArrowDownRight, Boxes,
} from 'lucide-react';

/**
 * TEMPORARY MOCK LAYER — the Material Service (api-material.pdf, 18-Aug
 * guide) isn't deployed to this backend yet (GET /drawers/by-code, the
 * sibling 17-Aug-delta endpoint, 404s on this same server — confirmed live).
 * Everything below simulates the exact request/response shapes from that
 * guide so the 5 screens can be built and tested now. Delete this whole
 * block (and switch the `real*` imports above back to their plain names)
 * once the backend confirms these routes are live.
 */
const MOCK_MATERIALS = true;

const CATEGORY_SUBTYPES = {
  LEATHER: [],
  LINING: ['PLAIN_LINING', 'RIBS', 'KNIT'],
  ACCESSORY: ['BUTTON', 'ZIP', 'THREAD', 'OTHER'],
};

// §4 of the guide, verbatim — the per-category/subtype field matrix.
const MATERIAL_SPEC_TABLE = {
  'LEATHER|': { filters: ['article', 'colour', 'thickness'], required_to_add: ['thickness', 'dcm'], quantity_field: 'dcm', uom: 'dcm' },
  'LINING|PLAIN_LINING': { filters: ['article', 'colour', 'thickness'], required_to_add: ['thickness', 'mtrs'], quantity_field: 'mtrs', uom: 'mtrs' },
  'LINING|RIBS': { filters: ['article', 'colour'], required_to_add: ['kg'], quantity_field: 'kg', uom: 'kg' },
  'LINING|KNIT': { filters: ['article', 'colour'], required_to_add: ['pcs'], quantity_field: 'pcs', uom: 'pcs' },
  'ACCESSORY|BUTTON': { filters: ['article', 'colour', 'size'], required_to_add: ['size', 'count'], quantity_field: 'count', uom: 'pcs' },
  'ACCESSORY|ZIP': { filters: ['article', 'colour', 'size'], required_to_add: ['size', 'count'], quantity_field: 'count', uom: 'pcs' },
  'ACCESSORY|THREAD': { filters: ['article', 'colour', 'thickness'], required_to_add: ['thickness', 'mtrs'], quantity_field: 'mtrs', uom: 'mtrs' },
  'ACCESSORY|OTHER': { filters: ['article', 'colour'], required_to_add: ['description', 'count'], quantity_field: 'count', uom: 'pcs' },
};

function lookupSpec(category, subtype) {
  const cat = String(category || '').toUpperCase();
  let st = subtype ? String(subtype).toUpperCase() : '';
  if (cat === 'LEATHER') st = '';
  if (cat === 'LINING' && !st) st = 'PLAIN_LINING';
  const key = `${cat}|${st}`;
  const spec = MATERIAL_SPEC_TABLE[key];
  if (!spec) return { category: cat, subtype: st || null, filters: ['article', 'colour'], required_to_add: [], quantity_field: null, uom: 'unit' };
  return { category: cat, subtype: st || null, ...spec };
}

const _mockSuppliers = [
  { id: 'sup-1', name: 'Anwar Leathers', articles: ['SUEDE-A32', 'NAP-11'] },
  { id: 'sup-2', name: 'Chennai Leather Co.', articles: ['GOAT SUEDE'] },
  { id: 'sup-3', name: 'Textile Hub', articles: ['NYLON TAFFETA'] },
  { id: 'sup-4', name: 'Metal Fittings Ltd', articles: ['SNAP BUTTON', 'YKK ZIP'] },
];
function findSupplierForArticle(article) {
  if (!article) return null;
  const s = _mockSuppliers.find((s) => s.articles.some((a) => a.toUpperCase() === String(article).toUpperCase()));
  return s ? { id: s.id, name: s.name } : null;
}

const _mockLots = new Map(); // lot_id -> lot record
let _lotSeq = 0;

function _seedLot(rec) {
  const lot_id = `mock-lot-${++_lotSeq}`;
  const barcode = `L-${String(_lotSeq).padStart(6, '0')}`;
  const spec = lookupSpec(rec.category, rec.subtype);
  _mockLots.set(lot_id, {
    lot_id, barcode,
    category: rec.category, subtype: rec.subtype || null,
    article: rec.article, colour: rec.colour,
    thickness: rec.thickness ?? null, size: rec.size ?? null,
    uom: spec.uom,
    on_hand: rec.on_hand, reserved: rec.reserved || 0,
    attributes: rec.attributes || {},
    supplier_id: rec.supplier_id || null,
    is_active: true,
  });
}

function _seedMockLots() {
  if (_mockLots.size > 0) return;
  _seedLot({ category: 'LEATHER', subtype: null, article: 'SUEDE-A32', colour: 'WHISKY', thickness: '1.2mm', on_hand: 1500, reserved: 100, attributes: { thickness: '1.2mm', dcm: 1500 }, supplier_id: 'sup-1' });
  _seedLot({ category: 'LEATHER', subtype: null, article: 'NAP-11', colour: 'FOREST', thickness: '0.9mm', on_hand: 300, reserved: 0, attributes: { thickness: '0.9mm', dcm: 300 } });
  _seedLot({ category: 'LINING', subtype: 'PLAIN_LINING', article: 'NYLON TAFFETA', colour: 'NAVY', thickness: '0.3mm', on_hand: 220, reserved: 20, attributes: { thickness: '0.3mm', mtrs: 220 }, supplier_id: 'sup-3' });
  _seedLot({ category: 'LINING', subtype: 'RIBS', article: 'COTTON RIB', colour: 'BLACK', on_hand: 45, reserved: 0, attributes: { kg: 45 } });
  _seedLot({ category: 'LINING', subtype: 'KNIT', article: 'JERSEY KNIT', colour: 'GREY', on_hand: 800, reserved: 50, attributes: { pcs: 800 } });
  _seedLot({ category: 'ACCESSORY', subtype: 'BUTTON', article: 'SNAP BUTTON', colour: 'SILVER', size: '15L', on_hand: 5000, reserved: 200, attributes: { size: '15L', count: 5000 }, supplier_id: 'sup-4' });
  _seedLot({ category: 'ACCESSORY', subtype: 'ZIP', article: 'YKK ZIP', colour: 'BLACK', size: '18IN', on_hand: 30, reserved: 0, attributes: { size: '18IN', count: 30 }, supplier_id: 'sup-4' });
  _seedLot({ category: 'ACCESSORY', subtype: 'THREAD', article: 'POLY THREAD', colour: 'BROWN', thickness: '40s', on_hand: 1200, reserved: 0, attributes: { thickness: '40s', mtrs: 1200 } });
}

function _lotView(lot) {
  const spec = lookupSpec(lot.category, lot.subtype);
  return {
    ...lot,
    available: lot.on_hand - lot.reserved,
    editable_fields: [...new Set([...spec.filters, 'supplier_id'])],
    required_attributes: spec.required_to_add,
  };
}

function _specIdentityMatches(a, b) {
  return a.category === b.category
    && (a.subtype || null) === (b.subtype || null)
    && String(a.article).toUpperCase() === String(b.article).toUpperCase()
    && String(a.colour).toUpperCase() === String(b.colour).toUpperCase()
    && (a.thickness || null) === (b.thickness || null)
    && (a.size || null) === (b.size || null);
}

async function mockApiGetMaterialSpec(token, { category, subtype } = {}) {
  await new Promise((r) => setTimeout(r, 150));
  return lookupSpec(category, subtype);
}

async function mockApiCreateMaterialLot(token, lotData) {
  await new Promise((r) => setTimeout(r, 300));
  _seedMockLots();
  const { category, subtype, article, colour, attributes = {}, supplier_id, supplier_name } = lotData;
  const cat = String(category || '').toUpperCase();
  if (!MATERIAL_SPEC_TABLE[`${cat}|`] && cat !== 'LINING' && cat !== 'ACCESSORY') {
    const err = new Error(`Unknown category '${category}'.`); err.status = 422; throw err;
  }
  if (cat === 'ACCESSORY' && !subtype) {
    const err = new Error('Accessory needs a subtype: BUTTON, ZIP, THREAD or OTHER.'); err.status = 422; throw err;
  }
  if (!article || !colour) {
    const err = new Error(!article ? 'article is required.' : 'colour is required.'); err.status = 422; throw err;
  }
  const spec = lookupSpec(cat, subtype);
  const missing = spec.required_to_add.filter((k) => attributes[k] === undefined || attributes[k] === '' || attributes[k] === null);
  if (missing.length > 0) {
    const err = new Error(`${cat} lot requires: ${spec.required_to_add.join(', ')}. (supplied: ${spec.required_to_add.filter((k) => !missing.includes(k)).join(', ') || 'none'})`);
    err.status = 422; throw err;
  }
  const qty = Number(attributes[spec.quantity_field]);
  if (!qty || qty <= 0) {
    const err = new Error(`${spec.quantity_field} (quantity) must be > 0.`); err.status = 422; throw err;
  }
  const candidate = { category: cat, subtype: cat === 'LEATHER' ? null : (subtype || (cat === 'LINING' ? 'PLAIN_LINING' : null)), article, colour, thickness: attributes.thickness || null, size: attributes.size || null };
  const dupe = Array.from(_mockLots.values()).find((l) => l.is_active && _specIdentityMatches(l, candidate));
  if (dupe) {
    const err = new Error(`A lot for ${article} · ${colour}${candidate.thickness ? ` · ${candidate.thickness}` : ''} already exists (${dupe.on_hand.toFixed(1)} ${dupe.uom} on hand). Material is one lot per spec — add this delivery to it with POST /materials/receive using lot_id=${dupe.lot_id}, rather than creating a second lot.`);
    err.status = 409; throw err;
  }
  const lot_id = `mock-lot-${++_lotSeq}`;
  const barcode = `L-${String(_lotSeq).padStart(6, '0')}`;
  const lot = { lot_id, barcode, ...candidate, uom: spec.uom, on_hand: qty, reserved: 0, attributes, supplier_id: supplier_id || null, supplier_name: supplier_name || null, is_active: true };
  _mockLots.set(lot_id, lot);
  return { lot_id, lot_barcode: barcode, category: lot.category, subtype: lot.subtype, article: lot.article, colour: lot.colour, on_hand: lot.on_hand, reserved: 0, available: lot.on_hand, uom: lot.uom };
}

async function mockApiGetMaterialLots(token, params = {}) {
  await new Promise((r) => setTimeout(r, 200));
  _seedMockLots();
  let lots = Array.from(_mockLots.values()).filter((l) => l.is_active);
  if (params.category) lots = lots.filter((l) => l.category === String(params.category).toUpperCase());
  if (params.subtype) lots = lots.filter((l) => (l.subtype || '') === String(params.subtype).toUpperCase());
  if (params.article) lots = lots.filter((l) => l.article === params.article);
  if (params.colour) lots = lots.filter((l) => l.colour === params.colour);
  if (params.thickness) lots = lots.filter((l) => l.thickness === params.thickness);
  if (params.size) lots = lots.filter((l) => l.size === params.size);
  const required = params.required !== undefined && params.required !== '' ? Number(params.required) : null;
  const items = lots.map((l) => {
    const v = _lotView(l);
    return {
      lot_id: v.lot_id, barcode: v.barcode, category: v.category, subtype: v.subtype,
      article: v.article, colour: v.colour, thickness: v.thickness, size: v.size, uom: v.uom,
      on_hand: v.on_hand, reserved: v.reserved, available: v.available,
      last_used_for_sku: false,
      covers_required: required === null ? null : v.available >= required,
    };
  });
  const options = {
    article: [...new Set(lots.map((l) => l.article))],
    colour: [...new Set(lots.map((l) => l.colour))],
    thickness: [...new Set(lots.map((l) => l.thickness).filter(Boolean))],
    size: [...new Set(lots.map((l) => l.size).filter(Boolean))],
  };
  return { count: items.length, lots: items, options, suggested_lot_id: items[0]?.lot_id || null, required };
}

async function mockApiGetMaterialLot(token, lotId) {
  await new Promise((r) => setTimeout(r, 150));
  _seedMockLots();
  const lot = _mockLots.get(lotId);
  if (!lot) { const err = new Error('Material lot not found.'); err.status = 404; throw err; }
  return _lotView(lot);
}

async function mockApiPatchMaterialLot(token, lotId, payload) {
  await new Promise((r) => setTimeout(r, 250));
  const lot = _mockLots.get(lotId);
  if (!lot) { const err = new Error('Material lot not found.'); err.status = 404; throw err; }
  const allowed = ['article', 'colour', 'thickness', 'size', 'supplier_id'];
  const blocked = Object.keys(payload).filter((k) => !allowed.includes(k));
  if (blocked.length > 0) { const err = new Error(`${blocked.join(', ')} cannot be changed here — retire and recreate for category/subtype/uom, use /adjust for on_hand.`); err.status = 422; throw err; }
  const changes = Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== undefined));
  if (Object.keys(changes).length === 0) { const err = new Error('Nothing to update.'); err.status = 422; throw err; }
  const candidate = { ...lot, ...changes };
  const collide = Array.from(_mockLots.values()).find((l) => l.lot_id !== lotId && l.is_active && _specIdentityMatches(l, candidate));
  if (collide) { const err = new Error(`This spec collides with lot ${collide.lot_id} (${collide.on_hand.toFixed(1)} ${collide.uom} on hand). Merge via receive instead.`); err.status = 409; throw err; }
  Object.assign(lot, changes);
  return _lotView(lot);
}

async function mockApiAdjustMaterialLot(token, lotId, payload) {
  await new Promise((r) => setTimeout(r, 250));
  const lot = _mockLots.get(lotId);
  if (!lot) { const err = new Error('Material lot not found.'); err.status = 404; throw err; }
  const { delta, reason } = payload;
  if (!reason || reason.trim().length < 3 || reason.length > 300) { const err = new Error('Reason must be 3–300 characters.'); err.status = 422; throw err; }
  const d = Number(delta);
  if (!d) { const err = new Error('delta must be a non-zero number.'); err.status = 422; throw err; }
  const newOnHand = lot.on_hand + d;
  if (newOnHand < 0) { const err = new Error(`That would take ${lot.article} to ${newOnHand.toFixed(1)} ${lot.uom}. Stock cannot go negative.`); err.status = 422; throw err; }
  if (newOnHand < lot.reserved) { const err = new Error(`${lot.reserved.toFixed(1)} ${lot.uom} of ${lot.article} is reserved for a cut. Release the reservation first.`); err.status = 409; throw err; }
  lot.on_hand = newOnHand;
  return _lotView(lot);
}

async function mockApiRetireMaterialLot(token, lotId) {
  await new Promise((r) => setTimeout(r, 250));
  const lot = _mockLots.get(lotId);
  if (!lot) { const err = new Error('Material lot not found.'); err.status = 404; throw err; }
  if (lot.reserved > 0) { const err = new Error(`${lot.reserved.toFixed(1)} ${lot.uom} of ${lot.article} is reserved. Release the reservation before retiring.`); err.status = 409; throw err; }
  lot.is_active = false;
  return {
    lot_id: lot.lot_id, is_active: false, barcode_retired: true, on_hand: lot.on_hand,
    history_preserved: true,
    message: `${lot.article} is retired. Its barcode no longer scans (410 Gone) and it is hidden from the lot picker; every cut recorded against it is untouched.`,
  };
}

async function mockApiGetMaterialsStock(token, params = {}) {
  await new Promise((r) => setTimeout(r, 200));
  _seedMockLots();
  let lots = Array.from(_mockLots.values()).filter((l) => l.is_active);
  if (params.category) lots = lots.filter((l) => l.category === String(params.category).toUpperCase());
  if (params.subtype) lots = lots.filter((l) => (l.subtype || '') === String(params.subtype).toUpperCase());
  if (params.article) lots = lots.filter((l) => l.article === params.article);
  if (params.colour) lots = lots.filter((l) => l.colour === params.colour);
  if (params.thickness) lots = lots.filter((l) => l.thickness === params.thickness);
  if (params.size) lots = lots.filter((l) => l.size === params.size);
  const on_hand = lots.reduce((a, l) => a + l.on_hand, 0);
  const reserved = lots.reduce((a, l) => a + l.reserved, 0);
  const available = on_hand - reserved;
  const uom = lots[0]?.uom || (params.category ? lookupSpec(params.category, params.subtype).uom : 'unit');
  const out = {
    category: params.category ? String(params.category).toUpperCase() : null,
    subtype: params.subtype || null,
    article: params.article || null, colour: params.colour || null,
    thickness: params.thickness || null, size: params.size || null,
    uom, on_hand, reserved, available, lot_count: lots.length,
  };
  if (params.required !== undefined && params.required !== '') {
    const required = Number(params.required);
    const short_by = Math.max(0, required - available);
    out.required = required;
    out.short_by = short_by;
    out.suggested_supplier = (short_by > 0 && params.article) ? findSupplierForArticle(params.article) : null;
  }
  return out;
}

async function mockApiReceiveMaterials(token, receiveData) {
  await new Promise((r) => setTimeout(r, 300));
  const { lot_id, supplier_order_id, approved_qty, rejected_qty = 0, reserve_for_required, approve_mismatch } = receiveData;
  const lot = _mockLots.get(lot_id);
  if (!lot) { const err = new Error('Material lot not found.'); err.status = 404; throw err; }
  const order = supplier_order_id ? _mockOrders.get(supplier_order_id) : null;
  if (order && !approve_mismatch) {
    const mismatches = [];
    if (order.article && order.article.toUpperCase() !== lot.article.toUpperCase()) mismatches.push('article');
    if (order.colour && order.colour.toUpperCase() !== lot.colour.toUpperCase()) mismatches.push('colour');
    if (order.thickness && order.thickness !== lot.thickness) mismatches.push('thickness');
    if (order.dcm && lot.attributes?.dcm && Number(order.dcm) !== Number(lot.attributes.dcm)) mismatches.push('dcm');
    if (mismatches.length > 0) {
      const err = new Error(`Received material does not match the order on: ${mismatches.join(', ')}. A DM/MD may accept it as a substitution with approve_mismatch=true.`);
      err.status = 409; err.mismatchFields = mismatches; throw err;
    }
  }
  let targetLot = lot;
  let substituted = false;
  if (order && approve_mismatch) {
    const candidate = {
      category: lot.category, subtype: lot.subtype,
      article: order.article || lot.article, colour: order.colour || lot.colour,
      thickness: order.thickness || lot.thickness, size: lot.size,
    };
    if (!_specIdentityMatches(candidate, lot)) {
      const lot_id2 = `mock-lot-${++_lotSeq}`;
      const barcode2 = `L-${String(_lotSeq).padStart(6, '0')}`;
      targetLot = { lot_id: lot_id2, barcode: barcode2, ...candidate, uom: lot.uom, on_hand: 0, reserved: 0, attributes: { ...lot.attributes }, supplier_id: lot.supplier_id, is_active: true };
      _mockLots.set(lot_id2, targetLot);
      substituted = true;
    }
  }
  targetLot.on_hand += Number(approved_qty) || 0;
  if (reserve_for_required) targetLot.reserved += Number(reserve_for_required);
  if (order) { order.status = 'arrived'; order.arrived_at = new Date().toISOString(); }
  return {
    lot_id: targetLot.lot_id, on_hand: targetLot.on_hand, reserved: targetLot.reserved,
    available: targetLot.on_hand - targetLot.reserved,
    rejected_logged: Number(rejected_qty) || 0,
    supplier_order_status: order?.status || null,
    substituted, mismatch_fields: substituted ? ['article', 'colour', 'thickness'].filter((f) => order[f] && order[f] !== lot[f]) : null,
  };
}

const _mockOrders = new Map();
let _orderSeq = 0;
async function mockApiCreateSupplierOrder(token, orderData) {
  await new Promise((r) => setTimeout(r, 250));
  if (!orderData.qty || Number(orderData.qty) <= 0) { const err = new Error('qty must be > 0.'); err.status = 422; throw err; }
  let supplier = null;
  if (orderData.supplier_id) {
    supplier = _mockSuppliers.find((s) => s.id === orderData.supplier_id);
    if (!supplier) { const err = new Error(`Supplier id '${orderData.supplier_id}' not found.`); err.status = 404; throw err; }
    if (!supplier.articles.some((a) => a.toUpperCase() === String(orderData.article).toUpperCase())) {
      const err = new Error(`Supplier '${supplier.name}' does not supply article '${orderData.article}'. Choose a supplier that carries it.`); err.status = 422; throw err;
    }
  } else {
    supplier = findSupplierForArticle(orderData.article);
  }
  const order_id = `mock-order-${++_orderSeq}`;
  const spec = lookupSpec(orderData.category, orderData.subtype);
  const order = { order_id, status: 'ordered', arrived_at: null, ...orderData, uom: spec.uom, supplier: supplier ? { id: supplier.id, name: supplier.name } : null };
  _mockOrders.set(order_id, order);
  return { order_id, status: 'ordered', article: order.article, qty: Number(order.qty), uom: spec.uom, supplier: order.supplier, supplier_name: order.supplier_name || null };
}
async function mockApiPatchSupplierOrder(token, orderId, status = 'ARRIVED') {
  await new Promise((r) => setTimeout(r, 200));
  const order = _mockOrders.get(orderId);
  if (!order) { const err = new Error('Supplier order not found.'); err.status = 404; throw err; }
  order.status = String(status).toLowerCase();
  order.arrived_at = order.arrived_at || new Date().toISOString();
  return { order_id: orderId, status: order.status, arrived_at: order.arrived_at };
}
async function mockApiPatchSupplierOrderSpec(token, orderId, payload) {
  await new Promise((r) => setTimeout(r, 200));
  const order = _mockOrders.get(orderId);
  if (!order) { const err = new Error('Supplier order not found.'); err.status = 404; throw err; }
  if (order.status !== 'ordered') { const err = new Error("Only an ORDERED order's spec may be edited."); err.status = 409; throw err; }
  Object.assign(order, payload);
  return { order_id: orderId, status: order.status, arrived_at: order.arrived_at };
}

const apiGetMaterialSpec = MOCK_MATERIALS ? mockApiGetMaterialSpec : realApiGetMaterialSpec;
const apiGetMaterialLots = MOCK_MATERIALS ? mockApiGetMaterialLots : realApiGetMaterialLots;
const apiGetMaterialLot = MOCK_MATERIALS ? mockApiGetMaterialLot : realApiGetMaterialLot;
const apiCreateMaterialLot = MOCK_MATERIALS ? mockApiCreateMaterialLot : realApiCreateMaterialLot;
const apiPatchMaterialLot = MOCK_MATERIALS ? mockApiPatchMaterialLot : realApiPatchMaterialLot;
const apiAdjustMaterialLot = MOCK_MATERIALS ? mockApiAdjustMaterialLot : realApiAdjustMaterialLot;
const apiRetireMaterialLot = MOCK_MATERIALS ? mockApiRetireMaterialLot : realApiRetireMaterialLot;
const apiGetMaterialsStock = MOCK_MATERIALS ? mockApiGetMaterialsStock : realApiGetMaterialsStock;
const apiReceiveMaterials = MOCK_MATERIALS ? mockApiReceiveMaterials : realApiReceiveMaterials;
const apiCreateSupplierOrder = MOCK_MATERIALS ? mockApiCreateSupplierOrder : realApiCreateSupplierOrder;
const apiPatchSupplierOrder = MOCK_MATERIALS ? mockApiPatchSupplierOrder : realApiPatchSupplierOrder;
const apiPatchSupplierOrderSpec = MOCK_MATERIALS ? mockApiPatchSupplierOrderSpec : realApiPatchSupplierOrderSpec;
/** END TEMPORARY MOCK LAYER */

// api-material.pdf §2 — the three permission tiers. Build every gate from these.
const STOCK_READERS = ['direct_manager', 'managing_director', 'hr', 'cutting_manager', 'stitching_manager', 'lining_manager', 'security', 'store_manager'];
const LOT_WRITERS = ['direct_manager', 'managing_director', 'cutting_manager', 'lining_manager'];
const DM_ONLY = ['direct_manager', 'managing_director'];

// The safe renderer the guide prescribes for the two 422 shapes.
function errMsg(e) {
  if (!e) return 'Something went wrong.';
  if (Array.isArray(e.detail)) return e.detail.map((d) => d.msg).join(', ');
  return e.message || 'Something went wrong.';
}

function Toast({ msg, type, onClose }) {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [msg, onClose]);
  if (!msg) return null;
  const isSuccess = type !== 'error';
  return (
    <div className="fixed bottom-6 right-6 z-[999999] animate-fade-in max-w-sm">
      <div className={`px-6 py-4 rounded-2xl shadow-2xl font-bold text-sm flex items-start gap-3 border ${isSuccess ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
        {isSuccess ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />}
        <span>{msg}</span>
      </div>
    </div>
  );
}

function Tile({ label, value, uom, primary }) {
  return (
    <div className={`flex-1 min-w-[140px] p-4 rounded-2xl border ${primary ? 'bg-[#c8834a]/10' : 'bg-slate-50'}`} style={{ borderColor: primary ? '#c8834a' : 'rgba(200,131,74,0.15)' }}>
      <div className="text-[10px] font-black uppercase tracking-wider" style={{ color: primary ? '#a86022' : '#9a7a5a' }}>{label}</div>
      <div className={`font-black mt-1 ${primary ? 'text-2xl' : 'text-xl'}`} style={{ color: '#2d1f0e' }}>
        {Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} <span className="text-xs font-bold" style={{ color: '#9a7a5a' }}>{uom}</span>
      </div>
    </div>
  );
}

function CategoryPicker({ category, subtype, onCategory, onSubtype, subtypeRequired }) {
  const subs = CATEGORY_SUBTYPES[category] || [];
  return (
    <div className="flex flex-wrap gap-2">
      <select value={category} onChange={(e) => onCategory(e.target.value)} className="h-10 px-3 bg-white border rounded-xl font-bold text-xs outline-none focus:border-[#c8834a]" style={{ borderColor: 'rgba(200,131,74,0.2)' }}>
        <option value="">Category…</option>
        <option value="LEATHER">LEATHER</option>
        <option value="LINING">LINING</option>
        <option value="ACCESSORY">ACCESSORY</option>
      </select>
      {subs.length > 0 && (
        <select value={subtype} onChange={(e) => onSubtype(e.target.value)} className="h-10 px-3 bg-white border rounded-xl font-bold text-xs outline-none focus:border-[#c8834a]" style={{ borderColor: 'rgba(200,131,74,0.2)' }}>
          <option value="">{subtypeRequired ? 'Subtype (required)…' : 'Subtype (optional → PLAIN_LINING)…'}</option>
          {subs.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      )}
    </div>
  );
}

function LotBadge({ lot }) {
  if (!lot.is_active) return <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-slate-100 text-slate-500 border border-slate-200">RETIRED</span>;
  if (lot.available === 0) return <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-red-50 text-red-600 border border-red-200">ZERO AVAILABLE</span>;
  return null;
}

// ── Screen A — Stock Hub ──────────────────────────────────────────────
function StockHubScreen({ token, showToast, canOrder, onOpenOrder }) {
  const [category, setCategory] = useState('LEATHER');
  const [subtype, setSubtype] = useState('');
  const [spec, setSpec] = useState(null);
  const [filters, setFilters] = useState({ article: '', colour: '', thickness: '', size: '' });
  const [stock, setStock] = useState(null);
  const [required, setRequired] = useState('');
  const [loading, setLoading] = useState(false);
  const [lots, setLots] = useState([]);

  useEffect(() => {
    if (!category) return;
    apiGetMaterialSpec(token, { category, subtype }).then(setSpec).catch(() => setSpec(null));
  }, [token, category, subtype]);

  const runCheck = useCallback(async () => {
    if (!category) return;
    setLoading(true);
    try {
      const params = { category, subtype: subtype || undefined, ...filters };
      if (required !== '') params.required = required;
      Object.keys(params).forEach((k) => { if (!params[k]) delete params[k]; });
      const [stockRes, lotsRes] = await Promise.all([
        apiGetMaterialsStock(token, params),
        apiGetMaterialLots(token, params),
      ]);
      setStock(stockRes);
      setLots(lotsRes.lots || []);
    } catch (e) {
      showToast(errMsg(e), 'error');
    } finally {
      setLoading(false);
    }
  }, [token, category, subtype, filters, required, showToast]);

  useEffect(() => { runCheck(); }, [category, subtype]); // eslint-disable-line react-hooks/exhaustive-deps

  const shortBy = stock?.short_by ?? 0;

  return (
    <div className="space-y-5">
      <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
        <CategoryPicker category={category} subtype={subtype} onCategory={(c) => { setCategory(c); setSubtype(''); }} onSubtype={setSubtype} subtypeRequired={category === 'ACCESSORY'} />
        {spec && spec.filters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {spec.filters.map((f) => (
              <input key={f} placeholder={f[0].toUpperCase() + f.slice(1)} value={filters[f] || ''} onChange={(e) => setFilters((p) => ({ ...p, [f]: e.target.value }))}
                className="h-9 px-3 bg-slate-50 border rounded-lg text-xs font-bold outline-none focus:border-[#c8834a]" style={{ borderColor: 'rgba(200,131,74,0.15)' }} />
            ))}
            <button onClick={runCheck} className="h-9 px-4 rounded-lg font-black text-[10px] uppercase text-white flex items-center gap-1.5" style={{ background: '#c8834a' }}>
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />} Check
            </button>
          </div>
        )}
      </div>

      {stock && (
        <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
          <div className="flex flex-wrap gap-3">
            <Tile label="On Hand" value={stock.on_hand} uom={stock.uom} />
            <Tile label="Reserved" value={stock.reserved} uom={stock.uom} />
            <Tile label="Available" value={stock.available} uom={stock.uom} primary />
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
            <input type="number" placeholder="Required qty…" value={required} onChange={(e) => setRequired(e.target.value)}
              className="h-9 w-40 px-3 bg-slate-50 border rounded-lg text-xs font-bold outline-none focus:border-[#c8834a]" style={{ borderColor: 'rgba(200,131,74,0.15)' }} />
            <button onClick={runCheck} className="h-9 px-4 rounded-lg font-black text-[10px] uppercase text-white" style={{ background: '#c8834a' }}>Check Shortfall</button>
            {stock.required !== undefined && stock.required !== null && (
              shortBy > 0 ? (
                <div className="flex items-center gap-2 ml-auto p-2.5 rounded-xl bg-red-50 border border-red-200">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  <span className="text-xs font-bold text-red-700">Short by {shortBy.toFixed(1)} {stock.uom}</span>
                  {canOrder && (
                    <button onClick={() => onOpenOrder({ category, subtype, article: filters.article, colour: filters.colour, thickness: filters.thickness, qty: shortBy, supplier_id: stock.suggested_supplier?.id })}
                      className="h-8 px-3 rounded-lg font-black text-[10px] uppercase text-white flex items-center gap-1" style={{ background: '#dc2626' }}>
                      <Truck className="w-3.5 h-3.5" /> Order {stock.suggested_supplier ? `via ${stock.suggested_supplier.name}` : ''}
                    </button>
                  )}
                </div>
              ) : (
                <span className="ml-auto text-xs font-bold text-emerald-600 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Covers requirement</span>
              )
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-sm border overflow-hidden" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
        <div className="p-4 border-b font-black text-xs uppercase tracking-wider text-slate-500" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>Matching Lots ({lots.length})</div>
        <div className="divide-y" style={{ borderColor: 'rgba(200,131,74,0.08)' }}>
          {lots.map((l) => (
            <div key={l.lot_id} className="p-3 flex items-center gap-3 text-xs">
              <span className="font-mono font-bold text-slate-500 w-24 shrink-0">{l.barcode}</span>
              <span className="font-black text-slate-800 flex-1 min-w-0 truncate">{l.article} · {l.colour}{l.thickness ? ` · ${l.thickness}` : ''}{l.size ? ` · ${l.size}` : ''}</span>
              <span className={`font-black w-28 text-right ${l.available === 0 ? 'text-red-500' : 'text-slate-700'}`}>{l.available.toFixed(1)} {l.uom} avail</span>
              {l.covers_required === false && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" title="Cannot cover the required qty" />}
            </div>
          ))}
          {lots.length === 0 && <div className="p-6 text-center text-xs font-bold text-slate-400">No lots match these filters.</div>}
        </div>
      </div>
    </div>
  );
}

// ── Screen B — Lot List & Detail ──────────────────────────────────────
function LotDetail({ token, lot, onClose, onChanged, showToast, canEdit, canAdjust, onReceive }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [confirmRetire, setConfirmRetire] = useState(false);
  const [retiring, setRetiring] = useState(false);

  useEffect(() => {
    setForm(Object.fromEntries((lot.editable_fields || []).map((f) => [f, lot[f] ?? ''])));
    setEditing(false); setAdjusting(false); setDelta(''); setReason(''); setConfirmRetire(false);
  }, [lot.lot_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    setSaving(true);
    try {
      const changed = Object.fromEntries(Object.entries(form).filter(([k, v]) => v !== (lot[k] ?? '')));
      await apiPatchMaterialLot(token, lot.lot_id, changed);
      showToast('Lot updated.', 'success');
      setEditing(false);
      onChanged();
    } catch (e) { showToast(errMsg(e), 'error'); } finally { setSaving(false); }
  };

  const handleAdjust = async (sign) => {
    const n = Number(delta);
    if (!n) { showToast('Enter a non-zero amount.', 'error'); return; }
    setAdjusting(true);
    try {
      await apiAdjustMaterialLot(token, lot.lot_id, { delta: sign * Math.abs(n), reason });
      showToast('Stock adjusted.', 'success');
      setDelta(''); setReason('');
      onChanged();
    } catch (e) { showToast(errMsg(e), 'error'); } finally { setAdjusting(false); }
  };

  const handleRetire = async () => {
    setRetiring(true);
    try {
      const res = await apiRetireMaterialLot(token, lot.lot_id);
      showToast(res.message, 'success');
      onChanged();
      onClose();
    } catch (e) { showToast(errMsg(e), 'error'); } finally { setRetiring(false); }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
          <div>
            <div className="font-mono text-[10px] font-bold text-slate-400">{lot.barcode}</div>
            <h3 className="font-black text-lg" style={{ color: '#2d1f0e' }}>{lot.article} · {lot.colour}</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {!lot.is_active && (
            <div className="p-3 rounded-xl bg-slate-100 border border-slate-300 text-xs font-black text-slate-500 flex items-center gap-2">
              <Lock className="w-4 h-4" /> RETIRED — read-only. Barcode no longer scans; cut history is preserved.
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Tile label="On Hand" value={lot.on_hand} uom={lot.uom} />
            <Tile label="Reserved" value={lot.reserved} uom={lot.uom} />
            <Tile label="Available" value={lot.available} uom={lot.uom} primary />
          </div>

          <div className="text-xs font-bold text-slate-500">
            {lot.category}{lot.subtype ? ` / ${lot.subtype}` : ''}{lot.thickness ? ` · ${lot.thickness}` : ''}{lot.size ? ` · ${lot.size}` : ''}
          </div>

          {lot.is_active && canEdit && (
            <div className="p-3 rounded-xl bg-slate-50 border space-y-2" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Identity</span>
                {!editing && <button onClick={() => setEditing(true)} className="text-[10px] font-black uppercase flex items-center gap-1" style={{ color: '#c8834a' }}><Pencil className="w-3 h-3" /> Edit</button>}
              </div>
              {editing ? (
                <>
                  {(lot.editable_fields || []).map((f) => (
                    <div key={f} className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 w-20 shrink-0 capitalize">{f.replace('_', ' ')}</span>
                      <input value={form[f] ?? ''} onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))} className="flex-1 h-8 px-2 border rounded-lg text-xs font-bold" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
                    </div>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <button onClick={handleSave} disabled={saving} className="h-8 px-4 rounded-lg font-black text-[10px] uppercase text-white disabled:opacity-50" style={{ background: '#c8834a' }}>{saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}</button>
                    <button onClick={() => setEditing(false)} className="h-8 px-4 rounded-lg font-black text-[10px] uppercase text-slate-500 bg-slate-100">Cancel</button>
                  </div>
                </>
              ) : (
                <div className="text-xs font-bold text-slate-600">Supplier: {lot.supplier_name || lot.supplier_id || '—'}{lot.supplier_name && lot.supplier_id ? ` (${lot.supplier_id})` : ''}</div>
              )}
            </div>
          )}

          {lot.is_active && canAdjust && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">Adjust Stock — not a total, a movement</span>
              <div className="flex items-center gap-2">
                <input type="number" placeholder="Amount" value={delta} onChange={(e) => setDelta(e.target.value)} className="w-24 h-8 px-2 border rounded-lg text-xs font-bold" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
                <button onClick={() => handleAdjust(1)} disabled={adjusting || !delta || !reason.trim()} className="h-8 px-3 rounded-lg font-black text-[10px] uppercase text-white bg-emerald-500 disabled:opacity-40 flex items-center gap-1"><ArrowUpRight className="w-3.5 h-3.5" /> Add</button>
                <button onClick={() => handleAdjust(-1)} disabled={adjusting || !delta || !reason.trim()} className="h-8 px-3 rounded-lg font-black text-[10px] uppercase text-white bg-red-500 disabled:opacity-40 flex items-center gap-1"><ArrowDownRight className="w-3.5 h-3.5" /> Remove</button>
              </div>
              <input placeholder="Reason (required, 3–300 chars)…" value={reason} onChange={(e) => setReason(e.target.value)} className="w-full h-8 px-2 border rounded-lg text-xs font-bold" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
            </div>
          )}

          {lot.is_active && canAdjust && onReceive && (
            <button onClick={() => onReceive(lot)} className="w-full h-9 rounded-xl font-black text-[10px] uppercase text-white flex items-center justify-center gap-1.5" style={{ background: '#c8834a' }}>
              <PackagePlus className="w-3.5 h-3.5" /> Receive More Stock
            </button>
          )}

          {lot.is_active && canAdjust && (
            confirmRetire ? (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 space-y-2">
                <p className="text-xs font-bold text-red-700">Retire this lot? Its barcode stops scanning; cut history stays. This is not a delete.</p>
                <div className="flex gap-2">
                  <button onClick={handleRetire} disabled={retiring} className="h-8 px-4 rounded-lg font-black text-[10px] uppercase text-white bg-red-600 disabled:opacity-50">{retiring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirm Retire'}</button>
                  <button onClick={() => setConfirmRetire(false)} className="h-8 px-4 rounded-lg font-black text-[10px] uppercase text-slate-500 bg-slate-100">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setConfirmRetire(true)} className="w-full h-9 rounded-xl font-black text-[10px] uppercase text-red-600 bg-red-50 border border-red-200 flex items-center justify-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5" /> Retire Lot
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function LotListScreen({ token, showToast, canEdit, canAdjust, onReceive }) {
  const [category, setCategory] = useState('LEATHER');
  const [subtype, setSubtype] = useState('');
  const [spec, setSpec] = useState(null);
  const [filters, setFilters] = useState({ article: '', colour: '', thickness: '', size: '' });
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    if (!category) return;
    apiGetMaterialSpec(token, { category, subtype }).then(setSpec).catch(() => setSpec(null));
  }, [token, category, subtype]);

  const load = useCallback(async () => {
    if (!category) return;
    setLoading(true);
    try {
      const params = { category, subtype: subtype || undefined, ...filters };
      Object.keys(params).forEach((k) => { if (!params[k]) delete params[k]; });
      const res = await apiGetMaterialLots(token, params);
      setLots(res.lots || []);
    } catch (e) { showToast(errMsg(e), 'error'); } finally { setLoading(false); }
  }, [token, category, subtype, filters, showToast]);

  useEffect(() => { load(); }, [category, subtype]); // eslint-disable-line react-hooks/exhaustive-deps

  const [detailLot, setDetailLot] = useState(null);
  const openDetail = async (lotId) => {
    setSelectedId(lotId);
    try {
      const full = await apiGetMaterialLot(token, lotId);
      setDetailLot(full);
    } catch (e) { showToast(errMsg(e), 'error'); }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
        <CategoryPicker category={category} subtype={subtype} onCategory={(c) => { setCategory(c); setSubtype(''); }} onSubtype={setSubtype} subtypeRequired={category === 'ACCESSORY'} />
        {spec && spec.filters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {spec.filters.map((f) => (
              <input key={f} placeholder={f[0].toUpperCase() + f.slice(1)} value={filters[f] || ''} onChange={(e) => setFilters((p) => ({ ...p, [f]: e.target.value }))}
                className="h-9 px-3 bg-slate-50 border rounded-lg text-xs font-bold outline-none focus:border-[#c8834a]" style={{ borderColor: 'rgba(200,131,74,0.15)' }} />
            ))}
            <button onClick={load} className="h-9 px-4 rounded-lg font-black text-[10px] uppercase text-white flex items-center gap-1.5" style={{ background: '#c8834a' }}>
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />} Search
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl shadow-sm border overflow-hidden" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b text-left text-[10px] font-black uppercase tracking-wider text-slate-400" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
              <th className="p-3">Barcode</th><th className="p-3">Article</th><th className="p-3">Colour</th><th className="p-3">Spec</th>
              <th className="p-3 text-right">On Hand</th><th className="p-3 text-right">Reserved</th><th className="p-3 text-right">Available</th><th className="p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'rgba(200,131,74,0.08)' }}>
            {lots.map((l) => (
              <tr key={l.lot_id} onClick={() => openDetail(l.lot_id)} className={`cursor-pointer hover:bg-amber-50/40 ${selectedId === l.lot_id ? 'bg-amber-50/60' : ''}`}>
                <td className="p-3 font-mono font-bold text-slate-500">{l.barcode}</td>
                <td className="p-3 font-black text-slate-800">{l.article}</td>
                <td className="p-3 text-slate-600">{l.colour}</td>
                <td className="p-3 text-slate-500">{l.thickness || l.size || '—'}</td>
                <td className="p-3 text-right font-bold">{l.on_hand.toFixed(1)}</td>
                <td className="p-3 text-right font-bold text-amber-600">{l.reserved.toFixed(1)}</td>
                <td className={`p-3 text-right font-black ${l.available === 0 ? 'text-red-500' : 'text-emerald-600'}`}>{l.available.toFixed(1)} {l.uom}</td>
                <td className="p-3"><ChevronRight className="w-4 h-4 text-slate-300" /></td>
              </tr>
            ))}
            {lots.length === 0 && !loading && (
              <tr><td colSpan={8} className="p-6 text-center text-xs font-bold text-slate-400">No lots match. Available:0 rows are shown normally here, not hidden.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {detailLot && (
        <LotDetail token={token} lot={detailLot} onClose={() => setDetailLot(null)} showToast={showToast}
          canEdit={canEdit} canAdjust={canAdjust}
          onReceive={onReceive ? (lot) => { onReceive({ lotId: lot.lot_id, article: lot.article }); } : null}
          onChanged={() => { load(); openDetail(detailLot.lot_id); }} />
      )}
    </div>
  );
}

// ── Screen C — Add New Material ───────────────────────────────────────
function AddMaterialScreen({ token, showToast, onDuplicate }) {
  const [category, setCategory] = useState('');
  const [subtype, setSubtype] = useState('');
  const [spec, setSpec] = useState(null);
  const [article, setArticle] = useState('');
  const [colour, setColour] = useState('');
  const [attrs, setAttrs] = useState({});
  const [supplierId, setSupplierId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!category) { setSpec(null); return; }
    if (category === 'ACCESSORY' && !subtype) { setSpec(null); return; }
    apiGetMaterialSpec(token, { category, subtype }).then(setSpec).catch(() => setSpec(null));
  }, [token, category, subtype]);

  const canSubmit = spec && spec.required_to_add.length >= 0 && article.trim() && colour.trim()
    && spec.required_to_add.every((k) => attrs[k] !== undefined && attrs[k] !== '');

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await apiCreateMaterialLot(token, {
        category, subtype: subtype || undefined, article: article.trim(), colour: colour.trim(),
        attributes: attrs, supplier_id: supplierId || undefined,
        // supplier_name isn't in the API guide yet — the backend team said
        // they'll add it later. Sent alongside supplier_id so it's captured
        // now; harmless extra field until the backend recognizes it.
        supplier_name: supplierName || undefined,
      });
      setResult(res);
    } catch (e) {
      if (e.status === 409) {
        showToast(errMsg(e), 'error');
        if (onDuplicate) onDuplicate({ category, subtype, article, colour, thickness: attrs.thickness, size: attrs.size });
      } else {
        showToast(errMsg(e), 'error');
      }
    } finally { setSubmitting(false); }
  };

  if (result) {
    return (
      <div className="bg-white p-8 rounded-3xl shadow-sm border text-center space-y-4 max-w-md mx-auto" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
        <h3 className="font-black text-lg" style={{ color: '#2d1f0e' }}>Lot Created</h3>
        <div className="p-4 rounded-2xl bg-slate-50 border font-mono text-2xl font-black tracking-wider" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>{result.lot_barcode}</div>
        <p className="text-xs font-bold text-slate-500">{result.article} · {result.colour} — {result.on_hand} {result.uom} on hand</p>
        <div className="flex gap-2 justify-center">
          <button onClick={() => window.print()} className="h-10 px-5 rounded-xl font-black text-xs uppercase text-white flex items-center gap-2" style={{ background: '#c8834a' }}><Printer className="w-4 h-4" /> Print Label</button>
          <button onClick={() => { setResult(null); setCategory(''); setSubtype(''); setArticle(''); setColour(''); setAttrs({}); setSupplierId(''); setSupplierName(''); }} className="h-10 px-5 rounded-xl font-black text-xs uppercase text-slate-600 bg-slate-100">Add Another</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border space-y-5 max-w-xl mx-auto" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
      <div>
        <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Step 1 — Class</div>
        <CategoryPicker category={category} subtype={subtype} onCategory={(c) => { setCategory(c); setSubtype(''); setAttrs({}); }} onSubtype={(s) => { setSubtype(s); setAttrs({}); }} subtypeRequired={category === 'ACCESSORY'} />
      </div>

      {spec && (
        <div className="space-y-3 pt-4 border-t" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Step 2 — Fields</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400">Article *</label>
              <input value={article} onChange={(e) => setArticle(e.target.value)} className="w-full h-9 px-3 border rounded-lg text-xs font-bold mt-1" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400">Colour *</label>
              <input value={colour} onChange={(e) => setColour(e.target.value)} className="w-full h-9 px-3 border rounded-lg text-xs font-bold mt-1" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
            </div>
            {spec.required_to_add.map((k) => (
              <div key={k}>
                <label className="text-[10px] font-bold text-slate-400 capitalize">
                  {k}{k === spec.quantity_field ? ` (${spec.uom}) *` : ' *'}
                </label>
                <input type={k === spec.quantity_field ? 'number' : 'text'} value={attrs[k] ?? ''} onChange={(e) => setAttrs((p) => ({ ...p, [k]: e.target.value }))}
                  className="w-full h-9 px-3 border rounded-lg text-xs font-bold mt-1" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
              </div>
            ))}
            <div>
              <label className="text-[10px] font-bold text-slate-400">Supplier ID (optional)</label>
              <input value={supplierId} onChange={(e) => setSupplierId(e.target.value)} placeholder="leave blank if unknown" className="w-full h-9 px-3 border rounded-lg text-xs font-bold mt-1" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400">Supplier Name (optional)</label>
              <input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="not in the API guide yet — backend adding it later" className="w-full h-9 px-3 border rounded-lg text-xs font-bold mt-1" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
            </div>
          </div>
          {spec.required_to_add.length === 0 && (
            <p className="text-[11px] font-bold text-amber-600">This category/subtype combination isn&apos;t configured yet — submit is blocked.</p>
          )}
          <button onClick={handleSubmit} disabled={!canSubmit || submitting} className="w-full h-11 rounded-xl font-black text-xs uppercase text-white disabled:opacity-40 flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackagePlus className="w-4 h-4" />} Create Lot
          </button>
        </div>
      )}
    </div>
  );
}

// ── Screen D — Receiving ──────────────────────────────────────────────
function ReceivingScreen({ token, showToast, prefill }) {
  const [lotId, setLotId] = useState(prefill?.lotId || '');
  const [lot, setLot] = useState(null);
  const [approvedQty, setApprovedQty] = useState('');
  const [rejectedQty, setRejectedQty] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [reserveFor, setReserveFor] = useState('');
  const [supplierOrderId, setSupplierOrderId] = useState(prefill?.orderId || '');
  const [submitting, setSubmitting] = useState(false);
  const [mismatch, setMismatch] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (prefill?.lotId) setLotId(prefill.lotId);
    if (prefill?.orderId) setSupplierOrderId(prefill.orderId);
  }, [prefill]);

  useEffect(() => {
    if (!lotId) { setLot(null); return; }
    apiGetMaterialLot(token, lotId).then(setLot).catch(() => setLot(null));
  }, [token, lotId]);

  const submit = async (approveMismatch = false) => {
    setSubmitting(true);
    try {
      const payload = { lot_id: lotId, approved_qty: Number(approvedQty), rejected_qty: Number(rejectedQty) || 0 };
      if (supplierOrderId) payload.supplier_order_id = supplierOrderId;
      if (reserveFor) payload.reserve_for_required = Number(reserveFor);
      if (approveMismatch) payload.approve_mismatch = true;
      const res = await apiReceiveMaterials(token, payload);
      setMismatch(null);
      setResult(res);
      if (res.lot_id !== lotId) {
        const fresh = await apiGetMaterialLot(token, res.lot_id);
        setLot(fresh);
      }
      showToast(res.substituted ? 'Received into a substitute lot.' : 'Stock received.', 'success');
    } catch (e) {
      if (e.status === 409 && e.mismatchFields) {
        setMismatch(e);
      } else {
        showToast(errMsg(e), 'error');
      }
    } finally { setSubmitting(false); }
  };

  if (result) {
    return (
      <div className="bg-white p-8 rounded-3xl shadow-sm border text-center space-y-3 max-w-md mx-auto" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
        {result.substituted ? (
          <>
            <h3 className="font-black text-lg text-amber-700">Received Into a Substitute Lot</h3>
            <p className="text-xs font-bold text-slate-500">The delivery didn&apos;t match the original lot&apos;s spec on {result.mismatch_fields?.join(', ')}. A new lot ({result.lot_id}) now holds it.</p>
          </>
        ) : (
          <h3 className="font-black text-lg" style={{ color: '#2d1f0e' }}>Stock Received</h3>
        )}
        <p className="text-xs font-bold text-slate-600">On hand: {result.on_hand} · Available: {result.available}{result.rejected_logged > 0 ? ` · Rejected logged: ${result.rejected_logged}` : ''}</p>
        <button onClick={() => { setResult(null); setLotId(''); setApprovedQty(''); setRejectedQty(''); setSupplierOrderId(''); }} className="h-10 px-5 rounded-xl font-black text-xs uppercase text-white" style={{ background: '#c8834a' }}>Receive Another</button>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border space-y-4 max-w-xl mx-auto" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
      <div>
        <label className="text-[10px] font-bold text-slate-400">Target Lot (lot_id, or paste one from the Lot List)</label>
        <input value={lotId} onChange={(e) => setLotId(e.target.value)} className="w-full h-9 px-3 border rounded-lg text-xs font-bold font-mono mt-1" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
        {lot && <p className="text-[11px] font-bold text-slate-500 mt-1">{lot.article} · {lot.colour} — currently {lot.on_hand} {lot.uom} on hand, {lot.available} available</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold text-emerald-600">Approved Qty (adds to stock)</label>
          <input type="number" value={approvedQty} onChange={(e) => setApprovedQty(e.target.value)} className="w-full h-9 px-3 border rounded-lg text-xs font-bold mt-1" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
        </div>
        <div>
          <label className="text-[10px] font-bold text-red-500">Rejected Qty (logged only, never stock)</label>
          <input type="number" value={rejectedQty} onChange={(e) => setRejectedQty(e.target.value)} className="w-full h-9 px-3 border rounded-lg text-xs font-bold mt-1" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold text-slate-400">Supplier Order ID (optional — matches against a PO)</label>
        <input value={supplierOrderId} onChange={(e) => setSupplierOrderId(e.target.value)} className="w-full h-9 px-3 border rounded-lg text-xs font-bold font-mono mt-1" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
      </div>

      <button onClick={() => setShowAdvanced((s) => !s)} className="text-[10px] font-black uppercase text-slate-400">{showAdvanced ? '− Hide' : '+'} Advanced</button>
      {showAdvanced && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
          <label className="text-[10px] font-bold text-amber-700">Reserve for requirement (no release endpoint yet — use sparingly, a reserved lot can&apos;t be adjusted or retired until it&apos;s released)</label>
          <input type="number" value={reserveFor} onChange={(e) => setReserveFor(e.target.value)} className="w-full h-9 px-3 border rounded-lg text-xs font-bold mt-1" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
        </div>
      )}

      {mismatch && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 space-y-2">
          <p className="text-xs font-bold text-red-700">{mismatch.message}</p>
          <div className="flex gap-2">
            <button onClick={() => submit(true)} disabled={submitting} className="h-9 px-4 rounded-lg font-black text-[10px] uppercase text-white bg-red-600">Accept as Substitution</button>
            <button onClick={() => setMismatch(null)} className="h-9 px-4 rounded-lg font-black text-[10px] uppercase text-slate-500 bg-slate-100">Cancel</button>
          </div>
        </div>
      )}

      <button onClick={() => submit(false)} disabled={submitting || !lotId || !approvedQty} className="w-full h-11 rounded-xl font-black text-xs uppercase text-white disabled:opacity-40 flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}>
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackagePlus className="w-4 h-4" />} Receive Stock
      </button>
    </div>
  );
}

// ── Screen E — Supplier Orders ────────────────────────────────────────
function SupplierOrdersScreen({ token, showToast, prefill, onArrived }) {
  const [orders, setOrders] = useState([]);
  const [category, setCategory] = useState(prefill?.category || 'LEATHER');
  const [subtype, setSubtype] = useState(prefill?.subtype || '');
  const [article, setArticle] = useState(prefill?.article || '');
  const [colour, setColour] = useState(prefill?.colour || '');
  const [thickness, setThickness] = useState(prefill?.thickness || '');
  const [dcm, setDcm] = useState('');
  const [qty, setQty] = useState(prefill?.qty || '');
  const [supplierId, setSupplierId] = useState(prefill?.supplier_id || '');
  const [supplierName, setSupplierName] = useState(prefill?.supplier_name || '');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!prefill) return;
    setCategory(prefill.category || 'LEATHER'); setSubtype(prefill.subtype || ''); setArticle(prefill.article || '');
    setColour(prefill.colour || ''); setThickness(prefill.thickness || ''); setQty(prefill.qty || ''); setSupplierId(prefill.supplier_id || '');
    setSupplierName(prefill.supplier_name || '');
  }, [prefill]);

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      const res = await apiCreateSupplierOrder(token, {
        category, subtype: subtype || undefined, article, colour: colour || undefined,
        thickness: thickness || undefined, dcm: dcm || undefined, qty: Number(qty), supplier_id: supplierId || undefined,
        // supplier_name isn't in the API guide yet — backend team said they'll
        // add it later. Sent alongside supplier_id so it's captured now.
        supplier_name: supplierName || undefined,
      });
      showToast(`Order raised for ${res.article}${res.supplier ? ` via ${res.supplier.name}` : ' — no supplier assigned yet'}.`, 'success');
      setOrders((prev) => [{ ...res, status: 'ordered', arrived_at: null }, ...prev]);
      setArticle(''); setColour(''); setThickness(''); setDcm(''); setQty(''); setSupplierId(''); setSupplierName('');
    } catch (e) { showToast(errMsg(e), 'error'); } finally { setSubmitting(false); }
  };

  const markArrived = async (order) => {
    try {
      const res = await apiPatchSupplierOrder(token, order.order_id, 'ARRIVED');
      setOrders((prev) => prev.map((o) => (o.order_id === order.order_id ? { ...o, status: 'arrived', arrived_at: res.arrived_at } : o)));
      showToast('Marked arrived.', 'success');
    } catch (e) { showToast(errMsg(e), 'error'); }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white p-6 rounded-3xl shadow-sm border space-y-4 max-w-xl" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
        <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Raise Supplier Order</div>
        <CategoryPicker category={category} subtype={subtype} onCategory={(c) => { setCategory(c); setSubtype(''); }} onSubtype={setSubtype} subtypeRequired={false} />
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Article *" value={article} onChange={(e) => setArticle(e.target.value)} className="h-9 px-3 border rounded-lg text-xs font-bold" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
          <input placeholder="Colour (leave blank = any)" value={colour} onChange={(e) => setColour(e.target.value)} className="h-9 px-3 border rounded-lg text-xs font-bold" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
          <input placeholder="Thickness (leave blank = any)" value={thickness} onChange={(e) => setThickness(e.target.value)} className="h-9 px-3 border rounded-lg text-xs font-bold" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
          <input type="number" placeholder="dcm (leave blank = any)" value={dcm} onChange={(e) => setDcm(e.target.value)} className="h-9 px-3 border rounded-lg text-xs font-bold" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
          <input type="number" placeholder="Qty *" value={qty} onChange={(e) => setQty(e.target.value)} className="h-9 px-3 border rounded-lg text-xs font-bold" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
          <input placeholder="Supplier ID (optional)" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="h-9 px-3 border rounded-lg text-xs font-bold" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
          <input placeholder="Supplier Name (optional)" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} className="h-9 px-3 border rounded-lg text-xs font-bold" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
        </div>
        <p className="text-[11px] font-bold text-amber-600">Fields you fill here are checked against the delivery. Leave a field blank if any value is acceptable.</p>
        <p className="text-[11px] font-bold text-slate-400">No supplier directory yet — leave Supplier ID/Name blank to let the backend suggest one from the article, or a DM/MD assigns it later. Supplier Name isn&apos;t in the API guide yet; the backend team said they&apos;ll add it.</p>
        <button onClick={handleCreate} disabled={submitting || !article || !qty} className="w-full h-11 rounded-xl font-black text-xs uppercase text-white disabled:opacity-40 flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}>
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />} Raise Order
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border overflow-hidden" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
        <div className="p-4 border-b font-black text-xs uppercase tracking-wider text-slate-500 flex items-center justify-between" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
          <span>This Session&apos;s Orders</span>
          <span className="text-[10px] font-bold text-slate-400 normal-case">No list endpoint exists yet — orders raised elsewhere won&apos;t appear here until the backend adds one.</span>
        </div>
        <div className="divide-y" style={{ borderColor: 'rgba(200,131,74,0.08)' }}>
          {orders.map((o) => (
            <div key={o.order_id} className="p-3 flex items-center gap-3 text-xs">
              <span className={`px-2 py-1 rounded-md text-[9px] font-black shrink-0 ${o.status === 'arrived' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>{o.status.toUpperCase()}</span>
              <span className="font-black text-slate-800 flex-1 min-w-0 truncate">{o.article} · {o.qty} {o.uom}{(o.supplier_name || o.supplier?.name) ? ` · ${o.supplier_name || o.supplier.name}` : ' · no supplier'}</span>
              {o.status === 'ordered' ? (
                <button onClick={() => markArrived(o)} className="h-8 px-3 rounded-lg font-black text-[10px] uppercase text-white" style={{ background: '#c8834a' }}>Mark Arrived</button>
              ) : (
                <button onClick={() => onArrived({ orderId: o.order_id, article: o.article })} className="h-8 px-3 rounded-lg font-black text-[10px] uppercase text-white bg-emerald-500">Receive</button>
              )}
            </div>
          ))}
          {orders.length === 0 && <div className="p-6 text-center text-xs font-bold text-slate-400">No orders raised this session yet.</div>}
        </div>
      </div>
    </div>
  );
}

// ── Page shell ─────────────────────────────────────────────────────────
const SCREENS = [
  { id: 'hub', label: 'Stock Hub', icon: Boxes },
  { id: 'lots', label: 'Lots', icon: Package },
  { id: 'add', label: 'Add Material', icon: Plus, writersOnly: true },
  { id: 'receive', label: 'Receiving', icon: PackagePlus, dmOnly: true },
  { id: 'orders', label: 'Supplier Orders', dmOnly: true, icon: Truck },
];

export default function MaterialsPage() {
  const { user, token } = useAuth();
  const [screen, setScreen] = useState('hub');
  const [toast, setToast] = useState(null);
  const [receivePrefill, setReceivePrefill] = useState(null);
  const [orderPrefill, setOrderPrefill] = useState(null);

  const showToast = useCallback((msg, type) => setToast({ msg, type }), []);

  const isReader = STOCK_READERS.includes(user);
  const isWriter = LOT_WRITERS.includes(user);
  const isDmOnly = DM_ONLY.includes(user);

  if (!token) {
    return (
      <div className="max-w-2xl mx-auto pt-12 text-center">
        <div className="p-8 bg-white border border-amber-100 shadow-xl rounded-3xl space-y-4">
          <Lock className="w-14 h-14 text-amber-400 mx-auto" />
          <h1 className="text-2xl font-black text-slate-800">Login Required</h1>
        </div>
      </div>
    );
  }

  if (!isReader) {
    return (
      <div className="max-w-2xl mx-auto pt-12 text-center">
        <div className="p-8 bg-white border border-amber-100 shadow-xl rounded-3xl space-y-4">
          <Lock className="w-14 h-14 text-amber-400 mx-auto" />
          <h1 className="text-2xl font-black text-slate-800">Access Restricted</h1>
          <p className="text-sm font-bold text-slate-400">Material stock is visible to DM, MD, HR, Cutting, Lining, Stitching, Store and Security roles.</p>
        </div>
      </div>
    );
  }

  const visibleScreens = SCREENS.filter((s) => (!s.writersOnly || isWriter) && (!s.dmOnly || isDmOnly));

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      <Toast msg={toast?.msg} type={toast?.type} onClose={() => setToast(null)} />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-2" style={{ color: '#2d1f0e' }}><Package className="w-7 h-7" style={{ color: '#c8834a' }} /> Material Stock</h1>
          <p className="font-medium mt-1 text-sm" style={{ color: '#9a7a5a' }}>Lots, receiving and supplier orders — the human-driven stock system, not the BOM-driven inventory module.</p>
        </div>
        {MOCK_MATERIALS && (
          <span className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-700 border border-amber-300 flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3" /> Mock data — backend not deployed yet
          </span>
        )}
      </div>

      <div className="flex gap-2 flex-wrap border-b pb-3" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
        {visibleScreens.map((s) => {
          const Icon = s.icon;
          const active = screen === s.id;
          return (
            <button key={s.id} onClick={() => setScreen(s.id)}
              className={`h-10 px-4 rounded-xl font-black text-xs uppercase flex items-center gap-2 transition-all ${active ? 'text-white shadow-sm' : 'text-slate-500 bg-slate-50'}`}
              style={active ? { background: '#c8834a' } : {}}>
              <Icon className="w-4 h-4" /> {s.label}
            </button>
          );
        })}
      </div>

      {screen === 'hub' && (
        <StockHubScreen token={token} showToast={showToast} canOrder={isDmOnly}
          onOpenOrder={(prefill) => { setOrderPrefill(prefill); setScreen('orders'); }} />
      )}
      {screen === 'lots' && (
        <LotListScreen token={token} showToast={showToast} canEdit={isWriter} canAdjust={isDmOnly}
          onReceive={isDmOnly ? (p) => { setReceivePrefill(p); setScreen('receive'); } : null} />
      )}
      {screen === 'add' && isWriter && (
        <AddMaterialScreen token={token} showToast={showToast}
          onDuplicate={(spec) => { setScreen('lots'); showToast(`Search ${spec.article} · ${spec.colour} in Lots, then use "Receive More Stock" on it.`, 'error'); }} />
      )}
      {screen === 'receive' && isDmOnly && (
        <ReceivingScreen token={token} showToast={showToast} prefill={receivePrefill} />
      )}
      {screen === 'orders' && isDmOnly && (
        <SupplierOrdersScreen token={token} showToast={showToast} prefill={orderPrefill}
          onArrived={(p) => { setReceivePrefill(p); setScreen('receive'); }} />
      )}
    </div>
  );
}
