/**
 * Multi-topic fixtures — 5 diverse real DB topics used to test Variant D's generality.
 *
 * Each topic spans a different domain, depth profile, and time commitment.
 * We measure whether Variant D's tune works across this range without
 * relying on domain-specific examples.
 */

import type { ModulePlan } from "@/lib/types/learning";

export interface TopicFixture {
  id: number;
  slug: string;
  displayName: string;
  moduleTitle: string;
  modulePlan: ModulePlan;
  compressedInterview: string;
  rawTranscript: string;
  // What production actually generated — for comparison only
  productionSubtopicCount: number;
  productionSubtopicTitles: string[];
  profileSummary: string;
}

function formatTranscript(turns: Array<{ role: string; content: string }>): string {
  return turns
    .map((t) => `${t.role === "user" ? "User" : "Assistant"}: ${t.content}`)
    .join("\n\n");
}

function formatCompressed(intent: {
  purpose: string;
  priorKnowledge: string;
  desiredDepth: string;
  timeAvailable: string;
  focusAreas: string[];
  sourceType: string;
}): string {
  return [
    `Purpose: ${intent.purpose}`,
    `Prior knowledge: ${intent.priorKnowledge}`,
    `Desired depth: ${intent.desiredDepth}`,
    `Time available: ${intent.timeAvailable}`,
    `Focus areas: ${intent.focusAreas.join(", ")}`,
    `Source type: ${intent.sourceType}`,
  ].join("\n");
}

// ── Topic 28: CLRS Algorithms ───────────────────────────────

const clrsIntent = {
  purpose: "Comprehensive mastery from scratch; seeking an interactive, first-principles alternative to traditional reading.",
  priorKnowledge: "Comfortable with basic coding; former high-achiever in high school math but rusty (10+ year gap); needs foundational math re-introduction.",
  desiredDepth: "Extremely Deep — word-by-word, cover-to-cover, covering both rigorous proofs and implementation.",
  timeAvailable: "Flexible/No time constraint — prefers a slow, thorough pace.",
  focusAreas: ["Mathematical foundations and logic", "Asymptotic notation", "Probabilistic analysis", "Data structures", "Algorithm design and implementation", "Formal proofs"],
  sourceType: "Textbook (CLRS 4th Edition)",
};

export const topicCLRS: TopicFixture = {
  id: 28,
  slug: "algorithms-clrs-textbook-companion",
  displayName: "Algorithms: CLRS Textbook Companion",
  moduleTitle: "Mathematical Foundations for Algorithm Analysis",
  modulePlan: {
    goal: "Apply mathematical tools to describe sets, manipulate summations, and evaluate discrete probability for algorithmic use cases.",
    concepts: [
      "Summation properties and formulas",
      "Set theory basics and notation",
      "Relations and functions",
      "Graphs and trees as mathematical objects",
      "Discrete probability and expectation",
      "Permutations and combinations",
      "Proof by induction techniques",
    ],
    sourceRefs: ["Part VIII Appendix: Mathematical Background"],
    prerequisites: [],
  },
  compressedInterview: formatCompressed(clrsIntent),
  rawTranscript: formatTranscript([
    { role: "user", content: "I want to learn about: Let's explore the Introduction to algorigthms by CLRS in depth. End to end, cover by cover. TTHis has to be the best textbook experience. I won't be relying on textbook, rather your content to mastery this from scratch to advanced level. The goal is to get the better understanding of the textbook end to end. I have not read the book. I will not read. (from a PDF: CLRS4e2022.pdf)" },
    { role: "assistant", content: "That is a bold and exciting goal! CLRS is widely considered the \"Bible\" of algorithms. To get started, what's the primary motivation behind this? Are you aiming for top-tier software engineering roles, preparing for academic research, or is this a personal challenge to master the fundamentals?" },
    { role: "user", content: "The goal is to explore the depth and breadth of this book end to end. I always wished reading but always felt that I need a better experience reading a textbook and that's the reason I am here. No time constraints. No need to rush. We will start from scratch. Use first principles. Bottom up. Delve deeper into everything word by word." },
    { role: "assistant", content: "I love that approach. Going \"word by word\" from first principles is the most rewarding way to tackle a titan like CLRS. How comfortable are you currently with basic programming and high school-level math (like algebra and logarithms)?" },
    { role: "user", content: "I am comfortable with basics coding and high school level maths. But need some introduction to maths as I have not been in touch with maths for over a decade now. I love maths and was a topper but need some first principle thinking here for me to get to the platform." },
    { role: "assistant", content: "That makes perfect sense. Rebuilding that mathematical intuition from first principles will ensure that the \"advanced\" parts of the book don't feel like magic later on. How do you want to handle the balance between the rigorous mathematical proofs and the actual coding of the algorithms?" },
    { role: "user", content: "Both are equally important for me." },
    { role: "assistant", content: "This sounds like a fantastic journey. We will treat CLRS not just as a book, but as a mental workout, rebuilding the foundations of computer science from the ground up." },
  ]),
  productionSubtopicCount: 4,
  productionSubtopicTitles: [
    "Sets, Relations, and Functions: The Vocabulary of Discrete Mathematics",
    "Graphs and Trees: The Structural Blueprints of Algorithms",
    "Summations and Induction: The Algebra of Algorithm Analysis",
    "Counting and Chance: Permutations, Combinations, and Discrete Probability",
  ],
  profileSummary: "Advanced · Extremely deep · No time constraint · Rusty math (10+ yr gap) · 7 concepts",
};

// ── Topic 29: LLMs Beginner ─────────────────────────────────

const llmIntent = {
  purpose: "Personal curiosity—demystifying the 'magic' of AI for a non-technical learner",
  priorKnowledge: "Absolute beginner, no coding or technical background",
  desiredDepth: "High-level conceptual (bottom-up logic without math/code)",
  timeAvailable: "15-30 minutes",
  focusAreas: ["The training process (how it learns from data)", "The inference process (what happens after hitting send)", "How machines 'understand' text patterns"],
  sourceType: "Conceptual Exploration",
};

export const topicLLMs: TopicFixture = {
  id: 29,
  slug: "understanding-large-language-models-llms",
  displayName: "Understanding Large Language Models (LLMs)",
  moduleTitle: "The Building Blocks: Tokens and Word Maps",
  modulePlan: {
    goal: "Explain how raw text is converted into a mathematical format the AI can process.",
    concepts: [
      "Tokenization",
      "Tokens as building blocks",
      "Numerical IDs for words",
      "Embeddings (The Map of Meaning)",
      "Vector space (GPS coordinates for words)",
      "Semantic relationships (King/Queen example)",
      "Physical proximity of similar concepts",
    ],
    sourceRefs: ["Phase 1: The Foundation", "Phase 1: The Building Blocks"],
    prerequisites: [],
  },
  compressedInterview: formatCompressed(llmIntent),
  rawTranscript: formatTranscript([
    { role: "user", content: "I want to learn about: I'm new to the LLM and these models but I am shocked bythe sheer value it is bringing. Why and how is it working and how exactly it understands this. Can you explain in simple words, how I can understand these bottom up?" },
    { role: "assistant", content: "It's an incredible time to dive into this. To help me tailor the explanation for you, what's your background like? Are you coming from a technical or coding side, or should we keep things purely conceptual as we start from the bottom?" },
    { role: "user", content: "Non technical or non coding side. I don't know anything and I saw the chatgpt and shocked to see how accurate result and dunno what exactly happens when I send the request." },
    { role: "assistant", content: "That makes total sense. To get the depth right for you: are you looking for a quick 15-minute high-level overview of the concepts, or would you like to dive into a more structured \"mini-course\" over a few days to really grasp how it goes from simple text to those \"smart\" answers?" },
    { role: "user", content: "Yes. 15-30 min." },
    { role: "assistant", content: "Got it. Since we're aiming for a 15–30 minute deep dive for a non-technical background, focusing on the \"bottom-up\" logic is a great way to demystify the magic. One last thing to help me sharpen the focus: are you more curious about how the model was \"taught\" originally (the training phase), or the step-by-step process of what happens inside its \"brain\" the very second you hit send on a message?" },
    { role: "user", content: "Both" },
    { role: "assistant", content: "That's perfect. We'll spend that time looking at how the \"brain\" was built from all the text on the internet and exactly how it predicts the next word to give you those accurate answers." },
  ]),
  productionSubtopicCount: 3,
  productionSubtopicTitles: [
    "From Words to Numbers: What are Tokens?",
    "The Map of Meaning: Giving Words a Neighborhood",
    "Word Math: Navigating Relationships",
  ],
  profileSummary: "Beginner · High-level conceptual · 15-30 min · Absolute beginner · 7 concepts",
};

// ── Topic 30: Turboquant Beginner ───────────────────────────

const turboquantIntent = {
  purpose: "Conceptual understanding to participate in discussions about AI efficiency",
  priorKnowledge: "Beginner — limited knowledge of ML/Neural Networks",
  desiredDepth: "High-level / Conceptual — explaining the 'how' and 'why' without deep math or code",
  timeAvailable: "1 hour total (paced for a slow reader)",
  focusAreas: ["What is quantization?", "Efficiency vs. Accuracy trade-offs", "How Turboquant/Quantization enables AI on local devices", "Key terminology for conversation"],
  sourceType: "General AI concept / Quantization tech",
};

export const topicTurboquant: TopicFixture = {
  id: 30,
  slug: "turboquant-ai-efficiency-concepts",
  displayName: "Turboquant: AI Efficiency Concepts",
  moduleTitle: "The Memory Wall: Why AI Needs Turboquant",
  modulePlan: {
    goal: "Explain the relationship between AI context length and memory consumption.",
    concepts: [
      "The Memory Wall",
      "KV Cache (Key-Value Cache)",
      "Linear growth of memory with context length",
      "HBM (High Bandwidth Memory) constraints",
      "GPU vs. Consumer hardware limitations",
      "Long-context AI (128K+ tokens)",
      "Cost-per-query economics",
    ],
    sourceRefs: ["Foundations: 1. The Core Innovation", "Foundations: 3. Real-World Applications"],
    prerequisites: [],
  },
  compressedInterview: formatCompressed(turboquantIntent),
  rawTranscript: formatTranscript([
    { role: "user", content: "I want to learn about: Turboquant" },
    { role: "assistant", content: "That sounds like an interesting focus! To help me build the right path for you, are you looking at Turboquant in the context of a specific library (like the one for quant finance or model quantization) or perhaps a specific paper or course?" },
    { role: "user", content: "I want to learn about it completely how ai is using this technology" },
    { role: "assistant", content: "Got it—exploring how AI leverages quantization for performance is a great topic. To tailor the depth, how comfortable are you with machine learning basics? For example, do you already know how neural networks or large language models (LLMs) work, or should we start from the fundamentals?" },
    { role: "user", content: "I know very little basic" },
    { role: "assistant", content: "That's helpful to know! Since we're starting with the basics, I can make sure we cover the \"why\" before the \"how.\" One last thing to help me scope this out: are you looking for a high-level conceptual understanding of how this makes AI faster and more efficient, or do you want to eventually get hands-on with some code? Also, how much time do you have to dedicate to this—are we looking at a quick weekend deep-dive or a few hours a week over a month?" },
    { role: "user", content: "Incan read for 1 hour and I am slow reader i would like to understand and will be able to talk about this" },
    { role: "assistant", content: "Thanks for sharing that! Since you have about an hour and want to be able to discuss the topic confidently, we'll focus on the high-level \"magic\" of how quantization makes massive AI models small enough to run on everyday devices without losing their \"intelligence.\"" },
  ]),
  productionSubtopicCount: 4,
  productionSubtopicTitles: [
    "The Expanding Mind: Understanding the Memory Wall",
    "The Weight of Words: Why Memory Runs Out",
    "Shrinking the Scratchpad: The Magic of Quantization",
    "The Price of Memory: Why Efficiency Equals Access",
  ],
  profileSummary: "Beginner · Conceptual · 1 hour · Slow reader · Limited ML knowledge · 7 concepts",
};

// ── Topic 31: Psoriasis Medical ─────────────────────────────

const psoriasisIntent = {
  purpose: "Post-graduate dermatology exam preparation (specifically structured for a 10-mark theory answer)",
  priorKnowledge: "Dermatology PG student — strong medical foundation, requires high-level immunodermatology details",
  desiredDepth: "Advanced — focusing on molecular pathways (IL-23/Th17 axis), genetic susceptibility (PSORS1-9), and feed-forward mechanisms",
  timeAvailable: "4 months (long-term mastery and retention)",
  focusAreas: ["Genetic loci and HLA associations", "Trigger-pathophysiology correlation", "Molecular feed-forward cycle", "Exam-style flowcharts for scoring"],
  sourceType: "PDF (iavcl-psoriasis.pdf)",
};

export const topicPsoriasis: TopicFixture = {
  id: 31,
  slug: "psoriasis-pathophysiology-a-10-mark-answer",
  displayName: "Psoriasis Pathophysiology: A 10-Mark Answer",
  moduleTitle: "Etiology: Genetics and Environmental Triggers",
  modulePlan: {
    goal: "Identify and explain the genetic loci and triggers necessary for a high-scoring etiology section in a 10-mark answer.",
    concepts: [
      "PSORS1 locus and HLA-Cw6 association",
      "Non-PSORS loci (PSORS2-9)",
      "Genetic polymorphisms in IL23R and TNFAIP3",
      "Koebner Phenomenon mechanisms",
      "Streptococcal superantigens and Guttate psoriasis",
      "Drug-induced psoriasis (Lithium, Beta-blockers, NSAIDs)",
      "Lifestyle triggers: obesity, smoking, and alcohol",
    ],
    sourceRefs: ["31 Psoriasis (pp. 1120-1200)"],
    prerequisites: [],
  },
  compressedInterview: formatCompressed(psoriasisIntent),
  rawTranscript: formatTranscript([
    { role: "user", content: "I want to learn about: pathophysiology of psoriasis including genetic factors, risk factors, triggering factors and corelating everything in actual pathophyology and give me in easy, understandable and as a 10 mark answer to the questions (from a PDF: iavcl-psoriasis.pdf)" },
    { role: "assistant", content: "It sounds like you're looking for a very structured, exam-ready breakdown—specifically that \"10-mark answer\" style. To help me make this as clear as possible for you, are you a medical student, a nursing student, or perhaps studying another health-related field?" },
    { role: "user", content: "i am dermatology post graduation student" },
    { role: "assistant", content: "That makes sense—since you're a PG student, we can focus on the higher-level immunopathogenesis and specific molecular pathways like the IL-23/Th17 axis that examiners love. How soon is your exam? Also, for your 10-mark answer, would you like me to emphasize the detailed genetic loci (like PSORS1-9) or focus more on the clinical-pathological correlation of the \"feed-forward\" cycle?" },
    { role: "user", content: "both" },
    { role: "assistant", content: "Understood. Since we're covering both the complex genetic loci (like PSORS1 and the HLA-Cw6 association) and the intricate molecular crosstalk for a PG-level answer, I have one last question to make sure this fits your schedule: How much time do you have to master this—are you in \"crunch mode\" for an exam this week, or do you have a few days to digest the complexities? (Also, would you like me to include a schematic \"flowchart\" description that you can easily replicate in your answer script?)" },
    { role: "user", content: "i have exam in 4 months but include flowcharts too" },
    { role: "assistant", content: "I have everything I need to build your study plan. Since you're a PG student with a 4-month window, we can focus on building a high-yield, structured \"10-mark\" framework that integrates those complex genetic details with clear, reproducible flowcharts." },
  ]),
  productionSubtopicCount: 3,
  productionSubtopicTitles: [
    "The Genetic Landscape: PSORS Loci and Major Polymorphisms",
    "Environmental Catalysts: Physical Trauma and Streptococcal Triggers",
    "Systemic Modifiers: Pharmacological Triggers and Lifestyle Factors",
  ],
  profileSummary: "Advanced · PG exam-oriented · 4 months · Molecular depth · 7 concepts",
};

// ── Topic 33: System Design ─────────────────────────────────

const systemDesignIntent = {
  purpose: "Professional mastery through first-principles engineering; building a bottom-up mental model of large-scale systems.",
  priorKnowledge: "Professional Software Engineer; familiar with application logic but needs foundational infrastructure and distributed systems depth.",
  desiredDepth: "Exhaustive / Academic-to-Applied; no shortcuts, focusing on the 'how' and 'why' at the lowest levels.",
  timeAvailable: "Unrestricted / Intensive (Maximum possible bandwidth)",
  focusAreas: [
    "Hardware & OS Primitives (Disk I/O, Syscalls, Memory Management, Concurrency)",
    "Network Internals (TCP/IP stack, Socket programming, Congestion control)",
    "Storage Engine Mechanics (B-Trees, LSM Trees, WAL, Transaction Isolation)",
    "Distributed Fundamentals (Time, Consensus, Replication, Partitioning)",
    "High-Scale Architectural Patterns (Asynchronous processing, API Gateway, Load Balancing)",
  ],
  sourceType: "Comprehensive Curriculum",
};

export const topicSystemDesign: TopicFixture = {
  id: 33,
  slug: "advanced-system-design-mastery",
  displayName: "Advanced System Design Mastery",
  moduleTitle: "The Physics of a Single Machine: Hardware & OS Primitives",
  modulePlan: {
    goal: "Explain and calculate the impact of hardware latencies and kernel I/O models on software performance.",
    concepts: [
      "L1/L2/L3 Cache Latency vs Main Memory",
      "Disk Seek vs Sequential I/O (SSD Page/Block mechanics)",
      "Kernel vs User Space Transitions",
      "Blocking vs Non-blocking I/O",
      "Synchronous vs Asynchronous I/O (epoll, io_uring)",
      "Context Switching and Thread Pool Exhaustion",
      "Memory Hierarchy and the Latency Numbers every programmer should know",
      "CPU Concurrency vs Parallelism",
    ],
    sourceRefs: ["Phase 1: The Hardware & OS Layer (The Physics)", "Layer 1: The Foundations"],
    prerequisites: [],
  },
  compressedInterview: formatCompressed(systemDesignIntent),
  rawTranscript: formatTranscript([
    { role: "user", content: "I want to learn about: System design from scratch to advanced. Complete end to end. No rush. No compromises. No shortcuts. Deeper understanding on everything that matters. No surface level explanations. For everything we need to go deeper." },
    { role: "assistant", content: "That is a great mindset to have—mastery takes time, but it's worth it. To help me tailor this deep dive, could you tell me a bit about your current background? Are you already working as a developer, or are you starting from a different field?" },
    { role: "user", content: "I'm a software engineer. Never got time to touch upon this side and now I have to. Professional requirements but that doesn't mean you need to compromise or rush. You should strictly follow detailed and deeper explanations." },
    { role: "assistant", content: "Since we're going for total mastery with no shortcuts, how much time can you realistically dedicate to this each week?" },
    { role: "user", content: "I can dedicate any amount of time. Plan for maximum possible time and go deeper and take time to establish. Use first Principles. Build things bottom up. Don't rush to finish or create something." },
    { role: "assistant", content: "To ensure we truly start from first principles: do you want to begin with the hardware and OS primitives that make distributed systems possible (like disk I/O, syscalls, and network stacks), or would you prefer to start directly at the software architectural level (load balancing, caching strategies, and database internals)?" },
    { role: "user", content: "You decide. I need to understand and start from the most fundamental  which should be built on top of these fundamentals. Bottom up. First principles" },
    { role: "assistant", content: "Understood. If we are building from the absolute bedrock, we have to start where the software meets the metal—at the OS and hardware level—before we ever talk about \"the cloud\" or \"microservices.\"" },
  ]),
  productionSubtopicCount: 4,
  productionSubtopicTitles: [
    "The Memory Hierarchy: Caches, Latency, and the Physics of Data Movement",
    "Persistence Physics: The Mechanical and Electrical Reality of Disk I/O",
    "The Gatekeeper: System Calls, Context Switching, and the Concurrency Myth",
    "Modern I/O Paradigms: From Blocking Sockets to io_uring",
  ],
  profileSummary: "Advanced · Exhaustive · Unrestricted time · Bottom-up first principles · 8 concepts",
};

export const allTopicFixtures: TopicFixture[] = [
  topicLLMs, // beginner quick (15-30 min)
  topicTurboquant, // beginner standard (1 hour)
  topicCLRS, // advanced extremely deep
  topicPsoriasis, // advanced 4-month exam prep
  topicSystemDesign, // advanced unrestricted exhaustive
];
