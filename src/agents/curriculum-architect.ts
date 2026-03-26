import { LlmAgent } from "@google/adk";
import { MODELS } from "./models";
import type { UserScopeSelection, SourceToc } from "@/lib/types/learning";

interface SourceContext {
  toc: SourceToc;
  scope: UserScopeSelection;
}

export function createCurriculumArchitect(
  topic: string,
  level: string,
  goal: string,
  timeCommitment: string,
  source?: SourceContext
) {
  const moduleGuidance =
    timeCommitment === "quick"
      ? "Design 2-3 modules for a quick overview (~30-60 minutes total)."
      : timeCommitment === "deep"
        ? "Design 7-10+ modules for a comprehensive deep dive (8+ hours total)."
        : "Design 4-6 modules for a standard learning experience (2-4 hours total).";

  const sourceGuidance = source
    ? `
## Source Material

This learning path is based on a specific source document: "${source.toc.title}" by ${source.toc.author ?? "unknown author"}.

The user has selected these chapters/sections to study:
${source.scope.included.map((id) => {
  const ch = source.toc.chapters.find((c) => c.id === id);
  if (ch) {
    const priority = source.scope.priorities[id] ?? "normal";
    return `- ${ch.title} (pp. ${ch.pageStart}-${ch.pageEnd}) [${priority}]`;
  }
  return `- ${id}`;
}).join("\n")}

Excluded chapters: ${source.scope.excluded.length > 0 ? source.scope.excluded.join(", ") : "none"}

CRITICAL RULES for source-based curriculum:
1. Each selected chapter should map to AT LEAST one module. Do NOT merge multiple chapters into a single module unless they are very short (under 10 pages each).
2. Large chapters (30+ pages) should be split into 2-3 modules.
3. Chapters marked [deep] should get 4-5 subtopics with 25-30 minutes each.
4. Follow the source document's chapter order — do not reorder unless there is a strong pedagogical reason.
5. The total number of modules should be proportional to the number of selected chapters. If 12 chapters are selected, expect 10-15 modules minimum.
6. Each subtopic should map to a specific section or concept range within the chapter.
7. Time estimates should reflect the actual page count — a 30-page chapter needs at least 60-90 minutes of study time, not 15 minutes.`
    : "";

  return new LlmAgent({
    name: "CurriculumArchitect",
    model: MODELS.FLASH,
    description: "Designs optimal learning paths from research output",
    instruction: `You are an expert instructional designer who creates optimal learning paths. Transform research findings into a carefully sequenced curriculum that respects concept dependencies, builds complexity progressively, and includes meaningful assessment checkpoints.

## Your Task

Design a complete learning curriculum for: **${topic}**
Learner level: **${level}**
Learning goal: **${goal}**
Time commitment: **${timeCommitment}**

${moduleGuidance}
${sourceGuidance}

## Research Context

The research findings will be provided in the user message. Use them thoroughly to inform your curriculum design.

## Module Design Principles

- Group concepts into modules ordered by progressive complexity
- Each module should have a coherent theme and clear purpose
- Begin every module description with why it matters
- Build from simple to complex within each module
- End every module with a checkpoint assessment (70% pass threshold)
- Keep modules roughly balanced in scope (2-4 subtopics each)
- Respect dependency boundaries absolutely — no module should require knowledge from a later module
- No concept is taught before its prerequisites

## Subtopic Design

For each subtopic define:
- Specific concepts it covers
- Key concepts list
- Estimated learning time (10-30 minutes per subtopic)
- Teaching approach: "first-principles" | "analogy-driven" | "example-first" | "visual"

## Output Format

Return ONLY a valid JSON object (no markdown, no code fences, no explanation) with this structure:

{
  "topic": "${topic}",
  "topic_slug": "topic-slug-here",
  "level": "${level}",
  "goal": "${goal}",
  "estimated_total_minutes": 240,
  "modules": [
    {
      "id": 1,
      "title": "Module Title",
      "estimated_minutes": 55,
      "description": "What this module covers and why it matters",
      "subtopics": [
        {
          "id": "1.1",
          "title": "Subtopic Title",
          "estimated_minutes": 15,
          "key_concepts": ["concept1", "concept2"],
          "teaching_approach": "first-principles"
        }
      ],
      "checkpoint": {
        "type": "quiz",
        "num_questions": 5,
        "pass_threshold": 70,
        "question_types": ["conceptual", "application", "true_false"]
      }
    }
  ]
}`,
    outputKey: "curriculum",
  });
}
