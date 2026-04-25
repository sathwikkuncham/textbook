import { NextRequest, NextResponse } from "next/server";
import { findTopicBySlug, createTopic, updatePipelinePhase } from "@/lib/db/repository";

// Finalizes a PDF upload after the browser has PUT the bytes directly to
// Supabase Storage via a signed URL from /api/learn/source/signed-upload.
// This route only writes the topic row + sourcePath; it never sees the file
// bytes, so it's not subject to the platform body-size ceiling.
export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    topic,
    topicSlug,
    displayName,
    level,
    goal,
    timeCommitment,
    sourceType,
    storagePath,
    fileName,
    fileSize,
    category,
  } = body as {
    topic?: string;
    topicSlug?: string;
    displayName?: string;
    level?: string;
    goal?: string;
    timeCommitment?: string;
    sourceType?: string;
    storagePath?: string;
    fileName?: string;
    fileSize?: number;
    category?: string;
  };

  if (!topic || !topicSlug || !storagePath) {
    return NextResponse.json(
      { error: "topic, topicSlug, and storagePath are required" },
      { status: 400 }
    );
  }

  let topicRecord = await findTopicBySlug(topicSlug);
  if (!topicRecord) {
    topicRecord = await createTopic({
      slug: topicSlug,
      displayName: displayName || topic,
      level: level || "intermediate",
      goal: goal || "general understanding",
      timeCommitment: timeCommitment || "standard",
      category,
    });
  }

  const { db } = await import("@/lib/db/client");
  const { topics } = await import("@/lib/db/schema");
  const { eq } = await import("drizzle-orm");
  await db
    .update(topics)
    .set({
      sourceType: sourceType || "pdf",
      sourcePath: storagePath,
    })
    .where(eq(topics.id, topicRecord.id));

  await updatePipelinePhase(topicRecord.id, "created");

  return NextResponse.json({
    success: true,
    topicSlug,
    topicId: topicRecord.id,
    storagePath,
    fileSize: fileSize ?? null,
    fileName: fileName ?? null,
  });
}
