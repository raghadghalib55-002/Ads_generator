# Publish 3LABABEE Generator on Render

This package is production-ready for GitHub + Render. The design, prompt, template, QR workflow, text layers, model selector, and canvas logic are unchanged.

## 1) Before GitHub

Do **not** create or upload a real `.env` file to GitHub.

The repository should contain `.env.example`, but not `.env`.

## 2) Push to GitHub

Create a new GitHub repository and upload the contents of this folder.

Recommended repository name:

`3lababee-product-post-generator`

## 3) Create the Render service

In Render:

1. New → Web Service.
2. Connect your GitHub repository.
3. Runtime: Node.
4. Build command: `npm ci`
5. Start command: `npm start`
6. Health check path: `/health`

If you use the included `render.yaml`, Render can read most of these settings automatically.

## 4) Environment variables on Render

Add:

`OPENROUTER_API_KEY` = your real OpenRouter key

`APP_URL` = your final Render URL, for example:

`https://3lababee-product-post-generator.onrender.com`

Do **not** manually set `PORT` on Render. Render supplies it automatically.

## 5) Test after deploy

Open your Render URL and verify:

- The master template appears.
- Product upload works.
- Model selection works.
- Generate returns an image.
- Brand regions/text stay correct.
- QR is added only after generation.
- Download PNG works.

Health check:

`https://YOUR-APP.onrender.com/health`

Expected response:

`{"ok":true}`

## 6) If generation fails

- 401/403: check `OPENROUTER_API_KEY`.
- 402: add OpenRouter credits.
- 429: provider/rate limit; retry later or inspect OpenRouter limits.
- 400 upload error: use PNG, JPEG, or WebP under 20 MB.
- Missing generated image: inspect Render logs and OpenRouter response.

## Production changes made in this package

- Removed `.env` and `node_modules` from the distributable ZIP.
- Added `.env.example`.
- Added `/health` endpoint for Render.
- Added `APP_URL` so OpenRouter receives the production referer instead of localhost.
- Server listens on `0.0.0.0` and Render's assigned `PORT`.
- Added image MIME validation and clearer upload errors.
- Disabled the Express `X-Powered-By` header.
- Added `render.yaml` for easier deployment.
