import { NextRequest, NextResponse } from "next/server";
import { findLearnerInsights, saveLearnerInsights } from "@/lib/db/repository";
import { createLearnerModelAgent } from "@/agents/learner-model";
import { runAgent } from "@/agents/runner";

export async function GET(request: NextRequest) {
  const topicId = request.nextUrl.searchParams.get("topicId");

  if (!topicId) {
    return NextResponse.json(
      { error: "topicId is required" },
      { status: 400 }
    );
  }

  const id = parseInt(topicId, 10);
  const insights = await findLearnerInsights(id);

  return NextResponse.json({
    success: true,
    insights,
    hasData: insights !== null,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { topicId } = body;

  if (!topicId) {
    return NextResponse.json(
      { error: "topicId is required" },
      { status: 400 }
    );
  }

  try {
    const agent = createLearnerModelAgent(topicId);
    const result = await runAgent(
      agent,
      `Analyze all available data for topic ${topicId} and build a comprehensive learner model. Use all four tools to gather quiz results, chat insights, progress data, and engagement signals.`
    );

    // Parse the JSON output
    const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);

    await saveLearnerInsights(topicId, {
      conceptMastery: parsed.conceptMastery ?? {},
      strengthAreas: parsed.strengthAreas ?? [],
      weakAreas: parsed.weakAreas ?? [],
      learningStyle: parsed.learningStyle ?? {},
      engagementProfile: parsed.engagementProfile ?? {},
    });

    return NextResponse.json({ success: true, insights: parsed });
  } catch (error) {
    console.error("[learner-model-api] Update failed:", error);
    const message = error instanceof Error ? error.message : "Learner model update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
