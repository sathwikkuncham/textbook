import { NextRequest, NextResponse } from "next/server";
import {
  getSubtopicProgress,
  updateSubtopicProgress,
  getTopicCheckpoints,
  updateTopic,
} from "@/lib/db/repository";

export async function GET(request: NextRequest) {
  const topicId = request.nextUrl.searchParams.get("topicId");

  if (!topicId) {
    return NextResponse.json(
      { error: "topicId is required" },
      { status: 400 }
    );
  }

  const id = parseInt(topicId, 10);
  const progressRows = await getSubtopicProgress(id);
  const checkpointRows = await getTopicCheckpoints(id);

  const completedSubtopics = progressRows
    .filter((p) => p.status === "completed")
    .map((p) => p.subtopicId);

  const checkpointsMap: Record<
    number,
    { passed: boolean; score: number; attemptCount: number }
  > = {};
  for (const cp of checkpointRows) {
    checkpointsMap[cp.moduleId] = {
      passed: cp.passed,
      score: cp.score,
      attemptCount: cp.attemptCount,
    };
  }

  return NextResponse.json({
    success: true,
    completedSubtopics,
    checkpoints: checkpointsMap,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { topicId, moduleId, subtopicId, status } = body;

  if (!topicId || !subtopicId || !status) {
    return NextResponse.json(
      { error: "topicId, subtopicId, and status are required" },
      { status: 400 }
    );
  }

  await updateSubtopicProgress(topicId, moduleId ?? 0, subtopicId, status);

  // Recalculate completion percent
  const progressRows = await getSubtopicProgress(topicId);
  const completed = progressRows.filter((p) => p.status === "completed").length;
  const total = progressRows.length;
  const completionPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  await updateTopic(topicId, { completionPercent });

  return NextResponse.json({
    success: true,
    completionPercent,
  });
}
