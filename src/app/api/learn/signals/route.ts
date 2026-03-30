import { NextRequest, NextResponse } from "next/server";
import { logLearnerSignal } from "@/lib/db/repository";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { topicId, moduleId, subtopicId, signalType, data } = body;

  if (!topicId || !signalType) {
    return NextResponse.json(
      { error: "topicId and signalType are required" },
      { status: 400 }
    );
  }

  try {
    await logLearnerSignal({
      topicId,
      moduleId: moduleId ?? null,
      subtopicId: subtopicId ?? null,
      signalType,
      data: data ?? {},
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[signals-api] Failed to log signal:", error);
    return NextResponse.json({ error: "Failed to log signal" }, { status: 500 });
  }
}
