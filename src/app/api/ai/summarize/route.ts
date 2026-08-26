import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

// POST /api/ai/summarize
// Body: { token, threadId }
// Returns: { summary: string }
// Auth: session token validated against Convex (thread ownership checked too).
export async function POST(req: NextRequest) {
  const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "";
  const GLM_KEY = process.env.ZAI_API_KEY || process.env.GLM_API_KEY || "";
  if (!CONVEX_URL) return NextResponse.json({ error: "Backend not configured" }, { status: 500 });
  if (!GLM_KEY) return NextResponse.json({ error: "AI not configured" }, { status: 500 });

  try {
    const { token, threadId } = await req.json();
    if (!token || !threadId) {
      return NextResponse.json({ error: "Missing token or threadId" }, { status: 400 });
    }

    const convex = new ConvexHttpClient(CONVEX_URL);

    // Validate session + thread ownership
    const msgs = await convex.query(api.projects.getThreadMessages, { token, threadId });
    if (!Array.isArray(msgs)) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    if (msgs.length === 0) {
      return NextResponse.json({ summary: "This thread has no messages yet." });
    }

    const thread = await convex.query(api.projects.listThreads, { token });
    const thisThread = (thread as any[] | null)?.find((t: any) => t._id === threadId);
    const subject = thisThread?.subject ?? "Conversation";

    // Build transcript
    const transcript = msgs
      .map((m: any) => `[${m.senderRole === "admin" ? "OookeA Team" : "Client"}, ${new Date(m.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}]: ${m.body}`)
      .join("\n");

    const prompt = `Summarize this client-studio conversation for a busy reader.
Thread subject: "${subject}"

Rules:
- 3-5 bullet points max, plain English
- Lead with open questions or things awaiting a decision
- Note deadlines, numbers, or deliverables mentioned
- End with one line: "Action needed:" + who must do what (or "Nothing pending")

Conversation:
${transcript.slice(0, 24000)}`;

    const base = (process.env.GLM_BASE_URL || "https://api.z.ai/api/paas/v4").replace(/\/$/, "");
    const r = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GLM_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.GLM_MODEL || "glm-4.6",
        messages: [
          {
            role: "system",
            content: "You are a concise executive assistant for a design studio's client portal.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!r.ok) {
      const errText = await r.text();
      console.error("GLM error:", r.status, errText.slice(0, 300));
      return NextResponse.json({ error: "AI service error" }, { status: 502 });
    }
    const data = await r.json();
    const msg = data?.choices?.[0]?.message ?? {};
    // Reasoning models (glm-4.6) can put text in reasoning_content while
    // content stays empty if the token budget is consumed by reasoning.
    let summary: string = msg.content || msg.reasoning_content || "";
    summary = summary.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    return NextResponse.json({ summary });
  } catch (e) {
    console.error("summarize error:", e);
    return NextResponse.json({ error: "Failed to summarize" }, { status: 500 });
  }
}
