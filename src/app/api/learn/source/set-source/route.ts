import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { topics } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { findTopicBySlug } from "@/lib/db/repository";
import { generateSlug } from "@/lib/types/learning";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { topic, sourceType, sourcePath } = body;

  if (!topic || !sourceType || !sourcePath) {
    return NextResponse.json(
      { error: "topic, sourceType, and sourcePath are required" },
      { status: 400 }
    );
  }

  const topicSlug = generateSlug(topic);
  const topicRecord = await findTopicBySlug(topicSlug);

  if (!topicRecord) {
    return NextResponse.json(
      { error: "Topic not found." },
      { status: 400 }
    );
  }

  await db
    .update(topics)
    .set({ sourceType, sourcePath })
    .where(eq(topics.id, topicRecord.id));

  return NextResponse.json({
    success: true,
    topicId: topicRecord.id,
    topicSlug,
  });
}
