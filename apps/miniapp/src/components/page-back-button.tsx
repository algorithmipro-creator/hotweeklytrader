'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from './icons';

type PageBackButtonProps = {
  fallbackHref: string;
  forceFallback?: boolean;
};

export function PageBackButton({ fallbackHref, forceFallback = false }: PageBackButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (!forceFallback && typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallbackHref);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Back"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/15 bg-slate-900/70 text-slate-100"
    >
      <ArrowLeftIcon className="h-5 w-5" />
    </button>
  );
}
