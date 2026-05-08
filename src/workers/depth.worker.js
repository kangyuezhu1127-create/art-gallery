// Do NOT import @xenova/transformers at the top level — Vite bundles it
// incorrectly and breaks the ONNX backend registration.
// Instead, dynamically import the pre-built browser bundle from CDN at runtime.

let depthEstimator = null;
let pipelineFn = null;

self.addEventListener('message', async (e) => {
  const { imageDataURL } = e.data;

  try {
    if (!pipelineFn) {
      self.postMessage({ type: 'progress', message: 'Loading AI libraries…' });
      const { pipeline, env } = await import(
        'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js'
      );
      env.allowLocalModels = false;
      env.useBrowserCache = true;
      pipelineFn = pipeline;
    }

    if (!depthEstimator) {
      self.postMessage({ type: 'progress', message: 'First use: downloading model (~50MB, once only)…' });
      depthEstimator = await pipelineFn(
        'depth-estimation',
        'Xenova/depth-anything-small-hf',
        {
          progress_callback: (p) => {
            if (p.status === 'downloading' && p.total) {
              const pct = Math.round((p.loaded / p.total) * 100);
              self.postMessage({ type: 'progress', message: `Downloading model: ${pct}%` });
            } else if (p.status === 'loading') {
              self.postMessage({ type: 'progress', message: 'Loading model into memory…' });
            }
          },
        }
      );
    }

    self.postMessage({ type: 'progress', message: 'Generating depth map (~10–30 seconds)…' });

    const result = await depthEstimator(imageDataURL);
    const depth = result.depth;

    const copy = new Uint8ClampedArray(depth.data);
    self.postMessage(
      {
        type: 'result',
        depthInfo: {
          data: copy.buffer,
          width: depth.width,
          height: depth.height,
          channels: depth.channels,
        },
      },
      [copy.buffer]
    );
  } catch (err) {
    self.postMessage({ type: 'error', message: err.message });
  }
});
