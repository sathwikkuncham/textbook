# Module Planner — Consolidated Validation (A vs D)

Run ID: 2026-04-17T12-10-18-209Z
Date: 2026-04-17T12:15:15.519Z
Variants tested: A (baseline — FLASH + old prompt) · D (candidate — PRO + raw transcript + depth enforcement)
Runs per variant per topic: 3

## Purpose

Before locking Variant D into production `module-orchestrator.ts`, validate it against the old baseline across ALL six canonical anchor topics with one unified comparison. Prior experiments tested Variant D across these topics in three separate runs — this run consolidates into one side-by-side.

## Summary Table

| # | Topic | Profile | Production (historical) | A sections | A latency | D sections | D latency | Concept count D |
|---|-------|---------|-------------------------|------------|-----------|------------|-----------|-----------------|
| 29 | Understanding Large Language Models (LLMs) | Beginner · High-level conceptual · 15-30 min · Absolute beginner · 7 concepts | 3 | 3 | 3898ms | 2 | 8957ms | 3 |
| 30 | Turboquant: AI Efficiency Concepts | Beginner · Conceptual · 1 hour · Slow reader · Limited ML knowledge · 7 concepts | 4 | 4 | 4256ms | 3-4 | 11675ms | 2 |
| 28 | Algorithms: CLRS Textbook Companion | Advanced · Extremely deep · No time constraint · Rusty math (10+ yr gap) · 7 concepts | 4 | 5-6 | 6271ms | 6-7 | 9941ms | 1-2 |
| 31 | Psoriasis Pathophysiology: A 10-Mark Answer | Advanced · PG exam-oriented · 4 months · Molecular depth · 7 concepts | 3 | 3 | 4260ms | 4 | 10745ms | 1-2 |
| 32 | Transformer Networks: History and Theory | Advanced · Exhaustive first-principles · No time limit · Senior SWE, rusty math · 6 concepts | 2 | 3 | 3888ms | 6 | 11306ms | 1 |
| 24 | Advaita Vedanta: Shankaracharya's Commentary | Advanced · Maximum depth · 1-2 years · Non-dualism, first principles · 12 Sanskrit concepts | 4 | 5 | 7056ms | 7 | 16848ms | 2 |

## Per-topic Detail

### Topic 29: Understanding Large Language Models (LLMs)

**Module under test:** The Building Blocks: Tokens and Word Maps

**Module goal:** Explain how raw text is converted into a mathematical format the AI can process.

**Concepts to cover (7):**
- Tokenization
- Tokens as building blocks
- Numerical IDs for words
- Embeddings (The Map of Meaning)
- Vector space (GPS coordinates for words)
- Semantic relationships (King/Queen example)
- Physical proximity of similar concepts

**Learner profile:** Beginner · High-level conceptual · 15-30 min · Absolute beginner · 7 concepts

**Historical production baseline (3 subtopics):**
- From Words to Numbers: What are Tokens?
- The Map of Meaning: Giving Words a Neighborhood
- Word Math: Navigating Relationships

#### Variant A — Baseline (current production)

**Run 1** (4242ms, estimatedSections=3)
- Title: From Words to Numbers: The Power of Tokens
- Concepts (3): ["Tokenization","Tokens as building blocks","Numerical IDs for words"]
- Scope: Introduce the concept that AI doesn't 'read' text the way humans do. Explain how sentences are chopped into smaller pieces called tokens and how each token is assigned a unique numerical ID so a computer can begin processing it.

**Run 2** (3829ms, estimatedSections=3)
- Title: Breaking Language into Pieces: Tokens and IDs
- Concepts (3): ["Tokenization","Tokens as building blocks","Numerical IDs for words"]
- Scope: Introduce the concept of tokenization as the first step in AI 'reading.' Explain how text is chopped into chunks (tokens) and how these pieces are assigned unique numerical IDs so the computer can process them as data rather than abstract letters.

**Run 3** (3622ms, estimatedSections=3)
- Title: From Words to Numbers: The World of Tokens
- Concepts (3): ["Tokenization","Tokens as building blocks","Numerical IDs for words"]
- Scope: This section introduces the foundational concept of how AI 'reads' text by breaking it down into smaller units called tokens. It explains that computers cannot understand letters or words directly, so they use tokens as building blocks and assign each a unique numerical ID to begin processing information.

#### Variant D — PRO + depth + raw transcript

**Run 1** (9430ms, estimatedSections=2)
- Title: Chopping Up Language: Tokens as Building Blocks
- Concepts (3): ["Tokenization","Tokens as building blocks","Numerical IDs for words"]
- Scope: Explain that AI cannot 'read' words like humans do, but only understands numbers. Introduce how text is chopped up into smaller pieces called tokens, and how each token is assigned a unique numerical ID to create the foundational building blocks of AI language processing.

**Run 2** (9910ms, estimatedSections=2)
- Title: Breaking Down the Text: Tokens and Numerical IDs
- Concepts (3): ["Tokenization","Tokens as building blocks","Numerical IDs for words"]
- Scope: Introduce how the AI doesn't 'read' words like humans do, but instead chops text into smaller puzzle pieces called tokens. Explain how these tokens are then assigned unique numerical IDs, acting as the fundamental building blocks the computer can actually process.

**Run 3** (7531ms, estimatedSections=2)
- Title: Chopping up the Dictionary: Tokens and Numbers
- Concepts (3): ["Tokenization","Tokens as building blocks","Numerical IDs for words"]
- Scope: Introduce the first step of how AI processes text. Explain that computers can't read words like humans do, so they break text into smaller building blocks called tokens and assign them simple numerical IDs.

---

### Topic 30: Turboquant: AI Efficiency Concepts

**Module under test:** The Memory Wall: Why AI Needs Turboquant

**Module goal:** Explain the relationship between AI context length and memory consumption.

**Concepts to cover (7):**
- The Memory Wall
- KV Cache (Key-Value Cache)
- Linear growth of memory with context length
- HBM (High Bandwidth Memory) constraints
- GPU vs. Consumer hardware limitations
- Long-context AI (128K+ tokens)
- Cost-per-query economics

**Learner profile:** Beginner · Conceptual · 1 hour · Slow reader · Limited ML knowledge · 7 concepts

**Historical production baseline (4 subtopics):**
- The Expanding Mind: Understanding the Memory Wall
- The Weight of Words: Why Memory Runs Out
- Shrinking the Scratchpad: The Magic of Quantization
- The Price of Memory: Why Efficiency Equals Access

#### Variant A — Baseline (current production)

**Run 1** (4510ms, estimatedSections=4)
- Title: Introduction to the Memory Wall and the Long-Context Challenge
- Concepts (2): ["The Memory Wall","Long-context AI (128K+ tokens)"]
- Scope: Introduce the concept of AI 'context length' and why models are pushing for 128K+ tokens. Define 'The Memory Wall' as the fundamental hardware bottleneck where memory capacity and speed cannot keep up with the demands of modern AI processing.

**Run 2** (4137ms, estimatedSections=4)
- Title: The Crisis of AI Memory: The Memory Wall and KV Cache
- Concepts (3): ["The Memory Wall","KV Cache (Key-Value Cache)","Linear growth of memory with context length"]
- Scope: This section introduces the concept of an AI's 'short-term memory' and the physical data structure that stores it, known as the KV Cache. It explains why memory usage grows steadily as a conversation gets longer and defines 'The Memory Wall' as the fundamental hardware bottleneck preventing models from processing massive amounts of information.

**Run 3** (4120ms, estimatedSections=4)
- Title: The AI Memory Problem: Context and the KV Cache
- Concepts (3): ["The Memory Wall","KV Cache (Key-Value Cache)","Linear growth of memory with context length"]
- Scope: This section introduces the 'Memory Wall' as the primary bottleneck in scaling AI performance. It explains the concept of 'Context Length'—the AI's short-term memory—and introduces the KV Cache as the mechanism that stores this data, highlighting how its memory footprint grows linearly as conversations get longer.

#### Variant D — PRO + depth + raw transcript

**Run 1** (12672ms, estimatedSections=4)
- Title: The Dream of Infinite Memory: Long-Context AI and the Memory Wall
- Concepts (2): ["Long-context AI (128K+ tokens)","The Memory Wall"]
- Scope: Introduce the concept of 'Long-context AI' and why we want models to process massive documents like entire books at once. Then, introduce the 'Memory Wall' as the fundamental physical bottleneck that stops us from doing this easily, using simple analogies like a worker's desk space to build intuition.

**Run 2** (9792ms, estimatedSections=3)
- Title: The AI Memory Wall: Why Smart Models Need Massive Hardware
- Concepts (2): ["The Memory Wall","GPU vs. Consumer hardware limitations"]
- Scope: Introduce the concept of the 'Memory Wall' using simple analogies, explaining that AI's biggest bottleneck isn't processing power, but memory. Contrast the massive memory required by modern AI with the limitations of everyday consumer hardware, illustrating why specialized, expensive GPUs are currently needed.

**Run 3** (12561ms, estimatedSections=3)
- Title: The AI Memory Squeeze: Context and the Memory Wall
- Concepts (2): ["Long-context AI (128K+ tokens)","The Memory Wall"]
- Scope: Introduce the concept of 'context' in AI as a temporary working memory, and explain the recent push for 'Long-context AI' capable of processing entire books at once. Establish 'The Memory Wall' as the massive invisible barrier where models simply run out of physical space to hold that information.

---

### Topic 28: Algorithms: CLRS Textbook Companion

**Module under test:** Mathematical Foundations for Algorithm Analysis

**Module goal:** Apply mathematical tools to describe sets, manipulate summations, and evaluate discrete probability for algorithmic use cases.

**Concepts to cover (7):**
- Summation properties and formulas
- Set theory basics and notation
- Relations and functions
- Graphs and trees as mathematical objects
- Discrete probability and expectation
- Permutations and combinations
- Proof by induction techniques

**Learner profile:** Advanced · Extremely deep · No time constraint · Rusty math (10+ yr gap) · 7 concepts

**Historical production baseline (4 subtopics):**
- Sets, Relations, and Functions: The Vocabulary of Discrete Mathematics
- Graphs and Trees: The Structural Blueprints of Algorithms
- Summations and Induction: The Algebra of Algorithm Analysis
- Counting and Chance: Permutations, Combinations, and Discrete Probability

#### Variant A — Baseline (current production)

**Run 1** (5250ms, estimatedSections=6)
- Title: Set Theory, Relations, and Functions
- Concepts (2): ["Set theory basics and notation","Relations and functions"]
- Scope: This section introduces the foundational language of discrete mathematics, starting with set notation and operations (union, intersection, complement). It then builds toward the formal definitions of binary relations, equivalence relations, and functions, providing the necessary vocabulary to describe data mappings and algorithm behavior.

**Run 2** (8105ms, estimatedSections=6)
- Title: The Language of Sets, Relations, and Functions
- Concepts (2): ["Set theory basics and notation","Relations and functions"]
- Scope: Establish the foundational vocabulary of discrete mathematics by exploring set notation, operations, and basic set laws. This section defines relations and functions from first principles, focusing on properties like injectivity, surjectivity, and bijectivity that are crucial for mapping algorithmic inputs to outputs.

**Run 3** (5458ms, estimatedSections=5)
- Title: Foundations of Discrete Structures: Sets, Relations, and Functions
- Concepts (2): ["Set theory basics and notation","Relations and functions"]
- Scope: This section introduces the fundamental language of discrete mathematics by covering set notation, operations, and algebraic properties. It then extends these concepts to relations and functions, providing the rigorous definitions needed to describe mappings from input sizes to execution steps in algorithmic analysis.

#### Variant D — PRO + depth + raw transcript

**Run 1** (9999ms, estimatedSections=6)
- Title: Foundations of Discrete Mathematics: Sets, Relations, and Functions
- Concepts (2): ["Set theory basics and notation","Relations and functions"]
- Scope: This section starts from absolute scratch by introducing the concept of a set, how we denote groups of distinct objects, and the basic operations we can perform on them. From there, it builds the intuition for how elements across sets relate to one another, culminating in a first-principles understanding of mathematical relations and functions, which form the absolute bedrock for describing algorithmic mappings.

**Run 2** (9450ms, estimatedSections=7)
- Title: Set Theory: The Foundational Language of Discrete Mathematics
- Concepts (1): ["Set theory basics and notation"]
- Scope: Introduce the concept of sets from first principles as collections of distinct objects, acting as the bedrock for all algorithmic mathematics. We will cover set-builder notation, subsets, and core operations to build a rigorous, bottom-up intuition before moving to more complex structures.

**Run 3** (10373ms, estimatedSections=7)
- Title: Set Theory Basics: The Foundational Language of Mathematics
- Concepts (1): ["Set theory basics and notation"]
- Scope: Start from absolute first principles by defining what a set is, covering standard notation, and exploring fundamental set operations. This rebuilds the foundational mathematical language needed before we can define relations, functions, or complex data structures like graphs.

---

### Topic 31: Psoriasis Pathophysiology: A 10-Mark Answer

**Module under test:** Etiology: Genetics and Environmental Triggers

**Module goal:** Identify and explain the genetic loci and triggers necessary for a high-scoring etiology section in a 10-mark answer.

**Concepts to cover (7):**
- PSORS1 locus and HLA-Cw6 association
- Non-PSORS loci (PSORS2-9)
- Genetic polymorphisms in IL23R and TNFAIP3
- Koebner Phenomenon mechanisms
- Streptococcal superantigens and Guttate psoriasis
- Drug-induced psoriasis (Lithium, Beta-blockers, NSAIDs)
- Lifestyle triggers: obesity, smoking, and alcohol

**Learner profile:** Advanced · PG exam-oriented · 4 months · Molecular depth · 7 concepts

**Historical production baseline (3 subtopics):**
- The Genetic Landscape: PSORS Loci and Major Polymorphisms
- Environmental Catalysts: Physical Trauma and Streptococcal Triggers
- Systemic Modifiers: Pharmacological Triggers and Lifestyle Factors

#### Variant A — Baseline (current production)

**Run 1** (4614ms, estimatedSections=3)
- Title: Genetic Basis of Psoriasis: PSORS Loci and Immune Signaling Polymorphisms
- Concepts (3): ["PSORS1 locus and HLA-Cw6 association","Non-PSORS loci (PSORS2-9)","Genetic polymorphisms in IL23R and TNFAIP3"]
- Scope: Explore the primary genetic susceptibility loci, focusing on the dominant role of the PSORS1 locus and HLA-Cw6 association. This section also covers minor loci (PSORS2-9) and critical polymorphisms in the IL-23/Th17 pathway (IL23R, TNFAIP3) to provide the molecular foundation necessary for a high-scoring exam response.

**Run 2** (4203ms, estimatedSections=3)
- Title: Genetic Susceptibility: PSORS Loci and Key Polymorphisms
- Concepts (3): ["PSORS1 locus and HLA-Cw6 association","Non-PSORS loci (PSORS2-9)","Genetic polymorphisms in IL23R and TNFAIP3"]
- Scope: This section covers the primary genetic determinants of psoriasis, focusing on the PSORS1 locus and HLA-Cw6 association. It also explores the relevance of PSORS2-9 and functional polymorphisms in the IL-23/Th17 pathway (IL23R, TNFAIP3) necessary for an exam-standard etiology section.

**Run 3** (3964ms, estimatedSections=3)
- Title: Genetic Architecture of Psoriasis: PSORS Loci and Immune Signaling Polymorphisms
- Concepts (3): ["PSORS1 locus and HLA-Cw6 association","Non-PSORS loci (PSORS2-9)","Genetic polymorphisms in IL23R and TNFAIP3"]
- Scope: This section establishes the hereditary foundation of psoriasis, detailing the major histocompatibility complex (MHC) associations and non-MHC susceptibility loci. It focuses on the molecular significance of HLA-Cw6 and explores how polymorphisms in IL23R and TNFAIP3 prime the immune system for the IL-23/Th17 inflammatory cascade.

#### Variant D — PRO + depth + raw transcript

**Run 1** (12426ms, estimatedSections=4)
- Title: Primary Genetic Determinants: PSORS Loci and HLA-Cw6
- Concepts (2): ["PSORS1 locus and HLA-Cw6 association","Non-PSORS loci (PSORS2-9)"]
- Scope: Establish the foundational genetic risk factors for psoriasis by detailing the major PSORS1 locus and its critical association with the HLA-Cw6 allele. Expand into the polygenic landscape by summarizing the non-PSORS loci (PSORS2-9) to provide a comprehensive, exam-ready genetic framework.

**Run 2** (12796ms, estimatedSections=4)
- Title: Major Genetic Susceptibility: PSORS1 Locus and HLA-Cw6
- Concepts (1): ["PSORS1 locus and HLA-Cw6 association"]
- Scope: Begin the 10-mark exam answer framework by establishing the primary genetic driver of psoriasis. This section will detail the PSORS1 locus on chromosome 6p21 and explain how the HLA-Cw6 allele mediates early-onset (Type I) psoriasis through specific antigen presentation, providing the first component for an etiology flowchart.

**Run 3** (7013ms, estimatedSections=4)
- Title: Foundation of Psoriasis Genetics: PSORS1 and HLA-Cw6
- Concepts (1): ["PSORS1 locus and HLA-Cw6 association"]
- Scope: Begin with the most critical genetic determinant of psoriasis, the PSORS1 locus. Detail the role of the HLA-Cw6 allele, its association with early-onset (Type I) psoriasis, and how it primes the immune system, laying the groundwork for a structured 10-mark exam answer.

---

### Topic 32: Transformer Networks: History and Theory

**Module under test:** The Pre-Computing Generative Theory

**Module goal:** Explain the probabilistic foundations of language and the early attempts to model it computationally.

**Concepts to cover (6):**
- Information Theory and Shannon Entropy
- Markov Chains and n-gram models
- Generative vs. Discriminative modeling
- The 'Noisy Channel' model of translation
- Maximum Likelihood Estimation (MLE) in NLP
- The Curse of Dimensionality in vocabulary space

**Learner profile:** Advanced · Exhaustive first-principles · No time limit · Senior SWE, rusty math · 6 concepts

**Historical production baseline (2 subtopics):**
- Shannon Entropy and Markov Foundations (rushed — 6 concepts across 2 sections)
- From n-grams to Generative Models (rushed — 6 concepts across 2 sections)

#### Variant A — Baseline (current production)

**Run 1** (3717ms, estimatedSections=3)
- Title: Foundations of Probabilistic Language: Information Theory and Markovian Approximations
- Concepts (2): ["Information Theory and Shannon Entropy","Markov Chains and n-gram models"]
- Scope: This section establishes the mathematical bedrock of generative modeling by introducing Shannon Entropy and the quantification of information. It then applies these principles to the first computational models of language: Markov Chains and n-grams, focusing on how local dependencies were used to approximate the structure of text.

**Run 2** (3963ms, estimatedSections=3)
- Title: Information Theory and the Birth of Generative Models
- Concepts (3): ["Information Theory and Shannon Entropy","Markov Chains and n-gram models","Generative vs. Discriminative modeling"]
- Scope: Establish the mathematical foundation of NLP by introducing Claude Shannon’s Information Theory and the concept of entropy. Explain Markov Chains and n-gram models as the first probabilistic language generators, while distinguishing between generative and discriminative modeling philosophies.

**Run 3** (3985ms, estimatedSections=3)
- Title: Foundations of Probabilistic Language: Entropy and Markovian Modeling
- Concepts (2): ["Information Theory and Shannon Entropy","Markov Chains and n-gram models"]
- Scope: Establish the mathematical bedrock of generative theory by introducing Claude Shannon’s Information Theory and the concept of Shannon Entropy as a measure of linguistic predictability. Transition into the first formal computational models of language: Markov Chains and n-grams, explaining how they approximate human language through local statistical dependencies.

#### Variant D — PRO + depth + raw transcript

**Run 1** (10680ms, estimatedSections=6)
- Title: The Dawn of Information: Quantifying Language and Surprise
- Concepts (1): ["Information Theory and Shannon Entropy"]
- Scope: Start the chronological journey in the pre-computing era with Claude Shannon's groundbreaking realization that language predictability can be mathematically quantified. We will build a first-principles intuition behind 'Information Theory' and 'Entropy' as measures of surprise, establishing the bedrock for all generative models.

**Run 2** (10060ms, estimatedSections=6)
- Title: The Birth of Measurable Language: Information Theory and Shannon Entropy
- Concepts (1): ["Information Theory and Shannon Entropy"]
- Scope: Start the chronological journey by looking at language through the lens of Claude Shannon in the 1940s. We will explore how language transitioned from pure linguistics to measurable data, focusing on how Shannon Entropy quantifies the predictability and uncertainty of the 'next' letter or word.

**Run 3** (13178ms, estimatedSections=6)
- Title: The Earliest Text Predictor: Markov Chains and N-Grams
- Concepts (1): ["Markov Chains and n-gram models"]
- Scope: Start the chronological journey in 1913 with Andrey Markov's manual analysis of Russian poetry. Introduce the intuitive first-principle that language is not entirely random, but probabilistically depends on the immediate past. Build the foundational mechanics of state transitions and 'n-gram' models as the very first 'generative' text algorithm.

---

### Topic 24: Advaita Vedanta: Shankaracharya's Commentary

**Module under test:** Upodghata: The Prologue and Foundations of Adhyasa

**Module goal:** Establish the foundational logic of Shankaracharya's commentary: why knowledge is the only path to liberation and the nature of the 'Superimposition' (Adhyasa) error.

**Concepts to cover (12):**
- Viveka (discrimination between real and unreal)
- Vairagya (dispassion toward transient things)
- Shatka Sampatti (six inner qualifications)
- Mumukshutva (intense longing for liberation)
- Subject-Object confusion
- Avidya (primordial ignorance)
- Atman vs. Anatman (Self vs. non-Self)
- Saguna Brahman (Reality with attributes)
- Nirguna Brahman (Reality without attributes)
- The logic of incarnation (Vasudeva as Brahman)
- Pravritti (action for prosperity)
- Nivritti (withdrawal for knowledge)

**Learner profile:** Advanced · Maximum depth · 1-2 years · Non-dualism, first principles · 12 Sanskrit concepts

**Historical production baseline (4 subtopics):**
- Sadhana Chatushtaya: The Qualifications
- The Nature of Superimposition (Adhyasa)
- Vasudeva as Brahman: Personal vs. Impersonal Reality
- The Purpose of the Gita: Pravritti and Nivritti

#### Variant A — Baseline (current production)

**Run 1** (5979ms, estimatedSections=5)
- Title: The Two-Fold Dharma and the Nature of the Divine Descent
- Concepts (5): ["Pravritti (action for prosperity)","Nivritti (withdrawal for knowledge)","Saguna Brahman (Reality with attributes)","Nirguna Brahman (Reality without attributes)","The logic of incarnation (Vasudeva as Brahman)"]
- Scope: This section introduces Shankaracharya’s prologue (Upodghata) by examining the dual nature of Vedic Dharma: Pravritti (outward action) and Nivritti (inward knowledge). It will further explore the metaphysical nature of the Lord (Krishna) as the non-dual Brahman (Nirguna) appearing with attributes (Saguna) to preserve the world's order, setting the stage for why knowledge is the ultimate goal.

**Run 2** (7963ms, estimatedSections=5)
- Title: The Two-Fold Dharma and the Descent of Brahman
- Concepts (5): ["Pravritti (action for prosperity)","Nivritti (withdrawal for knowledge)","Saguna Brahman (Reality with attributes)","Nirguna Brahman (Reality without attributes)","The logic of incarnation (Vasudeva as Brahman)"]
- Scope: This section examines the opening of Shankaracharya's commentary, focusing on the two paths of Vedic Dharma: Pravritti (action) and Nivritti (withdrawal). It explores the nature of Brahman in both its absolute (Nirguna) and manifest (Saguna) aspects, and the metaphysical logic behind the incarnation of Lord Krishna to restore cosmic order.

**Run 3** (7226ms, estimatedSections=5)
- Title: The Two-Fold Dharma and the Descent of Brahman
- Concepts (5): ["Pravritti (action for prosperity)","Nivritti (withdrawal for knowledge)","Saguna Brahman (Reality with attributes)","Nirguna Brahman (Reality without attributes)","The logic of incarnation (Vasudeva as Brahman)"]
- Scope: Introduce Shankaracharya’s opening logic in the Upodghata, distinguishing between Pravritti-dharma (the path of action/prosperity) and Nivritti-dharma (the path of knowledge/liberation). Establish the metaphysical nature of Saguna and Nirguna Brahman and the philosophical purpose behind the Lord’s descent as Vasudeva to restore spiritual order.

#### Variant D — PRO + depth + raw transcript

**Run 1** (17310ms, estimatedSections=7)
- Title: Ground Zero: The Observer, the Observed, and the Root of Confusion
- Concepts (2): ["Atman vs. Anatman (Self vs. non-Self)","Subject-Object confusion"]
- Scope: Begin the philosophical bottom-up construction of Advaita Vedanta by isolating the most undeniable reality: the conscious subject. This section will establish the strict logical boundary between the observer (Atman) and the observed (Anatman), and demonstrate how all ordinary human experience relies on a fundamental 'Subject-Object confusion' (Adhyasa).

**Run 2** (22328ms, estimatedSections=7)
- Title: The Foundational Error: Subject-Object Confusion and Avidya
- Concepts (2): ["Subject-Object confusion","Avidya (primordial ignorance)"]
- Scope: To build Advaita Vedanta from first principles, we must begin with the starting point of human experience. This section explores 'Adhyasa'—the fundamental cognitive error of mixing the conscious subject with inert objects—and introduces 'Avidya', the primordial ignorance that drives this confusion.

**Run 3** (10905ms, estimatedSections=7)
- Title: The First Principle of Advaita: Subject-Object Confusion and Avidya
- Concepts (2): ["Subject-Object confusion","Avidya (primordial ignorance)"]
- Scope: Establish the absolute starting point of Shankaracharya's philosophy by examining the fundamental error of human experience: superimposing the Subject ('I') onto the Object ('not-I'). This section will rigorously define Avidya (primordial ignorance) as a structural mechanism rather than mere lack of information, setting the stage for why liberation is necessary.

---

## Qualitative Review

Reviewer read every run above before writing this section.

### Depth calibration — PASSED

| Topic | Profile | D sections | Calibration verdict |
|-------|---------|------------|---------------------|
| 29 LLMs | beginner 15-30 min | 2 (flat) | tight → matches brief time |
| 30 Turboquant | beginner slow reader 1h | 3-4 | moderate → matches slow pace |
| 28 CLRS | advanced exhaustive no-time | 6-7 | expansive → matches request |
| 31 Psoriasis | advanced 4-month exam | 4 (flat) | moderate-high → matches exam density |
| 32 Transformer | advanced exhaustive no-time | 6 (flat) | expansive → fixes the rushed regression |
| 24 Shankara | advanced years first-principles | 7 (flat) | expansive → matches depth + first-principles |

Variant D's section count tracks the learner's stated depth. A-baseline does not — A gave Topic 32 (exhaustive) only 3 sections and Topic 24 (1-2 years) only 5 sections while cramming 5 concepts into each.

### Voice and first-principles ordering — PASSED

- Topic 32: D begins with "Start the chronological journey in 1913 with Andrey Markov's manual analysis of Russian poetry" — picks up the learner's stated request for "complete chronological deep-dive from pre-computing era." A produces a generic "Foundations of Probabilistic Language" that doesn't commit to chronology.
- Topic 24: D opens with "Ground Zero: The Observer, the Observed" and Subject-Object confusion — starting from raw experience, which is the first-principles path the learner asked for. A defaults to Pravritti/Nivritti/Saguna/Nirguna — the textbook opening, NOT what the learner requested.
- Topic 28: D writes "Start from absolute scratch... to rebuild the foundational mathematical language" — echoes the learner's "from scratch" and "rusty math" phrasing. A writes generic "This section introduces the fundamental language."
- Topic 31: D writes "Begin the 10-mark exam answer framework" — quotes the learner's specific exam format. A writes generic etiology framing.

The raw transcript is being read and used. Voice shift is real, not cosmetic.

### Regression check — PASSED with one caveat

**Cramming check (A's failure mode):**
- Topic 24 Variant A crams 5 concepts (Pravritti + Nivritti + Saguna + Nirguna + Vasudeva) into one section. D never does this — max 2 concepts/section on Topic 24.
- Topic 29: D caps per-section at 3 concepts. A does the same. Both fine.
- Across all six topics, D's max concepts-per-section is 3 (LLMs beginner). A's max is 5. **D is strictly more disciplined.**

**Under-expansion check (potential D failure mode):**
- Topic 29 LLMs: D gives 2 sections for 7 concepts. Section 1 covers 3. Section 2 would need to cover 4. Could be the beginner-time-budget logic correctly collapsing, OR could be an under-expansion regression. Production A produced 3 sections here. **Flag:** low-risk since the orchestrator loop adds sections when remaining concepts demand it, but worth watching the first module of a fresh LLM topic post-lock-in.
- All other topics: D matches or exceeds A's section count. No under-expansion on advanced profiles.

**Completeness check:**
- This test only measures section 1 of each module. Completeness across the full module requires the orchestrator loop. Locking in D affects only the planner — the loop governs completeness and is unchanged.

### Verdict

**Lock in Variant D.**

Evidence:
1. Decisively fixes the Transformer Module 1 regression (2 → 6 sections for a first-principles senior-SWE learner).
2. Never crams 5-concept paragraphs like A did for the Gita Module 1.
3. Honors learner's stated language across all six topics, not just the one we tuned against.
4. Per-section concept count is consistently 1-3 — content composer gets room to breathe.
5. Depth variance tracks learner intent (7 sections for exhaustive, 2-3 for beginner).

Caveat: Topic 29 LLMs at 2 sections is the tightest calibration — monitor in production. The orchestrator's iterative loop absorbs this risk because it keeps planning until all concepts are covered.
