import React, { useEffect, useState } from 'react';
import { AppProvider, useApp, Route } from './context/AppContext';
import { BottomNav } from './components/BottomNav';
import { HomeScreen } from './screens/HomeScreen';
import { MarketsScreen } from './screens/MarketsScreen';
import { CalculatorScreen } from './screens/CalculatorScreen';
import { CitiesScreen, CityDetail } from './screens/CitiesScreen';
import { ArticlesScreen, ArticleDetail } from './screens/ArticlesScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { MoreScreen, AboutScreen } from './screens/MoreScreen';
import { NotificationsScreen } from './screens/NotificationsScreen';
import { PushPrompt } from './components/PushPrompt';
import { UpdatePrompt } from './components/UpdatePrompt';
import { initAds, setBannerVisible, subscribeBanner } from './services/ads';

/** يربط زر الرجوع في أندرويد وشريط الحالة (يعمل فقط داخل التطبيق الأصلي) */
const NativeBridge: React.FC = () => {
  const { back, isDarkMode } = useApp();

  useEffect(() => {
    let remove: (() => void) | undefined;
    (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;
        const { App } = await import('@capacitor/app');
        const h = await App.addListener('backButton', () => {
          if (!back()) App.exitApp();
        });
        remove = () => h.remove();
      } catch {}
    })();
    return () => remove?.();
  }, [back]);

  useEffect(() => {
    (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setStyle({ style: isDarkMode ? Style.Dark : Style.Light });
        await StatusBar.setBackgroundColor({ color: isDarkMode ? '#0C1210' : '#F3F6F4' });
      } catch {}
    })();
  }, [isDarkMode]);

  return null;
};

const renderRoute = (r: Route, back: () => boolean) => {
  const onBack = () => void back();
  switch (r.name) {
    case 'history': return <HistoryScreen onBack={onBack} />;
    case 'articles': return <ArticlesScreen onBack={onBack} />;
    case 'article': return <ArticleDetail article={r.article} onBack={onBack} />;
    case 'city': return <CityDetail cityKey={r.city.city_key} onBack={onBack} />;
    case 'about': return <AboutScreen onBack={onBack} />;
    case 'notifications': return <NotificationsScreen onBack={onBack} />;
  }
};

/** مساحة البنر: شريط صغير فوق شريط التنقل في الصفحة الرئيسية فقط، لا يغطي أي محتوى. */
const BannerSlot: React.FC<{ active: boolean }> = ({ active }) => {
  const [h, setH] = useState(0);
  useEffect(() => subscribeBanner(setH), []);
  useEffect(() => {
    const nav = document.querySelector('nav[aria-label="التنقل الرئيسي"]');
    let margin = 0;
    if (nav) {
      const pb = parseFloat(getComputedStyle(nav).paddingBottom) || 0;
      margin = nav.getBoundingClientRect().height - pb; // الإضافة نفسها تضيف هامش الحافة الآمنة
    }
    setBannerVisible(active, margin);
  }, [active]);
  if (!active || h <= 0) return null;
  return (
    <div className="shrink-0 border-t border-line bg-surface" style={{ height: h + 16 }}>
      <div className="h-4 text-center text-[10px] leading-4 text-muted">إعلان</div>
    </div>
  );
};

const Shell: React.FC = () => {
  const { tab, stack, back } = useApp();
  const top = stack[stack.length - 1];
  useEffect(() => { void initAds(); }, []);

  return (
    <div className="mx-auto flex h-full max-w-[520px] flex-col bg-bg" dir="rtl">
      <NativeBridge />
      <main key={top ? `${top.name}-${stack.length}` : tab} className="screen-enter flex min-h-0 flex-1 flex-col">
        {top ? (
          renderRoute(top, back)
        ) : tab === 'home' ? (
          <HomeScreen />
        ) : tab === 'markets' ? (
          <MarketsScreen />
        ) : tab === 'calculator' ? (
          <CalculatorScreen />
        ) : tab === 'cities' ? (
          <CitiesScreen />
        ) : (
          <MoreScreen />
        )}
      </main>
      <BannerSlot active={!top && tab === 'home'} />
      <BottomNav />
      <PushPrompt />
      <UpdatePrompt />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
