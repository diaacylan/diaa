import React, { useMemo, useState } from 'react';
import { Search, ChevronLeft, MapPin } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AppBar, Empty, Skeleton } from '../components/ui';
import { formatIQD } from '../utils/formatters';

export const CitiesScreen: React.FC = () => {
  const { currentRates: r, isLoading, push } = useApp();
  const [q, setQ] = useState('');
  const base = r?.cities.find((c) => c.city_key === 'baghdad')?.rate ?? r?.rate_100_usd;
  const list = useMemo(
    () => (r?.cities ?? []).filter((c) => c.city_name.includes(q.trim())),
    [r, q],
  );

  return (
    <>
      <AppBar title="أسعار المحافظات" />
      <div className="px-4">
        <label className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-3.5 py-2.5">
          <Search size={18} className="text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث عن محافظة"
            className="w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-muted"
          />
        </label>
        <p className="mt-3 px-1 text-xs text-muted">سعر 100 دولار في كل محافظة</p>
      </div>
      <div className="scroll-area flex-1 px-4 pb-6 pt-2">
        {isLoading && !r ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14" />)}
          </div>
        ) : list.length === 0 ? (
          <Empty icon={<MapPin />} title="لا توجد نتائج" />
        ) : (
          <div className="card divide-y divide-line overflow-hidden">
            {list.map((c) => {
              const d = base ? c.rate - base : 0;
              return (
                <button
                  key={c.city_key}
                  onClick={() => push({ name: 'city', city: c })}
                  className="row-press flex w-full items-center justify-between px-4 py-3.5 text-start"
                >
                  <span className="text-[15px] font-bold text-ink">{c.city_name}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-end">
                      <span className="num block text-[15px] font-extrabold text-ink">{formatIQD(c.rate, false)}</span>
                      {c.city_key !== 'baghdad' && d !== 0 && (
                        <span className={`num block text-[11px] font-bold ${d > 0 ? 'text-up' : 'text-down'}`}>
                          <span dir="ltr">{d > 0 ? '+' : '−'}{formatIQD(Math.abs(d), false)}</span> عن بغداد
                        </span>
                      )}
                    </span>
                    <ChevronLeft size={16} className="text-muted" />
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export const CityDetail: React.FC<{ cityKey: string; onBack: () => void }> = ({ cityKey, onBack }) => {
  const { currentRates: r } = useApp();
  const city = r?.cities.find((c) => c.city_key === cityKey);
  const base = r?.cities.find((c) => c.city_key === 'baghdad')?.rate;
  if (!city) return null;
  const d = base ? city.rate - base : 0;
  const per1 = city.rate / 100;
  return (
    <>
      <AppBar title={city.city_name} onBack={onBack} />
      <div className="scroll-area flex-1 px-4 pb-6">
        <section className="rounded-3xl p-5 text-white" style={{ background: 'linear-gradient(135deg,#0B7A4B,#075C39)' }}>
          <div className="text-sm font-semibold text-white/80">سعر 100 دولار في {city.city_name}</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="num text-[40px] font-black leading-tight">{formatIQD(city.rate, false)}</span>
            <span className="font-bold text-white/80">د.ع</span>
          </div>
          {city.city_key !== 'baghdad' && base ? (
            <div className="num mt-1 text-sm text-white/85">
              {d === 0 ? 'نفس سعر بغداد' : `${d > 0 ? 'أعلى' : 'أدنى'} من بغداد بـ ${formatIQD(Math.abs(d))}`}
            </div>
          ) : null}
        </section>
        <div className="card mt-4 divide-y divide-line overflow-hidden">
          {[
            ['الدولار الواحد', `${formatIQD(per1)}`],
            ['500 دولار', formatIQD(per1 * 500)],
            ['1,000 دولار', formatIQD(per1 * 1000)],
            ['10,000 دولار', formatIQD(per1 * 10000)],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between px-4 py-3.5">
              <span className="text-[15px] font-bold text-ink">{k}</span>
              <span className="num text-[15px] font-extrabold text-ink">{v}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 px-1 text-[11px] text-muted">الأسعار إرشادية وقد تختلف بين مكاتب الصرف.</p>
      </div>
    </>
  );
};
