'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppScreen } from '../../components/app-screen';
import { BrandBellLink } from '../../components/brand-bell-link';
import { LanguageSwitch } from '../../components/language-switch';
import { PageBackButton } from '../../components/page-back-button';
import { useLanguage } from '../../providers/language-provider';
import { getPeriods, createDeposit, getWallets, getTraders } from '../../lib/api';

const SETTLEMENT_OPTIONS = [
  'WITHDRAW_ALL',
  'REINVEST_PRINCIPAL',
  'REINVEST_ALL',
] as const;

function getDefaultActivePeriodId(periods: any[]) {
  const now = Date.now();
  const activePeriod = (Array.isArray(periods) ? periods : []).find((period) => {
    const startDate = period?.start_date ? new Date(period.start_date).getTime() : Number.NEGATIVE_INFINITY;
    const endDate = period?.end_date ? new Date(period.end_date).getTime() : Number.POSITIVE_INFINITY;
    return period?.status === 'ACTIVE' && startDate <= now && endDate >= now;
  });

  if (activePeriod?.investment_period_id) {
    return activePeriod.investment_period_id;
  }

  return (Array.isArray(periods) ? periods : []).find((period) => period?.status === 'ACTIVE')?.investment_period_id || '';
}

export default function CreateDepositPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [periods, setPeriods] = useState<any[]>([]);
  const [traders, setTraders] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [selectedTrader, setSelectedTrader] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('');
  const [selectedAsset, setSelectedAsset] = useState('');
  const [selectedSavedAddress, setSelectedSavedAddress] = useState('');
  const [manualSourceAddress, setManualSourceAddress] = useState('');
  const [sendingFromExchange, setSendingFromExchange] = useState(false);
  const [settlementPreference, setSettlementPreference] = useState<(typeof SETTLEMENT_OPTIONS)[number]>('WITHDRAW_ALL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectClassName = 'w-full rounded-2xl border border-cyan-300/10 bg-slate-950/70 text-slate-100 p-3 text-sm';
  const helperLabelClassName = 'mb-1 block text-sm text-slate-400';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const nextTraderId = params.get('trader_id');
      if (nextTraderId) {
        setSelectedTrader((current) => current || nextTraderId);
      }
    }

    getPeriods()
      .then((nextPeriods) => {
        const normalizedPeriods = Array.isArray(nextPeriods) ? nextPeriods : [];
        setPeriods(normalizedPeriods);
        setSelectedPeriod((current) => current || getDefaultActivePeriodId(normalizedPeriods));
      })
      .catch(console.error);
    getTraders().then(setTraders).catch(console.error);
    getWallets().then(setWallets).catch(console.error);
  }, []);

  const currentPeriod = periods.find((p) => p.investment_period_id === selectedPeriod);
  const selectedTraderRecord = traders.find((trader) => trader.trader_id === selectedTrader);
  const traderMainAddresses = Array.isArray(selectedTraderRecord?.main_addresses) ? selectedTraderRecord.main_addresses : [];
  const acceptedPeriodNetworks = Array.isArray(currentPeriod?.accepted_networks) ? currentPeriod.accepted_networks : [];
  const acceptedPeriodAssets = Array.isArray(currentPeriod?.accepted_assets) ? currentPeriod.accepted_assets : [];
  const availableTraderAssetsByNetwork = traderMainAddresses.reduce((acc: Record<string, string[]>, address: any) => {
    if (!address?.network || !address?.asset_symbol) {
      return acc;
    }

    if (acceptedPeriodNetworks.length > 0 && !acceptedPeriodNetworks.includes(address.network)) {
      return acc;
    }

    if (acceptedPeriodAssets.length > 0 && !acceptedPeriodAssets.includes(address.asset_symbol)) {
      return acc;
    }

    const nextAssets = acc[address.network] || [];
    if (!nextAssets.includes(address.asset_symbol)) {
      acc[address.network] = [...nextAssets, address.asset_symbol];
    }

    return acc;
  }, {});
  const availableTraderNetworks = Object.keys(availableTraderAssetsByNetwork);
  const availableTraderAssets = availableTraderAssetsByNetwork[selectedNetwork] || [];

  const networkWallets = wallets.filter((w) => w.network === selectedNetwork);
  const effectiveSourceAddress = sendingFromExchange
    ? ''
    : selectedSavedAddress && selectedSavedAddress !== '__new__'
      ? selectedSavedAddress
      : manualSourceAddress.trim();
  const effectiveReturnAddress = sendingFromExchange ? undefined : effectiveSourceAddress;

  useEffect(() => {
    if (!selectedTraderRecord) {
      setSelectedNetwork('');
      setSelectedAsset('');
      return;
    }

    setSelectedNetwork((current) => {
      if (current && availableTraderNetworks.includes(current)) {
        return current;
      }

      if (availableTraderNetworks.length === 1) {
        const onlyNetwork = availableTraderNetworks[0];
        const traderAssetsForSingleNetwork = availableTraderAssetsByNetwork[onlyNetwork] || [];
        setSelectedAsset((currentAsset) => {
          if (currentAsset && traderAssetsForSingleNetwork.includes(currentAsset)) {
            return currentAsset;
          }

          return traderAssetsForSingleNetwork.includes('USDT') ? 'USDT' : traderAssetsForSingleNetwork[0] || '';
        });
        return onlyNetwork;
      }

      setSelectedAsset('');
      return '';
    });
  }, [selectedTraderRecord, availableTraderNetworks, availableTraderAssetsByNetwork]);

  useEffect(() => {
    if (!selectedNetwork) {
      setSelectedAsset('');
      return;
    }

    setSelectedAsset((current) => {
      if (current && availableTraderAssets.includes(current)) {
        return current;
      }

      return availableTraderAssets.includes('USDT') ? 'USDT' : availableTraderAssets[0] || '';
    });
  }, [selectedNetwork, availableTraderAssets]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const deposit = await createDeposit({
        investment_period_id: selectedPeriod,
        trader_id: selectedTrader,
        network: selectedNetwork,
        asset_symbol: selectedAsset,
        source_address: effectiveSourceAddress,
        return_address: effectiveReturnAddress,
        settlement_preference: settlementPreference,
        sending_from_exchange: sendingFromExchange,
      });

      router.push(`/deposits/${deposit.deposit_id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || t('depositCreate.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen activeTab="trade">
      <div className="relative z-10 rounded-3xl border border-cyan-300/15 bg-slate-950/60 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <PageBackButton fallbackHref="/traders" />
            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-cyan-200/70">{t('depositCreate.kicker')}</div>
              <h1 className="mt-2 text-2xl font-bold text-slate-50">{t('depositCreate.title')}</h1>
              <p className="mt-2 text-sm text-slate-400">{t('depositCreate.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <BrandBellLink />
            <LanguageSwitch />
          </div>
        </div>
      </div>

      {error && (
        <div className="relative z-10 mt-4 rounded-lg bg-red-500/20 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="relative z-10 mt-4 space-y-4">
        <div>
          <label className={helperLabelClassName}>{t('depositCreate.period')}</label>
          <select
            value={selectedPeriod || getDefaultActivePeriodId(periods)}
            onChange={(e) => {
              setSelectedPeriod(e.target.value);
              setSelectedNetwork('');
              setSelectedAsset('');
            }}
            className={selectClassName}
            required
          >
            <option value="">{t('depositCreate.selectPeriod')}</option>
            {periods.map((p) => (
              <option key={p.investment_period_id} value={p.investment_period_id}>
                {p.title} ({new Date(p.start_date).toLocaleDateString()} &mdash; {new Date(p.end_date).toLocaleDateString()})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={helperLabelClassName}>{t('depositCreate.trader')}</label>
          <select
            value={selectedTrader}
            onChange={(e) => {
              setSelectedTrader(e.target.value);
              setSelectedNetwork('');
              setSelectedAsset('');
              setSelectedSavedAddress('');
              setManualSourceAddress('');
            }}
            className={selectClassName}
            required
          >
            <option value="">{t('depositCreate.selectTrader')}</option>
            {traders.map((trader) => (
              <option key={trader.trader_id} value={trader.trader_id}>
                {trader.display_name || trader.nickname || trader.slug || trader.trader_id}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={helperLabelClassName}>{t('depositCreate.network')}</label>
          <select
            value={selectedNetwork}
            onChange={(e) => {
              setSelectedNetwork(e.target.value);
              setSelectedAsset('');
              setSelectedSavedAddress('');
              setManualSourceAddress('');
            }}
            className={selectClassName}
            required
            disabled={!selectedTrader || availableTraderNetworks.length === 0}
          >
            <option value="">{t('common.select')}</option>
            {availableTraderNetworks.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <div className="rounded-3xl border border-cyan-300/10 bg-slate-950/60 p-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={sendingFromExchange}
              onChange={(event) => {
                const nextChecked = event.target.checked;
                setSendingFromExchange(nextChecked);
                if (nextChecked) {
                  setSelectedSavedAddress('');
                  setManualSourceAddress('');
                }
              }}
              className="mt-1 h-4 w-4 rounded border border-cyan-300/20 bg-slate-950/70 accent-cyan-300"
            />
            <div>
              <div className="text-sm font-semibold text-slate-100">{t('depositCreate.sendingFromExchange')}</div>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                {sendingFromExchange ? t('depositCreate.exchangeRoutingDeferred') : t('depositCreate.exchangeSourceWalletHint')}
              </p>
            </div>
          </label>
        </div>

        {!sendingFromExchange && selectedNetwork && (
          <div>
            <label className={helperLabelClassName}>{t('common.sourceWallet')}</label>
            {networkWallets.length > 0 && (
              <select
                value={selectedSavedAddress}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  setSelectedSavedAddress(nextValue);
                  if (nextValue !== '__new__') {
                    setManualSourceAddress('');
                  }
                }}
                className={`${selectClassName} mb-2`}
              >
                <option value="">{t('depositCreate.savedAddress')}</option>
                {networkWallets.map((w) => (
                  <option key={w.wallet_id} value={w.source_address}>
                    {w.source_address.slice(0, 10)}...{w.source_address.slice(-8)}
                  </option>
                ))}
                <option value="__new__">{t('depositCreate.useNewAddress')}</option>
              </select>
            )}
            {(selectedSavedAddress === '__new__' || networkWallets.length === 0) && (
              <input
                type="text"
                value={manualSourceAddress}
                onChange={(e) => setManualSourceAddress(e.target.value)}
                placeholder={t('depositCreate.enterWallet')}
                className={selectClassName}
                required
              />
            )}
          </div>
        )}

        <div className="rounded-3xl border border-cyan-300/10 bg-slate-950/60 p-4">
          <div className="text-sm font-semibold text-slate-100">{t('depositCreate.settlementPreference')}</div>
          <p className="mt-1 text-sm leading-6 text-slate-400">{t('depositCreate.settlementPreferenceHelp')}</p>
          <div className="mt-3 grid gap-2">
            {SETTLEMENT_OPTIONS.map((option) => {
              const labelKey =
                option === 'REINVEST_PRINCIPAL'
                  ? 'settlementPreference.reinvestPrincipal'
                  : option === 'REINVEST_ALL'
                    ? 'settlementPreference.reinvestAll'
                    : 'settlementPreference.withdrawAll';
              const helpKey =
                option === 'REINVEST_PRINCIPAL'
                  ? 'settlementPreference.reinvestPrincipalHelp'
                  : option === 'REINVEST_ALL'
                    ? 'settlementPreference.reinvestAllHelp'
                    : 'settlementPreference.withdrawAllHelp';
              const selected = settlementPreference === option;

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSettlementPreference(option)}
                  className={`rounded-2xl border p-3 text-left transition ${
                    selected ? 'border-cyan-300/40 bg-cyan-400/10' : 'border-cyan-300/10 bg-slate-950/70'
                  }`}
                >
                  <div className="text-sm font-semibold text-slate-100">{t(labelKey)}</div>
                  <p className="mt-1 text-xs leading-5 text-slate-400">{t(helpKey)}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className={helperLabelClassName}>{t('depositCreate.asset')}</label>
          <select
            value={selectedAsset}
            onChange={(e) => setSelectedAsset(e.target.value)}
            className={selectClassName}
            required
            disabled={!selectedNetwork || availableTraderAssets.length === 0}
          >
            <option value="">{t('depositCreate.selectAsset')}</option>
            {availableTraderAssets.map((a: string) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading || !selectedPeriod || !selectedTrader || !selectedNetwork || !selectedAsset || (!sendingFromExchange && !effectiveSourceAddress)}
          className="w-full p-3 bg-primary text-primary-text rounded-lg font-medium disabled:opacity-50"
        >
          {loading ? t('depositCreate.creating') : t('depositCreate.submit')}
        </button>
      </form>
    </AppScreen>
  );
}
