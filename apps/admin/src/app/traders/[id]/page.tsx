'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  getAdminTrader,
  updateAdminTrader,
  upsertAdminTraderMainAddress,
} from '../../../lib/api';

const DEFAULT_ADDRESS_FORM = {
  network: 'TRON',
  asset_symbol: 'USDT',
  address: '',
  is_active: true,
};

export default function TraderDetailPage() {
  const params = useParams();
  const traderId = params.id as string;
  const [trader, setTrader] = useState<any>(null);
  const [profileForm, setProfileForm] = useState<any>(null);
  const [addressForm, setAddressForm] = useState(DEFAULT_ADDRESS_FORM);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState('');

  async function loadTrader() {
    const nextTrader = await getAdminTrader(traderId);
    setTrader(nextTrader);
    setProfileForm({
      nickname: nextTrader.nickname || '',
      slug: nextTrader.slug || '',
      display_name: nextTrader.display_name || '',
      profile_title: nextTrader.profile_title || 'semper in motu ai',
      description: nextTrader.description || '',
      status: nextTrader.status || 'ACTIVE',
    });
  }

  useEffect(() => {
    if (!traderId) return;

    loadTrader()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [traderId]);

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusyAction('profile');

    try {
      await updateAdminTrader(traderId, {
        nickname: profileForm.nickname.trim(),
        slug: profileForm.slug.trim(),
        display_name: profileForm.display_name.trim(),
        profile_title: profileForm.profile_title.trim(),
        description: profileForm.description.trim() || undefined,
        status: profileForm.status,
      });
      await loadTrader();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update trader');
    } finally {
      setBusyAction('');
    }
  };

  const handleAddressSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusyAction('address');

    try {
      await upsertAdminTraderMainAddress(traderId, {
        network: addressForm.network,
        asset_symbol: addressForm.asset_symbol.trim(),
        address: addressForm.address.trim(),
        is_active: addressForm.is_active,
      });
      setAddressForm(DEFAULT_ADDRESS_FORM);
      await loadTrader();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save main address');
    } finally {
      setBusyAction('');
    }
  };

  if (loading) return <div className="text-text-secondary">Loading...</div>;
  if (!trader || !profileForm) return <div className="text-danger">Trader not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{trader.display_name}</h1>
          <p className="text-sm text-text-secondary mt-1">@{trader.slug}</p>
        </div>
        <div className="text-sm text-text-secondary">
          Status: <span className="text-text font-medium">{trader.status}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr,0.8fr] gap-6">
        <section className="bg-bg-secondary rounded-lg p-4">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="font-semibold">Profile</h2>
              <p className="text-sm text-text-secondary mt-1">
                Update trader metadata used by miniapp routing and reporting.
              </p>
            </div>
            <div className="font-mono text-xs text-text-secondary">{trader.trader_id}</div>
          </div>

          <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={handleProfileSubmit}>
            <label className="text-sm">
              <div className="text-text-secondary mb-1">Nickname</div>
              <input
                required
                value={profileForm.nickname}
                onChange={(event) => setProfileForm((prev: any) => ({ ...prev, nickname: event.target.value }))}
                className="w-full rounded-lg bg-bg-tertiary px-3 py-2"
              />
            </label>

            <label className="text-sm">
              <div className="text-text-secondary mb-1">Slug</div>
              <input
                required
                value={profileForm.slug}
                onChange={(event) => setProfileForm((prev: any) => ({ ...prev, slug: event.target.value.toLowerCase() }))}
                className="w-full rounded-lg bg-bg-tertiary px-3 py-2"
              />
            </label>

            <label className="text-sm">
              <div className="text-text-secondary mb-1">Display Name</div>
              <input
                required
                value={profileForm.display_name}
                onChange={(event) => setProfileForm((prev: any) => ({ ...prev, display_name: event.target.value }))}
                className="w-full rounded-lg bg-bg-tertiary px-3 py-2"
              />
            </label>

            <label className="text-sm">
              <div className="text-text-secondary mb-1">Profile Title</div>
              <input
                value={profileForm.profile_title}
                onChange={(event) => setProfileForm((prev: any) => ({ ...prev, profile_title: event.target.value }))}
                className="w-full rounded-lg bg-bg-tertiary px-3 py-2"
              />
            </label>

            <label className="text-sm">
              <div className="text-text-secondary mb-1">Status</div>
              <select
                value={profileForm.status}
                onChange={(event) => setProfileForm((prev: any) => ({ ...prev, status: event.target.value }))}
                className="w-full rounded-lg bg-bg-tertiary px-3 py-2"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="PAUSED">PAUSED</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </label>

            <label className="text-sm md:col-span-2">
              <div className="text-text-secondary mb-1">Description</div>
              <textarea
                rows={4}
                value={profileForm.description}
                onChange={(event) => setProfileForm((prev: any) => ({ ...prev, description: event.target.value }))}
                className="w-full rounded-lg bg-bg-tertiary px-3 py-2"
              />
            </label>

            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={busyAction !== ''}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busyAction === 'profile' ? 'Saving...' : 'Save Trader'}
              </button>
            </div>
          </form>
        </section>

        <section className="space-y-6">
          <div className="bg-bg-secondary rounded-lg p-4">
            <h2 className="font-semibold mb-3">Add Main Address</h2>
            <form className="space-y-3" onSubmit={handleAddressSubmit}>
              <label className="text-sm block">
                <div className="text-text-secondary mb-1">Network</div>
                <select
                  value={addressForm.network}
                  onChange={(event) => setAddressForm((prev) => ({ ...prev, network: event.target.value }))}
                  className="w-full rounded-lg bg-bg-tertiary px-3 py-2"
                >
                  <option value="TRON">TRON</option>
                  <option value="TON">TON</option>
                  <option value="BSC">BSC</option>
                </select>
              </label>

              <label className="text-sm block">
                <div className="text-text-secondary mb-1">Asset Symbol</div>
                <input
                  value={addressForm.asset_symbol}
                  onChange={(event) => setAddressForm((prev) => ({ ...prev, asset_symbol: event.target.value.toUpperCase() }))}
                  className="w-full rounded-lg bg-bg-tertiary px-3 py-2"
                />
              </label>

              <label className="text-sm block">
                <div className="text-text-secondary mb-1">Address</div>
                <textarea
                  rows={3}
                  required
                  value={addressForm.address}
                  onChange={(event) => setAddressForm((prev) => ({ ...prev, address: event.target.value }))}
                  className="w-full rounded-lg bg-bg-tertiary px-3 py-2 font-mono text-xs"
                />
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={addressForm.is_active}
                  onChange={(event) => setAddressForm((prev) => ({ ...prev, is_active: event.target.checked }))}
                />
                Set as active route for this network and asset
              </label>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={busyAction !== ''}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busyAction === 'address' ? 'Saving...' : 'Add Main Address'}
                </button>
              </div>
            </form>
          </div>

          <section className="bg-bg-secondary rounded-lg p-4">
            <h2 className="font-semibold mb-3">Main Addresses</h2>
            <div className="space-y-3">
              {(trader.main_addresses || []).map((address: any) => (
                <div key={address.trader_main_address_id} className="rounded-lg border border-gray-700 p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium">{address.network} / {address.asset_symbol}</div>
                    {address.is_active && <span className="text-success text-xs">active</span>}
                  </div>
                  <div className="font-mono text-xs mt-2 break-all">{address.address}</div>
                  <div className="text-xs text-text-secondary mt-2">{address.trader_main_address_id}</div>
                </div>
              ))}
              {(!trader.main_addresses || trader.main_addresses.length === 0) && (
                <div className="text-sm text-text-secondary">No main addresses configured yet.</div>
              )}
            </div>
          </section>
        </section>
      </div>

      <Link href="/traders" className="text-primary text-sm hover:underline">
        &larr; Back to Traders
      </Link>
    </div>
  );
}
