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

export async function authenticateTelegram(initData: string, referralCode?: string | null) {
  const response = await api.post('/auth/telegram', {
    initData,
    referralCode: referralCode ?? undefined,
  });
  if (response.data.accessToken) {
    localStorage.setItem('auth_token', response.data.accessToken);
  }
  return response.data;
}

export async function getProfile() {
  const response = await api.get('/me');
  return response.data;
}

export async function getReferralProfile() {
  const response = await api.get('/me/referral');
  return response.data;
}

export async function getReferralTeam() {
  const response = await api.get('/me/team');
  return response.data;
}

export async function getTraders() {
  const response = await api.get('/traders');
  return response.data;
}

export async function getTrader(slug: string) {
  const response = await api.get(`/traders/${slug}`);
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

export async function getDepositLiveMetrics(depositId: string) {
  const response = await api.get(`/deposits/${depositId}/live-metrics`);
  return response.data;
}

export async function createDeposit(data: {
  investment_period_id: string;
  trader_id: string;
  network: string;
  asset_symbol: string;
  source_address?: string;
  return_address?: string;
  ton_deposit_memo?: string;
  return_memo?: string;
  requested_amount?: number;
  settlement_preference?: string;
  sending_from_exchange?: boolean;
}) {
  const response = await api.post('/deposits', data);
  return response.data;
}


export async function updateDepositReturnRouting(
  depositId: string,
  data: {
    source_address?: string;
    return_address?: string;
    return_memo?: string;
  },
) {
  const response = await api.put(`/deposits/${depositId}/return-routing`, data);
  return response.data;
}

export async function updateDepositSettlementPreference(depositId: string, settlementPreference: string) {
  const response = await api.put(`/deposits/${depositId}/settlement-preference`, {
    settlement_preference: settlementPreference,
  });
  return response.data;
}

export async function cancelDeposit(depositId: string) {
  const response = await api.put(`/deposits/${depositId}/cancel`);
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

export async function getWallets() {
  const response = await api.get('/wallets');
  return response.data;
}

export async function bindWallet(data: { network: string; source_address: string }) {
  const response = await api.post('/wallets', data);
  return response.data;
}

export async function unbindWallet(walletId: string) {
  const response = await api.delete(`/wallets/${walletId}`);
  return response.data;
}

export default api;
