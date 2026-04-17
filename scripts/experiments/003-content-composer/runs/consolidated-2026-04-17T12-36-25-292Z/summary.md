# Content Composer — Experiment Index

Run ID: 2026-04-17T12-36-25-292Z
Date: 2026-04-17T12:41:39.895Z

## Variants under test

- **A**: Baseline (current production) — Current production composer — prescriptive teaching-approach table and generic adaptation heuristics.
- **B**: Voice-Match — Reframes learner context as canonical voice anchor; removes prescriptive teaching-approach recipes.
- **C**: Voice + Rigor + Source Primacy — Variant B plus prerequisite rebuilding, concept coherence, source-fetching discipline, and pre-output self-review.

## Anchors

- **Topic 29**: Understanding Large Language Models (LLMs) — Beginner · High-level conceptual · 15-30 min · Absolute non-technical
- **Topic 31**: Psoriasis Pathophysiology: A 10-Mark Answer — Advanced · PG exam 10-mark · Molecular depth · 4 months
- **Topic 32**: Transformer Networks: History and Theory — Advanced · Exhaustive first-principles · No time limit · Senior SWE, rusty math

## Results index

| Topic | Variant | Words | Latency |
|-------|---------|-------|---------|
| 29 Understanding Large Language Models (LLMs) | A | 789 | 34605ms | [file](topic-29-variant-A.md) |
| 29 Understanding Large Language Models (LLMs) | B | 815 | 29576ms | [file](topic-29-variant-B.md) |
| 29 Understanding Large Language Models (LLMs) | C | 669 | 26742ms | [file](topic-29-variant-C.md) |
| 31 Psoriasis Pathophysiology | A | 1079 | 40693ms | [file](topic-31-variant-A.md) |
| 31 Psoriasis Pathophysiology | B | 806 | 33928ms | [file](topic-31-variant-B.md) |
| 31 Psoriasis Pathophysiology | C | 801 | 31380ms | [file](topic-31-variant-C.md) |
| 32 Transformer Networks | A | 1289 | 43168ms | [file](topic-32-variant-A.md) |
| 32 Transformer Networks | B | 1057 | 38737ms | [file](topic-32-variant-B.md) |
| 32 Transformer Networks | C | 1098 | 35764ms | [file](topic-32-variant-C.md) |

## Review template

For each of the 9 outputs, read the full .md file and assess:

1. **Voice match** — Does the register match the learner's intake words? (Topic 29: simple, non-technical diction. Topic 31: exam-structured with flowchart-ready framing. Topic 32: first-principles, bottom-up, chronological.)
2. **Depth calibration** — Is the length and rigor appropriate to the stated depth? (29: short/concrete. 31: medium/structured. 32: expansive/rigorous.)
3. **Prerequisite rebuilding (C-specific)** — For Topic 32 (rusty math), does Variant C visibly rebuild prerequisites before introducing new math that Variant A and B would skip?
4. **Ground before naming** — Are technical terms introduced only after their intuition is established?
5. **Recipe leakage (A vs B/C)** — Does Variant A show signs of the prescriptive "teaching approach" menu, e.g., cosmetic first-principles framing without actual first-principles substance?
6. **No topic examples in instruction** — not applicable here (that's a prompt-design check, not an output check).
7. **Feynman test** — After reading, could the specific learner explain the concept to someone else?

## Qualitative verdict

Reviewer read every output in full before writing this section.

### Per-topic call

**Topic 29 — LLMs (beginner quick):** **B wins**
- B opens by quoting the learner's own intake language back ("shocked", "bottom-up", "what exactly happens the millisecond you hit send"). A and C don't.
- B uses a genuine first-principles teaching move ("first instinct → problem / second instinct → problem / goldilocks") — actual pedagogical scaffolding, not a named recipe.
- C is tightest (669 words) but feels slightly generic; no explicit learner quote.
- A is engaging (789 words) but uses a random "The unhelpful robot" example and doesn't reference the learner's stated "shocked" feeling.
- All three honor non-technical register — no one drops math.

**Topic 31 — Psoriasis (PG exam):** **C edges out A, B weakest**
- A has the most pedagogically engaging opening (clinical vignette: "Imagine a patient walking into your clinic... guttate plaques") — but this is the old recipe-menu's "example-first" firing, not voice-matching. Accidentally good.
- A also has two mermaid flowcharts (B and C have one each). For a learner who explicitly asked for "flowcharts too," this is A's biggest strength.
- C has the sharpest exam-framing and the most actionable structure — explicit "Exam Strategy: How to Write This" section with the exact heading/bullet framework to reproduce in the exam script. This literally serves the learner's stated 10-mark-answer goal.
- C splits "Why does HLA-Cw6 matter clinically?" and "Why does HLA-Cw6 matter molecularly?" — disciplined two-angle treatment that A does not.
- B is the weakest here: exam-coach tone without A's vignette or C's actionable structure.
- **Net:** C's systematic learner-alignment > A's accidental pedagogical luck.

**Topic 32 — Transformer (exhaustive first-principles, rusty math, SWE):** **C wins decisively**
- C **explicitly quotes the learner back**: "You mentioned your math foundation is strong but rusty, and that you prefer a top-down architectural intuition for the formulas. Let's rebuild the mathematical concept of 'surprise' using exactly that approach." This is the single clearest demonstration of voice-matching across all 9 outputs.
- C opens with chronological framing that directly honors the learner's "complete chronological deep-dive" request: "If we want to understand the 2017 'Attention Is All You Need' paper from first principles, we cannot start in 2017."
- C has the most explicit log-derivation rationale (multiplicative probability → additive surprise → requires log → base 2 because bits). Textbook-worthy "but why" treatment.
- A is rich (1289 words, 6 sections) and has a brilliant SWE hook (code-review opening with a for loop). But A's voice-match is implicit at best — never quotes the learner back, never acknowledges "rusty math" or "top-down math preference."
- B is middle ground — good "top-down math intuition" section label but doesn't quote learner.
- A has more content breadth. C is slightly tighter but still substantive.

### Overall winner: Variant C

Across the three anchors:
- C wins on Topic 32 (the original failure case we needed to fix) — decisively
- C edges A on Topic 31 (systematic exam-alignment > accidental vignette)
- C loses to B on Topic 29 but is still stronger than A there

Variant A's successes are accidental — when the teaching-approach recipe menu happens to match the topic (example-first for medical, first-principles for math), A produces decent content. When it doesn't, A produces generic content. We cannot rely on luck.

Variant C's successes are systematic — explicit voice-quoting, explicit acknowledgement of stated preferences, explicit prerequisite-rebuilding framing. These reproduce across topics.

### Refinement notes for the lock-in

Two concerns surfaced that are addressable inside the prompt, no re-experiment needed:

1. **Topic 29 gap:** Variant B explicitly quoted the learner ("You mentioned feeling shocked"); Variant C only nodded to "bottom-up" once. The voice-quote directive in C is present but can be elevated from "when it serves the teaching" to a stronger: "Thread the learner's actual phrasing through the opening and throughout — do not paraphrase into generic language."

2. **Topic 31 flowchart count:** C produced one flowchart; the learner explicitly asked for "flowcharts too" (plural). For learners who request a specific number or type of visualization, C should honor that literally. Add principle: "If the learner asked for a specific visual artifact (flowcharts, diagrams, tables), produce them generously — at the natural landing points in the explanation, not one token diagram."

### Recommendation

Lock Variant C into `src/agents/content-composer.ts` with those two refinements applied. Call that Variant D (production-ready).
