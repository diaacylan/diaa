import React, { useState } from 'react';
import { Check, Share2 } from 'lucide-react';
import { shareText } from '../utils/share';

/** زر مشاركة دائري صغير. onDark: فوق البطاقة الخضراء. */
export const ShareButton: React.FC<{ title: string; text: string; url: string; onDark?: boolean; label?: string }> = ({
  title,
  text,
  url,
  onDark,
  label = 'مشاركة السعر',
}) => {
  const [copied, setCopied] = useState(false);
  const onClick = async () => {
    const r = await shareText(title, text, url);
    if (r === 'copied') {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`press grid h-10 w-10 place-items-center rounded-full ${
        onDark ? 'bg-white/15 text-white' : 'border border-line bg-surface text-ink'
      }`}
    >
      {copied ? <Check size={18} /> : <Share2 size={18} />}
    </button>
  );
};
