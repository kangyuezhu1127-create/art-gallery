import SiteNav from '../components/SiteNav';
import { Helmet } from 'react-helmet-async';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <Helmet>
        <title>About · Unvilthearts</title>
      </Helmet>
      <SiteNav />

      <main className="max-w-[800px] mx-auto px-6 pt-24 pb-32">
        <p className="text-[0.7rem] tracking-[0.32em] uppercase text-ink/50 mb-6">
          About · 关于
        </p>
        <h1
          className="font-editorial mb-12"
          style={{ fontSize: 'clamp(3rem, 6vw, 5rem)', fontWeight: 700, lineHeight: 1 }}
        >
          A spatial archive of papercut art.
        </h1>

        <div className="space-y-6 text-ink/75 text-[1.05rem] leading-relaxed font-cn max-w-[640px]">
          <p>
            Depth Gallery 是一个把传统中国剪纸放进数字三维空间的策展平台。
            每一件上传的作品都会被自动估算深度信息，
            原本只属于二维的纸张，在这里获得了体积、光照、与观看的距离感。
          </p>
          <p>
            Two ways to view: walk through a virtual museum hall,
            or float through a cosmos where each work drifts in its own orbit.
            Click any work to view its true depth in three dimensions.
          </p>
          <p className="text-ink/55 text-sm pt-4 border-t border-ink/10">
            Built with React, Three.js, Supabase, and the depth-anything model.
            Designed for slow viewing.
          </p>
        </div>
      </main>
    </div>
  );
}
