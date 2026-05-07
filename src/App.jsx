import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import GalleryPage from './pages/GalleryPage';
import ViewerPage from './pages/ViewerPage';
import { fetchArtworks, updateArtworkDB } from './lib/artworkService';

export default function App() {
  const [artworks, setArtworks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArtworks()
      .then(setArtworks)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Optimistic local add — called right after DB insert
  const addArtwork = (artwork) => {
    setArtworks((prev) => [artwork, ...prev]);
  };

  // persist=true → also writes to Supabase DB (used for final depth map result)
  // persist=false → local state only (used for progress messages)
  const updateArtwork = (id, patch, persist = false) => {
    setArtworks((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...patch } : a))
    );
    if (persist) {
      updateArtworkDB(id, patch).catch(console.error);
    }
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <GalleryPage
              artworks={artworks}
              loading={loading}
              onAdd={addArtwork}
              onUpdate={updateArtwork}
            />
          }
        />
        <Route
          path="/artwork/:id"
          element={<ViewerPage artworks={artworks} onUpdate={updateArtwork} />}
        />
      </Routes>
    </BrowserRouter>
  );
}
