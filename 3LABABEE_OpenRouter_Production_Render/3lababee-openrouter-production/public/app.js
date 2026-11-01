const productInput = document.getElementById("productInput");
const productTypeSelect = document.getElementById("productTypeSelect");
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

const comparisonStage = document.getElementById("comparisonStage");
const comparisonOriginal = document.getElementById("comparisonOriginal");
const comparisonDivider = document.getElementById("comparisonDivider");
const comparisonBeforeLabel = document.getElementById("comparisonBeforeLabel");
const comparisonAfterLabel = document.getElementById("comparisonAfterLabel");
const comparisonRange = document.getElementById("comparisonRange");

function updateComparison() {
  const available = Boolean(aiPosterImage && productPreviewUrl && currentStep === 4);
  comparisonStage.classList.toggle("is-comparing", available);
  comparisonOriginal.hidden = !available;
  comparisonDivider.hidden = !available;
  comparisonBeforeLabel.hidden = !available;
  comparisonAfterLabel.hidden = !available;
  comparisonRange.hidden = !available;
  if (available) {
    if (comparisonOriginal.src !== productPreviewUrl) comparisonOriginal.src = productPreviewUrl;
    comparisonStage.style.setProperty("--comparison-split", comparisonRange.value + "%");
  } else {
    comparisonOriginal.removeAttribute("src");
  }
}
comparisonRange.addEventListener("input", updateComparison);

const canvas = document.getElementById("finalCanvas");
const ctx = canvas.getContext("2d");


const BASE_SIZE = 1024;

let generatedResolution = null;

function updateExportResolution() {
  const width = aiPosterImage?.naturalWidth || BASE_SIZE;
  const height = aiPosterImage?.naturalHeight || BASE_SIZE;

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  const label = document.getElementById("exportResolution");

  if (label) {
    label.textContent = `1:1 · ${width} × ${height} export`;
  }

  generatedResolution = {
    width,
    height,
    requested: resolutionSelect.value
  };
}

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
  // Protect the main left side for the full poster
  {
    x: 0,
    y: 0,
    w: 0.43,
    h: 1
  },

  // Extra protection around headline/subtitle area
  // Prevents AI-generated letters from appearing beside "New Arrival"
  {
    x: 0,
    y: 0.10,
    w: 0.52,
    h: 0.45
  }
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
  if (!templateImage.complete || !templateImage.naturalWidth) {
    return;
  }

  for (const r of BRAND_REGIONS) {
    const sx = r.x * templateImage.naturalWidth;
    const sy = r.y * templateImage.naturalHeight;
    const sw = r.w * templateImage.naturalWidth;
    const sh = r.h * templateImage.naturalHeight;

    // Draw in the original 1024x1024 coordinate space.
    // The render() transform handles export scaling.
    const dx = r.x * BASE_SIZE;
    const dy = r.y * BASE_SIZE;
    const dw = r.w * BASE_SIZE;
    const dh = r.h * BASE_SIZE;

    ctx.drawImage(
      templateImage,
      sx, sy, sw, sh,
      dx, dy, dw, dh
    );
  }
}



function render() {
  const width = canvas.width;
  const height = canvas.height;

  // Reset transformation before clearing.
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);

  // Draw AI image at its actual resolution.
  const base = aiPosterImage || templateImage;

  if (base?.complete && base.naturalWidth) {
    ctx.drawImage(base, 0, 0, width, height);
  }

  // Use the original 1024x1024 design coordinates.
  ctx.save();

  ctx.setTransform(
    width / BASE_SIZE,
    0,
    0,
    height / BASE_SIZE,
    0,
    0
  );

  // Restore protected branding regions.
  if (aiPosterImage && preserveBrand.checked) {
    drawExactTemplateRegions();
  }

  // Add the original QR image.
  if (qrImage) {
    drawContain(
      qrImage,
      QR_BOX,
      Number(qrScale.value) / 100,
      Number(qrX.value),
      Number(qrY.value)
    );
  }

  // Draw typography at the export resolution.
  if (fontsReady) {
    drawAllTextLayers();
  }

  ctx.restore();

  // Always leave the canvas transform reset.
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  downloadBtn.disabled = !aiPosterImage;
}


// Published Ads Temp pricing: 1 credit = 0.01 JOD.
// Informational only; this client does not implement a wallet or deductions.
const IMAGE_CREDIT_PRICES = Object.freeze({
  "google/gemini-3.1-flash-lite-image": { "1K": 15 },
  "google/gemini-3.1-flash-image": { "1K": 25, "2K": 35, "4K": 50 },
  "google/gemini-3-pro-image": { "1K": 40, "2K": 40, "4K": 70 }
});
const MODEL_GUIDE = {
  "google/gemini-3.1-flash-lite-image": { title: ["Economy · Nano Banana 2 Lite", "اقتصادي · Nano Banana 2 Lite"], description: ["For low-cost testing. Supports 1K only.", "مناسب للتجارب بتكلفة أقل. يدعم دقة 1K فقط."] },
  "google/gemini-3.1-flash-image": { title: ["Standard · Nano Banana 2", "قياسي · Nano Banana 2"], description: ["Balanced option for everyday advertisements.", "خيار متوازن لإنشاء الإعلانات اليومية."] },
  "google/gemini-3-pro-image": { title: ["Premium · Gemini 3 Pro Image", "مميز · Gemini 3 Pro Image"], description: ["For higher-detail results; may take longer.", "للصور ذات التفاصيل الأعلى، وقد يستغرق وقتًا أطول."] }
};
const RESOLUTION_GUIDE = {
  "1K": ["1K · Recommended for quick tests.", "1K · مناسبة للتجارب السريعة."],
  "2K": ["2K · More detail for polished posts.", "2K · تفاصيل أكثر للإعلانات النهائية."],
  "4K": ["4K · Highest resolution; larger output.", "4K · أعلى دقة وحجم صورة أكبر."]
};
function currentUiLanguage() {
  return document.documentElement.lang === "ar" ? 1 : 0;
}
function selectedImageCredits() {
  return IMAGE_CREDIT_PRICES[modelSelect.value]?.[resolutionSelect.value] ?? null;
}
function updateModelUi() {
  const model = modelSelect.value;
  const isLite = model === "google/gemini-3.1-flash-lite-image";
  if (isLite) resolutionSelect.value = "1K";
  resolutionSelect.disabled = isLite;
  const language = currentUiLanguage();
  const guide = MODEL_GUIDE[model];
  const credits = selectedImageCredits();
  modelHint.textContent = isLite
    ? (language ? "هذا النموذج يدعم 1K فقط." : "This model supports 1K only.")
    : "";
  document.getElementById("selectedModelTitle").textContent = guide?.title[language] || "";
  document.getElementById("selectedModelDescription").textContent = guide?.description[language] || "";
  document.getElementById("resolutionDescription").textContent = RESOLUTION_GUIDE[resolutionSelect.value]?.[language] || "";
  document.getElementById("estimatedCreditCount").textContent = credits === null ? "—" : String(credits);
  document.getElementById("estimatedJod").textContent = credits === null ? "—" : (credits / 100).toFixed(2);
}

// Four-step interface. The existing generation, QR and export logic remains unchanged.
const stepPanels = [...document.querySelectorAll("[data-step-panel]")];
const stepIndicators = [...document.querySelectorAll("[data-step-indicator]")];
const stepBackBtn = document.getElementById("stepBackBtn");
const stepNextBtn = document.getElementById("stepNextBtn");
const generationSummary = document.getElementById("generationSummary");
let currentStep = 1;
let generationBusy = false;

function updateWizard() {
  stepPanels.forEach(panel => {
    const active = Number(panel.dataset.stepPanel) === currentStep;
    panel.hidden = !active;
  });
  stepIndicators.forEach(indicator => {
    const n = Number(indicator.dataset.stepIndicator);
    indicator.classList.toggle("is-active", n === currentStep);
    indicator.classList.toggle("is-complete", n < currentStep);
    if (n === currentStep) indicator.setAttribute("aria-current", "step");
    else indicator.removeAttribute("aria-current");
  });
  stepBackBtn.hidden = currentStep === 1;
  stepBackBtn.disabled = generationBusy;
  stepNextBtn.hidden = currentStep >= 3;
  stepNextBtn.disabled = generationBusy || (currentStep === 1 && !productFile);
  updateComparison();
  if (currentStep === 3) {
    const model = modelSelect.options[modelSelect.selectedIndex]?.textContent?.trim() || modelSelect.value;
    const category = productTypeSelect.options[productTypeSelect.selectedIndex]?.textContent?.trim() || productTypeSelect.value;
    const credits = selectedImageCredits();
    const isArabic = document.documentElement.lang === "ar";
    const reviewImage = document.getElementById("reviewProductImage");
    if (productFile && productPreviewUrl) {
      reviewImage.src = productPreviewUrl;
      reviewImage.alt = productFile.name;
    } else {
      reviewImage.removeAttribute("src");
    }
    document.getElementById("reviewProductName").textContent = productFile?.name || "";
    document.getElementById("reviewProductSize").textContent = productFile ? (productFile.size / (1024 * 1024)).toFixed(2) + " MB" : "";
    document.getElementById("reviewCategory").textContent = category;
    document.getElementById("reviewModel").textContent = model;
    document.getElementById("reviewResolution").textContent = resolutionSelect.value;
    document.getElementById("reviewCredits").textContent = credits === null ? "—" : `${credits} ${isArabic ? "كريديت" : "credits"}`;
    document.getElementById("reviewJod").textContent = credits === null ? "" : `${(credits / 100).toFixed(2)} ${isArabic ? "د.أ" : "JOD"}`;
  }
}
function goToStep(n) {
  if (generationBusy || n < 1 || n > 4) return;
  if (n > 1 && !productFile) return;
  if (n === 4 && !aiPosterImage) return;
  currentStep = n;
  updateWizard();
}
stepBackBtn.addEventListener("click", () => goToStep(currentStep - 1));
stepNextBtn.addEventListener("click", () => goToStep(currentStep + 1));
document.querySelectorAll(".lang-btn").forEach(btn => btn.addEventListener("click", () => {
  // Refresh translated review labels after the language switch.
  updateWizard();
}));
updateWizard();

modelSelect.addEventListener("change", updateModelUi);
resolutionSelect.addEventListener("change", updateModelUi);
document.addEventListener("3lababee:languagechange", () => { updateModelUi(); updateWizard(); });
updateModelUi();

const productDropzone = document.getElementById("productDropzone");
const changeProductBtn = document.getElementById("changeProductBtn");
const removeProductBtn = document.getElementById("removeProductBtn");
const productFileName = document.getElementById("productFileName");
const productFileSize = document.getElementById("productFileSize");
let productPreviewUrl = null;

function setProductFile(file) {
  if (file) {
    const allowed = ["image/png", "image/jpeg", "image/webp"];
    if (!allowed.includes(file.type) || file.size > 20 * 1024 * 1024 || file.size === 0) {
      setStatus("Choose a PNG, JPG or WebP image up to 20 MB.", "error");
      return;
    }
  }
  if (productPreviewUrl) {
    URL.revokeObjectURL(productPreviewUrl);
    productPreviewUrl = null;
  }
  productFile = file || null;
  generateBtn.disabled = !productFile;
  if (productFile) {
    productPreviewUrl = URL.createObjectURL(productFile);
    productPreview.src = productPreviewUrl;
    productFileName.textContent = productFile.name;
    productFileSize.textContent = (productFile.size / (1024 * 1024)).toFixed(2) + " MB";
    productPreviewWrap.classList.remove("hidden");
    productDropzone.classList.add("has-file");
    setStatus("Product ready. Continue to AI settings.");
  } else {
    productPreview.removeAttribute("src");
    productPreviewWrap.classList.add("hidden");
    productDropzone.classList.remove("has-file");
    productInput.value = "";
    setStatus("Upload a product image to start.");
  }
  // A changed product must not leave an old generated advertisement downloadable.
  aiPosterImage = null;
  downloadBtn.disabled = true;
  costEl.classList.add("hidden");
  render();
  if (!productFile && currentStep > 1) currentStep = 1;
  updateWizard();
}

productInput.addEventListener("change", () => {
  if (productInput.files?.[0]) setProductFile(productInput.files[0]);
});
productDropzone.addEventListener("click", () => productInput.click());
productDropzone.addEventListener("keydown", event => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    productInput.click();
  }
});
changeProductBtn.addEventListener("click", () => productInput.click());
removeProductBtn.addEventListener("click", () => setProductFile(null));
["dragenter", "dragover"].forEach(type => productDropzone.addEventListener(type, event => {
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  productDropzone.classList.add("is-dragover");
}));
["dragleave", "drop"].forEach(type => productDropzone.addEventListener(type, event => {
  event.preventDefault();
  productDropzone.classList.remove("is-dragover");
}));
productDropzone.addEventListener("drop", event => {
  const file = event.dataTransfer?.files?.[0];
  if (file) setProductFile(file);
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

const generationProgress = document.getElementById("generationProgress");
const generationError = document.getElementById("generationError");
const generationErrorMessage = document.getElementById("generationErrorMessage");
const retryGenerateBtn = document.getElementById("retryGenerateBtn");
retryGenerateBtn.addEventListener("click", () => {
  if (!generationBusy && productFile) generateBtn.click();
});

generateBtn.addEventListener("click", async () => {
  if (!productFile || generationBusy) return;

  generationBusy = true;
  generationError.hidden = true;
  generationProgress.hidden = false;
  generateBtn.setAttribute("aria-busy", "true");
  updateWizard();
  generateBtn.disabled = true;
  downloadBtn.disabled = true;
  costEl.classList.add("hidden");
  setStatus("3LABABEE AI is creating your advertisement…");

  try {
    const form = new FormData();
    form.append("product", productFile);
    form.append("productType", productTypeSelect.value);
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

    // Match export dimensions to the actual AI output.
    updateExportResolution();

    console.log("Requested resolution:", resolutionSelect.value);
    console.log(
      "Actual AI resolution:",
      aiPosterImage.naturalWidth,
      "x",
      aiPosterImage.naturalHeight
    );


    // Provider cost is intentionally not shown in the customer interface.
    costEl.classList.add("hidden");

    render();
    generationBusy = false;
    goToStep(4);
    setStatus(
      qrImage
        ? "Done. Product generated, exact brand areas restored, and QR added untouched."
        : "AI poster ready. Upload the product QR to finish.",
      "success"
    );
  } catch (error) {
    console.error(error);
    generationErrorMessage.textContent = error.message || (document.documentElement.lang === "ar" ? "فشل إنشاء الإعلان. يرجى المحاولة مرة أخرى." : "Generation failed. Please try again.");
    generationError.hidden = false;
    setStatus(document.documentElement.lang === "ar" ? "لم يكتمل إنشاء الإعلان. يمكنك إعادة المحاولة." : "Advertisement generation failed. You can retry.", "error");
  } finally {
    generationBusy = false;
    generationProgress.hidden = true;
    generateBtn.removeAttribute("aria-busy");
    generateBtn.disabled = !productFile;
    updateWizard();
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


downloadBtn.addEventListener("click", async () => {
  if (!aiPosterImage) return;

  try {
    render();

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) resolve(result);
          else reject(new Error("PNG export failed."));
        },
        "image/png"
      );
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.download =
      `3lababee-product-post-${canvas.width}x${canvas.height}.png`;

    link.href = url;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);

    setStatus(
      `PNG exported successfully: ${canvas.width} × ${canvas.height}`,
      "success"
    );
  } catch (error) {
    console.error(error);
    setStatus(error.message || "Export failed.", "error");
  }
});

