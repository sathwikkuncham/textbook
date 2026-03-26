import { NextRequest, NextResponse } from "next/server";
import {
  getReviewsDue,
  saveReviewSchedule,
  getAllReviews,
} from "@/lib/db/repository";
import type { LeitnerBox } from "@/lib/types/learning";
import { LEITNER_INTERVALS } from "@/lib/types/learning";

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export async function GET(request: NextRequest) {
  try {
    const topicId = request.nextUrl.searchParams.get("topicId");

    if (topicId) {
      const due = await getReviewsDue(parseInt(topicId, 10));
      return NextResponse.json({
        success: true,
        due,
        dueCount: due.length,
      });
    }

    const due = await getReviewsDue();
    return NextResponse.json({
      success: true,
      due,
      dueCount: due.length,
    });
  } catch (error) {
    console.error("[reviews-api] Error:", error);
    return NextResponse.json(
      { success: true, due: [], dueCount: 0 },
      { status: 200 }
    );
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { topicId, moduleId, score, passed } = body as {
    topicId: number;
    moduleId: number;
    score: number;
    passed: boolean;
  };

  if (!topicId || !moduleId || score === undefined) {
    return NextResponse.json(
      { error: "topicId, moduleId, and score are required" },
      { status: 400 }
    );
  }

  // Get existing review entry
  const allReviews = await getAllReviews(topicId);
  const existing = allReviews.find((r) => r.moduleId === moduleId);
  const currentBox = (existing?.boxNumber ?? 1) as LeitnerBox;

  // Leitner box logic
  let newBox: LeitnerBox;
  if (passed && score >= 70) {
    newBox = Math.min(currentBox + 1, 5) as LeitnerBox;
  } else {
    newBox = 1;
  }

  const now = new Date();
  const nextReviewDate = addDays(now, LEITNER_INTERVALS[newBox]);
  const existingHistory =
    (existing?.reviewHistory as Array<{ date: string; score: number }>) ?? [];

  await saveReviewSchedule(topicId, moduleId, {
    boxNumber: newBox,
    nextReviewDate,
    lastReviewDate: now,
    lastScore: score,
    reviewHistory: [...existingHistory, { date: now.toISOString(), score }],
  });

  return NextResponse.json({
    success: true,
    newBox,
    nextReviewDate: nextReviewDate.toISOString(),
  });
}
