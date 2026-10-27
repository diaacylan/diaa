/**
 * Formatters and helper utilities for Dolar Iraq
 */

export function toEnglishDigits(str: string | number): string {
  if (str === undefined || str === null) return '';
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  
  let result = String(str);
  for (let i = 0; i < 10; i++) {
    result = result.replaceAll(arabicDigits[i], String(i));
    result = result.replaceAll(persianDigits[i], String(i));
  }
  return result;
}

export function formatIQD(val?: number | null, appendCurrency = true): string {
  if (val === undefined || val === null || isNaN(val)) return 'غير متوفر';
  const formatted = new Intl.NumberFormat('en-US').format(Math.round(val));
  return appendCurrency ? `${formatted} د.ع` : formatted;
}

export function formatUSD(val?: number | null, appendCurrency = true): string {
  if (val === undefined || val === null || isNaN(val)) return 'غير متوفر';
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(val);
  return appendCurrency ? `$${formatted}` : formatted;
}

export function formatNumber(val?: number | null): string {
  if (val === undefined || val === null || isNaN(val)) return '-';
  return new Intl.NumberFormat('en-US').format(val);
}

/**
 * Format Baghdad Time (UTC+3)
 */
export function formatBaghdadTime(dateString?: string): string {
  if (!dateString) return 'غير متوفر';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    return new Intl.DateTimeFormat('ar-IQ', {
      timeZone: 'Asia/Baghdad',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Format relative time (e.g. منذ 5 دقائق)
 */
export function formatRelativeTime(dateString?: string): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'الآن';
    if (diffSec < 3600) return `منذ ${Math.floor(diffSec / 60)} دقيقة`;
    if (diffSec < 86400) return `منذ ${Math.floor(diffSec / 3600)} ساعة`;
    return `منذ ${Math.floor(diffSec / 86400)} يوم`;
  } catch {
    return '';
  }
}

/**
 * Gold change calculator between current reading and previous history reading
 */
export interface GoldChangeResult {
  hasComparison: boolean;
  direction: 'up' | 'down' | 'same' | 'none';
  difference: number;
  percentage: number;
  message: string;
}

export function calculateGoldChange(
  currentGold?: number,
  previousGold?: number
): GoldChangeResult {
  if (!currentGold || !previousGold || currentGold <= 0 || previousGold <= 0) {
    return {
      hasComparison: false,
      direction: 'none',
      difference: 0,
      percentage: 0,
      message: 'لا تتوفر مقارنة موثقة بالقراءة السابقة',
    };
  }

  const diff = currentGold - previousGold;
  const pct = (diff / previousGold) * 100;

  if (diff === 0) {
    return {
      hasComparison: true,
      direction: 'same',
      difference: 0,
      percentage: 0,
      message: 'لم يتغير عن القراءة السابقة',
    };
  }

  if (diff > 0) {
    return {
      hasComparison: true,
      direction: 'up',
      difference: diff,
      percentage: pct,
      message: `ارتفع بمقدار ${formatIQD(diff, true)} (+${pct.toFixed(2)}%)`,
    };
  }

  return {
    hasComparison: true,
    direction: 'down',
    difference: Math.abs(diff),
    percentage: Math.abs(pct),
    message: `انخفض بمقدار ${formatIQD(Math.abs(diff), true)} (-${Math.abs(pct).toFixed(2)}%)`,
  };
}

/**
 * Strip HTML tags for clean excerpts
 */
export function stripHtml(html?: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').replace(/&hellip;/g, '...').trim();
}
