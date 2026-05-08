declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: { get: (key: string) => string };
};

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  const REPLICATE_TOKEN = Deno.env.get('REPLICATE_API_TOKEN');

  try {
    const { nameZh, nameEn, type } = await req.json();

    // Style varies by symbol type for more authentic results
    const styleMap: Record<string, string> = {
      peony:   'Chinese peony flower painting, Song Dynasty gongbi style, ink and wash with delicate color',
      vine:    'Chinese vine and tendril motif, flowing brushwork, traditional scroll painting',
      dragon:  'Chinese dragon, ink wash painting, imperial style, dynamic brushstrokes',
      phoenix: 'Chinese phoenix fenghuang, ink and color painting, graceful classical style',
      bamboo:  'Chinese ink bamboo painting, literati style, expressive minimal brushwork',
      lotus:   'Chinese lotus painting, ink wash, Buddhist aesthetic, serene composition',
      crane:   'Chinese crane painting, ink wash, Taoist symbolism, elegant brushwork',
      cloud:   'Chinese auspicious cloud pattern, decorative ink design, traditional motif',
      fish:    'Chinese koi fish painting, ink and wash, lively brushwork, symbol of abundance',
      opera:   'Chinese Peking Opera face paint design, dramatic colors, theatrical mask art',
      lantern: 'Chinese red lantern illustration, festive ink painting, New Year motif',
      koi:     'Chinese koi carp ink wash painting, fluid brushwork, pond scene',
      plum:    'Chinese plum blossom ink painting, wabi-sabi, scholar painting style',
      fan:     'Chinese folding fan decorative painting, classical motif, refined brushwork',
      default: 'Traditional Chinese cultural symbol, ink wash painting, classical aesthetic',
    };

    const style = styleMap[type] ?? styleMap.default;
    const prompt = `${style}. Artwork about ${nameZh} (${nameEn}). Museum quality, authentic traditional Chinese art, aged rice paper texture, black ink brushwork, minimal elegant composition, centered subject, no text, no borders.`;

    // Use Prefer:wait for synchronous response (Replicate waits up to 60s)
    const createRes = await fetch(
      'https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${REPLICATE_TOKEN}`,
          'Content-Type': 'application/json',
          'Prefer': 'wait=55',
        },
        body: JSON.stringify({
          input: {
            prompt,
            num_inference_steps: 4,
            aspect_ratio: '1:1',
            go_fast: true,
            output_format: 'webp',
            output_quality: 85,
          },
        }),
      }
    );

    const prediction = await createRes.json();

    // If synchronous wait succeeded, output is already there
    if (prediction.output?.[0]) {
      return new Response(JSON.stringify({ imageURL: prediction.output[0] }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // Otherwise poll (fallback)
    const getUrl = prediction.urls?.get;
    if (!getUrl) throw new Error('No prediction URL');

    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const poll = await fetch(getUrl, { headers: { Authorization: `Bearer ${REPLICATE_TOKEN}` } });
      const status = await poll.json();
      if (status.status === 'succeeded') {
        return new Response(JSON.stringify({ imageURL: status.output?.[0] }), {
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
      if (status.status === 'failed') throw new Error('Image generation failed');
    }

    throw new Error('Timeout waiting for image');

  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
