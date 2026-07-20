// API service for Kairox Leather Platform backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

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
export async function apiCreateClient(token, name, companyName, orderNumber) {
  const res = await fetch(`${API_BASE_URL}/api/v1/clients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, company_name: companyName, order_number: orderNumber }),
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
  const res = await fetch(`${API_BASE_URL}/api/v1/production/scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
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
  const res = await fetch(`${API_BASE_URL}/api/v1/production/cutting`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let errText;
    try {
      const errObj = await res.json();
      errText = errObj.detail || errObj.message || JSON.stringify(errObj);
    } catch {
      errText = await res.text().catch(() => 'Failed to create cutting event');
    }
    console.warn('[apiProductionCutting] error response:', errText);
    throw new Error(errText || `Failed to create cutting event (${res.status})`);
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

// /**
//  * Compute and freeze a wage run for a period
//  */
// export async function apiComputeWageRun(token, period_start, period_end) {
//   const res = await fetch(`${API_BASE_URL}/api/v1/wages/runs`, {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//       Authorization: `Bearer ${token}`,
//     },
//     body: JSON.stringify({ period_start, period_end }),
//   });
//   if (!res.ok) {
//     const errText = await res.text().catch(() => 'Failed to compute wage run');
//     throw new Error(errText || `Failed to compute wage run (${res.status})`);
//   }
//   return res.json();
// }

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
    const errText = await res.text().catch(() => 'Failed to preview import');
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
    const errText = await res.text().catch(() => 'Failed to commit import');
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

// ─── ANALYTICS ───

export async function apiGetAnalyticsOverview(token) {
  const res = await fetch(`${API_BASE_URL}/api/v1/analytics/overview`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch analytics overview');
  return res.json();
}

export async function apiGetStageSpreadAlerts(token) {
  const res = await fetch(`${API_BASE_URL}/api/v1/analytics/alerts/stage-spread`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch stage spread alerts');
  return res.json();
}

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
  // ─── MOCK API ENDPOINTS (FOR UI DEVELOPMENT) ─────────────────────────────────

// ─── COMPLETE 8 MOCK API ENDPOINTS ───────────────────────────────────────────

// 1. GET /wages/styles
export async function apiGetWageStyles(token, queryParams = {}) {
  console.log("Mock: Fetching Wage Styles...");
  return [
    { style_code: "JP-CLERMONT_VEST", style_name: "CLERMONT + VEST", rated_operations: 3, total_operations: 7, fully_rated: false },
    { style_code: "REGAL-001", style_name: "REGAL JACKET", rated_operations: 5, total_operations: 5, fully_rated: true },
    { style_code: "KAI-VEST-02", style_name: "BASIC VEST", rated_operations: 0, total_operations: 4, fully_rated: false },
    { style_code: "KAI-VEST-002", style_name: "BASIC JACKET", rated_operations: 0, total_operations: 8, fully_rated: false },
    { style_code: "KAI-VEST-003", style_name: "BASIC JACKET", rated_operations: 0, total_operations: 12, fully_rated: false }
  ];
}

// 2. GET /wages/rate-sheet
export async function apiGetRateSheet(token, styleCode, onDate = null) {
  console.log("Mock: Fetching Rate Sheet for:", styleCode);
  return {
    style_code: styleCode,
    operations: [
      { operation_code: "CUTTING", label: "Cutting", sequence: 1, rate: 12.50 },
      { operation_code: "FUSING", label: "Fusing", sequence: 2, rate: null }
    ],
    missing_rate_count: 1
  };
}

// 3. POST /wages/rates/bulk
export async function apiSetWageRatesBulk(token, payload) {
  console.log("Mock: Saving Bulk Rates:", payload);
  return { saved: payload.lines.length };
}

// 4. POST /wages/rates (Single update - இதுதான் விடுபட்டது!)
export async function apiSetWageRateSingle(token, payload) {
  console.log("Mock: Saving Single Rate:", payload);
  return { success: true, updated: payload };
}

// 5. GET /wages/rate-history
export async function apiGetRateHistory(token, styleCode, operationCode) {
  console.log("Mock: Fetching Rate History...");
  return {
    style_code: styleCode,
    operation_code: operationCode,
    history: [
      { rate: 13.00, effective_from: "2026-08-01" },
      { rate: 12.50, effective_from: "2026-04-01" }
    ]
  };
}

// 6. GET /wages/runs
export async function apiGetWageRuns(token, limit = 50, offset = 0) {
  console.log("Mock: Fetching Wage Runs...");
  return [
    { id: "run-uuid-12345", period_start: "2026-05-01", period_end: "2026-05-31", status: "closed", total_amount: 482300.00 }
  ];
}

// 7. POST /wages/runs
export async function apiComputeWageRun(token, period_start, period_end) {
  console.log("Mock: Computing Wage Run...");
  return {
    id: "run-uuid-12345",
    period_start: period_start,
    period_end: period_end,
    status: "closed",
    total_amount: 482300.00,
    total_pieces: 15400,
    employee_count: 61,
    lines: [
      { employee_name: "Ravi Kumar", wage_type: "piece_rate", total_pieces: 120, amount_calculated: 1560 },
      { employee_name: "Anita S", wage_type: "monthly", total_pieces: 0, amount_calculated: 18000 }
    ]
  };
}

// 8. GET /wages/runs/{run_id}
export async function apiGetWageRunDetails(token, runId) {
  console.log("Mock: Fetching Wage Run Details...");
  return {
    id: runId,
    lines: [
      { employee_name: "Ravi Kumar", wage_type: "piece_rate", total_pieces: 120, amount_calculated: 1560 }
    ]
  };
}



// // ─── WAGES API ENDPOINTS ──────────────────────────────────────────────────────

// /**
//  * 1. GET /wages/styles - List of styles with pricing coverage
//  */
// export async function apiGetWageStyles(token, queryParams = {}) {
//     console.log(token)
//   const params = new URLSearchParams(queryParams);
//   const res = await fetch(`${API_BASE_URL}/api/v1/wages/styles?${params.toString()}`, {
//     method: 'GET',
//     headers: { Authorization: `Bearer ${token}` },
//   });
//   if (!res.ok) throw new Error(`Failed to fetch wage styles (${res.status})`);

//   return res.json();
// }

// /**
//  * 2. GET /wages/rate-sheet - Edit screen for one style
//  */
// export async function apiGetRateSheet(token, styleCode, onDate = null) {
//   let url = `${API_BASE_URL}/api/v1/wages/rate-sheet?style_code=${encodeURIComponent(styleCode)}`;
//   if (onDate) url += `&on=${onDate}`;
  
//   const res = await fetch(url, {
//     method: 'GET',
//     headers: { Authorization: `Bearer ${token}` },
//   });
//   if (!res.ok) throw new Error(`Failed to fetch rate sheet (${res.status})`);
//   return res.json();
// }

// /**
//  * 3. POST /wages/rates/bulk - Save edited sheet
//  */
// export async function apiSetWageRatesBulk(token, payload) {
//   const res = await fetch(`${API_BASE_URL}/api/v1/wages/rates/bulk`, {
//     method: 'POST',
//     headers: { 
//       'Content-Type': 'application/json',
//       Authorization: `Bearer ${token}` 
//     },
//     body: JSON.stringify(payload),
//   });
//   if (!res.ok) {
//     const errText = await res.text().catch(() => 'Failed to save bulk rates');
//     throw new Error(errText || `Failed to save bulk rates (${res.status})`);
//   }
//   return res.json();
// }

// /**
//  * 4. POST /wages/rates - Single cell update (Optional)
//  */
// export async function apiSetWageRateSingle(token, payload) {
//   const res = await fetch(`${API_BASE_URL}/api/v1/wages/rates`, {
//     method: 'POST',
//     headers: { 
//       'Content-Type': 'application/json',
//       Authorization: `Bearer ${token}` 
//     },
//     body: JSON.stringify(payload),
//   });
//   if (!res.ok) throw new Error(`Failed to set wage rate (${res.status})`);
//   return res.json();
// }

// /**
//  * 5. GET /wages/rate-history - Audit logs
//  */
// export async function apiGetRateHistory(token, styleCode, operationCode) {
//   const res = await fetch(`${API_BASE_URL}/api/v1/wages/rate-history?style_code=${encodeURIComponent(styleCode)}&operation_code=${encodeURIComponent(operationCode)}`, {
//     method: 'GET',
//     headers: { Authorization: `Bearer ${token}` },
//   });
//   if (!res.ok) throw new Error(`Failed to fetch rate history (${res.status})`);
//   return res.json();
// }

// /**
//  * 6. GET /wages/runs - Payroll history list
//  */
// export async function apiGetWageRuns(token, limit = 50, offset = 0) {
//   const res = await fetch(`${API_BASE_URL}/api/v1/wages/runs?limit=${limit}&offset=${offset}`, {
//     method: 'GET',
//     headers: { Authorization: `Bearer ${token}` },
//   });
//   if (!res.ok) throw new Error(`Failed to fetch wage runs (${res.status})`);
//   return res.json();
// }

// /**
//  * 7. POST /wages/runs - Compute & Freeze payroll
//  */
// export async function apiComputeWageRun(token, period_start, period_end) {
//   const res = await fetch(`${API_BASE_URL}/api/v1/wages/runs`, {
//     method: 'POST',
//     headers: { 
//       'Content-Type': 'application/json',
//       Authorization: `Bearer ${token}` 
//     },
//     body: JSON.stringify({ period_start, period_end }),
//   });
//   if (!res.ok) {
//     const errText = await res.text().catch(() => 'Failed to compute wage run');
//     throw new Error(errText || `Failed to compute wage run (${res.status})`);
//   }
//   return res.json();
// }

// /**
//  * 8. GET /wages/runs/{run_id} - Payslip details
//  */
// export async function apiGetWageRunDetails(token, runId) {
//   const res = await fetch(`${API_BASE_URL}/api/v1/wages/runs/${encodeURIComponent(runId)}`, {
//     method: 'GET',
//     headers: { Authorization: `Bearer ${token}` },
//   });
//   if (!res.ok) throw new Error(`Failed to fetch wage run details (${res.status})`);
//   return res.json();

