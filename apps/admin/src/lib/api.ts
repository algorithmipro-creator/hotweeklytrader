import axios from 'axios';
import { clearAdminToken, getAdminToken, storeAdminToken } from './admin-session.js';

const ADMIN_LOGIN_PATH = '/login';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1';

export function clearAdminSession() {
  if (typeof window === 'undefined') return;
  clearAdminToken(localStorage);
}

export function isAdminRole(role: string | null | undefined): boolean {
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return getAdminToken(localStorage);
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if ([401, 403].includes(error.response?.status) && typeof window !== 'undefined') {
      clearAdminToken(localStorage);
      window.location.href = ADMIN_LOGIN_PATH;
    }
    return Promise.reject(error);
  },
);

export async function adminLogin(telegramInitData: string) {
  const response = await api.post('/auth/telegram', { initData: telegramInitData });
  if (response.data.accessToken) {
    storeAdminToken(localStorage, response.data.accessToken);
  }
  return response.data;
}

export async function adminPasswordLogin(login: string, password: string) {
  const response = await api.post('/auth/admin-login', { login, password });
  if (response.data.accessToken) {
    storeAdminToken(localStorage, response.data.accessToken);
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

export async function getAdminUser(userId: string) {
  const response = await api.get(`/admin/users/${userId}`);
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

export async function getPeriodCompletionReadiness(id: string) {
  const response = await api.get(`/admin/periods/${id}/completion-readiness`);
  return response.data;
}

export async function getPeriodTraderReports(id: string) {
  const response = await api.get(`/admin/periods/${id}/trader-reports`);
  return response.data;
}

export async function getTraderReportBuilder(periodId: string, traderId: string) {
  const response = await api.get(`/admin/periods/${periodId}/trader-reports/${traderId}/builder`);
  return response.data;
}

export async function previewTraderReport(periodId: string, traderId: string, data: any) {
  const response = await api.post(`/admin/periods/${periodId}/trader-reports/${traderId}/preview`, data);
  return response.data;
}

export async function saveTraderReportDraft(periodId: string, traderId: string, data: any) {
  const response = await api.put(`/admin/periods/${periodId}/trader-reports/${traderId}`, data);
  return response.data;
}

export async function submitTraderReport(periodId: string, reportId: string) {
  const response = await api.put(`/admin/periods/${periodId}/trader-reports/report/${reportId}/submit`);
  return response.data;
}

export async function approveTraderPeriodReport(periodId: string, reportId: string) {
  const response = await api.put(`/admin/periods/${periodId}/trader-reports/report/${reportId}/approve`);
  return response.data;
}

export async function publishTraderPeriodReport(periodId: string, reportId: string) {
  const response = await api.put(`/admin/periods/${periodId}/trader-reports/report/${reportId}/publish`);
  return response.data;
}

export async function exportTraderReportCsv(periodId: string, reportId: string) {
  const response = await api.get(`/admin/periods/${periodId}/trader-reports/report/${reportId}/export.csv`);
  return response.data as string;
}

export async function generateTraderPayoutRegistry(periodId: string, reportId: string) {
  const response = await api.post(`/admin/periods/${periodId}/trader-reports/report/${reportId}/registry`);
  return response.data;
}

export async function getTraderPayoutRegistry(periodId: string, reportId: string) {
  const response = await api.get(`/admin/periods/${periodId}/trader-reports/report/${reportId}/registry`);
  return response.data;
}

export async function updatePayoutRegistryRow(rowId: string, data: any) {
  const response = await api.put(`/admin/periods/payout-registry-rows/${rowId}`, data);
  return response.data;
}

export async function markRemainingPayoutRegistryRowsAsPaid(registryId: string, notes?: string) {
  const response = await api.post(`/admin/periods/payout-registries/${registryId}/mark-remaining-paid`, { notes });
  return response.data;
}

export async function getAdminTraders() {
  const response = await api.get('/admin/traders');
  return response.data;
}

export async function getAdminTrader(id: string) {
  const response = await api.get(`/admin/traders/${id}`);
  return response.data;
}

export async function createAdminTrader(data: any) {
  const response = await api.post('/admin/traders', data);
  return response.data;
}

export async function updateAdminTrader(id: string, data: any) {
  const response = await api.patch(`/admin/traders/${id}`, data);
  return response.data;
}

export async function upsertAdminTraderMainAddress(id: string, data: any) {
  const response = await api.post(`/admin/traders/${id}/main-addresses`, data);
  return response.data;
}

export async function getAdminDeposits(params?: {
  status?: string;
  network?: string;
  investment_period_id?: string;
  limit?: number;
  offset?: number;
}) {
  const response = await api.get('/admin/deposits', { params });
  return response.data;
}

export async function previewPeriodSettlement(id: string, data: any) {
  const response = await api.post(`/admin/periods/${id}/settlement/preview`, data);
  return response.data;
}

export async function approvePeriodSettlement(id: string, data: any) {
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

export async function getReferralRewards(params?: {
  status?: string;
  rewardType?: string;
  level?: string;
  periodId?: string;
  beneficiaryUserId?: string;
  sourceUserId?: string;
}) {
  const response = await api.get('/admin/referral-rewards', { params });
  return response.data;
}

export async function getReferralTree(userId: string) {
  const response = await api.get(`/admin/users/${userId}/referral-tree`);
  return response.data;
}

export async function reassignReferralParent(userId: string, referrer_user_id: string | null, reason?: string) {
  const response = await api.patch(`/admin/users/${userId}/referrer`, { referrer_user_id, reason });
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

export async function getAdminSupportCases(params?: {
  status?: string;
  assigned_to?: string;
  priority?: string;
  limit?: number;
  offset?: number;
}) {
  const response = await api.get('/admin/support', { params });
  return response.data;
}

export async function updateAdminSupportCase(id: string, data: {
  status?: string;
  assigned_to?: string;
  priority?: string;
  resolution_summary?: string;
}) {
  const response = await api.put(`/admin/support/${id}`, data);
  return response.data;
}

export async function getAdminDashboardStats() {
  const response = await api.get('/admin/dashboard/stats');
  return response.data;
}

export default api;
