import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  CurrentRatesResponse,
  HistoryResponse,
  ArticleItem,
  MetalRate,
  CurrencyRate,
  CryptoRate,
  ThemeMode,
  CityRate,
} from '../types';
import { DolarIraqApi } from '../services/api';

export type MainTab = 'home' | 'markets' | 'calculator' | 'cities' | 'more';

/** شاشة مفتوحة فوق التبويب الحالي (تُغلق بزر الرجوع) */
export type Route =
  | { name: 'history' }
  | { name: 'articles' }
  | { name: 'article'; article: ArticleItem }
  | { name: 'city'; city: CityRate }
  | { name: 'about' }
  | { name: 'notifications' };

interface AppContextType {
  currentRates: CurrentRatesResponse | null;
  history: HistoryResponse | null;
  articles: ArticleItem[];
  goldMetals: MetalRate[];
  silverMetals: MetalRate[];
  currencies: CurrencyRate[];
  cryptoRates: CryptoRate[];
  isLoading: boolean;
  isRefreshing: boolean;
  isOffline: boolean;
  lastUpdatedTime: string | null;
  refreshRates: () => Promise<void>;

  tab: MainTab;
  setTab: (t: MainTab) => void;
  stack: Route[];
  push: (r: Route) => void;
  back: () => boolean; // true إذا تم الرجوع داخل التطبيق، false إذا كنا في الصفحة الرئيسية

  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  isDarkMode: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

const readTheme = (): ThemeMode => {
  try {
    const s = localStorage.getItem('dolariraq_theme');
    if (s === 'light' || s === 'dark' || s === 'system') return s;
  } catch {}
  return 'system';
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRates, setCurrentRates] = useState<CurrentRatesResponse | null>(null);
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [goldMetals, setGoldMetals] = useState<MetalRate[]>([]);
  const [silverMetals, setSilverMetals] = useState<MetalRate[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyRate[]>([]);
  const [cryptoRates, setCryptoRates] = useState<CryptoRate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string | null>(null);

  const [tab, setTabState] = useState<MainTab>('home');
  const [stack, setStack] = useState<Route[]>([]);

  const setTab = useCallback((t: MainTab) => {
    setStack([]);
    setTabState(t);
  }, []);
  const push = useCallback((r: Route) => setStack((s) => [...s, r]), []);

  const stackRef = useRef(stack);
  const tabRef = useRef(tab);
  stackRef.current = stack;
  tabRef.current = tab;

  const back = useCallback((): boolean => {
    if (stackRef.current.length > 0) {
      setStack((s) => s.slice(0, -1));
      return true;
    }
    if (tabRef.current !== 'home') {
      setTabState('home');
      return true;
    }
    return false;
  }, []);

  // ---------- المظهر ----------
  const [theme, setThemeState] = useState<ThemeMode>(readTheme);
  const [systemDark, setSystemDark] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const h = () => setSystemDark(mq.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);
  const isDarkMode = theme === 'dark' || (theme === 'system' && systemDark);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', isDarkMode);
    root.style.colorScheme = isDarkMode ? 'dark' : 'light';
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute('content', isDarkMode ? '#0C1210' : '#0B7A4B');
  }, [isDarkMode]);
  const setTheme = (t: ThemeMode) => {
    setThemeState(t);
    try {
      localStorage.setItem('dolariraq_theme', t);
    } catch {}
  };

  // ---------- البيانات ----------
  const applyRest = useCallback(
    (r: {
      hist?: HistoryResponse;
      arts?: ArticleItem[];
      gold?: MetalRate[];
      silver?: MetalRate[];
      curr?: CurrencyRate[];
      crypto?: CryptoRate[];
    }) => {
      if (r.hist) setHistory(r.hist);
      if (r.arts) setArticles(r.arts);
      if (r.gold) setGoldMetals(r.gold);
      if (r.silver) setSilverMetals(r.silver);
      if (r.curr) setCurrencies(r.curr);
      if (r.crypto) setCryptoRates(r.crypto);
    },
    [],
  );

  const loadAll = useCallback(
    async (initial: boolean) => {
      if (initial) setIsLoading(true);
      else setIsRefreshing(true);
      try {
        const ratesRes = await DolarIraqApi.getCurrentRates();
        setCurrentRates(ratesRes.data);
        setIsOffline(ratesRes.isOffline);
        setLastUpdatedTime(new Date().toISOString());
      } catch {
        setIsOffline(true);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
      const [h, a, m, c, k] = await Promise.allSettled([
        DolarIraqApi.getRatesHistory(30),
        DolarIraqApi.getArticles(20),
        DolarIraqApi.getMetals(),
        DolarIraqApi.getCurrencies(),
        DolarIraqApi.getCrypto(),
      ]);
      applyRest({
        hist: h.status === 'fulfilled' ? h.value.data : undefined,
        arts: a.status === 'fulfilled' ? a.value.data.articles || [] : undefined,
        gold: m.status === 'fulfilled' ? m.value.gold : undefined,
        silver: m.status === 'fulfilled' ? m.value.silver : undefined,
        curr: c.status === 'fulfilled' ? c.value.data : undefined,
        crypto: k.status === 'fulfilled' ? k.value.data : undefined,
      });
    },
    [applyRest],
  );

  const refreshRates = useCallback(() => loadAll(false), [loadAll]);

  useEffect(() => {
    loadAll(true);
    const onOnline = () => loadAll(false);
    const onOffline = () => setIsOffline(true);
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadAll(false);
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    document.addEventListener('visibilitychange', onVisible);
    const interval = setInterval(() => {
      if (navigator.onLine && document.visibilityState === 'visible') loadAll(false);
    }, 60000);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(interval);
    };
  }, [loadAll]);

  return (
    <AppContext.Provider
      value={{
        currentRates, history, articles, goldMetals, silverMetals, currencies, cryptoRates,
        isLoading, isRefreshing, isOffline, lastUpdatedTime, refreshRates,
        tab, setTab, stack, push, back,
        theme, setTheme, isDarkMode,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
