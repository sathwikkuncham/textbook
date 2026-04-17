# Module Planner Experiment — Summary

Run: 2026-04-16T20-16-19-980Z
Variants: A
Runs per variant: 1

## Results

| Variant | Name | Model | Sections (est total) | First-section concepts | Parse fails | Avg latency |
|---------|------|-------|---------------------|------------------------|-------------|-------------|
| A | Baseline (current production) | gemini-3-flash-preview | min=3, max=3, avg=3.0 | min=2, max=2, avg=2.0 | 0/1 | 5059ms |

## First-section titles per variant

### Variant A — Baseline (current production)
- "The First Principles of Language: Information Theory and Markov Chains"

## Ground truth (production)

For this same Module 1 input, the production system produced **2 sections** covering 5 concepts in section 1.1. This is the failure we are trying to fix.

## Pass criteria

For a learner who said "exhaustive, no time limit, first principles":
- Sections should be **≥ 4** (ideally 5-8)
- First-section concepts should be **≤ 3** (ideally 1-2)
- Parse failures should be **0**
- Low variance across runs (all 3 runs cluster around the same section count)