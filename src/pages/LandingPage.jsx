import { Link } from 'react-router-dom';

const serif = "'Cormorant Garamond', serif";

export default function LandingPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#fafaf8',
        display: 'flex',
        flexDirection: 'column',
        padding: '2.5rem 8vw',
      }}
    >
      {/* Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.72rem',
          letterSpacing: '0.12em',
          color: '#1a1a1a',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <svg width="18" height="16" viewBox="0 0 18 16" fill="none" aria-hidden>
            <path d="M9 1L17 15H1L9 1Z" stroke="#1a1a1a" strokeWidth="1.2" fill="none" />
          </svg>
          <span>DEPTH GALLERY — VOL. III</span>
        </div>
        <span>MMXXVI · ROOM 01 OF 12</span>
      </header>

      {/* Main content */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          maxWidth: '900px',
        }}
      >
        <h1
          style={{
            fontFamily: serif,
            fontSize: 'clamp(4rem, 9vw, 9.5rem)',
            lineHeight: 1.05,
            fontWeight: 400,
            color: '#1a1a1a',
            marginBottom: '2rem',
          }}
        >
          <em style={{ fontStyle: 'italic' }}>A walk-in</em>{' '}
          <span style={{ fontStyle: 'normal', color: '#999', fontWeight: 300 }}>volume,</span>
          <br />
          <em style={{ fontStyle: 'italic' }}>not a wall.</em>
        </h1>

        <p
          style={{
            maxWidth: '460px',
            lineHeight: 1.7,
            color: '#555',
            marginBottom: '2.5rem',
            fontSize: '1rem',
          }}
        >
          A curated gallery built in real-time 3D. Upload your artwork, explore
          it with spatial depth, and share what you create. Your collection
          persists.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
          <Link
            to="/gallery"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.75rem',
              background: '#1a1a1a',
              color: '#fff',
              padding: '1rem 2.25rem',
              borderRadius: '9999px',
              textDecoration: 'none',
              fontSize: '0.72rem',
              letterSpacing: '0.14em',
              fontWeight: 600,
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#444')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#1a1a1a')}
          >
            ENTER THE GALLERY <span style={{ fontSize: '1rem', fontWeight: 400 }}>→</span>
          </Link>
          <span
            style={{
              fontSize: '0.68rem',
              letterSpacing: '0.1em',
              color: '#aaa',
            }}
          >
            CLICK ART TO VIEW IN 3D · DRAG TO EXPLORE
          </span>
        </div>
      </main>
    </div>
  );
}
