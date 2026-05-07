import { supabase } from './supabase';

// Map DB snake_case → component camelCase
function mapRow(row) {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    year: row.year,
    description: row.description,
    originalURL: row.original_url,
    depthMapURL: row.depth_map_url,
    aspectRatio: row.aspect_ratio,
    depthStatus: row.depth_status,
    uploaderName: row.uploader_name,
    userId: row.user_id,
    createdAt: row.created_at,
  };
}

export async function fetchArtworks() {
  const { data, error } = await supabase
    .from('artworks')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(mapRow);
}

export async function insertArtwork({ id, title, artist, year, description, originalURL, aspectRatio, userId, uploaderName }) {
  const { data, error } = await supabase
    .from('artworks')
    .insert({
      id,
      title,
      artist,
      year,
      description,
      original_url: originalURL,
      aspect_ratio: aspectRatio,
      depth_status: 'processing',
      user_id: userId,
      uploader_name: uploaderName,
    })
    .select()
    .single();
  if (error) throw error;
  return mapRow(data);
}

export async function updateArtworkDB(id, { depthMapURL, depthStatus }) {
  const patch = {};
  if (depthMapURL !== undefined) patch.depth_map_url = depthMapURL;
  if (depthStatus !== undefined) patch.depth_status = depthStatus;
  const { error } = await supabase.from('artworks').update(patch).eq('id', id);
  if (error) throw error;
}

// Upload a Blob to Supabase Storage and return its public URL
export async function uploadFile(path, blob, contentType) {
  const { error } = await supabase.storage
    .from('artworks')
    .upload(path, blob, { contentType, upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('artworks').getPublicUrl(path);
  return data.publicUrl;
}
