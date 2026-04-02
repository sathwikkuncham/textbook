import { NextRequest, NextResponse } from "next/server";
import {
  findTopicBySlug,
  rollbackModuleContent,
  findModuleContent,
} from "@/lib/db/repository";
import { generateSlug } from "@/lib/types/learning";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { slug, moduleId } = body as {
    slug: string;
    moduleId: number;
  };

  if (!slug || !moduleId) {
    return NextResponse.json(
      { error: "slug and moduleId are required" },
      { status: 400 }
    );
  }

  const topicSlug = generateSlug(slug);
  const topicRecord = await findTopicBySlug(topicSlug) ?? await findTopicBySlug(slug);
  if (!topicRecord) {
    return NextResponse.json(
      { error: "Topic not found" },
      { status: 404 }
    );
  }

  const success = await rollbackModuleContent(topicRecord.id, moduleId);
  if (!success) {
    return NextResponse.json(
      { error: "No previous version available" },
      { status: 404 }
    );
  }

  // Return the restored content
  const restored = await findModuleContent(topicRecord.id, moduleId);

  return NextResponse.json({
    success: true,
    content: restored?.content ?? "",
    diagrams: restored?.diagrams ?? "",
  });
}
