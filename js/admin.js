/* ==========================================================
   uri.visuals — Admin Studio Controller (Full Suite + Modals)
   ========================================================== */
(() => {
  const STORAGE_KEY = "uri_visuals_site_data";
  const STORAGE_META_KEY = "uri_visuals_site_meta";
  const IDB_NAME = "uri_visuals_studio_db";
  const IDB_STORE = "kv";
  const IDB_MEDIA_STORE = "media";
  const IDB_KEY = "site_data";
  const ACTIVITY_KEY = "uri_visuals_activity_log";
  const GH_TOKEN_KEY = "uri_visuals_gh_token";
  const PIN_KEY = "uri_visuals_admin_pin";
  const syncChannel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("uri_visuals_sync") : null;
  const mediaBlobUrlCache = new Map();

  /* ---------- Large-Capacity IndexedDB Helper (handles 50+ MB portfolios & .mov/.mp4 videos) ---------- */
  const openStudioDb = () =>
    new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(IDB_NAME, 2);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
        if (!db.objectStoreNames.contains(IDB_MEDIA_STORE)) db.createObjectStore(IDB_MEDIA_STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

  const idbReadMediaBlob = async (repoPath) => {
    try {
      const db = await openStudioDb();
      if (!db || !db.objectStoreNames.contains(IDB_MEDIA_STORE)) return null;
      return await new Promise((resolve) => {
        const tx = db.transaction(IDB_MEDIA_STORE, "readonly");
        const req = tx.objectStore(IDB_MEDIA_STORE).get(repoPath);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch (_) {
      return null;
    }
  };

  const idbWriteMediaBlob = async (repoPath, payload) => {
    const db = await openStudioDb();
    if (!db) return false;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_MEDIA_STORE, "readwrite");
      tx.objectStore(IDB_MEDIA_STORE).put(payload, repoPath);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  };

  const resolveAdminMediaUrl = async (src = "") => {
    if (!src || !src.startsWith("assets/uploads/")) return src;
    if (mediaBlobUrlCache.has(src)) return mediaBlobUrlCache.get(src);
    const rec = await idbReadMediaBlob(src);
    if (rec?.blob) {
      const url = URL.createObjectURL(rec.blob);
      mediaBlobUrlCache.set(src, url);
      return url;
    }
    return src;
  };

  const idbReadRecord = async () => {
    try {
      const db = await openStudioDb();
      if (!db) return null;
      return await new Promise((resolve) => {
        const tx = db.transaction(IDB_STORE, "readonly");
        const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch (_) {
      return null;
    }
  };

  const idbWriteRecord = async (record) => {
    const db = await openStudioDb();
    if (!db) return false;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put(record, IDB_KEY);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  };

  const idbClearRecord = async () => {
    try {
      const db = await openStudioDb();
      if (!db) return;
      await new Promise((resolve) => {
        const tx = db.transaction(IDB_STORE, "readwrite");
        tx.objectStore(IDB_STORE).delete(IDB_KEY);
        tx.oncomplete = resolve;
        tx.onerror = resolve;
      });
    } catch (_) {}
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (str = "") =>
    String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clone = (obj) => JSON.parse(JSON.stringify(obj));

  /* ---------- Passcode Gate ---------- */
  const lockScreen = $("#lockScreen");
  const savedPin = localStorage.getItem(PIN_KEY);
  if (savedPin) {
    lockScreen.hidden = false;
    $("#unlockForm").addEventListener("submit", (e) => {
      e.preventDefault();
      if ($("#unlockPinInput").value === savedPin) {
        lockScreen.hidden = true;
        $("#unlockError").hidden = true;
      } else {
        $("#unlockError").hidden = false;
      }
    });
  }

  /* ---------- Fast Deterministic Fingerprint of Live js/content.js ---------- */
  const computeSiteFingerprint = (site) => {
    if (!site || typeof site !== "object") return "";
    const parts = [
      site._publishedAt || "",
      site.tabTitle || "",
      site.shortName || "",
      site.name || "",
      site.location || "",
      (site.roles || []).join("|"),
      site.hero?.headline || "",
      site.hero?.subheadline || "",
      site.hero?.bioSentence || "",
      site.hero?.bgMode || "",
      (site.hero?.bgImage || "").slice(0, 64),
      (site.hero?.bgImage || "").length,
      site.hero?.overlayOpacity ?? "",
      site.hero?.grayscale ?? "",
      site.about?.headline || "",
      (site.about?.portrait || "").length,
      (site.about?.bio || []).join("|"),
      (site.about?.skills || []).join("|"),
      (site.services || []).map((s) => `${s.id}:${s.title}:${(s.deliverables || []).length}`).join("|"),
      site.contact?.email || "",
      site.contact?.headline || "",
      JSON.stringify(site.theme || {}),
      (site.work || [])
        .map((w) => {
          const g = Array.isArray(w.gallery) ? w.gallery : [];
          const gSig = g
            .map((s) => `${s.type || ""}:${(s.src || "").length}:${(s.src || "").slice(-24)}:${s.caption || ""}`)
            .join(",");
          return `${w.id}|${w.title}|${w.category}|${w.tag}|${w.size || ""}|${w.hidden ? 1 : 0}|${(w.src || "").length}|${g.length}|${gSig}`;
        })
        .join(";;"),
    ].join("||");

    let h = 2166136261;
    for (let i = 0; i < parts.length; i++) {
      h ^= parts.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return `${(h >>> 0).toString(36)}_${parts.length}`;
  };

  const LIVE_FINGERPRINT = computeSiteFingerprint(window.SITE);

  /* ---------- Load Initial State & Activity Log ---------- */
  const loadState = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const metaRaw = localStorage.getItem(STORAGE_META_KEY);
        const meta = metaRaw ? JSON.parse(metaRaw) : null;
        if (!meta || meta.baseFingerprint !== LIVE_FINGERPRINT) {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(STORAGE_META_KEY);
          return clone(window.SITE);
        }
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.work)) return parsed;
      }
    } catch (_) {}
    return clone(window.SITE);
  };

  const loadActivities = () => {
    try {
      return JSON.parse(localStorage.getItem(ACTIVITY_KEY) || "[]");
    } catch (_) {
      return [];
    }
  };

  let state = loadState();
  let lastSerializedBytes = 0;
  if (!state.theme) {
    state.theme = { bg: "#0a0a0a", bgCharcoal: "#121213", text: "#f5f5f3", neutral: "#d4d2cc" };
  }
  let activities = loadActivities();
  let filterCat = "all";
  let searchQuery = "";
  let viewMode = "list";
  let selectedIds = new Set();
  let dragFromIndex = null;

  /* ---------- History Stack (Undo / Redo) ---------- */
  const history = [clone(state)];
  let historyIndex = 0;

  const updateHistoryButtons = () => {
    $("#undoBtn").disabled = historyIndex <= 0;
    $("#redoBtn").disabled = historyIndex >= history.length - 1;
  };

  const pushHistory = () => {
    history.splice(historyIndex + 1);
    history.push(clone(state));
    const approxBytes = lastSerializedBytes || JSON.stringify(state).length;
    const maxSteps = approxBytes > 2_500_000 ? 8 : 35;
    while (history.length > maxSteps) history.shift();
    historyIndex = history.length - 1;
    updateHistoryButtons();
  };

  /* ---------- Toast Notification System ---------- */
  const toastStack = $("#toastStack");
  const showToast = (message, allowUndo = false) => {
    if (!toastStack) return;
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = `
      <span>${esc(message)}</span>
      ${allowUndo && historyIndex > 0 ? `<button type="button" class="btn btn--ghost btn--sm" data-toast-undo>Undo</button>` : ""}
    `;
    toastStack.appendChild(el);
    const undoBtn = $("[data-toast-undo]", el);
    if (undoBtn) {
      undoBtn.addEventListener("click", () => {
        performUndo();
        el.remove();
      });
    }
    setTimeout(() => el.remove(), 4200);
  };

  /* ---------- Activity Logger ---------- */
  const logActivity = (text) => {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    activities.unshift({ text, time });
    activities = activities.slice(0, 12);
    try {
      localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activities));
    } catch (_) {}
    renderDashboard();
  };

  /* ---------- Universal Confirmation Modal (Add / Edit / Delete / Reset) ---------- */
  const confirmModal = $("#confirmModal");
  const confirmBadge = $("#confirmBadge");
  const confirmTitle = $("#confirmTitle");
  const confirmDesc = $("#confirmDesc");
  const confirmSummary = $("#confirmSummary");
  const confirmOkBtn = $("#confirmOkBtn");
  const confirmCancelBtn = $("#confirmCancelBtn");
  let confirmResolver = null;

  const askConfirmation = ({
    type = "add", // "add" | "delete" | "edit"
    badge = "Confirm Action",
    title = "Are you sure?",
    description = "",
    summaryItems = [],
    confirmText = "Confirm",
  }) =>
    new Promise((resolve) => {
      confirmResolver = resolve;
      confirmBadge.textContent = badge;
      confirmBadge.className = `confirm-badge confirm-badge--${type}`;
      confirmTitle.textContent = title;
      confirmDesc.textContent = description;

      if (summaryItems && summaryItems.length) {
        confirmSummary.hidden = false;
        confirmSummary.innerHTML = summaryItems.map((line) => `<div>${line}</div>`).join("");
      } else {
        confirmSummary.hidden = true;
        confirmSummary.innerHTML = "";
      }

      confirmOkBtn.textContent = confirmText;
      confirmOkBtn.className =
        type === "delete" ? "btn btn--danger" : type === "add" ? "btn btn--success" : "btn btn--light";

      confirmModal.hidden = false;
      confirmOkBtn.focus();
    });

  const closeConfirm = (result) => {
    confirmModal.hidden = true;
    if (confirmResolver) {
      const r = confirmResolver;
      confirmResolver = null;
      r(result);
    }
  };

  confirmOkBtn.addEventListener("click", () => closeConfirm(true));
  confirmCancelBtn.addEventListener("click", () => closeConfirm(false));
  confirmModal.addEventListener("click", (e) => {
    if (e.target === confirmModal) closeConfirm(false);
  });

  /* ---------- Per-File Upload & Publish Progress Modal ---------- */
  const uploadProgressModal = $("#uploadProgressModal");
  const uploadProgressBadge = $("#uploadProgressBadge");
  const uploadProgressTitle = $("#uploadProgressTitle");
  const uploadOverallPct = $("#uploadOverallPct");
  const uploadOverallLabel = $("#uploadOverallLabel");
  const uploadOverallCount = $("#uploadOverallCount");
  const uploadOverallFill = $("#uploadOverallFill");
  const uploadProgressList = $("#uploadProgressList");
  const uploadProgressNote = $("#uploadProgressNote");
  const closeUploadProgressBtn = $("#closeUploadProgressBtn");

  const UploadProgress = (() => {
    let items = [];

    const recalcOverall = () => {
      const total = items.length || 1;
      const sumPct = items.reduce((acc, it) => acc + (it.pct || 0), 0);
      const doneCount = items.filter((it) => it.state === "done").length;
      const errCount = items.filter((it) => it.state === "error").length;
      const overall = Math.round(sumPct / total);

      if (uploadOverallPct) uploadOverallPct.textContent = `${overall}%`;
      if (uploadOverallFill) uploadOverallFill.style.width = `${overall}%`;
      if (uploadOverallCount) uploadOverallCount.textContent = `${doneCount} / ${items.length} done`;
      if (uploadOverallLabel) {
        if (errCount > 0 && doneCount + errCount >= items.length) {
          uploadOverallLabel.textContent = `Completed with ${errCount} error(s)`;
        } else if (doneCount >= items.length) {
          uploadOverallLabel.textContent = `All ${items.length} file(s) completed`;
        } else {
          const active = items.find((it) => it.state === "active");
          uploadOverallLabel.textContent = active ? `Processing ${active.name}...` : `Uploading ${items.length} file(s)...`;
        }
      }
    };

    const open = ({
      badge = "Uploading Files",
      title = "Uploading Media...",
      list = [],
      note = "Please keep this tab open while files finish uploading.",
    }) => {
      items = list.map((it) => ({
        name: it.name || "File",
        kind: it.kind || "FILE",
        sizeText: it.sizeText || "",
        pct: 0,
        status: it.status || "Queued",
        state: "queued",
      }));
      if (uploadProgressBadge) {
        uploadProgressBadge.textContent = badge;
        uploadProgressBadge.className = "confirm-badge confirm-badge--edit";
      }
      if (uploadProgressTitle) uploadProgressTitle.textContent = title;
      if (uploadProgressNote) uploadProgressNote.textContent = note;
      if (closeUploadProgressBtn) closeUploadProgressBtn.disabled = true;

      if (uploadProgressList) {
        uploadProgressList.innerHTML = items
          .map(
            (it, idx) => `
            <li class="upload-file-item" data-up-idx="${idx}">
              <div class="upload-file-item__top">
                <div class="upload-file-item__name-wrap">
                  <span class="upload-file-item__kind">${esc(it.kind)}</span>
                  <span class="upload-file-item__name" title="${esc(it.name)}">${esc(it.name)}</span>
                </div>
                <span class="upload-file-item__pct">0%</span>
              </div>
              <div class="upload-bar"><span></span></div>
              <div class="upload-file-item__meta">
                <span class="upload-file-item__status">${esc(it.status)}</span>
                <span class="upload-file-item__size">${esc(it.sizeText)}</span>
              </div>
            </li>`
          )
          .join("");
      }

      recalcOverall();
      if (uploadProgressModal) uploadProgressModal.hidden = false;
    };

    const update = (idx, patch = {}) => {
      const it = items[idx];
      if (!it) return;
      if (typeof patch.pct === "number") it.pct = Math.max(0, Math.min(100, Math.round(patch.pct)));
      if (patch.status !== undefined) it.status = patch.status;
      if (patch.state !== undefined) it.state = patch.state;
      if (patch.sizeText !== undefined) it.sizeText = patch.sizeText;

      const row = uploadProgressList?.querySelector(`[data-up-idx="${idx}"]`);
      if (row) {
        row.classList.toggle("is-active", it.state === "active");
        row.classList.toggle("is-done", it.state === "done");
        row.classList.toggle("is-error", it.state === "error");
        const pctEl = $(".upload-file-item__pct", row);
        const barEl = $(".upload-bar > span", row);
        const stEl = $(".upload-file-item__status", row);
        const szEl = $(".upload-file-item__size", row);
        if (pctEl) pctEl.textContent = it.state === "error" ? "ERR" : `${it.pct}%`;
        if (barEl) barEl.style.width = `${it.pct}%`;
        if (stEl) stEl.textContent = it.status;
        if (szEl && patch.sizeText !== undefined) szEl.textContent = it.sizeText;
      }
      recalcOverall();
    };

    const finish = ({
      badge = "Upload Complete",
      badgeType = "add",
      title = "All Files Ready",
      note = "All files finished successfully.",
    } = {}) => {
      if (uploadProgressBadge) {
        uploadProgressBadge.textContent = badge;
        uploadProgressBadge.className = `confirm-badge confirm-badge--${badgeType}`;
      }
      if (uploadProgressTitle) uploadProgressTitle.textContent = title;
      if (uploadProgressNote) uploadProgressNote.textContent = note;
      if (closeUploadProgressBtn) {
        closeUploadProgressBtn.disabled = false;
        closeUploadProgressBtn.focus();
      }
      recalcOverall();
    };

    const close = () => {
      if (uploadProgressModal) uploadProgressModal.hidden = true;
    };

    return { open, update, finish, close };
  })();

  closeUploadProgressBtn?.addEventListener("click", () => UploadProgress.close());

  /* ---------- Path Helpers & Code Generator ---------- */
  const setByPath = (obj, path, value) => {
    const parts = path.split(".");
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!cur[parts[i]] || typeof cur[parts[i]] !== "object") cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
  };

  const getByPath = (obj, path) =>
    path.split(".").reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : ""), obj);

  const generateContentJs = (data) => `/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                 ✏️  EDIT YOUR WEBSITE HERE  ✏️                 ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  Generated by uri.visuals Admin Studio (/admin.html).        ║
 * ║  You can edit this file directly or use /admin.html.         ║
 * ╚══════════════════════════════════════════════════════════════╝
 */
window.SITE = ${JSON.stringify(data, null, 2)};
`;

  /* ---------- Save & Sync Live Preview ---------- */
  const saveStatus = $("#saveStatus");
  const previewFrame = $("#previewFrame");
  const codePreview = $("#codePreview");

  const formatSize = (bytes) => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${Math.round(bytes / 1024)} KB`;
  };

  const updateStorageMeter = (bytes = null) => {
    const sizeBytes = bytes !== null ? bytes : lastSerializedBytes || JSON.stringify(state).length;
    const maxBudget = 50 * 1024 * 1024; // 50 MB Studio IndexedDB visual budget
    const pct = Math.min(100, Math.max(2, Math.round((sizeBytes / maxBudget) * 100)));
    $("#storageUsedText").textContent = formatSize(sizeBytes);
    $("#storageBarFill").style.width = `${pct}%`;
  };

  const renderCodePreviewSnippet = (contentStr) => {
    if (!codePreview) return;
    if (contentStr.length > 50000) {
      codePreview.textContent =
        contentStr.slice(0, 50000) +
        `\n\n/* ... preview truncated for smooth editing (${formatSize(contentStr.length)} total). Download, Copy, or Publish exports the complete file ... */`;
    } else {
      codePreview.textContent = contentStr;
    }
  };

  const persist = (msg = "Saved locally", recordHistory = true, toast = false) => {
    const serialized = JSON.stringify(state);
    lastSerializedBytes = serialized.length;
    if (recordHistory) pushHistory();

    const updatedAt = Date.now();
    const record = { data: clone(state), updatedAt, baseFingerprint: LIVE_FINGERPRINT };

    /* 1. Primary storage: IndexedDB (supports 50+ MB multi-photo portfolios reliably) */
    idbWriteRecord(record)
      .then(() => {
        try {
          localStorage.setItem(
            STORAGE_META_KEY,
            JSON.stringify({ updatedAt, bytes: lastSerializedBytes, baseFingerprint: LIVE_FINGERPRINT })
          );
          /* Only mirror to localStorage when safely under ~3 MB; otherwise clear stale localStorage entry */
          if (lastSerializedBytes < 3_000_000) {
            localStorage.setItem(STORAGE_KEY, serialized);
          } else {
            localStorage.removeItem(STORAGE_KEY);
          }
        } catch (_) {
          try { localStorage.removeItem(STORAGE_KEY); } catch (__) {}
        }
        if (saveStatus) saveStatus.textContent = `✓ ${msg}`;
        syncChannel?.postMessage({ type: "URI_CMS_SYNC", updatedAt });
      })
      .catch(() => {
        /* Fallback to localStorage if IndexedDB is blocked (e.g., restricted private mode) */
        try {
          localStorage.setItem(STORAGE_KEY, serialized);
          localStorage.setItem(
            STORAGE_META_KEY,
            JSON.stringify({ updatedAt, bytes: lastSerializedBytes, baseFingerprint: LIVE_FINGERPRINT })
          );
          if (saveStatus) saveStatus.textContent = `✓ ${msg}`;
        } catch (_) {
          if (saveStatus) saveStatus.textContent = "Browser storage full — click Publish Live to GitHub";
        }
      });

    if (previewFrame && previewFrame.contentWindow) {
      previewFrame.contentWindow.postMessage({ type: "URI_CMS_PREVIEW", payload: state }, "*");
    }
    renderCodePreviewSnippet(generateContentJs(state));

    $("#workCountBadge").textContent = (state.work || []).length;
    $("#servicesCountBadge").textContent = (state.services || []).length;
    updateStorageMeter(lastSerializedBytes);
    renderDashboard();
    renderMediaLibrary();

    if (toast) {
      logActivity(msg);
      showToast(msg, recordHistory);
    }
  };

  const performUndo = () => {
    if (historyIndex <= 0) return;
    historyIndex--;
    state = clone(history[historyIndex]);
    updateHistoryButtons();
    initAll(false);
    persist("Undid last change", false);
    showToast("Undid change");
  };

  const performRedo = () => {
    if (historyIndex >= history.length - 1) return;
    historyIndex++;
    state = clone(history[historyIndex]);
    updateHistoryButtons();
    initAll(false);
    persist("Redid change", false);
    showToast("Redid change");
  };

  $("#undoBtn").addEventListener("click", performUndo);
  $("#redoBtn").addEventListener("click", performRedo);

  /* ---------- Image & Video (.mov / .mp4 / .webm) Upload Helpers ---------- */
  const VIDEO_PLACEHOLDER =
    "data:image/svg+xml," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><rect width="320" height="200" fill="#141418"/><circle cx="160" cy="100" r="24" fill="none" stroke="#e8c07d" stroke-opacity="0.55" stroke-width="2"/><polygon points="154,90 172,100 154,110" fill="#e8c07d" fill-opacity="0.85"/></svg>`
    );

  const isVideoFile = (file) =>
    Boolean(file && ((file.type && file.type.startsWith("video/")) || /\.(mov|mp4|webm|m4v|ogv)$/i.test(file.name || "")));

  const formatDurationMMSS = (sec) => {
    if (!Number.isFinite(sec) || sec <= 0) return "";
    const mins = Math.floor(sec / 60);
    const secs = Math.round(sec % 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const extractVideoMeta = (file) =>
    new Promise((resolve) => {
      const objUrl = URL.createObjectURL(file);
      const vid = document.createElement("video");
      vid.muted = true;
      vid.playsInline = true;
      vid.preload = "metadata";
      let done = false;
      const finish = (res) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        vid.src = "";
        URL.revokeObjectURL(objUrl);
        resolve(res);
      };
      const timer = setTimeout(() => finish({ poster: "", duration: "" }), 4500);
      vid.onerror = () => finish({ poster: "", duration: "" });
      vid.onloadedmetadata = () => {
        const duration = formatDurationMMSS(vid.duration);
        const seekTo = Number.isFinite(vid.duration) && vid.duration > 0.3 ? Math.min(0.25, vid.duration * 0.1) : 0;
        vid.onseeked = () => {
          try {
            const maxEdge = Math.min(Number($("#imgMaxEdge")?.value) || 1280, 1280);
            const scale = Math.min(1, maxEdge / Math.max(vid.videoWidth || 1, vid.videoHeight || 1));
            const w = Math.max(1, Math.round((vid.videoWidth || 1280) * scale));
            const h = Math.max(1, Math.round((vid.videoHeight || 720) * scale));
            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            canvas.getContext("2d").drawImage(vid, 0, 0, w, h);
            let poster = canvas.toDataURL("image/webp", 0.82);
            if (!poster.startsWith("data:image/webp")) poster = canvas.toDataURL("image/jpeg", 0.82);
            finish({ poster, duration });
          } catch (_) {
            finish({ poster: "", duration });
          }
        };
        try {
          vid.currentTime = seekTo;
        } catch (_) {
          finish({ poster: "", duration });
        }
      };
      vid.src = objUrl;
    });

  const storeVideoUpload = async (file, onProgress = null) => {
    onProgress?.(10, "Preparing video...");
    const extMatch = (file.name || "").match(/\.(mov|mp4|webm|m4v|ogv)$/i);
    const ext = extMatch ? extMatch[1].toLowerCase() : "mov";
    const base = (file.name || "video")
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "video";
    const stamp = Date.now().toString(36).slice(-5);
    const repoPath = `assets/uploads/${base}-${stamp}.${ext}`;

    onProgress?.(30, "Saving video to Studio DB...");
    await idbWriteMediaBlob(repoPath, {
      blob: file,
      name: file.name,
      type: file.type || (ext === "mov" ? "video/quicktime" : `video/${ext}`),
      size: file.size,
      uploadedAt: Date.now(),
    });
    const previewUrl = URL.createObjectURL(file);
    mediaBlobUrlCache.set(repoPath, previewUrl);

    onProgress?.(68, "Extracting cover frame & duration...");
    const { poster, duration } = await extractVideoMeta(file);
    onProgress?.(100, duration ? `✓ Ready · ${duration}` : "✓ Ready");
    return {
      isVideo: true,
      src: repoPath,
      previewUrl,
      poster,
      duration,
      size: file.size,
      name: file.name,
    };
  };

  /* ---------- Image Optimizer ---------- */
  const fileToDataUrl = (file, onProgress = null) =>
    new Promise((resolve, reject) => {
      const maxEdge = Number($("#imgMaxEdge")?.value) || 1600;
      const quality = Number($("#imgQuality")?.value) || 0.84;
      const reader = new FileReader();
      onProgress?.(5, "Reading image...");
      reader.onerror = reject;
      reader.onprogress = (ev) => {
        if (ev.lengthComputable && ev.total > 0) {
          const p = 5 + Math.round((ev.loaded / ev.total) * 55);
          onProgress?.(p, `Reading ${Math.round((ev.loaded / ev.total) * 100)}%...`);
        }
      };
      reader.onload = () => {
        onProgress?.(70, "Decoding image...");
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          onProgress?.(86, "Optimizing for web...");
          const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          canvas.getContext("2d").drawImage(img, 0, 0, w, h);
          const out = canvas.toDataURL("image/webp", quality);
          const finalUrl = out.startsWith("data:image/webp") ? out : canvas.toDataURL("image/jpeg", quality);
          onProgress?.(100, `✓ Optimized · ${formatSize(Math.round((finalUrl.length * 3) / 4))}`);
          resolve(finalUrl);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });

  /* Helper to process 1 or more local files with the Per-File Upload Progress Modal */
  const processFilesWithProgress = async (files, title = "Uploading Files...") => {
    const fileArr = [...files];
    UploadProgress.open({
      badge: "Processing Media",
      title,
      list: fileArr.map((f) => ({
        name: f.name,
        kind: isVideoFile(f) ? "VIDEO" : "PHOTO",
        sizeText: formatSize(f.size),
        status: "Queued",
      })),
      note: "Optimizing photos and preparing video tracks locally...",
    });

    const results = new Array(fileArr.length);
    const concurrency = Math.min(3, fileArr.length);
    let cursor = 0;

    const worker = async () => {
      while (cursor < fileArr.length) {
        const idx = cursor++;
        const f = fileArr[idx];
        UploadProgress.update(idx, { pct: 5, status: "Starting...", state: "active" });
        try {
          if (isVideoFile(f)) {
            const v = await storeVideoUpload(f, (pct, status) =>
              UploadProgress.update(idx, { pct, status, state: pct >= 100 ? "done" : "active" })
            );
            UploadProgress.update(idx, { pct: 100, status: v.duration ? `✓ Ready · ${v.duration}` : "✓ Video ready", state: "done" });
            results[idx] = { type: "video", src: v.src, poster: v.poster, duration: v.duration, name: f.name, size: f.size };
          } else {
            const url = await fileToDataUrl(f, (pct, status) =>
              UploadProgress.update(idx, { pct, status, state: pct >= 100 ? "done" : "active" })
            );
            UploadProgress.update(idx, { pct: 100, status: `✓ Ready · ${formatSize(Math.round((url.length * 3) / 4))}`, state: "done" });
            results[idx] = { type: "image", src: url, poster: "", duration: "", name: f.name, size: f.size };
          }
        } catch (err) {
          UploadProgress.update(idx, { pct: 100, status: `Failed: ${err?.message || "Unreadable file"}`, state: "error" });
          throw err;
        }
      }
    };

    try {
      await Promise.all(Array.from({ length: concurrency }, worker));
      UploadProgress.finish({
        badge: "Upload Complete",
        badgeType: "add",
        title: `${fileArr.length} File${fileArr.length > 1 ? "s" : ""} Ready`,
        note: "Proceeding...",
      });
      await new Promise((r) => setTimeout(r, 320));
      UploadProgress.close();
      return results;
    } catch (err) {
      UploadProgress.finish({
        badge: "Upload Error",
        badgeType: "delete",
        title: "Some Files Failed to Process",
        note: err?.message || "Please try again with a valid image or video file.",
      });
      return null;
    }
  };

  /* ---------- Tab Navigation ---------- */
  const switchTab = (tabId) => {
    $$(".nav-item").forEach((b) => b.classList.toggle("is-active", b.dataset.tab === tabId));
    $$(".tab-pane").forEach((p) => p.classList.toggle("is-active", p.id === `tab-${tabId}`));
  };
  $$(".nav-item").forEach((btn) => btn.addEventListener("click", () => switchTab(btn.dataset.tab)));
  $("#openPublishTabBtn").addEventListener("click", () => switchTab("publish"));

  $$("[data-quick-add]").forEach((btn) =>
    btn.addEventListener("click", () => {
      switchTab("portfolio");
      openProjectModal(-1, btn.dataset.quickAdd);
    })
  );

  /* ---------- Split Live Preview & Viewport Switcher ---------- */
  const workspace = $("#workspace");
  const previewPane = $("#previewPane");
  const togglePreviewBtn = $("#togglePreviewBtn");
  togglePreviewBtn.addEventListener("click", () => {
    const showing = previewPane.hidden;
    previewPane.hidden = !showing;
    workspace.classList.toggle("has-preview", showing);
    togglePreviewBtn.classList.toggle("is-active", showing);
    if (showing) persist("Live preview synced", false);
  });
  $("#refreshPreviewBtn").addEventListener("click", () => previewFrame.contentWindow?.location.reload());
  $$("[data-vp]").forEach((btn) =>
    btn.addEventListener("click", () => {
      previewFrame.style.width = btn.dataset.vp;
      $$("[data-vp]").forEach((b) => b.classList.toggle("is-active", b === btn));
    })
  );

  /* ---------- Dashboard Renderer ---------- */
  const renderDashboard = () => {
    const work = state.work || [];
    const photos = work.filter((w) => w.category === "photography").length;
    const videos = work.filter((w) => w.category === "videography").length;
    const totalSlides = work.reduce(
      (sum, w) => sum + (Array.isArray(w.gallery) && w.gallery.length ? w.gallery.length : 1),
      0
    );
    const drafts = work.filter((w) => w.hidden).length;
    const published = work.length - drafts;

    $("#dashboardStats").innerHTML = `
      <div class="stat-card">
        <span class="stat-card__label">Total Projects</span>
        <strong class="stat-card__value">${work.length}</strong>
        <span class="stat-card__sub">${published} live · ${drafts} draft</span>
      </div>
      <div class="stat-card">
        <span class="stat-card__label">Photography</span>
        <strong class="stat-card__value">${photos}</strong>
        <span class="stat-card__sub">Still series & portraits</span>
      </div>
      <div class="stat-card">
        <span class="stat-card__label">Videography</span>
        <strong class="stat-card__value">${videos}</strong>
        <span class="stat-card__sub">Cinematic & event films</span>
      </div>
      <div class="stat-card">
        <span class="stat-card__label">Attached Files</span>
        <strong class="stat-card__value">${totalSlides}</strong>
        <span class="stat-card__sub">Photos & clips across projects</span>
      </div>
    `;

    const checks = [
      {
        label: "Hero Headline & Bio Sentence configured",
        ok: Boolean(state.hero?.headline && state.hero?.bioSentence),
      },
      {
        label: "Direct Contact Email (" + (state.contact?.email || "unset") + ")",
        ok: Boolean(state.contact?.email && !state.contact.email.includes("yourdomain")),
      },
      {
        label: "Both Portfolio Categories populated (Photography & Videography)",
        ok: photos > 0 && videos > 0,
      },
      {
        label: "Hero Background configured",
        ok: Boolean(state.hero?.bgImage || state.hero?.video || state.hero?.bgMode === "solid"),
      },
      {
        label: "Services & Deliverables configured (" + (state.services || []).length + " pillars)",
        ok: (state.services || []).length >= 2,
      },
    ];

    $("#healthList").innerHTML = checks
      .map(
        (c) => `
        <li class="health-item">
          <span>${esc(c.label)}</span>
          <span class="health-status ${c.ok ? "health-status--ok" : "health-status--warn"}">${c.ok ? "Ready" : "Review"}</span>
        </li>`
      )
      .join("");

    const actEl = $("#activityList");
    if (!activities.length) {
      actEl.innerHTML = `<li class="muted">No recent edits yet in this session.</li>`;
    } else {
      actEl.innerHTML = activities
        .map(
          (a) => `
          <li class="activity-item">
            <span>${esc(a.text)}</span>
            <span class="activity-time">${esc(a.time)}</span>
          </li>`
        )
        .join("");
    }
  };

  $("#clearActivityBtn").addEventListener("click", () => {
    activities = [];
    localStorage.removeItem(ACTIVITY_KEY);
    renderDashboard();
  });

  /* ---------- Hero Background Manager ---------- */
  const renderHeroBgPreview = () => {
    if (!state.hero) state.hero = {};
    if (!state.hero.bgImage && state.hero.poster) state.hero.bgImage = state.hero.poster;
    const mode = state.hero.bgMode || (state.hero.video ? "video" : "image");
    const imgSrc = state.hero.bgImage || state.hero.poster || "";
    const vidSrc = state.hero.video || "";
    const overlay = state.hero.overlayOpacity ?? 65;
    const gray = state.hero.grayscale ?? 18;

    $("#heroBgModeSelect").value = mode;
    $("#heroBgModeBadge").textContent = `${mode.toUpperCase()} MODE`;
    $("#heroOverlayRange").value = overlay;
    $("#overlayValLabel").textContent = `${overlay}%`;
    $("#heroGrayRange").value = gray;
    $("#grayValLabel").textContent = `${gray}%`;

    const pImg = $("#adminHeroPreviewImg");
    const pVid = $("#adminHeroPreviewVid");
    const pOv = $("#adminHeroPreviewOverlay");
    const filterCss = `grayscale(${gray}%) contrast(1.04)`;
    pImg.style.filter = filterCss;
    pVid.style.filter = filterCss;
    pOv.style.background = `linear-gradient(180deg, rgba(10,10,10,${(overlay / 100).toFixed(2)}), rgba(10,10,10,0.92))`;

    const videoWrap = $("#heroVideoFieldWrap");
    if (videoWrap) videoWrap.classList.toggle("is-dimmed", mode !== "video");

    if (mode === "solid") {
      pImg.hidden = true;
      pVid.hidden = true;
    } else if (mode === "image" || !vidSrc) {
      pVid.hidden = true;
      pImg.src = imgSrc;
      pImg.hidden = !imgSrc;
    } else {
      pImg.hidden = true;
      pVid.hidden = false;
      pVid.poster = imgSrc;
      resolveAdminMediaUrl(vidSrc).then((resolved) => {
        if (pVid.getAttribute("src") !== resolved) {
          pVid.src = resolved;
          pVid.play().catch(() => {});
        }
      });
    }
  };

  $("#jumpHeroBgBtn")?.addEventListener("click", () => {
    switchTab("hero");
    $("#heroBgCard")?.scrollIntoView({ behavior: "smooth" });
  });

  $("#heroBgModeSelect")?.addEventListener("change", (e) => {
    state.hero.bgMode = e.target.value;
    renderHeroBgPreview();
    persist(`Set Hero background mode to "${e.target.value}"`, true, true);
  });

  $("#usePhotoOnlyBtn")?.addEventListener("click", () => {
    state.hero.bgMode = "image";
    syncInputsFromState();
    renderHeroBgPreview();
    persist("Switched Hero background to Photograph Mode", true, true);
  });

  $("#uploadHeroVideoInput")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const processed = await processFilesWithProgress([file], "Uploading Hero Background Video...");
    e.target.value = "";
    if (!processed?.[0]) return;
    const uploaded = processed[0];
    const sizeWarn = file.size > 45 * 1024 * 1024
      ? `<strong>Note:</strong> File is ${formatSize(file.size)}. Videos under ~45 MB publish directly via GitHub API; larger masters can be pushed via git.`
      : `<strong>Stored path:</strong> <code>${esc(uploaded.src)}</code> (${formatSize(file.size)})`;
    const ok = await askConfirmation({
      type: "add",
      badge: "Confirm Hero Background Video",
      title: `Set "${file.name}" as Hero Background Video?`,
      description: "This will switch your Hero Page to Looping Video Mode and attach your video (.mov / .mp4) for live playback and GitHub publishing.",
      summaryItems: [
        sizeWarn,
        uploaded.poster ? `<img src="${esc(uploaded.poster)}" style="max-height:110px;border-radius:6px" alt="Video frame" />` : "<em>Video frame preview ready when played</em>",
      ],
      confirmText: "Confirm & Set Hero Video",
    });
    if (!ok) return;
    state.hero.bgMode = "video";
    state.hero.video = uploaded.src;
    if (uploaded.poster) {
      state.hero.poster = uploaded.poster;
      if (!state.hero.bgImage) state.hero.bgImage = uploaded.poster;
    }
    syncInputsFromState();
    renderHeroBgPreview();
    persist(`Updated Hero background video (${file.name})`, true, true);
  });

  $("#uploadHeroPhotoInput")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const processed = await processFilesWithProgress([file], "Uploading Hero Background Photo...");
    e.target.value = "";
    if (!processed?.[0]) return;
    const dataUrl = processed[0].src;
    const ok = await askConfirmation({
      type: "add",
      badge: "Confirm Hero Background Photo",
      title: `Set "${file.name}" as Hero Background?`,
      description: "This will switch your Hero Page to Photograph Mode and apply your uploaded image.",
      summaryItems: [`<img src="${esc(dataUrl)}" style="max-height:120px;border-radius:4px" alt="Hero preview" />`],
      confirmText: "Confirm & Set Hero Background",
    });
    if (!ok) return;
    state.hero.bgMode = "image";
    state.hero.bgImage = dataUrl;
    state.hero.poster = dataUrl;
    syncInputsFromState();
    renderHeroBgPreview();
    persist(`Updated Hero background photo (${file.name})`, true, true);
  });

  $$("[data-hero-preset]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      const mode = btn.dataset.heroPreset;
      const src = btn.dataset.src;
      const label = btn.textContent.trim();
      const ok = await askConfirmation({
        type: "edit",
        badge: "Confirm Hero Background Preset",
        title: `Apply "${label}" Hero Background?`,
        description: `Switches the Hero background to ${mode} mode with the "${label}" preset.`,
        confirmText: "Confirm & Apply Preset",
      });
      if (!ok) return;
      state.hero.bgMode = mode;
      if (mode === "image") {
        state.hero.bgImage = src;
        state.hero.poster = src;
      } else {
        state.hero.video = src;
      }
      syncInputsFromState();
      renderHeroBgPreview();
      persist(`Applied "${label}" hero background`, true, true);
    })
  );

  $("#heroOverlayRange")?.addEventListener("input", (e) => {
    state.hero.overlayOpacity = Number(e.target.value);
    renderHeroBgPreview();
    persist("Adjusted hero overlay darkness", true, false);
  });

  $("#heroGrayRange")?.addEventListener("input", (e) => {
    state.hero.grayscale = Number(e.target.value);
    renderHeroBgPreview();
    persist("Adjusted hero monochrome level", true, false);
  });

  /* ---------- Simple Field Bindings ---------- */
  const syncInputsFromState = () => {
    if (!state.hero.bgImage && state.hero.poster) state.hero.bgImage = state.hero.poster;
    $$("[data-path]").forEach((el) => {
      el.value = getByPath(state, el.dataset.path) ?? "";
    });
    $("#rolesInput").value = (state.roles || []).join(", ");
    $("#introEnabledInput").checked = state.introAnimation?.enabled !== false;
    $("#aboutPortraitPreview").src = state.about?.portrait || "";
    $("#colorBg").value = state.theme?.bg || "#0a0a0a";
    $("#colorBgCharcoal").value = state.theme?.bgCharcoal || "#121213";
    $("#colorText").value = state.theme?.text || "#f5f5f3";
    $("#colorNeutral").value = state.theme?.neutral || "#d4d2cc";
    renderHeroBgPreview();
    if (codePreview) codePreview.textContent = generateContentJs(state);
  };

  $$("[data-path]").forEach((el) => {
    el.addEventListener("input", () => {
      setByPath(state, el.dataset.path, el.value);
      if (el.dataset.path === "hero.bgImage") {
        state.hero.poster = el.value;
        state.hero.bgMode = "image";
        renderHeroBgPreview();
      } else if (el.dataset.path === "hero.video") {
        if (el.value.trim()) state.hero.bgMode = "video";
        renderHeroBgPreview();
      } else if (el.dataset.path === "about.portrait") {
        $("#aboutPortraitPreview").src = el.value;
      }
      persist("Updated " + el.dataset.path, true, false);
    });
  });

  $("#rolesInput").addEventListener("input", (e) => {
    state.roles = e.target.value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    persist("Updated disciplines", true, false);
  });

  $("#introEnabledInput").addEventListener("change", (e) => {
    if (!state.introAnimation) state.introAnimation = {};
    state.introAnimation.enabled = e.target.checked;
    persist(e.target.checked ? "Enabled opening animation" : "Disabled opening animation", true, true);
  });

  $$("[data-upload-target]").forEach((input) => {
    input.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const processed = await processFilesWithProgress([file], "Uploading Portrait Photo...");
      e.target.value = "";
      if (!processed?.[0]) return;
      const dataUrl = processed[0].src;
      const targetPath = input.dataset.uploadTarget;
      const ok = await askConfirmation({
        type: "add",
        badge: "Confirm Image Upload",
        title: `Use "${file.name}"?`,
        description: `This image has been optimized and will be assigned to ${targetPath}.`,
        summaryItems: [`<img src="${esc(dataUrl)}" style="max-height:110px;border-radius:4px" alt="Upload preview" />`],
        confirmText: "Confirm & Apply Image",
      });
      if (!ok) return;
      setByPath(state, targetPath, dataUrl);
      syncInputsFromState();
      persist(`Uploaded image ${file.name}`, true, true);
    });
  });

  /* ---------- Portfolio Projects List (Filter, Search, Grid/List, Bulk, Drag-and-Drop) ---------- */
  const projectList = $("#projectList");
  const bulkBar = $("#bulkBar");

  const updateBulkBar = () => {
    bulkBar.hidden = selectedIds.size === 0;
    $("#selectedCountLabel").textContent = `${selectedIds.size} project${selectedIds.size === 1 ? "" : "s"} selected`;
  };

  const renderProjects = () => {
    projectList.classList.toggle("is-grid", viewMode === "grid");
    const items = (state.work || [])
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => {
        if (filterCat === "drafts") return Boolean(item.hidden);
        if (filterCat !== "all" && item.category !== filterCat) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          return (
            (item.title || "").toLowerCase().includes(q) ||
            (item.tag || "").toLowerCase().includes(q) ||
            (item.summary || "").toLowerCase().includes(q)
          );
        }
        return true;
      });

    updateBulkBar();

    if (!items.length) {
      projectList.innerHTML = `<div class="card"><p class="muted">No matching projects found. Click "+ Add New Project" to create one.</p></div>`;
      return;
    }

    projectList.innerHTML = items
      .map(({ item, idx }) => {
        const slides = Array.isArray(item.gallery) && item.gallery.length ? item.gallery : [{ src: item.src, type: item.mediaType }];
        const thumb = item.mediaType === "video" || slides[0]?.type === "video"
          ? slides[0]?.poster || item.poster || VIDEO_PLACEHOLDER
          : slides[0]?.src || item.src;
        const hasCompare = item.beforeSrc && item.afterSrc;
        const checked = selectedIds.has(item.id) ? "checked" : "";
        return `
          <article class="project-row${item.hidden ? " is-draft" : ""}" draggable="true" data-row-idx="${idx}">
            <div class="project-row__check">
              <span class="drag-handle" title="Drag to reorder">⋮⋮</span>
              <input type="checkbox" data-select-id="${esc(item.id)}" ${checked} aria-label="Select ${esc(item.title)}" />
            </div>
            <img class="project-row__thumb" src="${esc(thumb)}" alt="${esc(item.title)}" loading="lazy" />
            <div>
              <div class="project-row__badges">
                <span class="badge">${esc(item.category)}</span>
                <span class="badge">${esc(item.tag)}</span>
                <span class="badge">${esc(item.mediaType || "image")}</span>
                <span class="badge">❐ ${slides.length} file${slides.length === 1 ? "" : "s"}</span>
                ${item.size ? `<span class="badge">${esc(item.size)}</span>` : ""}
                ${hasCompare ? `<span class="badge">Before/After Grade</span>` : ""}
                ${item.hidden ? `<span class="badge badge--draft">Draft / Hidden</span>` : ""}
              </div>
              <h3 class="project-row__title">${esc(item.title)}</h3>
              <p class="project-row__summary">${esc(item.summary || "")}</p>
            </div>
            <div class="project-row__actions">
              <button type="button" class="icon-btn" data-act="toggle-draft" data-idx="${idx}">
                ${item.hidden ? "Publish" : "Hide"}
              </button>
              <button type="button" class="icon-btn" data-act="edit" data-idx="${idx}">Edit</button>
              <button type="button" class="icon-btn" data-act="up" data-idx="${idx}" title="Move Up">↑</button>
              <button type="button" class="icon-btn" data-act="down" data-idx="${idx}" title="Move Down">↓</button>
              <button type="button" class="icon-btn" data-act="dup" data-idx="${idx}" title="Duplicate">Copy</button>
              <button type="button" class="icon-btn icon-btn--danger" data-act="del" data-idx="${idx}">Delete</button>
            </div>
          </article>`;
      })
      .join("");
  };

  /* Drag-and-Drop Reordering */
  projectList.addEventListener("dragstart", (e) => {
    const row = e.target.closest("[data-row-idx]");
    if (!row) return;
    dragFromIndex = +row.dataset.rowIdx;
    row.classList.add("is-dragging");
  });
  projectList.addEventListener("dragend", (e) => {
    e.target.closest("[data-row-idx]")?.classList.remove("is-dragging");
    dragFromIndex = null;
  });
  projectList.addEventListener("dragover", (e) => e.preventDefault());
  projectList.addEventListener("drop", (e) => {
    e.preventDefault();
    const targetRow = e.target.closest("[data-row-idx]");
    if (!targetRow || dragFromIndex === null) return;
    const toIndex = +targetRow.dataset.rowIdx;
    if (dragFromIndex === toIndex) return;
    const [moved] = state.work.splice(dragFromIndex, 1);
    state.work.splice(toIndex, 0, moved);
    dragFromIndex = null;
    renderProjects();
    persist(`Reordered "${moved.title}"`, true, true);
  });

  /* Checkbox Selection */
  projectList.addEventListener("change", (e) => {
    const cb = e.target.closest("[data-select-id]");
    if (!cb) return;
    if (cb.checked) selectedIds.add(cb.dataset.selectId);
    else selectedIds.delete(cb.dataset.selectId);
    updateBulkBar();
  });

  $("#selectAllProjects").addEventListener("change", (e) => {
    if (e.target.checked) (state.work || []).forEach((w) => selectedIds.add(w.id));
    else selectedIds.clear();
    renderProjects();
  });

  $("#bulkToggleHideBtn").addEventListener("click", async () => {
    if (!selectedIds.size) return;
    const ok = await askConfirmation({
      type: "edit",
      badge: "Bulk Visibility Change",
      title: `Toggle visibility for ${selectedIds.size} selected project(s)?`,
      description: "Published items will become Drafts, and Drafts will become Published.",
      confirmText: "Confirm Bulk Update",
    });
    if (!ok) return;
    state.work.forEach((w) => {
      if (selectedIds.has(w.id)) w.hidden = !w.hidden;
    });
    renderProjects();
    persist(`Updated visibility for ${selectedIds.size} project(s)`, true, true);
  });

  $("#bulkDeleteBtn").addEventListener("click", async () => {
    if (!selectedIds.size) return;
    const titles = state.work.filter((w) => selectedIds.has(w.id)).map((w) => `• ${esc(w.title)}`);
    const ok = await askConfirmation({
      type: "delete",
      badge: "Confirm Bulk Deletion",
      title: `Delete ${selectedIds.size} selected project(s)?`,
      description: "These projects will be removed from your portfolio.",
      summaryItems: titles,
      confirmText: `Delete ${selectedIds.size} Project(s)`,
    });
    if (!ok) return;
    const count = selectedIds.size;
    state.work = state.work.filter((w) => !selectedIds.has(w.id));
    selectedIds.clear();
    renderProjects();
    persist(`Deleted ${count} project(s)`, true, true);
  });

  /* Project Row Actions (with Confirmation Modals) */
  projectList.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const idx = +btn.dataset.idx;
    const act = btn.dataset.act;
    const item = state.work[idx];
    if (!item) return;

    if (act === "edit") {
      openProjectModal(idx);
    } else if (act === "toggle-draft") {
      item.hidden = !item.hidden;
      renderProjects();
      persist(`${item.hidden ? "Hidden (Draft)" : "Published"} "${item.title}"`, true, true);
    } else if (act === "up" && idx > 0) {
      [state.work[idx - 1], state.work[idx]] = [state.work[idx], state.work[idx - 1]];
      renderProjects();
      persist(`Moved "${item.title}" up`, true, false);
    } else if (act === "down" && idx < state.work.length - 1) {
      [state.work[idx + 1], state.work[idx]] = [state.work[idx], state.work[idx + 1]];
      renderProjects();
      persist(`Moved "${item.title}" down`, true, false);
    } else if (act === "dup") {
      const ok = await askConfirmation({
        type: "add",
        badge: "Confirm Addition (Duplicate)",
        title: `Duplicate "${item.title}"?`,
        description: "A copy of this project will be added right below it in your portfolio.",
        summaryItems: [
          `<strong>Title:</strong> ${esc(item.title)} (Copy)`,
          `<strong>Category:</strong> ${esc(item.category)} · ${esc(item.tag)}`,
        ],
        confirmText: "Confirm & Duplicate",
      });
      if (!ok) return;
      const copy = clone(item);
      copy.id = `${copy.id || "project"}-copy-${Date.now().toString(36)}`;
      copy.title = `${copy.title} (Copy)`;
      state.work.splice(idx + 1, 0, copy);
      renderProjects();
      persist(`Duplicated "${item.title}"`, true, true);
    } else if (act === "del") {
      const ok = await askConfirmation({
        type: "delete",
        badge: "Confirm Deletion",
        title: `Delete "${item.title}"?`,
        description: "This project will be removed from your portfolio. You can still Undo right after if needed.",
        summaryItems: [
          `<strong>Category:</strong> ${esc(item.category)} (${esc(item.tag)})`,
          `<strong>Summary:</strong> ${esc(item.summary || "No summary")}`,
        ],
        confirmText: "Confirm Delete",
      });
      if (!ok) return;
      state.work.splice(idx, 1);
      selectedIds.delete(item.id);
      renderProjects();
      persist(`Deleted "${item.title}"`, true, true);
    }
  });

  $$("#adminCategoryFilters .pill").forEach((btn) =>
    btn.addEventListener("click", () => {
      $$("#adminCategoryFilters .pill").forEach((b) => b.classList.toggle("is-active", b === btn));
      filterCat = btn.dataset.cat;
      renderProjects();
    })
  );

  $$(".view-switch .pill").forEach((btn) =>
    btn.addEventListener("click", () => {
      $$(".view-switch .pill").forEach((b) => b.classList.toggle("is-active", b === btn));
      viewMode = btn.dataset.view;
      renderProjects();
    })
  );

  $("#projectSearch").addEventListener("input", (e) => {
    searchQuery = e.target.value.trim();
    renderProjects();
  });

  /* ---------- Add / Edit Project Modal (with Multi-File Carousel Builder & Confirmation) ---------- */
  const modal = $("#projectModal");
  const form = $("#projectForm");
  const modalPreview = $("#modalLivePreview");
  const modalGalleryList = $("#modalGalleryList");
  const modalSlidesCount = $("#modalSlidesCount");
  let modalSlides = [];

  const syncSlideZeroFromPrimary = () => {
    if (!modalSlides.length) {
      modalSlides.push({
        type: form.elements.mediaType.value || "image",
        src: form.elements.src.value.trim(),
        poster: form.elements.poster.value.trim(),
        caption: "",
      });
    } else {
      modalSlides[0].type = form.elements.mediaType.value || "image";
      modalSlides[0].src = form.elements.src.value.trim();
      modalSlides[0].poster = form.elements.poster.value.trim();
    }
  };

  const syncPrimaryFromSlideZero = () => {
    if (!modalSlides.length) return;
    form.elements.mediaType.value = modalSlides[0].type || "image";
    form.elements.src.value = modalSlides[0].src || "";
    if (modalSlides[0].poster) form.elements.poster.value = modalSlides[0].poster;
  };

  const renderModalSlides = () => {
    modalSlidesCount.textContent = modalSlides.length;
    modalGalleryList.innerHTML = modalSlides
      .map((s, sIdx) => {
        const previewSrc = s.type === "video" ? s.poster || form.elements.poster.value || VIDEO_PLACEHOLDER : s.src;
        return `
          <div class="slide-row" data-slide-idx="${sIdx}">
            <img class="slide-row__thumb" src="${esc(previewSrc || "")}" alt="Slide ${sIdx + 1}" />
            <div class="slide-row__fields">
              <div class="slide-row__top">
                <select data-slide-field="type">
                  <option value="image" ${s.type !== "video" ? "selected" : ""}>#${sIdx + 1}${sIdx === 0 ? " Cover" : ""} · Photo</option>
                  <option value="video" ${s.type === "video" ? "selected" : ""}>#${sIdx + 1}${sIdx === 0 ? " Cover" : ""} · Video</option>
                </select>
                <input type="text" data-slide-field="src" value="${esc(s.src || "")}" placeholder="Image/Video URL or upload →" />
              </div>
              <input type="text" data-slide-field="caption" value="${esc(s.caption || "")}" placeholder="Optional caption for slide #${sIdx + 1}..." />
            </div>
            <div class="project-row__actions">
              <label class="icon-btn upload-btn" title="Upload photo or .mov / .mp4 video for this slide">
                Upload
                <input type="file" accept="image/*,video/*,.mov,.mp4,.webm,.m4v" data-slide-upload="${sIdx}" hidden />
              </label>
              <button type="button" class="icon-btn" data-slide-act="up" data-idx="${sIdx}" title="Move Up">↑</button>
              <button type="button" class="icon-btn" data-slide-act="down" data-idx="${sIdx}" title="Move Down">↓</button>
              ${
                modalSlides.length > 1
                  ? `<button type="button" class="icon-btn icon-btn--danger" data-slide-act="del" data-idx="${sIdx}">×</button>`
                  : ""
              }
            </div>
          </div>`;
      })
      .join("");
  };

  modalGalleryList.addEventListener("input", (e) => {
    const row = e.target.closest("[data-slide-idx]");
    if (!row) return;
    const idx = +row.dataset.slideIdx;
    const field = e.target.dataset.slideField;
    if (!field) return;
    modalSlides[idx][field] = e.target.value;
    if (idx === 0) {
      syncPrimaryFromSlideZero();
      updateModalPreview();
    }
    if (field === "src") {
      const img = $(".slide-row__thumb", row);
      if (img) img.src = e.target.value;
    }
  });

  modalGalleryList.addEventListener("change", async (e) => {
    const upload = e.target.closest("[data-slide-upload]");
    if (!upload) return;
    const file = upload.files?.[0];
    if (!file) return;
    const idx = +upload.dataset.slideUpload;
    const processed = await processFilesWithProgress([file], `Uploading Slide #${idx + 1}...`);
    upload.value = "";
    if (!processed?.[0]) return;
    const item = processed[0];
    modalSlides[idx].src = item.src;
    modalSlides[idx].type = item.type;
    if (item.poster) modalSlides[idx].poster = item.poster;
    if (idx === 0) {
      if (item.duration && !form.elements.duration.value) form.elements.duration.value = item.duration;
      syncPrimaryFromSlideZero();
    }
    renderModalSlides();
    updateModalPreview();
    showToast(`Attached "${file.name}" to Slide #${idx + 1}`);
  });

  modalGalleryList.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-slide-act]");
    if (!btn) return;
    const idx = +btn.dataset.idx;
    const act = btn.dataset.slideAct;
    if (act === "up" && idx > 0) {
      [modalSlides[idx - 1], modalSlides[idx]] = [modalSlides[idx], modalSlides[idx - 1]];
      syncPrimaryFromSlideZero();
      renderModalSlides();
      updateModalPreview();
    } else if (act === "down" && idx < modalSlides.length - 1) {
      [modalSlides[idx + 1], modalSlides[idx]] = [modalSlides[idx], modalSlides[idx + 1]];
      syncPrimaryFromSlideZero();
      renderModalSlides();
      updateModalPreview();
    } else if (act === "del" && modalSlides.length > 1) {
      const ok = await askConfirmation({
        type: "delete",
        badge: "Confirm Slide Removal",
        title: `Remove Slide #${idx + 1} from this project?`,
        description: "This file will be removed from this project's carousel.",
        confirmText: "Confirm Remove Slide",
      });
      if (!ok) return;
      modalSlides.splice(idx, 1);
      syncPrimaryFromSlideZero();
      renderModalSlides();
      updateModalPreview();
    }
  });

  $("#addSlideRowBtn").addEventListener("click", async () => {
    const ok = await askConfirmation({
      type: "add",
      badge: "Confirm Slide Addition",
      title: `Add Slide #${modalSlides.length + 1} to this Project?`,
      description: "Adds another photo or video slot to this project's Instagram-style carousel.",
      confirmText: "Confirm & Add Slide",
    });
    if (!ok) return;
    modalSlides.push({ type: "image", src: "", poster: "", caption: "" });
    renderModalSlides();
  });

  $("#multiGalleryUpload").addEventListener("change", async (e) => {
    const files = [...(e.target.files || [])];
    if (!files.length) return;
    const processed = await processFilesWithProgress(files, `Uploading ${files.length} Project File${files.length > 1 ? "s" : ""}...`);
    e.target.value = "";
    if (!processed) return;

    const ok = await askConfirmation({
      type: "add",
      badge: "Confirm Multi-File Attachment",
      title: `Attach ${files.length} file(s) to this project?`,
      description: "Selected photos and videos (.mov / .mp4) will be added as carousel slides for this project.",
      summaryItems: processed.map(
        (p) => `• ${p.type === "video" ? "Video" : "Photo"}: <strong>${esc(p.name)}</strong> (${formatSize(p.size)})`
      ),
      confirmText: `Confirm & Attach ${files.length} File(s)`,
    });
    if (!ok) return;

    processed.forEach((item) => {
      const nameClean = item.name.replace(/\.[^.]+$/, "");
      const slide = { type: item.type, src: item.src, poster: item.poster || "", caption: nameClean };
      if (modalSlides.length === 1 && !modalSlides[0].src) {
        modalSlides[0] = slide;
        if (item.duration && !form.elements.duration.value) form.elements.duration.value = item.duration;
      } else {
        modalSlides.push(slide);
      }
    });
    syncPrimaryFromSlideZero();
    renderModalSlides();
    updateModalPreview();
    showToast(`Attached ${files.length} file(s) to project carousel!`);
  });

  const updateModalPreview = () => {
    const src = form.elements.src.value.trim();
    const poster = form.elements.poster.value.trim();
    const before = form.elements.beforeSrc.value.trim();
    const after = form.elements.afterSrc.value.trim();
    const thumb = form.elements.mediaType.value === "video" ? poster || VIDEO_PLACEHOLDER : src;
    const parts = [];
    if (thumb) parts.push(`<div><span class="eyebrow">Cover (#1)</span><img src="${esc(thumb)}" alt="Preview" /></div>`);
    if (before && after) {
      parts.push(`<div><span class="eyebrow">Before (Log)</span><img src="${esc(before)}" alt="Before" /></div>`);
      parts.push(`<div><span class="eyebrow">After (Grade)</span><img src="${esc(after)}" alt="After" /></div>`);
    }
    modalPreview.innerHTML = parts.join("");
  };

  ["src", "poster", "beforeSrc", "afterSrc", "mediaType"].forEach((name) => {
    form.elements[name]?.addEventListener("input", () => {
      syncSlideZeroFromPrimary();
      renderModalSlides();
      updateModalPreview();
    });
  });

  /* Auto-fill YouTube Thumbnail */
  $("#ytAutoThumbBtn").addEventListener("click", () => {
    const url = form.elements.src.value.trim();
    const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
    if (!yt) {
      showToast("Paste a YouTube URL in the Primary URL field first");
      return;
    }
    form.elements.mediaType.value = "video";
    form.elements.poster.value = `https://img.youtube.com/vi/${yt[1]}/maxresdefault.jpg`;
    syncSlideZeroFromPrimary();
    renderModalSlides();
    updateModalPreview();
    showToast("Auto-filled YouTube high-res thumbnail!");
  });

  const openProjectModal = (idx = -1, defaultCat = null) => {
    form.reset();
    form.elements.index.value = idx;
    $("#modalTitle").textContent = idx >= 0 ? "Edit Project" : "Add New Project";
    $("#projectSubmitBtn").textContent = idx >= 0 ? "Review & Update Project" : "Review & Add Project";

    if (idx >= 0) {
      const item = state.work[idx];
      form.elements.title.value = item.title || "";
      form.elements.category.value = item.category || "photography";
      form.elements.tag.value = item.tag || "";
      form.elements.size.value = item.size || "";
      form.elements.mediaType.value = item.mediaType || "image";
      form.elements.duration.value = item.duration || "";
      form.elements.src.value = item.src || "";
      form.elements.poster.value = item.poster || "";
      form.elements.summary.value = item.summary || "";
      form.elements.breakdown.value = (item.breakdown || []).join("\n");
      form.elements.beforeSrc.value = item.beforeSrc || "";
      form.elements.afterSrc.value = item.afterSrc || "";
      form.elements.hidden.checked = Boolean(item.hidden);
      modalSlides =
        Array.isArray(item.gallery) && item.gallery.length
          ? clone(item.gallery)
          : [
              {
                type: item.mediaType || "image",
                src: item.src || "",
                poster: item.poster || "",
                caption: "",
              },
            ];
    } else {
      form.elements.category.value =
        defaultCat || (filterCat !== "all" && filterCat !== "drafts" ? filterCat : "photography");
      modalSlides = [{ type: "image", src: "", poster: "", caption: "" }];
    }
    renderModalSlides();
    updateModalPreview();
    modal.hidden = false;
  };

  const closeProjectModal = () => {
    modal.hidden = true;
  };

  $("#addProjectBtn").addEventListener("click", () => openProjectModal(-1));
  $("#closeModalBtn").addEventListener("click", closeProjectModal);
  $("#cancelModalBtn").addEventListener("click", closeProjectModal);

  $$("[data-modal-upload]").forEach((input) => {
    input.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const fieldName = input.dataset.modalUpload;
      const processed = await processFilesWithProgress([file], `Uploading ${file.name}...`);
      e.target.value = "";
      if (!processed?.[0]) return;
      const item = processed[0];
      if (fieldName === "src" && item.type === "video") {
        form.elements.mediaType.value = "video";
        form.elements.src.value = item.src;
        if (item.poster && !form.elements.poster.value) form.elements.poster.value = item.poster;
        if (item.duration && !form.elements.duration.value) form.elements.duration.value = item.duration;
        syncSlideZeroFromPrimary();
        renderModalSlides();
        updateModalPreview();
        showToast(
          file.size > 45 * 1024 * 1024
            ? `Loaded "${file.name}" (${formatSize(file.size)}). Note: >45 MB videos may exceed GitHub web API limits.`
            : `Loaded video "${file.name}" (${formatSize(file.size)})`
        );
        return;
      }
      form.elements[fieldName].value = item.src;
      syncSlideZeroFromPrimary();
      renderModalSlides();
      updateModalPreview();
      showToast(`Loaded "${file.name}" into ${fieldName}`);
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const idx = +form.elements.index.value;
    const isAdd = idx < 0;
    syncSlideZeroFromPrimary();
    const cleanGallery = modalSlides
      .map((s) => ({
        type: s.type || "image",
        src: (s.src || "").trim(),
        poster: (s.poster || "").trim(),
        caption: (s.caption || "").trim(),
      }))
      .filter((s) => s.src);

    const cover = cleanGallery[0] || {
      type: form.elements.mediaType.value,
      src: form.elements.src.value.trim(),
      poster: form.elements.poster.value.trim(),
    };

    const candidate = {
      id:
        !isAdd && state.work[idx]?.id
          ? state.work[idx].id
          : form.elements.title.value.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString(36).slice(-4),
      category: form.elements.category.value,
      tag: form.elements.tag.value.trim(),
      title: form.elements.title.value.trim(),
      summary: form.elements.summary.value.trim(),
      mediaType: cover.type || form.elements.mediaType.value,
      src: cover.src || form.elements.src.value.trim(),
      poster: cover.poster || form.elements.poster.value.trim(),
      duration: form.elements.duration.value.trim(),
      size: form.elements.size.value,
      gallery: cleanGallery.length ? cleanGallery : [{ type: cover.type, src: cover.src, poster: cover.poster, caption: "" }],
      breakdown: form.elements.breakdown.value
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      beforeSrc: form.elements.beforeSrc.value.trim(),
      afterSrc: form.elements.afterSrc.value.trim(),
      hidden: form.elements.hidden.checked,
    };

    const ok = await askConfirmation({
      type: isAdd ? "add" : "edit",
      badge: isAdd ? "Confirm New Project Addition" : "Confirm Project Update",
      title: isAdd ? `Add "${candidate.title}" to Portfolio?` : `Save changes to "${candidate.title}"?`,
      description: isAdd
        ? "This project will be added to your portfolio with its attached carousel files."
        : "Your updates and attached carousel slides will be applied immediately.",
      summaryItems: [
        `<strong>Category:</strong> ${esc(candidate.category)} · ${esc(candidate.tag)}`,
        `<strong>Attached Files:</strong> ${candidate.gallery.length} file(s) in carousel`,
        `<strong>Status:</strong> ${candidate.hidden ? "Draft (Hidden)" : "Published (Live)"}`,
      ],
      confirmText: isAdd ? "Confirm & Add Project" : "Confirm & Save Changes",
    });

    if (!ok) return;

    if (isAdd) state.work.unshift(candidate);
    else state.work[idx] = candidate;

    closeProjectModal();
    renderProjects();
    persist(isAdd ? `Added project "${candidate.title}" (${candidate.gallery.length} files)` : `Updated project "${candidate.title}" (${candidate.gallery.length} files)`, true, true);
  });

  /* ---------- About Section: Biography Paragraphs & Skills Chips (with Confirmation Modals) ---------- */
  const bioListEl = $("#bioParagraphsList");
  const skillsChipEl = $("#skillsChipList");

  const renderAboutAdmin = () => {
    bioListEl.innerHTML = (state.about?.bio || [])
      .map(
        (p, idx) => `
        <div class="upload-row" data-bio-idx="${idx}" style="align-items:flex-start">
          <textarea rows="3" data-bio-input="${idx}" style="flex:1;padding:0.65rem;background:var(--bg);border:1px solid var(--line);border-radius:4px;color:var(--text);font:inherit">${esc(p)}</textarea>
          <button type="button" class="btn btn--danger btn--sm" data-del-bio="${idx}">Delete</button>
        </div>`
      )
      .join("");

    skillsChipEl.innerHTML = (state.about?.skills || [])
      .map(
        (skill, idx) => `
        <span class="chip">
          <span>${esc(skill)}</span>
          <button type="button" data-del-skill="${idx}" aria-label="Remove ${esc(skill)}">×</button>
        </span>`
      )
      .join("");
  };

  bioListEl.addEventListener("input", (e) => {
    const idx = e.target.dataset.bioInput;
    if (idx === undefined) return;
    state.about.bio[+idx] = e.target.value;
    persist("Updated biography paragraph", true, false);
  });

  bioListEl.addEventListener("click", async (e) => {
    const del = e.target.closest("[data-del-bio]");
    if (!del) return;
    const idx = +del.dataset.delBio;
    const text = state.about.bio[idx];
    const ok = await askConfirmation({
      type: "delete",
      badge: "Confirm Paragraph Deletion",
      title: `Delete Biography Paragraph #${idx + 1}?`,
      description: "This paragraph will be removed from the About section.",
      summaryItems: [`"${esc((text || "").slice(0, 120))}..."`],
      confirmText: "Confirm Delete",
    });
    if (!ok) return;
    state.about.bio.splice(idx, 1);
    renderAboutAdmin();
    persist("Deleted biography paragraph", true, true);
  });

  $("#addBioParagraphBtn").addEventListener("click", async () => {
    const ok = await askConfirmation({
      type: "add",
      badge: "Confirm Addition",
      title: "Add a new Biography Paragraph?",
      description: "A new paragraph block will be appended to your About section.",
      confirmText: "Confirm & Add Paragraph",
    });
    if (!ok) return;
    if (!state.about.bio) state.about.bio = [];
    state.about.bio.push("New biography paragraph — share your creative story and background here.");
    renderAboutAdmin();
    persist("Added biography paragraph", true, true);
  });

  $("#addSkillBtn").addEventListener("click", async () => {
    const input = $("#newSkillInput");
    const val = input.value.trim();
    if (!val) return;
    const ok = await askConfirmation({
      type: "add",
      badge: "Confirm Skill Addition",
      title: `Add capability "${val}"?`,
      description: "This tag will appear under Capabilities & Post-Production Tools in your About section.",
      confirmText: "Confirm & Add Skill",
    });
    if (!ok) return;
    state.about.skills.push(val);
    input.value = "";
    renderAboutAdmin();
    persist(`Added skill "${val}"`, true, true);
  });

  skillsChipEl.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-del-skill]");
    if (!btn) return;
    const idx = +btn.dataset.delSkill;
    const name = state.about.skills[idx];
    const ok = await askConfirmation({
      type: "delete",
      badge: "Confirm Skill Deletion",
      title: `Remove capability "${name}"?`,
      description: "This tag will be removed from your About section.",
      confirmText: "Confirm Remove",
    });
    if (!ok) return;
    state.about.skills.splice(idx, 1);
    renderAboutAdmin();
    persist(`Removed skill "${name}"`, true, true);
  });

  /* ---------- Services Editor (with Confirmation Modals) ---------- */
  const servicesListEl = $("#servicesAdminList");

  const renderServicesAdmin = () => {
    servicesListEl.innerHTML = (state.services || [])
      .map(
        (s, idx) => `
        <div class="card" data-service-idx="${idx}">
          <div class="card__head">
            <h2>${esc(s.number || String(idx + 1).padStart(2, "0"))} — ${esc(s.title)}</h2>
            <div class="btn-row">
              <button type="button" class="icon-btn" data-move-service="up" data-idx="${idx}">↑</button>
              <button type="button" class="icon-btn" data-move-service="down" data-idx="${idx}">↓</button>
              <button type="button" class="btn btn--danger btn--sm" data-del-service="${idx}">Delete Service</button>
            </div>
          </div>
          <div class="field-grid">
            <label class="field">
              <span>Number Badge</span>
              <input type="text" data-sfield="number" value="${esc(s.number || "")}" />
            </label>
            <label class="field">
              <span>Service Title</span>
              <input type="text" data-sfield="title" value="${esc(s.title || "")}" />
            </label>
          </div>
          <div class="field-grid">
            <label class="field">
              <span>Subtitle</span>
              <input type="text" data-sfield="subtitle" value="${esc(s.subtitle || "")}" />
            </label>
            <label class="field">
              <span>Inquiry Button Label</span>
              <input type="text" data-sfield="cta" value="${esc(s.cta || "")}" />
            </label>
          </div>
          <label class="field">
            <span>Description</span>
            <textarea rows="2" data-sfield="description">${esc(s.description || "")}</textarea>
          </label>
          <label class="field">
            <span>Deliverables (one per line)</span>
            <textarea rows="4" data-sfield="deliverables">${esc((s.deliverables || []).join("\n"))}</textarea>
          </label>
        </div>`
      )
      .join("");
  };

  servicesListEl.addEventListener("input", (e) => {
    const card = e.target.closest("[data-service-idx]");
    if (!card) return;
    const idx = +card.dataset.serviceIdx;
    const field = e.target.dataset.sfield;
    if (!field) return;
    if (field === "deliverables") {
      state.services[idx].deliverables = e.target.value
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
    } else {
      state.services[idx][field] = e.target.value;
      if (field === "title") state.services[idx].id = e.target.value;
    }
    persist("Updated service", true, false);
  });

  servicesListEl.addEventListener("click", async (e) => {
    const move = e.target.closest("[data-move-service]");
    if (move) {
      const idx = +move.dataset.idx;
      const dir = move.dataset.moveService === "up" ? -1 : 1;
      const target = idx + dir;
      if (target >= 0 && target < state.services.length) {
        [state.services[idx], state.services[target]] = [state.services[target], state.services[idx]];
        renderServicesAdmin();
        persist("Reordered services", true, true);
      }
      return;
    }

    const del = e.target.closest("[data-del-service]");
    if (!del) return;
    const idx = +del.dataset.delService;
    const svc = state.services[idx];
    const ok = await askConfirmation({
      type: "delete",
      badge: "Confirm Service Deletion",
      title: `Delete service "${svc?.title}"?`,
      description: "This service pillar will be removed from the Services section.",
      summaryItems: [`<strong>Subtitle:</strong> ${esc(svc?.subtitle || "")}`],
      confirmText: "Confirm Delete Service",
    });
    if (!ok) return;
    state.services.splice(idx, 1);
    renderServicesAdmin();
    persist(`Deleted service "${svc?.title}"`, true, true);
  });

  $("#addServiceBtn").addEventListener("click", async () => {
    const num = String((state.services?.length || 0) + 1).padStart(2, "0");
    const ok = await askConfirmation({
      type: "add",
      badge: "Confirm Service Addition",
      title: `Add new Service #${num}?`,
      description: "A new service card will be added to your Services section.",
      confirmText: "Confirm & Add Service",
    });
    if (!ok) return;
    state.services.push({
      id: "Creative Service",
      number: num,
      title: "Creative Service",
      subtitle: "Custom production & visual direction",
      description: "Tailored creative production designed around your project goals.",
      deliverables: ["Concept & pre-production", "Location capture & post-production"],
      cta: "Inquire About Service",
    });
    renderServicesAdmin();
    persist("Added new service", true, true);
  });

  /* ---------- Contact: Project Types & Social Links (with Confirmation Modals) ---------- */
  const projectTypesChipEl = $("#projectTypesChipList");
  const socialsListEl = $("#socialsAdminList");

  const renderContactAdmin = () => {
    projectTypesChipEl.innerHTML = (state.contact?.projectTypes || [])
      .map(
        (pt, idx) => `
        <span class="chip">
          <span>${esc(pt)}</span>
          <button type="button" data-del-pt="${idx}" aria-label="Remove ${esc(pt)}">×</button>
        </span>`
      )
      .join("");

    socialsListEl.innerHTML = (state.contact?.socials || [])
      .map(
        (soc, idx) => `
        <div class="field-grid" data-soc-idx="${idx}" style="align-items:end">
          <label class="field">
            <span>Platform Label</span>
            <input type="text" data-soc-field="label" value="${esc(soc.label)}" />
          </label>
          <div class="upload-row">
            <label class="field" style="flex:1">
              <span>Profile URL</span>
              <input type="url" data-soc-field="url" value="${esc(soc.url)}" />
            </label>
            <button type="button" class="btn btn--danger btn--sm" data-del-soc="${idx}" style="margin-bottom:4px">Delete</button>
          </div>
        </div>`
      )
      .join("");
  };

  $("#addProjectTypeBtn").addEventListener("click", async () => {
    const input = $("#newProjectTypeInput");
    const val = input.value.trim();
    if (!val) return;
    const ok = await askConfirmation({
      type: "add",
      badge: "Confirm Option Addition",
      title: `Add project type "${val}"?`,
      description: "Visitors will be able to choose this option in the Contact form dropdown.",
      confirmText: "Confirm & Add Option",
    });
    if (!ok) return;
    state.contact.projectTypes.push(val);
    input.value = "";
    renderContactAdmin();
    persist(`Added project type "${val}"`, true, true);
  });

  projectTypesChipEl.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-del-pt]");
    if (!btn) return;
    const idx = +btn.dataset.delPt;
    const label = state.contact.projectTypes[idx];
    const ok = await askConfirmation({
      type: "delete",
      badge: "Confirm Option Deletion",
      title: `Remove project type "${label}"?`,
      description: "This option will be removed from the Contact form dropdown.",
      confirmText: "Confirm Remove",
    });
    if (!ok) return;
    state.contact.projectTypes.splice(idx, 1);
    renderContactAdmin();
    persist(`Removed project type "${label}"`, true, true);
  });

  socialsListEl.addEventListener("input", (e) => {
    const row = e.target.closest("[data-soc-idx]");
    if (!row) return;
    const idx = +row.dataset.socIdx;
    const f = e.target.dataset.socField;
    state.contact.socials[idx][f] = e.target.value;
    persist("Updated social link", true, false);
  });

  socialsListEl.addEventListener("click", async (e) => {
    const del = e.target.closest("[data-del-soc]");
    if (!del) return;
    const idx = +del.dataset.delSoc;
    const soc = state.contact.socials[idx];
    const ok = await askConfirmation({
      type: "delete",
      badge: "Confirm Social Link Deletion",
      title: `Remove "${soc?.label}" link?`,
      description: "This social profile link will be removed from your Contact section.",
      summaryItems: [`<code>${esc(soc?.url || "")}</code>`],
      confirmText: "Confirm Delete Link",
    });
    if (!ok) return;
    state.contact.socials.splice(idx, 1);
    renderContactAdmin();
    persist(`Removed social link "${soc?.label}"`, true, true);
  });

  $("#addSocialBtn").addEventListener("click", async () => {
    const ok = await askConfirmation({
      type: "add",
      badge: "Confirm Social Link Addition",
      title: "Add a new Social Profile Link?",
      description: "A new social media entry will be added to your Contact section.",
      confirmText: "Confirm & Add Social Link",
    });
    if (!ok) return;
    state.contact.socials.push({ label: "TikTok", url: "https://tiktok.com/@" });
    renderContactAdmin();
    persist("Added social link", true, true);
  });

  /* ---------- Appearance & Palette Presets ---------- */
  const presets = {
    studio: { bg: "#0a0a0a", bgCharcoal: "#121213", text: "#f5f5f3", neutral: "#d4d2cc" },
    obsidian: { bg: "#050505", bgCharcoal: "#0d0d0f", text: "#ffffff", neutral: "#c8c8c8" },
    warm: { bg: "#0e0c0a", bgCharcoal: "#171412", text: "#f7f3eb", neutral: "#d8cbb8" },
    slate: { bg: "#0b0d10", bgCharcoal: "#12161b", text: "#f2f5f8", neutral: "#c3ccd6" },
  };

  $$("[data-theme-preset]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const p = presets[btn.dataset.themePreset];
      if (!p) return;
      state.theme = clone(p);
      syncInputsFromState();
      persist(`Applied "${btn.textContent.trim()}" theme`, true, true);
    })
  );

  [
    ["#colorBg", "theme.bg"],
    ["#colorBgCharcoal", "theme.bgCharcoal"],
    ["#colorText", "theme.text"],
    ["#colorNeutral", "theme.neutral"],
  ].forEach(([sel, path]) => {
    $(sel).addEventListener("input", (e) => {
      setByPath(state, path, e.target.value);
      syncInputsFromState();
      persist("Updated palette color", true, false);
    });
  });

  /* ---------- Media Library ---------- */
  const renderMediaLibrary = () => {
    const media = [];
    if (state.hero?.poster) media.push({ title: "Hero Poster", role: "Hero", src: state.hero.poster });
    if (state.about?.portrait) media.push({ title: "Creator Portrait", role: "About", src: state.about.portrait });
    (state.work || []).forEach((w, idx) => {
      const thumb = w.mediaType === "video" ? w.poster || VIDEO_PLACEHOLDER : w.src;
      if (thumb) media.push({ title: w.title, role: w.category, src: thumb, idx });
      if (w.beforeSrc) media.push({ title: `${w.title} (Before Grade)`, role: "Grade Before", src: w.beforeSrc, idx });
      if (w.afterSrc) media.push({ title: `${w.title} (After Grade)`, role: "Grade After", src: w.afterSrc, idx });
    });

    $("#mediaCountBadge").textContent = media.length;
    $("#mediaLibraryGrid").innerHTML = media
      .map(
        (m, i) => `
        <div class="media-card">
          <img src="${esc(m.src)}" alt="${esc(m.title)}" loading="lazy" />
          <div class="media-card__body">
            <span class="badge">${esc(m.role)}</span>
            <div class="media-card__title" title="${esc(m.title)}">${esc(m.title)}</div>
            <div class="btn-row">
              <button type="button" class="icon-btn" data-copy-media="${i}">Copy Path</button>
              ${m.idx !== undefined ? `<button type="button" class="icon-btn" data-jump-project="${m.idx}">Edit Project</button>` : ""}
            </div>
          </div>
        </div>`
      )
      .join("");

    $$("[data-copy-media]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const item = media[+btn.dataset.copyMedia];
        await navigator.clipboard.writeText(item.src);
        showToast(`Copied URL for "${item.title}"`);
      })
    );
    $$("[data-jump-project]").forEach((btn) =>
      btn.addEventListener("click", () => {
        switchTab("portfolio");
        openProjectModal(+btn.dataset.jumpProject);
      })
    );
  };

  /* ---------- Download / Copy / Export / Import / Reset ---------- */
  const downloadFile = (filename, content, type = "text/javascript") => {
    const blob = new Blob([content], { type });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  $("#downloadContentBtn").addEventListener("click", () => {
    downloadFile("content.js", generateContentJs(state));
    showToast("Downloaded content.js");
  });
  $("#downloadContentBtn2").addEventListener("click", () => {
    downloadFile("content.js", generateContentJs(state));
    showToast("Downloaded content.js");
  });

  $("#copyContentBtn").addEventListener("click", async () => {
    await navigator.clipboard.writeText(generateContentJs(state));
    showToast("Copied content.js code to clipboard!");
  });

  $("#exportJsonBtn").addEventListener("click", () => {
    downloadFile("uri-visuals-backup.json", JSON.stringify(state, null, 2), "application/json");
    showToast("Exported JSON backup");
  });

  $("#importJsonInput").addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed || !Array.isArray(parsed.work)) throw new Error("Invalid schema");
        const ok = await askConfirmation({
          type: "add",
          badge: "Confirm Backup Import",
          title: `Import "${file.name}"?`,
          description: `This backup contains ${parsed.work.length} portfolio projects and will replace your current studio session.`,
          confirmText: "Confirm & Import Backup",
        });
        if (!ok) return;
        state = parsed;
        initAll();
        persist(`Imported backup "${file.name}"`, true, true);
      } catch (_) {
        showToast("Invalid JSON backup file");
      }
    };
    reader.readAsText(file);
  });

  $("#resetDefaultBtn").addEventListener("click", async () => {
    const ok = await askConfirmation({
      type: "delete",
      badge: "Confirm Studio Reset",
      title: "Reset to Default content.js?",
      description: "All local browser edits will be cleared and reverted to the repository's default js/content.js.",
      confirmText: "Confirm Reset",
    });
    if (!ok) return;
    await idbClearRecord();
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_META_KEY);
    state = clone(window.SITE);
    lastSerializedBytes = JSON.stringify(state).length;
    initAll(false);
    if (previewFrame && previewFrame.contentWindow) {
      previewFrame.contentWindow.postMessage({ type: "URI_CMS_PREVIEW", payload: state }, "*");
    }
    syncChannel?.postMessage({ type: "URI_CMS_RESET" });
    if (saveStatus) saveStatus.textContent = "✓ Reset to default content.js";
    logActivity("Reset to default content.js");
    showToast("Reset to default content.js");
  });

  /* ---------- Passcode Setting ---------- */
  $("#savePinBtn").addEventListener("click", async () => {
    const pin = $("#adminPinSetting").value.trim();
    const ok = await askConfirmation({
      type: "edit",
      badge: "Security Setting",
      title: pin ? "Enable Admin Passcode Lock?" : "Remove Admin Passcode Lock?",
      description: pin
        ? "Next time /admin.html is opened in this browser, this passcode will be required."
        : "The Admin Studio will open without asking for a passcode.",
      confirmText: "Confirm Security Setting",
    });
    if (!ok) return;
    if (pin) localStorage.setItem(PIN_KEY, pin);
    else localStorage.removeItem(PIN_KEY);
    $("#adminPinSetting").value = "";
    showToast(pin ? "Passcode lock enabled" : "Passcode lock removed");
  });

  /* ---------- Direct GitHub Publisher ---------- */
  const ghTokenInput = $("#ghToken");
  ghTokenInput.value = localStorage.getItem(GH_TOKEN_KEY) || "";
  ghTokenInput.addEventListener("input", () => {
    localStorage.setItem(GH_TOKEN_KEY, ghTokenInput.value.trim());
  });

  const bytesToBase64 = (bytes) => {
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  };

  const toBase64Utf8 = (str) => bytesToBase64(new TextEncoder().encode(str));

  const collectReferencedUploadPaths = (site) => {
    const paths = new Set();
    const addIfUpload = (p) => {
      if (typeof p === "string" && p.startsWith("assets/uploads/")) paths.add(p);
    };
    addIfUpload(site.hero?.video);
    (site.work || []).forEach((item) => {
      addIfUpload(item.src);
      (item.gallery || []).forEach((slide) => addIfUpload(slide.src));
    });
    return [...paths];
  };

  const fetchLatestFileSha = async (repo, filePath, branch, headers, viaCommitRef = false) => {
    const ts = Date.now();
    let refParam = branch;
    if (viaCommitRef) {
      const refRes = await fetch(
        `https://api.github.com/repos/${repo}/git/ref/heads/${encodeURIComponent(branch)}?_t=${ts}`,
        { headers, cache: "no-store" }
      );
      if (refRes.ok) {
        const refData = await refRes.json();
        if (refData?.object?.sha) refParam = refData.object.sha;
      }
    }
    const encodedPath = filePath.split("/").map(encodeURIComponent).join("/");
    const getRes = await fetch(
      `https://api.github.com/repos/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(refParam)}&_t=${ts}`,
      { headers, cache: "no-store" }
    );
    if (getRes.ok) {
      const meta = await getRes.json();
      return meta.sha;
    }
    if (getRes.status === 404) return undefined;
    const err = await getRes.json().catch(() => ({}));
    throw new Error(err.message || `Failed to read ${filePath} (HTTP ${getRes.status})`);
  };

  const xhrPutJson = (url, headers, bodyStr, onUploadProgress = null) =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", url, true);
      Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable && ev.total > 0) {
          onUploadProgress?.(ev.loaded, ev.total);
        }
      };
      xhr.upload.onload = () => onUploadProgress?.(bodyStr.length, bodyStr.length, true);
      xhr.onload = () => {
        let json = {};
        try { json = JSON.parse(xhr.responseText || "{}"); } catch (_) {}
        resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, json });
      };
      xhr.onerror = () => reject(new Error("Network error while uploading to GitHub"));
      xhr.onabort = () => reject(new Error("Upload cancelled"));
      xhr.send(bodyStr);
    });

  const putGithubFileWithRetry = async (
    repo,
    filePath,
    branch,
    headers,
    base64Content,
    commitMsg,
    { onRetry = null, onProgress = null } = {}
  ) => {
    const encodedPath = filePath.split("/").map(encodeURIComponent).join("/");
    const apiUrl = `https://api.github.com/repos/${repo}/contents/${encodedPath}`;
    const attemptPut = async (viaCommitRef) => {
      onProgress?.(6, viaCommitRef ? "Syncing latest GitHub SHA..." : "Checking remote file...");
      const sha = await fetchLatestFileSha(repo, filePath, branch, headers, viaCommitRef);
      const payload = JSON.stringify({ message: commitMsg, content: base64Content, sha, branch });
      return xhrPutJson(apiUrl, headers, payload, (loaded, total, finishedSending) => {
        if (finishedSending) {
          onProgress?.(94, "Committing on GitHub...");
        } else {
          const pct = 10 + Math.round((loaded / total) * 82);
          onProgress?.(pct, `Uploading ${formatSize(loaded)} / ${formatSize(total)}`);
        }
      });
    };
    let putRes = await attemptPut(false);
    if (putRes.status === 409) {
      onRetry?.();
      putRes = await attemptPut(true);
    }
    if (!putRes.ok) {
      throw new Error(putRes.json?.message || `HTTP ${putRes.status}`);
    }
    return putRes.json || {};
  };

  const publishGithubBtn = $("#publishGithubBtn");
  publishGithubBtn.addEventListener("click", async () => {
    const repo = $("#ghRepo").value.trim();
    const branch = $("#ghBranch").value.trim() || "main";
    const token = ghTokenInput.value.trim();
    const message = $("#ghCommitMsg").value.trim() || "Update portfolio via Admin Studio";
    const statusEl = $("#ghPublishStatus");

    if (!token) {
      statusEl.textContent = "Please enter a GitHub Personal Access Token first.";
      return;
    }

    const uploadPaths = collectReferencedUploadPaths(state);
    const pendingUploads = [];
    for (const p of uploadPaths) {
      const rec = await idbReadMediaBlob(p);
      if (rec?.blob) pendingUploads.push({ path: p, rec });
    }

    const ok = await askConfirmation({
      type: "add",
      badge: "Confirm Live GitHub Publish",
      title: `Commit & Publish to ${repo}?`,
      description: `This will update js/content.js${pendingUploads.length ? ` and upload ${pendingUploads.length} video file(s)` : ""} on the "${branch}" branch and trigger Vercel to deploy your changes.`,
      summaryItems: [
        `<strong>Commit message:</strong> ${esc(message)}`,
        ...(pendingUploads.length
          ? [`<strong>Video uploads:</strong> ${pendingUploads.map((u) => `${esc(u.path.split("/").pop())} (${formatSize(u.rec.size || u.rec.blob.size)})`).join(", ")}`]
          : []),
      ],
      confirmText: "Confirm & Publish Live",
    });
    if (!ok) return;

    publishGithubBtn.disabled = true;
    statusEl.textContent = "Publishing to GitHub...";

    const publishedAt = Date.now();
    state._publishedAt = publishedAt;
    const contentStr = generateContentJs(state);

    const progressList = [
      ...pendingUploads.map((u) => ({
        name: u.path.split("/").pop(),
        kind: "VIDEO",
        sizeText: formatSize(u.rec.blob.size),
        status: "Waiting in queue",
      })),
      {
        name: "js/content.js",
        kind: "SITE",
        sizeText: formatSize(contentStr.length),
        status: "Waiting in queue",
      },
    ];
    UploadProgress.open({
      badge: "Publishing Live",
      title: `Publishing ${progressList.length} File${progressList.length > 1 ? "s" : ""} to GitHub`,
      list: progressList,
      note: `Pushing to ${repo} (${branch}) — Vercel will redeploy automatically.`,
    });

    let activeRowIdx = 0;
    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      };

      /* 1. Upload any locally-uploaded .mov / .mp4 / .webm files into assets/uploads/ first */
      for (let idx = 0; idx < pendingUploads.length; idx++) {
        activeRowIdx = idx;
        const { path: filePath, rec } = pendingUploads[idx];
        const fileName = filePath.split("/").pop();
        UploadProgress.update(idx, { pct: 4, status: "Checking if already on GitHub...", state: "active" });
        const existingSha = await fetchLatestFileSha(repo, filePath, branch, headers, false).catch(() => undefined);
        if (existingSha) {
          UploadProgress.update(idx, { pct: 100, status: "✓ Already uploaded on GitHub", state: "done" });
          continue;
        }
        statusEl.textContent = `Uploading video ${idx + 1}/${pendingUploads.length} (${fileName}, ${formatSize(rec.blob.size)})...`;
        UploadProgress.update(idx, { pct: 8, status: "Encoding video bytes...", state: "active" });
        const buf = await rec.blob.arrayBuffer();
        const b64 = bytesToBase64(new Uint8Array(buf));
        await putGithubFileWithRetry(repo, filePath, branch, headers, b64, `Upload media asset ${fileName}`, {
          onProgress: (pct, st) => UploadProgress.update(idx, { pct, status: st, state: "active" }),
        });
        UploadProgress.update(idx, { pct: 100, status: "✓ Uploaded to assets/uploads/", state: "done" });
      }

      /* 2. Commit js/content.js with fresh _publishedAt stamp & 409 SHA auto-retry */
      const contentIdx = pendingUploads.length;
      activeRowIdx = contentIdx;
      statusEl.textContent = "Publishing js/content.js to GitHub...";
      UploadProgress.update(contentIdx, { pct: 6, status: "Encoding js/content.js...", state: "active" });
      const base64Content = toBase64Utf8(contentStr);

      await putGithubFileWithRetry(repo, "js/content.js", branch, headers, base64Content, message, {
        onRetry: () => {
          statusEl.textContent = "Syncing latest GitHub revision and retrying...";
          UploadProgress.update(contentIdx, { pct: 12, status: "Syncing latest SHA & retrying...", state: "active" });
        },
        onProgress: (pct, st) => UploadProgress.update(contentIdx, { pct, status: st, state: "active" }),
      });
      UploadProgress.update(contentIdx, { pct: 100, status: "✓ Committed to GitHub", state: "done" });

      /* Sync local Studio DB with the published state while Vercel finishes building (~20s).
         Once Vercel serves the newly deployed js/content.js, LIVE_FINGERPRINT changes and automatically clears this local cache. */
      await idbWriteRecord({ data: clone(state), updatedAt: publishedAt, baseFingerprint: LIVE_FINGERPRINT }).catch(() => {});
      try {
        localStorage.setItem(
          STORAGE_META_KEY,
          JSON.stringify({ updatedAt: publishedAt, bytes: contentStr.length, baseFingerprint: LIVE_FINGERPRINT })
        );
        localStorage.removeItem(STORAGE_KEY);
      } catch (_) {}
      syncChannel?.postMessage({ type: "URI_CMS_SYNC", updatedAt: publishedAt });

      UploadProgress.finish({
        badge: "Published Live",
        badgeType: "add",
        title: "Published to GitHub!",
        note: "Vercel will deploy your updated portfolio in ~20–30 seconds.",
      });
      statusEl.textContent = "✓ Published to GitHub! Vercel will deploy in ~20–30s.";
      logActivity(`Published to GitHub (${repo}@${branch})`);
      showToast("Published live to GitHub!");
    } catch (err) {
      UploadProgress.update(activeRowIdx, { pct: 100, status: `Error: ${err.message}`, state: "error" });
      UploadProgress.finish({
        badge: "Publish Failed",
        badgeType: "delete",
        title: "Upload Interrupted",
        note: err.message || "Check your GitHub token & permissions, then try again.",
      });
      statusEl.textContent = `Error: ${err.message}`;
    } finally {
      publishGithubBtn.disabled = false;
    }
  });

  /* ---------- Global Keyboard Shortcuts ---------- */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (uploadProgressModal && !uploadProgressModal.hidden) {
        if (!closeUploadProgressBtn?.disabled) UploadProgress.close();
        return;
      }
      if (!confirmModal.hidden) {
        closeConfirm(false);
        return;
      }
      if (!modal.hidden) {
        closeProjectModal();
        return;
      }
    }
    if ((e.metaKey || e.ctrlKey) && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) {
      if (e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        performUndo();
      } else if (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey)) {
        e.preventDefault();
        performRedo();
      }
    }
  });

  /* ---------- Initialize ---------- */
  const initAll = (record = false) => {
    syncInputsFromState();
    renderDashboard();
    renderProjects();
    renderAboutAdmin();
    renderServicesAdmin();
    renderContactAdmin();
    renderMediaLibrary();
    updateStorageMeter();
    updateHistoryButtons();
    $("#workCountBadge").textContent = (state.work || []).length;
    $("#servicesCountBadge").textContent = (state.services || []).length;
    renderCodePreviewSnippet(generateContentJs(state));
    if (record) persist();
  };

  initAll(false);

  /* Hydrate from IndexedDB on load (restores >5 MB drafts created on this deploy; auto-purges whenever live js/content.js updates) */
  idbReadRecord().then(async (rec) => {
    if (!rec || !rec.data || !Array.isArray(rec.data.work)) return;
    if (!rec.baseFingerprint || rec.baseFingerprint !== LIVE_FINGERPRINT) {
      await idbClearRecord();
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_META_KEY);
      } catch (_) {}
      return;
    }
    state = rec.data;
    if (!state.theme) {
      state.theme = { bg: "#0a0a0a", bgCharcoal: "#121213", text: "#f5f5f3", neutral: "#d4d2cc" };
    }
    lastSerializedBytes = JSON.stringify(state).length;
    history.length = 0;
    history.push(clone(state));
    historyIndex = 0;
    initAll(false);
    if (saveStatus) saveStatus.textContent = "✓ Loaded local Studio edits";
  });
})();
