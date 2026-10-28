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

/** آخر خطأ تقني (يُعرض في شاشة الإشعارات للتشخيص) */
export let lastPushError = '';
const fail = (step: string, e: unknown) => {
  const msg = e instanceof Error ? e.message : typeof e === 'string' ? e : JSON.stringify(e);
  lastPushError = `${step}: ${msg}`;
  console.warn('push', lastPushError);
};

/** لا نسمح لأي استدعاء أصلي بالتعليق إلى الأبد */
function withTimeout<T>(p: Promise<T>, ms: number, step: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${step} انتهت المهلة`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

async function native() {
  const { Capacitor } = await withTimeout(import('@capacitor/core'), 8000, 'تحميل core');
  if (!Capacitor.isNativePlatform()) return null;
  const { FirebaseMessaging } = await withTimeout(import('@capacitor-firebase/messaging'), 8000, 'تحميل الإضافة');
  // مهم: لا نُرجع الإضافة نفسها من دالة async (كائن Capacitor يتصرف كأنه Promise فيعلق الانتظار)
  return { fm: FirebaseMessaging };
}

export async function getPushState(): Promise<PushState> {
  try {
    const n = await native();
    if (!n) return 'unsupported';
    const r = await withTimeout(n.fm.checkPermissions(), 8000, 'فحص الإذن');
    return r.receive === 'granted' ? 'granted' : r.receive === 'denied' ? 'denied' : 'prompt';
  } catch (e) {
    fail('getPushState', e);
    return 'unsupported';
  }
}

/** يطلب إذن الإشعارات، ثم يشترك في المواضيع المطلوبة */
export async function enablePush(topics: string[] = PUSH_TOPICS.map((t) => t.id)): Promise<PushState> {
  try {
    const n = await native();
    if (!n) return 'unsupported';
    const fm = n.fm;
    lastPushError = '';
    let r = await withTimeout(fm.checkPermissions(), 8000, 'فحص الإذن');
    if (r.receive !== 'granted') r = await withTimeout(fm.requestPermissions(), 15000, 'طلب الإذن');
    markAsked();
    if (r.receive !== 'granted') return r.receive === 'denied' ? 'denied' : 'prompt';
    const saved = loadSaved();
    for (const t of PUSH_TOPICS) {
      const on = topics.includes(t.id);
      if (on) {
        try {
          await withTimeout(fm.subscribeToTopic({ topic: t.id }), 15000, `اشتراك ${t.id}`);
          saved.topics[t.id] = true;
        } catch (e) {
          fail(`subscribe ${t.id}`, e);
          saved.topics[t.id] = false;
        }
      } else saved.topics[t.id] = false;
    }
    save(saved);
    // تسجيل اختياري لدى الخادم إن كان يدعمه (لا يؤثر على عمل الإشعارات عبر المواضيع)
    try {
      const { token } = await withTimeout(fm.getToken(), 15000, 'getToken');
      if (token) DolarIraqApi.registerPushToken(token, topics);
    } catch (e) {
      fail('getToken', e);
    }
    return 'granted';
  } catch (e) {
    fail('enablePush', e);
    return 'unsupported';
  }
}

/** معلومات تشخيصية قصيرة تُعرض في شاشة الإشعارات */
export function diagInfo(): string {
  const m = /Android [\d.]+/.exec(navigator.userAgent);
  return `${m ? m[0] : 'web'} · build ${typeof __BUILD__ === 'string' ? __BUILD__ : '?'}`;
}

export async function setTopic(id: string, on: boolean): Promise<void> {
  const n = await native();
  if (!n) return;
  const fm = n.fm;
  if (on) await fm.subscribeToTopic({ topic: id });
  else await fm.unsubscribeFromTopic({ topic: id });
  const saved = loadSaved();
  saved.topics[id] = on;
  save(saved);
}
