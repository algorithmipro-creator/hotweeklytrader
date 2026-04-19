'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  cancelDeposit as cancelDepositRequest,
  getDeposit,
  updateDepositReturnRouting,
  updateDepositSettlementPreference,
} from '../../../lib/api';
import { AppScreen } from '../../../components/app-screen';
import { BrandBellLink } from '../../../components/brand-bell-link';
import { LanguageSwitch } from '../../../components/language-switch';
import { StatusBadge } from '../../../components/status-badge';
import { Timeline } from '../../../components/timeline';
import { ArrowLeftIcon } from '../../../components/icons';
import { useLanguage } from '../../../providers/language-provider';

export default function DepositDetailPage() {
  const { t } = useLanguage();
  const params = useParams();
  const settlementOptions = [
    {
      value: 'WITHDRAW_ALL',
      label: t('settlementPreference.withdrawAll'),
      help: t('settlementPreference.withdrawAllHelp'),
    },
    {
      value: 'REINVEST_PRINCIPAL',
      label: t('settlementPreference.reinvestPrincipal'),
      help: t('settlementPreference.reinvestPrincipalHelp'),
    },
    {
      value: 'REINVEST_ALL',
      label: t('settlementPreference.reinvestAll'),
      help: t('settlementPreference.reinvestAllHelp'),
    },
  ] as const;
  const lockedStatuses = new Set([
    'REPORT_READY',
    'PAYOUT_PENDING',
    'PAYOUT_APPROVED',
    'PAYOUT_SENT',
    'PAYOUT_CONFIRMED',
  ]);
  const [deposit, setDeposit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [memoCopied, setMemoCopied] = useState(false);
  const [settlementPreference, setSettlementPreference] = useState('WITHDRAW_ALL');
  const [updatingPreference, setUpdatingPreference] = useState(false);
  const [preferenceError, setPreferenceError] = useState<string | null>(null);
  const [isEditingReturnRouting, setIsEditingReturnRouting] = useState(false);
  const [returnAddressInput, setReturnAddressInput] = useState('');
  const [returnMemoInput, setReturnMemoInput] = useState('');
  const [isSavingReturnRouting, setIsSavingReturnRouting] = useState(false);

  useEffect(() => {
    if (params.id) {
      getDeposit(params.id as string)
        .then((nextDeposit) => {
          setDeposit(nextDeposit);
          setSettlementPreference(nextDeposit.settlement_preference || 'WITHDRAW_ALL');
          setReturnAddressInput(nextDeposit.return_address || nextDeposit.source_address || '');
          setReturnMemoInput(nextDeposit.return_memo || '');
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [params.id]);

  const copyAddress = () => {
    if (deposit?.deposit_address) {
      navigator.clipboard.writeText(deposit.deposit_address).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      });
    }
  };

  const copyTonMemo = () => {
    if (deposit?.ton_deposit_memo) {
      navigator.clipboard.writeText(deposit.ton_deposit_memo).then(() => {
        setMemoCopied(true);
        setTimeout(() => setMemoCopied(false), 3000);
      });
    }
  };

  const handleSettlementPreferenceChange = async (nextValue: string) => {
    if (!deposit?.deposit_id || nextValue === settlementPreference || lockedStatuses.has(deposit.status)) {
      return;
    }

    setUpdatingPreference(true);
    setPreferenceError(null);

    try {
      const updatedDeposit = await updateDepositSettlementPreference(deposit.deposit_id, nextValue);
      setDeposit(updatedDeposit);
      setSettlementPreference(updatedDeposit.settlement_preference || nextValue);
    } catch (error: any) {
      setPreferenceError(error?.response?.data?.message || t('depositDetail.updatePreferenceFailed'));
    } finally {
      setUpdatingPreference(false);
    }
  };

  const handleCancelCycle = async () => {
    if (!deposit?.deposit_id || deposit.status !== 'AWAITING_TRANSFER') {
      return;
    }

    const confirmed = window.confirm(t('depositDetail.cancelConfirm'));
    if (!confirmed) {
      return;
    }

    try {
      const updatedDeposit = await cancelDepositRequest(deposit.deposit_id);
      setDeposit(updatedDeposit);
      setPreferenceError(null);
    } catch (error: any) {
      setPreferenceError(error?.response?.data?.message || t('depositDetail.cancelFailed'));
    }
  };

  const handleReturnRoutingSave = async () => {
    if (!deposit?.deposit_id) {
      return;
    }

    setIsSavingReturnRouting(true);
    setPreferenceError(null);

    try {
      const updatedDeposit = await updateDepositReturnRouting(deposit.deposit_id, {
        return_address: returnAddressInput.trim() || undefined,
        return_memo: deposit.network === 'TON' ? returnMemoInput.trim() || undefined : undefined,
      });
      setDeposit(updatedDeposit);
      setReturnAddressInput(updatedDeposit.return_address || '');
      setReturnMemoInput(updatedDeposit.return_memo || '');
      setIsEditingReturnRouting(false);
    } catch (error: any) {
      setPreferenceError(error?.response?.data?.message || t('depositDetail.updateReturnRoutingFailed'));
    } finally {
      setIsSavingReturnRouting(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-text-secondary">{t('common.loading')}</div>;
  }

  if (!deposit) {
    return <div className="p-4 text-red-400">{t('depositDetail.notFound')}</div>;
  }

  const isSettlementLocked = lockedStatuses.has(deposit.status);
  const selectedSettlementLabel =
    settlementOptions.find((option) => option.value === settlementPreference)?.label ?? t('settlementPreference.withdrawAll');
  const effectiveReturnAddress = deposit.return_address || deposit.source_address || '';
  const timelineEvents = [
    { label: t('depositDetail.timelineCreated'), date: deposit.created_at, completed: true },
    { label: t('depositDetail.timelineDetected'), date: deposit.detected_at, completed: !!deposit.detected_at },
    { label: t('depositDetail.timelineConfirmed'), date: deposit.confirmed_at, completed: !!deposit.confirmed_at },
    { label: t('depositDetail.timelineActive'), date: deposit.activated_at, completed: !!deposit.activated_at },
    { label: t('depositDetail.timelineCompleted'), date: deposit.completed_at, completed: !!deposit.completed_at },
  ];

  const isAwaitingTransfer = deposit.status === 'AWAITING_TRANSFER';

  return (
    <AppScreen>
          <div className="relative z-10 rounded-3xl border border-cyan-300/15 bg-slate-950/60 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
            <div className="flex items-center justify-between gap-3">
              <Link href="/deposits" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-300/15 bg-slate-900/70 text-slate-100">
                <ArrowLeftIcon className="h-5 w-5" />
              </Link>
              <BrandBellLink />
              <LanguageSwitch />
            </div>

            <div className="mt-5 rounded-3xl border border-cyan-300/10 bg-[linear-gradient(135deg,rgba(14,29,36,0.96),rgba(8,18,24,0.92))] p-5">
              <p className="mb-2 text-[11px] uppercase tracking-[0.22em] text-cyan-200/80">{t('depositDetail.kicker')}</p>
              <h1 className="text-3xl font-bold leading-[1.02] text-slate-50">
                {deposit.network} / {deposit.asset_symbol}
              </h1>
              <div className="mt-3">
                <div className="inline-flex rounded-full border border-white/10 bg-slate-950/35 px-1.5 py-1 backdrop-blur-sm">
                  <StatusBadge status={deposit.status} />
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                {t('depositDetail.subtitle')}
              </p>
            </div>
          </div>

          {isAwaitingTransfer && deposit.deposit_address && (
            <div className="relative z-10 mt-4 rounded-3xl border border-cyan-300/15 bg-[linear-gradient(135deg,rgba(25,211,211,0.12),rgba(117,243,221,0.04))] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
              <h2 className="text-lg font-semibold text-cyan-100">{t('depositDetail.sendTitle', { asset: deposit.asset_symbol })}</h2>
              <p className="mt-2 text-xs text-slate-400">
                {t('depositDetail.sendSub', { network: deposit.network, asset: deposit.asset_symbol })}
              </p>
              <div className="mt-3 flex items-center gap-2 rounded-2xl border border-cyan-300/10 bg-slate-950/70 p-3">
                <span className="flex-1 break-all font-mono text-xs text-cyan-300">{deposit.deposit_address}</span>
                <button
                  onClick={copyAddress}
                  className="shrink-0 rounded-2xl bg-[linear-gradient(135deg,#46c3e5,#2f93b6)] px-3 py-2 text-xs font-semibold text-slate-50"
                >
                  {copied ? t('common.copied') : t('common.copy')}
                </button>
              </div>
              <p className="mt-3 text-xs text-slate-500">{t('depositDetail.sendWarning')}</p>
              {deposit.network === 'TON' && deposit.ton_deposit_memo ? (
                <div className="mt-3 rounded-2xl border border-cyan-300/10 bg-slate-950/70 p-3">
                  <div className="text-xs uppercase tracking-[0.12em] text-slate-500">{t('depositCreate.tonDepositMemo')}</div>
                  <div className="mt-2 rounded-2xl border border-amber-300/20 bg-amber-500/10 p-3 text-xs leading-5 text-amber-100">
                    {t('depositCreate.tonExchangeWarning')}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={copyTonMemo}
                      className="flex-1 break-all text-left font-mono text-sm text-cyan-300"
                    >
                      {deposit.ton_deposit_memo}
                    </button>
                    <button
                      type="button"
                      onClick={copyTonMemo}
                      className="shrink-0 rounded-2xl bg-[linear-gradient(135deg,#46c3e5,#2f93b6)] px-3 py-2 text-xs font-semibold text-slate-50"
                    >
                      {memoCopied ? t('common.copied') : t('common.copy')}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{t('depositCreate.tonDepositMemoNote')}</p>
                </div>
              ) : null}
            </div>
          )}

          <div className="relative z-10 mt-4 rounded-3xl border border-cyan-300/10 bg-slate-950/60 p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {deposit.confirmed_amount && (
                <div className="rounded-2xl border border-cyan-300/10 bg-slate-950/70 p-3">
                  <div className="text-xs uppercase tracking-[0.12em] text-slate-500">{t('common.amount')}</div>
                  <div className="mt-2 font-medium text-slate-100">
                    {deposit.confirmed_amount} {deposit.asset_symbol}
                  </div>
                </div>
              )}
              {deposit.activated_at && (
                <div className="rounded-2xl border border-cyan-300/10 bg-slate-950/70 p-3">
                  <div className="text-xs uppercase tracking-[0.12em] text-slate-500">{t('depositDetail.startDate')}</div>
                  <div className="mt-2 font-medium text-slate-100">{new Date(deposit.activated_at).toLocaleDateString()}</div>
                </div>
              )}
            </div>

            {deposit.tx_hash && (
              <div className="mt-3 rounded-2xl border border-cyan-300/10 bg-slate-950/70 p-3">
                <div className="text-xs uppercase tracking-[0.12em] text-slate-500">{t('depositDetail.txHash')}</div>
                <div className="mt-2 truncate text-sm text-cyan-300">{deposit.tx_hash}</div>
              </div>
            )}
            <div className="mt-3 rounded-2xl border border-cyan-300/10 bg-slate-950/70 p-3">
              <div className="text-xs uppercase tracking-[0.12em] text-slate-500">{t('depositDetail.settlementPreference')}</div>
              <p className="mt-2 text-sm font-medium text-slate-100">{selectedSettlementLabel}</p>
              <p className="mt-2 text-xs leading-5 text-slate-400">{t('depositDetail.settlementPreferenceHelp')}</p>
              <div className="mt-3 grid gap-2">
                {settlementOptions.map((option) => {
                  const selected = settlementPreference === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSettlementPreferenceChange(option.value)}
                      disabled={isSettlementLocked || updatingPreference}
                      className={`rounded-2xl border p-3 text-left transition ${
                        selected
                          ? 'border-cyan-300/40 bg-cyan-400/10'
                          : 'border-cyan-300/10 bg-slate-950/60'
                      } disabled:cursor-not-allowed disabled:opacity-70`}
                    >
                      <div className="text-sm font-semibold text-slate-100">{option.label}</div>
                      <p className="mt-1 text-xs leading-5 text-slate-400">{option.help}</p>
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-slate-500">
                {isSettlementLocked ? t('depositDetail.settlementPreferenceLocked') : t('depositDetail.rolloverOpen')}
              </p>
              <p className="mt-1 text-xs text-slate-500">{t('depositDetail.thresholdHint')}</p>
              {preferenceError && <p className="mt-2 text-xs text-rose-300">{preferenceError}</p>}
            </div>

            {(deposit.rolled_over_into_deposit_id || deposit.rollover_block_reason || deposit.rollover_attempted_at) && (
              <div className="mt-3 rounded-2xl border border-cyan-300/10 bg-slate-950/70 p-3">
                <div className="text-xs uppercase tracking-[0.12em] text-slate-500">{t('depositDetail.rolloverStatus')}</div>
                <p className="mt-2 text-sm text-slate-100">
                  {deposit.rolled_over_into_deposit_id
                    ? t('depositDetail.rolloverActive')
                    : deposit.rollover_attempted_at
                      ? t('depositDetail.rolloverLocked')
                      : t('depositDetail.rolloverOpen')}
                </p>
                {deposit.rolled_over_into_deposit_id && (
                  <>
                    <p className="mt-2 text-xs leading-5 text-slate-400">{t('depositDetail.rolloverCreated')}</p>
                    <Link
                      href={`/deposits/${deposit.rolled_over_into_deposit_id}`}
                      className="mt-3 inline-flex rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-200"
                    >
                      {t('depositDetail.rolloverDeposit')}
                    </Link>
                  </>
                )}
                {deposit.rollover_block_reason && (
                  <p className="mt-2 text-xs leading-5 text-amber-200">
                    {t('depositDetail.rolloverBlocked', { reason: deposit.rollover_block_reason })}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="relative z-10 mt-4 rounded-3xl border border-cyan-300/10 bg-slate-950/60 p-4">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200/70">{t('depositDetail.timeline')}</h2>
            <Timeline events={timelineEvents} />
          </div>

          <div className="relative z-10 mt-4 rounded-3xl border border-cyan-300/10 bg-slate-950/60 p-4">
            <div className="rounded-2xl border border-cyan-300/10 bg-slate-950/70 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-100">{t('depositDetail.returnAddressForAsset', { asset: deposit.asset_symbol })}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-400">{t('depositDetail.returnAddressHelp')}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingReturnRouting((current) => !current)}
                  className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-200"
                >
                  {isEditingReturnRouting ? t('common.cancel') : t('depositDetail.changeAddress')}
                </button>
              </div>

              {effectiveReturnAddress && !isEditingReturnRouting ? (
                <div className="mt-3 break-all font-mono text-sm text-cyan-300">{effectiveReturnAddress}</div>
              ) : null}

              {!effectiveReturnAddress && !isEditingReturnRouting ? (
                <div className="mt-3 text-sm text-slate-400">
                  {t('depositDetail.returnAddressEmpty', { asset: deposit.asset_symbol })}
                </div>
              ) : null}

              {isEditingReturnRouting ? (
                <div className="mt-3 space-y-3 border-t border-cyan-300/10 pt-3">
                  <p className="text-sm leading-6 text-slate-400">{t('depositDetail.returnAddressEditHelp', { asset: deposit.asset_symbol })}</p>
                  <label className="block text-sm text-slate-400">
                    {t('depositCreate.returningAddress')}
                    <input
                      type="text"
                      value={returnAddressInput}
                      onChange={(event) => setReturnAddressInput(event.target.value)}
                      className="mt-1 w-full rounded-2xl border border-cyan-300/10 bg-slate-950/60 p-3 text-sm text-slate-100"
                      placeholder={t('depositCreate.returningAddress')}
                    />
                  </label>
                  {deposit.network === 'TON' ? (
                    <label className="block text-sm text-slate-400">
                      {t('depositCreate.tonReturnMemo')}
                      <input
                        type="text"
                        value={returnMemoInput}
                        onChange={(event) => setReturnMemoInput(event.target.value)}
                        className="mt-1 w-full rounded-2xl border border-cyan-300/10 bg-slate-950/60 p-3 text-sm text-slate-100"
                        placeholder={t('depositCreate.tonReturnMemoHint')}
                      />
                    </label>
                  ) : null}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleReturnRoutingSave}
                      disabled={isSavingReturnRouting}
                      className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-100 disabled:opacity-60"
                    >
                      {isSavingReturnRouting ? t('depositDetail.savingAddress') : t('depositDetail.saveAddress')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setReturnAddressInput(deposit.return_address || deposit.source_address || '');
                        setReturnMemoInput(deposit.return_memo || '');
                        setIsEditingReturnRouting(false);
                      }}
                      className="rounded-2xl border border-cyan-300/10 bg-slate-950/60 px-4 py-3 text-sm font-semibold text-slate-200"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="relative z-10 mt-4 rounded-3xl border border-cyan-300/10 bg-slate-950/60 p-4">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200/70">{t('common.actions')}</h2>
            <div className="grid gap-3">
              <Link href={`/metrics/${deposit.deposit_id}`} className="rounded-2xl border border-[#34b5dc]/20 bg-[#34b5dc]/12 px-4 py-3 text-center text-sm font-medium text-[#d8edf3]">
                {t('depositDetail.viewMetrics')}
              </Link>
              {isAwaitingTransfer && (
                <button
                  type="button"
                  onClick={handleCancelCycle}
                  className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-center text-sm font-medium text-rose-200"
                >
                  {t('depositDetail.cancelAction')}
                </button>
              )}
              {(deposit.status === 'PAYOUT_PENDING' ||
                deposit.status === 'PAYOUT_APPROVED' ||
                deposit.status === 'PAYOUT_SENT' ||
                deposit.status === 'PAYOUT_CONFIRMED') && (
                <Link href={`/payouts/${deposit.deposit_id}`} className="rounded-2xl border border-cyan-300/10 bg-slate-950/70 px-4 py-3 text-center text-sm font-medium text-slate-200">
                  {t('depositDetail.viewPayouts')}
                </Link>
              )}
              {deposit.status === 'REPORT_READY' && (
                <Link href={`/reports/${deposit.deposit_id}`} className="rounded-2xl border border-cyan-300/10 bg-slate-950/70 px-4 py-3 text-center text-sm font-medium text-slate-200">
                  {t('depositDetail.viewReport')}
                </Link>
              )}
            </div>
          </div>

          {deposit.status_reason && (
            <div className="relative z-10 mt-4 rounded-3xl border border-cyan-300/10 bg-slate-950/60 p-4">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200/70">{t('common.note')}</h2>
              <p className="text-sm leading-6 text-slate-400">{deposit.status_reason}</p>
            </div>
          )}

    </AppScreen>
  );
}
