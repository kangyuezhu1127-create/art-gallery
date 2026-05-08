import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function IconEdit() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

export default function ArtworkCard({ artwork, onEdit, onDelete }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [confirming, setConfirming] = useState(false);

  const has3D = !!artwork.depthMapURL;
  const isError =
    artwork.depthStatus?.startsWith('Generation failed') ||
    artwork.depthStatus?.startsWith('Timeout') ||
    artwork.depthStatus?.startsWith('Worker');
  const isOwner = user && user.id === artwork.userId;

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
              {artwork.depthStatus || 'Generating…'}
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
              View in 3D →
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
          <div className="shrink-0 flex items-center gap-1.5">
            {has3D && !confirming && (
              <button
                onClick={() => navigate(`/artwork/${artwork.id}`)}
                className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
              >
                View 3D
              </button>
            )}
            {isOwner && !confirming && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(artwork); }}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100 px-2 py-1.5 rounded-lg transition-colors"
                >
                  <IconEdit />
                  <span>Edit</span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirming(true); }}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 px-2 py-1.5 rounded-lg transition-colors"
                >
                  <IconTrash />
                  <span>Delete</span>
                </button>
              </>
            )}
            {isOwner && confirming && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500 whitespace-nowrap">Confirm delete?</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirming(false); }}
                  className="text-xs px-2.5 py-1.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(artwork.id); }}
                  className="text-xs px-2.5 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
