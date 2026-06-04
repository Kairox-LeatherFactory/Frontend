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
 * Create a new client
 * @returns {{ id, name, country }}
 */
export async function apiCreateClient(token, name, companyName) {
  const res = await fetch(`${API_BASE_URL}/api/v1/clients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, company_name: companyName }),
  });
  if (!res.ok) throw new Error(`Failed to create client (${res.status})`);
  return res.json();
}

/**
 * Fetch orders for a specific client
 * @returns {Array<{ id, po_number, order_date, delivery_deadline, sea_cutoff_date, ship_mode, styles }>}
 */
export async function apiGetClientOrders(token, clientId) {
  const res = await fetch(`${API_BASE_URL}/api/v1/clients/${clientId}/orders`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch orders for client ${clientId} (${res.status})`);
  return res.json();
}

/**
 * Fetch all active employees
 * @returns {Array<{ id, name, designation, wage_type, monthly_salary, is_active }>}
 */
export async function apiGetEmployees(token) {
  const res = await fetch(`${API_BASE_URL}/api/v1/employees?active_only=true`, {
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
    throw new Error(errText || `Failed to log event (${res.status})`);
  }
  return res.json();
}

/**
 * Fetch all wage runs (frozen payrolls)
 */
export async function apiGetWageRuns(token) {
  const res = await fetch(`${API_BASE_URL}/api/v1/wages/runs`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch wage runs (${res.status})`);
  return res.json();
}

/**
 * Compute and freeze a wage run for a period
 */
export async function apiComputeWageRun(token, period) {
  const res = await fetch(`${API_BASE_URL}/api/v1/wages/runs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ period }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => 'Failed to compute wage run');
    throw new Error(errText || `Failed to compute wage run (${res.status})`);
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
export async function apiImportPreview(token, file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE_URL}/api/v1/imports/preview`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => 'Failed to preview import');
    throw new Error(errText || `Failed to preview import (${res.status})`);
  }
  return res.json();
}

/**
 * Commit an Excel import (writes to DB, idempotent)
 */
export async function apiImportCommit(token, file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE_URL}/api/v1/imports/commit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => 'Failed to commit import');
    throw new Error(errText || `Failed to commit import (${res.status})`);
  }
  return res.json();
}
