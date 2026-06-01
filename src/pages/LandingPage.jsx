import { useState } from 'react';
import Button from '../components/ui/Button';
import KineticTypeBackground from '../components/decorations/KineticType';
import SiteNav from '../components/SiteNav';

export default function LandingPage() {
  const [lang, setLang] = useState('en'); // default English

  const copy = {
    zh: {
      eyebrow: '剪 · 间',
      title: 'Paper, Unfolded.',
      sub: '让传统剪纸在数字空间里立体生长',
      cta: '进入画廊',
      caption: '点击作品 · 进入 3D 视角 · 拖动探索',
      brand: 'Depth Gallery · 揭幕的艺术',
      footerR: 'Room 01 · 12',
    },
    en: {
      eyebrow: 'A SPATIAL GALLERY',
      title: 'Paper, Unfolded.',
      sub: 'Traditional papercuts, rendered with spatial depth — every cut, every shadow, in three dimensions.',
      cta: 'Enter the Gallery',
      caption: 'CLICK A WORK · ENTER 3D · DRAG TO EXPLORE',
      brand: 'Depth Gallery',
      footerR: 'ROOM 01 · 12',
    },
  }[lang];

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col relative overflow-hidden">
      {/* Kinetic type background — rotating cylinder of "depth gallery" letters */}
      <KineticTypeBackground
        text="depth gallery  "
        className="opacity-90"
      />

      {/* Soft white overlay so foreground text reads cleanly */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-white/40 to-white/70 pointer-events-none" />

      {/* Site nav at top */}
      <div className="relative z-10">
        <SiteNav variant="transparent" lang={lang} onLangChange={setLang} />
      </div>

      {/* CONTENT */}
      <div className="relative z-10 flex flex-col flex-1 px-[6vw] pt-2 pb-10">

        {/* Main */}
        <main className="flex-1 flex flex-col justify-center max-w-[1100px]">
          <p
            className={`${lang === 'zh' ? 'font-cn' : 'font-editorial'} tracking-[0.18em] mb-4`}
            style={{
              fontSize: 'clamp(1.4rem, 2.4vw, 2.4rem)',
              color: '#404040',
              fontWeight: lang === 'en' ? 600 : 700,
              fontVariationSettings: lang === 'en' ? "'opsz' 144, 'SOFT' 0, 'WONK' 0" : undefined,
            }}
          >
            {copy.eyebrow}
          </p>

          <h1
            className={`${lang === 'zh' ? 'font-cn' : 'font-editorial'} leading-[0.95] text-ink mb-6`}
            style={{
              fontSize: 'clamp(3.6rem, 10vw, 10rem)',
              fontWeight: lang === 'en' ? 700 : 900,
              fontVariationSettings: lang === 'en' ? "'opsz' 144, 'SOFT' 0, 'WONK' 0" : undefined,
              letterSpacing: '-0.015em',
            }}
          >
            {copy.title}
          </h1>

          <p
            className={`${lang === 'zh' ? 'font-cn' : 'font-sansDisplay'} text-ink/70 max-w-xl mb-12 leading-relaxed`}
            style={{ fontSize: 'clamp(1rem, 1.4vw, 1.25rem)' }}
          >
            {copy.sub}
          </p>

          <div className="flex flex-wrap items-center gap-6">
            <Button to="/enter" variant="outline" size="lg">
              {copy.cta}
            </Button>
            <span className="text-[0.7rem] tracking-[0.18em] uppercase text-ink/50">
              {copy.caption}
            </span>
          </div>
        </main>

        {/* Footer */}
        <footer className="flex justify-between items-center text-[0.7rem] tracking-[0.18em] uppercase text-ink/50">
          <span>unveiled-the-art.online</span>
          <span>{copy.footerR}</span>
        </footer>
      </div>
    </div>
  );
}
