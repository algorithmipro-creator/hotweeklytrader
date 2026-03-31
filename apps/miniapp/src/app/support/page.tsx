'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function SupportPage() {
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Support</h1>

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
