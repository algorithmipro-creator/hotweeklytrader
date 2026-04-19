'use client';

import Link from 'next/link';
import { HelpIcon, HomeIcon, SupportIcon, TradeIcon } from './icons';
import { useLanguage } from '../providers/language-provider';

export type AppTab = 'faq' | 'home' | 'trade' | 'support';

type NavItem = {
  href: string;
  labelKey: string;
  tab: AppTab;
  icon: React.ComponentType<{ className?: string }>;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/faq', labelKey: 'nav.faq', tab: 'faq', icon: HelpIcon },
  { href: '/', labelKey: 'nav.home', tab: 'home', icon: HomeIcon },
  { href: '/traders', labelKey: 'nav.trade', tab: 'trade', icon: TradeIcon },
  { href: '/support', labelKey: 'nav.help', tab: 'support', icon: SupportIcon },
];

export function AppBottomNav({ activeTab }: { activeTab?: AppTab }) {
  const { t } = useLanguage();

  return (
    <nav className="absolute bottom-4 left-4 right-4 z-10 grid grid-cols-4 gap-2 rounded-3xl border border-cyan-300/15 bg-slate-950/90 p-2 shadow-[0_18px_42px_rgba(0,0,0,0.34)]">
      {NAV_ITEMS.map((item) => {
        const isActive = item.tab === activeTab;
        const Icon = item.icon;

        return (
          <Link
            key={item.tab}
            href={item.href}
            className={`grid justify-items-center gap-1 rounded-2xl px-2 py-2 text-[10px] uppercase ${
              isActive ? 'bg-[#34b5dc]/12 text-slate-100' : 'text-slate-400'
            }`}
          >
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                isActive
                  ? 'bg-gradient-to-br from-cyan-400 to-cyan-200 text-slate-950'
                  : 'bg-white/5 text-base'
              }`}
            >
              <Icon className="h-4 w-4" />
            </span>
            {t(item.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
