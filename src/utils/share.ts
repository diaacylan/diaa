export const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.dolariraq.app';
export const SITE_URL = 'https://dolariraq.com';

export type ShareResult = 'shared' | 'copied' | 'failed';

/** مشاركة نص ورابط: نافذة المشاركة في الجهاز، وإن لم تتوفر ننسخ النص. */
export async function shareText(title: string, text: string, url: string): Promise<ShareResult> {
  try {
    if (navigator.share) {
      await navigator.share({ title, text, url });
      return 'shared';
    }
    await navigator.clipboard.writeText(`${text}\n${url}`);
    return 'copied';
  } catch {
    // إلغاء المستخدم لنافذة المشاركة ليس خطأً
    return 'failed';
  }
}

/** نص مشاركة سعر محافظة (بدون ذكر مصدر السعر). */
export function priceShareText(cityName: string, ratePretty: string): string {
  return `سعر 100 دولار في ${cityName}: ${ratePretty}\nتطبيق دولار العراق: ${PLAY_URL}`;
}

export function cityPageUrl(cityKey: string): string {
  return `${SITE_URL}/${cityKey}-dollar-rate.html`;
}
