import { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { TransitionProvider } from './contexts/TransitionContext';
import LandingPage from './pages/LandingPage';
import SelectionPage from './pages/SelectionPage';
import GalleryRoomPage from './pages/GalleryRoomPage';
import ViewerPage from './pages/ViewerPage';
import AccountPage from './pages/AccountPage';
import AboutPage from './pages/AboutPage';
import { fetchArtworks, updateArtworkDB, deleteArtwork } from './lib/artworkService';

/*
 * Crossfade wrapper — keeps the LEAVING page visible while the ENTERING page
 * initialises underneath, then swaps with a smooth opacity transition.
 * Using displayLocation so both pages never render simultaneously with opacity > 0.
 * The full-viewport wrapper ensures position:fixed children still hit the viewport.
 */
function FadeRoutes({ children }) {
  const location = useLocation();
  const [displayLoc, setDisplayLoc] = useState(location);
  const [visible,    setVisible]    = useState(true);
  const prevKey = useRef(location.key);
  const timer   = useRef(null);

  useEffect(() => {
    if (location.key === prevKey.current) return;
    prevKey.current = location.key;
    clearTimeout(timer.current);

    setVisible(false);                              // fade out current page (180ms)
    timer.current = setTimeout(() => {
      setDisplayLoc(location);                     // swap route while invisible
      setVisible(true);                            // fade new page in (280ms)
    }, 180);

    return () => clearTimeout(timer.current);
  }, [location.key]);

  return (
    <div style={{
      width: '100vw', minHeight: '100vh',
      opacity: visible ? 1 : 0,
      transition: visible ? 'opacity 0.28s ease' : 'opacity 0.18s ease',
    }}>
      <Routes location={displayLoc}>
        {children}
      </Routes>
    </div>
  );
}

export default function App() {
  const [artworks, setArtworks] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    fetchArtworks()
      .then(setArtworks)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const addArtwork     = (a)       => setArtworks(p => [a, ...p]);
  const replaceArtwork = (updated) => setArtworks(p => p.map(a => a.id === updated.id ? updated : a));
  const removeArtwork  = (id)      => {
    setArtworks(p => p.filter(a => a.id !== id));
    deleteArtwork(id).catch(console.error);
  };
  const updateArtwork  = (id, patch, persist = false) => {
    setArtworks(p => p.map(a => a.id === id ? { ...a, ...patch } : a));
    if (persist) updateArtworkDB(id, patch).catch(console.error);
  };

  return (
    <AuthProvider>
      <BrowserRouter>
        <TransitionProvider>
          <FadeRoutes>
            <Route path="/"        element={<LandingPage />} />
            <Route path="/enter"   element={<SelectionPage artworks={artworks} />} />
            <Route path="/gallery" element={
              <GalleryRoomPage
                artworks={artworks} loading={loading}
                onAdd={addArtwork} onUpdate={updateArtwork}
                onSave={replaceArtwork} onDelete={removeArtwork}
              />
            } />
            <Route path="/artwork/:id" element={
              <ViewerPage artworks={artworks} onUpdate={updateArtwork} />
            } />
            <Route path="/account" element={
              <AccountPage artworks={artworks} onSave={replaceArtwork} onDelete={removeArtwork} />
            } />
            <Route path="/about" element={<AboutPage />} />
          </FadeRoutes>
        </TransitionProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}
