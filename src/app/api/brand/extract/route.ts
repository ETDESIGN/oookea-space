import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

// POST /api/brand/extract
// Body: { token: string, url: string }
// Crawls the site, extracts brand signals, and has GLM assemble a
// structured Brand Kit draft. Pure GET + fetch — no external API keys.

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://quiet-kudu-739.convex.cloud";

interface ExtractedKit {
  brandName: string | null;
  tagline: string;
  colors: { name: string; hex: string; usage: string }[];
  fonts: { role: string; family: string; note: string }[];
  logoUrl: string | null;
  toneOfVoice: string;
  usageNotes: string;
  siteTitle: string | null;
  sourceUrl: string;
}

function normalizeHex(m: RegExpMatchArray | string): string | null {
  const raw = typeof m === "string" ? m : m[0];
  let h = raw.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6) return null;
  return "#" + h;
}

function rgbToHex(r: string, g: string, b: string): string {
  const to = (v: string) => Math.max(0, Math.min(255, Math.round(parseFloat(v)))).toString(16).padStart(2, "0");
  return ("#" + to(r) + to(g) + to(b)).toUpperCase();
}

/** Distance between two colors — used to dedupe near-identical shades. */
function colorDist(a: string, b: string): number {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return Math.sqrt(pa.reduce((s, v, i) => s + (v - pb[i]) ** 2, 0));
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

async function fetchText(url: string, timeoutMs = 12000): Promise<string | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,text/css,*/*;q=0.8",
      },
      redirect: "follow",
    });
    if (!r.ok) return null;
    const ct = r.headers.get("content-type") || "";
    if (!ct.includes("text") && !ct.includes("json")) return null;
    return await r.text();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { token, url } = await req.json();
    if (!token || !url) {
      return NextResponse.json({ error: "Missing token or url" }, { status: 400 });
    }

    // Auth: validate session
    const convex = new ConvexHttpClient(CONVEX_URL);
    let user: any = null;
    try {
      user = await convex.query(api.projects.getUserBySession, { token });
    } catch {
      /* function may not exist yet */
    }
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let target: URL;
    try {
      target = new URL(url.startsWith("http") ? url : `https://${url}`);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // ── 1. Crawl the homepage ────────────────────────────────────
    const html = await fetchText(target.toString());
    if (!html) {
      return NextResponse.json({ error: "Could not fetch the site (timeout, blocked, or offline)" }, { status: 502 });
    }

    // ── 2. Extract signals ───────────────────────────────────────
    const pick = (re: RegExp): string | null => {
      const m = html.match(re);
      return m ? m[1].trim() : null;
    };

    const siteTitle =
      pick(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i) ||
      pick(/<title[^>]*>([^<]+)<\/title>/i);
    const description =
      pick(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
      pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
    const themeColor = pick(/<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)["']/i);
    const ogImage = pick(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);

    // Absolute-ize helper
    const abs = (u: string | null): string | null => {
      if (!u) return null;
      try {
        return new URL(u, target.origin).toString();
      } catch {
        return null;
      }
    };

    // Linked stylesheets (fetch up to 3, same origin or CDN)
    const cssHrefs = [...html.matchAll(/<link[^>]+rel=["']?stylesheet["']?[^>]+href=["']([^"']+)["']/gi)]
      .map((m) => abs(m[1]))
      .filter((u): u is string => !!u)
      .slice(0, 3);
    const cssTexts = (await Promise.all(cssHrefs.map((u) => fetchText(u, 8000)))).filter(
      (t): t is string => !!t
    );

    const styleBlob = cssTexts.join("\n") + "\n" + html;

    // Color frequency across CSS + inline styles
    const counts = new Map<string, number>();
    for (const m of styleBlob.matchAll(/#[0-9a-fA-F]{6}\b/g)) {
      const h = normalizeHex(m[0]);
      if (h) counts.set(h, (counts.get(h) || 0) + 3);
    }
    for (const m of styleBlob.matchAll(/#[0-9a-fA-F]{3}\b/g)) {
      const h = normalizeHex(m[0]);
      if (h) counts.set(h, (counts.get(h) || 0) + 1);
    }
    for (const m of styleBlob.matchAll(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/g)) {
      const h = rgbToHex(m[1], m[2], m[3]);
      counts.set(h, (counts.get(h) || 0) + 1);
    }
    if (themeColor) {
      const h = normalizeHex(themeColor);
      if (h) counts.set(h, (counts.get(h) || 0) + 10); // declared brand color — strong signal
    }

    // Rank → dedupe near-identical → drop pure white/black-grey noise when
    // it's just the CSS framework's defaults, but keep them if very dominant.
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const paletteCandidates: { hex: string; freq: number }[] = [];
    for (const [hex, freq] of ranked) {
      if (paletteCandidates.some((c) => colorDist(c.hex, hex) < 32)) continue;
      paletteCandidates.push({ hex, freq });
      if (paletteCandidates.length >= 12) break;
    }
    // Ensure at least one chromatic color exists in the top 6
    const hasChromatic = paletteCandidates.slice(0, 6).some((c) => luminance(c.hex) > 0.06 && luminance(c.hex) < 0.97);
    if (!hasChromatic) {
      const chromatic = ranked.find(
        ([hex]) => luminance(hex) > 0.06 && luminance(hex) < 0.97 && !paletteCandidates.some((c) => c.hex === hex)
      );
      if (chromatic) paletteCandidates.unshift({ hex: chromatic[0], freq: chromatic[1] });
    }

    // Font families (CSS + inline), cleaned
    const fontCounts = new Map<string, number>();
    for (const m of styleBlob.matchAll(/font-family\s*:\s*([^;}"']+)/gi)) {
      const fam = m[1]
        .split(",")[0]
        .replace(/["']/g, "")
        .replace(/!important/i, "")
        .trim();
      if (!fam || /^(inherit|initial|unset|system-ui|sans-serif|serif|monospace|-apple-system)$/i.test(fam)) continue;
      if (/^(var\(|--|\$|\bsohne-var\b|ui-)/i.test(fam)) continue; // CSS custom props, not real families
      fontCounts.set(fam, (fontCounts.get(fam) || 0) + 1);
    }
    const fontCandidates = [...fontCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([f]) => f);

    // Logo candidates
    const iconLink =
      pick(/<link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]+href=["']([^"']+)["']/i) ||
      pick(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["']/i);
    const logoUrl = abs(ogImage) || abs(iconLink);

    // Text sample for tone (strip scripts/styles/tags)
    const textSample = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 1600);

    // ── 3. GLM interprets the signals into a kit ────────────────
    const key = process.env.ZAI_API_KEY;
    const base = process.env.GLM_BASE_URL || "https://api.z.ai/api/coding/paas/v4";
    if (!key) return NextResponse.json({ error: "AI not configured" }, { status: 503 });

    const prompt = `You are a senior brand designer assembling a Brand Kit for a company from scraped website data.

WEBSITE: ${target.hostname}
TITLE: ${siteTitle || "unknown"}
DESCRIPTION: ${description || "none"}

COLOR CANDIDATES (hex, by frequency — most used first):
${paletteCandidates.map((c) => `${c.hex} (used ${c.freq}x)`).join("\n") || "none"}

FONT CANDIDATES (most used first): ${fontCandidates.length ? fontCandidates.join(", ") : "none — if empty, infer plausible families from the site\'s aesthetic and mark note as \'inferred\'"}
LOGO URL: ${logoUrl || "none"}

PAGE TEXT SAMPLE:
"""${textSample.slice(0, 900)}"""

Create a brand kit. Respond with ONLY valid JSON (no markdown fences):
{
  "brandName": "company name",
  "tagline": "one line capturing their positioning (max 12 words)",
  "colors": [
    {"name": "descriptive name like 'Inerys Blue'", "hex": "#XXXXXX", "usage": "where/how this color is used"}
  ] (exactly 5 colors: pick the strongest chromatic brand color as primary accent; include their dark & light neutrals if present; skip generic framework grays unless essential),
  "fonts": [
    {"role": "Display", "family": "exact family from candidates", "note": "what it's used for"},
    {"role": "Body", "family": "exact family from candidates or 'Inter'", "note": "..."}
  ] (2 entries),
  "toneOfVoice": "3-4 lines describing how this brand speaks, derived from the text sample",
  "usageNotes": "2-3 practical rules for using these colors/fonts together"
}
Use ONLY hex codes from the candidates (uppercase). If candidates lack chromatic colors, invent a tasteful one close to theme-color or their industry convention.`;

    const r = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.GLM_MODEL || "glm-4.6",
        messages: [
          { role: "system", content: "You are a precise brand design assistant. Output only valid JSON." },
          { role: "user", content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 2000,
        // glm-4.6 is a reasoning model — disable thinking so the JSON
        // lands in content instead of being starved by reasoning tokens
        thinking: { type: "disabled" },
      }),
    });

    if (!r.ok) {
      const errText = await r.text();
      console.error("GLM error:", r.status, errText.slice(0, 200));
      return NextResponse.json({ error: "AI service error" }, { status: 502 });
    }

    const data = await r.json();
    const msg = data?.choices?.[0]?.message ?? {};
    let content: string = msg.content || msg.reasoning_content || "";
    content = content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    // extract JSON object even if wrapped in fences or prose
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "AI returned unparseable output" }, { status: 502 });
    }

    let kit: ExtractedKit;
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      kit = {
        brandName: parsed.brandName || siteTitle,
        tagline: parsed.tagline || description || "",
        colors: (parsed.colors || []).slice(0, 5).map((c: any) => ({
          name: String(c.name || "Color"),
          hex: /^#[0-9A-Fa-f]{6}$/.test(c.hex) ? c.hex.toUpperCase() : "#6366F1",
          usage: String(c.usage || ""),
        })),
        fonts: (parsed.fonts || []).slice(0, 2).map((f: any) => ({
          role: String(f.role || "Body"),
          family: String(f.family || "Inter"),
          note: String(f.note || ""),
        })),
        logoUrl,
        toneOfVoice: String(parsed.toneOfVoice || ""),
        usageNotes: String(parsed.usageNotes || ""),
        siteTitle,
        sourceUrl: target.toString(),
      };
    } catch {
      return NextResponse.json({ error: "AI returned invalid JSON" }, { status: 502 });
    }

    return NextResponse.json({ kit, signals: { fontsFound: fontCandidates, colorCount: paletteCandidates.length } });
  } catch (e: any) {
    console.error("brand extract error:", e?.message);
    return NextResponse.json({ error: e?.message || "Extraction failed" }, { status: 500 });
  }
}
