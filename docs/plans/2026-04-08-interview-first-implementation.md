# Interview-First Data Flow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove all flattened level/timeCommitment proxies so every agent receives the full learner interview and makes its own decisions about depth, scope, and focus.

**Architecture:** The `LearnerIntentProfile` from the interview becomes the single source of truth for all agent context. The DB columns `level`, `goal`, `timeCommitment` remain for UI display only. A new helper `formatInterviewForAgent()` serializes the interview consistently for agent instructions.

**Tech Stack:** Next.js 16, Google ADK agents, Drizzle ORM, Supabase Postgres

---

### Task 1: Add interview formatting helper

**Files:**
- Create: `src/lib/interview-context.ts`

**Step 1: Create the helper**

```typescript
import type { LearnerIntentProfile } from "@/lib/types/learning";

/**
 * Formats the full learner interview for injection into agent instructions.
 * ~300-400 tokens. Every agent that needs learner context should use this.
 */
export function formatInterviewForAgent(
  intent: LearnerIntentProfile | Record<string, unknown>
): string {
  const profile = intent as Record<string, unknown>;
  const parts: string[] = [];

  if (profile.purpose) parts.push(`Purpose: ${profile.purpose}`);
  if (profile.priorKnowledge) parts.push(`Prior knowledge: ${profile.priorKnowledge}`);
  if (profile.desiredDepth) parts.push(`Desired depth: ${profile.desiredDepth}`);
  if (profile.timeAvailable) parts.push(`Time available: ${profile.timeAvailable}`);
  const focusAreas = profile.focusAreas as string[] | undefined;
  if (focusAreas?.length) parts.push(`Focus areas: ${focusAreas.join(", ")}`);
  if (profile.sourceType) parts.push(`Source type: ${profile.sourceType}`);

  return parts.join("\n");
}

/**
 * Derive display-only level from interview for DB/UI.
 * NOT used by any agent — agents read the full interview.
 */
export function deriveDisplayLevel(intent: LearnerIntentProfile | Record<string, unknown>): string {
  const profile = intent as Record<string, unknown>;
  const depth = ((profile.desiredDepth as string) ?? "").toLowerCase();
  const prior = ((profile.priorKnowledge as string) ?? "").toLowerCase();

  if (depth.includes("overview") || prior.includes("none") || prior.includes("beginner")) return "beginner";
  if (depth.includes("deep") || depth.includes("depth") || depth.includes("exhaust")
    || depth.includes("expert") || depth.includes("maximum") || depth.includes("advanced")
    || depth.includes("scholarly")) return "advanced";
  return "intermediate";
}

/**
 * Derive display-only time commitment from interview for DB/UI.
 * NOT used by any agent — agents read the full interview.
 */
export function deriveDisplayTimeCommitment(intent: LearnerIntentProfile | Record<string, unknown>): string {
  const profile = intent as Record<string, unknown>;
  const time = ((profile.timeAvailable as string) ?? "").toLowerCase();

  if (time.includes("quick") || time.includes("30 min") || time.includes("overview")) return "quick";
  if (time.includes("unlimited") || time.includes("long-term") || time.includes("no deadline")
    || time.includes("no rush") || time.includes("deep") || time.includes("year")
    || time.includes("month")) return "deep";
  return "standard";
}
```

**Step 2: Verify it compiles**

Run: `cd C:/Users/sathw/projects/textbook && npx tsc --noEmit src/lib/interview-context.ts 2>&1 || echo "Check imports"`

**Step 3: Commit**

```bash
git add src/lib/interview-context.ts
git commit -m "feat: add interview formatting helper for agent context"
```

---

### Task 2: Update `new-topic-form.tsx` — remove deriveLevel and hardcoded timeCommitment

**Files:**
- Modify: `src/components/home/new-topic-form.tsx`

**Step 1: Replace `deriveLevel` with imports from helper**

Remove lines 103-109 (the `deriveLevel` function).

Add import at top:
```typescript
import { deriveDisplayLevel, deriveDisplayTimeCommitment } from "@/lib/interview-context";
```

**Step 2: Update `handleConfirmAndStart` — all three flows**

In the PDF flow (around line 131), replace:
```typescript
const derivedLevel = deriveLevel(interview.profile);
```
with:
```typescript
const derivedLevel = deriveDisplayLevel(interview.profile);
const derivedTimeCommitment = deriveDisplayTimeCommitment(interview.profile);
```

Then in every place that has `timeCommitment: "standard"`, replace with `timeCommitment: derivedTimeCommitment`. There are 4 occurrences:
- Line 141: PDF upload formData
- Line 185: URL research call  
- Line 236: URL curriculum's research call (same variable)
- Line 256: Topic-only research call

Also in the URL flow research call (line 185), the `learnerIntent` is already passed — good.

In the topic-only flow research call (around line 229), add `learnerIntent: interview.profile` if not already present.

**Step 3: Verify the dev server compiles**

Check the running dev server output for compilation errors.

**Step 4: Commit**

```bash
git add src/components/home/new-topic-form.tsx
git commit -m "fix: derive level and timeCommitment from interview instead of hardcoding"
```

---

### Task 3: Update research pipeline to accept interview

**Files:**
- Modify: `src/agents/pipelines/research-pipeline.ts`
- Modify: `src/agents/topic-researcher.ts`
- Modify: `src/app/api/learn/research/route.ts`

**Step 1: Update `research-pipeline.ts`**

Change function signature and pass interview to sub-agents:

```typescript
import { ParallelAgent } from "@google/adk";
import {
  createFoundationsResearcher,
  createApplicationsResearcher,
} from "../topic-researcher";

export function createResearchPipeline(
  topic: string,
  level: string,
  goal: string,
  interviewContext?: string
) {
  const foundationsResearcher = createFoundationsResearcher(topic, level, goal, interviewContext);
  const applicationsResearcher = createApplicationsResearcher(topic, level, goal, interviewContext);

  return new ParallelAgent({
    name: "ResearchPipeline",
    description: "Runs two researchers in parallel: foundations and applications",
    subAgents: [foundationsResearcher, applicationsResearcher],
  });
}
```

**Step 2: Update `topic-researcher.ts`**

Add `interviewContext?: string` param to both `createFoundationsResearcher` and `createApplicationsResearcher`.

In the FoundationsResearcher instruction, after `The learner's knowledge level is **${level}** and their goal is **${goal}**.`, add:

```
${interviewContext ? `\n## Learner Profile (from intake interview)\n\n${interviewContext}\n\nUse this profile to focus your research on the learner's specific interests and adjust depth to their prior knowledge.` : ""}
```

Same pattern for ApplicationsResearcher.

**Step 3: Update `research/route.ts`**

After line 73 (where `learnerIntent` is saved), before the pipeline creation:

```typescript
import { formatInterviewForAgent } from "@/lib/interview-context";

// ... inside the try block, before createResearchPipeline:
const interviewContext = learnerIntent
  ? formatInterviewForAgent(learnerIntent as Record<string, unknown>)
  : undefined;

const pipeline = createResearchPipeline(topic, level, goal, interviewContext);
```

Also update the `runAgent` message to remove the flattened `level` reference:

```typescript
const result = await runAgent(
  pipeline,
  `Research the topic "${topic}" thoroughly. Provide comprehensive research findings.`
);
```

**Step 4: Verify compilation**

**Step 5: Commit**

```bash
git add src/agents/pipelines/research-pipeline.ts src/agents/topic-researcher.ts src/app/api/learn/research/route.ts
git commit -m "feat: pass full interview context to research pipeline"
```

---

### Task 4: Update curriculum architect to use interview

**Files:**
- Modify: `src/agents/curriculum-architect.ts`
- Modify: `src/app/api/learn/curriculum/route.ts`

**Step 1: Update `curriculum-architect.ts`**

Change the function signature — replace `level: string, timeCommitment: string` with `interviewContext: string`:

```typescript
export function createCurriculumArchitect(
  topic: string,
  goal: string,
  interviewContext: string,
  source?: SourceContext
)
```

Replace the `moduleGuidance` switch with:

```typescript
const moduleGuidance = `Read the learner's profile below and determine the appropriate scope:
- If they want a quick overview or have very limited time: Design 2-3 modules (~30-60 minutes total).
- If they want standard depth or moderate time: Design 4-6 modules (~2-4 hours total).
- If they want deep/exhaustive study or have unlimited time: Design 7-10+ modules (8+ hours total).
- If they are studying a large source text chapter-by-chapter: Scale modules proportionally to content.

Use your judgment based on the full learner profile, not just time alone.`;
```

In the instruction string, replace:
```
Learner level: **${level}**
Learning goal: **${goal}**
Time commitment: **${timeCommitment}**
```
with:
```
Learning goal: **${goal}**

## Learner Profile (from intake interview)

${interviewContext}
```

Keep `${moduleGuidance}` and `${sourceGuidance}` as they are.

**Step 2: Update `curriculum/route.ts`**

Replace the curriculum architect creation (lines 75-81):

```typescript
import { formatInterviewForAgent } from "@/lib/interview-context";

// Build interview context — full profile for the architect
const interviewContext = learnerIntent
  ? formatInterviewForAgent(learnerIntent as Record<string, unknown>)
  : `Purpose: ${goal}`;

const architect = createCurriculumArchitect(
  topic,
  goal,
  interviewContext,
  sourceContext
);
```

Remove the separate `intentContext` append (lines 86-88) since the interview is now in the system instruction. Change the runAgent call:

```typescript
const result = await runAgent(
  architect,
  `Design a curriculum for "${topic}". Here is the research context:\n\n${researchContext}`
);
```

**Step 3: Verify compilation**

**Step 4: Commit**

```bash
git add src/agents/curriculum-architect.ts src/app/api/learn/curriculum/route.ts
git commit -m "feat: curriculum architect reads full interview instead of level/timeCommitment"
```

---

### Task 5: Update web explorer with focus areas

**Files:**
- Modify: `src/agents/web-explorer.ts`
- Modify: `src/app/api/learn/source/discover/route.ts`

**Step 1: Update `web-explorer.ts`**

Add optional `focusAreas` param:

```typescript
export function createWebExplorer(topicId: number, startingUrl: string, focusAreas?: string[]) {
```

In the instruction, after the `## Constraints` section, add:

```
${focusAreas?.length ? `\n## Learner Focus Areas\n\nThe learner is specifically interested in: ${focusAreas.join(", ")}.\nPrioritize links and content related to these areas. Deprioritize content that is clearly unrelated to these interests.` : ""}
```

**Step 2: Update `discover/route.ts`**

In the URL branch (around line 60), before creating the explorer, fetch the interview:

```typescript
import { findLearnerIntent } from "@/lib/db/repository";

// Inside the URL branch:
const learnerIntent = await findLearnerIntent(topicRecord.id);
const focusAreas = learnerIntent
  ? (learnerIntent as Record<string, unknown>).focusAreas as string[] | undefined
  : undefined;

const explorer = createWebExplorer(topicRecord.id, topicRecord.sourcePath, focusAreas ?? undefined);
```

**Step 3: Verify compilation**

**Step 4: Commit**

```bash
git add src/agents/web-explorer.ts src/app/api/learn/source/discover/route.ts
git commit -m "feat: web explorer uses learner focus areas to prioritize links"
```

---

### Task 6: Update scope suggest with interview

**Files:**
- Modify: `src/app/api/learn/scope-suggest/route.ts`

**Step 1: Fetch and use learnerIntent**

Add import:
```typescript
import { findLearnerIntent } from "@/lib/db/repository";
import { formatInterviewForAgent } from "@/lib/interview-context";
```

After fetching the topic record (around line 25), fetch the interview:
```typescript
const learnerIntent = await findLearnerIntent(topicRecord.id);
const interviewContext = learnerIntent
  ? formatInterviewForAgent(learnerIntent as Record<string, unknown>)
  : null;
```

In the prompt, replace:
```
Their level: ${level ?? "beginner"}
Their goal: ${goal ?? "general understanding"}
```
with:
```
${interviewContext ? `Learner profile:\n${interviewContext}` : `Their level: ${level ?? "beginner"}\nTheir goal: ${goal ?? "general understanding"}`}
```

**Step 2: Verify compilation**

**Step 3: Commit**

```bash
git add src/app/api/learn/scope-suggest/route.ts
git commit -m "feat: scope suggestions use full interview profile"
```

---

### Task 7: Update chat route with interview

**Files:**
- Modify: `src/app/api/learn/chat/route.ts`

**Step 1: Fetch learnerIntent alongside insights**

Add `findLearnerIntent` to the import from `@/lib/db/repository` (line 2-16).

Add `formatInterviewForAgent` import:
```typescript
import { formatInterviewForAgent } from "@/lib/interview-context";
```

In the learner context section (around line 171-187), add interview data:

```typescript
// Fetch learner model for personalized tutoring
let learnerContext: string | undefined;
if (topicRecord) {
  const contextParts: string[] = [];

  // Original interview intent
  const learnerIntent = await findLearnerIntent(topicRecord.id);
  if (learnerIntent) {
    contextParts.push(formatInterviewForAgent(learnerIntent as Record<string, unknown>));
  }

  // Learned insights from quiz/chat analysis
  const insights = await findLearnerInsights(topicRecord.id);
  if (insights) {
    const weakAreas = insights.weakAreas as string[];
    const style = insights.learningStyle as Record<string, unknown>;
    const engagement = insights.engagementProfile as Record<string, unknown>;
    if (weakAreas.length > 0) contextParts.push(`Weak areas: ${weakAreas.join(", ")}`);
    if (style?.preferredApproach) contextParts.push(`Preferred learning approach: ${style.preferredApproach}`);
    if (style?.paceCategory) contextParts.push(`Learning pace: ${style.paceCategory}`);
    if (style?.helpSeekingPattern) contextParts.push(`Help-seeking pattern: ${style.helpSeekingPattern}`);
    if (engagement?.chatFrequency) contextParts.push(`Chat engagement: ${engagement.chatFrequency}`);
  }

  learnerContext = contextParts.length > 0 ? contextParts.join("\n") : undefined;
}
```

**Step 2: Verify compilation**

**Step 3: Commit**

```bash
git add src/app/api/learn/chat/route.ts
git commit -m "feat: chat tutor receives full interview alongside learned insights"
```

---

### Task 8: Update scope page research call

**Files:**
- Modify: `src/app/learn/[slug]/scope/page.tsx`

**Step 1: Remove flattened params from research call**

The scope page's `handleStartLearning` calls `/api/learn/research` at line 185-193. The research route already fetches learnerIntent from DB if the topic exists. But the research route still requires `level` and `goal` params for validation and topic creation fallback.

Keep the call but note that these are now display-level values read from the DB — they don't drive agent behavior anymore. No code change needed here since the research route's pipeline now gets the interview from DB.

**Step 2: Commit** (skip if no changes)

---

### Task 9: Update upload route defaults

**Files:**
- Modify: `src/app/api/learn/source/upload/route.ts`

**Step 1: Update hardcoded defaults**

At line 47-49, the upload route has:
```typescript
level: level || "intermediate",
goal: goal || "general understanding",
timeCommitment: timeCommitment || "standard",
```

These are now display-only fallbacks. The form already sends derived values from Task 2. Keep these as-is — they're harmless fallbacks for the DB columns and no agent reads them.

**Step 2: Commit** (skip if no changes)

---

### Task 10: Manual end-to-end verification

**Step 1: Delete the broken test topic**

```sql
DELETE FROM topics WHERE id IN (22, 23);
```

**Step 2: Start local dev server**

Run: `cd C:/Users/sathw/projects/textbook && npx next dev`

**Step 3: Create a new URL-based topic**

1. Go to `http://localhost:3000`
2. Enter topic: "Bhagavad Gita deep study" with URL source: `https://github.com/vedicscriptures/bhagavad-gita`
3. Complete the interview — say you want maximum depth, unlimited time, focus on Advaita Vedanta
4. Click "Start Learning"

**Step 4: Verify in DB**

Check that `source_type = 'url'` and `source_path` is set (the set-source fix from earlier).

Check that `time_commitment` reflects the interview (should be "deep" not "standard").

**Step 5: Check agent logs**

In the dev server terminal, look for the research agent receiving the learner profile context.

Look for the curriculum architect creating more than 6 modules given the "unlimited time" / "maximum depth" profile.

**Step 6: Push all changes**

```bash
git push
```
