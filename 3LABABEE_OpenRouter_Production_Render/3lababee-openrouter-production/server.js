import "dotenv/config";
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/images";
const TEMPLATE_PATH = path.join(__dirname, "public", "template.png");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = new Set(["image/png", "image/jpeg", "image/webp"]);
    if (!allowed.has(file.mimetype)) {
      return cb(new Error("Only PNG, JPEG and WebP product images are allowed."));
    }
    cb(null, true);
  },
});

app.disable("x-powered-by");
app.use(express.static(path.join(__dirname, "public"), {
  etag: true,
  maxAge: process.env.NODE_ENV === "production" ? "1h" : 0,
}));

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

const ALLOWED_MODELS = new Set([
  "google/gemini-3.1-flash-image",
  "google/gemini-3.1-flash-lite-image",
  "google/gemini-3-pro-image",
]);

const ALLOWED_RESOLUTIONS = new Set(["1K", "2K", "4K"]);

const MERGE_PROMPT = `
Create ONE finished premium square 3LABABEE product advertisement using TWO reference images.

REFERENCE 1 = the fixed 3LABABEE master advertising template.
REFERENCE 2 = the exact product photo uploaded by the user.

GOAL:
Place the product from REFERENCE 2 naturally on the right-side marble product stage inside the gold circular display area of REFERENCE 1.

TEMPLATE — CRITICAL:
- Keep the square 3LABABEE master template composition visually unchanged.
- Preserve the warm cream background, botanical shadows, gold circular frame, marble pedestal, spacing and overall layout.
- Keep the left-side logo and all existing text in the same locations.
- Do not add new text, labels, logos, badges, icons, props or branding.
- Keep the QR card on the lower-left EMPTY. Do not invent, draw, simulate, stylize or place a QR code. The real QR will be added later by software.

PRODUCT — CRITICAL:
- Treat REFERENCE 2 as the only source of truth for the product.
- Preserve the exact product identity, design, color, material, brand marks, patterns, stitching, hardware, proportions and distinctive details.
- Do not redesign or simplify the product.
- Do not invent extra straps, buckles, zippers, stones, logos, locks, accessories, parts or duplicate items.
- You MAY change only the viewing angle, rotation, perspective, scale and position when necessary to make the product fit the advertisement naturally.
- You MAY adapt lighting, reflections and realistic contact shadows to match the warm studio environment.

COMPOSITION:
- The product must be clearly visible and commercially attractive on the right pedestal.
- Keep it fully inside the intended product-display zone.
- Do not cover the 3LABABEE logo, headline, descriptive copy or QR panel.
- Maintain a premium, calm, elegant luxury e-commerce look.

OUTPUT:
- One square 1:1 advertisement.
- No QR code.
- No watermark.
- No extra captions.
`;

function toDataUrl(buffer, mimeType = "image/png") {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

app.get("/api/config", (_req, res) => {
  res.json({
    configured: Boolean(process.env.OPENROUTER_API_KEY),
    models: [
      { id: "google/gemini-3.1-flash-image", name: "Nano Banana 2 · Standard" },
      { id: "google/gemini-3-pro-image", name: "Gemini 3 Pro Image · Premium" },
      { id: "google/gemini-3.1-flash-lite-image", name: "Nano Banana 2 Lite · Economy" },
    ],
  });
});

app.post("/api/generate-post", upload.single("product"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ code: "missing_product", message: "Please upload a product image." });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(503).json({
        code: "missing_api_key",
        message: "OPENROUTER_API_KEY is not configured in the .env file.",
      });
    }

    if (!fs.existsSync(TEMPLATE_PATH)) {
      return res.status(500).json({ code: "missing_template", message: "public/template.png was not found." });
    }

    const model = ALLOWED_MODELS.has(req.body.model)
      ? req.body.model
      : "google/gemini-3.1-flash-image";

    let resolution = ALLOWED_RESOLUTIONS.has(req.body.resolution)
      ? req.body.resolution
      : "1K";

    // Nano Banana 2 Lite image output is 1K.
    if (model === "google/gemini-3.1-flash-lite-image") {
      resolution = "1K";
    }

    const templateBuffer = fs.readFileSync(TEMPLATE_PATH);
    const templateDataUrl = toDataUrl(templateBuffer, "image/png");
    const productDataUrl = toDataUrl(
      req.file.buffer,
      req.file.mimetype || "image/png"
    );

    const openRouterResponse = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": APP_URL,
        "X-Title": "3LABABEE Product Post Generator",
      },
      body: JSON.stringify({
        model,
        prompt: MERGE_PROMPT,
        input_references: [
          { type: "image_url", image_url: { url: templateDataUrl } },
          { type: "image_url", image_url: { url: productDataUrl } },
        ],
        aspect_ratio: "1:1",
        resolution,
        n: 1,
      }),
    });

    const responseText = await openRouterResponse.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      result = null;
    }

    if (!openRouterResponse.ok) {
      const message =
        result?.error?.message ||
        result?.message ||
        responseText ||
        `OpenRouter request failed (${openRouterResponse.status}).`;

      return res.status(openRouterResponse.status).json({
        code: result?.error?.code || "openrouter_error",
        message,
      });
    }

    const item = result?.data?.[0];
    const b64 = item?.b64_json;
    if (!b64) {
      return res.status(502).json({
        code: "missing_image_data",
        message: "OpenRouter returned no generated image data.",
      });
    }

    const mediaType = item?.media_type || "image/png";
    const cost = result?.usage?.cost;

    res.setHeader("Content-Type", mediaType);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-3LABABEE-Model", model);
    if (cost !== undefined && cost !== null) {
      res.setHeader("X-OpenRouter-Cost", String(cost));
    }

    res.send(Buffer.from(b64, "base64"));
  } catch (error) {
    console.error("OpenRouter image generation error:", error);
    return res.status(500).json({
      code: "generation_failed",
      message: error?.message || "The AI could not generate the product post.",
    });
  }
});

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      code: "upload_error",
      message: error.code === "LIMIT_FILE_SIZE"
        ? "Product image is too large. Maximum size is 20 MB."
        : error.message,
    });
  }

  if (error) {
    return res.status(400).json({ code: "invalid_upload", message: error.message });
  }

  res.status(500).json({ code: "unknown_error", message: "Unexpected server error." });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("3LABABEE OpenRouter Product Post Generator");
  console.log(`Listening on port ${PORT}`);
  console.log(`App URL: ${APP_URL}`);
});
