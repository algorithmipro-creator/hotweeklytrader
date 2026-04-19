'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { createAdminTrader, getAdminTraders } from '../../lib/api';

const DEFAULT_FORM = {
  nickname: '',
  slug: '',
  display_name: '',
  profile_title: 'semper in motu ai',
  description: '',
  status: 'ACTIVE',
};

export default function TradersPage() {
  const [traders, setTraders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);

  async function loadTraders() {
    const nextTraders = await getAdminTraders();
    setTraders(nextTraders);
  }

  useEffect(() => {
    loadTraders()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);

    try {
      await createAdminTrader({
        nickname: form.nickname.trim(),
        slug: form.slug.trim(),
        display_name: form.display_name.trim(),
        profile_title: form.profile_title.trim(),
        description: form.description.trim() || undefined,
        status: form.status,
      });
      setForm(DEFAULT_FORM);
      await loadTraders();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create trader');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="text-text-secondary">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Traders</h1>
          <p className="text-sm text-text-secondary mt-1">
            Directory of platform traders and their active main addresses.
          </p>
        </div>
      </div>

      <section className="bg-bg-secondary rounded-lg p-4">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="font-semibold">Create Trader</h2>
            <p className="text-sm text-text-secondary mt-1">
              Add a new trader profile before wiring deposits or reports to it.
            </p>
          </div>
        </div>

        <form className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3" onSubmit={handleSubmit}>
          <label className="text-sm">
            <div className="text-text-secondary mb-1">Nickname</div>
            <input
              required
              value={form.nickname}
              onChange={(event) => setForm((prev) => ({ ...prev, nickname: event.target.value }))}
              className="w-full rounded-lg bg-bg-tertiary px-3 py-2"
            />
          </label>

          <label className="text-sm">
            <div className="text-text-secondary mb-1">Slug</div>
            <input
              required
              value={form.slug}
              onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value.toLowerCase() }))}
              className="w-full rounded-lg bg-bg-tertiary px-3 py-2"
            />
          </label>

          <label className="text-sm">
            <div className="text-text-secondary mb-1">Display Name</div>
            <input
              required
              value={form.display_name}
              onChange={(event) => setForm((prev) => ({ ...prev, display_name: event.target.value }))}
              className="w-full rounded-lg bg-bg-tertiary px-3 py-2"
            />
          </label>

          <label className="text-sm">
            <div className="text-text-secondary mb-1">Profile Title</div>
            <input
              value={form.profile_title}
              onChange={(event) => setForm((prev) => ({ ...prev, profile_title: event.target.value }))}
              className="w-full rounded-lg bg-bg-tertiary px-3 py-2"
            />
          </label>

          <label className="text-sm">
            <div className="text-text-secondary mb-1">Status</div>
            <select
              value={form.status}
              onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
              className="w-full rounded-lg bg-bg-tertiary px-3 py-2"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="PAUSED">PAUSED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </label>

          <label className="text-sm md:col-span-2 xl:col-span-3">
            <div className="text-text-secondary mb-1">Description</div>
            <textarea
              rows={3}
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              className="w-full rounded-lg bg-bg-tertiary px-3 py-2"
            />
          </label>

          <div className="md:col-span-2 xl:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? 'Creating...' : 'Create Trader'}
            </button>
          </div>
        </form>
      </section>

      <div className="bg-bg-secondary rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg-tertiary text-text-secondary">
            <tr>
              <th className="text-left p-3">Nickname</th>
              <th className="text-left p-3">Display Name</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Addresses</th>
            </tr>
          </thead>
          <tbody>
            {traders.map((trader) => (
              <tr key={trader.trader_id} className="border-t border-gray-700 align-top">
                <td className="p-3 font-medium">
                  <Link href={`/traders/${trader.trader_id}`} className="text-primary hover:underline">
                    @{trader.slug}
                  </Link>
                </td>
                <td className="p-3">
                  <div>{trader.display_name}</div>
                  {trader.description && (
                    <div className="text-xs text-text-secondary mt-1">{trader.description}</div>
                  )}
                </td>
                <td className="p-3">{trader.status}</td>
                <td className="p-3">
                  <div className="space-y-1">
                    {(trader.main_addresses || []).map((address: any) => (
                      <div key={address.trader_main_address_id} className="text-xs">
                        <span className="text-text-secondary">{address.network}/{address.asset_symbol}:</span>{' '}
                        <span className="font-mono">{address.address}</span>
                        {address.is_active && <span className="text-success ml-2">active</span>}
                      </div>
                    ))}
                    {(!trader.main_addresses || trader.main_addresses.length === 0) && (
                      <div className="text-xs text-text-secondary">No main addresses configured yet</div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {traders.length === 0 && (
          <div className="p-8 text-center text-text-secondary">No traders found</div>
        )}
      </div>
    </div>
  );
}
