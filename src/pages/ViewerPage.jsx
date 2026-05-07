import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate } from 'react-router-dom';
import Artwork3DViewer from '../components/Artwork3DViewer';

export default function ViewerPage({ artworks, onUpdate }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const artwork = artworks.find((a) => a.id === id);
  const [displacementScale, setDisplacementScale] = useState(0.25);

  if (!artwork) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        <div className="text-center">
          <p className="text-lg mb-4">找不到作品</p>
          <button
            onClick={() => navigate('/gallery')}
            className="px-4 py-2 bg-white text-gray-900 rounded-lg"
          >
            返回画廊
          </button>
        </div>
      </div>
    );
  }

  const has3D = !!artwork.depthMapURL;
  const seoDescription = [artwork.artist, artwork.year, artwork.description].filter(Boolean).join(' · ');

  return (
    <div className="h-screen bg-[#0d0d0d] flex flex-col overflow-hidden">
      <Helmet>
        <title>{artwork.title} — Depth Gallery</title>
        <meta name="description" content={seoDescription || `${artwork.title} 的 3D 立体展示`} />
        <meta property="og:title" content={`${artwork.title} — Depth Gallery`} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:image" content={artwork.originalURL} />
        <meta property="og:type" content="article" />
      </Helmet>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 text-white z-10">
        <button
          onClick={() => navigate('/gallery')}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          ← 返回画廊
        </button>
        <div className="text-center">
          <h1 className="font-medium text-white">{artwork.title}</h1>
          {artwork.artist && (
            <p className="text-xs text-gray-400">{artwork.artist}{artwork.year && ` · ${artwork.year}`}</p>
          )}
        </div>
        <div className="w-24" />
      </div>

      {/* 3D Canvas */}
      <div className="flex-1 relative min-h-0">
        {has3D ? (
          <Artwork3DViewer
            colorURL={artwork.originalURL}
            depthURL={artwork.depthMapURL}
            displacementScale={displacementScale}
            aspectRatio={artwork.aspectRatio}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-4">
            <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-300">{artwork.depthStatus || '正在生成 3D...'}</p>
            <p className="text-xs text-gray-500">首次使用需下载约 50MB AI 模型</p>
          </div>
        )}

        {/* Controls overlay */}
        {has3D && (
          <>
            {/* Displacement slider */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur rounded-2xl px-6 py-4 text-white flex items-center gap-4 min-w-64">
              <span className="text-xs text-gray-400 whitespace-nowrap">景深强度</span>
              <input
                type="range"
                min="0"
                max="0.8"
                step="0.01"
                value={displacementScale}
                onChange={(e) => setDisplacementScale(parseFloat(e.target.value))}
                className="flex-1 accent-white"
              />
              <span className="text-xs text-gray-300 w-8 text-right">
                {Math.round(displacementScale * 100)}
              </span>
            </div>

            {/* Hint */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur rounded-full px-4 py-1.5 text-xs text-gray-300 pointer-events-none">
              拖拽旋转 · 滚轮缩放 · 右键平移
            </div>
          </>
        )}
      </div>

      {/* Bottom info */}
      {artwork.description && (
        <div className="px-6 py-4 text-gray-500 text-sm text-center border-t border-gray-800">
          {artwork.description}
        </div>
      )}
    </div>
  );
}
