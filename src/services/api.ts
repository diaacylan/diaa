import {
  CurrentRatesResponse,
  HistoryResponse,
  ArticlesResponse,
  MetalRate,
  CurrencyRate,
  CryptoRate,
} from '../types';

const STORAGE_KEYS = {
  CURRENT_RATES: 'dolariraq_cached_current_rates',
  RATES_HISTORY: 'dolariraq_cached_history',
  ARTICLES: 'dolariraq_cached_articles',
  METALS_GOLD: 'dolariraq_cached_metals_gold',
  METALS_SILVER: 'dolariraq_cached_metals_silver',
  CURRENCIES: 'dolariraq_cached_currencies',
  CRYPTO: 'dolariraq_cached_crypto',
  LAST_SUCCESS_TIME: 'dolariraq_last_success_time',
  CUSTOM_GATEWAY: 'dolariraq_custom_api_gateway',
};

class DolarIraqApiService {
  // Candidate base URLs tested in sequence
  private primaryDirectUrl = 'https://dolariraq.com/api/v2';
  private workingGateway: string | null = null;

  /**
   * Determine available gateways based on runtime environment (Web vs Standalone APK)
   */
  private getCandidateGateways(): string[] {
    const gateways: string[] = [];

    // 1. Custom user-configured gateway if any
    try {
      const custom = localStorage.getItem(STORAGE_KEYS.CUSTOM_GATEWAY);
      if (custom && custom.startsWith('http')) {
        gateways.push(custom.replace(/\/$/, ''));
      }
    } catch {}

    // 2. Vite environment variable if configured
    try {
      const envUrl = (import.meta as any).env?.VITE_API_URL;
      if (envUrl && typeof envUrl === 'string') {
        gateways.push(envUrl.replace(/\/$/, ''));
      }
    } catch {}

    // 3. Local proxy if running on standard HTTP/HTTPS origin (not file:// or capacitor://)
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      if ((protocol === 'http:' || protocol === 'https:') && !hostname.includes('file')) {
        gateways.push('/api/proxy');
      }
    }

    // 4. Direct API endpoint (works with Native HTTP plugins / non-CORS webviews / direct proxies)
    gateways.push(this.primaryDirectUrl);

    // Filter duplicates and return
    return Array.from(new Set(gateways));
  }

  /**
   * Resilient HTTP Fetch with native Capacitor / Cordova HTTP detection and multi-gateway fallbacks
   */
  private async fetchWithFallback(endpoint: string, options?: RequestInit): Promise<any> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    // 1. Native Capacitor HTTP Bridge (Bypasses all CORS in native Android APK)
    if (typeof window !== 'undefined') {
      const win = window as any;
      if (win.Capacitor?.Plugins?.CapacitorHttp?.get) {
        try {
          const nativeRes = await win.Capacitor.Plugins.CapacitorHttp.get({
            url: `${this.primaryDirectUrl}${cleanEndpoint}`,
            headers: {
              Accept: 'application/json',
              'User-Agent': 'DolarIraqMobile/2.0 (Android; Native)',
            },
          });
          if (nativeRes && nativeRes.status >= 200 && nativeRes.status < 300) {
            return typeof nativeRes.data === 'string' ? JSON.parse(nativeRes.data) : nativeRes.data;
          }
        } catch (e) {
          console.warn('Native CapacitorHttp bridge attempt failed, trying fetch fallbacks:', e);
        }
      }

      // 2. Cordova HTTP Plugin Bridge (if using Cordova / PhoneGap wrapper)
      if (win.cordova?.plugin?.http?.sendRequest) {
        try {
          const cordovaData = await new Promise((resolve, reject) => {
            win.cordova.plugin.http.sendRequest(
              `${this.primaryDirectUrl}${cleanEndpoint}`,
              { method: 'get' },
              (res: any) => resolve(JSON.parse(res.data)),
              (err: any) => reject(err)
            );
          });
          if (cordovaData) return cordovaData;
        } catch {}
      }
    }

    // 3. Standard Fetch with Multi-Gateway Pipeline
    const candidateGateways = this.getCandidateGateways();

    // Put previously known working gateway first
    if (this.workingGateway && candidateGateways.includes(this.workingGateway)) {
      const idx = candidateGateways.indexOf(this.workingGateway);
      candidateGateways.splice(idx, 1);
      candidateGateways.unshift(this.workingGateway);
    }

    let lastError: any = null;

    for (const base of candidateGateways) {
      try {
        const fullUrl = `${base}${cleanEndpoint}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6500);

        const res = await fetch(fullUrl, {
          ...options,
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
            ...(options?.headers || {}),
          },
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const json = await res.json();
          this.workingGateway = base; // Record working gateway
          return json;
        }
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error('All gateways failed to respond');
  }

  /**
   * Helper to load cached data from localStorage
   */
  private getLocalCache<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  }

  /**
   * Helper to save cache to localStorage
   */
  private setLocalCache(key: string, data: any) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      localStorage.setItem(STORAGE_KEYS.LAST_SUCCESS_TIME, new Date().toISOString());
    } catch (e) {
      console.warn('Failed to cache to localStorage', e);
    }
  }

  /**
   * Get Current Rates (GET rates/current)
   */
  async getCurrentRates(): Promise<{
    data: CurrentRatesResponse;
    isOffline: boolean;
    error?: string;
  }> {
    try {
      const data: CurrentRatesResponse = await this.fetchWithFallback('/rates/current');

      // Clean warning if successfully retrieved from live stream
      const cleanData: CurrentRatesResponse = {
        ...data,
        _cached: false,
        _warning: undefined,
      };

      this.setLocalCache(STORAGE_KEYS.CURRENT_RATES, cleanData);
      return { data: cleanData, isOffline: false };
    } catch (err: any) {
      console.warn('Live rates network fetch failed, using local offline cache:', err);
      const cached = this.getLocalCache<CurrentRatesResponse>(STORAGE_KEYS.CURRENT_RATES);

      const isActuallyOffline = typeof navigator !== 'undefined' && !navigator.onLine;

      if (cached) {
        return {
          data: {
            ...cached,
            _cached: true,
            _warning: isActuallyOffline ? 'بيانات محفوظة محلياً — تحقق من اتصال الإنترنت' : undefined,
          },
          isOffline: isActuallyOffline,
          error: isActuallyOffline ? 'لا يوجد اتصال بالإنترنت' : undefined,
        };
      }

      // Default baseline values if no local cache exists
      return {
        data: {
          rate_100_usd: 154200,
          sell: 154400,
          buy: 153900,
          gold21: 955000,
          market_time: new Date().toISOString(),
          cities: [
            { city_key: 'baghdad', city_name: 'بغداد', rate_type: 'offer', rate: 154200 },
            { city_key: 'erbil', city_name: 'أربيل', rate_type: 'offer', rate: 154100 },
            { city_key: 'sulaymaniyah', city_name: 'السليمانية', rate_type: 'offer', rate: 154250 },
            { city_key: 'karbala', city_name: 'كربلاء', rate_type: 'offer', rate: 154300 },
            { city_key: 'najaf', city_name: 'النجف', rate_type: 'offer', rate: 154300 },
            { city_key: 'basra', city_name: 'البصرة', rate_type: 'offer', rate: 154250 },
            { city_key: 'kirkuk', city_name: 'كركوك', rate_type: 'offer', rate: 154350 },
            { city_key: 'mosul', city_name: 'الموصل', rate_type: 'offer', rate: 154350 },
            { city_key: 'duhok', city_name: 'دهوك', rate_type: 'offer', rate: 154200 },
          ],
          source_label: 'dolariraq.com',
          _cached: true,
          _warning: isActuallyOffline ? 'بيانات استرشادية بدون اتصال' : undefined,
        },
        isOffline: isActuallyOffline,
        error: isActuallyOffline ? 'لا يوجد اتصال بالإنترنت' : undefined,
      };
    }
  }

  /**
   * Get 30 Days History (GET rates/history?limit=30)
   */
  async getRatesHistory(limit = 30): Promise<{
    data: HistoryResponse;
    isOffline: boolean;
  }> {
    try {
      const data: HistoryResponse = await this.fetchWithFallback(`/rates/history?limit=${limit}`);
      this.setLocalCache(STORAGE_KEYS.RATES_HISTORY, data);
      return { data, isOffline: false };
    } catch {
      const cached = this.getLocalCache<HistoryResponse>(STORAGE_KEYS.RATES_HISTORY);
      return {
        data: cached || { points: [] },
        isOffline: typeof navigator !== 'undefined' && !navigator.onLine,
      };
    }
  }

  /**
   * Get Articles (GET articles?limit=20)
   */
  async getArticles(limit = 20): Promise<{
    data: ArticlesResponse;
    isOffline: boolean;
  }> {
    try {
      const data: ArticlesResponse = await this.fetchWithFallback(`/articles?limit=${limit}`);
      this.setLocalCache(STORAGE_KEYS.ARTICLES, data);
      return { data, isOffline: false };
    } catch {
      const cached = this.getLocalCache<ArticlesResponse>(STORAGE_KEYS.ARTICLES);
      return {
        data: cached || { articles: [] },
        isOffline: typeof navigator !== 'undefined' && !navigator.onLine,
      };
    }
  }

  /**
   * Get Gold and Silver Metals
   */
  async getMetals(): Promise<{
    gold: MetalRate[];
    silver: MetalRate[];
    isOffline: boolean;
  }> {
    try {
      const [gold, silver] = await Promise.all([
        this.fetchWithFallback('/metals/gold'),
        this.fetchWithFallback('/metals/silver'),
      ]);

      const validGold: MetalRate[] = Array.isArray(gold) ? gold : [];
      const validSilver: MetalRate[] = Array.isArray(silver) ? silver : [];

      this.setLocalCache(STORAGE_KEYS.METALS_GOLD, validGold);
      this.setLocalCache(STORAGE_KEYS.METALS_SILVER, validSilver);

      return { gold: validGold, silver: validSilver, isOffline: false };
    } catch {
      return {
        gold: this.getLocalCache<MetalRate[]>(STORAGE_KEYS.METALS_GOLD) || [],
        silver: this.getLocalCache<MetalRate[]>(STORAGE_KEYS.METALS_SILVER) || [],
        isOffline: typeof navigator !== 'undefined' && !navigator.onLine,
      };
    }
  }

  /**
   * Get Currencies
   */
  async getCurrencies(): Promise<{
    data: CurrencyRate[];
    isOffline: boolean;
  }> {
    try {
      const data: CurrencyRate[] = await this.fetchWithFallback('/currencies');
      const validData: CurrencyRate[] = Array.isArray(data) ? data : [];
      this.setLocalCache(STORAGE_KEYS.CURRENCIES, validData);
      return { data: validData, isOffline: false };
    } catch {
      return {
        data: this.getLocalCache<CurrencyRate[]>(STORAGE_KEYS.CURRENCIES) || [],
        isOffline: typeof navigator !== 'undefined' && !navigator.onLine,
      };
    }
  }

  /**
   * Get Crypto Rates (BTC, ETH, USDT, SOL, BNB, TON, XRP, etc.)
   */
  async getCrypto(): Promise<{
    data: CryptoRate[];
    isOffline: boolean;
  }> {
    try {
      // 1. First attempt proxy endpoint
      let resData: any = null;
      try {
        const proxyRes = await fetch('/api/proxy/crypto', { signal: AbortSignal.timeout(5000) });
        if (proxyRes.ok) {
          resData = await proxyRes.json();
        }
      } catch {}

      // 2. If proxy not responding directly, try fallback endpoint
      if (!resData || !Array.isArray(resData)) {
        resData = await this.fetchWithFallback('/crypto');
      }

      const validData: CryptoRate[] = Array.isArray(resData) ? resData : [];
      if (validData.length > 0) {
        this.setLocalCache(STORAGE_KEYS.CRYPTO, validData);
        return { data: validData, isOffline: false };
      }
      throw new Error('No crypto data returned');
    } catch {
      const cached = this.getLocalCache<CryptoRate[]>(STORAGE_KEYS.CRYPTO);
      return {
        data: cached || [
          { id: 'tether', symbol: 'USDT', name: 'Tether USD', nameAr: 'تيثر دولار (USDT)', priceUsd: 1.00, change24h: 0.05, high24h: 1.002, low24h: 0.998 },
          { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', nameAr: 'بيتكوين', priceUsd: 87450, change24h: 2.14, high24h: 88200, low24h: 85600 },
          { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', nameAr: 'إيثيريوم', priceUsd: 2280, change24h: 1.65, high24h: 2320, low24h: 2210 },
          { id: 'solana', symbol: 'SOL', name: 'Solana', nameAr: 'سولانا', priceUsd: 148.5, change24h: 4.25, high24h: 152.0, low24h: 142.3 },
          { id: 'binancecoin', symbol: 'BNB', name: 'BNB', nameAr: 'بينانس كوين', priceUsd: 625.8, change24h: 0.85, high24h: 635.0, low24h: 618.0 },
          { id: 'toncoin', symbol: 'TON', name: 'Toncoin', nameAr: 'تون كوين (تيليجرام)', priceUsd: 3.85, change24h: -1.2, high24h: 3.98, low24h: 3.75 },
          { id: 'ripple', symbol: 'XRP', name: 'XRP', nameAr: 'ريبل', priceUsd: 2.15, change24h: 3.12, high24h: 2.24, low24h: 2.05 },
          { id: 'cardano', symbol: 'ADA', name: 'Cardano', nameAr: 'كاردانو', priceUsd: 0.74, change24h: -0.45, high24h: 0.77, low24h: 0.72 },
          { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', nameAr: 'دوجكوين', priceUsd: 0.22, change24h: 5.4, high24h: 0.24, low24h: 0.21 },
        ],
        isOffline: typeof navigator !== 'undefined' && !navigator.onLine,
      };
    }
  }

  /**
   * Register Mobile Device FCM Push Token
   * POST /api/v2/mobile/push/register
   */
  async registerPushToken(token: string, topics: string[] = ['price_alerts', 'daily_briefing', 'articles']): Promise<boolean> {
    try {
      await this.fetchWithFallback('/mobile/push/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          platform: 'android',
          topics,
        }),
      });
      return true;
    } catch {
      return false;
    }
  }
}

export const DolarIraqApi = new DolarIraqApiService();
