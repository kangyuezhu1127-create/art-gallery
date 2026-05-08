declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: { get: (key: string) => string };
};

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VISION_PROMPT = `You are looking at a piece of artwork. Your job is to identify the REAL-WORLD SCENE being depicted.

COMPLETELY IGNORE the artistic style (paper-cut, silhouette, illustration, painting, etc.).
Focus only on: what real subjects, people, animals, or objects are shown, their poses, positions, and what scene or setting they are in.

Then write a prompt that will generate a PHOTOREALISTIC PHOTOGRAPH of that same real-world scene.

Rules for the prompt:
- Start with "Photorealistic DSLR photograph,"
- Describe real humans, animals, objects — never mention artwork, illustration, or any artistic medium
- Preserve the exact composition, pose, and spatial layout
- End with: "professional photography, natural lighting, shallow depth of field, sharp focus, ultra-detailed, 8K, cinematic"

Return ONLY this JSON (no markdown, no code fences):
{
  "scene": "one sentence: what real-world scene is being depicted",
  "prompt": "Photorealistic DSLR photograph of [real subjects with exact poses and positions], [scene/setting], same composition as reference, professional photography, natural lighting, shallow depth of field, sharp focus, ultra-detailed, 8K, cinematic"
}`;

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

    /* ── Step 1: Claude Haiku analyzes the artwork and writes the img2img prompt ── */
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'url', url: imageURL } },
            { type: 'text', text: VISION_PROMPT },
          ],
        }],
      }),
    });

    if (!claudeRes.ok) throw new Error(`Claude ${claudeRes.status}: ${await claudeRes.text()}`);
    const claudeData  = await claudeRes.json();
    const rawText     = (claudeData.content?.[0]?.text ?? '').trim()
      .replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');

    let imgPrompt = 'Photorealistic photograph of the same scene, same composition and positions, professional photography, cinematic quality';
    try {
      const parsed = JSON.parse(rawText);
      imgPrompt = parsed.prompt ?? imgPrompt;
    } catch { /* use fallback */ }

    /* ── Step 2: fal.ai FLUX img2img — preserves composition, transforms style ── */
    const falRes = await fetch('https://fal.run/fal-ai/flux/dev/image-to-image', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url:           imageURL,
        prompt:              imgPrompt,
        // 0.88 = strong enough to fully shed the artistic style and become photorealistic
        // while the composition-heavy prompt keeps the layout intact
        strength:            0.88,
        num_inference_steps: 28,
        guidance_scale:      7.5,    // higher = follows photorealism prompt more strictly
        num_images:          1,
        enable_safety_checker: true,
      }),
    });

    if (!falRes.ok) {
      const errText = await falRes.text();
      throw new Error(`fal.ai ${falRes.status}: ${errText}`);
    }

    const falData  = await falRes.json();
    const imageOut = falData?.images?.[0]?.url ?? falData?.image?.url;
    if (!imageOut) throw new Error('fal.ai returned no image URL');

    return new Response(JSON.stringify({ imageURL: imageOut, prompt: imgPrompt }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
