"use client";

/**
 * Latent Bloom — the Oookea login visual.
 * A diffusion-style particle field: noise resolves into shapes and always
 * returns to the O. When a recognized client's email is typed (brandLogo
 * known), their logo becomes a stage of the cycle — tinted with their
 * brand color — before the forms and the O.
 *
 * No portal data, no libraries. Canvas 2D, additive glow, cursor-reactive.
 * Static single render under prefers-reduced-motion.
 */

import { useEffect, useRef } from "react";

type Stage = "noise" | "logo" | "form" | "o";

const DURATIONS: Record<Stage, number> = { noise: 1800, logo: 5000, form: 4500, o: 5200 };
const N = 1500;
const INDIGO: [number, number, number] = [129, 140, 248];
const VIOLET: [number, number, number] = [167, 139, 250];

function hexToRgb(hex: string | null | undefined): [number, number, number] | null {
  if (!hex) return null;
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function LatentBloom({ brandLogo, brandColor }: { brandLogo?: string | null; brandColor?: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const logoPtsRef = useRef<Array<[number, number]> | null>(null);
  const brandRgbRef = useRef<[number, number, number] | null>(null);

  // Sample particle target points from the client logo (alpha channel).
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
          for (let x = 0; x < w; x++)
            if (data[(y * w + x) * 4 + 3] > 128 && Math.random() < 0.5) pts.push([x / w - 0.5, y / h - 0.5]);
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
    const onMove = (e: PointerEvent) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    const onLeave = () => { mouse.x = -9999; };
    addEventListener("pointermove", onMove);
    addEventListener("pointerleave", onLeave);

    // ── shape targets (u in [0,1)) ──
    const shapeO = (u: number): [number, number] => {
      const R = Math.min(W, H) * 0.24, a = u * 2 * Math.PI;
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

    interface P { x: number; y: number; vx: number; vy: number; u: number; bright: boolean; tint: number }
    const rnd = () => Array.from({ length: N }, () => ({
      x: Math.random() * W, y: Math.random() * H, vx: 0, vy: 0,
      u: Math.random(), bright: Math.random() > 0.94, tint: Math.random(),
    })) as P[];
    const parts: P[] = rnd();

    // ── stage machine ──
    let stage: Stage = "noise";
    let stageStart = performance.now();
    let cycle = 0;
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
    const strength = (now: number) => {
      const el = now - stageStart, d = DURATIONS[stage];
      if (stage === "noise") return 0;
      const inS = Math.min(1, el / 1400);                 // ease in
      const outS = Math.min(1, Math.max(0, (d - el) / 1400)); // ease out
      return Math.min(inS, outS);
    };

    const draw = (now: number) => {
      const dt = Math.min(32, now - last) / 1000; last = now;
      const d = DURATIONS[stage];
      if (now - stageStart > d) { stage = next(); stageStart = now; }

      const g = strength(now);
      const logoPts = logoPtsRef.current;
      const brand = brandRgbRef.current;
      const shape =
        stage === "o" ? shapeO
        : stage === "form" ? FORMS[formIdx]
        : stage === "logo" && logoPts ? null // logo uses per-particle pts
        : shapeO; // fallback during noise

      ctx.fillStyle = "rgba(10,10,11,0.25)";
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";

      const logoScale = Math.min(W, H) * 0.5;
      for (const p of parts) {
        let tx: number, ty: number;
        if (stage === "logo" && logoPts) {
          const q = logoPts[Math.floor(p.u * logoPts.length) % logoPts.length];
          tx = W / 2 + q[0] * logoScale;
          ty = H / 2 + q[1] * logoScale;
        } else if (stage === "noise") {
          tx = W / 2 + Math.cos(p.u * 37 + now / 4000 + cycle) * W * 0.42;
          ty = H / 2 + Math.sin(p.u * 53 + now / 3400 + cycle) * H * 0.42;
        } else {
          const [sx, sy] = shape!(p.u);
          tx = sx; ty = sy;
        }
        p.vx += (tx - p.x) * 0.016 * g + (Math.random() - 0.5) * 1.15 * (1 - g);
        p.vy += (ty - p.y) * 0.016 * g + (Math.random() - 0.5) * 1.15 * (1 - g);
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < 15000) { const dd = Math.sqrt(d2) || 1, f = ((15000 - d2) / 15000) * 3.4; p.vx += (dx / dd) * f; p.vy += (dy / dd) * f; }
        p.vx *= 0.86; p.vy *= 0.86;
        p.x += p.vx; p.y += p.vy;

        // color: client brand during logo stage, else indigo/violet mix
        const c = stage === "logo" && brand ? brand : p.tint < 0.78 ? INDIGO : VIOLET;
        const alpha = 0.30 + 0.38 * g + 0.10 * Math.sin(now / 650 + p.u * 9);
        ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${alpha.toFixed(3)})`;
        const s = p.bright ? 2.6 : 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, s * 0.75, 0, 6.2832);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
      if (!reduced) raf = requestAnimationFrame(draw);
    };

    if (reduced) {
      // static composition: the O, once
      stage = "o"; stageStart = -1e9;
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
