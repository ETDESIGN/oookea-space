"use client";

/**
 * Latent Bloom — the Oookea login visual.
 * A diffusion-style particle field: noise resolves into shapes and always
 * returns to the O. When a recognized client's email is typed (brandLogo
 * known), their logo becomes a stage of the cycle — tinted with their
 * brand color — before the forms and the O.
 *
 * Motion design: particles are comets in flight (speed-proportional
 * streaks) that settle into crisp dots; each departs on its own beat
 * (staggered morphs); three depth layers give parallax; the O lands with
 * a soft bloom pulse; the cursor leaves gentle vortices.
 *
 * No portal data, no libraries. Canvas 2D. Static single render under
 * prefers-reduced-motion.
 */

import { useEffect, useRef } from "react";

type Stage = "noise" | "logo" | "form" | "o";

const DURATIONS: Record<Stage, number> = { noise: 2000, logo: 6000, form: 5200, o: 6000 };
const N = 2100;
const EASE_MS = 1500;   // per-particle morph window (staggered within it)
const STAGGER_MS = 900; // max per-particle departure delay
const INDIGO: [number, number, number] = [129, 140, 248];
const VIOLET: [number, number, number] = [167, 139, 250];

function hexToRgb(hex: string | null | undefined): [number, number, number] | null {
  if (!hex) return null;
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** hue jitter inside the palette — keeps the brand color dominant but alive */
function jitter(c: [number, number, number], k: number): [number, number, number] {
  const s = 1 + (k - 0.5) * 0.35;
  return [
    Math.min(255, c[0] * s),
    Math.min(255, c[1] * s),
    Math.min(255, c[2] * s * (1 + (k - 0.5) * 0.12)),
  ];
}

interface P {
  x: number; y: number; vx: number; vy: number;
  u: number;       // stable parameter within a shape
  depth: number;   // 0 = far, 1 = near
  stagger: number; // 0..1 departure delay within a morph
  hue: number;     // per-particle color variance
  bright: boolean; // a few larger stars
}

export function LatentBloom({ brandLogo, brandColor }: { brandLogo?: string | null; brandColor?: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const logoPtsRef = useRef<Array<[number, number]> | null>(null);
  const brandRgbRef = useRef<[number, number, number] | null>(null);

  // Sample particle target points from the client logo (alpha + background keying).
  useEffect(() => {
    logoPtsRef.current = null;
    if (!brandLogo) return;
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      try {
        const S = 180;
        const k = Math.min(S / img.width, S / img.height);
        const w = Math.max(1, Math.round(img.width * k));
        const h = Math.max(1, Math.round(img.height * k));
        const off = document.createElement("canvas");
        off.width = w; off.height = h;
        const c = off.getContext("2d", { willReadFrequently: true });
        if (!c) return;
        c.drawImage(img, 0, 0, w, h);
        const data = c.getImageData(0, 0, w, h).data;
        const pts: Array<[number, number]> = [];
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            const a = data[i + 3];
            if (a <= 128) continue;
            const r = data[i], g = data[i + 1], b = data[i + 2];
            const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
            if (mx > 232 && mn > 220) continue;   // white background
            if (mx < 60) continue;                 // black background
            if (mx - mn < 24 && mx < 90) continue; // faint grey noise
            if (Math.random() < 0.8) pts.push([x / w - 0.5, y / h - 0.5]);
          }
        if (pts.length >= 40) logoPtsRef.current = pts;
      } catch {
        // CORS-tainted canvas or decode issue — logo stage silently skipped.
      }
    };
    img.src = brandLogo;
    return () => { cancelled = true; };
  }, [brandLogo]);

  useEffect(() => {
    brandRgbRef.current = hexToRgb(brandColor ?? null);
  }, [brandColor]);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0, H = 0, DPR = Math.min(2, devicePixelRatio || 1);
    const resize = () => {
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = W * DPR; cv.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    resize();
    addEventListener("resize", resize);

    const hasLogo = () => logoPtsRef.current !== null;
    const mouse = { x: -9999, y: -9999 };
    // cursor coords relative to the canvas (it is the left half of the page)
    const onMove = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    };
    const onLeave = () => { mouse.x = -9999; };
    addEventListener("pointermove", onMove);
    addEventListener("pointerleave", onLeave);

    // ── shape targets (u in [0,1)) ──
    const shapeO = (u: number, wobble = 0): [number, number] => {
      const R = Math.min(W, H) * (0.24 + wobble), a = u * 2 * Math.PI;
      return [W / 2 + R * Math.cos(a), H / 2 + R * Math.sin(a)];
    };
    const shapeRidge = (u: number): [number, number] => {
      const w = Math.min(W, H) * 0.62, h = Math.min(W, H) * 0.17;
      return [W / 2 - w / 2 + u * w, H / 2 + Math.sin(u * Math.PI * 8) * h * 0.5];
    };
    const shapeLattice = (u: number): [number, number] => {
      const cols = 26, rows = 15, w = Math.min(W * 0.72, 940), h = w * 0.52;
      const i = Math.floor(u * cols * rows), c = i % cols, r = Math.floor(i / cols);
      return [W / 2 - w / 2 + (c / (cols - 1)) * w, H / 2 - h / 2 + (r / (rows - 1)) * h];
    };
    const FORMS = [shapeRidge, shapeLattice];
    let formIdx = 0;

    const parts: P[] = Array.from({ length: N }, () => ({
      x: Math.random() * W, y: Math.random() * H, vx: 0, vy: 0,
      u: Math.random(),
      depth: Math.random(),
      stagger: Math.random(),
      hue: Math.random(),
      bright: Math.random() > 0.94,
    }));

    // ── stage machine ──
    let stage: Stage = "noise";
    let stageStart = performance.now();
    let cycle = 0;
    let bloomPulseAt = 0; // timestamp when the O finishes landing
    const next = (): Stage => {
      if (stage === "noise") return hasLogo() ? "logo" : "form";
      if (stage === "logo") return "form";
      if (stage === "form") return "o";
      cycle++;
      formIdx = (formIdx + 1) % FORMS.length;
      return "noise";
    };

    let raf = 0;
    let last = performance.now();

    const draw = (now: number) => {
      if (now - stageStart > DURATIONS[stage]) { stage = next(); stageStart = now; }
      const stageAge = now - stageStart;
      const logoPts = logoPtsRef.current;
      const brand = brandRgbRef.current;
      const logoScale = Math.min(W, H) * 0.56;

      // the O lands — arm the bloom pulse once fully settled
      if (stage === "o" && stageAge > EASE_MS + STAGGER_MS && !bloomPulseAt) bloomPulseAt = now;

      ctx.fillStyle = "rgba(10,10,11,0.25)";
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";

      for (const p of parts) {
        // per-particle morph progress: each departs on its own beat
        const t0 = p.stagger * STAGGER_MS;
        const g = stage === "noise"
          ? 0
          : Math.min(1, Math.max(0, (stageAge - t0) / EASE_MS));

        let tx: number, ty: number;
        if (stage === "logo" && logoPts) {
          const q = logoPts[Math.floor(p.u * logoPts.length) % logoPts.length];
          tx = W / 2 + q[0] * logoScale;
          ty = H / 2 + q[1] * logoScale;
        } else if (stage === "noise") {
          tx = W / 2 + Math.cos(p.u * 37 + now / 4000 + cycle) * W * 0.42;
          ty = H / 2 + Math.sin(p.u * 53 + now / 3400 + cycle) * H * 0.42;
        } else if (stage === "o") {
          const wob = (p.hue - 0.5) * 0.028;
          [tx, ty] = shapeO(p.u, wob);
        } else {
          [tx, ty] = FORMS[formIdx](p.u);
        }

        // depth-scaled spring toward target + diffusion noise
        const spring = 0.016 * (0.55 + p.depth * 0.45);
        p.vx += (tx - p.x) * spring * g + (Math.random() - 0.5) * 1.15 * (1 - g);
        p.vy += (ty - p.y) * spring * g + (Math.random() - 0.5) * 1.15 * (1 - g);

        // cursor: repulsion + a gentle vortex in the wake
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < 15000) {
          const d = Math.sqrt(d2) || 1, f = ((15000 - d2) / 15000) * 3.4;
          p.vx += (dx / d) * f - (dy / d) * f * 0.55;
          p.vy += (dy / d) * f + (dx / d) * f * 0.55;
        }
        p.vx *= 0.86; p.vy *= 0.86;
        p.x += p.vx; p.y += p.vy;

        // color: client brand during logo stage; indigo family otherwise
        const base = stage === "logo" && brand ? brand : p.hue < 0.78 ? INDIGO : VIOLET;
        const c = jitter(base, p.hue);
        const depthA = 0.35 + p.depth * 0.65;
        const alpha = (0.22 + 0.30 * g + 0.08 * Math.sin(now / 650 + p.u * 9)) * depthA;
        const size = (p.bright ? 2.4 : 1.5) * (0.55 + p.depth * 0.45);

        const speed = Math.hypot(p.vx, p.vy);
        if (speed > 1.6) {
          // comet: streak grows with speed, round caps
          const k = Math.min(7, speed * 1.35);
          ctx.strokeStyle = `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${alpha.toFixed(3)})`;
          ctx.lineWidth = size;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(p.x - p.vx * k, p.y - p.vy * k);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        } else {
          ctx.fillStyle = `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, size * 0.75, 0, 6.2832);
          ctx.fill();
        }
      }

      // the O's landing bloom: one soft ring of light, fades in ~1.1s
      if (bloomPulseAt && now - bloomPulseAt < 1100) {
        const t = (now - bloomPulseAt) / 1100;
        const R = Math.min(W, H) * (0.24 + t * 0.16);
        const grad = ctx.createRadialGradient(W / 2, H / 2, R * 0.72, W / 2, H / 2, R);
        grad.addColorStop(0, "rgba(129,140,248,0)");
        grad.addColorStop(0.82, `rgba(129,140,248,${(0.20 * (1 - t)).toFixed(3)})`);
        grad.addColorStop(1, "rgba(129,140,248,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(W / 2, H / 2, R, 0, 6.2832);
        ctx.fill();
      }
      if (stage !== "o") bloomPulseAt = 0;

      ctx.globalCompositeOperation = "source-over";
      if (!reduced) raf = requestAnimationFrame(draw);
    };

    if (reduced) {
      // static composition: the O, once
      stage = "o"; stageStart = -1e9; bloomPulseAt = 0;
      draw(performance.now() + DURATIONS.o);
    } else {
      raf = requestAnimationFrame(draw);
    }

    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", resize);
      removeEventListener("pointermove", onMove);
      removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div className="absolute inset-0 bg-gradient-to-br from-[#111114] via-[#0A0A0B] to-[#15121f]">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
      <div className="absolute bottom-8 left-8 right-8">
        <p className="font-display text-lg font-semibold text-white/90">Oookea</p>
        <p className="mt-1 text-xs text-white/40">Digital Atelier — where ideas take form</p>
      </div>
    </div>
  );
}
