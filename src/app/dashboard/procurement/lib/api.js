// Real API Service for KairoX Procurement Intelligence
// Direct integration with Live Backend Endpoints (/api/v1/...)

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';
const V1 = '/api/v1';

export const IDS = {
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

export const MOCK_IDS = IDS;

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

// ==========================================
// 1. CLIENTS & AUTH
// ==========================================

export async function apiGetClients(token) {
  const res = await http(`${V1}/clients`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return Array.isArray(res) ? res : res?.clients || res?.items || res?.data || [];
}

export async function apiLogin(phone = '9876543210', password = 'password') {
  return await http(`${V1}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password })
  });
}

export async function apiMe(token) {
  return await http(`${V1}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

// ==========================================
// 2. STAGE 1: INTAKE & SUBMISSIONS
// ==========================================

export async function apiOpenSubmission(token, clientId = null) {
  return await http(`${V1}/procurement/submissions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ client_id: clientId })
  });
}

export async function apiUploadSlot(token, submissionId, slot, file) {
  const normalizedSlot = (slot === 'order' || slot === 'order_sheet') ? 'order-sheet' : 'spec-sheet';
  const endpoint = `${V1}/procurement/submissions/${submissionId}/${normalizedSlot}?force=true&override_manual_review=true`;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('force', 'true');
  formData.append('override_manual_review', 'true');

  return await http(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  });
}

export async function apiGetSubmission(token, id) {
  return await http(`${V1}/procurement/submissions/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

// ==========================================
// 3. STAGE 2/3: ORDER BREAKDOWN & BOM
// ==========================================

export async function apiStartOrderBreakdown(token, id) {
  return await http(`${V1}/procurement/submissions/${id}/order-breakdown`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function apiGetOrderBreakdown(token, id) {
  return await http(`${V1}/procurement/submissions/${id}/order-breakdown`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function apiReleaseBreakdown(token, orderNumber, stylesPayload = []) {
  return await http(`${V1}/imports/breakdown/${orderNumber}/release`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ styles: stylesPayload })
  });
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

  return await http(`${V1}/procurement/order-styles/${styleId}/attachments${queryStr}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
}

export async function apiUploadPattern(token, styleSignature, clientId, file) {
  const params = new URLSearchParams();
  if (styleSignature) params.append('style_signature', styleSignature);
  if (clientId) params.append('client_id', clientId);

  const endpoint = `${V1}/procurement/patterns?${params.toString()}`;
  const formData = new FormData();
  formData.append('file', file);
  return await http(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  });
}

export async function apiGetPatterns(token, styleSignature, clientId) {
  const params = new URLSearchParams();
  if (styleSignature) params.append('style_signature', styleSignature);
  if (clientId) params.append('client_id', clientId);

  const endpoint = `${V1}/procurement/patterns?${params.toString()}`;
  return await http(endpoint, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function apiGenerateBom(token, styleId) {
  return await http(`${V1}/procurement/order-styles/${styleId}/generate-bom`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function apiGetBom(token, id) {
  return await http(`${V1}/procurement/order-styles/${id}/bom`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function apiPatchBomItems(token, id, body) {
  return await http(`${V1}/procurement/boms/${id}/items`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });
}

export async function apiConfirmCutting(token, id) {
  return await http(`${V1}/procurement/boms/${id}/confirm-cutting`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function apiApproveBom(token, id, lock = false) {
  return await http(`${V1}/procurement/boms/${id}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ lock })
  });
}

export async function apiRejectBom(token, id, reason) {
  return await http(`${V1}/procurement/boms/${id}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ reason })
  });
}

export async function apiReopenBom(token, id) {
  return await http(`${V1}/procurement/boms/${id}/reopen`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function apiExportBom(token, id) {
  return await http(`${V1}/procurement/boms/${id}/export`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
}

// ==========================================
// 4. STAGE 4: INVENTORY CHECKS & MASTER
// ==========================================

export async function apiRunInventoryCheck(token, id) {
  return await http(`${V1}/procurement/boms/${id}/inventory-check`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function apiGetBomInventoryCheck(token, bomId) {
  return await http(`${V1}/procurement/boms/${bomId}/inventory-check`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function apiGetInventoryCheck(token, id) {
  return await http(`${V1}/procurement/inventory-checks/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function apiGetInventoryChecks(token) {
  const res = await http(`${V1}/procurement/inventory-checks`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return Array.isArray(res) ? { checks: res } : res;
}

export async function apiGetInventoryItems(token) {
  return await http(`${V1}/procurement/inventory/items`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function apiInventoryPreview(token, file) {
  const formData = new FormData();
  formData.append('file', file);
  return await http(`${V1}/procurement/inventory/preview`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  });
}

export async function apiInventoryCommit(token, file) {
  const formData = new FormData();
  formData.append('file', file);
  return await http(`${V1}/procurement/inventory/commit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  });
}

// ==========================================
// 5. STAGE 5: SUPPLIER POS & TRACKERS
// ==========================================

export async function apiGeneratePOs(token, bomId) {
  return await http(`${V1}/procurement/boms/${bomId}/generate-pos`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function apiGetPOs(token, filters = {}) {
  const query = new URLSearchParams();
  if (filters.needs_supplier !== undefined) query.append('needs_supplier', filters.needs_supplier);
  if (filters.status) query.append('status', filters.status);
  const queryStr = query.toString() ? `?${query.toString()}` : '';

  const res = await http(`${V1}/procurement/pos${queryStr}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return Array.isArray(res) ? { purchase_orders: res, count: res.length } : res;
}

export async function apiGetPO(token, id) {
  return await http(`${V1}/procurement/pos/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function apiPatchPOItems(token, id, body) {
  return await http(`${V1}/procurement/pos/${id}/items`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });
}

export async function apiSubmitPO(token, id) {
  return await http(`${V1}/procurement/pos/${id}/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function apiApprovePO(token, id) {
  return await http(`${V1}/procurement/pos/${id}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function apiRejectPO(token, id, reason) {
  return await http(`${V1}/procurement/pos/${id}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ reason })
  });
}

export async function apiSendPO(token, id) {
  return await http(`${V1}/procurement/pos/${id}/send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function apiCancelPO(token, id) {
  return await http(`${V1}/procurement/pos/${id}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function apiAcknowledgePO(token, id, body = {}) {
  return await http(`${V1}/procurement/pos/${id}/acknowledge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });
}

export async function apiGetSuppliers(token) {
  const res = await http(`${V1}/procurement/suppliers`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const list = Array.isArray(res) ? res : (res?.suppliers || res?.items || []);
  return { suppliers: list, count: list.length };
}

export async function apiGetProductionTracking(token) {
  return await http(`${V1}/procurement/production-tracking`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function apiTransitionTracking(token, id, action) {
  return await http(`${V1}/procurement/production-tracking/${id}/transition`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ action })
  });
}

// ==========================================
// 6. NOTIFICATIONS & COPILOT CHAT
// ==========================================

export async function apiGetNotifications(token) {
  return await http(`${V1}/procurement/notifications`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function apiMarkNotificationRead(token, id) {
  return await http(`${V1}/procurement/notifications/${id}/read`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function apiChatQuery(token, message, history = []) {
  return await http(`${V1}/procurement/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ message, history })
  });
}

export async function apiSimulateTwilioWhatsappWebhook(token, payload = {}) {
  return await http(`${V1}/procurement/webhooks/whatsapp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
}

export async function apiSimulateTwilioVoiceWebhook(token, payload = {}) {
  return await http(`${V1}/procurement/webhooks/voice`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
}
