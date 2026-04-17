import { NextRequest, NextResponse } from "next/server";
import {
  findTopicBySlug,
  findCurriculumByTopicId,
  findResearchByTopicId,
  findLearnerIntent,
  findLearnerInsights,
  getRecentObservations,
  findModuleContent,
  saveModuleContent,
  clearAudio,
  saveContentEvaluation,
  getContentEvaluations,
} from "@/lib/db/repository";
import { formatFullInterviewForAgent } from "@/lib/interview-context";
import { createContentComposer } from "@/agents/content-composer";
import { createContentEvaluator } from "@/agents/content-evaluator";
import { createFetchSourceContentTool } from "@/agents/tools/fetch-source-content";
import { createFetchPreviousSubtopicTool } from "@/agents/tools/fetch-previous-subtopic";
import { createFetchResearchContextTool } from "@/agents/tools/fetch-research-context";
import { runAgent } from "@/agents/runner";
import { findSourceStructure } from "@/lib/db/repository";
import { embedGeneratedContent } from "@/lib/embeddings/pipeline";
import type { BaseTool } from "@google/adk";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { slug, moduleId, sectionIndex, feedback } = body as {
    slug: string;
    moduleId: number;
    sectionIndex: number;
    feedback?: string;
  };

  if (!slug || moduleId === undefined || sectionIndex === undefined) {
    return NextResponse.json(
      { error: "slug, moduleId, and sectionIndex are required" },
      { status: 400 }
    );
  }

  const topicRecord = await findTopicBySlug(slug);
  if (!topicRecord) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  const curriculum = await findCurriculumByTopicId(topicRecord.id);
  if (!curriculum) {
    return NextResponse.json({ error: "Curriculum not found" }, { status: 404 });
  }

  const module = curriculum.modules.find((m) => m.id === moduleId);
  if (!module || !module.generated) {
    return NextResponse.json(
      { error: "Module not found or not generated" },
      { status: 400 }
    );
  }

  if (sectionIndex < 0 || sectionIndex >= module.subtopics.length) {
    return NextResponse.json(
      { error: "Invalid section index" },
      { status: 400 }
    );
  }

  const research = await findResearchByTopicId(topicRecord.id);
  if (!research) {
    return NextResponse.json({ error: "Research not found" }, { status: 400 });
  }

  // Build context (same as module/generate route)
  const learnerIntent = await findLearnerIntent(topicRecord.id);
  const interviewContext = learnerIntent
    ? formatFullInterviewForAgent(learnerIntent as Record<string, unknown>)
    : `Goal: ${curriculum.goal}`;

  // Learner context for the composer — starts from the full interview and
  // layers in learned insights + recent behavioral observations. Agents see
  // the raw transcript, not a re-derived labeled summary.
  const contextParts: string[] = [interviewContext];

  const learnerInsights = await findLearnerInsights(topicRecord.id);
  if (learnerInsights) {
    const weakAreas = learnerInsights.weakAreas as string[];
    const style = learnerInsights.learningStyle as Record<string, unknown>;
    const insightLines: string[] = [];
    if (weakAreas.length > 0) insightLines.push(`Weak areas: ${weakAreas.join(", ")}`);
    if (style?.preferredApproach) insightLines.push(`Preferred approach: ${style.preferredApproach}`);
    if (style?.paceCategory) insightLines.push(`Pace: ${style.paceCategory}`);
    if (style?.helpSeekingPattern) insightLines.push(`Help-seeking pattern: ${style.helpSeekingPattern}`);
    if (insightLines.length > 0) {
      contextParts.push(`\n## Learned insights (from quiz + chat analysis)\n${insightLines.join("\n")}`);
    }
  }

  const observations = await getRecentObservations(topicRecord.id, 25);
  if (observations.length > 0) {
    contextParts.push(
      `\n## Learning pattern observations (from chat)\n${observations.map((o) => `- ${o.observation}`).join("\n")}`
    );
  }

  const researchContext = JSON.stringify(research, null, 2);

  const learnerContext = contextParts.join("\n");

  // Build tools
  const tools: BaseTool[] = [createFetchResearchContextTool(topicRecord.id)];
  let sourceTitle: string | undefined;

  if (topicRecord.sourceType !== "topic_only") {
    const structure = await findSourceStructure(topicRecord.id);
    if (structure) {
      tools.push(
        createFetchSourceContentTool(topicRecord.id, slug, topicRecord.sourceType, topicRecord.sourcePath ?? "")
      );
      sourceTitle = structure.rawToc.title;
    }
  }

  // Build available subtopics for continuity tool
  const availableSubtopics: Array<{ id: string; title: string; dbKey: number }> = [];
  for (const mod of curriculum.modules) {
    if (mod.id < moduleId && mod.subtopics.length > 0) {
      mod.subtopics.forEach((s, i) => {
        availableSubtopics.push({ id: s.id, title: s.title, dbKey: mod.id * 100 + i });
      });
    } else if (mod.id === moduleId) {
      // Include all sections EXCEPT the one being regenerated (and after)
      mod.subtopics.slice(0, sectionIndex).forEach((s, i) => {
        availableSubtopics.push({ id: s.id, title: s.title, dbKey: mod.id * 100 + i });
      });
    }
  }

  if (availableSubtopics.length > 0) {
    tools.push(createFetchPreviousSubtopicTool(topicRecord.id, availableSubtopics));
  }

  const targetSection = module.subtopics[sectionIndex];
  const dbKey = moduleId * 100 + sectionIndex;

  try {
    // Clear audio cache
    await clearAudio(topicRecord.id, dbKey);

    // Build module map
    const moduleSubtopicList = module.subtopics
      .map((s, i) => `${s.id}: ${s.title}${i === sectionIndex ? " (REGENERATING)" : ""}`)
      .join("\n");

    const position: "first" | "middle" | "last" =
      sectionIndex === 0 ? "first" :
      sectionIndex === module.subtopics.length - 1 ? "last" : "middle";

    const subtopicDesc = `${targetSection.id}: ${targetSection.title}`;

    // Create composer and regenerate
    const composer = createContentComposer(
      topicRecord.displayName,
      curriculum.level,
      module.title,
      subtopicDesc,
      researchContext,
      {
        sourceTitle,
        tools,
        position,
        subtopicIndex: sectionIndex,
        totalSubtopics: module.subtopics.length,
        moduleSubtopicList,
        learnerContext,
        moduleId,
      }
    );

    let contentMessage = sectionIndex === 0
      ? `Teach this section. This is the opening section of the module.\n\nModule: ${module.title}\nSection: ${subtopicDesc}\n\nInclude diagrams inline wherever they genuinely help understanding.`
      : `Teach this section. Build naturally on what came before.\n\nModule: ${module.title}\nSection: ${subtopicDesc}\n\nUse the fetchPreviousSubtopic tool to read previous sections for context. Include diagrams inline wherever they genuinely help understanding.`;

    if (feedback) {
      contentMessage += `\n\nIMPORTANT — The learner requested this content be regenerated with this feedback: "${feedback}". Address their concerns.`;
    }

    let newContent = await runAgent(composer, contentMessage);

    // Evaluate
    try {
      const evaluator = createContentEvaluator(topicRecord.id, targetSection.title, position, curriculum.level);
      const evalResult = await runAgent(evaluator, `Evaluate this teaching content for "${targetSection.title}":\n\n${newContent}`);
      const evalCleaned = evalResult.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const evaluation = JSON.parse(evalCleaned);

      if (evaluation.overallScore < 75 && evaluation.issues?.length > 0) {
        const revisionMessage = `Your previous version needs improvement.\n\nIssues:\n${evaluation.issues.map((i: string) => `- ${i}`).join("\n")}\n\nSuggestions:\n${(evaluation.suggestions ?? []).map((s: string) => `- ${s}`).join("\n")}\n\nPrevious content:\n\n${newContent}\n\nRevise to address these issues.`;
        newContent = await runAgent(composer, revisionMessage);
      }

      const existingEvals = await getContentEvaluations(topicRecord.id, dbKey);
      saveContentEvaluation({
        topicId: topicRecord.id, moduleId, subtopicId: targetSection.id, dbKey,
        attempt: existingEvals.length + 1,
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
      console.warn("[regenerate-section] Evaluation failed, using first pass");
    }

    // Save regenerated content
    await saveModuleContent(topicRecord.id, dbKey, newContent, "", true, feedback ?? null);

    // Embed (fire-and-forget)
    embedGeneratedContent(topicRecord.id, dbKey, newContent, topicRecord.displayName, module.title, targetSection.title).catch(console.warn);

    // Re-evaluate downstream sections for continuity
    const downstreamResults: Array<{ index: number; action: "kept" | "regenerated"; title: string }> = [];

    for (let i = sectionIndex + 1; i < module.subtopics.length; i++) {
      const downstreamSection = module.subtopics[i];
      const downstreamDbKey = moduleId * 100 + i;
      const downstreamContent = await findModuleContent(topicRecord.id, downstreamDbKey);

      if (!downstreamContent?.content) {
        downstreamResults.push({ index: i, action: "kept", title: downstreamSection.title });
        continue;
      }

      // Evaluate continuity of downstream section against the new content
      try {
        const continuityEvaluator = createContentEvaluator(
          topicRecord.id,
          downstreamSection.title,
          i === module.subtopics.length - 1 ? "last" : "middle",
          curriculum.level
        );
        const evalResult = await runAgent(
          continuityEvaluator,
          `Evaluate this teaching content for "${downstreamSection.title}":\n\n${downstreamContent.content}`
        );
        const evalCleaned = evalResult.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const evaluation = JSON.parse(evalCleaned);

        // If continuity is severely broken (score < 60), regenerate this section too
        if (evaluation.continuityScore !== null && evaluation.continuityScore < 60) {
          // Regenerate this downstream section
          const downstreamTools = [...tools];
          const downstreamAvailable = module.subtopics.slice(0, i).map((s, idx) => ({
            id: s.id, title: s.title, dbKey: moduleId * 100 + idx,
          }));
          if (downstreamAvailable.length > 0) {
            downstreamTools.push(createFetchPreviousSubtopicTool(topicRecord.id, downstreamAvailable));
          }

          const downstreamComposer = createContentComposer(
            topicRecord.displayName, curriculum.level, module.title,
            `${downstreamSection.id}: ${downstreamSection.title}`,
            researchContext,
            {
              sourceTitle,
              tools: downstreamTools,
              position: i === module.subtopics.length - 1 ? "last" : "middle",
              subtopicIndex: i,
              totalSubtopics: module.subtopics.length,
              moduleSubtopicList,
              learnerContext,
              moduleId,
            }
          );

          const downstreamMessage = `Teach this section. The previous section was just regenerated, so build on the new version.\n\nModule: ${module.title}\nSection: ${downstreamSection.id}: ${downstreamSection.title}\n\nUse the fetchPreviousSubtopic tool to read what came before. Include diagrams inline wherever they genuinely help understanding.`;
          const newDownstreamContent = await runAgent(downstreamComposer, downstreamMessage);

          await clearAudio(topicRecord.id, downstreamDbKey);
          await saveModuleContent(topicRecord.id, downstreamDbKey, newDownstreamContent, "", true, "Auto-regenerated for continuity after upstream section change");
          embedGeneratedContent(topicRecord.id, downstreamDbKey, newDownstreamContent, topicRecord.displayName, module.title, downstreamSection.title).catch(console.warn);

          downstreamResults.push({ index: i, action: "regenerated", title: downstreamSection.title });
        } else {
          downstreamResults.push({ index: i, action: "kept", title: downstreamSection.title });
          // If this section is fine, no need to check further downstream
          break;
        }
      } catch {
        // Evaluation failed — keep the section as-is
        downstreamResults.push({ index: i, action: "kept", title: downstreamSection.title });
        break;
      }
    }

    return NextResponse.json({
      success: true,
      content: newContent,
      sectionIndex,
      downstreamResults,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Regeneration failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
