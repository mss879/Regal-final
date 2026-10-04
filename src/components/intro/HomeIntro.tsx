import type { CSSProperties } from "react";
import { INTRO_EXIT_EVENT, INTRO_ID, INTRO_PLAYED_KEY, INTRO_READY_EVENT } from "@/lib/intro";
import { CAMERA_FOCUS, COLOMBO, ISLAND_PATH, KANDY, ROUTE_BOX, ROUTE_PATH, VIEW_BOX } from "./geo";
import { InlineScript } from "./InlineScript";
import "./intro-route.css";
import "./intro.css";

// The home-page intro: the island with "Sri Lanka", a push-in on Colombo and Kandy, a line
// travelling between them, the expressway with its "1.5 hours" sign, then the hero.
//
// It is plain HTML animated by CSS (intro.css), so it paints with the first frame and keeps
// running smoothly while the page hydrates underneath. The script at the bottom decides,
// before first paint, whether it plays at all: once per session, on a hard load of the home
// page, never for visitors who prefer reduced motion. /?intro replays it.

// Measured from the photographs in public/intro (see scripts/build-intro-plate.mjs): frame
// size, vanishing point as a fraction of the frame, and how far each solid edge line runs
// sideways per unit of drop below the vanishing point.
type Plate = { width: number; height: number; vp: readonly [number, number]; left: number; right: number };
const LANDSCAPE: Plate = { width: 1344, height: 752, vp: [0.5575, 0.4222], left: -2.294, right: 2.769 };
const PORTRAIT: Plate = { width: 752, height: 1344, vp: [0.4981, 0.4271], left: -1.299, right: 2.074 };

// Real-world sizes, in metres. The edge lines give the scale of each photograph.
const CARRIAGEWAY = 7.2; // between the edge lines: two 3.6 m lanes
const DASH = { period: 9, width: 0.12 }; // a 2 m lane dash every 9 m

const r = (n: number) => Math.round(n * 1000) / 1000;

// What intro.css needs to know about a photograph. Lengths are in camera heights: the
// distance between the edge lines is CARRIAGEWAY metres and (right - left) camera heights.
function plateVars(prefix: string, plate: Plate) {
  const metres = CARRIAGEWAY / (plate.right - plate.left);
  return {
    [`--${prefix}-pa`]: r(plate.height / plate.width),
    [`--${prefix}-px`]: plate.vp[0],
    [`--${prefix}-py`]: plate.vp[1],
    [`--${prefix}-mid`]: r((plate.left + plate.right) / 2),
    [`--${prefix}-period`]: r(DASH.period / metres),
    [`--${prefix}-dash`]: r(DASH.width / metres),
  };
}

// Positions on the map, in map units from the point the camera settles on.
const MAP_VARS = {
  "--ix": r(-CAMERA_FOCUS.x),
  "--iy": r(-CAMERA_FOCUS.y),
  "--iw": VIEW_BOX.width,
  "--ih": VIEW_BOX.height,
  "--cdx": r(COLOMBO.x - CAMERA_FOCUS.x),
  "--cdy": r(COLOMBO.y - CAMERA_FOCUS.y),
  "--kdx": r(KANDY.x - CAMERA_FOCUS.x),
  "--kdy": r(KANDY.y - CAMERA_FOCUS.y),
  "--rx": r(ROUTE_BOX.x - CAMERA_FOCUS.x),
  "--ry": r(ROUTE_BOX.y - CAMERA_FOCUS.y),
  "--rw": ROUTE_BOX.width,
  "--rh": ROUTE_BOX.height,
} as CSSProperties;

const PLATE_VARS = { ...plateVars("l", LANDSCAPE), ...plateVars("p", PORTRAIT) } as CSSProperties;

const CLOCK_ANIMATION = "intro-clock"; // the marker animation in intro.css
const FONT_WAIT = 400; // ms: longest the clock waits for the title's font
const BACKSTOP = 7000; // ms after the clock starts: dissolve even if the hero never reported ready
const EXIT = 600; // ms: the dissolve, plus a margin

const SCRIPT = `(function () {
  var el = document.getElementById("${INTRO_ID}");
  if (!el) return;
  try {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var played = false;
    try { played = !!sessionStorage.getItem("${INTRO_PLAYED_KEY}"); } catch (e) {}
    var forced = new URLSearchParams(location.search).has("intro");
    if (!forced && (played || location.hash.length > 1)) return;
    try { sessionStorage.setItem("${INTRO_PLAYED_KEY}", "1"); } catch (e) {}

    var ready = false, clock = false, exiting = false;
    function exit() {
      if (exiting) return;
      exiting = true;
      el.setAttribute("data-state", "exit");
      window.dispatchEvent(new Event("${INTRO_EXIT_EVENT}"));
      setTimeout(function () { el.setAttribute("data-state", "done"); }, ${EXIT});
    }
    function tryExit() { if (ready && clock) exit(); }
    function go() {
      if (el.hasAttribute("data-go")) return;
      el.setAttribute("data-go", "");
      setTimeout(exit, ${BACKSTOP});
    }
    window.addEventListener("${INTRO_READY_EVENT}", function () { ready = true; tryExit(); });
    el.addEventListener("animationend", function (e) {
      if (e.animationName === "${CLOCK_ANIMATION}") { clock = true; tryExit(); }
    });

    el.setAttribute("data-state", "play");

    // Start the clock when the title's font is in, so it never swaps mid-reveal.
    setTimeout(go, ${FONT_WAIT});
    try {
      var family = getComputedStyle(el.querySelector(".intro-title")).fontFamily;
      document.fonts.load("300 48px " + family, "SRI LANKA").then(go, go);
    } catch (e) { go(); }

    // Decode the expressway photograph ahead of its scene, then let it show.
    var plate = el.querySelector(".intro-plate");
    if (plate) {
      var show = function () { el.setAttribute("data-plate", ""); };
      var decode = function () { plate.decode ? plate.decode().then(show, show) : show(); };
      if (plate.complete && plate.naturalWidth) decode();
      else plate.addEventListener("load", decode, { once: true });
    }
  } catch (e) {
    el.removeAttribute("data-state");
  }
})();`;

// Stands in for the photograph until it has loaded: the same road, drawn in the same place.
function Backdrop({ plate, id }: { plate: Plate; id: "l" | "p" }) {
  const { width: w, height: h } = plate;
  const vx = r(plate.vp[0] * w);
  const vy = r(plate.vp[1] * h);
  const drop = h - vy;
  const left = r(vx + plate.left * drop);
  const right = r(vx + plate.right * drop);
  const line = r(drop * 0.055); // an edge line's width where it leaves the frame
  const ridge = (heights: number[], scale: number) =>
    heights.map((y, i) => `${r((i / (heights.length - 1)) * w)},${r(vy - y * vy * scale)}`).join(" ");
  return (
    <svg className={`intro-back intro-back-${id}`} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`intro-sky-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4f8fd0" />
          <stop offset="0.6" stopColor="#a4c8e6" />
          <stop offset="1" stopColor="#e6eff2" />
        </linearGradient>
        <linearGradient id={`intro-verge-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4d7a3a" />
          <stop offset="0.25" stopColor="#7ea646" />
          <stop offset="1" stopColor="#66913b" />
        </linearGradient>
        <linearGradient id={`intro-road-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8d9195" />
          <stop offset="0.3" stopColor="#5d6064" />
          <stop offset="1" stopColor="#404245" />
        </linearGradient>
      </defs>
      <rect width={w} height={vy + 2} fill={`url(#intro-sky-${id})`} />
      <polygon points={`0,${vy} ${ridge([0.3, 0.42, 0.3, 0.26, 0.2, 0.3, 0.44, 0.5, 0.38], 0.5)} ${w},${vy}`} fill="#7f9fbb" />
      <polygon points={`0,${vy} ${ridge([0.2, 0.26, 0.16, 0.1, 0.06, 0.12, 0.2, 0.24, 0.2], 0.5)} ${w},${vy}`} fill="#4c7a63" />
      <rect y={vy - 1} width={w} height={drop + 1} fill={`url(#intro-verge-${id})`} />
      <polygon points={`${vx},${vy} ${right},${h} ${left},${h}`} fill={`url(#intro-road-${id})`} />
      <polygon points={`${vx},${vy} ${left},${h} ${r(left + line)},${h}`} fill="#eceee8" />
      <polygon points={`${vx},${vy} ${r(right - line)},${h} ${right},${h}`} fill="#eceee8" />
    </svg>
  );
}

export function HomeIntro() {
  const viewBox = `0 0 ${VIEW_BOX.width} ${VIEW_BOX.height}`;
  return (
    <>
      <div id={INTRO_ID} aria-hidden="true" suppressHydrationWarning style={MAP_VARS}>
        {/* The expressway sits underneath from the start, so it is painted before the map opens onto it. */}
        <div className="intro-hwy" style={PLATE_VARS}>
          <div className="intro-hwy-anchor">
            <div className="intro-hwy-exit">
              <div className="intro-hwy-arrive">
                <div className="intro-hwy-cruise">
                  <Backdrop plate={LANDSCAPE} id="l" />
                  <Backdrop plate={PORTRAIT} id="p" />
                  {/* Pre-sized static files, art-directed per orientation and fetched only when the
                      overlay is shown: next/image would add a round trip through the optimizer. */}
                  <picture>
                    <source media="(max-aspect-ratio: 4/5)" type="image/avif" srcSet="/intro/expressway-portrait.avif" />
                    <source media="(max-aspect-ratio: 4/5)" type="image/webp" srcSet="/intro/expressway-portrait.webp" />
                    <source type="image/avif" srcSet="/intro/expressway-landscape.avif" />
                    <img
                      className="intro-plate"
                      src="/intro/expressway-landscape.webp"
                      alt=""
                      loading="lazy"
                      decoding="async"
                      fetchPriority="low"
                    />
                  </picture>
                  <div className="intro-eye">
                    <div className="intro-ground">
                      <div className="intro-lane" />
                    </div>
                  </div>
                  <div className="intro-sign-rig">
                    <div className="intro-sign-exit">
                      <div className="intro-sign">
                        <span className="intro-sign-post" />
                        <span className="intro-sign-post" />
                        <div className="intro-sign-board">
                          <div className="intro-sign-top">
                            Colombo
                            <svg viewBox="0 0 34 20">
                              <path d="M2 10h29M22 2.5 31 10l-9 7.5" />
                            </svg>
                            Kandy
                          </div>
                          <div className="intro-sign-main">1.5 hours</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="intro-hwy-grade" />
        </div>

        <div className="intro-map">
          <div className="intro-map-a">
            <svg className="intro-island" viewBox={viewBox}>
              <path id="intro-island-path" d={ISLAND_PATH} />
            </svg>
          </div>
          <div className="intro-map-b">
            <svg className="intro-island" viewBox={viewBox}>
              <rect className="intro-sea" x={-VIEW_BOX.width * 4} y={-VIEW_BOX.height * 4} width={VIEW_BOX.width * 9} height={VIEW_BOX.height * 9} />
              <use href="#intro-island-path" />
            </svg>
            <div className="intro-route">
              <div className="intro-route-in">
                <svg viewBox={`${ROUTE_BOX.x} ${ROUTE_BOX.y} ${ROUTE_BOX.width} ${ROUTE_BOX.height}`}>
                  <path d={ROUTE_PATH} />
                </svg>
              </div>
            </div>
            <div className="intro-head-carrier">
              <span className="intro-head" />
            </div>
            <div className="intro-pin intro-pin-colombo">
              <span className="intro-pin-dot" />
            </div>
            <div className="intro-pin intro-pin-kandy">
              <span className="intro-ring" />
              <span className="intro-ring intro-ring-2" />
              <span className="intro-pin-dot" />
            </div>
            <p className="intro-label intro-label-colombo">Colombo</p>
            <p className="intro-label intro-label-kandy">Kandy</p>
          </div>
          <p className="intro-title">
            <span className="intro-title-out">
              <span className="intro-title-line">
                <span>Sri</span>
              </span>{" "}
              <span className="intro-title-line">
                <span>Lanka</span>
              </span>
            </span>
          </p>
        </div>

        <i className="intro-clock" />
      </div>
      <InlineScript html={SCRIPT} />
    </>
  );
}
