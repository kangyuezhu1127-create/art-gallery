declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: { get: (key: string) => string };
};

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VISION_PROMPT = `Analyze this artwork carefully.
Describe exactly what is depicted: subjects, their poses, positions, spatial arrangement, setting, any actions.
Then write a prompt for an AI image generator to create a PHOTOREALISTIC real-world scene
that preserves the EXACT same composition, spatial layout, and positions of every element.

Return ONLY this JSON (no markdown, no explanation):
{
  "scene": "one sentence describing the scene",
  "prompt": "Photorealistic photograph, [full detailed description of subjects and their exact positions/poses], same composition and spatial layout as the reference image, professional photography, natural lighting, cinematic quality, high detail, 8K"
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
        strength:            0.78,   // high enough to transform style, low enough to keep layout
        num_inference_steps: 28,
        guidance_scale:      3.5,
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
