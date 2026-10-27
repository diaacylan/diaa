import React from 'react';
import { ArrowRight, TrendingUp, TrendingDown, Minus, WifiOff } from 'lucide-react';
import { Change } from '../utils/derive';
import { formatIQD } from '../utils/formatters';

export const ChangeBadge: React.FC<{ change: Change | null; unit?: 'iqd' | 'none'; onDark?: boolean }> = ({
  change,
  unit = 'iqd',
  onDark,
}) => {
  if (!change) return null;
  const Icon = change.dir === 'up' ? TrendingUp : change.dir === 'down' ? TrendingDown : Minus;
  const color = onDark
    ? 'bg-white/15 text-white'
    : change.dir === 'up'
    ? 'bg-up/10 text-up'
    : change.dir === 'down'
    ? 'bg-down/10 text-down'
    : 'bg-surface-2 text-muted';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${color}`}>
      <Icon size={13} strokeWidth={2.5} />
      {change.dir === 'same' ? (
        'ثابت'
      ) : (
        <span dir="ltr" className="inline-flex items-center gap-1">
          <span className="num">
            {change.dir === 'up' ? '+' : '−'}
            {unit === 'iqd' ? formatIQD(Math.abs(change.diff), false) : ''}
          </span>
          <span className="num opacity-80">({Math.abs(change.pct).toFixed(2)}%)</span>
        </span>
      )}
    </span>
  );
};

/** شريط علوي: عنوان + رجوع اختياري + إجراءات */
export const AppBar: React.FC<{
  title: string;
  onBack?: () => void;
  actions?: React.ReactNode;
  large?: boolean;
}> = ({ title, onBack, actions, large }) => (
  <header
    className="flex shrink-0 items-center gap-2 bg-bg px-4 pb-2"
    style={{ paddingTop: 'calc(var(--safe-top) + 12px)' }}
  >
    {onBack && (
      <button
        onClick={onBack}
        aria-label="رجوع"
        className="press -me-1 grid h-10 w-10 place-items-center rounded-full text-ink"
      >
        <ArrowRight size={22} />
      </button>
    )}
    <h1 className={`flex-1 truncate font-extrabold text-ink ${large ? 'text-2xl' : 'text-lg'}`}>{title}</h1>
    {actions}
  </header>
);

export const SectionTitle: React.FC<{ children: React.ReactNode; action?: { label: string; onClick: () => void } }> = ({
  children,
  action,
}) => (
  <div className="mb-2 mt-6 flex items-center justify-between px-1">
    <h2 className="text-[15px] font-extrabold text-ink">{children}</h2>
    {action && (
      <button onClick={action.onClick} className="text-xs font-bold text-brand">
        {action.label}
      </button>
    )}
  </div>
);

export const OfflineBanner: React.FC<{ time?: string }> = ({ time }) => (
  <div className="mb-3 flex items-center gap-2 rounded-xl bg-down/10 px-3 py-2 text-xs font-bold text-down">
    <WifiOff size={15} />
    <span>لا يوجد اتصال — تُعرض آخر أسعار محفوظة{time ? ` (${time})` : ''}</span>
  </div>
);

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`skeleton ${className}`} />
);

export const Empty: React.FC<{ icon: React.ReactNode; title: string; hint?: string }> = ({ icon, title, hint }) => (
  <div className="flex flex-col items-center gap-2 px-6 py-16 text-center text-muted">
    <div className="grid h-14 w-14 place-items-center rounded-full bg-surface-2">{icon}</div>
    <p className="font-bold text-ink">{title}</p>
    {hint && <p className="text-sm">{hint}</p>}
  </div>
);

export const Row: React.FC<{
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  onClick?: () => void;
}> = ({ icon, title, subtitle, trailing, onClick }) => {
  const Tag: any = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-3.5 text-start ${onClick ? 'row-press' : ''}`}
    >
      {icon && <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-bold text-ink">{title}</span>
        {subtitle && <span className="block truncate text-xs text-muted">{subtitle}</span>}
      </span>
      {trailing}
    </Tag>
  );
};

export function timeAgo(iso?: string | null): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (isNaN(t)) return '';
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return 'الآن';
  if (s < 3600) return `قبل ${Math.floor(s / 60)} دقيقة`;
  if (s < 86400) return `قبل ${Math.floor(s / 3600)} ساعة`;
  return `قبل ${Math.floor(s / 86400)} يوم`;
}
