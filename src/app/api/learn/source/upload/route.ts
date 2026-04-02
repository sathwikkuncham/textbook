import { NextRequest, NextResponse } from "next/server";
import { supabase, STORAGE_BUCKET } from "@/lib/supabase/client";
import { generateSlug } from "@/lib/types/learning";
import { findTopicBySlug, createTopic, updatePipelinePhase } from "@/lib/db/repository";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const topic = formData.get("topic") as string;
  const level = formData.get("level") as string;
  const goal = formData.get("goal") as string;
  const timeCommitment = formData.get("timeCommitment") as string;
  const sourceType = formData.get("sourceType") as string;

  if (!file || !topic) {
    return NextResponse.json(
      { error: "file and topic are required" },
      { status: 400 }
    );
  }

  const providedSlug = formData.get("slug") as string | null;
  const topicSlug = providedSlug || generateSlug(topic);
  const fileName = `${topicSlug}/${Date.now()}-${file.name}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: `Upload failed: ${uploadError.message}` },
      { status: 500 }
    );
  }

  let topicRecord = await findTopicBySlug(topicSlug);
  if (!topicRecord) {
    topicRecord = await createTopic({
      slug: topicSlug,
      displayName: topic,
      level: level || "intermediate",
      goal: goal || "general understanding",
      timeCommitment: timeCommitment || "standard",
    });
  }

  // Update topic with source info — direct SQL update since createTopic doesn't include source fields
  const { db } = await import("@/lib/db/client");
  const { topics } = await import("@/lib/db/schema");
  const { eq } = await import("drizzle-orm");
  await db
    .update(topics)
    .set({
      sourceType: sourceType || "pdf",
      sourcePath: fileName,
    })
    .where(eq(topics.id, topicRecord.id));

  await updatePipelinePhase(topicRecord.id, "created");

  return NextResponse.json({
    success: true,
    topicSlug,
    topicId: topicRecord.id,
    storagePath: fileName,
    fileSize: buffer.length,
    fileName: file.name,
  });
}
