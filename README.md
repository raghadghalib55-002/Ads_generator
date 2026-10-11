# 3LABABEE AI Product Post Generator

A web app that combines a product photo with the fixed 3LABABEE advertising template through OpenRouter, then composites branding, text and an uploaded QR code in the browser. The final advertisement is downloaded as PNG.

The interface supports English and Arabic (RTL). The application package is version 4.0.0.

## Contents

- [How it works](#how-it-works)
- [Models and resolutions](#models-and-resolutions)
- [Project layout](#project-layout)
- [Local setup](#local-setup)
- [API and errors](#api-and-errors)
- [Branding, text and QR customization](#branding-text-and-qr-customization)
- [Render deployment](#render-deployment)
- [Security and operational limits](#security-and-operational-limits)
- [Tests and verification status](#tests-and-verification-status)
- [Deployment checklist without paid requests](#deployment-checklist-without-paid-requests)
- [Troubleshooting](#troubleshooting)

## How it works

1. Upload a PNG, JPEG or WebP product photo, then select a model and requested resolution.
2. The backend validates the declared MIME type, file signature and upload size.
3. The backend sends the product photo and `public/template.png` to `https://openrouter.ai/api/v1/images` through `input_references`. The prompt asks the model to preserve product identity, item count, logos, materials and physical placement.
4. When the preserve-brand option is enabled, the browser restores protected artwork from the original template using `BRAND_REGIONS`.
5. The browser draws the headline, subtitle and QR label from `TEXT_LAYERS`.
6. The uploaded QR is composited locally into `QR_BOX`; it is never sent to the AI provider.
7. The canvas uses the actual returned image dimensions and exports a PNG.

Product fidelity is a generation objective, not a guarantee. QR scaling can resample pixels; verify the exported code with a scanner.

## Models and resolutions

These are the model IDs configured in the application; availability and pricing depend on the provider.

| Model ID | UI label | Resolution behavior |
| --- | --- | --- |
| `google/gemini-3.1-flash-image` | Nano Banana 2 · Standard | Default model |
| `google/gemini-3-pro-image` | Gemini 3 Pro Image · Premium | Uses selected resolution |
| `google/gemini-3.1-flash-lite-image` | Nano Banana 2 Lite · Economy | Forced to 1K by both UI and backend |

The backend accepts `1K`, `2K` and `4K`. Unsupported model IDs fall back to Standard; unsupported resolutions fall back to 1K. A requested resolution does not prove the dimensions returned by the provider.

When the provider supplies `usage.cost`, the backend returns `X-OpenRouter-Cost` and the UI displays it. This is reporting, not a spending limit.

## Project layout

The application directory is:

`3LABABEE_OpenRouter_Production_Render/3lababee-openrouter-production`

| Path | Purpose |
| --- | --- |
| `README.md` at repository root | Canonical project documentation |
| `.github/workflows/ads-generator-security.yml` | Node 22 syntax and automated checks |
| Application `server.js` | Express API, generation prompt, upload checks and provider request |
| Application `package.json` / `package-lock.json` | Scripts and locked dependencies |
| Application `.env.example` | Environment-variable template |
| Application `render.yaml` | Render service configuration |
| Application `public/index.html` | Interface and font loading |
| Application `public/app.js` | Canvas, branding, text, QR and PNG export |
| Application `public/i18n.js` | English/Arabic translations |
| Application `public/styles.css` | Styling |
| Application `public/template.png` | Text-free master artwork |
| Application `public/3lababee-logo.png` / `favicon.ico` | Brand assets |
| Application `tests/smoke.mjs` | Health and rejected-upload tests |
| Application `tests/timeout.mjs` / `mock-timeout.mjs` | Free mocked timeout test |

## Local setup

Requires Node.js 20 or newer; CI uses Node.js 22. A real OpenRouter key is required only for real generation.

From the repository root:

```bash
cd 3LABABEE_OpenRouter_Production_Render/3lababee-openrouter-production
npm ci
```

Copy `.env.example` to `.env` in the application directory and set:

```env
OPENROUTER_API_KEY=YOUR_OPENROUTER_KEY
PORT=3000
APP_URL=http://localhost:3000
```

| Variable | Meaning |
| --- | --- |
| `OPENROUTER_API_KEY` | Server-side provider credential; required for real generation |
| `PORT` | Local port, default 3000; Render supplies its own |
| `APP_URL` | Referer sent to OpenRouter; defaults to localhost using PORT |
| `NODE_ENV` | Set to production on Render; enables one-hour static asset caching |

Start:

```bash
npm start
```

For local development with automatic restart:

```bash
npm run dev
```

Open <http://localhost:3000>. Keep the API key out of `public/`, browser code, Git and screenshots. Never commit a real `.env`.

## API and errors

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/health` | Returns `200 {"ok":true}`; does not test the provider |
| GET | `/api/config` | Returns configured flag and models; does not validate the API key |
| POST | `/api/generate-post` | Accepts multipart fields `product` (file), `model`, `resolution`; returns image bytes on success |

Successful image responses include `Content-Type`, `Cache-Control: no-store`, `X-3LABABEE-Model`, `X-3LABABEE-Requested-Resolution`, and optionally `X-OpenRouter-Cost`.

| HTTP | Code | Meaning |
| --- | --- | --- |
| 400 | `missing_product` | No product file |
| 400 | `invalid_image` | Missing/unrecognized signature or signature/MIME mismatch |
| 400 | `upload_error` | Multer rejection, including file size over the limit |
| 400 | `invalid_upload` | Other upload rejection, including unsupported MIME |
| 503 | `missing_api_key` | Provider key not configured |
| 503 | `server_busy` | Two generation handlers already active in this process |
| 500 | `missing_template` | Master template absent |
| 429 | `provider_rate_limited` | Provider returned 429 |
| 502 | `generation_provider_error` | Provider returned another unsuccessful HTTP status |
| 502 | `missing_image_data` | Successful provider response lacks image data |
| 502 | `generation_failed` | Exception not identified as TimeoutError |
| 504 | `generation_timeout` | Exception identified as TimeoutError |

Provider 401/403/402 responses are mapped to 502 in the browser. Diagnose their original status in server logs.

## Branding, text and QR customization

All application-relative paths below are inside the application directory.

### Template and protected artwork

`public/template.png` should contain the logo, background art, divider and empty QR card border, with no headline, subtitle or QR-label wording baked into it.

Update `BRAND_REGIONS` in `public/app.js` if the protected artwork moves. Restoration depends on the preserve-brand option.

### Text layers

Edit wording, font family, weight, size, color, position and spacing in `TEXT_LAYERS`. Design coordinates are based on 1024 × 1024 and scale with the export canvas.

| Layer | Current wording | Font |
| --- | --- | --- |
| Headline | New / Arrival | Cormorant Garamond, 128px, 500 |
| Subtitle | Fresh on the app. / just for you | Ovo, 32px, 400 |
| QR label | SCAN TO DISCOVER / ON 3LABABEE APP | Inter, 15px, 400 |

Fonts are loaded through `public/index.html`. Check rendering when external fonts are unavailable.

### QR and export

Adjust `QR_BOX` when the QR card moves. The UI allows QR scale and position changes and reset. Keep sufficient contrast and quiet zone, and scan the final exported PNG.

PNG dimensions follow the actual generated image, not merely the requested resolution. The filename includes the canvas width and height.

### Other customization

- AI instructions: `MERGE_PROMPT` in `server.js`.
- Translations: `public/i18n.js`.
- Layout and styling: `public/index.html` and `public/styles.css`.

## Render deployment

For the existing repository, create or configure a Render Web Service with:

| Setting | Value |
| --- | --- |
| Repository | `raghadghalib55-002/Ads_generator` |
| Branch | `main` |
| Root Directory | `3LABABEE_OpenRouter_Production_Render/3lababee-openrouter-production` |
| Runtime | Node |
| Build command | `npm ci` |
| Start command | `npm start` |
| Health check | `/health` |
| Environment | `NODE_ENV=production`, server-side `OPENROUTER_API_KEY`, final service URL as `APP_URL` |

Do not manually set PORT on Render. The server listens on `0.0.0.0` using Render's assigned port.

The included `render.yaml` declares a free-plan service and the environment settings, but does not declare `rootDir`. When using a Blueprint, ensure the service uses the application directory above; locating the YAML in a nested folder does not establish the npm working directory.

Deployment success is separate from merge or CI success. Record the deployed commit and compare it with the repository before testing. Static assets are cached for one hour in production; use a hard refresh when verifying a new deployment.

## Security and operational limits

PR [#1](https://github.com/raghadghalib55-002/Ads_generator/pull/1) was merged on 10 October 2026 as `52ef2f068bafa213acf640c1480981b2a4f38f07`.

Implemented:

- PNG/JPEG/WebP declared MIME allowlist and matching magic-byte checks.
- Per-file size limit of 20 × 1024 × 1024 bytes (20 MiB; UI messages say 20 MB).
- 120,000ms abort signal for the upstream request.
- Two active generation handlers per server process, with excess requests returning 503.
- Generalized provider HTTP error responses and reduced provider-response logging.
- Server-side API key and disabled Express X-Powered-By header.

Current limitations:

- No authentication, persistent rate limiting, daily quotas or financial spending cap. Restrict access before allowing public generation.
- The concurrency counter is process-local, not distributed, and resets on restart.
- Multipart uploads are buffered before the concurrency check, so it does not cap concurrent upload memory.
- Signature checks do not decode images or validate pixel dimensions; truncated files with valid headers can pass.
- Generated Base64, media type and dimensions are not validated by the backend.
- A timeout does not prove the provider cancelled generation or avoided charging.
- Upload handlers can return `error.message`; the missing-template response exposes its path; exception logging still includes the full error object. Safe provider messages are not comprehensive error sanitization.

## Tests and verification status

From the application directory:

```bash
node --check server.js
node --check public/app.js
node tests/smoke.mjs
node tests/timeout.mjs
```

These supplied tests make no billable provider requests. Smoke tests start a local server with an empty API-key value. Timeout tests replace the child server's fetch with a mock and use a fake key; do not load the mock in production.

[GitHub Actions run 38035374257](https://github.com/raghadghalib55-002/Ads_generator/actions/runs/38035374257) passed npm ci, both syntax checks, smoke and timeout tests for the final PR head.

| Verified in CI | Exact scope |
| --- | --- |
| Health | Local server starts and health responds successfully |
| Missing file | 400 / missing_product |
| Fake PNG | Text declared as PNG returns 400 / invalid_image |
| Oversized file | 20 MiB + one byte returns 400 / upload_error |
| Mock timeout | Abort after 80ms returns 504 / generation_timeout; fake key absent from response |

The timeout test does not verify a real 120-second wait. Existing tests do not establish real 1K/2K generation, PNG browser download, JPEG/WebP validation coverage, concurrency enforcement, provider-error mapping, actual deployed commit, or Render timeout behavior.

The workflow runs on pull requests and pushes to `security/initial-api-hardening`; it is not configured for push events on main.

## Deployment checklist without paid requests

### Current deployment: rejected inputs and read-only checks

First verify the deployed commit contains PR #1. Do not send a valid product image to the live generation endpoint during free testing.

- [ ] Record service URL, deployment time and deployed commit.
- [ ] GET /health: 200 with ok=true.
- [ ] GET /api/config: valid JSON without credentials; configured=true only means a key exists.
- [ ] Load template, logo, JavaScript and CSS; check browser console.
- [ ] Preview a product and QR locally without clicking Generate.
- [ ] POST with no product: 400 / missing_product.
- [ ] Upload arbitrary text declared as PNG, JPEG and WebP: 400 / invalid_image.
- [ ] Upload unsupported MIME such as text/plain: 400 / invalid_upload.
- [ ] Upload one file at 20 MiB + one byte: 400 / upload_error.
- [ ] Inspect replies and logs for credentials or unnecessary internal details.

### Isolated staging/local environment with a mocked provider

Use the deployed code revision, a fake key and interception of all provider traffic, with outbound OpenRouter access blocked. The provider URL is hardcoded; an environment-variable URL override alone will not redirect it. The supplied mock supports timeout only; other scenarios need additional test harnesses.

- [ ] Valid PNG/JPEG/WebP reach only the mock; mismatched MIME/signature returns 400.
- [ ] Return local PNG fixtures at 1024 × 1024 and 2048 × 2048; verify preview, branding, QR and downloaded PNG dimensions.
- [ ] Inspect mock request payload for model/resolution; verify Lite forces 1K.
- [ ] Hold two generation requests in the same process; third returns 503 / server_busy without a third mock call.
- [ ] Complete/fail pending requests; verify the next request is accepted.
- [ ] Mock provider 429: 429 / provider_rate_limited.
- [ ] Mock provider 401/500 containing a secret marker: 502 / generation_provider_error with no marker in browser response.
- [ ] Mock network failure and missing/invalid provider JSON; verify safe failure and released capacity.
- [ ] Exercise a real 120-second delay against the mock, including delayed response body; record status and timing. A body-read abort may follow the generic 502 path.
- [ ] Check UI recovery for 400/429/502/503/504 and absence of automatic billable retries.

For each result record commit, environment, input, HTTP status, error code, elapsed time, pass/fail and mock call count. Mocked success cannot prove real model availability, output quality, resolution support or billing.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| npm cannot find package.json on Render | Set Root Directory to the application path |
| configured=false | Set OPENROUTER_API_KEY server-side |
| 502 / generation_provider_error | Inspect original provider HTTP status in logs; 401/403 indicate credential/access issues, 402 indicates billing, other failures may be provider-side |
| 429 / provider_rate_limited | Provider capacity/rate limit; avoid repeated uncontrolled retries |
| 503 / server_busy | Wait for one of this process's two active handlers to finish |
| 504 / generation_timeout | Upstream TimeoutError; check timing and hosting behavior |
| 400 upload error | Use allowed MIME and matching image signature within 20 MiB |
| 500 / missing_template | Verify public/template.png exists in the deployed application |
| 502 / missing_image_data | Provider response does not contain expected data[0].b64_json |
| Wrong export size | Compare actual returned image dimensions with requested resolution |
| Text or brand artwork wrong | Check fonts, text-free template, TEXT_LAYERS and preserve-brand option |
| QR does not scan | Check size, placement, quiet zone and the downloaded PNG |
