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

function startDepthGeneration(artworkId, previewURL, onUpdate) {
  resizeImageDataURL(previewURL, 512).then((resizedURL) => {
    const worker = new DepthWorker();

    const timeout = setTimeout(() => {
      onUpdate(artworkId, { depthStatus: '超时，请重试' }, false);
      worker.terminate();
    }, 5 * 60 * 1000);

    worker.addEventListener('message', async (ev) => {
      const { type, message, depthInfo } = ev.data;

      if (type === 'progress') {
        onUpdate(artworkId, { depthStatus: message }, false);
      } else if (type === 'result') {
        clearTimeout(timeout);
        try {
          const depthDataURL = depthInfoToDataURL(depthInfo);
          const depthBlob = dataURLtoBlob(depthDataURL);
          const depthMapURL = await uploadFile(`${artworkId}/depth.png`, depthBlob, 'image/png');
          onUpdate(artworkId, { depthMapURL, depthStatus: '完成' }, true);
        } catch (err) {
          onUpdate(artworkId, { depthStatus: `上传失败：${err.message}` }, false);
        }
        worker.terminate();
      } else if (type === 'error') {
        clearTimeout(timeout);
        onUpdate(artworkId, { depthStatus: `生成失败：${message}` }, false);
        worker.terminate();
      }
    });

    worker.addEventListener('error', (err) => {
      clearTimeout(timeout);
      onUpdate(artworkId, { depthStatus: `Worker 错误：${err.message}` }, false);
      worker.terminate();
    });

    worker.postMessage({ imageDataURL: resizedURL });
  });
}

export default function UploadModal({ onClose, onAdd, onUpdate }) {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [previewURL, setPreviewURL] = useState(null);
  const [originalPreviewURL, setOriginalPreviewURL] = useState(null);
  const [bgRemoved, setBgRemoved] = useState(false);
  const [bgRemoving, setBgRemoving] = useState(false);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [year, setYear] = useState('');
  const [description, setDescription] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const fileInputRef = useRef(null);
  const processedBlobRef = useRef(null);

  const handleFile = (f) => {
    if (!f || !f.type.startsWith('image/')) return;
    setFile(f);
    setBgRemoved(false);
    processedBlobRef.current = null;
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewURL(e.target.result);
      setOriginalPreviewURL(e.target.result);
    };
    reader.readAsDataURL(f);
  };

  const handleRemoveBg = async () => {
    if (!file || bgRemoving) return;
    setBgRemoving(true);
    try {
      const { removeBackground } = await import('@imgly/background-removal');
      const blob = await removeBackground(file, { model: 'small' });
      processedBlobRef.current = blob;
      const url = URL.createObjectURL(blob);
      setPreviewURL(url);
      setBgRemoved(true);
    } catch (err) {
      console.error('Background removal failed:', err);
    } finally {
      setBgRemoving(false);
    }
  };

  const handleRestoreOriginal = () => {
    setPreviewURL(originalPreviewURL);
    setBgRemoved(false);
    processedBlobRef.current = null;
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
      const uploadBlob = processedBlobRef.current
        ? processedBlobRef.current
        : dataURLtoBlob(previewURL);
      const uploadMime = processedBlobRef.current ? 'image/png' : file.type;
      const ext = uploadMime === 'image/png' ? 'png' : 'jpg';

      const { width, height } = await getImageDimensions(previewURL);
      const aspectRatio = width / height;
      const id = crypto.randomUUID();

      const originalURL = await uploadFile(`${id}/original.${ext}`, uploadBlob, uploadMime);

      setUploadStatus('保存到数据库...');
      const uploaderName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || '';
      const artwork = await insertArtwork({ id, title, artist, year, description, originalURL, aspectRatio, userId: user.id, uploaderName });

      onAdd(artwork);
      onClose();

      startDepthGeneration(id, previewURL, onUpdate);

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
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">✕</button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Drop zone */}
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
              <div
                className="relative max-h-48 mx-auto"
                style={{ display: 'inline-block' }}
              >
                <img
                  src={previewURL}
                  alt="preview"
                  className="max-h-48 rounded-lg object-contain"
                  style={bgRemoved ? { background: 'repeating-conic-gradient(#e5e7eb 0% 25%, white 0% 50%) 0 0 / 12px 12px' } : {}}
                />
                {bgRemoved && (
                  <span className="absolute top-1.5 right-1.5 bg-green-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                    已抠图
                  </span>
                )}
              </div>
            ) : (
              <div className="text-gray-400 space-y-2">
                <div className="text-4xl">🖼️</div>
                <p className="text-sm">拖拽图片到此处，或点击选择</p>
                <p className="text-xs">支持 JPG、PNG、WebP</p>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => handleFile(e.target.files[0])} />
          </div>

          {/* Background removal controls */}
          {file && !isProcessing && (
            <div className="flex items-center gap-2">
              {!bgRemoved ? (
                <button
                  type="button"
                  onClick={handleRemoveBg}
                  disabled={bgRemoving}
                  className="flex items-center gap-2 text-sm px-4 py-2 border border-gray-200 rounded-lg hover:border-gray-900 hover:text-gray-900 text-gray-500 transition-colors disabled:opacity-50"
                >
                  {bgRemoving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      <span>抠图中（首次需下载模型）...</span>
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22C6.5 22 2 17.5 2 12S6.5 2 12 2s10 4.5 10 10" />
                        <path d="M15 2.5c0 4.5-3 7-3 9.5" />
                        <path d="M2.5 9h19" />
                        <path d="M22 12l-4 4 4 4" />
                      </svg>
                      <span>AI 去除背景</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRestoreOriginal}
                  className="flex items-center gap-2 text-sm px-4 py-2 border border-gray-200 rounded-lg hover:border-gray-900 hover:text-gray-900 text-gray-500 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                  <span>恢复原图</span>
                </button>
              )}
            </div>
          )}

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
            <button type="submit" disabled={!file || !title}
              className="w-full py-3 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              上传并生成 3D
            </button>
          )}
          <p className="text-xs text-gray-400 text-center">
            首次生成会下载约 50MB AI 模型，之后浏览器缓存，速度很快
          </p>
        </form>
      </div>
    </div>
  );
}
