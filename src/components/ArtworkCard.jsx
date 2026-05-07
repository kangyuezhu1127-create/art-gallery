import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ArtworkCard({ artwork, onEdit, onDelete }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const has3D = !!artwork.depthMapURL;
  const isError = artwork.depthStatus?.startsWith('生成失败') || artwork.depthStatus?.startsWith('超时') || artwork.depthStatus?.startsWith('Worker');
  const isOwner = user && user.id === artwork.userId;

  const handleDelete = (e) => {
    e.stopPropagation();
    if (!confirmDelete) { setConfirmDelete(true); return; }
    onDelete(artwork.id);
  };

  return (
    <div className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100">
      <div
        className={`relative overflow-hidden ${has3D ? 'cursor-pointer' : 'cursor-default'}`}
        style={{ aspectRatio: artwork.aspectRatio || '4/3' }}
        onClick={() => has3D && navigate(`/artwork/${artwork.id}`)}
      >
        <img
          src={artwork.originalURL}
          alt={artwork.title}
          className={`w-full h-full object-cover transition-transform duration-500 ${has3D ? 'group-hover:scale-105' : ''}`}
        />

        {!has3D && !isError && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <p className="text-white text-xs text-center px-4 leading-tight">
              {artwork.depthStatus || '生成中...'}
            </p>
          </div>
        )}

        {isError && (
          <div className="absolute inset-0 bg-red-900/60 flex items-center justify-center px-4">
            <p className="text-white text-xs text-center">{artwork.depthStatus}</p>
          </div>
        )}

        {has3D && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <span className="bg-white text-gray-900 text-sm font-medium px-5 py-2 rounded-full shadow-lg">
              点击查看 3D →
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{artwork.title}</h3>
            <p className="text-sm text-gray-500 mt-0.5 truncate">{artwork.artist}</p>
            {artwork.year && <p className="text-xs text-gray-400 mt-0.5">{artwork.year}</p>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {has3D && (
              <button
                onClick={() => navigate(`/artwork/${artwork.id}`)}
                className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
              >
                3D 查看
              </button>
            )}
            {isOwner && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(artwork); }}
                  title="编辑"
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors text-base"
                >
                  ✏️
                </button>
                <button
                  onClick={handleDelete}
                  onBlur={() => setConfirmDelete(false)}
                  title={confirmDelete ? '再次点击确认删除' : '删除'}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors text-base ${
                    confirmDelete
                      ? 'bg-red-100 text-red-600'
                      : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                  }`}
                >
                  🗑️
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
