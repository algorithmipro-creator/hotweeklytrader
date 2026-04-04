'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  approvePeriodSettlement,
  generatePeriodPayoutRegistry,
  getAdminPeriod,
  getPeriodPayoutRegistry,
  previewPeriodSettlement,
} from '../../../lib/api';
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
  preview_signature?: string;
};

type SettlementForm = {
  ending_balance_usdt: string;
  trader_fee_percent: string;
  tron_network_fee_usdt: string;
  ton_network_fee_usdt: string;
  bsc_network_fee_usdt: string;
};

type NormalizedSettlementInput = {
  ending_balance_usdt: number;
  trader_fee_percent: number;
  tron_network_fee_usdt: number;
  ton_network_fee_usdt: number;
  bsc_network_fee_usdt: number;
};

type SettlementApprovalPayload = NormalizedSettlementInput & { preview_signature: string };

type PeriodPayoutRegistryItem = {
  payout_registry_item_id: string;
  deposit_id: string;
  network: string;
  asset_symbol: string;
  confirmed_amount_usdt: number;
  network_fee_bucket_usdt: number;
  network_fee_allocation_usdt: number;
  payout_amount_usdt: number;
  created_at: string;
};

type PeriodPayoutRegistry = {
  payout_registry_id: string;
  investment_period_id: string;
  settlement_snapshot_id: string;
  generated_at: string;
  generated_by: string | null;
  totalDepositsUsdt: number;
  netDistributableUsdt: number;
  networkFeesUsdt: {
    TRON: number;
    TON: number;
    BSC: number;
  };
  items: PeriodPayoutRegistryItem[];
};

const money = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function parseRequiredNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalNumber(value: string, fallback: number): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeSettlementInput(form: SettlementForm): { valid: boolean; value: NormalizedSettlementInput; errors: string[]; signature: string } {
  const endingBalance = parseRequiredNumber(form.ending_balance_usdt);
  const traderFeePercent = parseOptionalNumber(form.trader_fee_percent, 40);
  const tronFee = parseOptionalNumber(form.tron_network_fee_usdt, 0);
  const tonFee = parseOptionalNumber(form.ton_network_fee_usdt, 0);
  const bscFee = parseOptionalNumber(form.bsc_network_fee_usdt, 0);

  const errors: string[] = [];
  if (endingBalance === null) {
    errors.push('Ending balance must be a valid number before previewing or approving.');
  }
  if (traderFeePercent === null) {
    errors.push('Trader fee percent must be a valid number or blank.');
  }
  if (tronFee === null || tonFee === null || bscFee === null) {
    errors.push('Network fee fields must be valid numbers or blank.');
  }

  const value: NormalizedSettlementInput = {
    ending_balance_usdt: endingBalance ?? 0,
    trader_fee_percent: traderFeePercent ?? 40,
    tron_network_fee_usdt: tronFee ?? 0,
    ton_network_fee_usdt: tonFee ?? 0,
    bsc_network_fee_usdt: bscFee ?? 0,
  };

  return {
    valid: errors.length === 0,
    value,
    errors,
    signature: JSON.stringify(value),
  };
}

function sameSettlementInput(a: NormalizedSettlementInput | null, b: NormalizedSettlementInput): boolean {
  if (!a) return false;
  return (
    a.ending_balance_usdt === b.ending_balance_usdt
    && a.trader_fee_percent === b.trader_fee_percent
    && a.tron_network_fee_usdt === b.tron_network_fee_usdt
    && a.ton_network_fee_usdt === b.ton_network_fee_usdt
    && a.bsc_network_fee_usdt === b.bsc_network_fee_usdt
  );
}

export default function PeriodDetailPage() {
  const params = useParams<{ id: string }>();
  const periodId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [period, setPeriod] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<SettlementPreview | null>(null);
  const [lastPreviewInput, setLastPreviewInput] = useState<NormalizedSettlementInput | null>(null);
  const [payoutRegistry, setPayoutRegistry] = useState<PeriodPayoutRegistry | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [registrySubmitting, setRegistrySubmitting] = useState(false);
  const [form, setForm] = useState<SettlementForm>({
    ending_balance_usdt: '',
    trader_fee_percent: '40',
    tron_network_fee_usdt: '0',
    ton_network_fee_usdt: '0',
    bsc_network_fee_usdt: '0',
  });

  useEffect(() => {
    if (!periodId) return;

    setLoading(true);
    Promise.all([getAdminPeriod(periodId), getPeriodPayoutRegistry(periodId)])
      .then(([data, registry]) => {
        setPeriod(data);
        setPayoutRegistry(registry);
        const snapshot = data.settlement_snapshot;
        setPreview(snapshot || null);
        setLastPreviewInput(null);
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
  const hasApprovedSnapshot = Boolean(period?.settlement_snapshot?.approved_at);
  const normalized = useMemo(() => normalizeSettlementInput(form), [form]);
  const previewMatchesForm = sameSettlementInput(lastPreviewInput, normalized.value);
  const canPreview = canSettle && normalized.valid && !submitting;
  const canApprove = canPreview && Boolean(preview?.preview_signature) && previewMatchesForm && !hasApprovedSnapshot;
  const previewStale = Boolean(preview) && !previewMatchesForm && !hasApprovedSnapshot;
  const canGenerateRegistry = Boolean(period?.settlement_snapshot?.approved_at) && !registrySubmitting;

  const runPreview = async () => {
    if (!periodId) return;
    if (!normalized.valid) {
      setError(normalized.errors[0]);
      return;
    }
    setSubmitting(true);
    try {
      const data = await previewPeriodSettlement(periodId, normalized.value);
      setPreview(data);
      setLastPreviewInput(normalized.value);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to preview settlement');
    } finally {
      setSubmitting(false);
    }
  };

  const runApprove = async () => {
    if (!periodId) return;
    if (!normalized.valid) {
      setError(normalized.errors[0]);
      return;
    }
    if (!preview || !previewMatchesForm) {
      setError('Preview the current inputs again before approving settlement.');
      return;
    }
    if (!preview.preview_signature) {
      setError('Preview response is missing a signature. Preview again before approving.');
      return;
    }
    if (hasApprovedSnapshot) {
      setError('This period already has an approved settlement snapshot.');
      return;
    }
    setSubmitting(true);
    try {
      const approvalPayload: SettlementApprovalPayload = {
        ...normalized.value,
        preview_signature: preview.preview_signature,
      };
      const data = await approvePeriodSettlement(periodId, approvalPayload);
      setPreview(data);
      setLastPreviewInput(null);
      const refreshed = await getAdminPeriod(periodId);
      setPeriod(refreshed);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to approve settlement');
    } finally {
      setSubmitting(false);
    }
  };

  const runGenerateRegistry = async () => {
    if (!periodId) return;
    if (!period?.settlement_snapshot?.approved_at) {
      setError('Approve the settlement snapshot before generating a payout registry.');
      return;
    }
    setRegistrySubmitting(true);
    try {
      const data = await generatePeriodPayoutRegistry(periodId);
      setPayoutRegistry(data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate payout registry');
    } finally {
      setRegistrySubmitting(false);
    }
  };

  if (loading) return <div className="text-text-secondary">Loading...</div>;
  if (!period) return <div className="text-danger">Period not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link href="/periods" className="text-primary text-sm hover:underline">
            {'<-'} Back to periods
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
            <h2 className="font-semibold">Payout Registry</h2>
            <p className="text-sm text-text-secondary">
              Generate the registry from the approved settlement snapshot and review the per-deposit payout allocation.
            </p>
          </div>
          <button
            onClick={runGenerateRegistry}
            disabled={!canGenerateRegistry}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm disabled:opacity-50"
          >
            {registrySubmitting ? 'Working...' : payoutRegistry ? 'Refresh registry' : 'Generate registry'}
          </button>
        </div>

        {!period?.settlement_snapshot?.approved_at && (
          <div className="text-warning text-xs">
            Approve the settlement snapshot before generating a payout registry.
          </div>
        )}

        {payoutRegistry ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div>Registry generated: {new Date(payoutRegistry.generated_at).toLocaleString()}</div>
              <div>Generated by: {payoutRegistry.generated_by || 'system'}</div>
              <div>Items: {payoutRegistry.items.length}</div>
              <div>Total deposits: {money.format(payoutRegistry.totalDepositsUsdt)}</div>
              <div>Net distributable: {money.format(payoutRegistry.netDistributableUsdt)}</div>
              <div>
                Network fees: {money.format(payoutRegistry.networkFeesUsdt.TRON + payoutRegistry.networkFeesUsdt.TON + payoutRegistry.networkFeesUsdt.BSC)}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-text-secondary">
                  <tr>
                    <th className="text-left py-2 pr-3">Deposit</th>
                    <th className="text-left py-2 pr-3">Network</th>
                    <th className="text-right py-2 pr-3">Confirmed USDT</th>
                    <th className="text-right py-2 pr-3">Fee bucket</th>
                    <th className="text-right py-2 pr-3">Fee allocation</th>
                    <th className="text-right py-2 pr-3">Payout amount</th>
                  </tr>
                </thead>
                <tbody>
                  {payoutRegistry.items.map((item) => (
                    <tr key={item.payout_registry_item_id} className="border-t border-gray-700">
                      <td className="py-2 pr-3 text-text-secondary">{item.deposit_id}</td>
                      <td className="py-2 pr-3 text-text-secondary">{item.network}</td>
                      <td className="py-2 pr-3 text-right">{money.format(item.confirmed_amount_usdt)}</td>
                      <td className="py-2 pr-3 text-right">{money.format(item.network_fee_bucket_usdt)}</td>
                      <td className="py-2 pr-3 text-right">{money.format(item.network_fee_allocation_usdt)}</td>
                      <td className="py-2 pr-3 text-right font-medium">{money.format(item.payout_amount_usdt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-text-secondary text-sm">
            No payout registry has been generated yet.
          </div>
        )}
      </div>

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
            disabled={!canPreview}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm disabled:opacity-50"
          >
            {submitting ? 'Working...' : 'Preview settlement'}
          </button>
          <button
            onClick={runApprove}
            disabled={!canApprove}
            className="px-4 py-2 rounded-lg bg-success text-white text-sm disabled:opacity-50"
          >
            Approve and freeze snapshot
          </button>
        </div>
        {!normalized.valid && (
          <div className="text-warning text-xs">
            {normalized.errors[0]}
          </div>
        )}
        {previewStale && (
          <div className="text-warning text-xs">
            Inputs changed after the last preview. Re-preview before approving.
          </div>
        )}
        {hasApprovedSnapshot && (
          <div className="text-text-secondary text-xs">
            This settlement is already approved. Preview is still available, but approval is locked.
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
