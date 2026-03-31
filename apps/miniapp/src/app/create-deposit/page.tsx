'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getPeriods, createDeposit } from '../../lib/api';

const NETWORKS = ['BSC', 'TRON', 'TON', 'ETH', 'SOL'];

export default function CreateDepositPage() {
  const router = useRouter();
  const [periods, setPeriods] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('');
  const [selectedAsset, setSelectedAsset] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPeriods()
      .then(setPeriods)
      .catch(console.error);
  }, []);

  const currentPeriod = periods.find((p) => p.investment_period_id === selectedPeriod);
  const availableAssets = currentPeriod?.accepted_assets || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const deposit = await createDeposit({
        investment_period_id: selectedPeriod,
        network: selectedNetwork,
        asset_symbol: selectedAsset,
      });

      router.push(`/deposits/${deposit.deposit_id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create deposit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">New Deposit</h1>

      {error && (
        <div className="bg-red-500/20 text-red-400 p-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-text-secondary mb-1">Investment Period</label>
          <select
            value={selectedPeriod}
            onChange={(e) => {
              setSelectedPeriod(e.target.value);
              setSelectedAsset('');
            }}
            className="w-full p-3 bg-bg-secondary rounded-lg text-text"
            required
          >
            <option value="">Select a period...</option>
            {periods.map((p) => (
              <option key={p.investment_period_id} value={p.investment_period_id}>
                {p.title} ({new Date(p.start_date).toLocaleDateString()} &mdash; {new Date(p.end_date).toLocaleDateString()})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-text-secondary mb-1">Network</label>
          <select
            value={selectedNetwork}
            onChange={(e) => setSelectedNetwork(e.target.value)}
            className="w-full p-3 bg-bg-secondary rounded-lg text-text"
            required
          >
            <option value="">Select a network...</option>
            {NETWORKS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-text-secondary mb-1">Asset</label>
          <select
            value={selectedAsset}
            onChange={(e) => setSelectedAsset(e.target.value)}
            className="w-full p-3 bg-bg-secondary rounded-lg text-text"
            required
            disabled={!currentPeriod}
          >
            <option value="">Select an asset...</option>
            {availableAssets.map((a: string) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading || !selectedPeriod || !selectedNetwork || !selectedAsset}
          className="w-full p-3 bg-primary text-primary-text rounded-lg font-medium disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Deposit'}
        </button>
      </form>

      <Link href="/deposits" className="block text-center text-primary mt-6">
        &larr; Back to Deposits
      </Link>
    </div>
  );
}
