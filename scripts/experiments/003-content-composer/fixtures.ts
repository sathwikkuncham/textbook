/**
 * Content Composer — fixtures for empirical validation.
 *
 * Three anchors spanning the range:
 *   29 LLMs          — beginner, 15-30 min, absolute non-technical (tests voice simplicity)
 *   31 Psoriasis     — PG exam, molecular depth, structured 10-mark answer
 *   32 Transformer   — exhaustive first-principles, senior SWE, rusty math (the original failure case)
 *
 * Source-based testing is deferred to a separate focused experiment; this
 * round isolates the voice-match + prerequisite-rebuilding hypothesis.
 */

export interface ComposerFixture {
  id: number;
  slug: string;
  displayName: string;
  topic: string;
  level: string;
  moduleTitle: string;
  subtopicDesc: string;
  subtopicTitle: string;
  scope: string;
  concepts: string[];
  totalSubtopics: number;
  moduleSubtopicList: string;
  researchContext: string;
  learnerContext: string;
  profileSummary: string;
}

function turns(t: Array<{ role: "user" | "assistant"; content: string }>): string {
  return t.map((x) => `${x.role === "user" ? "User" : "Assistant"}: ${x.content}`).join("\n\n");
}

function buildLearnerContext(summary: string, transcript: string): string {
  return [
    "## Learner profile (labeled summary)",
    summary,
    "",
    "## Full intake conversation (learner's own words)",
    "",
    transcript,
  ].join("\n");
}

// ── Topic 29: LLMs (beginner, quick) ────────────────────────────────────

const llmSummary = [
  "Purpose: Personal curiosity—demystifying the 'magic' of AI for a non-technical learner",
  "Prior knowledge: Absolute beginner, no coding or technical background",
  "Desired depth: High-level conceptual (bottom-up logic without math/code)",
  "Time available: 15-30 minutes",
  "Focus areas: The training process (how it learns from data), The inference process (what happens after hitting send), How machines 'understand' text patterns",
  "Source type: Conceptual Exploration",
].join("\n");

const llmTranscript = turns([
  { role: "user", content: "I want to learn about: I'm new to the LLM and these models but I am shocked bythe sheer value it is bringing. Why and how is it working and how exactly it understands this. Can you explain in simple words, how I can understand these bottom up?" },
  { role: "assistant", content: "It's an incredible time to dive into this. To help me tailor the explanation for you, what's your background like? Are you coming from a technical or coding side, or should we keep things purely conceptual as we start from the bottom?" },
  { role: "user", content: "Non technical or non coding side. I don't know anything and I saw the chatgpt and shocked to see how accurate result and dunno what exactly happens when I send the request." },
  { role: "assistant", content: "That makes total sense. To get the depth right for you: are you looking for a quick 15-minute high-level overview of the concepts, or would you like to dive into a more structured 'mini-course' over a few days to really grasp how it goes from simple text to those 'smart' answers?" },
  { role: "user", content: "Yes. 15-30 min." },
  { role: "assistant", content: "Got it. Since we're aiming for a 15–30 minute deep dive for a non-technical background, focusing on the 'bottom-up' logic is a great way to demystify the magic. One last thing to help me sharpen the focus: are you more curious about how the model was 'taught' originally (the training phase), or the step-by-step process of what happens inside its 'brain' the very second you hit send on a message?" },
  { role: "user", content: "Both" },
  { role: "assistant", content: "That's perfect. We'll spend that time looking at how the 'brain' was built from all the text on the internet and exactly how it predicts the next word to give you those accurate answers." },
]);

const llmResearch = `Large Language Models (LLMs) like GPT, Claude, and Gemini process text by converting human language into numbers the computer can operate on. This conversion begins with TOKENIZATION: the input text is split into small pieces called tokens, which can be whole words, subwords, or even single characters depending on the tokenizer (BPE, SentencePiece, WordPiece). Each unique token is assigned a numerical ID from a fixed vocabulary (typically 32K–200K entries). The sequence of IDs is what the model actually sees — never raw text.

These IDs alone carry no meaning. The next step is EMBEDDING: each ID is mapped to a dense vector (typically 768 to 12288 dimensions) in a learned vector space. During training, these vectors are adjusted so that tokens with similar meaning occupy nearby positions. A famous example: the vector arithmetic 'king - man + woman ≈ queen' works because these relationships are preserved geometrically. This is sometimes called the 'map of meaning' or semantic space.

Key intuitions for a non-technical audience:
- Text enters as letters, but the computer only handles numbers
- Tokens are like puzzle pieces of language (sometimes whole words, sometimes fragments)
- Each token gets a coordinate in a high-dimensional 'concept space'
- Tokens that mean similar things sit near each other in that space
- All of an LLM's 'understanding' is manipulation of these coordinates

This is the foundation on which everything else (attention, generation, next-word prediction) is built.`;

export const topicLLMs: ComposerFixture = {
  id: 29,
  slug: "understanding-large-language-models-llms",
  displayName: "Understanding Large Language Models (LLMs)",
  topic: "Understanding Large Language Models (LLMs)",
  level: "beginner",
  moduleTitle: "The Building Blocks: Tokens and Word Maps",
  subtopicTitle: "Chopping Up Language: Tokens as Building Blocks",
  scope: "Explain that AI cannot 'read' words like humans do, but only understands numbers. Introduce how text is chopped up into smaller pieces called tokens, and how each token is assigned a unique numerical ID to create the foundational building blocks of AI language processing.",
  subtopicDesc: "1.1: Chopping Up Language: Tokens as Building Blocks (concepts: Tokenization, Tokens as building blocks, Numerical IDs for words)",
  concepts: ["Tokenization", "Tokens as building blocks", "Numerical IDs for words"],
  totalSubtopics: 2,
  moduleSubtopicList: "1.1: Chopping Up Language: Tokens as Building Blocks (CURRENT)\n1.2: The Map of Meaning — How Tokens Become Concepts",
  researchContext: llmResearch,
  learnerContext: buildLearnerContext(llmSummary, llmTranscript),
  profileSummary: "Beginner · High-level conceptual · 15-30 min · Absolute non-technical",
};

// ── Topic 31: Psoriasis (PG exam, molecular depth) ──────────────────────

const psoriasisSummary = [
  "Purpose: Post-graduate dermatology exam preparation (specifically structured for a 10-mark theory answer)",
  "Prior knowledge: Dermatology PG student — strong medical foundation, requires high-level immunodermatology details",
  "Desired depth: Advanced — focusing on molecular pathways (IL-23/Th17 axis), genetic susceptibility (PSORS1-9), and feed-forward mechanisms",
  "Time available: 4 months (long-term mastery and retention)",
  "Focus areas: Genetic loci and HLA associations, Trigger-pathophysiology correlation, Molecular feed-forward cycle, Exam-style flowcharts for scoring",
  "Source type: PDF (iavcl-psoriasis.pdf)",
].join("\n");

const psoriasisTranscript = turns([
  { role: "user", content: "I want to learn about: pathophysiology of psoriasis including genetic factors, risk factors, triggering factors and corelating everything in actual pathophyology and give me in easy, understandable and as a 10 mark answer to the questions (from a PDF: iavcl-psoriasis.pdf)" },
  { role: "assistant", content: "It sounds like you're looking for a very structured, exam-ready breakdown—specifically that '10-mark answer' style. To help me make this as clear as possible for you, are you a medical student, a nursing student, or perhaps studying another health-related field?" },
  { role: "user", content: "i am dermatology post graduation student" },
  { role: "assistant", content: "That makes sense—since you're a PG student, we can focus on the higher-level immunopathogenesis and specific molecular pathways like the IL-23/Th17 axis that examiners love. How soon is your exam? Also, for your 10-mark answer, would you like me to emphasize the detailed genetic loci (like PSORS1-9) or focus more on the clinical-pathological correlation of the 'feed-forward' cycle?" },
  { role: "user", content: "both" },
  { role: "assistant", content: "Understood. Since we're covering both the complex genetic loci (like PSORS1 and the HLA-Cw6 association) and the intricate molecular crosstalk for a PG-level answer, I have one last question to make sure this fits your schedule: How much time do you have to master this—are you in 'crunch mode' for an exam this week, or do you have a few days to digest the complexities? (Also, would you like me to include a schematic 'flowchart' description that you can easily replicate in your answer script?)" },
  { role: "user", content: "i have exam in 4 months but include flowcharts too" },
  { role: "assistant", content: "I have everything I need to build your study plan. Since you're a PG student with a 4-month window, we can focus on building a high-yield, structured '10-mark' framework that integrates those complex genetic details with clear, reproducible flowcharts." },
]);

const psoriasisResearch = `Psoriasis is a chronic, immune-mediated inflammatory disease with complex polygenic susceptibility and well-defined molecular pathways. For a PG-level 10-mark exam answer, the etiology section must integrate genetic determinants with environmental triggers.

GENETIC ARCHITECTURE:
- PSORS1 locus on chromosome 6p21.3 (MHC region) is the major susceptibility locus, contributing ~35-50% of heritable risk.
- The HLA-Cw6 (HLA-C*06:02) allele is the strongest individual genetic determinant, strongly associated with early-onset (Type I) psoriasis, guttate morphology, and Koebner positivity. It presents autoantigens (including LL-37 and ADAMTSL5) to CD8+ T cells, triggering the downstream inflammatory cascade.
- Non-PSORS loci: PSORS2 (17q25, CARD14), PSORS3 (4q34), PSORS4 (1q21, EDC region with LCE gene cluster), PSORS5 (3q21), PSORS6 (19p13), PSORS7 (1p), PSORS8 (16q), PSORS9 (4q31). Each contributes smaller effect sizes.
- Key immune polymorphisms: IL23R (p.Arg381Gln protective variant), IL12B, TNFAIP3 (A20, negative regulator of NF-κB), TRAF3IP2, NFKBIA. These cluster in the IL-23/Th17 pathway, which is mechanistically central.

ENVIRONMENTAL TRIGGERS:
- Physical trauma → Koebner phenomenon (isomorphic response): trauma exposes LL-37, recruits pDCs, triggers TNF-α/IFN-α cascade in genetically predisposed skin.
- Streptococcal infection (β-hemolytic, throat) → guttate psoriasis, mediated by superantigen-driven T-cell activation (especially in HLA-Cw6+ patients).
- Drugs: Lithium (inhibits IP3, alters keratinocyte proliferation), β-blockers (cAMP reduction), NSAIDs (arachidonic acid shunting), antimalarials, IFN-α, withdrawal of systemic corticosteroids.
- Lifestyle: smoking (pustular variants), alcohol (hepatic IL-6), obesity (adipokines, chronic low-grade inflammation), psychological stress (HPA-axis, neuropeptide release).

FEED-FORWARD MOLECULAR CYCLE:
The IL-23/Th17 axis is the mechanistic heart: dendritic cells produce IL-23 → activates Th17/Tc17 cells → IL-17A, IL-17F, IL-22 → keratinocyte hyperproliferation and production of AMPs (LL-37, β-defensins) and chemokines (CXCL1, CXCL8) → recruits more neutrophils and DCs → amplifies the loop.

EXAM STRUCTURE (for 10-mark answer):
1. Genetic susceptibility (PSORS1/HLA-Cw6 as centerpiece)
2. Environmental triggers
3. Feed-forward molecular correlation
4. Flowchart integrating all three
This ordering scores high because it moves from predisposition → trigger → mechanism.`;

export const topicPsoriasis: ComposerFixture = {
  id: 31,
  slug: "psoriasis-pathophysiology-a-10-mark-answer",
  displayName: "Psoriasis Pathophysiology: A 10-Mark Answer",
  topic: "Psoriasis Pathophysiology: A 10-Mark Answer",
  level: "advanced",
  moduleTitle: "Etiology: Genetics and Environmental Triggers",
  subtopicTitle: "Primary Genetic Determinants: PSORS Loci and HLA-Cw6",
  scope: "Establish the foundational genetic risk factors for psoriasis by detailing the major PSORS1 locus and its critical association with the HLA-Cw6 allele. Expand into the polygenic landscape by summarizing the non-PSORS loci (PSORS2-9) to provide a comprehensive, exam-ready genetic framework.",
  subtopicDesc: "1.1: Primary Genetic Determinants: PSORS Loci and HLA-Cw6 (concepts: PSORS1 locus and HLA-Cw6 association, Non-PSORS loci (PSORS2-9))",
  concepts: ["PSORS1 locus and HLA-Cw6 association", "Non-PSORS loci (PSORS2-9)"],
  totalSubtopics: 4,
  moduleSubtopicList: "1.1: Primary Genetic Determinants: PSORS Loci and HLA-Cw6 (CURRENT)\n1.2: Immune Polymorphisms: IL23R, TNFAIP3 and the Th17 Priming\n1.3: Environmental Triggers: Koebner, Streptococcus, and Drug-induced Psoriasis\n1.4: Integration: Feed-forward Flowchart for the 10-Mark Answer",
  researchContext: psoriasisResearch,
  learnerContext: buildLearnerContext(psoriasisSummary, psoriasisTranscript),
  profileSummary: "Advanced · PG exam 10-mark · Molecular depth · 4 months",
};

// ── Topic 32: Transformer (exhaustive first-principles) ─────────────────

const transformerSummary = [
  "Purpose: Extreme intellectual curiosity and deep conceptual mastery of NLP evolution.",
  "Prior knowledge: Senior Software Engineer (10+ years); strong but rusty mathematical foundation; understands high-level engineering bottlenecks but new to specific AI architectures.",
  "Desired depth: Exhaustive & First-Principles — covering historical, mathematical, and architectural 'whys'.",
  "Time available: No limit — prefers a comprehensive, chronological deep-dive.",
  "Focus areas: Pre-computing generative theory (Markov, Information Theory), Evolutionary bottlenecks (RNNs, LSTMs, Vanishing Gradients), The Transformer breakthrough (Self-attention mechanics, Parallelization), Societal/Global impact and current limitations",
  "Source type: Research Paper (PDF: 1706.03762v7.pdf)",
].join("\n");

const transformerTranscript = turns([
  { role: "user", content: `I want to learn about: "Attention is all you need" paper. Why is it revolutionary and how it has changed the world? What are the limits. What exactly was the limit before this. How did the whole thing evolved to this point. I heard a few things related generative AI exists decades earlier, even before we had computers. Also include the mathematical evolution. I am an extreme curios person. (from a PDF: 1706.03762v7.pdf)` },
  { role: "assistant", content: `That is a foundational paper to explore—it truly is the "Big Bang" moment for modern AI. Since you're interested in everything from the mathematical evolution to the pre-computer history of generative ideas, what is your current background in math or programming?` },
  { role: "user", content: "I am a working software engineer who is coding for more than 10 years. I was topper in maths but not in touch with it since a decade. I can go to any depth you take when you use first principles and make sure you help me cover and I can ramp to any level you take bottom up! Structure it in such a way that I can intuitively understand things and enjoy even if there is no time limit." },
  { role: "assistant", content: `That's a perfect foundation. Given your engineering background, we can definitely skip the "AI for dummies" explanations and dive straight into the architectural mechanics. Since you're interested in the long-arc evolution—including the pre-computer era—how deep do you want to go into the "why" of the math? For instance, are you looking to understand the derivation of the linear algebra and probability behind these models, or are you more focused on the conceptual "intuition" of how those formulas solved the specific scaling bottlenecks of the older RNN/LSTM architectures?` },
  { role: "user", content: "Don't worry much into why in maths. For maths, it should be more of a top down when it comes to complex things if you think the whole thing deviates from what we are aiming to learn. The aim is still to understand the revolutionary paper and evolution. But it's important to bottlenecks to understand the evolution and why this is important." },
  { role: "assistant", content: `That makes sense—we'll focus on the "architectural intuition." We'll treat the math as a tool to solve specific engineering problems (like the vanishing gradient or sequential bottlenecks) rather than just abstract formulas. Since you're an "extreme curious person" with no time limit, would you prefer to structure this as a complete chronological deep-dive (starting with the early probability theories of the 1900s and building up to the 2017 paper) or would you rather start with the Transformer paper and "lookup" the historical context only when we hit a feature that was designed to solve a past problem?` },
  { role: "user", content: "Complete chronological deep dive" },
  { role: "assistant", content: "This is going to be a fascinating journey. We'll start with the early seeds of information theory and Markov chains from the early 20th century, move through the 'bottleneck years' of recurrent neural networks, and finally dissect the 2017 Transformer paper as the architectural breakthrough that paved the way for the current era." },
]);

const transformerResearch = `The mathematical and computational theory of language generation has roots predating modern computers. Two foundational strands converged in the mid-20th century to create what we now recognize as generative language modeling.

INFORMATION THEORY (1948):
Claude Shannon's "A Mathematical Theory of Communication" established information as a measurable quantity. Central to this is Shannon Entropy H(X) = -Σ p(x) log p(x), which quantifies the average 'surprise' in a probability distribution. For language, this means: the more unpredictable the next symbol, the higher the entropy. Shannon computed the entropy of English at roughly 1.0 to 1.5 bits per character at the letter level when conditioned on enough prior context, showing that English is highly redundant. His notion of the 'noisy channel' model (sender encodes message, noise corrupts, receiver decodes) became the template for statistical machine translation in the 1980s-1990s and remains conceptually central to generative modeling: the model's job is to reverse the channel to find the most likely source given the observation.

MARKOV CHAINS (1913, predating computers):
Andrey Markov, analyzing the sequence of vowels and consonants in Pushkin's 'Eugene Onegin,' showed that the probability of the next character depends only on a limited window of prior characters (the 'Markov property'). This was the first mathematical model of sequential probabilistic structure in language. N-gram models are direct descendants: a bigram model (n=2) predicts P(w_t | w_{t-1}), a trigram (n=3) predicts P(w_t | w_{t-1}, w_{t-2}), and so on. Shannon himself generated surprisingly word-like nonsense using n-grams in 1948 — the first generative text experiment in history.

GENERATIVE VS DISCRIMINATIVE MODELING:
A generative model learns the joint distribution P(X, Y) — it can sample new data. A discriminative model learns only P(Y | X) — it can classify but not generate. N-gram models are generative because they capture P(w_t | context) and can be sampled forward to produce text. This distinction matters because the entire lineage of language modeling (n-grams → HMMs → RNNs → Transformers → modern LLMs) sits firmly on the generative side.

MAXIMUM LIKELIHOOD ESTIMATION (MLE):
Given a corpus, how do we estimate the n-gram probabilities? MLE says: use the observed frequencies. P(w_t | w_{t-1}) = count(w_{t-1}, w_t) / count(w_{t-1}). This is intuitive but brittle: any n-gram not seen in training gets probability zero — a fatal problem for generation. Smoothing techniques (Laplace, Good-Turing, Kneser-Ney) were developed to handle this.

THE CURSE OF DIMENSIONALITY:
The number of possible n-grams grows exponentially with n: for a vocabulary V of size |V|, there are |V|^n possible n-grams. With |V| = 50,000 and n = 5, that's 3.125 × 10^23 possible 5-grams. No corpus observes more than a microscopic fraction of these, so most have zero or near-zero estimated probability. This was the fundamental bottleneck that motivated the move from count-based models to distributed representations (embeddings), where similar contexts could share statistical strength.

THE NOISY CHANNEL MODEL:
In machine translation (Brown et al, 1990), the task was framed as: given a foreign sentence F, find the English sentence E that maximizes P(E | F) = P(F | E) × P(E) / P(F). The generative term P(F | E) came from a translation model, and the language model P(E) came from n-grams. This remained the dominant paradigm until neural sequence-to-sequence models emerged in 2014.

These pre-computing and early-computing foundations set the stage for everything that followed: RNNs learned to extend Markov's local-window assumption with learned hidden states, LSTMs addressed gradient decay through gating, attention lifted the fixed-window constraint, and Transformers threw out recurrence entirely in favor of pure attention. Understanding the 2017 paper requires understanding what it was freeing itself FROM — the chain of partial solutions above.`;

export const topicTransformer: ComposerFixture = {
  id: 32,
  slug: "transformer-networks-history-and-theory",
  displayName: "Transformer Networks: History and Theory",
  topic: "Transformer Networks: History and Theory",
  level: "advanced",
  moduleTitle: "The Pre-Computing Generative Theory",
  subtopicTitle: "The Dawn of Information: Quantifying Language and Surprise",
  scope: "Start the chronological journey in the pre-computing era with Claude Shannon's groundbreaking realization that language predictability can be mathematically quantified. Build a first-principles intuition behind 'Information Theory' and 'Entropy' as measures of surprise, establishing the bedrock for all generative models.",
  subtopicDesc: "1.1: The Dawn of Information: Quantifying Language and Surprise (concepts: Information Theory and Shannon Entropy)",
  concepts: ["Information Theory and Shannon Entropy"],
  totalSubtopics: 6,
  moduleSubtopicList: "1.1: The Dawn of Information: Quantifying Language and Surprise (CURRENT)\n1.2: Markov and the Genesis of Next-Token Prediction\n1.3: Generative vs Discriminative Modeling\n1.4: The Noisy Channel Model of Translation\n1.5: Maximum Likelihood Estimation in NLP\n1.6: The Curse of Dimensionality in Vocabulary Space",
  researchContext: transformerResearch,
  learnerContext: buildLearnerContext(transformerSummary, transformerTranscript),
  profileSummary: "Advanced · Exhaustive first-principles · No time limit · Senior SWE, rusty math",
};

export const allComposerFixtures: ComposerFixture[] = [
  topicLLMs,
  topicPsoriasis,
  topicTransformer,
];
