# PortforlioWEB

A fast, dependency-free photography & videography portfolio. Plain HTML/CSS/JS, so there's no build step, and it deploys to Vercel as-is.

## Features
- Full-screen cinematic hero with a background video and an "about me" intro sentence
- Filterable portfolio grid (All / Photography / Videography)
- Lightbox for photos and videos (MP4/WebM, YouTube, Vimeo), with keyboard navigation
- Featured showreel, About section (stats + kit), Services, Testimonials
- Contact section with a pre-filled email enquiry form
- Responsive layout, reduced-motion support, and no frameworks

## Personalise it
**All content lives in [`js/content.js`](js/content.js).** Edit your name, location, intro sentence, email, socials, portfolio items, services, etc.

Put your own media in `assets/` and reference it, e.g. `src: "assets/wedding-01.jpg"`.
For videos, you can use a YouTube/Vimeo link as `src` and an image as `poster`.

Also update the `<title>` / meta description in `index.html` for SEO.

## Run locally
```bash
npx serve .
```

## Deploy to Vercel
- **Git (recommended):** push to GitHub → vercel.com/new → import `PortforlioWEB` → Deploy (Framework preset: *Other*, no build command).
- **CLI:** `npx vercel` (preview) / `npx vercel --prod` (production).
