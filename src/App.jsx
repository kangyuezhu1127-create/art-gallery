import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { TransitionProvider } from './contexts/TransitionContext';
import LandingPage from './pages/LandingPage';
import SelectionPage from './pages/SelectionPage';
import GalleryRoomPage from './pages/GalleryRoomPage';
import ViewerPage from './pages/ViewerPage';
import AccountPage from './pages/AccountPage';
import { fetchArtworks, updateArtworkDB, deleteArtwork } from './lib/artworkService';

export default function App() {
  const [artworks, setArtworks] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    fetchArtworks()
      .then(setArtworks)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const addArtwork     = (a)        => setArtworks(p => [a, ...p]);
  const replaceArtwork = (updated)  => setArtworks(p => p.map(a => a.id === updated.id ? updated : a));
  const removeArtwork  = (id)       => {
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
        {/* TransitionProvider is inside BrowserRouter so hooks work; its overlay persists across routes */}
        <TransitionProvider>
          <Routes>
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
          </Routes>
        </TransitionProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}
