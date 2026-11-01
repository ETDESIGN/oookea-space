"use client";

/**
 * Atelier Pulse — the login page's default left-panel visual.
 * Live data from the portal (client + project counts, project slugs) drawn
 * as slowly orbiting nodes around the Oookea mark, with a soft radar ping.
 * CSS-only motion, honors prefers-reduced-motion.
 * When a typed email matches a client with a gallery, the login page shows
 * that gallery instead (per-client mode) — this is the atelier default.
 */

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

interface PulseData {
  clientCount: number;
  projects: Array<{ slug: string }>;
}

const RINGS = [
  { size: 100, dur: 130, dir: "normal" as const, capacity: 5 },
  { size: 74, dur: 95, dir: "reverse" as const, capacity: 4 },
  { size: 48, dur: 70, dir: "normal" as const, capacity: 3 },
];

function prettify(slug: string): string {
  if (slug === "caneles-hk") return "caneles.hk";
  const words = slug
    .split("-")
    .filter((w) => w && !/^\d{4,}$/.test(w)) // strip timestamp-ish tokens
    .slice(0, 3)
    .join(" ");
  return words || "atelier";
}

export function AtelierPulse() {
  const pulse = useQuery(api.projects.getAtelierPulse, {}) as PulseData | undefined;
  const slugs = (pulse?.projects ?? []).map((p) => p.slug).filter(Boolean);

  // distribute nodes across rings, evenly per ring with a staggered offset
  const perRing: string[][] = RINGS.map(() => []);
  slugs.forEach((s, i) => perRing[i % RINGS.length].push(s));

  return (
    <div className="absolute inset-0 bg-gradient-to-br from-[#111114] via-[#0A0A0B] to-[#15121f]">
      {/* faint oversized watermark */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none">
        <span className="font-display text-[280px] font-black leading-none text-white/[0.03]">O</span>
      </div>

      {/* stage */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="ap-anim relative aspect-square w-[min(72vh,44vw)]">
          {/* radar pings */}
          {[0, 2.4, 4.8].map((delay, i) => (
            <span
              key={i}
              className="ap-ping absolute left-1/2 top-1/2 h-full w-full rounded-full border border-[#6366F1]/25"
              style={{ animation: `ap-ping 7.2s ease-out ${delay}s infinite` }}
            />
          ))}

          {/* rings + orbiting nodes */}
          {RINGS.map((ring, ri) => (
            <div key={ri} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: `${ring.size}%`, height: `${ring.size}%` }}>
              <div className="absolute inset-0 rounded-full border border-white/[0.05]" />
              <div
                className="absolute inset-0"
                style={{ animation: `ap-spin ${ring.dur}s linear infinite ${ring.dir === "reverse" ? "reverse" : ""}` }}
              >
                {(perRing[ri] ?? []).map((slug, ni) => {
                  const angle = (ni / Math.max(1, perRing[ri].length)) * 2 * Math.PI + (ri * 0.55);
                  const x = 50 + 50 * Math.cos(angle);
                  const y = 50 + 50 * Math.sin(angle);
                  return (
                    <div key={slug} className="absolute" style={{ left: `${x}%`, top: `${y}%` }}>
                      <div className="-translate-x-1/2 -translate-y-1/2">
                        <span className="block h-2 w-2 rounded-full bg-[#818CF8] shadow-[0_0_12px_2px_rgba(99,102,241,0.45)]" />
                      </div>
                      <div
                        className="absolute left-1/2 top-1.5 -translate-x-1/2 whitespace-nowrap"
                        style={{ animation: `ap-counter ${ring.dur}s linear infinite ${ring.dir === "reverse" ? "reverse" : ""}` }}
                      >
                        <span className="text-[10px] tracking-wide text-white/40">{prettify(slug)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* center mark */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="absolute -inset-10 rounded-full bg-[#6366F1]/10 blur-2xl" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#4F46E5] shadow-lg shadow-[#6366F1]/40">
              <span className="font-display text-2xl font-bold text-white">O</span>
            </div>
          </div>
        </div>
      </div>

      {/* footer — live counts */}
      <div className="absolute bottom-8 left-8 right-8">
        <p className="font-display text-lg font-semibold text-white/90">Oookea</p>
        <p className="mt-1 text-xs text-white/40">
          Digital Atelier
          {pulse ? (
            <>
              {" — "}
              <span className="tabular-nums text-white/55">
                {pulse.clientCount} clients · {pulse.projects.length} live projects · 1 atelier
              </span>
            </>
          ) : null}
        </p>
      </div>
    </div>
  );
}
