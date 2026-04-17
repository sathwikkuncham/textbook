/**
 * Experiment 002 — Variant C (tuned v2).
 *
 * Runs Variant C across the 7 anchors and produces a four-way comparison:
 * production vs Variant A (clean inputs, original prompt) vs Variant B
 * (clean inputs + first tune) vs Variant C (clean inputs + refined tune).
 *
 * Specifically watching for:
 *   - Shankaracharya module count expanding back up (B collapsed it to 12)
 *   - CLRS total hours becoming sane (B was 189 hrs)
 *   - No single module exceeding ~3 hours
 *   - Psoriasis capstone preserved
 *   - Transformer Module 1 keeping its 90+ min calibration
 *
 * Usage:
 *   pnpm tsx scripts/experiments/002-curriculum-architect/run-tuned-v2.ts
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import fs from "node:fs";
import path from "node:path";

if (!process.env.GOOGLE_GENAI_API_KEY) {
  console.error("GOOGLE_GENAI_API_KEY missing");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

const RUN_ID = new Date().toISOString().replace(/[:.]/g, "-");
const OUT_DIR = path.join(__dirname, "runs", `tuned-v2-${RUN_ID}`);
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
  generated: { moduleCount: number; totalMinutes: number; modules: ModuleSummary[] } | null;
}

// ── Find latest Variant A and B run folders ─────────

function findLatestRun(prefix: string): string | null {
  const runsDir = path.join(__dirname, "runs");
  if (!fs.existsSync(runsDir)) return null;
  const entries = fs.readdirSync(runsDir)
    .filter((e) => {
      if (prefix === "") return !e.startsWith("tuned") && !e.startsWith("regression-") && !e.startsWith("multi-topic-");
      return e.startsWith(prefix);
    })
    .map((e) => ({ name: e, path: path.join(runsDir, e) }))
    .filter((e) => fs.statSync(e.path).isDirectory())
    .sort((a, b) => b.name.localeCompare(a.name));
  return entries[0]?.path ?? null;
}

function loadVariantData(dir: string | null, topicId: number, fileName: string): { modules: ModuleSummary[]; totalMinutes: number; moduleCount: number } | null {
  if (!dir) return null;
  const filePath = path.join(dir, fileName);
  if (!fs.existsSync(filePath)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    return data.generated ?? null;
  } catch {
    return null;
  }
}

async function main() {
  const { findTopicBySlug, findLearnerIntent, findResearchByTopicId, findSourceStructure, findCurriculumByTopicId } =
    await import("../../../src/lib/db/repository");
  const { formatFullInterviewForAgent } = await import("../../../src/lib/interview-context");
  const { runAgent } = await import("../../../src/agents/runner");
  const { createTunedCurriculumArchitectV2 } = await import("./variant-tuned-v2");

  const variantADir = findLatestRun("");
  const variantBDir = findLatestRun("tuned-");
  console.log(`Variant A source: ${variantADir ?? "n/a"}`);
  console.log(`Variant B source: ${variantBDir ?? "n/a"}`);
  console.log(`Variant C — topics: ${TOPIC_IDS.join(", ")}\n`);

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

      const architect = createTunedCurriculumArchitectV2(
        topic.displayName,
        topic.goal,
        interviewContext,
        sourceContext as Parameters<typeof createTunedCurriculumArchitectV2>[3]
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
        const maxModuleMinutes = Math.max(...generated.modules.map((m) => m.minutes));
        console.log(
          `  ✓ ${generated.moduleCount} modules · ${generated.totalMinutes} min total · max module ${maxModuleMinutes}min · ${latencyMs}ms`
        );
      } else {
        console.log(`  ✗ Parse failed: ${parseError}`);
      }
    } catch (err) {
      console.log(`  ✗ Error: ${err instanceof Error ? err.message : err}`);
    }
  }

  // Four-way comparison
  const report = await generateFourWayReport(results, variantADir, variantBDir);
  fs.writeFileSync(path.join(OUT_DIR, "summary.md"), report);

  console.log(`\n${"=".repeat(70)}`);
  console.log(`Summary: ${path.join(OUT_DIR, "summary.md")}`);
  console.log(`All outputs: ${OUT_DIR}`);
}

async function generateFourWayReport(
  results: TopicRun[],
  variantADir: string | null,
  variantBDir: string | null
): Promise<string> {
  const { findTopicBySlug, findCurriculumByTopicId } =
    await import("../../../src/lib/db/repository");

  const lines: string[] = [];
  lines.push(`# Curriculum Architect — Four-Way Comparison`);
  lines.push(``);
  lines.push(`Run: tuned-v2-${RUN_ID}`);
  lines.push(`Variant A: ${variantADir ?? "n/a"}`);
  lines.push(`Variant B: ${variantBDir ?? "n/a"}`);
  lines.push(``);
  lines.push(`## Module count · total time · max single module`);
  lines.push(``);
  lines.push(`| Topic | Production | Variant A | Variant B | Variant C (v2) |`);
  lines.push(`|-------|-----------|-----------|-----------|----------------|`);

  for (const r of results) {
    const topic = await findTopicBySlug(r.slug);
    const prodCurr = topic ? await findCurriculumByTopicId(topic.id) : null;
    const prodMods = prodCurr?.modules ?? [];
    const prodTotal = prodMods.reduce((s, m) => s + (m.estimated_minutes ?? 0), 0);
    const prodMax = prodMods.length > 0 ? Math.max(...prodMods.map((m) => m.estimated_minutes ?? 0)) : 0;
    const prodStr = prodMods.length > 0 ? `${prodMods.length} · ${prodTotal}m · max ${prodMax}m` : "n/a";

    const va = loadVariantData(variantADir, r.topicId, `topic-${r.topicId}-run1.json`);
    const vaStr = va ? `${va.moduleCount} · ${va.totalMinutes}m · max ${Math.max(...va.modules.map((m) => m.minutes))}m` : "n/a";

    const vb = loadVariantData(variantBDir, r.topicId, `topic-${r.topicId}.json`);
    const vbStr = vb ? `${vb.moduleCount} · ${vb.totalMinutes}m · max ${Math.max(...vb.modules.map((m) => m.minutes))}m` : "n/a";

    const vcStr = r.generated
      ? `${r.generated.moduleCount} · ${r.generated.totalMinutes}m · max ${Math.max(...r.generated.modules.map((m) => m.minutes))}m`
      : "ERROR";

    lines.push(`| ${r.displayName} | ${prodStr} | ${vaStr} | ${vbStr} | ${vcStr} |`);
  }

  lines.push(``);
  lines.push(`## Variant C module structure per topic`);
  lines.push(``);

  for (const r of results) {
    lines.push(`### ${r.displayName} (Topic ${r.topicId}, ${r.sourceType})`);
    lines.push(``);
    lines.push(`**Variant C latency:** ${r.latencyMs}ms`);
    lines.push(``);
    if (!r.generated) {
      lines.push(`⚠ Generation failed: ${r.parseError ?? "unknown"}`);
      lines.push(``);
      continue;
    }

    lines.push(`| # | Title | Concepts | Minutes |`);
    lines.push(`|---|-------|----------|---------|`);
    for (const m of r.generated.modules) {
      lines.push(`| ${m.id} | ${m.title} | ${m.conceptCount} | ${m.minutes} |`);
    }
    lines.push(``);
  }

  return lines.join("\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
