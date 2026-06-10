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
 * Compute and freeze a wage run for a period
 */
export async function apiComputeWageRun(token, period_start, period_end) {
  const res = await fetch(`${API_BASE_URL}/api/v1/wages/runs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ period_start, period_end }),
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
    console.error('[API] /imports/preview failed:', res.status, errText);
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
    console.error('[API] /imports/commit failed:', res.status, errText);
    throw new Error(errText || `Failed to commit import (${res.status})`);
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
