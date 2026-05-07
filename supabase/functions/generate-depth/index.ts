import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { artworkId, imageDataURL } = await req.json();

    // Use service role key — bypasses RLS so we can update any artwork
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const replicateToken = Deno.env.get('REPLICATE_API_TOKEN')!;

    await supabase.from('artworks')
      .update({ depth_status: 'AI 服务处理中...' })
      .eq('id', artworkId);

    // Call Replicate depth-anything-v2 — Prefer:wait returns result synchronously (≤60s)
    const predRes = await fetch(
      'https://api.replicate.com/v1/models/depth-anything/depth-anything-v2-large-hf/predictions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${replicateToken}`,
          'Content-Type': 'application/json',
          Prefer: 'wait',
        },
        body: JSON.stringify({ input: { image: imageDataURL } }),
      }
    );
    let result = await predRes.json();

    // Fallback polling if Prefer:wait didn't finish in time
    let attempts = 0;
    while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < 25) {
      await new Promise((r) => setTimeout(r, 2500));
      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
        headers: { Authorization: `Bearer ${replicateToken}` },
      });
      result = await pollRes.json();
      attempts++;
    }

    if (result.status !== 'succeeded') {
      throw new Error(result.error || 'AI 推理失败或超时');
    }

    // Download depth map from Replicate and store in Supabase Storage
    const depthRes = await fetch(result.output);
    const depthBlob = await depthRes.blob();

    await supabase.storage
      .from('artworks')
      .upload(`${artworkId}/depth.png`, depthBlob, { contentType: 'image/png', upsert: true });

    const { data: urlData } = supabase.storage
      .from('artworks')
      .getPublicUrl(`${artworkId}/depth.png`);

    await supabase.from('artworks')
      .update({ depth_map_url: urlData.publicUrl, depth_status: '完成' })
      .eq('id', artworkId);

    return new Response(
      JSON.stringify({ depthMapUrl: urlData.publicUrl }),
      { headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  }
});
