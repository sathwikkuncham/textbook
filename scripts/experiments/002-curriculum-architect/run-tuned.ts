/**
 * Experiment 002 — Variant B (tuned prompt).
 *
 * Runs the tuned curriculum-architect prompt on PRO with full clean inputs,
 * then produces a three-way comparison report: production (DB) vs
 * Variant A (clean inputs, original prompt) vs Variant B (clean inputs,
 * tuned prompt).
 *
 * Usage:
 *   pnpm tsx scripts/experiments/002-curriculum-architect/run-tuned.ts
 *
 * Optional env:
 *   TOPIC_IDS=24,32   — comma-separated, default all 7 anchors
 *   VARIANT_A_DIR=... — explicit path to Variant A run folder for comparison
 */

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
const OUT_DIR = path.join(__dirname, "runs", `tuned-${RUN_ID}`);
fs.mkdirSync(OUT_DIR, { recursive: true });

const DEFAULT_TOPIC_IDS = [29, 30, 32, 31, 28, 33, 24];
const topicIdsFilter = process.env.TOPIC_IDS?.split(",").map((s) => Number(s.trim()));
const TOPIC_IDS = topicIdsFilter && topicIdsFilter.length > 0 ? topicIdsFilter : DEFAULT_TOPIC_IDS;

const SLUG_BY_ID: Record<number, string> = {
  24: "advaita-vedanta-shankaracharyas-commentary",
  28: "algorithms-clrs-textbook-companion",
  29: "understanding-large-language-models-llms",
  30: "turboquant-ai-efficiency-concepts",
  31: "psoriasis-pathophysiology-a-10-mark-answer",
  32: "transformer-networks-history-and-theory",
  33: "advanced-system-design-mastery",
};

// ── Find latest Variant A run folder for comparison ─────

function findLatestVariantARun(): string | null {
  if (process.env.VARIANT_A_DIR) return process.env.VARIANT_A_DIR;
  const runsDir = path.join(__dirname, "runs");
  if (!fs.existsSync(runsDir)) return null;
  const entries = fs.readdirSync(runsDir)
    .filter((e) => !e.startsWith("tuned-") && !e.startsWith("regression-"))
    .map((e) => ({ name: e, path: path.join(runsDir, e) }))
    .filter((e) => fs.statSync(e.path).isDirectory())
    .sort((a, b) => b.name.localeCompare(a.name));
  return entries[0]?.path ?? null;
}

// ── Types ────────────────────────────────────────────

interface ModuleSummary {
  id: number;
  title: string;
  conceptCount: number;
  minutes: number;
}

interface TopicRun {
  topicId: number;
  slug: string;
  displayName: string;
  sourceType: string;
  latencyMs: number;
  rawOutput: string;
  parsed: unknown;
  parseError?: string;
  generated: {
    moduleCount: number;
    totalMinutes: number;
    modules: ModuleSummary[];
  } | null;
}

// ── Main ──────────────────────────────────────────────

async function main() {
  const { findTopicBySlug, findLearnerIntent, findResearchByTopicId, findSourceStructure, findCurriculumByTopicId } =
    await import("../../../src/lib/db/repository");
  const { formatFullInterviewForAgent } = await import("../../../src/lib/interview-context");
  const { runAgent } = await import("../../../src/agents/runner");
  const { createTunedCurriculumArchitect } = await import("./variant-tuned");

  const variantADir = findLatestVariantARun();
  console.log(`Variant A baseline directory: ${variantADir ?? "not found"}`);
  console.log(`Variant B (tuned) — topics: ${TOPIC_IDS.join(", ")}\n`);

  const results: TopicRun[] = [];

  for (const topicId of TOPIC_IDS) {
    const slug = SLUG_BY_ID[topicId];
    if (!slug) continue;

    console.log(`→ Topic ${topicId} (${slug})...`);
    try {
      const topic = await findTopicBySlug(slug);
      if (!topic) {
        console.log(`  ✗ Topic not found`);
        continue;
      }

      const learnerIntent = await findLearnerIntent(topic.id);
      const research = await findResearchByTopicId(topic.id);
      if (!research) {
        console.log(`  ✗ No research`);
        continue;
      }

      const interviewContext = learnerIntent
        ? formatFullInterviewForAgent(learnerIntent as Record<string, unknown>)
        : `Goal: ${topic.goal}`;

      let sourceContext: { toc: unknown; scope: unknown } | undefined;
      if (topic.sourceType !== "topic_only") {
        const structure = await findSourceStructure(topic.id);
        if (structure?.userScope) {
          sourceContext = { toc: structure.rawToc, scope: structure.userScope };
        }
      }

      const architect = createTunedCurriculumArchitect(
        topic.displayName,
        topic.goal,
        interviewContext,
        sourceContext as Parameters<typeof createTunedCurriculumArchitect>[3]
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
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
        else parseError = "No JSON found";
      } catch (err) {
        parseError = err instanceof Error ? err.message : String(err);
      }

      const p = parsed as { modules?: Array<{ id: number; title: string; estimated_minutes?: number; plan?: { concepts?: string[] } }> } | null;
      const generated = p?.modules
        ? {
            moduleCount: p.modules.length,
            totalMinutes: p.modules.reduce((s, m) => s + (m.estimated_minutes ?? 0), 0),
            modules: p.modules.map((m): ModuleSummary => ({
              id: m.id,
              title: m.title,
              conceptCount: Array.isArray(m.plan?.concepts) ? m.plan!.concepts!.length : 0,
              minutes: m.estimated_minutes ?? 0,
            })),
          }
        : null;

      const run: TopicRun = {
        topicId: topic.id,
        slug: topic.slug,
        displayName: topic.displayName,
        sourceType: topic.sourceType,
        latencyMs,
        rawOutput,
        parsed,
        parseError,
        generated,
      };

      results.push(run);
      fs.writeFileSync(path.join(OUT_DIR, `topic-${topicId}.json`), JSON.stringify(run, null, 2));

      if (generated) {
        console.log(`  ✓ ${generated.moduleCount} modules, ${generated.totalMinutes} min · ${latencyMs}ms`);
      } else {
        console.log(`  ✗ Parse failed: ${parseError}`);
      }
    } catch (err) {
      console.log(`  ✗ Error: ${err instanceof Error ? err.message : err}`);
    }
  }

  // Build three-way comparison report
  const report = await generateThreeWayReport(results, variantADir);
  fs.writeFileSync(path.join(OUT_DIR, "summary.md"), report);

  console.log(`\n${"=".repeat(70)}`);
  console.log(`Summary: ${path.join(OUT_DIR, "summary.md")}`);
  console.log(`All outputs: ${OUT_DIR}`);
}

// ── Three-way comparison ──────────────────────────────

async function generateThreeWayReport(
  results: TopicRun[],
  variantADir: string | null
): Promise<string> {
  const { findTopicBySlug, findCurriculumByTopicId } =
    await import("../../../src/lib/db/repository");

  const lines: string[] = [];
  lines.push(`# Curriculum Architect — Three-Way Comparison`);
  lines.push(``);
  lines.push(`Run: tuned-${RUN_ID}`);
  lines.push(`Variant A source: ${variantADir ?? "(not available)"}`);
  lines.push(``);
  lines.push(`## Module count and total time`);
  lines.push(``);
  lines.push(`| Topic | Production | Variant A (clean inputs) | Variant B (tuned) |`);
  lines.push(`|-------|-----------|-------------------------|-------------------|`);

  for (const r of results) {
    // Production
    const topic = await findTopicBySlug(r.slug);
    const prodCurr = topic ? await findCurriculumByTopicId(topic.id) : null;
    const prodStr = prodCurr
      ? `${prodCurr.modules.length} mods · ${prodCurr.modules.reduce((s, m) => s + (m.estimated_minutes ?? 0), 0)} min`
      : "n/a";

    // Variant A
    let variantAStr = "n/a";
    if (variantADir) {
      const vaPath = path.join(variantADir, `topic-${r.topicId}-run1.json`);
      if (fs.existsSync(vaPath)) {
        try {
          const vaData = JSON.parse(fs.readFileSync(vaPath, "utf-8"));
          if (vaData.generated) {
            variantAStr = `${vaData.generated.moduleCount} mods · ${vaData.generated.totalMinutes} min`;
          }
        } catch {
          // ignore
        }
      }
    }

    const variantBStr = r.generated
      ? `${r.generated.moduleCount} mods · ${r.generated.totalMinutes} min`
      : `ERROR`;

    lines.push(`| ${r.displayName} | ${prodStr} | ${variantAStr} | ${variantBStr} |`);
  }

  lines.push(``);
  lines.push(`## Per-topic module structure`);
  lines.push(``);

  for (const r of results) {
    lines.push(`### ${r.displayName} (Topic ${r.topicId}, ${r.sourceType})`);
    lines.push(``);
    lines.push(`**Variant B latency:** ${r.latencyMs}ms`);
    lines.push(``);
    if (!r.generated) {
      lines.push(`⚠ Generation failed: ${r.parseError ?? "unknown"}`);
      lines.push(``);
      continue;
    }

    // Load production and Variant A for side-by-side
    const topic = await findTopicBySlug(r.slug);
    const prodCurr = topic ? await findCurriculumByTopicId(topic.id) : null;

    let variantA: { modules: ModuleSummary[] } | null = null;
    if (variantADir) {
      const vaPath = path.join(variantADir, `topic-${r.topicId}-run1.json`);
      if (fs.existsSync(vaPath)) {
        try {
          const vaData = JSON.parse(fs.readFileSync(vaPath, "utf-8"));
          variantA = vaData.generated;
        } catch {
          // ignore
        }
      }
    }

    const prodMods = prodCurr?.modules ?? [];
    const vaMods = variantA?.modules ?? [];
    const vbMods = r.generated.modules;
    const maxRows = Math.max(prodMods.length, vaMods.length, vbMods.length);

    lines.push(`| # | Production | Variant A (clean inputs) | Variant B (tuned) |`);
    lines.push(`|---|-----------|-------------------------|-------------------|`);
    for (let i = 0; i < maxRows; i++) {
      const prod = prodMods[i];
      const va = vaMods[i];
      const vb = vbMods[i];
      const prodStr = prod
        ? `**${prod.title}** (${Array.isArray(prod.plan?.concepts) ? prod.plan!.concepts!.length : 0}c, ${prod.estimated_minutes ?? 0}m)`
        : "—";
      const vaStr = va ? `**${va.title}** (${va.conceptCount}c, ${va.minutes}m)` : "—";
      const vbStr = vb ? `**${vb.title}** (${vb.conceptCount}c, ${vb.minutes}m)` : "—";
      lines.push(`| ${i + 1} | ${prodStr} | ${vaStr} | ${vbStr} |`);
    }
    lines.push(``);
  }

  return lines.join("\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
