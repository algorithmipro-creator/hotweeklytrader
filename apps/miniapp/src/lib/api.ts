import axios from 'axios';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
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

export default api;
