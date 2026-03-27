import { NextRequest, NextResponse } from "next/server";
import {
  searchModuleContent,
  getAllTopics,
  getAllCurricula,
} from "@/lib/db/repository";
import type { Curriculum } from "@/lib/types/learning";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();

  if (!query || query.length < 3) {
    return NextResponse.json({ results: [] });
  }

  try {
    const [contentRows, allTopics, allCurricula] = await Promise.all([
      searchModuleContent(query, 20),
      getAllTopics(),
      getAllCurricula(),
    ]);

    const topicMap = new Map(allTopics.map((t) => [t.id, t]));
    const curriculaMap = new Map<number, Curriculum>();
    for (const c of allCurricula) {
      curriculaMap.set(c.topicId, c.structure as unknown as Curriculum);
    }

    const results = contentRows
      .map((row) => {
        const topic = topicMap.get(row.topicId);
        if (!topic) return null;

        const curriculum = curriculaMap.get(row.topicId);
        if (!curriculum?.modules) return null;

        // Decode the moduleId key: dbKey = moduleId * 100 + subtopicIndex
        const moduleId = Math.floor(row.moduleId / 100);
        const subtopicIndex = row.moduleId % 100;

        const mod = curriculum.modules.find((m) => m.id === moduleId);
        const sub = mod?.subtopics[subtopicIndex];

        // Extract snippet around the match
        const lowerContent = row.content.toLowerCase();
        const matchIndex = lowerContent.indexOf(query.toLowerCase());
        if (matchIndex === -1) return null;

        const start = Math.max(0, matchIndex - 75);
        const end = Math.min(row.content.length, matchIndex + query.length + 75);
        let snippet = row.content.slice(start, end).replace(/\n/g, " ");
        if (start > 0) snippet = "..." + snippet;
        if (end < row.content.length) snippet = snippet + "...";

        return {
          topicSlug: topic.slug,
          topicName: topic.displayName,
          moduleId: moduleId,
          moduleTitle: mod?.title ?? `Module ${moduleId}`,
          subtopicId: sub?.id ?? `${moduleId}.${subtopicIndex + 1}`,
          subtopicTitle: sub?.title ?? "Subtopic",
          snippet,
          matchIndex,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ results });
  } catch (error) {
    console.error("[search/content] Error:", error);
    return NextResponse.json({ results: [] });
  }
}
