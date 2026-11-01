/* Local-only generation history. Browser storage may be cleared by the user. */
(() => {
  const DB = "3lababee-generation-history";
  const STORE = "posters";
  const openBtn = document.getElementById("historyOpenBtn");
  const modal = document.getElementById("historyModal");
  const grid = document.getElementById("historyGrid");
  const empty = document.getElementById("historyEmpty");
  const note = document.getElementById("historyNote");
  let currentId = null;
  let dbPromise;
  let objectUrls = [];
  const ar = () => document.documentElement.lang === "ar";
  const t = (en, arabic) => ar() ? arabic : en;
  function database() {
    if (!window.indexedDB) return Promise.reject(new Error("IndexedDB unavailable"));
    if (!dbPromise) dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE))
          request.result.createObjectStore(STORE, { keyPath: "id" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }).catch(error => { dbPromise = null; throw error; });
    return dbPromise;
  }
  async function transact(mode, callback) {
    const db = await database();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = callback(tx.objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      tx.onabort = () => reject(tx.error);
    });
  }
  const all = () => transact("readonly", store => store.getAll());
  const remove = id => transact("readwrite", store => store.delete(id));
  const put = entry => transact("readwrite", store => store.put(entry));
  const blobFromCanvas = canvas => new Promise((resolve, reject) =>
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Could not capture image")), "image/png"));
  async function save() {
    if (!window.aiPosterImage && typeof aiPosterImage !== "undefined" && !aiPosterImage) return;
    const canvas = document.getElementById("finalCanvas");
    const blob = await blobFromCanvas(canvas);
    const id = currentId || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());
    const previous = currentId ? await transact("readonly", store => store.get(currentId)) : null;
    await put({
      id, createdAt: previous?.createdAt || Date.now(), updatedAt: Date.now(), image: blob,
      productName: document.getElementById("productInput")?.files?.[0]?.name || "",
      category: document.getElementById("productTypeSelect")?.value || "",
      model: document.getElementById("modelSelect")?.value || "",
      resolution: document.getElementById("resolutionSelect")?.value || "",
      width: canvas.width, height: canvas.height
    });
    currentId = id;
  }
  function download(blob, entry) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "3lababee-history-" + entry.width + "x" + entry.height + ".png";
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  async function refresh() {
    objectUrls.forEach(URL.revokeObjectURL); objectUrls = [];
    grid.replaceChildren(); note.textContent = "";
    try {
      const entries = (await all()).sort((a,b) => b.createdAt - a.createdAt);
      empty.hidden = entries.length !== 0;
      for (const entry of entries) {
        const card = document.createElement("article");
        card.className = "history-card";
        const img = document.createElement("img");
        const url = URL.createObjectURL(entry.image); objectUrls.push(url);
        img.src = url; img.alt = entry.productName || "Generated advertisement"; img.loading = "lazy";
        const meta = document.createElement("div"); meta.className = "history-card-meta";
        const name = document.createElement("strong");
        name.textContent = entry.productName || t("Advertisement", "إعلان");
        const details = document.createElement("p");
        details.textContent = [new Date(entry.createdAt).toLocaleString(ar() ? "ar-JO" : "en-US"), entry.resolution, entry.model?.split("/").pop()].filter(Boolean).join(" · ");
        const actions = document.createElement("div"); actions.className = "history-actions";
        const dl = document.createElement("button"); dl.type = "button";
        dl.textContent = t("Download PNG", "تنزيل PNG");
        dl.addEventListener("click", () => download(entry.image, entry));
        const del = document.createElement("button"); del.type = "button";
        del.className = "history-delete"; del.textContent = t("Delete", "حذف");
        del.addEventListener("click", async () => {
          if (!confirm(t("Delete this saved advertisement?", "هل تريد حذف هذا الإعلان المحفوظ؟"))) return;
          try { await remove(entry.id); if (currentId === entry.id) currentId = null; await refresh(); }
          catch { note.textContent = t("Could not delete the advertisement.", "تعذّر حذف الإعلان."); }
        });
        actions.append(dl, del); meta.append(name, details, actions); card.append(img, meta); grid.append(card);
      }
    } catch {
      empty.hidden = true;
      note.textContent = t("Local history is unavailable. Check browser storage settings.", "سجل الإعلانات غير متاح. تحقّق من إعدادات تخزين المتصفح.");
    }
  }
  function close() {
    modal.hidden = true; document.body.classList.remove("history-open");
    objectUrls.forEach(URL.revokeObjectURL); objectUrls = [];
    openBtn.focus();
  }
  openBtn.addEventListener("click", () => {
    modal.hidden = false; document.body.classList.add("history-open"); refresh();
    document.getElementById("historyCloseBtn").focus();
  });
  document.getElementById("historyCloseBtn").addEventListener("click", close);
  modal.querySelector("[data-close-history]").addEventListener("click", close);
  modal.addEventListener("keydown", event => { if (event.key === "Escape") close(); });
  document.addEventListener("3lababee:languagechange", () => { if (!modal.hidden) refresh(); });
  window.generationHistory = {
    async saveNew() { currentId = null; await save(); },
    async update() { if (currentId) await save(); }
  };
})();
