# Curriculum Architect — Four-Way Comparison

Run: tuned-v2-2026-04-16T22-55-39-525Z
Variant A: C:\Projects\Experiments\textbook\scripts\experiments\002-curriculum-architect\runs\2026-04-16T22-23-05-763Z
Variant B: C:\Projects\Experiments\textbook\scripts\experiments\002-curriculum-architect\runs\tuned-v2-2026-04-16T22-55-39-525Z

## Module count · total time · max single module

| Topic | Production | Variant A | Variant B | Variant C (v2) |
|-------|-----------|-----------|-----------|----------------|
| Understanding Large Language Models (LLMs) | 3 · 30m · max 10m | 3 · 30m · max 10m | 4 · 25m · max 7m | 4 · 25m · max 7m |
| Turboquant: AI Efficiency Concepts | 3 · 60m · max 25m | 3 · 60m · max 20m | 4 · 60m · max 15m | 4 · 60m · max 15m |
| Transformer Networks: History and Theory | 11 · 660m · max 90m | 12 · 1005m · max 120m | 13 · 555m · max 60m | 13 · 555m · max 60m |
| Psoriasis Pathophysiology: A 10-Mark Answer | 7 · 360m · max 75m | 5 · 480m · max 120m | 5 · 300m · max 85m | 5 · 300m · max 85m |
| Algorithms: CLRS Textbook Companion | 19 · 3180m · max 210m | 20 · 5700m · max 360m | 33 · 7080m · max 300m | 33 · 7080m · max 300m |
| Advanced System Design Mastery | 10 · 1080m · max 150m | 10 · 1500m · max 180m | 25 · 2730m · max 180m | 25 · 2730m · max 180m |
| Advaita Vedanta: Shankaracharya's Commentary | 11 · 1650m · max 190m | 27 · 2730m · max 120m | 21 · 2580m · max 180m | 21 · 2580m · max 180m |

## Variant C module structure per topic

### Understanding Large Language Models (LLMs) (Topic 29, topic_only)

**Variant C latency:** 29577ms

| # | Title | Concepts | Minutes |
|---|-------|----------|---------|
| 1 | Translating Words to Numbers: The Alphabet of AI | 3 | 6 |
| 2 | Grasping Context: How AI 'Reads' a Sentence | 3 | 6 |
| 3 | The Super-Autocomplete: How the 'Brain' Was Taught | 3 | 7 |
| 4 | Hitting 'Send': What Happens When You Ask a Question | 4 | 6 |

### Turboquant: AI Efficiency Concepts (Topic 30, topic_only)

**Variant C latency:** 23561ms

| # | Title | Concepts | Minutes |
|---|-------|----------|---------|
| 1 | The AI Memory Bottleneck & Intro to Quantization | 6 | 15 |
| 2 | How TurboQuant Works (Without the Math) | 5 | 15 |
| 3 | Real-World Impact: Bringing AI to Local Devices | 5 | 15 |
| 4 | Joining the Conversation: Key Terms & Big Picture | 5 | 15 |

### Transformer Networks: History and Theory (Topic 32, pdf)

**Variant C latency:** 52531ms

| # | Title | Concepts | Minutes |
|---|-------|----------|---------|
| 1 | Before Computers: The Seeds of Generative Theory | 4 | 45 |
| 2 | The Sequential Era: RNNs, LSTMs, and Engineering Bottlenecks | 5 | 45 |
| 3 | The Attention Bridge (2014): A Partial Solution | 4 | 30 |
| 4 | The Paradigm Shift: Introduction to 'Attention Is All You Need' | 4 | 30 |
| 5 | Core Mechanics: The QKV Formalism | 5 | 60 |
| 6 | Expanding Representation: Multi-Head Attention | 4 | 40 |
| 7 | Injecting Sequence: Positional Encoding | 4 | 45 |
| 8 | Putting It Together: The Encoder-Decoder Structure | 5 | 45 |
| 9 | Training, Hardware, and Paper Results | 4 | 40 |
| 10 | The Evolutionary Tree: BERT, GPT, and T5 | 4 | 45 |
| 11 | Scaling Laws: The Predictable Rise of LLMs | 4 | 40 |
| 12 | Modern Bottlenecks: Quadratic Complexity & FlashAttention | 5 | 50 |
| 13 | Frontiers: Vision Transformers, Limits, and Mamba | 4 | 40 |

### Psoriasis Pathophysiology: A 10-Mark Answer (Topic 31, pdf)

**Variant C latency:** 30585ms

| # | Title | Concepts | Minutes |
|---|-------|----------|---------|
| 1 | Etiology: Genetic Loci and Environmental Triggers | 6 | 45 |
| 2 | The Spark: Innate Immunity and the Initiation Phase | 6 | 50 |
| 3 | The Engine: Adaptive Immunity and the IL-23/Th17 Axis | 6 | 60 |
| 4 | Clinical Translation: Histopathology and the Feed-Forward Loop | 6 | 60 |
| 5 | Exam Synthesis: The 10-Mark Architecture & Flowcharts | 5 | 85 |

### Algorithms: CLRS Textbook Companion (Topic 28, pdf)

**Variant C latency:** 92175ms

| # | Title | Concepts | Minutes |
|---|-------|----------|---------|
| 1 | Rebuilding Mathematical Foundations: Sets, Relations, and Functions | 5 | 180 |
| 2 | Combinatorics and Probability Primer | 5 | 240 |
| 3 | The Pseudocode Paradigm and Loop Invariants | 5 | 180 |
| 4 | Asymptotic Notation: The Language of Growth | 5 | 210 |
| 5 | Divide-and-Conquer and The Master Theorem | 5 | 240 |
| 6 | Probabilistic Analysis and Randomized Algorithms | 5 | 210 |
| 7 | Heapsort and Priority Queues | 5 | 240 |
| 8 | Quicksort: Worst-Case vs Expected Time | 5 | 210 |
| 9 | Breaking the O(n log n) Barrier: Linear-Time Sorting | 5 | 180 |
| 10 | Medians and Order Statistics | 4 | 180 |
| 11 | Elementary Data Structures: Abstracting Memory | 4 | 150 |
| 12 | Hash Tables: Theory and Practice | 5 | 240 |
| 13 | Binary Search Trees | 5 | 210 |
| 14 | Red-Black Trees: Guaranteed Balance | 5 | 300 |
| 15 | Dynamic Programming I: Optimization and Memoization | 5 | 240 |
| 16 | Dynamic Programming II: Advanced Applications | 5 | 240 |
| 17 | Greedy Algorithms and Theoretical Matroids | 5 | 240 |
| 18 | Amortized Analysis | 5 | 210 |
| 19 | B-Trees: Managing Disk I/O | 5 | 180 |
| 20 | Data Structures for Disjoint Sets | 5 | 180 |
| 21 | Graph Algorithm Foundations: BFS and DFS | 5 | 240 |
| 22 | Minimum Spanning Trees | 5 | 180 |
| 23 | Single-Source Shortest Paths | 5 | 240 |
| 24 | All-Pairs Shortest Paths | 5 | 210 |
| 25 | Maximum Flow Networks | 5 | 240 |
| 26 | Multithreaded Algorithms | 5 | 180 |
| 27 | Advanced Mathematics: Matrices, Polynomials, and FFT | 5 | 240 |
| 28 | Number-Theoretic Algorithms and Cryptography | 5 | 210 |
| 29 | String Matching Algorithms | 5 | 180 |
| 30 | Online Algorithms and Machine Learning | 5 | 180 |
| 31 | NP-Completeness: The Limits of Efficient Computation | 5 | 240 |
| 32 | Approximation Algorithms | 5 | 180 |
| 33 | Capstone: The First-Principles Algorithm Library | 4 | 300 |

### Advanced System Design Mastery (Topic 33, topic_only)

**Variant C latency:** 74214ms

| # | Title | Concepts | Minutes |
|---|-------|----------|---------|
| 1 | The Physics of Compute: Latency and the Memory Hierarchy | 5 | 90 |
| 2 | Concurrency Primitives: Processes, Threads, and Coroutines | 5 | 120 |
| 3 | Storage Hardware: Disk I/O Mechanics | 4 | 90 |
| 4 | High-Performance I/O Models | 5 | 120 |
| 5 | Network Transport Deep Dive: TCP Internals | 4 | 120 |
| 6 | Modern Network Transport: UDP and QUIC | 4 | 90 |
| 7 | Serialization and RPC Mechanics | 5 | 120 |
| 8 | Storage Engines I: B-Trees and Read Optimization | 5 | 120 |
| 9 | Storage Engines II: LSM-Trees and Write Optimization | 5 | 120 |
| 10 | Transaction Theory: ACID and Isolation Levels | 4 | 120 |
| 11 | Transaction Implementation: MVCC | 4 | 90 |
| 12 | Distributed Time and Causality | 5 | 120 |
| 13 | Distributed Consensus: Foundations and Paxos | 5 | 120 |
| 14 | Distributed Consensus: Raft Implementation | 5 | 120 |
| 15 | The CAP and PACELC Theorems | 4 | 90 |
| 16 | Replication and Quorums | 5 | 90 |
| 17 | Partitioning and Consistent Hashing | 5 | 120 |
| 18 | NoSQL Paradigms and Data Modeling | 5 | 90 |
| 19 | Load Balancing Mechanics | 4 | 90 |
| 20 | Caching Topologies and Eviction Policies | 5 | 120 |
| 21 | Asynchronous Processing and Messaging Systems | 5 | 120 |
| 22 | Reliability Engineering and Failure Modes | 5 | 90 |
| 23 | Rate Limiting and Backpressure | 5 | 90 |
| 24 | The Internals of Observability | 5 | 90 |
| 25 | Capstone Synthesis: Architecting a Netflix-Scale Global Service | 6 | 180 |

### Advaita Vedanta: Shankaracharya's Commentary (Topic 24, pdf)

**Variant C latency:** 91061ms

| # | Title | Concepts | Minutes |
|---|-------|----------|---------|
| 1 | First Principles: The Metaphysics of Advaita & Sadhana Chatushtaya | 6 | 150 |
| 2 | Shankara's Upodghata & The Problem of Human Sorrow | 4 | 90 |
| 3 | Chapter 2 (Part 1): The Absolute Reality of the Atman | 5 | 150 |
| 4 | Chapter 2 (Part 2): Buddhi Yoga & The Paradox of Action | 4 | 120 |
| 5 | Chapter 2 (Part 3): The Sthitaprajna (The Illumined Sage) | 4 | 90 |
| 6 | Chapter 3: The Illogic of Inaction | 4 | 120 |
| 7 | Chapter 4: The Epistemology of Actionless Action | 4 | 120 |
| 8 | Chapter 5: True Sannyasa (Renunciation) | 4 | 90 |
| 9 | Chapter 6: Dhyana-Yoga & The Mechanics of Meditation | 4 | 120 |
| 10 | Chapter 7: Vijnana-Yoga (Saguna vs Nirguna Brahman) | 5 | 120 |
| 11 | Chapter 8: Abhyasa-Yoga & The Escatology of Advaita | 4 | 90 |
| 12 | Chapter 9: The Sovereign Secret | 4 | 120 |
| 13 | Chapters 10 & 11: Vibhuti & Vishwarupa (The Universal Form) | 4 | 150 |
| 14 | Chapter 12: Bhakti Yoga through the Advaitic Lens | 3 | 90 |
| 15 | Chapter 13 (Part 1): Kshetra & Kshetrajna (Subject-Object Discrimination) | 4 | 150 |
| 16 | Chapter 13 (Part 2): Jneya & The Refutation of Samkhya Dualism | 4 | 120 |
| 17 | Chapter 14: The Architecture of Maya (The Three Gunas) | 4 | 120 |
| 18 | Chapter 15: The Ashvattha Tree & The Supreme Spirit | 5 | 120 |
| 19 | Chapters 16 & 17: Qualifications for Knowledge & The Science of Faith | 5 | 120 |
| 20 | Chapter 18 (Part 1): The Epistemology of Action and True Tyaga | 4 | 150 |
| 21 | Chapter 18 (Part 2): Capstone - Jnana as the Sole Means to Liberation | 5 | 180 |
