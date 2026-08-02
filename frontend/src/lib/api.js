const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

async function request(path, options = {}) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const contentType = res.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await res.json() : null;
  if (!res.ok) {
    throw new Error(body?.error || `Request to ${path} failed with ${res.status}`);
  }
  return body;
}

export const api = {
  backendUrl: BACKEND_URL,
  connectGmailUrl: `${BACKEND_URL}/auth/google`,
  me: () => request('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getTasks: () => request('/api/tasks'),
  updateTask: (id, updates) => request(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }),
  deleteTask: (id) => request(`/api/tasks/${id}`, { method: 'DELETE' }),
  pause: () => request('/api/settings/pause', { method: 'POST' }),
  resume: () => request('/api/settings/resume', { method: 'POST' }),
  disconnect: () => request('/api/settings/disconnect', { method: 'POST' }),
  deleteAllData: () => request('/api/settings/delete-all', { method: 'POST' }),
  checkout: () => request('/api/billing/checkout', { method: 'POST' }),
  syncCalendar: () => request('/api/calendar/sync', { method: 'POST' }),
  updatePreferences: (updates) => request('/api/settings/preferences', { method: 'PATCH', body: JSON.stringify(updates) }),
  subscribePush: (subscription) => request('/api/settings/push/subscribe', { method: 'POST', body: JSON.stringify(subscription) }),
  unsubscribePush: (endpoint) => request('/api/settings/push/unsubscribe', { method: 'POST', body: JSON.stringify({ endpoint }) }),
  sendPhoneCode: (phone_number) => request('/api/settings/phone/send-code', { method: 'POST', body: JSON.stringify({ phone_number }) }),
  verifyPhoneCode: (phone_number, code) => request('/api/settings/phone/verify', { method: 'POST', body: JSON.stringify({ phone_number, code }) }),
};
