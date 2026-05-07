declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: { get: (key: string) => string };
};

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PROMPT = `You are an expert in traditional Chinese art, culture, symbolism, and visual aesthetics.

Analyze this artwork and identify 3–5 traditional Chinese cultural symbols, motifs, or elements present.

For each element, return a JSON object with:
- name_zh: Chinese name (2–5 characters)
- name_en: English name
- meaning_zh: Cultural meaning in Chinese (2–3 concise sentences explaining historical/spiritual significance)
- type: one of exactly these values: peony | vine | dragon | phoenix | bamboo | lotus | crane | cloud | fish | opera | lantern | koi | plum | fan | default
- color: a warm hex color that evokes this element (e.g. "#e8a0b0" for peony pink)

Rules:
- Choose "type" based on the closest match. If none match, use "default".
- Focus on genuine traditional Chinese cultural symbols, not just generic decorative elements.
- Be specific: "牡丹" not just "花".

Return ONLY a valid JSON array — no markdown, no explanation, no code fences.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY');
  if (!ANTHROPIC_KEY) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
      status: 503,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { imageURL } = await req.json();
    if (!imageURL) throw new Error('imageURL is required');

    // Fetch image and encode as base64 (more reliable than URL passing)
    const imgRes = await fetch(imageURL);
    if (!imgRes.ok) throw new Error(`Failed to fetch image: ${imgRes.status}`);
    const imgBuf = await imgRes.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(imgBuf)));
    const mediaType = (imgRes.headers.get('content-type') || 'image/jpeg').split(';')[0];

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            { type: 'text', text: PROMPT },
          ],
        }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic ${response.status}: ${err}`);
    }

    const data = await response.json();
    const raw = data.content?.[0]?.text?.trim() ?? '[]';
    const match = raw.match(/\[[\s\S]*\]/);
    const symbols = match ? JSON.parse(match[0]) : [];

    return new Response(JSON.stringify({ symbols }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
