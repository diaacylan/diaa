import ADS from '../../admob.json';

const CONFIG_URL = 'https://raw.githubusercontent.com/diaacylan/diaa/master/app-config.json';
const OPEN_ID = ADS.test ? ADS.testAppOpenId : ADS.appOpenId;
const STATE_KEY = 'dolariraq_ads_state';

interface AdsCfg {
  enabled: boolean;
  delaySec: number;
  cooldownMin: number;
  maxPerDay: number;
  skipFirstLaunch: boolean;
}

const DEFAULTS: AdsCfg = { enabled: true, delaySec: 3, cooldownMin: 30, maxPerDay: 6, skipFirstLaunch: true };

interface State { launched: boolean; last: number; day: string; count: number }

const readState = (): State => {
  try {
    const s = JSON.parse(localStorage.getItem(STATE_KEY) || '{}');
    return { launched: !!s.launched, last: Number(s.last) || 0, day: String(s.day || ''), count: Number(s.count) || 0 };
  } catch {
    return { launched: false, last: 0, day: '', count: 0 };
  }
};
const writeState = (s: State) => {
  try { localStorage.setItem(STATE_KEY, JSON.stringify(s)); } catch {}
};
const today = () => new Date().toISOString().slice(0, 10);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function loadCfg(): Promise<AdsCfg> {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 4000);
    const r = await fetch(`${CONFIG_URL}?t=${Date.now()}`, { cache: 'no-store', signal: ctl.signal });
    clearTimeout(t);
    if (r.ok) {
      const a = (await r.json()).ads || {};
      return {
        enabled: a.enabled !== false,
        delaySec: Math.min(Math.max(Number(a.delaySec ?? 3), 1), 15),
        cooldownMin: Math.max(Number(a.cooldownMin ?? 30), 0),
        maxPerDay: Math.max(Number(a.maxPerDay ?? 6), 1),
        skipFirstLaunch: a.skipFirstLaunch !== false,
      };
    }
  } catch {}
  return DEFAULTS;
}

let started = false;
let busy = false;
let adShowing = false;
let lastClosedAt = 0;
const TEST_COOLDOWN_MS = 30_000; // في الاختبار: فاصل قصير فقط لتفادي التكرار

/** إعلان فتح التطبيق (App Open): يظهر بعد بضع ثوانٍ من الفتح، مع فاصل زمني وحد يومي. لا يعمل على الويب. */
export async function initAds(): Promise<void> {
  if (started) return;
  started = true;
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return;
    const cfg = await loadCfg();
    if (!cfg.enabled && !ADS.test) return;

    const { AdMob, AdmobConsentStatus, AppOpenAdPluginEvents } = await import('@capacitor-community/admob');
    const { App } = await import('@capacitor/app');

    await AdMob.initialize({ initializeForTesting: ADS.test });

    // نافذة الموافقة (UMP) لمستخدمي أوروبا وغيرها حيث تُشترط
    try {
      let info = await AdMob.requestConsentInfo();
      if (info.status === AdmobConsentStatus.REQUIRED && info.isConsentFormAvailable) {
        info = await AdMob.showConsentForm();
      }
      if (!info.canRequestAds && !ADS.test) return;
    } catch {}

    await AdMob.addListener(AppOpenAdPluginEvents.Closed, () => {
      adShowing = false;
      lastClosedAt = Date.now();
    });
    await AdMob.addListener(AppOpenAdPluginEvents.FailedToShow, () => {
      adShowing = false;
      lastClosedAt = Date.now();
    });
    await AdMob.addListener(AppOpenAdPluginEvents.Opened, () => {
      adShowing = true;
      const s = readState();
      const d = today();
      writeState({ ...s, last: Date.now(), day: d, count: s.day === d ? s.count + 1 : 1 });
    });

    const attempt = async () => {
      // لا نعرض إعلاناً أثناء عرض آخر، ولا بعد إغلاقه مباشرة (عودة التطبيق من الإعلان ليست «فتحاً» جديداً)
      if (busy || adShowing || Date.now() - lastClosedAt < 10_000) return;
      busy = true;
      try {
        const s = readState();
        const d = today();
        if (!s.launched) {
          writeState({ ...s, launched: true });
          if (cfg.skipFirstLaunch && !ADS.test) return; // لا إعلان في أول فتح للتطبيق
        }
        if (ADS.test) {
          if (Date.now() - s.last < TEST_COOLDOWN_MS) return;
        } else {
          if (Date.now() - s.last < cfg.cooldownMin * 60_000) return;
          if (s.day === d && s.count >= cfg.maxPerDay) return;
        }
        // نحمّل الإعلان أثناء الانتظار حتى يظهر في الموعد
        const loading = AdMob.loadAppOpen({ adId: OPEN_ID });
        await sleep(cfg.delaySec * 1000);
        await loading;
        if (document.visibilityState !== 'visible') return;
        await AdMob.showAppOpen();
      } catch {
        /* فشل التحميل أو العرض: لا شيء يظهر للمستخدم */
      } finally {
        busy = false;
      }
    };

    void attempt();
    await App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) void attempt();
    });
  } catch {}
}
