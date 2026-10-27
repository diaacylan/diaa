import React, { useEffect } from 'react';
import { AppProvider, useApp, Route } from './context/AppContext';
import { BottomNav } from './components/BottomNav';
import { HomeScreen } from './screens/HomeScreen';
import { MarketsScreen } from './screens/MarketsScreen';
import { CalculatorScreen } from './screens/CalculatorScreen';
import { CitiesScreen, CityDetail } from './screens/CitiesScreen';
import { ArticlesScreen, ArticleDetail } from './screens/ArticlesScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { MoreScreen, AboutScreen } from './screens/MoreScreen';

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
  }
};

const Shell: React.FC = () => {
  const { tab, stack, back } = useApp();
  const top = stack[stack.length - 1];

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
      <BottomNav />
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
