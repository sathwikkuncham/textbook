import { NextRequest, NextResponse } from "next/server";
import {
  searchModuleContent,
  searchModuleContentFTS,
  getAllTopics,
  getAllCurricula,
  searchChunksGlobal,
} from "@/lib/db/repository";
import { embedQuery } from "@/lib/embeddings/client";
import type { Curriculum } from "@/lib/types/learning";

interface SearchResult {
  topicSlug: string;
  topicName: string;
  moduleId: number;
  moduleTitle: string;
  subtopicId: string;
  subtopicTitle: string;
  snippet: string;
  matchIndex: number;
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();

  if (!query || query.length < 3) {
    return NextResponse.json({ results: [] });
  }

  try {
    // Use full-text search with stemming, fall back to ILIKE
    const ftsResults = await searchModuleContentFTS(query, 20);
    const contentRows = ftsResults.length > 0
      ? ftsResults
      : await searchModuleContent(query, 20);

    const [allTopics, allCurricula] = await Promise.all([
      getAllTopics(),
      getAllCurricula(),
    ]);

    const topicMap = new Map(allTopics.map((t) => [t.id, t]));
    const curriculaMap = new Map<number, Curriculum>();
    for (const c of allCurricula) {
      curriculaMap.set(c.topicId, c.structure as unknown as Curriculum);
    }

    const results: SearchResult[] = [];
    const seen = new Set<string>();

    // 1. Search generated content (ILIKE on moduleContent)
    for (const row of contentRows) {
      const topic = topicMap.get(row.topicId);
      if (!topic) continue;

      const curriculum = curriculaMap.get(row.topicId);
      if (!curriculum?.modules) continue;

      const moduleId = Math.floor(row.moduleId / 100);
      const subtopicIndex = row.moduleId % 100;
      const mod = curriculum.modules.find((m) => m.id === moduleId);
      const sub = mod?.subtopics[subtopicIndex];

      const lowerContent = row.content.toLowerCase();
      const matchIndex = lowerContent.indexOf(query.toLowerCase());
      if (matchIndex === -1) continue;

      const start = Math.max(0, matchIndex - 75);
      const end = Math.min(row.content.length, matchIndex + query.length + 75);
      let snippet = row.content.slice(start, end).replace(/\n/g, " ");
      if (start > 0) snippet = "..." + snippet;
      if (end < row.content.length) snippet = snippet + "...";

      const key = `${topic.slug}-${sub?.id ?? subtopicIndex}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push({
          topicSlug: topic.slug,
          topicName: topic.displayName,
          moduleId,
          moduleTitle: mod?.title ?? `Module ${moduleId}`,
          subtopicId: sub?.id ?? `${moduleId}.${subtopicIndex + 1}`,
          subtopicTitle: sub?.title ?? "Subtopic",
          snippet,
          matchIndex,
        });
      }
    }

    // 2. Search curriculum metadata (titles, key concepts)
    const q = query.toLowerCase();
    for (const [topicId, curriculum] of curriculaMap.entries()) {
      const topic = topicMap.get(topicId);
      if (!topic || !curriculum?.modules) continue;

      for (const mod of curriculum.modules) {
        for (const sub of mod.subtopics) {
          const key = `${topic.slug}-${sub.id}`;
          if (seen.has(key)) continue;

          const searchText = [
            sub.title,
            mod.title,
            ...(sub.key_concepts ?? []),
          ]
            .join(" ")
            .toLowerCase();

          if (searchText.includes(q)) {
            seen.add(key);
            const concepts = sub.key_concepts?.join(", ") ?? "";
            results.push({
              topicSlug: topic.slug,
              topicName: topic.displayName,
              moduleId: mod.id,
              moduleTitle: mod.title,
              subtopicId: sub.id,
              subtopicTitle: sub.title,
              snippet: concepts
                ? `Key concepts: ${concepts}`
                : `Part of module: ${mod.title}`,
              matchIndex: 0,
            });
          }
        }
      }
    }

    // 3. Semantic search over embedded source material
    try {
      const queryEmbedding = await embedQuery(query);
      const vectorResults = await searchChunksGlobal(queryEmbedding, 10, 0.35);

      for (const vr of vectorResults) {
        const topic = topicMap.get(vr.topicId);
        if (!topic) continue;

        const curriculum = curriculaMap.get(vr.topicId);
        if (!curriculum?.modules) continue;

        // Try to map source section back to a curriculum subtopic
        let matchedModuleId = 0;
        let matchedSubtopicId = "";
        let matchedModuleTitle = "Source Material";
        let matchedSubtopicTitle = vr.chapterTitle ?? "Source";

        for (const mod of curriculum.modules) {
          for (const sub of mod.subtopics) {
            const subLower = sub.title.toLowerCase();
            const chapterLower = (vr.chapterTitle ?? "").toLowerCase();
            if (
              chapterLower.includes(subLower) ||
              subLower.includes(chapterLower)
            ) {
              matchedModuleId = mod.id;
              matchedSubtopicId = sub.id;
              matchedModuleTitle = mod.title;
              matchedSubtopicTitle = sub.title;
              break;
            }
          }
          if (matchedModuleId) break;
        }

        const key = `${topic.slug}-source-${vr.sectionKey}`;
        if (!seen.has(key)) {
          seen.add(key);
          const snippet = vr.content.slice(0, 150).replace(/\n/g, " ") + "...";
          results.push({
            topicSlug: topic.slug,
            topicName: topic.displayName,
            moduleId: matchedModuleId,
            moduleTitle: matchedModuleTitle,
            subtopicId: matchedSubtopicId || vr.sectionKey,
            subtopicTitle: matchedSubtopicTitle,
            snippet: `[Source] ${snippet}`,
            matchIndex: 0,
          });
        }
      }
    } catch (err) {
      // Vector search is best-effort — don't fail the entire search
      console.warn("[search] Vector search failed:", err);
    }

    return NextResponse.json({ results: results.slice(0, 20) });
  } catch (error) {
    console.error("[search/content] Error:", error);
    return NextResponse.json({ results: [] });
  }
}
