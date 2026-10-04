"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { MAP_SIZE, type Lot } from "@/lib/lots";

// Development-only calibration overlay: /?debug=map
// Shows every polygon in magenta and records clicked map coordinates.
export function MapDebug({ lots }: { lots: Pick<Lot, "id" | "polygon">[] }) {
  const params = useSearchParams();
  const [points, setPoints] = useState<[number, number][]>([]);
  if (params.get("debug") !== "map") return null;

  return (
    <>
      <svg
        viewBox={`0 0 ${MAP_SIZE.width} ${MAP_SIZE.height}`}
        className="absolute inset-0 z-20 aspect-[3/2] w-full cursor-crosshair"
        onClick={(e) => {
          const svg = e.currentTarget;
          const ctm = svg.getScreenCTM();
          if (!ctm) return;
          const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
          setPoints((prev) => [...prev, [Math.round(p.x), Math.round(p.y)]]);
        }}
      >
        {lots.map((l) => (
          <g key={l.id}>
            <polygon points={l.polygon.map((p) => p.join(",")).join(" ")} fill="rgba(255,0,255,.12)" stroke="#f0f" strokeWidth={2} />
            {l.polygon.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={4} fill="#f0f" />
            ))}
            <text x={l.polygon[0][0] + 6} y={l.polygon[0][1] + 18} fill="#f0f" fontSize={18} fontWeight={700}>
              {l.id}
            </text>
          </g>
        ))}
        {points.length > 1 && <polyline points={points.map((p) => p.join(",")).join(" ")} fill="none" stroke="#0ff" strokeWidth={2} />}
        {points.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={5} fill="#0ff" />
        ))}
      </svg>
      <div className="absolute right-2 bottom-2 z-30 max-w-md rounded-lg bg-black/80 p-3 font-mono text-[11px] text-white">
        <p className="break-all">[{points.map((p) => `[${p.join(", ")}]`).join(", ")}]</p>
        <button type="button" className="mt-2 underline" onClick={() => setPoints([])}>clear</button>
      </div>
    </>
  );
}
