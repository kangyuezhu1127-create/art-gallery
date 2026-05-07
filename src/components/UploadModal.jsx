import { useState, useRef, useCallback } from 'react';
import DepthWorker from '../workers/depth.worker.js?worker';
import { getImageDimensions, depthInfoToDataURL, dataURLtoBlob } from '../utils/depthUtils';
import { insertArtwork, uploadFile } from '../lib/artworkService';
import { useAuth } from '../contexts/AuthContext';

function resizeImageDataURL(dataURL, maxPx = 512) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(maxPx / img.width, maxPx / img.height, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.src = dataURL;
  });
}

export default function UploadModal({ onClose, onAdd, onUpdate }) {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [previewURL, setPreviewURL] = useState(null);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [year, setYear] = useState('');
  const [description, setDescription] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const fileInputRef = useRef(null);

  const handleFile = (f) => {
    if (!f || !f.type.startsWith('image/')) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setPreviewURL(e.target.result);
    reader.readAsDataURL(f);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !previewURL || !title) return;

    setIsProcessing(true);
    setUploadStatus('上传图片中...');

    try {
      const { width, height } = await getImageDimensions(previewURL);
      const aspectRatio = width / height;
      const id = crypto.randomUUID();

      // Upload original image to Supabase Storage
      const imageBlob = dataURLtoBlob(previewURL);
      const ext = file.type === 'image/png' ? 'png' : 'jpg';
      const originalURL = await uploadFile(`${id}/original.${ext}`, imageBlob, file.type);

      setUploadStatus('保存到数据库...');

      const uploaderName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || '';

      // Insert artwork record
      const artwork = await insertArtwork({ id, title, artist, year, description, originalURL, aspectRatio, userId: user.id, uploaderName });
      onAdd(artwork);
      onClose();

      // Resize for AI inference
      const resizedURL = await resizeImageDataURL(previewURL, 512);

      // Start depth estimation in worker
      const worker = new DepthWorker();

      const timeout = setTimeout(() => {
        onUpdate(id, { depthStatus: '超时，请重试' }, true);
        worker.terminate();
      }, 4 * 60 * 1000);

      worker.addEventListener('message', async (ev) => {
        const { type, message, depthInfo } = ev.data;

        if (type === 'progress') {
          onUpdate(id, { depthStatus: message }, false);
        } else if (type === 'result') {
          clearTimeout(timeout);
          try {
            // Upload depth map to Supabase Storage
            const depthDataURL = depthInfoToDataURL(depthInfo);
            const depthBlob = dataURLtoBlob(depthDataURL);
            const depthMapURL = await uploadFile(`${id}/depth.png`, depthBlob, 'image/png');
            onUpdate(id, { depthMapURL, depthStatus: '完成' }, true);
          } catch (err) {
            onUpdate(id, { depthStatus: `上传失败：${err.message}` }, true);
          }
          worker.terminate();
        } else if (type === 'error') {
          clearTimeout(timeout);
          onUpdate(id, { depthStatus: `生成失败：${message}` }, true);
          worker.terminate();
        }
      });

      worker.addEventListener('error', (err) => {
        clearTimeout(timeout);
        onUpdate(id, { depthStatus: `Worker 错误：${err.message}` }, true);
        worker.terminate();
      });

      worker.postMessage({ imageDataURL: resizedURL });

    } catch (err) {
      setUploadStatus(`错误：${err.message}`);
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">上传作品</h2>
          {!isProcessing && (
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
            >
              ✕
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              isDragging ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-400'
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {previewURL ? (
              <img src={previewURL} alt="preview" className="max-h-48 mx-auto rounded-lg object-contain" />
            ) : (
              <div className="text-gray-400 space-y-2">
                <div className="text-4xl">🖼️</div>
                <p className="text-sm">拖拽图片到此处，或点击选择</p>
                <p className="text-xs">支持 JPG、PNG、WebP</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files[0])}
            />
          </div>

          <div className="space-y-3">
            <input required value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="作品标题 *"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-900 transition-colors" />
            <input value={artist} onChange={(e) => setArtist(e.target.value)}
              placeholder="艺术家姓名"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-900 transition-colors" />
            <input value={year} onChange={(e) => setYear(e.target.value)}
              placeholder="创作年份"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-900 transition-colors" />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="作品描述" rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-900 transition-colors resize-none" />
          </div>

          {isProcessing ? (
            <div className="flex items-center gap-3 py-3 px-4 bg-gray-50 rounded-xl">
              <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin shrink-0" />
              <p className="text-sm text-gray-600">{uploadStatus}</p>
            </div>
          ) : (
            <button
              type="submit"
              disabled={!file || !title}
              className="w-full py-3 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              上传并生成 3D
            </button>
          )}

          <p className="text-xs text-gray-400 text-center">
            首次生成需下载约 50MB 模型，之后浏览器缓存，速度很快
          </p>
        </form>
      </div>
    </div>
  );
}
