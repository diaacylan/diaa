import React, { useState } from 'react';
import { Coins, Gem, Bitcoin } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AppBar, ChangeBadge, Empty, SectionTitle, Skeleton } from '../components/ui';
import { formatIQD, formatUSD } from '../utils/formatters';
import { karatPrices, makeChange, OUNCE_GRAMS, previousPoint } from '../utils/derive';

type Seg = 'gold' | 'fx' | 'crypto';

const CUR_NAMES: Record<string, string> = {
  EUR: 'يورو', GBP: 'جنيه إسترليني', TRY: 'ليرة تركية', SAR: 'ريال سعودي', AED: 'درهم إماراتي',
  KWD: 'دينار كويتي', JOD: 'دينار أردني', EGP: 'جنيه مصري', IRR: 'ريال إيراني', QAR: 'ريال قطري',
  BHD: 'دينار بحريني', OMR: 'ريال عماني', CAD: 'دولار كندي', AUD: 'دولار أسترالي', CHF: 'فرنك سويسري',
  JPY: 'ين ياباني', CNY: 'يوان صيني', INR: 'روبية هندية', RUB: 'روبل روسي', SEK: 'كرونة سويدية',
};

export const MarketsScreen: React.FC = () => {
  const { currentRates: r, history, goldMetals, silverMetals, currencies, cryptoRates, isLoading } = useApp();
  const [seg, setSeg] = useState<Seg>('gold');

  const gold = karatPrices(r?.gold21);
  const prev = previousPoint(history, r);
  const goldChange = makeChange(r?.gold21, prev?.gold21);
  const ounceGold = goldMetals[0]?.rate;
  const ounceSilver = silverMetals[0]?.rate;
  const perUsdIqd = r?.rate_100_usd ? r.rate_100_usd / 100 : 0;
  const silverGramIqd = ounceSilver && perUsdIqd ? (ounceSilver / OUNCE_GRAMS) * perUsdIqd : null;

  const segs: { id: Seg; label: string }[] = [
    { id: 'gold', label: 'الذهب والفضة' },
    { id: 'fx', label: 'العملات' },
    ...(cryptoRates.length ? [{ id: 'crypto' as Seg, label: 'العملات الرقمية' }] : []),
  ];

  return (
    <>
      <AppBar title="الأسواق" />
      <div className="px-4">
        <div className="flex gap-1 rounded-2xl bg-surface-2 p-1" role="tablist">
          {segs.map((s) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={seg === s.id}
              onClick={() => setSeg(s.id)}
              className={`flex-1 rounded-xl py-2 text-[13px] font-bold transition ${
                seg === s.id ? 'bg-surface text-brand shadow-sm' : 'text-muted'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="scroll-area flex-1 px-4 pb-6">
        {seg === 'gold' && (
          <>
            {isLoading && !gold ? (
              <Skeleton className="mt-4 h-40" />
            ) : gold ? (
              <section
                className="mt-4 rounded-3xl p-5 text-white"
                style={{ background: 'linear-gradient(135deg,#9A6B0A,#6F4A05)' }}
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-white/85">
                  <Coins size={18} /> مثقال الذهب عيار 21 (5 غرام)
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="num text-[38px] font-black leading-tight">{formatIQD(gold.mithqal21, false)}</span>
                  <span className="text-base font-bold text-white/80">د.ع</span>
                </div>
                <ChangeBadge change={goldChange} onDark />
              </section>
            ) : (
              <Empty icon={<Coins />} title="سعر الذهب غير متوفر حالياً" hint="جرّب التحديث بعد قليل" />
            )}

            {gold && (
              <>
                <SectionTitle>سعر الغرام بالدينار</SectionTitle>
                <div className="card divide-y divide-line overflow-hidden">
                  {[
                    { k: 'عيار 24', v: gold.g24 },
                    { k: 'عيار 21', v: gold.g21 },
                    { k: 'عيار 18', v: gold.g18 },
                  ].map((x) => (
                    <div key={x.k} className="flex items-center justify-between px-4 py-3.5">
                      <span className="text-[15px] font-bold text-ink">{x.k}</span>
                      <span className="num text-[15px] font-extrabold text-ink">{formatIQD(x.v)}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-2 px-1 text-[11px] leading-relaxed text-muted">
                  تُحسب أسعار العيارات الأخرى من سعر عيار 21. أجور الصياغة غير مشمولة.
                </p>
              </>
            )}

            {(ounceGold || ounceSilver) && (
              <>
                <SectionTitle>الأسعار العالمية (الأونصة)</SectionTitle>
                <div className="card divide-y divide-line overflow-hidden">
                  {ounceGold ? (
                    <div className="flex items-center justify-between px-4 py-3.5">
                      <span className="flex items-center gap-2 text-[15px] font-bold text-ink">
                        <Coins size={16} className="text-gold" /> أونصة الذهب
                      </span>
                      <span className="num text-[15px] font-extrabold text-ink">{formatUSD(ounceGold)}</span>
                    </div>
                  ) : null}
                  {ounceSilver ? (
                    <div className="flex items-center justify-between px-4 py-3.5">
                      <span className="flex items-center gap-2 text-[15px] font-bold text-ink">
                        <Gem size={16} className="text-muted" /> أونصة الفضة
                      </span>
                      <span className="num text-[15px] font-extrabold text-ink">{formatUSD(ounceSilver)}</span>
                    </div>
                  ) : null}
                  {silverGramIqd ? (
                    <div className="flex items-center justify-between px-4 py-3.5">
                      <span className="text-[15px] font-bold text-ink">غرام الفضة (تقريبي)</span>
                      <span className="num text-[15px] font-extrabold text-ink">{formatIQD(silverGramIqd)}</span>
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </>
        )}

        {seg === 'fx' && (
          <>
            {currencies.length === 0 ? (
              <Empty icon={<Coins />} title="أسعار العملات غير متوفرة حالياً" />
            ) : (
              <>
                <SectionTitle>مقابل الدولار والدينار</SectionTitle>
                <div className="card divide-y divide-line overflow-hidden">
                  {currencies.map((c) => {
                    const inIqd = perUsdIqd && c.rate ? perUsdIqd / c.rate : null;
                    return (
                      <div key={c.quote} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0">
                          <div className="text-[15px] font-bold text-ink">{CUR_NAMES[c.quote] ?? c.quote}</div>
                          <div className="num text-xs text-muted">1$ = {Number(c.rate.toFixed(4))} {c.quote}</div>
                        </div>
                        <div className="text-end">
                          <div className="num text-[15px] font-extrabold text-ink">{inIqd ? formatIQD(inIqd, false) : '—'}</div>
                          <div className="text-[11px] text-muted">د.ع للوحدة (تقريبي)</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {seg === 'crypto' && (
          <div className="card mt-4 divide-y divide-line overflow-hidden">
            {cryptoRates.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-gold">
                    <Bitcoin size={18} />
                  </span>
                  <div>
                    <div className="text-[15px] font-bold text-ink">{c.nameAr || c.name}</div>
                    <div className="num text-xs text-muted">{c.symbol}</div>
                  </div>
                </div>
                <div className="text-end">
                  <div className="num text-[15px] font-extrabold text-ink">{formatUSD(c.priceUsd)}</div>
                  <div className={`num text-xs font-bold ${c.change24h >= 0 ? 'text-up' : 'text-down'}`}>
                    {c.change24h >= 0 ? '+' : ''}
                    {c.change24h.toFixed(2)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};
