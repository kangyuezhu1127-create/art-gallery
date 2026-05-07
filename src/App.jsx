import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import LandingPage from './pages/LandingPage';
import SelectionPage from './pages/SelectionPage';
import GalleryRoomPage from './pages/GalleryRoomPage';
import ViewerPage from './pages/ViewerPage';
import { fetchArtworks, updateArtworkDB, deleteArtwork } from './lib/artworkService';

export default function App() {
  const [artworks, setArtworks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArtworks()
      .then(setArtworks)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const addArtwork = (artwork) => {
    setArtworks((prev) => [artwork, ...prev]);
  };

  const updateArtwork = (id, patch, persist = false) => {
    setArtworks((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...patch } : a))
    );
    if (persist) {
      updateArtworkDB(id, patch).catch(console.error);
    }
  };

  const replaceArtwork = (updated) => {
    setArtworks((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  };

  const removeArtwork = (id) => {
    setArtworks((prev) => prev.filter((a) => a.id !== id));
    deleteArtwork(id).catch(console.error);
  };

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/enter" element={<SelectionPage artworks={artworks} />} />
          <Route
            path="/gallery"
            element={
              <GalleryRoomPage
                artworks={artworks}
                loading={loading}
                onAdd={addArtwork}
                onUpdate={updateArtwork}
                onSave={replaceArtwork}
                onDelete={removeArtwork}
              />
            }
          />
          <Route
            path="/artwork/:id"
            element={<ViewerPage artworks={artworks} onUpdate={updateArtwork} />}
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
