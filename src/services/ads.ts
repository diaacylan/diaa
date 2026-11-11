import ADS from '../../admob.json';

const CONFIG_URL = 'https://raw.githubusercontent.com/diaacylan/diaa/master/app-config.json';
const OPEN_ID = ADS.test ? ADS.testAppOpenId : ADS.appOpenId;
const BANNER_ID = ADS.test ? ADS.testBannerId : ADS.bannerId;
const STATE_KEY = 'dolariraq_ads_state';

interface AdsCfg {
  enabled: boolean;
  delaySec: number;
  cooldownMin: number;
  maxPerDay: number;
  skipFirstLaunch: boolean;
  banner: boolean;
}

const DEFAULTS: AdsCfg = { enabled: true, delaySec: 1, cooldownMin: 30, maxPerDay: 6, skipFirstLaunch: true, banner: true };

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
        delaySec: Math.min(Math.max(Number(a.delaySec ?? 1), 1), 15),
        cooldownMin: Math.max(Number(a.cooldownMin ?? 30), 0),
        maxPerDay: Math.max(Number(a.maxPerDay ?? 6), 1),
        skipFirstLaunch: a.skipFirstLaunch !== false,
        banner: a.banner !== false,
      };
    }
  } catch {}
  return DEFAULTS;
}


/* ---------- البنر (إعلان ثابت أسفل الصفحة الرئيسية، فوق شريط التنقل) ---------- */
type BannerState = 'none' | 'visible' | 'hidden';
let adsReady = false;
let bannerEnabled = true;
let bannerState: BannerState = 'none';
let bannerHeight = 0;
let bannerWanted = false;
let bannerMargin = 0;
let bannerBusy = false;
let appOpenActive = false; // إعلان الفتح قيد العرض: البنر مخفي
const bannerListeners = new Set<(h: number) => void>();
const setBannerHeight = (h: number) => {
  bannerHeight = h;
  bannerListeners.forEach((l) => l(h));
};

/** يعطي ارتفاع البنر الحالي (0 = غير ظاهر) لتحجز الواجهة مساحته. */
export function subscribeBanner(l: (h: number) => void): () => void {
  bannerListeners.add(l);
  l(bannerHeight);
  return () => void bannerListeners.delete(l);
}

async function syncBanner(): Promise<void> {
  if (bannerBusy) return;
  bannerBusy = true;
  try {
    if (!adsReady || !bannerEnabled || !BANNER_ID) {
      if (bannerHeight !== 0) setBannerHeight(0);
      return;
    }
    const { AdMob, BannerAdSize, BannerAdPosition } = await import('@capacitor-community/admob');
    // سياسة AdMob: لا يظهر إعلان الفتح فوق بنر، لذلك نخفي البنر أثناء عرضه
    const wanted = bannerWanted && !appOpenActive;
    if (wanted && bannerState === 'none') {
      await AdMob.showBanner({
        adId: BANNER_ID,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
        margin: bannerMargin,
        isTesting: ADS.test,
      });
      bannerState = 'visible';
    } else if (wanted && bannerState === 'hidden') {
      await AdMob.resumeBanner();
      bannerState = 'visible';
    } else if (!wanted && bannerState === 'visible') {
      await AdMob.hideBanner();
      bannerState = 'hidden';
      setBannerHeight(0);
    }
  } catch {
    setBannerHeight(0);
  } finally {
    bannerBusy = false;
  }
}

/** تُستدعى من الواجهة: هل يجب أن يظهر البنر الآن، وكم الهامش السفلي (dp) ليجلس فوق شريط التنقل. */
export function setBannerVisible(visible: boolean, marginDp: number): void {
  bannerWanted = visible;
  bannerMargin = Math.max(0, Math.round(marginDp));
  void syncBanner();
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

    bannerEnabled = cfg.banner;
    const { BannerAdPluginEvents } = await import('@capacitor-community/admob');
    await AdMob.addListener(BannerAdPluginEvents.SizeChanged, (info) => {
      if (bannerState === 'visible') setBannerHeight(Math.round(info.height || 0));
    });
    await AdMob.addListener(BannerAdPluginEvents.FailedToLoad, () => setBannerHeight(0));
    adsReady = true;
    void syncBanner();

    await AdMob.addListener(AppOpenAdPluginEvents.Closed, () => {
      adShowing = false;
      appOpenActive = false;
      lastClosedAt = Date.now();
      // لا بنر مباشرة بعد إعلان الفتح (السياسة تمنع عرض إعلان قبل/بعده مباشرة)
      setTimeout(() => void syncBanner(), 3000);
    });
    await AdMob.addListener(AppOpenAdPluginEvents.FailedToShow, () => {
      adShowing = false;
      appOpenActive = false;
      lastClosedAt = Date.now();
      void syncBanner();
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
        appOpenActive = true;
        await syncBanner();
        await AdMob.showAppOpen();
      } catch {
        appOpenActive = false;
        void syncBanner();
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
