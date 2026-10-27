import React, { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { LineChart } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AppBar, Empty } from '../components/ui';
import { formatIQD } from '../utils/formatters';

export const HistoryScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { history } = useApp();
  const [metric, setMetric] = useState<'usd' | 'gold'>('usd');
  const [days, setDays] = useState<7 | 30>(30);

  const data = useMemo(() => {
    const pts = (history?.points ?? [])
      .slice()
      .sort((a, b) => +new Date(a.market_time) - +new Date(b.market_time));
    const cutoff = Date.now() - days * 86400000;
    return pts
      .filter((p) => +new Date(p.market_time) >= cutoff)
      .map((p) => {
        const d = new Date(p.market_time);
        return {
          label: `${d.getDate()}/${d.getMonth() + 1}`,
          v: metric === 'usd' ? p.rate_100_usd : p.gold21 ?? 0,
        };
      })
      .filter((p) => p.v > 0);
  }, [history, metric, days]);

  const vals = data.map((d) => d.v);
  const max = vals.length ? Math.max(...vals) : 0;
  const min = vals.length ? Math.min(...vals) : 0;
  const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  const first = vals[0];
  const last = vals[vals.length - 1];
  const delta = first && last ? last - first : 0;

  const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
      onClick={onClick}
      className={`rounded-full border px-4 py-1.5 text-[13px] font-bold ${
        active ? 'border-brand bg-brand text-white' : 'border-line bg-surface text-muted'
      }`}
    >
      {children}
    </button>
  );

  return (
    <>
      <AppBar title="سجل الأسعار" onBack={onBack} />
      <div className="scroll-area flex-1 px-4 pb-6">
        <div className="flex items-center gap-2">
          <Chip active={metric === 'usd'} onClick={() => setMetric('usd')}>الدولار (100$)</Chip>
          <Chip active={metric === 'gold'} onClick={() => setMetric('gold')}>مثقال ذهب 21</Chip>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Chip active={days === 7} onClick={() => setDays(7)}>7 أيام</Chip>
          <Chip active={days === 30} onClick={() => setDays(30)}>30 يوماً</Chip>
        </div>

        {data.length < 2 ? (
          <Empty icon={<LineChart />} title="لا توجد بيانات كافية لهذه الفترة" />
        ) : (
          <>
            <div className="card mt-4 h-64 p-2 pe-3" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="hh" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--line)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} />
                  <YAxis
                    domain={['dataMin', 'dataMax']}
                    width={52}
                    tick={{ fill: 'var(--muted)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => (v / 1000).toFixed(1) + 'k'}
                  />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, direction: 'rtl' }}
                    labelStyle={{ color: 'var(--muted)' }}
                    formatter={(v: number) => [formatIQD(v), metric === 'usd' ? '100$' : 'المثقال']}
                  />
                  <Area type="monotone" dataKey="v" stroke="var(--brand)" strokeWidth={2.5} fill="url(#hh)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2.5">
              {[
                ['الأعلى', max],
                ['الأدنى', min],
                ['المتوسط', avg],
              ].map(([k, v]) => (
                <div key={k as string} className="card p-3 text-center">
                  <div className="text-xs font-semibold text-muted">{k}</div>
                  <div className="num mt-0.5 text-[15px] font-extrabold text-ink">{formatIQD(v as number, false)}</div>
                </div>
              ))}
            </div>
            <div className="card mt-2.5 flex items-center justify-between p-4">
              <span className="text-sm font-bold text-ink">التغيّر خلال الفترة</span>
              <span className={`num text-base font-extrabold ${delta > 0 ? 'text-up' : delta < 0 ? 'text-down' : 'text-muted'}`}>
                <span dir="ltr" className="num">
                  {delta > 0 ? '+' : delta < 0 ? '−' : ''}
                  {formatIQD(Math.abs(delta), false)} د.ع
                </span>
              </span>
            </div>
          </>
        )}
      </div>
    </>
  );
};
