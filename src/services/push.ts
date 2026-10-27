import { DolarIraqApi } from './api';

export type PushState = 'granted' | 'denied' | 'prompt' | 'unsupported';

export const PUSH_TOPICS = [
  { id: 'price_alerts', title: 'تنبيهات تغيّر السعر', hint: 'عند تغيّر سعر الدولار أو الذهب' },
  { id: 'daily_briefing', title: 'النشرة اليومية', hint: 'ملخص الأسعار كل صباح' },
  { id: 'articles', title: 'مقالات جديدة', hint: 'عند نشر مقال أو تحليل جديد' },
] as const;

const KEY = 'dolariraq_push_v1';
interface Saved {
  asked: boolean;
  topics: Record<string, boolean>;
}

export const loadSaved = (): Saved => {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || '');
    if (s && typeof s === 'object') return { asked: !!s.asked, topics: s.topics || {} };
  } catch {}
  return { asked: false, topics: {} };
};
const save = (s: Saved) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
};
export const markAsked = () => save({ ...loadSaved(), asked: true });

async function native() {
  const { Capacitor } = await import('@capacitor/core');
  if (!Capacitor.isNativePlatform()) return null;
  const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');
  return FirebaseMessaging;
}

export async function getPushState(): Promise<PushState> {
  try {
    const fm = await native();
    if (!fm) return 'unsupported';
    const r = await fm.checkPermissions();
    return r.receive === 'granted' ? 'granted' : r.receive === 'denied' ? 'denied' : 'prompt';
  } catch {
    return 'unsupported';
  }
}

/** يطلب إذن الإشعارات، ثم يشترك في المواضيع المطلوبة */
export async function enablePush(topics: string[] = PUSH_TOPICS.map((t) => t.id)): Promise<PushState> {
  try {
    const fm = await native();
    if (!fm) return 'unsupported';
    let r = await fm.checkPermissions();
    if (r.receive !== 'granted') r = await fm.requestPermissions();
    markAsked();
    if (r.receive !== 'granted') return r.receive === 'denied' ? 'denied' : 'prompt';
    const saved = loadSaved();
    for (const t of PUSH_TOPICS) {
      const on = topics.includes(t.id);
      if (on) await fm.subscribeToTopic({ topic: t.id });
      saved.topics[t.id] = on;
    }
    save(saved);
    // تسجيل اختياري لدى الخادم إن كان يدعمه (لا يؤثر على عمل الإشعارات عبر المواضيع)
    try {
      const { token } = await fm.getToken();
      if (token) DolarIraqApi.registerPushToken(token, topics);
    } catch {}
    return 'granted';
  } catch (e) {
    console.warn('push enable failed', e);
    return 'unsupported';
  }
}

export async function setTopic(id: string, on: boolean): Promise<void> {
  const fm = await native();
  if (!fm) return;
  if (on) await fm.subscribeToTopic({ topic: id });
  else await fm.unsubscribeFromTopic({ topic: id });
  const saved = loadSaved();
  saved.topics[id] = on;
  save(saved);
}
