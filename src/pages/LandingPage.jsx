import { useState } from 'react';
import Button from '../components/ui/Button';
import { Butterfly, Peony, WindowFlower, Medallion } from '../components/decorations/Papercut';

export default function LandingPage() {
  const [lang, setLang] = useState('zh'); // 'zh' | 'en'

  const copy = {
    zh: {
      eyebrow: '剪 · 间',
      title: 'Paper, Unfolded.',
      sub: '让传统剪纸在数字空间里立体生长',
      cta: '进入画廊',
      caption: '点击作品 · 进入 3D 视角 · 拖动探索',
    },
    en: {
      eyebrow: 'JIAN · JIAN',
      title: 'Paper, Unfolded.',
      sub: 'Traditional papercuts, rendered in spatial depth.',
      cta: 'Enter the Gallery',
      caption: 'CLICK A WORK · ENTER 3D · DRAG TO EXPLORE',
    },
  }[lang];

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col px-[6vw] py-10 relative overflow-hidden">
      {/* Floating papercut decorations */}
      <Butterfly
        size={120}
        className="absolute top-[18%] right-[12%] text-papercut/80 animate-floaty"
        style={{ '--r': '-12deg' }}
      />
      <Peony
        size={88}
        className="absolute top-[55%] right-[7%] text-ink/70 animate-floaty"
        style={{ '--r': '6deg', animationDelay: '1.2s' }}
      />
      <WindowFlower
        size={72}
        className="absolute bottom-[14%] left-[9%] text-ink/50 animate-floaty"
        style={{ '--r': '8deg', animationDelay: '2.4s' }}
      />
      <Medallion
        size={56}
        className="absolute top-[10%] left-[22%] text-papercut/40 animate-floaty"
        style={{ '--r': '-6deg', animationDelay: '0.6s' }}
      />

      {/* Header */}
      <header className="flex justify-between items-center text-xs tracking-[0.18em] uppercase relative z-10">
        <div className="flex items-center gap-3 font-semibold">
          <span className="w-2 h-2 bg-papercut rounded-full" />
          <span>Depth Gallery · 揭幕的艺术</span>
        </div>
        <div className="flex items-center gap-3 text-ink/60">
          <button
            onClick={() => setLang('en')}
            className={`transition-colors ${lang === 'en' ? 'text-ink font-semibold' : 'hover:text-ink'}`}
          >
            EN
          </button>
          <span>/</span>
          <button
            onClick={() => setLang('zh')}
            className={`transition-colors ${lang === 'zh' ? 'text-ink font-semibold' : 'hover:text-ink'}`}
          >
            中文
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col justify-center max-w-[1100px] relative z-10">
        {/* Eyebrow Chinese huge */}
        <p
          className="font-cn font-black tracking-[0.3em] text-papercut mb-4"
          style={{ fontSize: 'clamp(2rem, 4vw, 3.4rem)' }}
        >
          {copy.eyebrow}
        </p>

        {/* English mega title */}
        <h1
          className="font-display font-black leading-[0.95] text-ink mb-6"
          style={{ fontSize: 'clamp(3.6rem, 9vw, 9rem)' }}
        >
          {copy.title}
        </h1>

        {/* Sub */}
        <p
          className="font-cn text-ink/70 max-w-xl mb-12 leading-relaxed"
          style={{ fontSize: 'clamp(1rem, 1.4vw, 1.25rem)' }}
        >
          {copy.sub}
        </p>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-6">
          <Button to="/gallery" variant="outline" size="lg">
            {copy.cta}
          </Button>
          <span className="text-[0.7rem] tracking-[0.18em] uppercase text-ink/40">
            {copy.caption}
          </span>
        </div>
      </main>

      {/* Footer */}
      <footer className="flex justify-between items-center text-[0.7rem] tracking-[0.18em] uppercase text-ink/40 relative z-10">
        <span>unveiled-the-art.online</span>
        <span>Room 01 · 12</span>
      </footer>
    </div>
  );
}
