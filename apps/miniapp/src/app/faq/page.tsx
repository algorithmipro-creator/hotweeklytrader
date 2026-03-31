'use client';

import Link from 'next/link';

const FAQS = [
  {
    q: 'How do I make a deposit?',
    a: 'Open the Mini App, go to "New Deposit", select a network and investment period, then follow the transfer instructions. Send the exact amount to the provided address.',
  },
  {
    q: 'How long does confirmation take?',
    a: 'Confirmation depends on the blockchain network. BSC typically takes ~12 confirmations (~3 min), ETH ~12 confirmations (~3 min), TRON ~19 confirmations (~6 sec).',
  },
  {
    q: 'When do I get my payout?',
    a: 'Payouts are processed after the trading period ends and the report is approved by the admin. You will receive a notification when the payout is sent.',
  },
  {
    q: 'What networks are supported?',
    a: 'Currently supported: BSC, TRON, TON, ETH, and SOL. Check the Mini App for the latest list of supported networks and assets.',
  },
  {
    q: 'What happens if I send the wrong token?',
    a: 'If you send an unsupported token, your deposit will be marked for manual review. Contact support with the transaction hash for assistance.',
  },
  {
    q: 'Can I have multiple deposits?',
    a: 'Yes, you can have multiple active deposits across different networks and periods. Each deposit is tracked independently.',
  },
];

export default function FaqPage() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">FAQ</h1>

      <div className="space-y-3">
        {FAQS.map((faq, i) => (
          <div key={i} className="bg-bg-secondary rounded-lg p-4">
            <h3 className="font-medium mb-2">{faq.q}</h3>
            <p className="text-text-secondary text-sm">{faq.a}</p>
          </div>
        ))}
      </div>

      <Link href="/" className="block text-center text-primary mt-6">
        &larr; Back to Home
      </Link>
    </div>
  );
}
