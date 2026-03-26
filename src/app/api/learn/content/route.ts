import { NextRequest, NextResponse } from "next/server";
import { generateSlug } from "@/lib/types/learning";
import {
  findTopicBySlug,
  findCurriculumByTopicId,
  findResearchByTopicId,
  findModuleContent,
  findSourceStructure,
  saveModuleContent,
} from "@/lib/db/repository";
import { createContentComposer } from "@/agents/content-composer";
import { createDiagramSpecialist } from "@/agents/diagram-specialist";
import { createFetchPDFSectionTool } from "@/agents/tools/fetch-pdf-section";
import { runAgent } from "@/agents/runner";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { topic, moduleId, subtopicId } = body;

  if (!topic || moduleId === undefined) {
    return NextResponse.json(
      { error: "topic and moduleId are required" },
      { status: 400 }
    );
  }

  const topicSlug = generateSlug(topic);
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

  // Check cache
  const cached = await findModuleContent(topicRecord.id, dbKey);
  if (cached) {
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

  const research = await findResearchByTopicId(topicRecord.id);
  if (!research) {
    return NextResponse.json(
      { error: "Research not found." },
      { status: 400 }
    );
  }

  const subtopicDesc = `${subtopic.id}: ${subtopic.title} (key concepts: ${subtopic.key_concepts.join(", ")})`;
  const researchContext = JSON.stringify(research, null, 2).slice(0, 6000);

  try {
    // Check if source-based and prepare tools
    let composerOptions: Parameters<typeof createContentComposer>[5];
    if (topicRecord.sourceType !== "topic_only") {
      const structure = await findSourceStructure(topicRecord.id);
      if (structure) {
        const fetchTool = createFetchPDFSectionTool(
          topicRecord.id,
          topicSlug
        );
        composerOptions = {
          sourceTitle: structure.rawToc.title,
          tools: [fetchTool],
        };
      }
    }

    const contentComposer = createContentComposer(
      topic,
      curriculum.level,
      module.title,
      subtopicDesc,
      researchContext,
      composerOptions
    );

    const diagramSpecialist = createDiagramSpecialist(
      topic,
      module.title,
      subtopicDesc
    );

    const contentMessage = `Write comprehensive, in-depth teaching content for this ONE subtopic only. Give it a full page of depth — this is the only subtopic the learner will read right now.\n\nModule: ${module.title}\nSubtopic: ${subtopicDesc}\n\nWrite all 7 sections with full depth. Target 1500-2000 words total.`;
    const diagramMessage = `Create a Mermaid diagram for this subtopic:\n${subtopicDesc}`;

    const [contentResult, diagramResult] = await Promise.all([
      runAgent(contentComposer, contentMessage),
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
    const message =
      error instanceof Error ? error.message : "Content generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
