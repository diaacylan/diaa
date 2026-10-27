import React, { useMemo } from 'react';
import { RefreshCw, Calculator, MapPin, LineChart, Newspaper, ChevronLeft, Coins } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts';
import { useApp } from '../context/AppContext';
import { AppBar, ChangeBadge, OfflineBanner, SectionTitle, Skeleton, timeAgo } from '../components/ui';
import { formatIQD, stripHtml } from '../utils/formatters';
import { karatPrices, makeChange, previousPoint } from '../utils/derive';

export const HomeScreen: React.FC = () => {
  const { currentRates: r, history, articles, isLoading, isRefreshing, isOffline, lastUpdatedTime, refreshRates, setTab, push } =
    useApp();

  const prev = useMemo(() => previousPoint(history, r), [history, r]);
  const usdChange = makeChange(r?.rate_100_usd, prev?.rate_100_usd);
  const goldChange = makeChange(r?.gold21, prev?.gold21);
  const gold = karatPrices(r?.gold21);
  const chartData = useMemo(
    () =>
      (history?.points ?? [])
        .slice()
        .sort((a, b) => +new Date(a.market_time) - +new Date(b.market_time))
        .map((p) => ({ v: p.rate_100_usd }))
        .filter((p) => p.v > 0),
    [history],
  );
  const cities = (r?.cities ?? []).filter((c) => c.city_key !== 'baghdad').slice(0, 4);
  const article = articles[0];

  return (
    <>
      <AppBar
        title="دولار العراق"
        actions={
          <button
            onClick={refreshRates}
            aria-label="تحديث الأسعار"
            className="press grid h-10 w-10 place-items-center rounded-full bg-surface text-ink border border-line"
          >
            <RefreshCw size={18} className={isRefreshing ? 'spin' : ''} />
          </button>
        }
      />
      <div className="scroll-area flex-1 px-4 pb-6">
        {isOffline && r && <OfflineBanner time={timeAgo(lastUpdatedTime)} />}

        {/* السعر الرئيسي */}
        <section
          className="relative overflow-hidden rounded-3xl p-5 text-white"
          style={{ background: 'linear-gradient(135deg, #0B7A4B 0%, #075C39 100%)' }}
        >
          <div className="absolute -start-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
          <div className="relative">
            <div className="flex items-center justify-between text-sm font-semibold text-white/80">
              <span>سعر 100 دولار في بغداد</span>
              <span className="flex items-center gap-1.5 text-xs">
                <span className={`h-2 w-2 rounded-full ${isOffline ? 'bg-red-300' : 'bg-emerald-300'}`} />
                {isOffline ? 'غير متصل' : 'مباشر'}
              </span>
            </div>
            {isLoading && !r ? (
              <Skeleton className="mt-3 h-14 w-56 !bg-white/20" />
            ) : (
              <div className="mt-1 flex items-baseline gap-2">
                <span className="num text-[44px] font-black leading-tight tracking-tight">
                  {formatIQD(r?.rate_100_usd, false)}
                </span>
                <span className="text-base font-bold text-white/80">د.ع</span>
              </div>
            )}
            <div className="mt-1 flex items-center gap-2">
              <ChangeBadge change={usdChange} onDark />
              {usdChange && <span className="text-[11px] text-white/70">عن القراءة السابقة</span>}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl bg-white/12 px-3.5 py-2.5">
                <div className="text-xs text-white/75">سعر البيع</div>
                <div className="num text-lg font-extrabold">{formatIQD(r?.sell, false)}</div>
              </div>
              <div className="rounded-2xl bg-white/12 px-3.5 py-2.5">
                <div className="text-xs text-white/75">سعر الشراء</div>
                <div className="num text-lg font-extrabold">{formatIQD(r?.buy, false)}</div>
              </div>
            </div>
            <div className="mt-3 text-[11px] text-white/70">
              {r?.market_time ? `آخر تحديث ${timeAgo(r.market_time)}` : ''}
              {r?.source_label ? ` · ${r.source_label}` : ''}
            </div>
          </div>
        </section>

        {/* اختصارات */}
        <div className="mt-4 grid grid-cols-4 gap-2.5">
          {[
            { label: 'الحاسبة', Icon: Calculator, go: () => setTab('calculator') },
            { label: 'المحافظات', Icon: MapPin, go: () => setTab('cities') },
            { label: 'السجل', Icon: LineChart, go: () => push({ name: 'history' }) },
            { label: 'المقالات', Icon: Newspaper, go: () => push({ name: 'articles' }) },
          ].map(({ label, Icon, go }) => (
            <button key={label} onClick={go} className="press card flex flex-col items-center gap-1.5 py-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand">
                <Icon size={20} />
              </span>
              <span className="text-[12px] font-bold text-ink">{label}</span>
            </button>
          ))}
        </div>

        {/* الذهب */}
        <SectionTitle action={{ label: 'كل الأسواق', onClick: () => setTab('markets') }}>الذهب</SectionTitle>
        <button onClick={() => setTab('markets')} className="press card flex w-full items-center gap-3 p-4 text-start">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gold/15 text-gold">
            <Coins size={22} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold text-muted">مثقال الذهب عيار 21</span>
            {gold ? (
              <span className="num block text-xl font-black text-ink">{formatIQD(gold.mithqal21)}</span>
            ) : (
              <span className="block text-sm text-muted">غير متوفر حالياً</span>
            )}
          </span>
          <span className="flex flex-col items-end gap-1">
            <ChangeBadge change={goldChange} />
            {gold && <span className="num text-[11px] text-muted">الغرام {formatIQD(gold.g21, false)}</span>}
          </span>
        </button>

        {/* الرسم */}
        {chartData.length > 2 && (
          <>
            <SectionTitle action={{ label: 'التفاصيل', onClick: () => push({ name: 'history' }) }}>
              حركة الدولار — آخر 30 يوماً
            </SectionTitle>
            <button onClick={() => push({ name: 'history' })} className="card block h-32 w-full overflow-hidden p-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 12, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <YAxis hide domain={['dataMin', 'dataMax']} />
                  <Area type="monotone" dataKey="v" stroke="var(--brand)" strokeWidth={2.5} fill="url(#hg)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </button>
          </>
        )}

        {/* المحافظات */}
        {cities.length > 0 && (
          <>
            <SectionTitle action={{ label: 'عرض الكل', onClick: () => setTab('cities') }}>المحافظات</SectionTitle>
            <div className="card divide-y divide-line overflow-hidden">
              {cities.map((c) => (
                <button
                  key={c.city_key}
                  onClick={() => push({ name: 'city', city: c })}
                  className="row-press flex w-full items-center justify-between px-4 py-3 text-start"
                >
                  <span className="text-[15px] font-bold text-ink">{c.city_name}</span>
                  <span className="flex items-center gap-2">
                    <span className="num text-[15px] font-extrabold text-ink">{formatIQD(c.rate, false)}</span>
                    <ChevronLeft size={16} className="text-muted" />
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* آخر مقال */}
        {article && (
          <>
            <SectionTitle action={{ label: 'كل المقالات', onClick: () => push({ name: 'articles' }) }}>
              آخر المقالات
            </SectionTitle>
            <button
              onClick={() => push({ name: 'article', article })}
              className="press card block w-full p-4 text-start"
            >
              <span className="block text-[15px] font-extrabold leading-snug text-ink">{article.title}</span>
              <span className="mt-1.5 line-clamp-2 block text-[13px] leading-relaxed text-muted">
                {stripHtml(article.excerpt_html)}
              </span>
            </button>
          </>
        )}
        <p className="mt-6 text-center text-[11px] text-muted">
          الأسعار إرشادية وقد تختلف قليلاً بين مكاتب الصرف.
        </p>
      </div>
    </>
  );
};
