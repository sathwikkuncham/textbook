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
  getLatestVersionNumber,
  getRecentObservations,
} from "@/lib/db/repository";
import { createContentComposer } from "@/agents/content-composer";
import { createContentEvaluator } from "@/agents/content-evaluator";
import { createFetchSourceContentTool } from "@/agents/tools/fetch-source-content";
import { createFetchPreviousSubtopicTool } from "@/agents/tools/fetch-previous-subtopic";
import { createFetchResearchContextTool } from "@/agents/tools/fetch-research-context";
import { createSignalSubtopicExpansionTool } from "@/agents/tools/signal-subtopic-expansion";
import { runAgent } from "@/agents/runner";
import { embedGeneratedContent } from "@/lib/embeddings/pipeline";
import type { BaseTool } from "@google/adk";

export const maxDuration = 300;

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
      hasPreviousVersion: !!cached.previousContent,
      currentVersion: await getLatestVersionNumber(topicRecord.id, dbKey),
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

    // Research context tool — agent can pull full research on demand
    tools.push(createFetchResearchContextTool(topicRecord.id));

    // Subtopic expansion tool — agent can signal when scope is too broad
    tools.push(createSignalSubtopicExpansionTool(topicRecord.id, moduleId, subtopic.id));

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

    // Learner observations from chat interactions
    const observations = await getRecentObservations(topicRecord.id, 25);
    if (observations.length > 0) {
      contextParts.push(
        `\nLearning pattern observations (from chat interactions):\n${observations.map((o) => `- ${o.observation}`).join("\n")}`
      );
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

    const contentMessage = position === "first"
      ? `Teach this subtopic. This is the only subtopic the learner will read right now — give it the depth it deserves.\n\nModule: ${module.title}\nSubtopic: ${subtopicDesc}\n\nInclude diagrams inline wherever they genuinely help understanding.`
      : `Teach this subtopic. Build naturally on what the learner has already covered.\n\nModule: ${module.title}\nSubtopic: ${subtopicDesc}\n\nUse the fetchPreviousSubtopic tool to read previous subtopics for context and continuity. Include diagrams inline wherever they genuinely help understanding.`;

    const feedbackSuffix = feedback
      ? `\n\nIMPORTANT — The learner requested this content be regenerated with this feedback: "${feedback}". Address their concerns in the new version.`
      : "";
    const finalContentMessage = contentMessage + feedbackSuffix;

    // Pass 1: Generate content (diagrams included inline by the same agent)
    let finalContent = await runAgent(contentComposer, finalContentMessage);

    // Pass 2: Synchronous evaluation — if issues found, revise once
    try {
      const evaluator = createContentEvaluator(topicRecord.id, subtopic.title, position as "first" | "middle" | "last", curriculum.level);
      const evalResult = await runAgent(evaluator, `Evaluate this teaching content for subtopic "${subtopic.title}":\n\n${finalContent}`);
      const evalCleaned = evalResult.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const evaluation = JSON.parse(evalCleaned);

      if (evaluation.overallScore < 75 && evaluation.issues?.length > 0) {
        // Revision pass — feed specific issues back to the composer
        const revisionMessage = `Your previous version of this content was evaluated and needs improvement.\n\nIssues found:\n${evaluation.issues.map((i: string) => `- ${i}`).join("\n")}\n\nSuggestions:\n${(evaluation.suggestions ?? []).map((s: string) => `- ${s}`).join("\n")}\n\nHere is your previous content:\n\n${finalContent}\n\nRevise it to address these issues. Keep what works, fix what doesn't.`;
        finalContent = await runAgent(contentComposer, revisionMessage);
      }

      // Log evaluation (fire-and-forget)
      const existingEvals = await getContentEvaluations(topicRecord.id, dbKey);
      const attempt = existingEvals.length + 1;
      saveContentEvaluation({
        topicId: topicRecord.id, moduleId, subtopicId: subtopic.id, dbKey, attempt,
        clarityScore: evaluation.clarityScore ?? 0,
        completenessScore: evaluation.completenessScore ?? 0,
        continuityScore: evaluation.continuityScore ?? null,
        exampleQualityScore: evaluation.exampleQualityScore ?? 0,
        accuracyScore: evaluation.accuracyScore ?? 0,
        overallScore: evaluation.overallScore ?? 0,
        verdict: evaluation.verdict ?? "unknown",
        issues: evaluation.issues ?? [],
        suggestions: evaluation.suggestions ?? [],
      }).catch(console.error);
    } catch {
      // Evaluation failed — proceed with first pass content
      console.warn("[content] Evaluation/revision pass failed, using first pass");
    }

    // Save final content (diagrams are inline, pass empty string for legacy diagrams column)
    await saveModuleContent(topicRecord.id, dbKey, finalContent, "", !!forceRegenerate, feedback ?? null);

    // Embed content for semantic search (fire-and-forget)
    embedGeneratedContent(
      topicRecord.id, dbKey, finalContent,
      topic, module.title, subtopic.title
    ).catch((err) => {
      console.warn("[content] Embedding failed:", err);
    });

    return NextResponse.json({
      success: true,
      topicSlug,
      topicId: topicRecord.id,
      moduleId,
      subtopicId: subtopic.id,
      content: finalContent,
      diagrams: "",
      hasPreviousVersion: !!forceRegenerate,
      currentVersion: await getLatestVersionNumber(topicRecord.id, dbKey),
    });
  } catch (error) {
    console.error("[content-api] Generation failed:", error);
    const message =
      error instanceof Error ? error.message : "Content generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
