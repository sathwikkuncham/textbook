# Module Planner Experiment — Summary

Run: 2026-04-16T20-16-49-564Z
Variants: A, B, C, D, E
Runs per variant: 3

## Results

| Variant | Name | Model | Sections (est total) | First-section concepts | Parse fails | Avg latency |
|---------|------|-------|---------------------|------------------------|-------------|-------------|
| A | Baseline (current production) | gemini-3-flash-preview | min=3, max=3, avg=3.0 | min=2, max=2, avg=2.0 | 0/3 | 5214ms |
| B | Model swap only (PRO) | gemini-3.1-pro-preview | min=3, max=3, avg=3.0 | min=2, max=3, avg=2.3 | 0/3 | 11348ms |
| C | PRO + depth enforcement | gemini-3.1-pro-preview | min=6, max=6, avg=6.0 | min=1, max=1, avg=1.0 | 0/3 | 9459ms |
| D | PRO + depth + raw transcript | gemini-3.1-pro-preview | min=6, max=6, avg=6.0 | min=1, max=1, avg=1.0 | 0/3 | 12833ms |
| E | PRO + upfront full-module plan | gemini-3.1-pro-preview | min=6, max=6, avg=6.0 | min=1, max=1, avg=1.0 | 0/3 | 23666ms |

## First-section titles per variant

### Variant A — Baseline (current production)
- "The Foundations of Probabilistic Language: Information Theory and Markovian Chains"
- "The Stochastic Nature of Language: Shannon Entropy and Markovian Chains"
- "The Mathematical Birth of Language: Information Theory and Markovian Dynamics"

### Variant B — Model swap only (PRO)
- "Foundational Probabilities: Information Theory and Markov Models"
- "Information Theory, Entropy, and the Birth of Generative Language Models"
- "Quantifying and Generating Language: Entropy and Markov Models"

### Variant C — PRO + depth enforcement
- "Foundations of Language as Probability: Information Theory and Shannon Entropy"
- "The Mathematical Bedrock: Information Theory and Shannon Entropy"
- "Foundation of Predictability: Information Theory and Shannon Entropy"

### Variant D — PRO + depth + raw transcript
- "Information Theory and Shannon Entropy: Measuring Surprise"
- "Before Computers: Andrey Markov and the Genesis of Next-Token Prediction"
- "The Dawn of Predictability: Information Theory and Shannon Entropy"

### Variant E — PRO + upfront full-module plan
- "The Origins of Creation: Generative vs. Discriminative Modeling"
- "The Paradigm Shift: Generative vs. Discriminative Modeling"
- "Quantifying Language: Information Theory and Shannon Entropy"

## Ground truth (production)

For this same Module 1 input, the production system produced **2 sections** covering 5 concepts in section 1.1. This is the failure we are trying to fix.

## Pass criteria

For a learner who said "exhaustive, no time limit, first principles":
- Sections should be **≥ 4** (ideally 5-8)
- First-section concepts should be **≤ 3** (ideally 1-2)
- Parse failures should be **0**
- Low variance across runs (all 3 runs cluster around the same section count)