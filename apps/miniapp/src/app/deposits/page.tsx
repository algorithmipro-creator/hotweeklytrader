'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getDeposits } from '../../lib/api';
import { DepositCard } from '../../components/deposit-card';

export default function DepositsPage() {
  const [deposits, setDeposits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDeposits()
      .then(setDeposits)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">My Deposits</h1>
        <Link href="/create-deposit" className="text-primary text-sm">
          + New Deposit
        </Link>
      </div>

      {loading ? (
        <div className="text-text-secondary">Loading...</div>
      ) : deposits.length === 0 ? (
        <div className="text-center py-8 text-text-secondary">
          <p className="mb-4">No deposits yet</p>
          <Link href="/create-deposit" className="text-primary">
            Create your first deposit &rarr;
          </Link>
        </div>
      ) : (
        deposits.map((deposit) => (
          <DepositCard key={deposit.deposit_id} deposit={deposit} />
        ))
      )}

      <Link href="/" className="block text-center text-primary mt-6">
        &larr; Back to Home
      </Link>
    </div>
  );
}
