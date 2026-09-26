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
REFERENCE 2 = the exact real product photograph uploaded by the user.

PRIMARY OBJECTIVE:
Integrate the exact product from REFERENCE 2 naturally onto the right-side
marble product stage inside the gold circular display area of REFERENCE 1.

The product must look like the SAME physical product photographed in
REFERENCE 2, not an AI recreation or a similar product.

PRODUCT FIDELITY — HIGHEST PRIORITY:
- REFERENCE 2 is the absolute source of truth for the product.
- Preserve the product's exact identity and appearance.
- Preserve all visible brand names, logos, printed text, engravings,
  labels, numbers, symbols and markings exactly as they appear in REFERENCE 2.
- Preserve exact shape, proportions, geometry, materials, colors, textures,
  stitching, hardware, gemstones, buttons, buckles, straps and distinctive details.
- Do NOT rewrite, reinterpret, regenerate, misspell, replace or invent
  any text or branding visible on the product.
- Do NOT create a similar or approximate version of the product.
- Do NOT simplify fine details.
- Do NOT add or remove product parts.
- Do NOT duplicate the product.
- There must be exactly ONE product in the final advertisement.

IMPORTANT:
Product fidelity is more important than creating a dramatic new viewing angle.

If changing the product's angle or perspective would require reconstructing,
guessing or altering any product detail, KEEP THE ORIGINAL PRODUCT VIEWING
ANGLE instead.

ALLOWED PRODUCT ADJUSTMENTS:
- Position the product within the right-side display area.
- Resize it proportionally.
- Make only minimal perspective or rotation adjustments when they can be
  performed without changing product identity or details.
- Match the surrounding warm studio lighting naturally.
- Add a realistic contact shadow where the product meets the pedestal.
- Make subtle exposure and color adjustments necessary for integration.

DO NOT:
- Redesign the product.
- Reconstruct product branding.
- Generate new writing on the product.
- Change logos or labels.
- Change product proportions.
- Add accessories or missing parts.
- Remove existing parts.
- Create reflections that look like a second product.
- Create a second copy of the product.
- Place any part of the product outside the intended right-side display zone.

TEMPLATE — CRITICAL:
- Preserve the master template composition.
- Preserve the warm cream environment, botanical shadows, gold circular
  frame, marble pedestal, spacing and overall visual style.
- The entire left side is a protected branding area.
- Do NOT add ANY new letters, words, numbers, labels, logos, badges,
  promotional text or symbols anywhere in the advertisement.
- Do not modify or recreate the existing left-side typography.
- Keep the QR card area empty.
- Do NOT generate, imitate, stylize or reconstruct a QR code.
- The real QR code will be added programmatically after generation.

COMPOSITION:
- Place the product naturally and prominently on the right marble pedestal.
- Keep the product fully visible.
- Maintain realistic scale.
- Match the direction and softness of the template lighting.
- Create realistic contact with the pedestal rather than making the product float.
- Keep the result elegant, premium, clean and suitable for e-commerce advertising.

FINAL QUALITY CHECK:
Before producing the image, compare the product against REFERENCE 2.
The final product must remain recognizable as the exact same item.

If there is any conflict between visual creativity and preserving the original
product accurately, ALWAYS choose product accuracy.

OUTPUT:
- One square 1:1 advertisement.
- Exactly one product.
- No generated QR code.
- No watermark.
- No additional captions.
- No invented text.
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
