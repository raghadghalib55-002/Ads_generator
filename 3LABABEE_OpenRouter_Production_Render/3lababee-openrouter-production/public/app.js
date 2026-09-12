const productInput = document.getElementById("productInput");
const qrInput = document.getElementById("qrInput");
const generateBtn = document.getElementById("generateBtn");
const downloadBtn = document.getElementById("downloadBtn");
const resetQrBtn = document.getElementById("resetQrBtn");
const qrScale = document.getElementById("qrScale");
const qrX = document.getElementById("qrX");
const qrY = document.getElementById("qrY");
const statusEl = document.getElementById("status");
const costEl = document.getElementById("cost");
const productPreview = document.getElementById("productPreview");
const productPreviewWrap = document.getElementById("productPreviewWrap");
const modelSelect = document.getElementById("modelSelect");
const resolutionSelect = document.getElementById("resolutionSelect");
const modelHint = document.getElementById("modelHint");
const preserveBrand = document.getElementById("preserveBrand");

const canvas = document.getElementById("finalCanvas");
const ctx = canvas.getContext("2d");

// Coordinates are for the current text-free 3LABABEE master template
// (measured directly from public/template.png card border pixels, scaled to
// the 1024x1024 canvas). The card is now a plain empty rounded box (no
// viewfinder corner brackets) spanning roughly x:74-335, y:610-881 on the
// canvas — the label sits in its top area, the QR image fills the rest.
const QR_BOX = { x: 86, y: 687, w: 237, h: 174 };

// Exact template regions re-applied after AI generation.
// This prevents AI from changing the logo, background art, dividers or QR card
// border in these areas. The wording itself is NOT baked into these regions
// anymore — it's drawn by TEXT_LAYERS above. public/template.png must be the
// text-free version of the artwork (logo/divider/QR card border only).
const BRAND_REGIONS = [
  { x: 0.035, y: 0.035, w: 0.36, h: 0.12 },  // 3LABABEE logo
  { x: 0.035, y: 0.16,  w: 0.30, h: 0.22 },  // headline background area
  { x: 0.035, y: 0.34,  w: 0.27, h: 0.12 },  // subtitle background area + divider
  { x: 0.0723, y: 0.5953, w: 0.2544, h: 0.2654 }, // QR card (plain empty border, no label text)
];

// ---------------------------------------------------------------------------
// TEXT LAYERS — fully controlled from code, no longer baked into template.png.
// Edit wording / font / size / weight / color / position here any time.
// x/y/lineHeight are in the same 1024x1024 canvas coordinate space as QR_BOX.
// Positions below were calibrated from the current public/template.png; once
// the text-free version of the template is dropped in, nudge x/y a few px if
// needed to match exactly.
// ---------------------------------------------------------------------------
const GOLD = "#9E7452";
const NAVY = "#211C55";

const TEXT_LAYERS = [
  {
    id: "headline",
    lines: ["New", "Arrival"],
    colors: [GOLD, NAVY],
    x: 72,
    y: 184,
    lineHeight: 128,
    align: "left",
    fontWeight: "500",
    fontSize: 128,
    fontFamily: "'Cormorant Garamond', serif",
  },
  {
    id: "subtitle",
    lines: ["Fresh on the app.", "just for you"],
    colors: [NAVY, NAVY],
    x: 72,
    y: 471,
    lineHeight: 46,
    align: "left",
    fontWeight: "400",
    fontSize: 32,
    fontFamily: "'Ovo', serif",
  },
  {
    id: "qrLabel",
    lines: ["SCAN TO DISCOVER", "ON 3LABABEE APP"],
    colors: [GOLD, NAVY],
    x: 205,
    y: 632,
    lineHeight: 22,
    align: "center",
    fontWeight: "400",
    fontSize: 15,
    fontFamily: "'Inter', sans-serif",
    letterSpacing: 1.2,
  },
];

function drawLetterSpacedLine(text, x, y, spacing, align) {
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);

  let cursor = x;
  if (align === "center") cursor = x - total / 2;
  else if (align === "right") cursor = x - total;

  const prevAlign = ctx.textAlign;
  ctx.textAlign = "left";
  chars.forEach((c, i) => {
    ctx.fillText(c, cursor, y);
    cursor += widths[i] + spacing;
  });
  ctx.textAlign = prevAlign;
}

function drawTextLayer(layer) {
  ctx.save();
  ctx.font = `${layer.fontWeight} ${layer.fontSize}px ${layer.fontFamily}`;
  ctx.textBaseline = "top";
  ctx.textAlign = layer.align;

  layer.lines.forEach((line, i) => {
    ctx.fillStyle = layer.colors?.[i] || layer.color || NAVY;
    const y = layer.y + i * layer.lineHeight;
    if (layer.letterSpacing) {
      drawLetterSpacedLine(line, layer.x, y, layer.letterSpacing, layer.align);
    } else {
      ctx.fillText(line, layer.x, y);
    }
  });
  ctx.restore();
}

function drawAllTextLayers() {
  TEXT_LAYERS.forEach(drawTextLayer);
}

let productFile = null;
let aiPosterImage = null;
let qrImage = null;
let fontsReady = false;

const templateImage = new Image();
templateImage.src = "/template.png";
templateImage.onload = render;

Promise.all(
  TEXT_LAYERS.map((layer) =>
    document.fonts.load(`${layer.fontWeight} ${layer.fontSize}px ${layer.fontFamily}`)
  )
)
  .catch(() => {})
  .then(() => {
    fontsReady = true;
    render();
  });

function setStatus(message, type = "") {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`.trim();
}

function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => reject(new Error("Could not read image."));
    image.src = url;
  });
}

function blobToImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => reject(new Error("Could not read generated image."));
    image.src = url;
  });
}

function drawContain(img, box, scale = 1, dx = 0, dy = 0) {
  const ratio = Math.min(box.w / img.width, box.h / img.height) * scale;
  const width = img.width * ratio;
  const height = img.height * ratio;
  const x = box.x + (box.w - width) / 2 + dx;
  const y = box.y + (box.h - height) / 2 + dy;
  ctx.drawImage(img, x, y, width, height);
}

function drawExactTemplateRegions() {
  if (!templateImage.complete || !templateImage.naturalWidth) return;

  for (const r of BRAND_REGIONS) {
    const sx = r.x * templateImage.naturalWidth;
    const sy = r.y * templateImage.naturalHeight;
    const sw = r.w * templateImage.naturalWidth;
    const sh = r.h * templateImage.naturalHeight;

    const dx = r.x * canvas.width;
    const dy = r.y * canvas.height;
    const dw = r.w * canvas.width;
    const dh = r.h * canvas.height;

    ctx.drawImage(templateImage, sx, sy, sw, sh, dx, dy, dw, dh);
  }
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const base = aiPosterImage || templateImage;
  if (base?.complete && base.naturalWidth) {
    ctx.drawImage(base, 0, 0, canvas.width, canvas.height);
  }

  // Re-apply exact non-product brand areas from the original master template.
  if (aiPosterImage && preserveBrand.checked) {
    drawExactTemplateRegions();
  }

  // QR is direct from the uploaded QR file, drawn before the text layer.
  if (qrImage) {
    drawContain(
      qrImage,
      QR_BOX,
      Number(qrScale.value) / 100,
      Number(qrX.value),
      Number(qrY.value)
    );
  }

  // Text is code-controlled (see TEXT_LAYERS above) and always drawn last,
  // regardless of the template/AI image, so it's never baked into template.png.
  if (fontsReady) {
    drawAllTextLayers();
  }

  downloadBtn.disabled = !aiPosterImage;
}

function updateModelUi() {
  const model = modelSelect.value;

  if (model === "google/gemini-3.1-flash-lite-image") {
    resolutionSelect.value = "1K";
    resolutionSelect.disabled = true;
    modelHint.textContent = "Economy mode: Nano Banana 2 Lite outputs at 1K.";
  } else if (model === "google/gemini-3-pro-image") {
    resolutionSelect.disabled = false;
    modelHint.textContent = "Premium mode: highest quality; slower and more expensive.";
  } else {
    resolutionSelect.disabled = false;
    modelHint.textContent = "Standard mode: recommended balance of quality, speed and cost.";
  }
}

modelSelect.addEventListener("change", updateModelUi);
updateModelUi();

productInput.addEventListener("change", () => {
  productFile = productInput.files?.[0] || null;
  generateBtn.disabled = !productFile;

  if (!productFile) {
    productPreviewWrap.classList.add("hidden");
    return;
  }

  productPreview.src = URL.createObjectURL(productFile);
  productPreviewWrap.classList.remove("hidden");
  setStatus("Product ready. Choose a model and generate.");
});

qrInput.addEventListener("change", async () => {
  const file = qrInput.files?.[0];
  if (!file) {
    qrImage = null;
    render();
    return;
  }

  qrImage = await fileToImage(file);
  render();
  setStatus(
    aiPosterImage
      ? "QR added untouched on top of the final poster."
      : "QR loaded. It will be added only after AI generation."
  );
});

generateBtn.addEventListener("click", async () => {
  if (!productFile) return;

  generateBtn.disabled = true;
  downloadBtn.disabled = true;
  costEl.classList.add("hidden");
  setStatus("OpenRouter is merging the product into the fixed 3LABABEE template…");

  try {
    const form = new FormData();
    form.append("product", productFile);
    form.append("model", modelSelect.value);
    form.append("resolution", resolutionSelect.value);

    const response = await fetch("/api/generate-post", {
      method: "POST",
      body: form,
    });

    if (!response.ok) {
      let errorData = {};
      try { errorData = await response.json(); } catch {}
      throw new Error(errorData.message || `Generation failed (${response.status}).`);
    }

    const resultBlob = await response.blob();
    aiPosterImage = await blobToImage(resultBlob);

    const cost = response.headers.get("X-OpenRouter-Cost");
    if (cost) {
      const value = Number(cost);
      costEl.textContent = Number.isFinite(value)
        ? `OpenRouter generation cost: $${value.toFixed(4)}`
        : `OpenRouter generation cost: $${cost}`;
      costEl.classList.remove("hidden");
    }

    render();
    setStatus(
      qrImage
        ? "Done. Product generated, exact brand areas restored, and QR added untouched."
        : "AI poster ready. Upload the product QR to finish.",
      "success"
    );
  } catch (error) {
    console.error(error);
    setStatus(error.message || "AI generation failed.", "error");
  } finally {
    generateBtn.disabled = false;
  }
});

[preserveBrand, qrScale, qrX, qrY].forEach((control) => {
  control.addEventListener("input", render);
  control.addEventListener("change", render);
});

resetQrBtn.addEventListener("click", () => {
  qrScale.value = 100;
  qrX.value = 0;
  qrY.value = 0;
  render();
});

downloadBtn.addEventListener("click", () => {
  render();
  const link = document.createElement("a");
  link.download = "3lababee-product-post.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
});
