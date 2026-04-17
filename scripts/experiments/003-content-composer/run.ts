/**
 * Content Composer — consolidated experiment runner.
 *
 * Runs 3 variants × 3 anchor topics × 1 run each = 9 generations.
 * Saves each generation as an individual .md file (for readable review) plus a
 * summary.md index. Each output is full teaching content — expect thousands of
 * words per file.
 *
 * Usage: pnpm tsx scripts/experiments/003-content-composer/run.ts
 */

import fs from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { runAgent } from "@/agents/runner";
import { allComposerVariants, type ComposerVariantConfig } from "./variants";
import { allComposerFixtures, type ComposerFixture } from "./fixtures";

loadEnv({ path: ".env.local" });

if (!process.env.GOOGLE_GENAI_API_KEY) {
  console.error("GOOGLE_GENAI_API_KEY missing — aborting.");
  process.exit(1);
}

const RUN_ID = new Date().toISOString().replace(/[:.]/g, "-");
const OUT_DIR = path.join(__dirname, "runs", `consolidated-${RUN_ID}`);
fs.mkdirSync(OUT_DIR, { recursive: true });

interface GenerationResult {
  variantId: string;
  variantName: string;
  topicId: number;
  topicName: string;
  latencyMs: number;
  wordCount: number;
  content: string;
  error?: string;
}

function countWords(content: string): number {
  const stripped = content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/~~~[\s\S]*?~~~/g, " ")
    .replace(/\$\$[\s\S]*?\$\$/g, " ");
  return stripped.split(/\s+/).filter((w) => w.length > 0).length;
}

async function runOne(
  variant: ComposerVariantConfig,
  fixture: ComposerFixture
): Promise<GenerationResult> {
  const agent = variant.build({
    topic: fixture.topic,
    level: fixture.level,
    moduleTitle: fixture.moduleTitle,
    subtopicDesc: fixture.subtopicDesc,
    researchContext: fixture.researchContext,
    learnerContext: fixture.learnerContext,
    position: "first",
    moduleId: 1,
    subtopicIndex: 0,
    totalSubtopics: fixture.totalSubtopics,
    moduleSubtopicList: fixture.moduleSubtopicList,
    scope: fixture.scope,
  });

  const t0 = Date.now();
  let content = "";
  let error: string | undefined;

  try {
    content = await runAgent(
      agent,
      `Teach this section. This is the opening section of the module — give it the depth it deserves.\n\nModule: ${fixture.moduleTitle}\nSection: ${fixture.subtopicDesc}\n\nInclude diagrams inline wherever they genuinely help understanding.\n\nScope for this section: ${fixture.scope}`
    );
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  const latencyMs = Date.now() - t0;
  const wordCount = countWords(content);

  return {
    variantId: variant.id,
    variantName: variant.name,
    topicId: fixture.id,
    topicName: fixture.displayName,
    latencyMs,
    wordCount,
    content,
    error,
  };
}

async function main() {
  console.log(`Composer experiment — ${allComposerVariants.length} variants × ${allComposerFixtures.length} anchors`);
  console.log(`Output: ${OUT_DIR}`);
  console.log(`Total API calls: ${allComposerVariants.length * allComposerFixtures.length}\n`);

  const results: GenerationResult[] = [];

  for (const fixture of allComposerFixtures) {
    console.log(`\n── Topic ${fixture.id}: ${fixture.displayName} ──`);
    console.log(`   Profile: ${fixture.profileSummary}`);
    console.log(`   Subtopic: ${fixture.subtopicTitle}`);

    for (const variant of allComposerVariants) {
      console.log(`   [Variant ${variant.id}] Running...`);
      const result = await runOne(variant, fixture);
      results.push(result);

      const filename = `topic-${fixture.id}-variant-${variant.id}.md`;
      const filepath = path.join(OUT_DIR, filename);
      const fileContent = [
        `# Topic ${fixture.id} · Variant ${result.variantId} — ${result.variantName}`,
        ``,
        `**Topic:** ${fixture.displayName}`,
        `**Module:** ${fixture.moduleTitle}`,
        `**Subtopic:** ${fixture.subtopicTitle}`,
        `**Concepts:** ${fixture.concepts.join(", ")}`,
        `**Learner profile:** ${fixture.profileSummary}`,
        `**Latency:** ${result.latencyMs}ms`,
        `**Word count:** ${result.wordCount}`,
        ``,
        `---`,
        ``,
        result.error ? `**ERROR:** ${result.error}` : result.content,
      ].join("\n");
      fs.writeFileSync(filepath, fileContent);
      console.log(`   [Variant ${variant.id}] ✓ ${result.wordCount} words in ${result.latencyMs}ms → ${filename}`);
    }
  }

  const summaryLines: string[] = [];
  summaryLines.push(`# Content Composer — Experiment Index`);
  summaryLines.push(``);
  summaryLines.push(`Run ID: ${RUN_ID}`);
  summaryLines.push(`Date: ${new Date().toISOString()}`);
  summaryLines.push(``);
  summaryLines.push(`## Variants under test`);
  summaryLines.push(``);
  for (const v of allComposerVariants) {
    summaryLines.push(`- **${v.id}**: ${v.name} — ${v.description}`);
  }
  summaryLines.push(``);
  summaryLines.push(`## Anchors`);
  summaryLines.push(``);
  for (const f of allComposerFixtures) {
    summaryLines.push(`- **Topic ${f.id}**: ${f.displayName} — ${f.profileSummary}`);
  }
  summaryLines.push(``);
  summaryLines.push(`## Results index`);
  summaryLines.push(``);
  summaryLines.push(`| Topic | Variant | Words | Latency |`);
  summaryLines.push(`|-------|---------|-------|---------|`);
  for (const r of results) {
    const filename = `topic-${r.topicId}-variant-${r.variantId}.md`;
    summaryLines.push(`| ${r.topicId} ${r.topicName.split(":")[0]} | ${r.variantId} | ${r.wordCount} | ${r.latencyMs}ms | [file](${filename}) |`);
  }
  summaryLines.push(``);
  summaryLines.push(`## Review template`);
  summaryLines.push(``);
  summaryLines.push(`For each of the 9 outputs, read the full .md file and assess:`);
  summaryLines.push(``);
  summaryLines.push(`1. **Voice match** — Does the register match the learner's intake words? (Topic 29: simple, non-technical diction. Topic 31: exam-structured with flowchart-ready framing. Topic 32: first-principles, bottom-up, chronological.)`);
  summaryLines.push(`2. **Depth calibration** — Is the length and rigor appropriate to the stated depth? (29: short/concrete. 31: medium/structured. 32: expansive/rigorous.)`);
  summaryLines.push(`3. **Prerequisite rebuilding (C-specific)** — For Topic 32 (rusty math), does Variant C visibly rebuild prerequisites before introducing new math that Variant A and B would skip?`);
  summaryLines.push(`4. **Ground before naming** — Are technical terms introduced only after their intuition is established?`);
  summaryLines.push(`5. **Recipe leakage (A vs B/C)** — Does Variant A show signs of the prescriptive "teaching approach" menu, e.g., cosmetic first-principles framing without actual first-principles substance?`);
  summaryLines.push(`6. **No topic examples in instruction** — not applicable here (that's a prompt-design check, not an output check).`);
  summaryLines.push(`7. **Feynman test** — After reading, could the specific learner explain the concept to someone else?`);
  summaryLines.push(``);
  summaryLines.push(`## Qualitative verdict`);
  summaryLines.push(``);
  summaryLines.push(`_To be written by the reviewer after reading all nine outputs._`);
  summaryLines.push(``);

  fs.writeFileSync(path.join(OUT_DIR, "summary.md"), summaryLines.join("\n"));

  console.log(`\n${"=".repeat(80)}`);
  console.log(`✓ All outputs saved to: ${OUT_DIR}`);
  console.log(`✓ Summary: ${path.join(OUT_DIR, "summary.md")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
