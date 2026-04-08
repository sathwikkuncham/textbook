# Interview-First Data Flow

## Problem

The interview captures a rich learner profile (purpose, priorKnowledge, desiredDepth, timeAvailable, focusAreas) but most downstream agents only receive flattened proxies: `level` (beginner/intermediate/advanced), `goal` (string), and `timeCommitment` (hardcoded "standard"). This causes:

1. `deriveLevel()` misclassifies "Maximum depth" as "intermediate" (checks "deep" but interview says "depth")
2. `timeCommitment` is hardcoded to `"standard"` in 4 places, ignoring the interview's `timeAvailable`
3. Curriculum architect is constrained to "4-6 modules, 2-4 hours" regardless of learner's actual intent
4. Research pipeline searches generically without knowing the learner's focusAreas
5. Web explorer maps URLs blindly without knowing what the learner cares about
6. Scope suggest and chat route have no access to interview data

## Design

### Core Principle

Remove all flattened proxies. Every agent receives the full interview (~300-400 tokens) and makes its own judgment about depth, scope, and focus.

### Changes

#### 1. Frontend (`new-topic-form.tsx`)

- Remove `deriveLevel()` function entirely
- Remove all 4 `timeCommitment: "standard"` hardcodes
- For topic creation, derive display-level values from the interview agent's own profile output (e.g., map `desiredDepth` to a level for the DB column) but these are for UI display only, not consumed by any agent
- All agent-facing flows pass the full `learnerIntent` object

#### 2. Research Pipeline (`research-pipeline.ts` + `topic-researcher.ts`)

- `createResearchPipeline()` accepts full interview
- Both researchers receive focusAreas, purpose, priorKnowledge in their instructions
- Google searches become targeted to the learner's specific interests

#### 3. Curriculum Architect (`curriculum-architect.ts`)

- Replace `level`, `timeCommitment` params with full interview
- Keep module guidance tiers (quick/standard/deep) but agent picks the right tier by reading the interview's `timeAvailable` and `desiredDepth`
- Interview goes into system instruction, not just appended in the message
- Agent sees the full learner context when making structural decisions

#### 4. Web Explorer (`web-explorer.ts`)

- Receive focusAreas so it prioritizes relevant pages when following links
- Exploration guided by what the learner actually wants to study

#### 5. Scope Suggest (`scope-suggest/route.ts`)

- Fetch learnerIntent from DB
- Pass full profile to prompt so chapter recommendations reflect specific interests

#### 6. Chat Route (`chat/route.ts`)

- Fetch learnerIntent alongside learnerInsights
- Chat tutor knows the learner's original purpose and focusAreas

#### 7. Curriculum Route (`curriculum/route.ts`)

- Already fetches learnerIntent from DB (good)
- Pass it as structured param to architect instead of appending to message

#### 8. Scope Page (`scope/page.tsx`)

- Research call no longer passes flattened level/goal
- Research route reads interview from DB instead

### What Stays the Same

- **Content generation** (`content/route.ts`) -- already uses learnerIntent well
- **Research route** -- still does external research only, doesn't read URL/PDF source
- **Interview agent** -- no changes, works correctly
- **DB schema** -- `level`, `goal`, `timeCommitment` columns stay for display/listing

### What Gets Removed

- `deriveLevel()` function
- All 4 `timeCommitment: "standard"` hardcodes
- `moduleGuidance` switch on `timeCommitment` string (replaced with agent reading interview)
- `level` param in agent constructors (replaced with full interview)

## Files To Modify

| File | Change |
|------|--------|
| `src/components/home/new-topic-form.tsx` | Remove `deriveLevel()`, remove hardcoded timeCommitment, derive display values from interview |
| `src/agents/pipelines/research-pipeline.ts` | Accept interview param, pass to sub-agents |
| `src/agents/topic-researcher.ts` | Accept interview, include in both researcher instructions |
| `src/agents/curriculum-architect.ts` | Replace level/timeCommitment with interview, restructure moduleGuidance |
| `src/agents/web-explorer.ts` | Accept focusAreas, add to exploration guidance |
| `src/app/api/learn/research/route.ts` | Pass interview to pipeline |
| `src/app/api/learn/curriculum/route.ts` | Pass interview to architect as structured param |
| `src/app/api/learn/scope-suggest/route.ts` | Fetch and pass learnerIntent |
| `src/app/api/learn/chat/route.ts` | Fetch and pass learnerIntent alongside insights |
| `src/app/learn/[slug]/scope/page.tsx` | Remove flattened level/goal from research call |
