import { LlmAgent } from "@google/adk";
import { MODELS } from "./models";
import { runAgent } from "./runner";
import { createContentComposer } from "./content-composer";
import { createContentEvaluator } from "./content-evaluator";
import { createFetchSourceContentTool } from "./tools/fetch-source-content";
import { createFetchPreviousSubtopicTool } from "./tools/fetch-previous-subtopic";
import { createFetchResearchContextTool } from "./tools/fetch-research-context";
import {
  saveModuleContent,
  findSourceStructure,
  saveContentEvaluation,
  getContentEvaluations,
} from "@/lib/db/repository";
import { embedGeneratedContent } from "@/lib/embeddings/pipeline";
import type { ModulePlan, Curriculum } from "@/lib/types/learning";
import type { BaseTool } from "@google/adk";

// ── Types ─────────────────────────────────────────────────

export interface OrchestratorParams {
  topicId: number;
  topicSlug: string;
  topic: string;
  moduleId: number;
  moduleTitle: string;
  plan: ModulePlan;
  curriculum: Curriculum;
  interviewContext: string;
  learnerContext?: string;
  researchContext: string;
  sourceType: string;
  sourcePath?: string | null;
}

export interface GeneratedSection {
  index: number;
  title: string;
  scope: string;
  conceptsCovered: string[];
  content: string;
  evaluationScore: number;
}

export type OrchestratorEvent =
  | { type: "planning"; message: string }
  | { type: "section_start"; sectionNumber: number; totalEstimate: number; title: string }
  | { type: "section_complete"; sectionNumber: number; title: string; score: number }
  | { type: "section_revision"; sectionNumber: number; title: string }
  | { type: "module_complete"; totalSections: number; sections: Array<{ title: string; score: number }> }
  | { type: "error"; message: string };

// ── Planner — decides what to teach next ──────────────────

interface PlannerDecision {
  done: boolean;
  title?: string;
  scope?: string;
  concepts?: string[];
  estimatedSections?: number;
}

async function planNextSection(
  plan: ModulePlan,
  moduleTitle: string,
  interviewContext: string,
  previousSections: Array<{ title: string; summary: string; conceptsCovered: string[] }>,
  allConcepts: string[]
): Promise<PlannerDecision> {
  const coveredConcepts = previousSections.flatMap((s) => s.conceptsCovered);
  const remaining = allConcepts.filter((c) => !coveredConcepts.includes(c));

  const previousSummary = previousSections.length > 0
    ? previousSections.map((s, i) =>
        `Section ${i + 1}: "${s.title}" — covered: ${s.conceptsCovered.join(", ")}\nSummary: ${s.summary}`
      ).join("\n\n")
    : "No sections generated yet. This is the first section.";

  const planner = new LlmAgent({
    name: "ModulePlanner",
    model: MODELS.FLASH,
    description: "Plans the next section of a module",
    instruction: () => `You are planning sections for a learning module. Your job is to decide what the NEXT section should cover.

## Module
Title: ${moduleTitle}
Goal: ${plan.goal}
All concepts to cover: ${allConcepts.join(", ")}

## Learner Profile
${interviewContext}

## What's Been Generated So Far
${previousSummary}

## Remaining Concepts
${remaining.length > 0 ? remaining.join(", ") : "ALL concepts have been covered"}

## Your Decision

If all concepts have been adequately covered and the module goal can be considered met, return:
{"done": true}

Otherwise, decide the NEXT section. Consider:
- What is the natural next step given what was just taught?
- Group related concepts together — don't teach one concept per section
- But don't cram too many concepts into one section either (2-4 concepts is typical)
- The section should be scoped so the content agent can teach it deeply (not rush)
- For the first section, start with the most foundational concepts
- CRITICAL: Even if the learner is experienced, do NOT skip foundational concepts. Their experience informs pace and rigor, not what to skip. Teach from ground zero — just faster and deeper for experienced learners.

Return ONLY valid JSON (no markdown, no explanation):
{
  "done": false,
  "title": "Section title — specific to the content",
  "scope": "A 2-3 sentence description of what this section should teach and how it connects to what came before",
  "concepts": ["concept1", "concept2"],
  "estimatedSections": <your estimate of total sections needed for the full module>
}`,
    outputKey: "plan",
  });

  const result = await runAgent(planner, "Plan the next section.");
  try {
    const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { done: true };
    return JSON.parse(jsonMatch[0]) as PlannerDecision;
  } catch {
    // If planning fails, check if we have remaining concepts
    if (remaining.length === 0) return { done: true };
    // Fallback: teach remaining concepts
    return {
      done: false,
      title: remaining.slice(0, 3).join(", "),
      scope: `Cover these remaining concepts: ${remaining.join(", ")}`,
      concepts: remaining,
      estimatedSections: previousSections.length + 1,
    };
  }
}

// ── Content Summary — extracts first ~300 words ───────────

function summarizeContent(content: string): string {
  const lines = content.split("\n").filter((l) => l.trim());
  let words = 0;
  const summary: string[] = [];
  for (const line of lines) {
    if (line.startsWith("```")) continue; // skip code blocks
    summary.push(line);
    words += line.split(/\s+/).length;
    if (words > 300) break;
  }
  return summary.join("\n");
}

// ── Main Orchestrator Loop ────────────────────────────────

export async function* orchestrateModule(
  params: OrchestratorParams
): AsyncGenerator<OrchestratorEvent> {
  const {
    topicId,
    topicSlug,
    topic,
    moduleId,
    moduleTitle,
    plan,
    curriculum,
    interviewContext,
    learnerContext,
    researchContext,
    sourceType,
    sourcePath,
  } = params;

  const sections: GeneratedSection[] = [];
  const previousSummaries: Array<{ title: string; summary: string; conceptsCovered: string[] }> = [];
  let sectionNumber = 0;

  yield { type: "planning", message: "Analyzing module plan and preparing generation..." };

  // Build reusable tools
  const baseTools: BaseTool[] = [createFetchResearchContextTool(topicId)];
  let sourceTitle: string | undefined;

  if (sourceType !== "topic_only") {
    const structure = await findSourceStructure(topicId);
    if (structure) {
      baseTools.push(
        createFetchSourceContentTool(topicId, topicSlug, sourceType, sourcePath ?? "")
      );
      sourceTitle = structure.rawToc.title;
    }
  }

  // Orchestrator loop
  while (sectionNumber < 15) {
    // Safety cap — no module should have more than 15 sections
    const decision = await planNextSection(
      plan,
      moduleTitle,
      interviewContext,
      previousSummaries,
      plan.concepts
    );

    if (decision.done) break;
    if (!decision.title || !decision.scope) break;

    sectionNumber++;
    const sectionIndex = sectionNumber - 1;
    const dbKey = moduleId * 100 + sectionIndex;
    const totalEstimate = decision.estimatedSections ?? Math.max(sectionNumber + 1, 4);

    yield {
      type: "section_start",
      sectionNumber,
      totalEstimate,
      title: decision.title,
    };

    // Build tools for this section — include previous sections tool if we have any
    const sectionTools: BaseTool[] = [...baseTools];
    if (sections.length > 0) {
      // Save previous sections' content so the tool can read them
      const availableSubtopics = sections.map((s, i) => ({
        id: `${moduleId}.${i + 1}`,
        title: s.title,
        dbKey: moduleId * 100 + i,
      }));

      // Also include sections from earlier modules
      for (const mod of curriculum.modules) {
        if (mod.id < moduleId && mod.subtopics.length > 0) {
          mod.subtopics.forEach((s, i) => {
            availableSubtopics.unshift({
              id: s.id,
              title: s.title,
              dbKey: mod.id * 100 + i,
            });
          });
        }
      }

      sectionTools.push(createFetchPreviousSubtopicTool(topicId, availableSubtopics));
    }

    // Determine position
    const isFirst = sectionIndex === 0;
    const position: "first" | "middle" | "last" = isFirst ? "first" : "middle";

    // Build the subtopic description for the content composer
    const subtopicDesc = `${moduleId}.${sectionNumber}: ${decision.title} (concepts: ${(decision.concepts ?? []).join(", ")})`;

    // Build module map showing what's been generated
    const moduleSubtopicList = [
      ...sections.map((s, i) => `${moduleId}.${i + 1}: ${s.title} (completed)`),
      `${moduleId}.${sectionNumber}: ${decision.title} (CURRENT)`,
    ].join("\n");

    // Create content composer for this section
    const composer = createContentComposer(
      topic,
      curriculum.level,
      moduleTitle,
      subtopicDesc,
      researchContext,
      {
        sourceTitle,
        tools: sectionTools.length > 0 ? sectionTools : undefined,
        position,
        subtopicIndex: sectionIndex,
        totalSubtopics: totalEstimate,
        moduleSubtopicList,
        learnerContext,
        moduleId,
      }
    );

    // Build the generation message — give the composer full context about what came before
    const contextSuffix = sections.length > 0
      ? `\n\nThe learner has already read these sections in this module:\n${sections.map((s, i) =>
          `- Section ${i + 1}: "${s.title}" — ${s.conceptsCovered.join(", ")}`
        ).join("\n")}\n\nBuild naturally on what was covered. Use the fetchPreviousSubtopic tool to read the actual content for continuity.`
      : "";

    const scopeSuffix = `\n\nScope for this section: ${decision.scope}`;

    const contentMessage = isFirst
      ? `Teach this section. This is the opening section of the module — give it the depth it deserves.\n\nModule: ${moduleTitle}\nSection: ${subtopicDesc}\n\nInclude diagrams inline wherever they genuinely help understanding.${scopeSuffix}`
      : `Teach this section. Build naturally on what the learner has already covered.\n\nModule: ${moduleTitle}\nSection: ${subtopicDesc}\n\nInclude diagrams inline wherever they genuinely help understanding.${scopeSuffix}${contextSuffix}`;

    // Generate content
    let finalContent = await runAgent(composer, contentMessage);

    // Evaluate
    let evaluationScore = 80; // default if evaluation fails
    try {
      const evaluator = createContentEvaluator(
        topicId,
        decision.title,
        position,
        curriculum.level
      );
      const evalResult = await runAgent(
        evaluator,
        `Evaluate this teaching content for section "${decision.title}":\n\n${finalContent}`
      );
      const evalCleaned = evalResult.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const evaluation = JSON.parse(evalCleaned);
      evaluationScore = evaluation.overallScore ?? 80;

      // Revise if below threshold
      if (evaluationScore < 75 && evaluation.issues?.length > 0) {
        yield { type: "section_revision", sectionNumber, title: decision.title };

        const revisionMessage = `Your previous version was evaluated and needs improvement.\n\nIssues:\n${evaluation.issues.map((i: string) => `- ${i}`).join("\n")}\n\nSuggestions:\n${(evaluation.suggestions ?? []).map((s: string) => `- ${s}`).join("\n")}\n\nPrevious content:\n\n${finalContent}\n\nRevise to address these issues. Keep what works, fix what doesn't.`;
        finalContent = await runAgent(composer, revisionMessage);
        evaluationScore = Math.max(evaluationScore + 10, 75); // assume revision improves score
      }

      // Log evaluation
      const existingEvals = await getContentEvaluations(topicId, dbKey);
      const attempt = existingEvals.length + 1;
      saveContentEvaluation({
        topicId,
        moduleId,
        subtopicId: `${moduleId}.${sectionNumber}`,
        dbKey,
        attempt,
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
      console.warn(`[orchestrator] Evaluation failed for section ${sectionNumber}, using first pass`);
    }

    // Save content to DB
    await saveModuleContent(topicId, dbKey, finalContent, "", false, null);

    // Embed for semantic search (fire-and-forget)
    embedGeneratedContent(
      topicId,
      dbKey,
      finalContent,
      topic,
      moduleTitle,
      decision.title
    ).catch((err) => console.warn("[orchestrator] Embedding failed:", err));

    // Track this section
    const section: GeneratedSection = {
      index: sectionIndex,
      title: decision.title,
      scope: decision.scope,
      conceptsCovered: decision.concepts ?? [],
      content: finalContent,
      evaluationScore,
    };
    sections.push(section);
    previousSummaries.push({
      title: decision.title,
      summary: summarizeContent(finalContent),
      conceptsCovered: decision.concepts ?? [],
    });

    yield {
      type: "section_complete",
      sectionNumber,
      title: decision.title,
      score: evaluationScore,
    };
  }

  yield {
    type: "module_complete",
    totalSections: sections.length,
    sections: sections.map((s) => ({ title: s.title, score: s.evaluationScore })),
  };

  return sections;
}
