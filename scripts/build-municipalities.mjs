/**
 * Rebuild src/data/municipalities.json from the geoBoundaries BIH release.
 *
 *   node scripts/build-municipalities.mjs <dir containing the .geojson files>
 *
 * Reads ADM3 (municipalities) for the shapes and ADM2 (cantons, plus Republika
 * Srpska and Brčko as their own units) for the grouping, and assigns each
 * municipality to a region by sampling its interior — geoBoundaries carries no
 * parent link in the properties, so the hierarchy has to be recovered
 * geometrically.
 *
 * Alias lists are this project's own editorial data and live in
 * scripts/municipality-index.json.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "../src/data/municipalities.json");

/* ── corrections to the source data ─────────────────────────────────────── */

/**
 * One ADM3 feature carries the name of an entity rather than a municipality.
 * It is Višegrad: the polygon contains the town, and its area (~465 km²)
 * matches Višegrad's 448 km². Without this the municipality vanishes.
 */
const MISLABELLED = { "Republika Srpska": "Višegrad" };

/** geoBoundaries spellings that differ from the ones this project uses. */
const RENAME = {
  "Brcko District": "Brčko",
  "Kupra na Uni": "Krupa na Uni",      // misspelling of Krupa na Uni
  "Doboj East": "Doboj-Istok",
  "Doboj Jug": "Doboj-Jug",
  "Ustiprača": "Novo Goražde",
  "Trnovo (BiH)": "Trnovo (FBiH)",
  "Kupres (BiH)": "Kupres",            // geoBoundaries suffixes the Federation
  "Kupres": "Kupres (RS)",             // one; this project suffixes the RS one
  "Centar": "Centar Sarajevo",
  "Stari Grad": "Stari Grad Sarajevo",
};

/**
 * Regions the spatial join gets wrong. Istočni Stari Grad lies entirely inside
 * geoBoundaries' Sarajevo Canton polygon, but it is one of the six East
 * Sarajevo municipalities and belongs to Republika Srpska. Every other one of
 * the 142 agrees with the previous, hand-checked dataset.
 */
const REGION_FIX = { "Istočni Stari Grad": "RS" };

const REGION_CODE = {
  "Una-Sana Canton": "USK", "Posavina Canton": "PK", "Tuzla Canton": "TK",
  "Zenica-Doboj Canton": "ZDK", "Bosnian-Podrinje Canton Goražde": "BPK",
  "Central Bosnia Canton": "SBK", "Herzegovina-Neretva Canton": "HNK",
  "West Herzegovina Canton": "ZHK", "Sarajevo Canton": "KS", "Canton 10": "K10",
  "Republika Srpska": "RS", "Brcko District": "BD",
};

/* ── geometry ───────────────────────────────────────────────────────────── */

const polygonsOf = (g) =>
  g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];

function inRing(ring, [x, y]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-12) + xi) inside = !inside;
  }
  return inside;
}

/** Honours interior rings, so a point in a hole is not counted as inside. */
const inPolygon = (poly, p) => inRing(poly[0], p) && !poly.slice(1).some((h) => inRing(h, p));
const covers = (geometry, p) => polygonsOf(geometry).some((poly) => inPolygon(poly, p));

function ringArea(ring) {
  let a = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x0, y0] = ring[i];
    const [x1, y1] = ring[(i + 1) % ring.length];
    a += x0 * y1 - x1 * y0;
  }
  return Math.abs(a) / 2;
}

function boundsOf(geometry) {
  const pts = polygonsOf(geometry).flat(2);
  return [
    Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])),
    Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1])),
  ];
}

/** Points spread through the interior, for area-weighted region assignment. */
function interiorSamples(geometry, n = 24) {
  const [x0, y0, x1, y1] = boundsOf(geometry);
  const out = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const p = [x0 + ((x1 - x0) * (i + 0.5)) / n, y0 + ((y1 - y0) * (j + 0.5)) / n];
      if (covers(geometry, p)) out.push(p);
    }
  }
  if (out.length) return out;
  const biggest = polygonsOf(geometry).map((q) => q[0]).sort((a, b) => ringArea(b) - ringArea(a))[0];
  return [biggest[0]];
}

/** Spherical Mercator: keeps local shape true, which is what a map wants. */
const project = ([lon, lat]) => [lon, (Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) * 180) / Math.PI];

function segmentDistance(p, a, b) {
  let [x, y] = a;
  const dx = b[0] - x;
  const dy = b[1] - y;
  if (dx !== 0 || dy !== 0) {
    const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) [x, y] = b;
    else if (t > 0) [x, y] = [x + dx * t, y + dy * t];
  }
  return Math.hypot(p[0] - x, p[1] - y);
}

/** Douglas–Peucker, iterative: the rings are long enough to blow a recursion. */
function simplify(points, tolerance) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    let index = -1;
    let max = tolerance;
    for (let i = first + 1; i < last; i++) {
      const d = segmentDistance(points[i], points[first], points[last]);
      if (d > max) [index, max] = [i, d];
    }
    if (index === -1) continue;
    keep[index] = 1;
    stack.push([first, index], [index, last]);
  }
  return points.filter((_, i) => keep[i]);
}

function labelPoint(rings) {
  const biggest = rings.slice().sort((a, b) => ringArea(b) - ringArea(a))[0];
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < biggest.length; i++) {
    const [x0, y0] = biggest[i];
    const [x1, y1] = biggest[(i + 1) % biggest.length];
    const cross = x0 * y1 - x1 * y0;
    a += cross; cx += (x0 + x1) * cross; cy += (y0 + y1) * cross;
  }
  a *= 0.5;
  const centroid = [cx / (6 * a), cy / (6 * a)];
  if (inRing(biggest, centroid)) return centroid;

  const xs = biggest.map((p) => p[0]);
  const ys = biggest.map((p) => p[1]);
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
  let best = centroid;
  let clearance = -1;
  for (let i = 0; i < 32; i++) {
    for (let j = 0; j < 32; j++) {
      const p = [x0 + ((x1 - x0) * (i + 0.5)) / 32, y0 + ((y1 - y0) * (j + 0.5)) / 32];
      if (!inRing(biggest, p)) continue;
      const d = Math.min(...biggest.map((q) => Math.hypot(q[0] - p[0], q[1] - p[1])));
      if (d > clearance) [best, clearance] = [p, d];
    }
  }
  return best;
}

/* ── build ──────────────────────────────────────────────────────────────── */

const TOLERANCE = 0.28;   // SVG units, well under a pixel at the country view
const ORIGIN = [21, 130];
const WIDTH = 777;
const round = (n) => Math.round(n * 10) / 10;

const dir = process.argv[2];
if (!dir) {
  console.error("usage: node scripts/build-municipalities.mjs <dir with geoBoundaries-BIH-ADM*.geojson>");
  process.exit(1);
}
const read = (level) => JSON.parse(readFileSync(join(dir, `geoBoundaries-BIH-${level}.geojson`), "utf8")).features;
const adm2 = read("ADM2");
const adm3 = read("ADM3");

const unknownRegions = adm2.map((f) => f.properties.shapeName).filter((n) => !REGION_CODE[n]);
if (unknownRegions.length) {
  console.error("! unrecognised ADM2 names:", unknownRegions);
  process.exit(1);
}
const regions = adm2.map((f) => ({
  code: REGION_CODE[f.properties.shapeName],
  geometry: f.geometry,
  bounds: boundsOf(f.geometry),
}));

const index = JSON.parse(readFileSync(join(HERE, "municipality-index.json"), "utf8"));

const features = adm3.map((f) => {
  const raw = f.properties.shapeName;
  const name = MISLABELLED[raw] ?? RENAME[raw] ?? raw;

  /* Region by majority of sampled interior area, not a single point: a
     centroid can sit in a neighbour across a concave border. */
  const tally = new Map();
  for (const p of interiorSamples(f.geometry)) {
    for (const r of regions) {
      if (p[0] < r.bounds[0] || p[0] > r.bounds[2] || p[1] < r.bounds[1] || p[1] > r.bounds[3]) continue;
      if (covers(r.geometry, p)) tally.set(r.code, (tally.get(r.code) ?? 0) + 1);
    }
  }
  const region = [...tally].sort((a, b) => b[1] - a[1])[0]?.[0];
  return { raw, name, region, geometry: f.geometry };
});

/* "Novi Grad" is two municipalities; the region tells them apart. */
for (const f of features) {
  if (f.raw === "Novi Grad" && f.region === "KS") f.name = "Novi Grad Sarajevo";
}
for (const f of features) {
  const fix = REGION_FIX[f.name];
  if (fix) f.region = fix;
}

const noRegion = features.filter((f) => !f.region);
if (noRegion.length) {
  console.error("! no region found for:", noRegion.map((f) => f.name));
  process.exit(1);
}

/* One transform for every shape, so they stay registered to each other. */
const all = features.flatMap((f) => polygonsOf(f.geometry).flat(2)).map(project);
const [minX, maxX] = [Math.min(...all.map((p) => p[0])), Math.max(...all.map((p) => p[0]))];
const [minY, maxY] = [Math.min(...all.map((p) => p[1])), Math.max(...all.map((p) => p[1]))];
const scale = WIDTH / (maxX - minX);
const toSvg = ([x, y]) => [ORIGIN[0] + (x - minX) * scale, ORIGIN[1] + (maxY - y) * scale];

const records = features.map((f) => {
  const rings = polygonsOf(f.geometry)
    .flat()
    .map((ring) => simplify(ring.map((p) => toSvg(project(p))), TOLERANCE))
    .filter((ring) => ring.length >= 3);
  const path = rings.map((r) => "M" + r.map(([x, y]) => `${round(x)},${round(y)}`).join("L") + "Z").join("");
  const pts = rings.flat();
  const bbox = [
    round(Math.min(...pts.map((p) => p[0]))), round(Math.min(...pts.map((p) => p[1]))),
    round(Math.max(...pts.map((p) => p[0]))), round(Math.max(...pts.map((p) => p[1]))),
  ];
  const [lx, ly] = labelPoint(rings);
  return [f.name, f.region, bbox, [round(lx), round(ly)], path, index[f.name]?.aliases ?? []];
});
records.sort((a, b) => a[0].localeCompare(b[0]));

const names = new Set(records.map((r) => r[0]));
const lost = Object.keys(index).filter((n) => !names.has(n));
const gained = [...names].filter((n) => !index[n]);

const tally = {};
for (const r of records) tally[r[1]] = (tally[r[1]] ?? 0) + 1;
console.log(`ADM3 features   ${adm3.length}`);
console.log(`municipalities  ${records.length}`);
console.log(`by region       ${JSON.stringify(tally)}`);
console.log(`COUNTRY_BOX     [${ORIGIN[0]}, ${ORIGIN[1]}, ${ORIGIN[0] + WIDTH}, ${round(ORIGIN[1] + (maxY - minY) * scale)}]`);
if (lost.length) console.error(`\n! dropped since last build: ${lost.join(", ")}`);
if (gained.length) console.error(`! new since last build (no aliases yet): ${gained.join(", ")}`);
if (lost.length && !process.env.ALLOW_LOSS) {
  console.error("  Set ALLOW_LOSS=1 to build anyway. Not writing.");
  process.exit(1);
}

writeFileSync(OUT, "[\n" + records.map((r) => JSON.stringify(r)).join(",\n") + "\n]\n");
console.log(`\nwrote ${OUT} (${(readFileSync(OUT).length / 1024).toFixed(0)} kB)`);
