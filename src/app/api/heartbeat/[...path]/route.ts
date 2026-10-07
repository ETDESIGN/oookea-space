import { NextRequest, NextResponse } from "next/server";

// GET|POST /api/heartbeat/:token[/fail] — cron dead-man's-switch ping.
// Proxies to the Convex HTTP action. Jobs ping after each run; silence
// past the expected interval = "missed" on Mission Control.
//
// Usage from any cron/agent:
//   curl https://space.oookea.com/api/heartbeat/<token>
//   curl "https://space.oookea.com/api/heartbeat/<token>?note=run%20ok"
//   curl -X POST https://space.oookea.com/api/heartbeat/<token>/fail

const CONVEX_SITE = (
  process.env.NEXT_PUBLIC_CONVEX_URL || "https://quiet-kudu-739.convex.cloud"
).replace(".convex.cloud", ".convex.site");

async function forward(req: NextRequest, path: string[]) {
  const target = `${CONVEX_SITE}/heartbeat/${(path || []).join("/")}${req.nextUrl.search}`;
  try {
    const upstream = await fetch(target, {
      method: req.method,
      body: req.method === "POST" ? await req.text() : undefined,
      signal: AbortSignal.timeout(15_000),
    });
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "upstream-unreachable" }, { status: 502 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return forward(req, path);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return forward(req, path);
}
