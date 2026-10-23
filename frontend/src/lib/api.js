const ADMIN_KEY = 'cc_admin_token';

export class ApiError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields || {};
  }
}

const storage = {
  get(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key, value) {
    try { value == null ? localStorage.removeItem(key) : localStorage.setItem(key, value); } catch { /* storage unavailable */ }
  }
};

export const adminToken = {
  get: () => storage.get(ADMIN_KEY),
  set: (t) => storage.set(ADMIN_KEY, t),
  clear: () => storage.set(ADMIN_KEY, null)
};

export async function api(path, { method = 'GET', body, admin = false, signal } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (admin) {
    const token = adminToken.get();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  let res;
  try {
    res = await fetch(`/api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError(0, 'Network error - please check your connection and try again.');
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (admin && res.status === 401) adminToken.clear();
    throw new ApiError(res.status, data.error || `Request failed (${res.status})`, data.fields);
  }
  return data;
}

export const qs = (params) =>
  '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')).toString();
