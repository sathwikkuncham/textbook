/**
 * Fixtures — real data pulled from the DB for the transformer-networks topic.
 *
 * Source: topic ID 32, curriculum module 1, snapshot on 2026-04-17.
 * We use real data so experiments reproduce the actual failure conditions.
 */

import type { ModulePlan } from "@/lib/types/learning";

export const moduleTitle = "The Pre-Computing Generative Theory";

export const modulePlan: ModulePlan = {
  goal: "Explain the probabilistic foundations of language and the early attempts to model it computationally.",
  concepts: [
    "Information Theory and Shannon Entropy",
    "Markov Chains and n-gram models",
    "Generative vs. Discriminative modeling",
    "The 'Noisy Channel' model of translation",
    "Maximum Likelihood Estimation (MLE) in NLP",
    "The Curse of Dimensionality in vocabulary space",
  ],
  sourceRefs: ["1 Introduction", "References"],
  prerequisites: [],
};

// What the production system currently passes (compressed)
export const compressedInterview = [
  "Purpose: Extreme intellectual curiosity and deep conceptual mastery of NLP evolution.",
  "Prior knowledge: Senior Software Engineer (10+ years); strong but rusty mathematical foundation; understands high-level engineering bottlenecks but new to specific AI architectures.",
  "Desired depth: Exhaustive & First-Principles — covering historical, mathematical, and architectural 'whys'.",
  "Time available: No limit — prefers a comprehensive, chronological deep-dive.",
  "Focus areas: Pre-computing generative theory (Markov, Information Theory), Evolutionary bottlenecks (RNNs, LSTMs, Vanishing Gradients), The Transformer breakthrough (Self-attention mechanics, Parallelization), Societal/Global impact and current limitations",
  "Source type: Research Paper (PDF: 1706.03762v7.pdf)",
].join("\n");

// Raw intake interview transcript — actual back-and-forth with the learner
export const rawTranscript = [
  `User: I want to learn about: "Attention is all you need" paper. Why is it revolutionary and how it has changed the world? What are the limits. What exactly was the limit before this. How did the whole thing evolved to this point. I heard a few things related generative AI exists decades earlier, even before we had computers. Also include the mathematical evolution. I am an extreme curios person. (from a PDF: 1706.03762v7.pdf)`,
  ``,
  `Assistant: That is a foundational paper to explore—it truly is the "Big Bang" moment for modern AI. Since you're interested in everything from the mathematical evolution to the pre-computer history of generative ideas, what is your current background in math or programming?`,
  ``,
  `User: I am a working software engineer who is coding for more than 10 years. I was topper in maths but not in touch with it since a decade. I can go to any depth you take when you use first principles and make sure you help me cover and I can ramp to any level you take bottom up! Structure it in such a way that I can intuitively understand things and enjoy even if there is no time limit.`,
  ``,
  `Assistant: That's a perfect foundation. Given your engineering background, we can definitely skip the "AI for dummies" explanations and dive straight into the architectural mechanics. Since you're interested in the long-arc evolution—including the pre-computer era—how deep do you want to go into the "why" of the math? For instance, are you looking to understand the derivation of the linear algebra and probability behind these models, or are you more focused on the conceptual "intuition" of how those formulas solved the specific scaling bottlenecks of the older RNN/LSTM architectures?`,
  ``,
  `User: Don't worry much into why in maths. For maths, it should be more of a top down when it comes to complex things if you think the whole thing deviates from what we are aiming to learn. The aim is still to understand the revolutionary paper and evolution. But it's important to bottlenecks to understand the evolution and why this is important.`,
  ``,
  `Assistant: That makes sense—we'll focus on the "architectural intuition." We'll treat the math as a tool to solve specific engineering problems (like the vanishing gradient or sequential bottlenecks) rather than just abstract formulas. Since you're an "extreme curious person" with no time limit, would you prefer to structure this as a complete chronological deep-dive (starting with the early probability theories of the 1900s and building up to the 2017 paper) or would you rather start with the Transformer paper and "lookup" the historical context only when we hit a feature that was designed to solve a past problem?`,
  ``,
  `User: Complete chronological deep dive`,
  ``,
  `Assistant: This is going to be a fascinating journey. We'll start with the early seeds of information theory and Markov chains from the early 20th century, move through the "bottleneck years" of recurrent neural networks, and finally dissect the 2017 Transformer paper as the architectural breakthrough that paved the way for the current era.`,
].join("\n");
