import React, { useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';

const CONFIG_URL = 'https://raw.githubusercontent.com/diaacylan/diaa/master/app-config.json';
const SNOOZE_KEY = 'dolariraq_update_snooze';
const SNOOZE_MS = 24 * 60 * 60 * 1000;

type Mode = 'idle' | 'optional' | 'required';
type Phase = 'ready' | 'downloading' | 'downloaded';

/** يعرض نافذة تحديث: اختيارية (مرنة) أو إلزامية إذا كانت النسخة أقل من الحد الأدنى من app-config.json */
export const UpdatePrompt: React.FC = () => {
  const [mode, setMode] = useState<Mode>('idle');
  const [phase, setPhase] = useState<Phase>('ready');
  const [message, setMessage] = useState('');
  const info = useRef<{ flexible: boolean; immediate: boolean; available: string }>({
    flexible: false,
    immediate: false,
    available: '',
  });
  const handle = useRef<{ remove: () => void } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;
        const { AppUpdate, AppUpdateAvailability, FlexibleUpdateInstallStatus } = await import(
          '@capawesome/capacitor-app-update'
        );
        const u = await AppUpdate.getAppUpdateInfo();
        if (u.updateAvailability !== AppUpdateAvailability.UPDATE_AVAILABLE) return;

        let minCode = 0;
        let msg = '';
        try {
          const r = await fetch(`${CONFIG_URL}?t=${Date.now()}`, { cache: 'no-store' });
          if (r.ok) {
            const c = await r.json();
            minCode = Number(c.minVersionCode) || 0;
            msg = typeof c.message === 'string' ? c.message : '';
          }
        } catch {}

        const current = Number(u.currentVersionCode) || 0;
        const required = minCode > 0 && current < minCode;
        info.current = {
          flexible: !!u.flexibleUpdateAllowed,
          immediate: !!u.immediateUpdateAllowed,
          available: String(u.availableVersionCode ?? ''),
        };

        if (!required) {
          try {
            const s = JSON.parse(localStorage.getItem(SNOOZE_KEY) || '{}');
            if (s.v === info.current.available && Date.now() - s.t < SNOOZE_MS) return;
          } catch {}
        }

        handle.current = await AppUpdate.addListener('onFlexibleUpdateStateChange', (st) => {
          if (st.installStatus === FlexibleUpdateInstallStatus.DOWNLOADED) setPhase('downloaded');
        });
        if (alive) {
          setMessage(msg);
          setMode(required ? 'required' : 'optional');
        }
      } catch {
        /* ليس من متجر Play أو لا يوجد اتصال: تجاهل */
      }
    })();
    return () => {
      alive = false;
      handle.current?.remove();
    };
  }, []);

  if (mode === 'idle') return null;

  const update = async () => {
    try {
      const { AppUpdate } = await import('@capawesome/capacitor-app-update');
      if (phase === 'downloaded') {
        await AppUpdate.completeFlexibleUpdate();
        return;
      }
      if (mode === 'required' && info.current.immediate) {
        await AppUpdate.performImmediateUpdate();
      } else if (info.current.flexible) {
        setPhase('downloading');
        await AppUpdate.startFlexibleUpdate();
      } else {
        await AppUpdate.openAppStore();
      }
    } catch {
      try {
        const { AppUpdate } = await import('@capawesome/capacitor-app-update');
        await AppUpdate.openAppStore();
      } catch {}
      setPhase('ready');
    }
  };

  const later = () => {
    try {
      localStorage.setItem(SNOOZE_KEY, JSON.stringify({ v: info.current.available, t: Date.now() }));
    } catch {}
    setMode('idle');
  };

  const label =
    phase === 'downloading' ? 'جارٍ التنزيل…' : phase === 'downloaded' ? 'تثبيت وإعادة التشغيل' : 'تحديث الآن';

  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/50" role="dialog" aria-modal="true">
      <div
        className="screen-enter mx-auto w-full max-w-[520px] rounded-t-3xl bg-surface px-6 pt-7 text-center"
        style={{ paddingBottom: 'calc(var(--safe-bottom) + 24px)' }}
      >
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-soft text-brand">
          <Download size={30} />
        </span>
        <h2 className="mt-4 text-xl font-black text-ink">
          {mode === 'required' ? 'يلزم تحديث التطبيق' : 'يتوفر تحديث جديد'}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {message ||
            (mode === 'required'
              ? 'هذه النسخة قديمة وقد تعرض أسعاراً غير دقيقة. حدّث التطبيق للمتابعة.'
              : 'يتوفر إصدار أحدث من دولار العراق فيه تحسينات وإصلاحات.')}
        </p>
        <button
          onClick={update}
          disabled={phase === 'downloading'}
          className="press mt-5 w-full rounded-2xl bg-brand py-3.5 text-base font-extrabold text-white disabled:opacity-60"
        >
          {label}
        </button>
        {mode === 'optional' && phase === 'ready' ? (
          <button onClick={later} className="mt-2 w-full py-3 text-sm font-bold text-muted">
            لاحقاً
          </button>
        ) : null}
      </div>
    </div>
  );
};
