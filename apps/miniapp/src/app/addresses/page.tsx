'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getWallets, bindWallet, unbindWallet } from '../../lib/api';

const NETWORKS = ['BSC', 'TRON', 'TON'];

export default function AddressesPage() {
  const [wallets, setWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [network, setNetwork] = useState('BSC');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWallets();
  }, []);

  const loadWallets = () => {
    getWallets()
      .then(setWallets)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleBind = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const wallet = await bindWallet({ network, source_address: address });
      setWallets((prev) => [wallet, ...prev]);
      setShowForm(false);
      setAddress('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to bind address');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnbind = async (walletId: string) => {
    try {
      await unbindWallet(walletId);
      setWallets((prev) => prev.filter((w) => w.wallet_id !== walletId));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to unbind');
    }
  };

  if (loading) return <div className="p-4 text-text-secondary">Loading...</div>;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">My Addresses</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-primary text-sm font-medium"
        >
          {showForm ? 'Cancel' : '+ Add Address'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleBind} className="bg-bg-secondary rounded-lg p-4 mb-4 space-y-3">
          {error && (
            <div className="bg-red-500/20 text-red-400 p-2 rounded text-xs">{error}</div>
          )}
          <div>
            <label className="block text-sm text-text-secondary mb-1">Network</label>
            <select
              value={network}
              onChange={(e) => setNetwork(e.target.value)}
              className="w-full p-3 bg-bg-tertiary rounded-lg text-text"
            >
              {NETWORKS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Your Wallet Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="0x..."
              className="w-full p-3 bg-bg-tertiary rounded-lg text-text text-sm"
              required
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full p-3 bg-primary text-primary-text rounded-lg font-medium disabled:opacity-50"
          >
            {submitting ? 'Binding...' : 'Bind Address'}
          </button>
        </form>
      )}

      {wallets.length === 0 ? (
        <div className="text-center py-8 text-text-secondary">
          <p className="mb-2">No addresses bound yet</p>
          <p className="text-sm">Add your wallet address to link deposits automatically</p>
        </div>
      ) : (
        <div className="space-y-3">
          {wallets.map((wallet) => (
            <div key={wallet.wallet_id} className="bg-bg-secondary rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{wallet.network}</span>
                <button
                  onClick={() => handleUnbind(wallet.wallet_id)}
                  className="text-red-400 text-xs font-medium"
                >
                  Unbind
                </button>
              </div>
              <div className="font-mono text-xs text-link break-all">{wallet.source_address}</div>
              <div className="text-text-secondary text-xs mt-1">
                Bound: {new Date(wallet.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      <Link href="/" className="block text-center text-primary mt-6">
        &larr; Back to Home
      </Link>
    </div>
  );
}
