import { CurrentRatesResponse, HistoryResponse } from '../types';

export interface Change {
  diff: number;
  pct: number;
  dir: 'up' | 'down' | 'same';
}

export function makeChange(cur?: number, prev?: number): Change | null {
  if (!cur || !prev || cur <= 0 || prev <= 0) return null;
  const diff = cur - prev;
  return { diff, pct: (diff / prev) * 100, dir: diff > 0 ? 'up' : diff < 0 ? 'down' : 'same' };
}

/** القراءة السابقة من السجل (آخر نقطة تختلف عن القراءة الحالية زمنياً) */
export function previousPoint(history: HistoryResponse | null, cur: CurrentRatesResponse | null) {
  const pts = history?.points ?? [];
  if (!pts.length) return null;
  const sorted = [...pts].sort((a, b) => +new Date(a.market_time) - +new Date(b.market_time));
  const curT = cur ? +new Date(cur.market_time) : Infinity;
  const earlier = sorted.filter((p) => +new Date(p.market_time) < curT);
  return earlier.length ? earlier[earlier.length - 1] : sorted.length > 1 ? sorted[sorted.length - 2] : null;
}

/** أسعار الذهب بالدينار: المثقال = 5 غرام، وأسعار المحلات هي لعيار 21 */
export function karatPrices(gold21Mithqal?: number | null) {
  if (!gold21Mithqal || gold21Mithqal <= 0) return null;
  const g21 = gold21Mithqal / 5;
  return {
    mithqal21: gold21Mithqal,
    g24: (g21 * 24) / 21,
    g21,
    g18: (g21 * 18) / 21,
  };
}

export const OUNCE_GRAMS = 31.1034768;
