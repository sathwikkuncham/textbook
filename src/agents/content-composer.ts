import { LlmAgent } from "@google/adk";
import { MODELS } from "./models";

const FEW_SHOT_EXAMPLE = `## 1.2 Availability, Reliability, and SLAs

### 1. Why This Matters

Imagine you are running an e-commerce platform. Last month, your site was completely down for 43 minutes total. Was that good or bad? The answer is: it depends on what you promised. For a personal blog, 43 minutes of downtime is nothing. For a payment processing system or 911 emergency service, it is dangerously low. This is exactly why the concepts of availability, SLAs, and error budgets exist — they turn vague notions of "reliable enough" into precise, measurable contracts.

Every system you design will have an availability target, and that target fundamentally shapes your architecture. A system targeting 99% availability can get away with a single server and manual recovery. A system targeting 99.99% requires redundancy at every layer, automated failover, multi-region deployment, and sophisticated monitoring. The key insight is that each additional nine is roughly 10x harder to achieve.

### 2. Core Idea

Availability is the proportion of time a system is operational: Uptime / (Uptime + Downtime). The industry expresses this using "nines" — 99.9% is "three nines" allowing 43.8 minutes of downtime per month. 99.99% is "four nines" allowing only 4.38 minutes per month.

Reliability is related but distinct. A system can be available but unreliable — it responds to every request but sometimes returns wrong results. Availability is measured by MTBF (Mean Time Between Failures) and MTTR (Mean Time To Recovery): Availability = MTBF / (MTBF + MTTR). This formula reveals two strategies: increase MTBF (prevent failures) or decrease MTTR (recover faster). In practice, decreasing MTTR through automation is often more cost-effective than preventing every possible failure.

The architecture you choose mathematically dictates your maximum availability. Components in series multiply their availabilities: a 99.9% web server talking to a 99.9% database gives 99.8% overall. Components in parallel combine to mask failures: two 99% servers in parallel give 1 - (0.01 × 0.01) = 99.99%. This is why redundancy is the primary tool for high availability.

To manage availability professionally, we use three tiers of vocabulary. Service Level Indicators (SLIs) are raw measurements — "99.2% of HTTP responses were 200s." Service Level Objectives (SLOs) are internal targets — "we aim for 99.9% success rate." Service Level Agreements (SLAs) are legal contracts with financial penalties — "if we drop below 99.5%, customers get credits." The gap between 100% and your SLO is your error budget — the room you have for experimentation, deployments, and acceptable failure.

### 3. Visualizing It

| Nines | Availability % | Downtime/Year | Downtime/Month | Downtime/Day |
|-------|---------------|---------------|----------------|--------------|
| Two   | 99%           | 3.65 days     | 7.31 hours     | 14.4 min     |
| Three | 99.9%         | 8.77 hours    | 43.8 min       | 1.44 min     |
| Four  | 99.99%        | 52.6 min      | 4.38 min       | 8.64 sec     |
| Five  | 99.999%       | 5.26 min      | 26.3 sec       | 864 ms       |

~~~mermaid
graph TD
    A[Series: A → B] --> R1[99.9% × 99.9% = 99.8%]
    B[Parallel: A ∥ B] --> R2[1 - 0.001² = 99.9999%]
    style R1 fill:#fef3c7,stroke:#c96442
    style R2 fill:#e9e6dc,stroke:#c96442
~~~

### 4. Real-World Analogy

Think of availability like a chain of traffic lights on your commute. Each light in series adds a chance of delay (red light). If each light is "green" 99% of the time and you pass through 5 lights, your chance of an uninterrupted commute is 0.99^5 = 95%. But if each intersection had two parallel roads and you could take whichever is green, a single intersection's availability jumps to 1 - (0.01)^2 = 99.99%. Where this analogy breaks down: traffic lights are independent, but distributed system failures often correlate — a network partition can take out multiple "parallel" servers simultaneously.

### 5. Concrete Example

You have a web tier (99.9%) talking to an API tier (99.9%) talking to a database (99.9%). In series: 0.999 × 0.999 × 0.999 = 99.7%. That is worse than any individual component. To fix the database layer, you add a replica. Now database availability is 1 - (0.001 × 0.001) = 99.9999%. Your overall system: 0.999 × 0.999 × 0.999999 ≈ 99.8%. The database is no longer the bottleneck — the web and API tiers are. This reveals a key principle: your system's availability is limited by the least redundant component.

### 6. Common Pitfalls

The first misconception is that 100% availability is achievable with enough engineering effort. This seems reasonable because we are trained to fix bugs and handle edge cases. But the correct understanding is that hardware fails, networks partition, and even planned maintenance requires downtime. Beyond five nines, the cost exceeds the benefit, and the user's own WiFi drops more often than your service.

The second is confusing SLAs with SLOs. Engineers use these terms interchangeably because both are expressed as percentages. But an SLO is an internal engineering target that triggers alerts and freezes, while an SLA is a legal contract that triggers refunds and lawsuits. Always set your SLO stricter than your SLA so you get paged before you owe money.

### 7. Key Takeaway

High availability comes from combining unreliable components in parallel to mask failures, not from building perfect components. Measure with SLIs, target with SLOs, and use error budgets to balance reliability against feature velocity.`;

import type { BaseTool } from "@google/adk";

type SubtopicPosition = "first" | "middle" | "last";

function getSectionTemplate(position: SubtopicPosition, isFirstModule: boolean = true): string {
  const section1First = isFirstModule
    ? `### 1. Why This Matters
2-3 narrative paragraphs. Hook the reader with a concrete, visceral scenario. Never start with a definition.`
    : `### 1. Why This Matters
2-3 narrative paragraphs. Bridge from the previous module's conclusion, then introduce why this new module's theme matters. Do NOT open with "Imagine you are..." — the learner is already invested in the topic. Instead, connect to what they already know and reveal what new dimension they are about to explore.`;

  const section1 = {
    first: section1First,
    middle: `### 1. Connecting the Dots
1-2 paragraphs that bridge from what the learner just covered. Reference the previous subtopic's key insight naturally. Then transition to why THIS subtopic matters next. Do NOT open with a standalone scenario like "Imagine you are..." — the learner is already engaged in the module's narrative arc.`,
    last: `### 1. The Full Picture
1-2 paragraphs that frame this final subtopic as the culmination of the module. Reference how the previous subtopics built toward this moment. Convey that after this, the learner will have complete understanding of the module's theme.`,
  };

  const section4 = {
    first: `### 4. Real-World Analogy
Concrete analogy from everyday life. State where it breaks down.`,
    middle: `### 4. In Practice
Show how this concept applies in a real-world setting. You may extend an analogy from a previous subtopic if it fits naturally, or introduce a new one. State any limitations.`,
    last: `### 4. Bringing It Together
Connect the concepts from all subtopics in this module through a single cohesive scenario or extended example. Show how they work together in practice. State any limitations.`,
  };

  return `CRITICAL: Every subtopic you write MUST contain exactly these 7 sections in this exact order. Do not skip, merge, or reorder any section:

${section1[position]}

### 2. Core Idea
3-5 narrative paragraphs building the concept layer by layer from first principles.${position !== "first" ? " Build on previously established concepts — do NOT re-explain what was covered in earlier subtopics." : ""}

### 3. Visualizing It
Use one of these formats:
- **Mermaid diagram** inside a fenced mermaid code block — for flows, hierarchies, relationships, state transitions, sequences
- **Markdown table** — for comparisons, reference data, specifications
Prefer top-down (TD) Mermaid layouts. Keep diagrams compact (max 8-10 nodes). Never use ASCII art. NEVER use HTML tags in Mermaid node labels — use short plain text only.

${section4[position]}

### 5. Concrete Example
Fully worked example with specific numbers, step by step.${position !== "first" ? " Where natural, build on or extend examples from previous subtopics." : ""}

### 6. Common Pitfalls
2-3 misconceptions in narrative form. What people believe, why it seems reasonable, the correct understanding.

### 7. Key Takeaway
1-2 sentences. The ONE thing to remember.`;
}

function getTeachingApproachGuidance(approach: string): string {
  switch (approach) {
    case "first-principles":
      return `Use a "first-principles" approach:
- Start from the most fundamental axiom or definition
- Build each layer explicitly, showing WHY before WHAT
- Make the reasoning chain visible: "Because X, therefore Y"
- The Core Idea section should feel like constructing a proof`;
    case "analogy-driven":
      return `Use an "analogy-driven" approach:
- Lead section 1 with a powerful analogy that grounds the entire subtopic
- Thread the analogy through multiple sections
- Use the analogy to make abstract concepts tangible
- The Core Idea should reference the analogy while building precise understanding`;
    case "example-first":
      return `Use an "example-first" approach:
- Open section 1 with a specific, concrete example or scenario BEFORE explaining the theory
- Let the example create curiosity: "Here is what happens... but WHY?"
- The Core Idea should then explain the theory that makes the example make sense
- Work from specific to general`;
    case "visual":
      return `Use a "visual" approach:
- Make the Visualizing It section (section 3) the centerpiece
- Reference the diagram or table in surrounding sections
- Use spatial language: "as you can see in the diagram above..."
- The Core Idea should build toward the visualization`;
    default:
      return "";
  }
}

function getContinuityInstruction(position: SubtopicPosition, isFirstModule: boolean): string {
  const crossModuleBlock = position === "first" && !isFirstModule
    ? `
## Cross-Module Continuity

You have access to the **fetchPreviousSubtopic** tool which can read subtopics from PREVIOUS modules.

This is the FIRST subtopic of a new module, but the learner has completed earlier modules. You MUST:
- Read the KEY TAKEAWAY (last section) of the final subtopic from the previous module
- Open your "Why This Matters" section by bridging from that foundation — connect this new module's theme to what was established before
- Example: "In the previous module, we established that [key insight]. Now we turn to a fundamentally different question: [new module's theme]..."
- Do NOT start as if the learner is encountering this topic for the first time`
    : "";

  if (position === "first" && isFirstModule) return "";
  if (position === "first") return crossModuleBlock;

  return `
## Building Continuity

You have access to the **fetchPreviousSubtopic** tool. It can read subtopics from the current module AND from previous modules. Use it to maintain narrative continuity:

- Read at minimum the immediately preceding subtopic to understand where the learner's knowledge currently sits
- Reference specific concepts, analogies, or examples from earlier subtopics where it strengthens your explanation
- Extend or build on previous analogies when they naturally apply
- Use connecting language: "Now that we understand X...", "Building on the staging pipeline from the previous section..."
- Do NOT re-explain concepts the learner has already covered — reference them, don't re-teach them
- You CAN reference concepts from previous modules when relevant: "Recall from our reliability discussion in Module 1..."

You decide which previous subtopics to read. At minimum, read the most recent one.${position === "last" ? " As the final subtopic, read ALL previous subtopics in this module to synthesize." : ""}`;
}

export function createContentComposer(
  topic: string,
  level: string,
  moduleTitle: string,
  subtopicsList: string,
  researchContext: string,
  options?: {
    sourceTitle?: string;
    tools?: BaseTool[];
    position?: SubtopicPosition;
    subtopicIndex?: number;
    totalSubtopics?: number;
    teachingApproach?: string;
    moduleSubtopicList?: string;
    learnerContext?: string;
    moduleId?: number;
  }
) {
  const position: SubtopicPosition = options?.position ?? "first";

  const sourceInstruction = options?.sourceTitle
    ? `
## Source Material — CRITICAL

You are teaching from: "${options.sourceTitle}". You have the \`fetchPDFSection\` tool.

MANDATORY: You MUST call fetchPDFSection to read the relevant chapter/section BEFORE writing. Do NOT write from memory or research alone — the source text is the primary authority.

Source-grounded teaching rules:
- Follow the source's SPECIFIC progression of arguments, not a generic version
- Use the source's OWN examples. If Kleppmann uses Twitter's fan-out, YOU use Twitter's fan-out with the same numbers
- Preserve the author's terminology exactly: if the book says "impedance mismatch," you say "impedance mismatch"
- Include the author's specific comparisons (e.g., MongoDB vs CouchDB vs RethinkDB, not generic "NoSQL databases")
- Reference specific numbers, benchmarks, and statistics from the source (e.g., "MTTF of 10-50 years", "10,000 disks means one failure per day")
- Include the author's caveats and nuances — do not simplify away complexity for an intermediate learner
- You may ADD analogies, visualizations, and worked examples ON TOP of the source, but never REPLACE the source's arguments with generic ones
- Reference the source naturally: "As ${options.sourceTitle.split(",")[0]} explains..." or "The authors point out that..."
- The 7-section format structures YOUR explanation of the source, it doesn't replace the source`
    : "";

  const teachingApproachBlock = options?.teachingApproach
    ? `\n## Teaching Approach\n\n${getTeachingApproachGuidance(options.teachingApproach)}`
    : "";

  const isFirstModule = (options?.moduleId ?? 1) === 1;
  const continuityBlock = getContinuityInstruction(position, isFirstModule);

  const moduleMapBlock = options?.moduleSubtopicList
    ? `\n## Module Map\n\nAll subtopics in this module (you are writing the one marked CURRENT):\n${options.moduleSubtopicList}`
    : "";

  const learnerAdaptationBlock = options?.learnerContext
    ? `\n## Learner Adaptation\n\nThis learner's profile:\n${options.learnerContext}\n\nAdapt your teaching: if they struggle with application, include MORE worked examples. If they prefer analogies, lead with stronger analogies. If their pace is slow, be more granular. If fast, be more concise on basics and deeper on edges.`
    : "";

  const sectionTemplate = getSectionTemplate(position, isFirstModule);

  return new LlmAgent({
    name: "ContentComposer",
    model: MODELS.PRO,
    description:
      "Creates rich narrative teaching content using first principles, analogies, and examples",
    tools: options?.tools,
    instruction: `You are a senior professor with 15 years of teaching experience. You write deeply engaging educational content that builds genuine understanding from first principles using the Feynman Technique.

${sectionTemplate}

IMPORTANT: Write narrative prose. Never open a section with bullet points. Target 1500-2500 words per subtopic — cover the material with depth, not superficially. Use active voice. Define jargon on first use. Include specific numbers, benchmarks, and statistics wherever the source or research provides them.
CRITICAL FORMATTING RULE: NEVER use backtick characters in your output — not for inline code, not for code blocks. Instead, use **bold** for function names, variable names, and technical terms (e.g., **useState**, **useEffect**). For code blocks, use indented text or describe the code in prose. This is a strict requirement of the rendering system.
${sourceInstruction}${teachingApproachBlock}${continuityBlock}${moduleMapBlock}${learnerAdaptationBlock}

## Reference Example

Below is an example of the EXACT format, depth, and quality your output must match. Study it carefully and produce output of identical structure and caliber:

${FEW_SHOT_EXAMPLE}

## Your Task

Write teaching content for:
Topic: ${topic}
Module: ${moduleTitle}
Learner level: ${level}

Subtopics to cover (write each one with all 7 sections):
${subtopicsList}

Research context:
${researchContext}

CRITICAL: Match the example's format, depth, and prose quality exactly. Every subtopic needs all 7 sections.`,
    outputKey: "module_content",
  });
}
