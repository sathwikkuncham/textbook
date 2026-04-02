import { NextRequest, NextResponse } from "next/server";
import { findTopicBySlug, updateLastPosition } from "@/lib/db/repository";
import { generateSlug } from "@/lib/types/learning";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { slug, moduleId, subtopicId } = body as {
    slug: string;
    moduleId: number;
    subtopicId: string;
  };

  if (!slug || !moduleId || !subtopicId) {
    return NextResponse.json(
      { error: "slug, moduleId, and subtopicId are required" },
      { status: 400 }
    );
  }

  const topicRecord = await findTopicBySlug(slug);
  if (!topicRecord) {
    return NextResponse.json(
      { error: "Topic not found" },
      { status: 404 }
    );
  }

  await updateLastPosition(topicRecord.id, moduleId, subtopicId);

  return NextResponse.json({ success: true });
}
