// Map data for the home-page intro (src/components/intro): the outline of Sri Lanka, the
// Colombo and Kandy pins, the Colombo-Kandy route, and the keyframes that carry the route's
// glowing head along it. Run by hand; the output is committed.
//
//   npm run intro:map
//
// Outline: Natural Earth 1:10m admin-0 countries (public domain), cached in .cache/.
import fs from "node:fs/promises";
import path from "node:path";

const SOURCE =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson";
const CACHE = path.resolve(".cache/ne_10m_admin_0_countries.geojson");
const OUT_TS = path.resolve("src/components/intro/geo.ts");
const OUT_CSS = path.resolve("src/components/intro/intro-route.css");

const HEIGHT = 1000; // viewBox height; the width follows from the island's proportions
const TOLERANCE = 0.3; // outline simplification, in viewBox units
const ROUTE_PAD = 6; // room around the route for its stroke and the head's glow
const ROUTE_EASE = [0.4, 0, 0.2, 1]; // cubic-bezier shared by the route wipe and the head
const HEAD_STEPS = 40;

// [lat, lon]. Colombo and Kandy are the only places the intro shows. The towns between them
// lie on the expressway corridor and only bend the line; they are never drawn or named.
const COLOMBO = [6.9271, 79.8612];
const KANDY = [7.2906, 80.6337];
const CORRIDOR = [
  [7.0013, 79.953], // Kadawatha
  [7.2414, 80.1325], // Mirigama
  [7.4186, 80.331], // Pothuhera
  [7.323, 80.3918], // Rambukkana
  [7.37, 80.523], // Galagedara
];

const r1 = (n) => Math.round(n * 10) / 10;
const r2 = (n) => Math.round(n * 100) / 100;

async function loadCountries() {
  try {
    return JSON.parse(await fs.readFile(CACHE, "utf8"));
  } catch {
    console.log(`downloading ${SOURCE}`);
    const res = await fetch(SOURCE);
    if (!res.ok) throw new Error(`download failed: ${res.status}`);
    const text = await res.text();
    await fs.mkdir(path.dirname(CACHE), { recursive: true });
    await fs.writeFile(CACHE, text);
    return JSON.parse(text);
  }
}

// Douglas-Peucker on an open polyline.
function simplify(points, tolerance) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = points[a];
    const [bx, by] = points[b];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy);
    let worst = 0;
    let at = -1;
    for (let i = a + 1; i < b; i++) {
      // A closed ring starts and ends on the same point: measure from that point instead.
      const d = len
        ? Math.abs(dy * (points[i][0] - ax) - dx * (points[i][1] - ay)) / len
        : Math.hypot(points[i][0] - ax, points[i][1] - ay);
      if (d > worst) {
        worst = d;
        at = i;
      }
    }
    if (worst > tolerance) {
      keep[at] = 1;
      stack.push([a, at], [at, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

// Uniform cubic B-spline through the control points, clamped to its ends, as cubic Beziers.
// It follows the corridor without passing through every town, so the line stays one smooth
// curve, and x keeps increasing as long as the control points' x does.
function splineToBeziers(points) {
  const p = [points[0], points[0], ...points, points.at(-1), points.at(-1)];
  const mix = (a, b, c, wa, wb, wc) => [a[0] * wa + b[0] * wb + c[0] * wc, a[1] * wa + b[1] * wb + c[1] * wc];
  const out = [];
  for (let i = 0; i + 3 < p.length; i++) {
    const [a, b, c, d] = [p[i], p[i + 1], p[i + 2], p[i + 3]];
    out.push([
      mix(a, b, c, 1 / 6, 4 / 6, 1 / 6),
      mix(b, c, c, 2 / 3, 1 / 3, 0),
      mix(b, c, c, 1 / 3, 2 / 3, 0),
      mix(b, c, d, 1 / 6, 4 / 6, 1 / 6),
    ]);
  }
  return out;
}

function sampleBeziers(beziers, perSegment = 80) {
  const pts = [];
  for (const [p0, p1, p2, p3] of beziers) {
    for (let i = pts.length ? 1 : 0; i <= perSegment; i++) {
      const t = i / perSegment;
      const u = 1 - t;
      const w = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
      pts.push([
        p0[0] * w[0] + p1[0] * w[1] + p2[0] * w[2] + p3[0] * w[3],
        p0[1] * w[0] + p1[1] * w[1] + p2[1] * w[2] + p3[1] * w[3],
      ]);
    }
  }
  return pts;
}

// CSS cubic-bezier(x1, y1, x2, y2) evaluated at time t.
function ease([x1, y1, x2, y2], t) {
  const at = (s, a, b) => 3 * (1 - s) * (1 - s) * s * a + 3 * (1 - s) * s * s * b + s * s * s;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (at(mid, x1, x2) < t) lo = mid;
    else hi = mid;
  }
  return at((lo + hi) / 2, y1, y2);
}

const countries = await loadCountries();
const lka = countries.features.find((f) => f.properties.ADM0_A3 === "LKA");
if (!lka) throw new Error("Sri Lanka (ADM0_A3 = LKA) not found in the Natural Earth file");
const polygons = lka.geometry.type === "Polygon" ? [lka.geometry.coordinates] : lka.geometry.coordinates;
const rings = polygons.map((polygon) => polygon[0]); // outer rings only

// Equirectangular projection, x squeezed by cos(mid latitude) so the island keeps its shape.
let [minLon, minLat, maxLon, maxLat] = [Infinity, Infinity, -Infinity, -Infinity];
for (const ring of rings) {
  for (const [lon, lat] of ring) {
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
}
const ky = HEIGHT / (maxLat - minLat);
const kx = ky * Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
const project = ([lat, lon]) => [(lon - minLon) * kx, (maxLat - lat) * ky];
const WIDTH = r1((maxLon - minLon) * kx);

const islandPath = rings
  .map((ring) => simplify(ring.map(([lon, lat]) => project([lat, lon])), TOLERANCE))
  .filter((ring) => ring.length >= 4)
  .sort((a, b) => b.length - a.length)
  .map((ring) => {
    const [first, ...rest] = ring.slice(0, -1).map(([x, y]) => `${r1(x)} ${r1(y)}`);
    return `M ${first} L ${rest.join(" ")} Z`;
  })
  .join(" ");

const colombo = project(COLOMBO).map(r1);
const kandy = project(KANDY).map(r1);
const control = [colombo, ...CORRIDOR.map(project), kandy];
const beziers = splineToBeziers(control);
const routePath =
  `M ${r1(beziers[0][0][0])} ${r1(beziers[0][0][1])} ` +
  beziers.map(([, a, b, c]) => `C ${r1(a[0])} ${r1(a[1])}, ${r1(b[0])} ${r1(b[1])}, ${r1(c[0])} ${r1(c[1])}`).join(" ");

const samples = sampleBeziers(beziers);
for (let i = 1; i < samples.length; i++) {
  if (samples[i][0] <= samples[i - 1][0]) throw new Error("route must run strictly left to right for the wipe reveal");
}
const yAt = (x) => {
  if (x <= samples[0][0]) return samples[0][1];
  for (let i = 1; i < samples.length; i++) {
    if (samples[i][0] >= x) {
      const [x0, y0] = samples[i - 1];
      const [x1, y1] = samples[i];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return samples.at(-1)[1];
};

const minX = samples[0][0];
const maxX = samples.at(-1)[0];
const minY = Math.min(...samples.map((p) => p[1]));
const maxY = Math.max(...samples.map((p) => p[1]));
const box = {
  x: r1(minX - ROUTE_PAD),
  y: r1(minY - ROUTE_PAD),
  width: r1(maxX - minX + ROUTE_PAD * 2),
  height: r1(maxY - minY + ROUTE_PAD * 2),
};

// The head rides the wipe's leading edge, so the line never shows ahead of it or lags behind.
const frames = [];
for (let i = 0; i <= HEAD_STEPS; i++) {
  const t = i / HEAD_STEPS;
  const edge = box.x + ease(ROUTE_EASE, t) * box.width;
  const x = Math.min(Math.max(edge, minX), maxX);
  const px = r2(((x - box.x) / box.width) * 100);
  const py = r2(((yAt(x) - box.y) / box.height) * 100);
  frames.push(`  ${r2(t * 100)}% {\n    transform: translate(${px}%, ${py}%);\n  }`);
}

const ts = `// Generated by scripts/build-intro-map.mjs - DO NOT EDIT MANUALLY
// Natural Earth 1:10m admin-0 outline of Sri Lanka, equirectangular projection with
// cos(latitude) correction into the viewBox below.

export const VIEW_BOX = { width: ${WIDTH}, height: ${HEIGHT} } as const;

export const COLOMBO = { x: ${colombo[0]}, y: ${colombo[1]} } as const;
export const KANDY = { x: ${kandy[0]}, y: ${kandy[1]} } as const;

// Midpoint of the two pins: where the camera settles after the push-in.
export const CAMERA_FOCUS = { x: ${r1((colombo[0] + kandy[0]) / 2)}, y: ${r1((colombo[1] + kandy[1]) / 2)} } as const;

// Colombo to Kandy along the expressway corridor. x increases all the way.
export const ROUTE_PATH =
  "${routePath}";

// The route's bounding box plus padding: the box the wipe and the head travel in.
export const ROUTE_BOX = { x: ${box.x}, y: ${box.y}, width: ${box.width}, height: ${box.height} } as const;

export const ISLAND_PATH =
  "${islandPath}";
`;

const css = `/* Generated by scripts/build-intro-map.mjs - DO NOT EDIT MANUALLY */

#rvl-intro {
  --intro-route-ease: cubic-bezier(${ROUTE_EASE.join(", ")});
}

/* Position of the route's head as a percentage of the route box, one step per ${r2(100 / HEAD_STEPS)}% of the
   time, with the easing above baked in. Play it with a linear timing function. */
@keyframes intro-head-travel {
${frames.join("\n")}
}
`;

await fs.writeFile(OUT_TS, ts);
await fs.writeFile(OUT_CSS, css);
console.log(`viewBox 0 0 ${WIDTH} ${HEIGHT}; Colombo ${colombo}; Kandy ${kandy}`);
console.log(`route box ${JSON.stringify(box)}; outline ${islandPath.length} chars`);
console.log(`wrote ${path.relative(".", OUT_TS)} and ${path.relative(".", OUT_CSS)}`);
