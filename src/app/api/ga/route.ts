import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

// POST /api/ga — session-scoped GA4 report for client Analytics modules.
// Calls the Convex action directly (same channel as the portal's own queries);
// the action validates the portal session + module ownership, then mints a
// service-account JWT and reads Google Analytics. (Chosen over a convex.site
// HTTP route — that surface proved unreliable for this route from Netlify.)

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      token?: string;
      propertyId?: string;
      days?: number;
    };
    const client = new ConvexHttpClient(
      process.env.NEXT_PUBLIC_CONVEX_URL || "https://quiet-kudo-739.convex.cloud"
    );
    const report = await client.action(api.ga.fetchGaReport, {
      token: body.token ?? "",
      propertyId: body.propertyId ?? "",
      days: body.days ?? 7,
    });
    return NextResponse.json(report, { headers: { "cache-control": "no-store" } });
  } catch (err: any) {
    const msg = String(err?.message ?? err);
    const status = msg.includes("unauthorized") ? 401 : msg.includes("forbidden") ? 403 : 502;
    return NextResponse.json({ error: msg }, { status });
  }
}
