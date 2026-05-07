# Integrating "Walk-through Gallery" into art-gallery

Adds a new route `/walk` that renders all Supabase artworks as paintings on the walls of a 3D space the visitor walks through (mouse-look + WASD on desktop, touch on mobile). Reuses the project's depth-map pipeline so paintings *bulge* as you approach.

## Files to copy

```
src/pages/WalkPage.jsx
src/components/walk/Gallery3D.jsx
src/components/walk/Painting.jsx
src/components/walk/FirstPersonControls.jsx
src/components/walk/WalkHUD.jsx
```

(Drop `src/components/walk/` as a new folder; everything else slots into existing folders.)

## Required edits

### 1. `src/App.jsx` — add route

```diff
 import GalleryPage from './pages/GalleryPage';
 import ViewerPage from './pages/ViewerPage';
+import WalkPage from './pages/WalkPage';
```

```diff
   <Route path="/artwork/:id" element={<ViewerPage artworks={artworks} onUpdate={updateArtwork} />} />
+  <Route path="/walk" element={<WalkPage artworks={artworks} />} />
```

### 2. `src/components/Navbar.jsx` — add "Walk" link

Inside the right-hand action group, before the upload button:

```jsx
<Link
  to="/walk"
  className="px-3 py-2 text-sm text-gray-700 hover:text-black transition-colors"
>
  步入画廊
</Link>
```

### 3. `src/pages/GalleryPage.jsx` — add Hero CTA

Replace the single upload button in the hero with a two-button row:

```jsx
<div className="mt-8 flex gap-3 justify-center flex-wrap">
  <button
    onClick={handleUploadClick}
    className="px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-700 transition-colors"
  >
    {user ? '上传作品' : '登录后上传'}
  </button>
  <Link
    to="/walk"
    className="px-6 py-3 border border-gray-900 text-gray-900 rounded-xl hover:bg-gray-900 hover:text-white transition-colors"
  >
    步入画廊 →
  </Link>
</div>
```

(Also add `import { Link } from 'react-router-dom';` at the top.)

### 4. `index.html` — add Google Fonts (optional but recommended)

The intro screen uses Fraunces italic for visual contrast:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300..600;1,300..600&display=swap" rel="stylesheet">
```

## Layout logic

`WalkPage.jsx → pickLayout(count)`:

- `count ≤ 12` → **Corridor**: `ceil(count / 2)` rooms, two paintings per room (one each side wall).
- `count > 12` → **Auto-expanding Rotunda**: 12-segment minimum, scales up to 36 panels. Radius grows with segment count so panel widths stay readable.

## Supabase / CORS

`Painting.jsx` uses `THREE.TextureLoader` with `crossOrigin = 'anonymous'`. Supabase public URLs serve `Access-Control-Allow-Origin: *` by default for the `artworks` bucket — this should "just work". If you ever switch to a private bucket, you'll need a signed-URL strategy.

## Depth-map reuse — the integration's actual point

This is what makes `/walk` more than a generic gallery viewer: each painting's `displacementMap` is the same `depth_map_url` you already store. In `Painting.jsx` the displacement scale is **distance-driven** — at >5m it's flat, by ~1.5m it's at full scale (~0.18). Aiming at it (hover) bumps the scale further.

So walking up to a piece *makes the depth real*, replicating in physical space what `Artwork3DViewer.jsx` does in the standalone viewer.

## Performance

- 12 spotlights with shadow maps + 36 in rotunda extreme. If frames drop on lower-end devices, set `castShadow={false}` on `<spotLight>` in `Painting.jsx` and use `shadowMap.enabled = false` in the canvas.
- Textures are loaded once per painting (no re-fetch on aim/move). React re-renders are gated by component props, not camera state.

## Known limitations / future work

- No persistent state for visitor position (refresh resets). Easy to add: store `[x, z, yaw]` to localStorage on a 1Hz timer.
- Audio is a synthesized drone; if you want curated tracks add an `<audio>` element in `WalkHUD.jsx` and gate it on `audioOn`.
- Detail panel links to existing `/artwork/:id` route — no duplicate viewer code.

## Hand-off prompt for Claude Code

If you'd rather have Claude Code finish this in your repo, paste:

> Apply the integration described in `INTEGRATION.md`. Copy the five files in `integration/src/**` into the corresponding paths under `src/`, then make the four edits to `App.jsx`, `Navbar.jsx`, `GalleryPage.jsx`, and `index.html`. Run `npm run lint` and fix any issues. Don't change anything else.
