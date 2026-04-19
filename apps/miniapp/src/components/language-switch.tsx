'use client';

import { useLanguage } from '../providers/language-provider';

export function LanguageSwitch() {
  const { language, setLanguage } = useLanguage();
  const nextLanguage = language === 'en' ? 'ru' : 'en';

  return (
    <button
      type="button"
      onClick={() => setLanguage(nextLanguage)}
      className="inline-flex min-w-10 items-center justify-center rounded-2xl border border-cyan-300/15 bg-slate-900/70 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-100"
      aria-label={`Switch language to ${nextLanguage.toUpperCase()}`}
    >
      {language.toUpperCase()}
    </button>
  );
}
