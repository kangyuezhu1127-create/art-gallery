import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import SiteNav from '../components/SiteNav';
import Button from '../components/ui/Button';

/**
 * CosmosUpgradePage — temporary placeholder mounted at /enter while the
 * Cosmos Hall's manual controls (drag-rotate, scroll-zoom, hands-free) are
 * being reworked. Plain white/ink, matching the rest of the site (Landing,
 * About) rather than the dark 3D scene — a quiet "closed for upgrades" note,
 * not a spectacle.
 *
 * The original interactive scene lives on, untouched, in SelectionPage.jsx —
 * swap the route back in App.jsx once the controls are fixed.
 */
export default function CosmosUpgradePage({ artworks = [] }) {
  const [lang, setLang] = useState('en');

  const restingCount = artworks.filter((a) => a.originalURL).length;

  const copy = lang === 'zh'
    ? {
        tag: '宇宙厅 · 关于',
        title: '本展厅暂时闭馆。',
        sub: '我们正在升级这里的手动控制——拖动旋转、滚轮缩放、隔空手势——修好之后会重新开放。感谢耐心等待。',
        cta: '返回入口',
        hint: '升级中 · 敬请期待',
        resting: restingCount ? `${restingCount} 件作品暂存于此` : '作品暂存于此',
        footerR: '展厅 02 · 升级中',
      }
    : {
        tag: 'COSMOS HALL',
        title: 'Temporarily closed for upgrades.',
        sub: "We're reworking this room's manual controls — drag to rotate, scroll to zoom, hands-free gestures — before opening it back up. Thanks for your patience.",
        cta: 'Back to Entrance',
        hint: 'UPGRADING · CHECK BACK SOON',
        resting: restingCount ? `${restingCount} works waiting here` : 'Works waiting here',
        footerR: 'ROOM 02 · UPGRADING',
      };

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <Helmet>
        <title>Cosmos · Upgrading · Unveilthe.Arts</title>
      </Helmet>

      <SiteNav lang={lang} onLangChange={setLang} />

      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24">
        <div className="w-8 h-[1.5px] bg-ink/25 mb-8" />

        <p className={`${lang === 'zh' ? 'font-cn' : 'font-sansDisplay'} text-[0.7rem] tracking-[0.32em] uppercase text-ink/45 mb-6`}>
          {copy.tag}
        </p>

        <h1
          className={`${lang === 'zh' ? 'font-cn' : 'font-editorial'} max-w-2xl`}
          style={{
            fontSize: 'clamp(2rem, 4.5vw, 3.5rem)',
            fontWeight: lang === 'zh' ? 900 : 700,
            letterSpacing: '-0.01em',
            lineHeight: 1.1,
          }}
        >
          {copy.title}
        </h1>

        <p className={`${lang === 'zh' ? 'font-cn' : 'font-sansDisplay'} text-ink/60 max-w-md mt-6 leading-relaxed`}
           style={{ fontSize: '1rem' }}>
          {copy.sub}
        </p>

        <div className="mt-10 flex flex-col items-center gap-4">
          <Button to="/" variant="outline" size="lg">
            {copy.cta}
          </Button>
          <span className={`${lang === 'zh' ? 'font-cn' : 'font-sansDisplay'} text-[0.65rem] tracking-[0.28em] uppercase text-ink/35`}>
            {copy.hint}
          </span>
        </div>
      </main>

      <footer className="px-8 py-8 flex justify-between items-center text-[0.7rem] tracking-[0.18em] uppercase text-ink/45">
        <span>unveiled-the-art.online</span>
        <span className={lang === 'zh' ? 'font-cn' : ''}>{copy.resting}</span>
        <span>{copy.footerR}</span>
      </footer>
    </div>
  );
}
