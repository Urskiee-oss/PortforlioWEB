/**
 * ============================================================
 *  SITE CONTENT — edit this file to personalise your portfolio
 * ============================================================
 *  Everything on the page (name, intro sentence, contact info,
 *  gallery items, services…) is rendered from this object.
 *
 *  Media:
 *   - Put your own photos/videos in /assets and reference them
 *     like "assets/my-photo.jpg", or use any public URL.
 *   - Video items accept: an .mp4/.webm URL, a YouTube URL,
 *     or a Vimeo URL. `poster` is the thumbnail shown in the grid.
 */
window.SITE = {
  // ---------- Identity ----------
  tabTitle: "uri.visuals",              // text shown in the browser tab
  name: "Uriel",                        // TODO: your full name
  shortName: "URIEL",                   // shown as the logo in the nav
  roles: ["Photographer", "Videographer"],
  location: "Your City, Country",       // TODO
  yearsExperience: 5,                   // TODO
  availability: "Available for bookings — 2026/27",

  // The headline sentence on the landing page. {name}, {location}
  // and {years} are replaced automatically.
  intro:
    "Hi, I'm {name} — a photographer & videographer based in {location}, " +
    "turning real moments into timeless stills and cinematic films for " +
    "couples, brands and artists for over {years} years.",

  specialties: ["Weddings", "Portraits", "Events", "Brand Films", "Music Videos"],

  // ---------- Contact ----------
  email: "hello@yourdomain.com",        // TODO
  phone: "+00 000 000 0000",            // TODO (leave "" to hide)
  socials: [
    // TODO: replace with your real profiles (delete any you don't use)
    { label: "Instagram", url: "https://instagram.com/" },
    { label: "YouTube",   url: "https://youtube.com/" },
    { label: "Vimeo",     url: "https://vimeo.com/" },
    { label: "GitHub",    url: "https://github.com/Urskiee-oss" },
  ],

  // ---------- Hero background ----------
  hero: {
    video: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    poster: "https://picsum.photos/seed/hero-cinema/1920/1080",
  },

  // ---------- Featured film / showreel ----------
  showreel: {
    title: "2026 Showreel",
    description: "A two-minute cut of my favourite frames from the past year.",
    src: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    poster: "https://picsum.photos/seed/showreel/1920/1080",
  },

  // ---------- Portfolio ----------
  // type: "photo" | "video"
  // category: free text, shown on hover
  // size: "tall" | "wide" | "" (affects grid shape)
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

  // ---------- About ----------
  about: {
    portrait: "https://picsum.photos/seed/me-portrait/900/1200",
    paragraphs: [
      // TODO: write your own story
      "I started with a second-hand camera and a habit of noticing light. Today I work across stills and motion, helping people and brands tell honest stories that still feel cinematic.",
      "My approach is calm, unobtrusive and detail-obsessed: I direct when it helps and step back when the moment is already perfect.",
    ],
    stats: [
      { value: "5+",  label: "Years shooting" },
      { value: "120+", label: "Projects delivered" },
      { value: "60+",  label: "Happy clients" },
    ],
    gear: ["Sony A7 IV", "DJI Ronin RS3", "DJI Mini 4 Pro", "24–70mm f/2.8", "85mm f/1.4", "DaVinci Resolve", "Lightroom"],
  },

  // ---------- Services ----------
  services: [
    { title: "Wedding Photo & Film", text: "Full-day coverage, edited gallery and a cinematic highlight film.", price: "" },
    { title: "Portraits",            text: "Personal, couple, family and professional headshot sessions.",      price: "" },
    { title: "Events",               text: "Concerts, corporate events, birthdays and launches.",                price: "" },
    { title: "Brand & Commercial",   text: "Product photography, social content and short brand films.",         price: "" },
    { title: "Music Videos",         text: "Concept, shooting, editing and colour grading.",                     price: "" },
    { title: "Drone & Aerial",       text: "Aerial photo and video for real estate, travel and events.",         price: "" },
  ],

  // ---------- Testimonials ----------
  testimonials: [
    { quote: "We relive our wedding every time we watch the film. Absolutely unreal.", author: "Ana & Marco", role: "Wedding clients" },
    { quote: "Fast, creative and so easy to work with. Our launch content performed better than ever.", author: "Studio Kaffe", role: "Brand client" },
  ],
};
