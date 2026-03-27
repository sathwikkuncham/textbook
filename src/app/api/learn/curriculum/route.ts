import { NextRequest, NextResponse } from "next/server";
import { generateSlug } from "@/lib/types/learning";
import type { Curriculum } from "@/lib/types/learning";
import {
  findTopicBySlug,
  findResearchByTopicId,
  findCurriculumByTopicId,
  findSourceStructure,
  saveCurriculum,
  updateTopic,
} from "@/lib/db/repository";
import { createCurriculumArchitect } from "@/agents/curriculum-architect";
import { runAgent } from "@/agents/runner";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { topic, slug: providedSlug, level, goal, timeCommitment } = body;

  if (!topic || !level || !goal || !timeCommitment) {
    return NextResponse.json(
      { error: "topic, level, goal, and timeCommitment are required" },
      { status: 400 }
    );
  }

  const topicSlug = providedSlug || generateSlug(topic);
  const topicRecord = await findTopicBySlug(topicSlug);

  if (!topicRecord) {
    return NextResponse.json(
      { error: "Topic not found. Run /api/learn/research first." },
      { status: 400 }
    );
  }

  const cached = await findCurriculumByTopicId(topicRecord.id);
  if (cached) {
    return NextResponse.json({
      success: true,
      topicSlug,
      topicId: topicRecord.id,
      curriculum: cached,
      cached: true,
    });
  }

  const research = await findResearchByTopicId(topicRecord.id);
  if (!research) {
    return NextResponse.json(
      { error: "Research not found. Run /api/learn/research first." },
      { status: 400 }
    );
  }

  try {
    // Check if this is a source-based topic
    let sourceContext;
    if (topicRecord.sourceType !== "topic_only") {
      const structure = await findSourceStructure(topicRecord.id);
      if (structure?.userScope) {
        sourceContext = {
          toc: structure.rawToc,
          scope: structure.userScope,
        };
      }
    }

    const architect = createCurriculumArchitect(
      topic,
      level,
      goal,
      timeCommitment,
      sourceContext
    );

    const researchContext = JSON.stringify(research, null, 2);

    const result = await runAgent(
      architect,
      `Design a curriculum for "${topic}". Here is the research context:\n\n${researchContext}`
    );

    let curriculum: Curriculum;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in response");
      curriculum = JSON.parse(jsonMatch[0]) as Curriculum;
    } catch {
      return NextResponse.json(
        { error: "Failed to parse curriculum JSON", raw: result },
        { status: 500 }
      );
    }

    curriculum.topic_slug = topicSlug;

    await saveCurriculum(topicRecord.id, curriculum);
    await updateTopic(topicRecord.id, {
      totalModules: curriculum.modules.length,
      estimatedMinutes: curriculum.estimated_total_minutes,
      lastSession: new Date(),
    });

    return NextResponse.json({
      success: true,
      topicSlug,
      topicId: topicRecord.id,
      curriculum,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Curriculum generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
