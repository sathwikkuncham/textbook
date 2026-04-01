import { NextRequest, NextResponse } from "next/server";
import { runInterview } from "@/agents/interview-agent";
import { updateLearnerIntent } from "@/lib/db/repository";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { message, history = [], sourceMeta } = body as {
    message: string;
    history: Array<{ role: "user" | "assistant"; content: string }>;
    sourceMeta?: { type: string; name?: string; url?: string };
  };

  if (!message) {
    return NextResponse.json(
      { error: "message is required" },
      { status: 400 }
    );
  }

  // Build full history with the new message
  const fullHistory = [
    ...history,
    { role: "user" as const, content: message },
  ];

  try {
    const result = await runInterview(fullHistory, sourceMeta);

    return NextResponse.json({
      success: true,
      text: result.text,
      profile: result.profile ?? null,
      done: !!result.profile,
    });
  } catch (error) {
    console.error("[interview-api] Failed:", error);
    const errMsg = error instanceof Error ? error.message : "Interview failed";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}

// PUT — Save learner intent profile to a topic
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { topicId, profile } = body as {
    topicId: number;
    profile: Record<string, unknown>;
  };

  if (!topicId || !profile) {
    return NextResponse.json(
      { error: "topicId and profile are required" },
      { status: 400 }
    );
  }

  try {
    await updateLearnerIntent(topicId, profile);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[interview-api] Save failed:", error);
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
  }
}
