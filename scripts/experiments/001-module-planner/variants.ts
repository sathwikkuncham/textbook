/**
 * Module Planner — candidate variants for empirical validation.
 *
 * Each variant produces the instruction string that gets set on the LlmAgent.
 * Variants differ by model, prompt, and context shape.
 */

import type { ModulePlan } from "@/lib/types/learning";

export type PlannerVariantId = "A" | "B" | "C" | "D" | "E";

export interface PlannerVariantConfig {
  id: PlannerVariantId;
  name: string;
  description: string;
  model: "gemini-3-flash-preview" | "gemini-3.1-pro-preview";
  buildInstruction: (params: PlannerInputs) => string;
}

export interface PlannerInputs {
  moduleTitle: string;
  plan: ModulePlan;
  compressedInterview: string;
  rawTranscript: string;
  previousSections: Array<{ title: string; summary: string; conceptsCovered: string[] }>;
  allConcepts: string[];
}

// ── Shared helpers ──────────────────────────────────────────

function buildPreviousSummary(previousSections: PlannerInputs["previousSections"]): string {
  return previousSections.length > 0
    ? previousSections.map((s, i) =>
        `Section ${i + 1}: "${s.title}" — covered: ${s.conceptsCovered.join(", ")}\nSummary: ${s.summary}`
      ).join("\n\n")
    : "No sections generated yet. This is the first section.";
}

function buildRemaining(previousSections: PlannerInputs["previousSections"], allConcepts: string[]): string {
  const coveredConcepts = previousSections.flatMap((s) => s.conceptsCovered);
  const remaining = allConcepts.filter((c) => !coveredConcepts.includes(c));
  return remaining.length > 0 ? remaining.join(", ") : "ALL concepts have been covered";
}

// ── Variant A: Baseline (exact current prompt + FLASH) ──────

export const variantA: PlannerVariantConfig = {
  id: "A",
  name: "Baseline (current production)",
  description: "Exact current prompt, FLASH model, compressed interview context.",
  model: "gemini-3-flash-preview",
  buildInstruction: ({ moduleTitle, plan, compressedInterview, previousSections, allConcepts }) =>
    `You are planning sections for a learning module. Your job is to decide what the NEXT section should cover.

## Module
Title: ${moduleTitle}
Goal: ${plan.goal}
All concepts to cover: ${allConcepts.join(", ")}

## Learner Profile
${compressedInterview}

## What's Been Generated So Far
${buildPreviousSummary(previousSections)}

## Remaining Concepts
${buildRemaining(previousSections, allConcepts)}

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
};

// ── Variant B: Same prompt, PRO model ───────────────────────

export const variantB: PlannerVariantConfig = {
  id: "B",
  name: "Model swap only (PRO)",
  description: "Identical baseline prompt, only model changes to PRO.",
  model: "gemini-3.1-pro-preview",
  buildInstruction: variantA.buildInstruction,
};

// ── Variant C: PRO + depth enforcement ──────────────────────

export const variantC: PlannerVariantConfig = {
  id: "C",
  name: "PRO + depth enforcement",
  description: "PRO model with explicit depth-respecting guidance added.",
  model: "gemini-3.1-pro-preview",
  buildInstruction: ({ moduleTitle, plan, compressedInterview, previousSections, allConcepts }) =>
    `You are planning sections for a learning module. Your job is to decide what the NEXT section should cover.

## Module
Title: ${moduleTitle}
Goal: ${plan.goal}
All concepts to cover: ${allConcepts.join(", ")}

## Learner Profile
${compressedInterview}

## What's Been Generated So Far
${buildPreviousSummary(previousSections)}

## Remaining Concepts
${buildRemaining(previousSections, allConcepts)}

## CRITICAL: Honor the Learner's Stated Depth

Before deciding, READ the learner profile carefully and identify:
1. How much time do they have? (e.g., "30 min quick overview" vs "no time limit, exhaustive")
2. How deeply do they want to understand? (e.g., "just the highlights" vs "first-principles, ground up")
3. Are they rusty on prerequisites? (e.g., "rusty in math" means more scaffolding, not less)

Match your section count and scope to their request:
- "Quick overview" / limited time → 2-3 sections, broader scoping (3-4 concepts per section OK)
- "Standard depth" → 3-5 sections, 2-3 concepts per section
- "Exhaustive / first-principles / no time limit" → 5-8 sections, 1-2 concepts per section

A learner who said "exhaustive, no time limit, I can go to any depth" being given 2 sections to cover 6 concepts is a FAILURE. You are betraying their explicit request.

Err on the side of MORE sections, not fewer, when in doubt.

## Your Decision

If all concepts have been adequately covered AND the requested depth has been honored, return:
{"done": true}

Otherwise, decide the NEXT section. Rules:
- Group only CLOSELY related concepts (e.g., Shannon entropy + information content — yes; Shannon entropy + Markov chains — no, those are distinct foundations)
- For exhaustive depth, 1-3 concepts per section. For standard, 2-3. For overview, 3-4.
- The section scope must let the content agent build intuition BEFORE formulas, derivations, or technical terms
- For the first section, start with the single most foundational concept
- Even if the learner is experienced, teach from ground zero — experience informs pace and rigor, not what to skip

Return ONLY valid JSON (no markdown, no explanation):
{
  "done": false,
  "title": "Section title — specific to the content",
  "scope": "A 2-3 sentence description of what this section should teach and how it connects to what came before",
  "concepts": ["concept1", "concept2"],
  "estimatedSections": <your estimate of total sections needed for the full module, matching the learner's depth request>
}`,
};

// ── Variant D: PRO + depth enforcement + raw transcript ─────

export const variantD: PlannerVariantConfig = {
  id: "D",
  name: "PRO + depth + raw transcript",
  description: "Variant C but with the raw interview transcript instead of compressed summary.",
  model: "gemini-3.1-pro-preview",
  buildInstruction: ({ moduleTitle, plan, rawTranscript, previousSections, allConcepts }) =>
    `You are planning sections for a learning module. Your job is to decide what the NEXT section should cover.

## Module
Title: ${moduleTitle}
Goal: ${plan.goal}
All concepts to cover: ${allConcepts.join(", ")}

## Learner Profile — Full Intake Interview

This is the actual conversation we had with the learner during intake. Read their own words carefully — they reveal depth preferences, pain points, and constraints that a summary can miss:

${rawTranscript}

## What's Been Generated So Far
${buildPreviousSummary(previousSections)}

## Remaining Concepts
${buildRemaining(previousSections, allConcepts)}

## CRITICAL: Honor the Learner's Stated Depth

Before deciding, carefully re-read the learner's actual words above and identify:
1. How much time do they have? (quote them if possible)
2. How deeply do they want to understand?
3. Are they rusty on prerequisites? (e.g., "rusty in math" means more scaffolding, not less)

Match your section count and scope to their request:
- "Quick overview" / limited time → 2-3 sections, broader scoping (3-4 concepts per section OK)
- "Standard depth" → 3-5 sections, 2-3 concepts per section
- "Exhaustive / first-principles / no time limit" → 5-8 sections, 1-2 concepts per section

A learner who said "exhaustive, no time limit, I can go to any depth" being given 2 sections to cover 6 concepts is a FAILURE. You are betraying their explicit request.

Err on the side of MORE sections, not fewer, when in doubt.

## Your Decision

If all concepts have been adequately covered AND the requested depth has been honored, return:
{"done": true}

Otherwise, decide the NEXT section. Rules:
- Group only CLOSELY related concepts (e.g., Shannon entropy + information content — yes; Shannon entropy + Markov chains — no, those are distinct foundations)
- For exhaustive depth, 1-3 concepts per section. For standard, 2-3. For overview, 3-4.
- The section scope must let the content agent build intuition BEFORE formulas, derivations, or technical terms
- For the first section, start with the single most foundational concept
- Even if the learner is experienced, teach from ground zero — experience informs pace and rigor, not what to skip

Return ONLY valid JSON (no markdown, no explanation):
{
  "done": false,
  "title": "Section title — specific to the content",
  "scope": "A 2-3 sentence description of what this section should teach and how it connects to what came before",
  "concepts": ["concept1", "concept2"],
  "estimatedSections": <your estimate of total sections needed for the full module, matching the learner's depth request>
}`,
};

// ── Variant E: Structural — plan ALL sections upfront ───────

export const variantE: PlannerVariantConfig = {
  id: "E",
  name: "PRO + upfront full-module plan",
  description:
    "Structurally different: plan the entire module's sections in one shot, then the orchestrator iterates through them.",
  model: "gemini-3.1-pro-preview",
  buildInstruction: ({ moduleTitle, plan, rawTranscript, allConcepts }) =>
    `You are planning the complete section structure for a learning module. Unlike step-by-step planners, you must produce the ENTIRE section breakdown upfront so the content generation can proceed with a clear end-to-end shape.

## Module
Title: ${moduleTitle}
Goal: ${plan.goal}
All concepts to cover: ${allConcepts.join(", ")}

## Learner Profile — Full Intake Interview

${rawTranscript}

## Your Task: Plan Every Section

Read the learner's own words carefully and decide:
1. How deeply do they want this taught? (overview / standard / exhaustive)
2. How many sections does THIS specific module need to honor that request?
3. For each section: what's the title, what concepts does it cover, how does it connect to the next?

Depth calibration:
- "Quick overview" / limited time → 2-3 sections, 3-4 concepts per section
- "Standard depth" → 3-5 sections, 2-3 concepts per section
- "Exhaustive / first-principles / no time limit" → 5-8 sections, 1-2 concepts per section

A learner who said "exhaustive, no time limit, I can go to any depth" with a 6-concept module must NOT be given 2 sections. That betrays their request. Err toward MORE sections.

Design rules:
- Each section should let the content agent build intuition BEFORE formulas, derivations, or jargon
- Group only CLOSELY related concepts (Shannon entropy + information content — yes; Shannon entropy + Markov chains — no)
- For the first section, start with the single most foundational concept
- Teach from ground zero — experience informs pace and rigor, not what to skip
- Each section scope should be 2-3 sentences: what it teaches AND how it connects to what came before

Return ONLY valid JSON (no markdown, no explanation):
{
  "totalSections": <number>,
  "sections": [
    {
      "title": "Section title — specific to the content",
      "scope": "2-3 sentences: what this section teaches and how it connects to what came before",
      "concepts": ["concept1", "concept2"]
    }
  ]
}`,
};

// ── All variants ────────────────────────────────────────────

export const allVariants: PlannerVariantConfig[] = [variantA, variantB, variantC, variantD, variantE];
