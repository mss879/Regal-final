/* eslint-disable @next/next/no-img-element -- Satori (next/og) renders plain <img> elements. */
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// One branded template for every share image (1200 × 630): forest card, lime eyebrow, Jost
// headline with a Cormorant italic accent, and a rounded photo — the same language as the
// page heroes. Each page folder has a thin opengraph-image.tsx that calls renderOg().
// Images are prerendered at build time; assets are read from the repo (src/assets/og, public/).

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const COLORS = { forest: "#12231a", forest2: "#1b3326", lime: "#c5dc9f", paper: "#faf7f1", sage: "#a8b7a1", sage2: "#c9d3c3" };

// Paths are scoped to their folders so the build only traces those files (a fully dynamic
// path would pull the whole project, public/ included, into the server bundle).
const asset = (name: string) => readFile(join(process.cwd(), "src/assets/og", name));
const toUri = (buf: Buffer, mime: string) => `data:${mime};base64,${buf.toString("base64")}`;
// Photos are only read while share images are prerendered at build time, so they are left
// out of the server trace on purpose.
const photo = (publicPath: string) => readFile(join(/* turbopackIgnore: true */ process.cwd(), "public", publicPath));

const assets = Promise.all([
  asset("fonts/jost-300.woff"),
  asset("fonts/jost-400.woff"),
  asset("fonts/jost-500.woff"),
  asset("fonts/cormorant-400-italic.woff"),
  asset("logo-paper.png").then((b) => toUri(b, "image/png")),
  asset("emblem-lime.png").then((b) => toUri(b, "image/png")),
]);

type Options = {
  eyebrow: string;
  title: string;
  /** Second line, set in the serif italic. */
  accent?: string;
  /** Small line under the title (e.g. villa facts). */
  detail?: string;
  /** Photo from public/, e.g. "/images/lots/lot-09/hero.jpg". Omit for the emblem panel. */
  image?: string;
};

const PHOTO = { width: 470, height: 566 };

export async function renderOg({ eyebrow, title, accent, detail, image }: Options) {
  const [jost300, jost400, jost500, cormorant, logo, emblem] = await assets;
  const picture = image ? toUri(await photo(image), "image/jpeg") : null;
  const longest = Math.max(title.length, (accent ?? "").length);
  const size = longest > 24 ? 54 : longest > 16 ? 62 : 72;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          padding: 32,
          backgroundColor: COLORS.forest,
          backgroundImage: "radial-gradient(circle at 0% 100%, rgba(92,140,69,0.42) 0%, rgba(18,35,26,0) 58%)",
          color: COLORS.paper,
          fontFamily: "Jost",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, padding: "26px 40px 22px 34px" }}>
          {/* logo-paper.png is 351 × 150 */}
          <img src={logo} width={164} height={70} alt="" />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", color: COLORS.lime, fontSize: 17, fontWeight: 500, letterSpacing: 4.4, textTransform: "uppercase" }}>
              <div style={{ width: 9, height: 9, borderRadius: 9, backgroundColor: COLORS.lime, marginRight: 14 }} />
              {eyebrow}
            </div>
            <div style={{ display: "flex", marginTop: 26, fontSize: size, fontWeight: 300, lineHeight: 0.98, letterSpacing: -1.6, textTransform: "uppercase" }}>
              {title}
            </div>
            {accent && (
              <div style={{ display: "flex", marginTop: 8, fontFamily: "Cormorant", fontStyle: "italic", fontSize: size * 1.08, lineHeight: 1.02, color: COLORS.lime }}>
                {accent}
              </div>
            )}
            {detail && <div style={{ display: "flex", marginTop: 26, fontSize: 22, fontWeight: 400, color: COLORS.sage2 }}>{detail}</div>}
          </div>
          <div style={{ display: "flex", alignItems: "center", fontSize: 19, fontWeight: 400, letterSpacing: 1.2, color: COLORS.sage }}>
            {/* emblem-lime.png is 205 × 240 */}
            <img src={emblem} width={22} height={26} alt="" style={{ marginRight: 14 }} />
            regalvictorialakeside.com
          </div>
        </div>
        {picture ? (
          <div style={{ display: "flex", ...PHOTO, borderRadius: 26, overflow: "hidden" }}>
            <img src={picture} {...PHOTO} alt="" style={{ objectFit: "cover", width: "100%", height: "100%" }} />
          </div>
        ) : (
          <div style={{ display: "flex", ...PHOTO, borderRadius: 26, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.forest2 }}>
            <img src={emblem} width={205} height={240} alt="" />
          </div>
        )}
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Jost", data: jost300, weight: 300, style: "normal" },
        { name: "Jost", data: jost400, weight: 400, style: "normal" },
        { name: "Jost", data: jost500, weight: 500, style: "normal" },
        { name: "Cormorant", data: cormorant, weight: 400, style: "italic" },
      ],
    },
  );
}
