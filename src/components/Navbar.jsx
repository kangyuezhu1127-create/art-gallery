export default function Navbar({ onUpload }) {
  return (
    <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="/" className="text-xl font-semibold tracking-tight text-gray-900">
          Depth Gallery
        </a>
        <button
          onClick={onUpload}
          className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
        >
          上传作品
        </button>
      </div>
    </nav>
  );
}
