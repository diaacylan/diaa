import React, { useEffect, useState } from 'react';
import { Bell, BellOff, Settings } from 'lucide-react';
import { AppBar } from '../components/ui';
import { PUSH_TOPICS, PushState, enablePush, getPushState, lastPushError, loadSaved, setTopic } from '../services/push';

export const NotificationsScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [state, setState] = useState<PushState>('prompt');
  const [topics, setTopics] = useState<Record<string, boolean>>(loadSaved().topics);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    getPushState().then((s) => {
      setState(s);
      setErr(lastPushError);
    });
  }, []);

  const activate = async () => {
    setBusy(true);
    const s = await enablePush();
    setState(s);
    setTopics(loadSaved().topics);
    setErr(lastPushError);
    setBusy(false);
  };

  const toggle = async (id: string) => {
    const on = !topics[id];
    setTopics((t) => ({ ...t, [id]: on }));
    try {
      await setTopic(id, on);
    } catch {
      setTopics((t) => ({ ...t, [id]: !on }));
    }
  };

  return (
    <>
      <AppBar title="الإشعارات" onBack={onBack} />
      <div className="scroll-area flex-1 px-4 pb-6">
        {state === 'granted' ? (
          <div className="card divide-y divide-line overflow-hidden">
            {PUSH_TOPICS.map((t) => (
              <label key={t.id} className="flex items-center gap-3 px-4 py-3.5">
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-bold text-ink">{t.title}</span>
                  <span className="block text-xs text-muted">{t.hint}</span>
                </span>
                <button
                  role="switch"
                  aria-checked={!!topics[t.id]}
                  onClick={() => toggle(t.id)}
                  className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${topics[t.id] ? 'bg-brand' : 'bg-line'}`}
                >
                  <span
                    className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${
                      topics[t.id] ? 'end-0.5' : 'end-[22px]'
                    }`}
                  />
                </button>
              </label>
            ))}
          </div>
        ) : (
          <div className="card flex flex-col items-center gap-3 px-6 py-10 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-soft text-brand">
              {state === 'denied' ? <BellOff size={30} /> : <Bell size={30} />}
            </span>
            <h2 className="text-lg font-extrabold text-ink">
              {state === 'denied' ? 'الإشعارات متوقفة' : state === 'unsupported' ? 'غير متاحة هنا' : 'فعّل الإشعارات'}
            </h2>
            <p className="text-sm leading-relaxed text-muted">
              {state === 'denied'
                ? 'منعت الإشعارات سابقاً. فعّلها من إعدادات الهاتف ثم ارجع للتطبيق.'
                : state === 'unsupported'
                ? 'الإشعارات تعمل داخل تطبيق الهاتف فقط.'
                : 'اعرف فور تغيّر سعر الدولار أو الذهب، حتى والتطبيق مغلق.'}
            </p>
            {state === 'prompt' && (
              <button
                onClick={activate}
                disabled={busy}
                className="press mt-1 w-full rounded-2xl bg-brand py-3.5 text-base font-extrabold text-white disabled:opacity-60"
              >
                {busy ? 'جارٍ التفعيل…' : 'تفعيل الإشعارات'}
              </button>
            )}
            {state === 'denied' && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-brand">
                <Settings size={14} /> الإعدادات ← التطبيقات ← دولار العراق ← الإشعارات
              </span>
            )}
          </div>
        )}
        {err && (
          <p dir="ltr" className="selectable mt-3 break-words rounded-xl bg-down/10 p-3 text-start text-[11px] text-down">
            {err}
          </p>
        )}
      </div>
    </>
  );
};
