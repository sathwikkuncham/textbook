import { NextRequest, NextResponse } from "next/server";
import {
  findTopicBySlug,
  rollbackModuleContent,
  findModuleContent,
  findCurriculumByTopicId,
} from "@/lib/db/repository";
import { embedGeneratedContent } from "@/lib/embeddings/pipeline";
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

  // Re-embed the restored content (fire-and-forget)
  if (restored?.content) {
    const curriculum = await findCurriculumByTopicId(topicRecord.id);
    const mod = curriculum?.modules.find(
      (m) => m.id === Math.floor(moduleId / 100)
    );
    const subtopicIndex = moduleId % 100;
    const sub = mod?.subtopics[subtopicIndex];

    embedGeneratedContent(
      topicRecord.id, moduleId, restored.content,
      topicRecord.displayName,
      mod?.title ?? "Module",
      sub?.title ?? "Subtopic"
    ).catch((err) => {
      console.warn("[rollback] Re-embedding failed:", err);
    });
  }

  return NextResponse.json({
    success: true,
    content: restored?.content ?? "",
    diagrams: restored?.diagrams ?? "",
  });
}
