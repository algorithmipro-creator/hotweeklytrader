import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function authenticateTelegram(initData: string) {
  const response = await api.post('/auth/telegram', { initData });
  if (response.data.accessToken) {
    localStorage.setItem('auth_token', response.data.accessToken);
  }
  return response.data;
}

export async function getProfile() {
  const response = await api.get('/me');
  return response.data;
}

export async function getDeposits() {
  const response = await api.get('/deposits');
  return response.data;
}

export async function getDeposit(id: string) {
  const response = await api.get(`/deposits/${id}`);
  return response.data;
}

export async function createDeposit(data: {
  investment_period_id: string;
  network: string;
  asset_symbol: string;
  requested_amount?: number;
}) {
  const response = await api.post('/deposits', data);
  return response.data;
}

export async function getPeriods() {
  const response = await api.get('/periods');
  return response.data;
}

export async function getReportByDeposit(depositId: string) {
  const response = await api.get(`/reports/deposit/${depositId}`);
  return response.data;
}

export async function getPayoutsByDeposit(depositId: string) {
  const response = await api.get(`/payouts/deposit/${depositId}`);
  return response.data;
}

export async function getNotifications() {
  const response = await api.get('/notifications');
  return response.data;
}

export async function markNotificationRead(id: string) {
  const response = await api.put(`/notifications/${id}/read`);
  return response.data;
}

export async function getSupportCases() {
  const response = await api.get('/support');
  return response.data;
}

export async function createSupportCase(data: { category: string; opened_reason: string; related_deposit_id?: string; priority?: string }) {
  const response = await api.post('/support', data);
  return response.data;
}

export default api;
