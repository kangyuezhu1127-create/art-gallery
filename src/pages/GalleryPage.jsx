import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import Navbar from '../components/Navbar';
import ArtworkCard from '../components/ArtworkCard';
import UploadModal from '../components/UploadModal';
import AuthModal from '../components/AuthModal';
import { useAuth } from '../contexts/AuthContext';

export default function GalleryPage({ artworks, loading, onAdd, onUpdate }) {
  const { user } = useAuth();
  const [showUpload, setShowUpload] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  const handleUploadClick = () => {
    if (user) setShowUpload(true);
    else setShowAuth(true);
  };

  return (
    <div className="min-h-screen bg-[#fafaf8]">
      <Helmet>
        <title>Depth Gallery | 3D 艺术展览</title>
        <meta name="description" content="上传你的 2D 作品，AI 自动生成深度图，用 3D 视角立体欣赏每一幅画" />
        <meta property="og:title" content="Depth Gallery" />
        <meta property="og:description" content="AI 驱动的 3D 艺术展览平台" />
        <meta property="og:type" content="website" />
      </Helmet>

      <Navbar onUpload={handleUploadClick} onLogin={() => setShowAuth(true)} />

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-6 pt-16 pb-12 text-center">
        <h1 className="text-5xl font-light tracking-tight text-gray-900 mb-4">
          Art in <span className="italic">Three Dimensions</span>
        </h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto">
          上传你的 2D 作品，AI 自动生成深度信息，让每一幅画都可以被立体观看
        </p>
        <button
          onClick={handleUploadClick}
          className="mt-8 px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-700 transition-colors"
        >
          {user ? '上传作品' : '登录后上传'}
        </button>
      </div>

      {/* Gallery grid */}
      <div className="max-w-6xl mx-auto px-6 pb-20">
        {loading ? (
          <div className="text-center py-24 text-gray-300">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-4" />
            <p>加载中...</p>
          </div>
        ) : artworks.length === 0 ? (
          <div className="text-center py-24 text-gray-300">
            <div className="text-6xl mb-4">🎨</div>
            <p className="text-xl">暂无作品，快来上传第一件吧</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {artworks.map((artwork) => (
              <ArtworkCard key={artwork.id} artwork={artwork} />
            ))}
          </div>
        )}
      </div>

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onAdd={onAdd}
          onUpdate={onUpdate}
        />
      )}
      {showAuth && (
        <AuthModal onClose={() => setShowAuth(false)} />
      )}
    </div>
  );
}
