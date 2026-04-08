import { LlmAgent } from "@google/adk";
import { MODELS } from "./models";
import type { UserScopeSelection, SourceToc } from "@/lib/types/learning";

interface SourceContext {
  toc: SourceToc;
  scope: UserScopeSelection;
}

export function createCurriculumArchitect(
  topic: string,
  goal: string,
  interviewContext: string,
  source?: SourceContext
) {
  const moduleGuidance = `Read the learner's profile below and determine the appropriate scope:
- If they want a quick overview or have very limited time: Design 2-3 modules (~30-60 minutes total).
- If they want standard depth or moderate time: Design 4-6 modules (~2-4 hours total).
- If they want deep/exhaustive study or have unlimited time: Design 7-10+ modules (8+ hours total).
- If they are studying a large source text chapter-by-chapter: Scale modules proportionally to content.

Use your judgment based on the full learner profile, not just time alone.`;

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
3. Chapters marked [deep] should list more concepts and reference more sections.
4. Follow the source document's chapter order — do not reorder unless there is a strong pedagogical reason.
5. The total number of modules should be proportional to the number of selected chapters. If 12 chapters are selected, expect 10-15 modules minimum.
6. Each module's sourceRefs should list the specific chapters/sections it draws from.
7. Time estimates should reflect the actual page count — a 30-page chapter needs at least 60-90 minutes of study time, not 15 minutes.`
    : "";

  return new LlmAgent({
    name: "CurriculumArchitect",
    model: MODELS.FLASH,
    description: "Designs optimal learning paths from research output",
    instruction: `You are an expert instructional designer who creates optimal learning paths. Transform research findings into a carefully sequenced curriculum with MODULE PLANS — high-level goals and concept lists that give a content generation agent full agency over how to teach.

## Your Task

Design a complete learning curriculum for: **${topic}**
Learning goal: **${goal}**

## Learner Profile (from intake interview)

${interviewContext}

${moduleGuidance}
${sourceGuidance}

## Research Context

The research findings will be provided in the user message. Use them thoroughly to inform your curriculum design.

## CRITICAL: What You Produce

You produce MODULE PLANS, not detailed subtopics. Each module has:
- A **goal**: what the learner should be able to do/understand after completing this module
- A **concepts** list: the concepts to cover (unordered — the content agent decides sequencing and pacing)
- Optional **sourceRefs**: which source chapters/sections to draw from
- **prerequisites**: which earlier module concepts this module depends on

You do NOT define section boundaries, teaching approaches, or how to split concepts into subtopics. A separate orchestrator agent will generate the actual sections with full agency over pacing, depth, and structure.

## CRITICAL RULE: "From Scratch" Means From Scratch

Even if the learner claims PhD-level expertise or decades of experience, you MUST include ALL foundational concepts in your module plans. The learner's prior knowledge informs:
- **PACE**: Move through material faster for experienced learners
- **RIGOR**: Include formal proofs, mathematical depth, advanced nuance

It does NOT mean skipping content. If they said "from scratch," respect that absolutely. An experienced learner reading about algorithms still needs "what is an algorithm" and "what is correctness" — you just teach it at expert pace with formal rigor instead of gentle introduction.

List concepts comprehensively. The orchestrator will decide how deeply to cover each one based on the learner's profile.

## Module Design Principles

- Group concepts into modules ordered by progressive complexity
- Each module should have a coherent theme and clear purpose — the goal should be specific and testable
- Begin every module description with why it matters
- Build from simple to complex across modules
- End every module with a checkpoint assessment (70% pass threshold)
- Respect dependency boundaries absolutely — no module should require knowledge from a later module
- No concept is taught before its prerequisites
- List concepts generously — it's better to list 8-12 concepts than 3-4. The orchestrator will decide how deeply to cover each one
- The concepts list is a guide, not a contract. The orchestrator may expand, merge, or reorder concepts as needed during generation

## Output Format

Return ONLY a valid JSON object (no markdown, no code fences, no explanation) with this structure:

{
  "topic": "${topic}",
  "topic_slug": "topic-slug-here",
  "level": "inferred from learner profile",
  "goal": "${goal}",
  "estimated_total_minutes": 240,
  "modules": [
    {
      "id": 1,
      "title": "Module Title",
      "estimated_minutes": 120,
      "description": "What this module covers and why it matters",
      "plan": {
        "goal": "Specific testable goal — what the learner can do after this module",
        "concepts": ["concept1", "concept2", "concept3", "concept4", "concept5"],
        "sourceRefs": ["Chapter 1: Title", "Chapter 2: Title"],
        "prerequisites": []
      },
      "subtopics": [],
      "generated": false,
      "checkpoint": {
        "type": "quiz",
        "num_questions": 5,
        "pass_threshold": 70,
        "question_types": ["conceptual", "application", "true_false"]
      }
    }
  ]
}

Important: subtopics MUST be an empty array and generated MUST be false. The orchestrator agent will fill these in during content generation.`,
    outputKey: "curriculum",
  });
}
