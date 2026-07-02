# Habitable Zone Atlas 🪐

A live field journal of NASA's confirmed exoplanets, scored and plotted by how likely each one is to sit inside its star's habitable zone.

Built for the **NASA × Hack Club Stardance Challenge**.

**[Live demo →](#)** *(add your GitHub Pages link here once deployed)*

---

## What it does

Habitable Zone Atlas pulls confirmed exoplanet data directly from the [NASA Exoplanet Archive](https://exoplanetarchive.ipac.caltech.edu/), calculates each planet's habitable zone using its host star's temperature and radius, and plots where the planet actually sits relative to that zone — inside, outside, or right on the edge.

Every planet gets a **habitability score (0–100)** based on three things:

- **Orbital position** — how close the planet sits to the center of its star's habitable zone
- **Radius** — planets between 0.5–1.6 Earth radii score highest, since that's the range most likely to be rocky
- **Equilibrium temperature** — bonus points for a range where liquid water could plausibly exist (200–320 K)

Click any planet to see a hand-drawn orbital diagram showing exactly where it falls.

## Why this approach

The habitable zone boundaries come from stellar luminosity — a star's brightness, calculated from its radius and temperature — rather than a fixed distance. A red dwarf's habitable zone sits much closer in than the Sun's, which is why planets like TRAPPIST-1 e can be temperate at just 0.03 AU. The formula is a simplified version of the approach used in Kopparapu et al.'s habitable zone models, chosen to stay readable in a single file rather than requiring a full climate model.

This is a simplification, not a research-grade habitability index — it doesn't account for atmosphere, eccentricity, or tidal locking. It's framed as a field journal on purpose: a fast, visual way to explore *candidates* worth reading more about, not a final verdict on any planet.

## No API key required

Unlike most NASA APIs, the Exoplanet Archive's [TAP service](https://exoplanetarchive.ipac.caltech.edu/docs/TAP/usingTAP.html) is fully public — no key, no sign-up, no rate-limit headaches. That means this project skips the whole `.env` / GitHub Secrets dance entirely. One less thing to configure.

If the archive is ever unreachable (offline demo, flaky wifi, temporary outage), the app falls back to a small bundled dataset so a live demo never breaks mid-presentation.

## Tech stack

- [Vite](https://vitejs.dev/) + vanilla JavaScript — no framework, no build complexity
- Vanilla JS + hand-drawn SVG for the orbital plots — no charting library
- Deployed via GitHub Actions to GitHub Pages

## Project structure

```
habitable-zone-atlas/
├── index.html              # entry point, just a div#app + script tag
├── src/
│   ├── main.js              # all fetch + render logic
│   └── style.css            # all styling
├── vite.config.js           # sets the base path for GitHub Pages
├── .github/workflows/
│   └── deploy.yml           # builds + deploys to Pages on every push to main
└── package.json
```

## Running it locally

```bash
git clone https://github.com/YOUR-USERNAME/habitable-zone-atlas.git
cd habitable-zone-atlas
npm install
npm run dev
```

Then open the localhost URL shown in your terminal (usually `http://localhost:5173`).

> Always use that localhost URL — never open `index.html` directly in the browser. Vite's module system (`import`, `type="module"`) won't work without the dev server.

## Deploying

This repo is already set up for automatic deployment:

1. Push to GitHub
2. Go to **Settings → Pages**
3. Under "Source," select **GitHub Actions**
4. Push to `main` (or re-run the workflow from the **Actions** tab)
5. Your live link will be `https://YOUR-USERNAME.github.io/habitable-zone-atlas/`

Every future push to `main` automatically rebuilds and redeploys — no manual steps needed.

**Before your first push:** open `vite.config.js` and make sure the `base` path matches your actual repo name exactly, or your assets won't load on Pages.

## Ideas for extending this

- A "closest to Earth-like" leaderboard
- Side-by-side comparison view for two planets
- Filter by discovery method (transit, radial velocity, direct imaging)
- Swap the simplified habitable zone formula for the full Kopparapu et al. model
- Pull in JWST atmospheric composition data where available

## Data source

All exoplanet data is public domain, courtesy of NASA's Exoplanet Archive, operated by the California Institute of Technology under contract with NASA.

## License

MIT — fork it, remix it, make it yours.

---

*Built for [Stardance](https://stardance.hackclub.com/), a summer program from NASA, Hack Club, and AMD for teen builders.*
