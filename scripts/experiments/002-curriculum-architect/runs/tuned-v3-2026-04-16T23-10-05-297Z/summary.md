# Curriculum Architect — Five-Way Comparison

Run: tuned-v3-2026-04-16T23-10-05-297Z
Variant A: C:\Projects\Experiments\textbook\scripts\experiments\002-curriculum-architect\runs\2026-04-16T22-23-05-763Z
Variant B: C:\Projects\Experiments\textbook\scripts\experiments\002-curriculum-architect\runs\tuned-2026-04-16T22-40-29-597Z
Variant C: C:\Projects\Experiments\textbook\scripts\experiments\002-curriculum-architect\runs\tuned-v2-2026-04-16T22-55-39-525Z

## Module count · total time · max single module

| Topic | Production | Variant A | Variant B | Variant C | Variant D |
|-------|-----------|-----------|-----------|-----------|-----------|
| Understanding Large Language Models (LLMs) | 3·30m·10 | 3·30m·10 | 3·26m·10 | 4·25m·7 | **4·25m·8** |
| Turboquant: AI Efficiency Concepts | 3·60m·25 | 3·60m·20 | 4·60m·15 | 4·60m·15 | **4·60m·15** |
| Transformer Networks: History and Theory | 11·660m·90 | 12·1005m·120 | 10·1110m·150 | 13·555m·60 | **11·590m·75** |
| Psoriasis Pathophysiology: A 10-Mark Answer | 7·360m·75 | 5·480m·120 | 6·345m·90 | 5·300m·85 | **6·300m·60** |
| Algorithms: CLRS Textbook Companion | 19·3180m·210 | 20·5700m·360 | 21·11340m·720 | 33·7080m·300 | **30·6720m·300** |
| Advanced System Design Mastery | 10·1080m·150 | 10·1500m·180 | 7·4080m·720 | 25·2730m·180 | **18·2250m·180** |
| Advaita Vedanta: Shankaracharya's Commentary | 11·1650m·190 | 27·2730m·120 | 12·14400m·1800 | 21·2580m·180 | **24·3420m·180** |

Format: `modules · total_minutes · max_single_module_minutes`

## Variant D module structure per topic

### Understanding Large Language Models (LLMs) (Topic 29, topic_only)

**Variant D latency:** 26311ms

| # | Title | Concepts | Minutes |
|---|-------|----------|---------|
| 1 | The AI's Alphabet: How Computers 'Read' Words | 3 | 6 |
| 2 | The Brain's Engine: How the Model Learns to 'Think' | 4 | 8 |
| 3 | Hitting 'Send': From Chaos to Conversation | 4 | 6 |
| 4 | Demystifying the Magic: Does it Actually Understand? | 4 | 5 |

### Turboquant: AI Efficiency Concepts (Topic 30, topic_only)

**Variant D latency:** 26200ms

| # | Title | Concepts | Minutes |
|---|-------|----------|---------|
| 1 | The AI Memory Wall: Why Models Get Too Big | 4 | 15 |
| 2 | Quantization 101: Shrinking the Brain | 4 | 15 |
| 3 | The Magic of Turboquant | 4 | 15 |
| 4 | Talking Points: Real-World Impact & Future Trends | 5 | 15 |

### Transformer Networks: History and Theory (Topic 32, pdf)

**Variant D latency:** 46501ms

| # | Title | Concepts | Minutes |
|---|-------|----------|---------|
| 1 | The Seeds of Generation: Pre-Computing Theory | 4 | 45 |
| 2 | The Sequential Bottleneck: RNNs and LSTMs | 5 | 60 |
| 3 | The Bridge: The First Attention Mechanisms | 4 | 45 |
| 4 | The Big Bang: 'Attention Is All You Need' | 4 | 45 |
| 5 | The Mechanics of Self-Attention (QKV) | 5 | 75 |
| 6 | Multi-Head Attention & Positional Encoding | 4 | 60 |
| 7 | Training, Complexity, and Original Results | 5 | 50 |
| 8 | The Evolutionary Divergence: BERT, GPT, and T5 | 4 | 60 |
| 9 | Modern Engineering Hacks & Scaling Laws | 5 | 60 |
| 10 | Multimodality and the Limits of Attention | 5 | 50 |
| 11 | Synthesis: How Transformers Changed the World | 4 | 40 |

### Psoriasis Pathophysiology: A 10-Mark Answer (Topic 31, pdf)

**Variant D latency:** 32803ms

| # | Title | Concepts | Minutes |
|---|-------|----------|---------|
| 1 | Etiology: Genetic Susceptibility & Environmental Triggers | 6 | 45 |
| 2 | The Initiation Phase: Innate Immune Activation | 8 | 45 |
| 3 | The Maintenance Phase: The IL-23/Th17 Axis | 7 | 60 |
| 4 | Keratinocyte Kinetics & The Feed-Forward Loop | 6 | 45 |
| 5 | Clinical-Histopathological Correlation | 6 | 45 |
| 6 | Capstone: Constructing the 10-Mark Exam Answer & Flowcharts | 6 | 60 |

### Algorithms: CLRS Textbook Companion (Topic 28, pdf)

**Variant D latency:** 101782ms

| # | Title | Concepts | Minutes |
|---|-------|----------|---------|
| 1 | Mathematical Foundations: Logic, Sets, and Proofs | 6 | 240 |
| 2 | Mathematical Foundations: Combinatorics and Probability | 5 | 240 |
| 3 | First Principles of Algorithms: Insertion Sort and Loop Invariants | 5 | 180 |
| 4 | The Language of Time: Asymptotic Notation | 6 | 210 |
| 5 | Divide-and-Conquer: Merge Sort and Recurrence Relations | 6 | 240 |
| 6 | Probabilistic Analysis and Randomized Algorithms | 5 | 210 |
| 7 | Sorting I: Heaps and Priority Queues | 5 | 240 |
| 8 | Sorting II: Quicksort and Rigorous Expected-Time Analysis | 4 | 240 |
| 9 | Sorting in Linear Time: Breaking the Comparison Barrier | 4 | 180 |
| 10 | Medians and Order Statistics | 3 | 180 |
| 11 | Elementary Data Structures: Memory Under the Hood | 5 | 180 |
| 12 | Hash Tables and Universal Hashing | 5 | 240 |
| 13 | Binary Search Trees | 5 | 210 |
| 14 | Red-Black Trees: Guaranteed Balance | 5 | 300 |
| 15 | Advanced Design I: Dynamic Programming Foundations | 4 | 240 |
| 16 | Advanced Design II: Complex Dynamic Programming | 4 | 240 |
| 17 | Advanced Design III: Greedy Algorithms | 4 | 210 |
| 18 | Amortized Analysis | 4 | 240 |
| 19 | Advanced Data Structures I: B-Trees | 4 | 210 |
| 20 | Advanced Data Structures II: Disjoint Sets | 5 | 180 |
| 21 | Graph Algorithms I: Representation and Search | 5 | 240 |
| 22 | Graph Algorithms II: Minimum Spanning Trees | 3 | 210 |
| 23 | Graph Algorithms III: Single-Source Shortest Paths | 5 | 240 |
| 24 | Graph Algorithms IV: All-Pairs Shortest Paths | 4 | 210 |
| 25 | Graph Algorithms V: Maximum Flow | 5 | 240 |
| 26 | Selected Topics: Multithreaded Algorithms and Matrices | 5 | 240 |
| 27 | Selected Topics: Linear Programming | 5 | 240 |
| 28 | Selected Topics: String Matching | 4 | 210 |
| 29 | The Edge of Feasibility: NP-Completeness | 5 | 240 |
| 30 | Coping with Hardness: Approximation Algorithms | 5 | 240 |

### Advanced System Design Mastery (Topic 33, topic_only)

**Variant D latency:** 54660ms

| # | Title | Concepts | Minutes |
|---|-------|----------|---------|
| 1 | Hardware Primitives & The Physics of Latency | 5 | 120 |
| 2 | I/O Models & High-Performance Concurrency | 7 | 150 |
| 3 | Transport Layer Deep Dive: TCP, UDP, & QUIC | 6 | 120 |
| 4 | RPC, Serialization, & Schema Evolution | 7 | 120 |
| 5 | Storage Engine Mechanics: B-Trees vs. LSM-Trees | 6 | 150 |
| 6 | Database Indexing Anatomy | 4 | 90 |
| 7 | Transaction Theory, Isolation Levels, & MVCC | 5 | 150 |
| 8 | Distributed Laws: CAP, PACELC & Quorums | 5 | 120 |
| 9 | Time, Ordering, and Causality in Distributed Systems | 6 | 120 |
| 10 | Consensus & Coordination Algorithms | 7 | 150 |
| 11 | Load Balancing & Consistent Hashing | 5 | 120 |
| 12 | Caching Mechanics & State Management | 4 | 120 |
| 13 | Database Sharding & Data Partitioning | 5 | 90 |
| 14 | Asynchronous Processing & Delivery Guarantees | 5 | 120 |
| 15 | Fault Tolerance, Backpressure & Rate Limiting | 5 | 120 |
| 16 | Advanced Data Patterns: Event Sourcing & CQRS | 5 | 120 |
| 17 | The Internals of Observability | 5 | 90 |
| 18 | Capstone: Engineering a Global-Scale Platform | 7 | 180 |

### Advaita Vedanta: Shankaracharya's Commentary (Topic 24, pdf)

**Variant D latency:** 78036ms

| # | Title | Concepts | Minutes |
|---|-------|----------|---------|
| 1 | First Principles: Adhyasa and the Four-Fold Qualifications | 5 | 180 |
| 2 | Shankaracharya's Introduction (Upodghata) | 4 | 120 |
| 3 | The Context of Suffering: Arjuna's Despondency | 3 | 90 |
| 4 | The Ultimate Reality: Sankhya Yoga (Part 1 - The Dialectic of Atman) | 4 | 180 |
| 5 | The Preparation: Sankhya Yoga (Part 2 - Karma Yoga) | 4 | 150 |
| 6 | The Liberated Sage: Sthitaprajna | 4 | 120 |
| 7 | The Mechanism of the Empirical World (Karma-Yoga) | 4 | 120 |
| 8 | Avatarhood and the Fire of Knowledge (Jnana-Yoga) | 4 | 150 |
| 9 | Renunciation vs. Action (Samnyasa-Yoga) | 4 | 120 |
| 10 | The Mechanics of Meditation (Dhyana-Yoga) | 4 | 150 |
| 11 | The Illusion of Matter: Vijnana-Yoga | 4 | 120 |
| 12 | Cosmology and the Afterlife (Abhyasa-Yoga) | 4 | 150 |
| 13 | The Sovereign Secret (Rajavidya Rajaguhya Yoga) | 4 | 150 |
| 14 | The Substratum of Greatness (Vibhuti-Yoga) | 4 | 120 |
| 15 | The Universal Form and Time (Vishvarupa Darshana Yoga) | 4 | 150 |
| 16 | The Dialectic of Devotion (Bhakti-Yoga) | 4 | 120 |
| 17 | Matter and Spirit: Kshetra and Kshetrajna (Part 1) | 4 | 180 |
| 18 | The Nature of the Ultimate Knower (Part 2) | 4 | 150 |
| 19 | The Dynamics of the Three Gunas | 4 | 150 |
| 20 | The Inverted Tree of Samsara (Purushottama Yoga) | 4 | 150 |
| 21 | Divine and Demonic Destinies | 4 | 120 |
| 22 | The Psychology of Faith (Shraddha) | 4 | 120 |
| 23 | The Climax of Advaita: Conclusion (Part 1) | 4 | 180 |
| 24 | Final Liberation: Conclusion (Part 2) | 4 | 180 |
