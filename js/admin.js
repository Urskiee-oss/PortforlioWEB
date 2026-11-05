/* ==========================================================
   uri.visuals — Admin Studio Controller (Full Suite + Modals)
   ========================================================== */
(() => {
  const STORAGE_KEY = "uri_visuals_site_data";
  const ACTIVITY_KEY = "uri_visuals_activity_log";
  const GH_TOKEN_KEY = "uri_visuals_gh_token";
  const PIN_KEY = "uri_visuals_admin_pin";

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

  /* ---------- Load Initial State & Activity Log ---------- */
  const loadState = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
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
    if (history.length > 35) history.shift();
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

  const updateStorageMeter = () => {
    const raw = localStorage.getItem(STORAGE_KEY) || "";
    const kb = Math.round((raw.length * 2) / 1024);
    const pct = Math.min(100, Math.round((kb / 4500) * 100));
    $("#storageUsedText").textContent = `${kb} KB`;
    $("#storageBarFill").style.width = `${pct}%`;
  };

  const persist = (msg = "Saved locally", recordHistory = true, toast = false) => {
    if (recordHistory) pushHistory();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      if (saveStatus) saveStatus.textContent = `✓ ${msg}`;
    } catch (_) {
      if (saveStatus) saveStatus.textContent = "Storage full — download content.js";
    }
    if (previewFrame && previewFrame.contentWindow) {
      previewFrame.contentWindow.postMessage({ type: "URI_CMS_PREVIEW", payload: state }, "*");
    }
    if (codePreview) codePreview.textContent = generateContentJs(state);

    $("#workCountBadge").textContent = (state.work || []).length;
    $("#servicesCountBadge").textContent = (state.services || []).length;
    updateStorageMeter();
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

  /* ---------- Image Optimizer ---------- */
  const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const maxEdge = Number($("#imgMaxEdge")?.value) || 1600;
      const quality = Number($("#imgQuality")?.value) || 0.84;
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          canvas.getContext("2d").drawImage(img, 0, 0, w, h);
          const out = canvas.toDataURL("image/webp", quality);
          resolve(out.startsWith("data:image/webp") ? out : canvas.toDataURL("image/jpeg", quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });

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
  $("#togglePreviewBtn").addEventListener("click", () => {
    const showing = previewPane.hidden;
    previewPane.hidden = !showing;
    workspace.classList.toggle("has-preview", showing);
    if (showing) persist("Live preview synced", false);
  });
  $("#refreshPreviewBtn").addEventListener("click", () => previewFrame.contentWindow?.location.reload());
  $$("[data-vp]").forEach((btn) =>
    btn.addEventListener("click", () => {
      previewFrame.style.width = btn.dataset.vp;
    })
  );

  /* ---------- Dashboard Renderer ---------- */
  const renderDashboard = () => {
    const work = state.work || [];
    const photos = work.filter((w) => w.category === "photography").length;
    const videos = work.filter((w) => w.category === "videography").length;
    const edits = work.filter((w) => w.category === "editing").length;
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
        <span class="stat-card__label">Video Editing</span>
        <strong class="stat-card__value">${edits}</strong>
        <span class="stat-card__sub">${work.filter((w) => w.beforeSrc && w.afterSrc).length} with Before/After grade</span>
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
        label: "All 3 Portfolio Categories populated",
        ok: photos > 0 && videos > 0 && edits > 0,
      },
      {
        label: "Before/After Grade Comparison active on Editing projects",
        ok: work.some((w) => w.beforeSrc && w.afterSrc),
      },
      {
        label: "Services & Deliverables configured (" + (state.services || []).length + " pillars)",
        ok: (state.services || []).length >= 3,
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

  /* ---------- Simple Field Bindings ---------- */
  const syncInputsFromState = () => {
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
    if (codePreview) codePreview.textContent = generateContentJs(state);
  };

  $$("[data-path]").forEach((el) => {
    el.addEventListener("input", () => {
      setByPath(state, el.dataset.path, el.value);
      if (el.dataset.path === "about.portrait") {
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
      const dataUrl = await fileToDataUrl(file);
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
        const thumb = item.mediaType === "video" ? item.poster || item.src : item.src;
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

  /* ---------- Add / Edit Project Modal (with Confirmation on Add/Save) ---------- */
  const modal = $("#projectModal");
  const form = $("#projectForm");
  const modalPreview = $("#modalLivePreview");

  const updateModalPreview = () => {
    const src = form.elements.src.value.trim();
    const poster = form.elements.poster.value.trim();
    const before = form.elements.beforeSrc.value.trim();
    const after = form.elements.afterSrc.value.trim();
    const thumb = form.elements.mediaType.value === "video" ? poster || src : src;
    const parts = [];
    if (thumb) parts.push(`<div><span class="eyebrow">Thumbnail</span><img src="${esc(thumb)}" alt="Preview" /></div>`);
    if (before && after) {
      parts.push(`<div><span class="eyebrow">Before (Log)</span><img src="${esc(before)}" alt="Before" /></div>`);
      parts.push(`<div><span class="eyebrow">After (Grade)</span><img src="${esc(after)}" alt="After" /></div>`);
    }
    modalPreview.innerHTML = parts.join("");
  };

  ["src", "poster", "beforeSrc", "afterSrc", "mediaType"].forEach((name) => {
    form.elements[name]?.addEventListener("input", updateModalPreview);
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
    } else {
      form.elements.category.value =
        defaultCat || (filterCat !== "all" && filterCat !== "drafts" ? filterCat : "photography");
    }
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
      form.elements[fieldName].value = await fileToDataUrl(file);
      updateModalPreview();
      showToast(`Loaded "${file.name}" into ${fieldName}`);
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const idx = +form.elements.index.value;
    const isAdd = idx < 0;
    const candidate = {
      id:
        !isAdd && state.work[idx]?.id
          ? state.work[idx].id
          : form.elements.title.value.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString(36).slice(-4),
      category: form.elements.category.value,
      tag: form.elements.tag.value.trim(),
      title: form.elements.title.value.trim(),
      summary: form.elements.summary.value.trim(),
      mediaType: form.elements.mediaType.value,
      src: form.elements.src.value.trim(),
      poster: form.elements.poster.value.trim(),
      duration: form.elements.duration.value.trim(),
      size: form.elements.size.value,
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
        ? "This project will be added to your portfolio and shown in the live preview."
        : "Your updates to this project will be applied immediately.",
      summaryItems: [
        `<strong>Category:</strong> ${esc(candidate.category)} · ${esc(candidate.tag)}`,
        `<strong>Media:</strong> ${esc(candidate.mediaType)}${candidate.size ? ` (${esc(candidate.size)})` : ""}`,
        `<strong>Status:</strong> ${candidate.hidden ? "Draft (Hidden)" : "Published (Live)"}`,
      ],
      confirmText: isAdd ? "Confirm & Add Project" : "Confirm & Save Changes",
    });

    if (!ok) return;

    if (isAdd) state.work.unshift(candidate);
    else state.work[idx] = candidate;

    closeProjectModal();
    renderProjects();
    persist(isAdd ? `Added project "${candidate.title}"` : `Updated project "${candidate.title}"`, true, true);
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
      const thumb = w.mediaType === "video" ? w.poster || w.src : w.src;
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
    localStorage.removeItem(STORAGE_KEY);
    state = clone(window.SITE);
    initAll();
    persist("Reset to default content.js", true, true);
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

  $("#publishGithubBtn").addEventListener("click", async () => {
    const repo = $("#ghRepo").value.trim();
    const branch = $("#ghBranch").value.trim() || "main";
    const token = ghTokenInput.value.trim();
    const message = $("#ghCommitMsg").value.trim() || "Update portfolio via Admin Studio";
    const statusEl = $("#ghPublishStatus");

    if (!token) {
      statusEl.textContent = "Please enter a GitHub Personal Access Token first.";
      return;
    }

    const ok = await askConfirmation({
      type: "add",
      badge: "Confirm Live GitHub Publish",
      title: `Commit & Publish to ${repo}?`,
      description: `This will update js/content.js on the "${branch}" branch and trigger Vercel to deploy your changes.`,
      summaryItems: [`<strong>Commit message:</strong> ${esc(message)}`],
      confirmText: "Confirm & Publish Live",
    });
    if (!ok) return;

    statusEl.textContent = "Publishing to GitHub...";
    try {
      const apiUrl = `https://api.github.com/repos/${repo}/contents/js/content.js`;
      const headers = {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      };

      const getRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, { headers });
      let sha;
      if (getRes.ok) {
        const meta = await getRes.json();
        sha = meta.sha;
      }

      const contentStr = generateContentJs(state);
      const base64Content = btoa(unescape(encodeURIComponent(contentStr)));

      const putRes = await fetch(apiUrl, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ message, content: base64Content, sha, branch }),
      });

      if (!putRes.ok) {
        const err = await putRes.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${putRes.status}`);
      }

      statusEl.textContent = "✓ Published to GitHub! Vercel will deploy automatically.";
      logActivity(`Published to GitHub (${repo}@${branch})`);
      showToast("Published live to GitHub!");
    } catch (err) {
      statusEl.textContent = `Error: ${err.message}`;
    }
  });

  /* ---------- Global Keyboard Shortcuts ---------- */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
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
    if (record) persist();
  };

  initAll(false);
})();
