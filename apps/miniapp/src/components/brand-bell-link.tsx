'use client';

import Link from 'next/link';

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
      <path
        d="M15 17H9m8-2V10a5 5 0 10-10 0v5l-2 2h14l-2-2Zm-5 5a2 2 0 002-2H10a2 2 0 002 2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BrandBellLink() {
  return (
    <Link
      href="/notifications"
      className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-300/15 bg-slate-900/70 text-slate-100"
      aria-label="Notifications"
    >
      <BellIcon />
    </Link>
  );
}
