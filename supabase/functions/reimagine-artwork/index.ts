declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: { get: (key: string) => string };
};

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/* ── Step 1: subject-first analysis ── */
const ANALYSIS_PROMPT = `Look at this artwork extremely carefully.

First, identify the MAIN SUBJECT with precision:
1. What is the main subject? A lion? Dragon? Human figure? Animal? Mythical creature? Plant? Be exact.
2. What color is it predominantly?
3. What cultural tradition does it represent? (Chinese lion dance? Beijing Opera? Folk art? etc.)
4. Describe the exact shape and form of the main figure.
5. What artistic style is this? (paper-cut, ink painting, embroidery, etc.)

CRITICAL: Do NOT invent elements not visible in the artwork. Stay strictly true to what you see.
- A lion dance figure is NOT a monkey — identify correctly
- A dragon is NOT a serpent — identify correctly
- A human is NOT an animal — identify correctly

Zero art-medium words allowed in real_world_description and priority_elements.

Return ONLY this JSON (no markdown, no code fences):
{
  "main_subject": "exactly what the main figure IS — very specific (e.g. 'Chinese lion dance costume head viewed from front', 'coiled red Chinese dragon', 'Beijing Opera actress in profile', 'leaping koi fish')",
  "subject_color": "dominant color(s) of the main subject",
  "cultural_context": "precise cultural tradition",
  "subject_form": "exact shape, pose, orientation of the main figure",
  "composition": "how the figure is positioned in the frame",
  "secondary_elements": "any decorative or background elements",
  "real_world_description": "Two precise sentences describing what a real photograph of this exact subject looks like. Name the subject correctly and specifically. Zero art-medium words.",
  "priority_elements": "2–3 key visual elements that MUST be accurate in the output. Format: 'SUBJECT NAME: exactly how it looks in real life | ELEMENT 2: precise real-world description | ELEMENT 3: precise real-world description'"
}`;

/* ── Build the image generation prompt ── */
function buildPrompt(a: Record<string, string>): string {
  const subject = a.real_world_description
    ?? `${a.main_subject ?? a.subject ?? 'the subject of this artwork'}, ${a.subject_form ?? a.pose ?? ''}`;

  const composition = [a.subject_form ?? a.pose, a.composition].filter(Boolean).join(', ');

  const lines = [
    // Strong photorealism anchors — placed first so the model prioritises them
    'A hyper-realistic photograph of a real person.',
    'NOT digital art. NOT CGI. NOT illustrated. NOT animated. NOT a 3D render.',
    'Must look exactly like a real photograph taken on a camera.',

    // The real-world scene
    subject,

    // Composition anchor
    composition ? `Exact framing: ${composition}.` : '',

    // Priority element realism
    a.priority_elements
      ? `These elements MUST look photorealistic and physically real: ${a.priority_elements}.`
      : '',

    // Photography quality
    'Real human skin with natural texture, pores, and subtle imperfections.',
    'Real flower petals with natural depth, translucency, and botanical accuracy.',
    'Shot on 85mm portrait lens, soft studio lighting.',
    'Photojournalism quality, sharp focus, ultra-detailed, 8K resolution.',
  ];

  return lines.filter(Boolean).join(' ');
}

/* ── Upload base64 image to Supabase Storage, return public URL ── */
async function storeImage(
  supabaseUrl: string, serviceKey: string,
  b64: string
): Promise<string> {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

  const path = `reimagined/${crypto.randomUUID()}.png`;
  const res  = await fetch(`${supabaseUrl}/storage/v1/object/artworks/${path}`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'image/png',
      'x-upsert': 'true',
    },
    body: bytes,
  });
  if (!res.ok) throw new Error(`Storage upload failed: ${await res.text()}`);
  return `${supabaseUrl}/storage/v1/object/public/artworks/${path}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY');
  const OPENAI_KEY    = Deno.env.get('OPENAI_API_KEY');
  const SUPABASE_URL  = Deno.env.get('SUPABASE_URL');
  const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!ANTHROPIC_KEY) return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), { status: 503, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (!OPENAI_KEY)    return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not configured — run: supabase secrets set OPENAI_API_KEY=sk-...' }), { status: 503, headers: { ...cors, 'Content-Type': 'application/json' } });

  try {
    const { imageURL } = await req.json();
    if (!imageURL) throw new Error('imageURL is required');

    /* ── Step 1: Claude Sonnet — deep analysis + real-world translation ── */
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',  // Haiku: ~8s vs Sonnet ~25s — keeps total under 60s
        max_tokens: 1200,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'url', url: imageURL } },
            { type: 'text', text: ANALYSIS_PROMPT },
          ],
        }],
      }),
    });

    if (!claudeRes.ok) throw new Error(`Claude ${claudeRes.status}: ${await claudeRes.text()}`);

    const claudeData = await claudeRes.json();
    const rawText    = (claudeData.content?.[0]?.text ?? '').trim()
      .replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');

    let analysis: Record<string, string> = {};
    try { analysis = JSON.parse(rawText); } catch { /* buildPrompt handles empty */ }

    const imgPrompt = buildPrompt(analysis);

    /* ── Step 2: OpenAI gpt-image-1 — photorealistic text-to-image ── */
    const openaiRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model:   'gpt-image-1',
        prompt:  imgPrompt,
        n:       1,
        size:    '1024x1024',
        quality: 'medium',  // high ~60s+ → medium ~25s; fits inside Supabase 60s limit
      }),
    });

    if (!openaiRes.ok) throw new Error(`OpenAI ${openaiRes.status}: ${await openaiRes.text()}`);

    const openaiData = await openaiRes.json();
    const item       = openaiData.data?.[0];
    if (!item) throw new Error('OpenAI returned no image data');

    // gpt-image-1 returns b64_json; upload to storage for a stable public URL
    let imageOut: string;
    if (item.url) {
      imageOut = item.url;
    } else if (item.b64_json && SUPABASE_URL && SERVICE_KEY) {
      imageOut = await storeImage(SUPABASE_URL, SERVICE_KEY, item.b64_json);
    } else if (item.b64_json) {
      imageOut = `data:image/png;base64,${item.b64_json}`;
    } else {
      throw new Error('OpenAI returned no usable image');
    }

    return new Response(JSON.stringify({ imageURL: imageOut, prompt: imgPrompt, analysis }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
