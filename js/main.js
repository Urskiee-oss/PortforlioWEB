/* ==========================================================
   Portfolio — rendering & interactions
   All content comes from window.SITE (js/content.js)
   ✏️ You normally don't need to edit this file — change text,
      photos and videos in js/content.js instead.
   ========================================================== */
(() => {
  const S = window.SITE;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (str = "") =>
    String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- Opening animation ----------
     ✏️ Timing: INTRO_MIN_MS = minimum time the intro stays on screen,
        INTRO_MAX_MS = it never waits longer than this for slow networks. */
  const INTRO_MIN_MS = 2100;
  const INTRO_MAX_MS = 4000;
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
    setTimeout(revealHero, 650);            // headline appears as the shutter opens
    setTimeout(() => intro.remove(), 1500); // clean up once panels are off-screen
  };

  if (!intro || introCfg.enabled === false || reduceMotion) {
    intro?.remove();
    introFinished = true;
    document.body.classList.remove("is-loading");
    requestAnimationFrame(revealHero);
  } else {
    const word = introCfg.word || S.tabTitle || S.name;
    $("#introWord").innerHTML = [...word]
      .map((ch, i) => `<span style="--i:${i}"${ch === "." ? ' class="is-accent"' : ""}>${ch === " " ? "&nbsp;" : esc(ch)}</span>`)
      .join("");
    if (introCfg.tagline !== undefined) $("#introTag").textContent = introCfg.tagline;

    const minDelay = new Promise((r) => setTimeout(r, INTRO_MIN_MS));
    const pageLoaded = new Promise((r) => (document.readyState === "complete" ? r() : window.addEventListener("load", r, { once: true })));
    const maxDelay = new Promise((r) => setTimeout(r, INTRO_MAX_MS));
    Promise.race([Promise.all([minDelay, pageLoaded]), maxDelay]).then(finishIntro);
    intro.addEventListener("click", finishIntro); // click to skip
  }

  /* ---------- Text bindings ---------- */
  const bindings = {
    shortName: S.shortName,
    name: S.name,
    roles: S.roles.join(" & "),
    location: S.location,
    specialties: S.specialties.slice(0, 3).join(" · "),
    availability: S.availability,
    showreelTitle: S.showreel.title,
    showreelDesc: S.showreel.description,
  };
  $$("[data-bind]").forEach((el) => {
    const key = el.dataset.bind;
    if (key === "emailLink") { el.href = `mailto:${S.email}`; el.textContent = S.email; }
    else if (key === "phoneLink") { el.href = `tel:${S.phone.replace(/\s/g, "")}`; el.textContent = S.phone; }
    else if (key === "shortName") { el.innerHTML = esc(S.shortName).replace(".", "<em>.</em>"); }
    else if (key in bindings) el.textContent = bindings[key];
  });
  if (!S.phone) $("#phoneRow")?.remove();
  document.title = S.tabTitle || `${S.name} — ${S.roles.join(" & ")}`;
  $("#year").textContent = new Date().getFullYear();

  /* ---------- Hero intro sentence ---------- */
  $("#heroIntro").innerHTML = esc(S.intro)
    .replace("{name}", `<strong>${esc(S.name)}</strong>`)
    .replace("{location}", esc(S.location))
    .replace("{years}", esc(S.yearsExperience));

  /* ---------- Hero + showreel video ---------- */
  const heroVideo = $("#heroVideo");
  heroVideo.poster = S.hero.poster;
  if (S.hero.video) heroVideo.src = S.hero.video;
  const reel = $("#showreelVideo");
  reel.poster = S.showreel.poster;
  reel.src = S.showreel.src;

  /* ---------- Portfolio grid ---------- */
  const grid = $("#grid");
  grid.innerHTML = S.work
    .map((item, i) => {
      const thumb = item.type === "video" ? item.poster : item.src;
      const size = item.size ? ` tile--${item.size}` : "";
      return `
        <article class="tile${size}" data-type="${item.type}" data-index="${i}" tabindex="0"
                 aria-label="${esc(item.title)} — ${item.type === "video" ? "play video" : "view photo"}">
          <img src="${esc(thumb)}" alt="${esc(item.title)}" loading="lazy" />
          ${item.type === "video"
            ? `<span class="tile__badge">▶ Film${item.duration ? ` · ${esc(item.duration)}` : ""}</span><span class="tile__play"></span>`
            : ""}
          <div class="tile__info"><span>${esc(item.category)}</span><h3>${esc(item.title)}</h3></div>
        </article>`;
    })
    .join("");

  /* Filters */
  $$(".filter").forEach((btn) =>
    btn.addEventListener("click", () => {
      $$(".filter").forEach((b) => { b.classList.toggle("is-active", b === btn); b.setAttribute("aria-selected", b === btn); });
      const f = btn.dataset.filter;
      $$(".tile").forEach((t) => t.classList.toggle("is-hidden", f !== "all" && t.dataset.type !== f));
    })
  );

  /* ---------- About ---------- */
  $("#aboutImg").src = S.about.portrait;
  $("#aboutImg").alt = `Portrait of ${S.name}`;
  $("#aboutText").innerHTML = S.about.paragraphs.map((p) => `<p>${esc(p)}</p>`).join("");
  $("#stats").innerHTML = S.about.stats.map((s) => `<li><strong>${esc(s.value)}</strong><span>${esc(s.label)}</span></li>`).join("");
  $("#gear").innerHTML = S.about.gear.map((g) => `<li>${esc(g)}</li>`).join("");

  /* ---------- Services & testimonials ---------- */
  $("#services-list").innerHTML = S.services
    .map((s, i) => `
      <div class="service">
        <span class="service__num">${String(i + 1).padStart(2, "0")}</span>
        <h3>${esc(s.title)}</h3>
        <p>${esc(s.text)}</p>
        ${s.price ? `<span class="service__price">${esc(s.price)}</span>` : ""}
      </div>`)
    .join("");
  $("#quotes").innerHTML = S.testimonials
    .map((q) => `<blockquote class="quote"><p>“${esc(q.quote)}”</p><footer><strong>${esc(q.author)}</strong> — ${esc(q.role)}</footer></blockquote>`)
    .join("");

  /* ---------- Contact ---------- */
  $("#socials").innerHTML = S.socials
    .map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)} ↗</a></li>`)
    .join("");
  $("#projectType").innerHTML = [...S.services.map((s) => s.title), "Other"]
    .map((t) => `<option>${esc(t)}</option>`)
    .join("");
  $("#contactForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    const subject = `Enquiry: ${d.type}${d.date ? ` — ${d.date}` : ""}`;
    const body = `Hi ${S.name},\n\n${d.message}\n\nProject type: ${d.type}\nDate: ${d.date || "TBC"}\n\n— ${d.name} (${d.email})`;
    window.location.href = `mailto:${S.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });

  /* ---------- Nav ---------- */
  const nav = $("#nav");
  const toggle = $("#navToggle");
  const links = $("#navLinks");
  const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 40);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  const setMenu = (open) => {
    links.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open);
    document.body.style.overflow = open ? "hidden" : "";
  };
  toggle.addEventListener("click", () => setMenu(!links.classList.contains("is-open")));
  $$("a", links).forEach((a) => a.addEventListener("click", () => setMenu(false)));

  /* ---------- Reveal on scroll ---------- */
  const io = new IntersectionObserver(
    (entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
    }),
    { threshold: 0.12 }
  );
  // hero elements are revealed by the opening animation instead
  $$(".reveal, .tile").filter((el) => !el.closest(".hero")).forEach((el) => io.observe(el));

  /* ---------- Lightbox ---------- */
  const lb = $("#lightbox");
  const stage = $("#lbStage");
  const caption = $("#lbCaption");
  let current = 0;

  const embedFor = (url) => {
    const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
    if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1&rel=0`;
    const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vm) return `https://player.vimeo.com/video/${vm[1]}?autoplay=1`;
    return null;
  };

  const visibleIndexes = () => $$(".tile:not(.is-hidden)").map((t) => +t.dataset.index);

  const show = (i) => {
    current = i;
    const item = S.work[i];
    if (item.type === "video") {
      const embed = embedFor(item.src);
      stage.innerHTML = embed
        ? `<iframe src="${esc(embed)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="${esc(item.title)}"></iframe>`
        : `<video src="${esc(item.src)}" poster="${esc(item.poster || "")}" controls autoplay playsinline></video>`;
    } else {
      stage.innerHTML = `<img src="${esc(item.src)}" alt="${esc(item.title)}" />`;
    }
    caption.innerHTML = `<span>${esc(item.category)}</span>${esc(item.title)}`;
  };
  const open = (i) => { show(i); lb.hidden = false; document.body.style.overflow = "hidden"; $("#lbClose").focus(); };
  const close = () => { lb.hidden = true; stage.innerHTML = ""; document.body.style.overflow = ""; };
  const step = (dir) => {
    const list = visibleIndexes();
    const pos = list.indexOf(current);
    show(list[(pos + dir + list.length) % list.length]);
  };

  grid.addEventListener("click", (e) => { const t = e.target.closest(".tile"); if (t) open(+t.dataset.index); });
  grid.addEventListener("keydown", (e) => {
    const t = e.target.closest(".tile");
    if (t && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); open(+t.dataset.index); }
  });
  $("#lbClose").addEventListener("click", close);
  $("#lbPrev").addEventListener("click", () => step(-1));
  $("#lbNext").addEventListener("click", () => step(1));
  lb.addEventListener("click", (e) => { if (e.target === lb || e.target === stage) close(); });
  document.addEventListener("keydown", (e) => {
    if (lb.hidden) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") step(-1);
    if (e.key === "ArrowRight") step(1);
  });
})();
