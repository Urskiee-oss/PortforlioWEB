# uri.visuals — Photography, Videography & Editing Portfolio

Minimalist, editorial portfolio website and built-in **Admin Studio** (`/admin`) for **uri.visuals** (Uriel).

## Features
- **Opening Shutter Animation:** Custom aperture drawing + shutter split reveal (`uri.visuals`).
- **Hero Section:** Supports looping background video, static photograph, or minimal studio mode with adjustable overlay darkness & monochrome controls.
- **Portfolio Categories:** Filterable **Photography**, **Videography**, and **Video Editing** projects with an immersive media viewer and interactive **Before / After Color Grade** drag-slider.
- **Built-in Admin Studio (`/admin` or `/admin.html`):**
  - **Studio Dashboard:** Live project counters, portfolio health check, and activity log.
  - **Confirmation Modals:** Custom confirmation dialogs for all additions, edits, duplications, bulk actions, and deletions, plus toast notifications with 1-click **Undo / Redo** (`Ctrl/Cmd + Z` / `Y`).
  - **Hero Background Manager:** Switch between photo, looping video, or minimal solid mode, upload photos, and adjust overlay darkness & B&W sliders.
  - **Portfolio Manager:** Add, edit, drag-and-drop reorder, toggle Draft/Published visibility, or bulk-manage projects.
  - **Appearance Customizer & Media Library:** Studio color presets, live color pickers, asset optimizer, and Split Live Preview (Desktop / Tablet / Mobile).
  - **1-Click GitHub Publisher:** Commit changes directly to `js/content.js` on GitHub so Vercel automatically redeploys.

## Quick Start
```bash
npx serve .
```
- **Main Portfolio:** `http://localhost:3000/`
- **Admin Studio:** `http://localhost:3000/admin.html` (or press `Shift + A` on the homepage)

## Editing Content
- **Visually:** Open `/admin` (or `/admin.html`), make your edits, and either click **Publish Live to GitHub** (under *Publish & Security*) or click **Download content.js** and replace [`js/content.js`](js/content.js).
- **In Code:** Edit [`js/content.js`](js/content.js) directly, commit, and push to `main`.
