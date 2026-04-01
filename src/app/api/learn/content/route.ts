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
  saveContentEvaluation,
  getContentEvaluations,
  findLearnerInsights,
  findLearnerIntent,
} from "@/lib/db/repository";
import { createContentComposer } from "@/agents/content-composer";
import { createContentEvaluator } from "@/agents/content-evaluator";
import { createDiagramSpecialist } from "@/agents/diagram-specialist";
import { createFetchSourceContentTool } from "@/agents/tools/fetch-source-content";
import { createFetchPreviousSubtopicTool } from "@/agents/tools/fetch-previous-subtopic";
import { runAgent } from "@/agents/runner";
import type { BaseTool } from "@google/adk";

async function evaluateContentAsync(
  topicId: number, moduleId: number, subtopicId: string, subtopicTitle: string,
  dbKey: number, content: string, position: "first" | "middle" | "last", level: string
) {
  const evaluator = createContentEvaluator(topicId, subtopicTitle, position, level);
  const evalResult = await runAgent(
    evaluator,
    `Evaluate this teaching content for subtopic "${subtopicTitle}":\n\n${content}`
  );

  try {
    const cleaned = evalResult.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const evaluation = JSON.parse(cleaned);

    const existingEvals = await getContentEvaluations(topicId, dbKey);
    const attempt = existingEvals.length + 1;

    await saveContentEvaluation({
      topicId, moduleId, subtopicId, dbKey, attempt,
      clarityScore: evaluation.clarityScore ?? 0,
      completenessScore: evaluation.completenessScore ?? 0,
      continuityScore: evaluation.continuityScore ?? null,
      exampleQualityScore: evaluation.exampleQualityScore ?? 0,
      accuracyScore: evaluation.accuracyScore ?? 0,
      overallScore: evaluation.overallScore ?? 0,
      verdict: evaluation.verdict ?? "pass",
      issues: evaluation.issues ?? [],
      suggestions: evaluation.suggestions ?? [],
    });

    console.log(`[content-eval] ${subtopicId}: score ${evaluation.overallScore}/100 — ${evaluation.verdict}`);
  } catch {
    console.warn(`[content-eval] Failed to parse evaluation for ${subtopicId}`);
  }
}

export const maxDuration = 180;

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
        tools.push(createFetchSourceContentTool(topicRecord.id, topicSlug, topicRecord.sourceType, topicRecord.sourcePath ?? ""));
        sourceTitle = structure.rawToc.title;
      }
    }

    // Cross-curriculum content tool — agent can read ANY previously generated subtopic
    // Builds available list from all previous modules + current module's earlier subtopics
    const allAvailableSubtopics: Array<{ id: string; title: string; dbKey: number }> = [];
    for (const mod of curriculum.modules) {
      if (mod.id < moduleId) {
        // All subtopics from completed modules
        mod.subtopics.forEach((s, i) => {
          allAvailableSubtopics.push({ id: s.id, title: s.title, dbKey: mod.id * 100 + i });
        });
      } else if (mod.id === moduleId && subtopicIndex > 0) {
        // Earlier subtopics in current module
        mod.subtopics.slice(0, subtopicIndex).forEach((s, i) => {
          allAvailableSubtopics.push({ id: s.id, title: s.title, dbKey: mod.id * 100 + i });
        });
      }
    }

    if (allAvailableSubtopics.length > 0) {
      tools.push(
        createFetchPreviousSubtopicTool(
          topicRecord.id,
          allAvailableSubtopics
        )
      );
    }

    // Fetch learner model + intent for adaptive content
    const contextParts: string[] = [];

    // Learner intent from interview
    const learnerIntent = await findLearnerIntent(topicRecord.id);
    if (learnerIntent) {
      const intent = learnerIntent as Record<string, unknown>;
      if (intent.purpose) contextParts.push(`Purpose: ${intent.purpose}`);
      if (intent.priorKnowledge) contextParts.push(`Prior knowledge: ${intent.priorKnowledge}`);
      if (intent.desiredDepth) contextParts.push(`Desired depth: ${intent.desiredDepth}`);
      const focusAreas = intent.focusAreas as string[] | undefined;
      if (focusAreas?.length) contextParts.push(`Focus areas: ${focusAreas.join(", ")}`);
    }

    // Learner model from quiz/chat analysis
    const learnerInsights = await findLearnerInsights(topicRecord.id);
    if (learnerInsights) {
      const weakAreas = learnerInsights.weakAreas as string[];
      const style = learnerInsights.learningStyle as Record<string, unknown>;
      if (weakAreas.length > 0) contextParts.push(`Weak areas: ${weakAreas.join(", ")}`);
      if (style?.preferredApproach) contextParts.push(`Preferred approach: ${style.preferredApproach}`);
      if (style?.paceCategory) contextParts.push(`Pace: ${style.paceCategory}`);
      if (style?.helpSeekingPattern) contextParts.push(`Help-seeking: ${style.helpSeekingPattern}`);
    }

    const learnerContext = contextParts.length > 0 ? contextParts.join("\n") : undefined;

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
        learnerContext,
        moduleId,
      }
    );

    const diagramSpecialist = createDiagramSpecialist(
      topic,
      module.title,
      subtopicDesc
    );

    const contentMessage = position === "first"
      ? `Write comprehensive, in-depth teaching content for this ONE subtopic only. Give it a full page of depth — this is the only subtopic the learner will read right now.\n\nModule: ${module.title}\nSubtopic: ${subtopicDesc}\n\nStructure the content in whatever way teaches this concept most effectively. Use ### N. Title format for sections.`
      : `Write comprehensive, in-depth teaching content for this ONE subtopic only. Build naturally on what the learner has already covered in this module.\n\nModule: ${module.title}\nSubtopic: ${subtopicDesc}\n\nUse the fetchPreviousSubtopic tool to read previous subtopics for context and continuity. Structure the content in whatever way teaches this concept most effectively. Use ### N. Title format for sections.`;

    const feedbackSuffix = feedback
      ? `\n\nIMPORTANT — The learner requested this content be regenerated with this feedback: "${feedback}". Address their concerns in the new version.`
      : "";
    const finalContentMessage = contentMessage + feedbackSuffix;

    const diagramMessage = `Create a Mermaid diagram for this subtopic:\n${subtopicDesc}`;

    const [initialContent, diagramResult] = await Promise.all([
      runAgent(contentComposer, finalContentMessage),
      runAgent(diagramSpecialist, diagramMessage),
    ]);

    // Save content immediately — don't block the user
    await saveModuleContent(topicRecord.id, dbKey, initialContent, diagramResult);

    // Run quality evaluation asynchronously (fire-and-forget)
    // Scores are logged for analytics; regeneration happens only via explicit user request
    evaluateContentAsync(
      topicRecord.id, moduleId, subtopic.id, subtopic.title, dbKey,
      initialContent, position as "first" | "middle" | "last", curriculum.level
    ).catch(console.error);

    return NextResponse.json({
      success: true,
      topicSlug,
      topicId: topicRecord.id,
      moduleId,
      subtopicId: subtopic.id,
      content: initialContent,
      diagrams: diagramResult,
    });
  } catch (error) {
    console.error("[content-api] Generation failed:", error);
    const message =
      error instanceof Error ? error.message : "Content generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
