import { useState } from 'react';
import { updateArtworkMeta } from '../lib/artworkService';

export default function EditModal({ artwork, onClose, onSave }) {
  const [title, setTitle] = useState(artwork.title || '');
  const [artist, setArtist] = useState(artwork.artist || '');
  const [year, setYear] = useState(artwork.year || '');
  const [description, setDescription] = useState(artwork.description || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title) return;
    setSaving(true);
    setError('');
    try {
      const updated = await updateArtworkMeta(artwork.id, { title, artist, year, description });
      onSave(updated);
      onClose();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Edit Artwork</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-3">
          <input required value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Artwork Title *"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-900 transition-colors" />
          <input value={artist} onChange={(e) => setArtist(e.target.value)}
            placeholder="Artist Name"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-900 transition-colors" />
          <input value={year} onChange={(e) => setYear(e.target.value)}
            placeholder="Year"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-900 transition-colors" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="Description" rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-900 transition-colors resize-none" />

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving || !title}
              className="flex-1 py-2.5 bg-gray-900 text-white text-sm rounded-xl hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
