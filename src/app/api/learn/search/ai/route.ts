import { NextRequest } from "next/server";
import {
  getAllTopics,
  getAllCurricula,
  searchModuleContent,
} from "@/lib/db/repository";
import { createSearchAgent } from "@/agents/search-agent";
import { streamAgentText } from "@/agents/runner";
import type { Curriculum } from "@/lib/types/learning";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { query } = body;

  if (!query?.trim()) {
    return new Response(
      `data: ${JSON.stringify({ error: "Query is required" })}\n\n`,
      { headers: { "Content-Type": "text/event-stream" } }
    );
  }

  // Build context from all available data
  const [allTopics, allCurricula] = await Promise.all([
    getAllTopics(),
    getAllCurricula(),
  ]);

  const curriculaMap = new Map<number, Curriculum>();
  for (const c of allCurricula) {
    curriculaMap.set(c.topicId, c.structure as unknown as Curriculum);
  }

  // Build compact context: topic + module + subtopic summaries
  let context = "KNOWLEDGE BASE:\n\n";
  for (const topic of allTopics) {
    const curriculum = curriculaMap.get(topic.id);
    if (!curriculum?.modules) continue;

    context += `Topic: ${topic.displayName} (slug: ${topic.slug}, level: ${topic.level})\n`;
    for (const mod of curriculum.modules) {
      context += `  Module ${mod.id}: ${mod.title}\n`;
      for (const sub of mod.subtopics) {
        context += `    - ${sub.id}: ${sub.title} (concepts: ${sub.key_concepts.join(", ")})\n`;
      }
    }
    context += "\n";
  }

  // Search for relevant content to add depth
  const queryWords = query.split(/\s+/).filter((w: string) => w.length > 3);
  if (queryWords.length > 0) {
    const contentResults = await searchModuleContent(queryWords[0], 3);
    if (contentResults.length > 0) {
      context += "\nRELEVANT CONTENT EXCERPTS:\n\n";
      for (const row of contentResults) {
        const topic = allTopics.find((t) => t.id === row.topicId);
        const excerpt = row.content.slice(0, 2000);
        context += `From "${topic?.displayName ?? "Unknown"}": ${excerpt}\n\n`;
      }
    }
  }

  // Cap context size and strip curly braces for ADK safety
  context = context.slice(0, 30000).replace(/[{}]/g, "");

  const agent = createSearchAgent();
  const message = `${context}\n\nQUESTION: ${query}`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamAgentText(agent, message)) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`)
          );
        }
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`)
        );
        controller.close();
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : "Search failed";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: errMsg })}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
