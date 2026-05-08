declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: { get: (key: string) => string };
};

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/* ── Step 1: deep analysis with real-world translation and realism anchors ── */
const ANALYSIS_PROMPT = `You are analyzing an artwork to help generate a photorealistic photograph.

Analyze the artwork carefully. Fill every field below.

RULES — real_world_description and priority_elements must NEVER contain:
paper-cut, jianzhi, silhouette, illustration, painting, lace, doily, openwork,
lattice, watercolour, ink, brushwork, or any art-medium word.
Translate every artistic element to its real physical counterpart:
  circular lace medallion → real peony or chrysanthemum bloom
  jianzhi vine pattern    → real green leaves and vine stems
  silhouette outline      → a real person with real skin and real costume

Return ONLY this JSON (no markdown, no code fences):
{
  "subject": "who the figure is — cultural role, gender, exact facing direction and body framing",
  "pose": "precise body orientation (e.g. 'strict left-facing profile, upper body only, head held upright')",
  "composition": "where the figure sits in the frame (e.g. 'centred vertically, slight left offset, negative space to the right')",
  "head_elements": "real-world description of hair, headdress, ornaments, flowers ON the head",
  "neck_elements": "real-world description of what drapes the neck and shoulders",
  "body_elements": "real costume — fabric type, colours, embroidery, silhouette",
  "cultural_style": "precise cultural tradition (e.g. 'Beijing Opera female dan role, Qing dynasty aesthetic')",
  "flower_types": "exact real flower species present, colours, placement (e.g. 'large pink peonies in the headdress, yellow chrysanthemums at the temple, green lotus leaves at the shoulders')",
  "real_world_description": "Two-sentence photograph caption in plain English. Zero art-medium words. Describe the real person, their real costume, their real flowers, their real setting. Be very specific about flower species and colours.",
  "priority_elements": "Describe 2–4 key visual elements that MUST look photorealistic in the output. For each write exactly how it should appear as a real object. Format: 'PEONIES: large fully-bloomed peonies with layered silky petals in deep pink, visible golden stamens at centre, wet-looking petals | OPERA MAKEUP: porcelain white face foundation, bold crimson lip, elongated black eye liner sweeping to temples, high arched painted eyebrows | LEAVES: real green monstera or maple leaves, visible leaf venation, stems wrapping naturally around the shoulder'"
}`;

/* ── Build fal.ai prompt — real scene + composition anchor + element realism ── */
function buildPrompt(a: Record<string, string>): string {
  const lines: string[] = [
    'Photorealistic DSLR photograph, cinematic studio lighting.',
  ];

  // Core real-world scene (no art-medium words)
  if (a.real_world_description) lines.push(a.real_world_description);

  // Composition anchor — keeps layout stable even at high strength
  if (a.pose || a.composition) {
    lines.push(
      `Exact composition: ${[a.pose, a.composition].filter(Boolean).join('; ')}.`
    );
  }

  // Priority element realism — the most important instruction
  if (a.priority_elements) {
    lines.push(`MUST LOOK PHOTOREALISTIC — ${a.priority_elements}.`);
  }

  // Photography quality
  lines.push(
    'Ultra-detailed realistic skin texture, fabric weave, and botanical detail.',
    'Sharp focus, shallow depth of field, 8K resolution.',
    'Same framing and figure placement as the reference image.',
  );

  return lines.join(' ');
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

    /* ── Claude Sonnet — deep analysis + real-world translation ── */
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1800,
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

    /* ── fal.ai FLUX img2img ──
       strength 0.93: nearly ignores input visual style (breaks paper-cut aesthetic)
       but the detailed composition + pose text keeps the layout intact.
       guidance_scale 8.0: strict adherence to photorealism prompt.        ── */
    const falRes = await fetch('https://fal.run/fal-ai/flux/dev/image-to-image', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url:           imageURL,
        prompt:              imgPrompt,
        strength:            0.93,
        num_inference_steps: 28,
        guidance_scale:      8.0,
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
