// API service for Kairox Leather Platform backend
const API_BASE_URL = '';

/**
 * Login with username and password
 * @returns {{ access_token, token_type, role, name, user_id }}
 */
export async function apiLogin(username, password) {
  const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => 'Login failed');
    throw new Error(errText || `Login failed (${res.status})`);
  }
  return res.json();
}

/**
 * Fetch all clients
 * @returns {Array<{ id, name, country }>}
 */
export async function apiGetClients(token) {
  const res = await fetch(`${API_BASE_URL}/api/v1/clients`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch clients (${res.status})`);
  return res.json();
}

/**
 * Create a new client (mints first order in same call)
 * @returns {{ id, name, country, code, order_number, order_id }}
 */
export async function apiCreateClient(token, name, country, order_number, code) {
  const res = await fetch(`${API_BASE_URL}/api/v1/clients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, country, order_number, code }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => 'Failed to create client');
    const err = new Error(errText || `Failed to create client (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/**
 * Fetch orders for a specific client
 * @returns {Array<{ id, po_number, order_date, delivery_deadline, sea_cutoff_date, ship_mode, styles }>}
 */
export async function apiGetClientOrders(token, clientId) {
  const res = await fetch(`${API_BASE_URL}/api/v1/clients/${encodeURIComponent(clientId)}/orders`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch orders for client ${clientId} (${res.status})`);
  return res.json();
}

/**
 * Add a new order to an existing client
 * @returns {{ id, order_number, order_date, delivery_deadline, sea_cutoff_date, ship_mode, styles }}
 */
export async function apiAddClientOrder(token, clientId, payload) {
  const res = await fetch(`${API_BASE_URL}/api/v1/clients/${encodeURIComponent(clientId)}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => 'Failed to add order');
    const err = new Error(errText || `Failed to add order (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}


/**
 * Fetch all active employees
 * @returns {Array<{ id, name, designation, wage_type, monthly_salary, is_active }>}
 */
export async function apiGetEmployees(token) {
  const res = await fetch(`${API_BASE_URL}/api/v1/employees`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch employees (${res.status})`);
  return res.json();
}

/**
 * Fetch production operations
 * @returns {Array<{ id, code, label, sequence }>}
 */
export async function apiGetOperations(token) {
  const res = await fetch(`${API_BASE_URL}/api/v1/production/operations`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch operations (${res.status})`);
  return res.json();
}

/**
 * Fetch recent production events
 * @returns {Array<{ id, sku_id, operation_id, employee_id, work_date, qty, bundle_ref }>}
 */
export async function apiGetEvents(token) {
  const res = await fetch(`${API_BASE_URL}/api/v1/production/events`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch events (${res.status})`);
  return res.json();
}

/**
 * Log a new production event
 */
export async function apiLogEvent(token, payload) {
  console.warn('[apiLogEvent] payload:', JSON.stringify(payload));
  const res = await fetch(`${API_BASE_URL}/api/v1/production/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => 'Failed to log event');
    console.warn('[apiLogEvent] error response:', errText);
    throw new Error(errText || `Failed to log event (${res.status})`);
  }
  return res.json();
}

/**
 * Fetch SKUs for production logging (filterable by order/style)
 * @returns {Array<{ sku_id, code, label, order_number, style_name, color_code, size, qty_ordered }>}
 */
export async function apiGetSkus(token, orderId = null, styleId = null) {
  let url = `${API_BASE_URL}/api/v1/production/skus`;
  const params = new URLSearchParams();
  if (orderId) params.append('order_id', orderId);
  if (styleId) params.append('style_id', styleId);
  if (params.toString()) url += `?${params.toString()}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch SKUs (${res.status})`);
  return res.json();
}

/**
 * Fetch pieces for a specific SKU and operation
 * @returns {Promise<{ pieces: Array<{ piece_id, code, seq, current_stage, current_stage_label, done_at_op }>, total, done, pending }>}
 */
export async function apiGetSkuPieces(token, skuId, operationId) {
  let url = `${API_BASE_URL}/api/v1/production/skus/${encodeURIComponent(skuId)}/pieces`;
  if (operationId) {
    url += `?operation_id=${encodeURIComponent(operationId)}`;
  }
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch SKU pieces (${res.status})`);
  return res.json();
}

/**
 * Log a production event at the per-piece level (scan)
 */
export async function apiProductionScan(token, payload) {
  console.warn('[apiProductionScan] payload:', JSON.stringify(payload));
  const logPayload = {
    screen_context: 'PIPELINE',
    actor: {
      employee_id: payload.employee_id
    },
    targets: {
      sku_id: payload.sku_id,
      piece_seqs: payload.piece_seqs || []
    },
    work_date: payload.work_date
  };
  const res = await fetch(`${API_BASE_URL}/api/v1/production/log`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(logPayload),
  });
  if (!res.ok) {
    let errText;
    try {
      const errObj = await res.json();
      errText = errObj.detail || errObj.message || JSON.stringify(errObj);
    } catch {
      errText = await res.text().catch(() => 'Failed to scan pieces');
    }
    console.warn('[apiProductionScan] error response:', errText);
    throw new Error(errText || `Failed to scan pieces (${res.status})`);
  }
  return res.json();
}

/**
 * Mint N pieces at the Cutting stage.
 * POST /production/cutting
 * @param {{ sku_code, employee_id, work_date, count }} payload
 */
export async function apiProductionCutting(token, payload) {
  console.warn('[apiProductionCutting] payload:', JSON.stringify(payload));
  const countNum = parseInt(payload.count || 1, 10);
  const isLining = payload.stage === 'Lining';

  const logPayload = {
    screen_context: isLining ? 'LINING_CUT' : 'LEATHER_CUT',
    actor: {
      employee_id: payload.employee_id
    },
    targets: {
      sku_id: payload.sku_id,
      piece_seqs: Array.from({ length: countNum }, (_, i) => i + 1)
    },
    work_date: payload.work_date,
    consumption: {
      dcm: payload.dcm ? Number(payload.dcm) : 10
    }
  };

  if (isLining) {
    logPayload.consumption.lining_lot_id = payload.lot_id;
  } else {
    logPayload.consumption.leather_lot_id = payload.lot_id;
  }
  const res = await fetch(`${API_BASE_URL}/api/v1/production/log`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(logPayload),
  });
  if (!res.ok) {
    let errText;
    try {
      const errObj = await res.json();
      if (Array.isArray(errObj.detail)) {
        // Pydantic validation errors: [{loc, msg, type}, ...]
        errText = errObj.detail.map(e => e.msg || JSON.stringify(e)).join('; ');
      } else {
        errText = errObj.detail || errObj.message || JSON.stringify(errObj);
      }
    } catch {
      errText = await res.text().catch(() => 'Failed to create cutting event');
    }
    console.warn('[apiProductionCutting] error response:', errText);
    throw new Error(typeof errText === 'string' ? errText : JSON.stringify(errText) || `Failed to create cutting event (${res.status})`);
  }
  return res.json();
}

/**
 * Fetch a specific wage run by ID
 * NOTE: /api/v1/wages/runs has no GET (list) endpoint — only POST (create).
 * Use this to fetch a single run by ID after creation.
 */
export async function apiGetWageRun(token, runId) {
  const res = await fetch(`${API_BASE_URL}/api/v1/wages/runs/${runId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch wage run (${res.status})`);
  return res.json();
}

/**
 * Set a wage rate for a style and operation
 */
export async function apiSetWageRate(token, payload) {
  const res = await fetch(`${API_BASE_URL}/api/v1/wages/rates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => 'Failed to set wage rate');
    throw new Error(errText || `Failed to set wage rate (${res.status})`);
  }
  return res.json();
}


/**
 * Get stage-by-stage progress for a specific style
 */
export async function apiGetStyleProgress(token, styleId) {
  const res = await fetch(`${API_BASE_URL}/api/v1/production/styles/${styleId}/progress`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch style progress (${res.status})`);
  return res.json();
}

/**
 * Preview an Excel import (dry-run, no DB writes)
 */
export async function apiImportPreview(token, file, orderNumber) {
  const formData = new FormData();
  if (orderNumber) formData.append('order_number', orderNumber);
  formData.append('file', file);
  const res = await fetch(`${API_BASE_URL}/api/v1/imports/preview`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    let errText = await res.text().catch(() => 'Failed to preview import');
    try {
      const parsed = JSON.parse(errText);
      if (parsed.detail) errText = parsed.detail;
    } catch (e) { }
    console.error('[API] /imports/preview failed:', res.status, errText);
    const err = new Error(errText || `Failed to preview import (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/**
 * Commit an Excel import (writes to DB, idempotent)
 */
export async function apiImportCommit(token, file, orderNumber) {
  const formData = new FormData();
  if (orderNumber) formData.append('order_number', orderNumber);
  formData.append('file', file);
  const res = await fetch(`${API_BASE_URL}/api/v1/imports/commit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    let errText = await res.text().catch(() => 'Failed to commit import');
    try {
      const parsed = JSON.parse(errText);
      if (parsed.detail) errText = parsed.detail;
    } catch (e) { }
    console.error('[API] /imports/commit failed:', res.status, errText);
    const err = new Error(errText || `Failed to commit import (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/**
 * Preview an Excel import for Inventory (dry-run)
 */
export async function apiInventoryPreview(token, file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE_URL}/api/v1/procurement/inventory/preview`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => 'Failed to preview inventory import');
    console.error('[API] /procurement/inventory/preview failed:', res.status, errText);
    throw new Error(errText || `Failed to preview inventory import (${res.status})`);
  }
  return res.json();
}

/**
 * Commit an Excel import for Inventory
 */
export async function apiInventoryCommit(token, file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE_URL}/api/v1/procurement/inventory/commit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => 'Failed to commit inventory import');
    console.error('[API] /procurement/inventory/commit failed:', res.status, errText);
    throw new Error(errText || `Failed to commit inventory import (${res.status})`);
  }
  return res.json();
}

// ─── ANALYTICS MODULE (READ-ONLY INTELLIGENCE) ───

/**
 * 1. GET /api/v1/analytics/overview
 * Top-level factory KPIs for the dashboard header.
 */
export async function apiGetAnalyticsOverview(token) {
  const res = await fetch(`${API_BASE_URL}/api/v1/analytics/overview`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch analytics overview');
  return res.json();
}

/**
 * GET /api/v1/analytics/explorer
 * Hierarchical exploration of clients, orders, and styles.
 */
export async function apiGetAnalyticsExplore(token) {
  const res = await fetch(`${API_BASE_URL}/api/v1/analytics/explorer`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch analytics explorer data');
  return res.json();
}

/**
 * 2. GET /api/v1/analytics/orders/{order_id}/tree
 * Drill-down level 1 — Order with styles and stage distributions.
 */
export async function apiGetOrderTree(token, orderId) {
  if (!orderId) return null;
  const res = await fetch(`${API_BASE_URL}/api/v1/analytics/orders/${encodeURIComponent(orderId)}/tree`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`Failed to fetch order tree for ${orderId}`);
  return res.json();
}

/**
 * 3. GET /api/v1/analytics/styles/{style_id}/detail
 * Drill-down level 2 — Style with all pieces & full stage history.
 */
export async function apiGetStyleDetail(token, styleId) {
  if (!styleId) return null;
  const res = await fetch(`${API_BASE_URL}/api/v1/analytics/styles/${encodeURIComponent(styleId)}/detail`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`Failed to fetch style details for ${styleId}`);
  return res.json();
}

/**
 * 4. GET /api/v1/analytics/pieces/detail
 * Drill-down level 3 — Single piece view (QR / Scan lookup).
 * Params: piece_code OR (sku_code + seq)
 */
export async function apiGetPieceDetail(token, { piece_code, sku_code, seq }) {
  const params = new URLSearchParams();
  if (piece_code) params.append('piece_code', piece_code);
  if (sku_code) params.append('sku_code', sku_code);
  if (seq !== undefined && seq !== null) params.append('seq', seq);

  const res = await fetch(`${API_BASE_URL}/api/v1/analytics/pieces/detail?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch piece detail');
  return res.json();
}

/**
 * 5. GET /api/v1/analytics/alerts/stage-spread
 * Bottleneck detector.
 */
export async function apiGetStageSpreadAlerts(token) {
  const res = await fetch(`${API_BASE_URL}/api/v1/analytics/alerts/stage-spread`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch stage spread alerts');
  return res.json();
}

/**
 * 6. GET /api/v1/analytics/alerts/freight-risk
 * Sea-freight cutoff risk.
 */
export async function apiGetFreightRiskAlerts(token, todayDate = null) {
  const url = todayDate
    ? `${API_BASE_URL}/api/v1/analytics/alerts/freight-risk?today=${todayDate}`
    : `${API_BASE_URL}/api/v1/analytics/alerts/freight-risk`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch freight risk alerts');
  return res.json();
}
/**
 * Fetch all users
 */
export async function apiGetUsers(token) {
  const res = await fetch(`${API_BASE_URL}/api/v1/users`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch users (${res.status})`);
  return res.json();
}

/**
 * Create a new user (staff, manager, etc.)
 */
export async function apiCreateUser(token, payload) {
  const res = await fetch(`${API_BASE_URL}/api/v1/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => 'Failed to create user');
    const err = new Error(errText || `Failed to create user (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/**
 * Create a new client user
 */
export async function apiCreateClientUser(token, payload) {
  const res = await fetch(`${API_BASE_URL}/api/v1/users/clients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => 'Failed to create client user');
    throw new Error(errText || `Failed to create client user (${res.status})`);
  }
  return res.json();
}

/**
 * Create a new employee
 */
export async function apiCreateEmployee(token, payload) {
  const res = await fetch(`${API_BASE_URL}/api/v1/employees`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => 'Failed to create employee');
    throw new Error(errText || `Failed to create employee (${res.status})`);
  }
  return res.json();
}

/**
 * Change password
 */
export async function apiChangePassword(token, current_password, new_password) {
  const res = await fetch(`${API_BASE_URL}/api/v1/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ current_password, new_password }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => 'Failed to change password');
    throw new Error(errText || `Failed to change password (${res.status})`);
  }

  if (res.status === 204) {
    return true;
  }

  // Just in case it returns JSON sometimes
  const text = await res.text();
  return text ? JSON.parse(text) : true;
}

// ─── PROCUREMENT SUITE ───

export async function apiOpenSubmission(token, client_id = null) {
  const body = client_id ? JSON.stringify({ client_id }) : undefined;
  const res = await fetch(`${API_BASE_URL}/api/v1/procurement/submissions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body
  });
  if (!res.ok) throw new Error('Failed to open submission');
  return res.json();
}

export async function apiUploadSlot(token, submissionId, kind, file) {
  const formData = new FormData();
  formData.append('file', file);
  const endpoint = kind === 'order_sheet' ? 'order-sheet' : 'spec-sheet';

  const res = await fetch(`${API_BASE_URL}/api/v1/procurement/submissions/${submissionId}/${endpoint}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => 'Upload failed');
    try {
      // Return the rich JSON envelope for validation errors (e.g. 422)
      return JSON.parse(errText);
    } catch {
      throw new Error(errText || `Upload failed (${res.status})`);
    }
  }
  return res.json();
}

export async function apiGetSubmission(token, submissionId) {
  const res = await fetch(`${API_BASE_URL}/api/v1/procurement/submissions/${submissionId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch submission status');
  return res.json();
}

export async function apiGetBom(token, bomId) {
  const res = await fetch(`${API_BASE_URL}/api/v1/procurement/boms/${bomId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch BOM');
  return res.json();
}

export async function apiPatchBomItems(token, bomId, baseRevision, edits) {
  const res = await fetch(`${API_BASE_URL}/api/v1/procurement/boms/${bomId}/items`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ base_revision: baseRevision, edits })
  });
  if (!res.ok) {
    const errText = await res.text();
    if (res.status === 409) throw new Error('stale_revision');
    throw new Error(errText || 'Failed to update BOM items');
  }
  return res.json();
}

export async function apiExportBom(token, bomId) {
  const res = await fetch(`${API_BASE_URL}/api/v1/procurement/boms/${bomId}/export`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to export BOM');
  return res.json();
}

// ── NEW PO API ENDPOINTS ──

export async function apiGeneratePOs(token, bomId) {
  const res = await fetch(`${API_BASE_URL}/api/v1/procurement/boms/${bomId}/generate-pos`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to generate POs');
  return res.json();
}

export async function apiSubmitPO(token, poId) {
  const res = await fetch(`${API_BASE_URL}/api/v1/procurement/pos/${poId}/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to submit PO');
  return res.json();
}

export async function apiApprovePO(token, poId) {
  const res = await fetch(`${API_BASE_URL}/api/v1/procurement/pos/${poId}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to approve PO');
  return res.json();
}

export async function apiSendPO(token, poId) {
  const res = await fetch(`${API_BASE_URL}/api/v1/procurement/pos/${poId}/send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to send PO');
  return res.json();
}



// ─── WAGES API ENDPOINTS ──────────────────────────────────────────────────────
/*
 * 1. GET /wages/styles - List of styles with pricing coverage
 */
export async function apiGetWageStyles(token, queryParams = {}) {
  console.log(token)
  const params = new URLSearchParams(queryParams);
  const res = await fetch(`${API_BASE_URL}/api/v1/wages/styles?${params.toString()}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch wage styles (${res.status})`);

  return res.json();
}

/**
 * 2. GET /wages/rate-sheet - Edit screen for one style
 */
export async function apiGetRateSheet(token, styleCode, onDate = null) {
  let url = `${API_BASE_URL}/api/v1/wages/rate-sheet?style_code=${encodeURIComponent(styleCode)}`;
  if (onDate) url += `&on=${onDate}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch rate sheet (${res.status})`);
  return res.json();
}

/**
 * 3. POST /wages/rates/bulk - Save edited sheet
 */
export async function apiSetWageRatesBulk(token, payload) {
  const res = await fetch(`${API_BASE_URL}/api/v1/wages/rates/bulk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => 'Failed to save bulk rates');
    throw new Error(errText || `Failed to save bulk rates (${res.status})`);
  }
  return res.json();
}

/**
 * 4. POST /wages/rates - Single cell update (Optional)
 */
export async function apiSetWageRateSingle(token, payload) {
  const res = await fetch(`${API_BASE_URL}/api/v1/wages/rates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to set wage rate (${res.status})`);
  return res.json();
}

/**
 * 5. GET /wages/rate-history - Audit logs
 */
export async function apiGetRateHistory(token, styleCode, operationCode) {
  const res = await fetch(`${API_BASE_URL}/api/v1/wages/rate-history?style_code=${encodeURIComponent(styleCode)}&operation_code=${encodeURIComponent(operationCode)}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch rate history (${res.status})`);
  return res.json();
}

/**
 * 6. GET /wages/runs - Payroll history list
 */
export async function apiGetWageRuns(token, limit = 50, offset = 0) {
  const res = await fetch(`${API_BASE_URL}/api/v1/wages/runs?limit=${limit}&offset=${offset}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch wage runs (${res.status})`);
  return res.json();
}

/**
 * 7. POST /wages/runs - Compute a wage run.
 * `freeze: false` creates an OPEN draft (recompute freely); `freeze: true`
 * (the default, matching every existing caller) creates a CLOSED/frozen
 * run — reopening it afterwards requires apiReopenWageRun with a reason.
 * `orderNumber`/`styleCode` are mutually exclusive (backend 422s both) —
 * a scoped run only pays PIECE_RATE work (piece_rate_only: true).
 */
export async function apiComputeWageRun(token, { periodStart, periodEnd, freeze, orderNumber, styleCode } = {}) {
  const payload = { period_start: periodStart, period_end: periodEnd };
  if (freeze !== undefined) payload.freeze = freeze;
  if (orderNumber) payload.order_number = orderNumber;
  else if (styleCode) payload.style_code = styleCode;

  const res = await fetch(`${API_BASE_URL}/api/v1/wages/runs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => 'Failed to compute wage run');
    throw new Error(errText || `Failed to compute wage run (${res.status})`);
  }
  return res.json();
}

/**
 * GET /wages/orders — order cards for the payroll landing screen
 * (order -> style -> rate). @returns {order_number, styles, styles_priced,
 * fully_priced, sku_count, qty_ordered, style_codes[]}[]
 */
export async function apiGetWageOrders(token, { on, unpricedOnly } = {}) {
  const params = new URLSearchParams();
  if (on) params.set('on', on);
  if (unpricedOnly !== undefined) params.set('unpriced_only', unpricedOnly);
  const qs = params.toString();
  const res = await fetch(`${API_BASE_URL}/api/v1/wages/orders${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch wage orders (${res.status})`);
  return res.json();
}

/**
 * POST /wages/runs/{run_id}/close — freezes a draft (idempotent; 409 on
 * an empty run).
 */
export async function apiCloseWageRun(token, runId) {
  const res = await fetch(`${API_BASE_URL}/api/v1/wages/runs/${encodeURIComponent(runId)}/close`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => 'Failed to close wage run');
    throw new Error(errText || `Failed to close wage run (${res.status})`);
  }
  return res.json();
}

/**
 * POST /wages/runs/{run_id}/reopen — the only door out of CLOSED.
 * `reason` is mandatory (5-500 chars), stored and audited.
 */
export async function apiReopenWageRun(token, runId, reason) {
  const res = await fetch(`${API_BASE_URL}/api/v1/wages/runs/${encodeURIComponent(runId)}/reopen`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => 'Failed to reopen wage run');
    throw new Error(errText || `Failed to reopen wage run (${res.status})`);
  }
  return res.json();
}

/**
 * POST /wages/runs/{run_id}/recompute — recomputes an OPEN run freely.
 * On a CLOSED run this 409s unless `confirmClosed: true` is sent (a
 * one-call escape hatch that records no reason — prefer apiReopenWageRun
 * for anything that needs an audit trail).
 */
export async function apiRecomputeWageRun(token, runId, confirmClosed = false) {
  const res = await fetch(`${API_BASE_URL}/api/v1/wages/runs/${encodeURIComponent(runId)}/recompute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ confirm_closed: confirmClosed }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => 'Failed to recompute wage run');
    throw new Error(errText || `Failed to recompute wage run (${res.status})`);
  }
  return res.json();
}

/**
 * GET /wages/runs/{run_id}/breakdown — the Run Engine result screen.
 * One frozen row set folded three ways — by_style[], by_stage[],
 * by_employee[] — never re-sum these client-side, they're server folds
 * of the same rows so they can't disagree with each other or the total.
 */
export async function apiGetWageRunBreakdown(token, runId) {
  const res = await fetch(`${API_BASE_URL}/api/v1/wages/runs/${encodeURIComponent(runId)}/breakdown`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch wage run breakdown (${res.status})`);
  return res.json();
}

/**
 * GET /wages/runs/{run_id}/pieces — per-piece payroll detail: garment,
 * stage, worker, employee barcode, amount. `rate`/`amount` come back
 * null (never 0) when that cell wasn't priced in this run.
 */
export async function apiGetWageRunPieces(token, runId, { styleCode, limit, offset } = {}) {
  const params = new URLSearchParams();
  if (styleCode) params.set('style_code', styleCode);
  if (limit) params.set('limit', limit);
  if (offset) params.set('offset', offset);
  const qs = params.toString();
  const res = await fetch(`${API_BASE_URL}/api/v1/wages/runs/${encodeURIComponent(runId)}/pieces${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch wage run pieces (${res.status})`);
  return res.json();
}

/**
 * GET /wages/ledger — every run, latest computed first, searchable by
 * order/style/window/status. Each row carries recompute_count and
 * reopen_count.
 */
export async function apiGetWageLedger(token, { orderNumber, styleCode, dateFrom, dateTo, status, limit, offset } = {}) {
  const params = new URLSearchParams();
  if (orderNumber) params.set('order_number', orderNumber);
  if (styleCode) params.set('style_code', styleCode);
  if (dateFrom) params.set('date_from', dateFrom);
  if (dateTo) params.set('date_to', dateTo);
  if (status) params.set('status', status);
  if (limit) params.set('limit', limit);
  if (offset) params.set('offset', offset);
  const qs = params.toString();
  const res = await fetch(`${API_BASE_URL}/api/v1/wages/ledger${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch wage ledger (${res.status})`);
  return res.json();
}

/**
 * 8. GET /wages/runs/{run_id} - Payslip details
 */
export async function apiGetWageRunDetails(token, runId) {
  const res = await fetch(`${API_BASE_URL}/api/v1/wages/runs/${encodeURIComponent(runId)}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch wage run details (${res.status})`);
  return res.json();
}

/**
 * ==========================================
 * BARCODE FEATURE — API CONTRACT V3.0 HELPERS
 * ==========================================
 */

/**
 * 1. GET /api/v1/barcode/resolve?code=...
 * The single front door for every physical scan
 */
export async function apiBarcodeResolve(token, code) {
  const res = await fetch(`${API_BASE_URL}/api/v1/barcode/resolve?code=${encodeURIComponent(code)}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) {
    const err = new Error('Barcode code not found in registry');
    err.status = 404;
    throw err;
  }
  if (res.status === 410) {
    const err = new Error('Employee code deactivated (label retired)');
    err.status = 410;
    throw err;
  }
  if (!res.ok) throw new Error(`Failed to resolve barcode (${res.status})`);
  return res.json();
}

/**
 * 2. POST /api/v1/barcode/print
 * Get printable payload for a set of codes
 */
export async function apiBarcodePrint(token, { codes, sku_id, order_id }) {
  const payload = {};
  if (codes) payload.codes = codes;
  if (sku_id) payload.sku_id = sku_id;
  if (order_id) payload.order_id = order_id;

  const res = await fetch(`${API_BASE_URL}/api/v1/barcode/print`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to generate printable barcodes (${res.status})`);
  return res.json();
}

/**
 * 3. POST /api/v1/production/log
 * Two-door production logging (Barcode Door or Manual Door)
 */
export async function apiProductionLogTwoDoor(token, logData) {
  const res = await fetch(`${API_BASE_URL}/api/v1/production/log`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(logData),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => 'Production log failed');
    throw new Error(errText || `Production log failed (${res.status})`);
  }
  return res.json();
}

/**
 * 4. PATCH /api/v1/employees/{id}/barcode
 * Edit, reassign, or deactivate an employee barcode
 */
export async function apiPatchEmployeeBarcode(token, employeeId, action) {
  const res = await fetch(`${API_BASE_URL}/api/v1/employees/${encodeURIComponent(employeeId)}/barcode`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action }),
  });
  if (!res.ok) throw new Error(`Failed to update employee barcode (${res.status})`);
  return res.json();
}

/**
 * 5. POST /api/v1/materials/lots
 * Create material lot (LEATHER, LINING, ACCESSORY)
 */
export async function apiCreateMaterialLot(token, lotData) {
  const res = await fetch(`${API_BASE_URL}/api/v1/materials/lots`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(lotData),
  });
  if (!res.ok) throw new Error(`Failed to create material lot (${res.status})`);
  return res.json();
}

/**
 * 5b. GET /api/v1/materials/lots
 * Fetch available material lots based on category and filters
 */
export async function apiGetMaterialLots(token, params = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.append(key, value);
  }
  const res = await fetch(`${API_BASE_URL}/api/v1/materials/lots?${query.toString()}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch material lots (${res.status})`);
  return res.json();
}

/**
 * 6. GET /api/v1/materials/stock
 * Check stock on-hand, reserved, available, shortfall
 */
export async function apiGetMaterialsStock(token, params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE_URL}/api/v1/materials/stock?${query}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch material stock (${res.status})`);
  return res.json();
}

/**
 * 7. POST /api/v1/materials/receive
 * Record receiving approved/rejected quantities
 */
export async function apiReceiveMaterials(token, receiveData) {
  const res = await fetch(`${API_BASE_URL}/api/v1/materials/receive`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(receiveData),
  });
  if (!res.ok) throw new Error(`Failed to receive material lot (${res.status})`);
  return res.json();
}

/**
 * 8. POST /api/v1/suppliers/orders
 * Raise manual supplier order on shortfall
 */
export async function apiCreateSupplierOrder(token, orderData) {
  const res = await fetch(`${API_BASE_URL}/api/v1/suppliers/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(orderData),
  });
  if (!res.ok) throw new Error(`Failed to create supplier order (${res.status})`);
  return res.json();
}

/**
 * 9. PATCH /api/v1/suppliers/orders/{id}
 * Flip status ORDERED -> ARRIVED
 */
export async function apiPatchSupplierOrder(token, orderId, status = 'ARRIVED') {
  const res = await fetch(`${API_BASE_URL}/api/v1/suppliers/orders/${encodeURIComponent(orderId)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(`Failed to update supplier order status (${res.status})`);
  return res.json();
}

/**
 * 10. POST /api/v1/drawers/store-scan
 * Store piece into drawer & evaluate completeness
 */
export async function apiStoreDrawerScan(token, drawerData) {
  const res = await fetch(`${API_BASE_URL}/api/v1/drawers/store-scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(drawerData),
  });
  if (!res.ok) {
    let detail;
    try {
      const errObj = await res.json();
      detail = errObj.detail || errObj.message;
    } catch {
      // no JSON body
    }
    const err = new Error(detail || `Drawer store scan failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/**
 * POST /api/v1/drawers/send
 * Batch-releases many drawers to LINING or STITCHING in one call. Sending to
 * STITCHING is what releases those pieces into line-stitching. Accepts
 * PARTIALLY — some drawers may come back in not_ready/not_found while others
 * succeed in `sent`; check count_sent, don't treat the call as all-or-nothing.
 * @param {{ drawer_ids: string[], destination: 'STITCHING' | 'LINING' }} payload
 */
export async function apiSendDrawers(token, { drawer_ids, destination }) {
  const res = await fetch(`${API_BASE_URL}/api/v1/drawers/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ drawer_ids, destination }),
  });
  if (!res.ok) {
    let detail;
    try {
      const errObj = await res.json();
      detail = errObj.detail || errObj.message;
    } catch {
      // no JSON body
    }
    const err = new Error(detail || `Failed to send drawers (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/**
 * 11. POST /api/v1/drawers/{id}/receive
 * Transition drawer status (RECEIVED / SENDED)
 */
export async function apiReceiveDrawer(token, drawerId, transition) {
  const res = await fetch(`${API_BASE_URL}/api/v1/drawers/${encodeURIComponent(drawerId)}/receive`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ transition }),
  });
  if (!res.ok) {
    let detail;
    try {
      const errObj = await res.json();
      detail = errObj.detail || errObj.message;
    } catch {
      // no JSON body
    }
    const err = new Error(detail || `Failed to update drawer transition (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/**
 * 12. POST /api/v1/attendance/scan-check-in
 * Check in/out by scanning employee barcode
 */
export async function apiAttendanceScanCheckIn(token, scanData) {
  const res = await fetch(`${API_BASE_URL}/api/v1/attendance/scan-check-in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(scanData),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => 'Scan check-in failed');
    throw new Error(errText || `Scan check-in failed (${res.status})`);
  }
  return res.json();
}

/**
 * GET /api/v1/production/piece-state
 * THE SCAN-AND-VERIFY CALL (per API docs).
 * For ONE scanned piece: identity, current stage, next stage, drawer, actor readiness.
 * Send code + employee_barcode after both scans are done.
 * If ready_to_log === true → POST /production/log immediately, no stage picker needed.
 * If ready_to_log === false → render blockers[].
 * Use stages[] to enable/disable the stage cards.
 * @param {{ code, piece_id, employee_barcode, employee_id }} params
 * @returns {{ piece, drawer, current_stage, next_stage, stages, ready_to_log, blockers, actor, sku }}
 */
export async function apiGetPieceState(token, { code, piece_id, employee_barcode, employee_id } = {}) {
  const params = new URLSearchParams();
  if (code) params.append('code', code);
  if (piece_id) params.append('piece_id', piece_id);
  if (employee_barcode) params.append('employee_barcode', employee_barcode);
  if (employee_id) params.append('employee_id', employee_id);

  const res = await fetch(`${API_BASE_URL}/api/v1/production/piece-state?${params.toString()}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    let errText;
    try {
      const errObj = await res.json();
      errText = errObj.detail || errObj.message || JSON.stringify(errObj);
    } catch {
      errText = await res.text().catch(() => 'Failed to fetch piece state');
    }
    throw new Error(errText || `Failed to fetch piece state (${res.status})`);
  }
  return res.json();
}

/**
 * 13. GET /api/v1/analytics/pieces/{code}
 * Full piece life story & timeline
 */
export async function apiGetAnalyticsPieceDetail(token, pieceCode) {
  const res = await fetch(`${API_BASE_URL}/api/v1/analytics/pieces/${encodeURIComponent(pieceCode)}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch piece analytics (${res.status})`);
  return res.json();
}

/**
 * 14. GET /api/v1/analytics/consumption
 * Leather consumed vs stock rollup per style/order
 */
export async function apiGetAnalyticsConsumption(token, params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE_URL}/api/v1/analytics/consumption?${query}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch consumption analytics (${res.status})`);
  return res.json();
}

// ─── BARCODE REGISTRY (mounted at /api/v1/barcode) ───
// Every printed code (piece / employee / drawer / material lot) resolves
// through this one registry. Piece barcodes are pre-minted during Cutting —
// there is no "generate" endpoint here, only resolve/print/browse/audit.

/**
 * 15. GET /api/v1/barcode/resolve
 * Resolve one scanned code to its full detail (piece/employee/drawer/lot).
 * A retired code responds 410; an unknown code responds 404 — both are
 * surfaced as thrown Errors with the backend's message.
 * @returns {{ code, type, active, caption, piece, employee, drawer, lot }}
 */
export async function apiResolveBarcode(token, code) {
  const res = await fetch(`${API_BASE_URL}/api/v1/barcode/resolve?code=${encodeURIComponent(code)}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    let detail = errText;
    try { detail = JSON.parse(errText).detail; } catch { /* not JSON */ }
    throw new Error(detail || `Failed to resolve barcode (${res.status})`);
  }
  return res.json();
}

/**
 * 16. GET /api/v1/barcode/detail
 * Full detail for one clicked/scanned code — reuses the /resolve payload shape.
 * @returns {{ code, type, active, caption, piece, employee, drawer, lot }}
 */
export async function apiGetBarcodeDetail(token, code) {
  const res = await fetch(`${API_BASE_URL}/api/v1/barcode/detail?code=${encodeURIComponent(code)}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    let detail = errText;
    try { detail = JSON.parse(errText).detail; } catch { /* not JSON */ }
    throw new Error(detail || `Failed to fetch barcode detail (${res.status})`);
  }
  return res.json();
}

/**
 * 17. POST /api/v1/barcode/print
 * Produce printable label payloads for explicit codes, a whole SKU, or a
 * whole order. Provide exactly one of { codes, sku_id, order_id }.
 * @returns {Array<{ code, symbology, caption, known }>} labels
 */
export async function apiPrintBarcodes(token, { codes, sku_id, order_id } = {}) {
  const body = {};
  if (codes) body.codes = codes;
  if (sku_id) body.sku_id = sku_id;
  if (order_id) body.order_id = order_id;
  const res = await fetch(`${API_BASE_URL}/api/v1/barcode/print`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    let detail = errText;
    try { detail = JSON.parse(errText).detail?.[0]?.msg || JSON.parse(errText).detail; } catch { /* not JSON */ }
    throw new Error(detail || `Failed to generate print labels (${res.status})`);
  }
  const data = await res.json();
  return data.labels;
}

/**
 * 18. GET /api/v1/barcode/orders
 * The order picker — every order that has generated barcodes.
 * @returns {Array<{ order_id, order_number, client_name, minted, first_generated_at, last_generated_at }>}
 */
export async function apiGetBarcodeOrders(token) {
  const res = await fetch(`${API_BASE_URL}/api/v1/barcode/orders`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch barcode orders (${res.status})`);
  return res.json();
}

/**
 * 19. GET /api/v1/barcode/orders/{order_id}/skus
 * SKU + style options to populate the history filter dropdowns for an order.
 * @returns {Array<{ sku_id, sku_code, colour, size, style_id, style_name }>}
 */
export async function apiGetOrderBarcodeSkus(token, orderId) {
  const res = await fetch(`${API_BASE_URL}/api/v1/barcode/orders/${encodeURIComponent(orderId)}/skus`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch order SKU options (${res.status})`);
  return res.json();
}

/**
 * 20. GET /api/v1/barcode/orders/{order_id}/analytics
 * Per-order barcode analytics: planned vs generated vs balance, plus a
 * per-style breakdown, a duplicates=0 integrity proof and a half_minted flag.
 * @returns {{ order_id, order_total: object, by_style: Array<object> }}
 */
export async function apiGetOrderBarcodeAnalytics(token, orderId) {
  const res = await fetch(`${API_BASE_URL}/api/v1/barcode/orders/${encodeURIComponent(orderId)}/analytics`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch order barcode analytics (${res.status})`);
  return res.json();
}

/**
 * 21. GET /api/v1/barcode/orders/{order_id}/barcodes
 * The filterable, paginated history: order → style → piece, with generated
 * date/time, sku, style, colour, size, seq, current stage, and status.
 * @param {{ skuId, styleId, size, status, dateFrom, dateTo, page, pageSize }} filters
 * @returns {{ order_id, page, page_size, total, pages, items: Array<object> }}
 */
export async function apiGetOrderBarcodes(token, orderId, filters = {}) {
  const { skuId, styleId, size, status, dateFrom, dateTo, page, pageSize } = filters;
  const params = new URLSearchParams();
  if (skuId) params.set('sku_id', skuId);
  if (styleId) params.set('style_id', styleId);
  if (size) params.set('size', size);
  if (status) params.set('status', status);
  if (dateFrom) params.set('date_from', dateFrom);
  if (dateTo) params.set('date_to', dateTo);
  if (page) params.set('page', page);
  if (pageSize) params.set('page_size', pageSize);
  const qs = params.toString();
  const res = await fetch(`${API_BASE_URL}/api/v1/barcode/orders/${encodeURIComponent(orderId)}/barcodes${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch order barcode history (${res.status})`);
  return res.json();
}

/**
 * 22. GET /api/v1/drawers
 * The drawer label sheet: every drawer plus its scannable DRAWER-type code.
 * A row with `barcode: null` has no registry code and cannot be printed —
 * the caller must show it, not silently drop it.
 * @param {{ state, seq_from, seq_to, limit, offset }} params
 * @returns {{ total, count, items: Array<{ drawer_id, seq, code, state, barcode_id, barcode, caption, barcode_status }> }}
 */
export async function apiListDrawers(token, params = {}) {
  const qs = new URLSearchParams();
  if (params.limit) qs.append('limit', params.limit);
  else qs.append('limit', 500); // Default fallback

  if (params.seq_from) qs.append('seq_from', params.seq_from);
  if (params.seq_to) qs.append('seq_to', params.seq_to);
  if (params.state) qs.append('state', params.state);
  if (params.offset) qs.append('offset', params.offset);
  if (params.has_piece !== undefined) qs.append('has_piece', params.has_piece);
  if (params.sendable !== undefined) qs.append('sendable', params.sendable);

  const res = await fetch(`${API_BASE_URL}/api/v1/drawers?${qs.toString()}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    let detail = errText;
    try { detail = JSON.parse(errText).detail; } catch { /* not JSON */ }
    throw new Error(detail || `Failed to list drawers (${res.status})`);
  }
  return res.json();
}

/**
 * GET /api/v1/drawers/{drawer_id}
 * One drawer opened: contents, full piece card, awaiting/complete/can_send.
 * Used to inspect a drawer's real state BEFORE deciding whether to POST a
 * store-scan — a drawer already HOLDING BOTH / RECEIVED / sended must not be
 * re-scanned.
 */
export async function apiGetDrawer(token, drawerId) {
  const res = await fetch(`${API_BASE_URL}/api/v1/drawers/${encodeURIComponent(drawerId)}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    let detail;
    try {
      const errObj = await res.json();
      detail = errObj.detail || errObj.message;
    } catch {
      // no JSON body
    }
    const err = new Error(detail || `Failed to fetch drawer (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// 23. MANAGER DASHBOARD ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/dashboard/cutting
 * @param {string} token
 * @param {{ order_id?: string }} params
 */
export async function apiGetCuttingDashboard(token, params = {}) {
  const qs = new URLSearchParams();
  if (params.order_id) qs.set('order_id', params.order_id);
  const qStr = qs.toString();
  const res = await fetch(`${API_BASE_URL}/api/v1/dashboard/cutting${qStr ? `?${qStr}` : ''}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(err || `Failed to fetch cutting dashboard (${res.status})`);
  }
  return res.json();
}

/**
 * GET /api/v1/dashboard/cutting/employees/{employee_id}
 * @param {string} token
 * @param {string} employeeId
 */
export async function apiGetCuttingEmployeeDetail(token, employeeId) {
  const res = await fetch(`${API_BASE_URL}/api/v1/dashboard/cutting/employees/${encodeURIComponent(employeeId)}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(err || `Failed to fetch cutting employee detail (${res.status})`);
  }
  return res.json();
}

/**
 * GET /api/v1/dashboard/cutting/consumption
 * @param {string} token
 * @param {{ order_id?: string, employee_id?: string, start?: string, end?: string }} params
 */
export async function apiGetCuttingConsumption(token, params = {}) {
  const qs = new URLSearchParams();
  if (params.order_id) qs.set('order_id', params.order_id);
  if (params.employee_id) qs.set('employee_id', params.employee_id);
  if (params.start) qs.set('start', params.start);
  if (params.end) qs.set('end', params.end);
  const qStr = qs.toString();
  const res = await fetch(`${API_BASE_URL}/api/v1/dashboard/cutting/consumption${qStr ? `?${qStr}` : ''}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(err || `Failed to fetch cutting consumption (${res.status})`);
  }
  return res.json();
}

/**
 * GET /api/v1/dashboard/lining
 * @param {string} token
 * @param {{ order_id?: string }} params
 */
export async function apiGetLiningDashboard(token, params = {}) {
  const qs = new URLSearchParams();
  if (params.order_id) qs.set('order_id', params.order_id);
  const qStr = qs.toString();
  const res = await fetch(`${API_BASE_URL}/api/v1/dashboard/lining${qStr ? `?${qStr}` : ''}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(err || `Failed to fetch lining dashboard (${res.status})`);
  }
  return res.json();
}

/**
 * GET /api/v1/dashboard/lining/employees/{employee_id}
 * @param {string} token
 * @param {string} employeeId
 */
export async function apiGetLiningEmployeeDetail(token, employeeId) {
  const res = await fetch(`${API_BASE_URL}/api/v1/dashboard/lining/employees/${encodeURIComponent(employeeId)}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(err || `Failed to fetch lining employee detail (${res.status})`);
  }
  return res.json();
}

/**
 * GET /api/v1/dashboard/lining/consumption
 * @param {string} token
 * @param {{ order_id?: string, employee_id?: string, start?: string, end?: string }} params
 */
export async function apiGetLiningConsumption(token, params = {}) {
  const qs = new URLSearchParams();
  if (params.order_id) qs.set('order_id', params.order_id);
  if (params.employee_id) qs.set('employee_id', params.employee_id);
  if (params.start) qs.set('start', params.start);
  if (params.end) qs.set('end', params.end);
  const qStr = qs.toString();
  const res = await fetch(`${API_BASE_URL}/api/v1/dashboard/lining/consumption${qStr ? `?${qStr}` : ''}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(err || `Failed to fetch lining consumption (${res.status})`);
  }
  return res.json();
}

/**
 * GET /api/v1/dashboard/stitching
 * @param {string} token
 * @param {{ order_id?: string }} params
 */
export async function apiGetStitchingDashboard(token, params = {}) {
  const qs = new URLSearchParams();
  if (params.order_id) qs.set('order_id', params.order_id);
  const qStr = qs.toString();
  const res = await fetch(`${API_BASE_URL}/api/v1/dashboard/stitching${qStr ? `?${qStr}` : ''}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(err || `Failed to fetch stitching dashboard (${res.status})`);
  }
  return res.json();
}

/**
 * GET /api/v1/dashboard/stitching/employees/{employee_id}
 * @param {string} token
 * @param {string} employeeId
 */
export async function apiGetStitchingEmployeeDetail(token, employeeId) {
  const res = await fetch(`${API_BASE_URL}/api/v1/dashboard/stitching/employees/${encodeURIComponent(employeeId)}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(err || `Failed to fetch stitching employee detail (${res.status})`);
  }
  return res.json();
}

/**
 * GET /api/v1/dashboard/stitching/pieces/{piece_code}
 * @param {string} token
 * @param {string} pieceCode
 */
export async function apiGetStitchingPieceDetail(token, pieceCode) {
  const res = await fetch(`${API_BASE_URL}/api/v1/dashboard/stitching/pieces/${encodeURIComponent(pieceCode)}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(err || `Failed to fetch stitching piece detail (${res.status})`);
  }
  return res.json();
}

/**
 * GET /api/v1/dashboard/store
 * @param {string} token
 * @param {{ style_id?: string, state?: string, material_type?: string }} params
 */
export async function apiGetStoreDashboard(token, params = {}) {
  const qs = new URLSearchParams();
  if (params.style_id) qs.set('style_id', params.style_id);
  if (params.state) qs.set('state', params.state);
  if (params.material_type) qs.set('material_type', params.material_type);
  const qStr = qs.toString();
  const res = await fetch(`${API_BASE_URL}/api/v1/dashboard/store${qStr ? `?${qStr}` : ''}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(err || `Failed to fetch store dashboard (${res.status})`);
  }
  return res.json();
}

/**
 * GET /api/v1/dashboard/store/drawers/{drawer_id}
 * @param {string} token
 * @param {string} drawerId
 */
export async function apiGetStoreDrawerDetail(token, drawerId) {
  const res = await fetch(`${API_BASE_URL}/api/v1/dashboard/store/drawers/${encodeURIComponent(drawerId)}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(err || `Failed to fetch store drawer detail (${res.status})`);
  }
  return res.json();
}

/**
 * GET /api/v1/dashboard/store/drawers/{drawer_id}/movement
 * @param {string} token
 * @param {string} drawerId
 */
export async function apiGetStoreDrawerMovement(token, drawerId) {
  const res = await fetch(`${API_BASE_URL}/api/v1/dashboard/store/drawers/${encodeURIComponent(drawerId)}/movement`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(err || `Failed to fetch store drawer movement (${res.status})`);
  }
  return res.json();
}

/**
 * GET /api/v1/dashboard/store/traceability
 * @param {string} token
 * @param {{ piece_code?: string, style_id?: string, material_type?: string }} params
 */
export async function apiGetStoreTraceability(token, params = {}) {
  const qs = new URLSearchParams();
  if (params.piece_code) qs.set('piece_code', params.piece_code);
  if (params.style_id) qs.set('style_id', params.style_id);
  if (params.material_type) qs.set('material_type', params.material_type);
  const qStr = qs.toString();
  const res = await fetch(`${API_BASE_URL}/api/v1/dashboard/store/traceability${qStr ? `?${qStr}` : ''}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(err || `Failed to fetch store traceability (${res.status})`);
  }
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// 24. DIRECT MANAGER DASHBOARD ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/dashboard/direct-manager
 * @param {string} token
 */
export async function apiGetDirectManagerDashboard(token) {
  const res = await fetch(`${API_BASE_URL}/api/v1/dashboard/direct-manager`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(err || `Failed to fetch direct manager dashboard (${res.status})`);
  }
  return res.json();
}

/**
 * GET /api/v1/dashboard/direct-manager/orders/{order_id}
 * @param {string} token
 * @param {string} orderId
 */
export async function apiGetDirectManagerOrderDetail(token, orderId) {
  const res = await fetch(`${API_BASE_URL}/api/v1/dashboard/direct-manager/orders/${encodeURIComponent(orderId)}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(err || `Failed to fetch direct manager order detail (${res.status})`);
  }
  return res.json();
}

/**
 * GET /api/v1/dashboard/direct-manager/styles/{style_id}
 * @param {string} token
 * @param {string} styleId
 */
export async function apiGetDirectManagerStyleDetail(token, styleId) {
  const res = await fetch(`${API_BASE_URL}/api/v1/dashboard/direct-manager/styles/${encodeURIComponent(styleId)}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(err || `Failed to fetch direct manager style detail (${res.status})`);
  }
  return res.json();
}

/**
 * GET /api/v1/dashboard/direct-manager/pieces/{piece_code}
 * @param {string} token
 * @param {string} pieceCode
 */
export async function apiGetDirectManagerPieceDetail(token, pieceCode) {
  const res = await fetch(`${API_BASE_URL}/api/v1/dashboard/direct-manager/pieces/${encodeURIComponent(pieceCode)}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(err || `Failed to fetch direct manager piece detail (${res.status})`);
  }
  return res.json();
}


