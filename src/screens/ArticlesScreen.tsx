import React from 'react';
import { Newspaper, Share2, ExternalLink } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AppBar, Empty, Skeleton } from '../components/ui';
import { ArticleItem } from '../types';
import { stripHtml } from '../utils/formatters';

const dateAr = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? ''
    : new Intl.DateTimeFormat('ar-IQ-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Baghdad' }).format(d);
};

export const ArticlesScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { articles, isLoading, push } = useApp();
  return (
    <>
      <AppBar title="المقالات" onBack={onBack} />
      <div className="scroll-area flex-1 px-4 pb-6">
        {isLoading && articles.length === 0 ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        ) : articles.length === 0 ? (
          <Empty icon={<Newspaper />} title="لا توجد مقالات حالياً" hint="تحقق من اتصالك بالإنترنت" />
        ) : (
          <div className="space-y-3">
            {articles.map((a) => (
              <button key={a.id} onClick={() => push({ name: 'article', article: a })} className="press card block w-full p-4 text-start">
                <span className="text-[11px] font-semibold text-muted">{dateAr(a.date)}</span>
                <span className="mt-1 block text-[15px] font-extrabold leading-snug text-ink">{a.title}</span>
                <span className="mt-1.5 line-clamp-2 block text-[13px] leading-relaxed text-muted">
                  {stripHtml(a.excerpt_html)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export const ArticleDetail: React.FC<{ article: ArticleItem; onBack: () => void }> = ({ article, onBack }) => {
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: article.title, url: article.link || 'https://dolariraq.com' });
      else await navigator.clipboard.writeText(`${article.title}\n${article.link}`);
    } catch {}
  };
  return (
    <>
      <AppBar
        title="المقال"
        onBack={onBack}
        actions={
          <button onClick={share} aria-label="مشاركة" className="press grid h-10 w-10 place-items-center rounded-full text-ink">
            <Share2 size={20} />
          </button>
        }
      />
      <div className="scroll-area flex-1 px-5 pb-8">
        <div className="text-xs font-semibold text-muted">{dateAr(article.date)}</div>
        <h2 className="mt-1 text-[22px] font-black leading-snug text-ink">{article.title}</h2>
        <div
          className="article-body mt-4"
          dangerouslySetInnerHTML={{
            __html: article.content_html || article.excerpt_html || '<p>لا يوجد محتوى متاح لهذا المقال.</p>',
          }}
        />
        {article.link && (
          <a
            href={article.link}
            target="_blank"
            rel="noreferrer"
            className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-line bg-surface py-3 text-sm font-bold text-brand"
          >
            <ExternalLink size={16} /> فتح المقال على الموقع
          </a>
        )}
      </div>
    </>
  );
};
