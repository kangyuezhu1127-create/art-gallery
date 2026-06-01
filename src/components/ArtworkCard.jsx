import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Butterfly } from './decorations/Papercut';

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

/**
 * ArtworkCard — papercut-aesthetic interactive card.
 *
 * Props:
 *   artwork: data
 *   tilt: degrees (-3 ~ +3) for masonry tilt look (default 0)
 *   onEdit, onDelete: handlers
 *   index: for staggered entrance animation
 */
export default function ArtworkCard({ artwork, tilt = 0, index = 0, onEdit, onDelete }) {
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
    <div
      className="group relative animate-riseIn"
      style={{
        transform: `rotate(${tilt}deg)`,
        animationDelay: `${index * 60}ms`,
        transition: 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      {/* Hover-only: card straightens & lifts */}
      <div
        className="bg-white rounded-2xl overflow-hidden border border-ink/10 shadow-[0_2px_8px_rgba(10,10,10,0.04)] transition-all duration-500 group-hover:shadow-[0_18px_40px_rgba(10,10,10,0.12)] group-hover:-translate-y-2"
        style={{ transition: 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.5s ease' }}
        onMouseEnter={(e) => { e.currentTarget.parentElement.style.transform = 'rotate(0deg)'; }}
        onMouseLeave={(e) => { e.currentTarget.parentElement.style.transform = `rotate(${tilt}deg)`; }}
      >
        {/* Image */}
        <div
          className={`relative overflow-hidden bg-ink/5 ${has3D ? 'cursor-pointer' : 'cursor-default'}`}
          style={{ aspectRatio: artwork.aspectRatio || '4/3' }}
          onClick={() => has3D && navigate(`/artwork/${artwork.id}`)}
        >
          <img
            src={artwork.originalURL}
            alt={artwork.title}
            className={`w-full h-full object-cover transition-transform duration-700 ${has3D ? 'group-hover:scale-110' : ''}`}
          />

          {/* Processing overlay */}
          {!has3D && !isError && (
            <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <p className="text-white text-xs text-center px-4 leading-tight">
                {artwork.depthStatus || 'Generating…'}
              </p>
            </div>
          )}

          {/* Error overlay */}
          {isError && (
            <div className="absolute inset-0 bg-papercut/80 flex items-center justify-center px-4">
              <p className="text-white text-xs text-center">{artwork.depthStatus}</p>
            </div>
          )}

          {/* Hover CTA */}
          {has3D && (
            <div className="absolute inset-0 flex items-end justify-start p-4 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <span className="bg-white text-ink text-xs tracking-[0.18em] uppercase font-semibold px-4 py-2 rounded-full shadow-md">
                Enter 3D →
              </span>
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="px-5 py-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-display font-bold text-ink truncate text-[1.05rem] transition-colors duration-300 group-hover:text-papercut">
                {artwork.title}
              </h3>
              <p className="font-cn text-sm text-ink/55 mt-0.5 truncate">
                {artwork.artist}
                {artwork.year && <span className="text-ink/35"> · {artwork.year}</span>}
              </p>
            </div>

            {/* Owner controls */}
            <div className="shrink-0 flex items-center gap-1">
              {isOwner && !confirming && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(artwork); }}
                    title="Edit"
                    className="p-1.5 text-ink/40 hover:text-ink hover:bg-ink/5 rounded-lg transition-colors"
                  >
                    <IconEdit />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirming(true); }}
                    title="Delete"
                    className="p-1.5 text-ink/40 hover:text-papercut hover:bg-papercut/10 rounded-lg transition-colors"
                  >
                    <IconTrash />
                  </button>
                </>
              )}
              {isOwner && confirming && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirming(false); }}
                    className="text-xs px-2 py-1 text-ink/60 rounded hover:bg-ink/5"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(artwork.id); }}
                    className="text-xs px-2 py-1 bg-papercut text-white rounded hover:bg-papercut/85"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Decorative butterfly that flies out on hover */}
      <Butterfly
        size={44}
        className="absolute -top-3 -right-3 text-papercut opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:-translate-y-4 group-hover:translate-x-2 group-hover:rotate-12 pointer-events-none"
        style={{ transform: 'rotate(15deg)' }}
      />
    </div>
  );
}
