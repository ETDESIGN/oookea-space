import { NextRequest, NextResponse } from "next/server";

// POST /api/webhook/:provider — proxy to the Convex HTTP action.
// Providers (Netlify, GitHub, Stripe…) post here; Convex verifies the
// shared secret and records the event. Keeps provider config on our
// domain so the backend can move without re-pointing webhooks.

const CONVEX_SITE = (
  process.env.NEXT_PUBLIC_CONVEX_URL || "https://quiet-kudu-739.convex.cloud"
).replace(".convex.cloud", ".convex.site");

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const target = `${CONVEX_SITE}/webhook/${(path || []).join("/")}${req.nextUrl.search}`;
  try {
    const upstream = await fetch(target, {
      method: "POST",
      headers: {
        "content-type": req.headers.get("content-type") || "application/json",
        "x-oookea-secret":
          req.headers.get("x-oookea-secret") ||
          req.headers.get("x-webhook-secret") ||
          req.nextUrl.searchParams.get("secret") ||
          "",
      },
      body: await req.text(),
      signal: AbortSignal.timeout(15_000),
    });
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "content-type": "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "upstream-unreachable" }, { status: 502 });
  }
}
