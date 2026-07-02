/* ============================================================
   HABITABLE ZONE ATLAS
   Fetches confirmed exoplanets from the NASA Exoplanet Archive
   TAP service (no API key required — it's a public dataset) and
   scores each one by how close it sits to its star's habitable
   zone, using a simplified stellar-flux approach inspired by
   Kopparapu et al.'s habitable zone models.
   ============================================================ */

const TAP_URL = "https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=" +
  encodeURIComponent(
    "SELECT pl_name,hostname,pl_rade,pl_bmasse,pl_orbsmax,pl_eqt,st_teff,st_rad,sy_dist,disc_year " +
    "FROM ps WHERE default_flag=1 AND pl_orbsmax is not null AND st_teff is not null AND st_rad is not null " +
    "ORDER BY disc_year DESC"
  ) + "&format=json";

// small offline fallback so the app still works if the archive
// is unreachable (rate limit, offline demo, flaky wifi, etc)
const FALLBACK = [
  { pl_name: "Kepler-442 b", hostname: "Kepler-442", pl_rade: 1.34, pl_bmasse: 2.3, pl_orbsmax: 0.409, pl_eqt: 233, st_teff: 4402, st_rad: 0.6, sy_dist: 1206, disc_year: 2015 },
  { pl_name: "TRAPPIST-1 e", hostname: "TRAPPIST-1", pl_rade: 0.92, pl_bmasse: 0.69, pl_orbsmax: 0.029, pl_eqt: 251, st_teff: 2566, st_rad: 0.121, sy_dist: 40.7, disc_year: 2017 },
  { pl_name: "TRAPPIST-1 d", hostname: "TRAPPIST-1", pl_rade: 0.79, pl_bmasse: 0.39, pl_orbsmax: 0.022, pl_eqt: 288, st_teff: 2566, st_rad: 0.121, sy_dist: 40.7, disc_year: 2017 },
  { pl_name: "Kepler-186 f", hostname: "Kepler-186", pl_rade: 1.17, pl_bmasse: 1.4, pl_orbsmax: 0.432, pl_eqt: 188, st_teff: 3755, st_rad: 0.47, sy_dist: 582, disc_year: 2014 },
  { pl_name: "Proxima Cen b", hostname: "Proxima Centauri", pl_rade: 1.07, pl_bmasse: 1.07, pl_orbsmax: 0.0485, pl_eqt: 234, st_teff: 3042, st_rad: 0.154, sy_dist: 4.24, disc_year: 2016 },
  { pl_name: "TOI-700 d", hostname: "TOI-700", pl_rade: 1.19, pl_bmasse: 1.72, pl_orbsmax: 0.163, pl_eqt: 269, st_teff: 3480, st_rad: 0.42, sy_dist: 101.4, disc_year: 2020 },
  { pl_name: "Kepler-452 b", hostname: "Kepler-452", pl_rade: 1.6, pl_bmasse: 5, pl_orbsmax: 1.046, pl_eqt: 265, st_teff: 5757, st_rad: 1.11, sy_dist: 1846, disc_year: 2015 },
  { pl_name: "GJ 667 C c", hostname: "GJ 667 C", pl_rade: 1.54, pl_bmasse: 3.8, pl_orbsmax: 0.125, pl_eqt: 277, st_teff: 3327, st_rad: 0.42, sy_dist: 23.6, disc_year: 2011 },
  { pl_name: "K2-18 b", hostname: "K2-18", pl_rade: 2.61, pl_bmasse: 8.6, pl_orbsmax: 0.1591, pl_eqt: 255, st_teff: 3457, st_rad: 0.41, sy_dist: 38.0, disc_year: 2015 },
  { pl_name: "HD 40307 g", hostname: "HD 40307", pl_rade: 1.8, pl_bmasse: 7.1, pl_orbsmax: 0.6, pl_eqt: 227, st_teff: 4977, st_rad: 0.72, sy_dist: 41.9, disc_year: 2012 }
];

let DATA = [];
let selected = null;
let sortKey = "score";
let query = "";

// ---------- science ----------

function luminosity(st_rad, st_teff) {
  // L/Lsun ~ R^2 * (T/Tsun)^4
  return Math.pow(st_rad, 2) * Math.pow(st_teff / 5772, 4);
}

function habitableZone(st_rad, st_teff) {
  const L = luminosity(st_rad, st_teff);
  // simplified conservative HZ boundaries (AU), inspired by Kopparapu et al.
  const inner = Math.sqrt(L / 1.1);
  const outer = Math.sqrt(L / 0.53);
  return { inner, outer, L };
}

function score(p) {
  const { inner, outer } = habitableZone(p.st_rad, p.st_teff);
  const a = p.pl_orbsmax;

  let positionScore = 0;
  if (a >= inner && a <= outer) {
    const mid = (inner + outer) / 2;
    const halfWidth = (outer - inner) / 2 || 1;
    positionScore = 60 * (1 - Math.abs(a - mid) / halfWidth);
  } else {
    const edge = a < inner ? inner : outer;
    const dist = Math.abs(a - edge);
    positionScore = Math.max(0, 40 - dist * 30);
  }

  let sizeScore = 0;
  if (p.pl_rade) {
    if (p.pl_rade >= 0.5 && p.pl_rade <= 1.6) sizeScore = 25;
    else if (p.pl_rade <= 2.5) sizeScore = 12;
    else sizeScore = 3;
  } else {
    sizeScore = 8;
  }

  let tempScore = 0;
  if (p.pl_eqt) {
    tempScore = (p.pl_eqt >= 200 && p.pl_eqt <= 320) ? 15 : Math.max(0, 15 - Math.abs(p.pl_eqt - 260) / 12);
  } else {
    tempScore = 5;
  }

  return Math.round(Math.max(0, Math.min(100, positionScore + sizeScore + tempScore)));
}

function badgeClass(s) {
  if (s >= 60) return "high";
  if (s >= 35) return "mid";
  return "low";
}

// ---------- shell markup (rendered once) ----------

function renderShell() {
  document.querySelector("#app").innerHTML = `
    <header>
      <div>
        <div class="brand-mark">Field Journal · Vol. 01</div>
        <h1>Habitable Zone Atlas</h1>
        <p>Live confirmed exoplanets, plotted against their star's habitable zone. Data straight from the NASA Exoplanet Archive.</p>
      </div>
      <div class="status" id="status">connecting to archive…</div>
    </header>

    <main>
      <aside class="panel">
        <div class="panel-label">Search specimens</div>
        <input type="search" id="search" placeholder="planet or star name…" aria-label="Search planets">

        <div class="panel-label">Sort by habitability score</div>
        <div class="sort-row">
          <button class="sort-btn active" data-sort="score">Score</button>
          <button class="sort-btn" data-sort="dist">Distance</button>
          <button class="sort-btn" data-sort="radius">Radius</button>
          <button class="sort-btn" data-sort="year">Newest</button>
        </div>

        <div class="plotter">
          <div class="plotter-title" id="plotter-title">Select a planet</div>
          <div class="plotter-sub" id="plotter-sub">orbital position vs. habitable zone</div>
          <svg id="orbit-svg" viewBox="0 0 280 280"></svg>
          <div class="plotter-readout" id="plotter-readout">Click any card to plot its orbit here.</div>
        </div>
      </aside>

      <section class="list-wrap">
        <div class="list-head">
          <h2>Specimens</h2>
          <div class="list-count" id="count">loading…</div>
        </div>
        <div id="grid" class="grid">
          <div class="loading">Querying exoplanetarchive.ipac.caltech.edu …</div>
        </div>
      </section>
    </main>

    <footer>
      <span>Built for NASA × Hack Club Stardance Challenge. Data: NASA Exoplanet Archive (public domain).</span>
      <span>Open source · fork &amp; extend freely</span>
    </footer>
  `;

  document.querySelector("#search").addEventListener("input", (e) => {
    query = e.target.value;
    renderGrid();
  });

  document.querySelectorAll(".sort-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".sort-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      sortKey = btn.dataset.sort;
      renderGrid();
    });
  });
}

// ---------- grid + cards ----------

function filteredSorted() {
  let d = DATA;
  if (query.trim()) {
    const q = query.toLowerCase();
    d = d.filter((p) => (p.pl_name || "").toLowerCase().includes(q) || (p.hostname || "").toLowerCase().includes(q));
  }
  d = d.slice();
  if (sortKey === "score") d.sort((a, b) => b._score - a._score);
  if (sortKey === "dist") d.sort((a, b) => (a.sy_dist || 1e9) - (b.sy_dist || 1e9));
  if (sortKey === "radius") d.sort((a, b) => (a.pl_rade || 0) - (b.pl_rade || 0));
  if (sortKey === "year") d.sort((a, b) => (b.disc_year || 0) - (a.disc_year || 0));
  return d;
}

function renderGrid() {
  const grid = document.querySelector("#grid");
  const count = document.querySelector("#count");
  const list = filteredSorted();

  count.textContent = `${list.length} shown`;

  if (list.length === 0) {
    grid.innerHTML = `<div class="empty">No specimens match "${query}". Try another name.</div>`;
    return;
  }

  grid.innerHTML = "";
  list.slice(0, 120).forEach((p) => {
    const card = document.createElement("div");
    card.className = "card" + (selected && selected.pl_name === p.pl_name ? " selected" : "");
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `View orbit plot for ${p.pl_name}`);
    card.innerHTML = `
      <div class="card-top">
        <div>
          <div class="card-name">${p.pl_name}</div>
          <div class="card-host">${p.hostname}</div>
        </div>
        <div class="badge ${badgeClass(p._score)}">${p._score}</div>
      </div>
      <div class="card-stats">
        radius <span>${p.pl_rade ? p.pl_rade.toFixed(2) + " R⊕" : "—"}</span> ·
        eq. temp <span>${p.pl_eqt ? Math.round(p.pl_eqt) + " K" : "—"}</span><br>
        orbit <span>${p.pl_orbsmax.toFixed(3)} AU</span> ·
        distance <span>${p.sy_dist ? Math.round(p.sy_dist) + " ly" : "—"}</span>
      </div>
    `;
    card.addEventListener("click", () => selectPlanet(p));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectPlanet(p);
      }
    });
    grid.appendChild(card);
  });
}

// ---------- orbit plotter ----------

function selectPlanet(p) {
  selected = p;
  document.querySelector("#plotter-title").textContent = p.pl_name;
  document.querySelector("#plotter-sub").textContent = `orbiting ${p.hostname}`;
  drawOrbit(p);

  const { inner, outer } = habitableZone(p.st_rad, p.st_teff);
  const inZone = p.pl_orbsmax >= inner && p.pl_orbsmax <= outer;

  document.querySelector("#plotter-readout").innerHTML = `
    <div class="score-line">habitability score — <b>${p._score}</b> / 100</div>
    habitable zone: <b>${inner.toFixed(3)}–${outer.toFixed(3)} AU</b><br>
    this orbit: <b>${p.pl_orbsmax.toFixed(3)} AU</b> — ${inZone ? "inside the zone" : "outside the zone"}<br>
    star temp: <b>${p.st_teff} K</b> · star radius: <b>${p.st_rad} R☉</b><br>
    discovered: <b>${p.disc_year || "—"}</b>
  `;

  renderGrid();
}

function drawOrbit(p) {
  const svg = document.querySelector("#orbit-svg");
  const { inner, outer } = habitableZone(p.st_rad, p.st_teff);
  const cx = 140, cy = 140;
  // log scale so both very tight and very wide orbits stay visible
  const maxAU = Math.max(outer * 1.6, p.pl_orbsmax * 1.3, 0.1);
  const scaleAU = (au) => 14 + (Math.log(au + 1) / Math.log(maxAU + 1)) * 112;

  const rInner = scaleAU(inner);
  const rOuter = scaleAU(outer);
  const rPlanet = scaleAU(p.pl_orbsmax);

  svg.innerHTML = `
    <defs>
      <radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#E8A33D" stop-opacity="0.9"/>
        <stop offset="100%" stop-color="#E8A33D" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="${cx}" cy="${cy}" r="${rOuter}" fill="rgba(79,209,197,0.06)" stroke="rgba(79,209,197,0.35)" stroke-width="1" stroke-dasharray="2 3"/>
    <circle cx="${cx}" cy="${cy}" r="${rInner}" fill="#0B1120" stroke="rgba(79,209,197,0.35)" stroke-width="1" stroke-dasharray="2 3"/>
    <circle cx="${cx}" cy="${cy}" r="26" fill="url(#starGlow)"/>
    <circle cx="${cx}" cy="${cy}" r="7" fill="#E8A33D"/>
    <circle cx="${cx + rPlanet}" cy="${cy}" r="5" fill="#F4EBD9" stroke="#0B1120" stroke-width="1"/>
    <line x1="${cx}" y1="${cy}" x2="${cx + rPlanet}" y2="${cy}" stroke="rgba(244,235,217,0.25)" stroke-width="1" stroke-dasharray="1 3"/>
    <text x="${cx}" y="270" text-anchor="middle" font-family="IBM Plex Mono" font-size="9" fill="#B8AE98">teal ring = habitable zone · dot = orbit radius (log scale)</text>
  `;
}

// ---------- fetch + boot ----------

renderShell();

fetch(TAP_URL)
  .then((response) => response.json())
  .then((rows) => {
    if (!Array.isArray(rows) || rows.length === 0) throw new Error("empty response");
    DATA = rows.filter((r) => r.pl_orbsmax && r.st_teff && r.st_rad);
    DATA.forEach((p) => { p._score = score(p); });
    document.querySelector("#status").textContent = `live · ${DATA.length} planets from the archive`;
    renderGrid();
    selectPlanet(DATA.slice().sort((a, b) => b._score - a._score)[0]);
  })
  .catch((err) => {
    console.log(err);
    DATA = FALLBACK;
    DATA.forEach((p) => { p._score = score(p); });
    const statusEl = document.querySelector("#status");
    statusEl.textContent = "offline sample · archive unreachable";
    statusEl.classList.add("err");
    renderGrid();
    selectPlanet(DATA.slice().sort((a, b) => b._score - a._score)[0]);
  });
