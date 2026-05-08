import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import EditModal from '../components/EditModal';

export default function AccountPage({ artworks, onSave, onDelete }) {
  const navigate = useNavigate();
  const { user, authLoading, signOut } = useAuth();

  const [editTarget,    setEditTarget]    = useState(null);
  const [deleteTarget,  setDeleteTarget]  = useState(null); // artwork id
  const [deleting,      setDeleting]      = useState(false);
  const [editingName,   setEditingName]   = useState(false);
  const [nameInput,     setNameInput]     = useState('');
  const [nameSaving,    setNameSaving]    = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate('/enter');
  }, [user, authLoading, navigate]);

  if (authLoading || !user) return null;

  const displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'User';
  const initial     = displayName[0].toUpperCase();
  const myArtworks  = artworks.filter((a) => a.userId === user.id);

  const handleSignOut = async () => {
    await signOut();
    navigate('/enter');
  };

  const startEditName = () => { setNameInput(displayName); setEditingName(true); };

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === displayName) { setEditingName(false); return; }
    setNameSaving(true);
    await supabase.auth.updateUser({ data: { display_name: trimmed } });
    setNameSaving(false);
    setEditingName(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await onDelete(deleteTarget);
    setDeleting(false);
    setDeleteTarget(null);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa' }}>

      {/* ── top bar ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(250,250,250,0.96)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        padding: '1rem 2rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button onClick={() => navigate('/gallery')} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#999', fontSize: '0.68rem', letterSpacing: '0.16em',
        }}>
          ← GALLERY
        </button>
        <span style={{ fontSize: '0.68rem', letterSpacing: '0.22em', color: '#444' }}>MY ACCOUNT</span>
        <button onClick={handleSignOut} style={{
          background: 'none', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '99px',
          cursor: 'pointer', color: '#888', fontSize: '0.65rem', letterSpacing: '0.12em',
          padding: '0.3rem 0.85rem',
        }}>
          SIGN OUT
        </button>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '3rem 2rem 5rem' }}>

        {/* ── profile card ── */}
        <section style={{
          background: '#fff', borderRadius: '16px',
          border: '1px solid rgba(0,0,0,0.07)',
          boxShadow: '0 2px 16px rgba(0,0,0,0.05)',
          padding: '2rem', marginBottom: '3rem',
          display: 'flex', alignItems: 'center', gap: '1.75rem',
        }}>
          {/* avatar */}
          <div style={{
            width: '4.5rem', height: '4.5rem', borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #c8a455 0%, #7c5e1a 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.6rem', color: '#fff', fontWeight: 300,
            boxShadow: '0 4px 16px rgba(200,164,85,0.35)',
          }}>
            {initial}
          </div>

          <div style={{ flex: 1 }}>
            {/* display name */}
            {editingName ? (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem' }}>
                <input
                  autoFocus
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter')  handleSaveName();
                    if (e.key === 'Escape') setEditingName(false);
                  }}
                  style={{
                    border: '1px solid #d0b870', borderRadius: '8px',
                    padding: '0.35rem 0.7rem', fontSize: '1.05rem',
                    outline: 'none', width: '13rem',
                  }}
                />
                <button
                  onClick={handleSaveName}
                  disabled={nameSaving}
                  style={{
                    background: '#111', color: '#fff', border: 'none',
                    borderRadius: '8px', padding: '0.38rem 0.8rem',
                    fontSize: '0.65rem', letterSpacing: '0.1em', cursor: 'pointer',
                    opacity: nameSaving ? 0.5 : 1,
                  }}
                >
                  {nameSaving ? '…' : 'SAVE'}
                </button>
                <button
                  onClick={() => setEditingName(false)}
                  style={{
                    background: 'none', color: '#aaa',
                    border: '1px solid #e0e0e0', borderRadius: '8px',
                    padding: '0.38rem 0.7rem',
                    fontSize: '0.65rem', letterSpacing: '0.1em', cursor: 'pointer',
                  }}
                >
                  CANCEL
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 300, color: '#111' }}>{displayName}</span>
                <button
                  onClick={startEditName}
                  title="Edit name"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#ccc', fontSize: '0.8rem', lineHeight: 1, padding: '2px',
                  }}
                >
                  ✎
                </button>
              </div>
            )}

            <p style={{ fontSize: '0.78rem', color: '#aaa', margin: 0 }}>{user.email}</p>
          </div>

          {/* stats */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ fontSize: '1.5rem', fontWeight: 300, color: '#111', margin: '0 0 0.1rem' }}>
              {myArtworks.length}
            </p>
            <p style={{ fontSize: '0.65rem', letterSpacing: '0.14em', color: '#bbb', margin: 0 }}>WORKS</p>
          </div>
        </section>

        {/* ── my works ── */}
        <section>
          <h2 style={{
            fontSize: '0.68rem', letterSpacing: '0.22em', color: '#888',
            margin: '0 0 1.5rem', fontWeight: 400,
          }}>
            MY WORKS
          </h2>

          {myArtworks.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '5rem 0',
              color: '#ccc', fontSize: '0.78rem', letterSpacing: '0.14em',
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.4 }}>🖼</div>
              No works uploaded yet
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
              gap: '1.25rem',
            }}>
              {myArtworks.map((art) => (
                <ArtworkCard
                  key={art.id}
                  art={art}
                  onView={() => navigate(`/artwork/${art.id}`)}
                  onEdit={() => setEditTarget(art)}
                  onDelete={() => setDeleteTarget(art.id)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── edit modal ── */}
      {editTarget && (
        <EditModal
          artwork={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={(updated) => { onSave(updated); setEditTarget(null); }}
        />
      )}

      {/* ── delete confirm ── */}
      {deleteTarget && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 60,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: '#fff', borderRadius: '18px',
            padding: '2rem 2rem 1.5rem', maxWidth: '320px', width: '90%',
            textAlign: 'center',
            boxShadow: '0 24px 48px rgba(0,0,0,0.18)',
          }}>
            <p style={{ fontSize: '0.9rem', color: '#222', margin: '0 0 0.45rem', fontWeight: 400 }}>
              Are you sure you want to delete this artwork?
            </p>
            <p style={{ fontSize: '0.73rem', color: '#bbb', margin: '0 0 1.75rem' }}>
              This action cannot be undone
            </p>
            <div style={{ display: 'flex', gap: '0.7rem' }}>
              <button
                onClick={() => setDeleteTarget(null)}
                style={{
                  flex: 1, padding: '0.65rem',
                  background: '#f4f4f4', color: '#666',
                  border: 'none', borderRadius: '10px', cursor: 'pointer',
                  fontSize: '0.78rem',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  flex: 1, padding: '0.65rem',
                  background: '#d94040', color: '#fff',
                  border: 'none', borderRadius: '10px', cursor: 'pointer',
                  fontSize: '0.78rem', opacity: deleting ? 0.6 : 1,
                }}
              >
                {deleting ? 'Deleting…' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ArtworkCard({ art, onView, onEdit, onDelete }) {
  const [hover, setHover] = useState(false);

  return (
    <div
      style={{
        background: '#fff', borderRadius: '12px', overflow: 'hidden',
        border: '1px solid rgba(0,0,0,0.07)',
        boxShadow: hover
          ? '0 8px 24px rgba(0,0,0,0.12)'
          : '0 2px 10px rgba(0,0,0,0.05)',
        transition: 'box-shadow 0.2s',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* thumbnail */}
      <div
        onClick={onView}
        style={{
          aspectRatio: '1 / 1', overflow: 'hidden',
          background: '#f0f0f0', cursor: 'pointer', position: 'relative',
        }}
      >
        <img
          src={art.originalURL}
          alt={art.title}
          style={{
            width: '100%', height: '100%', objectFit: 'cover', display: 'block',
            transform: hover ? 'scale(1.04)' : 'scale(1)',
            transition: 'transform 0.35s ease',
          }}
        />
      </div>

      {/* info + actions */}
      <div style={{ padding: '0.85rem 0.95rem 0.8rem' }}>
        <p style={{
          fontSize: '0.82rem', fontWeight: 500, color: '#1a1a1a',
          margin: '0 0 0.12rem',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {art.title}
        </p>
        {(art.artist || art.year) && (
          <p style={{ fontSize: '0.68rem', color: '#aaa', margin: '0 0 0.8rem' }}>
            {[art.artist, art.year].filter(Boolean).join(' · ')}
          </p>
        )}

        <div style={{ display: 'flex', gap: '0.45rem' }}>
          <button
            onClick={onEdit}
            style={{
              flex: 1, padding: '0.38rem 0',
              fontSize: '0.62rem', letterSpacing: '0.1em',
              background: '#f6f6f6', color: '#555',
              border: 'none', borderRadius: '6px', cursor: 'pointer',
            }}
          >
            EDIT
          </button>
          <button
            onClick={onDelete}
            style={{
              flex: 1, padding: '0.38rem 0',
              fontSize: '0.62rem', letterSpacing: '0.1em',
              background: '#fff4f4', color: '#c04040',
              border: '1px solid #f0d8d8', borderRadius: '6px', cursor: 'pointer',
            }}
          >
            DELETE
          </button>
        </div>
      </div>
    </div>
  );
}
