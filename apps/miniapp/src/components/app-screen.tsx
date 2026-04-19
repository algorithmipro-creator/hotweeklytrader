'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeIcon, TradeIcon, HelpIcon, SupportIcon } from './icons';
import { useLanguage } from '../providers/language-provider';

function matchesTab(pathname: string, tabHref: string) {
  if (tabHref === '/') {
    return pathname === '/';
  }

  return pathname === tabHref || pathname.startsWith(`${tabHref}/`);
}

export function AppScreen({
  children,
  activeTab,
}: {
  children: ReactNode;
  activeTab?: string;
}) {
  const pathname = usePathname();
  const { t } = useLanguage();

  const tabs = [
    { href: '/', label: t('nav.home'), icon: HomeIcon, id: 'home' },
    { href: '/deposits', label: t('nav.trade'), icon: TradeIcon, id: 'trade' },
    { href: '/faq', label: t('nav.faq'), icon: HelpIcon, id: 'help' },
    { href: '/support', label: t('support.title'), icon: SupportIcon, id: 'support' },
  ];

  return (
    <div className="min-h-screen bg-[#051018] text-text">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,rgba(72,196,230,0.18),transparent_58%)]" />
        <div className="absolute right-[-18%] top-28 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute left-[-18%] top-52 h-80 w-80 rounded-full bg-emerald-300/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-28 pt-5">
        {children}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md px-4 pb-4">
        <div className="grid grid-cols-4 gap-2 rounded-[28px] border border-cyan-300/15 bg-slate-950 p-2 shadow-[0_25px_45px_rgba(0,0,0,0.35)]">
          {tabs.map((tab) => {
            const active = activeTab ? activeTab === tab.id : matchesTab(pathname, tab.href);
            const Icon = tab.icon;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center justify-center rounded-3xl px-2 py-2 text-[11px] font-semibold transition ${
                  active
                    ? 'bg-cyan-400/12 text-cyan-100'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="mt-1">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
