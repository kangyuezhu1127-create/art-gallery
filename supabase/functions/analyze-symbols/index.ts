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

Analyze this artwork and identify 3-5 traditional Chinese cultural symbols, motifs, or elements present.

For each element output a JSON object with these exact fields:
- name_zh: Chinese name (2-5 characters)
- name_en: English name
- meaning_zh: Cultural meaning in Chinese, 1-2 sentences. CRITICAL: do NOT use any double-quote characters inside this text. Use Chinese guillemets like 《》or just write without quotation marks.
- type: exactly one of: peony vine dragon phoenix bamboo lotus crane cloud fish opera lantern koi plum fan default
- color: hex color evoking this element, e.g. #e8a0b0

Output ONLY a raw JSON array. No markdown, no code fences, no explanation.
Example: [{"name_zh":"牡丹","name_en":"Peony","meaning_zh":"国花，象征富贵繁荣。","type":"peony","color":"#e8a0b0"}]`;

/** Fix unescaped double-quotes inside JSON string values */
function repairJson(text: string): string {
  // Replace curly/smart quotes that may confuse the parser
  let s = text
    .replace(/[“”]/g, '\\"')  // " " → \"
    .replace(/[‘’]/g, "'");   // ' ' → '

  // Replace literal \n in strings with space to avoid multiline parse issues
  s = s.replace(/\r?\n/g, '\\n');

  // Re-normalise escaped newlines that are already escaped
  s = s.replace(/\\n/g, ' ');

  return s;
}

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
            { type: 'image', source: { type: 'url', url: imageURL } },
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
    const raw = (data.content?.[0]?.text ?? '').trim();

    // Strip markdown fences
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim();

    let symbols: unknown[] = [];

    // Attempt 1: direct parse
    try {
      const parsed = JSON.parse(cleaned);
      symbols = Array.isArray(parsed) ? parsed : [];
    } catch {
      // Attempt 2: repair then parse
      try {
        const repaired = repairJson(cleaned);
        const parsed = JSON.parse(repaired);
        symbols = Array.isArray(parsed) ? parsed : [];
      } catch {
        // Attempt 3: extract array with regex then repair
        const match = cleaned.match(/\[[\s\S]*\]/);
        if (match) {
          try {
            symbols = JSON.parse(repairJson(match[0]));
          } catch { symbols = []; }
        }
      }
    }

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
