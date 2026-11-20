/* ==========================================================
   uri.visuals — Portfolio Rendering & Interactions
   ----------------------------------------------------------
   ✏️ Content is loaded from js/content.js (or from the Admin
      Studio override saved in localStorage).
   ========================================================== */
(() => {
  const STORAGE_KEY = "uri_visuals_site_data";
  const STORAGE_META_KEY = "uri_visuals_site_meta";
  const IDB_NAME = "uri_visuals_studio_db";
  const IDB_STORE = "kv";
  const IDB_MEDIA_STORE = "media";
  const IDB_KEY = "site_data";
  const SCHEME_KEY = "uri_visuals_color_scheme";
  const localMediaUrlCache = new Map();
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (str = "") =>
    String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

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

  const preloadLocalMediaUrls = async (site) => {
    const paths = new Set();
    const check = (p) => {
      if (typeof p === "string" && p.startsWith("assets/uploads/") && !localMediaUrlCache.has(p)) paths.add(p);
    };
    check(site?.hero?.video);
    (site?.work || []).forEach((item) => {
      check(item.src);
      (item.gallery || []).forEach((slide) => check(slide.src));
    });
    if (!paths.size) return;
    try {
      const db = await openStudioDb();
      if (!db || !db.objectStoreNames.contains(IDB_MEDIA_STORE)) return;
      await Promise.all(
        [...paths].map(
          (repoPath) =>
            new Promise((resolve) => {
              const tx = db.transaction(IDB_MEDIA_STORE, "readonly");
              const req = tx.objectStore(IDB_MEDIA_STORE).get(repoPath);
              req.onsuccess = () => {
                if (req.result?.blob) {
                  localMediaUrlCache.set(repoPath, URL.createObjectURL(req.result.blob));
                }
                resolve();
              };
              req.onerror = () => resolve();
            })
        )
      );
    } catch (_) {}
  };

  const resolveMediaUrl = (src = "") => localMediaUrlCache.get(src) || src;

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

  /* ---------- Subtle Local Draft Indicator (never shown to public visitors) ---------- */
  const setDraftIndicator = (isDraft) => {
    const isPreview = new URLSearchParams(window.location.search).has("preview");
    let pill = $("#studioDraftPill");
    if (!isDraft || isPreview) {
      pill?.remove();
      return;
    }
    if (!pill) {
      pill = document.createElement("div");
      pill.id = "studioDraftPill";
      pill.className = "draft-pill";
      pill.innerHTML = `
        <span class="draft-pill__dot" aria-hidden="true"></span>
        <span>Previewing local Admin Studio draft</span>
        <button type="button" class="draft-pill__btn" id="clearLocalDraftBtn">Show Live Site</button>
      `;
      document.body.appendChild(pill);
      $("#clearLocalDraftBtn", pill)?.addEventListener("click", async () => {
        await idbClearRecord();
        try {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(STORAGE_META_KEY);
        } catch (_) {}
        setDraftIndicator(false);
        renderSite(window.SITE);
      });
    }
  };

  const loadLegacyLocalStorage = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return null;
      const metaRaw = localStorage.getItem(STORAGE_META_KEY);
      const meta = metaRaw ? JSON.parse(metaRaw) : null;

      /* If live js/content.js has changed since this local draft (or legacy untagged snapshot), purge stale localStorage */
      if (!meta || meta.baseFingerprint !== LIVE_FINGERPRINT) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_META_KEY);
        return null;
      }
      const parsed = JSON.parse(saved);
      if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.work)) return null;
      return parsed;
    } catch (_) {
      return null;
    }
  };

  const loadSiteData = () => loadLegacyLocalStorage() || window.SITE;

  const hydrateFromStudioDb = async (fallbackSync = false) => {
    const rec = await idbReadRecord();
    if (!rec || !rec.data || !Array.isArray(rec.data.work)) {
      setDraftIndicator(false);
      if (fallbackSync) renderSite(loadSiteData());
      return;
    }

    /* Discard stale local IndexedDB draft automatically whenever live js/content.js changes on Vercel */
    if (!rec.baseFingerprint || rec.baseFingerprint !== LIVE_FINGERPRINT) {
      await idbClearRecord();
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_META_KEY);
      } catch (_) {}
      setDraftIndicator(false);
      renderSite(window.SITE);
      return;
    }
    setDraftIndicator(true);
    await preloadLocalMediaUrls(rec.data);
    renderSite(rec.data);
  };

  let S = loadSiteData();
  let activeCategory = "all";

  /* Inline SVG icons for consistent crisp UI chrome */
  const ICONS = {
    stack: `<svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="4.5" y="4.5" width="9" height="9" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M11 4.5V3C11 2.45 10.55 2 10 2H3C2.45 2 2 2.45 2 3V10C2 10.55 2.45 11 3 11H4.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`,
    arrowDiag: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4.5 11.5L11.5 4.5M11.5 4.5H5.5M11.5 4.5V10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    arrowRight: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8H13M13 8L8.5 3.5M13 8L8.5 12.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    compare: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 7L3 12L8 17M16 7L21 12L16 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    camera: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 8.5C4 7.4 4.9 6.5 6 6.5H8L9.5 4.5H14.5L16 6.5H18C19.1 6.5 20 7.4 20 8.5V17.5C20 18.6 19.1 19.5 18 19.5H6C4.9 19.5 4 18.6 4 17.5V8.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.2" stroke="currentColor" stroke-width="1.5"/></svg>`,
    film: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="6" width="13" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M16 10.5L21 7.5V16.5L16 13.5" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
    edit: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7H20M4 12H20M4 17H20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="9" cy="7" r="2" fill="var(--bg)" stroke="currentColor" stroke-width="1.5"/><circle cx="15" cy="12" r="2" fill="var(--bg)" stroke="currentColor" stroke-width="1.5"/><circle cx="11" cy="17" r="2" fill="var(--bg)" stroke="currentColor" stroke-width="1.5"/></svg>`,
    aperture: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/></svg>`,
  };

  const serviceIconFor = (s = {}) => {
    const label = `${s.id || ""} ${s.title || ""}`.toLowerCase();
    if (label.includes("photo")) return ICONS.camera;
    if (label.includes("edit") || label.includes("post") || label.includes("grade")) return ICONS.edit;
    if (label.includes("video") || label.includes("film") || label.includes("cinema")) return ICONS.film;
    return ICONS.aperture;
  };

  /* ---------- Dark / Light Studio Mode Toggle ---------- */
  const themeToggleBtn = $("#themeToggle");
  const applyColorScheme = (scheme, persist = false) => {
    const mode = scheme === "light" ? "light" : "dark";
    document.documentElement.dataset.colorScheme = mode;
    const metaTheme = $('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute("content", mode === "light" ? "#f4f1ea" : S.theme?.bg || "#0a0a0a");
    if (themeToggleBtn) {
      themeToggleBtn.setAttribute("aria-pressed", String(mode === "light"));
      themeToggleBtn.title = mode === "light" ? "Switch to Dark Cinema Mode" : "Switch to Warm Gallery Light Mode";
    }
    if (persist) {
      try { localStorage.setItem(SCHEME_KEY, mode); } catch (_) {}
    }
  };

  const initialScheme = (() => {
    try {
      const saved = localStorage.getItem(SCHEME_KEY);
      if (saved === "light" || saved === "dark") return saved;
    } catch (_) {}
    return "dark";
  })();
  applyColorScheme(initialScheme, false);

  themeToggleBtn?.addEventListener("click", () => {
    const next = document.documentElement.dataset.colorScheme === "light" ? "dark" : "light";
    applyColorScheme(next, true);
  });

  /* ---------- 1. Opening Animation ---------- */
  const INTRO_MIN_MS = 2000;
  const INTRO_MAX_MS = 3800;
  const intro = $("#intro");
  const introCfg = S.introAnimation || {};
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isPreviewFrame = new URLSearchParams(window.location.search).has("preview");
  let introFinished = false;

  const revealHero = () => $$(".hero .reveal").forEach((el) => el.classList.add("is-visible"));
  const finishIntro = () => {
    if (introFinished) return;
    introFinished = true;
    document.body.classList.remove("is-loading");
    if (!intro) return revealHero();
    intro.classList.add("is-leaving");
    setTimeout(revealHero, 550);
    setTimeout(() => intro.remove(), 1350);
  };

  if (!intro || introCfg.enabled === false || reduceMotion || isPreviewFrame) {
    intro?.remove();
    introFinished = true;
    document.body.classList.remove("is-loading");
    requestAnimationFrame(revealHero);
  } else {
    const word = introCfg.word || S.tabTitle || S.shortName;
    $("#introWord").innerHTML = [...word]
      .map((ch, i) => `<span style="--i:${i}"${ch === "." ? ' class="is-accent"' : ""}>${ch === " " ? "&nbsp;" : esc(ch)}</span>`)
      .join("");
    if (introCfg.tagline !== undefined) $("#introTag").textContent = introCfg.tagline;

    const minDelay = new Promise((r) => setTimeout(r, INTRO_MIN_MS));
    const pageLoaded = new Promise((r) => (document.readyState === "complete" ? r() : window.addEventListener("load", r, { once: true })));
    const maxDelay = new Promise((r) => setTimeout(r, INTRO_MAX_MS));
    Promise.race([Promise.all([minDelay, pageLoaded]), maxDelay]).then(finishIntro);
    intro.addEventListener("click", finishIntro);
  }

  /* ---------- Scroll Reveal Observer ---------- */
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add("is-visible");
          io.unobserve(en.target);
        }
      }),
    { threshold: 0.1 }
  );

  const selectServiceInForm = (serviceId) => {
    const select = $("#projectType");
    if (!select) return;
    const match = [...select.options].find((o) =>
      o.value.toLowerCase().includes(String(serviceId).toLowerCase())
    );
    if (match) select.value = match.value;
    $("#contact")?.scrollIntoView({ behavior: "smooth" });
    setTimeout(() => $("input[name='name']")?.focus(), 600);
  };

  const categoryDescriptions = {
    all: "Curated photography and cinematic video productions. Click any project to open the media viewer and breakdown.",
    photography: "Portraits, events, lifestyle photography, and landscapes captured with natural tonal depth.",
    videography: "Cinematic short films, event coverage, and promotional video productions.",
  };

  const updateFilterCounts = (publishedItems) => {
    const counts = {
      all: publishedItems.length,
      photography: publishedItems.filter(({ item }) => item.category === "photography").length,
      videography: publishedItems.filter(({ item }) => item.category === "videography").length,
    };
    $$(".filter__count[data-count]").forEach((el) => {
      const key = el.dataset.count;
      el.textContent = key in counts ? String(counts[key]).padStart(2, "0") : "";
    });
  };

  const applyFilter = (cat, animate = false) => {
    activeCategory = cat;
    $$(".filter").forEach((b) => {
      const active = b.dataset.filter === cat;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-selected", active);
    });
    const note = $("#categoryNote");
    if (note && categoryDescriptions[cat]) note.textContent = categoryDescriptions[cat];

    let visibleCount = 0;
    $$(".tile").forEach((t) => {
      const hide = cat !== "all" && t.dataset.category !== cat;
      t.classList.toggle("is-hidden", hide);
      t.classList.remove("is-filtering-in");
      if (!hide) {
        visibleCount++;
        t.classList.add("is-visible");
        if (animate && !reduceMotion) {
          void t.offsetWidth;
          t.classList.add("is-filtering-in");
        }
      }
    });

    const emptyEl = $("#gridEmptyState");
    if (emptyEl) emptyEl.hidden = visibleCount > 0;
  };

  const VIDEO_PLACEHOLDER =
    "data:image/svg+xml," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500"><defs><radialGradient id="g" cx="50%" cy="40%" r="65%"><stop offset="0%" stop-color="#221e18"/><stop offset="100%" stop-color="#0b0b0d"/></radialGradient></defs><rect width="800" height="500" fill="url(#g)"/><circle cx="400" cy="250" r="46" fill="none" stroke="#e8c07d" stroke-opacity="0.45" stroke-width="2"/><polygon points="390,232 422,250 390,268" fill="#e8c07d" fill-opacity="0.75"/></svg>`
    );

  const isVideoPath = (src = "") => /\.(mov|mp4|webm|m4v|ogv)(\?.*)?$/i.test(src);

  const thumbForItem = (item) => {
    if (!item) return "";
    const slides = Array.isArray(item.gallery) && item.gallery.length
      ? item.gallery
      : [{ type: item.mediaType || "image", src: item.src, poster: item.poster }];
    const first = slides[0] || {};
    if (first.type === "video" || item.mediaType === "video") {
      return first.poster || item.poster || VIDEO_PLACEHOLDER;
    }
    const raw = first.src || item.src || "";
    return isVideoPath(raw) ? VIDEO_PLACEHOLDER : resolveMediaUrl(raw);
  };

  /* ---------- Render Hero Bento Showcase & Discipline Marquee ---------- */
  const renderHeroShowcase = (publishedItems) => {
    const host = $("#heroShowcase");
    if (!host) return;
    if (!publishedItems.length) {
      host.innerHTML = "";
      return;
    }

    const featured =
      publishedItems.find(({ item }) => item.category === "photography" && item.size === "wide") ||
      publishedItems[0];
    const compareEntry =
      publishedItems.find(({ item }) => item.beforeSrc && item.afterSrc && item !== featured.item) ||
      publishedItems.find(({ item }) => item !== featured.item) ||
      featured;

    const featSlides = Array.isArray(featured.item.gallery) && featured.item.gallery.length ? featured.item.gallery.length : 1;
    const compareModeAttr = compareEntry.item.beforeSrc && compareEntry.item.afterSrc ? 'data-open-mode="compare"' : "";
    const teaserLabel = compareEntry.item.beforeSrc && compareEntry.item.afterSrc ? "Before / After Grade" : compareEntry.item.tag;
    const teaserThumb = compareEntry.item.afterSrc || thumbForItem(compareEntry.item);

    host.innerHTML = `
      <article class="hero-bento hero-bento--feature" data-hero-open="${featured.i}" tabindex="0"
               aria-label="Open featured project: ${esc(featured.item.title)}">
        <img class="hero-bento__img" src="${esc(thumbForItem(featured.item))}" alt="${esc(featured.item.title)}" />
        <div class="hero-bento__top">
          <span class="tile__pill tile__pill--accent">Featured Frame</span>
          ${featSlides > 1 ? `<span class="tile__pill">${ICONS.stack}<span>${featSlides}</span></span>` : `<span class="tile__pill">${esc(featured.item.tag)}</span>`}
        </div>
        <div class="hero-bento__dock">
          <div>
            <span class="hero-bento__kicker">${esc(featured.item.category)} · ${esc(featured.item.tag)}</span>
            <h2 class="hero-bento__title">${esc(featured.item.title)}</h2>
          </div>
          <span class="hero-bento__go" aria-hidden="true">${ICONS.arrowDiag}</span>
        </div>
      </article>

      <div class="hero-bento hero-bento--stat">
        <div class="hero-stat__top">
          <span class="hero-stat__tag">Selected Archive</span>
          <span class="pulse" aria-hidden="true"></span>
        </div>
        <div>
          <div class="hero-stat__num">${String(publishedItems.length).padStart(2, "0")}<span>+</span></div>
          <p class="hero-stat__sub">Published visual works across ${(S.roles || []).length || 3} creative disciplines.</p>
        </div>
      </div>

      <article class="hero-bento hero-bento--teaser" data-hero-open="${compareEntry.i}" ${compareModeAttr} tabindex="0"
               aria-label="Inspect ${esc(compareEntry.item.title)}">
        <img class="hero-bento__img" src="${esc(teaserThumb)}" alt="${esc(compareEntry.item.title)}" />
        <div class="hero-bento__top">
          <span class="tile__pill tile__pill--accent">${esc(teaserLabel)}</span>
        </div>
        <div class="hero-bento__dock hero-bento__dock--compact">
          <div>
            <span class="hero-bento__kicker">${compareModeAttr ? "Interactive Slider" : esc(compareEntry.item.category)}</span>
            <h3 class="hero-bento__title">${esc(compareEntry.item.title)}</h3>
          </div>
          <span class="hero-bento__go" aria-hidden="true">${ICONS.arrowDiag}</span>
        </div>
      </article>
    `;
  };

  const renderMarquee = () => {
    const track = $("#marqueeTrack");
    if (!track) return;
    const baseItems = [
      ...(S.roles || ["Photography", "Videography", "Video Editing"]),
      "Color Grading",
      "Editorial Stills",
      "Cinematic Films",
      "Sound Design",
      "Visual Storytelling",
    ];
    const unique = [...new Set(baseItems.filter(Boolean))];
    const rowHtml = unique
      .map(
        (label, idx) =>
          `<span class="marquee__item${idx % 2 === 1 ? " is-serif" : ""}"><span>${esc(label)}</span><span class="marquee__sep">✦</span></span>`
      )
      .join("");
    track.innerHTML = rowHtml + rowHtml;
  };

  /* ---------- Render All Site Content ---------- */
  const renderSite = (data) => {
    S = data || loadSiteData();

    /* Apply custom theme colors if set in Admin Studio */
    if (S.theme && typeof S.theme === "object") {
      const root = document.documentElement;
      if (S.theme.bg) root.style.setProperty("--bg", S.theme.bg);
      if (S.theme.bgCharcoal) root.style.setProperty("--bg-charcoal", S.theme.bgCharcoal);
      if (S.theme.text) root.style.setProperty("--text", S.theme.text);
      if (S.theme.neutral) root.style.setProperty("--neutral", S.theme.neutral);
      if (S.theme.muted) root.style.setProperty("--muted", S.theme.muted);
    }

    const bindings = {
      shortName: S.shortName,
      name: S.name,
      roles: (S.roles || []).join(" · "),
      location: S.location,
      heroSubheadline: S.hero?.subheadline || "",
      primaryCta: S.hero?.primaryCta || "Explore My Work",
      secondaryCta: S.hero?.secondaryCta || "Get in Touch",
      portraitCaption: S.about?.portraitCaption || "",
      aboutHeadline: S.about?.headline || "",
      approachTitle: S.about?.approachTitle || "Creative Approach",
      aboutApproach: S.about?.approach || "",
      contactHeadline: S.contact?.headline || "",
      contactInvitation: S.contact?.invitation || "",
      contactButtonText: S.contact?.buttonText || "Let's Work Together",
      letsWorkBtn: S.contact?.buttonText || "Let's Work Together",
    };

    $$("[data-bind]").forEach((el) => {
      const key = el.dataset.bind;
      if (key === "emailLink") {
        el.href = `mailto:${S.contact?.email || ""}`;
        el.textContent = S.contact?.email || "";
      } else if (key === "shortName") {
        el.innerHTML = esc(S.shortName || "uri.visuals").replace(".", "<span>.</span>");
      } else if (key in bindings) {
        el.textContent = bindings[key];
      }
    });

    document.title = S.tabTitle || S.shortName || "uri.visuals";
    $("#year").textContent = new Date().getFullYear();

    /* Hero Mixed Sans + Italic Serif Headline */
    const headlineLines = String(S.hero?.headline || "").split("\n");
    $("#heroHeadline").innerHTML = headlineLines
      .map((line, idx) => (idx === 0 ? esc(line) : `<span class="hero__title-serif">${esc(line)}</span>`))
      .join("<br />");

    $("#heroBio").innerHTML = esc(S.hero?.bioSentence || "")
      .replace("{name}", `<strong>${esc(S.name || "")}</strong>`)
      .replace("{location}", esc(S.location || ""));

    const heroVideo = $("#heroVideo");
    const heroImage = $("#heroImage");
    const heroMedia = $(".hero__media");
    const bgMode = S.hero?.bgMode || (S.hero?.video ? "video" : "image");
    const imgSrc = S.hero?.bgImage || S.hero?.poster || "";
    const overlayPct = S.hero?.overlayOpacity ?? 65;
    const grayPct = S.hero?.grayscale ?? 18;

    if (heroMedia) {
      heroMedia.style.setProperty("--hero-gray", `${grayPct}%`);
      heroMedia.style.setProperty("--hero-overlay-top", (overlayPct / 100).toFixed(2));
      heroMedia.style.setProperty("--hero-overlay-mid", ((overlayPct * 0.6) / 100).toFixed(2));
    }

    if (bgMode === "solid") {
      if (heroVideo) {
        heroVideo.pause();
        heroVideo.hidden = true;
      }
      if (heroImage) heroImage.hidden = true;
    } else if (bgMode === "image" || !S.hero?.video) {
      if (heroVideo) {
        heroVideo.pause();
        heroVideo.hidden = true;
      }
      if (heroImage) {
        heroImage.src = imgSrc;
        heroImage.hidden = !imgSrc;
      }
    } else {
      if (heroImage) heroImage.hidden = true;
      if (heroVideo) {
        heroVideo.hidden = false;
        heroVideo.poster = imgSrc;
        const resolvedHeroVid = resolveMediaUrl(S.hero.video);
        if (heroVideo.getAttribute("src") !== resolvedHeroVid) {
          heroVideo.src = resolvedHeroVid;
        }
        heroVideo.play().catch(() => {});
      }
    }

    /* Portfolio Grid (skip draft/hidden items) */
    const publishedItems = (S.work || [])
      .map((item, i) => ({ item, i }))
      .filter(({ item }) => !item.hidden);

    renderHeroShowcase(publishedItems);
    renderMarquee();
    updateFilterCounts(publishedItems);

    const grid = $("#grid");
    const tilesHtml = publishedItems
      .map(({ item, i }, orderIdx) => {
        const slides = Array.isArray(item.gallery) && item.gallery.length
          ? item.gallery
          : [{ type: item.mediaType || "image", src: item.src, poster: item.poster }];
        const first = slides[0] || {};
        const thumb = thumbForItem(item);
        const size = item.size ? ` tile--${item.size}` : "";
        const hasCompare = item.beforeSrc && item.afterSrc;
        const multiBadge = slides.length > 1
          ? `<span class="tile__pill" title="${slides.length} files in this post">${ICONS.stack}<span>${slides.length}</span></span>`
          : "";
        const rightBadge = hasCompare
          ? `<span class="tile__pill tile__pill--accent">Before / After</span>`
          : item.duration
          ? `<span class="tile__pill">▶ ${esc(item.duration)}</span>`
          : "";
        const dotsHtml =
          slides.length > 1
            ? `<div class="tile__dots" aria-hidden="true">${slides
                .slice(0, 6)
                .map(() => `<span></span>`)
                .join("")}</div>`
            : "";
        const ctaLabel =
          slides.length > 1
            ? `Explore ${slides.length} frames`
            : hasCompare
            ? "Watch & compare grade"
            : item.mediaType === "video"
            ? "Play film & breakdown"
            : "View full frame & story";

        return `
          <article class="tile${size}" data-category="${esc(item.category)}" data-index="${i}" tabindex="0"
                   aria-label="${esc(item.title)} — ${esc(item.tag)}">
            <img class="tile__img" src="${esc(thumb)}" alt="${esc(item.title)}" loading="lazy" />
            <div class="tile__badges">
              <span class="tile__pill">${esc(item.tag)}</span>
              <div class="tile__badges-right">${multiBadge}${rightBadge}</div>
            </div>
            ${first.type === "video" || item.mediaType === "video" ? `<span class="tile__play" aria-hidden="true"></span>` : ""}
            <div class="tile__info">
              <div class="tile__top-meta">
                <span class="tile__cat">${esc(item.category)}</span>
                <span class="tile__index">${String(orderIdx + 1).padStart(2, "0")}</span>
              </div>
              <div class="tile__head-row">
                <h3 class="tile__title">${esc(item.title)}</h3>
                <span class="tile__arrow" aria-hidden="true">${ICONS.arrowDiag}</span>
              </div>
              <div class="tile__meta-foot">
                <span class="tile__cta">${ctaLabel}</span>
                ${dotsHtml}
              </div>
            </div>
          </article>`;
      })
      .join("");

    grid.innerHTML = `${tilesHtml}
      <div class="grid__empty" id="gridEmptyState" hidden>
        <strong>No published projects in this category yet</strong>
        <span>Switch categories or publish a project from Admin Studio.</span>
      </div>`;

    applyFilter(activeCategory, false);

    /* About */
    const aboutImg = $("#aboutImg");
    if (aboutImg) {
      aboutImg.src = S.about?.portrait || "";
      aboutImg.alt = S.about?.portraitCaption || `Portrait of ${S.name}`;
    }
    $("#aboutBio").innerHTML = (S.about?.bio || []).map((p) => `<p>${esc(p)}</p>`).join("");
    $("#aboutSkills").innerHTML = (S.about?.skills || []).map((s) => `<li>${esc(s)}</li>`).join("");

    /* Services */
    $("#servicesList").innerHTML = (S.services || [])
      .map(
        (s) => `
        <article class="service">
          <div>
            <div class="service__top">
              <span class="service__num">${esc(s.number)}</span>
              <span class="service__glyph" aria-hidden="true">${serviceIconFor(s)}</span>
            </div>
            <h3 class="service__title">${esc(s.title)}</h3>
            <p class="service__sub">${esc(s.subtitle)}</p>
            <p class="service__desc">${esc(s.description)}</p>
            <ul class="service__list">
              ${(s.deliverables || []).map((d) => `<li>${esc(d)}</li>`).join("")}
            </ul>
          </div>
          <button type="button" class="service__btn" data-inquire="${esc(s.id || s.title)}">
            <span>${esc(s.cta || `Inquire About ${s.title}`)}</span>
            ${ICONS.arrowRight}
          </button>
        </article>`
      )
      .join("");

    $$("[data-inquire]").forEach((btn) =>
      btn.addEventListener("click", () => selectServiceInForm(btn.dataset.inquire))
    );

    /* Contact */
    $("#socials").innerHTML = (S.contact?.socials || [])
      .map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener"><span>${esc(s.label)}</span>${ICONS.arrowDiag}</a></li>`)
      .join("");

    $("#projectType").innerHTML = (S.contact?.projectTypes || [])
      .map((t) => `<option value="${esc(t)}">${esc(t)}</option>`)
      .join("");

    $$(".reveal, .tile")
      .filter((el) => !el.closest(".hero"))
      .forEach((el) => io.observe(el));
  };

  renderSite(S);
  window.renderPortfolioSite = renderSite;
  hydrateFromStudioDb();

  /* Listen for live updates from Admin Studio (IndexedDB + BroadcastChannel + localStorage + iframe preview) */
  if (typeof BroadcastChannel !== "undefined") {
    const syncChannel = new BroadcastChannel("uri_visuals_sync");
    syncChannel.addEventListener("message", (e) => {
      if (e.data?.type === "URI_CMS_RESET") {
        setDraftIndicator(false);
        renderSite(window.SITE);
      } else if (e.data?.type === "URI_CMS_SYNC") {
        hydrateFromStudioDb();
      }
    });
  }
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY || e.key === STORAGE_META_KEY) {
      hydrateFromStudioDb(true);
    }
    if (e.key === SCHEME_KEY && e.newValue) applyColorScheme(e.newValue, false);
  });
  window.addEventListener("message", (e) => {
    if (e.data && e.data.type === "URI_CMS_PREVIEW" && e.data.payload) {
      preloadLocalMediaUrls(e.data.payload).then(() => renderSite(e.data.payload));
    }
  });

  $$(".filter").forEach((btn) => btn.addEventListener("click", () => applyFilter(btn.dataset.filter, true)));
  $$("[data-nav-filter]").forEach((link) =>
    link.addEventListener("click", () => applyFilter(link.dataset.navFilter, true))
  );

  /* Copy Email Utility */
  const copyBtn = $("#copyEmailBtn");
  let copyTimer = null;
  copyBtn?.addEventListener("click", async () => {
    const email = S.contact?.email || "";
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
    } catch (_) {
      const ta = document.createElement("textarea");
      ta.value = email;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    const span = $("span", copyBtn);
    copyBtn.classList.add("is-copied");
    if (span) span.textContent = "Copied ✓";
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      copyBtn.classList.remove("is-copied");
      if (span) span.textContent = "Copy";
    }, 2000);
  });

  /* Subtle Pointer Spotlight for Bento Tiles & Service Cards */
  if (!reduceMotion && window.matchMedia("(pointer: fine)").matches) {
    document.addEventListener(
      "pointermove",
      (e) => {
        const card = e.target.closest?.(".tile, .service");
        if (!card) return;
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${(e.clientX - rect.left).toFixed(1)}px`);
        card.style.setProperty("--my", `${(e.clientY - rect.top).toFixed(1)}px`);
      },
      { passive: true }
    );
  }

  $("#contactForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    const subject = `[${S.shortName || "uri.visuals"} Inquiry] ${d.type} — ${d.name}`;
    const body = `Hi ${S.name},\n\n${d.message}\n\n---\nProject Type: ${d.type}\nName: ${d.name}\nEmail: ${d.email}`;
    window.location.href = `mailto:${S.contact?.email || ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });

  /* Header Scroll, Hero Parallax & Active Section Spy */
  const nav = $("#nav");
  const toggle = $("#navToggle");
  const links = $("#navLinks");
  const heroMediaParallax = $(".hero__media");
  const spySections = ["work", "about", "services", "contact"]
    .map((id) => ({ id, el: document.getElementById(id) }))
    .filter((s) => s.el);

  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle("is-scrolled", y > 44);

    if (heroMediaParallax && !reduceMotion && introFinished && y < window.innerHeight * 1.2) {
      heroMediaParallax.style.transform = `translate3d(0, ${(y * 0.14).toFixed(1)}px, 0)`;
    }

    const probe = y + window.innerHeight * 0.34;
    let activeId = "";
    for (const s of spySections) {
      if (probe >= s.el.offsetTop) activeId = s.id;
    }
    $$("a[data-section]", links).forEach((a) => {
      a.classList.toggle("is-current", a.dataset.section === activeId);
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const setMenu = (open) => {
    links.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open);
    document.body.style.overflow = open ? "hidden" : "";
  };
  toggle.addEventListener("click", () => setMenu(!links.classList.contains("is-open")));
  $$("a", links).forEach((a) => a.addEventListener("click", () => setMenu(false)));

  /* Immersive Project Viewer Modal (Instagram-Style Multi-Slide Carousel + Before/After Slider) */
  const lb = $("#lightbox");
  const stage = $("#lbStage");
  const meta = $("#lbMeta");
  const counter = $("#lbCounter");
  const grid = $("#grid");
  const heroShowcase = $("#heroShowcase");
  let current = 0;
  let currentSlide = 0;

  const embedFor = (url = "") => {
    const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
    if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1&rel=0`;
    const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vm) return `https://player.vimeo.com/video/${vm[1]}?autoplay=1`;
    return null;
  };

  const getProjectSlides = (item) => {
    if (Array.isArray(item.gallery) && item.gallery.length > 0) {
      return item.gallery.map((s) => ({
        type: s.type || "image",
        src: s.src || "",
        poster: s.poster || item.poster || "",
        caption: s.caption || "",
      }));
    }
    return [
      {
        type: item.mediaType || "image",
        src: item.src || "",
        poster: item.poster || "",
        caption: "",
      },
    ];
  };

  const visibleIndexes = () => {
    const vis = $$(".tile:not(.is-hidden)").map((t) => +t.dataset.index);
    return vis.length ? vis : $$(".tile").map((t) => +t.dataset.index);
  };

  const renderSlideElement = (slide, title) => {
    const mediaUrl = resolveMediaUrl(slide.src);
    if (slide.type === "video") {
      const embed = embedFor(slide.src);
      if (embed) {
        return `<iframe src="${esc(embed)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="${esc(title)}"></iframe>`;
      }
      const isMov = /\.mov(\?.*)?$/i.test(slide.src || "");
      if (isMov) {
        return `<video poster="${esc(slide.poster || "")}" controls autoplay playsinline><source src="${esc(mediaUrl)}" type="video/mp4" /><source src="${esc(mediaUrl)}" type="video/quicktime" /></video>`;
      }
      return `<video src="${esc(mediaUrl)}" poster="${esc(slide.poster || "")}" controls autoplay playsinline></video>`;
    }
    return `<img src="${esc(mediaUrl)}" alt="${esc(slide.caption || title)}" />`;
  };

  const renderStageMedia = (item, mode = "media") => {
    if (mode === "compare" && item.beforeSrc && item.afterSrc) {
      stage.innerHTML = `
        <div class="compare" style="--pos: 50%">
          <img class="compare__after" src="${esc(item.afterSrc)}" alt="Final color grade" />
          <div class="compare__before-wrap">
            <img src="${esc(item.beforeSrc)}" alt="Raw log footage" />
          </div>
          <span class="compare__divider" aria-hidden="true"></span>
          <span class="compare__handle" aria-hidden="true">${ICONS.compare}</span>
          <span class="compare__tag compare__tag--before">Before · Raw / Log</span>
          <span class="compare__tag compare__tag--after">After · Final Grade</span>
          <input type="range" class="compare__range" min="5" max="95" value="50" aria-label="Drag to compare before and after color grade" />
        </div>`;
      const wrap = $(".compare", stage);
      const range = $(".compare__range", stage);
      range.addEventListener("input", () => wrap.style.setProperty("--pos", `${range.value}%`));
      return;
    }

    const slides = getProjectSlides(item);
    if (currentSlide >= slides.length) currentSlide = 0;
    if (currentSlide < 0) currentSlide = slides.length - 1;
    const activeSlide = slides[currentSlide];

    if (slides.length === 1) {
      stage.innerHTML = renderSlideElement(activeSlide, item.title);
      return;
    }

    stage.innerHTML = `
      <div class="ig-carousel">
        <div class="ig-carousel__viewport" id="igViewport">
          <span class="ig-carousel__counter">${currentSlide + 1} / ${slides.length}</span>
          <button type="button" class="ig-carousel__arrow ig-carousel__arrow--prev" data-slide-step="-1" aria-label="Previous image">‹</button>
          ${renderSlideElement(activeSlide, item.title)}
          <button type="button" class="ig-carousel__arrow ig-carousel__arrow--next" data-slide-step="1" aria-label="Next image">›</button>
        </div>
        <div class="ig-carousel__dots" role="tablist" aria-label="Project files">
          ${slides
            .map(
              (_, idx) =>
                `<button type="button" class="ig-dot${idx === currentSlide ? " is-active" : ""}" data-slide-to="${idx}" aria-label="File ${idx + 1}"></button>`
            )
            .join("")}
        </div>
        <div class="ig-thumbs">
          ${slides
            .map((s, idx) => {
              const t = s.type === "video" ? s.poster || item.poster || VIDEO_PLACEHOLDER : resolveMediaUrl(s.src);
              return `
                <button type="button" class="ig-thumb${idx === currentSlide ? " is-active" : ""}" data-slide-to="${idx}" aria-label="Select file ${idx + 1}">
                  <img src="${esc(t)}" alt="Thumbnail ${idx + 1}" />
                </button>`;
            })
            .join("")}
        </div>
      </div>
    `;

    $$("[data-slide-step]", stage).forEach((btn) =>
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        currentSlide = (currentSlide + Number(btn.dataset.slideStep) + slides.length) % slides.length;
        renderStageMedia(item, "media");
      })
    );

    $$("[data-slide-to]", stage).forEach((btn) =>
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        currentSlide = Number(btn.dataset.slideTo);
        renderStageMedia(item, "media");
      })
    );

    $(".ig-thumb.is-active", stage)?.scrollIntoView({
      block: "nearest",
      inline: "center",
      behavior: "auto",
    });

    /* Touch swipe support inside viewport */
    const vp = $("#igViewport", stage);
    let startX = null;
    vp?.addEventListener("touchstart", (e) => {
      startX = e.touches[0]?.clientX ?? null;
    }, { passive: true });
    vp?.addEventListener("touchend", (e) => {
      if (startX === null) return;
      const dx = (e.changedTouches[0]?.clientX ?? startX) - startX;
      if (Math.abs(dx) > 40) {
        currentSlide = (currentSlide + (dx < 0 ? 1 : -1) + slides.length) % slides.length;
        renderStageMedia(item, "media");
      }
      startX = null;
    }, { passive: true });
  };

  const stepSlide = (dir) => {
    const item = S.work[current];
    if (!item) return;
    const slides = getProjectSlides(item);
    if (slides.length <= 1) return;
    currentSlide = (currentSlide + dir + slides.length) % slides.length;
    $$("[data-mode]", meta).forEach((b) => b.classList.toggle("is-active", b.dataset.mode === "media"));
    renderStageMedia(item, "media");
  };

  const show = (i, initialMode = "media") => {
    current = i;
    currentSlide = 0;
    const item = S.work[i];
    if (!item) return;
    const list = visibleIndexes();
    const pos = Math.max(0, list.indexOf(i));
    const slides = getProjectSlides(item);
    const hasSlides = slides.length > 1;
    counter.textContent = `${String(pos + 1).padStart(2, "0")} / ${String(list.length).padStart(2, "0")} — ${item.category}${hasSlides ? ` · ${slides.length} files` : ""}`;

    const hasCompare = Boolean(item.beforeSrc && item.afterSrc);
    const startMode = initialMode === "compare" && hasCompare ? "compare" : "media";
    renderStageMedia(item, startMode);

    meta.innerHTML = `
      <span class="label">${esc(item.tag)}</span>
      <h3>${esc(item.title)}</h3>
      <p>${esc(item.summary || "")}</p>
      ${
        hasCompare
          ? `<div class="mode-switch" role="group" aria-label="View mode">
               <button type="button" class="${startMode === "media" ? "is-active" : ""}" data-mode="media">${slides.length > 1 ? `Media (${slides.length})` : "Video Cut"}</button>
               <button type="button" class="${startMode === "compare" ? "is-active" : ""}" data-mode="compare">Before / After Grade</button>
             </div>`
          : ""
      }
      ${
        item.breakdown?.length
          ? `<ul class="lightbox__breakdown">
               ${item.breakdown.map((b) => `<li>${esc(b)}</li>`).join("")}
             </ul>`
          : ""
      }
      <button type="button" class="service__btn" id="lbInquire">
        <span>Inquire About Similar Project</span>
        ${ICONS.arrowRight}
      </button>
    `;

    $$("[data-mode]", meta).forEach((btn) =>
      btn.addEventListener("click", () => {
        $$("[data-mode]", meta).forEach((b) => b.classList.toggle("is-active", b === btn));
        renderStageMedia(item, btn.dataset.mode);
      })
    );

    $("#lbInquire")?.addEventListener("click", () => {
      close();
      selectServiceInForm(item.category);
    });
  };

  const open = (i, mode = "media") => {
    show(i, mode);
    lb.hidden = false;
    document.body.style.overflow = "hidden";
    $("#lbClose").focus();
  };
  const close = () => {
    lb.hidden = true;
    stage.innerHTML = "";
    document.body.style.overflow = "";
  };
  const step = (dir) => {
    const list = visibleIndexes();
    if (!list.length) return;
    const pos = list.indexOf(current);
    show(list[(pos + dir + list.length) % list.length]);
  };

  grid.addEventListener("click", (e) => {
    const t = e.target.closest(".tile");
    if (t) open(+t.dataset.index);
  });
  grid.addEventListener("keydown", (e) => {
    const t = e.target.closest(".tile");
    if (t && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      open(+t.dataset.index);
    }
  });
  heroShowcase?.addEventListener("click", (e) => {
    const card = e.target.closest("[data-hero-open]");
    if (card) open(+card.dataset.heroOpen, card.dataset.openMode || "media");
  });
  heroShowcase?.addEventListener("keydown", (e) => {
    const card = e.target.closest("[data-hero-open]");
    if (card && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      open(+card.dataset.heroOpen, card.dataset.openMode || "media");
    }
  });

  $("#lbClose").addEventListener("click", close);
  lb.addEventListener("click", (e) => {
    if (e.target === lb) close();
  });
  document.addEventListener("keydown", (e) => {
    // Shift + A opens Admin Studio when not typing in an input
    if (e.shiftKey && (e.key === "A" || e.key === "a") && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) {
      window.location.href = "admin.html";
      return;
    }
    if (lb.hidden) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") stepSlide(-1);
    if (e.key === "ArrowRight") stepSlide(1);
  });
})();
