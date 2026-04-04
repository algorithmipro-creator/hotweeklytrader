'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { approvePeriodSettlement, getAdminPeriod, previewPeriodSettlement } from '../../../lib/api';
import { StatusBadge } from '../../../components/status-badge';

type SettlementPreview = {
  investment_period_id: string;
  totalDepositsUsdt: number;
  endingBalanceUsdt: number;
  grossPnlUsdt: number;
  traderFeePercent: number;
  traderFeeUsdt: number;
  netDistributableUsdt: number;
  networkFeesUsdt: {
    TRON: number;
    TON: number;
    BSC: number;
  };
  settlement_snapshot_id?: string;
  calculated_at?: string;
  approved_at?: string | null;
  approved_by?: string | null;
};

const money = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function PeriodDetailPage() {
  const params = useParams<{ id: string }>();
  const periodId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [period, setPeriod] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<SettlementPreview | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    ending_balance_usdt: '',
    trader_fee_percent: '40',
    tron_network_fee_usdt: '0',
    ton_network_fee_usdt: '0',
    bsc_network_fee_usdt: '0',
  });

  useEffect(() => {
    if (!periodId) return;

    setLoading(true);
    getAdminPeriod(periodId)
      .then((data) => {
        setPeriod(data);
        const snapshot = data.settlement_snapshot;
        setPreview(snapshot || null);
        setForm({
          ending_balance_usdt: snapshot?.endingBalanceUsdt?.toString?.() || '',
          trader_fee_percent: snapshot?.traderFeePercent?.toString?.() || '40',
          tron_network_fee_usdt: snapshot?.networkFeesUsdt?.TRON?.toString?.() || '0',
          ton_network_fee_usdt: snapshot?.networkFeesUsdt?.TON?.toString?.() || '0',
          bsc_network_fee_usdt: snapshot?.networkFeesUsdt?.BSC?.toString?.() || '0',
        });
        setError('');
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load period'))
      .finally(() => setLoading(false));
  }, [periodId]);

  const canSettle = period?.status === 'REPORTING';
  const endingBalanceInput = form.ending_balance_usdt.trim();
  const endingBalanceValue = endingBalanceInput === '' ? null : Number(endingBalanceInput);
  const endingBalanceValid = endingBalanceValue !== null && Number.isFinite(endingBalanceValue);
  const payload = useMemo(() => ({
    ending_balance_usdt: endingBalanceValue as number,
    trader_fee_percent: form.trader_fee_percent === '' ? undefined : Number(form.trader_fee_percent),
    tron_network_fee_usdt: Number(form.tron_network_fee_usdt || 0),
    ton_network_fee_usdt: Number(form.ton_network_fee_usdt || 0),
    bsc_network_fee_usdt: Number(form.bsc_network_fee_usdt || 0),
  }), [endingBalanceValue, form]);

  const runPreview = async () => {
    if (!periodId) return;
    if (!endingBalanceValid) {
      setError('Enter a valid ending balance before previewing settlement.');
      return;
    }
    setSubmitting(true);
    try {
      const data = await previewPeriodSettlement(periodId, payload);
      setPreview(data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to preview settlement');
    } finally {
      setSubmitting(false);
    }
  };

  const runApprove = async () => {
    if (!periodId) return;
    if (!endingBalanceValid) {
      setError('Enter a valid ending balance before approving settlement.');
      return;
    }
    setSubmitting(true);
    try {
      const data = await approvePeriodSettlement(periodId, payload);
      setPreview(data);
      const refreshed = await getAdminPeriod(periodId);
      setPeriod(refreshed);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to approve settlement');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-text-secondary">Loading...</div>;
  if (!period) return <div className="text-danger">Period not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link href="/periods" className="text-primary text-sm hover:underline">
            ← Back to periods
          </Link>
          <h1 className="text-2xl font-bold mt-2">{period.title}</h1>
          <div className="mt-2 flex flex-wrap gap-2 items-center">
            <StatusBadge status={period.status} />
            <span className="text-sm text-text-secondary">
              {new Date(period.start_date).toLocaleDateString()} - {new Date(period.end_date).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="text-right text-sm text-text-secondary">
          <div>{period.period_type}</div>
          <div>{period.investment_period_id}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-bg-secondary rounded-lg p-4">
          <div className="text-text-secondary text-xs uppercase">Deposits</div>
          <div className="text-2xl font-bold mt-2">{period.depositCount ?? 0}</div>
        </div>
        <div className="bg-bg-secondary rounded-lg p-4">
          <div className="text-text-secondary text-xs uppercase">Total Deposited USDT</div>
          <div className="text-2xl font-bold mt-2">{money.format(period.totalDepositedUsdt ?? 0)}</div>
        </div>
        <div className="bg-bg-secondary rounded-lg p-4">
          <div className="text-text-secondary text-xs uppercase">Average Deposit USDT</div>
          <div className="text-2xl font-bold mt-2">{money.format(period.averageDepositUsdt ?? 0)}</div>
        </div>
      </div>

      {period.settlement_snapshot && (
        <div className="bg-bg-secondary rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-text-secondary text-xs uppercase">Approved Snapshot</div>
              <div className="font-medium">Frozen settlement values</div>
            </div>
            <StatusBadge status={period.status} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div>Total deposits: {money.format(period.settlement_snapshot.totalDepositsUsdt)}</div>
            <div>Gross PnL: {money.format(period.settlement_snapshot.grossPnlUsdt)}</div>
            <div>Net distributable: {money.format(period.settlement_snapshot.netDistributableUsdt)}</div>
          </div>
          <div className="text-xs text-text-secondary">
            Approved by {period.settlement_snapshot.approved_by || 'unknown'} on{' '}
            {period.settlement_snapshot.approved_at ? new Date(period.settlement_snapshot.approved_at).toLocaleString() : 'n/a'}
          </div>
        </div>
      )}

      <div className="bg-bg-secondary rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Reporting Calculator</h2>
            <p className="text-sm text-text-secondary">
              Enter the reporting numbers, preview the settlement, then approve once the snapshot looks right.
            </p>
          </div>
          {!canSettle && <span className="text-xs text-warning">Available only in REPORTING</span>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="space-y-1 text-sm">
            <div className="text-text-secondary">Ending balance USDT</div>
            <input
              type="number"
              step="0.01"
              value={form.ending_balance_usdt}
              onChange={(e) => setForm({ ...form, ending_balance_usdt: e.target.value })}
              className="w-full px-3 py-2 bg-bg-tertiary rounded-lg text-text"
            />
          </label>
          <label className="space-y-1 text-sm">
            <div className="text-text-secondary">Trader fee percent</div>
            <input
              type="number"
              step="0.01"
              value={form.trader_fee_percent}
              onChange={(e) => setForm({ ...form, trader_fee_percent: e.target.value })}
              className="w-full px-3 py-2 bg-bg-tertiary rounded-lg text-text"
            />
          </label>
          <label className="space-y-1 text-sm">
            <div className="text-text-secondary">TRON network fee</div>
            <input
              type="number"
              step="0.01"
              value={form.tron_network_fee_usdt}
              onChange={(e) => setForm({ ...form, tron_network_fee_usdt: e.target.value })}
              className="w-full px-3 py-2 bg-bg-tertiary rounded-lg text-text"
            />
          </label>
          <label className="space-y-1 text-sm">
            <div className="text-text-secondary">TON network fee</div>
            <input
              type="number"
              step="0.01"
              value={form.ton_network_fee_usdt}
              onChange={(e) => setForm({ ...form, ton_network_fee_usdt: e.target.value })}
              className="w-full px-3 py-2 bg-bg-tertiary rounded-lg text-text"
            />
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <div className="text-text-secondary">BSC network fee</div>
            <input
              type="number"
              step="0.01"
              value={form.bsc_network_fee_usdt}
              onChange={(e) => setForm({ ...form, bsc_network_fee_usdt: e.target.value })}
              className="w-full px-3 py-2 bg-bg-tertiary rounded-lg text-text"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={runPreview}
            disabled={!canSettle || submitting || !endingBalanceValid}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm disabled:opacity-50"
          >
            {submitting ? 'Working...' : 'Preview settlement'}
          </button>
          <button
            onClick={runApprove}
            disabled={!canSettle || submitting || !endingBalanceValid}
            className="px-4 py-2 rounded-lg bg-success text-white text-sm disabled:opacity-50"
          >
            Approve and freeze snapshot
          </button>
        </div>
        {!endingBalanceValid && (
          <div className="text-warning text-xs">
            Ending balance is required and must be a valid number before previewing or approving.
          </div>
        )}
      </div>

      <div className="bg-bg-secondary rounded-lg p-4">
        <h2 className="font-semibold mb-3">Latest Preview</h2>
        {preview ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div>Total deposits: {money.format(preview.totalDepositsUsdt)}</div>
            <div>Gross PnL: {money.format(preview.grossPnlUsdt)}</div>
            <div>Trader fee: {money.format(preview.traderFeeUsdt)} ({preview.traderFeePercent}%)</div>
            <div>Net distributable: {money.format(preview.netDistributableUsdt)}</div>
            <div>TRON fee: {money.format(preview.networkFeesUsdt.TRON)}</div>
            <div>TON fee: {money.format(preview.networkFeesUsdt.TON)}</div>
            <div>BSC fee: {money.format(preview.networkFeesUsdt.BSC)}</div>
          </div>
        ) : (
          <div className="text-text-secondary text-sm">
            Run a preview to see settlement math here.
          </div>
        )}
      </div>

      {error && <div className="text-danger text-sm">{error}</div>}
    </div>
  );
}
