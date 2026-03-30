# Agentic Learning Platform — Full Intelligence Overhaul

## Context

The deep-learn plugin uses prompts as walls and soil — they define structure and teaching methodology. The actual intelligence comes from the agentic system working within those walls. Right now, the platform has walls but no intelligence inside them. Every agent is a one-shot template fill. No agent observes the learner, adapts to their pace, evaluates content quality, or makes decisions.

This plan makes every touchpoint in the system intelligent — not just assessment, but reading, content, chat, pace, navigation, and orchestration equally.

## The Nine Intelligence Points

Every one of these must have active intelligence:

| Touchpoint | Current | Target |
|-----------|---------|--------|
| **1. Research** | Has Google Search, reasonably agentic | Keep as-is |
| **2. Curriculum** | One-shot template, ignores learner | Receives learner model, adapts difficulty |
| **3. Content generation** | Has tools (prev subtopic, PDF), position-aware | + quality evaluation + learner adaptation |
| **4. Reading experience** | Static page, no tracking | Tracks time-on-subtopic, engagement signals |
| **5. Chat/tutoring** | Has current subtopic context | + previous subtopics + learner model + proactive nudges |
| **6. Assessment** | Blind to actual content | Reads content via tool, tests what was taught |
| **7. Spaced repetition** | Module-level Leitner boxes | + concept-level mastery tracking |
| **8. Navigation** | Linear, no awareness | Detects backtracking, warns about prerequisites |
| **9. Orchestration** | Doesn't exist | Monitors all signals, adapts curriculum |

---

## Phase 1: Learner Model + Signal Capture + Content Intelligence (~5 days)

**Goal:** The system starts observing the learner from every touchpoint and builds a persistent understanding. Content generation and assessment become intelligent.

### 1A. Learner Model — The Foundation

Everything else depends on this. A persistent, per-topic model of the learner.

**New DB table: `learner_insights`**
```
topicId           (UNIQUE FK)
conceptMastery    jsonb — { concept: { level: weak|developing|strong, evidence[], lastUpdated } }
strengthAreas     jsonb — string[]
weakAreas         jsonb — string[]
learningStyle     jsonb — { preferredApproach, helpSeekingPattern, paceCategory }
engagementProfile jsonb — { avgTimePerSubtopic, chatFrequency, textSelectionRate, backtrackCount }
updatedAt         timestamp
```

**New DB table: `learner_signals`** — append-only event log
```
topicId, moduleId, subtopicId
signalType       varchar — subtopic_started|subtopic_completed|time_on_subtopic|
                           chat_action|text_selection|quiz_completed|quiz_failed|
                           backtrack|settings_changed|content_regenerated
data             jsonb — signal-specific payload
createdAt        timestamp
```

**New agent: `LearnerModelAgent`** (`src/agents/learner-model.ts`)
- FLASH model
- Tools: `fetchQuizResults`, `fetchChatInsights`, `fetchProgressData`, `fetchSignals`
- Gathers ALL available data — quiz scores, chat patterns, engagement signals, progress velocity
- Synthesizes into structured learner model
- Output stored in `learner_insights`
- Triggered: after quiz, after every 5th chat interaction, after settings change

### 1B. Signal Capture — Eyes Everywhere

**Frontend signals** (new: `src/hooks/use-engagement-tracker.ts`):
- `subtopic_started` — logged when content loads, with timestamp
- `time_on_subtopic` — logged when navigating away, with duration in seconds
- `text_selection` — logged when user uses Explain/Go Deeper/Simplify, with selected text + action
- `backtrack` — logged when user navigates to a subtopic in a PREVIOUS module (backward navigation)

These are fire-and-forget POSTs to `POST /api/learn/signals`.

**Backend signal capture** (added to existing routes):
- `quiz_completed` / `quiz_failed` — logged in `/checkpoint` POST with per-question data
- `chat_action` — logged in `/chat` POST with action type and concepts mentioned
- `settings_changed` — logged in `/settings` POST with old/new values
- `content_regenerated` — logged in `/content` POST when forceRegenerate=true

### 1C. Content-Aware Assessment

**Modified agent: AssessmentDesigner** (`src/agents/assessment-designer.ts`)
- Gets `fetchSubtopicContent` tool — reads actual generated content before writing questions
- Questions MUST reference specific analogies, examples, worked problems from the content
- Also receives learner model summary: if learner is weak on application → more application questions

**New tool: `fetchSubtopicContent`** (`src/agents/tools/fetch-subtopic-content.ts`)
- Same pattern as `fetchPreviousSubtopic` but no "only previous" restriction
- Assessment designer reads ALL subtopics in the module

### 1D. Intelligent Chat Tutor

**Modified agent: ChatTutor** (`src/agents/chat-tutor.ts`)
- Gets `fetchPreviousSubtopic` tool (same as content composer)
- Gets learner model context in system prompt: "This learner struggles with X, prefers Y"
- Instruction updated: "If the learner's model shows weak areas, proactively offer to explain related concepts when they're relevant to the current conversation"

### 1E. Content Quality Evaluation

**New agent: ContentEvaluator** (`src/agents/content-evaluator.ts`)
- FLASH model
- Tool: `fetchResearchContext` (to verify accuracy)
- Evaluates: clarity, completeness, continuity, example quality, accuracy
- Returns score + verdict + specific issues + suggestions
- If below threshold → content regenerated with evaluator's feedback

**Quality loop in content route:**
```
Generate → Evaluate → if pass: done → if fail: regenerate with feedback → re-evaluate → max 3 attempts
```

**New DB columns on `module_content`:**
```
qualityScore         real
generationAttempts   integer DEFAULT 1
```

**New DB table: `content_evaluations`** — audit trail of all evaluations

### Route Changes

| Route | Change |
|-------|--------|
| `POST /content` | Quality loop + learner model context to composer |
| `POST /assess` | Wire fetchSubtopicContent tool + learner model context |
| `POST /checkpoint` | Log signal, trigger learner model update |
| `POST /chat` | Wire fetchPreviousSubtopic, add learner context, log signals |
| `POST /signals` | **NEW** — generic signal ingestion endpoint |
| `GET /learner-model` | **NEW** — returns learner insights |

---

## Phase 2: Real-Time Engagement Intelligence + Adaptive Content (~4 days)

**Goal:** The system understands HOW the learner learns, not just WHAT they know. Content adapts to the learner.

### 2A. Engagement Tracking (Frontend)

**New hook: `useEngagementTracker`** (`src/hooks/use-engagement-tracker.ts`)
- Tracks time-on-subtopic: starts timer when content loads, logs duration on navigation
- Detects backtracking: if `newModuleId < currentModuleId`, logs a `backtrack` signal
- Detects rapid progression: if time < 30% of estimated, logs `rushing` signal
- Detects stuck behavior: if time > 300% of estimated, logs `stuck` signal
- All signals sent to `POST /signals` (fire-and-forget)

**Modified: `use-learning-state.ts`**
- `navigateToSubtopic` calls engagement tracker before navigating
- Calculates time spent on previous subtopic

### 2B. Adaptive Content Generation

**Modified agent: ContentComposer** (`src/agents/content-composer.ts`)
- New optional `learnerContext` in system prompt:
  ```
  ## Learner Adaptation

  This learner's profile:
  - Concept mastery: [weak areas listed]
  - Preferred approach: [analogy-driven / first-principles / example-first]
  - Pace: [slow → be more granular | fast → be more concise on basics, deeper on edges]
  - Help-seeking pattern: [heavy "simplify" use → use simpler language proactively]

  Adapt your teaching accordingly.
  ```
- Content route fetches learner model and formats this context

### 2C. Smart Spaced Repetition

**Enhanced: spaced repetition becomes concept-aware**
- Currently: module-level Leitner boxes (pass/fail the whole module)
- Target: concept-level mastery tracking
- When quiz results come in, extract per-concept scores from per-question data
- Learner model tracks concept mastery: "hashing = strong, collision resolution = weak"
- Spaced rep reviews can target specific weak concepts, not just repeat the whole module quiz
- Review quiz generation: assessment designer receives weak concepts and generates targeted questions

### 2D. Proactive Chat Intelligence

**Modified: Chat route** (`src/app/api/learn/chat/route.ts`)
- Injects learner model into tutor's system prompt
- Tutor instruction: "If the learner's weak areas overlap with the current subtopic's key concepts, proactively ask if they'd like additional explanation on those concepts"
- Example: if learner is weak on "recursion" and current subtopic covers "recursive algorithms", tutor might say: "I notice recursion has been tricky. Want me to walk through the recursive logic step by step?"

### 2E. Navigation Intelligence

**Modified: sidebar or main-content** (minimal frontend)
- If learner navigates backward (to a previous module), show a subtle note: "Revisiting earlier material? Let me know if you need help connecting the concepts."
- If learner tries to skip ahead past uncompleted prerequisites, show a warning
- These are simple conditional renders based on navigation state — no new agents needed

---

## Phase 3: Orchestrator + Dynamic Curriculum (~5 days)

**Goal:** The system actively manages the learning experience. It proposes curriculum changes based on observed patterns. The curriculum evolves.

### 3A. Learning Orchestrator Agent

**New agent: LearningOrchestrator** (`src/agents/learning-orchestrator.ts`)
- PRO model (requires pedagogical judgment)
- Tools: `fetchLearnerModel`, `fetchCurriculum`, `fetchQuizHistory`, `suggestCurriculumChanges`
- Triggered after: quiz failure (2nd+ attempt), module completion, settings change
- Decision framework:
  - **Repeated quiz failure** → propose bridge subtopic targeting weak concepts
  - **Consistent high performance** → propose skipping easy subtopics
  - **Concept-cluster weakness** → propose content regeneration with focus shift
  - **Pace mismatch** → adjust time estimates, suggest breaks or acceleration
  - **Learning style signal** → if analogy-driven content produces better quiz scores than first-principles, adjust teaching_approach for upcoming subtopics
- **Conservative**: requires patterns across multiple data points, never acts on one quiz

### 3B. Dynamic Curriculum

**Modified DB: `curricula` table**
- Add `modifications` jsonb column — array of proposed changes
- Each modification: `{ type, targetModuleId, targetSubtopicId, reason, status: pending|accepted|rejected }`

**Modification types:**
- `add_bridge_subtopic` — insert remedial content between modules
- `skip_subtopic` — mark as completed (demonstrated mastery)
- `adjust_difficulty` — store difficulty override for content generation
- `regenerate_content` — clear cached content, force regeneration with learner context
- `adjust_teaching_approach` — override subtopic's teaching_approach based on learner data

**New routes:**
- `GET /recommendations` — returns pending modifications
- `POST /recommendations` — accept/reject a modification, apply if accepted

### 3C. Recommendation UX (minimal frontend)

A notification-style card appears when recommendations exist:

```
Based on your performance patterns, we suggest:
"Add a practice section on hash collisions before Module 3"
[Accept] [Dismiss]
```

Accepting → modifies curriculum in DB → new subtopic appears in sidebar
Dismissing → removes the recommendation

### 3D. Full Signal → Model → Orchestrate → Adapt Loop

```
Every interaction:
  → Signal logged (learner_signals table)
  → Every Nth interaction or after quiz: Learner Model Agent runs
  → Learner Model updated (learner_insights table)
  → After quiz failure or module completion: Orchestrator runs
  → Orchestrator reads model + curriculum + history
  → Orchestrator proposes modifications (if warranted)
  → Learner sees recommendation
  → Accept → curriculum adapts → content generates with new context
  → Continuous loop
```

---

## What This Looks Like When Complete

**Scenario: Learner studying "Distributed Systems"**

1. Starts Module 1 (Fundamentals). First subtopic generates with quality evaluation. Passes on attempt 1 (score 88).
2. Reads subtopic 1.1. Spends 18 minutes (estimated 15). Selects "CAP theorem" text and clicks "Explain." System logs: `time_on_subtopic: 18min`, `text_selection: {text: "CAP theorem", action: "explain"}`.
3. Reads 1.2. Chat tutor knows learner struggled with CAP from previous interaction. Proactively asks: "The consistency-availability tradeoff connects directly to what we discussed about CAP. Want me to walk through how?"
4. Completes Module 1 quiz. Quiz questions reference the exact traffic light analogy from the content. Scores 85%. Learner model updates: "strong on theory, developing on application."
5. Module 2 content generates. Content composer receives learner context: "strong on theory, developing on application → include more worked examples." Content is evaluated (passes, score 82).
6. Module 2 quiz: scores 55% on application questions. Learner model updates: "application remains weak." Orchestrator fires. Reads model, sees pattern: "two modules of weak application scores." Proposes: "Add a practice-focused bridge subtopic before Module 3 targeting distributed consensus application scenarios."
7. Learner accepts recommendation. Bridge subtopic appears in sidebar. Content generates with learner context + quality evaluation. Heavy on worked examples, light on theory (learner already gets theory).
8. Module 3 quiz: application scores up to 75%. Model updates. Orchestrator sees improvement, no new recommendations needed.

Every step is intelligent. No step is a one-shot template fill.

---

## Implementation Order

Phase 1 first (foundation) → Phase 2 (engagement + adaptation) → Phase 3 (orchestration)

Each phase is independently deployable. Phase 1 is the most critical — without the learner model and signal capture, nothing else works.

## Files Summary

### New Files
- `src/lib/db/schema.ts` — add tables: learner_insights, learner_signals, content_evaluations
- `src/agents/learner-model.ts` — LearnerModelAgent
- `src/agents/content-evaluator.ts` — ContentEvaluator
- `src/agents/learning-orchestrator.ts` — LearningOrchestrator (Phase 3)
- `src/agents/tools/fetch-subtopic-content.ts` — for assessment
- `src/agents/tools/fetch-quiz-results.ts` — for learner model
- `src/agents/tools/fetch-chat-insights.ts` — for learner model
- `src/agents/tools/fetch-progress-data.ts` — for learner model
- `src/agents/tools/fetch-signals.ts` — for learner model
- `src/agents/tools/fetch-research-context.ts` — for evaluator
- `src/agents/tools/fetch-learner-model.ts` — for orchestrator (Phase 3)
- `src/agents/tools/fetch-curriculum.ts` — for orchestrator (Phase 3)
- `src/agents/tools/suggest-curriculum-changes.ts` — for orchestrator (Phase 3)
- `src/hooks/use-engagement-tracker.ts` — frontend signal capture (Phase 2)
- `src/app/api/learn/signals/route.ts` — signal ingestion
- `src/app/api/learn/learner-model/route.ts` — learner model access
- `src/app/api/learn/recommendations/route.ts` — curriculum recommendations (Phase 3)

### Modified Files
- `src/agents/assessment-designer.ts` — add tool support + learner context
- `src/agents/content-composer.ts` — add learnerContext parameter
- `src/agents/chat-tutor.ts` — add tools + learner context + proactive behavior
- `src/app/api/learn/content/route.ts` — quality loop + learner context
- `src/app/api/learn/assess/route.ts` — wire content tool
- `src/app/api/learn/checkpoint/route.ts` — signal logging + model trigger + orchestrator trigger
- `src/app/api/learn/chat/route.ts` — tools + signals + learner context
- `src/hooks/use-learning-state.ts` — engagement tracking integration (Phase 2)
