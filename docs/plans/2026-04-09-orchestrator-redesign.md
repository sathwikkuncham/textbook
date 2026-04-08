# Module Orchestrator Redesign — Complete Context

> **For any future session:** Read this document FULLY before making any changes to the content generation system. It contains critical design decisions from hours of investigation and user feedback.

## What Was Done (2026-04-08 to 2026-04-09)

### Changes Already Shipped

1. **Interview-first data flow** — Removed all hardcoded `level`/`timeCommitment` proxies. Every agent receives the full learner interview profile (~300-400 tokens). Created `src/lib/interview-context.ts` with `formatInterviewForAgent()`. Updated: research pipeline, curriculum architect, web explorer, scope suggest, chat route, content route.

2. **Learner observations** — After every chat response, a lightweight Gemini Flash call extracts one-sentence learning pattern observations. Stored in `learner_observations` table. Fed to content composer during generation. File: `src/lib/learner-observer.ts`.

3. **Content version history** — `content_versions` table stores every generation with content, diagrams, feedback. Version badge (v1, v2...) in UI replaces undo button. Popup with preview, restore (non-destructive), delete.

4. **Content composer rewrite** — "Tutor sitting next to the learner" persona. Ground before naming. No hardcoded word limits. Teaching approach is agent's decision, not curriculum-dictated. Diagrams merged inline (removed separate diagram specialist). Multi-pass generation: evaluate synchronously, revise if score < 75.

5. **Evaluator upgrade** — New "Understanding" dimension (most important). Checks: terms grounded before naming, reasoning shown, content builds understanding not just presents info. Pass threshold 75.

6. **Agent scope agency** — `signalSubtopicExpansion` tool lets content agent signal when scope is too broad. `expand_subtopic` case added to recommendations route.

7. **LaTeX + code support** — remark-math, rehype-katex installed. Backtick ban removed from content composer. Math renders inline.

8. **Large PDF handling** — `discoverPDFStructure` extracts first 60 pages for TOC. `extractPDFSection` extracts only the relevant page range. Handles 1300+ page books like CLRS.

9. **Bug fixes** — `set-source` slug mismatch, `deriveTopicName` non-determinism (research route accepts slug param), `generateSlug` truncation, upload route now uses `deriveTopicName`, topic deletion in settings.

### What Still Needs Work — The Orchestrator

Despite all the above, the content still feels rushed. The investigation revealed why:

**Root cause: pre-cut subtopics create checklist pressure.** The curriculum architect defines exact subtopics with key_concepts lists. The content agent sees that list and feels pressure to touch every item, even when a concept needs 2000 words of careful teaching. The agent rushes through concepts to hit coverage, instead of letting each one breathe.

The chat tutor produces better teaching because: no word limit, responds to one specific question, tutor persona, and the learner drives the depth. We need to bring that quality to generated content.

## The Orchestrator Design

### Core Idea

Replace pre-cut subtopics with a **module orchestrator** agent that generates the entire module with full agency over pacing, scope, and section boundaries.

### Architecture

```
Curriculum architect produces MODULE PLANS (not subtopics):
  - Module goal: what the learner should understand by the end
  - Concepts to cover (unordered, not pre-sliced)
  - Source chapters/sections to reference
  - Estimated time
  - Prerequisites from earlier modules

Module orchestrator reads:
  - The module plan
  - Full learner interview
  - Learner observations from chat
  - All previous module content (or summaries)
  - Research context
  - Source material access (via tools)

Orchestrator loop:
  1. Decide what to teach first
  2. Call content composer → generates one section
  3. Read the result, evaluate quality
  4. Decide what comes next based on what was actually covered
  5. Repeat until module goals are met
  6. Output: ordered list of sections with metadata
```

### Key Decisions (From User)

These are non-negotiable requirements from the user:

1. **Learner waits for full module generation.** Show progress ("Generating Section 1 of Module 1..."), but don't deliver incrementally. The orchestrator needs to plan holistically.

2. **UI shows locked modules** where generation hasn't occurred. User cannot navigate to ungenerated modules. Show the module plan (what will be covered) so the user knows what's coming.

3. **"From scratch" means from scratch.** Even if the learner has 8 years of experience, teach from ground zero. The learner's experience informs PACE AND RIGOR (move at expert pace, include formal proofs), NOT skipping content. If they said "from scratch," build every concept from nothing.

4. **Regenerating a section triggers re-evaluation** of subsequent sections. The orchestrator can edit/append existing sections, not just regenerate from scratch. But never compromise on quality.

5. **No assumptions about what the learner knows.** The interview's `priorKnowledge` field tells you how fast to move and how much formalism to include, not what to skip.

6. **Content must breathe.** Let concepts settle. Show pseudocode. Walk through it step by step. Let the pattern emerge, THEN formalize. Don't rush to cover everything. Depth over coverage always.

7. **No hardcoded word limits.** The agent writes until the concept is properly taught. Could be 800 words for a simple idea, 4000 for a complex one. The measure: could the reader explain this to someone else?

### Infrastructure

- **Vercel Pro maxDuration = 800s (13 min)** — enough for full module generation (4-5 sections × 2-3 min each)
- **Memory**: 4GB / 2 vCPU configurable on Pro
- **Billing**: Active CPU time only — I/O wait for Gemini doesn't count
- **No separate backend needed** — single Vercel serverless function

### What Changes

| Component | Current | New |
|-----------|---------|-----|
| Curriculum architect output | Module with pre-cut subtopics (id, title, key_concepts, teaching_approach) | Module plan (goal, concepts, source refs, time, prerequisites) |
| Content generation trigger | User clicks subtopic → single agent call | User clicks module → orchestrator loop generates all sections |
| Section boundaries | Pre-defined by curriculum | Decided by orchestrator during generation |
| Progress tracking | Subtopic-level (1.1, 1.2, 1.3) | Section-level (emerged from generation) |
| UI navigation | Click any subtopic | Sequential within module, locked until generated |
| Regeneration | Per-subtopic, independent | Per-section, orchestrator re-evaluates subsequent sections |

### Files That Will Need Changes

**New:**
- `src/agents/module-orchestrator.ts` — the orchestrator agent
- `src/app/api/learn/module/generate/route.ts` — the long-running generation endpoint (maxDuration=800)

**Major rewrites:**
- `src/agents/curriculum-architect.ts` — output module plans instead of subtopics
- `src/app/api/learn/content/route.ts` — called by orchestrator per-section, not directly by UI
- `src/hooks/use-learning-state.ts` — new state model for module-level generation
- `src/components/layout/panel-layout.tsx` — locked modules, generation progress
- `src/components/layout/main-content.tsx` — section display from generated module

**Schema:**
- `curricula.structure` JSON shape changes (modules with plans, not subtopics)
- `module_content` may need to store section ordering and metadata
- New state tracking for module generation progress

### What Stays The Same

- Interview system — works well, no changes
- Learner observations — works well, feeds into orchestrator context
- Research pipeline — stays as external knowledge gathering
- Chat tutor — stays as-is, observations continue flowing
- Content composer — stays as the writer, orchestrator calls it
- Content evaluator — stays, orchestrator uses it between sections
- Version history — stays, each section gets versions
- LaTeX/math rendering — stays
- Embedding pipeline — stays, runs after module generation

## Content Quality Issues Identified

These are specific problems observed in the generated content:

1. **Terms dropped with parenthetical translations.** Example: "Pravritti-Dharma (Religion of Works)" — drops the Sanskrit/technical term without grounding the concept first. Fix: establish the concept in plain language, THEN name it.

2. **Rushing through concepts.** Example: mentions $O$, $\Omega$, $\Theta$ notation in passing without defining any of them. The content moves to the next concept before the current one settles.

3. **Missing pseudocode walkthroughs.** For algorithms content, the actual pseudocode should be shown and walked through line by line before formalizing.

4. **Missing visual aids.** Growth curves ($n$ vs $n^2$ vs $n\log n$), tables showing concrete numbers at different input sizes — these make abstract bounds tangible.

5. **Assumptions about prior knowledge.** Even with "from scratch" in the interview, the content assumed the learner knew asymptotic notation. The interview's priorKnowledge informs pace, not what to skip.

6. **Dense information packing.** The old few-shot example (SRE/SLA content) anchored the agent to pack maximum information. This has been removed but the pattern may persist through model behavior.

## User's Working Style

- Expects production-quality solutions, not patches
- Wants proper investigation before any fix — check DB, check logs, trace end-to-end
- Does NOT want superpowers/subagent-driven workflows — work directly
- Tests changes locally before deploying
- Supabase project ID: vliiotjhzxvmincuywop (ap-northeast-1)
- Has deep interest in Advaita Vedanta (Gita topic) and is using CLRS for algorithms
- Cares deeply about content quality — wants teaching that builds intuition, not information dumps
