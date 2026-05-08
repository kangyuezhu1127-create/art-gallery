declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: { get: (key: string) => string };
};

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/* ── Step 1: structural analysis + real-world translation ── */
const ANALYSIS_PROMPT = `Analyze this artwork in extreme detail. Identify every element precisely.

Then write "real_world_description": describe what a real-world PHOTOGRAPH of this scene would look like.
Rules for real_world_description:
- NEVER use the words: paper-cut, jianzhi, silhouette, illustration, painting, lace, doily, openwork, lattice, watercolour, or any art-medium term
- Translate every artistic element to its physical real-world counterpart:
    paper-cut floral medallion -> large chrysanthemum or peony flower
    jianzhi vine pattern -> real green vine leaves and stems
    watercolour wash -> actual fabric or petal colour
    paper-cut silhouette -> a real person
- Write as if you are captioning an actual photograph, not describing an artwork

Return ONLY this JSON (no markdown, no code fences):
{
  "subject": "exact identity of the main figure — who are they, cultural role, facing direction",
  "pose": "exact body orientation and pose",
  "head_elements": "everything on or around the head in real-world terms (real flowers, real headdress, real hair ornaments)",
  "neck_elements": "what wraps around or drapes the neck and shoulders in real-world terms",
  "body_elements": "costume and clothing details in real-world terms",
  "background_elements": "what surrounds or fills the background",
  "cultural_style": "specific cultural tradition (e.g. 'Beijing Opera dan role, Qing dynasty aesthetic')",
  "flower_types": "exact real flower and plant species present (e.g. 'large pink peonies, green lotus leaves, white chrysanthemums')",
  "real_world_description": "One detailed paragraph describing the real-world scene as a photograph caption. Zero art-medium words. Example: 'A Chinese woman in full Beijing Opera costume stands in profile, her elaborate headdress crowned with large pink peony flowers and trailing ribbons, green vine leaves cascading over her shoulders, wearing an embroidered crimson silk robe, photographed against a plain white studio background.'"
}`;

/* ── Build fal.ai prompt using the translated real-world description ── */
function buildPrompt(a: Record<string, string>): string {
  const scene = a.real_world_description
    ?? [
        a.subject ?? 'a woman',
        a.pose    ? `in ${a.pose}` : '',
        a.cultural_style ? `wearing ${a.cultural_style} costume` : '',
        a.head_elements  ? `with ${a.head_elements}` : '',
        a.neck_elements  ? `, ${a.neck_elements}` : '',
        a.flower_types   ? `. Flowers: ${a.flower_types}` : '',
       ].filter(Boolean).join(' ');

  return [
    'Photorealistic DSLR photograph.',
    scene,
    'Same exact composition, pose, and framing as the reference image.',
    'Cinematic photography, dramatic studio lighting, sharp focus, ultra-detailed realistic skin and fabric texture, 8K resolution.',
  ].join(' ');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY');
  const FAL_KEY       = Deno.env.get('FAL_KEY');

  if (!ANTHROPIC_KEY) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
      status: 503, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
  if (!FAL_KEY) {
    return new Response(JSON.stringify({ error: 'FAL_KEY not configured' }), {
      status: 503, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { imageURL } = await req.json();
    if (!imageURL) throw new Error('imageURL is required');

    /* ── Step 1: Claude Sonnet — detailed analysis + real-world translation ── */
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
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

    /* ── Step 2: fal.ai FLUX img2img — composition reference + photorealistic prompt ── */
    const falRes = await fetch('https://fal.run/fal-ai/flux/dev/image-to-image', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url:           imageURL,
        prompt:              imgPrompt,
        strength:            0.88,
        num_inference_steps: 28,
        guidance_scale:      7.5,
        num_images:          1,
        enable_safety_checker: true,
      }),
    });

    if (!falRes.ok) throw new Error(`fal.ai ${falRes.status}: ${await falRes.text()}`);

    const falData  = await falRes.json();
    const imageOut = falData?.images?.[0]?.url ?? falData?.image?.url;
    if (!imageOut) throw new Error('fal.ai returned no image URL');

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
