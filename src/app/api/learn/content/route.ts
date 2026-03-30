import { NextRequest, NextResponse } from "next/server";
import { generateSlug } from "@/lib/types/learning";
import {
  findTopicBySlug,
  findCurriculumByTopicId,
  findResearchByTopicId,
  findModuleContent,
  findSourceStructure,
  saveModuleContent,
  clearAudio,
} from "@/lib/db/repository";
import { createContentComposer } from "@/agents/content-composer";
import { createDiagramSpecialist } from "@/agents/diagram-specialist";
import { createFetchPDFSectionTool } from "@/agents/tools/fetch-pdf-section";
import { createFetchPreviousSubtopicTool } from "@/agents/tools/fetch-previous-subtopic";
import { runAgent } from "@/agents/runner";
import type { BaseTool } from "@google/adk";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { topic, slug: providedSlug, moduleId, subtopicId, forceRegenerate, feedback } = body;

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
      { error: `Module ${moduleId} not found in curriculum` },
      { status: 404 }
    );
  }

  // Find the specific subtopic
  const subtopic = subtopicId
    ? module.subtopics.find((s) => s.id === subtopicId)
    : module.subtopics[0];

  if (!subtopic) {
    return NextResponse.json(
      { error: `Subtopic ${subtopicId} not found` },
      { status: 404 }
    );
  }

  // Use a unique DB key per subtopic: moduleId * 100 + subtopic index
  const subtopicIndex = module.subtopics.findIndex((s) => s.id === subtopic.id);
  const dbKey = moduleId * 100 + subtopicIndex;

  // Check cache (skip if regenerating)
  const cached = await findModuleContent(topicRecord.id, dbKey);
  if (cached && !forceRegenerate) {
    return NextResponse.json({
      success: true,
      topicSlug,
      topicId: topicRecord.id,
      moduleId,
      subtopicId: subtopic.id,
      content: cached.content,
      diagrams: cached.diagrams,
      cached: true,
    });
  }

  // Clear audio cache if regenerating
  if (forceRegenerate) {
    await clearAudio(topicRecord.id, dbKey);
  }

  const research = await findResearchByTopicId(topicRecord.id);
  if (!research) {
    return NextResponse.json(
      { error: "Research not found." },
      { status: 400 }
    );
  }

  const subtopicDesc = `${subtopic.id}: ${subtopic.title} (key concepts: ${subtopic.key_concepts.join(", ")})`;
  // Strip curly braces from research context — the @google/adk template
  // engine interprets {word} patterns as context variables, so code examples
  // like {useState} or {count} from React/JS research data cause errors.
  // The research context is supplementary AI context, not user-facing content.
  const researchContext = JSON.stringify(research, null, 2)
    .slice(0, 6000)
    .replace(/[{}]/g, "");

  // Compute subtopic position within the module
  const totalSubtopics = module.subtopics.length;
  const isFirst = subtopicIndex === 0;
  const isLast = subtopicIndex === totalSubtopics - 1 && totalSubtopics > 1;
  const position = isFirst ? "first" : isLast ? "last" : "middle";

  const moduleSubtopicList = module.subtopics
    .map((s, i) => `${s.id}: ${s.title}${i === subtopicIndex ? " (CURRENT)" : ""}`)
    .join("\n");

  try {
    // Build tools array — agent decides what context it needs
    const tools: BaseTool[] = [];
    let sourceTitle: string | undefined;

    // Source material tool (for PDF-based topics)
    if (topicRecord.sourceType !== "topic_only") {
      const structure = await findSourceStructure(topicRecord.id);
      if (structure) {
        tools.push(createFetchPDFSectionTool(topicRecord.id, topicSlug));
        sourceTitle = structure.rawToc.title;
      }
    }

    // Previous subtopic tool (for continuity — not available for first subtopic)
    if (!isFirst) {
      tools.push(
        createFetchPreviousSubtopicTool(
          topicRecord.id,
          moduleId,
          subtopicIndex,
          module.subtopics
        )
      );
    }

    const contentComposer = createContentComposer(
      topic,
      curriculum.level,
      module.title,
      subtopicDesc,
      researchContext,
      {
        sourceTitle,
        tools: tools.length > 0 ? tools : undefined,
        position: position as "first" | "middle" | "last",
        subtopicIndex,
        totalSubtopics,
        teachingApproach: subtopic.teaching_approach,
        moduleSubtopicList,
      }
    );

    const diagramSpecialist = createDiagramSpecialist(
      topic,
      module.title,
      subtopicDesc
    );

    const contentMessage = position === "first"
      ? `Write comprehensive, in-depth teaching content for this ONE subtopic only. Give it a full page of depth — this is the only subtopic the learner will read right now.\n\nModule: ${module.title}\nSubtopic: ${subtopicDesc}\n\nWrite all 7 sections with full depth. Target 1500-2000 words total.`
      : `Write comprehensive, in-depth teaching content for this ONE subtopic only. Build naturally on what the learner has already covered in this module.\n\nModule: ${module.title}\nSubtopic: ${subtopicDesc}\n\nUse the fetchPreviousSubtopic tool to read previous subtopics for context and continuity. Write all 7 sections with full depth. Target 1500-2000 words total.`;

    const feedbackSuffix = feedback
      ? `\n\nIMPORTANT — The learner requested this content be regenerated with this feedback: "${feedback}". Address their concerns in the new version.`
      : "";
    const finalContentMessage = contentMessage + feedbackSuffix;

    const diagramMessage = `Create a Mermaid diagram for this subtopic:\n${subtopicDesc}`;

    const [contentResult, diagramResult] = await Promise.all([
      runAgent(contentComposer, finalContentMessage),
      runAgent(diagramSpecialist, diagramMessage),
    ]);

    await saveModuleContent(
      topicRecord.id,
      dbKey,
      contentResult,
      diagramResult
    );

    return NextResponse.json({
      success: true,
      topicSlug,
      topicId: topicRecord.id,
      moduleId,
      subtopicId: subtopic.id,
      content: contentResult,
      diagrams: diagramResult,
    });
  } catch (error) {
    console.error("[content-api] Generation failed:", error);
    const message =
      error instanceof Error ? error.message : "Content generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
