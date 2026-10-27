import React from 'react';
import { LineChart, Newspaper, Bell, Sun, Moon, Smartphone, Share2, Star, ShieldCheck, FileText, Mail, Globe, Info, ChevronLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AppBar, Row, SectionTitle } from '../components/ui';
import { ThemeMode } from '../types';
import { Logo } from '../components/Logo';

export const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.dolariraq.app';

const openUrl = (u: string) => window.open(u, '_blank', 'noopener');

export const MoreScreen: React.FC = () => {
  const { push, theme, setTheme } = useApp();
  const chev = <ChevronLeft size={18} className="text-muted" />;

  const share = async () => {
    const text = 'تابع سعر الدولار والذهب في العراق لحظة بلحظة مع تطبيق دولار العراق';
    try {
      if (navigator.share) await navigator.share({ title: 'دولار العراق', text, url: PLAY_URL });
      else await navigator.clipboard.writeText(`${text}\n${PLAY_URL}`);
    } catch {}
  };

  const themes: { id: ThemeMode; label: string; Icon: typeof Sun }[] = [
    { id: 'system', label: 'تلقائي', Icon: Smartphone },
    { id: 'light', label: 'فاتح', Icon: Sun },
    { id: 'dark', label: 'داكن', Icon: Moon },
  ];

  return (
    <>
      <AppBar title="المزيد" />
      <div className="scroll-area flex-1 px-4 pb-6">
        <div className="card divide-y divide-line overflow-hidden">
          <Row icon={<Bell size={19} />} title="الإشعارات" subtitle="تنبيهات السعر والنشرة اليومية" trailing={chev} onClick={() => push({ name: 'notifications' })} />
          <Row icon={<LineChart size={19} />} title="سجل الأسعار" subtitle="حركة الدولار والذهب خلال 30 يوماً" trailing={chev} onClick={() => push({ name: 'history' })} />
          <Row icon={<Newspaper size={19} />} title="المقالات" subtitle="أخبار وتحليلات السوق" trailing={chev} onClick={() => push({ name: 'articles' })} />
        </div>

        <SectionTitle>المظهر</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          {themes.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTheme(id)}
              aria-pressed={theme === id}
              className={`press flex flex-col items-center gap-1.5 rounded-2xl border py-3.5 text-[13px] font-bold ${
                theme === id ? 'border-brand bg-brand-soft text-brand' : 'border-line bg-surface text-muted'
              }`}
            >
              <Icon size={20} />
              {label}
            </button>
          ))}
        </div>

        <SectionTitle>التطبيق</SectionTitle>
        <div className="card divide-y divide-line overflow-hidden">
          <Row icon={<Share2 size={19} />} title="شارك التطبيق" subtitle="أرسله لأصدقائك وعائلتك" onClick={share} />
          <Row icon={<Star size={19} />} title="قيّم التطبيق" subtitle="رأيك يساعدنا على التحسين" onClick={() => openUrl(PLAY_URL)} />
          <Row icon={<Info size={19} />} title="عن التطبيق" trailing={chev} onClick={() => push({ name: 'about' })} />
        </div>

        <SectionTitle>الدعم والقانوني</SectionTitle>
        <div className="card divide-y divide-line overflow-hidden">
          <Row icon={<Mail size={19} />} title="تواصل معنا" onClick={() => openUrl('https://dolariraq.com/contact')} />
          <Row icon={<ShieldCheck size={19} />} title="سياسة الخصوصية" onClick={() => openUrl('https://dolariraq.com/privacy')} />
          <Row icon={<FileText size={19} />} title="شروط الاستخدام" onClick={() => openUrl('https://dolariraq.com/terms')} />
          <Row icon={<Globe size={19} />} title="الموقع الإلكتروني" subtitle="dolariraq.com" onClick={() => openUrl('https://dolariraq.com')} />
        </div>
      </div>
    </>
  );
};

export const AboutScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <>
    <AppBar title="عن التطبيق" onBack={onBack} />
    <div className="scroll-area flex-1 px-4 pb-6">
      <div className="flex flex-col items-center py-6">
        <Logo size={88} />
        <h2 className="mt-3 text-xl font-black text-ink">دولار العراق</h2>
        <p className="text-xs text-muted">أسعار الصرف والذهب في العراق</p>
      </div>
      <div className="card p-4 text-sm leading-loose text-ink">
        يعرض التطبيق سعر الدولار في بغداد والمحافظات، وأسعار الذهب، مع حاسبة لتحويل العملات وسجل لحركة الأسعار.
        <br />
        الأسعار إرشادية، وقد تختلف قليلاً بين مكاتب الصرف والمحلات. لا يُعدّ التطبيق استشارة مالية.
      </div>
    </div>
  </>
);
