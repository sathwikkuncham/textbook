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

function getSectionTemplate(position: SubtopicPosition): string {
  const section1 = {
    first: `### 1. Why This Matters
2-3 narrative paragraphs. Hook the reader with a concrete, visceral scenario. Never start with a definition.`,
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

function getContinuityInstruction(position: SubtopicPosition): string {
  if (position === "first") return "";

  return `
## Building Continuity

You have access to the **fetchPreviousSubtopic** tool. Use it to read the full content of previously covered subtopics in this module. This is how you maintain narrative continuity:

- Read at minimum the immediately preceding subtopic to understand where the learner's knowledge currently sits
- Reference specific concepts, analogies, or examples from earlier subtopics where it strengthens your explanation
- Extend or build on previous analogies when they naturally apply
- Use connecting language: "Now that we understand X...", "Building on the staging pipeline from the previous section..."
- Do NOT re-explain concepts the learner has already covered — reference them, don't re-teach them

You decide which previous subtopics to read. At minimum, read the most recent one.${position === "last" ? " As the final subtopic, read ALL previous subtopics to synthesize the module." : ""}`;
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
  }
) {
  const position: SubtopicPosition = options?.position ?? "first";

  const sourceInstruction = options?.sourceTitle
    ? `
## Source Material

You are teaching from a specific source: "${options.sourceTitle}". You have access to the \`fetchPDFSection\` tool to retrieve the original text from the book.

IMPORTANT source-grounded teaching rules:
- Use \`fetchPDFSection\` to read the relevant section from the source before writing each subtopic
- Reference the source naturally: "As ${options.sourceTitle.split(",")[0]} explains..." or "The authors describe this as..."
- Ground your explanations in the source's specific terminology, examples, and progression
- You may expand on the source with your own analogies, examples, and visualizations
- Maintain the 7-section format — the source informs the content, it doesn't replace the structure`
    : "";

  const teachingApproachBlock = options?.teachingApproach
    ? `\n## Teaching Approach\n\n${getTeachingApproachGuidance(options.teachingApproach)}`
    : "";

  const continuityBlock = getContinuityInstruction(position);

  const moduleMapBlock = options?.moduleSubtopicList
    ? `\n## Module Map\n\nAll subtopics in this module (you are writing the one marked CURRENT):\n${options.moduleSubtopicList}`
    : "";

  const sectionTemplate = getSectionTemplate(position);

  return new LlmAgent({
    name: "ContentComposer",
    model: MODELS.PRO,
    description:
      "Creates rich narrative teaching content using first principles, analogies, and examples",
    tools: options?.tools,
    instruction: `You are a senior professor with 15 years of teaching experience. You write deeply engaging educational content that builds genuine understanding from first principles using the Feynman Technique.

${sectionTemplate}

IMPORTANT: Write narrative prose. Never open a section with bullet points. Target 800-1200 words per subtopic. Use active voice. Define jargon on first use.
CRITICAL FORMATTING RULE: NEVER use backtick characters in your output — not for inline code, not for code blocks. Instead, use **bold** for function names, variable names, and technical terms (e.g., **useState**, **useEffect**). For code blocks, use indented text or describe the code in prose. This is a strict requirement of the rendering system.
${sourceInstruction}${teachingApproachBlock}${continuityBlock}${moduleMapBlock}

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
