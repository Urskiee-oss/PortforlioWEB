/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                 ✏️  EDIT YOUR WEBSITE HERE  ✏️                 ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  This is the ONLY file you need to change to update the site. ║
 * ║  Text, photos, videos, editing breakdowns, paragraphs,        ║
 * ║  services, and contact info are all read from `SITE` below.   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 *  QUICK MAP — where each part of the page is edited:
 *  ┌──────────────────────────────────┬───────────────────────────┐
 *  │ Browser tab name                 │ tabTitle                  │
 *  │ Header brand name (top-left)     │ shortName                 │
 *  │ Opening animation                │ introAnimation            │
 *  │ Hero headline & bio sentence     │ hero                      │
 *  │ Portfolio (Photo / Video / Edit) │ work        (📸 section 4)│
 *  │ About-me paragraphs & skills     │ about       (📝 section 5)│
 *  │ Services (with Inquire buttons)  │ services    (🎬 section 6)│
 *  │ Contact headline, email, socials │ contact     (✉️ section 7)│
 *  └──────────────────────────────────┴───────────────────────────┘
 *
 *  📸 HOW TO ADD YOUR OWN PHOTOS / VIDEOS
 *   1. Put your files in the  /assets  folder (e.g. assets/portrait-01.jpg).
 *   2. Reference them by path:   src: "assets/portrait-01.jpg"
 *      — or paste any public image/video URL.
 *   3. Videos accept an .mp4/.webm path, a YouTube link, or a Vimeo link.
 *   4. For "editing" projects, you can optionally include `beforeSrc` and
 *      `afterSrc` images to enable an interactive Before/After grade slider
 *      inside the project viewer, plus `breakdown` bullets.
 */
window.SITE = {
  /* ============================================================
   * 1) IDENTITY — who you are
   * ============================================================ */
  tabTitle: "uri.visuals",              // ✏️ text shown in the browser tab
  name: "Uriel",                        // ✏️ your name
  shortName: "uri.visuals",             // ✏️ brand text in the top-left of the header
  roles: ["Photography", "Videography", "Video Editing"], // ✏️ core disciplines
  location: "Available Worldwide",      // ✏️ your city/country or availability

  /* ============================================================
   * 2) OPENING ANIMATION — shown when the site loads
   * ============================================================ */
  introAnimation: {
    enabled: true,                      // ✏️ set to false to disable the intro animation
    word: "uri.visuals",                // ✏️ center wordmark
    tagline: "Photography · Videography · Editing", // ✏️ subtitle line
  },

  /* ============================================================
   * 3) HOMEPAGE HERO — headline, creator intro sentence & CTAs
   * ============================================================ */
  hero: {
    // ✏️ Bold oversized headline
    headline: "Capturing Moments.\nCreating Stories.",

    // ✏️ Supporting subtitle right under the headline
    subheadline: "Photography, videography, and visual storytelling through a creative lens.",

    // ✏️ Personal sentence introducing who you are + essential info
    //    ({name} and {location} are filled in automatically from section 1)
    bioSentence:
      "I'm {name} (uri.visuals) — a photographer, videographer, and video editor ({location}) crafting editorial stills, cinematic films, and precision post-production for events, portraits, and creative projects.",

    primaryCta: "Explore My Work",      // ✏️ primary button text
    secondaryCta: "Get in Touch",       // ✏️ secondary button text

    // ✏️ HERO BACKGROUND SETTINGS
    //    bgMode: "video" (looping video), "image" (static photo), or "solid" (minimal dark studio)
    bgMode: "video",
    bgImage: "https://picsum.photos/seed/uri-hero-editorial/1920/1080",
    video: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    poster: "https://picsum.photos/seed/uri-hero-editorial/1920/1080",
    overlayOpacity: 65,                 // ✏️ 0 to 90 — darkness of overlay behind text
    grayscale: 18,                      // ✏️ 0 to 100 — 0 = full color, 100 = black & white
  },

  /* ============================================================
   * 4) 📸 FEATURED WORK / PORTFOLIO
   * ============================================================
   *  Categories (drives the filter tabs):
   *   - "photography" → Photography tab
   *   - "videography" → Videography tab
   *   - "editing"     → Video Editing tab
   *
   *  Fields for each project:
   *   id:          unique slug
   *   category:    "photography" | "videography" | "editing"
   *   tag:         label shown on card (e.g. "Portrait", "Cinematic Film", "Color & Cut")
   *   title:       project title
   *   summary:     1–2 sentence project description shown in the viewer
   *   mediaType:   "image" | "video"
   *   src:         image URL/path OR video URL/path (MP4/WebM/YouTube/Vimeo)
   *   poster:      thumbnail image for videos
   *   duration:    optional runtime label for videos/edits (e.g. "01:45")
   *   size:        "tall" | "wide" | "" (controls editorial grid proportions)
   *   gallery:     optional array of 1 or more slides for an Instagram-style carousel post:
   *                [{ type: "image"|"video", src: "...", poster: "...", caption: "..." }, ...]
   *   breakdown:   optional array of technical/creative notes shown in the viewer
   *   beforeSrc:   optional "Before (Raw / Log)" image for interactive comparison
   *   afterSrc:    optional "After (Final Grade)" image for interactive comparison
   */
  work: [
    // ---------- PHOTOGRAPHY ----------
    {
      id: "monochrome-study",
      category: "photography",
      tag: "Portrait · Editorial",
      title: "Study in Natural Light",
      summary: "Environmental portrait series shot with available window light and minimal retouching to preserve texture and expression.",
      mediaType: "image",
      src: "https://picsum.photos/seed/uri-portrait-01/1200/1600",
      size: "tall",
      gallery: [
        { type: "image", src: "https://picsum.photos/seed/uri-portrait-01/1200/1600", caption: "Frame 01 — Window light study" },
        { type: "image", src: "https://picsum.photos/seed/uri-portrait-01b/1200/1600", caption: "Frame 02 — Close profile" },
        { type: "image", src: "https://picsum.photos/seed/uri-portrait-01c/1200/1600", caption: "Frame 03 — Ambient shadow detail" },
      ],
      breakdown: ["35mm & 85mm prime lenses", "Natural directional light", "Monochrome & warm neutral palette"],
    },
    {
      id: "city-after-rain",
      category: "photography",
      tag: "Lifestyle · Street",
      title: "Quiet Hours After Rain",
      summary: "Late-evening documentary frames exploring reflections, architecture, and unscripted movement across the city.",
      mediaType: "image",
      src: "https://picsum.photos/seed/uri-street-02/1600/1000",
      size: "wide",
      gallery: [
        { type: "image", src: "https://picsum.photos/seed/uri-street-02/1600/1000", caption: "Wet pavement reflections" },
        { type: "image", src: "https://picsum.photos/seed/uri-street-02b/1600/1000", caption: "Crosswalk silhouettes" },
        { type: "image", src: "https://picsum.photos/seed/uri-street-02c/1600/1000", caption: "Late train platform" },
        { type: "image", src: "https://picsum.photos/seed/uri-street-02d/1600/1000", caption: "Neon & mist" },
      ],
      breakdown: ["Handheld low-light capture", "Candid documentary framing", "Film-inspired tonal curve"],
    },
    {
      id: "highland-stillness",
      category: "photography",
      tag: "Landscape",
      title: "First Light on the Ridge",
      summary: "Wide-format landscape study captured at dawn as low fog cleared across the valley.",
      mediaType: "image",
      src: "https://picsum.photos/seed/uri-landscape-03/1400/1000",
      breakdown: ["Dawn blue-hour exposure", " tripod long-exposure frame", "Subtle neutral color balance"],
    },
    {
      id: "evening-gathering",
      category: "photography",
      tag: "Events",
      title: "Candlelit Gathering",
      summary: "Unobtrusive event coverage focused on candid interactions, atmosphere, and architectural space.",
      mediaType: "image",
      src: "https://picsum.photos/seed/uri-event-04/1200/1500",
      size: "tall",
      gallery: [
        { type: "image", src: "https://picsum.photos/seed/uri-event-04/1200/1500", caption: "Table setting at dusk" },
        { type: "image", src: "https://picsum.photos/seed/uri-event-04b/1200/1500", caption: "Candid toast" },
        { type: "image", src: "https://picsum.photos/seed/uri-event-04c/1200/1500", caption: "Courtyard ambience" },
      ],
      breakdown: ["Fast prime lenses in ambient light", "Reportage storytelling approach", "Cohesive full-gallery delivery"],
    },

    // ---------- VIDEOGRAPHY ----------
    {
      id: "motion-study-film",
      category: "videography",
      tag: "Cinematic Film",
      title: "Ephemera — Short Visual Film",
      summary: "A short atmospheric piece pairing macro natural textures with slow, deliberate camera movement.",
      mediaType: "video",
      src: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
      poster: "https://picsum.photos/seed/uri-film-05/1600/950",
      duration: "00:45",
      size: "wide",
      breakdown: ["24fps cinema capture", "Gimbal & slider movement", "Location ambient audio capture"],
    },
    {
      id: "artisan-promo",
      category: "videography",
      tag: "Promotional Video",
      title: "Craft & Process — Studio Profile",
      summary: "Short-form documentary profile following an independent maker from raw material to finished piece.",
      mediaType: "video",
      src: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm",
      poster: "https://picsum.photos/seed/uri-promo-06/1200/1500",
      duration: "01:20",
      size: "tall",
      breakdown: ["Multi-angle b-roll coverage", "Naturalistic interview lighting", "4K master + vertical social cuts"],
    },
    {
      id: "live-session",
      category: "videography",
      tag: "Event Coverage",
      title: "Late Night Live Session",
      summary: "Single-take and multi-cam coverage of an intimate live performance in a darkened rehearsal room.",
      mediaType: "video",
      src: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
      poster: "https://picsum.photos/seed/uri-live-07/1400/950",
      duration: "02:10",
      breakdown: ["Low-light cinema profile", "Synced board & room audio", "Dynamic handheld framing"],
    },

    // ---------- VIDEO EDITING ----------
    {
      id: "narrative-cut-grade",
      category: "editing",
      tag: "Video Editing · Color Grade",
      title: "Nocturne — Rhythm Cut & Color Grade",
      summary: "Post-production showcase: pacing built around percussive sound design, paired with a custom film-print look transforming flat log footage into a rich monochrome-and-amber palette.",
      mediaType: "video",
      src: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
      poster: "https://picsum.photos/seed/uri-edit-08/1600/950",
      duration: "01:05",
      size: "wide",
      beforeSrc: "https://picsum.photos/seed/uri-grade-sample/1400/850?grayscale",
      afterSrc: "https://picsum.photos/seed/uri-grade-sample/1400/850",
      breakdown: [
        "Offline & online assembly from multi-cam footage",
        "Node-based color grading (Log to Rec.709 film curve)",
        "Layered Foley, risers, and beat-matched transitions",
      ],
    },
    {
      id: "social-sequence-edit",
      category: "editing",
      tag: "Post-Production · Social Cutdowns",
      title: "Kinetic Montage — Editorial Sequence",
      summary: "High-energy sequence combining match-cuts, speed ramping, subtle typography, and cohesive tonal grading for multi-platform release.",
      mediaType: "video",
      src: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm",
      poster: "https://picsum.photos/seed/uri-edit-09/1400/950",
      duration: "00:38",
      beforeSrc: "https://picsum.photos/seed/uri-grade-two/1400/850?grayscale",
      afterSrc: "https://picsum.photos/seed/uri-grade-two/1400/850",
      breakdown: [
        "Match-cut & speed-ramp timeline structure",
        "Minimal kinetic title design",
        "Delivered in 16:9, 4:5, and 9:16 aspect ratios",
      ],
    },
  ],

  /* ============================================================
   * 5) 📝 ABOUT SECTION — biography, approach & skills
   * ============================================================
   *  Keep this authentic and personal. Each string in `bio` and
   *  `approach` renders as a paragraph.
   */
  about: {
    // ✏️ Your portrait image (put your photo in /assets and set "assets/me.jpg")
    portrait: "https://picsum.photos/seed/uri-creator-portrait/900/1150",
    portraitCaption: "Uriel — Photographer, Videographer & Editor",

    headline: "Visual storytelling built on light, movement, and pacing.",

    // ✏️ Short biography paragraphs
    bio: [
      "I'm Uriel, the creator behind uri.visuals. My work sits at the intersection of still photography, cinematography, and post-production—allowing a project to keep a single cohesive visual voice from the first frame captured on location to the final cut and color grade.",
      "Whether documenting an event, shooting a quiet portrait, or shaping raw footage on the timeline, I focus on honest atmosphere over heavy-handed effects.",
    ],

    // ✏️ Your creative approach
    approachTitle: "Creative Approach",
    approach:
      "Prepare thoroughly, work with light as it naturally falls, direct with a calm presence when needed, and let pacing and sound carry the emotion in the edit.",

    // ✏️ Concise list of creative skills & tools
    skills: [
      "Editorial & Portrait Photography",
      "Event & Documentary Coverage",
      "Cinematic Camera Movement",
      "Narrative & Rhythmic Video Editing",
      "Color Correction & Film Grading",
      "Sound Design & Audio Mixing",
      "Multi-Aspect Social Deliverables",
      "DaVinci Resolve · Lightroom · Premiere",
    ],
  },

  /* ============================================================
   * 6) 🎬 SERVICES SECTION — 3 core pillars with inquiry buttons
   * ============================================================ */
  services: [
    {
      id: "Photography",
      number: "01",
      title: "Photography",
      subtitle: "Portraits, events, lifestyle & creative editorial",
      description:
        "Still imagery with an editorial eye and natural tonal depth—crafted for individuals, events, and visual campaigns.",
      deliverables: [
        "Portraits, couples & creative sessions",
        "Event & documentary coverage",
        "Lifestyle, travel & architectural series",
        "Curated, high-resolution color-graded gallery",
      ],
      cta: "Inquire About Photography",
    },
    {
      id: "Videography",
      number: "02",
      title: "Videography",
      subtitle: "Cinematic films, event coverage & promotional videos",
      description:
        "Intentional camera movement, clean lighting, and atmospheric composition designed to capture stories in motion.",
      deliverables: [
        "Cinematic highlight & short films",
        "Event & live performance coverage",
        "Promotional & studio profile videos",
        "4K capture with clean location audio",
      ],
      cta: "Inquire About Videography",
    },
    {
      id: "Video Editing",
      number: "03",
      title: "Video Editing",
      subtitle: "Editing, color grading, motion graphics & post-production",
      description:
        "Precision post-production that shapes raw footage into a cohesive narrative through rhythm, color, and sound.",
      deliverables: [
        "Narrative, documentary & commercial editing",
        "Custom color grading & shot matching",
        "Sound design, audio cleanup & mixing",
        "Clean motion titles & social media cutdowns",
      ],
      cta: "Inquire About Video Editing",
    },
  ],

  /* ============================================================
   * 7) ✉️ CONTACT SECTION
   * ============================================================ */
  contact: {
    headline: "Have a story worth telling?",
    invitation:
      "Available for photography assignments, video productions, and remote editing or color grading collaborations. Share a few details about your project below or reach out directly by email.",
    buttonText: "Let's Work Together",
    email: "hello@urivisuals.com",      // ✏️ TODO: replace with your real email address
    projectTypes: [
      "Photography",
      "Videography",
      "Video Editing & Post-Production",
      "Full Production (Photo + Video + Edit)",
      "Creative Collaboration",
    ],
    socials: [
      // ✏️ Replace URLs with your real social profiles
      { label: "Instagram", url: "https://instagram.com/" },
      { label: "YouTube",   url: "https://youtube.com/" },
      { label: "Vimeo",     url: "https://vimeo.com/" },
      { label: "GitHub",    url: "https://github.com/Urskiee-oss" },
    ],
  },
};
