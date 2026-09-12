# 3LABABEE OpenRouter Product Post Generator v4

This version replaces the direct OpenAI integration with OpenRouter's unified Image API.

## What changed

- One `OPENROUTER_API_KEY` instead of an OpenAI key.
- Model selector with:
  - `google/gemini-3.1-flash-image` — Nano Banana 2 / Standard
  - `google/gemini-3-pro-image` — Gemini 3 Pro Image / Premium
  - `google/gemini-3.1-flash-lite-image` — Nano Banana 2 Lite / Economy
- Uses the OpenRouter endpoint `POST https://openrouter.ai/api/v1/images`.
- Sends the fixed master template + uploaded product through `input_references`.
- Keeps the QR completely out of AI. QR is composited in the browser at the end.
- Re-applies the exact original logo, text blocks and empty QR card from the master template after generation to reduce AI text/logo changes.
- Uses the current official square 3LABABEE master template.
- Displays the actual OpenRouter generation cost when returned in `usage.cost`.

## Setup

1. Install Node.js 20+.
2. Unzip this project and open a terminal in the project folder.
3. Run:

```bash
npm install
```

4.Copy `.env.example` to `.env`.
5.Put your OpenRouter key in `.env`:

```env
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxx
PORT=3000
```

6 Start:

```bash
npm start
```

7 Open:

```text
http://localhost:3000
```

## Important

Never put the OpenRouter API key in `public/app.js` or any browser-side file. Keep it only in `.env` on the backend.

The selected model can be changed from the UI without changing the API key or backend integration.

## Text (headline, subtitle, QR label)

The three text blocks — `New / Arrival`, `Fresh on the app. just for you`, and
`SCAN TO DISCOVER / ON 3LABABEE APP` — are no longer part of the template
image. They are drawn on the canvas by code, controlled from the
`TEXT_LAYERS` array at the top of `public/app.js`. Edit wording, font family,
size, weight, color or position there — no image editing needed.

Current fonts (loaded from Google Fonts in `public/index.html`):

- Headline (`New` / `Arrival`): Cormorant Garamond, 128px, medium (500)
- Subtitle (`Fresh on the app.` / `just for you`): Ovo, 32px, regular (400)
- QR label (`SCAN TO DISCOVER` / `ON 3LABABEE APP`): Inter, 15px, regular (400)

`public/template.png` must now be the **text-free** version of the artwork
(logo, background, divider line and QR card border only — no wording baked
in). `BRAND_REGIONS` in `app.js` still restores those areas' background art
after AI generation; the code-drawn text is layered on top of that every
time, independent of the AI step.

## QR

The QR is never sent to OpenRouter. The browser draws the uploaded QR directly on top of the generated poster, preserving its pixels and scan pattern.

If the official template changes later, update `public/template.png` and then adjust `QR_BOX` / `BRAND_REGIONS` in `public/app.js` if necessary.

## Production / Render

Use `PUBLISH_RENDER.md` for the GitHub + Render deployment steps. The production package includes `render.yaml`, `/health`, `.env.example`, and support for an `APP_URL` environment variable.
