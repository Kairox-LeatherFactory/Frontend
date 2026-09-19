// Real API & Persisted Mock Hybrid Service for KairoX Procurement Intelligence
// Integrated with Stage 1 (Intake), Stage 2/3 (BOM), Stage 4 (Inventory), and Stage 5 (Supplier POs) live endpoints.

import {
  MOCK_IDS,
  MOCK_INVENTORY_CHECK_CLERMONT,
  MOCK_INVENTORY_ITEMS,
  MOCK_SUPPLIERS,
  MOCK_POS,
  MOCK_PRODUCTION_BOARD
} from './mockDataPack';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';
const V1 = '/api/v1';

const IDS = {
  user_md: '9e1c4a70-0b2d-4c8e-9f11-6a2b3c4d5e6f',
  submission: 'a3f2b8c1-4d5e-6f70-8192-a3b4c5d6e7f8',
  order_doc: 'b1c2d3e4-5f60-7182-93a4-b5c6d7e8f901',
  spec_doc: 'e5f60718-293a-4b5c-6d7e-8f90a1b2c3d4',
  style_clermont: '4b5c6d7e-8f90-0112-2334-4556677889900',
  style_carnaby: '5c6d7e8f-9001-1223-3445-566778899001',
  bom_clermont: '11223344-5566-7788-99aa-bbccddeeff00',
  bom_carnaby: '22334455-6677-8899-aabb-ccddeeff0011',
  check_clermont: 'cc001122-3344-5566-7788-99aabbccddee',
  check_carnaby: 'dd112233-4455-6677-8899-aabbccddeeff',
  sup_sn: 'e0001111-2222-3333-4444-555566667777',
  sup_zip: 'e0002222-3333-4444-5555-666677778888',
  sup_ameen: 'e0003333-4444-5555-6666-777788889999',
  sup_textile: 'e0004444-5555-6666-7777-888899990000',
  sup_lining: 'e0005555-6666-7777-8888-99990000aaaa',
  po_resolved: '99887766-5544-3322-1100-ffeeddccbbaa',
  po_needs: '88776655-4433-2211-00ff-eeddccbbaa99',
  po_item_suede: 'f0001111-2222-3333-4444-555566667777',
  po_item_lining: 'f0002222-3333-4444-5555-666677778888',
  track_clermont: 'd0001111-2222-3333-4444-555566667777',
  track_carnaby: 'd0002222-3333-4444-5555-666677778888',
  notif_bom: 'ee223344-5566-7788-99aa-bbccddeeff00',
  notif_po: 'ff334455-6677-8899-aabb-ccddeeff0011',
};

const key = 'kairox_procurement_mock_v5';
const now = () => new Date().toISOString();
const clone = x => JSON.parse(JSON.stringify(x));
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Helper for HTTP requests
async function http(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let json;
    try { json = JSON.parse(text); } catch { }
    const err = new Error(json?.detail?.message || json?.detail || json?.error || text || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return res.json();
}

// Client API call
export async function apiGetClients(token) {
  try {
    return await http(`${V1}/clients`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (e) {
    return [
      { id: 'client-boggi-001', name: 'BOGGI MILANO', country: 'Italy', code: 'BOG' },
      { id: 'client-armani-002', name: 'ARMANI EXCHANGE', country: 'Italy', code: 'AX' },
      { id: 'client-hugo-003', name: 'HUGO BOSS', country: 'Germany', code: 'HB' }
    ];
  }
}

// --- Mock state store ---
const BREAKDOWN_READY = {
  submission_id: IDS.submission,
  status: 'ready',
  warnings: [],
  styles: [
    {
      id: IDS.style_clermont, style_signature: 'CLERMONT', style_name: 'CLERMONT', material: 'SHEEP GLASS', qty: 60,
      per_size_qty: { 46: 10, 48: 20, 50: 20, 52: 10 },
      colors: [
        { color_key: 'BLACK', color_label: 'NERO / BLACK', qty: 40, per_size_qty: { 46: 6, 48: 14, 50: 14, 52: 6 }, warnings: [] },
        { color_key: 'COGNAC', color_label: 'COGNAC', qty: 20, per_size_qty: { 46: 4, 48: 6, 50: 6, 52: 4 }, warnings: [] }
      ], warnings: [], spec_document_id: IDS.spec_doc, spec_match_status: 'suggested',
      pattern_reference_id: 'f6071829-3a4b-5c6d-7e8f-90a1b2c3d4e5', dxf_match_status: 'suggested', bom_id: null
    },
    {
      id: IDS.style_carnaby, style_signature: 'CARNABY', style_name: 'CARNABY', material: 'GOAT SUEDE', qty: 40,
      per_size_qty: { 48: 15, 50: 15, 52: 10 },
      colors: [{ color_key: 'TAUPE', color_label: 'TAUPE', qty: 40, per_size_qty: { 48: 15, 50: 15, 52: 10 }, warnings: [] }],
      warnings: ['size_column_ambiguous'], spec_document_id: null, spec_match_status: 'none',
      pattern_reference_id: '1829304b-5c6d-7e8f-90a1-b2c3d4e5f607', dxf_match_status: 'confirmed', bom_id: null
    }
  ]
};

const BOM_ITEMS = [
  { id: 'aa000001-0000-0000-0000-000000000001', category: 'main_material', name: 'SHEEP GLASS', material_color: 'BLACK', qty_per_garment: 34.5, uom: 'dm2', unit_price: 1.8, bulk_qty: 2070, total_cost: 62.1, dcm_source: 'template', dcm_confidence: .95, annotation: null },
  { id: 'aa000001-0000-0000-0000-000000000002', category: 'sub_material', name: 'GOAT SUEDE', material_color: 'BLACK', qty_per_garment: 2.6, uom: 'dm2', unit_price: 2.1, bulk_qty: 156, total_cost: 5.46, dcm_source: 'ai_estimate', dcm_confidence: .5, annotation: 'estimated from POM area — confirm at cutting' },
  { id: 'aa000001-0000-0000-0000-000000000003', category: 'lining', name: 'VISCOSE LINING', material_color: 'BLACK', qty_per_garment: 1.2, uom: 'mtr', unit_price: 3.4, bulk_qty: 72, total_cost: 4.08, dcm_source: 'similar_style', dcm_confidence: .7, annotation: null },
  { id: 'aa000001-0000-0000-0000-000000000004', category: 'thread', name: 'POLY THREAD 40/2', material_color: 'BLACK', qty_per_garment: 120, uom: 'mtr', unit_price: .01, bulk_qty: 7200, total_cost: 1.2, dcm_source: null, dcm_confidence: null, annotation: null },
  { id: 'aa000001-0000-0000-0000-000000000005', category: 'accessory', name: 'YKK ZIP #5 60CM', material_color: 'BLACK', qty_per_garment: 1, uom: 'pcs', unit_price: 1.41, bulk_qty: 60, total_cost: 1.41, dcm_source: null, dcm_confidence: null, annotation: null },
  { id: 'aa000001-0000-0000-0000-000000000006', category: 'manufacturing', name: 'CUTTING + STITCHING', material_color: null, qty_per_garment: 1, uom: null, unit_price: 30, bulk_qty: 60, total_cost: 30, dcm_source: null, dcm_confidence: null, annotation: null },
  { id: 'aa000001-0000-0000-0000-000000000007', category: 'packaging', name: 'POLYBAG + CARTON', material_color: null, qty_per_garment: 1, uom: null, unit_price: 3, bulk_qty: 60, total_cost: 3, dcm_source: null, dcm_confidence: null, annotation: null },
  { id: 'aa000001-0000-0000-0000-000000000008', category: 'fob_charge', name: 'FOB CHARGE', material_color: null, qty_per_garment: 1, uom: null, unit_price: 5, bulk_qty: 60, total_cost: 5, dcm_source: null, dcm_confidence: null, annotation: null },
];

const BOM_BASE = {
  id: IDS.bom_clermont, status: 'draft', revision: 1, currency: 'USD', order_qty: 60, garment_fob_price: 107.25, bulk_total: 6435,
  cutting_confirmed_at: null, approved_at: null, rejection_reason: null, export_document_id: null, exported_at: null, items: BOM_ITEMS
};

const freshState = () => ({
  submission: { submission_id: IDS.submission, status: 'open', order_sheet: null, spec_sheet: null },
  breakdown: null, breakdownPolls: 0, boms: { [IDS.bom_clermont]: clone(BOM_BASE) },
  inventoryChecks: {
    [IDS.check_clermont]: clone(MOCK_INVENTORY_CHECK_CLERMONT)
  },
  inventoryItems: clone(MOCK_INVENTORY_ITEMS),
  pos: MOCK_POS.reduce((acc, po) => { acc[po.id] = clone(po); return acc; }, {}),
  suppliers: clone(MOCK_SUPPLIERS),
  notifications: [
    { id: IDS.notif_bom, type: 'bom_review', title: 'BOM ready for MD review', message: 'CLERMONT BOM is ready for approval.', read: false, created_at: now() },
    { id: IDS.notif_po, type: 'po_approval', title: 'PO awaiting approval', message: 'A supplier PO needs cross-check approval.', read: false, created_at: now() }
  ],
  trackers: clone(MOCK_PRODUCTION_BOARD)
});

function loadStore() {
  if (typeof window === 'undefined') return freshState();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return freshState();
    const parsed = JSON.parse(raw);
    if (!parsed.inventoryItems || !parsed.suppliers || parsed.suppliers.length === 0 || Object.keys(parsed.pos || {}).length === 0 || !parsed.pos[IDS.po_needs]) {
      const fresh = freshState();
      saveStore(fresh);
      return fresh;
    }
    return parsed;
  } catch {
    const fresh = freshState();
    saveStore(fresh);
    return fresh;
  }
}
function saveStore(s) { if (typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify(s)); }

export async function apiLogin(phone = '9876543210', password = 'password') { await sleep(200); return { access_token: 'mock.jwt.token', token_type: 'bearer' }; }
export async function apiMe() { return { id: IDS.user_md, name: 'Tanveer Ahmed', phone: '9000000001', email: 'tanveer@ptexports.com', role: 'managing_director', is_active: true }; }

// --- Stage 1: Intake (Live + Fallback) ---
export async function apiOpenSubmission(token, clientId = null) {
  // Bypassing real API for now as requested
  try {
    const res = await http(`${V1}/procurement/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ client_id: clientId })
    });
    if (res?.submission_id || res?.id) {
      const realId = res.submission_id || res.id;
      const s = loadStore();
      s.submission = { ...s.submission, submission_id: realId, status: 'open', client_id: clientId };
      saveStore(s);
    }
    return res;
  } catch (e) {
  }
  
  const s = loadStore();
  s.submission = { ...s.submission, submission_id: IDS.submission, status: 'open', client_id: clientId };
  saveStore(s);
  await sleep(150);
  return { submission_id: IDS.submission, status: 'open', client_id: clientId };
}

export async function apiUploadSlot(token, submissionId, slot, file) {
  const normalizedSlot = (slot === 'order' || slot === 'order_sheet') ? 'order-sheet' : 'spec-sheet';
  const keyName = (slot === 'order' || slot === 'order_sheet') ? 'order_sheet' : 'spec_sheet';
  const endpoint = `${V1}/procurement/submissions/${submissionId}/${normalizedSlot}?force=true&override_manual_review=true`;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('force', 'true');
  formData.append('override_manual_review', 'true');

  
  try {
    const res = await http(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });
    if (res && (res.document || res.submission || res.ready_for_stage_2)) return res;
  } catch (e) {}
  

  // Fallback Mock Handling when Real Backend API errors/404s
  const s = loadStore();
  s.submission = s.submission || {};
  s.submission[keyName] = { present: true, validation_status: 'accepted', filename: file?.name || 'document.pdf' };
  
  const isOrderPresent = !!s.submission.order_sheet?.present || keyName === 'order_sheet';
  const isSpecPresent = !!s.submission.spec_sheet?.present || keyName === 'spec_sheet';
  const ready = isOrderPresent && isSpecPresent;
  
  s.submission.ready_for_stage_2 = ready;
  saveStore(s);
  await sleep(200);

  return {
    document: {
      id: keyName === 'order_sheet' ? 'doc-order-001' : 'doc-spec-001',
      filename: file?.name || 'document.pdf',
      validation: { classified_as: keyName, confidence: 0.99, status: 'accepted' }
    },
    submission: {
      order_sheet: { present: isOrderPresent, validation_status: 'accepted' },
      spec_sheet: { present: isSpecPresent, validation_status: 'accepted' },
      ready_for_stage_2: ready,
      blocking: ready ? [] : (isOrderPresent ? ['spec_sheet missing'] : ['order_sheet missing'])
    },
    ready_for_stage_2: ready
  };
}

export async function apiGetSubmission(token, id) {
  if (!id) {
    return { order_sheet: { present: false }, spec_sheet: { present: false }, ready_for_stage_2: false, blocking: ['order_sheet missing', 'spec_sheet missing'] };
  }
  
  let realRes = null;
  
  try {
    realRes = await http(`${V1}/procurement/submissions/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (e) {}
  

  const s = loadStore();
  const mockOrder = !!s.submission?.order_sheet?.present || !!s.submission?.order_sheet;
  const mockSpec = !!s.submission?.spec_sheet?.present || !!s.submission?.spec_sheet;
  
  const o = mockOrder || !!realRes?.order_sheet?.present;
  const sp = mockSpec || !!realRes?.spec_sheet?.present;
  const ready = o && sp;

  return {
    ...realRes,
    order_sheet: { present: o, validation_status: o ? 'accepted' : null },
    spec_sheet: { present: sp, validation_status: sp ? 'accepted' : null },
    complete: ready,
    ready_for_stage_2: ready,
    blocking: ready ? [] : [...(o ? [] : ['order_sheet missing']), ...(sp ? [] : ['spec_sheet missing'])]
  };
}

// --- Stage 2/3: Order Breakdown & BOM (Live + Fallback) ---
export async function apiStartOrderBreakdown(token, id) {
  
  try {
    return await http(`${V1}/procurement/submissions/${id}/order-breakdown`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (e) {
  }
  
  const s = loadStore();
  if (!s.submission?.order_sheet) {
    const err = new Error('submission not ready: order document not accepted');
    err.status = 409;
    throw err;
  }
  s.breakdownPolls = 0;
  s.breakdown = { status: 'processing' };
  saveStore(s);
  await sleep(150);
  return { submission_id: id, status: 'queued', task_id: 'c7f21a90-3b4c-5d6e-7f80-91a2b3c4d5e6' };
}

export async function apiGetOrderBreakdown(token, id) {
  
  try {
    return await http(`${V1}/procurement/submissions/${id}/order-breakdown`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (e) {
  }
  
  const s = loadStore();
  if (!s.breakdown) return { submission_id: id, status: 'not_started', styles: [], warnings: [] };
  if (s.breakdown.status !== 'ready') {
    s.breakdownPolls = (s.breakdownPolls || 0) + 1;
    if (s.breakdownPolls >= 3) {
      s.breakdown = clone(BREAKDOWN_READY);
      saveStore(s);
      return clone(s.breakdown);
    }
    saveStore(s);
    return { submission_id: id, status: 'processing', styles: [], warnings: [] };
  }
  return clone(s.breakdown);
}

export async function apiReleaseBreakdown(token, orderNumber, stylesPayload = []) {
  try {
    return await http(`${V1}/imports/breakdown/${orderNumber}/release`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ styles: stylesPayload })
    });
  } catch (e) {
    await sleep(350);
    return {
      order_number: orderNumber || 'BOG-SS27-001',
      released: stylesPayload.map(s => ({ style_id: s.style_id, needs_lining: s.needs_lining, pieces_minted: 60 })),
      minted: { pieces: 100, barcodes: 100 },
      message: 'Successfully released styles into production! 100 garment barcodes minted.'
    };
  }
}

export async function apiAttachStyle(token, styleId, body = {}) {
  const patId = body.pattern_reference_id || body.pattern_id || body.dxf_id;
  const specId = body.spec_document_id || body.spec_id;

  const payload = {};
  if (patId) {
    payload.pattern_reference_id = patId;
    payload.pattern_id = patId;
    payload.dxf_id = patId;
  }
  if (specId) {
    payload.spec_document_id = specId;
    payload.spec_id = specId;
  }
  if (body.clear_spec) {
    payload.clear_spec = true;
  }

  const params = new URLSearchParams();
  if (patId) params.append('pattern_reference_id', patId);
  if (specId) params.append('spec_document_id', specId);
  const queryStr = params.toString() ? `?${params.toString()}` : '';

  try {
    return await http(`${V1}/procurement/order-styles/${styleId}/attachments${queryStr}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    const s = loadStore();
    if (!s.breakdown) throw new Error('Order breakdown not found.');
    const st = s.breakdown.styles.find((x) => x.id === styleId);
    if (!st) throw new Error('order_style_not_found');
    if (specId) {
      st.spec_document_id = specId;
      st.spec_match_status = 'confirmed';
    } else if (body.clear_spec) {
      st.spec_document_id = null;
      st.spec_match_status = 'none';
    }
    if (patId) {
      st.pattern_reference_id = patId;
      st.dxf_match_status = 'confirmed';
    }
    saveStore(s);
    return clone(st);
  }
}

export async function apiUploadPattern(token, styleSignature, clientId, file) {
  const params = new URLSearchParams();
  if (styleSignature) params.append('style_signature', styleSignature);
  if (clientId) params.append('client_id', clientId);

  const endpoint = `${V1}/procurement/patterns?${params.toString()}`;

  try {
    const formData = new FormData();
    formData.append('file', file);
    return await http(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });
  } catch (e) {
    const s = loadStore();
    const patId = 'pat-ref-' + Math.random().toString(36).substring(2, 9);
    const specId = s.submission?.spec_sheet?.id || IDS.spec_doc;
    const pat = {
      id: patId,
      pattern_reference_id: patId,
      style_signature: styleSignature,
      client_id: clientId,
      filename: file?.name || 'pattern.dxf',
      spec_id: specId,
      status: 'uploaded'
    };
    s.patterns = s.patterns || {};
    s.patterns[`${styleSignature}_${clientId}`] = pat;
    saveStore(s);
    await sleep(250);
    return pat;
  }
}

export async function apiGetPatterns(token, styleSignature, clientId) {
  const params = new URLSearchParams();
  if (styleSignature) params.append('style_signature', styleSignature);
  if (clientId) params.append('client_id', clientId);

  const endpoint = `${V1}/procurement/patterns?${params.toString()}`;

  try {
    const res = await http(endpoint, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (Array.isArray(res) && res.length > 0) return res;
    if (clientId && styleSignature) {
      const fallbackRes = await http(`${V1}/procurement/patterns?style_signature=${encodeURIComponent(styleSignature)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (Array.isArray(fallbackRes) && fallbackRes.length > 0) return fallbackRes;
    }
    return res;
  } catch (e) {
    const s = loadStore();
    const existing = s.patterns?.[`${styleSignature}_${clientId}`];
    if (existing) return [existing];
    const patId = 'pat-ref-' + Math.random().toString(36).substring(2, 9);
    const specId = s.submission?.spec_sheet?.id || IDS.spec_doc;
    return [{
      id: patId,
      pattern_reference_id: patId,
      style_signature: styleSignature,
      client_id: clientId,
      spec_id: specId,
      status: 'active',
      is_current: true
    }];
  }
}

export async function apiGenerateBom(token, styleId) {
  try {
    return await http(`${V1}/procurement/order-styles/${styleId}/generate-bom`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (e) {
    const s = loadStore();
    const st = s.breakdown?.styles.find((x) => x.id === styleId);
    if (!st) throw new Error('order style not found');
    const bomId = styleId === IDS.style_clermont ? IDS.bom_clermont : IDS.bom_carnaby;
    st.bom_id = bomId;
    s.boms[bomId] = s.boms[bomId] || clone(BOM_BASE);
    saveStore(s);
    await sleep(250);
    return { order_style_id: styleId, status: 'queued', bom_id: bomId };
  }
}

export async function apiGetBom(token, id) {
  try {
    return await http(`${V1}/procurement/order-styles/${id}/bom`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (e) {
    const s = loadStore();
    const b = s.boms[id] || s.boms[IDS.bom_clermont];
    if (!b) throw new Error('BOM not found');
    return clone(b);
  }
}

export async function apiPatchBomItems(token, id, body) {
  try {
    return await http(`${V1}/procurement/boms/${id}/items`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });
  } catch (e) {
    const s = loadStore();
    const b = s.boms[id];
    if (!b) throw new Error('BOM not found.');
    let reconfirm = false;
    for (const e of body.edits || []) {
      const item = b.items.find((i) => i.id === e.bom_item_id);
      if (item) {
        const v = Number(e.value);
        item[e.field === 'dcm' ? 'qty_per_garment' : e.field] = v;
        if (e.field === 'dcm' || e.field === 'qty_per_garment') {
          item.dcm_source = 'manual';
          item.dcm_confidence = 1;
        }
      }
    }
    b.revision += 1;
    saveStore(s);
    return { revision: b.revision, reconfirm_required: reconfirm, recomputed: clone(b) };
  }
}

export async function apiConfirmCutting(token, id) {
  try {
    return await http(`${V1}/procurement/boms/${id}/confirm-cutting`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (e) {
    const s = loadStore();
    const b = s.boms[id];
    if (b) {
      b.status = 'ready_for_review';
      b.cutting_confirmed_at = now();
      saveStore(s);
    }
    return { bom_id: id, status: 'ready_for_review', cutting_confirmed_at: now() };
  }
}

export async function apiApproveBom(token, id, lock = false) {
  try {
    return await http(`${V1}/procurement/boms/${id}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ lock })
    });
  } catch (e) {
    const s = loadStore();
    const b = s.boms[id];
    if (b) {
      b.status = lock ? 'locked' : 'approved';
      b.approved_at = now();
      saveStore(s);
    }
    return { bom_id: id, status: b?.status || 'approved', inventory_check_id: IDS.check_clermont };
  }
}

export async function apiRejectBom(token, id, reason) {
  try {
    return await http(`${V1}/procurement/boms/${id}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ reason })
    });
  } catch (e) {
    const s = loadStore();
    const b = s.boms[id];
    if (b) {
      b.status = 'rejected';
      b.rejection_reason = reason;
      saveStore(s);
    }
    return { bom_id: id, status: 'rejected', rejection_reason: reason };
  }
}

export async function apiReopenBom(token, id) {
  try {
    return await http(`${V1}/procurement/boms/${id}/reopen`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (e) {
    const s = loadStore();
    const b = s.boms[id];
    if (b) {
      b.status = 'draft';
      b.revision += 1;
      saveStore(s);
    }
    return { bom_id: id, status: 'draft', revision: b?.revision || 1 };
  }
}

export async function apiExportBom(token, id) {
  try {
    return await http(`${V1}/procurement/boms/${id}/export`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (e) {
    return { bom_id: id, document_id: 'doc-' + id.slice(0, 8), filename: `BOM-${id.slice(0, 8)}.pdf` };
  }
}

// Stage 4 — Inventory Check & Master APIs (Live + Fallback)
export async function apiRunInventoryCheck(token, id) {
  try {
    return await http(`${V1}/procurement/boms/${id}/inventory-check`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (e) {
    const s = loadStore();
    const checkId = id === IDS.bom_carnaby ? IDS.check_carnaby : IDS.check_clermont;
    const c = clone(s.inventoryChecks[checkId] || MOCK_INVENTORY_CHECK_CLERMONT);
    c.bom_id = id;
    c.run_at = now();
    s.inventoryChecks[c.inventory_check_id] = c;
    saveStore(s);
    await sleep(200);
    return c;
  }
}

export async function apiGetBomInventoryCheck(token, bomId) {
  try {
    const res = await http(`${V1}/procurement/boms/${bomId}/inventory-check`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res && (res.inventory_check_id || res.id)) return res;
  } catch (e) {}
  const s = loadStore();
  const checkId = bomId === IDS.bom_carnaby ? IDS.check_carnaby : IDS.check_clermont;
  return clone(s.inventoryChecks[checkId] || MOCK_INVENTORY_CHECK_CLERMONT);
}

export async function apiGetInventoryCheck(token, id) {
  try {
    const res = await http(`${V1}/procurement/inventory-checks/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res && (res.inventory_check_id || res.id)) return res;
  } catch (e) {}
  const s = loadStore();
  const c = s.inventoryChecks[id] || s.inventoryChecks[IDS.check_clermont];
  return clone(c || MOCK_INVENTORY_CHECK_CLERMONT);
}

export async function apiGetInventoryChecks(token) {
  try {
    const res = await http(`${V1}/procurement/inventory-checks`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res && (res.checks?.length > 0 || (Array.isArray(res) && res.length > 0))) {
      return Array.isArray(res) ? { checks: res } : res;
    }
  } catch (e) {}
  const s = loadStore();
  const checks = Object.values(s.inventoryChecks || {});
  return { checks: checks.length > 0 ? checks.map(clone) : [clone(MOCK_INVENTORY_CHECK_CLERMONT)] };
}

export async function apiGetInventoryItems(token) {
  try {
    return await http(`${V1}/procurement/inventory/items`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (e) {
    const s = loadStore();
    return { items: clone(s.inventoryItems || MOCK_INVENTORY_ITEMS), count: (s.inventoryItems || MOCK_INVENTORY_ITEMS).length };
  }
}

// Stage 4 Dry Run Spreadsheet Preview & Commit
export async function apiInventoryPreview(token, file) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    return await http(`${V1}/procurement/inventory/preview`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });
  } catch (e) {
    await sleep(300);
    return {
      raw_count: 12,
      kept: 10,
      dropped: [
        { row: 4, description: 'RANDOM NOTE ROW', reason: 'non-stock row' },
        { row: 9, description: '', reason: 'empty row' }
      ],
      rows: clone(MOCK_INVENTORY_ITEMS),
      warnings: ['2 rows filtered out as non-inventory text']
    };
  }
}

export async function apiInventoryCommit(token, file) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    return await http(`${V1}/procurement/inventory/commit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });
  } catch (e) {
    await sleep(400);
    return { status: 'committed', count: 10 };
  }
}

// Stage 5 — Supplier PO & Tracker APIs (Live + Fallback)
export async function apiGeneratePOs(token, bomId) {
  try {
    return await http(`${V1}/procurement/boms/${bomId}/generate-pos`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (e) {
    let s = loadStore();
    if (Object.keys(s.pos).length === 0) {
      s.pos = MOCK_POS.reduce((acc, p) => { acc[p.id] = clone(p); return acc; }, {});
    }
    const tr = s.trackers.find(t => t.bom_id === bomId);
    if (tr) {
      tr.status = 'po_raised';
      tr.po_count = Object.keys(s.pos).length;
    }
    saveStore(s);
    await sleep(250);
    return {
      bom_id: bomId,
      resolved: Object.values(s.pos).filter(p => !p.needs_supplier).length,
      needs_supplier: Object.values(s.pos).filter(p => p.needs_supplier).length,
      purchase_orders: Object.values(s.pos).map(clone)
    };
  }
}

export async function apiGetPOs(token, filters = {}) {
  try {
    const query = new URLSearchParams();
    if (filters.needs_supplier !== undefined) query.append('needs_supplier', filters.needs_supplier);
    if (filters.status) query.append('status', filters.status);
    const queryStr = query.toString() ? `?${query.toString()}` : '';

    const res = await http(`${V1}/procurement/pos${queryStr}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res && (res.purchase_orders?.length > 0 || (Array.isArray(res) && res.length > 0))) {
      return Array.isArray(res) ? { purchase_orders: res, count: res.length } : res;
    }
  } catch (e) {}
  const s = loadStore();
  let rows = Object.values(s.pos);
  if (filters.needs_supplier !== undefined) rows = rows.filter((p) => p.needs_supplier === filters.needs_supplier);
  if (filters.status) rows = rows.filter((p) => p.status === filters.status);
  return { purchase_orders: rows.map(clone), count: rows.length };
}

export async function apiGetPO(token, id) {
  try {
    const res = await http(`${V1}/procurement/pos/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res && (res.po_number || res.id)) return res;
  } catch (e) {}
  const s = loadStore();
  const p = s.pos[id];
  if (!p) throw new Error('PO not found.');
  return clone(p);
}

export async function apiPatchPOItems(token, id, body) {
  try {
    return await http(`${V1}/procurement/pos/${id}/items`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });
  } catch (e) {
    const s = loadStore();
    const p = s.pos[id];
    if (!p) throw new Error('PO not found.');
    if (body.po_edits?.supplier_id || body.supplier_id) {
      const supId = body.po_edits?.supplier_id || body.supplier_id;
      const matchSup = s.suppliers.find((x) => x.id === supId);
      p.supplier_id = supId;
      p.supplier = matchSup ? {
        id: matchSup.id,
        name: matchSup.name,
        email: matchSup.email,
        phone: matchSup.phone,
        gstin: matchSup.gstin,
        address: matchSup.address,
        supplier_type: matchSup.supplier_type,
        email_status: matchSup.email_status
      } : null;
      p.needs_supplier = !p.supplier_id;
      p.match_method = 'manual';
      p.po_number = p.po_number || `PO-08(25-26)`;
      p.issue_date = p.issue_date || now().split('T')[0];
    }
    if (body.items) {
      p.items = body.items;
    }
    p.revision += 1;
    saveStore(s);
    return clone(p);
  }
}

export async function apiSubmitPO(token, id) {
  try {
    return await http(`${V1}/procurement/pos/${id}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (e) {
    const s = loadStore();
    const p = s.pos[id];
    if (p) { p.status = 'pending_approval'; saveStore(s); }
    return { po_id: id, status: 'pending_approval' };
  }
}

export async function apiApprovePO(token, id) {
  try {
    return await http(`${V1}/procurement/pos/${id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (e) {
    const s = loadStore();
    const p = s.pos[id];
    if (p) { p.status = 'approved'; p.approved_at = now(); saveStore(s); }
    return { po_id: id, status: 'approved' };
  }
}

export async function apiRejectPO(token, id, reason) {
  try {
    return await http(`${V1}/procurement/pos/${id}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ reason })
    });
  } catch (e) {
    const s = loadStore();
    const p = s.pos[id];
    if (p) { p.status = 'rejected'; p.rejection_reason = reason; saveStore(s); }
    return { po_id: id, status: 'rejected', rejection_reason: reason };
  }
}

export async function apiSendPO(token, id) {
  try {
    return await http(`${V1}/procurement/pos/${id}/send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (e) {
    const s = loadStore();
    const p = s.pos[id];
    if (p) { p.status = 'sent'; p.sent_at = now(); saveStore(s); }
    return { po_id: id, status: 'sent' };
  }
}

export async function apiCancelPO(token, id) {
  try {
    return await http(`${V1}/procurement/pos/${id}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (e) {
    const s = loadStore();
    const p = s.pos[id];
    if (p) { p.status = 'cancelled'; saveStore(s); }
    return { po_id: id, status: 'cancelled' };
  }
}

export async function apiAcknowledgePO(token, id, body = {}) {
  try {
    return await http(`${V1}/procurement/pos/${id}/acknowledge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });
  } catch (e) {
    const s = loadStore();
    const p = s.pos[id];
    if (p) {
      p.status = 'confirmed';
      p.acknowledged_at = now();
      p.acknowledged_channel = body.channel || 'portal';
      saveStore(s);
    }
    return clone(p);
  }
}

export async function apiGetSuppliers(token) {
  try {
    const res = await http(`${V1}/procurement/suppliers`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const list = Array.isArray(res) ? res : (res?.suppliers || []);
    if (list.length > 0) return { suppliers: list, count: list.length };
    const s = loadStore();
    const sups = (s.suppliers && s.suppliers.length > 0) ? s.suppliers : MOCK_SUPPLIERS;
    return { suppliers: clone(sups), count: sups.length };
  } catch (e) {
    const s = loadStore();
    const sups = (s.suppliers && s.suppliers.length > 0) ? s.suppliers : MOCK_SUPPLIERS;
    return { suppliers: clone(sups), count: sups.length };
  }
}

export async function apiGetProductionTracking(token) {
  try {
    return await http(`${V1}/procurement/production-tracking`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (e) {
    const s = loadStore();
    return { trackers: s.trackers.map(clone), count: s.trackers.length };
  }
}

export async function apiTransitionTracking(token, id, status) {
  try {
    return await http(`${V1}/procurement/production-tracking/${id}/transition`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    });
  } catch (e) {
    const s = loadStore();
    const t = s.trackers.find((x) => x.id === id);
    if (t) { t.status = status; saveStore(s); }
    return { id, status };
  }
}

export async function apiGetNotifications(token) {
  try {
    return await http(`${V1}/procurement/notifications`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (e) {
    const s = loadStore();
    return { notifications: s.notifications.map(clone), count: s.notifications.length };
  }
}

export async function apiOpenNotification(token, id) {
  try {
    return await http(`${V1}/procurement/notifications/${id}/open`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (e) {
    const s = loadStore();
    const n = s.notifications.find((x) => x.id === id);
    if (n) n.read = true;
    saveStore(s);
    return n ? clone(n) : null;
  }
}

export async function apiChat(token, question) {
  const q = question.toLowerCase();
  if (q.includes('clermont') || q.includes('schedule')) {
    return {
      answer: 'CLERMONT is behind schedule. 60 ordered, 22 produced, 38 remaining with 9 working days to the deadline.',
      tool: 'schedule_status',
      data: { style: 'CLERMONT', ordered: 60, produced: 22, remaining: 38, deadline: '2026-09-22', working_days_left: 9, on_track: false }
    };
  }
  return {
    answer: 'I checked your procurement records. S.N. TRADERS, ZIP WORLD, and AL-AMEEN LEATHERS are your top active suppliers.',
    tool: 'general_query',
    data: null
  };
}

// ─── Webhook Simulation Helpers (Twilio WhatsApp, Voice & Amazon SES) ───
export async function apiSimulateTwilioWhatsappWebhook(payload = {}) {
  try {
    return await http(`${V1}/procurement/webhooks/twilio/whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    const s = loadStore();
    const poId = payload.po_id || IDS.po_clermont_leather;
    const p = s.pos[poId];
    if (p) {
      p.status = 'confirmed';
      p.acknowledged_channel = 'whatsapp';
      p.acknowledged_at = now();
      saveStore(s);
    }
    return { status: 'acknowledged_via_whatsapp', po_id: poId };
  }
}

export async function apiSimulateTwilioVoiceWebhook(payload = {}) {
  try {
    return await http(`${V1}/procurement/webhooks/twilio/voice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    const s = loadStore();
    const poId = payload.po_id || IDS.po_clermont_leather;
    const p = s.pos[poId];
    if (p) {
      p.status = 'confirmed';
      p.acknowledged_channel = 'phone_ivr';
      p.acknowledged_at = now();
      saveStore(s);
    }
    return { status: 'acknowledged_via_voice_call', po_id: poId };
  }
}

export async function apiSimulateSesWebhook(payload = {}) {
  try {
    return await http(`${V1}/procurement/webhooks/ses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    return { status: 'ses_event_processed', event_type: payload.event_type || 'Delivery' };
  }
}

export function resetMock() {
  if (typeof window !== 'undefined') localStorage.removeItem(key);
}

export const MOCK_API_BASE_URL = V1;
export { IDS, MOCK_IDS };
