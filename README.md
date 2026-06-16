# FITLY

A workout, nutrition, and body-tracking app that runs as an installable web app (PWA). Add it to your phone's home screen and it opens fullscreen like a native app. All data is stored **locally on each device** — no account, no backend, no sync.

---

## What you need

- A computer with **Node.js** installed (the free LTS version): https://nodejs.org
  - After installing, check it works: open a terminal and run `node -v` (should print a version like `v20.x` or `v22.x`).

---

## 1. Install

In a terminal, go into this folder and install dependencies (one time):

```bash
cd fitly-app
npm install
```

## 2. Run it locally (to test)

```bash
npm run dev
```

This prints a local address (usually `http://localhost:5173`). Open it in your browser. Edit files and it live-reloads.

## 3. Build the production version

```bash
npm run build
```

This creates a `dist/` folder containing the finished static site (HTML/CSS/JS). That folder is everything you need to deploy.

You can preview the built version locally with:

```bash
npm run preview
```

---

## 4. Put it online (so your phone can install it)

You need HTTPS hosting for the camera/barcode scanner and home-screen install to work. Any of these free hosts work. **Easiest first:**

### Option A — Netlify Drop (no account setup, drag & drop)
1. Run `npm run build`.
2. Go to https://app.netlify.com/drop
3. Drag the **`dist`** folder onto the page.
4. You get a public `https://…netlify.app` URL in seconds. Done.

(To update later, build again and drag the new `dist` folder.)

### Option B — Vercel or Cloudflare Pages (auto-deploy from GitHub)
1. Push this folder to a GitHub repository.
2. In Vercel (https://vercel.com) or Cloudflare Pages, "Import" the repo.
3. Framework preset: **Vite**. Build command: `npm run build`. Output dir: `dist`.
4. Deploy. Every push auto-updates the site.

> Deploying at a sub-path (like GitHub Pages `username.github.io/fitly/`)? Open `vite.config.js` and set `base: "/fitly/"` (your repo name), then rebuild. For Netlify/Vercel/Cloudflare root domains, leave it as `/`.

---

## 5. Install on your phone (Add to Home Screen)

**iPhone (Safari):**
1. Open your site's URL in **Safari**.
2. Tap the **Share** button → **Add to Home Screen** → **Add**.
3. Launch FITLY from the new home-screen icon — it opens fullscreen.

**Android (Chrome):**
1. Open the URL in **Chrome**.
2. Tap the **⋮** menu → **Install app** / **Add to Home screen**.

Each person installs it on **their own phone** and gets their **own private data** — there's no shared login.

---

## Good to know

- **Your data lives in the browser** of the device you use (via `localStorage`). It stays between visits and works offline for everything except the parts below.
- **Clearing your browser data / site data will erase your FITLY history.** There's no cloud backup in this version.
- Using a **different browser or a different phone** = a separate, empty FITLY (data isn't shared between them).
- **Barcode scanner** (Food tab) needs camera permission and HTTPS — it works on the hosted site, not always on plain `http://localhost`. Nutrition lookups use the free Open Food Facts database and need an internet connection. Manual entry always works.
- **Rest-timer countdown sound:** on iPhone, the silent/mute switch can mute web audio and backgrounding the app can pause it — keep the phone unmuted with the screen on during a set. Vibration still fires.

---

## Want real cross-device sync later?

This build is intentionally local-only. To sync one account across phones you'd add a backend (e.g. Supabase or Firebase) and swap the storage layer in `src/storage.js` for calls to that service. The rest of the app wouldn't need to change much, since all reads/writes already go through that one file.

---

## Project structure

```
fitly-app/
├─ index.html            # app shell + PWA / iOS home-screen meta tags
├─ package.json          # dependencies & scripts
├─ vite.config.js        # build config (set `base` for sub-path hosting)
├─ tailwind.config.js    # Tailwind CSS scanning config
├─ postcss.config.js
├─ public/
│  ├─ manifest.json      # PWA manifest (name, icons, theme)
│  ├─ icon-192.png / icon-512.png
│  ├─ apple-touch-icon.png
│  ├─ favicon.png / icon.svg
└─ src/
   ├─ main.jsx           # entry point (installs storage, mounts the app)
   ├─ storage.js         # localStorage-backed persistence (per device)
   ├─ index.css          # Tailwind + base styles
   └─ Fitly.jsx          # the entire FITLY app
```
