# Unveilthe.Arts

> Building at the intersection of culture and technology — a browser-based gallery that lets viewers *walk into* artworks and read the cultural symbols embedded in them.

**Live demo:** [unveiled-the-art.online](https://unveiled-the-art.online) · [art-gallery-bice-delta.vercel.app](https://art-gallery-bice-delta.vercel.app)

---

## What it does

Unveilthe.Arts turns a flat gallery page into an interactive space:

- **3D artwork rooms** — step through pieces in a spatial layout instead of scrolling a grid.
- **AI cultural symbol analysis** — click any element in a work and get a plain-language read on the symbol, its origin, and what it usually signifies.
- **Hands-free demo mode** — gesture-based navigation for touchless exhibits (great for a physical kiosk).
- **Curated papercut aesthetic** — layered, textured UI that borrows from traditional paper-cutting art.

## Tech stack

| Layer      | Choice                                    |
| ---------- | ----------------------------------------- |
| Frontend   | React + Vite                              |
| Styling    | Tailwind CSS, custom papercut components  |
| 3D / motion| Three.js                                  |
| Backend    | Supabase (auth, storage, artwork metadata)|
| AI         | LLM-backed symbol / iconography analysis  |
| Deploy     | Vercel                                    |

## Local development

```bash
git clone https://github.com/jzhu-kyy/art-gallery.git
cd art-gallery
npm install
npm run dev
```

The app expects a `.env.local` with your Supabase URL/key and the LLM endpoint used by the analysis panel — see `src/config` for the exact keys.

## Project layout

```
src/            React components and pages
public/         Static assets and artwork media
integration/    AI symbol analysis pipeline
supabase/       Schema, RLS policies, edge functions
index.html      Vite entry point
```

## Status

Actively developed. The 3D room layout and the AI analysis panel are the two features under the most iteration right now; expect the surface around them to change.

---

Made by [Judy Zhu](https://github.com/jzhu-kyy) · USC '30, Applied Math + CS
