import { NextRequest, NextResponse } from "next/server";
import { generateSlug } from "@/lib/types/learning";
import type { QuizQuestion } from "@/lib/types/learning";
import {
  findTopicBySlug,
  findCurriculumByTopicId,
  findModuleQuiz,
  saveModuleQuiz,
} from "@/lib/db/repository";
import { createAssessmentDesigner } from "@/agents/assessment-designer";
import { createFetchSubtopicContentTool } from "@/agents/tools/fetch-subtopic-content";
import { runAgent } from "@/agents/runner";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { topic, slug: providedSlug, moduleId } = body;

  if (!topic || moduleId === undefined) {
    return NextResponse.json(
      { error: "topic and moduleId are required" },
      { status: 400 }
    );
  }

  const topicSlug = providedSlug || generateSlug(topic);
  const topicRecord = await findTopicBySlug(topicSlug);

  if (!topicRecord) {
    return NextResponse.json(
      { error: "Topic not found." },
      { status: 400 }
    );
  }

  const cached = await findModuleQuiz(topicRecord.id, moduleId);
  if (cached) {
    return NextResponse.json({
      success: true,
      topicSlug,
      topicId: topicRecord.id,
      moduleId,
      questions: cached,
      cached: true,
    });
  }

  const curriculum = await findCurriculumByTopicId(topicRecord.id);
  if (!curriculum) {
    return NextResponse.json(
      { error: "Curriculum not found." },
      { status: 400 }
    );
  }

  const module = curriculum.modules.find((m) => m.id === moduleId);
  if (!module) {
    return NextResponse.json(
      { error: `Module ${moduleId} not found` },
      { status: 404 }
    );
  }

  const subtopicsList = module.subtopics
    .map((s) => `${s.id}: ${s.title}`)
    .join("\n");

  try {
    const contentTool = createFetchSubtopicContentTool(
      topicRecord.id,
      moduleId,
      module.subtopics
    );

    const designer = createAssessmentDesigner(
      topic,
      module.title,
      subtopicsList,
      module.checkpoint.num_questions,
      [contentTool]
    );

    const result = await runAgent(
      designer,
      `Create a checkpoint quiz for Module ${moduleId}: ${module.title}. The module covered these subtopics:\n${subtopicsList}\n\nGenerate ${module.checkpoint.num_questions} questions.\n\nIMPORTANT: Use the fetchSubtopicContent tool to read the actual content for each subtopic before writing questions.`
    );

    let questions: QuizQuestion[];
    try {
      const jsonMatch = result.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("No JSON array found in response");
      questions = JSON.parse(jsonMatch[0]) as QuizQuestion[];
    } catch {
      return NextResponse.json(
        { error: "Failed to parse assessment JSON", raw: result },
        { status: 500 }
      );
    }

    await saveModuleQuiz(topicRecord.id, moduleId, questions);

    return NextResponse.json({
      success: true,
      topicSlug,
      topicId: topicRecord.id,
      moduleId,
      questions,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Assessment generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
