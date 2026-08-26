import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

const convex = new ConvexHttpClient(
  process.env.NEXT_PUBLIC_CONVEX_URL || ""
);

// GET /api/file/[storageId] — resolves a Convex storage ID to its real URL and redirects.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ storageId: string }> }
) {
  const { storageId } = await params;
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return NextResponse.json({ error: "Backend not configured" }, { status: 500 });
  }
  try {
    const url = await convex.query(api.projects.getFileUrl, { storageId });
    if (!url) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    return NextResponse.redirect(url, 302);
  } catch {
    return NextResponse.json({ error: "Failed to resolve file" }, { status: 500 });
  }
}
