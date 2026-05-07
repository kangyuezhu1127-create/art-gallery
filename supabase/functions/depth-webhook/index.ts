// Called by Replicate when depth estimation is complete
declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: { get: (key: string) => string };
};

async function dbUpdate(supabaseUrl: string, serviceKey: string, artworkId: string, patch: Record<string, string | null>) {
  await fetch(`${supabaseUrl}/rest/v1/artworks?id=eq.${artworkId}`, {
    method: 'PATCH',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(patch),
  });
}

Deno.serve(async (req) => {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  const url = new URL(req.url);
  const artworkId = url.searchParams.get('artwork_id');

  if (!artworkId) return new Response('missing artwork_id', { status: 400 });

  try {
    const payload = await req.json();

    if (payload.status === 'failed') {
      await dbUpdate(SUPABASE_URL, SERVICE_KEY, artworkId, {
        depth_status: `生成失败：${payload.error ?? 'Replicate 处理失败'}`,
      });
      return new Response('ok');
    }

    if (payload.status !== 'succeeded') {
      return new Response('ignored');
    }

    const outputUrl: string = Array.isArray(payload.output) ? payload.output[0] : payload.output;

    // Download depth map from Replicate CDN
    const depthRes = await fetch(outputUrl);
    if (!depthRes.ok) throw new Error(`Download failed: ${depthRes.status}`);
    const depthBuffer = await depthRes.arrayBuffer();

    // Upload to Supabase Storage
    const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/artworks/${artworkId}/depth.png`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'image/png',
        'x-upsert': 'true',
      },
      body: depthBuffer,
    });
    if (!uploadRes.ok) throw new Error(`Storage upload failed: ${await uploadRes.text()}`);

    const depthMapUrl = `${SUPABASE_URL}/storage/v1/object/public/artworks/${artworkId}/depth.png`;

    await dbUpdate(SUPABASE_URL, SERVICE_KEY, artworkId, {
      depth_map_url: depthMapUrl,
      depth_status: '完成',
    });

    return new Response('ok');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await dbUpdate(SUPABASE_URL, SERVICE_KEY, artworkId, { depth_status: `生成失败：${msg}` }).catch(() => {});
    return new Response(msg, { status: 500 });
  }
});
