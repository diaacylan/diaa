import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { enablePush, getPushState, loadSaved, markAsked } from '../services/push';

/** نافذة تظهر مرة واحدة عند أول فتح لطلب تفعيل الإشعارات */
export const PushPrompt: React.FC = () => {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (loadSaved().asked) return;
      const s = await getPushState();
      if (alive && s === 'prompt') setTimeout(() => alive && setShow(true), 1200);
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!show) return null;

  const accept = async () => {
    setBusy(true);
    await enablePush();
    setShow(false);
  };
  const later = () => {
    markAsked();
    setShow(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50" role="dialog" aria-modal="true">
      <div
        className="screen-enter mx-auto w-full max-w-[520px] rounded-t-3xl bg-surface px-6 pt-7 text-center"
        style={{ paddingBottom: 'calc(var(--safe-bottom) + 24px)' }}
      >
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-soft text-brand">
          <Bell size={30} />
        </span>
        <h2 className="mt-4 text-xl font-black text-ink">لا تفوّت تغيّر السعر</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          فعّل الإشعارات لتصلك تنبيهات سعر الدولار والذهب على هاتفك حتى لو كان التطبيق مغلقاً.
        </p>
        <button
          onClick={accept}
          disabled={busy}
          className="press mt-5 w-full rounded-2xl bg-brand py-3.5 text-base font-extrabold text-white disabled:opacity-60"
        >
          تفعيل الإشعارات
        </button>
        <button onClick={later} className="mt-2 w-full py-3 text-sm font-bold text-muted">
          ليس الآن
        </button>
      </div>
    </div>
  );
};
