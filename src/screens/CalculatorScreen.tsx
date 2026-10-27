import React, { useState } from 'react';
import { Delete, Copy, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AppBar } from '../components/ui';
import { formatIQD } from '../utils/formatters';

type Mode = 'usd' | 'iqd' | 'gold';
type RateKind = 'sell' | 'buy' | 'market';

const MODES: { id: Mode; label: string }[] = [
  { id: 'usd', label: 'دولار → دينار' },
  { id: 'iqd', label: 'دينار → دولار' },
  { id: 'gold', label: 'مثقال ذهب' },
];
const RATES: { id: RateKind; label: string }[] = [
  { id: 'sell', label: 'بيع' },
  { id: 'buy', label: 'شراء' },
  { id: 'market', label: 'السوق' },
];
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'];
const QUICK: Record<Mode, string[]> = {
  usd: ['100', '500', '1000', '5000'],
  iqd: ['100000', '500000', '1000000'],
  gold: ['0.5', '1', '2', '5'],
};

const fmt = (n: number, max = 2) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: max }).format(n);

export const CalculatorScreen: React.FC = () => {
  const { currentRates: r } = useApp();
  const [mode, setMode] = useState<Mode>('usd');
  const [rateKind, setRateKind] = useState<RateKind>('sell');
  const [values, setValues] = useState<Record<Mode, string>>({ usd: '100', iqd: '1000000', gold: '1' });
  const [copied, setCopied] = useState(false);

  const per100 = rateKind === 'sell' ? r?.sell : rateKind === 'buy' ? r?.buy : r?.rate_100_usd;
  const perUsd = per100 ? per100 / 100 : 0;
  const gold21 = r?.gold21 ?? 0;

  const raw = values[mode];
  const n = parseFloat(raw) || 0;

  let result = 0;
  let resultText = '—';
  let inUnit = '';
  let outUnit = '';
  let note = '';
  if (mode === 'usd') {
    result = n * perUsd;
    resultText = perUsd ? fmt(result, 0) : '—';
    inUnit = 'دولار';
    outUnit = 'دينار عراقي';
    note = perUsd ? `1 دولار = ${fmt(perUsd, 2)} د.ع` : '';
  } else if (mode === 'iqd') {
    result = perUsd ? n / perUsd : 0;
    resultText = perUsd ? fmt(result, 2) : '—';
    inUnit = 'دينار عراقي';
    outUnit = 'دولار';
    note = perUsd ? `1 دولار = ${fmt(perUsd, 2)} د.ع` : '';
  } else {
    result = n * gold21;
    resultText = gold21 ? fmt(result, 0) : '—';
    inUnit = n === 1 ? 'مثقال' : 'مثقال (5 غرام)';
    outUnit = 'دينار عراقي';
    note = gold21 ? `عيار 21 · ${n ? fmt(n * 5, 2) : 0} غرام` : '';
  }

  const press = (k: string) => {
    try {
      navigator.vibrate?.(8);
    } catch {}
    setValues((v) => {
      let cur = v[mode];
      if (k === 'del') cur = cur.length <= 1 ? '0' : cur.slice(0, -1);
      else if (k === '.') {
        if (mode === 'iqd' || cur.includes('.')) return v;
        cur += '.';
      } else cur = cur === '0' ? k : cur.length >= 12 ? cur : cur + k;
      return { ...v, [mode]: cur };
    });
  };
  const setVal = (s: string) => setValues((v) => ({ ...v, [mode]: s }));

  const display = (() => {
    const [i, d] = raw.split('.');
    const head = new Intl.NumberFormat('en-US').format(Number(i || '0'));
    return d !== undefined ? `${head}.${d}` : head;
  })();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${display} ${inUnit} = ${resultText} ${outUnit}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <>
      <AppBar title="الحاسبة" />
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-3">
        {/* نوع الحساب */}
        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-surface-2 p-1" role="tablist">
          {MODES.map((m) => (
            <button
              key={m.id}
              role="tab"
              aria-selected={mode === m.id}
              onClick={() => setMode(m.id)}
              className={`rounded-xl py-2 text-[13px] font-bold transition ${
                mode === m.id ? 'bg-surface text-brand shadow-sm' : 'text-muted'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* نوع السعر */}
        {mode !== 'gold' && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs font-semibold text-muted">السعر المستخدم</span>
            {RATES.map((x) => (
              <button
                key={x.id}
                onClick={() => setRateKind(x.id)}
                className={`rounded-full border px-3.5 py-1 text-xs font-bold ${
                  rateKind === x.id ? 'border-brand bg-brand text-white' : 'border-line bg-surface text-muted'
                }`}
              >
                {x.label}
              </button>
            ))}
          </div>
        )}

        {/* الشاشة */}
        <div className="card mt-3 p-4">
          <div className="flex items-baseline justify-between gap-2">
            <span className="num min-w-0 truncate text-[34px] font-black leading-tight text-ink">{display}</span>
            <span className="shrink-0 text-sm font-bold text-muted">{inUnit}</span>
          </div>
          <div className="my-2 h-px bg-line" />
          <div className="flex items-baseline justify-between gap-2">
            <span className="num min-w-0 truncate text-[30px] font-black leading-tight text-brand">{resultText}</span>
            <span className="shrink-0 text-sm font-bold text-muted">{outUnit}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted">
            <span>{note}</span>
            <button onClick={copy} className="flex items-center gap-1 font-bold text-brand">
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'تم النسخ' : 'نسخ النتيجة'}
            </button>
          </div>
        </div>

        {/* مبالغ سريعة */}
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {QUICK[mode].map((q) => (
            <button
              key={q}
              onClick={() => setVal(q)}
              className="num shrink-0 rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-bold text-ink"
            >
              {new Intl.NumberFormat('en-US').format(Number(q))}
            </button>
          ))}
          <button
            onClick={() => setVal('0')}
            className="shrink-0 rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-bold text-down"
          >
            مسح
          </button>
        </div>

        {/* لوحة الأرقام */}
        <div className="mt-3 grid min-h-0 flex-1 grid-cols-3 gap-2" dir="ltr">
          {KEYS.map((k) => (
            <button
              key={k}
              onClick={() => press(k)}
              aria-label={k === 'del' ? 'حذف' : k}
              disabled={k === '.' && mode === 'iqd'}
              className="press num grid min-h-[52px] place-items-center rounded-2xl bg-surface text-2xl font-bold text-ink border border-line disabled:opacity-30"
            >
              {k === 'del' ? <Delete size={24} /> : k}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};
