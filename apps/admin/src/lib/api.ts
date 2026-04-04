import axios from 'axios';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('admin_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export async function adminLogin(telegramInitData: string) {
  const response = await api.post('/auth/telegram', { initData: telegramInitData });
  if (response.data.accessToken) {
    localStorage.setItem('admin_token', response.data.accessToken);
  }
  return response.data;
}

export async function getProfile() {
  const response = await api.get('/me');
  return response.data;
}

export async function getAdminUsers(params?: { search?: string; status?: string; limit?: number; offset?: number }) {
  const response = await api.get('/admin/users', { params });
  return response.data;
}

export async function updateUserStatus(userId: string, status: string) {
  const response = await api.patch(`/admin/users/${userId}/status`, { status });
  return response.data;
}

export async function getAdminPeriods(params?: { status?: string }) {
  const response = await api.get('/admin/periods', { params });
  return response.data;
}

export async function getAdminPeriod(id: string) {
  const response = await api.get(`/admin/periods/${id}`);
  return response.data;
}

export async function createPeriod(data: any) {
  const response = await api.post('/admin/periods', data);
  return response.data;
}

export async function updatePeriodStatus(id: string, status: string) {
  const response = await api.put(`/admin/periods/${id}/status`, { status });
  return response.data;
}

export async function previewPeriodSettlement(id: string, data: any) {
  const response = await api.post(`/admin/periods/${id}/settlement/preview`, data);
  return response.data;
}

export async function approvePeriodSettlement(
  id: string,
  data: {
    ending_balance_usdt: number;
    trader_fee_percent?: number;
    tron_network_fee_usdt?: number;
    ton_network_fee_usdt?: number;
    bsc_network_fee_usdt?: number;
    preview_signature: string;
  },
) {
  const response = await api.post(`/admin/periods/${id}/settlement/approve`, data);
  return response.data;
}

export async function getPeriodPayoutRegistry(id: string) {
  const response = await api.get(`/admin/periods/${id}/payout-registry`);
  return response.data;
}

export async function generatePeriodPayoutRegistry(id: string) {
  const response = await api.post(`/admin/periods/${id}/payout-registry/generate`);
  return response.data;
}

export async function getAdminDeposits(params?: { status?: string; network?: string; investment_period_id?: string; limit?: number; offset?: number }) {
  const response = await api.get('/admin/deposits', { params });
  return response.data;
}

export async function getAdminDeposit(id: string) {
  const response = await api.get(`/admin/deposits/${id}`);
  return response.data;
}

export async function transitionDeposit(id: string, status: string, reason?: string) {
  const response = await api.put(`/admin/deposits/${id}/status`, { status, reason });
  return response.data;
}

export async function getAdminReports(params?: { status?: string; limit?: number; offset?: number }) {
  const response = await api.get('/admin/reports', { params });
  return response.data;
}

export async function submitReport(id: string) {
  const response = await api.put(`/admin/reports/${id}/submit`);
  return response.data;
}

export async function approveReport(id: string) {
  const response = await api.put(`/admin/reports/${id}/approve`);
  return response.data;
}

export async function publishReport(id: string) {
  const response = await api.put(`/admin/reports/${id}/publish`);
  return response.data;
}

export async function getAdminPayouts(params?: { status?: string; batch_id?: string; limit?: number; offset?: number }) {
  const response = await api.get('/admin/payouts', { params });
  return response.data;
}

export async function approvePayout(id: string) {
  const response = await api.put(`/admin/payouts/${id}/approve`);
  return response.data;
}

export async function recordPayoutSent(id: string, tx_hash: string) {
  const response = await api.put(`/admin/payouts/${id}/sent`, { tx_hash });
  return response.data;
}

export async function recordPayoutConfirmed(id: string) {
  const response = await api.put(`/admin/payouts/${id}/confirmed`);
  return response.data;
}

export async function recordPayoutFailed(id: string, reason: string) {
  const response = await api.put(`/admin/payouts/${id}/failed`, { reason });
  return response.data;
}

export async function getAuditLog(params?: { actorType?: string; entityType?: string; action?: string; limit?: number; offset?: number }) {
  const response = await api.get('/admin/audit', { params });
  return response.data;
}

export default api;
