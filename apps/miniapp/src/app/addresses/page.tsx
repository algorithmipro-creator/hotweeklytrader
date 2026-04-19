'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppScreen } from '../../components/app-screen';
import { BrandBellLink } from '../../components/brand-bell-link';
import { LanguageSwitch } from '../../components/language-switch';
import { PageBackButton } from '../../components/page-back-button';
import { bindWallet, getWallets, unbindWallet } from '../../lib/api';
import { useLanguage } from '../../providers/language-provider';

const NETWORKS = ['BSC', 'TRON', 'TON'];

export default function AddressesPage() {
  const { t } = useLanguage();
  const [wallets, setWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [network, setNetwork] = useState('BSC');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getWallets()
      .then(setWallets)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleBind = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const wallet = await bindWallet({ network, source_address: address });
      setWallets((prev) => [wallet, ...prev]);
      setAddress('');
      setShowForm(false);
    } catch (nextError: any) {
      setError(nextError.response?.data?.message || t('addresses.failedBind'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnbind = async (walletId: string) => {
    try {
      await unbindWallet(walletId);
      setWallets((prev) => prev.filter((wallet) => wallet.wallet_id !== walletId));
    } catch (nextError: any) {
      alert(nextError.response?.data?.message || t('addresses.failedUnbind'));
    }
  };

  if (loading) {
    return <div className="p-4 text-text-secondary">{t('common.loading')}</div>;
  }

  return (
    <AppScreen>
      <div className="relative z-10 rounded-3xl border border-cyan-300/15 bg-slate-950/60 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <PageBackButton fallbackHref="/" />
            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-cyan-200/70">{t('addresses.kicker')}</div>
              <h1 className="mt-2 text-2xl font-bold text-slate-50">{t('addresses.title')}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <BrandBellLink />
            <LanguageSwitch />
          </div>
        </div>
        <p className="mt-3 text-sm text-slate-400">{t('addresses.subtitle')}</p>
      </div>

      <div className="relative z-10 mt-4 space-y-4">
        <button
          onClick={() => setShowForm((value) => !value)}
          className="w-full rounded-2xl bg-bg-secondary p-4 text-left"
        >
          <div className="font-medium">{showForm ? t('common.cancel') : t('addresses.addAddress')}</div>
        </button>

        {showForm ? (
          <form onSubmit={handleBind} className="rounded-2xl bg-bg-secondary p-4 space-y-3">
            {error ? <div className="rounded-lg bg-red-500/15 p-3 text-sm text-red-300">{error}</div> : null}
            <label className="block text-sm text-text-secondary">
              {t('common.network')}
              <select
                value={network}
                onChange={(event) => setNetwork(event.target.value)}
                className="mt-1 w-full rounded-xl bg-bg p-3 text-text"
              >
                {NETWORKS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-text-secondary">
              {t('common.sourceWallet')}
              <input
                type="text"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder={t('addresses.placeholder')}
                className="mt-1 w-full rounded-xl bg-bg p-3 text-text"
                required
              />
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-primary px-4 py-3 font-medium text-primary-text disabled:opacity-60"
            >
              {submitting ? t('common.binding') : t('common.bind')}
            </button>
          </form>
        ) : null}

        {wallets.length === 0 ? (
          <div className="rounded-2xl bg-bg-secondary p-5 text-sm text-text-secondary">
            <div className="font-medium text-text">{t('addresses.emptyTitle')}</div>
            <p className="mt-2">{t('addresses.emptySub')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {wallets.map((wallet) => (
              <div key={wallet.wallet_id} className="rounded-2xl bg-bg-secondary p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{wallet.network}</div>
                    <div className="mt-1 text-xs text-text-secondary">
                      {t('addresses.boundDate')}: {new Date(wallet.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnbind(wallet.wallet_id)}
                    className="text-sm font-medium text-red-300"
                  >
                    {t('addresses.unbind')}
                  </button>
                </div>
                <div className="mt-3 break-all font-mono text-xs text-link">{wallet.source_address}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppScreen>
  );
}
