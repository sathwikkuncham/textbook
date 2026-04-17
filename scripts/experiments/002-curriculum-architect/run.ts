/**
 * Experiment 002 — Curriculum Architect with clean inputs (same instruction, PRO model).
 *
 * Goal: measure whether the plumbing fixes (full raw interview + untruncated
 * research + PRO model) alone change the architect's decisions, without any
 * prompt tuning. If outputs differ meaningfully from production, plumbing
 * bought us real improvement. If they don't, we need to tune the prompt.
 *
 * Usage:
 *   pnpm tsx scripts/experiments/002-curriculum-architect/run.ts
 */

// Env MUST load before any project imports — repository modules open a DB
// connection at module-load time, which requires DATABASE_URL.
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import fs from "node:fs";
import path from "node:path";

if (!process.env.GOOGLE_GENAI_API_KEY) {
  console.error("GOOGLE_GENAI_API_KEY missing — aborting.");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL missing — aborting.");
  process.exit(1);
}

const RUN_ID = new Date().toISOString().replace(/[:.]/g, "-");
const OUT_DIR = path.join(__dirname, "runs", RUN_ID);
fs.mkdirSync(OUT_DIR, { recursive: true });

const DEFAULT_TOPIC_IDS = [29, 30, 32, 31, 28, 33, 24];
const topicIdsFilter = process.env.TOPIC_IDS?.split(",").map((s) => Number(s.trim()));
const TOPIC_IDS = topicIdsFilter && topicIdsFilter.length > 0 ? topicIdsFilter : DEFAULT_TOPIC_IDS;
const RUNS = Number(process.env.RUNS_PER_TOPIC ?? 1);

const SLUG_BY_ID: Record<number, string> = {
  24: "advaita-vedanta-shankaracharyas-commentary",
  28: "algorithms-clrs-textbook-companion",
  29: "understanding-large-language-models-llms",
  30: "turboquant-ai-efficiency-concepts",
  31: "psoriasis-pathophysiology-a-10-mark-answer",
  32: "transformer-networks-history-and-theory",
  33: "advanced-system-design-mastery",
};

interface RunResult {
  topicId: number;
  slug: string;
  displayName: string;
  sourceType: string;
  runNumber: number;
  latencyMs: number;
  rawOutput: string;
  parsed: unknown;
  parseError?: string;
  production: {
    moduleCount: number;
    totalMinutes: number;
    modules: Array<{ id: number; title: string; conceptCount: number; minutes: number }>;
  } | null;
  generated: {
    moduleCount: number;
    totalMinutes: number;
    modules: Array<{ id: number; title: string; conceptCount: number; minutes: number }>;
  } | null;
}

async function main() {
  // Dynamic imports so env is set first
  const { findTopicBySlug, findLearnerIntent, findResearchByTopicId, findSourceStructure, findCurriculumByTopicId } =
    await import("../../../src/lib/db/repository");
  const { formatFullInterviewForAgent } = await import("../../../src/lib/interview-context");
  const { createCurriculumArchitect } = await import("../../../src/agents/curriculum-architect");
  const { runAgent } = await import("../../../src/agents/runner");

  console.log(`Curriculum Architect — clean inputs experiment`);
  console.log(`Topics: ${TOPIC_IDS.join(", ")}`);
  console.log(`Runs per topic: ${RUNS}\n`);

  const allResults: RunResult[] = [];

  for (const topicId of TOPIC_IDS) {
    const slug = SLUG_BY_ID[topicId];
    if (!slug) {
      console.log(`→ Topic ${topicId}: no slug mapping, skipping`);
      continue;
    }

    for (let i = 1; i <= RUNS; i++) {
      console.log(`→ Topic ${topicId} (${slug}), run ${i}/${RUNS}...`);
      try {
        const topic = await findTopicBySlug(slug);
        if (!topic) {
          console.log(`  ✗ Topic not found in DB`);
          continue;
        }

        const learnerIntent = await findLearnerIntent(topic.id);
        const research = await findResearchByTopicId(topic.id);
        if (!research) {
          console.log(`  ✗ No research found`);
          continue;
        }

        const interviewContext = learnerIntent
          ? formatFullInterviewForAgent(learnerIntent as Record<string, unknown>)
          : `Goal: ${topic.goal}`;

        let sourceContext:
          | { toc: unknown; scope: unknown }
          | undefined;
        if (topic.sourceType !== "topic_only") {
          const structure = await findSourceStructure(topic.id);
          if (structure?.userScope) {
            sourceContext = { toc: structure.rawToc, scope: structure.userScope };
          }
        }

        const architect = createCurriculumArchitect(
          topic.displayName,
          topic.goal,
          interviewContext,
          sourceContext as Parameters<typeof createCurriculumArchitect>[3]
        );

        const researchContext = JSON.stringify(research, null, 2);

        const t0 = Date.now();
        const rawOutput = await runAgent(
          architect,
          `Design the curriculum based on this research:\n\n${researchContext}`
        );
        const latencyMs = Date.now() - t0;

        let parsed: unknown = null;
        let parseError: string | undefined;
        try {
          const cleaned = rawOutput.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          } else {
            parseError = "No JSON found";
          }
        } catch (err) {
          parseError = err instanceof Error ? err.message : String(err);
        }

        const productionCurr = await findCurriculumByTopicId(topic.id);

        const production = productionCurr
          ? {
              moduleCount: productionCurr.modules.length,
              totalMinutes: productionCurr.modules.reduce((sum, m) => sum + (m.estimated_minutes ?? 0), 0),
              modules: productionCurr.modules.map((m) => ({
                id: m.id,
                title: m.title,
                conceptCount: Array.isArray(m.plan?.concepts)
                  ? m.plan!.concepts.length
                  : Array.isArray(m.subtopics)
                    ? m.subtopics.reduce((s, st) => s + (st.key_concepts?.length ?? 0), 0)
                    : 0,
                minutes: m.estimated_minutes ?? 0,
              })),
            }
          : null;

        const parsedCurr = parsed as { modules?: Array<{ id: number; title: string; estimated_minutes?: number; plan?: { concepts?: string[] } }> } | null;
        const generated = parsedCurr?.modules
          ? {
              moduleCount: parsedCurr.modules.length,
              totalMinutes: parsedCurr.modules.reduce((sum, m) => sum + (m.estimated_minutes ?? 0), 0),
              modules: parsedCurr.modules.map((m) => ({
                id: m.id,
                title: m.title,
                conceptCount: Array.isArray(m.plan?.concepts) ? m.plan!.concepts!.length : 0,
                minutes: m.estimated_minutes ?? 0,
              })),
            }
          : null;

        const result: RunResult = {
          topicId: topic.id,
          slug: topic.slug,
          displayName: topic.displayName,
          sourceType: topic.sourceType,
          runNumber: i,
          latencyMs,
          rawOutput,
          parsed,
          parseError,
          production,
          generated,
        };

        allResults.push(result);
        fs.writeFileSync(path.join(OUT_DIR, `topic-${topicId}-run${i}.json`), JSON.stringify(result, null, 2));

        if (generated) {
          console.log(`  ✓ ${generated.moduleCount} modules, ${generated.totalMinutes} min · ${latencyMs}ms`);
        } else {
          console.log(`  ✗ Parse failed: ${parseError}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.log(`  ✗ Error: ${msg}`);
      }
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, "summary.md"), generateReport(allResults));

  console.log(`\n${"=".repeat(70)}`);
  console.log(`Summary written to: ${path.join(OUT_DIR, "summary.md")}`);
  console.log(`All outputs: ${OUT_DIR}`);
}

function summaryLine(mods: Array<{ conceptCount: number; minutes: number }>): string {
  if (mods.length === 0) return "n/a";
  const concepts = mods.map((m) => m.conceptCount);
  const mins = mods.map((m) => m.minutes);
  return `${mods.length} modules · concepts/mod ${Math.min(...concepts)}-${Math.max(...concepts)} (avg ${(concepts.reduce((a, b) => a + b, 0) / mods.length).toFixed(1)}) · ${mins.reduce((a, b) => a + b, 0)} min total`;
}

function generateReport(results: RunResult[]): string {
  const lines: string[] = [];
  lines.push(`# Curriculum Architect — Clean Inputs Comparison`);
  lines.push(``);
  lines.push(`Run: ${RUN_ID}`);
  lines.push(``);
  lines.push(`## Production vs Generated (clean-inputs, PRO)`);
  lines.push(``);
  lines.push(`| Topic | Source | Production | Generated (this run) |`);
  lines.push(`|-------|--------|-----------|---------------------|`);
  for (const r of results) {
    const prodStr = r.production ? summaryLine(r.production.modules) : "no production curriculum";
    const genStr = r.generated ? summaryLine(r.generated.modules) : `ERROR (${r.parseError ?? "unknown"})`;
    lines.push(`| ${r.displayName} | ${r.sourceType} | ${prodStr} | ${genStr} |`);
  }

  lines.push(``);
  lines.push(`## Per-topic module titles (side by side)`);
  lines.push(``);

  for (const r of results) {
    lines.push(`### ${r.displayName} (Topic ${r.topicId}, ${r.sourceType})`);
    lines.push(``);
    lines.push(`**Latency:** ${r.latencyMs}ms`);
    lines.push(``);
    if (!r.generated) {
      lines.push(`⚠ Generation failed: ${r.parseError ?? "unknown"}`);
      lines.push(``);
      lines.push(`Raw output (first 1500 chars):`);
      lines.push(`\`\`\``);
      lines.push(r.rawOutput.slice(0, 1500));
      lines.push(`\`\`\``);
      lines.push(``);
      continue;
    }

    const maxRows = Math.max(r.production?.modules.length ?? 0, r.generated.modules.length);
    lines.push(`| # | Production | Generated |`);
    lines.push(`|---|-----------|-----------|`);
    for (let i = 0; i < maxRows; i++) {
      const prod = r.production?.modules[i];
      const gen = r.generated.modules[i];
      const prodText = prod ? `**${prod.title}** (${prod.conceptCount} concepts, ${prod.minutes}min)` : "—";
      const genText = gen ? `**${gen.title}** (${gen.conceptCount} concepts, ${gen.minutes}min)` : "—";
      lines.push(`| ${i + 1} | ${prodText} | ${genText} |`);
    }
    lines.push(``);
  }

  return lines.join("\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
