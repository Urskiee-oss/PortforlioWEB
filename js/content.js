/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                 ✏️  EDIT YOUR WEBSITE HERE  ✏️                 ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  This is the ONLY file you need to change to update the site. ║
 * ║  Text, photos, videos, paragraphs, services, contact info —   ║
 * ║  everything on the page is read from the `SITE` object below. ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 *  QUICK MAP — where each part of the page is edited:
 *  ┌──────────────────────────────┬───────────────────────────────┐
 *  │ Browser tab name             │ tabTitle                      │
 *  │ Opening animation text       │ introAnimation                │
 *  │ Logo (top-left)              │ shortName                     │
 *  │ Landing-page sentence        │ intro                         │
 *  │ Landing background video     │ hero                          │
 *  │ Portfolio photos & videos    │ work            (📸 section 4)│
 *  │ Showreel / featured film     │ showreel                      │
 *  │ About-me paragraphs & photo  │ about           (📝 section 6)│
 *  │ Services                     │ services                      │
 *  │ Testimonials                 │ testimonials                  │
 *  │ Email, phone, socials        │ email / phone / socials       │
 *  └──────────────────────────────┴───────────────────────────────┘
 *
 *  📸 HOW TO ADD YOUR OWN PHOTOS / VIDEOS
 *   1. Copy your files into the  /assets  folder of this project
 *      (e.g.  assets/wedding-01.jpg,  assets/reel.mp4).
 *   2. Reference them by path:   src: "assets/wedding-01.jpg"
 *      — or paste any public image/video URL instead.
 *   3. Videos can also be a YouTube or Vimeo link, e.g.
 *      src: "https://youtu.be/XXXXXXXXXXX"  (add a `poster` image
 *      so the grid has a thumbnail).
 *   Tip: export photos at ~2000px on the long edge, JPG/WebP,
 *        under ~500 KB each so the site stays fast.
 *
 *  🚀 PUBLISHING CHANGES
 *   Save → commit → push to GitHub. If the repo is connected to
 *   Vercel, the live site updates automatically in ~30 seconds.
 *
 *  Other files (you normally don't need to touch these):
 *   - index.html      → page structure / section order / SEO tags
 *   - css/styles.css  → colours, fonts, spacing (see :root at top)
 *   - js/main.js      → animations & interactions
 */
window.SITE = {
  /* ============================================================
   * 1) IDENTITY — who you are
   * ============================================================ */
  tabTitle: "uri.visuals",              // ✏️ text shown in the browser tab
  name: "Uriel",                        // ✏️ TODO: your full name
  shortName: "uri.visuals",             // ✏️ brand text in the top-left of the header
  roles: ["Photographer", "Videographer"], // ✏️ shown above the headline
  location: "Your City, Country",       // ✏️ TODO
  yearsExperience: 5,                   // ✏️ TODO (number)
  availability: "Available for bookings — 2026/27", // ✏️ green "status" line

  /* ============================================================
   * 2) OPENING ANIMATION — the intro shown when the site loads
   * ============================================================ */
  introAnimation: {
    enabled: true,                      // ✏️ set to false to turn the intro off
    word: "uri.visuals",                // ✏️ big text that animates in
    tagline: "Photography · Videography", // ✏️ small line under it
  },

  /* ============================================================
   * 3) LANDING PAGE (HERO)
   * ============================================================ */
  // ✏️ The headline sentence on the landing page.
  //    {name}, {location} and {years} are filled in automatically
  //    from section 1 — you can also just type the text directly.
  intro:
    "Hi, I'm {name} — a photographer & videographer based in {location}, " +
    "turning real moments into timeless stills and cinematic films for " +
    "couples, brands and artists for over {years} years.",

  // ✏️ First 3 are shown on the landing page; all are used elsewhere.
  specialties: ["Weddings", "Portraits", "Events", "Brand Films", "Music Videos"],

  // ✏️ Background of the landing page.
  //    video: an .mp4 (keep it short, muted-friendly, ~10–20 s, < 10 MB)
  //           set to "" to use only the poster image.
  //    poster: image shown while the video loads (and on slow connections).
  hero: {
    video: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    poster: "https://picsum.photos/seed/hero-cinema/1920/1080",
  },

  /* ============================================================
   * 4) 📸 PORTFOLIO GRID — your photos & videos
   * ============================================================
   *  Add a line to add an item, delete a line to remove it.
   *  Items appear in the same order as listed here.
   *
   *  Fields:
   *   type:     "photo"  or  "video"   (drives the Photography / Videography filter)
   *   title:    shown on hover and in the full-screen viewer
   *   category: small gold label (e.g. "Wedding", "Portrait")
   *   src:      photo → the image file;  video → .mp4 / YouTube / Vimeo link
   *   poster:   (videos only) thumbnail image for the grid
   *   duration: (videos only, optional) e.g. "2:45"
   *   size:     "tall" (2 rows high), "wide" (2 columns wide) or leave out
   *
   *  Example using your own file in /assets:
   *   { type: "photo", title: "Sunset Couple", category: "Wedding", src: "assets/sunset.jpg", size: "tall" },
   */
  work: [
    { type: "photo", title: "Golden Hour Vows",   category: "Wedding",     src: "https://picsum.photos/seed/wed1/1200/1600",  size: "tall" },
    { type: "video", title: "Bloom — Short Film", category: "Short Film",  src: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", poster: "https://picsum.photos/seed/film1/1600/900", duration: "0:05", size: "wide" },
    { type: "photo", title: "Quiet Streets",      category: "Street",      src: "https://picsum.photos/seed/street2/1200/800" },
    { type: "photo", title: "Portrait in Blue",   category: "Portrait",    src: "https://picsum.photos/seed/portrait3/1200/1600", size: "tall" },
    { type: "video", title: "Brand Story — Café", category: "Commercial",  src: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm", poster: "https://picsum.photos/seed/brand4/1600/900", duration: "0:05" },
    { type: "photo", title: "Mountain Light",     category: "Landscape",   src: "https://picsum.photos/seed/landscape5/1600/1000", size: "wide" },
    { type: "photo", title: "Backstage",          category: "Event",       src: "https://picsum.photos/seed/event6/1200/1500" },
    { type: "video", title: "Night Drive — MV",   category: "Music Video", src: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", poster: "https://picsum.photos/seed/mv7/1200/1500", duration: "0:05", size: "tall" },
    { type: "photo", title: "Coastline",          category: "Travel",      src: "https://picsum.photos/seed/travel8/1600/1000" },
    { type: "photo", title: "The First Dance",    category: "Wedding",     src: "https://picsum.photos/seed/wed9/1200/1600" },
    { type: "photo", title: "Studio Session",     category: "Portrait",    src: "https://picsum.photos/seed/studio10/1200/900" },
    { type: "video", title: "Festival Recap",     category: "Event",       src: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", poster: "https://picsum.photos/seed/fest11/1600/900", duration: "0:05", size: "wide" },
  ],

  /* ============================================================
   * 5) SHOWREEL — the large featured video
   * ============================================================ */
  showreel: {
    title: "2026 Showreel",                                              // ✏️
    description: "A two-minute cut of my favourite frames from the past year.", // ✏️
    src: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", // ✏️ .mp4 file or URL
    poster: "https://picsum.photos/seed/showreel/1920/1080",             // ✏️ thumbnail before play
  },

  /* ============================================================
   * 6) 📝 ABOUT ME — your photo, story paragraphs, stats & gear
   * ============================================================ */
  about: {
    portrait: "https://picsum.photos/seed/me-portrait/900/1200", // ✏️ your photo (portrait/vertical works best), e.g. "assets/me.jpg"

    // ✏️ PARAGRAPHS — each "…" string becomes its own paragraph.
    //    Add more lines to add paragraphs; delete lines to remove them.
    paragraphs: [
      "I started with a second-hand camera and a habit of noticing light. Today I work across stills and motion, helping people and brands tell honest stories that still feel cinematic.",
      "My approach is calm, unobtrusive and detail-obsessed: I direct when it helps and step back when the moment is already perfect.",
    ],

    // ✏️ The big gold numbers
    stats: [
      { value: "5+",   label: "Years shooting" },
      { value: "120+", label: "Projects delivered" },
      { value: "60+",  label: "Happy clients" },
    ],

    // ✏️ Your camera kit / software (shown as small tags)
    gear: ["Sony A7 IV", "DJI Ronin RS3", "DJI Mini 4 Pro", "24–70mm f/2.8", "85mm f/1.4", "DaVinci Resolve", "Lightroom"],
  },

  /* ============================================================
   * 7) SERVICES — also fills the "Project type" menu in the form
   * ============================================================
   *  price is optional — e.g. "From ₱15,000" — leave "" to hide it.
   */
  services: [
    { title: "Wedding Photo & Film", text: "Full-day coverage, edited gallery and a cinematic highlight film.", price: "" },
    { title: "Portraits",            text: "Personal, couple, family and professional headshot sessions.",      price: "" },
    { title: "Events",               text: "Concerts, corporate events, birthdays and launches.",                price: "" },
    { title: "Brand & Commercial",   text: "Product photography, social content and short brand films.",         price: "" },
    { title: "Music Videos",         text: "Concept, shooting, editing and colour grading.",                     price: "" },
    { title: "Drone & Aerial",       text: "Aerial photo and video for real estate, travel and events.",         price: "" },
  ],

  /* ============================================================
   * 8) TESTIMONIALS — client quotes (delete all lines to hide)
   * ============================================================ */
  testimonials: [
    { quote: "We relive our wedding every time we watch the film. Absolutely unreal.", author: "Ana & Marco", role: "Wedding clients" },
    { quote: "Fast, creative and so easy to work with. Our launch content performed better than ever.", author: "Studio Kaffe", role: "Brand client" },
  ],

  /* ============================================================
   * 9) CONTACT — where enquiries go
   * ============================================================ */
  email: "hello@yourdomain.com",        // ✏️ TODO — the contact form sends to this address
  phone: "+00 000 000 0000",            // ✏️ TODO (set to "" to hide the phone row)
  socials: [
    // ✏️ Replace with your real profiles. Add/delete lines as needed.
    { label: "Instagram", url: "https://instagram.com/" },
    { label: "YouTube",   url: "https://youtube.com/" },
    { label: "Vimeo",     url: "https://vimeo.com/" },
    { label: "GitHub",    url: "https://github.com/Urskiee-oss" },
  ],
};
