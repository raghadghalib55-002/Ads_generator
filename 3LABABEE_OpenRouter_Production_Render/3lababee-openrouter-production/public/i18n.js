
const translations = {
  en: {
    title: "AI Product Post Generator",
    subtitle: "AI-powered product advertising studio",
    intro: "Upload your product image, create a professional advertisement with 3LABABEE, and add your QR code to the final design.",
    modelLabel: "AI model",
    resolutionLabel: "AI resolution",
    productLabel: "1. Product image",
    tipsTitle: "Product Photo Tips",
    viewGuidelines: "View guidelines",
    tipsIntro: "Follow these recommendations for better advertisement results:",
    tip1: "Upload a clear, high-resolution product image.",
    tip2: "Use a clean, simple background whenever possible.",
    tip3: "Make sure the entire product is visible and not cropped.",
    tip4: "Avoid blurry images, harsh shadows, and reflections.",
    tip5: "Keep product logos, labels, and important details visible.",
    tip6: "Upload one product per image for better results.",
    tip7: "Choose your preferred viewing angle before uploading.",
    orientationTitle: "Important: Product Orientation",
    orientation1: "3LABABEE AI aims to preserve the original viewing angle and direction of your uploaded product.",
    orientation2: "For example, if you upload a shoe with its heel on the right and its toe pointing left, the generated advertisement will generally maintain that orientation.",
    orientation3: "Choose the product angle and direction you want to appear in your final advertisement.",
    disclaimer: "Please note: AI-generated results may vary and may alter small text, logos, or packaging details. Always review your final advertisement before publishing.",
    preserveLabel: "Preserve original logo, text and QR card exactly",
    generateBtn: "Generate with 3LABABEE",
    qrLabel: "2. Product QR · untouched",
    qrHint: "The QR is composited directly in the browser after AI generation, so its pattern is never regenerated.",
    qrSize: "QR size",
    horizontal: "Horizontal",
    vertical: "Vertical",
    resetQr: "Reset QR",
    downloadBtn: "Download PNG",
    initialStatus: "Upload a product image to start.",
    previewTitle: "Final Post Preview",
    previewSize: "1:1 · 1024 × 1024 export",
    modelStandard: "Nano Banana 2 · Standard",
    modelPremium: "Gemini 3 Pro Image · Premium",
    modelEconomy: "Nano Banana 2 Lite · Economy",
    res1k: "1K · Recommended for testing",
    res2k: "2K",
    res4k: "4K"
  },

  ar: {
    title: "مولّد إعلانات المنتجات بالذكاء الاصطناعي",
    subtitle: "استوديو ذكي لإنشاء إعلانات احترافية لمنتجاتك",
    intro: "ارفع صورة منتجك، وأنشئ إعلانًا احترافيًا باستخدام 3LABABEE، ثم أضف رمز QR الخاص بالمنتج إلى التصميم النهائي.",
    modelLabel: "نموذج الذكاء الاصطناعي",
    resolutionLabel: "دقة الصورة",
    productLabel: "١. صورة المنتج",
    tipsTitle: "نصائح لتصوير المنتج",
    viewGuidelines: "عرض الإرشادات",
    tipsIntro: "للحصول على نتائج إعلانية أفضل، ننصحك بما يلي:",
    tip1: "ارفع صورة واضحة وعالية الدقة للمنتج.",
    tip2: "استخدم خلفية بسيطة ونظيفة قدر الإمكان.",
    tip3: "تأكد من ظهور المنتج كاملًا دون قص أي جزء منه.",
    tip4: "تجنب الصور الضبابية والظلال القوية والانعكاسات.",
    tip5: "احرص على وضوح الشعار والملصقات والتفاصيل المهمة.",
    tip6: "يُفضّل رفع صورة لمنتج واحد فقط.",
    tip7: "اختر زاوية التصوير والاتجاه الذي ترغب بظهور المنتج به في الإعلان.",
    orientationTitle: "مهم: اتجاه المنتج في الصورة",
    orientation1: "يسعى 3LABABEE AI إلى الحفاظ على زاوية التصوير واتجاه المنتج كما يظهران في الصورة الأصلية.",
    orientation2: "مثلًا، إذا رفعت صورة حذاء وكان الكعب على اليمين والمقدمة باتجاه اليسار، فعادةً سيحاول الإعلان الناتج الحفاظ على الاتجاه نفسه.",
    orientation3: "لذلك، اختر الزاوية والاتجاه المناسبين قبل رفع الصورة.",
    disclaimer: "ملاحظة: قد تختلف نتائج الذكاء الاصطناعي، وقد تتغير بعض النصوص الصغيرة أو الشعارات أو تفاصيل العبوة. يُرجى مراجعة الإعلان النهائي قبل نشره.",
    preserveLabel: "الحفاظ على الشعار والنصوص وبطاقة QR الأصلية دون تغيير",
    generateBtn: "إنشاء الإعلان باستخدام 3LABABEE",
    qrLabel: "٢. رمز QR الخاص بالمنتج",
    qrHint: "تتم إضافة رمز QR مباشرةً إلى التصميم بعد إنشاء الصورة، دون إعادة توليد الرمز، للحفاظ على نمطه الأصلي.",
    qrSize: "حجم رمز QR",
    horizontal: "الموضع الأفقي",
    vertical: "الموضع العمودي",
    resetQr: "إعادة ضبط QR",
    downloadBtn: "تحميل الصورة PNG",
    initialStatus: "ارفع صورة المنتج للبدء.",
    previewTitle: "معاينة الإعلان النهائي",
    previewSize: "مربع 1:1 · التصدير بدقة 1024 × 1024",
    modelStandard: "Nano Banana 2 · قياسي",
    modelPremium: "Gemini 3 Pro Image · مميز",
    modelEconomy: "Nano Banana 2 Lite · اقتصادي",
    res1k: "1K · موصى بها للتجربة",
    res2k: "2K",
    res4k: "4K"
  }
};

function applyLanguage(lang) {
  const selected = translations[lang] ? lang : "en";
  const dictionary = translations[selected];

  document.documentElement.lang = selected;
  document.documentElement.dir = selected === "ar" ? "rtl" : "ltr";

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;

    if (Object.prototype.hasOwnProperty.call(dictionary, key)) {
      element.textContent = dictionary[key];
    }
  });

  document.querySelectorAll(".lang-btn").forEach((button) => {
    const active = button.dataset.lang === selected;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  localStorage.setItem("3lababee-language", selected);
}

document.addEventListener("DOMContentLoaded", () => {
  const savedLanguage = localStorage.getItem("3lababee-language");
  applyLanguage(savedLanguage || "en");

  document.querySelectorAll(".lang-btn").forEach((button) => {
    button.addEventListener("click", () => {
      applyLanguage(button.dataset.lang);
    });
  });
});
