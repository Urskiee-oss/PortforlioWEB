# 📸 assets/ — put your photos & videos here

1. Drop your files in this folder, e.g.
   ```
   assets/wedding-01.jpg
   assets/portrait-02.webp
   assets/me.jpg
   assets/showreel.mp4
   ```
2. Open **`js/content.js`** and reference them by path:
   ```js
   { type: "photo", title: "Sunset Vows", category: "Wedding", src: "assets/wedding-01.jpg", size: "tall" },
   { type: "video", title: "Highlight Film", category: "Wedding", src: "assets/showreel.mp4", poster: "assets/wedding-01.jpg" },
   ```
   - About-me photo → `about.portrait`
   - Landing background → `hero.video` / `hero.poster`
   - Featured film → `showreel.src` / `showreel.poster`
3. Commit & push. Vercel redeploys automatically.

**Tips**
- Photos: JPG/WebP, ~2000px on the long edge, under ~500 KB.
- Videos: keep hosted files small (< 20 MB). For long films, upload to YouTube/Vimeo and paste the link as `src` instead.
- Filenames: lowercase, no spaces (e.g. `beach-portrait.jpg`).
