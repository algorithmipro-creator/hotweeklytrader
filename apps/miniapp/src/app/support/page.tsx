'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createSupportCase } from '../../lib/api';

export default function SupportPage() {
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('deposit');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await createSupportCase({
        category,
        opened_reason: message,
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit');
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Support</h1>

      {error && (
        <div className="bg-red-500/20 text-red-400 p-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {submitted ? (
        <div className="bg-green-500/20 text-green-400 p-4 rounded-lg text-center">
          <p className="font-medium mb-2">Message Sent!</p>
          <p className="text-sm">Our team will respond as soon as possible.</p>
          <Link href="/" className="block text-primary mt-4">
            &larr; Back to Home
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-3 bg-bg-secondary rounded-lg text-text"
            >
              <option value="deposit">Deposit Issue</option>
              <option value="payout">Payout Issue</option>
              <option value="report">Report Question</option>
              <option value="account">Account Issue</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1">Your Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3 bg-bg-secondary rounded-lg text-text min-h-[120px]"
              placeholder="Describe your issue or question..."
              required
            />
          </div>

          <button
            type="submit"
            className="w-full p-3 bg-primary text-primary-text rounded-lg font-medium"
          >
            Send Message
          </button>
        </form>
      )}

      <Link href="/" className="block text-center text-primary mt-6">
        &larr; Back to Home
      </Link>
    </div>
  );
}
