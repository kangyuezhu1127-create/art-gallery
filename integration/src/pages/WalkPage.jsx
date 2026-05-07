import { Suspense, useState, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import Gallery3D from '../components/walk/Gallery3D';
import FirstPersonControls from '../components/walk/FirstPersonControls';
import WalkHUD from '../components/walk/WalkHUD';

// Decide layout: ≤12 artworks → corridor, >12 → auto-expanding rotunda
function pickLayout(count) {
  if (count <= 12) return { kind: 'corridor', segments: Math.max(4, Math.ceil(count / 2)) };
  // Rotunda: one panel per artwork, min 12, max 36
  const segments = Math.min(36, Math.max(12, count));
  return { kind: 'rotunda', segments };
}

const VIBES = {
  moody:   { wall: '#141210', floor: '#0c0a08', ceil: '#07060a', amb: 0.04, hemi: 0.12, fog: ['#0a0908', 22, 80],  spot: 14, exposure: 1.0  },
  white:   { wall: '#f2eee5', floor: '#b7ada0', ceil: '#faf7f1', amb: 0.55, hemi: 0.85, fog: ['#faf7f1', 30, 120], spot: 4,  exposure: 1.05 },
  liminal: { wall: '#c7b58a', floor: '#55482e', ceil: '#eacc7a', amb: 0.32, hemi: 0.45, fog: ['#e8c97a', 14, 55],  spot: 8,  exposure: 1.15 },
};

export default function WalkPage({ artworks = [] }) {
  const [vibe, setVibe] = useState('moody');
  const [focus, setFocus] = useState(0.7);
  const [speed, setSpeed] = useState(5);
  const [audioOn, setAudioOn] = useState(false);
  const [aimedIdx, setAimedIdx] = useState(null);
  const [openIdx, setOpenIdx] = useState(null);
  const [introGone, setIntroGone] = useState(false);

  const layout = useMemo(() => pickLayout(artworks.length), [artworks.length]);
  const palette = VIBES[vibe];

  // Ambient audio (layered drone)
  useEffect(() => {
    if (!audioOn) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const out = ctx.createGain(); out.gain.value = 0; out.connect(ctx.destination);
    out.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 1.4);
    const o1 = ctx.createOscillator(); o1.frequency.value = 110; o1.type = 'sine';
    const g1 = ctx.createGain(); g1.gain.value = 0.5; o1.connect(g1).connect(out);
    const o2 = ctx.createOscillator(); o2.frequency.value = 110 * 1.501; o2.type = 'sine';
    const g2 = ctx.createGain(); g2.gain.value = 0.25; o2.connect(g2).connect(out);
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.6;
    const noise = ctx.createBufferSource(); noise.buffer = buf; noise.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'lowpass'; bp.frequency.value = 380; bp.Q.value = 0.6;
    const ng = ctx.createGain(); ng.gain.value = 0.18;
    noise.connect(bp).connect(ng).connect(out);
    o1.start(); o2.start(); noise.start();
    return () => {
      out.gain.cancelScheduledValues(ctx.currentTime);
      out.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
      setTimeout(() => { try { o1.stop(); o2.stop(); noise.stop(); ctx.close(); } catch {} }, 700);
    };
  }, [audioOn]);

  const aimedArtwork = aimedIdx != null ? artworks[aimedIdx] : null;
  const openArtwork = openIdx != null ? artworks[openIdx] : null;

  const shareRoom = () => {
    const url = new URL(location.href);
    url.searchParams.set('vibe', vibe);
    if (aimedIdx != null) url.searchParams.set('piece', String(aimedIdx));
    navigator.clipboard?.writeText(url.toString());
  };

  // Empty state
  if (!artworks.length) {
    return (
      <div className="min-h-screen bg-[#0a0908] text-[#f3efe6] flex flex-col items-center justify-center p-8">
        <Helmet><title>步入画廊 · Depth Gallery</title></Helmet>
        <h1 className="text-4xl font-light italic mb-4" style={{ fontFamily: 'Fraunces, serif' }}>
          The walls are bare.
        </h1>
        <p className="text-white/60 mb-8 max-w-md text-center">
          走入式画廊需要至少一件作品。先回到主页上传一幅画,我们就能把它挂上墙。
        </p>
        <Link to="/" className="px-6 py-3 bg-white text-black rounded-full text-sm tracking-wider uppercase">
          回到主页
        </Link>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#0a0908] text-[#f3efe6] overflow-hidden" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Helmet>
        <title>步入画廊 · Depth Gallery</title>
        <meta name="description" content="走入式 3D 画廊 — 在虚拟空间中漫步欣赏每一件作品" />
      </Helmet>

      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: palette.exposure,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        camera={{ fov: 72, near: 0.05, far: 200, position: [0, 1.7, 6] }}
      >
        <color attach="background" args={[palette.fog[0]]} />
        <fog attach="fog" args={[palette.fog[0], palette.fog[1], palette.fog[2]]} />
        <ambientLight intensity={palette.amb} />
        <hemisphereLight args={[0xfff5e6, 0x1a1612, palette.hemi]} />
        <Suspense fallback={null}>
          <Gallery3D
            artworks={artworks}
            layout={layout}
            palette={palette}
            aimedIdx={aimedIdx}
            focus={focus}
            onAim={setAimedIdx}
            onOpen={setOpenIdx}
          />
        </Suspense>
        <FirstPersonControls speed={speed} layout={layout} active={introGone} />
      </Canvas>

      <WalkHUD
        introGone={introGone}
        onEnter={() => { setIntroGone(true); setAudioOn(true); }}
        artworks={artworks}
        aimedIdx={aimedIdx}
        openIdx={openIdx}
        onClose={() => setOpenIdx(null)}
        vibe={vibe} setVibe={setVibe}
        focus={focus} setFocus={setFocus}
        speed={speed} setSpeed={setSpeed}
        audioOn={audioOn} setAudioOn={setAudioOn}
        onShare={shareRoom}
        layout={layout}
      />
    </div>
  );
}
