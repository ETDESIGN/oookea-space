"use client";

// Tiny inline SVG sparkline for probe latency (last N probes).
// Green points = ok probes, red = failed. No deps, ~0.4 KB.

export function Sparkline({
  points,
  width = 220,
  height = 28,
}: {
  points: { t: number; v: number; ok: boolean }[];
  width?: number;
  height?: number;
}) {
  if (points.length < 2) return null;
  const max = Math.max(...points.map((p) => p.v), 1);
  const step = width / (points.length - 1);
  const y = (v: number) => height - 2 - (v / max) * (height - 4);

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${y(p.v).toFixed(1)}`)
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-7 w-full"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.2" className="text-primary/50" />
      {points.map((p, i) =>
        p.ok ? null : (
          <circle
            key={i}
            cx={(i * step).toFixed(1)}
            cy={y(p.v).toFixed(1)}
            r="2"
            className="fill-[#EF4444]"
          />
        )
      )}
      <circle
        cx={((points.length - 1) * step).toFixed(1)}
        cy={y(points[points.length - 1].v).toFixed(1)}
        r="1.8"
        className="fill-primary"
      />
    </svg>
  );
}
