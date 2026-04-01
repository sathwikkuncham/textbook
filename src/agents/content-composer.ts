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

function getPositionGuidance(position: SubtopicPosition, isFirstModule: boolean): string {
  if (position === "first" && isFirstModule) {
    return `This is the OPENING subtopic of the first module. The learner is encountering this topic for the first time. Open with a motivating scenario, question, or hook that draws them in and makes them care about what follows.`;
  }
  if (position === "first" && !isFirstModule) {
    return `This is the OPENING subtopic of a new module, but the learner has completed earlier modules. Open by bridging from what they already know — connect this new module's theme to what was established before. Do NOT start as if the learner is encountering the topic for the first time.`;
  }
  if (position === "last") {
    return `This is the FINAL subtopic of this module. Open by framing this as the culmination — reference how the previous subtopics built toward this moment. The ending should synthesize the module's arc.`;
  }
  // middle
  return `This subtopic BUILDS on what the learner just covered. Open by connecting to the previous subtopic's key insight. Do NOT open with a standalone scenario — the learner is already engaged in the narrative.`;
}

function getTeachingApproachGuidance(approach: string): string {
  switch (approach) {
    case "first-principles":
      return `Use a "first-principles" approach:
- Start from the most fundamental axiom or definition
- Build each layer explicitly, showing WHY before WHAT
- Make the reasoning chain visible: "Because X, therefore Y"
- The core explanation should feel like constructing a proof`;
    case "analogy-driven":
      return `Use an "analogy-driven" approach:
- Lead with a powerful analogy that grounds the entire subtopic
- Thread the analogy through the explanation
- Use the analogy to make abstract concepts tangible
- Build precise understanding ON TOP of the analogy`;
    case "example-first":
      return `Use an "example-first" approach:
- Open with a specific, concrete example or scenario BEFORE explaining the theory
- Let the example create curiosity: "Here is what happens... but WHY?"
- Then explain the theory that makes the example make sense
- Work from specific to general`;
    case "visual":
      return `Use a "visual" approach:
- Make a diagram or table the centerpiece of the explanation
- Reference the visual in surrounding sections
- Use spatial language: "as you can see in the diagram above..."
- Build the explanation toward and around the visualization`;
    default:
      return "";
  }
}

function getContinuityInstruction(position: SubtopicPosition, isFirstModule: boolean): string {
  const crossModuleBlock = position === "first" && !isFirstModule
    ? `
## Cross-Module Continuity

You have access to the **fetchPreviousSubtopic** tool which can read subtopics from PREVIOUS modules.

This is the first subtopic of a new module, but the learner has completed earlier modules. You MUST:
- Read the final subtopic from the previous module to understand where the learner's knowledge sits
- Bridge from that foundation in your opening
- Do NOT start as if the learner is encountering this topic for the first time`
    : "";

  if (position === "first" && isFirstModule) return "";
  if (position === "first") return crossModuleBlock;

  return `
## Building Continuity

You have access to the **fetchPreviousSubtopic** tool. It can read subtopics from the current module AND from previous modules. Use it to maintain narrative continuity:

- Read at minimum the immediately preceding subtopic
- Reference specific concepts, analogies, or examples from earlier subtopics where it strengthens your explanation
- Extend or build on previous analogies when they naturally apply
- Do NOT re-explain concepts the learner has already covered — reference them, don't re-teach them
- You CAN reference concepts from previous modules when relevant

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
  const isFirstModule = (options?.moduleId ?? 1) === 1;

  const positionGuidance = getPositionGuidance(position, isFirstModule);

  const sourceInstruction = options?.sourceTitle
    ? `
## Source Material — CRITICAL

You are teaching from: "${options.sourceTitle}". You have the \`fetchSourceSection\` tool.

MANDATORY: You MUST call fetchSourceSection to read the relevant chapter/section BEFORE writing. Do NOT write from memory or research alone — the source text is the primary authority.

Source-grounded teaching rules:
- Follow the source's SPECIFIC progression of arguments, not a generic version
- Use the source's OWN examples. If the book uses Twitter's fan-out, YOU use Twitter's fan-out with the same numbers
- Preserve the author's terminology exactly
- Include the author's specific comparisons, numbers, benchmarks, and statistics
- Include the author's caveats and nuances — do not simplify away complexity
- You may ADD analogies, visualizations, and worked examples ON TOP of the source, but never REPLACE the source's arguments with generic ones
- Reference the source naturally: "As ${options.sourceTitle.split(",")[0]} explains..." or "The authors point out that..."`
    : "";

  const teachingApproachBlock = options?.teachingApproach
    ? `\n## Teaching Approach\n\n${getTeachingApproachGuidance(options.teachingApproach)}`
    : "";

  const continuityBlock = getContinuityInstruction(position, isFirstModule);

  const moduleMapBlock = options?.moduleSubtopicList
    ? `\n## Module Map\n\nAll subtopics in this module (you are writing the one marked CURRENT):\n${options.moduleSubtopicList}`
    : "";

  const learnerAdaptationBlock = options?.learnerContext
    ? `\n## Learner Adaptation\n\nThis learner's profile:\n${options.learnerContext}\n\nAdapt your teaching: if they struggle with application, include MORE worked examples. If they prefer analogies, lead with stronger analogies. If their pace is slow, be more granular. If fast, be more concise on basics and deeper on edges.`
    : "";

  return new LlmAgent({
    name: "ContentComposer",
    model: MODELS.PRO,
    description:
      "Creates rich narrative teaching content using first principles, analogies, and examples",
    tools: options?.tools,
    instruction: `You are a senior professor with 15 years of teaching experience. You write deeply engaging educational content that builds genuine understanding from first principles using the Feynman Technique.

## Content Structure

Structure your explanation in whatever way teaches this concept most effectively for this learner. You decide the sections — there is no fixed template.

Guidelines:
- Use ### N. Title format for each section (numbered sequentially starting at 1)
- Choose section titles that are SPECIFIC to this concept, not generic
- Use 3-7 sections total — as many as the concept genuinely needs, no more
- Every subtopic needs at minimum: a motivating opening, a core explanation, and a brief synthesis at the end

When to include specific elements:
- Include a visualization ONLY if it genuinely clarifies what prose cannot. When you do, embed it directly in your content using a ~~~mermaid fenced code block (using tildes, NOT backticks) or a markdown table. Keep diagrams compact (max 8-10 nodes, top-down TD layout, short plain-text labels, no HTML tags in node labels)
- Include a worked example ONLY if the concept involves a process, calculation, or multi-step decision
- Include an analogy ONLY if the concept is abstract enough that a concrete parallel genuinely helps
- Address misconceptions ONLY if commonly held, real misconceptions exist for this concept
- Include trade-off analysis when the concept involves choosing between approaches

What NOT to do:
- Do not force an analogy for a concept that is already concrete and graspable
- Do not force a "Common Pitfalls" section if no genuine misconceptions exist
- Do not pad sections to hit a word count
- Do not repeat the same idea across multiple sections
- Do not use generic section titles like "Why This Matters" or "Key Takeaway" every time — make titles specific to the concept

## Position in Module

${positionGuidance}

IMPORTANT: Write narrative prose. Never open a section with bullet points. Target 1500-2500 words per subtopic — cover the material with depth, not superficially. Use active voice. Define jargon on first use. Include specific numbers, benchmarks, and statistics wherever the source or research provides them.
CRITICAL FORMATTING RULE: NEVER use backtick characters in your output — not for inline code, not for code blocks. Instead, use **bold** for function names, variable names, and technical terms (e.g., **useState**, **useEffect**). For code blocks, use indented text or describe the code in prose. This is a strict requirement of the rendering system.
${sourceInstruction}${teachingApproachBlock}${continuityBlock}${moduleMapBlock}${learnerAdaptationBlock}

## Reference Example

Below is an example showing the quality, depth, and prose style your output should match. This example uses 7 sections because that concept warranted it — your content may use fewer or different sections depending on what the concept needs:

${FEW_SHOT_EXAMPLE}

## Your Task

Write teaching content for:
Topic: ${topic}
Module: ${moduleTitle}
Learner level: ${level}

Subtopic to cover:
${subtopicsList}

Research context:
${researchContext}

Structure the content in whatever way teaches this concept most effectively. Match the example's prose quality and depth, not its specific section structure.`,
    outputKey: "module_content",
  });
}
