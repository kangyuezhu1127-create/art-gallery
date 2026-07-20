import { useState } from 'react';
import FloatingCollageHero from '../components/FloatingCollageHero';
import PapercutMakerScene from '../components/PapercutMakerScene';
import SiteNav from '../components/SiteNav';
import EnvelopeReveal from '../components/EnvelopeReveal';

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
    <div className="bg-paper text-ink relative">
      {/* Site nav at top — sits above hero AND envelope section */}
      <div className="relative z-30">
        <SiteNav variant="transparent" lang={lang} onLangChange={setLang} />
      </div>

      {/* ──────── HERO — floating collage (Chinese-aesthetic) ──────── */}
      <FloatingCollageHero lang={lang} copy={copy} />

      {/* ──────── MAKER SCENE — Song-dynasty woman cutting papercut ──────── */}
      <PapercutMakerScene lang={lang} />

      {/* ──────── ENVELOPE SECTION ──────── */}
      <EnvelopeReveal lang={lang} />
    </div>
  );
}
