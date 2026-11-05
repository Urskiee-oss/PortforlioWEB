/* ==========================================================
   uri.visuals — Portfolio Rendering & Interactions
   ----------------------------------------------------------
   ✏️ To edit text, photos, videos, services or contact info,
      open  js/content.js  — you don't need to edit this file.
   ========================================================== */
(() => {
  const S = window.SITE;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (str = "") =>
    String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- 1. Opening Animation ---------- */
  const INTRO_MIN_MS = 2000;
  const INTRO_MAX_MS = 3800;
  const intro = $("#intro");
  const introCfg = S.introAnimation || {};
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let introFinished = false;

  const revealHero = () => $$(".hero .reveal").forEach((el) => el.classList.add("is-visible"));
  const finishIntro = () => {
    if (introFinished) return;
    introFinished = true;
    document.body.classList.remove("is-loading");
    if (!intro) return revealHero();
    intro.classList.add("is-leaving");
    setTimeout(revealHero, 600);
    setTimeout(() => intro.remove(), 1400);
  };

  if (!intro || introCfg.enabled === false || reduceMotion) {
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

  /* ---------- 2. Global Text Bindings ---------- */
  const bindings = {
    shortName: S.shortName,
    name: S.name,
    roles: S.roles.join(" · "),
    location: S.location,
    heroSubheadline: S.hero.subheadline,
    primaryCta: S.hero.primaryCta,
    secondaryCta: S.hero.secondaryCta,
    portraitCaption: S.about.portraitCaption,
    aboutHeadline: S.about.headline,
    approachTitle: S.about.approachTitle,
    aboutApproach: S.about.approach,
    contactHeadline: S.contact.headline,
    contactInvitation: S.contact.invitation,
    contactButtonText: S.contact.buttonText,
    letsWorkBtn: S.contact.buttonText,
  };

  $$("[data-bind]").forEach((el) => {
    const key = el.dataset.bind;
    if (key === "emailLink") {
      el.href = `mailto:${S.contact.email}`;
      el.textContent = S.contact.email;
    } else if (key === "shortName") {
      el.innerHTML = esc(S.shortName).replace(".", "<span>.</span>");
    } else if (key in bindings) {
      el.textContent = bindings[key];
    }
  });

  document.title = S.tabTitle || S.shortName;
  $("#year").textContent = new Date().getFullYear();

  /* ---------- 3. Hero Section ---------- */
  $("#heroHeadline").innerHTML = esc(S.hero.headline).replace(/\n/g, "<br />");
  $("#heroBio").innerHTML = esc(S.hero.bioSentence)
    .replace("{name}", `<strong>${esc(S.name)}</strong>`)
    .replace("{location}", esc(S.location));

  const heroVideo = $("#heroVideo");
  heroVideo.poster = S.hero.poster;
  if (S.hero.video) heroVideo.src = S.hero.video;

  /* ---------- 4. Portfolio Grid & Category Filter ---------- */
  const categoryDescriptions = {
    all: "Curated photography, cinematic video productions, and post-production editing projects. Click any project to open the media viewer and breakdown.",
    photography: "Portraits, events, lifestyle photography, and landscapes captured with natural tonal depth.",
    videography: "Cinematic short films, event coverage, and promotional video productions.",
    editing: "Rhythmic narrative cutting, node-based color grading (with interactive Before/After comparison), and sound design.",
  };

  const grid = $("#grid");
  grid.innerHTML = S.work
    .map((item, i) => {
      const thumb = item.mediaType === "video" ? item.poster : item.src;
      const size = item.size ? ` tile--${item.size}` : "";
      const hasCompare = item.beforeSrc && item.afterSrc;
      const rightBadge = hasCompare
        ? `<span class="tile__pill">Before / After Grade</span>`
        : item.duration
        ? `<span class="tile__pill">▶ ${esc(item.duration)}</span>`
        : "";
      const ctaLabel =
        item.category === "editing"
          ? "Watch edit & compare grade →"
          : item.mediaType === "video"
          ? "Play film & view details →"
          : "View full frame & details →";

      return `
        <article class="tile${size}" data-category="${esc(item.category)}" data-index="${i}" tabindex="0"
                 aria-label="${esc(item.title)} — ${esc(item.tag)}">
          <img class="tile__img" src="${esc(thumb)}" alt="${esc(item.title)}" loading="lazy" />
          <div class="tile__badges">
            <span class="tile__pill">${esc(item.tag)}</span>
            ${rightBadge}
          </div>
          ${item.mediaType === "video" ? `<span class="tile__play" aria-hidden="true"></span>` : ""}
          <div class="tile__info">
            <span class="tile__cat">${esc(item.category)}</span>
            <h3 class="tile__title">${esc(item.title)}</h3>
            <span class="tile__cta">${ctaLabel}</span>
          </div>
        </article>`;
    })
    .join("");

  const applyFilter = (cat) => {
    $$(".filter").forEach((b) => {
      const active = b.dataset.filter === cat;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-selected", active);
    });
    const note = $("#categoryNote");
    if (note && categoryDescriptions[cat]) note.textContent = categoryDescriptions[cat];
    $$(".tile").forEach((t) => {
      t.classList.toggle("is-hidden", cat !== "all" && t.dataset.category !== cat);
    });
  };

  $$(".filter").forEach((btn) => btn.addEventListener("click", () => applyFilter(btn.dataset.filter)));
  $$("[data-nav-filter]").forEach((link) =>
    link.addEventListener("click", () => applyFilter(link.dataset.navFilter))
  );

  /* ---------- 5. About Section ---------- */
  const aboutImg = $("#aboutImg");
  aboutImg.src = S.about.portrait;
  aboutImg.alt = S.about.portraitCaption || `Portrait of ${S.name}`;
  $("#aboutBio").innerHTML = S.about.bio.map((p) => `<p>${esc(p)}</p>`).join("");
  $("#aboutSkills").innerHTML = S.about.skills.map((s) => `<li>${esc(s)}</li>`).join("");

  /* ---------- 6. Services Section ---------- */
  const selectServiceInForm = (serviceId) => {
    const select = $("#projectType");
    if (!select) return;
    const match = [...select.options].find((o) =>
      o.value.toLowerCase().includes(serviceId.toLowerCase())
    );
    if (match) select.value = match.value;
    $("#contact")?.scrollIntoView({ behavior: "smooth" });
    setTimeout(() => $("input[name='name']")?.focus(), 600);
  };

  $("#servicesList").innerHTML = S.services
    .map(
      (s) => `
      <article class="service">
        <div>
          <span class="service__num">${esc(s.number)}</span>
          <h3 class="service__title">${esc(s.title)}</h3>
          <p class="service__sub">${esc(s.subtitle)}</p>
          <p class="service__desc">${esc(s.description)}</p>
          <ul class="service__list">
            ${s.deliverables.map((d) => `<li>${esc(d)}</li>`).join("")}
          </ul>
        </div>
        <button type="button" class="service__btn" data-inquire="${esc(s.id)}">
          ${esc(s.cta)} →
        </button>
      </article>`
    )
    .join("");

  $$("[data-inquire]").forEach((btn) =>
    btn.addEventListener("click", () => selectServiceInForm(btn.dataset.inquire))
  );

  /* ---------- 7. Contact Section ---------- */
  $("#socials").innerHTML = S.contact.socials
    .map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)} ↗</a></li>`)
    .join("");

  $("#projectType").innerHTML = S.contact.projectTypes
    .map((t) => `<option value="${esc(t)}">${esc(t)}</option>`)
    .join("");

  $("#contactForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    const subject = `[uri.visuals Inquiry] ${d.type} — ${d.name}`;
    const body = `Hi ${S.name},\n\n${d.message}\n\n---\nProject Type: ${d.type}\nName: ${d.name}\nEmail: ${d.email}`;
    window.location.href = `mailto:${S.contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });

  /* ---------- 8. Header Scroll & Mobile Menu ---------- */
  const nav = $("#nav");
  const toggle = $("#navToggle");
  const links = $("#navLinks");
  const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 36);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const setMenu = (open) => {
    links.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open);
    document.body.style.overflow = open ? "hidden" : "";
  };
  toggle.addEventListener("click", () => setMenu(!links.classList.contains("is-open")));
  $$("a", links).forEach((a) => a.addEventListener("click", () => setMenu(false)));

  /* ---------- 9. Scroll Reveal ---------- */
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add("is-visible");
          io.unobserve(en.target);
        }
      }),
    { threshold: 0.12 }
  );
  $$(".reveal, .tile")
    .filter((el) => !el.closest(".hero"))
    .forEach((el) => io.observe(el));

  /* ---------- 10. Immersive Project Viewer Modal (with Before/After Slider) ---------- */
  const lb = $("#lightbox");
  const stage = $("#lbStage");
  const meta = $("#lbMeta");
  const counter = $("#lbCounter");
  let current = 0;

  const embedFor = (url) => {
    const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
    if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1&rel=0`;
    const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vm) return `https://player.vimeo.com/video/${vm[1]}?autoplay=1`;
    return null;
  };

  const visibleIndexes = () => $$(".tile:not(.is-hidden)").map((t) => +t.dataset.index);

  const renderStageMedia = (item, mode = "media") => {
    if (mode === "compare" && item.beforeSrc && item.afterSrc) {
      stage.innerHTML = `
        <div class="compare" style="--pos: 50%">
          <img class="compare__after" src="${esc(item.afterSrc)}" alt="Final color grade" />
          <div class="compare__before-wrap">
            <img src="${esc(item.beforeSrc)}" alt="Raw log footage" />
          </div>
          <span class="compare__tag compare__tag--before">Before · Raw / Log</span>
          <span class="compare__tag compare__tag--after">After · Final Grade</span>
          <input type="range" class="compare__range" min="5" max="95" value="50" aria-label="Drag to compare before and after color grade" />
        </div>`;
      const wrap = $(".compare", stage);
      const range = $(".compare__range", stage);
      range.addEventListener("input", () => wrap.style.setProperty("--pos", `${range.value}%`));
      return;
    }

    if (item.mediaType === "video") {
      const embed = embedFor(item.src);
      stage.innerHTML = embed
        ? `<iframe src="${esc(embed)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="${esc(item.title)}"></iframe>`
        : `<video src="${esc(item.src)}" poster="${esc(item.poster || "")}" controls autoplay playsinline></video>`;
    } else {
      stage.innerHTML = `<img src="${esc(item.src)}" alt="${esc(item.title)}" />`;
    }
  };

  const show = (i) => {
    current = i;
    const item = S.work[i];
    const list = visibleIndexes();
    const pos = list.indexOf(i);
    counter.textContent = `${String(pos + 1).padStart(2, "0")} / ${String(list.length).padStart(2, "0")} — ${item.category}`;

    const hasCompare = Boolean(item.beforeSrc && item.afterSrc);
    renderStageMedia(item, "media");

    meta.innerHTML = `
      <span class="label">${esc(item.tag)}</span>
      <h3>${esc(item.title)}</h3>
      <p>${esc(item.summary || "")}</p>
      ${
        hasCompare
          ? `<div class="mode-switch" role="group" aria-label="View mode">
               <button type="button" class="is-active" data-mode="media">Video Cut</button>
               <button type="button" data-mode="compare">Before / After Grade</button>
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
      <button type="button" class="service__btn" id="lbInquire">Inquire About Similar Project →</button>
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

  const open = (i) => {
    show(i);
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
  $("#lbClose").addEventListener("click", close);
  $("#lbPrev").addEventListener("click", () => step(-1));
  $("#lbNext").addEventListener("click", () => step(1));
  lb.addEventListener("click", (e) => {
    if (e.target === lb) close();
  });
  document.addEventListener("keydown", (e) => {
    if (lb.hidden) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") step(-1);
    if (e.key === "ArrowRight") step(1);
  });
})();
