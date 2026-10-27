import React from 'react';
import { Home, CandlestickChart, Calculator, MapPin, Menu } from 'lucide-react';
import { MainTab, useApp } from '../context/AppContext';

const TABS: { id: MainTab; label: string; Icon: typeof Home }[] = [
  { id: 'home', label: 'الرئيسية', Icon: Home },
  { id: 'markets', label: 'الأسواق', Icon: CandlestickChart },
  { id: 'calculator', label: 'الحاسبة', Icon: Calculator },
  { id: 'cities', label: 'المحافظات', Icon: MapPin },
  { id: 'more', label: 'المزيد', Icon: Menu },
];

export const BottomNav: React.FC = () => {
  const { tab, setTab, stack } = useApp();
  return (
    <nav
      className="grid shrink-0 grid-cols-5 border-t border-line bg-surface"
      style={{ paddingBottom: 'var(--safe-bottom)' }}
      aria-label="التنقل الرئيسي"
    >
      {TABS.map(({ id, label, Icon }) => {
        const active = tab === id;
        return (
          <button
            key={id}
            onClick={() => (active && stack.length === 0 ? undefined : setTab(id))}
            aria-current={active ? 'page' : undefined}
            className="press flex flex-col items-center gap-0.5 pb-2 pt-2.5"
          >
            <span
              className={`grid h-7 w-14 place-items-center rounded-full transition-colors ${
                active ? 'bg-brand-soft text-brand' : 'text-muted'
              }`}
            >
              <Icon size={21} strokeWidth={active ? 2.5 : 2} />
            </span>
            <span className={`text-[11px] ${active ? 'font-extrabold text-brand' : 'font-semibold text-muted'}`}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
