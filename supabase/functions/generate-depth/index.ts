declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: { get: (key: string) => string };
};

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

async function dbUpdate(supabaseUrl: string, serviceKey: string, artworkId: string, patch: Record<string, string>) {
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
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const REPLICATE_TOKEN = Deno.env.get('REPLICATE_API_TOKEN');

  let artworkId = '';
  try {
    const body = await req.json();
    artworkId = body.artworkId;
    const imageDataURL: string = body.imageDataURL;

    await dbUpdate(SUPABASE_URL, SERVICE_KEY, artworkId, { depth_status: 'AI processing…' });

    // Webhook URL — Replicate will POST here when prediction completes
    const webhookUrl = `${SUPABASE_URL}/functions/v1/depth-webhook?artwork_id=${artworkId}`;

    const predRes = await fetch(
      'https://api.replicate.com/v1/predictions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${REPLICATE_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: 'a6ba5798f04f80d3b314de0f0a62277f21ab3503c60c84d4817de83c5edfdae0',
          input: { image: imageDataURL },
          webhook: webhookUrl,
          webhook_events_filter: ['completed'],
        }),
      }
    );

    if (!predRes.ok) {
      const errText = await predRes.text();
      throw new Error(`Replicate ${predRes.status}: ${errText}`);
    }

    // Return immediately — result will arrive via webhook
    return new Response(JSON.stringify({ started: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (artworkId) {
      await dbUpdate(SUPABASE_URL, SERVICE_KEY, artworkId, { depth_status: `Generation failed: ${msg}` }).catch(() => {});
    }
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
