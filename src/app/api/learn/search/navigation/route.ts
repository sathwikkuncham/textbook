import { NextResponse } from "next/server";
import { getAllTopics, getAllCurricula } from "@/lib/db/repository";
import type { Curriculum } from "@/lib/types/learning";

export async function GET() {
  try {
    const [allTopics, allCurricula] = await Promise.all([
      getAllTopics(),
      getAllCurricula(),
    ]);

    const curriculaMap = new Map<number, Curriculum>();
    for (const c of allCurricula) {
      curriculaMap.set(c.topicId, c.structure as unknown as Curriculum);
    }

    const items: Array<{
      topicSlug: string;
      topicName: string;
      moduleId: number;
      moduleTitle: string;
      subtopicId: string;
      subtopicTitle: string;
      keyConcepts: string[];
    }> = [];

    for (const topic of allTopics) {
      const curriculum = curriculaMap.get(topic.id);
      if (!curriculum?.modules) continue;

      for (const mod of curriculum.modules) {
        for (const sub of mod.subtopics) {
          items.push({
            topicSlug: topic.slug,
            topicName: topic.displayName,
            moduleId: mod.id,
            moduleTitle: mod.title,
            subtopicId: sub.id,
            subtopicTitle: sub.title,
            keyConcepts: sub.key_concepts ?? [],
          });
        }
      }
    }

    return NextResponse.json(
      { items },
      {
        headers: {
          "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    console.error("[search/navigation] Error:", error);
    return NextResponse.json({ items: [] });
  }
}
