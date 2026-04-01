'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getPeriods, createDeposit, getWallets } from '../../lib/api';

const NETWORKS = ['BSC', 'TRON', 'TON', 'ETH', 'SOL'];

const USDT_CONTRACTS: Record<string, string> = {
  BSC: '0x55d398326f99059fF775485246999027B3197955',
  TRON: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
  TON: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
  ETH: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  SOL: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
};

export default function CreateDepositPage() {
  const router = useRouter();
  const [periods, setPeriods] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('');
  const [selectedAsset, setSelectedAsset] = useState('');
  const [sourceAddress, setSourceAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPeriods().then(setPeriods).catch(console.error);
    getWallets().then(setWallets).catch(console.error);
  }, []);

  const currentPeriod = periods.find((p) => p.investment_period_id === selectedPeriod);
  const availableAssets = currentPeriod?.accepted_assets || [];

  const networkWallets = wallets.filter((w) => w.network === selectedNetwork);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const deposit = await createDeposit({
        investment_period_id: selectedPeriod,
        network: selectedNetwork,
        asset_symbol: selectedAsset,
        source_address: sourceAddress,
      });

      router.push(`/deposits/${deposit.deposit_id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create deposit');
    } finally {
      setLoading(false);
    }
  };

  const contractAddress = selectedAsset === 'USDT' && selectedNetwork ? USDT_CONTRACTS[selectedNetwork] : null;

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
            onChange={(e) => {
              setSelectedNetwork(e.target.value);
              setSourceAddress('');
            }}
            className="w-full p-3 bg-bg-secondary rounded-lg text-text"
            required
          >
            <option value="">Select a network...</option>
            {NETWORKS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        {selectedNetwork && (
          <div>
            <label className="block text-sm text-text-secondary mb-1">Your Wallet Address</label>
            {networkWallets.length > 0 && (
              <select
                value={sourceAddress}
                onChange={(e) => setSourceAddress(e.target.value)}
                className="w-full p-3 bg-bg-secondary rounded-lg text-text mb-2"
              >
                <option value="">Select saved address...</option>
                {networkWallets.map((w) => (
                  <option key={w.wallet_id} value={w.source_address}>
                    {w.source_address.slice(0, 10)}...{w.source_address.slice(-8)}
                  </option>
                ))}
                <option value="__new__">+ Use new address</option>
              </select>
            )}
            {(sourceAddress === '__new__' || networkWallets.length === 0) && (
              <input
                type="text"
                value={sourceAddress === '__new__' ? '' : sourceAddress}
                onChange={(e) => setSourceAddress(e.target.value)}
                placeholder="Enter your wallet address..."
                className="w-full p-3 bg-bg-secondary rounded-lg text-text text-sm"
                required
              />
            )}
          </div>
        )}

        <div>
          <label className="block text-sm text-text-secondary mb-1">Asset</label>
          <select
            value={selectedAsset}
            onChange={(e) => setSelectedAsset(e.target.value)}
            className="w-full p-3 bg-bg-secondary rounded-lg text-text"
            required
            disabled={!currentPeriod || availableAssets.length === 0}
          >
            <option value="">Select an asset...</option>
            {availableAssets.map((a: string) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          {contractAddress && (
            <div className="mt-2 p-2 bg-bg-tertiary rounded-lg">
              <div className="text-xs text-text-secondary mb-1">Contract Address:</div>
              <div className="text-xs font-mono text-link break-all">{contractAddress}</div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !selectedPeriod || !selectedNetwork || !selectedAsset || !sourceAddress || sourceAddress === '__new__'}
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
