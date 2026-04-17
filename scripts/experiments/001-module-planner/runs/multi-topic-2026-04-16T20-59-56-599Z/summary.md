# Variant D — Multi-Topic Generality Report

Run: 2026-04-16T20-59-56-599Z

## Overview

| Topic | Profile | Production | Variant D sections | First concept count | Variance |
|-------|---------|------------|--------------------|--------------------|-----------|
| Understanding Large Language Models (LLMs) | Beginner · High-level conceptual · 15-30 min · Absolute beginner · 7 concepts | 3 | 2-2 | 3-3 | none |
| Turboquant: AI Efficiency Concepts | Beginner · Conceptual · 1 hour · Slow reader · Limited ML knowledge · 7 concepts | 4 | 3-4 | 2-2 | 2 distinct values |
| Algorithms: CLRS Textbook Companion | Advanced · Extremely deep · No time constraint · Rusty math (10+ yr gap) · 7 concepts | 4 | 6-7 | 1-2 | 2 distinct values |
| Psoriasis Pathophysiology: A 10-Mark Answer | Advanced · PG exam-oriented · 4 months · Molecular depth · 7 concepts | 3 | 4-4 | 2-2 | none |
| Advanced System Design Mastery | Advanced · Exhaustive · Unrestricted time · Bottom-up first principles · 8 concepts | 4 | 6-8 | 2-2 | 3 distinct values |

## Per-topic detail

### Topic 29: Understanding Large Language Models (LLMs)

**Profile:** Beginner · High-level conceptual · 15-30 min · Absolute beginner · 7 concepts

**Module:** The Building Blocks: Tokens and Word Maps

**Production baseline (3 sections):**
- From Words to Numbers: What are Tokens?
- The Map of Meaning: Giving Words a Neighborhood
- Word Math: Navigating Relationships

**Variant D runs:**

#### Run 1
- **Title:** Chopping Text into Lego Bricks: Tokens and Numbers
- **Concepts:** ["Tokenization","Tokens as building blocks","Numerical IDs for words"]
- **Estimated sections:** 2
- **Scope:** Introduce the foundational idea that computers cannot read English, only numbers. Explain how raw sentences are broken down into smaller pieces called tokens (acting like Lego bricks), and how each token is assigned a unique numerical ID so the AI can process it.
- **Latency:** 13402ms

#### Run 2
- **Title:** Chopping Up Language: Tokens and IDs
- **Concepts:** ["Tokenization","Tokens as building blocks","Numerical IDs for words"]
- **Estimated sections:** 2
- **Scope:** Explain that AI cannot read text like humans do; it needs numbers. Introduce tokenization as the process of breaking sentences down into smaller building blocks called tokens, and assigning each piece a unique numerical ID.
- **Latency:** 7397ms

#### Run 3
- **Title:** Chopping Up Text: Tokens as Building Blocks
- **Concepts:** ["Tokenization","Tokens as building blocks","Numerical IDs for words"]
- **Estimated sections:** 2
- **Scope:** Introduce how the AI reads text not as whole words, but by breaking it down into smaller pieces called tokens. Explain how these tokens act as fundamental building blocks and are converted into numerical IDs so the computer can process them.
- **Latency:** 6040ms

### Topic 30: Turboquant: AI Efficiency Concepts

**Profile:** Beginner · Conceptual · 1 hour · Slow reader · Limited ML knowledge · 7 concepts

**Module:** The Memory Wall: Why AI Needs Turboquant

**Production baseline (4 sections):**
- The Expanding Mind: Understanding the Memory Wall
- The Weight of Words: Why Memory Runs Out
- Shrinking the Scratchpad: The Magic of Quantization
- The Price of Memory: Why Efficiency Equals Access

**Variant D runs:**

#### Run 1
- **Title:** The Memory Wall: Why AI Needs So Much Space
- **Concepts:** ["The Memory Wall","GPU vs. Consumer hardware limitations"]
- **Estimated sections:** 3
- **Scope:** Introduce the concept of the 'Memory Wall'—the physical limit where AI is bottlenecked not by its ability to 'think' (compute), but by its ability to fetch and store data (memory). Compare everyday consumer hardware with specialized AI GPUs to explain why running large AI models is so difficult on normal devices.
- **Latency:** 11658ms

#### Run 2
- **Title:** The AI's Working Memory: Long-Context AI and the Memory Wall
- **Concepts:** ["Long-context AI (128K+ tokens)","The Memory Wall"]
- **Estimated sections:** 4
- **Scope:** Introduce how AI processes text using 'context' through simple, everyday analogies. Explain the goal of 'Long-context AI' (like an AI trying to read a whole book at once) and introduce the 'Memory Wall'—the invisible barrier where an AI simply runs out of short-term memory space to hold the conversation.
- **Latency:** 11569ms

#### Run 3
- **Title:** The Big Squeeze: Why AI Struggles to Read Whole Books
- **Concepts:** ["Long-context AI (128K+ tokens)","The Memory Wall"]
- **Estimated sections:** 4
- **Scope:** Introduce the goal of modern AI to process massive amounts of text at once, known as long-context AI. Explain the fundamental barrier standing in the way: The Memory Wall, a physical bottleneck where an AI's processing speed outpaces its ability to fetch information from memory.
- **Latency:** 18928ms

### Topic 28: Algorithms: CLRS Textbook Companion

**Profile:** Advanced · Extremely deep · No time constraint · Rusty math (10+ yr gap) · 7 concepts

**Module:** Mathematical Foundations for Algorithm Analysis

**Production baseline (4 sections):**
- Sets, Relations, and Functions: The Vocabulary of Discrete Mathematics
- Graphs and Trees: The Structural Blueprints of Algorithms
- Summations and Induction: The Algebra of Algorithm Analysis
- Counting and Chance: Permutations, Combinations, and Discrete Probability

**Variant D runs:**

#### Run 1
- **Title:** First Principles of Discrete Mathematics: Sets, Relations, and Functions
- **Concepts:** ["Set theory basics and notation","Relations and functions"]
- **Estimated sections:** 6
- **Scope:** This section lays the absolute bedrock for algorithmic mathematics by exploring sets, how elements relate to each other, and how functions map inputs to outputs. Starting from first principles, it will rebuild your mathematical intuition, introducing rigorous notation and definitions that will serve as the language for all future algorithm analysis and proofs.
- **Latency:** 11367ms

#### Run 2
- **Title:** Set Theory: The Atomic Building Blocks of Mathematics
- **Concepts:** ["Set theory basics and notation"]
- **Estimated sections:** 7
- **Scope:** Introduce sets from absolute first principles to re-establish mathematical foundations. This section will cover how we define and group objects, basic set notation, and foundational operations like unions and intersections to build intuition for all subsequent discrete math topics.
- **Latency:** 10685ms

#### Run 3
- **Title:** First Principles of Sets: The Bedrock of Discrete Mathematics
- **Concepts:** ["Set theory basics and notation"]
- **Estimated sections:** 7
- **Scope:** Starting from absolute scratch to rebuild mathematical intuition, this section introduces sets as the fundamental grouping of objects. It covers standard notation, core operations (union, intersection, difference), and how sets allow us to rigorously define the conceptual spaces our algorithms will operate within.
- **Latency:** 10516ms

### Topic 31: Psoriasis Pathophysiology: A 10-Mark Answer

**Profile:** Advanced · PG exam-oriented · 4 months · Molecular depth · 7 concepts

**Module:** Etiology: Genetics and Environmental Triggers

**Production baseline (3 sections):**
- The Genetic Landscape: PSORS Loci and Major Polymorphisms
- Environmental Catalysts: Physical Trauma and Streptococcal Triggers
- Systemic Modifiers: Pharmacological Triggers and Lifestyle Factors

**Variant D runs:**

#### Run 1
- **Title:** Primary Genetic Susceptibility: The PSORS Loci
- **Concepts:** ["PSORS1 locus and HLA-Cw6 association","Non-PSORS loci (PSORS2-9)"]
- **Estimated sections:** 4
- **Scope:** Introduce the foundational genetic basis of psoriasis required for a top-tier PG exam answer. This section will focus extensively on the most critical genetic determinant, the PSORS1 locus, and its strong association with HLA-Cw6 (especially in early-onset disease), followed by a structured overview of the non-PSORS loci (PSORS2-9) to establish the polygenic nature of the disease.
- **Latency:** 9628ms

#### Run 2
- **Title:** Genetic Foundations: PSORS Loci and HLA Associations
- **Concepts:** ["PSORS1 locus and HLA-Cw6 association","Non-PSORS loci (PSORS2-9)"]
- **Estimated sections:** 4
- **Scope:** Introduce the primary genetic architecture of psoriasis, focusing heavily on the foundational PSORS1 locus and its critical HLA-Cw6 association. Provide a structured, high-yield breakdown of the non-PSORS loci (PSORS2-9) to establish the genetic baseline for a 10-mark exam answer.
- **Latency:** 7344ms

#### Run 3
- **Title:** Genetic Foundations: PSORS Loci and the HLA-Cw6 Association
- **Concepts:** ["PSORS1 locus and HLA-Cw6 association","Non-PSORS loci (PSORS2-9)"]
- **Estimated sections:** 4
- **Scope:** This section establishes the primary genetic basis of psoriasis, crucial for the opening of a 10-mark exam answer. It covers the highly penetrant PSORS1 locus, its strong association with the HLA-Cw6 allele, and provides a structured overview of the non-PSORS loci (PSORS2-9).
- **Latency:** 8854ms

### Topic 33: Advanced System Design Mastery

**Profile:** Advanced · Exhaustive · Unrestricted time · Bottom-up first principles · 8 concepts

**Module:** The Physics of a Single Machine: Hardware & OS Primitives

**Production baseline (4 sections):**
- The Memory Hierarchy: Caches, Latency, and the Physics of Data Movement
- Persistence Physics: The Mechanical and Electrical Reality of Disk I/O
- The Gatekeeper: System Calls, Context Switching, and the Concurrency Myth
- Modern I/O Paradigms: From Blocking Sockets to io_uring

**Variant D runs:**

#### Run 1
- **Title:** The Physics of Memory: Latency and the Memory Hierarchy
- **Concepts:** ["Memory Hierarchy and the Latency Numbers every programmer should know","L1/L2/L3 Cache Latency vs Main Memory"]
- **Estimated sections:** 8
- **Scope:** Begin at the absolute bedrock: the physical time it takes for an electrical signal to travel between the CPU and memory. Introduce the memory hierarchy from first principles, dissecting L1, L2, L3 caches versus Main Memory to build a rigorous intuition around the 'latency numbers every programmer should know'.
- **Latency:** 11328ms

#### Run 2
- **Title:** The Physical Limits of Speed: Memory Hierarchy and Cache Latencies
- **Concepts:** ["Memory Hierarchy and the Latency Numbers every programmer should know","L1/L2/L3 Cache Latency vs Main Memory"]
- **Estimated sections:** 6
- **Scope:** Begin at the absolute bedrock of system performance: the physical distance and time it takes to move data into the CPU. This section will establish the foundational 'latency numbers every programmer should know', exploring the stark performance cliffs between L1, L2, L3 caches, and main memory.
- **Latency:** 7723ms

#### Run 3
- **Title:** The Physics of Computation: Memory Hierarchy and Caching First Principles
- **Concepts:** ["Memory Hierarchy and the Latency Numbers every programmer should know","L1/L2/L3 Cache Latency vs Main Memory"]
- **Estimated sections:** 7
- **Scope:** Begin at the absolute bedrock: the physical distance between the CPU and data. This section will build a first-principles understanding of the memory hierarchy, detailing L1/L2/L3 cache mechanics versus main memory, and derive the fundamental latency numbers every systems programmer must know.
- **Latency:** 13098ms
