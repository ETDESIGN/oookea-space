import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { token } = await request.json();
  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }
  const response = NextResponse.json({ success: true });
  response.cookies.set("oookea_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set("oookea_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
