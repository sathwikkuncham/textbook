import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { topics, curricula } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { topicId, level, goal, timeCommitment } = body;

  if (!topicId) {
    return NextResponse.json(
      { error: "topicId is required" },
      { status: 400 }
    );
  }

  // Update topic settings
  await db
    .update(topics)
    .set({
      level: level ?? undefined,
      goal: goal ?? undefined,
      timeCommitment: timeCommitment ?? undefined,
      lastSession: new Date(),
    })
    .where(eq(topics.id, topicId));

  // Delete existing curriculum so it regenerates with new settings
  await db
    .delete(curricula)
    .where(eq(curricula.topicId, topicId));

  // Reset module count
  await db
    .update(topics)
    .set({ totalModules: 0, estimatedMinutes: 0 })
    .where(eq(topics.id, topicId));

  return NextResponse.json({
    success: true,
    message: "Settings updated. Curriculum will regenerate on next load.",
  });
}
